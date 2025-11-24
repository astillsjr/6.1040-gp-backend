---
timestamp: 'Mon Nov 24 2025 14:09:16 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_140916.6ac279ff.md]]'
content_id: 75ff566cb8457dd944706f2c2a4be5c8bb6ad4be122e4cec1f056692f9606ecd
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Define collection prefix based on concept name
const PREFIX = "UserAuthentication" + ".";

// Generic types for this concept
type User = ID;
type Session = ID;

// JWT Configuration
const JWT_SECRET_KEY = Deno.env.get("JWT_SECRET") ?? "default-secret";
const ACCESS_TOKEN_EXPIRATION_SECONDS = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRATION_SECONDS = 604800; // 7 days

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
 * @purpose To authenticate users so that each person's data is securely associated
 *          with their identity and protected from unauthorized access.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;
  private jwtKey: CryptoKey | undefined;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
    // It's recommended to initialize async resources outside the constructor
    // but for simplicity, we'll handle the key promise in each method.
  }

  private async getKey(): Promise<CryptoKey> {
    if (this.jwtKey) {
      return this.jwtKey;
    }
    const keyData = new TextEncoder().encode(JWT_SECRET_KEY);
    this.jwtKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
    return this.jwtKey;
  }

  private async createTokens(userId: User): Promise<{ accessToken: string; refreshToken: string }> {
    const key = await this.getKey();
    const now = new Date();

    const accessToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: userId,
        iat: getNumericDate(now),
        exp: getNumericDate(now.getTime() + ACCESS_TOKEN_EXPIRATION_SECONDS * 1000),
      },
      key,
    );

    const refreshToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: userId,
        iat: getNumericDate(now),
        exp: getNumericDate(now.getTime() + REFRESH_TOKEN_EXPIRATION_SECONDS * 1000),
      },
      key,
    );

    await this.sessions.insertOne({
      _id: freshID(),
      user: userId,
      refreshToken,
      createdAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_EXPIRATION_SECONDS * 1000),
    });

    return { accessToken, refreshToken };
  }

  private async verifyAccessToken(token: string): Promise<{ userId: User } | { error: string }> {
    try {
      const key = await this.getKey();
      const payload = await verify(token, key);
      if (!payload.sub) {
        return { error: "Invalid token: missing subject" };
      }
      return { userId: payload.sub as User };
    } catch (e) {
      return { error: `Invalid token: ${e.message}` };
    }
  }

  /**
   * register (username: String, password: String, email: String): (userId: User, accessToken: String, refreshToken: String)
   *
   * **requires**: The provided email and username must not already exist. The email must be in valid format.
   * **effects**: Creates a new user record with a hashed password and returns the new user's ID and a pair of session tokens.
   */
  async register({
    username,
    password,
    email,
  }: {
    username: string;
    password: string;
    email: string;
  }): Promise<{ userId: User; accessToken: string; refreshToken: string } | { error: string }> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Invalid email format" };
    }

    const existingUser = await this.users.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return { error: "Username or email already exists" };
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
    const { accessToken, refreshToken } = await this.createTokens(newUser._id);

    return { userId: newUser._id, accessToken, refreshToken };
  }

  /**
   * login (username: String, password: String): (accessToken: String, refreshToken: String)
   *
   * **requires**: The provided username and password must match an existing user account.
   * **effects**: Creates a new session and returns a new pair of access and refresh tokens for the authenticated user.
   */
  async login({ username, password }: { username: string; password: string }): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
    const user = await this.users.findOne({ username });
    if (!user) {
      return { error: "Invalid username or password" };
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordCorrect) {
      return { error: "Invalid username or password" };
    }

    return await this.createTokens(user._id);
  }

  /**
   * logout (refreshToken: String)
   *
   * **requires**: A valid refresh token must be provided.
   * **effects**: Invalidates the user's current refresh token, ending their session.
   */
  async logout({ refreshToken }: { refreshToken: string }): Promise<Empty | { error: string }> {
    const result = await this.sessions.deleteOne({ refreshToken });
    if (result.deletedCount === 0) {
      return { error: "Invalid or expired refresh token" };
    }
    return {};
  }

  /**
   * changePassword (accessToken: String, oldPassword: String, newPassword: String)
   *
   * **requires**: A valid access token must be provided. The old password must match the user's current password.
   * **effects**: Updates the user's stored password hash to the new password.
   */
  async changePassword({ accessToken, oldPassword, newPassword }: { accessToken: string; oldPassword: string; newPassword: string }): Promise<Empty | { error: string }> {
    const verificationResult = await this.verifyAccessToken(accessToken);
    if ("error" in verificationResult) {
      return verificationResult;
    }
    const { userId } = verificationResult;

    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found" };
    }

    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!isPasswordCorrect) {
      return { error: "Incorrect old password" };
    }

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
    const verificationResult = await this.verifyAccessToken(accessToken);
    if ("error" in verificationResult) {
      return verificationResult;
    }
    const { userId } = verificationResult;

    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found" };
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordCorrect) {
      return { error: "Incorrect password" };
    }

    await this.users.deleteOne({ _id: userId });
    await this.sessions.deleteMany({ user: userId });

    return {};
  }

  // ==============
  //    QUERIES
  // ==============

  /**
   * _getUserByUsername (username: String): (user: { _id: User, username: String, email: String, createdAt: Date })
   *
   * **requires**: `username` must be a string.
   * **effects**: Returns an array containing the user document if found, otherwise an empty array.
   */
  async _getUserByUsername({ username }: { username: string }): Promise<{ user: Omit<UserDoc, "hashedPassword"> }[]> {
    const userDoc = await this.users.findOne({ username }, { projection: { hashedPassword: 0 } });
    if (!userDoc) {
      return [];
    }
    return [{ user: userDoc }];
  }

  /**
   * _findSessionByRefreshToken (refreshToken: String): (session: SessionDoc)
   *
   * **requires**: `refreshToken` must be a string.
   * **effects**: Returns an array containing the session document if found, otherwise an empty array.
   */
  async _findSessionByRefreshToken({ refreshToken }: { refreshToken: string }): Promise<{ session: SessionDoc }[]> {
    const sessionDoc = await this.sessions.findOne({ refreshToken });
    if (!sessionDoc) {
      return [];
    }
    return [{ session: sessionDoc }];
  }
}
```
