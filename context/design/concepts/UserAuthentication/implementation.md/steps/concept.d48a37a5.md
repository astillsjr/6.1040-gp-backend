---
timestamp: 'Mon Nov 24 2025 14:11:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_141148.3c4abec9.md]]'
content_id: d48a37a579d817d7ae61ff9a0efb5732285cc6da2aa71e087011d9edb0ffdada
---

# concept: UserAuthentication

* **concept**: UserAuthentication
* **purpose**: To authenticate users so that each person's data is securely associated with their identity and protected from unauthorized access.
* **principle**: If a user registers with a username and password, then later logs in using those same credentials, the system recognizes them as the same user, enabling access to their data. If they log out, their session ends and their private data becomes inaccessible until they log in again.
* **state**:
  * a set of Users with
    * a username String
    * a hashedPassword String
    * an email String
    * a createdAt Date
  * a set of Sessions with
    * a user User
    * a refreshToken String
    * a createdAt Date
    * an expiresAt Date
* **actions**:
  * `register (username: String, password: String, email: String): (user: User, accessToken: String, refreshToken: String)`
    * **requires**: The provided email and username must not already exist. The email must be in valid format.
    * **effects**: Creates a new user record with a hashed password and returns a new pair of session tokens.
  * `login (username: String, password: String): (accessToken: String, refreshToken: String)`
    * **requires**: The provided username and password must match an existing user account.
    * **effects**: Creates a new session and returns a new pair of access and refresh tokens for the authenticated user.
  * `logout (refreshToken: String)`
    * **requires**: A valid refresh token must be provided.
    * **effects**: Invalidates the user's current refresh token, ending their session.
  * `changePassword (accessToken: String, oldPassword: String, newPassword: String)`
    * **requires**: A valid access token must be provided. The old password must match the user's current password.
    * **effects**: Updates the user's stored password hash to the new password.
  * `deleteAccount (accessToken: String, password: String)`
    * **requires**: A valid access token must be provided. The provided password matches the user's current password.
    * **effects**: Permanently removes the user's account and all associated sessions.
