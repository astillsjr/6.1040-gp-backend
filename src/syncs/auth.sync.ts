import { actions, Sync } from "@engine";
import { Requesting, UserAuthentication, UserProfile } from "@concepts";

/**
 * Handles an authenticated request to create a user's profile.
 * Verifies that the user creating the profile is authenticated and can only create their own profile.
 */
export const CreateProfileRequest: Sync = (
  { request, accessToken, user, displayName, dorm },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserProfile/createProfile",
      accessToken,
      displayName,
      dorm,
    }, { request }],
  ),
  where: (frames) =>
    frames.query(UserAuthentication._getUserFromToken, { accessToken }, {
      user,
    }),
  then: actions(
    [UserProfile.createProfile, { user, displayName, dorm }],
  ),
});

export const CreateProfileResponse: Sync = ({ request, profile }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/createProfile" }, { request }],
    [UserProfile.createProfile, {}, { profile }],
  ),
  then: actions(
    [Requesting.respond, { request, profile }],
  ),
});

/**
 * Handles an authenticated request to update a user's profile.
 * Verifies that the user updating the profile is authenticated and can only update their own profile.
 */
export const UpdateProfileRequest: Sync = (
  { request, accessToken, user, displayName, dorm, bio },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserProfile/updateProfile",
      accessToken,
      displayName,
      dorm,
      bio,
    }, { request }],
  ),
  where: (frames) =>
    frames.query(UserAuthentication._getUserFromToken, { accessToken }, {
      user,
    }),
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
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles a request to log out a user by invalidating their refresh token.
 */
export const LogoutRequest: Sync = ({ request, refreshToken }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout", refreshToken }, {
      request,
    }],
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
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles an authenticated request to change a user's password.
 */
export const ChangePasswordRequest: Sync = (
  { request, accessToken, oldPassword, newPassword },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserAuthentication/changePassword",
      accessToken,
      oldPassword,
      newPassword,
    }, { request }],
  ),
  then: actions(
    [UserAuthentication.changePassword, {
      accessToken,
      oldPassword,
      newPassword,
    }],
  ),
});

export const ChangePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, {
      request,
    }],
    [UserAuthentication.changePassword, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});
