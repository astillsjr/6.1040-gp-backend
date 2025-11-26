---
timestamp: 'Tue Nov 25 2025 23:32:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_233242.c277e34f.md]]'
content_id: caeb50462a7094b324ed63f0432c067038310d760be6edb9b4eb91236654f5a7
---

# file: src/concepts/ItemTransaction/ItemTransactionConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemTransactionConcept from "./ItemTransactionConcept.ts";

Deno.test("ItemTransactionConcept: Principle Fulfillment", async (t) => {
  await t.step("Principle: A 'BORROW' transaction should complete its full lifecycle successfully", async () => {
    console.log("--- Testing Principle: BORROW Transaction Lifecycle ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    const fromUser = "user:owner" as ID;
    const toUser = "user:borrower" as ID;
    const item = "item:book" as ID;

    console.log("Action: createTransaction for a BORROW request");
    const createResult = await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item: item,
      type: "BORROW",
      fromNotes: "Please take care of it.",
      toNotes: "I will!",
    });

    assertNotEquals("error" in createResult, true, "Transaction creation should not fail.");
    const { transaction } = createResult as { transaction: ID };
    console.log(`  -> Created transaction: ${transaction}`);

    let { transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0];
    assertEquals(transactionDoc.status, "PENDING_PICKUP", "Initial status should be PENDING_PICKUP");
    console.log(`  -> Verified: Status is ${transactionDoc.status}`);

    console.log("Action: markPickedUp by the borrower");
    await itemTransactionConcept.markPickedUp({ transaction });
    ({ transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0]);
    assertEquals(transactionDoc.status, "IN_PROGRESS", "Status should be IN_PROGRESS after pickup");
    assertExists(transactionDoc.pickedUpAt, "pickedUpAt date should be set");
    console.log(`  -> Verified: Status is ${transactionDoc.status} and pickedUpAt is set.`);

    console.log("Action: markReturned by the borrower");
    await itemTransactionConcept.markReturned({ transaction });
    ({ transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0]);
    assertEquals(transactionDoc.status, "PENDING_RETURN", "Status should be PENDING_RETURN after return");
    assertExists(transactionDoc.returnedAt, "returnedAt date should be set");
    console.log(`  -> Verified: Status is ${transactionDoc.status} and returnedAt is set.`);

    console.log("Action: confirmReturn by the owner");
    await itemTransactionConcept.confirmReturn({ transaction });
    ({ transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0]);
    assertEquals(transactionDoc.status, "COMPLETED", "Status should be COMPLETED after confirmation");
    console.log(`  -> Verified: Status is ${transactionDoc.status}. Lifecycle complete.`);

    await client.close();
  });

  await t.step("Principle: A 'TRANSFER' transaction should complete after pickup", async () => {
    console.log("--- Testing Principle: TRANSFER Transaction Lifecycle ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    const fromUser = "user:giver" as ID;
    const toUser = "user:receiver" as ID;
    const item = "item:furniture" as ID;

    console.log("Action: createTransaction for a TRANSFER request");
    const createResult = await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item: item,
      type: "TRANSFER",
      fromNotes: "It's all yours.",
      toNotes: "Thank you!",
    });
    const { transaction } = createResult as { transaction: ID };
    console.log(`  -> Created transaction: ${transaction}`);

    console.log("Action: markPickedUp");
    await itemTransactionConcept.markPickedUp({ transaction });
    const { transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0];
    assertEquals(transactionDoc.status, "COMPLETED", "Status should be COMPLETED after pickup for a TRANSFER");
    assertExists(transactionDoc.pickedUpAt, "pickedUpAt date should be set");
    console.log(`  -> Verified: Status is ${transactionDoc.status}. Lifecycle complete.`);

    await client.close();
  });
});

Deno.test("ItemTransactionConcept: Individual Action Tests", async (t) => {
  const fromUser = "user:A" as ID;
  const toUser = "user:B" as ID;
  const item = "item:1" as ID;

  await t.step("createTransaction action", async () => {
    console.log("--- Testing Action: createTransaction ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    console.log("Effects: Creates a new transaction with status PENDING_PICKUP");
    const result = await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item: item,
      type: "BORROW",
      fromNotes: "",
      toNotes: "",
    });

    assertNotEquals("error" in result, true);
    const { transaction } = result as { transaction: ID };
    const { transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0];

    assertEquals(transactionDoc._id, transaction);
    assertEquals(transactionDoc.from, fromUser);
    assertEquals(transactionDoc.to, toUser);
    assertEquals(transactionDoc.item, item);
    assertEquals(transactionDoc.type, "BORROW");
    assertEquals(transactionDoc.status, "PENDING_PICKUP");
    console.log("  -> Verified: Transaction created with correct initial state.");

    await client.close();
  });

  await t.step("markPickedUp action", async () => {
    console.log("--- Testing Action: markPickedUp ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    // Setup a transaction
    const { transaction } = (await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item,
      type: "BORROW",
      fromNotes: "",
      toNotes: "",
    })) as { transaction: ID };

    console.log("Requires: Transaction must be in PENDING_PICKUP status.");
    const failedResult = await itemTransactionConcept.markPickedUp({ transaction: "fakeId" as ID });
    assertEquals("error" in failedResult, true, "Should fail for non-existent transaction");
    console.log("  -> Verified: Fails on non-existent transaction.");

    await itemTransactionConcept.markPickedUp({ transaction }); // Status is now IN_PROGRESS
    const requiresFail = await itemTransactionConcept.markPickedUp({ transaction });
    assertEquals("error" in requiresFail, true, "Should fail if status is not PENDING_PICKUP");
    console.log("  -> Verified: Fails if status is not PENDING_PICKUP.");

    await client.close();
  });

  await t.step("markReturned action", async () => {
    console.log("--- Testing Action: markReturned ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    // Setup BORROW transaction
    const { transaction: borrowTx } = (await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item,
      type: "BORROW",
      fromNotes: "",
      toNotes: "",
    })) as { transaction: ID };
    // Setup TRANSFER transaction
    const { transaction: transferTx } = (await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item,
      type: "TRANSFER",
      fromNotes: "",
      toNotes: "",
    })) as { transaction: ID };

    console.log("Requires: Transaction must be of type BORROW.");
    const typeFail = await itemTransactionConcept.markReturned({ transaction: transferTx });
    assertEquals("error" in typeFail, true, "Should fail for non-BORROW types.");
    console.log("  -> Verified: Fails if type is not BORROW.");

    console.log("Requires: Transaction must be in IN_PROGRESS status.");
    const statusFail = await itemTransactionConcept.markReturned({ transaction: borrowTx });
    assertEquals("error" in statusFail, true, "Should fail if not IN_PROGRESS.");
    console.log("  -> Verified: Fails if status is not IN_PROGRESS.");

    console.log("Effects: Sets status to PENDING_RETURN.");
    await itemTransactionConcept.markPickedUp({ transaction: borrowTx }); // now IN_PROGRESS
    await itemTransactionConcept.markReturned({ transaction: borrowTx });
    const { transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction: borrowTx }))[0];
    assertEquals(transactionDoc.status, "PENDING_RETURN");
    console.log("  -> Verified: Status correctly updated to PENDING_RETURN.");

    await client.close();
  });

  await t.step("confirmReturn action", async () => {
    console.log("--- Testing Action: confirmReturn ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    // Setup
    const { transaction } = (await itemTransactionConcept.createTransaction({
      from: fromUser,
      to: toUser,
      item,
      type: "BORROW",
      fromNotes: "",
      toNotes: "",
    })) as { transaction: ID };

    console.log("Requires: Transaction must be in PENDING_RETURN status.");
    const statusFail = await itemTransactionConcept.confirmReturn({ transaction });
    assertEquals("error" in statusFail, true, "Should fail if not in PENDING_RETURN status.");
    console.log("  -> Verified: Fails if status is not PENDING_RETURN.");

    console.log("Effects: Sets status to COMPLETED.");
    await itemTransactionConcept.markPickedUp({ transaction });
    await itemTransactionConcept.markReturned({ transaction }); // now PENDING_RETURN
    await itemTransactionConcept.confirmReturn({ transaction });
    const { transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction }))[0];
    assertEquals(transactionDoc.status, "COMPLETED");
    console.log("  -> Verified: Status correctly updated to COMPLETED.");

    await client.close();
  });

  await t.step("cancelTransaction action", async () => {
    console.log("--- Testing Action: cancelTransaction ---");
    const [db, client] = await testDb();
    const itemTransactionConcept = new ItemTransactionConcept(db);

    // Setup
    const { transaction: tx1 } = (await itemTransactionConcept.createTransaction({ from: fromUser, to: toUser, item, type: "BORROW", fromNotes: "", toNotes: "" })) as { transaction: ID };
    const { transaction: tx2 } = (await itemTransactionConcept.createTransaction({ from: fromUser, to: toUser, item, type: "BORROW", fromNotes: "", toNotes: "" })) as { transaction: ID };

    console.log("Effects: Sets status to CANCELLED from PENDING_PICKUP.");
    await itemTransactionConcept.cancelTransaction({ transaction: tx1 });
    let { transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction: tx1 }))[0];
    assertEquals(transactionDoc.status, "CANCELLED");
    console.log("  -> Verified: Can cancel from PENDING_PICKUP.");

    console.log("Effects: Sets status to CANCELLED from IN_PROGRESS.");
    await itemTransactionConcept.markPickedUp({ transaction: tx2 });
    await itemTransactionConcept.cancelTransaction({ transaction: tx2 });
    ({ transactionDoc } = (await itemTransactionConcept._getTransaction({ transaction: tx2 }))[0]);
    assertEquals(transactionDoc.status, "CANCELLED");
    console.log("  -> Verified: Can cancel from IN_PROGRESS.");

    console.log("Requires: Transaction must be in PENDING_PICKUP or IN_PROGRESS status.");
    const statusFail = await itemTransactionConcept.cancelTransaction({ transaction: tx1 }); // Already CANCELLED
    assertEquals("error" in statusFail, true, "Should fail if not in a cancellable state.");
    console.log("  -> Verified: Fails if status is not PENDING_PICKUP or IN_PROGRESS.");

    await client.close();
  });
});
```
