---
timestamp: 'Tue Nov 25 2025 19:25:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_192542.e5baf9ac.md]]'
content_id: 1cce6d8e42c91bcf16124ebbc624a2342350820b33828baddd74ee22051ce61b
---

# file: src\concepts\ItemTransaction\ItemTransactionConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "ItemTransaction" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Item = ID;

// Define the types for our entries based on the concept state
type ItemTransaction = ID;
export type ItemTransactionType = "BORROW" | "TRANSFER" | "ITEM";
export type ItemTransactionStatus = "PENDING_PICKUP" | "IN_PROGRESS" | "PENDING_RETURN" | "COMPLETED" | "CANCELLED";

/**
 * a set of ItemTransactions with
 *   a from User
 *   a to User
 *   an item Item
 *   a type of BORROW or TRANSFER or ITEM
 *   a status of PENDING_PICKUP or IN_PROGRESS or PENDING_RETURN or COMPLETED or CANCELLED
 *   a fromNotes String
 *   a toNotes String
 *   a createdAt Date
 *   an optional pickedUpAt Date
 *   an optional returnedAt Date
 */
interface ItemTransactionDoc {
  _id: ItemTransaction;
  from: User;
  to: User;
  item: Item;
  type: ItemTransactionType;
  status: ItemTransactionStatus;
  fromNotes: string;
  toNotes: string;
  createdAt: Date;
  pickedUpAt: Date | null;
  returnedAt: Date | null;
} 

/**
 * @concept ItemTransaction
 * @purpose To manage the lifecycle of item transactions between users.
 */
export default class ItemTransactionConcept {
  transactions: Collection<ItemTransactionDoc>;

  constructor(private readonly db: Db) {
    this.transactions = this.db.collection(PREFIX + "transactions");
  }

  /**
   * Create a new item transaction.
   * @requires 
   * @effects Creates a new item transaction.
   */
  async createTransaction(
    params: { 
      from: User; 
      to: User; 
      item: Item; 
      type: ItemTransactionType; 
      fromNotes: string; 
      toNotes: string; 
    }
  ): Promise<{ transaction: ItemTransaction } | { error: string }> {
    const { from, to, item, type, fromNotes, toNotes } = params;
    
    const transaction = { 
      _id: freshID(), 
      from, 
      to, 
      item, 
      type, 
      status: "PENDING_PICKUP",
      fromNotes, 
      toNotes, 
      createdAt: new Date(),
      pickedUpAt: null,
      returnedAt: null,
    };
    await this.transactions.insertOne(transaction);
    
    return { transaction: transaction._id };
  }

  /**
   * Mark a transaction as picked up.
   * @requires The transaction must be in PENDING_PICKUP status.
   * @effects Sets status to IN_PROGRESS (for BORROW) or COMPLETED (for TRANSFER/ITEM) and records the pickup time.
   */
  async markPickedUp(
    { transaction }: { transaction: ItemTransaction }
  ): Promise<Empty | { error: string }> {
    const transactionDoc = await this.transactions.findOne({ _id: transaction });
    
    if (!transactionDoc) {
      return { error: "Transaction not found" };
    }

    if (transactionDoc.status !== "PENDING_PICKUP") {
      return { error: "Transaction must be in PENDING_PICKUP status" };
    }

    if (transactionDoc.type === "BORROW") {
      await this.transactions.updateOne({ _id: transaction }, { $set: { status: "IN_PROGRESS", pickedUpAt: new Date() } });
    } else {
      await this.transactions.updateOne({ _id: transaction }, { $set: { status: "COMPLETED", pickedUpAt: new Date() } });
    }

    return {};
  }

  /**
   * Mark a transaction as returned.
   * @requires The transaction must be in IN_PROGRESS status and of type BORROW.
   * @effects Sets status to PENDING_RETURN and records the return time.
   */
  async markReturned(
    { transaction }: { transaction: ItemTransaction }
  ): Promise<Empty | { error: string }> {
    const transactionDoc = await this.transactions.findOne({ _id: transaction });
    
    if (!transactionDoc) {
      return { error: "Transaction not found" };
    }

    if (transactionDoc.status !== "IN_PROGRESS") {
      return { error: "Transaction must be in IN_PROGRESS status" };
    }

    if (transactionDoc.type !== "BORROW") {
      return { error: "Transaction must be of type BORROW" };
    }

    await this.transactions.updateOne({ _id: transaction }, { $set: { status: "PENDING_RETURN", returnedAt: new Date() } });
    return {};
  }

  /**
   * Confirm a returned transaction.
   * @requires The transaction must be in PENDING_RETURN status.
   * @effects Sets status to COMPLETED.
   */
  async confirmReturn(
    { transaction }: { transaction: ItemTransaction }
  ): Promise<Empty | { error: string }> {
    const transactionDoc = await this.transactions.findOne({ _id: transaction });
    
    if (!transactionDoc) {
      return { error: "Transaction not found" };
    }

    if (transactionDoc.status !== "PENDING_RETURN") {
      return { error: "Transaction must be in PENDING_RETURN status" };
    }

    await this.transactions.updateOne({ _id: transaction }, { $set: { status: "COMPLETED" } });
    return {};
  }

  /**
   * Cancel a transaction.
   * @requires The transaction must be in PENDING_PICKUP or IN_PROGRESS status.
   * @effects Sets status to CANCELLED.
   */
  async cancelTransaction(
    { transaction }: { transaction: ItemTransaction }
  ): Promise<Empty | { error: string }> {
    const transactionDoc = await this.transactions.findOne({ _id: transaction });
    
    if (!transactionDoc) {
      return { error: "Transaction not found" };
    }
    
    if (transactionDoc.status !== "PENDING_PICKUP" && transactionDoc.status !== "IN_PROGRESS") {
      return { error: "Transaction must be in PENDING_PICKUP or IN_PROGRESS status" };
    }

    await this.transactions.updateOne({ _id: transaction }, { $set: { status: "CANCELLED" } });
    return {};
  }
} 
```
