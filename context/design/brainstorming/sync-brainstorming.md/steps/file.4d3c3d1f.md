---
timestamp: 'Tue Nov 25 2025 19:49:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_194938.a5be7b3b.md]]'
content_id: 4d3c3d1fed4f2cf4df350f76cefa2441eb83613d0b06fe63460da1e10e58cdf7
---

# file: src/syncs/items.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Requesting, UserAuthentication, Item, ItemListing } from "@concepts";

/**
 * Handles creating a new item. User must be authenticated.
 */
export const CreateItemRequest: Sync = ({ request, accessToken, user, title, description, category, condition }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/createItem", accessToken, title, description, category, condition }, { request }],
  ),
  where: (frames) => frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user }),
  then: actions(
    [Item.createItem, { owner: user, title, description, category, condition }],
  ),
});

export const CreateItemResponse: Sync = ({ request, item, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/createItem" }, { request }],
    [Item.createItem, {}, { item, error }],
  ),
  then: actions(
    [Requesting.respond, { request, item, error }],
  ),
});

/**
 * Handles updating an item's details. User must be the owner.
 */
export const UpdateItemRequest: Sync = ({ request, accessToken, user, item, title, description, category, condition, itemDoc }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/updateItemDetails", accessToken, item, title, description, category, condition }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      // CORRECTED LINE: Binds the 'item' output from the query to the 'itemDoc' variable.
      .query(Item._getItemById, { item }, { item: itemDoc })
      .filter(($) => $[user] === $[itemDoc].owner); // Authorization check: user must be owner.
  },
  then: actions(
    [Item.updateItemDetails, { item, title, description, category, condition }],
  ),
});

export const UpdateItemResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/updateItemDetails" }, { request }],
    [Item.updateItemDetails, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});

/**
 * Handles deleting an item. User must be the owner.
 */
export const DeleteItemRequest: Sync = ({ request, accessToken, user, item, itemDoc }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/deleteItem", accessToken, item }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      // CORRECTED LINE: Binds the 'item' output from the query to the 'itemDoc' variable.
      .query(Item._getItemById, { item }, { item: itemDoc })
      .filter(($) => $[user] === $[itemDoc].owner); // Authorization check
  },
  then: actions(
    [Item.deleteItem, { item, owner: user }],
  ),
});

export const DeleteItemResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/deleteItem" }, { request }],
    [Item.deleteItem, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});

/**
 * Handles listing an item for borrow/transfer. User must be the owner.
 */
export const ListItemRequest: Sync = ({ request, accessToken, user, item, type, dormVisibility, itemDoc }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/listItem", accessToken, item, type, dormVisibility }, { request }],
  ),
  where: async (frames) => {
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      // CORRECTED LINE: Binds the 'item' output from the query to the 'itemDoc' variable.
      .query(Item._getItemById, { item }, { item: itemDoc })
      .filter(($) => $[user] === $[itemDoc].owner); // Authorization check
  },
  then: actions(
    [ItemListing.listItem, { item, type, dormVisibility }],
  ),
});

export const ListItemResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/listItem" }, { request }],
    [ItemListing.listItem, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});
```

With this corrected file, and the previously provided `auth.sync.ts`, `requests.sync.ts`, and `transactions.sync.ts`, your backend logic should now be complete and functional. The other sync files did not contain this specific error pattern and remain correct.
