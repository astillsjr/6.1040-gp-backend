---
timestamp: 'Tue Nov 25 2025 19:37:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193742.ca411062.md]]'
content_id: c241ccefc5f87b53953ff9cfe95b84d79e9675f6473a648b37a193cd666c56b1
---

# file: src/syncs/transactions.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { ItemRequesting, ItemTransaction, ItemListing, Item } from "@concepts";

/**
 * CONCEPT-TO-CONCEPT: When a request is accepted, a transaction is automatically created.
 */
export const CreateTransactionOnAccept: Sync = ({ request, requestDoc, itemDoc }) => ({
  when: actions(
    [ItemRequesting.acceptRequest, { request }, {}],
  ),
  where: async (frames) => {
    return await frames
      .query(ItemRequesting._getRequest, { request }, { requestDoc })
      .query(Item._getItemById, { item: requestDoc.item }, { itemDoc: "item" });
  },
  then: actions(
    [ItemTransaction.createTransaction, {
      from: itemDoc.owner,
      to: requestDoc.requester,
      item: requestDoc.item,
      type: requestDoc.type,
      fromNotes: "",
      toNotes: requestDoc.requesterNotes,
    }],
  ),
});

/**
 * CONCEPT-TO-CONCEPT: When a transaction is created, update the item's listing status to 'PENDING'.
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
 * CONCEPT-TO-CONCEPT: When a transaction is fully completed or is a TRANSFER/ITEM type that has been picked up.
 */
export const UpdateListingOnTransactionComplete: Sync = ({ transaction, transactionDoc, status }) => ({
  when: actions(
    [ItemTransaction.confirmReturn, {}, { transaction }],
    [ItemTransaction.markPickedUp, {}, { transaction }],
  ),
  where: async (frames) => {
    return await frames
      .query(ItemTransaction._getTransaction, { transaction }, { transactionDoc })
      // Only proceed if the transaction is now COMPLETED.
      .filter(($) => $[transactionDoc].status === "COMPLETED");
  },
  then: actions(
    [ItemListing.updateListingStatus, {
      item: transactionDoc.item,
      status: transactionDoc.type === "BORROW" ? "AVAILABLE" : "CLAIMED",
    }],
  ),
});

/**
 * CONCEPT-TO-CONCEPT: If a transaction is cancelled, make the item available again.
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
 * BUSINESS RULE: When one request for an item is accepted, auto-reject all other pending requests.
 */
export const RejectOtherRequestsOnAccept: Sync = ({ request, item, otherRequest }) => ({
  when: actions(
    [ItemRequesting.acceptRequest, { request }, {}],
  ),
  where: async (frames) => {
    const framesWithItem = await frames.query(ItemRequesting._getItemForRequest, { request }, { item });
    return await framesWithItem.query(ItemRequesting._getOtherPendingRequests, { item, exclude: request }, { otherRequest });
  },
  then: actions(
    [ItemRequesting.rejectRequest, { request: otherRequest }],
  ),
});
```
