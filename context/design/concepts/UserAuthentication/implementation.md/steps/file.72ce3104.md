---
timestamp: 'Mon Nov 24 2025 14:11:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_141148.3c4abec9.md]]'
content_id: 72ce31048f60406302f9d2bf3da6f1039ebcd909b83d24c93fa0c3e3dcd5578d
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix for this concept
const PREFIX = "UserAuthentication.";

// Generic ID types for this concept
type User = ID;
type Session = ID;

// Constants for token management
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "default-secret-key-for-dev";
let _key: CryptoKey | null = null;
const getKey = async () => {
  if (_key) return _key;
  _key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _key;
};
const ACCESS_TOKEN_EXPIRATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

// A simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * a set of Users with
 *   a username String
 *   a hashedPassword String
 *   an email String
 *   a createdAt Date
 */
interface UserDoc {
  _id: User;
  username: string;
  hashedPassword: string;
  email: string;
  createdAt: Date;
}

/**
 * a set of Sessions with
 *   a user User
 *   a refreshToken String
 *   a createdAt Date
 *   an expiresAt Date
 */
interface SessionDoc {
  _id: Session;
  user: User;
  refreshToken: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * @concept UserAuthentication
 * @purpose To authenticate users so that each person's data is securely associated with their identity and protected from unauthorized access.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * Generates a pair of access and refresh tokens for a given user.
   */
  private async createTokenPair(userId: User): Promise<{ accessToken: string; refreshToken: string }> {
    const key = await getKey();
    const now = new Date();
    const accessToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: userId,
        iat: getNumericDate(now),
        exp: getNumericDate(new Date(now.getTime() + ACCESS_TOKEN_EXPIRATION_MINUTES * 60 * 1000)),
      },
      key,
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    await this.sessions.insertOne({
      _id: freshID(),
      user: userId,
      refreshToken,
      createdAt: now,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Decodes a JWT access token and returns the user ID.
   */
  private async getUserIdFromAccessToken(accessToken: string): Promise<User | null> {
    try {
      const key = await getKey();
      const payload = await verify(accessToken, key);
      return payload.sub as User;
    } catch {
      return null;
    }
  }

  /**
   * register (username: String, password: String, email: String): (user: User, accessToken: String, refreshToken: String)
   *
   * **requires**: The provided email and username must not already exist. The email must be in valid format.
   * **effects**: Creates a new user record with a hashed password and returns a new pair of session tokens.
   */
  async register(
    { username, password, email }: { username: string; password: string; email: string },
  ): Promise<{ user: User; accessToken: string; refreshToken: string } | { error: string }> {
    // Requirement: email must be in valid format
    if (!EMAIL_REGEX.test(email)) {
      return { error: "Invalid email format." };
    }

    // Requirement: username and email must not already exist
    const existingUser = await this.users.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return { error: "Username or email already exists." };
    }

    // Effect: Creates a new user record with a hashed password
    const hashedPassword = await bcrypt.hash(password);
    const newUser: UserDoc = {
      _id: freshID(),
      username,
      hashedPassword,
      email,
      createdAt: new Date(),
    };
    await this.users.insertOne(newUser);

    // Effect: returns a new pair of session tokens
    const tokens = await this.createTokenPair(newUser._id);

    return { user: newUser._id, ...tokens };
  }

  /**
   * login (username: String, password: String): (accessToken: String, refreshToken: String)
   *
   * **requires**: The provided username and password must match an existing user account.
   * **effects**: Creates a new session and returns a new pair of access and refresh tokens for the authenticated user.
   */
  async login({ username, password }: { username: string; password: string }): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
    // Requirement: username must match an existing user
    const user = await this.users.findOne({ username });
    if (!user) {
      return { error: "Invalid username or password." };
    }

    // Requirement: password must match
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return { error: "Invalid username or password." };
    }

    // Effect: Creates a new session and returns a new pair of tokens
    const tokens = await this.createTokenPair(user._id);
    return tokens;
  }

  /**
   * logout (refreshToken: String)
   *
   * **requires**: A valid refresh token must be provided.
   * **effects**: Invalidates the user's current refresh token, ending their session.
   */
  async logout({ refreshToken }: { refreshToken: string }): Promise<Empty | { error: string }> {
    // Requirement: A valid refresh token must be provided.
    // Effect: Invalidates the token by deleting the session.
    const result = await this.sessions.deleteOne({ refreshToken });

    if (result.deletedCount === 0) {
      return { error: "Invalid or expired refresh token." };
    }

    return {};
  }

  /**
   * changePassword (accessToken: String, oldPassword: String, newPassword: String)
   *
   * **requires**: A valid access token must be provided. The old password must match the user's current password.
   * **effects**: Updates the user's stored password hash to the new password.
   */
  async changePassword(
    { accessToken, oldPassword, newPassword }: { accessToken: string; oldPassword: string; newPassword: string },
  ): Promise<Empty | { error: string }> {
    // Requirement: A valid access token must be provided.
    const userId = await this.getUserIdFromAccessToken(accessToken);
    if (!userId) {
      return { error: "Invalid or expired access token." };
    }

    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found." };
    }

    // Requirement: The old password must match the user's current password.
    const passwordMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!passwordMatch) {
      return { error: "Incorrect old password." };
    }

    // Effect: Updates the user's stored password hash to the new password.
    const newHashedPassword = await bcrypt.hash(newPassword);
    await this.users.updateOne({ _id: userId }, { $set: { hashedPassword: newHashedPassword } });

    return {};
  }

  /**
   * deleteAccount (accessToken: String, password: String)
   *
   * **requires**: A valid access token must be provided. The provided password matches the user's current password.
   * **effects**: Permanently removes the user's account and all associated sessions.
   */
  async deleteAccount({ accessToken, password }: { accessToken: string; password: string }): Promise<Empty | { error: string }> {
    // Requirement: A valid access token must be provided.
    const userId = await this.getUserIdFromAccessToken(accessToken);
    if (!userId) {
      return { error: "Invalid or expired access token." };
    }

    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found." };
    }

    // Requirement: The provided password matches the user's current password.
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return { error: "Incorrect password." };
    }

    // Effect: Permanently removes the user's account and all associated sessions.
    await this.users.deleteOne({ _id: userId });
    await this.sessions.deleteMany({ user: userId });

    return {};
  }
}
```
