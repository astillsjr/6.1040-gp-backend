import { actions, Sync, Frames } from "@engine";
import { ItemRequesting, ItemTransaction, ItemListing, Item, Requesting, UserAuthentication, Communication } from "@concepts";

/**
 * CONCEPT-TO-CONCEPT: When a request is accepted, a transaction is automatically created.
 */
export const CreateTransactionOnAccept: Sync = ({ request, requestDoc, itemDoc, itemId, item, requester, owner, type, requesterNotes }) => ({
  when: actions(
    [ItemRequesting.acceptRequest, { request }, {}],
  ),
  where: async (frames) => {
    // Step 1: Get the request details
    let framesWithRequest = await frames.query(ItemRequesting._getRequest, { request }, { requestDoc });
    if (framesWithRequest.length === 0) {
      return framesWithRequest;
    }
    // Step 2: Get the item ID from the request, then the full item document
    const framesWithItem = await framesWithRequest.query(
      ItemRequesting._getItemForRequest,
      { request },
      { item: itemId },
    );
    if (framesWithItem.length === 0) {
      return framesWithItem;
    }
    // Step 3: Get the full item document
    const framesWithItemDoc = await framesWithItem.query(Item._getItemById, { item: itemId }, { item: itemDoc });
    if (framesWithItemDoc.length === 0) {
      return framesWithItemDoc;
    }
    // Extract values from requestDoc and itemDoc objects
    const result = new Frames();
    for (const frame of framesWithItemDoc) {
      const doc = frame[requestDoc] as { item: string; requester: string; type: string; requesterNotes: string } | undefined;
      const itemDocValue = frame[itemDoc] as { owner: string } | undefined;
      if (!doc || !itemDocValue) {
        continue;
      }
      result.push({
        ...frame,
        [item]: doc.item,
        [requester]: doc.requester,
        [owner]: itemDocValue.owner,
        [type]: doc.type,
        [requesterNotes]: doc.requesterNotes,
      });
    }
    return result;
  },
  then: actions(
    [ItemTransaction.createTransaction, {
      from: owner,
      to: requester,
      item,
      type,
      fromNotes: "",
      toNotes: requesterNotes,
    }],
  ),
});

/**
 * CONCEPT-TO-CONCEPT: When a transaction is created, update the item's listing status to 'CLAIMED'.
 * Note: This may have already been set to 'CLAIMED' when the request was accepted, but we ensure it here.
 */
export const UpdateListingOnTransactionCreate: Sync = ({ item }) => ({
  when: actions(
    [ItemTransaction.createTransaction, { item }, {}],
  ),
  then: actions(
    [ItemListing.updateListingStatus, { item, status: "CLAIMED" }],
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
    if (framesWithItem.length === 0) {
      return framesWithItem;
    }
    const result = await framesWithItem.query(ItemRequesting._getOtherPendingRequests, { item, exclude: request }, { otherRequest });
    return result;
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

/**
 * CONCEPT-TO-CONCEPT: When a transaction is created, automatically create a conversation between the two participants.
 */
export const CreateConversationOnTransaction: Sync = ({ transaction, transactionDoc }) => ({
  when: actions(
    [ItemTransaction.createTransaction, { transaction }, {}],
  ),
  where: (frames) => frames.query(ItemTransaction._getTransaction, { transaction }, { transactionDoc }),
  then: actions(
    [Communication.createConversation, {
      participant1: transactionDoc.from,
      participant2: transactionDoc.to,
      transaction: transaction,
    }],
  ),
});