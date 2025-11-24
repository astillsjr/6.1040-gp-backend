---
timestamp: 'Mon Nov 24 2025 15:51:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_155101.9445675f.md]]'
content_id: 328dd2a2563d6c851567bb99daa86940a2da46b9f798fe9637b6ffc2a47178ce
---

# file: src/concepts/userprofile/UserProfileConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileConcept from "./UserProfileConcept.ts";

Deno.test("UserProfile Concept", async (t) => {
  const [db, client] = await testDb();
  const userProfile = new UserProfileConcept(db);

  // Mock User IDs
  const userA = "userA" as ID;
  const userB = "userB" as ID;

  await t.step("Principle: Create and retrieve a profile", async () => {
    console.log("Trace: Testing the core principle of UserProfile.");
    console.log(`Action: createProfile for ${userA} in 'Baker House'`);
    const createResult = await userProfile.createProfile({
      user: userA,
      displayName: "Alice",
      dorm: "Baker House",
    });
    assertEquals("profile" in createResult, true);

    console.log(`Query: _getProfile for ${userA}`);
    const getResult = await userProfile._getProfile({ user: userA });
    assertEquals(getResult.length, 1);
    const profile = getResult[0].profile;
    assertEquals(profile.displayName, "Alice");
    assertEquals(profile.dorm, "Baker House");
    console.log("Principle fulfilled: A created profile can be successfully retrieved with its details.");
  });

  await t.step("Action: createProfile", async (t) => {
    await t.step("should fail if a profile already exists", async () => {
      console.log("Trace: Testing createProfile 'requires' - profile must not exist.");
      console.log(`Action: Attempting to create profile for ${userA} again.`);
      const result = await userProfile.createProfile({
        user: userA,
        displayName: "Alice V2",
        dorm: "Maseeh Hall",
      });
      assertExists(result.error);
      assertEquals(result.error, `User ${userA} already has a profile.`);
      console.log("Effect confirmed: Action failed as required.");
    });

    await t.step("should fail for an invalid dorm", async () => {
      console.log("Trace: Testing createProfile 'requires' - dorm must be valid.");
      console.log(`Action: Attempting to create profile for ${userB} with an invalid dorm.`);
      const result = await userProfile.createProfile({
        user: userB,
        displayName: "Bob",
        dorm: "Invalid Dorm Hall",
      });
      assertExists(result.error);
      assertEquals(result.error, "Invalid dorm name: Invalid Dorm Hall.");
      console.log("Effect confirmed: Action failed as required.");
    });
  });

  await t.step("Action: updateProfile", async (t) => {
    await t.step("should successfully update an existing profile", async () => {
      console.log("Trace: Testing successful updateProfile action.");
      console.log(`Action: updateProfile for ${userA}.`);
      await userProfile.updateProfile({
        user: userA,
        displayName: "Alice Updated",
        dorm: "Simmons Hall",
        bio: "I like concepts!",
      });

      console.log(`Query: _getProfile for ${userA} to confirm effects.`);
      const result = await userProfile._getProfile({ user: userA });
      assertEquals(result.length, 1);
      const profile = result[0].profile;
      assertEquals(profile.displayName, "Alice Updated");
      assertEquals(profile.dorm, "Simmons Hall");
      assertEquals(profile.bio, "I like concepts!");
      console.log("Effects confirmed: Profile was updated successfully.");
    });

    await t.step("should fail if the profile does not exist", async () => {
      console.log("Trace: Testing updateProfile 'requires' - profile must exist.");
      console.log(`Action: Attempting to update profile for non-existent user ${userB}.`);
      const result = await userProfile.updateProfile({
        user: userB,
        displayName: "Bob",
        dorm: "Next House",
        bio: "...",
      });
      assertExists(result.error);
      assertEquals(result.error, `User ${userB} does not have a profile.`);
      console.log("Effect confirmed: Action failed as required.");
    });
  });

  await t.step("Action: updateScores (system)", async (t) => {
    await t.step("should successfully update scores for an existing profile", async () => {
      console.log("Trace: Testing successful updateScores system action.");
      console.log(`Action: updateScores for ${userA}.`);
      await userProfile.updateScores({ user: userA, lenderScore: 5, borrowerScore: 10 });

      console.log(`Query: _getProfile for ${userA} to confirm effects.`);
      const result = await userProfile._getProfile({ user: userA });
      const profile = result[0].profile;
      assertEquals(profile.lenderScore, 5);
      assertEquals(profile.borrowerScore, 10);
      console.log("Effects confirmed: Scores were updated successfully.");
    });

    await t.step("should fail if the profile does not exist", async () => {
        console.log("Trace: Testing updateScores 'requires' - profile must exist.");
        console.log(`Action: Attempting to update scores for non-existent user ${userB}.`);
        const result = await userProfile.updateScores({ user: userB, lenderScore: 1, borrowerScore: 1 });
        assertExists(result.error);
        assertEquals(result.error, `User ${userB} does not have a profile.`);
        console.log("Effect confirmed: Action failed as required.");
    });
  });

  // Close the database connection
  await client.close();
});
```
