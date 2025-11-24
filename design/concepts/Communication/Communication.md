# Communication

**concept**: Communication [User, Context]  
**purpose**: To enable direct messaging between users for coordinating pickups, resolving details, and building community connections around item sharing.  
**principle**: If a user sends a message to another user in the context of a transaction (e.g., borrowing request, item claim), then the recipient receives the message and can reply, enabling coordination without leaving the platform.  

**state**:
  * a set of Conversations with
    * a participant1 User
    * a participant2 User
    * a context Context
    * a contextType String
    * a createdAt Date
    * a lastMessageAt Date
  * a set of Messages with
    * a conversation Conversation
    * a sender User
    * a content String
    * a createdAt Date
    * a readAt Date

**actions**:
  * `createConversation (participant1: User, participant2: User, context: Context, contextType: String): (conversation: Conversation)`
    * **requires**: The participants must be different users. The context must exist. The contextType must be from a predefined set (e.g., "BORROW_REQUEST", "ITEM_CLAIM", "ITEM_CONTRIBUTION"). A conversation between these participants for this context must not already exist.
    * **effects**: Creates a new conversation.
  * `sendMessage (conversation: Conversation, sender: User, content: String): (message: Message)`
    * **requires**: The conversation must exist. The sender must be a participant in the conversation.
    * **effects**: Creates a new message and updates the conversation's lastMessageAt timestamp.
  * `markRead (message: Message): ()`
    * **requires**: The message must exist and not already be read.
    * **effects**: Sets the readAt timestamp for the message.

**notes**:
  * Conversations are scoped to a generic Context (e.g., BorrowRequest, ItemClaim, Contribution) to keep messaging organized and relevant. The contextType field helps identify what type of entity the context refers to.
  * The concept doesn't handle delivery - that's the responsibility of the Notifications concept via syncs.
  * Read receipts are tracked per message to support unread message counts.
  * The concept is intentionally simple - no group chats or file attachments in the initial design.