# UserProfile

**concept**: UserProfile [User]  
**purpose**: To maintain user profile information including display name, dorm affiliation, and other public-facing details that enable community connection and item discovery.  
**principle**: If a user creates a profile with their dorm and display name, then other users can find them by dorm and see their display name when viewing items they list or when communicating with them.  

**state**:
  * a set of Users with
    * a displayName String
    * a dorm String
    * a bio String
    * a createdAt Date
    * a lenderScore number
    * a borrowerScoreNumber

**actions**:
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
  * `getProfile (user: User): (displayName: String, dorm: String, bio: String, lenderScore: number, borrowerScore: number)`
    * **requires**: The user must have a profile.
    * **effects**: Returns the user's profile information.

**notes**:
  * User is a generic type parameter since users are created by UserAuthentication. This concept only adds profile information to existing users.
  * Dorm information is critical for the "dorm-specific visibility" feature and proximity-based recommendations.
  * Display name is separate from username to allow users to present themselves differently in the community.
