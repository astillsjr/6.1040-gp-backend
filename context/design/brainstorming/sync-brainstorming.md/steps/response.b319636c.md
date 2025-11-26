---
timestamp: 'Tue Nov 25 2025 19:31:28 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193128.f8d8150d.md]]'
content_id: b319636c08f7d09def44a826d71bcdc175daa615a5df7f43af830fda35f3bdba
---

# response:

Of course. Let's analyze the unverified routes and correctly place them into the `passthrough.ts` file based on security and application logic principles.

The core principle is:

* **Inclusions**: Routes that are safe for public, unauthenticated access. These are almost exclusively `queries` (`_` prefixed methods) that don't expose sensitive user data.
* **Exclusions**: Routes that mutate state or require authorization. These actions should be triggered via the `Requesting` concept and orchestrated by synchronizations which can enforce rules like "only the item owner can delete it."

Based on this, here is the updated `passthrough.ts` file with all the unverified routes correctly categorized and justified.

### Analysis of Unverified Routes

1. **Routes to INCLUDE:** These are public-facing queries that allow users (even those not logged in) to browse the application's data.
   * `/api/Item/_getAllItems`: Safe. Allows browsing of all items.
   * `/api/ItemListing/_getAvailabilityByItem`: Safe. Needed for a user to see when an item is available before making a request.
   * `/api/ItemListing/_getWindow`: Safe. A more specific version of the above.
   * `/api/UserProfile/_getUsersByDorm`: Safe. This is a community-building feature and only exposes non-sensitive display names.

2. **Routes to EXCLUDE:** These routes represent actions that must be protected.
   * `/api/Item/createOwnerlessItem`: Mutation. Creating any data should be an authenticated action.
   * `/api/Item/_getItemsByOwner`: Private Query. This exposes a list of items for a *specific* user, which should require authentication to ensure a user is only viewing their own items.
   * `/api/ItemListing/updateListingStatus`: Mutation. This is a critical state change that must be managed by the system (via syncs) in response to a transaction, not by direct user input.
   * `/api/ItemListing/reserveWindow`: Mutation. Like the above, this must be triggered by an accepted request, not a direct call.
   * `/api/ItemTransaction/createTransaction`: **System Action**. The spec marks this action as `system`, meaning it should *only* be called by a synchronization, never by a user.
   * `/api/UserAuthentication/createTokenPair` & `getUserIdFromAccessToken`: **Internal Methods**. These are private helper methods within the concept's implementation and should never have been exposed as API endpoints. Excluding them is critical.
   * `/api/UserProfile/createProfile`: Mutation. Should be handled by an authenticated request flow, likely tied to user registration.
   * `/api/UserProfile/updateScores`: **System Action**. The spec marks this as `system`, intended to be updated by syncs based on transaction history, not by users.

***
