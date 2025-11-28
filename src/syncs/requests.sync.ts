import { actions, Sync } from "@engine";
import {
  Item,
  ItemRequesting,
  Requesting,
  UserAuthentication,
} from "@concepts";

/**
 * Handles a user creating a request for an item.
 */
export const CreateRequestRequest: Sync = (
  { request, accessToken, user, item, type, notes, startTime, endTime },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemRequesting/createRequest",
      accessToken,
      item,
      type,
      notes,
      startTime,
      endTime,
    }, { request }],
  ),
  where: (frames) =>
    frames.query(UserAuthentication._getUserFromToken, { accessToken }, {
      user,
    }),
  then: actions(
    [ItemRequesting.createRequest, {
      requester: user,
      item,
      type,
      requesterNotes: notes,
      requestedStartTime: startTime,
      requestedEndTime: endTime,
      status: "PENDING",
    }],
  ),
});

export const CreateRequestResponse: Sync = ({ request, newRequest }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/createRequest" }, {
      request,
    }],
    [ItemRequesting.createRequest, {}, { request: newRequest }],
  ),
  then: actions(
    [Requesting.respond, { request, newItemRequest: newRequest }],
  ),
});

/**
 * Handles the item owner accepting a request.
 */
export const AcceptRequestRequest: Sync = (
  { request, accessToken, user, itemRequest, item, itemDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemRequesting/acceptRequest",
      accessToken,
      request: itemRequest,
    }, { request }],
  ),
  where: async (frames) => {
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    authorizedFrames = await authorizedFrames.query(
      ItemRequesting._getItemForRequest,
      { request: itemRequest },
      { item },
    );
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    ); // Authorize: only owner can accept.
  },
  then: actions(
    [ItemRequesting.acceptRequest, { request: itemRequest }],
  ),
});

export const AcceptRequestResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/acceptRequest" }, {
      request,
    }],
    [ItemRequesting.acceptRequest, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles the user who made the request cancelling it.
 */
export const CancelRequestRequest: Sync = (
  { request, accessToken, user, itemRequest, requestDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemRequesting/cancelRequest",
      accessToken,
      request: itemRequest,
    }, { request }],
  ),
  where: async (frames) => {
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    authorizedFrames = await authorizedFrames.query(
      ItemRequesting._getRequest,
      { request: itemRequest },
      { requestDoc },
    );
    return authorizedFrames.filter(($: any) =>
      $[user] === $[requestDoc].requester
    ); // Authorize: only requester can cancel.
  },
  then: actions(
    [ItemRequesting.cancelRequest, { request: itemRequest, user }],
  ),
});

export const CancelRequestResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/cancelRequest" }, {
      request,
    }],
    [ItemRequesting.cancelRequest, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * Handles the item owner rejecting a request.
 */
export const RejectRequestRequest: Sync = (
  { request, accessToken, user, itemRequest, item, itemDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/ItemRequesting/rejectRequest",
      accessToken,
      request: itemRequest,
    }, { request }],
  ),
  where: async (frames) => {
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    authorizedFrames = await authorizedFrames.query(
      ItemRequesting._getItemForRequest,
      { request: itemRequest },
      { item },
    );
    authorizedFrames = await authorizedFrames.query(
      Item._getItemById,
      { item },
      { item: itemDoc },
    );
    return authorizedFrames.filter(($: any) =>
      $[user] === ($[itemDoc] as any)?.owner
    ); // Authorize: only owner can reject.
  },
  then: actions(
    [ItemRequesting.rejectRequest, { request: itemRequest }],
  ),
});

export const RejectRequestResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemRequesting/rejectRequest" }, {
      request,
    }],
    [ItemRequesting.rejectRequest, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});
