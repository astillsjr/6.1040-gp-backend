# Notifications

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