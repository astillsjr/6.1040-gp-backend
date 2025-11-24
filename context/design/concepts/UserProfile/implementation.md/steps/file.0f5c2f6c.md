---
timestamp: 'Mon Nov 24 2025 15:51:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_155101.9445675f.md]]'
content_id: 0f5c2f6c17099b59f5f74678c5f81213572ecb6a8beca7b822bfed966960f423
---

# file: src/concepts/userprofile/UserProfileConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";

// The User type is a generic parameter, representing an ID from another concept (e.g., UserAuthentication).
type User = ID;

// Collection prefix to namespace collections in MongoDB
const PREFIX = "UserProfile";

// A hardcoded list of valid dorms as per the 'requires' clause of createProfile.
// In a larger system, this might come from another concept.
const VALID_DORMS = [
  "Baker House",
  "Burton-Conner",
  "East Campus",
  "MacGregor House",
  "Maseeh Hall",
  "McCormick Hall",
  "New House",
  "Next House",
  "Random Hall",
  "Simmons Hall",
  "The Warehouse",
];

/**
 * Represents the state of a User's profile stored in the database.
 * a set of Users with
 *   a displayName String
 *   a dorm String
 *   a bio String
 *   a createdAt Date
 *   a lenderScore Number
 *   a borrowerScore Number
 */
interface Profile {
  _id: User;
  displayName: string;
  dorm: string;
  bio: string;
  createdAt: Date;
  lenderScore: number;
  borrowerScore: number;
}

/**
 * @concept UserProfile - To maintain user profile information.
 * @purpose To maintain user profile information including display name, dorm affiliation,
 * and other public-facing details that enable community connection and item discovery.
 */
export default class UserProfileConcept {
  public readonly profiles: Collection<Profile>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection<Profile>(`${PREFIX}.profiles`);
  }

  /**
   * createProfile (user: User, displayName: String, dorm: String): (profile: User) | (error: String)
   *
   * **requires**: The user must not already have a profile. The dorm must be a valid MIT dorm name.
   * **effects**: Creates a profile for the user with the provided display name and dorm, initializing scores to 0.
   */
  async createProfile({ user, displayName, dorm }: { user: User; displayName: string; dorm: string }): Promise<{ profile: User } | { error: string }> {
    // Check 'requires': The user must not already have a profile.
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (existingProfile) {
      return { error: `User ${user} already has a profile.` };
    }

    // Check 'requires': The dorm must be a valid MIT dorm name.
    if (!VALID_DORMS.includes(dorm)) {
      return { error: `Invalid dorm name: ${dorm}.` };
    }

    // Perform 'effects'
    const profile: Profile = {
      _id: user,
      displayName,
      dorm,
      bio: "", // Initialize bio as empty
      createdAt: new Date(),
      lenderScore: 0,
      borrowerScore: 0,
    };

    await this.profiles.insertOne(profile);

    return { profile: user };
  }

  /**
   * updateProfile (user: User, displayName: String, dorm: String, bio: String)
   *
   * **requires**: The user must have an existing profile.
   * **effects**: Updates the user's profile information.
   */
  async updateProfile({ user, displayName, dorm, bio }: { user: User; displayName: string; dorm: string; bio: string }): Promise<Empty | { error: string }> {
    // Check 'requires': The user must have an existing profile.
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `User ${user} does not have a profile.` };
    }

    // Perform 'effects'
    await this.profiles.updateOne(
      { _id: user },
      { $set: { displayName, dorm, bio } },
    );

    return {};
  }

  /**
   * system updateScores (user: User, lenderScore: Number, borrowerScore: Number)
   *
   * **requires**: The user must have a profile.
   * **effects**: Updates the stored reputation scores for the user.
   */
  async updateScores({ user, lenderScore, borrowerScore }: { user: User; lenderScore: number; borrowerScore: number }): Promise<Empty | { error: string }> {
    // Check 'requires': The user must have a profile.
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `User ${user} does not have a profile.` };
    }

    // Perform 'effects'
    await this.profiles.updateOne(
      { _id: user },
      { $set: { lenderScore, borrowerScore } },
    );

    return {};
  }

  /**
   * _getProfile (user: User): (profile: {displayName: String, dorm: String, bio: String, lenderScore: Number, borrowerScore: Number})
   *
   * **requires**: The user must have a profile.
   * **effects**: Returns the user's profile information.
   */
  async _getProfile({ user }: { user: User }): Promise<Array<{ profile: Omit<Profile, "_id" | "createdAt"> }>> {
    const profileDoc = await this.profiles.findOne(
      { _id: user },
      { projection: { _id: 0, createdAt: 0 } },
    );

    if (!profileDoc) {
      return []; // Return empty array if no profile found
    }

    // The type casting here is safe due to the findOne result and projection.
    const profileData = profileDoc as Omit<Profile, "_id" | "createdAt">;

    return [{ profile: profileData }];
  }
}
```
