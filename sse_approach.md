# Server-Sent Events (SSE) Implementation

## Overview

The backend implements a unified Server-Sent Events (SSE) stream that provides real-time notifications to connected clients. The SSE stream handles multiple event types, including nudge notifications and bet resolution events, allowing clients to receive updates as they occur without polling.

## Architecture

### Endpoint

**GET** `/api/events/stream?accessToken=<token>`

The SSE stream is registered in `RequestingConcept.ts` and uses Hono's `streamSSE` utility from `@hono/hono/streaming` to create the event stream.

### Key Components

1. **`createUnifiedEventStream`** - Factory function that creates the SSE handler
2. **`handleSSEStream`** - Core function that manages the stream lifecycle
3. **Event Processing Functions** - Helper functions for triggering nudges and resolving bets

## Authentication

The SSE stream requires authentication via an access token, which can be provided in one of three ways:

1. **Query Parameter**: `?accessToken=<token>`
2. **Authorization Header**: `Authorization: Bearer <token>`
3. **Authorization Header (lowercase)**: `authorization: Bearer <token>`

The authentication flow:
1. Extracts the access token from the request
2. Validates the token using `UserAuthentication.getUserInfo()`
3. Retrieves the user ID for the connection
4. If authentication fails, returns a 401 error

Additionally, the stream periodically re-verifies authentication (every 5 seconds during event checks) to ensure:
- The access token is still valid
- The user still has an active session (refreshToken exists)
- If authentication fails or the user logs out, the connection is immediately closed

## Event Types

The SSE stream handles the following event types:

### 1. **Connected Event**
Sent immediately upon successful connection:
```json
{
  "type": "connected",
  "message": "Unified event stream connected"
}
```

### 2. **Nudge Events**
Sent when a nudge becomes ready for delivery:
```json
{
  "type": "nudge",
  "nudge": {
    "_id": "nudge_id",
    "task": "task_id",
    "deliveryTime": "2023-10-15T14:30:00Z",
    "message": "AI-generated nudge message"
  }
}
```

**Nudge Processing Flow:**
1. Retrieves task details from `TaskManager`
2. Gets recent emotions from `EmotionLogger`
3. Triggers the nudge via `NudgeEngine.nudgeUser()` which generates an AI-powered message
4. Sends the nudge event via SSE
5. Updates the `lastSeenNudgeTimestamp` to prevent duplicate deliveries

### 3. **Bet Resolved Events**
Sent when a bet is successfully resolved (task completed before deadline):
```json
{
  "type": "bet_resolved",
  "bet": {
    "_id": "bet_id",
    "task": "task_id",
    "wager": 50,
    "deadline": "2023-10-15T18:00:00Z",
    "success": true
  }
}
```

### 4. **Bet Expired Events**
Sent when a bet expires (deadline passed without completion):
```json
{
  "type": "bet_expired",
  "bet": {
    "_id": "bet_id",
    "task": "task_id",
    "wager": 50,
    "deadline": "2023-10-15T18:00:00Z",
    "success": false
  }
}
```

**Bet Expiration Processing Flow:**
1. Calls `MicroBet.resolveExpiredBet()` to mark the bet as failed
2. Retrieves the updated bet details
3. Sends the expired bet event via SSE
4. Updates the `lastSeenBetTimestamp`

### 5. **Heartbeat Events**
Sent every 30 seconds to keep the connection alive:
```json
{
  "type": "heartbeat",
  "timestamp": "2023-10-15T14:30:00Z"
}
```

### 6. **Error Events**
Sent when an error occurs during event checking:
```json
{
  "type": "error",
  "message": "Error checking for events"
}
```

## Backlog Processing

When a client first connects, the stream processes any missed events since their last connection. This ensures clients don't miss important notifications.

### Last Seen Timestamps

The system maintains two "last seen" timestamps per user:
- **`lastSeenNudgeTimestamp`** - Tracks the most recent nudge delivery time
- **`lastSeenBetTimestamp`** - Tracks the most recent bet resolution time

These timestamps are stored in the `UserAuthentication` concept and are used to:
1. Determine which events to send in the backlog
2. Prevent duplicate event delivery
3. Only send events that occurred after the last seen timestamp

### Backlog Initialization

If a user has no previous `lastSeen` timestamps, they are initialized to `SSE_INITIAL_BACKLOG_HOURS` (1 hour) ago to catch recent events.

### Backlog Processing Order

1. **Already-Triggered Nudges** - Nudges that were triggered while the client was disconnected (already have messages)
2. **Recently Resolved Bets** - Bets that were resolved while the client was disconnected
3. **Ready Nudges** - Nudges that are ready but haven't been triggered yet (need to be triggered and sent)
4. **Expired Bets** - Bets that expired while the client was disconnected (need to be resolved and sent)

The backlog is limited to `SSE_BACKLOG_LIMIT` (50) items per category to prevent overwhelming the client.

## Polling Mechanism

After processing the backlog, the stream enters a polling phase that checks for new events at regular intervals.

### Check Interval

Every `SSE_CHECK_INTERVAL_MS` (5 seconds), the stream:
1. Re-verifies user authentication
2. Checks for ready nudges via `NudgeEngine.getReadyNudges()`
3. Checks for expired bets via `MicroBet.getExpiredBets()`
4. Checks for newly resolved bets via `MicroBet.getRecentlyResolvedBets()`

### Event Processing During Polling

- **Ready Nudges**: Each ready nudge is triggered and sent immediately
- **Expired Bets**: Each expired bet is resolved and sent immediately
- **Resolved Bets**: Only checks the most recent `SSE_POLLING_LIMIT` (10) bets to avoid processing old data

## Connection Management

### Safe Write Function

All SSE writes go through `safeWriteSSE()`, which:
- Wraps `stream.writeSSE()` in a try-catch block
- Detects client disconnections by catching write errors
- Automatically triggers cleanup when a disconnection is detected
- Returns `true` if successful, `false` if the client disconnected

### Cleanup Function

The `cleanup()` function:
- Sets `isCleanedUp` flag to prevent further processing
- Clears the check interval
- Clears the heartbeat interval
- Is called automatically when:
  - Client disconnects (detected via write error)
  - Authentication fails
  - User logs out (session invalidated)

### Connection Lifecycle

1. **Connection**: Client connects, authentication verified
2. **Initial Message**: "connected" event sent
3. **Backlog Processing**: Missed events sent
4. **Polling Phase**: Periodic checks for new events
5. **Heartbeat**: Regular keep-alive messages
6. **Disconnection**: Cleanup triggered, intervals cleared

The stream maintains the connection using a monitoring loop that checks every `SSE_MONITOR_INTERVAL_MS` (1 second) if cleanup has been called, then resolves the promise to end the stream handler.

## Configuration Constants

All timing and limit constants are defined at the top of `sse-stream.ts`:

```typescript
const SSE_INITIAL_BACKLOG_HOURS = 1;        // How far back to look for missed events
const SSE_CHECK_INTERVAL_MS = 5000;         // How often to poll for new events (5 seconds)
const SSE_HEARTBEAT_INTERVAL_MS = 30000;   // How often to send heartbeat (30 seconds)
const SSE_MONITOR_INTERVAL_MS = 1000;       // How often to check cleanup status (1 second)
const SSE_BACKLOG_LIMIT = 50;               // Max events to send in backlog
const SSE_POLLING_LIMIT = 10;               // Max recent bets to check during polling
```

## Race Condition Handling

The implementation handles several race conditions:

### Nudge Race Conditions
- If a nudge is already triggered by another process, the error is caught and the nudge is skipped
- The `lastSeenNudgeTimestamp` is only updated forward (never backward) to prevent duplicate deliveries

### Bet Race Conditions
- If a bet is already resolved, `resolveExpiredBet()` returns `status: "already_resolved"` and the bet is skipped
- The `lastSeenBetTimestamp` is only updated forward to prevent duplicate deliveries

## Error Handling

Errors are handled at multiple levels:

1. **Authentication Errors**: Return 401 immediately, no stream created
2. **Stream Write Errors**: Detected as disconnection, cleanup triggered
3. **Event Processing Errors**: Logged to console, error event sent to client (if connection still alive)
4. **Concept Method Errors**: Logged, individual event skipped, stream continues

## Integration with Concepts

The SSE stream integrates with multiple concepts:

- **UserAuthentication**: Authentication, session validation, timestamp tracking
- **NudgeEngine**: Nudge queries, triggering, message generation
- **TaskManager**: Task details for nudge context
- **EmotionLogger**: Recent emotions for personalized nudge messages
- **MicroBet**: Bet queries, resolution, expiration handling

## Client Usage Example

```javascript
const eventSource = new EventSource('/api/events/stream?accessToken=YOUR_TOKEN');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('Connected to event stream');
      break;
    case 'nudge':
      console.log('Received nudge:', data.nudge);
      // Display nudge to user
      break;
    case 'bet_resolved':
      console.log('Bet resolved:', data.bet);
      // Update UI with bet result
      break;
    case 'bet_expired':
      console.log('Bet expired:', data.bet);
      // Update UI with bet failure
      break;
    case 'heartbeat':
      // Connection is alive
      break;
    case 'error':
      console.error('SSE error:', data.message);
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  // Handle reconnection logic
};
```

## Performance Considerations

1. **Backlog Limits**: Prevents sending too many events at once
2. **Polling Limits**: Only checks recent bets during polling to avoid full database scans
3. **Interval-Based Polling**: 5-second intervals balance responsiveness with server load
4. **Heartbeat**: 30-second intervals keep connections alive without excessive traffic
5. **Cleanup**: Proper cleanup prevents memory leaks and resource exhaustion

## Security Considerations

1. **Authentication Required**: All connections must be authenticated
2. **Periodic Re-authentication**: Tokens are re-verified every 5 seconds
3. **Session Validation**: Checks for active sessions to detect logouts
4. **User Isolation**: Each stream only receives events for the authenticated user
5. **Automatic Disconnection**: Invalid authentication immediately closes the connection

