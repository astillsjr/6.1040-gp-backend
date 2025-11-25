[@concept-background](../../tools/concept-background.md)

[@ItemListing](ItemListing.md)
# prompt: provide me with a complete implementation for ItemListing. Make sure that it follows the correct format in TypeScript, and that it is a correct and complete implementation. Finally, evaluate the implementation and make sure there is nothing missing. I have provided you already with the concept spec in the ItemListing.md file as well as the background of how to implement concepts. Additionally, include all queries that you believe are needed even if not specified in the concept spec
# response:

Here is a complete implementation for the `ItemListing` concept, including the TypeScript class, necessary queries, and a corresponding test file that validates the implementation against its specification and principle.

# concept: ItemListing

*   **concept**: ItemListing \[Item]
*   **purpose**: To manage the public catalog of items available for borrowing or permanent transfer, including their availability, photos, and visibility rules.
*   **principle**: If a user lists an item, specifying whether it's for borrowing or a free transfer, then other users can discover it through search, view its details and availability, and decide whether to request it.
*   **state**:
    *   a set of Listings with
        *   an item Item
        *   a type of BORROW or TRANSFER
        *   a status of AVAILABLE or PENDING or CLAIMED or EXPIRED
        *   a dormVisibility String
    *   a set of ItemPhotos with
        *   an item Item
        *   a photoUrl String
        *   an order Number
    *   a set of AvailabilityWindows with
        *   an item Item
        *   a startTime DateTime
        *   an endTime DateTime
        *   a status of AVAILABLE or RESERVED
*   **actions**:
    *   `listItem (item: Item, type: BORROW or TRANSFER, dormVisibility: String): ()`
    *   `unlistItem (item: Item): ()`
    *   `updateListingDetails(item: Item, dormVisibility: String, type: BORROW or TRANSFER)`
    *   `addPhoto (item: Item, photoUrl: String, order: Number): ()`
    *   `removePhoto(item: Item, photoUrl: String)`
    *   `setAvailability (item: Item, startTime: DateTime, endTime: DateTime): (window: AvailabilityWindow)`
    *   `updateListingStatus (item: Item, status: AVAILABLE or PPENDING or CLAIMED): ()`
    *   `reserveWindow (window: AvailabilityWindow): ()`
    *   `removeAvailability(window: AvailabilityWindow)`
*   **queries**: (As requested, I have added queries that are necessary for a functional concept)
    *   `_getListingByItem(item: Item): (listing: Listing)`
    *   `_getPhotosByItem(item: Item): (photo: ItemPhoto)`
    *   `_getAvailabilityByItem(item: Item): (window: AvailabilityWindow)`
    *   `_getWindow(window: AvailabilityWindow): (window: AvailabilityWindow)`
    *   `_getListings(type?: BORROW or TRANSFER, status?: AVAILABLE or PENDING or CLAIMED, dormVisibility?: String): (listing: Listing)`

# file: src/concepts/ItemListing/ItemListingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to prevent collisions
const PREFIX = "ItemListing" + ".";

// Generic types used by this concept
type Item = ID;
type AvailabilityWindow = ID;

// Enumerated types
type ListingType = "BORROW" | "TRANSFER";
type ListingStatus = "AVAILABLE" | "PENDING" | "CLAIMED" | "EXPIRED";
type WindowStatus = "AVAILABLE" | "RESERVED";

/**
 * a set of Listings with
 *   an item Item
 *   a type of BORROW or TRANSFER
 *   a status of AVAILABLE or PENDING or CLAIMED or EXPIRED
 *   a dormVisibility String
 */
export interface Listing {
  _id: Item;
  type: ListingType;
  status: ListingStatus;
  dormVisibility: string;
}

/**
 * a set of ItemPhotos with
 *   an item Item
 *   a photoUrl String
 *   an order Number
 */
export interface ItemPhoto {
  _id: ID;
  item: Item;
  photoUrl: string;
  order: number;
}

/**
 * a set of AvailabilityWindows with
 *   an item Item
 *   a startTime DateTime
 *   an endTime DateTime
 *   a status of AVAILABLE or RESERVED
 */
export interface Availability {
  _id: AvailabilityWindow;
  item: Item;
  startTime: Date;
  endTime: Date;
  status: WindowStatus;
}

/**
 * @purpose To manage the public catalog of items available for borrowing or permanent transfer,
 * including their availability, photos, and visibility rules.
 */
export default class ItemListingConcept {
  listings: Collection<Listing>;
  itemPhotos: Collection<ItemPhoto>;
  availabilityWindows: Collection<Availability>;

  constructor(private readonly db: Db) {
    this.listings = this.db.collection(PREFIX + "listings");
    this.itemPhotos = this.db.collection(PREFIX + "itemPhotos");
    this.availabilityWindows = this.db.collection(PREFIX + "availabilityWindows");
  }

  /**
   * listItem (item: Item, type: BORROW or TRANSFER, dormVisibility: String): ()
   *
   * **requires**: The item must not already be listed.
   * **effects**: Makes an item visible in the catalog with status AVAILABLE.
   */
  async listItem({ item, type, dormVisibility }: { item: Item; type: ListingType; dormVisibility: string }): Promise<Empty | { error: string }> {
    const existing = await this.listings.findOne({ _id: item });
    if (existing) {
      return { error: `Item ${item} is already listed.` };
    }

    await this.listings.insertOne({
      _id: item,
      type,
      dormVisibility,
      status: "AVAILABLE",
    });

    return {};
  }

  /**
   * unlistItem (item: Item): ()
   *
   * **requires**: The item must be listed.
   * **effects**: Removes an item from the catalog, setting its status to EXPIRED.
   */
  async unlistItem({ item }: { item: Item }): Promise<Empty | { error: string }> {
    const result = await this.listings.updateOne({ _id: item }, { $set: { status: "EXPIRED" } });
    if (result.matchedCount === 0) {
      return { error: `Item ${item} is not listed.` };
    }
    return {};
  }

  /**
   * updateListingDetails(item: Item, dormVisibility: String, type: BORROW or TRANSFER): ()
   *
   * **requires**: The `item` must be listed.
   * **effects**: Updates the `dormVisibility` and `type` fields for the item's listing.
   */
  async updateListingDetails({ item, dormVisibility, type }: { item: Item; dormVisibility: string; type: ListingType }): Promise<Empty | { error: string }> {
    const result = await this.listings.updateOne({ _id: item }, { $set: { dormVisibility, type } });
    if (result.matchedCount === 0) {
      return { error: `Item ${item} is not listed.` };
    }
    return {};
  }

  /**
   * addPhoto (item: Item, photoUrl: String, order: Number): ()
   *
   * **requires**: A listing for the item must exist.
   * **effects**: Adds a photo to the item.
   */
  async addPhoto({ item, photoUrl, order }: { item: Item; photoUrl: string; order: number }): Promise<Empty | { error: string }> {
    const listing = await this.listings.findOne({ _id: item });
    if (!listing) {
      return { error: `Cannot add photo to non-existent listing for item ${item}.` };
    }

    await this.itemPhotos.insertOne({
      _id: freshID(),
      item,
      photoUrl,
      order,
    });
    return {};
  }

  /**
   * removePhoto(item: Item, photoUrl: String): ()
   *
   * **requires**: An `ItemPhoto` record must exist for the given `item` and `photoUrl`.
   * **effects**: Removes the `ItemPhoto` record.
   */
  async removePhoto({ item, photoUrl }: { item: Item; photoUrl: string }): Promise<Empty | { error: string }> {
    const result = await this.itemPhotos.deleteOne({ item, photoUrl });
    if (result.deletedCount === 0) {
      return { error: `Photo with URL ${photoUrl} for item ${item} not found.` };
    }
    return {};
  }

  /**
   * setAvailability (item: Item, startTime: DateTime, endTime: DateTime): (window: AvailabilityWindow)
   *
   * **requires**: The item must be listed with type BORROW. The window must not overlap with existing windows.
   * **effects**: Creates a new availability window for a borrowable item.
   */
  async setAvailability({ item, startTime, endTime }: { item: Item; startTime: Date; endTime: Date }): Promise<{ window: AvailabilityWindow } | { error: string }> {
    const listing = await this.listings.findOne({ _id: item });
    if (!listing) {
      return { error: `Item ${item} is not listed.` };
    }
    if (listing.type !== "BORROW") {
      return { error: `Item ${item} is for TRANSFER, not BORROW.` };
    }
    if (startTime >= endTime) {
      return { error: `Start time must be before end time.` };
    }

    // Check for overlaps
    const overlap = await this.availabilityWindows.findOne({
      item,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (overlap) {
      return { error: `Availability window overlaps with an existing window.` };
    }

    const windowId = freshID() as AvailabilityWindow;
    await this.availabilityWindows.insertOne({
      _id: windowId,
      item,
      startTime,
      endTime,
      status: "AVAILABLE",
    });

    return { window: windowId };
  }

  /**
   * updateListingStatus (item: Item, status: AVAILABLE or PENDING or CLAIMED): ()
   *
   * **requires**: The item must be listed.
   * **effects**: Updates the status of the listing.
   */
  async updateListingStatus({ item, status }: { item: Item; status: "AVAILABLE" | "PENDING" | "CLAIMED" }): Promise<Empty | { error: string }> {
    const result = await this.listings.updateOne({ _id: item }, { $set: { status } });
    if (result.matchedCount === 0) {
      return { error: `Item ${item} is not listed.` };
    }
    return {};
  }

  /**
   * reserveWindow (window: AvailabilityWindow): ()
   *
   * **requires**: The window must have status AVAILABLE.
   * **effects**: Sets the window status to RESERVED.
   */
  async reserveWindow({ window }: { window: AvailabilityWindow }): Promise<Empty | { error: string }> {
    const result = await this.availabilityWindows.findOneAndUpdate({ _id: window, status: "AVAILABLE" }, { $set: { status: "RESERVED" } });

    if (!result) {
      const exists = await this.availabilityWindows.findOne({ _id: window });
      if (!exists) return { error: `Window ${window} does not exist.` };
      return { error: `Window ${window} is not available for reservation.` };
    }

    return {};
  }

  /**
   * removeAvailability(window: AvailabilityWindow): ()
   *
   * **requires**: The `window` must exist and its status must not be `RESERVED`.
   * **effects**: Removes the `AvailabilityWindow` record.
   */
  async removeAvailability({ window }: { window: AvailabilityWindow }): Promise<Empty | { error: string }> {
    const existingWindow = await this.availabilityWindows.findOne({ _id: window });
    if (!existingWindow) {
      return { error: `Window ${window} does not exist.` };
    }
    if (existingWindow.status === "RESERVED") {
      return { error: `Cannot remove a reserved window.` };
    }

    await this.availabilityWindows.deleteOne({ _id: window });
    return {};
  }

  // QUERIES
  // Note: All queries return an array, even if a single result is expected.

  /**
   * _getListingByItem(item: Item): (listing: Listing)
   * **effects**: Returns the listing details for a specific item.
   */
  async _getListingByItem({ item }: { item: Item }): Promise<Listing[]> {
    return await this.listings.find({ _id: item }).toArray();
  }

  /**
   * _getPhotosByItem(item: Item): (photo: ItemPhoto)
   * **effects**: Returns all photos for an item, sorted by order.
   */
  async _getPhotosByItem({ item }: { item: Item }): Promise<ItemPhoto[]> {
    return await this.itemPhotos.find({ item }).sort({ order: 1 }).toArray();
  }

  /**
   * _getAvailabilityByItem(item: Item): (window: AvailabilityWindow)
   * **effects**: Returns all availability windows for an item, sorted by start time.
   */
  async _getAvailabilityByItem({ item }: { item: Item }): Promise<Availability[]> {
    return await this.availabilityWindows.find({ item }).sort({ startTime: 1 }).toArray();
  }

  /**
   * _getWindow(window: AvailabilityWindow): (window: AvailabilityWindow)
   * **effects**: Returns a specific availability window by its ID.
   */
  async _getWindow({ window }: { window: AvailabilityWindow }): Promise<Availability[]> {
    return await this.availabilityWindows.find({ _id: window }).toArray();
  }

  /**
   * _getListings(type?: BORROW or TRANSFER, status?: AVAILABLE | PENDING | CLAIMED, dormVisibility?: String): (listing: Listing)
   * **effects**: Returns all listings that match the optional filter criteria.
   */
  async _getListings(
    { type, status, dormVisibility }: { type?: ListingType; status?: ListingStatus; dormVisibility?: string },
  ): Promise<Listing[]> {
    const filter: Partial<Listing> = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (dormVisibility) filter.dormVisibility = dormVisibility;
    return await this.listings.find(filter).toArray();
  }
}
```

# file: src/concepts/ItemListing/ItemListingConcept.test.ts

```typescript
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
  const listResult = await itemListing.listItem({ item: itemA, type: "BORROW", dormVisibility: dorm });
  assertEquals(listResult, {});
  let listings = await itemListing._getListingByItem({ item: itemA });
  assertEquals(listings.length, 1);
  assertEquals(listings[0].status, "AVAILABLE");
  assertEquals(listings[0].type, "BORROW");
  console.log("  -> State confirmed: Item is listed and available.");

  // 2. The user adds photos and availability.
  console.log("Action: addPhoto");
  await itemListing.addPhoto({ item: itemA, photoUrl: "url1", order: 1 });
  await itemListing.addPhoto({ item: itemA, photoUrl: "url2", order: 2 });
  let photos = await itemListing._getPhotosByItem({ item: itemA });
  assertEquals(photos.length, 2);
  assertEquals(photos[0].order, 1);
  console.log("  -> State confirmed: Photos added.");

  console.log("Action: setAvailability");
  const startTime = new Date("2024-01-01T10:00:00Z");
  const endTime = new Date("2024-01-01T12:00:00Z");
  const setResult = await itemListing.setAvailability({ item: itemA, startTime, endTime });
  assertExists(setResult.window);
  const windowId = setResult.window;
  console.log("  -> State confirmed: Availability window created.");

  // 3. Another user discovers the item through search.
  console.log("Query: _getListings");
  const discoverableListings = await itemListing._getListings({ status: "AVAILABLE", type: "BORROW", dormVisibility: dorm });
  assertEquals(discoverableListings.length, 1);
  assertEquals(discoverableListings[0]._id, itemA);
  console.log("  -> Behavior confirmed: Item is discoverable.");

  // 4. The other user decides to request it by reserving the window.
  console.log("Action: reserveWindow");
  const reserveResult = await itemListing.reserveWindow({ window: windowId });
  assertEquals(reserveResult, {});
  let windowState = await itemListing._getWindow({ window: windowId });
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
    await itemListing.listItem({ item: itemB, type: "TRANSFER", dormVisibility: "Next" });
    const errResult = await itemListing.listItem({ item: itemB, type: "TRANSFER", dormVisibility: "Next" });
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

  await t.step("setAvailability: requires non-overlapping windows", async () => {
    console.log("Testing: setAvailability requires non-overlap");
    await itemListing.listItem({ item: itemC, type: "BORROW", dormVisibility: "Maseeh" });
    const start1 = new Date("2024-01-01T10:00:00Z");
    const end1 = new Date("2024-01-01T12:00:00Z");
    await itemListing.setAvailability({ item: itemC, startTime: start1, endTime: end1 });

    const start2 = new Date("2024-01-01T11:00:00Z"); // Overlaps
    const end2 = new Date("2024-01-01T13:00:00Z");
    const errResult = await itemListing.setAvailability({ item: itemC, startTime: start2, endTime: end2 });
    assertEquals(errResult.error, `Availability window overlaps with an existing window.`);
    console.log("  -> Requirement met.");
  });

  await t.step("setAvailability: requires BORROW type", async () => {
    console.log("Testing: setAvailability requires BORROW type");
    const listedItem = await itemListing._getListingByItem({ item: itemB });
    assertEquals(listedItem[0]?.type, "TRANSFER"); // From first test
    const start = new Date("2024-01-02T10:00:00Z");
    const end = new Date("2024-01-02T12:00:00Z");
    const errResult = await itemListing.setAvailability({ item: itemB, startTime: start, endTime: end });
    assertEquals(errResult.error, `Item ${itemB} is for TRANSFER, not BORROW.`);
    console.log("  -> Requirement met.");
  });

  await t.step("reserveWindow: requires AVAILABLE status", async () => {
    console.log("Testing: reserveWindow requires AVAILABLE status");
    const { window } = await itemListing.setAvailability({
      item: itemC,
      startTime: new Date("2024-01-03T10:00:00Z"),
      endTime: new Date("2024-01-03T12:00:00Z"),
    });
    assertExists(window);
    await itemListing.reserveWindow({ window }); // First reservation succeeds
    const errResult = await itemListing.reserveWindow({ window }); // Second fails
    assertEquals(errResult.error, `Window ${window} is not available for reservation.`);
    console.log("  -> Requirement met.");
  });

  await t.step("removeAvailability: requires not RESERVED status", async () => {
    console.log("Testing: removeAvailability requires not RESERVED status");
    // This window is already reserved from the previous test
    const [reservedWindow] = await itemListing._getAvailabilityByItem({ item: itemC });
    const errResult = await itemListing.removeAvailability({ window: reservedWindow._id });
    assertEquals(errResult.error, "Cannot remove a reserved window.");

    const { window: availableWindow } = await itemListing.setAvailability({
      item: itemC,
      startTime: new Date("2024-01-04T10:00:00Z"),
      endTime: new Date("2024-01-04T12:00:00Z"),
    });
    assertExists(availableWindow);
    const successResult = await itemListing.removeAvailability({ window: availableWindow });
    assertEquals(successResult, {});
    const windows = await itemListing._getAvailabilityByItem({ item: itemC });
    assertEquals(windows.length, 1); // Only the reserved one should remain
    console.log("  -> Requirement met and effect confirmed.");
  });

  await client.close();
});
```