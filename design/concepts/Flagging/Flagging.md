# Flagging

**concept**: Flagging [User]
**purpose**: To enable community-driven moderation by allowing users to report inappropriate content or problematic behavior for administrative review.
**principle**: If a user encounters an inappropriate item listing or has a negative interaction, they can flag the user or item with a reason. This creates a case for moderators to review and resolve.

**state**:
* a set of Flags with
	* a flagger User
	* a flaggedUser User
	* an optional flaggedItem Item
	* a reason String
	* a status of PENDING or RESOLVED or DISMISSED
	* a createdAt Date

**actions**:
* `flagUser (flagger: User, flaggedUser: User, reason: String): (flag: Flag)`
	* **requires**: The flagger and flagged must be different users.
	* **effects**: Creates a new flag with status PENDING.
* `resolveFlag (flag: Flag): ()`
	* **requires**: The flag must be in PENDING status.
	* **effects**: Sets the flag status to RESOLVED.
* `dismissFlag(flag: Flag)`
	*   **requires**: The flag must be in `PENDING` status.
	*   **effects**: Sets the flag status to `DISMISSED`.
