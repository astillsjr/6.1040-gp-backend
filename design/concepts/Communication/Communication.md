# Communication

**concept**: Communication [User, Transaction]  
**purpose**: To enable direct messaging between users for coordinating pickups, resolving details, and building community connections around item sharing.  
**principle**: If a user sends a message to another user in the context of a transaction (e.g., borrowing request, item claim), then the recipient receives the message and can reply, enabling coordination without leaving the platform.  

**state**:
  * a set of Conversations with
    * a participant1 User (the user with the lexicographically smaller ID)
    * a participant2 User (the user with the lexicographically larger ID)
    * a transaction Transaction
    * a createdAt Date
    * a lastMessageAt Date (optional)
  * a set of Messages with
    * a conversation Conversation
    * a author User
    * a content String
    * a createdAt Date
    * a readAt Date (optional)

**actions**:
  * `createConversation (participant1: User, participant2: User, transaction: Transaction): (conversation: Conversation)`
    * **requires**: The participants must be different users. The transaction must exist. A conversation between these participants for this transaction must not already exist. Participants will be automatically ordered (smaller ID becomes participant1).
    * **effects**: Creates a new conversation with participants ordered consistently.
  * `sendMessage (conversation: Conversation, author: User, content: String): (message: Message)`
    * **requires**: The conversation must exist. The sender must be a participant in the conversation.
    * **effects**: Creates a new message and updates the conversation's lastMessageAt timestamp.
  * `markMessageRead (message: Message): ()`
    * **requires**: The message must exist and not already be read.
    * **effects**: Sets the readAt timestamp for the message.
  * `markConversationRead (conversation: Conversation, user: User): ()`
    * **requires**: The conversation must exist. The user must be a participant in the conversation.
    * **effects**: Sets the readAt timestamp for all unread messages in the conversation that were sent by the other participant.

**notes**:
  * Conversations are scoped to a Transaction (typically an ItemTransaction ID) to keep messaging organized and relevant to a specific transaction.
  * Participants are consistently ordered (participant1 < participant2 by ID) to ensure uniqueness and simplify queries for conversations between two users.
  * The concept doesn't handle delivery - that's the responsibility of the Notifications concept via syncs.
  * Read receipts are tracked per message to support unread message counts, with an optional bulk mark-as-read action for convenience.
  * Conversations should be automatically created via syncs when transactions are created (e.g., when a request is accepted and an ItemTransaction is created).
  * The concept is intentionally simple - no group chats or file attachments in the initial design.