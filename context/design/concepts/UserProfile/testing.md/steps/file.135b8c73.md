---
timestamp: 'Tue Nov 25 2025 00:52:41 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_005241.bc90cfa5.md]]'
content_id: 135b8c735cecd007418b2180a0d5317dd37873313b6f1fdbf479ed912447023d
---

# file: src/concepts/UserProfile/UserProfileConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserProfileConcept from "./UserProfileConcept.ts";
import { ID } from "@utils/types.ts";

// Define test user IDs for consistency
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;

Deno.test("Operational Principle: Create profiles and find users by dorm", async () => {
  console.log("\n--- Test: Operational Principle ---");
  console.log("Trace: Create profiles for Alice and Bob in Baker House, Charlie in Simmons Hall.");
  console.log("Then, query for users in Baker House and verify the results.");
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Step 1: Alice creates a profile in Baker House
    console.log(`Action: createProfile for user '${userAlice}' in 'Baker House'`);
    const aliceResult = await userProfileConcept.createProfile({
      user: userAlice,
      displayName: "Alice",
      dorm: "Baker House",
    });
    console.log("Result:", aliceResult);
    assertExists(aliceResult.profile);
    assertEquals(aliceResult.profile, userAlice);

    // Step 2: Bob creates a profile in Baker House
    console.log(`Action: createProfile for user '${userBob}' in 'Baker House'`);
    const bobResult = await userProfileConcept.createProfile({
      user: userBob,
      displayName: "Bob",
      dorm: "Baker House",
    });
    console.log("Result:", bobResult);
    assertExists(bobResult.profile);

    // Step 3: Charlie creates a profile in a different dorm, Simmons Hall
    console.log(`Action: createProfile for user '${userCharlie}' in 'Simmons Hall'`);
    const charlieResult = await userProfileConcept.createProfile({
      user: userCharlie,
      displayName: "Charlie",
      dorm: "Simmons Hall",
    });
    console.log("Result:", charlieResult);
    assertExists(charlieResult.profile);

    // Step 4: Query for users in Baker House to test community discovery
    console.log("Query: _getUsersByDorm for 'Baker House'");
    const bakerHouseUsers = await userProfileConcept._getUsersByDorm({ dorm: "Baker House" });
    console.log("Result:", bakerHouseUsers);

    // Assertions: Verify that Alice and Bob are found, but Charlie is not.
    assertEquals(bakerHouseUsers.length, 2);
    const bakerUserIds = bakerHouseUsers.map((u) => u.user);
    assertEquals(bakerUserIds.includes(userAlice), true);
    assertEquals(bakerUserIds.includes(userBob), true);
    assertEquals(bakerUserIds.includes(userCharlie), false);

    // Step 5: Get Alice's profile to see her details
    console.log(`Query: _getProfile for '${userAlice}'`);
    const aliceProfile = await userProfileConcept._getProfile({ user: userAlice });
    console.log("Result:", aliceProfile);
    assertEquals(aliceProfile.length, 1);
    assertEquals(aliceProfile[0].profile.displayName, "Alice");
    assertEquals(aliceProfile[0].profile.dorm, "Baker House");
    assertEquals(aliceProfile[0].profile.borrowerScore, 0);

    console.log("Principle fulfilled successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario 1: Profile creation failure cases", async () => {
  console.log("\n--- Test: Interesting Scenario 1: Profile creation failure cases ---");
  console.log("Trace: Attempt to create a duplicate profile and a profile with an invalid dorm.");
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Setup: Create an initial valid profile for Alice
    console.log(`Action: createProfile for user '${userAlice}'`);
    await userProfileConcept.createProfile({ user: userAlice, displayName: "Alice", dorm: "Next House" });

    // Case 1: Attempt to create a duplicate profile
    console.log(`Action: createProfile for existing user '${userAlice}' (should fail)`);
    const duplicateResult = await userProfileConcept.createProfile({
      user: userAlice,
      displayName: "Alice Again",
      dorm: "Next House",
    });
    console.log("Result:", duplicateResult);
    assertExists(duplicateResult.error, "Expected error when creating a duplicate profile.");
    assertEquals(duplicateResult.error, "User already has a profile.");

    // Case 2: Attempt to create a profile with an invalid dorm name
    console.log(`Action: createProfile for user '${userBob}' with invalid dorm 'Hogwarts' (should fail)`);
    const invalidDormResult = await userProfileConcept.createProfile({
      user: userBob,
      displayName: "Bob",
      dorm: "Hogwarts",
    });
    console.log("Result:", invalidDormResult);
    assertExists(invalidDormResult.error, "Expected error for invalid dorm name.");
    assertEquals(invalidDormResult.error, "Invalid dorm name: Hogwarts.");

    console.log("Profile creation requirements tested successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario 2: Update an existing profile", async () => {
  console.log("\n--- Test: Interesting Scenario 2: Update an existing profile ---");
  console.log("Trace: Create a profile, update it, and verify the changes.");
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Setup: Create a profile for Bob
    console.log(`Action: createProfile for '${userBob}'`);
    const createResult = await userProfileConcept.createProfile({
      user: userBob,
      displayName: "Bobby",
      dorm: "East Campus",
    });
    console.log("Create Result:", createResult);
    assertExists(createResult.profile);

    // Action: Update Bob's profile
    const newDisplayName = "Robert";
    const newDorm = "Random Hall";
    const newBio = "I like building things.";
    console.log(`Action: updateProfile for '${userBob}' with new info.`);
    const updateResult = await userProfileConcept.updateProfile({
      user: userBob,
      displayName: newDisplayName,
      dorm: newDorm,
      bio: newBio,
    });
    console.log("Update Result:", updateResult);
    assertEquals(updateResult, {}, "Update action should return an empty object on success.");

    // Verification: Query the profile to confirm the effects
    console.log(`Query: _getProfile for '${userBob}' to check updates.`);
    const profileData = await userProfileConcept._getProfile({ user: userBob });
    console.log("Query Result:", profileData);
    assertEquals(profileData.length, 1);
    const profile = profileData[0].profile;
    assertEquals(profile.displayName, newDisplayName);
    assertEquals(profile.dorm, newDorm);
    assertEquals(profile.bio, newBio);

    console.log("Profile update effects confirmed successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario 3: Attempts to update non-existent profiles", async () => {
  console.log("\n--- Test: Interesting Scenario 3: Attempts to update non-existent profiles ---");
  console.log("Trace: Attempt to update and update scores for a user without a profile.");
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Case 1: Attempt to update a profile that does not exist
    console.log(`Action: updateProfile for non-existent user '${userCharlie}' (should fail)`);
    const updateResult = await userProfileConcept.updateProfile({
      user: userCharlie,
      displayName: "Ghost",
      dorm: "Baker House",
      bio: "I'm not here.",
    });
    console.log("Result:", updateResult);
    assertExists(updateResult.error, "Expected an error when updating a non-existent profile.");
    assertEquals(updateResult.error, "User profile not found.");

    // Case 2: Attempt to update scores for a profile that does not exist
    console.log(`Action: updateScores for non-existent user '${userCharlie}' (should fail)`);
    const scoresResult = await userProfileConcept.updateScores({
      user: userCharlie,
      lenderScore: 10,
      borrowerScore: 5,
    });
    console.log("Result:", scoresResult);
    assertExists(scoresResult.error, "Expected an error when updating scores for a non-existent profile.");
    assertEquals(scoresResult.error, "User profile not found.");

    console.log("Update requirements for non-existent users tested successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario 4: Update reputation scores (system action)", async () => {
  console.log("\n--- Test: Interesting Scenario 4: Update reputation scores ---");
  console.log("Trace: Create a profile, then update its scores and verify the change.");
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);
  try {
    // Setup: Create a profile for Alice
    console.log(`Action: createProfile for '${userAlice}'`);
    await userProfileConcept.createProfile({ user: userAlice, displayName: "Alice", dorm: "Maseeh Hall" });

    // Before state: Check initial scores
    let profileData = await userProfileConcept._getProfile({ user: userAlice });
    assertEquals(profileData[0].profile.lenderScore, 0);
    assertEquals(profileData[0].profile.borrowerScore, 0);

    // Action: Update scores
    console.log(`Action: updateScores for '${userAlice}' to 50 and 75.`);
    const updateResult = await userProfileConcept.updateScores({
      user: userAlice,
      lenderScore: 50,
      borrowerScore: 75,
    });
    console.log("Result:", updateResult);
    assertEquals(updateResult, {}, "updateScores should return empty object on success");

    // Verification: Query the profile again to confirm updated scores
    console.log(`Query: _getProfile for '${userAlice}' to check scores.`);
    profileData = await userProfileConcept._getProfile({ user: userAlice });
    console.log("Query Result:", profileData);
    assertEquals(profileData[0].profile.lenderScore, 50);
    assertEquals(profileData[0].profile.borrowerScore, 75);

    console.log("System action updateScores tested successfully.");
  } finally {
    await client.close();
  }
});
```
