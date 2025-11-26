---
timestamp: 'Tue Nov 25 2025 23:29:18 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_232918.a4b16071.md]]'
content_id: 08ed51e1113df19c6caa39ee298a372785780700d1855c6c437b5c5a4a36f3ae
---

# file: src/concepts/ItemRequesting/ItemRequestingConcept.test.ts

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemRequestingConcept from "./ItemRequestingConcept.ts";

Deno.test("ItemRequestingConcept", async (t) => {
  const [db, client] = await testDb();
  const itemRequesting = new ItemRequestingConcept(db);

  // Define some test identifiers
  const userA = "user:A" as ID; // Item owner
  const userB = "user:B" as ID; // Requester
  const userC = "user:C" as ID; // Another requester
  const item1 = "item:1" as ID;
  const item2 = "item:2" as ID;

  await t.step("Action: createRequest", async () => {
    console.log("\nTesting: createRequest action");

    console.log("  - Effects: Should create a new BORROW request with PENDING status");
    const startTime = new Date("2024-01-01T10:00:00Z");
    const endTime = new Date("2024-01-01T12:00:00Z");
    const createResult = await itemRequesting.createRequest({
      requester: userB,
      item: item1,
      type: "BORROW",
      status: "PENDING", // Per spec, status should default to PENDING. We set it explicitly here to match implementation.
      requesterNotes: "I would like to borrow this item.",
      requestedStartTime: startTime,
      requestedEndTime: endTime,
    });

    assertEquals("error" in createResult, false);
    const { request: requestId } = createResult as { request: ID };

    const queryResult = await itemRequesting._getRequest({ request: requestId });
    assertEquals(queryResult.length, 1);
    const requestDoc = queryResult[0].requestDoc;

    assertEquals(requestDoc._id, requestId);
    assertEquals(requestDoc.requester, userB);
    assertEquals(requestDoc.item, item1);
    assertEquals(requestDoc.type, "BORROW");
    assertEquals(requestDoc.status, "PENDING");
    assertEquals(requestDoc.requesterNotes, "I would like to borrow this item.");
    assertEquals(requestDoc.requestedStartTime, startTime);
    assertEquals(requestDoc.requestedEndTime, endTime);
    console.log("  - Confirmed: Request created successfully with correct properties.");
  });

  await t.step("Action: acceptRequest", async () => {
    console.log("\nTesting: acceptRequest action");
    // Setup: Create a new pending request
    const { request: pendingRequestId } = (await itemRequesting.createRequest({
      requester: userB,
      item: item1,
      type: "TRANSFER",
      status: "PENDING",
      requesterNotes: "I want this item.",
      requestedStartTime: null,
      requestedEndTime: null,
    })) as { request: ID };

    console.log("  - Effects: Should change a PENDING request's status to ACCEPTED");
    const acceptResult = await itemRequesting.acceptRequest({ request: pendingRequestId });
    assertEquals("error" in acceptResult, false);
    let requestDoc = (await itemRequesting._getRequest({ request: pendingRequestId }))[0].requestDoc;
    assertEquals(requestDoc.status, "ACCEPTED");
    console.log("  - Confirmed: Status updated to ACCEPTED.");

    console.log("  - Requires: Should fail if request is not PENDING");
    const alreadyAcceptedResult = await itemRequesting.acceptRequest({ request: pendingRequestId });
    assertEquals("error" in alreadyAcceptedResult, true);
    assertEquals((alreadyAcceptedResult as { error: string }).error, "Request must be pending");
    console.log("  - Confirmed: Cannot accept a non-PENDING request.");

    console.log("  - Requires: Should fail for a non-existent request");
    const nonExistentId = "nonexistent:request" as ID;
    const nonExistentResult = await itemRequesting.acceptRequest({ request: nonExistentId });
    assertEquals("error" in nonExistentResult, true);
    assertEquals((nonExistentResult as { error: string }).error, "Request not found");
    console.log("  - Confirmed: Cannot accept a non-existent request.");
  });

  await t.step("Action: rejectRequest", async () => {
    console.log("\nTesting: rejectRequest action");
    // Setup: Create a new pending request
    const { request: pendingRequestId } = (await itemRequesting.createRequest({
      requester: userC,
      item: item2,
      type: "ITEM",
      status: "PENDING",
      requesterNotes: "Can I have this?",
      requestedStartTime: null,
      requestedEndTime: null,
    })) as { request: ID };

    console.log("  - Effects: Should change a PENDING request's status to REJECTED");
    const rejectResult = await itemRequesting.rejectRequest({ request: pendingRequestId });
    assertEquals("error" in rejectResult, false);
    let requestDoc = (await itemRequesting._getRequest({ request: pendingRequestId }))[0].requestDoc;
    assertEquals(requestDoc.status, "REJECTED");
    console.log("  - Confirmed: Status updated to REJECTED.");

    console.log("  - Requires: Should fail if request is not PENDING");
    const alreadyRejectedResult = await itemRequesting.rejectRequest({ request: pendingRequestId });
    assertEquals("error" in alreadyRejectedResult, true);
    assertEquals((alreadyRejectedResult as { error: string }).error, "Request must be pending");
    console.log("  - Confirmed: Cannot reject a non-PENDING request.");
  });

  await t.step("Action: cancelRequest", async () => {
    console.log("\nTesting: cancelRequest action");
    // Setup: Create a new pending request
    const { request: pendingRequestId } = (await itemRequesting.createRequest({
      requester: userB,
      item: item2,
      type: "BORROW",
      status: "PENDING",
      requesterNotes: "Nevermind.",
      requestedStartTime: new Date(),
      requestedEndTime: new Date(),
    })) as { request: ID };

    console.log("  - Requires: Should fail if user is not the requester");
    const wrongUserResult = await itemRequesting.cancelRequest({ request: pendingRequestId, user: userA });
    assertEquals("error" in wrongUserResult, true);
    assertEquals((wrongUserResult as { error: string }).error, "User must be the requester");
    console.log("  - Confirmed: A non-requester cannot cancel the request.");

    console.log("  - Effects: Should change a PENDING request's status to CANCELLED by the requester");
    const cancelResult = await itemRequesting.cancelRequest({ request: pendingRequestId, user: userB });
    assertEquals("error" in cancelResult, false);
    let requestDoc = (await itemRequesting._getRequest({ request: pendingRequestId }))[0].requestDoc;
    assertEquals(requestDoc.status, "CANCELLED");
    console.log("  - Confirmed: Requester successfully cancelled the request.");

    console.log("  - Requires: Should fail if request is not PENDING");
    const alreadyCancelledResult = await itemRequesting.cancelRequest({ request: pendingRequestId, user: userB });
    assertEquals("error" in alreadyCancelledResult, true);
    assertEquals((alreadyCancelledResult as { error: string }).error, "Request must be pending");
    console.log("  - Confirmed: Cannot cancel a non-PENDING request.");
  });

  await t.step("Queries", async () => {
    console.log("\nTesting: Queries for enabling sync logic");
    // Setup: Create multiple pending requests for the same item
    const itemForMultiRequest = "item:multi" as ID;
    const { request: req1 } = (await itemRequesting.createRequest({ requester: userA, item: itemForMultiRequest, type: "BORROW", status: "PENDING", requesterNotes: "req1", requestedStartTime: null, requestedEndTime: null })) as { request: ID };
    const { request: req2 } = (await itemRequesting.createRequest({ requester: userB, item: itemForMultiRequest, type: "BORROW", status: "PENDING", requesterNotes: "req2", requestedStartTime: null, requestedEndTime: null })) as { request: ID };
    const { request: req3 } = (await itemRequesting.createRequest({ requester: userC, item: itemForMultiRequest, type: "BORROW", status: "PENDING", requesterNotes: "req3", requestedStartTime: null, requestedEndTime: null })) as { request: ID };

    console.log("  - Testing _getOtherPendingRequests query");
    const otherRequestsResult = await itemRequesting._getOtherPendingRequests({ item: itemForMultiRequest, exclude: req1 });
    const otherRequestIds = otherRequestsResult.map(r => r.otherRequest);

    assertEquals(otherRequestsResult.length, 2);
    assertEquals(otherRequestIds.includes(req2), true);
    assertEquals(otherRequestIds.includes(req3), true);
    assertEquals(otherRequestIds.includes(req1), false);
    console.log("  - Confirmed: Query correctly returns other pending requests, excluding the specified one.");
  });

  await client.close();
});

# trace:

Deno.test("ItemRequestingConcept Principle Trace", async () => {
  console.log("\n--- Principle Trace Start ---");
  const [db, client] = await testDb();
  const itemRequesting = new ItemRequestingConcept(db);

  // Define actors and items for the trace
  const owner = "user:owner" as ID;
  const requester = "user:requester" as ID;
  const requestedItem = "item:book" as ID;

  // 1. A user (requester) finds an item they need and creates a request.
  console.log("Trace Step 1: Requester creates a request for an item.");
  const createResult = await itemRequesting.createRequest({
    requester: requester,
    item: requestedItem,
    type: "BORROW",
    status: "PENDING",
    requesterNotes: "I'd love to borrow this book for a week.",
    requestedStartTime: new Date("2025-01-05"),
    requestedEndTime: new Date("2025-01-12"),
  });
  const { request: requestId } = createResult as { request: ID };
  const requestDocBeforeAction = (await itemRequesting._getRequest({ request: requestId }))[0].requestDoc;
  assertEquals(requestDocBeforeAction.status, "PENDING");
  console.log(`  - Action: createRequest({ requester: '${requester}', item: '${requestedItem}' })`);
  console.log(`  - State: Request '${requestId}' created with status 'PENDING'.`);

  // 2. The item's owner is notified (implicitly, outside this concept) and chooses to accept the request.
  console.log("\nTrace Step 2: The item's owner accepts the request.");
  const acceptResult = await itemRequesting.acceptRequest({ request: requestId });
  assertEquals("error" in acceptResult, false);
  const requestDocAfterAction = (await itemRequesting._getRequest({ request: requestId }))[0].requestDoc;
  assertEquals(requestDocAfterAction.status, "ACCEPTED");
  console.log(`  - Action: acceptRequest({ request: '${requestId}' })`);
  console.log(`  - State: Request '${requestId}' status is now 'ACCEPTED'.`);

  // 3. This acceptance initiates a transaction (handled by a sync).
  console.log("\nTrace Step 3: The concept is now ready for a sync to create a transaction.");
  console.log("  - The principle is fulfilled. A user requested an item, the owner accepted, and the system is ready to proceed.");

  console.log("--- Principle Trace End ---\n");
  await client.close();
});

```
