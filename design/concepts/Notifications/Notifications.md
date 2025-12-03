# Notifications

**concept**: Notifications [User, Item]  
**purpose**: To deliver automated reminders and alerts to users about important events like upcoming returns, new requests, and item availability, reducing coordination friction.  
**principle**: If a borrowing request is approved and the pickup time is approaching, then the borrower receives a reminder notification, helping ensure timely coordination.  

**state**:
  * a set of Notifications with
    * a recipient User
    * a type NotificationType (e.g., "ITEM_EXPIRED", "ITEM_CLAIMED", "ITEM_RETURNED", "ITEM_LOST", "ITEM_FOUND", "ITEM_UPDATED", "ITEM_DELETED", "ITEM_REMOVED", "ITEM_CLAIMED_BY_OTHER", "ITEM_RETURNED_BY_OTHER", "ITEM_LOST_BY_OTHER", "ITEM_FOUND_BY_OTHER", "ITEM_UPDATED_BY_OTHER", "ITEM_DELETED_BY_OTHER", "ITEM_REMOVED_BY_OTHER")
    * a title String
    * a content String
    * a status of PENDING or SENT or FAILED
    * a createdAt Date
    * a readAt Date

**actions**:
  * `createAndSendNotification (recipient: User, type: NotificationType, context: NotificationContext): (notification: Notification)`
    * **requires**: The recipient must exist. The type must be from the predefined NotificationType set.
    * **effects**: Creates a new notification, constructs the title and content from the type and context, delivers it immediately via SSE, sets status to SENT, and records createdAt timestamp.
  * `markNotificationRead (notification: Notification): ()`
    * **requires**: The notification must exist.
    * **effects**: Sets the readAt timestamp for the notification.

**notes**:
  * The concept handles both the creation of notifications and their delivery, maintaining completeness as required by concept design principles.
  * Notification delivery is handled via Server-Sent Events (SSE) for real-time in-app notifications.
  * The title and content are automatically constructed from the notification type and context (e.g., item name, user name) to ensure consistency and maintainability.
  * Notifications are sent immediately upon creation via the SSE stream, so there is no separate send step.