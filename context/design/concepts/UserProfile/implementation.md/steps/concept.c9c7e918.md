---
timestamp: 'Mon Nov 24 2025 15:51:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_155101.9445675f.md]]'
content_id: c9c7e918120002a6535c6dcb42016152e5c54187d3742e92fa65ee06e7fa1569
---

# concept: UserProfile

* **concept**: UserProfile \[User]
* **purpose**: To maintain user profile information including display name, dorm affiliation, and other public-facing details that enable community connection and item discovery.
* **principle**: If a user creates a profile with their dorm and display name, then other users can find them by dorm and see their display name when viewing items they list or when communicating with them.
* **state**:
  * `a set of Users with`
    * `a displayName String`
    * `a dorm String`
    * `a bio String`
    * `a createdAt Date`
    * `a lenderScore Number`
    * `a borrowerScore Number`
* **actions**:
  * `createProfile (user: User, displayName: String, dorm: String): (profile: User)`
    * **requires**: The user must not already have a profile. The dorm must be a valid MIT dorm name.
    * **effects**: Creates a profile for the user with the provided display name and dorm, initializing scores to 0 and bio to an empty string.
  * `updateProfile (user: User, displayName: String, dorm: String, bio: String)`
    * **requires**: The user must have an existing profile.
    * **effects**: Updates the user's profile information.
  * `updateScores (user: User, lenderScore: Number, borrowerScore: Number)`
    * **system**
    * **requires**: The user must have a profile.
    * **effects**: Updates the stored reputation scores for the user.
* **queries**:
  * `_getProfile (user: User): (displayName: String, dorm: String, bio: String, lenderScore: Number, borrowerScore: Number)`
    * **requires**: The user must have a profile.
    * **effects**: Returns the user's profile information.
