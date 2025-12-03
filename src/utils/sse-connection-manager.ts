import type { SSEStreamingApi } from "jsr:@hono/hono/streaming";

/**
 * Manages active SSE connections for real-time notification delivery.
 * Allows pushing notifications immediately to connected clients without polling delays.
 */
class SSEConnectionManager {
  private connections: Map<string, SSEStreamingApi> = new Map();
  private userIds: Map<string, string> = new Map(); // connectionId -> userId

  /**
   * Register a new SSE connection for a user.
   * @param userId The authenticated user ID
   * @param stream The SSE stream to register
   * @returns A unique connection ID
   */
  register(userId: string, stream: SSEStreamingApi): string {
    const connectionId = crypto.randomUUID();
    this.connections.set(connectionId, stream);
    this.userIds.set(connectionId, userId);
    return connectionId;
  }

  /**
   * Unregister an SSE connection.
   * @param connectionId The connection ID to remove
   */
  unregister(connectionId: string): void {
    this.connections.delete(connectionId);
    this.userIds.delete(connectionId);
  }

  /**
   * Get all connection IDs for a specific user.
   * @param userId The user ID to look up
   * @returns Array of connection IDs for this user
   */
  getConnectionsForUser(userId: string): string[] {
    const connections: string[] = [];
    for (const [connectionId, userIdForConnection] of this.userIds.entries()) {
      if (userIdForConnection === userId) {
        connections.push(connectionId);
      }
    }
    return connections;
  }

  /**
   * Get the SSE stream for a connection ID.
   * @param connectionId The connection ID
   * @returns The SSE stream or undefined if not found
   */
  getStream(connectionId: string): SSEStreamingApi | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Send a notification event to all connections for a specific user.
   * @param userId The user ID to send to
   * @param eventType The SSE event type
   * @param data The event data (will be JSON stringified)
   * @returns Number of connections the event was sent to
   */
  async sendToUser(
    userId: string,
    eventType: string,
    data: unknown,
  ): Promise<number> {
    const connectionIds = this.getConnectionsForUser(userId);
    let sentCount = 0;

    for (const connectionId of connectionIds) {
      const stream = this.getStream(connectionId);
      if (stream) {
        try {
          await stream.writeSSE({
            event: eventType,
            data: JSON.stringify(data),
          });
          sentCount++;
        } catch (error) {
          // Connection likely closed, remove it
          console.error(
            `[SSE] Failed to send to connection ${connectionId}:`,
            error,
          );
          this.unregister(connectionId);
        }
      }
    }

    return sentCount;
  }

  /**
   * Get the total number of active connections.
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const sseConnectionManager = new SSEConnectionManager();

