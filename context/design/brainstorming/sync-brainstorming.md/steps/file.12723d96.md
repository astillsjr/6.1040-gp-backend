---
timestamp: 'Tue Nov 25 2025 19:52:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_195238.fa6eafac.md]]'
content_id: 12723d96efc89c4c00b941e6f0595afbd1ad030054090cbaa11ddf3f41207007
---

# file: src/syncs/requests.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Requesting, UserAuthentication, ItemRequesting, Item, ItemListing } from "@concepts";

/**
 * Handles a user creating a request for an item.
 */
export const CreateRequestRequest: Sync = ({ request, accessToken, user, item, type, notes, startTime, endTime }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/createRequest", accessToken, item, type, notes, startTime, endTime }, { request }],
  ),
  where: (frames) => frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user }),
  then: actions(
    [ItemRequesting.createRequest, { requester: user, item, type, requesterNotes: notes, requestedStartTime: startTime, requestedEndTime: endTime, status: "PENDING" }],
  ),
});

export const CreateRequestResponse: Sync = ({ request, newRequest, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/createRequest" }, { request }],
    [ItemRequesting.createRequest, {}, { request: newRequest, error }],
  ),
  then: actions(
    [Requesting.respond, { request, request: newRequest, error }],
  ),
});

/**
 * Handles the item owner accepting a request.
 */
export const AcceptRequestRequest: Sync = ({ request, accessToken, user, itemRequest, item, itemDoc }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/acceptRequest", accessToken, request: itemRequest }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user });
    // Step 2: Find which item the request is for.
    authorizedFrames = await authorizedFrames.query(ItemRequesting._getItemForRequest, { request: itemRequest }, { item });
    // Step 3: Get the details of that item to find the owner.
    authorizedFrames = await authorizedFrames.query(Item._getItemById, { item }, { item: itemDoc });
    // Step 4: Authorize: ensure the authenticated user is the item's owner.
    return authorizedFrames.filter(($) => $[user] === $[itemDoc]?.owner);
  },
  then: actions(
    [ItemRequesting.acceptRequest, { request: itemRequest }],
  ),
});

export const AcceptRequestResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/acceptRequest" }, { request }],
    [ItemRequesting.acceptRequest, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});

/**
 * Handles the user who made the request cancelling it.
 */
export const CancelRequestRequest: Sync = ({ request, accessToken, user, itemRequest, requestDoc }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/cancelRequest", accessToken, request: itemRequest }, { request }],
  ),
  where: async (frames) => {
    // Step 1: Authenticate the user.
    let authorizedFrames = await frames.query(UserAuthentication._getUserFromToken, { accessToken }, { user });
    // Step 2: Get the details of the request to find the requester.
    authorizedFrames = await authorizedFrames.query(ItemRequesting._getRequest, { request: itemRequest }, { requestDoc });
    // Step 3: Authorize: ensure the authenticated user is the one who made the request.
    return authorizedFrames.filter(($) => $[user] === $[requestDoc]?.requester);
  },
  then: actions(
    [ItemRequesting.cancelRequest, { request: itemRequest, user }],
  ),
});

export const CancelRequestResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/cancelRequest" }, { request }],
    [ItemRequesting.cancelRequest, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: error ? "error" : "success", error }],
  ),
});
```

With these updated files, your backend should now be free of the `Promise` chaining error and will correctly execute the authorization logic. You can now proceed with confidence.
