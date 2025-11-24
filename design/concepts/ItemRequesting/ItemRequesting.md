# ItemRequesting

**concept**: ItemRequesting [User, Item]
**purpose**: To enable users to formally express interest in an item, whether it's to borrow a listed item, claim a free one, or source a new one from the community.
**principle**: If a user finds an item they need, they can create a request. The item's owner is then notified and can choose to accept or reject the request, initiating a transaction.

**state**:
* a set of ItemRequests with
	* a requester User
	* an item Item
	* a type of BORROW or TRANSFER or ITEM
	* a status of PENDING or ACCEPTED or REJECTED or CANCELLED
	* a requesterNotes String
	* a requestedStartTime DateTime
	* a requestedEndTime DateTime
	* a createdAt Date

**actions**:
* `createRequest (requester: User, item: Item, type: BORROW or TRANSFER or ITEM, notes: String, startTime?: DateTime, endTime?: DateTime): (request: Request)`
	* **requires**: The item must be listed with a matching type, or have no owner if the type is ITEM. For BORROW, times must be provided and fall within an available window.
	* **effects**: Creates a new request with status PENDING.
* `acceptRequest (request: Request): ()`
	* **requires**: The request must be in PENDING status.
	* **effects**: Sets the request status to ACCEPTED. This will trigger a sync to create an `ItemTransaction`.
* `rejectRequest (request: Request): ()`
	* **requires**: The request must be in PENDING status.
	* **effects**: Sets the request status to REJECTED.
* `cancelRequest (request: Request): ()`
	* **requires**: The request must be in PENDING status. The user must be the requester.
	* **effects**: Sets the request status to CANCELLED.
	
**notes**: 
- A critical business rule should be implemented via synchronization: When one `Request` for an item is `ACCEPTED`, all other `PENDING` requests for that same item (or for overlapping time windows) should be automatically transitioned to `REJECTED` to prevent double-booking and remove the burden of manual rejection from the owner.