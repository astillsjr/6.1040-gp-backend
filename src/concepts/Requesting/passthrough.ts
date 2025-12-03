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

  // UserAuthentication: Public endpoints for registration and login.
  "/api/UserAuthentication/register":
    "Public endpoint for new user registration.",
  "/api/UserAuthentication/login": "Public endpoint for user login.",
  "/api/UserAuthentication/refreshAccessToken":
    "Public endpoint to refresh session tokens.",
  "/api/UserAuthentication/_getUserCount":
    "Public query to get the total number of registered users in the system.",

  // Item & ItemListing: Public queries for browsing items and their details without being logged in.
  "/api/Item/_getItemById": "Public query to view a single item's details.",
  "/api/Item/_getAllItems": "Public query to browse all items in the system.",
  "/api/Item/_getItemsByOwner":
    "Public query to view items owned by a specific user.",
  "/api/ItemListing/_getListings":
    "Public query to browse all available listings.",
  "/api/ItemListing/_getListingByItem":
    "Public query to get listing info for an item.",
  "/api/ItemListing/_getPhotosByItem": "Public query to view item photos.",
  "/api/ItemListing/_getAvailabilityByItem":
    "Public query to see available borrowing times for an item.",
  "/api/ItemListing/_getWindow":
    "Public query to get details of a specific availability window.",
  "/api/ItemListing/_getAvailableItemCount":
    "Public query to get the count of available items for homepage display.",

  // ItemTransaction: Public queries for homepage statistics.
  "/api/ItemTransaction/_getSuccessfulBorrowsCount":
    "Public query to get the count of successful borrows (completed transactions) for homepage display.",

  // UserProfile: Public queries for viewing profiles and finding community members.
  "/api/UserProfile/_getProfile":
    "Public query to view a user's public profile.",
  "/api/UserProfile/_getUsersByDorm":
    "Public query to find users within a specific dorm.",

  // ItemRequesting: Queries for viewing requests (read-only, useful for dashboards).
  "/api/ItemRequesting/_getRequestsByItem":
    "Query to get all requests for a specific item (for owners).",
  "/api/ItemRequesting/_getRequestsByRequester":
    "Query to get all requests made by a specific user.",

  // ItemTransaction: Queries for viewing transactions (read-only, for tracking borrows/lends).
  "/api/ItemTransaction/_getTransactionsByUser":
    "Query to get all transactions involving a specific user.",

  // Reviewing: Public queries for viewing reviews (trust & transparency).
  "/api/Reviewing/_getReviewById":
    "Public query to view a specific review.",
  "/api/Reviewing/_getReviewsForTransaction":
    "Public query to see all reviews for a completed transaction.",
  "/api/Reviewing/_getReviewsByReviewee":
    "Public query to view reviews received by a user (for trust scores).",
  "/api/Reviewing/_getReviewsByReviewer":
    "Public query to view reviews written by a user.",
  "/api/Reviewing/_getReviewForTransactionByReviewer":
    "Public query to check if a user has reviewed a transaction.",
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

  // UserAuthentication: Actions requiring a valid session or internal logic.
  "/api/UserAuthentication/logout",
  "/api/UserAuthentication/changePassword",
  "/api/UserAuthentication/deleteAccount",
  "/api/UserAuthentication/createTokenPair", // Internal helper method, should not be an endpoint.
  "/api/UserAuthentication/getUserIdFromAccessToken", // Internal helper method, should not be an endpoint.
  "/api/UserAuthentication/_getUserFromToken",

  // UserProfile: Actions requiring authentication and authorization checks.
  "/api/UserProfile/createProfile", // Must verify user can only create their own profile.
  "/api/UserProfile/updateProfile", // Must verify user can only update their own profile.
  "/api/UserProfile/updateScores", // System action, triggered by syncs only.

  // Item: Mutations and private queries require auth.
  "/api/Item/createItem",
  "/api/Item/createOwnerlessItem",
  "/api/Item/updateItemDetails",
  "/api/Item/deleteItem",

  // ItemListing: All mutations require auth and ownership checks.
  "/api/ItemListing/listItem",
  "/api/ItemListing/unlistItem",
  "/api/ItemListing/updateListingDetails",
  "/api/ItemListing/addPhoto",
  "/api/ItemListing/removePhoto",
  "/api/ItemListing/setAvailability",
  "/api/ItemListing/removeAvailability",
  "/api/ItemListing/updateListingStatus", // System-driven action.
  "/api/ItemListing/reserveWindow", // System-driven action.

  // ItemRequesting & ItemTransaction: The entire lifecycle must be orchestrated by syncs.
  "/api/ItemRequesting/createRequest",
  "/api/ItemRequesting/acceptRequest",
  "/api/ItemRequesting/rejectRequest",
  "/api/ItemRequesting/cancelRequest",
  "/api/ItemRequesting/_getRequest", // Exposes private request details.
  "/api/ItemRequesting/_getItemForRequest", // Internal query for sync logic.
  "/api/ItemRequesting/_getOtherPendingRequests", // Exposes private data about other users' requests.
  "/api/ItemTransaction/createTransaction", // System action, triggered by syncs.
  "/api/ItemTransaction/markPickedUp",
  "/api/ItemTransaction/markReturned",
  "/api/ItemTransaction/confirmReturn",
  "/api/ItemTransaction/cancelTransaction",
  "/api/ItemTransaction/_getTransaction", // Exposes private transaction details.

  // Reviewing: Mutations require auth (verify reviewer is party to transaction).
  "/api/Reviewing/submitReview",
  "/api/Reviewing/editReview",
  "/api/Reviewing/deleteReview",

  // Flagging: All routes require auth. Actions need user verification, queries are admin-only.
  "/api/Flagging/flagUser",
  "/api/Flagging/flagItemAndUser",
  "/api/Flagging/resolveFlag", // Admin action
  "/api/Flagging/dismissFlag", // Admin action
  "/api/Flagging/_getFlagById", // Admin query
  "/api/Flagging/_getFlags", // Admin query (moderation dashboard)
  "/api/Flagging/_getFlagsByUser", // Admin query
  "/api/Flagging/_getFlagsForUser", // Admin query
  "/api/Flagging/_getFlagsForItem", // Admin query
];
