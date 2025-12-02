---
timestamp: 'Tue Dec 02 2025 04:11:17 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251202_041117.a639546d.md]]'
content_id: 0a493427ebdfb6b08f2f74560b4a11a1f2a4e18cec473b9c641b3bfaaef82f2d
---

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
