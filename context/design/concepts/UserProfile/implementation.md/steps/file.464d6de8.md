---
timestamp: 'Mon Nov 24 2025 15:54:02 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_155402.5a895931.md]]'
content_id: 464d6de8441a344fed0a9a170a72e3375e1859bfbcca1d472a2f13c3ab615154
---

# file: src/concepts/userprofile/UserProfileConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileConcept from "./UserProfileConcept.ts";

Deno.test("UserProfile Concept", async (t) => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  // Define some test users
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;

  await t.step("Action: createProfile", async (t) => {
    await t.step("should create a profile successfully", async () => {
      console.log("Trace: Attempting to create profile for Alice in Baker House.");
      const result = await userProfileConcept.createProfile({ user: userAlice, displayName: "Alice", dorm: "Baker House" });
      assertEquals("profile" in result && result.profile, userAlice);

      console.log("Trace: Verifying Alice's profile was created correctly.");
      const profileData = await userProfileConcept._getProfile({ user: userAlice });
      assertExists(profileData[0]?.profile);
      assertEquals(profileData[0].profile.displayName, "Alice");
      assertEquals(profileData[0].profile.dorm, "Baker House");
      assertEquals(profileData[0].profile.lenderScore, 0);
      assertEquals(profileData[0].profile.borrowerScore, 0);
      assertEquals(profileData[0].profile.bio, "");
      assertExists(profileData[0].profile.createdAt);
    });

    await t.step("should fail if user already has a profile (requires)", async () => {
      console.log("Trace: Attempting to create a duplicate profile for Alice.");
      const result = await userProfileConcept.createProfile({ user: userAlice, displayName: "Alice v2", dorm: "Simmons Hall" });
      assertEquals("error" in result && result.error, "User already has a profile.");
    });

    await t.step("should fail for an invalid dorm name (requires)", async () => {
      console.log("Trace: Attempting to create a profile for Bob with an invalid dorm.");
      const result = await userProfileConcept.createProfile({ user: userBob, displayName: "Bob", dorm: "Invalid Dorm" });
      assertEquals("error" in result && result.error, "Invalid dorm name: Invalid Dorm.");
    });
  });

  await t.step("Action: updateProfile", async (t) => {
    await t.step("should update an existing profile successfully", async () => {
      console.log("Trace: Updating Alice's profile with a new dorm and bio.");
      const result = await userProfileConcept.updateProfile({ user: userAlice, displayName: "Alice Updated", dorm: "Simmons Hall", bio: "Hello world!" });
      assertEquals(result, {});

      console.log("Trace: Verifying Alice's profile was updated.");
      const profileData = await userProfileConcept._getProfile({ user: userAlice });
      assertEquals(profileData[0]?.profile.displayName, "Alice Updated");
      assertEquals(profileData[0]?.profile.dorm, "Simmons Hall");
      assertEquals(profileData[0]?.profile.bio, "Hello world!");
    });

    await t.step("should fail if user profile does not exist (requires)", async () => {
      console.log("Trace: Attempting to update non-existent profile for Bob.");
      const result = await userProfileConcept.updateProfile({ user: userBob, displayName: "Bob", dorm: "Next House", bio: "Bio" });
      assertEquals("error" in result && result.error, "User profile not found.");
    });
  });

  await t.step("Action: updateScores (system)", async (t) => {
    await t.step("should update scores for an existing user", async () => {
      console.log("Trace: Updating Alice's scores.");
      const result = await userProfileConcept.updateScores({ user: userAlice, lenderScore: 10, borrowerScore: 5 });
      assertEquals(result, {});

      console.log("Trace: Verifying Alice's scores were updated.");
      const profileData = await userProfileConcept._getProfile({ user: userAlice });
      assertEquals(profileData[0]?.profile.lenderScore, 10);
      assertEquals(profileData[0]?.profile.borrowerScore, 5);
    });

    await t.step("should fail if user profile does not exist (requires)", async () => {
      console.log("Trace: Attempting to update scores for non-existent profile for Bob.");
      const result = await userProfileConcept.updateScores({ user: userBob, lenderScore: 10, borrowerScore: 5 });
      assertEquals("error" in result && result.error, "User profile not found.");
    });
  });

  await t.step("Principle Test", async () => {
    console.log("\n--- Principle Test Trace ---");
    console.log("Goal: If a user creates a profile, other users can find them by dorm and see their display name.");

    console.log("Action 1: Bob creates a profile in Simmons Hall.");
    await userProfileConcept.createProfile({ user: userBob, displayName: "Bob", dorm: "Simmons Hall" });

    console.log("Action 2: Charlie creates a profile in East Campus.");
    await userProfileConcept.createProfile({ user: userCharlie, displayName: "Charlie", dorm: "East Campus" });

    // Note: Alice's profile was updated to Simmons Hall in a previous test.

    console.log("Verification 1: Query for users in Simmons Hall.");
    const simmonsUsers = await userProfileConcept._getUsersByDorm({ dorm: "Simmons Hall" });
    assertEquals(simmonsUsers.length, 2);
    const simmonsUserIds = simmonsUsers.map((u) => u.user);
    assertNotEquals(simmonsUserIds.indexOf(userAlice), -1, "Alice should be in Simmons Hall");
    assertNotEquals(simmonsUserIds.indexOf(userBob), -1, "Bob should be in Simmons Hall");
    assertEquals(simmonsUserIds.indexOf(userCharlie), -1, "Charlie should not be in Simmons Hall");

    console.log("Verification 2: Query for a user's profile to see their display name.");
    const bobsProfile = await userProfileConcept._getProfile({ user: userBob });
    assertEquals(bobsProfile[0]?.profile.displayName, "Bob");

    console.log("Principle fulfilled: Users can be found by dorm, and their display names are visible.");
    console.log("--- End Principle Test ---\n");
  });

  await client.close();
});
```
