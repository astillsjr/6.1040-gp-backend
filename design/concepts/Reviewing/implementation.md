[@Reviewing](Reviewing.md)

[@concept-background](../../tools/concept-background.md)

# prompt: provide me with a complete implementation for Reviewing. Make sure that it follows the correct format in TypeScript, and that it is a correct and complete implementation. Finally, evaluate the implementation and make sure there is nothing missing. I have provided you already with the concept spec in the Reviewing.md file as well as the background of how to implement concepts. Additionally, include all queries that you believe are needed even if not specified in the concept spec


# response:

# concept: Reviewing

**concept**: Reviewing \[User, ItemTransaction]
**purpose**: To allow users to provide feedback and ratings on completed transactions, building a foundation of trust within the community.
**principle**: After a transaction is completed, both the provider and the recipient can leave a rating and a comment about the experience, which will be visible to other users.

**state**:

* a set of Reviews with
  * a reviewer User
  * a reviewee User
  * a transaction ItemTransaction
  * a rating Number
  * a comment String
  * a createdAt Date

**actions**:

* `submitReview (reviewer: User, reviewee: User, transaction: ItemTransaction, rating: Number, comment: String): (review: Review)`
  * **requires**: The transaction must be in COMPLETED status. The reviewer must be a party to the transaction. A review must not already exist for this reviewer/transaction pair. Rating is between 1-5.
  * **effects**: Creates a new review record. A sync will then trigger a recalculation of scores in `UserProfile`.
* `editReview(review: Review, editor: User, newRating: Number, newComment: String)`
  * **requires**: The user performing the action (`editor`) must be the `reviewer` of the `review`. The review must have been submitted within a defined time window (e.g., 72 hours). The `newRating` must be between 1-5.
  * **effects**: Updates the `rating` and `comment` fields of the `review`.
* `deleteReview(review: Review, deleter: User)`
  * **requires**: The user performing the action (`deleter`) must be the `reviewer` of the `review`.
  * **effects**: Permanently removes the `review` record.

**queries**:

* `_getReviewById(review: Review): (review: ReviewDoc)`
  * **effects**: returns the review with the given ID.
* `_getReviewsForTransaction(transaction: ItemTransaction): (review: ReviewDoc)`
  * **effects**: returns all reviews associated with a given transaction.
* `_getReviewsByReviewee(reviewee: User): (review: ReviewDoc)`
  * **effects**: returns all reviews received by a given user.
* `_getReviewsByReviewer(reviewer: User): (review: ReviewDoc)`
  * **effects**: returns all reviews written by a given user.
* `_getReviewForTransactionByReviewer(transaction: ItemTransaction, reviewer: User): (review: ReviewDoc)`
  * **effects**: returns the review for a specific transaction by a specific reviewer, if it exists.

# file: src/concepts/Reviewing/ReviewingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic types of this concept
type User = ID;
type ItemTransaction = ID;
type Review = ID;

// Collection prefix, using the concept name
const PREFIX = "Reviewing";
const EDIT_WINDOW_HOURS = 72;

/**
 * Represents the state for the Reviewing concept.
 * a set of Reviews with
 *   a reviewer User
 *   a reviewee User
 *   a transaction ItemTransaction
 *   a rating Number
 *   a comment String
 *   a createdAt Date
 */
export interface ReviewDoc {
  _id: Review;
  reviewer: User;
  reviewee: User;
  transaction: ItemTransaction;
  rating: number;
  comment: string;
  createdAt: Date;
}

/**
 * @concept Reviewing - To allow users to provide feedback and ratings on completed transactions, building a foundation of trust within the community.
 */
export default class ReviewingConcept {
  reviews: Collection<ReviewDoc>;

  constructor(private readonly db: Db) {
    this.reviews = this.db.collection<ReviewDoc>(`${PREFIX}.reviews`);
  }

  /**
   * submitReview (reviewer: User, reviewee: User, transaction: ItemTransaction, rating: Number, comment: String): (review: Review)
   *
   * **requires**: A review must not already exist for this reviewer/transaction pair. Rating is between 1-5.
   *             (External requires: The transaction must be in COMPLETED status. The reviewer must be a party to the transaction.)
   * **effects**: Creates a new review record and returns its ID.
   */
  async submitReview({ reviewer, reviewee, transaction, rating, comment }: { reviewer: User; reviewee: User; transaction: ItemTransaction; rating: number; comment: string }): Promise<{ review: Review } | { error: string }> {
    if (rating < 1 || rating > 5) {
      return { error: "Rating must be between 1 and 5." };
    }

    const existingReview = await this.reviews.findOne({ reviewer, transaction });
    if (existingReview) {
      return { error: "A review for this transaction by this user already exists." };
    }

    const reviewId = freshID() as Review;
    const newReview: ReviewDoc = {
      _id: reviewId,
      reviewer,
      reviewee,
      transaction,
      rating,
      comment,
      createdAt: new Date(),
    };

    const result = await this.reviews.insertOne(newReview);
    if (!result.acknowledged) {
      return { error: "Failed to submit review." };
    }

    return { review: reviewId };
  }

  /**
   * editReview(review: Review, editor: User, newRating: Number, newComment: String)
   *
   * **requires**: The user performing the action (`editor`) must be the `reviewer` of the `review`. The review must have been submitted within 72 hours. `newRating` must be between 1-5.
   * **effects**: Updates the `rating` and `comment` fields of the `review`.
   */
  async editReview({ review, editor, newRating, newComment }: { review: Review; editor: User; newRating: number; newComment: string }): Promise<Empty | { error: string }> {
    if (newRating < 1 || newRating > 5) {
      return { error: "Rating must be between 1 and 5." };
    }

    const existingReview = await this.reviews.findOne({ _id: review });
    if (!existingReview) {
      return { error: "Review not found." };
    }

    if (existingReview.reviewer !== editor) {
      return { error: "Only the original reviewer can edit this review." };
    }

    const now = new Date();
    const reviewDate = existingReview.createdAt;
    const hoursDifference = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);

    if (hoursDifference > EDIT_WINDOW_HOURS) {
      return { error: `Review can only be edited within ${EDIT_WINDOW_HOURS} hours of submission.` };
    }

    const result = await this.reviews.updateOne({ _id: review }, { $set: { rating: newRating, comment: newComment } });

    if (result.matchedCount === 0) {
      return { error: "Failed to find review to update." };
    }

    return {};
  }

  /**
   * deleteReview(review: Review, deleter: User)
   *
   * **requires**: The user performing the action (`deleter`) must be the `reviewer` of the `review`.
   * **effects**: Permanently removes the `review` record.
   */
  async deleteReview({ review, deleter }: { review: Review; deleter: User }): Promise<Empty | { error: string }> {
    const existingReview = await this.reviews.findOne({ _id: review });
    if (!existingReview) {
      return { error: "Review not found." };
    }

    if (existingReview.reviewer !== deleter) {
      return { error: "Only the original reviewer can delete this review." };
    }

    await this.reviews.deleteOne({ _id: review });

    return {};
  }

  // QUERIES

  /**
   * _getReviewById(review: Review): (review: ReviewDoc)
   * @effects returns the review with the given ID.
   */
  async _getReviewById({ review }: { review: Review }): Promise<Array<{ review: ReviewDoc }>> {
    const foundReview = await this.reviews.findOne({ _id: review });
    return foundReview ? [{ review: foundReview }] : [];
  }

  /**
   * _getReviewsForTransaction(transaction: ItemTransaction): (review: ReviewDoc)
   * @effects returns all reviews associated with a given transaction.
   */
  async _getReviewsForTransaction({ transaction }: { transaction: ItemTransaction }): Promise<Array<{ review: ReviewDoc }>> {
    const foundReviews = await this.reviews.find({ transaction }).toArray();
    return foundReviews.map((r) => ({ review: r }));
  }

  /**
   * _getReviewsByReviewee(reviewee: User): (review: ReviewDoc)
   * @effects returns all reviews received by a given user.
   */
  async _getReviewsByReviewee({ reviewee }: { reviewee: User }): Promise<Array<{ review: ReviewDoc }>> {
    const foundReviews = await this.reviews.find({ reviewee }).toArray();
    return foundReviews.map((r) => ({ review: r }));
  }

  /**
   * _getReviewsByReviewer(reviewer: User): (review: ReviewDoc)
   * @effects returns all reviews written by a given user.
   */
  async _getReviewsByReviewer({ reviewer }: { reviewer: User }): Promise<Array<{ review: ReviewDoc }>> {
    const foundReviews = await this.reviews.find({ reviewer }).toArray();
    return foundReviews.map((r) => ({ review: r }));
  }

  /**
   * _getReviewForTransactionByReviewer(transaction: ItemTransaction, reviewer: User): (review: ReviewDoc)
   * @effects returns the review for a specific transaction by a specific reviewer, if it exists.
   */
  async _getReviewForTransactionByReviewer({ transaction, reviewer }: { transaction: ItemTransaction; reviewer: User }): Promise<Array<{ review: ReviewDoc }>> {
    const foundReview = await this.reviews.findOne({ transaction, reviewer });
    return foundReview ? [{ review: foundReview }] : [];
  }
}
```

# file: src/concepts/Reviewing/ReviewingConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReviewingConcept from "./ReviewingConcept.ts";

// Define generic types for testing
type User = ID;
type ItemTransaction = ID;

// Test setup
const alice = "user:alice" as User;
const bob = "user:bob" as User;
const charlie = "user:charlie" as User;
const transaction1 = "tx:1" as ItemTransaction;

Deno.test("Principle: Both parties in a transaction can review each other", async () => {
  console.log("Trace: Testing the core principle of mutual reviews.");
  const [db, client] = await testDb();
  const reviewing = new ReviewingConcept(db);

  // Bob (provider) and Alice (recipient) complete a transaction.
  console.log("  - Action: Alice reviews Bob for transaction1.");
  const aliceReviewResult = await reviewing.submitReview({
    reviewer: alice,
    reviewee: bob,
    transaction: transaction1,
    rating: 5,
    comment: "Great experience!",
  });
  assertExists(aliceReviewResult.review, "Alice's review should be created");

  console.log("  - Action: Bob reviews Alice for the same transaction.");
  const bobReviewResult = await reviewing.submitReview({
    reviewer: bob,
    reviewee: alice,
    transaction: transaction1,
    rating: 4,
    comment: "Alice was a great recipient.",
  });
  assertExists(bobReviewResult.review, "Bob's review should be created");

  console.log("  - Verification: Check that both reviews are visible for the transaction.");
  const reviewsForTx = await reviewing._getReviewsForTransaction({ transaction: transaction1 });
  assertEquals(reviewsForTx.length, 2, "There should be two reviews for the transaction.");

  console.log("  - Verification: Check Alice's received reviews (from Bob).");
  const reviewsForAlice = await reviewing._getReviewsByReviewee({ reviewee: alice });
  assertEquals(reviewsForAlice.length, 1);
  assertEquals(reviewsForAlice[0].review.rating, 4);

  console.log("  - Verification: Check Bob's received reviews (from Alice).");
  const reviewsForBob = await reviewing._getReviewsByReviewee({ reviewee: bob });
  assertEquals(reviewsForBob.length, 1);
  assertEquals(reviewsForBob[0].review.rating, 5);

  console.log("Principle test successful.");
  await client.close();
});

Deno.test("Action: submitReview", async (t) => {
  const [db, client] = await testDb();
  const reviewing = new ReviewingConcept(db);

  await t.step("should create a review successfully", async () => {
    console.log("\nTest: submitReview - successful creation");
    console.log("  - Requirement: Valid rating (1-5), no existing review for user/transaction pair.");
    const result = await reviewing.submitReview({
      reviewer: alice,
      reviewee: bob,
      transaction: transaction1,
      rating: 5,
      comment: "Excellent!",
    });

    console.log("  - Effect: A new review record is created and its ID is returned.");
    assertExists(result.review, "Expected a review ID to be returned.");
    const reviews = await reviewing._getReviewsByReviewer({ reviewer: alice });
    assertEquals(reviews.length, 1);
    assertEquals(reviews[0].review.rating, 5);
    assertEquals(reviews[0].review.comment, "Excellent!");
  });

  await t.step("should fail if rating is outside the 1-5 range", async () => {
    console.log("\nTest: submitReview - invalid rating");
    console.log("  - Requirement check: Rating is not between 1-5.");
    const resultLow = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: "tx:2" as ItemTransaction, rating: 0, comment: "Too low" });
    assertExists(resultLow.error, "Should return an error for rating < 1.");
    assertEquals(resultLow.error, "Rating must be between 1 and 5.");

    const resultHigh = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: "tx:3" as ItemTransaction, rating: 6, comment: "Too high" });
    assertExists(resultHigh.error, "Should return an error for rating > 5.");
    assertEquals(resultHigh.error, "Rating must be between 1 and 5.");
  });

  await t.step("should fail if a review already exists for the same reviewer and transaction", async () => {
    console.log("\nTest: submitReview - duplicate review");
    console.log("  - Setup: Alice has already reviewed Bob for transaction1.");
    console.log("  - Requirement check: Attempt to submit another review for the same pair.");
    const result = await reviewing.submitReview({
      reviewer: alice,
      reviewee: bob,
      transaction: transaction1,
      rating: 1,
      comment: "Trying again",
    });

    console.log("  - Effect check: Action fails and returns an error.");
    assertExists(result.error);
    assertEquals(result.error, "A review for this transaction by this user already exists.");
  });

  await client.close();
});

Deno.test("Action: editReview", async (t) => {
  const [db, client] = await testDb();
  const reviewing = new ReviewingConcept(db);

  const initialResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction1, rating: 4, comment: "Good." });
  assertExists(initialResult.review);
  const reviewId = initialResult.review;

  await t.step("should allow the original reviewer to edit within the time window", async () => {
    console.log("\nTest: editReview - successful edit");
    console.log("  - Requirement: User is original reviewer, within 72 hours, valid rating.");
    const result = await reviewing.editReview({ review: reviewId, editor: alice, newRating: 5, newComment: "Actually, it was great!" });

    console.log("  - Effect: Review rating and comment are updated.");
    assertEquals(result, {});
    const updatedReview = await reviewing._getReviewById({ review: reviewId });
    assertEquals(updatedReview[0].review.rating, 5);
    assertEquals(updatedReview[0].review.comment, "Actually, it was great!");
  });

  await t.step("should fail if the editor is not the original reviewer", async () => {
    console.log("\nTest: editReview - unauthorized user");
    console.log("  - Requirement check: User (Bob) is not the original reviewer (Alice).");
    const result = await reviewing.editReview({ review: reviewId, editor: bob, newRating: 1, newComment: "I disagree!" });
    assertExists(result.error);
    assertEquals(result.error, "Only the original reviewer can edit this review.");
  });

  await t.step("should fail if the edit window has passed", async () => {
    console.log("\nTest: editReview - outside time window");
    const oldDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
    const oldReviewId = "review:old" as ID;
    await db.collection("Reviewing.reviews").insertOne({ _id: oldReviewId, reviewer: charlie, reviewee: alice, transaction: "tx:old", rating: 3, comment: "Old comment", createdAt: oldDate });

    console.log("  - Requirement check: Review was created more than 72 hours ago.");
    const result = await reviewing.editReview({ review: oldReviewId, editor: charlie, newRating: 4, newComment: "Late edit" });
    assertExists(result.error);
    assertEquals(result.error, "Review can only be edited within 72 hours of submission.");
  });

  await client.close();
});

Deno.test("Action: deleteReview", async (t) => {
  const [db, client] = await testDb();
  const reviewing = new ReviewingConcept(db);

  const initialResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction1, rating: 4, comment: "To be deleted." });
  assertExists(initialResult.review);
  const reviewId = initialResult.review;

  await t.step("should fail if the deleter is not the original reviewer", async () => {
    console.log("\nTest: deleteReview - unauthorized user");
    console.log("  - Requirement check: User (Bob) is not the original reviewer (Alice).");
    const result = await reviewing.deleteReview({ review: reviewId, deleter: bob });
    assertExists(result.error);
    assertEquals(result.error, "Only the original reviewer can delete this review.");
  });

  await t.step("should allow the original reviewer to delete the review", async () => {
    console.log("\nTest: deleteReview - successful deletion");
    console.log("  - Requirement: User is original reviewer.");
    const result = await reviewing.deleteReview({ review: reviewId, deleter: alice });
    assertEquals(result, {});
    const reviewCheck = await reviewing._getReviewById({ review: reviewId });
    assertEquals(reviewCheck.length, 0, "Review should be deleted.");
  });

  await t.step("should fail if the review does not exist", async () => {
    console.log("\nTest: deleteReview - non-existent review");
    console.log("  - Requirement check: Review ID does not exist.");
    const result = await reviewing.deleteReview({ review: "review:fake" as ID, deleter: alice });
    assertExists(result.error);
    assertEquals(result.error, "Review not found.");
  });

  await client.close();
});
```

# trace:

The principle of the `Reviewing` concept is that after a transaction, both parties can review each other to build community trust. The following trace demonstrates this:

1.  **Setup**: We have two users, Alice and Bob, who have just completed a transaction `transaction1`.
2.  **Action**: Alice submits a review for Bob.
    *   `reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction1, rating: 5, comment: "Great experience!" })`
    *   **Effect**: A new `Review` document is created in the database, with Alice as the `reviewer` and Bob as the `reviewee`. The action returns the ID of this new review.
3.  **Action**: Bob submits a review for Alice for the same transaction.
    *   `reviewing.submitReview({ reviewer: bob, reviewee: alice, transaction: transaction1, rating: 4, comment: "Alice was a great recipient." })`
    *   **Effect**: A second `Review` document is created, this time with Bob as the `reviewer` and Alice as the `reviewee`.
4.  **Verification**: The system can now retrieve these reviews to display them.
    *   A query for all reviews on `transaction1` (`_getReviewsForTransaction`) will now return two documents, one from Alice and one from Bob.
    *   A query for all reviews received by Bob (`_getReviewsByReviewee`) will show the 5-star review from Alice.
    *   A query for all reviews received by Alice (`_getReviewsByReviewee`) will show the 4-star review from Bob.

This sequence fulfills the concept's purpose by successfully capturing mutual feedback for a single transaction, making it visible to the community (via queries) and establishing a foundation of trust.