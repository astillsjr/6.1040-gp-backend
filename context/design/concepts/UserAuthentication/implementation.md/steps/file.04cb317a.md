---
timestamp: 'Mon Nov 24 2025 15:42:41 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_154241.f6e06fac.md]]'
content_id: 04cb317a2e08834c5f10079cbc8af817b12067ec4be25546978fb17446ee875a
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

// Helper for delaying execution
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

Deno.test("UserAuthentication Concept", async (t) => {
  const [db, client] = await testDb();
  // To test expiration, we need to access the private method. In a real scenario, you might use a library like `rewire` or `sinon`.
  // For this self-contained test, we'll cast to `any` to bypass TypeScript's private access checks.
  const auth = new UserAuthenticationConcept(db) as any;

  let testUser: { user?: string; accessToken?: string; refreshToken?: string } = {};
  const STRONG_PASSWORD = "Password123";
  const NEW_STRONG_PASSWORD = "Password456";

  await t.step("Action: register", async (t) => {
    await t.step("should fail with a weak password", async () => {
      console.log("  - Testing registration with weak password...");
      const weakPasswords = ["short", "nouppercase1", "NOLOWERCASE1", "NoNumber", ""];
      for (const weak of weakPasswords) {
        const result = await auth.register({
          username: `weakuser_${weak}`,
          password: weak,
          email: `weak_${weak}@example.com`,
        });
        assertEquals("error" in result, true);
        if ("error" in result) {
          assertEquals(result.error, "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.");
        }
      }
      console.log("    Success: Prevented multiple types of weak passwords.");
    });

    await t.step("should register a new user successfully", async () => {
      console.log("  - Testing successful registration...");
      const result = await auth.register({
        username: "testuser",
        password: STRONG_PASSWORD,
        email: "test@example.com",
      });
      assertNotEquals("error" in result, true, "Registration should not return an error");
      if (!("error" in result)) {
        testUser = result;
      }
      console.log("    Success: User registered and session created.");
    });

    await t.step("should fail to register with a duplicate username", async () => {
      console.log("  - Testing registration with duplicate username...");
      const result = await auth.register({ username: "testuser", password: STRONG_PASSWORD, email: "another@example.com" });
      assertEquals("error" in result, true);
      console.log("    Success: Prevented duplicate username.");
    });

    await t.step("should fail to register with an invalid email", async () => {
      console.log("  - Testing registration with invalid email...");
      const result = await auth.register({ username: "newuser", password: STRONG_PASSWORD, email: "invalid-email" });
      assertEquals("error" in result, true);
      console.log("    Success: Prevented invalid email format.");
    });
  });

  await t.step("Action: login", async (t) => {
    await t.step("should fail with incorrect password", async () => {
      console.log("  - Testing login with incorrect password...");
      const result = await auth.login({ username: "testuser", password: "wrongpassword" });
      assertEquals("error" in result, true);
      console.log("    Success: Prevented login with wrong password.");
    });

    await t.step("should login successfully with correct credentials", async () => {
      console.log("  - Testing successful login...");
      const result = await auth.login({ username: "testuser", password: STRONG_PASSWORD });
      assertNotEquals("error" in result, true);
      if (!("error" in result)) {
        testUser.accessToken = result.accessToken;
        testUser.refreshToken = result.refreshToken;
      }
      console.log("    Success: User logged in and received new tokens.");
    });
  });

  // NEW: Test for refreshToken action
  await t.step("Action: refreshToken", async (t) => {
    await t.step("should fail with an invalid refresh token", async () => {
      console.log("  - Testing token refresh with invalid token...");
      const result = await auth.refreshToken({ refreshToken: "invalid-token" });
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, "Invalid or expired refresh token.");
      }
      console.log("    Success: Rejected invalid refresh token.");
    });

    await t.step("should rotate tokens successfully", async () => {
      console.log("  - Testing successful token refresh (rotation)...");
      const oldRefreshToken = testUser.refreshToken!;
      const result = await auth.refreshToken({ refreshToken: oldRefreshToken });

      assertNotEquals("error" in result, true, "Token refresh should succeed");
      if (!("error" in result)) {
        assertNotEquals(result.accessToken, testUser.accessToken, "New access token should be different.");
        assertNotEquals(result.refreshToken, oldRefreshToken, "New refresh token should be different.");

        // Update testUser with new tokens
        testUser.accessToken = result.accessToken;
        testUser.refreshToken = result.refreshToken;

        // Verify old refresh token is invalidated
        const oldSession = await db.collection("UserAuthentication.sessions").findOne({ refreshToken: oldRefreshToken });
        assertEquals(oldSession, null, "Old session should be deleted.");
      }
      console.log("    Success: Tokens rotated and old session invalidated.");
    });
  });

  await t.step("Action: changePassword", async (t) => {
    await t.step("should fail with incorrect old password", async () => {
      console.log("  - Testing password change with incorrect old password...");
      const result = await auth.changePassword({ accessToken: testUser.accessToken!, oldPassword: "wrongpassword", newPassword: NEW_STRONG_PASSWORD });
      assertEquals("error" in result, true);
      console.log("    Success: Prevented password change with wrong old password.");
    });

    await t.step("should fail with a weak new password", async () => {
      console.log("  - Testing password change with a weak new password...");
      const result = await auth.changePassword({ accessToken: testUser.accessToken!, oldPassword: STRONG_PASSWORD, newPassword: "weak" });
      assertEquals("error" in result, true);
      console.log("    Success: Prevented changing to a weak password.");
    });

    await t.step("should change password successfully", async () => {
      console.log("  - Testing successful password change...");
      const result = await auth.changePassword({ accessToken: testUser.accessToken!, oldPassword: STRONG_PASSWORD, newPassword: NEW_STRONG_PASSWORD });
      assertEquals("error" in result, false);

      const loginResult = await auth.login({ username: "testuser", password: NEW_STRONG_PASSWORD });
      assertEquals("error" in loginResult, false);
      console.log("    Success: Password changed and verified.");
    });
  });

  // NEW: Test for token expiration
  await t.step("Security: Access Token Expiration", async () => {
    console.log("  - Testing that access tokens expire correctly...");
    // The private method `createAccessToken` is used here for a controlled test
    const expiredToken = await auth.createAccessToken(testUser.user, -1); // Expired in the past
    const shortLivedToken = await (auth as any).createAccessToken(testUser.user, 1 / 60); // Expires in 1 second

    const expiredResult = await auth.changePassword({ accessToken: expiredToken, oldPassword: NEW_STRONG_PASSWORD, newPassword: "AnotherGoodPassword1" });
    assertEquals(expiredResult.error, "Invalid or expired access token.");
    console.log("    Success: Immediately expired token was rejected.");

    await delay(1500); // Wait for the short-lived token to expire

    const shortLivedResult = await auth.changePassword({ accessToken: shortLivedToken, oldPassword: NEW_STRONG_PASSWORD, newPassword: "AnotherGoodPassword1" });
    assertEquals(shortLivedResult.error, "Invalid or expired access token.");
    console.log("    Success: Token expired after 1 second and was rejected.");
  });

  await t.step("Action: logout", async (t) => {
    // NEW: Negative test case for logout
    await t.step("should fail with an invalid refresh token", async () => {
      console.log("  - Testing logout with invalid token...");
      const result = await auth.logout({ refreshToken: "invalid-token" });
      assertEquals("error" in result, true);
      console.log("    Success: Rejected logout attempt for invalid session.");
    });

    await t.step("should logout successfully", async () => {
      console.log("  - Testing successful logout...");
      const result = await auth.logout({ refreshToken: testUser.refreshToken! });
      assertEquals("error" in result, false);
      const sessionDoc = await db.collection("UserAuthentication.sessions").findOne({ refreshToken: testUser.refreshToken });
      assertEquals(sessionDoc, null);
      console.log("    Success: User logged out and session was invalidated.");
    });
  });

  await t.step("Principle Test: Full User Lifecycle", async () => {
    console.log("Principle Test: A user registers, logs out, logs back in, and deletes their account.");
    // 1. Register
    const reg = await auth.register({ username: "principleUser", password: STRONG_PASSWORD, email: "principle@example.com" });
    assertNotEquals("error" in reg, true);
    const { user, refreshToken } = reg as { user: string; refreshToken: string };
    console.log("  - Step 1: Registered successfully.");
    // 2. Logout
    await auth.logout({ refreshToken });
    console.log("  - Step 2: Logged out successfully.");
    // 3. Login
    const login = await auth.login({ username: "principleUser", password: STRONG_PASSWORD });
    assertNotEquals("error" in login, true);
    const { accessToken: newAccessToken } = login as { accessToken: string };
    console.log("  - Step 3: Logged back in successfully.");
    // 4. Delete Account
    await auth.deleteAccount({ accessToken: newAccessToken, password: STRONG_PASSWORD });
    const userAfterDelete = await db.collection("UserAuthentication.users").findOne({ _id: user });
    assertEquals(userAfterDelete, null);
    console.log("  - Step 4: Account deleted successfully.");
    console.log("Principle fulfilled: The user authentication lifecycle works as expected.");
  });

  await client.close();
});
```
