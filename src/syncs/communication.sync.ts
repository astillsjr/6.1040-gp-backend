import { actions, Sync } from "@engine";
import {
  Communication,
  Requesting,
  UserAuthentication,
} from "@concepts";

/**
 * USER-INITIATED: Create a conversation between two users for a transaction.
 * Requires authentication and verifies the user is one of the participants.
 */
export const CreateConversationRequest: Sync = (
  { request, accessToken, user, participant1, participant2, transaction },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Communication/createConversation",
      accessToken,
      participant1,
      participant2,
      transaction,
    }, { request }],
  ),
  where: async (frames) => {
    // Authenticate the user
    const authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Verify the authenticated user is one of the participants
    return authorizedFrames.filter(($: any) =>
      $[user] === $[participant1] || $[user] === $[participant2]
    );
  },
  then: actions(
    [Communication.createConversation, {
      participant1,
      participant2,
      transaction,
    }],
  ),
});

export const CreateConversationResponse: Sync = ({ request, conversation }) => ({
  when: actions(
    [Requesting.request, { path: "/Communication/createConversation" }, {
      request,
    }],
    [Communication.createConversation, {}, { conversation }],
  ),
  then: actions(
    [Requesting.respond, { request, conversation }],
  ),
});

/**
 * USER-INITIATED: Send a message in a conversation.
 * Requires authentication and verifies the user is a participant in the conversation.
 */
export const SendMessageRequest: Sync = (
  { request, accessToken, user, conversation, content, conversationDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Communication/sendMessage",
      accessToken,
      conversation,
      content,
    }, { request }],
  ),
  where: async (frames) => {
    // Authenticate the user
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Get the conversation to verify the user is a participant
    authorizedFrames = await authorizedFrames.query(
      Communication._getConversation,
      { conversation },
      { conversationDoc },
    );
    // Verify the authenticated user is a participant
    return authorizedFrames.filter(($: any) =>
      $[user] === $[conversationDoc].participant1 ||
      $[user] === $[conversationDoc].participant2
    );
  },
  then: actions(
    [Communication.sendMessage, {
      conversation,
      author: user,
      content,
    }],
  ),
});

export const SendMessageResponse: Sync = ({ request, message }) => ({
  when: actions(
    [Requesting.request, { path: "/Communication/sendMessage" }, {
      request,
    }],
    [Communication.sendMessage, {}, { message }],
  ),
  then: actions(
    [Requesting.respond, { request, message }],
  ),
});

/**
 * USER-INITIATED: Mark a message as read.
 * Requires authentication and verifies the user is a participant in the conversation
 * (and not the author of the message).
 */
export const MarkMessageReadRequest: Sync = (
  { request, accessToken, user, message, messageDoc, conversationDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Communication/markMessageRead",
      accessToken,
      message,
    }, { request }],
  ),
  where: async (frames) => {
    // Authenticate the user
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Get the message to find its conversation
    authorizedFrames = await authorizedFrames.query(
      Communication._getMessage,
      { message },
      { messageDoc },
    );
    // For each frame with a message, query for its conversation and merge
    const result: any[] = [];
    for (const frame of authorizedFrames) {
      const msgDoc = frame[messageDoc] as any;
      if (!msgDoc || !msgDoc.conversation) continue;
      // Query for the conversation
      const convFrames = await frames.query(
        Communication._getConversation,
        { conversation: msgDoc.conversation },
        { conversationDoc },
      );
      // Merge frames and filter
      for (const convFrame of convFrames) {
        const mergedFrame = { ...frame, ...convFrame };
        const isParticipant = mergedFrame[user] === mergedFrame[conversationDoc].participant1 ||
          mergedFrame[user] === mergedFrame[conversationDoc].participant2;
        const isNotAuthor = mergedFrame[user] !== mergedFrame[messageDoc].author;
        if (isParticipant && isNotAuthor) {
          result.push(mergedFrame);
        }
      }
    }
    return result;
  },
  then: actions(
    [Communication.markMessageRead, { message }],
  ),
});

export const MarkMessageReadResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Communication/markMessageRead" }, {
      request,
    }],
    [Communication.markMessageRead, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

/**
 * USER-INITIATED: Mark all unread messages in a conversation as read.
 * Requires authentication and verifies the user is a participant in the conversation.
 */
export const MarkConversationReadRequest: Sync = (
  { request, accessToken, user, conversation, conversationDoc },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Communication/markConversationRead",
      accessToken,
      conversation,
    }, { request }],
  ),
  where: async (frames) => {
    // Authenticate the user
    let authorizedFrames = await frames.query(
      UserAuthentication._getUserFromToken,
      { accessToken },
      { user },
    );
    // Get the conversation to verify the user is a participant
    authorizedFrames = await authorizedFrames.query(
      Communication._getConversation,
      { conversation },
      { conversationDoc },
    );
    // Verify the authenticated user is a participant
    return authorizedFrames.filter(($: any) =>
      $[user] === $[conversationDoc].participant1 ||
      $[user] === $[conversationDoc].participant2
    );
  },
  then: actions(
    [Communication.markConversationRead, {
      conversation,
      user,
    }],
  ),
});

export const MarkConversationReadResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Communication/markConversationRead" }, {
      request,
    }],
    [Communication.markConversationRead, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request }],
  ),
});

