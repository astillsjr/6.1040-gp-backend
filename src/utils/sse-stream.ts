import { streamSSE } from "jsr:@hono/hono/streaming";
import type { Context } from "jsr:@hono/hono";
import type { SSEStreamingApi } from "jsr:@hono/hono/streaming";
import { sseConnectionManager } from "./sse-connection-manager.ts";
import type { ID } from "@utils/types.ts";

// Configuration constants
const SSE_CHECK_INTERVAL_MS = 5000; // How often to poll for new notifications (5 seconds)
const SSE_HEARTBEAT_INTERVAL_MS = 30000; // How often to send heartbeat (30 seconds)
const SSE_MONITOR_INTERVAL_MS = 1000; // How often to check cleanup status (1 second)
const SSE_INITIAL_BACKLOG_HOURS = 1; // How far back to look for missed notifications
const SSE_BACKLOG_LIMIT = 50; // Max notifications to send in backlog

type User = ID;

/**
 * Extracts the access token from the request.
 * Supports query parameter, Authorization header, or lowercase authorization header.
 */
function extractAccessToken(c: Context): string | null {
  // Try query parameter first
  const queryToken = c.req.query("accessToken");
  if (queryToken) return queryToken;

  // Try Authorization header
  const authHeader = c.req.header("Authorization") ||
    c.req.header("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1];
  }

  return null;
}

/**
 * Safely writes an SSE message to the stream, catching disconnection errors.
 * @returns true if successful, false if client disconnected
 */
async function safeWriteSSE(
  stream: SSEStreamingApi,
  event: string,
  data: unknown,
): Promise<boolean> {
  try {
    await stream.writeSSE({
      event,
      data: JSON.stringify(data),
    });
    return true;
  } catch (error) {
    // Client likely disconnected
    return false;
  }
}

/**
 * Safely converts a date value to ISO string.
 * Handles Date objects, strings, and null/undefined.
 */
function toISOStringSafe(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') {
    // If it's already an ISO string, return it
    if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return date;
    }
    // Otherwise, try to parse and convert it
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  return null;
}

/**
 * Creates and manages a unified SSE stream for real-time events.
 * Handles notifications, transaction updates, request updates, and messages.
 * Handles authentication, backlog processing, polling, and connection lifecycle.
 */
export function createEventStream(
  // deno-lint-ignore no-explicit-any
  Notifications: any,
  // deno-lint-ignore no-explicit-any
  UserAuthentication: any,
  // deno-lint-ignore no-explicit-any
  ItemTransaction?: any,
  // deno-lint-ignore no-explicit-any
  ItemRequesting?: any,
  // deno-lint-ignore no-explicit-any
  Communication?: any,
) {
  // Backward compatibility alias
  return createNotificationStream(Notifications, UserAuthentication, ItemTransaction, ItemRequesting, Communication);
}

/**
 * Creates and manages a unified SSE stream for real-time events.
 * Handles notifications, transaction updates, request updates, and messages.
 * Handles authentication, backlog processing, polling, and connection lifecycle.
 */
function createNotificationStream(
  // deno-lint-ignore no-explicit-any
  Notifications: any,
  // deno-lint-ignore no-explicit-any
  UserAuthentication: any,
  // deno-lint-ignore no-explicit-any
  ItemTransaction?: any,
  // deno-lint-ignore no-explicit-any
  ItemRequesting?: any,
  // deno-lint-ignore no-explicit-any
  Communication?: any,
) {
  return async (c: Context) => {
    // Extract access token
    const accessToken = extractAccessToken(c);

    // Start SSE stream first, then handle authentication inside
    return streamSSE(c, async (stream: SSEStreamingApi) => {
      // Check authentication inside the stream
      if (!accessToken) {
        await safeWriteSSE(stream, "error", {
          type: "error",
          message: "Access token required",
          code: "AUTH_REQUIRED"
        });
        return; // Close connection
      }

      // Authenticate user
      let userResult;
      try {
        userResult = await UserAuthentication._getUserFromToken({
          accessToken,
        });
      } catch (error) {
        await safeWriteSSE(stream, "error", {
          type: "error",
          message: "Authentication error",
          code: "AUTH_ERROR"
        });
        return; // Close connection
      }

      if (userResult.length === 0) {
        await safeWriteSSE(stream, "error", {
          type: "error",
          message: "Invalid or expired access token",
          code: "AUTH_INVALID"
        });
        return; // Close connection
      }

      const userId = userResult[0].user;
      
      // Track last seen timestamps for each event type
      const lastSeenNotificationTimestamp = new Date(
        Date.now() - SSE_INITIAL_BACKLOG_HOURS * 60 * 60 * 1000,
      );
      const lastSeenTransactionTimestamp = new Date(
        Date.now() - SSE_INITIAL_BACKLOG_HOURS * 60 * 60 * 1000,
      );
      const lastSeenRequestTimestamp = new Date(
        Date.now() - SSE_INITIAL_BACKLOG_HOURS * 60 * 60 * 1000,
      );
      const lastSeenMessageTimestamp = new Date(
        Date.now() - SSE_INITIAL_BACKLOG_HOURS * 60 * 60 * 1000,
      );
      // Register this connection
      const connectionId = sseConnectionManager.register(userId, stream);
      let isCleanedUp = false;

      // Cleanup function
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        sseConnectionManager.unregister(connectionId);
      };

      // Send initial "connected" event
      const connected = await safeWriteSSE(stream, "connected", {
        type: "connected",
        message: "Event stream connected",
      });

      if (!connected) {
        cleanup();
        return;
      }

      // Process backlog: send unread notifications
      try {
        const unreadNotifications = await Notifications
          ._getUnreadNotificationsByRecipient({ recipient: userId });

        // Limit backlog size
        const backlogNotifications = unreadNotifications
          .slice(0, SSE_BACKLOG_LIMIT)
          .filter((notif) => {
            return notif.createdAt >= lastSeenNotificationTimestamp;
          });

        // Send backlog notifications
        for (const notification of backlogNotifications) {
          const sent = await safeWriteSSE(stream, "notification", {
            type: "notification",
            notification: {
              _id: notification._id,
              recipient: notification.recipient,
              type: notification.type,
              title: notification.title,
              content: notification.content,
              status: notification.status,
              createdAt: notification.createdAt.toISOString(),
              readAt: notification.readAt
                ? notification.readAt.toISOString()
                : null,
            },
          });

          if (!sent) {
            cleanup();
            return;
          }

          // Update last seen timestamp
          if (
            notification.createdAt > lastSeenNotificationTimestamp
          ) {
            lastSeenNotificationTimestamp.setTime(
              notification.createdAt.getTime(),
            );
          }
        }
      } catch (error) {
        console.error("[SSE] Error processing notification backlog:", error);
        await safeWriteSSE(stream, "error", {
          type: "error",
          message: "Error loading notification backlog",
        });
      }

      // Process backlog: recent transactions
      if (ItemTransaction) {
        try {
          const userTransactions = await ItemTransaction._getTransactionsByUser({ user: userId });
          const recentTransactions = userTransactions
            .slice(0, SSE_BACKLOG_LIMIT)
            .filter((tx) => {
              // Only include transactions updated in the last hour
              const updatedAt = tx.pickedUpAt || tx.returnedAt || tx.createdAt;
              return updatedAt && updatedAt >= lastSeenTransactionTimestamp;
            });

          for (const transaction of recentTransactions) {
            const sent = await safeWriteSSE(stream, "transaction_update", {
              type: "transaction_update",
              transaction: {
                _id: transaction._id,
                from: transaction.from,
                to: transaction.to,
                item: transaction.item,
                type: transaction.type,
                status: transaction.status,
                createdAt: transaction.createdAt.toISOString(),
                pickedUpAt: transaction.pickedUpAt ? transaction.pickedUpAt.toISOString() : null,
                returnedAt: transaction.returnedAt ? transaction.returnedAt.toISOString() : null,
              },
            });

            if (!sent) {
              cleanup();
              return;
            }

            const updatedAt = transaction.pickedUpAt || transaction.returnedAt || transaction.createdAt;
            if (updatedAt && updatedAt > lastSeenTransactionTimestamp) {
              lastSeenTransactionTimestamp.setTime(updatedAt.getTime());
            }
          }
        } catch (error) {
          console.error("[SSE] Error processing transaction backlog:", error);
        }
      }

      // Process backlog: recent requests
      if (ItemRequesting) {
        try {
          const userRequests = await ItemRequesting._getRequestsByRequester({ requester: userId });
          const recentRequests = userRequests
            .slice(0, SSE_BACKLOG_LIMIT)
            .filter((req) => {
              return req.createdAt >= lastSeenRequestTimestamp;
            });

          for (const request of recentRequests) {
            const sent = await safeWriteSSE(stream, "request_update", {
              type: "request_update",
              request: {
                _id: request._id,
                requester: request.requester,
                item: request.item,
                type: request.type,
                status: request.status,
                createdAt: request.createdAt.toISOString(),
                requestedStartTime: toISOStringSafe(request.requestedStartTime),
                requestedEndTime: toISOStringSafe(request.requestedEndTime),
              },
            });

            if (!sent) {
              cleanup();
              return;
            }

            if (request.createdAt > lastSeenRequestTimestamp) {
              lastSeenRequestTimestamp.setTime(request.createdAt.getTime());
            }
          }
        } catch (error) {
          console.error("[SSE] Error processing request backlog:", error);
        }
      }

      // Process backlog: recent messages
      if (Communication && Communication._getUnreadMessagesByUser) {
        try {
          const unreadMessages = await Communication._getUnreadMessagesByUser({ user: userId });
          const recentMessages = unreadMessages
            .slice(0, SSE_BACKLOG_LIMIT)
            .filter((msg) => msg.createdAt >= lastSeenMessageTimestamp);

          for (const message of recentMessages) {
            const sent = await safeWriteSSE(stream, "message", {
              type: "message",
              message: {
                _id: message._id,
                conversation: message.conversation,
                author: message.author,
                content: message.content,
                createdAt: message.createdAt.toISOString(),
                readAt: message.readAt ? message.readAt.toISOString() : null,
              },
            });

            if (!sent) {
              cleanup();
              return;
            }

            if (message.createdAt > lastSeenMessageTimestamp) {
              lastSeenMessageTimestamp.setTime(message.createdAt.getTime());
            }
          }
        } catch (error) {
          console.error("[SSE] Error processing message backlog:", error);
        }
      }

      // Setup heartbeat interval
      const heartbeatInterval = setInterval(async () => {
        if (isCleanedUp) {
          clearInterval(heartbeatInterval);
          return;
        }

        const sent = await safeWriteSSE(stream, "heartbeat", {
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        });

        if (!sent) {
          cleanup();
          clearInterval(heartbeatInterval);
        }
      }, SSE_HEARTBEAT_INTERVAL_MS);

      // Setup polling interval for new notifications
      const checkInterval = setInterval(async () => {
        if (isCleanedUp) {
          clearInterval(checkInterval);
          return;
        }

        try {
          // Re-verify authentication
          const reAuthResult = await UserAuthentication._getUserFromToken({
            accessToken,
          });

          if (reAuthResult.length === 0) {
            // Authentication failed, close connection
            cleanup();
            clearInterval(checkInterval);
            clearInterval(heartbeatInterval);
            return;
          }

          // Check for new unread notifications since last seen
          const allUnread = await Notifications
            ._getUnreadNotificationsByRecipient({ recipient: userId });

          const newNotifications = allUnread.filter((notif) => {
            return notif.createdAt > lastSeenNotificationTimestamp;
          });

          // Send new notifications
          for (const notification of newNotifications.slice(0, 10)) {
            const sent = await safeWriteSSE(stream, "notification", {
              type: "notification",
              notification: {
                _id: notification._id,
                recipient: notification.recipient,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                status: notification.status,
                createdAt: notification.createdAt.toISOString(),
                readAt: notification.readAt
                  ? notification.readAt.toISOString()
                  : null,
              },
            });

            if (!sent) {
              cleanup();
              clearInterval(checkInterval);
              clearInterval(heartbeatInterval);
              return;
            }

            // Update last seen timestamp
            if (
              notification.createdAt > lastSeenNotificationTimestamp
            ) {
              lastSeenNotificationTimestamp.setTime(
                notification.createdAt.getTime(),
              );
            }
          }

          // Check for transaction updates
          if (ItemTransaction) {
            try {
              const userTransactions = await ItemTransaction._getTransactionsByUser({
                user: userId,
              });
              const recentTransactions = userTransactions.slice(0, 10);

              for (const transaction of recentTransactions) {
                const updatedAt = transaction.pickedUpAt ||
                  transaction.returnedAt ||
                  transaction.createdAt;
                if (updatedAt && updatedAt > lastSeenTransactionTimestamp) {
                  const sent = await safeWriteSSE(stream, "transaction_update", {
                    type: "transaction_update",
                    transaction: {
                      _id: transaction._id,
                      from: transaction.from,
                      to: transaction.to,
                      item: transaction.item,
                      type: transaction.type,
                      status: transaction.status,
                      createdAt: transaction.createdAt.toISOString(),
                      pickedUpAt: transaction.pickedUpAt
                        ? transaction.pickedUpAt.toISOString()
                        : null,
                      returnedAt: transaction.returnedAt
                        ? transaction.returnedAt.toISOString()
                        : null,
                    },
                  });

                  if (!sent) {
                    cleanup();
                    clearInterval(checkInterval);
                    clearInterval(heartbeatInterval);
                    return;
                  }

                  lastSeenTransactionTimestamp.setTime(updatedAt.getTime());
                }
              }
            } catch (error) {
              console.error("[SSE] Error checking for transaction updates:", error);
            }
          }

          // Check for request updates
          if (ItemRequesting) {
            try {
              const userRequests = await ItemRequesting._getRequestsByRequester({
                requester: userId,
              });
              const newRequests = userRequests
                .slice(0, 10)
                .filter((req) => req.createdAt > lastSeenRequestTimestamp);

              for (const request of newRequests) {
                const sent = await safeWriteSSE(stream, "request_update", {
                  type: "request_update",
                  request: {
                    _id: request._id,
                    requester: request.requester,
                    item: request.item,
                    type: request.type,
                    status: request.status,
                    createdAt: request.createdAt.toISOString(),
                    requestedStartTime: toISOStringSafe(request.requestedStartTime),
                    requestedEndTime: toISOStringSafe(request.requestedEndTime),
                  },
                });

                if (!sent) {
                  cleanup();
                  clearInterval(checkInterval);
                  clearInterval(heartbeatInterval);
                  return;
                }

                lastSeenRequestTimestamp.setTime(request.createdAt.getTime());
              }
            } catch (error) {
              console.error("[SSE] Error checking for request updates:", error);
            }
          }

          // Check for new messages
          if (Communication && Communication._getUnreadMessagesByUser) {
            try {
              const unreadMessages = await Communication._getUnreadMessagesByUser({
                user: userId,
              });
              const newMessages = unreadMessages
                .slice(0, 10)
                .filter((msg) => msg.createdAt > lastSeenMessageTimestamp);

              for (const message of newMessages) {
                const sent = await safeWriteSSE(stream, "message", {
                  type: "message",
                  message: {
                    _id: message._id,
                    conversation: message.conversation,
                    author: message.author,
                    content: message.content,
                    createdAt: message.createdAt.toISOString(),
                    readAt: message.readAt ? message.readAt.toISOString() : null,
                  },
                });

                if (!sent) {
                  cleanup();
                  clearInterval(checkInterval);
                  clearInterval(heartbeatInterval);
                  return;
                }

                lastSeenMessageTimestamp.setTime(message.createdAt.getTime());
              }
            } catch (error) {
              console.error("[SSE] Error checking for new messages:", error);
            }
          }
        } catch (error) {
          console.error("[SSE] Error checking for notifications:", error);
          await safeWriteSSE(stream, "error", {
            type: "error",
            message: "Error checking for notifications",
          });
        }
      }, SSE_CHECK_INTERVAL_MS);

      // Monitor for cleanup
      const monitorInterval = setInterval(() => {
        if (isCleanedUp) {
          clearInterval(monitorInterval);
          clearInterval(checkInterval);
          clearInterval(heartbeatInterval);
        }
      }, SSE_MONITOR_INTERVAL_MS);

      // Wait for cleanup (connection close)
      await new Promise<void>((resolve) => {
        const checkCleanup = setInterval(() => {
          if (isCleanedUp) {
            clearInterval(checkCleanup);
            resolve();
          }
        }, SSE_MONITOR_INTERVAL_MS);
      });
    });
  };
}

