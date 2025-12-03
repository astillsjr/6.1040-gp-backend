# SSE Unified Event Stream Implementation Summary

## Overview

Server-Sent Events (SSE) have been successfully implemented as a unified event stream for real-time delivery of notifications, transaction updates, request updates, and messages. This allows clients to receive all real-time events instantly without polling.

## Files Created

### 1. `src/utils/sse-connection-manager.ts`
- Manages active SSE connections per user
- Tracks connections in memory
- Provides `sendToUser()` method for immediate notification delivery
- Singleton pattern for global access

### 2. `src/utils/sse-stream.ts`
- Unified SSE stream handler factory function
- Handles authentication via access token
- Implements backlog processing for all event types (notifications, transactions, requests, messages)
- Polls for new events every 5 seconds
- Sends heartbeat every 30 seconds
- Manages connection lifecycle and cleanup
- Supports multiple event types: notifications, transaction_updates, request_updates, messages

## Files Modified

### 1. `src/concepts/Requesting/RequestingConcept.ts`
- Added SSE endpoint route: `GET /api/events/stream`
- Registers the SSE stream handler when Notifications and UserAuthentication concepts are available

### 2. `src/concepts/Notifications/NotificationsConcept.ts`
- Modified `createAndSendNotification()` to immediately push notifications to connected SSE clients
- Integrates with SSE connection manager for real-time delivery

### 3. `src/concepts/ItemTransaction/ItemTransactionConcept.ts`
- Added SSE push calls on all status changes (markPickedUp, markReturned, confirmReturn, cancelTransaction)
- Pushes updates to both `from` and `to` users immediately when transaction status changes

### 4. `src/concepts/ItemRequesting/ItemRequestingConcept.ts`
- Added SSE push calls on all status changes (acceptRequest, rejectRequest, cancelRequest)
- Pushes updates to the requester immediately when request status changes

### 5. `src/concepts/Communication/CommunicationConcept.ts`
- Added SSE push calls when messages are sent via `sendMessage()`
- Added `_getUnreadMessagesByUser()` helper method for backlog/polling
- Pushes messages to the recipient immediately when sent

## API Endpoint

**GET** `/api/events/stream`

### Authentication
Supports authentication via:
- Query parameter: `?accessToken=<token>`
- Authorization header: `Authorization: Bearer <token>`
- Authorization header (lowercase): `authorization: Bearer <token>`

### Event Types

1. **connected** - Sent immediately upon successful connection
   ```json
   {
     "type": "connected",
     "message": "Event stream connected"
   }
   ```

2. **notification** - Sent when a new notification is available
   ```json
   {
     "type": "notification",
     "notification": {
       "_id": "notification_id",
       "recipient": "user_id",
       "type": "ITEM_EXPIRED",
       "title": "Item Expired",
       "content": "An item has expired...",
       "status": "SENT",
       "createdAt": "2024-01-01T00:00:00.000Z",
       "readAt": null
     }
   }
   ```

3. **heartbeat** - Sent every 30 seconds to keep connection alive
   ```json
   {
     "type": "heartbeat",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

3. **transaction_update** - Sent when a transaction status changes
   ```json
   {
     "type": "transaction_update",
     "transaction": {
       "_id": "transaction_id",
       "from": "user_id",
       "to": "user_id",
       "item": "item_id",
       "type": "BORROW",
       "status": "IN_PROGRESS",
       "createdAt": "2024-01-01T00:00:00.000Z",
       "pickedUpAt": "2024-01-01T01:00:00.000Z",
       "returnedAt": null
     }
   }
   ```

4. **request_update** - Sent when a request status changes
   ```json
   {
     "type": "request_update",
     "request": {
       "_id": "request_id",
       "requester": "user_id",
       "item": "item_id",
       "type": "BORROW",
       "status": "ACCEPTED",
       "createdAt": "2024-01-01T00:00:00.000Z",
       "requestedStartTime": "2024-01-01T10:00:00.000Z",
       "requestedEndTime": "2024-01-01T18:00:00.000Z"
     }
   }
   ```

5. **message** - Sent when a new message is received
   ```json
   {
     "type": "message",
     "message": {
       "_id": "message_id",
       "conversation": "conversation_id",
       "author": "user_id",
       "content": "Message content",
       "createdAt": "2024-01-01T00:00:00.000Z",
       "readAt": null
     }
   }
   ```

6. **heartbeat** - Sent every 30 seconds to keep connection alive
   ```json
   {
     "type": "heartbeat",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

7. **error** - Sent when an error occurs
   ```json
   {
     "type": "error",
     "message": "Error message"
   }
   ```

## Configuration Constants

All timing and limit constants are defined in `src/utils/sse-stream.ts`:

- `SSE_CHECK_INTERVAL_MS = 5000` - Poll interval for new notifications (5 seconds)
- `SSE_HEARTBEAT_INTERVAL_MS = 30000` - Heartbeat interval (30 seconds)
- `SSE_MONITOR_INTERVAL_MS = 1000` - Cleanup check interval (1 second)
- `SSE_INITIAL_BACKLOG_HOURS = 1` - How far back to look for missed notifications
- `SSE_BACKLOG_LIMIT = 50` - Max notifications to send in backlog

## Client Usage Example

```javascript
const eventSource = new EventSource(
  '/api/events/stream?accessToken=YOUR_TOKEN'
  // or with header: new EventSource('/api/events/stream', {
  //   headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
  // })
);

eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connected:', data.message);
});

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  console.log('New notification:', data.notification);
  // Display notification to user
});

eventSource.addEventListener('heartbeat', (event) => {
  // Connection is alive
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('SSE error:', data.message);
});

eventSource.onerror = (error) => {
  console.error('EventSource connection error:', error);
  // Handle reconnection logic here
  eventSource.close();
};
```

## How It Works

### Connection Flow

1. **Client connects** → Authenticates via access token
2. **Backlog processing** → Sends all unread notifications from the last hour
3. **Polling phase** → Checks for new notifications every 5 seconds
4. **Reactive push** → When a notification is created, it's immediately pushed to connected clients
5. **Heartbeat** → Sends keep-alive messages every 30 seconds
6. **Cleanup** → Automatically cleans up on disconnect

### Notification Delivery

- **Immediate push**: When `createAndSendNotification()` is called, the notification is immediately sent to all connected SSE clients for that user
- **Polling fallback**: If no clients are connected when a notification is created, it will be delivered when the client connects (via backlog) or during the next poll

### Authentication

- Access token is validated on connection
- Token is re-verified every 5 seconds during polling
- Connection is closed immediately if authentication fails

## Features

✅ Real-time notification delivery  
✅ Authentication via access token  
✅ Backlog processing for missed notifications  
✅ Polling fallback for reliability  
✅ Heartbeat keep-alive mechanism  
✅ Automatic cleanup on disconnect  
✅ Error handling and logging  
✅ Support for multiple connections per user  

## Next Steps

1. **Test the implementation** by:
   - Starting the server
   - Connecting a client to the SSE endpoint
   - Creating a notification and verifying it's received

2. **Future enhancements** (as mentioned in `sse_usage.md`):
   - Transaction status updates
   - Request status updates
   - Communication/messaging events

3. **Client-side integration**:
   - Implement EventSource connection in frontend
   - Handle reconnection logic
   - Display notifications in UI

