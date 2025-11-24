---
timestamp: 'Mon Nov 24 2025 14:09:16 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_140916.6ac279ff.md]]'
content_id: ba5ead593c2c2753aaf45e8de3a5eca8d1a59971cc889d672a8ba539b716be54
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

const credentials = {
  username: "alice",
  password: "password123",
  email: "alice@example.com",
};

Deno.test("UserAuthentication Concept: Principle Test", async () => {
  console.log("Running Principle Test: Register -> Logout -> Login");
  const [db, client] = await testDb();
  const auth = new UserAuthenticationConcept(db);

  try {
    // 1. A user registers with a username and password.
    console.log("  - Action: register");
    const registerResult = await auth.register(credentials);
    assertNotEquals("error" in registerResult, true, "Registration should succeed");
    const { userId, refreshToken } = registerResult as { userId: string; refreshToken: string };
    assertExists(userId);
    console.log(`    - Effect: User ${credentials.username} created with ID ${userId}.`);

    const userQueryResult = await auth._getUserByUsername({ username: "alice" });
    assertEquals(userQueryResult.length, 1, "User should be findable after registration");
    assertEquals(userQueryResult[0].user.username, "alice");
    console.log(`    - Query: Confirmed user '${credentials.username}' exists in the database.`);

    // 2. The user logs out.
    console.log("  - Action: logout");
    const logoutResult = await auth.logout({ refreshToken });
    assertEquals("error" in logoutResult, false, "Logout should succeed");
    console.log("    - Effect: Session ended.");

    const sessionQueryResult = await auth._findSessionByRefreshToken({ refreshToken });
    assertEquals(sessionQueryResult.length, 0, "Session should be deleted after logout");
    console.log("    - Query: Confirmed session for refresh token is no longer in the database.");

    // 3. The user later logs in using the same credentials.
    console.log("  - Action: login");
    const loginResult = await auth.login({ username: credentials.username, password: credentials.password });
    assertNotEquals("error" in loginResult, true, "Login should succeed with correct credentials");
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = loginResult as { accessToken: string; refreshToken: string };
    assertExists(newAccessToken);
    assertExists(newRefreshToken);
    console.log("    - Effect: System recognizes them, new session created, new tokens issued.");

    const newSessionQueryResult = await auth._findSessionByRefreshToken({ refreshToken: newRefreshToken });
    assertEquals(newSessionQueryResult.length, 1, "A new session should exist after login");
    assertEquals(newSessionQueryResult[0].session.user, userId, "New session should belong to the correct user");
    console.log("    - Query: Confirmed new session exists and is associated with the original user.");
  } finally {
    await client.close();
  }
});

Deno.test("UserAuthentication Concept: Action Tests", async (t) => {
  const [db, client] = await testDb();
  const auth = new UserAuthenticationConcept(db);

  await t.step("register: fails with duplicate username or email", async () => {
    console.log("  - Testing: register action (failure cases)");
    await auth.register(credentials); // Register once to create duplicates

    const duplicateUsernameResult = await auth.register({ ...credentials, email: "another@example.com" });
    assertEquals("error" in duplicateUsernameResult, true);
    assertEquals((duplicateUsernameResult as { error: string }).error, "Username or email already exists");
    console.log("    - Requirement: Blocked registration with duplicate username.");

    const duplicateEmailResult = await auth.register({ ...credentials, username: "bob" });
    assertEquals("error" in duplicateEmailResult, true);
    assertEquals((duplicateEmailResult as { error: string }).error, "Username or email already exists");
    console.log("    - Requirement: Blocked registration with duplicate email.");

    const invalidEmailResult = await auth.register({ username: "charlie", password: "pw", email: "invalid-email" });
    assertEquals("error" in invalidEmailResult, true);
    assertEquals((invalidEmailResult as { error: string }).error, "Invalid email format");
    console.log("    - Requirement: Blocked registration with invalid email format.");
  });

  await t.step("login: fails with incorrect credentials", async () => {
    console.log("  - Testing: login action (failure cases)");
    const wrongUserResult = await auth.login({ username: "nonexistent", password: "pw" });
    assertEquals("error" in wrongUserResult, true, "Login should fail for non-existent user");
    console.log("    - Requirement: Blocked login with non-existent username.");

    const wrongPasswordResult = await auth.login({ username: "alice", password: "wrongpassword" });
    assertEquals("error" in wrongPasswordResult, true, "Login should fail for incorrect password");
    console.log("    - Requirement: Blocked login with incorrect password.");
  });

  await t.step("changePassword and deleteAccount actions", async () => {
    console.log("  - Testing: changePassword and deleteAccount actions");
    const loginResult = await auth.login({ username: "alice", password: "password123" });
    const { accessToken } = loginResult as { accessToken: string };

    // Change password failure
    const changePwFail = await auth.changePassword({ accessToken, oldPassword: "wrong", newPassword: "newPass" });
    assertEquals("error" in changePwFail, true);
    console.log("    - Requirement (changePassword): Blocked with incorrect old password.");

    // Change password success
    const changePwSuccess = await auth.changePassword({ accessToken, oldPassword: "password123", newPassword: "newPassword456" });
    assertEquals("error" in changePwSuccess, false);
    console.log("    - Effect (changePassword): Password changed successfully.");

    // Old password should now fail
    const oldLoginFail = await auth.login({ username: "alice", password: "password123" });
    assertEquals("error" in oldLoginFail, true);
    console.log("    - Query: Confirmed old password no longer works for login.");

    // New password should work
    const newLoginSuccess = await auth.login({ username: "alice", password: "newPassword456" });
    assertEquals("error" in newLoginSuccess, false);
    console.log("    - Query: Confirmed new password works for login.");

    const { accessToken: newAccessToken } = newLoginSuccess as { accessToken: string };

    // Delete account failure
    const deleteFail = await auth.deleteAccount({ accessToken: newAccessToken, password: "wrong" });
    assertEquals("error" in deleteFail, true);
    console.log("    - Requirement (deleteAccount): Blocked with incorrect password.");

    // Delete account success
    const deleteSuccess = await auth.deleteAccount({ accessToken: newAccessToken, password: "newPassword456" });
    assertEquals("error" in deleteSuccess, false);
    console.log("    - Effect (deleteAccount): Account deleted successfully.");

    // User should no longer exist
    const finalUserQuery = await auth._getUserByUsername({ username: "alice" });
    assertEquals(finalUserQuery.length, 0);
    console.log("    - Query: Confirmed user no longer exists in database.");
  });

  await client.close();
});
```
