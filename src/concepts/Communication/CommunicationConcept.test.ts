import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CommunicationConcept from "./CommunicationConcept.ts";

// Define generic types for testing
type User = ID;
type Transaction = ID;

Deno.test("CommunicationConcept Action: createConversation", async (t) => {
  const [db, client] = await testDb();
  const communicationConcept = new CommunicationConcept(db);

  const user1 = "user:Alice" as User;
  const user2 = "user:Bob" as User;
  const transaction = "transaction:123" as Transaction;

  await t.step("  - Test successful conversation creation", async () => {
    console.log("    - Testing successful conversation creation between two different users.");
    const result = await communicationConcept.createConversation({
      participant1: user1,
      participant2: user2,
      transaction,
    });

    assert(!("error" in result), "Conversation creation should succeed.");
    assertExists(result.conversation, "Should return a conversation ID.");

    // Verify conversation was created in database
    const conversationDoc = await communicationConcept._getConversation({
      conversation: result.conversation,
    });
    assertExists(conversationDoc[0], "Conversation should exist in database.");
    assertEquals(conversationDoc[0].conversationDoc.participant1, user1);
    assertEquals(conversationDoc[0].conversationDoc.participant2, user2);
    assertEquals(conversationDoc[0].conversationDoc.transaction, transaction);
    assertExists(conversationDoc[0].conversationDoc.createdAt);
  });

  await t.step("  - Test requires: participants must be different", async () => {
    console.log("    - Testing requirement: same user cannot create conversation with themselves.");
    const result = await communicationConcept.createConversation({
      participant1: user1,
      participant2: user1,
      transaction: "transaction:456" as Transaction,
    });

    assert("error" in result, "Should return an error when participants are the same.");
    assertEquals(result.error, "Participants must be different users");
  });

  await t.step("  - Test requires: conversation must not already exist", async () => {
    console.log("    - Testing requirement: duplicate conversation for same transaction should fail.");
    const result = await communicationConcept.createConversation({
      participant1: user1,
      participant2: user2,
      transaction,
    });

    assert("error" in result, "Should return an error when conversation already exists.");
    assertEquals(result.error, "Conversation already exists for this transaction");
  });

  await t.step("  - Test participant ordering consistency", async () => {
    console.log("    - Testing that participant ordering is consistent (participant1 < participant2).");
    const userA = "user:A" as User;
    const userB = "user:B" as User;
    const newTransaction = "transaction:789" as Transaction;

    // Create conversation with A, B
    const result1 = await communicationConcept.createConversation({
      participant1: userA,
      participant2: userB,
      transaction: newTransaction,
    });
    assert(!("error" in result1));

    // Try to create with B, A (should fail due to duplicate)
    const result2 = await communicationConcept.createConversation({
      participant1: userB,
      participant2: userA,
      transaction: newTransaction,
    });
    assert("error" in result2, "Should fail because conversation already exists (with normalized ordering).");
  });

  await client.close();
});

Deno.test("CommunicationConcept Action: sendMessage", async (t) => {
  const [db, client] = await testDb();
  const communicationConcept = new CommunicationConcept(db);

  const user1 = "user:Alice" as User;
  const user2 = "user:Bob" as User;
  const transaction = "transaction:msg1" as Transaction;

  // Setup: Create a conversation
  const { conversation } = await communicationConcept.createConversation({
    participant1: user1,
    participant2: user2,
    transaction,
  }) as { conversation: ID };

  await t.step("  - Test successful message sending", async () => {
    console.log("    - Testing successful message sending by a participant.");
    const messageContent = "Hello, Bob! Can we meet at 3pm?";
    const result = await communicationConcept.sendMessage({
      conversation,
      author: user1,
      content: messageContent,
    });

    assert(!("error" in result), "Message sending should succeed.");
    assertExists(result.message, "Should return a message ID.");

    // Verify message was created
    const messages = await communicationConcept._getMessages({ conversation });
    assert(!("error" in messages));
    assertEquals(messages.messages.length, 1);
    assertEquals(messages.messages[0].content, messageContent);
    assertEquals(messages.messages[0].author, user1);
    assertEquals(messages.messages[0].conversation, conversation);
    assertExists(messages.messages[0].createdAt);
    assertEquals(messages.messages[0].readAt, null);

    // Verify conversation's lastMessageAt was updated
    const conversationDoc = await communicationConcept._getConversation({ conversation });
    assertExists(conversationDoc[0].conversationDoc.lastMessageAt);
  });

  await t.step("  - Test requires: conversation must exist", async () => {
    console.log("    - Testing requirement: sending message to non-existent conversation fails.");
    const fakeConversation = "conversation:fake" as ID;
    const result = await communicationConcept.sendMessage({
      conversation: fakeConversation,
      author: user1,
      content: "Test message",
    });

    assert("error" in result, "Should return an error for non-existent conversation.");
    assertEquals(result.error, "Conversation not found");
  });

  await t.step("  - Test requires: author must be a participant", async () => {
    console.log("    - Testing requirement: non-participant cannot send message.");
    const user3 = "user:Charlie" as User;
    const result = await communicationConcept.sendMessage({
      conversation,
      author: user3,
      content: "Unauthorized message",
    });

    assert("error" in result, "Should return an error when author is not a participant.");
    assertEquals(result.error, "Author must be a participant in the conversation");
  });

  await t.step("  - Test multiple messages in conversation", async () => {
    console.log("    - Testing that multiple messages can be sent in a conversation.");
    await communicationConcept.sendMessage({
      conversation,
      author: user2,
      content: "Hi Alice! Yes, 3pm works for me.",
    });
    await communicationConcept.sendMessage({
      conversation,
      author: user1,
      content: "Great! See you then.",
    });

    const messages = await communicationConcept._getMessages({ conversation });
    assert(!("error" in messages));
    assertEquals(messages.messages.length, 3, "Should have 3 messages total.");
  });

  await client.close();
});

Deno.test("CommunicationConcept Action: markMessageRead", async (t) => {
  const [db, client] = await testDb();
  const communicationConcept = new CommunicationConcept(db);

  const user1 = "user:Alice" as User;
  const user2 = "user:Bob" as User;
  const transaction = "transaction:read1" as Transaction;

  // Setup: Create conversation and send a message
  const { conversation } = await communicationConcept.createConversation({
    participant1: user1,
    participant2: user2,
    transaction,
  }) as { conversation: ID };

  const { message } = await communicationConcept.sendMessage({
    conversation,
    author: user1,
    content: "Unread message",
  }) as { message: ID };

  await t.step("  - Test successful message read marking", async () => {
    console.log("    - Testing successful marking of a message as read.");
    const result = await communicationConcept.markMessageRead({ message });

    assert(!("error" in result), "Marking message as read should succeed.");

    // Verify message was marked as read
    const messageDoc = await communicationConcept._getMessage({ message });
    assertExists(messageDoc[0]);
    assertExists(messageDoc[0].messageDoc.readAt, "Message should have readAt timestamp.");
  });

  await t.step("  - Test requires: message must exist", async () => {
    console.log("    - Testing requirement: marking non-existent message fails.");
    const fakeMessage = "message:fake" as ID;
    const result = await communicationConcept.markMessageRead({ message: fakeMessage });

    assert("error" in result, "Should return an error for non-existent message.");
    assertEquals(result.error, "Message not found");
  });

  await t.step("  - Test requires: message must not already be read", async () => {
    console.log("    - Testing requirement: marking already-read message fails.");
    const result = await communicationConcept.markMessageRead({ message });

    assert("error" in result, "Should return an error when message is already read.");
    assertEquals(result.error, "Message already read");
  });

  await client.close();
});

Deno.test("CommunicationConcept Action: markConversationRead", async (t) => {
  const [db, client] = await testDb();
  const communicationConcept = new CommunicationConcept(db);

  const user1 = "user:Alice" as User;
  const user2 = "user:Bob" as User;
  const transaction = "transaction:convread1" as Transaction;

  // Setup: Create conversation and send multiple messages
  const { conversation } = await communicationConcept.createConversation({
    participant1: user1,
    participant2: user2,
    transaction,
  }) as { conversation: ID };

  await communicationConcept.sendMessage({
    conversation,
    author: user1,
    content: "Message 1",
  });
  await communicationConcept.sendMessage({
    conversation,
    author: user1,
    content: "Message 2",
  });

  await t.step("  - Test successful conversation read marking", async () => {
    console.log("    - Testing successful marking of all unread messages in conversation as read.");
    const result = await communicationConcept.markConversationRead({
      conversation,
      user: user2, // user2 marks messages from user1 as read
    });

    assert(!("error" in result), "Marking conversation as read should succeed.");

    // Verify all messages from user1 are marked as read
    const messages = await communicationConcept._getMessages({ conversation });
    assert(!("error" in messages));
    for (const msg of messages.messages) {
      if (msg.author === user1) {
        assertExists(msg.readAt, "Messages from user1 should be marked as read.");
      }
    }
  });

  await t.step("  - Test requires: conversation must exist", async () => {
    console.log("    - Testing requirement: marking non-existent conversation fails.");
    const fakeConversation = "conversation:fake" as ID;
    const result = await communicationConcept.markConversationRead({
      conversation: fakeConversation,
      user: user1,
    });

    assert("error" in result, "Should return an error for non-existent conversation.");
    assertEquals(result.error, "Conversation not found");
  });

  await t.step("  - Test requires: user must be a participant", async () => {
    console.log("    - Testing requirement: non-participant cannot mark conversation as read.");
    const user3 = "user:Charlie" as User;
    const result = await communicationConcept.markConversationRead({
      conversation,
      user: user3,
    });

    assert("error" in result, "Should return an error when user is not a participant.");
    assertEquals(result.error, "User must be a participant in the conversation");
  });

  await client.close();
});

Deno.test("CommunicationConcept Principle Trace", async () => {
  console.log("\n# Testing Principle:");
  console.log("# If a user sends a message to another user in the context of a transaction, then the recipient receives the message and can reply, enabling coordination without leaving the platform.\n");
  const [db, client] = await testDb();
  const communicationConcept = new CommunicationConcept(db);

  const user1 = "user:Alice" as User;
  const user2 = "user:Bob" as User;
  const transaction = "transaction:principle" as Transaction;

  console.log("1. Alice and Bob create a conversation for a transaction.");
  const { conversation } = await communicationConcept.createConversation({
    participant1: user1,
    participant2: user2,
    transaction,
  }) as { conversation: ID };
  console.log(`   -> Action: createConversation({ participant1: "${user1}", participant2: "${user2}", transaction: "${transaction}" }) => { conversation: "${conversation}" }`);

  console.log("\n2. Alice sends a message to Bob.");
  const { message: message1 } = await communicationConcept.sendMessage({
    conversation,
    author: user1,
    content: "Hi Bob! Can we meet at the library at 3pm to exchange the item?",
  }) as { message: ID };
  console.log(`   -> Action: sendMessage({ conversation: "${conversation}", author: "${user1}", content: "..." }) => { message: "${message1}" }`);

  console.log("\n3. Bob receives the message and can view it.");
  const messages = await communicationConcept._getMessages({ conversation });
  assert(!("error" in messages));
  const aliceMessage = messages.messages.find(m => m._id === message1);
  assertExists(aliceMessage, "Alice's message should be visible to Bob.");
  console.log(`   -> Query: _getMessages({ conversation: "${conversation}" })`);
  console.log(`   -> Bob can see: "${aliceMessage.content}"`);

  console.log("\n4. Bob replies to Alice.");
  const { message: message2 } = await communicationConcept.sendMessage({
    conversation,
    author: user2,
    content: "Sure! 3pm at the library works for me. See you there!",
  }) as { message: ID };
  console.log(`   -> Action: sendMessage({ conversation: "${conversation}", author: "${user2}", content: "..." }) => { message: "${message2}" }`);

  console.log("\n5. Alice marks Bob's message as read.");
  await communicationConcept.markMessageRead({ message: message2 });
  console.log(`   -> Action: markMessageRead({ message: "${message2}" })`);

  console.log("\n6. Both users can see the full conversation.");
  const allMessages = await communicationConcept._getMessages({ conversation });
  assert(!("error" in allMessages));
  assertEquals(allMessages.messages.length, 2, "Conversation should have 2 messages.");
  console.log(`   -> Query: _getMessages({ conversation: "${conversation}" })`);
  console.log(`   -> Conversation has ${allMessages.messages.length} messages, enabling coordination.`);

  console.log("\nPrinciple successfully demonstrated: Users can send messages, receive them, and reply, enabling coordination without leaving the platform.\n");

  await client.close();
});

