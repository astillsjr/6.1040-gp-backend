---
timestamp: 'Tue Nov 25 2025 23:28:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_232842.12f3842c.md]]'
content_id: 7eb4481e02675c7116ab148968edeebd19ded13b50a6cd500c399c19143f1297
---

# file: src\concepts\ItemRequesting\ItemRequestingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

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
}
```
