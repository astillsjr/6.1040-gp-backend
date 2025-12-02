---
timestamp: 'Tue Dec 02 2025 04:22:22 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251202_042222.d2cb97b0.md]]'
content_id: a9d857e242521cd5292933f74e2c76cb937f67ebc34ce2546abbde7f6d940fbe
---

# concept: Flagging

**concept**: Flagging \[User, Item]
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
  * **requires**: The flag must be in `PENDING` status.
  * **effects**: Sets the flag status to `DISMISSED`.
