---
timestamp: 'Tue Nov 25 2025 01:01:15 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_010115.1c9e6d75.md]]'
content_id: a7a2ab7507c800983c48bee9d04e6204f32144ca1ccd656cc6baa914d3b88500
---

# concept: ItemListing

* **concept**: ItemListing \[Item]
* **purpose**: To manage the public catalog of items available for borrowing or permanent transfer, including their availability, photos, and visibility rules.
* **principle**: If a user lists an item, specifying whether it's for borrowing or a free transfer, then other users can discover it through search, view its details and availability, and decide whether to request it.
* **state**:
  * a set of Listings with
    * an item Item
    * a type of BORROW or TRANSFER
    * a status of AVAILABLE or PENDING or CLAIMED or EXPIRED
    * a dormVisibility String
  * a set of ItemPhotos with
    * an item Item
    * a photoUrl String
    * an order Number
  * a set of AvailabilityWindows with
    * an item Item
    * a startTime DateTime
    * an endTime DateTime
    * a status of AVAILABLE or RESERVED
* **actions**:
  * `listItem (item: Item, type: BORROW or TRANSFER, dormVisibility: String): ()`
  * `unlistItem (item: Item): ()`
  * `updateListingDetails(item: Item, dormVisibility: String, type: BORROW or TRANSFER)`
  * `addPhoto (item: Item, photoUrl: String, order: Number): ()`
  * `removePhoto(item: Item, photoUrl: String)`
  * `setAvailability (item: Item, startTime: DateTime, endTime: DateTime): (window: AvailabilityWindow)`
  * `updateListingStatus (item: Item, status: AVAILABLE or PPENDING or CLAIMED): ()`
  * `reserveWindow (window: AvailabilityWindow): ()`
  * `removeAvailability(window: AvailabilityWindow)`
* **queries**: (As requested, I have added queries that are necessary for a functional concept)
  * `_getListingByItem(item: Item): (listing: Listing)`
  * `_getPhotosByItem(item: Item): (photo: ItemPhoto)`
  * `_getAvailabilityByItem(item: Item): (window: AvailabilityWindow)`
  * `_getWindow(window: AvailabilityWindow): (window: AvailabilityWindow)`
  * `_getListings(type?: BORROW or TRANSFER, status?: AVAILABLE or PENDING or CLAIMED, dormVisibility?: String): (listing: Listing)`
