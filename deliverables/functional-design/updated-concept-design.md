# Concept Specifications

## UserAuthentication

**concept**: UserAuthentication  
**purpose**: To authenticate users so that each person's data is securely associated with their identity and protected from unauthorized access.  
**principle**: If a user registers with a username and password, then later logs in using those same credentials, the system recognizes them as the same user, enabling access to their data. If they log out, their session ends and their private data becomes inaccessible until they log in again. 

**state**:
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

**actions**:
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

**notes**:
  * Sessions are stored separately from users to support multiple concurrent sessions per user and proper token management.
  * Access tokens are not stored in state as they are stateless JWTs validated by signature. Only refresh tokens are stored for revocation purposes.
  * Email is required for account recovery and notifications, though the notification delivery itself is handled by the Notifications concept.

---

## UserProfile

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



---

## Item

**concept**: Item [User]
**purpose**: To represent a unique, real-world object or material within the system, serving as the central entity for listings, requests, and transactions.
**principle**: If a user creates an item to represent their power drill, that digital item can then be listed for borrowing, requested by others, and tracked through transactions, while always maintaining its core identity and ownership.

**state**:
- a set of Items with
	- an optional owner User
	- a title String
	- a description String
	- a category String
	- a condition String
	- a createdAt Date

**actions**:
* `createItem (owner: User, title: String, description: String, category: String, condition: String): (item: Item)`
	 * **requires**: The owner user must exist.
	 * **effects**: Creates a new item record associated with an owner.
* `createOwnerlessItem (title: String, description: String, category: String): (item: Item)`
	 * **requires**: True.
	 * **effects**: Creates a new item record without an owner, to be used for sourcing requests (the "ITEM" type).
* `updateItemDetails (item: Item, title: String, description: String, category: String, condition: String)`
	* **requires**: The item must exist.
	* **effects**: Updates the core details of the item.
* `deleteItem(item: Item, owner: User)`
	* **requires**: The user must be the `owner` of the `item`. The item must not be part of any active or pending transaction.
	* **effects**: Permanently removes the `item` record from the system.

**notes**:
* The `owner` field is optional to support the "Sourcing Request" use case, where an item is defined by its properties but does not yet exist or have an owner in the system.

---

## ItemListing

**concept**: ItemListing [Item]
**purpose**: To manage the public catalog of items available for borrowing or permanent transfer, including their availability, photos, and visibility rules.
**principle**: If a user lists an item, specifying whether it's for borrowing or a free transfer, then other users can discover it through search, view its details and availability, and decide whether to request it.

**state**:
* a set of Items with
	* a type of BORROW or TRANSFER
	* a status of AVAILABLE or PENDING or CLAIMED or EXPIRED
	* a dormVisibility String
* a set of ItemPhotos with
	* an item Item
	* a photoUrl String
	* an order Number
* a set of AvailabilityWindows with
	* an item Item
	* a startTime DateTime
	* an endTime DateTime
	* a status of AVAILABLE or RESERVED

**actions**:
* `listItem (item: Item, type: BORROW or TRANSFER, dormVisibility: String): ()`
	* **requires**: The item must not already be listed.
	* **effects**: Makes an item visible in the catalog with status AVAILABLE.
* `unlistItem (item: Item): ()`
	* **requires**: The item must be listed.
	* **effects**: Removes an item from the catalog, setting its status to EXPIRED (or similar non-visible state).
*   `updateListingDetails(item: Item, dormVisibility: String, type: BORROW or TRANSFER)`
	*   **requires**: The `item` must be listed.
	*   **effects**: Updates the `dormVisibility` and `type` fields for the item's listing.
* `addPhoto (item: Item, photoUrl: String, order: Number): ()`
	* **requires**: The item must exist.
	* **effects**: Adds a photo to the item.
*   `removePhoto(item: Item, photoUrl: String)`
	*   **requires**: An `ItemPhoto` record must exist for the given `item` and `photoUrl`.
	*   **effects**: Removes the `ItemPhoto` record.
* `setAvailability (item: Item, startTime: DateTime, endTime: DateTime): (window: AvailabilityWindow)`
	* **requires**: The item must be listed with type BORROW. The window must not overlap with existing windows.
	* **effects**: Creates a new availability window for a borrowable item.
* `updateListingStatus (item: Item, status: AVAILABLE or PENDING or CLAIMED): ()`
	* **requires**: The item must be listed.
	* **effects**: Updates the status of the listing (e.g., to PENDING when a request is made).
* `reserveWindow (window: AvailabilityWindow): ()`
	* **requires**: The window must have status AVAILABLE.
	* **effects**: Sets the window status to RESERVED.
*   `removeAvailability(window: AvailabilityWindow)`
	*   **requires**: The `window` must exist and its status must not be `RESERVED`.
	*   **effects**: Removes the `AvailabilityWindow` record.

---

## ItemTransaction

**concept**: ItemTransaction [User, Item, Request]
**purpose**: To manage the active lifecycle of an approved exchange, from pickup to completion, ensuring both parties have a shared record of the transaction's state.
**principle**: Once a request is accepted, a transaction is created. The borrower can then mark the item as picked up, and later as returned, moving the transaction through its lifecycle until it is successfully completed.

**state**:
* a set of ItemTransactions with
	* a from User
	* a to User
	* an item Item
	* a request Request
	* a type of BORROW or TRANSFER or ITEM
	* a status of PENDING_PICKUP or IN_PROGRESS or PENDING_RETURN or COMPLETED or CANCELLED
	* a fromNotes String
	* a toNotes String
	* a createdAt Date
	* a pickedUpAt Date
	* a returnedAt Date

**actions**:
* `createTransaction (from: User, to: User, item: Item, request: Request, type: BORROW or TRANSFER or ITEM): (transaction: ItemTransaction)`
	* **system**
	* **requires**: A corresponding request must have been accepted.
	* **effects**: Creates a new transaction record with status PENDING_PICKUP.
* `markPickedUp (transaction: ItemTransaction): ()`
	* **requires**: The transaction must be in PENDING_PICKUP status.
	* **effects**: Sets status to IN_PROGRESS (for BORROW) or COMPLETED (for TRANSFER/ITEM) and records `pickedUpAt`.
* `markReturned (transaction: ItemTransaction): ()`
	* **requires**: The transaction must be in IN_PROGRESS status and of type BORROW.
	* **effects**: Sets status to PENDING_RETURN and records `returnedAt`.
* `confirmReturn (transaction: ItemTransaction): ()`
	* **requires**: The transaction must be in PENDING_RETURN status.
	* **effects**: Sets the status to COMPLETED, finalizing the transaction.
* `cancelTransaction (transaction: ItemTransaction): ()`
	* **requires**: The transaction must not be COMPLETED.
	* **effects**: Sets the status to CANCELLED.

**notes:**
*  The actors for each action must be clearly defined for authorization. For example: `markPickedUp` can be performed by either party (`from` or `to`), but `confirmReturn` can only be performed by the item's original owner (`from`).
*  A `cancelTransaction` action might have different implications depending on the status. For example, canceling while `IN_PROGRESS` might negatively impact a user's reputation score via a sync.

---

## ItemRequesting

**concept**: ItemRequesting [User, Item]
**purpose**: To enable users to formally express interest in an item, whether it's to borrow a listed item, claim a free one, or source a new one from the community.
**principle**: If a user finds an item they need, they can create a request. The item's owner is then notified and can choose to accept or reject the request, initiating a transaction.

**state**:
* a set of ItemRequests with
	* a requester User
	* an item Item
	* a type of BORROW or TRANSFER or ITEM
	* a status of PENDING or ACCEPTED or REJECTED or CANCELLED
	* a requesterNotes String
	* a requestedStartTime DateTime
	* a requestedEndTime DateTime
	* a createdAt Date

**actions**:
* `createRequest (requester: User, item: Item, type: BORROW or TRANSFER or ITEM, notes: String, startTime?: DateTime, endTime?: DateTime): (request: Request)`
	* **requires**: The item must be listed with a matching type, or have no owner if the type is ITEM. For BORROW, times must be provided and fall within an available window.
	* **effects**: Creates a new request with status PENDING.
* `acceptRequest (request: Request): ()`
	* **requires**: The request must be in PENDING status.
	* **effects**: Sets the request status to ACCEPTED. This will trigger a sync to create an `ItemTransaction`.
* `rejectRequest (request: Request): ()`
	* **requires**: The request must be in PENDING status.
	* **effects**: Sets the request status to REJECTED.
* `cancelRequest (request: Request): ()`
	* **requires**: The request must be in PENDING status. The user must be the requester.
	* **effects**: Sets the request status to CANCELLED.
	
**notes**: 
- A critical business rule should be implemented via synchronization: When one `Request` for an item is `ACCEPTED`, all other `PENDING` requests for that same item (or for overlapping time windows) should be automatically transitioned to `REJECTED` to prevent double-booking and remove the burden of manual rejection from the owner.

---
## Reviewing

**concept**: Reviewing [User, ItemTransaction]
**purpose**: To allow users to provide feedback and ratings on completed transactions, building a foundation of trust within the community.
**principle**: After a transaction is completed, both the provider and the recipient can leave a rating and a comment about the experience, which will be visible to other users.

**state**:
* a set of Reviews with
	* a reviewer User
	* a reviewee User
	* a transaction ItemTransaction
	* a rating Number
	* a comment String
	* a createdAt Date

**actions**:
* `submitReview (reviewer: User, reviewee: User, transaction: ItemTransaction, rating: Number, comment: String): (review: Review)`
	* **requires**: The transaction must be in COMPLETED status. The reviewer must be a party to the transaction. A review must not already exist for this reviewer/transaction pair. Rating is between 1-5.
	* **effects**: Creates a new review record. A sync will then trigger a recalculation of scores in `UserProfile`.
*   `editReview(review: Review, newRating: Number, newComment: String)`
	*   **requires**: The user performing the action must be the `reviewer` of the `review`. The review must have been submitted within a defined time window (e.g., 72 hours).
	*   **effects**: Updates the `rating` and `comment` fields of the `review`.
*   `deleteReview(review: Review)`
	*   **requires**: The user performing the action must be the `reviewer` of the `review`.
	*   **effects**: Permanently removes the `review` record.

**notes:**
 * The system should define business rules around editing or deleting reviews to prevent abuse. For example: "Reviews can only be edited by their author within 72 hours of submission. Deleting a review is permanent and may trigger a recalculation of the reviewee's score."

***

## Flagging

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

***

## Rewards

**concept**: Rewards [User]
**purpose**: To incentivize lending and responsible community behavior through a simple, point-based system.
**principle**: When a user performs a positive action, like completing a loan, they are awarded points. These points accumulate in their balance and can be redeemed for community perks.

**state**:
* a set of Users with
	* a pointsBalance Number
* a set of PointTransactions with
	* a user User
	* an amount Number
	* a description String
	* a createdAt Date

**actions**:
* `initializeAccount (user: User): ()`
	* **requires**: The user must not already have a rewards account.
	* **effects**: Creates a rewards account for the user with a balance of 0.
* `grantPoints (user: User, amount: Number, reason: String): (transaction: PointTransaction)`
	* **requires**: The amount must be positive.
	* **effects**: Increases the user's points balance and creates a positive transaction record.
* `redeemPoints (user: User, amount: Number, redemptionType: String): (transaction: PointTransaction)`
	* **requires**: The amount must be positive. The user's balance must be >= amount.
	* **effects**: Decreases the user's points balance and creates a negative transaction record with the redemption type as the description.
*   `revokePoints(user: User, amount: Number, reason: String): (transaction: PointTransaction)`
	*   **requires**: The amount must be positive. This is an administrative action.
	*   **effects**: Decreases the user's `pointsBalance` and creates a negative `PointTransaction` record.

---

## Communication

**concept**: Communication [User, Context]  
**purpose**: To enable direct messaging between users for coordinating pickups, resolving details, and building community connections around item sharing.  
**principle**: If a user sends a message to another user in the context of a transaction (e.g., borrowing request, item claim), then the recipient receives the message and can reply, enabling coordination without leaving the platform.  

**state**:
  * a set of Conversations with
    * a participant1 User
    * a participant2 User
    * a context Context
    * a contextType String
    * a createdAt Date
    * a lastMessageAt Date
  * a set of Messages with
    * a conversation Conversation
    * a sender User
    * a content String
    * a createdAt Date
    * a readAt Date

**actions**:
  * `createConversation (participant1: User, participant2: User, context: Context, contextType: String): (conversation: Conversation)`
    * **requires**: The participants must be different users. The context must exist. The contextType must be from a predefined set (e.g., "BORROW_REQUEST", "ITEM_CLAIM", "ITEM_CONTRIBUTION"). A conversation between these participants for this context must not already exist.
    * **effects**: Creates a new conversation.
  * `sendMessage (conversation: Conversation, sender: User, content: String): (message: Message)`
    * **requires**: The conversation must exist. The sender must be a participant in the conversation.
    * **effects**: Creates a new message and updates the conversation's lastMessageAt timestamp.
  * `markRead (message: Message): ()`
    * **requires**: The message must exist and not already be read.
    * **effects**: Sets the readAt timestamp for the message.

**notes**:
  * Conversations are scoped to a generic Context (e.g., BorrowRequest, ItemClaim, Contribution) to keep messaging organized and relevant. The contextType field helps identify what type of entity the context refers to.
  * The concept doesn't handle delivery - that's the responsibility of the Notifications concept via syncs.
  * Read receipts are tracked per message to support unread message counts.
  * The concept is intentionally simple - no group chats or file attachments in the initial design.

---

## Notifications

**concept**: Notifications [User]  
**purpose**: To deliver automated reminders and alerts to users about important events like upcoming returns, new requests, and item availability, reducing coordination friction.  
**principle**: If a borrowing request is approved and the pickup time is approaching, then the borrower receives a reminder notification, helping ensure timely coordination.  

**state**:
  * a set of Users with
    * an email String
    * a phoneNumber String
    * a notificationPreferences String
  * a set of Notifications with
    * a recipient User
    * a type String
    * a title String
    * a content String
    * a status of PENDING or SENT or FAILED
    * a createdAt Date
    * a sentAt Date
    * a readAt Date

**actions**:
  * `setNotificationPreferences (user: User, email: String, phoneNumber: String, preferences: String): ()`
    * **requires**: The user must exist.
    * **effects**: Updates the user's notification preferences and contact information.
  * `createNotification (recipient: User, type: String, title: String, content: String): (notification: Notification)`
    * **requires**: The recipient must exist. The type must be from a predefined set (e.g., "PICKUP_REMINDER", "RETURN_REMINDER", "NEW_REQUEST", "ITEM_AVAILABLE").
    * **effects**: Creates a new notification with status PENDING.
  * `sendNotification (notification: Notification): ()`
    * **system**
    * **requires**: The notification must be in PENDING status.
    * **effects**: Delivers the notification via the user's preferred channel (email/SMS) and sets status to SENT, recording sentAt timestamp.
  * `markNotificationRead (notification: Notification): ()`
    * **requires**: The notification must exist.
    * **effects**: Sets the readAt timestamp for the notification.

**notes**:
  * The concept handles both the creation of notifications and their delivery, maintaining completeness as required by concept design principles.
  * Notification delivery (email/SMS) must be implemented within this concept - it cannot call out to other concepts.
  * The sendNotification system action is triggered by syncs or scheduled tasks when notifications are created.
  * Preferences allow users to control notification frequency and channels, though the initial implementation may support only email.
