import { actions, Sync } from "@engine";
import { Item, ItemListing, Requesting, UserAuthentication } from "@concepts";

/**
 * Handles creating a new item. User must be authenticated.
 */
export const CreateItemRequest: Sync = (
  { request, accessToken, user, title, description, category, condition },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Item/createItem",
      accessToken,
      title,
      description,
      category,
      condition,
    }, { request }],
  ),
  where: (frames) =>
    frames.query(UserAuthentication._getUserFromToken, { accessToken }, {
      user,
    }),
  then: actions(
    [Item.createItem, { owner: user, title, description, category, condition }],
  ),
});

export const CreateItemResponse: Sync = ({ request, item }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/createItem" }, { request }],
    [Item.createItem, {}, { item }],
  ),
  then: actions(
    [Requesting.respond, { request, item }],
  ),
});

/**
 * Handles updating an item's details. User must be the owner.
 */
export const UpdateItemRequest: Sync = (
  {
    request,
    accessToken,
    user,
    item,
    title,
    description,
    category,
    condition,
    itemDoc,
  },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Item/updateItemDetails",
      accessToken,
      item,
      title,
      description,
      category,
      condition,
    }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user from the token.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the item's details using the results of the first query.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    // Step 3: Filter to ensure the authenticated user is the item's owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [Item.updateItemDetails, { item, title, description, category, condition }],
  ),
});

export const UpdateItemResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/updateItemDetails" }, { request }],
    [Item.updateItemDetails, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles deleting an item. User must be the owner.
 */
export const DeleteItemRequest: Sync = (
  { request, accessToken, user, item, itemDoc },
) => ({
  when: actions(
    [Requesting.request, { path: "/Item/deleteItem", accessToken, item }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [Item.deleteItem, { item, owner: user }],
  ),
});

export const DeleteItemResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Item/deleteItem" }, { request }],
    [Item.deleteItem, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles listing an item for borrow/transfer. User must be the owner.
 */
export const ListItemRequest: Sync = (
  { request, accessToken, user, item, type, dormVisibility, itemDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemListing/listItem",
      accessToken,
      item,
      type,
      dormVisibility,
    }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [ItemListing.listItem, { item, type, dormVisibility }],
  ),
});

export const ListItemResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/listItem" }, { request }],
    [ItemListing.listItem, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles adding a photo to an item. User must be the owner.
 */
export const AddPhotoRequest: Sync = (
  { request, accessToken, user, item, photoUrl, order, itemDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemListing/addPhoto",
      accessToken,
      item,
      photoUrl,
      order,
    }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [ItemListing.addPhoto, { item, photoUrl, order }],
  ),
});

export const AddPhotoResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/addPhoto" }, { request }],
    [ItemListing.addPhoto, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles removing a photo from an item. User must be the owner.
 */
export const RemovePhotoRequest: Sync = (
  { request, accessToken, user, item, photoUrl, itemDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemListing/removePhoto",
      accessToken,
      item,
      photoUrl,
    }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [ItemListing.removePhoto, { item, photoUrl }],
  ),
});

export const RemovePhotoResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/removePhoto" }, { request }],
    [ItemListing.removePhoto, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles setting an availability window for a borrowable item. User must be the owner.
 */
export const SetAvailabilityRequest: Sync = (
  { request, accessToken, user, item, startTime, endTime, itemDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemListing/setAvailability",
      accessToken,
      item,
      startTime,
      endTime,
    }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the item's details.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    // Step 3: Authorize: ensure user is owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [ItemListing.setAvailability, { item, startTime, endTime }],
  ),
});

export const SetAvailabilityResponse: Sync = ({ request, window }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/setAvailability" }, { request }],
    [ItemListing.setAvailability, {}, { window }],
  ),
  then: actions(
    [Requesting.respond, { request, window }],
  ),
});

/**
 * Handles removing an availability window. User must be the owner.
 */
export const RemoveAvailabilityRequest: Sync = (
  { request, accessToken, user, window, item, itemDoc, windowDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemListing/removeAvailability",
      accessToken,
      window,
    }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Step 2: Get the window details to find the item.
    authorizedFrames = await authorizedFrames.query(
      ItemListing._getWindow,
      { window },
      { window: windowDoc },
    );
    // Step 3: Extract item from window and get item details.
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item: ($ : any) => $[windowDoc].item },
      { item: itemDoc },
    );
    // Step 4: Authorize: ensure user is owner.
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    );
  },
  then: actions(
    [ItemListing.removeAvailability, { window }],
  ),
});

export const RemoveAvailabilityResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemListing/removeAvailability" }, { request }],
    [ItemListing.removeAvailability, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});
