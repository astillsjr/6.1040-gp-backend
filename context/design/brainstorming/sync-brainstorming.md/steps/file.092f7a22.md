---
timestamp: 'Tue Nov 25 2025 19:30:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_193058.e57be6d5.md]]'
content_id: 092f7a2228465203be3316fe4e7ecef3ebfa301650633b519461fbaa1a6fce9c
---

# file: src\concepts\Requesting\passthrough.ts

```typescript
/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",


  "/api/UserAuthentication/register": "Public endpoint for new user registration.",
  "/api/UserAuthentication/login": "Public endpoint for user login.",
  "/api/UserAuthentication/refreshAccessToken": "Public endpoint to refresh session tokens.",

  // Potentially public queries for browsing items without being logged in.
  "/api/Item/_getItemById": "Public query to view a single item's details.",
  "/api/ItemListing/_getListings": "Public query to browse all available listings.",
  "/api/ItemListing/_getListingByItem": "Public query to get listing info for an item.",
  "/api/ItemListing/_getPhotosByItem": "Public query to view item photos.",
  "/api/UserProfile/_getProfile": "Public query to view a user's public profile."
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",

  // User Authentication (requires valid session)
  "/api/UserAuthentication/logout",
  "/api/UserAuthentication/changePassword",
  "/api/UserAuthentication/deleteAccount",

  // User Profile (all mutations require auth)
  "/api/UserProfile/updateProfile",

  // Item & Listing (all mutations require auth and ownership checks)
  "/api/Item/createItem",
  "/api/Item/updateItemDetails",
  "/api/Item/deleteItem",
  "/api/ItemListing/listItem",
  "/api/ItemListing/unlistItem",
  "/api/ItemListing/updateListingDetails",
  "/api/ItemListing/addPhoto",
  "/api/ItemListing/removePhoto",
  "/api/ItemListing/setAvailability",
  "/api/ItemListing/removeAvailability",
  
  // Requesting & Transaction (entire lifecycle must be orchestrated)
  "/api/ItemRequesting/createRequest",
  "/api/ItemRequesting/acceptRequest",
  "/api/ItemRequesting/rejectRequest",
  "/api/ItemRequesting/cancelRequest",
  "/api/ItemTransaction/markPickedUp",
  "/api/ItemTransaction/markReturned",
  "/api/ItemTransaction/confirmReturn",
  "/api/ItemTransaction/cancelTransaction",
];

```
