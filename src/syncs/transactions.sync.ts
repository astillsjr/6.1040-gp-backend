import { actions, Sync } from "@engine";
import { ItemRequesting, ItemTransaction, ItemListing, Item, Requesting, UserAuthentication } from "@concepts";

/**
 * CONCEPT-TO-CONCEPT: When a request is accepted, a transaction is automatically created.
 */
export const CreateTransactionOnAccept: Sync = ({ request, requestDoc, itemDoc }) => ({
  when: actions(
    [ItemRequesting.acceptRequest, { request }, {}],
  ),
  where: async (frames) => {
    // Step 1: Get the request details
    let framesWithRequest = await frames.query(ItemRequesting._getRequest, { request }, { requestDoc });
    // Step 2: Get the item details using the item ID from the request
    return await framesWithRequest.query(Item._getItemById, { item: requestDoc.item }, { item: itemDoc });
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
    let framesWithTx = await frames.query(ItemTransaction._getTransaction, { transaction }, { transactionDoc });
    // Only proceed if the transaction is now COMPLETED.
    return framesWithTx.filter(($: any) => $[transactionDoc].status === "COMPLETED");
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

/**
 * USER-INITIATED: Mark a transaction as picked up (requires user to be involved in transaction).
 */
export const MarkPickedUpRequest: Sync = ({ request, transaction, transactionDoc, user, accessToken }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/markPickedUp", transaction }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      .query(ItemTransaction._getTransaction, { transaction }, { transactionDoc })
      .filter(($) => $[user] === $[transactionDoc].from || $[user] === $[transactionDoc].to);
  },
  then: actions(
    [ItemTransaction.markPickedUp, { transaction }],
  ),
});

export const MarkPickedUpResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/markPickedUp" }, { request }],
    [ItemTransaction.markPickedUp, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * USER-INITIATED: Mark a transaction as returned (borrower only).
 */
export const MarkReturnedRequest: Sync = ({ request, transaction, transactionDoc, user, accessToken }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/markReturned", transaction }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      .query(ItemTransaction._getTransaction, { transaction }, { transactionDoc })
      .filter(($) => $[user] === $[transactionDoc].to); // Only borrower can mark returned
  },
  then: actions(
    [ItemTransaction.markReturned, { transaction }],
  ),
});

export const MarkReturnedResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/markReturned" }, { request }],
    [ItemTransaction.markReturned, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * USER-INITIATED: Confirm return of a transaction (owner only).
 */
export const ConfirmReturnRequest: Sync = ({ request, transaction, transactionDoc, user, accessToken }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/confirmReturn", transaction }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      .query(ItemTransaction._getTransaction, { transaction }, { transactionDoc })
      .filter(($) => $[user] === $[transactionDoc].from); // Only owner can confirm return
  },
  then: actions(
    [ItemTransaction.confirmReturn, { transaction }],
  ),
});

export const ConfirmReturnResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/confirmReturn" }, { request }],
    [ItemTransaction.confirmReturn, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * USER-INITIATED: Cancel a transaction (any involved party can cancel).
 */
export const CancelTransactionRequest: Sync = ({ request, transaction, transactionDoc, user, accessToken }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/cancelTransaction", transaction }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      .query(ItemTransaction._getTransaction, { transaction }, { transactionDoc })
      .filter(($) => $[user] === $[transactionDoc].from || $[user] === $[transactionDoc].to);
  },
  then: actions(
    [ItemTransaction.cancelTransaction, { transaction }],
  ),
});

export const CancelTransactionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemTransaction/cancelTransaction" }, { request }],
    [ItemTransaction.cancelTransaction, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});