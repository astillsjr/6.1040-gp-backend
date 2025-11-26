---
timestamp: 'Tue Nov 25 2025 23:32:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_233242.c277e34f.md]]'
content_id: f9e2fea51e0de97ca187259eddf0c104e7b80b0a1c1a4d51ddc01b48a899c326
---

# trace:

The primary test trace, which follows the **principle**, is encapsulated in the first test case, `ItemTransactionConcept: Principle Fulfillment`. Here's a summary of the trace for a "BORROW" type transaction:

1. **`createTransaction`**: A new transaction is initiated between `user:owner` and `user:borrower` for `item:book`.
   * **Initial State**: The transaction is created with the status `PENDING_PICKUP`. This is verified by calling the `_getTransaction` query.
2. **`markPickedUp`**: The borrower (or owner) confirms the item has been exchanged.
   * **State Change**: The transaction's status is updated to `IN_PROGRESS`, and the `pickedUpAt` timestamp is recorded. This signals that the borrow period has officially begun.
3. **`markReturned`**: After using the item, the borrower marks it as returned.
   * **State Change**: The status changes to `PENDING_RETURN`, and the `returnedAt` timestamp is set. This indicates the item is on its way back to the owner but has not yet been confirmed as received.
4. **`confirmReturn`**: The original owner confirms they have received the item back.
   * **Final State**: The status is set to `COMPLETED`. The transaction is now finalized and considered a successful exchange.

This sequence of actions demonstrates the complete, successful lifecycle of a borrowing transaction, directly fulfilling the concept's principle. The other tests confirm that each action respects its `requires` conditions and correctly produces its `effects` under various scenarios.
