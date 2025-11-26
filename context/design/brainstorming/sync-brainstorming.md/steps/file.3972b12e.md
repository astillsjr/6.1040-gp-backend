---
timestamp: 'Tue Nov 25 2025 19:37:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193742.ca411062.md]]'
content_id: 3972b12ec09614971ff74cbb0ff442d3367e5734e564fcfc67e7474829d73284
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
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      .query(ItemRequesting._getItemForRequest, { request: itemRequest }, { item })
      .query(Item._getItemById, { item }, { itemDoc: "item" })
      .filter(($) => $[user] === $[itemDoc].owner); // Authorize: only owner can accept.
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
    return await frames
      .query(UserAuthentication._getUserFromToken, { accessToken }, { user })
      .query(ItemRequesting._getRequest, { request: itemRequest }, { requestDoc })
      .filter(($) => $[user] === $[requestDoc].requester); // Authorize: only requester can cancel.
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

#### 4. Transaction Lifecycle Syncs
