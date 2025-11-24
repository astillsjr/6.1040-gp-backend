# Item

**concept**: Item [User]
**purpose**: To represent a unique, real-world object or material within the system, serving as the central entity for listings, requests, and transactions.
**principle**: If a user creates an item to represent their power drill, that digital item can then be listed for borrowing, requested by others, and tracked through transactions, while always maintaining its core identity and ownership.

**state**:
- a set of Items with
	- an optional owner User
	- a title String
	- a description String
	- a category String
	- a condition String
	- a createdAt Date

**actions**:
* `createItem (owner: User, title: String, description: String, category: String, condition: String): (item: Item)`
	 * **requires**: The owner user must exist.
	 * **effects**: Creates a new item record associated with an owner.
* `createOwnerlessItem (title: String, description: String, category: String): (item: Item)`
	 * **requires**: True.
	 * **effects**: Creates a new item record without an owner, to be used for sourcing requests (the "ITEM" type).
* `updateItemDetails (item: Item, title: String, description: String, category: String, condition: String)`
	* **requires**: The item must exist.
	* **effects**: Updates the core details of the item.
* `deleteItem(item: Item, owner: User)`
	* **requires**: The user must be the `owner` of the `item`. The item must not be part of any active or pending transaction.
	* **effects**: Permanently removes the `item` record from the system.

**notes**:
* The `owner` field is optional to support the "Sourcing Request" use case, where an item is defined by its properties but does not yet exist or have an owner in the system.