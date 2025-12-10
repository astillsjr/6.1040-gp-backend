import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import NotificationsConcept, { NotificationType } from "./NotificationsConcept.ts";

// Define generic types for testing
type User = ID;

Deno.test("NotificationsConcept Action: createAndSendNotification", async (t) => {
  const [db, client] = await testDb();
  const notificationsConcept = new NotificationsConcept(db);

  const recipient = "user:Alice" as User;

  await t.step("  - Test successful notification creation", async () => {
    console.log("    - Testing successful notification creation and sending.");
    const result = await notificationsConcept.createAndSendNotification({
      recipient,
      type: "ITEM_CLAIMED" as NotificationType,
      context: {
        itemId: "item:drill123" as ID,
        itemName: "Power Drill",
      },
    });

    assert(!("error" in result), "Notification creation should succeed.");
    assertExists(result.notification, "Should return a notification ID.");

    // Verify notification was created in database
    const notificationDoc = await notificationsConcept._getNotification({
      notification: (result as { notification: ID }).notification,
    });
    assertExists(notificationDoc[0], "Notification should exist in database.");
    assertEquals(notificationDoc[0].notificationDoc.recipient, recipient);
    assertEquals(notificationDoc[0].notificationDoc.type, "ITEM_CLAIMED");
    assertEquals(notificationDoc[0].notificationDoc.title, "Item Claimed");
    assertEquals(notificationDoc[0].notificationDoc.content, "You have successfully claimed Power Drill.");
    assertEquals(notificationDoc[0].notificationDoc.status, "SENT");
    assertExists(notificationDoc[0].notificationDoc.createdAt);
    assertEquals(notificationDoc[0].notificationDoc.readAt, null);
  });

  await t.step("  - Test different notification types", async () => {
    console.log("    - Testing various notification types and their message construction.");
    const testCases: Array<{ type: NotificationType; context: any; expectedTitle: string; expectedContent: string }> = [
      {
        type: "ITEM_EXPIRED",
        context: { itemName: "Old Shovel" },
        expectedTitle: "Item Expired",
        expectedContent: "Old Shovel has expired and is no longer available.",
      },
      {
        type: "ITEM_RETURNED",
        context: { itemName: "Lawn Mower" },
        expectedTitle: "Item Returned",
        expectedContent: "Lawn Mower has been returned.",
      },
      {
        type: "ITEM_LOST",
        context: { itemName: "Bicycle" },
        expectedTitle: "Item Lost",
        expectedContent: "Bicycle has been marked as lost.",
      },
      {
        type: "ITEM_FOUND",
        context: { itemName: "Bicycle" },
        expectedTitle: "Item Found",
        expectedContent: "Bicycle has been found.",
      },
      {
        type: "ITEM_UPDATED",
        context: { itemName: "Tool Set" },
        expectedTitle: "Item Updated",
        expectedContent: "Tool Set has been updated.",
      },
      {
        type: "ITEM_DELETED",
        context: { itemName: "Old Item" },
        expectedTitle: "Item Deleted",
        expectedContent: "Old Item has been deleted.",
      },
      {
        type: "ITEM_REMOVED",
        context: { itemName: "Unwanted Item" },
        expectedTitle: "Item Removed",
        expectedContent: "Unwanted Item has been removed.",
      },
      {
        type: "ITEM_CLAIMED_BY_OTHER",
        context: { itemName: "Power Drill", otherUserName: "Bob" },
        expectedTitle: "Item Claimed",
        expectedContent: "Bob has claimed Power Drill.",
      },
      {
        type: "ITEM_RETURNED_BY_OTHER",
        context: { itemName: "Lawn Mower", otherUserName: "Charlie" },
        expectedTitle: "Item Returned",
        expectedContent: "Charlie has returned Lawn Mower.",
      },
    ];

    for (const testCase of testCases) {
      const result = await notificationsConcept.createAndSendNotification({
        recipient,
        type: testCase.type,
        context: testCase.context,
      });

      assert(!("error" in result));
      const notificationDoc = await notificationsConcept._getNotification({
        notification: (result as { notification: ID }).notification,
      });
      assertEquals(notificationDoc[0].notificationDoc.title, testCase.expectedTitle);
      assertEquals(notificationDoc[0].notificationDoc.content, testCase.expectedContent);
    }
  });

  await t.step("  - Test notification with default context values", async () => {
    console.log("    - Testing notification with minimal context (uses defaults).");
    const result = await notificationsConcept.createAndSendNotification({
      recipient,
      type: "ITEM_CLAIMED" as NotificationType,
      context: {}, // Empty context should use defaults
    });

    assert(!("error" in result));
    const notificationDoc = await notificationsConcept._getNotification({
      notification: result.notification,
    });
    assertEquals(notificationDoc[0].notificationDoc.content, "You have successfully claimed an item.");
  });

  await client.close();
});

Deno.test("NotificationsConcept Action: markNotificationRead", async (t) => {
  const [db, client] = await testDb();
  const notificationsConcept = new NotificationsConcept(db);

  const recipient = "user:Bob" as User;

  // Setup: Create a notification
  const createResult = await notificationsConcept.createAndSendNotification({
    recipient,
    type: "ITEM_EXPIRED" as NotificationType,
    context: {
      itemName: "Test Item",
    },
  });
  assert(!("error" in createResult));
  const notification = (createResult as { notification: ID }).notification;

  await t.step("  - Test successful notification read marking", async () => {
    console.log("    - Testing successful marking of a notification as read.");
    const result = await notificationsConcept.markNotificationRead({ notification });

    assert(!("error" in result), "Marking notification as read should succeed.");

    // Verify notification was marked as read
    const notificationDoc = await notificationsConcept._getNotification({ notification });
    assertExists(notificationDoc[0]);
    assertExists(notificationDoc[0].notificationDoc.readAt, "Notification should have readAt timestamp.");
  });

  await t.step("  - Test requires: notification must exist", async () => {
    console.log("    - Testing requirement: marking non-existent notification fails.");
    const fakeNotification = "notification:fake" as ID;
    const result = await notificationsConcept.markNotificationRead({ notification: fakeNotification });

    assert("error" in result, "Should return an error for non-existent notification.");
    assertEquals(result.error, "Notification not found");
  });

  await t.step("  - Test marking already-read notification", async () => {
    console.log("    - Testing that marking an already-read notification succeeds (idempotent).");
    // The current implementation doesn't prevent re-marking, so this should succeed
    const result = await notificationsConcept.markNotificationRead({ notification });
    assert(!("error" in result), "Re-marking as read should succeed (idempotent operation).");
  });

  await client.close();
});

Deno.test("NotificationsConcept Query: _getNotificationsByRecipient", async () => {
  console.log("  - Testing retrieval of all notifications for a recipient.");
  const [db, client] = await testDb();
  const notificationsConcept = new NotificationsConcept(db);

  const recipient1 = "user:Alice" as User;
  const recipient2 = "user:Bob" as User;

  // Create multiple notifications for recipient1
  await notificationsConcept.createAndSendNotification({
    recipient: recipient1,
    type: "ITEM_CLAIMED" as NotificationType,
    context: { itemName: "Item 1" },
  });
  await notificationsConcept.createAndSendNotification({
    recipient: recipient1,
    type: "ITEM_EXPIRED" as NotificationType,
    context: { itemName: "Item 2" },
  });
  await notificationsConcept.createAndSendNotification({
    recipient: recipient1,
    type: "ITEM_RETURNED" as NotificationType,
    context: { itemName: "Item 3" },
  });

  // Create notification for recipient2
  await notificationsConcept.createAndSendNotification({
    recipient: recipient2,
    type: "ITEM_CLAIMED" as NotificationType,
    context: { itemName: "Item 4" },
  });

  // Get all notifications for recipient1
  const notifications = await notificationsConcept._getNotificationsByRecipient({ recipient: recipient1 });
  assertEquals(notifications.length, 3, "Should return 3 notifications for recipient1.");
  
  // Verify they are sorted by creation date (newest first)
  for (let i = 0; i < notifications.length - 1; i++) {
    assert(
      notifications[i].createdAt >= notifications[i + 1].createdAt,
      "Notifications should be sorted by createdAt descending."
    );
  }

  // Get notifications for recipient2
  const notifications2 = await notificationsConcept._getNotificationsByRecipient({ recipient: recipient2 });
  assertEquals(notifications2.length, 1, "Should return 1 notification for recipient2.");

  await client.close();
});

Deno.test("NotificationsConcept Query: _getUnreadNotificationsByRecipient", async () => {
  console.log("  - Testing retrieval of unread notifications for a recipient.");
  const [db, client] = await testDb();
  const notificationsConcept = new NotificationsConcept(db);

  const recipient = "user:Charlie" as User;

  // Create multiple notifications
  const result1 = await notificationsConcept.createAndSendNotification({
    recipient,
    type: "ITEM_CLAIMED" as NotificationType,
    context: { itemName: "Item 1" },
  });
  assert(!("error" in result1));
  const notif1 = (result1 as { notification: ID }).notification;

  const result2 = await notificationsConcept.createAndSendNotification({
    recipient,
    type: "ITEM_EXPIRED" as NotificationType,
    context: { itemName: "Item 2" },
  });
  assert(!("error" in result2));
  const notif2 = (result2 as { notification: ID }).notification;

  const result3 = await notificationsConcept.createAndSendNotification({
    recipient,
    type: "ITEM_RETURNED" as NotificationType,
    context: { itemName: "Item 3" },
  });
  assert(!("error" in result3));
  const notif3 = (result3 as { notification: ID }).notification;

  // Mark one as read
  await notificationsConcept.markNotificationRead({ notification: notif2 });

  // Get unread notifications
  const unreadNotifications = await notificationsConcept._getUnreadNotificationsByRecipient({ recipient });
  assertEquals(unreadNotifications.length, 2, "Should return 2 unread notifications.");
  
  // Verify the read notification is not included
  const unreadIds = unreadNotifications.map(n => n._id);
  assert(!unreadIds.includes(notif2), "Read notification should not be in unread list.");
  assert(unreadIds.includes(notif1), "Unread notification should be in list.");
  assert(unreadIds.includes(notif3), "Unread notification should be in list.");

  // Verify they are sorted by creation date (newest first)
  for (let i = 0; i < unreadNotifications.length - 1; i++) {
    assert(
      unreadNotifications[i].createdAt >= unreadNotifications[i + 1].createdAt,
      "Unread notifications should be sorted by createdAt descending."
    );
  }

  await client.close();
});

Deno.test("NotificationsConcept Principle Trace", async () => {
  console.log("\n# Testing Principle:");
  console.log("# If a borrowing request is approved and the pickup time is approaching, then the borrower receives a reminder notification, helping ensure timely coordination.\n");
  const [db, client] = await testDb();
  const notificationsConcept = new NotificationsConcept(db);

  const borrower = "user:Borrower" as User;
  const itemName = "Power Drill";

  console.log("1. A borrowing request is approved, triggering a notification.");
  const createResult = await notificationsConcept.createAndSendNotification({
    recipient: borrower,
    type: "ITEM_CLAIMED" as NotificationType,
    context: {
      itemId: "item:drill123" as ID,
      itemName: itemName,
    },
  });
  assert(!("error" in createResult));
  const reminderNotification = (createResult as { notification: ID }).notification;
  console.log(`   -> Action: createAndSendNotification({ recipient: "${borrower}", type: "ITEM_CLAIMED", context: { itemName: "${itemName}" } }) => { notification: "${reminderNotification}" }`);

  console.log("\n2. The borrower receives the notification.");
  const notificationDoc = await notificationsConcept._getNotification({ notification: reminderNotification });
  assertExists(notificationDoc[0], "Notification should be delivered to borrower.");
  assertEquals(notificationDoc[0].notificationDoc.recipient, borrower);
  assertEquals(notificationDoc[0].notificationDoc.status, "SENT");
  console.log(`   -> Query: _getNotification({ notification: "${reminderNotification}" })`);
  console.log(`   -> Notification title: "${notificationDoc[0].notificationDoc.title}"`);
  console.log(`   -> Notification content: "${notificationDoc[0].notificationDoc.content}"`);

  console.log("\n3. The borrower can view all their notifications.");
  const allNotifications = await notificationsConcept._getNotificationsByRecipient({ recipient: borrower });
  assertEquals(allNotifications.length, 1, "Borrower should have 1 notification.");
  console.log(`   -> Query: _getNotificationsByRecipient({ recipient: "${borrower}" })`);
  console.log(`   -> Borrower has ${allNotifications.length} notification(s).`);

  console.log("\n4. The borrower marks the notification as read.");
  await notificationsConcept.markNotificationRead({ notification: reminderNotification });
  console.log(`   -> Action: markNotificationRead({ notification: "${reminderNotification}" })`);

  const updatedNotification = await notificationsConcept._getNotification({ notification: reminderNotification });
  assertExists(updatedNotification[0].notificationDoc.readAt, "Notification should be marked as read.");
  console.log("   -> Notification is now marked as read, helping ensure timely coordination.");

  console.log("\nPrinciple successfully demonstrated: Notifications are created, delivered, and can be read, helping ensure timely coordination.\n");

  await client.close();
});

