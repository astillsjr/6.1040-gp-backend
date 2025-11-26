---
timestamp: 'Tue Nov 25 2025 19:34:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193438.a311f38f.md]]'
content_id: f2d88d765f8433cf3244d15f44d1f372a690124ac300d23a8e646c53423e9886
---

# file: src/syncs/transactions.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { ItemRequesting, ItemTransaction, ItemListing, Item } from "@concepts";

/**
 * CONCEPT-TO-CONCEPT: When a request is accepted, a transaction is automatically created.
 * This is the core logic connecting the requesting and transaction phases.
 */
export const CreateTransactionOnAccept: Sync = ({ request, requestDoc, itemDoc }) => ({
  when: actions(
    [ItemRequesting.acceptRequest, { request }, {}],
  ),
  where: async (frames) => {
    return await frames
      .query(ItemRequesting._getRequest, { request }, { requestDoc }) // Assumes this query exists
      .query(Item._getItemById, { item: requestDoc.item }, { itemDoc });
  },
  then: actions(
    [ItemTransaction.createTransaction, {
      from: itemDoc.owner, // The item owner
      to: requestDoc.requester, // The user who made the request
      item: requestDoc.item,
      type: requestDoc.type,
      fromNotes: "",
      toNotes: requestDoc.requesterNotes,
    }],
  ),
});

/**
 * CONCEPT-TO-CONCEPT: When a transaction is created, update the item's listing
 * status to 'PENDING' so it cannot be requested by others.
 */
export const UpdateListingOnTransactionCreate: Sync = ({ item }) => ({
  when: actions(
    [ItemTransaction.createTransaction, { item }, {}],
  ),
  then: actions(
    [ItemListing.updateListingStatus, { item, status: "PENDING" }],
  ),
});

/**
 * CONCEPT-TO-CONCEPT: When a transaction is fully completed (or picked up, if it's a TRANSFER),
 * update the listing status appropriately.
 */
export const UpdateListingOnTransactionComplete: Sync = ({ transaction, transactionDoc }) => ({
  when: actions(
    [ItemTransaction.confirmReturn, { transaction }, {}],
    // Also listen for immediate completion of TRANSFER/ITEM types on pickup
    [ItemTransaction.markPickedUp, {}, { transaction }],
  ),
  where: (frames) => frames.query(ItemTransaction._getTransaction, { transaction }, { transactionDoc }), // Assumes query exists
  then: actions(
    // If it was a borrow, make it available again.
    // If it was a transfer, unlist it by setting status to CLAIMED.
    [ItemListing.updateListingStatus, {
      item: transactionDoc.item,
      status: transactionDoc.type === "BORROW" ? "AVAILABLE" : "CLAIMED",
    }],
  ),
});

/**
 * CONCEPT-TO-CONCEPT: If a transaction is cancelled before completion, make the item available again.
 */
export const UpdateListingOnTransactionCancel: Sync = ({ transaction, transactionDoc }) => ({
  when: actions(
    [ItemTransaction.cancelTransaction, { transaction }, {}],
  ),
  where: (frames) => frames.query(ItemTransaction._getTransaction, { transaction }, { transactionDoc }),
  then: actions(
    [ItemListing.updateListingStatus, { item: transactionDoc.item, status: "AVAILABLE" }],
  ),
});

/**
 * BUSINESS RULE: When one request for an item is accepted, all other pending
 * requests for that same item must be automatically rejected.
 */
export const RejectOtherRequestsOnAccept: Sync = ({ request, item, otherRequest }) => ({
  when: actions(
    [ItemRequesting.acceptRequest, { request }, {}],
  ),
  where: async (frames) => {
    // 1. Get the item from the accepted request.
    const framesWithItem = await frames.query(ItemRequesting._getItemForRequest, { request }, { item });
    // 2. Find all *other* pending requests for that item.
    return await framesWithItem.query(ItemRequesting._getOtherPendingRequests, { item, exclude: request }, { otherRequest }); // Assumes this query exists
  },
  then: actions(
    [ItemRequesting.rejectRequest, { request: otherRequest }],
  ),
});
```
