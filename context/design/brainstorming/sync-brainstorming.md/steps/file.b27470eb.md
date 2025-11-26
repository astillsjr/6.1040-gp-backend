---
timestamp: 'Tue Nov 25 2025 19:34:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193438.a311f38f.md]]'
content_id: b27470eb40287c291d2350a6076e0b7a7919ff0d1400afab5157a1084389a776
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
      .query(Item._getItemById, { item }, { itemDoc })
      .filter(($) => $[user] === $[itemDoc].owner); // Authorization check
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
      .query(Item._getItemById, { item }, { itemDoc })
      .filter(($) => $[user] === $[itemDoc].owner); // Authorization check
  },
  then: actions(
    // The concept action itself also validates ownership, providing defense in depth.
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
      .query(Item._getItemById, { item }, { itemDoc })
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

***

### 3. Item Requesting Syncs

This file manages how users create and respond to requests for items.
