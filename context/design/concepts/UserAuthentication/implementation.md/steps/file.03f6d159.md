---
timestamp: 'Mon Nov 24 2025 14:11:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_141148.3c4abec9.md]]'
content_id: 03f6d1598618c78506e22301eb1ef19e08203ca64786eb7409ac8323ba2aa5e3
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

Deno.test("UserAuthentication Concept", async (t) => {
  const [db, client] = await testDb();
  const auth = new UserAuthenticationConcept(db);

  let testUser: { user?: string; accessToken?: string; refreshToken?: string } = {};

  await t.step("Action: register", async (t) => {
    await t.step("should register a new user successfully", async () => {
      console.log("  - Testing successful registration...");
      const result = await auth.register({
        username: "testuser",
        password: "password123",
        email: "test@example.com",
      });

      assertNotEquals("error" in result, true, "Registration should not return an error");
      if (!("error" in result)) {
        assertExists(result.user);
        assertExists(result.accessToken);
        assertExists(result.refreshToken);
        testUser = result;

        const userDoc = await db.collection("UserAuthentication.users").findOne({ _id: result.user });
        assertEquals(userDoc?.username, "testuser");
        const sessionDoc = await db.collection("UserAuthentication.sessions").findOne({ refreshToken: result.refreshToken });
        assertEquals(sessionDoc?.user, result.user);
      }
      console.log("    Success: User registered and session created.");
    });

    await t.step("should fail to register with a duplicate username", async () => {
      console.log("  - Testing registration with duplicate username...");
      const result = await auth.register({
        username: "testuser",
        password: "password456",
        email: "another@example.com",
      });
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, "Username or email already exists.");
      }
      console.log("    Success: Prevented duplicate username.");
    });

    await t.step("should fail to register with an invalid email", async () => {
      console.log("  - Testing registration with invalid email...");
      const result = await auth.register({
        username: "newuser",
        password: "password123",
        email: "invalid-email",
      });
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, "Invalid email format.");
      }
      console.log("    Success: Prevented invalid email format.");
    });
  });

  await t.step("Action: login", async (t) => {
    await t.step("should fail with incorrect password", async () => {
      console.log("  - Testing login with incorrect password...");
      const result = await auth.login({ username: "testuser", password: "wrongpassword" });
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, "Invalid username or password.");
      }
      console.log("    Success: Prevented login with wrong password.");
    });

    await t.step("should login successfully with correct credentials", async () => {
      console.log("  - Testing successful login...");
      const result = await auth.login({ username: "testuser", password: "password123" });
      assertNotEquals("error" in result, true, "Login should not return an error");
      if (!("error" in result)) {
        assertExists(result.accessToken);
        assertExists(result.refreshToken);
        // Update tokens for subsequent tests
        testUser.accessToken = result.accessToken;
        testUser.refreshToken = result.refreshToken;
      }
      console.log("    Success: User logged in and received new tokens.");
    });
  });

  await t.step("Action: changePassword", async (t) => {
    await t.step("should fail with incorrect old password", async () => {
        console.log("  - Testing password change with incorrect old password...");
        const result = await auth.changePassword({
            accessToken: testUser.accessToken!,
            oldPassword: "wrongpassword",
            newPassword: "newpassword123",
        });
        assertEquals("error" in result, true);
        if ("error" in result) {
            assertEquals(result.error, "Incorrect old password.");
        }
        console.log("    Success: Prevented password change with wrong old password.");
    });

    await t.step("should change password successfully", async () => {
        console.log("  - Testing successful password change...");
        const result = await auth.changePassword({
            accessToken: testUser.accessToken!,
            oldPassword: "password123",
            newPassword: "newpassword123",
        });
        assertEquals("error" in result, false);

        // Verify by trying to log in with the new password
        const loginResult = await auth.login({ username: "testuser", password: "newpassword123" });
        assertEquals("error" in loginResult, false, "Login with new password should succeed.");
        console.log("    Success: Password changed and verified.");
    });
  });


  await t.step("Action: logout", async (t) => {
    await t.step("should logout successfully", async () => {
      console.log("  - Testing successful logout...");
      const result = await auth.logout({ refreshToken: testUser.refreshToken! });
      assertEquals("error" in result, false);
      const sessionDoc = await db.collection("UserAuthentication.sessions").findOne({ refreshToken: testUser.refreshToken });
      assertEquals(sessionDoc, null, "Session should be deleted after logout.");
      console.log("    Success: User logged out and session was invalidated.");
    });
  });
  
  await t.step("Principle Test: Full User Lifecycle", async () => {
    console.log("Principle Test: A user registers, logs out, logs back in, and deletes their account.");

    // 1. A user registers with a username and password
    console.log("  Step 1: User 'principleUser' registers.");
    const registerResult = await auth.register({
        username: "principleUser",
        password: "principlePassword",
        email: "principle@example.com",
    });
    assertNotEquals("error" in registerResult, true, "Principle user registration should succeed.");
    const { user: userId, accessToken, refreshToken } = registerResult as {user: string, accessToken: string, refreshToken: string};
    console.log("    - Registered successfully.");

    // 2. They log out, their session ends
    console.log("  Step 2: User 'principleUser' logs out.");
    const logoutResult = await auth.logout({ refreshToken });
    assertEquals("error" in logoutResult, false, "Principle user logout should succeed.");
    const sessionAfterLogout = await db.collection("UserAuthentication.sessions").findOne({ refreshToken });
    assertEquals(sessionAfterLogout, null, "Session should not exist after logout.");
    console.log("    - Logged out successfully, session invalidated.");

    // 3. Later they log in again using those same credentials
    console.log("  Step 3: User 'principleUser' logs back in.");
    const loginResult = await auth.login({ username: "principleUser", password: "principlePassword" });
    assertNotEquals("error" in loginResult, true, "Principle user login should succeed.");
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = loginResult as {accessToken: string, refreshToken: string};
    console.log("    - Logged in successfully, new session created.");

    // 4. They can perform an authenticated action (delete account)
    console.log("  Step 4: User 'principleUser' deletes their account.");
    const deleteResult = await auth.deleteAccount({ accessToken: newAccessToken, password: "principlePassword" });
    assertEquals("error" in deleteResult, false, "Principle user account deletion should succeed.");
    
    const userAfterDelete = await db.collection("UserAuthentication.users").findOne({ _id: userId });
    assertEquals(userAfterDelete, null, "User document should be deleted.");
    const sessionsAfterDelete = await db.collection("UserAuthentication.sessions").countDocuments({ user: userId });
    assertEquals(sessionsAfterDelete, 0, "All user sessions should be deleted.");
    console.log("    - Account and all associated data deleted successfully.");

    console.log("Principle fulfilled: The user authentication lifecycle works as expected.");
  });

  await client.close();
});
```
