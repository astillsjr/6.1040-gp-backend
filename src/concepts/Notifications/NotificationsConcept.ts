import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Notifications" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Item = ID;

// Define the types for our entries based on the concept state
type Notification = ID;
export type NotificationType = "ITEM_EXPIRED" | "ITEM_CLAIMED" | "ITEM_RETURNED" | "ITEM_LOST" | "ITEM_FOUND" | "ITEM_UPDATED" | "ITEM_DELETED" | "ITEM_REMOVED" | "ITEM_CLAIMED_BY_OTHER" | "ITEM_RETURNED_BY_OTHER" | "ITEM_LOST_BY_OTHER" | "ITEM_FOUND_BY_OTHER" | "ITEM_UPDATED_BY_OTHER" | "ITEM_DELETED_BY_OTHER" | "ITEM_REMOVED_BY_OTHER";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

/**
 * Context information for constructing notification messages.
 * Different notification types may use different fields.
 */
export interface NotificationContext {
  itemId?: Item;
  itemName?: string;
  userName?: string;
  otherUserName?: string;
  [key: string]: unknown; // Allow additional context fields
}

/**
 * a set of Notifications with
 *   a recipient User
 *   a type NotificationType
 *   a title String
 *   a content String
 *   a status NotificationStatus
 *   a createdAt Date
 *   a readAt Date
 */
interface NotificationDoc {
  _id: Notification;
  recipient: User;
  type: NotificationType;
  title: string;
  content: string;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * @concept Notifications
 * @purpose To deliver automated reminders and alerts to users about important events like upcoming returns, new requests, and item availability, reducing coordination friction.
 */
export default class NotificationsConcept {
  notifications: Collection<NotificationDoc>;

  constructor(private readonly db: Db) {
    this.notifications = db.collection<NotificationDoc>(PREFIX + "notifications");
  }

  /**
   * Create and send a new notification.
   * Constructs the title and content from the notification type and context,
   * then immediately marks it as sent (for SSE delivery).
   * @requires The recipient must exist. The type must be from the predefined NotificationType set.
   * @effects Creates a new notification, constructs title/content from type and context,
   * delivers it immediately via SSE, sets status to SENT, and records createdAt timestamp.
   */
  async createAndSendNotification(
    params: { recipient: User; type: NotificationType; context: NotificationContext },
  ): Promise<{ notification: Notification } | { error: string }> {
    const { recipient, type, context } = params;

    // Construct title and content from type and context
    const { title, content } = this.constructNotificationMessage(type, context);

    const now = new Date();
    const notification = {
      _id: freshID(),
      recipient,
      type,
      title,
      content,
      status: "SENT" as NotificationStatus,
      createdAt: now,
      readAt: null,
    };

    await this.notifications.insertOne(notification);

    // TODO: Push notification to SSE stream here when SSE infrastructure is ready
    // For now, the notification is marked as SENT and can be queried by the SSE stream

    return { notification: notification._id };
  }

  /**
   * Mark a notification as read.
   * @requires The notification must exist.
   * @effects Sets the readAt timestamp for the notification.
   */
  async markNotificationRead(
    { notification }: { notification: Notification },
  ): Promise<Empty | { error: string }> {
    const notificationDoc = await this.notifications.findOne({ _id: notification });

    if (!notificationDoc) {
      return { error: "Notification not found" };
    }

    await this.notifications.updateOne(
      { _id: notification },
      { $set: { readAt: new Date() } },
    );

    return {};
  }

  /**
   * _getNotification(notification: Notification): (notificationDoc: NotificationDoc)
   * @effects Returns the full document for a given notification ID.
   */
  async _getNotification(
    { notification }: { notification: Notification },
  ): Promise<{ notificationDoc: NotificationDoc }[]> {
    const doc = await this.notifications.findOne({ _id: notification });
    return doc ? [{ notificationDoc: doc }] : [];
  }

  /**
   * _getNotificationsByRecipient(recipient: User): (notificationDoc: NotificationDoc)
   * @effects Returns all notifications for a specific recipient, sorted by creation date (newest first).
   */
  async _getNotificationsByRecipient(
    { recipient }: { recipient: User },
  ): Promise<NotificationDoc[]> {
    return await this.notifications
      .find({ recipient })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * _getUnreadNotificationsByRecipient(recipient: User): (notificationDoc: NotificationDoc)
   * @effects Returns all unread notifications for a specific recipient, sorted by creation date (newest first).
   */
  async _getUnreadNotificationsByRecipient(
    { recipient }: { recipient: User },
  ): Promise<NotificationDoc[]> {
    return await this.notifications
      .find({ recipient, readAt: null })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Constructs title and content for a notification based on its type and context.
   * @private
   */
  private constructNotificationMessage(
    type: NotificationType,
    context: NotificationContext,
  ): { title: string; content: string } {
    const itemName = context.itemName || "an item";
    const userName = context.userName || "a user";
    const otherUserName = context.otherUserName || "another user";

    switch (type) {
      case "ITEM_EXPIRED":
        return {
          title: "Item Expired",
          content: `${itemName} has expired and is no longer available.`,
        };
      case "ITEM_CLAIMED":
        return {
          title: "Item Claimed",
          content: `You have successfully claimed ${itemName}.`,
        };
      case "ITEM_RETURNED":
        return {
          title: "Item Returned",
          content: `${itemName} has been returned.`,
        };
      case "ITEM_LOST":
        return {
          title: "Item Lost",
          content: `${itemName} has been marked as lost.`,
        };
      case "ITEM_FOUND":
        return {
          title: "Item Found",
          content: `${itemName} has been found.`,
        };
      case "ITEM_UPDATED":
        return {
          title: "Item Updated",
          content: `${itemName} has been updated.`,
        };
      case "ITEM_DELETED":
        return {
          title: "Item Deleted",
          content: `${itemName} has been deleted.`,
        };
      case "ITEM_REMOVED":
        return {
          title: "Item Removed",
          content: `${itemName} has been removed.`,
        };
      case "ITEM_CLAIMED_BY_OTHER":
        return {
          title: "Item Claimed",
          content: `${otherUserName} has claimed ${itemName}.`,
        };
      case "ITEM_RETURNED_BY_OTHER":
        return {
          title: "Item Returned",
          content: `${otherUserName} has returned ${itemName}.`,
        };
      case "ITEM_LOST_BY_OTHER":
        return {
          title: "Item Lost",
          content: `${otherUserName} has marked ${itemName} as lost.`,
        };
      case "ITEM_FOUND_BY_OTHER":
        return {
          title: "Item Found",
          content: `${otherUserName} has marked ${itemName} as found.`,
        };
      case "ITEM_UPDATED_BY_OTHER":
        return {
          title: "Item Updated",
          content: `${otherUserName} has updated ${itemName}.`,
        };
      case "ITEM_DELETED_BY_OTHER":
        return {
          title: "Item Deleted",
          content: `${otherUserName} has deleted ${itemName}.`,
        };
      case "ITEM_REMOVED_BY_OTHER":
        return {
          title: "Item Removed",
          content: `${otherUserName} has removed ${itemName}.`,
        };
      default:
        return {
          title: "Notification",
          content: "You have a new notification.",
        };
    }
  }
}