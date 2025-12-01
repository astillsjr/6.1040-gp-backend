import { Collection, Db } from "npm:mongodb";
import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix for this concept
const PREFIX = "UserAuthentication" + ".";

// Define the types for our entries based on the concept state
type User = ID;
type Session = ID;

// Constants for token management
const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in the environment");
}

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

    this.users.createIndex({ username: 1 }, { unique: true }).catch((err) => {
      console.error("Error creating username index:", err);
    });

    this.users.createIndex({ email: 1 }, { unique: true }).catch((err) => {
      console.error("Error creating email index:", err);
    });

    this.sessions.createIndex({ refreshToken: 1 }, { unique: true }).catch(
      (err) => {
        console.error("Error creating refresh token index:", err);
      },
    );
  }

  /**
   * Register a new user.
   * @requires The provided email and username must not already exist.
   *           The email must be in valid format.
   *           The password must be at least 8 characters long (potentially implement later).
   * @effects Creates a new user record with a hashed password and returns a new pair of session tokens.
   */
  async register(
    { username, password, email }: {
      username: string;
      password: string;
      email: string;
    },
  ): Promise<
    { user: User; accessToken: string; refreshToken: string } | {
      error: string;
    }
  > {
    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Requirement: email must be in valid format
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return { error: "Invalid email format." };
    }

    // Requirement: username and email must not already exist
    const existingUser = await this.users.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });
    if (existingUser) {
      return { error: "Username or email already exists." };
    }

    // Effect: Creates a new user record with a hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser: UserDoc = {
      _id: freshID(),
      username,
      hashedPassword,
      email: normalizedEmail,
      createdAt: new Date(),
    };
    await this.users.insertOne(newUser);

    // Effect: returns a new pair of session tokens
    const tokens = await this.createTokenPair(newUser._id);

    return { user: newUser._id, ...tokens };
  }

  /**
   * Logs in an existing user.
   * @requires The provided username and password must match an existing user account.
   * @effects Creates a new session and returns a new pair of access and refresh tokens for the authenticated user.
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<
    { accessToken: string; refreshToken: string } | { error: string }
  > {
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
   * Refresh an access token.
   * @requires A valid and non-expired refresh token must be provided.
   * @effects Generates and returns a new short-lived access token.
   */
  async refreshAccessToken(
    { refreshToken }: { refreshToken: string },
  ): Promise<{ accessToken: string } | { error: string }> {
    // Requirement: A valid and non-expired refresh token must be provided.
    const session = await this.sessions.findOne({ refreshToken });
    if (!session) {
      return { error: "Invalid or expired refresh token." };
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.sessions.deleteOne({ refreshToken });
      return { error: "Invalid or expired refresh token." };
    }

    // Effect: Generates and returns a new short-lived access token.
    const key = await getKey();
    const now = new Date();
    const accessToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: session.user,
        iat: getNumericDate(now),
        exp: getNumericDate(
          new Date(now.getTime() + ACCESS_TOKEN_EXPIRATION_MINUTES * 60 * 1000),
        ),
      },
      key,
    );

    return { accessToken };
  }

  /**
   * Logs out a user.
   * @requires A valid refresh token must be provided.
   * @effects Invalidates the user's current refresh token, ending their session.
   */
  async logout(
    { refreshToken }: { refreshToken: string },
  ): Promise<Empty | { error: string }> {
    // Requirement: A valid refresh token must be provided.
    // Effect: Invalidates the token by deleting the session.
    const result = await this.sessions.deleteOne({ refreshToken });

    if (result.deletedCount === 0) {
      return { error: "Invalid or expired refresh token." };
    }

    return {};
  }

  /**
   * Change a user's password.
   * @requires A valid access token must be provided.
   *           The old password must match the user's current password.
   * @effects Updates the user's stored password hash to the new password.
   */
  async changePassword(
    { accessToken, oldPassword, newPassword }: {
      accessToken: string;
      oldPassword: string;
      newPassword: string;
    },
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
    const passwordMatch = await bcrypt.compare(
      oldPassword,
      user.hashedPassword,
    );
    if (!passwordMatch) {
      return { error: "Incorrect old password." };
    }

    // Effect: Updates the user's stored password hash to the new password.
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);
    await this.users.updateOne({ _id: userId }, {
      $set: { hashedPassword: newHashedPassword },
    });

    return {};
  }

  /**
   * Delete an existing user account.
   * @requires A valid access token must be provided.
   *           The provided password matches the user's current password.
   * @effects Permanently removes the user's account and all associated sessions.
   */
  async deleteAccount(
    { accessToken, password }: { accessToken: string; password: string },
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

  /**
   * Generates a pair of access and refresh tokens for a given user.
   */
  private async createTokenPair(
    userId: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const key = await getKey();
    const now = new Date();
    const accessToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: userId,
        iat: getNumericDate(now),
        exp: getNumericDate(
          new Date(now.getTime() + ACCESS_TOKEN_EXPIRATION_MINUTES * 60 * 1000),
        ),
      },
      key,
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

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
  private async getUserIdFromAccessToken(
    accessToken: string,
  ): Promise<User | null> {
    try {
      const key = await getKey();
      const payload = await verify(accessToken, key);
      return payload.sub as User;
    } catch {
      return null;
    }
  }

    /**
   * _getUserFromToken(accessToken: string): (user: User)
   * @requires A valid, non-expired accessToken.
   * @effects Returns the user ID associated with the token.
   */
    async _getUserFromToken({ accessToken }: { accessToken: string }): Promise<{ user: User }[]> {
      const userId = await this.getUserIdFromAccessToken(accessToken);
      return userId ? [{ user: userId }] : [];
    }

  /**
   * _getUserCount(): (userCount: number)
   * @requires true
   * @effects Returns the total number of registered users in the system.
   */
  async _getUserCount(_: {} = {}): Promise<{ userCount: number }[]> {
    const userCount = await this.users.countDocuments();
    return [{ userCount }];
  }
}
