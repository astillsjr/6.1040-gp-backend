---
timestamp: 'Tue Nov 25 2025 19:37:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193742.ca411062.md]]'
content_id: fdc182720a13ae73c1836c068b7cff54d94aa0b97853c175df1b74514e3b2198
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

export const UpdateProfileResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfile" }, { request }],
    [UserProfile.updateProfile, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", message: "Profile updated successfully.", error }],
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

export const LogoutResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout" }, { request }],
    [UserAuthentication.logout, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", message: "Logged out successfully.", error }],
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
    [UserAuthentication.changePassword, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});
```

#### 2. Item and Listing Management Syncs
