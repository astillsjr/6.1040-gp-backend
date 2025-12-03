import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";
import { sseConnectionManager } from "@utils/sse-connection-manager.ts";
import { toISOStringSafe } from "@utils/sse-stream.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "ItemRequesting" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Item = ID;

// Define the types for our entries based on the concept state
type ItemRequest = ID;
export type ItemRequestType = "BORROW" | "TRANSFER" | "ITEM";
export type ItemRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

/**
 * a set of ItemRequests with
 *   a requester User
 *   an item Item
 *   a type of BORROW or TRANSFER or ITEM
 *   a status of PENDING or ACCEPTED or REJECTED or CANCELLED
 *   a requesterNotes String
 *   an optional requestedStartTime DateTime
 *   an optional requestedEndTime DateTime
 *   a createdAt Date
 */
interface ItemRequestDoc {
  _id: ItemRequest;
  requester: User;
  item: Item;
  type: ItemRequestType;
  status: ItemRequestStatus;
  requesterNotes: string;
  requestedStartTime: Date | null;
  requestedEndTime: Date | null;
  createdAt: Date;
}

/**
 * @concept ItemRequesting
 * @purpose To allow users to request items from other users or to transfer items to other users.
 */
export default class ItemRequestingConcept {
  requests: Collection<ItemRequestDoc>;

  constructor(private readonly db: Db) {
    this.requests = this.db.collection(PREFIX + "requests");
  }

  /**
   * Helper function to push request update to SSE for the requester.
   */
  private async pushRequestUpdate(request: ItemRequestDoc): Promise<void> {
    const updateData = {
      type: "request_update",
      request: {
        _id: request._id,
        requester: request.requester,
        item: request.item,
        type: request.type,
        status: request.status,
        createdAt: toISOStringSafe(request.createdAt) || new Date().toISOString(),
        requestedStartTime: toISOStringSafe(request.requestedStartTime),
        requestedEndTime: toISOStringSafe(request.requestedEndTime),
      },
    };

    // Push to requester
    try {
      await sseConnectionManager.sendToUser(
        request.requester,
        "request_update",
        updateData,
      );
    } catch (error) {
      console.error(
        `[ItemRequesting] Failed to push request ${request._id} to SSE:`,
        error,
      );
    }
  }

  /**
   * Create a new item request.
   * @requires For
   * @effects Creates a new item request.
   */
  async createRequest(
    params: { 
      requester: User; 
      item: Item; 
      type: ItemRequestType; 
      status: ItemRequestStatus; 
      requesterNotes: string; 
      requestedStartTime: Date | null; 
      requestedEndTime: Date | null; 
    }
  ): Promise<{ request: ItemRequest } | { error: string }> {
    const { requester, item, type, status, requesterNotes, requestedStartTime, requestedEndTime } = params;

    const request = {
      _id: freshID(),
      requester, 
      item, 
      type, 
      status, 
      requesterNotes, 
      requestedStartTime, 
      requestedEndTime, 
      createdAt: new Date(),
    };
    await this.requests.insertOne(request);

    return { request: request._id };
  }

  /**
   * Accept a pending item request.
   * @requires The request must be pending.
   * @effects Sets the request status to ACCEPTED.
   */
  async acceptRequest(
    { request }: { request: ItemRequest }
  ): Promise<Empty | { error: string }> {
    const requestDoc = await this.requests.findOne({ _id: request });
    if (!requestDoc) {
      return { error: "Request not found" };
    }

    if (requestDoc.status !== "PENDING") {
      return { error: "Request must be pending" };
    }

    await this.requests.updateOne({ _id: request }, { $set: { status: "ACCEPTED" } });
    
    // Push update to SSE
    const updatedRequest = await this.requests.findOne({ _id: request });
    if (updatedRequest) {
      await this.pushRequestUpdate(updatedRequest);
    }
    
    return {};
  }

  /**
   * Reject a pending item request.
   * @requires The request must be pending.
   * @effects Sets the request status to REJECTED.
   */
  async rejectRequest(
    { request }: { request: ItemRequest }
  ): Promise<Empty | { error: string }> {
    const requestDoc = await this.requests.findOne({ _id: request });
    if (!requestDoc) {
      return { error: "Request not found" };
    }

    if (requestDoc.status !== "PENDING") {
      return { error: "Request must be pending" };
    }

    await this.requests.updateOne({ _id: request }, { $set: { status: "REJECTED" } });
    
    // Push update to SSE
    const updatedRequest = await this.requests.findOne({ _id: request });
    if (updatedRequest) {
      await this.pushRequestUpdate(updatedRequest);
    }
    
    return {};
  }

  /**
   * Cancel a pending item request.
   * @requires The request must be pending.
   *           The user must be the requester.
   * @effects Sets the request status to CANCELLED.
   */
  async cancelRequest(
    { request, user }: { request: ItemRequest; user: User }
  ): Promise<Empty | { error: string }> {
    const requestDoc = await this.requests.findOne({ _id: request });
    if (!requestDoc) {
      return { error: "Request not found" };
    }

    if (requestDoc.status !== "PENDING") {
      return { error: "Request must be pending" };
    }

    if (requestDoc.requester !== user) {
      return { error: "User must be the requester" };
    }

    await this.requests.updateOne({ _id: request }, { $set: { status: "CANCELLED" } });
    
    // Push update to SSE
    const updatedRequest = await this.requests.findOne({ _id: request });
    if (updatedRequest) {
      await this.pushRequestUpdate(updatedRequest);
    }
    
    return {};
  }

  /**
   * _getRequest(request: ItemRequest): (requestDoc: ItemRequestDoc)
   * @effects Returns the full document for a given request ID.
   */
  async _getRequest({ request }: { request: ItemRequest }): Promise<{ requestDoc: ItemRequestDoc }[]> {
    const doc = await this.requests.findOne({ _id: request });
    return doc ? [{ requestDoc: doc }] : [];
  }

  /**
   * _getItemForRequest(request: ItemRequest): (item: Item)
   * @effects Returns the item ID associated with a given request ID.
   */
  async _getItemForRequest({ request }: { request: ItemRequest }): Promise<{ item: Item }[]> {
    const doc = await this.requests.findOne({ _id: request }, { projection: { item: 1 } });
    return doc ? [{ item: doc.item }] : [];
  }

  /**
   * _getOtherPendingRequests(item: Item, exclude: ItemRequest): (otherRequest: ItemRequest)
   * @effects Returns all PENDING requests for an item, excluding a specific request ID.
   */
  async _getOtherPendingRequests({ item, exclude }: { item: Item; exclude: ItemRequest }): Promise<{ otherRequest: ItemRequest }[]> {
    const cursor = this.requests.find({
      item: item,
      status: "PENDING",
      _id: { $ne: exclude }, // $ne means "not equal"
    });
    const results = await cursor.toArray();
    return results.map(doc => ({ otherRequest: doc._id }));
  }

  /**
   * _getRequestsByItem(item: Item): (requestDoc: ItemRequestDoc)
   * @effects Returns all requests for a specific item (for owners to see incoming requests).
   */
  async _getRequestsByItem({ item }: { item: Item }): Promise<ItemRequestDoc[]> {
    return await this.requests.find({ item }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * _getRequestsByRequester(requester: User): (requestDoc: ItemRequestDoc)
   * @effects Returns all requests made by a specific user (for users to see their outgoing requests).
   */
  async _getRequestsByRequester({ requester }: { requester: User }): Promise<ItemRequestDoc[]> {
    return await this.requests.find({ requester }).sort({ createdAt: -1 }).toArray();
  }
}