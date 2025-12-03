import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";
import { sseConnectionManager } from "@utils/sse-connection-manager.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Communication" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Transaction = ID;

// Define the types for our entries based on the concept state
type Conversation = ID;
type Message = ID;

/**
 * a set of Conversations with
 *   a participant1: User;
 *   a participant2: User;
 *   a transaction: Transaction;
 *   a createdAt Date
 *   a lastMessageAt Date
 */
interface ConversationDoc {
  _id: Conversation;
  participant1: User;
  participant2: User;
  transaction: Transaction;
  createdAt: Date;
  lastMessageAt: Date | null;
}

/**
 * a set of Messages with
 *   a conversation Conversation
 *   a author User
 *   a content String
 *   a createdAt Date
 *   a readAt Date
 */
interface MessageDoc {
  _id: Message;
  conversation: Conversation;
  author: User;
  content: string;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * @concept Communication
 * @purpose To enable direct messaging between users for coordinating pickups, resolving details, and building community connections around item sharing.
 */
export default class CommunicationConcept {
  conversations: Collection<ConversationDoc>;
  messages: Collection<MessageDoc>;

  constructor(private readonly db: Db) {
    this.conversations = this.db.collection(PREFIX + "conversations");
    this.messages = this.db.collection(PREFIX + "messages");
  }

  /**
   * Create a new conversation between two users for a given transaction.
   * @requires The two participants must be different users. The transaction must exist.
   * @effects Creates a new conversation with participants ordered consistently and returns its ID.
   */
  async createConversation(
    { participant1, participant2, transaction }: { participant1: User; participant2: User; transaction: Transaction }
  ): Promise<{ conversation: Conversation } | { error: string }> {
    if (participant1 === participant2) {
      return { error: "Participants must be different users" };
    }
    
    // Enforce consistent ordering (participant1 < participant2 by ID)
    const [p1, p2] = participant1 < participant2 
      ? [participant1, participant2] 
      : [participant2, participant1];
    
    // Check if conversation already exists for this transaction
    const existing = await this.conversations.findOne({ 
      participant1: p1, 
      participant2: p2, 
      transaction 
    });
    
    if (existing) {
      return { error: "Conversation already exists for this transaction" };
    }
    
    const conversation = {
      _id: freshID(),
      participant1: p1,
      participant2: p2,
      transaction,
      createdAt: new Date(),
      lastMessageAt: null,
    };
    await this.conversations.insertOne(conversation);
    
    return { conversation: conversation._id };
  }

  /**
   * Send a new message to a conversation.
   * @requires The conversation must exist. The author must be a participant in the conversation.
   * @effects Creates a new message and updates the conversation's lastMessageAt timestamp.
   */
  async sendMessage(
    { conversation, author, content }: { conversation: Conversation; author: User; content: string }
  ): Promise<{ message: Message } | { error: string }> {
    const conversationDoc = await this.conversations.findOne({ _id: conversation });
    
    if (!conversationDoc) {
      return { error: "Conversation not found" };
    }
    
    if (conversationDoc.participant1 !== author && conversationDoc.participant2 !== author) {
      return { error: "Author must be a participant in the conversation" };
    }
    
    const message = {
      _id: freshID(),
      conversation,
      author,
      content,
      createdAt: new Date(),
      readAt: null,
    };

    await this.messages.insertOne(message);
    await this.conversations.updateOne(
      { _id: conversation },
      { $set: { lastMessageAt: new Date() } }
    );

    // Push message to SSE stream immediately for the other participant
    try {
      const otherParticipant = conversationDoc.participant1 === author
        ? conversationDoc.participant2
        : conversationDoc.participant1;

      await sseConnectionManager.sendToUser(
        otherParticipant,
        "message",
        {
          type: "message",
          message: {
            _id: message._id,
            conversation: message.conversation,
            author: message.author,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            readAt: message.readAt ? message.readAt.toISOString() : null,
          },
        },
      );
    } catch (error) {
      console.error(
        `[Communication] Failed to push message ${message._id} to SSE:`,
        error,
      );
    }
    
    return { message: message._id };
  }

  /**
   * Mark a message as read.
   * @requires The message must exist and not already be read.
   * @effects Sets the readAt timestamp for the message.
   */
  async markMessageRead({ message }: { message: Message }): Promise<Empty | { error: string }> {
    const messageDoc = await this.messages.findOne({ _id: message });
    
    if (!messageDoc) {
      return { error: "Message not found" };
    }
    
    if (messageDoc.readAt !== null) {
      return { error: "Message already read" };
    }
    
    await this.messages.updateOne({ _id: message }, { $set: { readAt: new Date() } });
    return {};
  }

  /**
   * Mark all unread messages in a conversation as read.
   * @requires The conversation must exist. The user must be a participant in the conversation.
   * @effects Sets the readAt timestamp for all unread messages sent by the other participant.
   */
  async markConversationRead(
    { conversation, user }: { conversation: Conversation; user: User }
  ): Promise<Empty | { error: string }> {
    const conversationDoc = await this.conversations.findOne({ _id: conversation });
    
    if (!conversationDoc) {
      return { error: "Conversation not found" };
    }
    
    if (conversationDoc.participant1 !== user && conversationDoc.participant2 !== user) {
      return { error: "User must be a participant in the conversation" };
    }
    
    const otherParticipant = conversationDoc.participant1 === user 
      ? conversationDoc.participant2 
      : conversationDoc.participant1;
    
    await this.messages.updateMany(
      { 
        conversation, 
        author: otherParticipant,
        readAt: null 
      },
      { $set: { readAt: new Date() } }
    );
    
    return {};
  }

  /**
   * Get all messages in a conversation.
   * @requires The conversation must exist.
   * @effects Returns all messages in the conversation.
   */
  async _getMessages({ conversation }: { conversation: Conversation }): Promise<{ messages: MessageDoc[] } | { error: string }> {
    const messages = await this.messages.find({ conversation: conversation }).toArray();
    if (!messages) {
      return { error: "Messages not found" };
    }
    return { messages: messages };
  }

  /**
   * Get a conversation by ID (for syncs).
   */
  async _getConversation(
    { conversation }: { conversation: Conversation }
  ): Promise<{ conversationDoc: ConversationDoc }[]> {
    const doc = await this.conversations.findOne({ _id: conversation });
    return doc ? [{ conversationDoc: doc }] : [];
  }

  /**
   * Get conversation(s) by transaction ID (for syncs).
   */
  async _getConversationByTransaction(
    { transaction }: { transaction: Transaction }
  ): Promise<{ conversation: ConversationDoc }[]> {
    const docs = await this.conversations.find({ transaction }).toArray();
    return docs.map(doc => ({ conversation: doc }));
  }

  /**
   * Get all conversations for a user (for syncs).
   */
  async _getConversationsByUser(
    { user }: { user: User }
  ): Promise<{ conversations: ConversationDoc[] }> {
    const docs = await this.conversations.find({
      $or: [{ participant1: user }, { participant2: user }]
    }).toArray();
    return { conversations: docs };
  }

  /**
   * Get all unread messages for a user (for SSE backlog/polling).
   */
  async _getUnreadMessagesByUser(
    { user }: { user: User }
  ): Promise<MessageDoc[]> {
    // Get all conversations for the user
    const userConversations = await this.conversations.find({
      $or: [{ participant1: user }, { participant2: user }]
    }).toArray();

    const conversationIds = userConversations.map((c) => c._id);

    if (conversationIds.length === 0) {
      return [];
    }

    // Get all unread messages in those conversations where user is not the author
    const messages = await this.messages.find({
      conversation: { $in: conversationIds },
      author: { $ne: user },
      readAt: null,
    }).sort({ createdAt: -1 }).toArray();

    return messages;
  }
}