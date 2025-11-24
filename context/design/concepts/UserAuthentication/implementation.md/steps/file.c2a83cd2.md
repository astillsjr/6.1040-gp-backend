---
timestamp: 'Mon Nov 24 2025 15:42:41 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_154241.f6e06fac.md]]'
content_id: c2a83cd24a1f61fe21e233583c39e99f65617b6162597eef695a84c62e68ecd1
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
  _key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return _key;
};
const ACCESS_TOKEN_EXPIRATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

// Validation Regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// NEW: Password complexity: 8+ chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

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

  /**
   * NOTE: For production, it's highly recommended to create a TTL index on the 'sessions'
   * collection to automatically clean up expired refresh tokens.
   * This should be done once during application startup:
   * await this.db.collection("UserAuthentication.sessions").createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
   */
  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  private async createAccessToken(userId: User, expirationMinutes: number): Promise<string> {
    const key = await getKey();
    const now = new Date();
    return await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: userId,
        iat: getNumericDate(now),
        exp: getNumericDate(new Date(now.getTime() + expirationMinutes * 60 * 1000)),
      },
      key,
    );
  }

  private async createTokenPair(userId: User): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.createAccessToken(userId, ACCESS_TOKEN_EXPIRATION_MINUTES);
    const refreshToken = crypto.randomUUID();
    const now = new Date();
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
   */
  async register(
    { username, password, email }: { username: string; password: string; email: string },
  ): Promise<{ user: User; accessToken: string; refreshToken: string } | { error: string }> {
    if (!EMAIL_REGEX.test(email)) {
      return { error: "Invalid email format." };
    }
    // UPDATED: Added password complexity check
    if (!PASSWORD_REGEX.test(password)) {
      return { error: "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number." };
    }
    const existingUser = await this.users.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return { error: "Username or email already exists." };
    }
    const hashedPassword = await bcrypt.hash(password);
    const newUser: UserDoc = {
      _id: freshID(),
      username,
      hashedPassword,
      email,
      createdAt: new Date(),
    };
    await this.users.insertOne(newUser);
    const tokens = await this.createTokenPair(newUser._id);
    return { user: newUser._id, ...tokens };
  }

  /**
   * login (username: String, password: String): (accessToken: String, refreshToken: String)
   */
  async login({ username, password }: { username: string; password: string }): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
    const user = await this.users.findOne({ username });
    if (!user) {
      return { error: "Invalid username or password." };
    }
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return { error: "Invalid username or password." };
    }
    return await this.createTokenPair(user._id);
  }

  /**
   * NEW: refreshToken (refreshToken: String): (accessToken: String, refreshToken: String)
   * @description Exchanges a valid refresh token for a new pair of tokens, implementing token rotation.
   * **requires**: A valid, unexpired refresh token must be provided.
   * **effects**: Invalidates the provided refresh token, creates a new session, and returns a new pair of tokens.
   */
  async refreshToken({ refreshToken }: { refreshToken: string }): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
    // Find and delete the old session in one atomic operation
    const oldSession = await this.sessions.findOneAndDelete({ refreshToken });

    if (!oldSession) {
      return { error: "Invalid or expired refresh token." };
    }

    // Check for expiration just in case the TTL index hasn't caught it yet
    if (oldSession.expiresAt < new Date()) {
      return { error: "Invalid or expired refresh token." };
    }

    // Issue a new pair of tokens
    return await this.createTokenPair(oldSession.user);
  }

  /**
   * logout (refreshToken: String)
   */
  async logout({ refreshToken }: { refreshToken: string }): Promise<Empty | { error: string }> {
    const result = await this.sessions.deleteOne({ refreshToken });
    if (result.deletedCount === 0) {
      return { error: "Invalid or expired refresh token." };
    }
    return {};
  }

  /**
   * changePassword (accessToken: String, oldPassword: String, newPassword: String)
   */
  async changePassword(
    { accessToken, oldPassword, newPassword }: { accessToken: string; oldPassword: string; newPassword: string },
  ): Promise<Empty | { error: string }> {
    // UPDATED: Added password complexity check
    if (!PASSWORD_REGEX.test(newPassword)) {
      return { error: "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number." };
    }
    const userId = await this.getUserIdFromAccessToken(accessToken);
    if (!userId) {
      return { error: "Invalid or expired access token." };
    }
    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found." };
    }
    const passwordMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!passwordMatch) {
      return { error: "Incorrect old password." };
    }
    const newHashedPassword = await bcrypt.hash(newPassword);
    await this.users.updateOne({ _id: userId }, { $set: { hashedPassword: newHashedPassword } });
    return {};
  }

  /**
   * deleteAccount (accessToken: String, password: String)
   */
  async deleteAccount({ accessToken, password }: { accessToken: string; password: string }): Promise<Empty | { error: string }> {
    const userId = await this.getUserIdFromAccessToken(accessToken);
    if (!userId) {
      return { error: "Invalid or expired access token." };
    }
    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found." };
    }
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return { error: "Incorrect password." };
    }
    await this.users.deleteOne({ _id: userId });
    await this.sessions.deleteMany({ user: userId });
    return {};
  }
}
```
