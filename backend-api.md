# Backend API Specification

This document describes the REST API endpoints exposed by the Concept Server. All endpoints use the `POST` method and accept/return JSON.

**Base URL:** `/api`

---

# API Specification: Item Concept

**Purpose:** To represent a unique, real-world object or material within the system, serving as the central entity for listings, requests, and transactions.

---

## API Endpoints

### POST /api/Item/createItem

**Description:** Creates a new item record associated with an owner.

**Requirements:**
- The owner user must exist (validated by synchronization, not within this concept).

**Effects:**
- Creates a new item record associated with an owner.

**Request Body:**
```json
{
  "owner": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "condition": "string"
}
```

**Success Response Body (Action):**
```json
{
  "item": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Item/createOwnerlessItem

**Description:** Creates a new item record without an owner, to be used for sourcing requests.

**Requirements:**
- true

**Effects:**
- Creates a new item record without an owner, to be used for sourcing requests.

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "category": "string"
}
```

**Success Response Body (Action):**
```json
{
  "item": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Item/updateItemDetails

**Description:** Updates the core details of the item.

**Requirements:**
- The item must exist.

**Effects:**
- Updates the core details of the item.

**Request Body:**
```json
{
  "item": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "condition": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Item/deleteItem

**Description:** Permanently removes the item record from the system.

**Requirements:**
- The user must be the `owner` of the `item`. The item must not be part of any active or pending transaction (validated by synchronization).

**Effects:**
- Permanently removes the `item` record from the system.

**Request Body:**
```json
{
  "item": "string",
  "owner": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Item/_getItemById

**Description:** Returns the full item document.

**Requirements:**
- Item exists.

**Effects:**
- Returns the full item document.

**Request Body:**
```json
{
  "item": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "item": {
      "_id": "string",
      "owner": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "condition": "string",
      "createdAt": "Date"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Item/_getItemsByOwner

**Description:** Returns all items associated with the given owner.

**Requirements:**
- True.

**Effects:**
- Returns all items associated with the given owner.

**Request Body:**
```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**
```json
{
  "items": [
    {
      "_id": "string",
      "owner": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "condition": "string",
      "createdAt": "Date"
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Item/_getAllItems

**Description:** Returns all items in the system.

**Requirements:**
- True.

**Effects:**
- Returns all items in the system.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
{
  "items": [
    {
      "_id": "string",
      "owner": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "condition": "string",
      "createdAt": "Date"
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: ItemListing Concept

**Purpose:** To manage the public catalog of items available for borrowing or permanent transfer, including their availability, photos, and visibility rules.

---

## API Endpoints

### POST /api/ItemListing/listItem

**Description:** Makes an item visible in the catalog with status AVAILABLE.

**Requirements:**
- The item must not already be listed.

**Effects:**
- Makes an item visible in the catalog with status AVAILABLE.

**Request Body:**
```json
{
  "item": "string",
  "type": "BORROW" | "TRANSFER",
  "dormVisibility": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/unlistItem

**Description:** Removes an item from the catalog, setting its status to EXPIRED.

**Requirements:**
- The item must be listed.

**Effects:**
- Removes an item from the catalog, setting its status to EXPIRED.

**Request Body:**
```json
{
  "item": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/updateListingDetails

**Description:** Updates the `dormVisibility` and `type` fields for the item's listing.

**Requirements:**
- The `item` must be listed.

**Effects:**
- Updates the `dormVisibility` and `type` fields for the item's listing.

**Request Body:**
```json
{
  "item": "string",
  "dormVisibility": "string",
  "type": "BORROW" | "TRANSFER"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/addPhoto

**Description:** Adds a photo to the item.

**Requirements:**
- A listing for the item must exist.

**Effects:**
- Adds a photo to the item.

**Request Body:**
```json
{
  "item": "string",
  "photoUrl": "string",
  "order": "number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/removePhoto

**Description:** Removes the `ItemPhoto` record.

**Requirements:**
- An `ItemPhoto` record must exist for the given `item` and `photoUrl`.

**Effects:**
- Removes the `ItemPhoto` record.

**Request Body:**
```json
{
  "item": "string",
  "photoUrl": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/setAvailability

**Description:** Creates a new availability window for a borrowable item.

**Requirements:**
- The item must be listed with type BORROW. The window must not overlap with existing windows.

**Effects:**
- Creates a new availability window for a borrowable item.

**Request Body:**
```json
{
  "item": "string",
  "startTime": "Date",
  "endTime": "Date"
}
```

**Success Response Body (Action):**
```json
{
  "window": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/updateListingStatus

**Description:** Updates the status of the listing.

**Requirements:**
- The item must be listed.

**Effects:**
- Updates the status of the listing.

**Request Body:**
```json
{
  "item": "string",
  "status": "AVAILABLE" | "PENDING" | "CLAIMED"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/reserveWindow

**Description:** Sets the window status to RESERVED.

**Requirements:**
- The window must have status AVAILABLE.

**Effects:**
- Sets the window status to RESERVED.

**Request Body:**
```json
{
  "window": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/removeAvailability

**Description:** Removes the `AvailabilityWindow` record.

**Requirements:**
- The `window` must exist and its status must not be `RESERVED`.

**Effects:**
- Removes the `AvailabilityWindow` record.

**Request Body:**
```json
{
  "window": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/_getListingByItem

**Description:** Returns the listing details for a specific item.

**Effects:**
- Returns the listing details for a specific item.

**Request Body:**
```json
{
  "item": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "type": "BORROW" | "TRANSFER",
    "status": "AVAILABLE" | "PENDING" | "CLAIMED" | "EXPIRED",
    "dormVisibility": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/_getPhotosByItem

**Description:** Returns all photos for an item, sorted by order.

**Effects:**
- Returns all photos for an item, sorted by order.

**Request Body:**
```json
{
  "item": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "item": "string",
    "photoUrl": "string",
    "order": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/_getAvailabilityByItem

**Description:** Returns all availability windows for an item, sorted by start time.

**Effects:**
- Returns all availability windows for an item, sorted by start time.

**Request Body:**
```json
{
  "item": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "item": "string",
    "startTime": "Date",
    "endTime": "Date",
    "status": "AVAILABLE" | "RESERVED"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/_getWindow

**Description:** Returns a specific availability window by its ID.

**Effects:**
- Returns a specific availability window by its ID.

**Request Body:**
```json
{
  "window": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "item": "string",
    "startTime": "Date",
    "endTime": "Date",
    "status": "AVAILABLE" | "RESERVED"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemListing/_getListings

**Description:** Returns all listings that match the optional filter criteria.

**Effects:**
- Returns all listings that match the optional filter criteria.

**Request Body:**
```json
{
  "type": "BORROW" | "TRANSFER",
  "status": "AVAILABLE" | "PENDING" | "CLAIMED" | "EXPIRED",
  "dormVisibility": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "type": "BORROW" | "TRANSFER",
    "status": "AVAILABLE" | "PENDING" | "CLAIMED" | "EXPIRED",
    "dormVisibility": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: ItemRequesting Concept

**Purpose:** To allow users to request items from other users or to transfer items to other users.

---

## API Endpoints

### POST /api/ItemRequesting/createRequest

**Description:** Creates a new item request.

**Requirements:**
- For

**Effects:**
- Creates a new item request.

**Request Body:**
```json
{
  "requester": "string",
  "item": "string",
  "type": "BORROW" | "TRANSFER" | "ITEM",
  "status": "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED",
  "requesterNotes": "string",
  "requestedStartTime": "Date | null",
  "requestedEndTime": "Date | null"
}
```

**Success Response Body (Action):**
```json
{
  "request": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemRequesting/acceptRequest

**Description:** Sets the request status to ACCEPTED.

**Requirements:**
- The request must be pending.

**Effects:**
- Sets the request status to ACCEPTED.

**Request Body:**
```json
{
  "request": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemRequesting/rejectRequest

**Description:** Sets the request status to REJECTED.

**Requirements:**
- The request must be pending.

**Effects:**
- Sets the request status to REJECTED.

**Request Body:**
```json
{
  "request": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemRequesting/cancelRequest

**Description:** Sets the request status to CANCELLED.

**Requirements:**
- The request must be pending.
- The user must be the requester.

**Effects:**
- Sets the request status to CANCELLED.

**Request Body:**
```json
{
  "request": "string",
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemRequesting/_getRequest

**Description:** Returns the full document for a given request ID.

**Effects:**
- Returns the full document for a given request ID.

**Request Body:**
```json
{
  "request": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "requestDoc": {
      "_id": "string",
      "requester": "string",
      "item": "string",
      "type": "BORROW" | "TRANSFER" | "ITEM",
      "status": "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED",
      "requesterNotes": "string",
      "requestedStartTime": "Date | null",
      "requestedEndTime": "Date | null",
      "createdAt": "Date"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemRequesting/_getItemForRequest

**Description:** Returns the item ID associated with a given request ID.

**Effects:**
- Returns the item ID associated with a given request ID.

**Request Body:**
```json
{
  "request": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "item": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemRequesting/_getOtherPendingRequests

**Description:** Returns all PENDING requests for an item, excluding a specific request ID.

**Effects:**
- Returns all PENDING requests for an item, excluding a specific request ID.

**Request Body:**
```json
{
  "item": "string",
  "exclude": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "otherRequest": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: ItemTransaction Concept

**Purpose:** To manage the lifecycle of item transactions between users.

---

## API Endpoints

### POST /api/ItemTransaction/createTransaction

**Description:** Creates a new item transaction.

**Requirements:**

**Effects:**
- Creates a new item transaction.

**Request Body:**
```json
{
  "from": "string",
  "to": "string",
  "item": "string",
  "type": "BORROW" | "TRANSFER" | "ITEM",
  "fromNotes": "string",
  "toNotes": "string"
}
```

**Success Response Body (Action):**
```json
{
  "transaction": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemTransaction/markPickedUp

**Description:** Sets status to IN_PROGRESS (for BORROW) or COMPLETED (for TRANSFER/ITEM) and records the pickup time.

**Requirements:**
- The transaction must be in PENDING_PICKUP status.

**Effects:**
- Sets status to IN_PROGRESS (for BORROW) or COMPLETED (for TRANSFER/ITEM) and records the pickup time.

**Request Body:**
```json
{
  "transaction": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemTransaction/markReturned

**Description:** Sets status to PENDING_RETURN and records the return time.

**Requirements:**
- The transaction must be in IN_PROGRESS status and of type BORROW.

**Effects:**
- Sets status to PENDING_RETURN and records the return time.

**Request Body:**
```json
{
  "transaction": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemTransaction/confirmReturn

**Description:** Sets status to COMPLETED.

**Requirements:**
- The transaction must be in PENDING_RETURN status.

**Effects:**
- Sets status to COMPLETED.

**Request Body:**
```json
{
  "transaction": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemTransaction/cancelTransaction

**Description:** Sets status to CANCELLED.

**Requirements:**
- The transaction must be in PENDING_PICKUP or IN_PROGRESS status.

**Effects:**
- Sets status to CANCELLED.

**Request Body:**
```json
{
  "transaction": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemTransaction/_getTransaction

**Description:** Returns the full document for a given transaction ID.

**Effects:**
- Returns the full document for a given transaction ID.

**Request Body:**
```json
{
  "transaction": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "transactionDoc": {
      "_id": "string",
      "from": "string",
      "to": "string",
      "item": "string",
      "type": "BORROW" | "TRANSFER" | "ITEM",
      "status": "PENDING_PICKUP" | "IN_PROGRESS" | "PENDING_RETURN" | "COMPLETED" | "CANCELLED",
      "fromNotes": "string",
      "toNotes": "string",
      "createdAt": "Date",
      "pickedUpAt": "Date | null",
      "returnedAt": "Date | null"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: LikertSurvey Concept

**Purpose:** To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.

---

## API Endpoints

### POST /api/LikertSurvey/createSurvey

**Description:** A new survey is created and its ID is returned.

**Requirements:**
- scaleMin must be less than scaleMax.

**Effects:**
- A new survey is created and its ID is returned.

**Request Body:**
```json
{
  "author": "string",
  "title": "string",
  "scaleMin": "number",
  "scaleMax": "number"
}
```

**Success Response Body (Action):**
```json
{
  "survey": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/LikertSurvey/addQuestion

**Description:** A new question is created and its ID is returned.

**Requirements:**
- The survey must exist.

**Effects:**
- A new question is created and its ID is returned.

**Request Body:**
```json
{
  "survey": "string",
  "text": "string"
}
```

**Success Response Body (Action):**
```json
{
  "question": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/LikertSurvey/submitResponse

**Description:** A new response is recorded in the state.

**Requirements:**
- The question must exist.
- The respondent must not have already responded to this question.
- The response value must be within the survey's defined scale.

**Effects:**
- A new response is recorded in the state.

**Request Body:**
```json
{
  "respondent": "string",
  "question": "string",
  "value": "number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/LikertSurvey/updateResponse

**Description:** The existing response's value is updated.

**Requirements:**
- The question must exist.
- A response from the given respondent to the question must already exist.
- The new response value must be within the survey's defined scale.

**Effects:**
- The existing response's value is updated.

**Request Body:**
```json
{
  "respondent": "string",
  "question": "string",
  "value": "number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/LikertSurvey/_getSurveyQuestions

**Description:** Retrieves all questions associated with a specific survey.

**Request Body:**
```json
{
  "survey": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "survey": "string",
    "text": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/LikertSurvey/_getSurveyResponses

**Description:** Retrieves all responses for a given survey. This involves finding all questions for the survey first, then finding all responses to those questions.

**Request Body:**
```json
{
  "survey": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "respondent": "string",
    "question": "string",
    "value": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/LikertSurvey/_getRespondentAnswers

**Description:** Retrieves all answers submitted by a specific respondent.

**Request Body:**
```json
{
  "respondent": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "respondent": "string",
    "question": "string",
    "value": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: UserAuthentication Concept

**Purpose:** To authenticate users so that each person's data is securely associated with their identity and protected from unauthorized access.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user record with a hashed password and returns a new pair of session tokens.

**Requirements:**
- The provided email and username must not already exist.
- The email must be in valid format.
- The password must be at least 8 characters long (potentially implement later).

**Effects:**
- Creates a new user record with a hashed password and returns a new pair of session tokens.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string",
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/login

**Description:** Creates a new session and returns a new pair of access and refresh tokens for the authenticated user.

**Requirements:**
- The provided username and password must match an existing user account.

**Effects:**
- Creates a new session and returns a new pair of access and refresh tokens for the authenticated user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/refreshAccessToken

**Description:** Generates and returns a new short-lived access token.

**Requirements:**
- A valid and non-expired refresh token must be provided.

**Effects:**
- Generates and returns a new short-lived access token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Success Response Body (Action):**
```json
{
  "accessToken": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/logout

**Description:** Invalidates the user's current refresh token, ending their session.

**Requirements:**
- A valid refresh token must be provided.

**Effects:**
- Invalidates the user's current refresh token, ending their session.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/changePassword

**Description:** Updates the user's stored password hash to the new password.

**Requirements:**
- A valid access token must be provided.
- The old password must match the user's current password.

**Effects:**
- Updates the user's stored password hash to the new password.

**Request Body:**
```json
{
  "accessToken": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/deleteAccount

**Description:** Permanently removes the user's account and all associated sessions.

**Requirements:**
- A valid access token must be provided.
- The provided password matches the user's current password.

**Effects:**
- Permanently removes the user's account and all associated sessions.

**Request Body:**
```json
{
  "accessToken": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/_getUserFromToken

**Description:** Returns the user ID associated with the token.

**Requirements:**
- A valid, non-expired accessToken.

**Effects:**
- Returns the user ID associated with the token.

**Request Body:**
```json
{
  "accessToken": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/_getUserCount

**Description:** Returns the total number of registered users in the system.

**Requirements:**
- true

**Effects:**
- Returns the total number of registered users in the system.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "userCount": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: UserProfile Concept

**Purpose:** To maintain user profile information including display name, dorm affiliation, and other public-facing details that enable community connection and item discovery.

---

## API Endpoints

### POST /api/UserProfile/createProfile

**Description:** Creates a profile for the user with the provided display name and dorm, initializing scores to 0, bio to empty, and createdAt to the current time. Returns the user ID on success.

**Requirements:**
- The user must not already have a profile. The dorm must be a valid MIT dorm name.

**Effects:**
- Creates a profile for the user with the provided display name and dorm, initializing scores to 0, bio to empty, and createdAt to the current time. Returns the user ID on success.

**Request Body:**
```json
{
  "user": "string",
  "displayName": "string",
  "dorm": "string"
}
```

**Success Response Body (Action):**
```json
{
  "profile": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserProfile/updateProfile

**Description:** Updates the user's profile information with the provided values.

**Requirements:**
- The user must have an existing profile.

**Effects:**
- Updates the user's profile information with the provided values.

**Request Body:**
```json
{
  "user": "string",
  "displayName": "string",
  "dorm": "string",
  "bio": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserProfile/updateScores

**Description:** Updates the stored reputation scores for the user.

**Requirements:**
- The user must have a profile.

**Effects:**
- Updates the stored reputation scores for the user.

**Request Body:**
```json
{
  "user": "string",
  "lenderScore": "number",
  "borrowerScore": "number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserProfile/_getProfile

**Description:** Returns the user's full profile information. If the user has no profile, an empty array is returned.

**Requirements:**
- user is a valid User ID.

**Effects:**
- Returns the user's full profile information. If the user has no profile, an empty array is returned.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "profile": {
      "_id": "string",
      "displayName": "string",
      "dorm": "string",
      "bio": "string",
      "createdAt": "Date",
      "lenderScore": "number",
      "borrowerScore": "number"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserProfile/_getUsersByDorm

**Description:** Returns a list of all users and their display names associated with the given dorm.

**Requirements:**
- `dorm` is a valid dorm name.

**Effects:**
- Returns a list of all users and their display names associated with the given dorm.

**Request Body:**
```json
{
  "dorm": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "string",
    "displayName": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: Requesting Concept

**Purpose:** The Requesting concept encapsulates an API server, modeling incoming requests and outgoing responses as concept actions.

---

## API Endpoints

### POST /api/Requesting/request

**Description:** Creates a new Request `r`; sets the input of `r` to be the path and all other input parameters; returns `r` as `request`.

**Requirements:**
- true

**Effects:**
- creates a new Request `r`; sets the input of `r` to be the path and all other input parameters; returns `r` as `request`

**Request Body:**
```json
{
  "path": "string",
  "[key: string]": "unknown"
}
```

**Success Response Body (Action):**
```json
{
  "request": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Requesting/respond

**Description:** Sets the response of the given Request to the provided key-value pairs.

**Requirements:**
- a Request with the given `request` id exists and has no response yet

**Effects:**
- sets the response of the given Request to the provided key-value pairs.

**Request Body:**
```json
{
  "request": "string",
  "[key: string]": "unknown"
}
```

**Success Response Body (Action):**
```json
{
  "request": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Requesting/_awaitResponse

**Description:** Returns the response associated with the given request, waiting if necessary up to a configured timeout.

**Effects:**
- returns the response associated with the given request, waiting if necessary up to a configured timeout.

**Request Body:**
```json
{
  "request": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "response": "unknown"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

