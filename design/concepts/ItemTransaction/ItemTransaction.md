# ItemTransaction

**concept**: ItemTransaction [User, Item, Request]
**purpose**: To manage the active lifecycle of an approved exchange, from pickup to completion, ensuring both parties have a shared record of the transaction's state.
**principle**: Once a request is accepted, a transaction is created. The borrower can then mark the item as picked up, and later as returned, moving the transaction through its lifecycle until it is successfully completed.

**state**:
  * a set of ItemTransactions with
	  * a from User
	  * a to User
	  * an item Item
	  * a request Request
	  * a type of BORROW or TRANSFER or ITEM
	  * a status of PENDING_PICKUP or IN_PROGRESS or PENDING_RETURN or COMPLETED or CANCELLED
	  * a fromNotes String
	  * a toNotes String
	  * a createdAt Date
	  * a pickedUpAt Date
	  * a returnedAt Date

**actions**:
  * `createTransaction (from: User, to: User, item: Item, request: Request, type: BORROW or TRANSFER or ITEM): (transaction: ItemTransaction)`
	  * **system**
	  * **requires**: A corresponding request must have been accepted.
	  * **effects**: Creates a new transaction record with status PENDING_PICKUP.
  * `markPickedUp (transaction: ItemTransaction): ()`
	  * **requires**: The transaction must be in PENDING_PICKUP status.
	  * **effects**: Sets status to IN_PROGRESS (for BORROW) or COMPLETED (for TRANSFER/ITEM) and records `pickedUpAt`.
  * `markReturned (transaction: ItemTransaction): ()`
	  * **requires**: The transaction must be in IN_PROGRESS status and of type BORROW.
	  * **effects**: Sets status to PENDING_RETURN and records `returnedAt`.
  * `confirmReturn (transaction: ItemTransaction): ()`
	  * **requires**: The transaction must be in PENDING_RETURN status.
	  * **effects**: Sets the status to COMPLETED, finalizing the transaction.
  * `cancelTransaction (transaction: ItemTransaction): ()`
	  * **requires**: The transaction must not be COMPLETED.
	  * **effects**: Sets the status to CANCELLED.

**notes:**
  * **Authorization rules**: The actors for each action must be clearly defined:
    * `markPickedUp`: Can be performed by either party (`from` or `to`)
    * `markReturned`: Can only be performed by the borrower (`to`)
    * `confirmReturn`: Can only be performed by the item's original owner (`from`)
    * `cancelTransaction`: Can be performed by either party, but canceling while `IN_PROGRESS` might negatively impact a user's reputation score via a sync
