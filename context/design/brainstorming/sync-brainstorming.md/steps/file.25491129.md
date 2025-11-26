---
timestamp: 'Tue Nov 25 2025 19:34:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193438.a311f38f.md]]'
content_id: 254911296c0f153b3dfed37d57f17ac12afd99024954a505f187c0648963d17b
---

# file: src/syncs/auth.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Requesting, UserAuthentication, UserProfile } from "@concepts";

/**
 * When a user successfully registers, automatically create a basic profile for them.
 * The `displayName` defaults to their `username`. They can update it later.
 */
export const CreateProfileOnRegister: Sync = ({ user, username }) => ({
  when: actions(
    [UserAuthentication.register, { username }, { user }],
  ),
  then: actions(
    [UserProfile.createProfile, { user, displayName: username, dorm: "Not Specified" }],
  ),
});

/**
 * Handles an authenticated request to update a user's own profile.
 */
export const UpdateProfileRequest: Sync = ({ request, accessToken, user, displayName, dorm, bio }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfile", accessToken, displayName, dorm, bio }, { request }],
  ),
  where: (frames) => frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user }),
  then: actions(
    [UserProfile.updateProfile, { user, displayName, dorm, bio }],
  ),
});

export const UpdateProfileResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfile" }, { request }],
    [UserProfile.updateProfile, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success", message: "Profile updated successfully." }],
  ),
});

export const UpdateProfileResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfile" }, { request }],
    [UserProfile.updateProfile, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: "error", error }],
  ),
});

/**
 * Handles a request to log out a user by invalidating their refresh token.
 */
export const LogoutRequest: Sync = ({ request, refreshToken }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout", refreshToken }, { request }],
  ),
  then: actions(
    [UserAuthentication.logout, { refreshToken }],
  ),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout" }, { request }],
    [UserAuthentication.logout, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success", message: "Logged out successfully." }],
  ),
});

/**
 * Handles an authenticated request to change a user's password.
 */
export const ChangePasswordRequest: Sync = ({ request, accessToken, oldPassword, newPassword }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword", accessToken, oldPassword, newPassword }, { request }],
  ),
  then: actions(
    [UserAuthentication.changePassword, { accessToken, oldPassword, newPassword }],
  ),
});

export const ChangePasswordResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    // Match both success (empty object) and error cases
    [UserAuthentication.changePassword, {}, { error }],
  ),
  then: actions(
    // If error is undefined, it's a success
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});
```

***

### 2. Item and Listing Management Syncs

This file handles all authenticated actions related to creating, modifying, and listing items, ensuring only item owners can perform these actions.
