import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemListingConcept from "./ItemListingConcept.ts";

Deno.test("ItemListing Concept: Principle Test", async () => {
  console.log("--- Principle: List, discover, and request an item ---");
  const [db, client] = await testDb();
  const itemListing = new ItemListingConcept(db);
  const itemA = "item:Drill" as ID;
  const dorm = "Simmons";

  // 1. A user lists an item for borrowing.
  console.log("Action: listItem");
  const listResult = await itemListing.listItem({
    item: itemA,
    type: "BORROW",
    dormVisibility: dorm,
  });
  assertEquals(listResult, {});
  const listings = await itemListing._getListingByItem({ item: itemA });
  assertEquals(listings.length, 1);
  assertEquals(listings[0].status, "AVAILABLE");
  assertEquals(listings[0].type, "BORROW");
  console.log("  -> State confirmed: Item is listed and available.");

  // 2. The user adds photos and availability.
  console.log("Action: addPhoto");
  await itemListing.addPhoto({ item: itemA, photoUrl: "url1", order: 1 });
  await itemListing.addPhoto({ item: itemA, photoUrl: "url2", order: 2 });
  const photos = await itemListing._getPhotosByItem({ item: itemA });
  assertEquals(photos.length, 2);
  assertEquals(photos[0].order, 1);
  console.log("  -> State confirmed: Photos added.");

  console.log("Action: setAvailability");
  const startTime = new Date("2024-01-01T10:00:00Z");
  const endTime = new Date("2024-01-01T12:00:00Z");
  const setResult = await itemListing.setAvailability({
    item: itemA,
    startTime,
    endTime,
  });
  if ("error" in setResult) throw new Error("setAvailability should succeed");
  assertExists(setResult.window);
  const windowId = setResult.window;
  console.log("  -> State confirmed: Availability window created.");

  // 3. Another user discovers the item through search.
  console.log("Query: _getListings");
  const discoverableListings = await itemListing._getListings({
    status: "AVAILABLE",
    type: "BORROW",
    dormVisibility: dorm,
  });
  assertEquals(discoverableListings.length, 1);
  assertEquals(discoverableListings[0]._id, itemA);
  console.log("  -> Behavior confirmed: Item is discoverable.");

  // 4. The other user decides to request it by reserving the window.
  console.log("Action: reserveWindow");
  const reserveResult = await itemListing.reserveWindow({ window: windowId });
  assertEquals(reserveResult, {});
  const windowState = await itemListing._getWindow({ window: windowId });
  assertEquals(windowState.length, 1);
  assertEquals(windowState[0].status, "RESERVED");
  console.log("  -> State confirmed: Window is reserved.");
  console.log("--- Principle Fulfilled ---");

  await client.close();
});

Deno.test("ItemListing Concept: Action Tests", async (t) => {
  const [db, client] = await testDb();
  const itemListing = new ItemListingConcept(db);
  const itemB = "item:Blender" as ID;
  const itemC = "item:Textbook" as ID;

  await t.step("listItem: requires item not already listed", async () => {
    console.log("Testing: listItem requires unique item");
    await itemListing.listItem({
      item: itemB,
      type: "TRANSFER",
      dormVisibility: "Next",
    });
    const errResult = await itemListing.listItem({
      item: itemB,
      type: "TRANSFER",
      dormVisibility: "Next",
    });
    assertNotEquals(errResult, {});
    assertEquals(errResult.error, `Item ${itemB} is already listed.`);
    console.log("  -> Requirement met.");
  });

  await t.step("unlistItem: effects sets status to EXPIRED", async () => {
    console.log("Testing: unlistItem effects");
    await itemListing.unlistItem({ item: itemB });
    const listing = await itemListing._getListingByItem({ item: itemB });
    assertEquals(listing[0]?.status, "EXPIRED");
    console.log("  -> Effect confirmed.");
  });

  await t.step(
    "setAvailability: requires non-overlapping windows",
    async () => {
      console.log("Testing: setAvailability requires non-overlap");
      await itemListing.listItem({
        item: itemC,
        type: "BORROW",
        dormVisibility: "Maseeh",
      });
      const start1 = new Date("2024-01-01T10:00:00Z");
      const end1 = new Date("2024-01-01T12:00:00Z");
      await itemListing.setAvailability({
        item: itemC,
        startTime: start1,
        endTime: end1,
      });

      const start2 = new Date("2024-01-01T11:00:00Z"); // Overlaps
      const end2 = new Date("2024-01-01T13:00:00Z");
      const errResult = await itemListing.setAvailability({
        item: itemC,
        startTime: start2,
        endTime: end2,
      });
      if (!("error" in errResult)) {
        throw new Error("Expected an error for overlapping windows");
      }
      assertEquals(
        errResult.error,
        `Availability window overlaps with an existing window.`,
      );
      console.log("  -> Requirement met.");
    },
  );

  await t.step("setAvailability: requires BORROW type", async () => {
    console.log("Testing: setAvailability requires BORROW type");
    const listedItem = await itemListing._getListingByItem({ item: itemB });
    assertEquals(listedItem[0]?.type, "TRANSFER"); // From first test
    const start = new Date("2024-01-02T10:00:00Z");
    const end = new Date("2024-01-02T12:00:00Z");
    const errResult = await itemListing.setAvailability({
      item: itemB,
      startTime: start,
      endTime: end,
    });
    if (!("error" in errResult)) {
      throw new Error("Expected an error for TRANSFER type");
    }
    assertEquals(errResult.error, `Item ${itemB} is for TRANSFER, not BORROW.`);
    console.log("  -> Requirement met.");
  });

  await t.step("reserveWindow: requires AVAILABLE status", async () => {
    console.log("Testing: reserveWindow requires AVAILABLE status");
    const windowResult = await itemListing.setAvailability({
      item: itemC,
      startTime: new Date("2024-01-03T10:00:00Z"),
      endTime: new Date("2024-01-03T12:00:00Z"),
    });
    if ("error" in windowResult) {
      throw new Error("setAvailability should succeed");
    }
    assertExists(windowResult.window);
    const window = windowResult.window;
    await itemListing.reserveWindow({ window }); // First reservation succeeds
    const errResult = await itemListing.reserveWindow({ window }); // Second fails
    assertEquals(
      errResult.error,
      `Window ${window} is not available for reservation.`,
    );
    console.log("  -> Requirement met.");
  });

  await t.step("removeAvailability: requires not RESERVED status", async () => {
    console.log("Testing: removeAvailability requires not RESERVED status");
    // Get the reserved window from the previous test (it's the one with RESERVED status)
    const windows = await itemListing._getAvailabilityByItem({ item: itemC });
    const reservedWindow = windows.find((w) => w.status === "RESERVED");
    assertExists(
      reservedWindow,
      "Should have a reserved window from previous test",
    );
    const errResult = await itemListing.removeAvailability({
      window: reservedWindow._id,
    });
    assertEquals(errResult.error, "Cannot remove a reserved window.");

    const availWindowResult = await itemListing.setAvailability({
      item: itemC,
      startTime: new Date("2024-01-04T10:00:00Z"),
      endTime: new Date("2024-01-04T12:00:00Z"),
    });
    if ("error" in availWindowResult) {
      throw new Error("setAvailability should succeed");
    }
    assertExists(availWindowResult.window);
    const availableWindow = availWindowResult.window;
    const successResult = await itemListing.removeAvailability({
      window: availableWindow,
    });
    assertEquals(successResult, {});
    const remainingWindows = await itemListing._getAvailabilityByItem({
      item: itemC,
    });
    assertEquals(remainingWindows.length, 2); // Original + reserved windows remain
    console.log("  -> Requirement met and effect confirmed.");
  });

  await client.close();
});
