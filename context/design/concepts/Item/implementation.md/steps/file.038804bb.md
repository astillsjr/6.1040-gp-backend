---
timestamp: 'Mon Nov 24 2025 22:10:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_221040.79107a7e.md]]'
content_id: 038804bb2cb7d8e0f716e39df75793273758d9360f48a7ac4abb43c9b07484a8
---

# file: src/concepts/item/ItemConcept.test.ts

```typescript
import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ItemConcept from "./ItemConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("ItemConcept Action: createItem", async () => {
  console.log("  - Testing successful item creation with an owner.");
  const [db, client] = await testDb();
  const itemConcept = new ItemConcept(db);

  const ownerId = "user:Alice" as ID;
  const itemDetails = {
    owner: ownerId,
    title: "Electric Drill",
    description: "A powerful drill for all your needs.",
    category: "Tools",
    condition: "Good",
  };

  const { item: itemId } = await itemConcept.createItem(itemDetails);
  assertExists(itemId, "createItem should return an item ID.");

  const result = await itemConcept._getItemById({ item: itemId });
  const createdItem = result[0]?.item;

  assertExists(createdItem, "Created item should be retrievable.");
  assertEquals(createdItem.title, itemDetails.title);
  assertEquals(createdItem.owner, ownerId);
  assertEquals(createdItem.category, "Tools");

  await client.close();
});

Deno.test("ItemConcept Action: createOwnerlessItem", async () => {
  console.log("  - Testing successful item creation without an owner.");
  const [db, client] = await testDb();
  const itemConcept = new ItemConcept(db);

  const itemDetails = {
    title: "Any 1/2 inch Wrench",
    description: "Looking to borrow any brand of 1/2 inch wrench.",
    category: "Tools",
  };

  const { item: itemId } = await itemConcept.createOwnerlessItem(itemDetails);
  assertExists(itemId);

  const result = await itemConcept._getItemById({ item: itemId });
  const createdItem = result[0]?.item;

  assertExists(createdItem, "Ownerless item should be retrievable.");
  assertEquals(createdItem.title, itemDetails.title);
  assert(createdItem.owner === undefined, "Item should not have an owner.");

  await client.close();
});

Deno.test("ItemConcept Action: updateItemDetails", async (t) => {
  const [db, client] = await testDb();
  const itemConcept = new ItemConcept(db);
  const ownerId = "user:Bob" as ID;

  const { item: itemId } = await itemConcept.createItem({
    owner: ownerId,
    title: "Old Shovel",
    description: "A bit rusty.",
    category: "Gardening",
    condition: "Fair",
  });

  await t.step("  - Test successful update", async () => {
    console.log("    - Testing successful item detail update.");
    const updateDetails = {
      item: itemId,
      title: "Refurbished Shovel",
      description: "Cleaned and ready to use.",
      category: "Gardening",
      condition: "Good",
    };
    const result = await itemConcept.updateItemDetails(updateDetails);
    assertEquals(result, {}, "Successful update should return an empty object.");

    const queryResult = await itemConcept._getItemById({ item: itemId });
    const updatedItem = queryResult[0]?.item;
    assertEquals(updatedItem?.title, "Refurbished Shovel");
    assertEquals(updatedItem?.condition, "Good");
  });

  await t.step("  - Test requires: item must exist", async () => {
    console.log("    - Testing requirement: updating a non-existent item fails.");
    const nonExistentId = "item:fake" as ID;
    const result = await itemConcept.updateItemDetails({
      item: nonExistentId,
      title: "Imaginary Item",
      description: "...",
      category: "...",
      condition: "...",
    });
    assertExists(result.error, "Should return an error for non-existent item.");
    assertEquals(result.error, `Item with id ${nonExistentId} not found.`);
  });

  await client.close();
});

Deno.test("ItemConcept Action: deleteItem", async (t) => {
  const [db, client] = await testDb();
  const itemConcept = new ItemConcept(db);
  const ownerId = "user:Charlie" as ID;
  const intruderId = "user:Mallory" as ID;

  const { item: itemId } = await itemConcept.createItem({
    owner: ownerId,
    title: "Lawn Mower",
    description: "Gas-powered",
    category: "Gardening",
    condition: "Excellent",
  });

  await t.step("  - Test requires: user must be owner", async () => {
    console.log("    - Testing requirement: non-owner cannot delete item.");
    const result = await itemConcept.deleteItem({ item: itemId, owner: intruderId });
    assertExists(result.error, "Should return an error when a non-owner tries to delete.");
    assertEquals(result.error, `User ${intruderId} is not the owner of item ${itemId}.`);

    const queryResult = await itemConcept._getItemById({ item: itemId });
    assert(queryResult.length > 0, "Item should not have been deleted.");
  });

  await t.step("  - Test successful deletion", async () => {
    console.log("    - Testing successful item deletion by the owner.");
    const result = await itemConcept.deleteItem({ item: itemId, owner: ownerId });
    assertEquals(result, {}, "Successful deletion should return an empty object.");

    const queryResult = await itemConcept._getItemById({ item: itemId });
    assertEquals(queryResult.length, 0, "Item should be deleted and not be retrievable.");
  });

  await client.close();
});

Deno.test("ItemConcept Principle Trace", async () => {
  console.log("\n# Testing Principle:");
  console.log("# If a user creates an item to represent their power drill, that digital item can then be listed, requested, and tracked, while always maintaining its core identity and ownership.\n");
  const [db, client] = await testDb();
  const itemConcept = new ItemConcept(db);
  const ownerId = "user:DrillOwner" as ID;

  console.log(`1. A user (${ownerId}) creates an item for their power drill.`);
  const { item: drillId } = await itemConcept.createItem({
    owner: ownerId,
    title: "Power Drill",
    description: "Heavy-duty power drill.",
    category: "Tools",
    condition: "Like New",
  });
  console.log(`   -> Action: createItem(...) => { item: "${drillId}" }`);

  console.log("\n2. The system can verify the item's existence, identity, and ownership.");
  const result = await itemConcept._getItemById({ item: drillId });
  const drill = result[0]?.item;
  console.log(`   -> Query: _getItemById({ item: "${drillId}" })`);
  assertExists(drill, "The power drill item exists in the system.");
  assertEquals(drill._id, drillId, "The item maintains its core identity.");
  assertEquals(drill.owner, ownerId, "The item maintains its correct ownership.");
  console.log("   -> Assertions passed: Item identity and ownership are correct.");

  console.log("\n3. The item's details are available for other parts of the system (e.g., listing).");
  console.log(`   -> The retrieved item has title "${drill.title}" and is in "${drill.condition}" condition, ready to be displayed in a listing.`);
  console.log("\nPrinciple successfully demonstrated: An item can be created and maintains its core properties for use in other application functions.\n");

  await client.close();
});
```
