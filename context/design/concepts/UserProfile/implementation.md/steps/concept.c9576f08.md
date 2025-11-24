---
timestamp: 'Mon Nov 24 2025 15:54:02 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_155402.5a895931.md]]'
content_id: c9576f088a8c27d1865ff19e2a428b0a51ae492a53de06315430b6077a1a6745
---

# concept: UserProfile

* **concept**: UserProfile \[User]
* **purpose**: To maintain user profile information including display name, dorm affiliation, and other public-facing details that enable community connection and item discovery.
* **principle**: If a user creates a profile with their dorm and display name, then other users can find them by dorm and see their display name when viewing items they list or when communicating with them.
* **state**:
  * a set of Users with
    * a displayName String
    * a dorm String
    * a bio String
    * a createdAt Date
    * a lenderScore number
    * a borrowerScore number
* **actions**:
  * `createProfile (user: User, displayName: String, dorm: String): (profile: User)`
    * **requires**: The user must not already have a profile. The dorm must be a valid MIT dorm name.
    * **effects**: Creates a profile for the user with the provided display name and dorm, initializing scores to 0.
  * `updateProfile (user: User, displayName: String, dorm: String, bio: String)`
    * **requires**: The user must have an existing profile.
    * **effects**: Updates the user's profile information.
  * `updateScores (user: User, lenderScore: Number, borrowerScore: Number)`
    * **system**
    * **requires**: The user must have a profile.
    * **effects**: Updates the stored reputation scores for the user.
* **queries**:
  * `_getProfile (user: User): (displayName: String, dorm: String, bio: String, lenderScore: number, borrowerScore: number)`
    * **requires**: The user must have a profile.
    * **effects**: Returns the user's profile information.
  * `_getUsersByDorm (dorm: String): (user: User, displayName: String)`
    * **requires**: `dorm` is a valid dorm name.
    * **effects**: Returns a list of all users and their display names associated with the given dorm.
