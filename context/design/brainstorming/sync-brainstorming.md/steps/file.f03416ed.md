---
timestamp: 'Tue Nov 25 2025 19:34:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193438.a311f38f.md]]'
content_id: f03416ed012d66b9b0d62d16afa0eb1a586cdc3fcf3898445e44f7a9393527c8
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
    // The concept itself should contain validation logic based on its state.
    // For more complex cross-concept validation (e.g., checking listing status),
    // it could be done in the 'where' clause here.
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
      .query(ItemRequesting._getItemForRequest, { request: itemRequest }, { item }) // Assumes this query exists
      .query(Item._getItemById, { item }, { itemDoc })
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
      .query(ItemRequesting._getRequest, { request: itemRequest }, { requestDoc }) // Assumes this query exists
      .filter(($) => $[user] === $[requestDoc].requester); // Authorize: only requester can cancel.
  },
  then: actions(
    // The concept action also validates the user.
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

***

### 4. Transaction Lifecycle Syncs

This file contains the most critical business logic, orchestrating what happens *after* a request is accepted and how the transaction progresses.
