---
timestamp: 'Mon Nov 24 2025 22:10:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_221040.79107a7e.md]]'
content_id: 30b3b6bfd9b562cb7c343ac42f28394fa390383f00d0be2857cf1675690619b4
---

# concept: Item

**concept**: Item \[User]
**purpose**: To represent a unique, real-world object or material within the system, serving as the central entity for listings, requests, and transactions.
**principle**: If a user creates an item to represent their power drill, that digital item can then be listed for borrowing, requested by others, and tracked through transactions, while always maintaining its core identity and ownership.

**state**:

* a set of Items with
  * an optional owner User
  * a title String
  * a description String
  * a category String
  * a condition String
  * a createdAt Date

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

**queries**:

* `_getItemById(item: Item): (item: Item)`
  * **requires**: Item exists.
  * **effects**: Returns the full item document.
* `_getItemsByOwner(owner: User): (items: Item[])`
  * **requires**: True.
  * **effects**: Returns all items associated with the given owner.
* `_getAllItems(): (items: Item[])`
  * **requires**: True.
  * **effects**: Returns all items in the system.
