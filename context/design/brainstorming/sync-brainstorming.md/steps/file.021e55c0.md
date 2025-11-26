---
timestamp: 'Tue Nov 25 2025 19:52:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_195238.fa6eafac.md]]'
content_id: 021e55c003f53e224ac4b8c155d491484ca07bc08611f205601540219acdf624
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
    // Step 1: Authenticate the user from the token.
    let authorizedFrames = await frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user });
    // Step 2: Get the item's details using the results of the first query.
    authorizedFrames = await authorizedFrames.query(Item._getItemById, { item }, { item: itemDoc });
    // Step 3: Filter to ensure the authenticated user is the item's owner.
    return authorizedFrames.filter(($) => $[user] === $[itemDoc]?.owner);
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
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user });
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(Item._getItemById, { item }, { item: itemDoc });
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($) => $[user] === $[itemDoc]?.owner);
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
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user });
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(Item._getItemById, { item }, { item: itemDoc });
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($) => $[user] === $[itemDoc]?.owner);
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

### 2. Corrected `requests.sync.ts`

This file had the same asynchronous chaining error in its authorization logic, which is also fixed here.
