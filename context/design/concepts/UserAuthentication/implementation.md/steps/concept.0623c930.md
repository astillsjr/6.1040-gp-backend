---
timestamp: 'Mon Nov 24 2025 14:09:16 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_140916.6ac279ff.md]]'
content_id: 0623c9306708bb2f705ce89b71bd59b84909a665d437f2e4096afe17d10d806e
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
  * `register (username: String, password: String, email: String): (userId: User, accessToken: String, refreshToken: String)`
  * `login (username: String, password: String): (accessToken: String, refreshToken: String)`
  * `logout (refreshToken: String)`
  * `changePassword (accessToken: String, oldPassword: String, newPassword: String)`
  * `deleteAccount (accessToken: String, password: String)`
