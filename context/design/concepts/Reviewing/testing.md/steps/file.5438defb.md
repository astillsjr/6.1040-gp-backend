---
timestamp: 'Tue Dec 02 2025 04:17:13 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251202_041713.2e30dfbc.md]]'
content_id: 5438defbc9890324cd720449b603af9ba8906f7e0bccc24365cc795043484d8d
---

# file: src/concepts/Reviewing/ReviewingConcept.test.ts

```typescript
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReviewingConcept, { ReviewDoc } from "./ReviewingConcept.ts";
import { ObjectId } from "npm:mongodb";

Deno.test("ReviewingConcept", async (t) => {
  // Mock data for testing
  const alice = "user:alice" as ID;
  const bob = "user:bob" as ID;
  const charlie = "user:charlie" as ID;
  const transaction1 = "tx:1" as ID;
  const transaction2 = "tx:2" as ID;

  await t.step("Principle Test: Both parties can review a completed transaction", async () => {
    console.log("\n--- TRACE: Testing Principle ---");
    const [db, client] = await testDb();
    const reviewing = new ReviewingConcept(db);

    console.log("Action: Alice (provider) reviews Bob (recipient) for transaction 1.");
    const aliceReviewResult = await reviewing.submitReview({
      reviewer: alice,
      reviewee: bob,
      transaction: transaction1,
      rating: 5,
      comment: "Bob was a great recipient, very communicative!",
    });
    assertExists(aliceReviewResult, "Alice's review submission should return a result.");
    assertEquals("review" in aliceReviewResult, true, "Alice's review submission should be successful.");
    const aliceReviewId = (aliceReviewResult as { review: ID }).review;

    console.log("Action: Bob (recipient) reviews Alice (provider) for transaction 1.");
    const bobReviewResult = await reviewing.submitReview({
      reviewer: bob,
      reviewee: alice,
      transaction: transaction1,
      rating: 4,
      comment: "Smooth transaction, thanks Alice!",
    });
    assertExists(bobReviewResult, "Bob's review submission should return a result.");
    assertEquals("review" in bobReviewResult, true, "Bob's review submission should be successful.");
    const bobReviewId = (bobReviewResult as { review: ID }).review;

    console.log("Verification: Query for all reviews associated with transaction 1.");
    const reviewsForTx = await reviewing._getReviewsForTransaction({ transaction: transaction1 });
    assertEquals(reviewsForTx.length, 2, "There should be two reviews for the transaction.");

    const alicesReviewDoc = reviewsForTx.find((r) => r.review._id === aliceReviewId)?.review;
    const bobsReviewDoc = reviewsForTx.find((r) => r.review._id === bobReviewId)?.review;

    assertExists(alicesReviewDoc, "Alice's review should be found.");
    assertExists(bobsReviewDoc, "Bob's review should be found.");

    console.log("Verification: Check the content of both reviews.");
    assertObjectMatch(alicesReviewDoc, {
      reviewer: alice,
      reviewee: bob,
      rating: 5,
      comment: "Bob was a great recipient, very communicative!",
    });
    assertObjectMatch(bobsReviewDoc, {
      reviewer: bob,
      reviewee: alice,
      rating: 4,
      comment: "Smooth transaction, thanks Alice!",
    });

    console.log("Principle fulfilled: Both parties successfully reviewed the transaction, and the reviews are visible.");
    await client.close();
  });

  await t.step("Action: submitReview", async (t) => {
    await t.step("Effects: Creates a new review on valid input", async () => {
      const [db, client] = await testDb();
      const reviewing = new ReviewingConcept(db);

      console.log("\n--- Test: submitReview success case ---");
      const result = await reviewing.submitReview({
        reviewer: alice,
        reviewee: bob,
        transaction: transaction2,
        rating: 5,
        comment: "Excellent!",
      });

      assertEquals("review" in result, true, "Should return a review ID on success.");
      const reviewId = (result as { review: ID }).review;

      const [retrieved] = await reviewing._getReviewById({ review: reviewId });
      assertExists(retrieved, "The created review should be retrievable.");
      assertObjectMatch(retrieved.review, {
        _id: reviewId,
        reviewer: alice,
        reviewee: bob,
        transaction: transaction2,
        rating: 5,
        comment: "Excellent!",
      });
      await client.close();
    });

    await t.step("Requires: Fails if rating is outside the 1-5 range", async () => {
      const [db, client] = await testDb();
      const reviewing = new ReviewingConcept(db);

      console.log("\n--- Test: submitReview requires rating > 0 ---");
      const lowRatingResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction2, rating: 0, comment: "Too low" });
      assertEquals("error" in lowRatingResult, true, "Should return error for rating < 1.");
      assertEquals(lowRatingResult.error, "Rating must be between 1 and 5.");

      console.log("\n--- Test: submitReview requires rating <= 5 ---");
      const highRatingResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction2, rating: 6, comment: "Too high" });
      assertEquals("error" in highRatingResult, true, "Should return error for rating > 5.");
      assertEquals(highRatingResult.error, "Rating must be between 1 and 5.");

      await client.close();
    });

    await t.step("Requires: Fails if a review already exists for the reviewer/transaction pair", async () => {
      const [db, client] = await testDb();
      const reviewing = new ReviewingConcept(db);

      console.log("\n--- Test: submitReview requires no duplicate review ---");
      await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction2, rating: 4, comment: "First review" });
      const duplicateResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction2, rating: 3, comment: "Second review attempt" });

      assertEquals("error" in duplicateResult, true, "Should return an error for a duplicate review.");
      assertEquals(duplicateResult.error, "A review for this transaction by this user already exists.");

      const reviews = await reviewing._getReviewsForTransaction({ transaction: transaction2 });
      assertEquals(reviews.length, 1, "Only one review should exist after a failed duplicate submission.");
      await client.close();
    });
  });

  await t.step("Action: editReview", async (t) => {
    // Setup: Create a review to be edited in subsequent tests
    const [db, client] = await testDb();
    const reviewing = new ReviewingConcept(db);
    const initialReviewResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction1, rating: 3, comment: "Okay." });
    const reviewId = (initialReviewResult as { review: ID }).review;

    await t.step("Effects: Updates rating and comment for a valid edit", async () => {
      console.log("\n--- Test: editReview success case ---");
      const editResult = await reviewing.editReview({ review: reviewId, editor: alice, newRating: 4, newComment: "Good." });
      assertEquals("error" in editResult, false, "Valid edit should not return an error.");

      const [updatedReview] = await reviewing._getReviewById({ review: reviewId });
      assertExists(updatedReview, "Updated review should exist.");
      assertEquals(updatedReview.review.rating, 4);
      assertEquals(updatedReview.review.comment, "Good.");
    });

    await t.step("Requires: Fails if editor is not the original reviewer", async () => {
      console.log("\n--- Test: editReview requires correct editor ---");
      const wrongEditorResult = await reviewing.editReview({ review: reviewId, editor: charlie, newRating: 5, newComment: "I'm Charlie" });
      assertEquals("error" in wrongEditorResult, true, "Should return an error for wrong editor.");
      assertEquals(wrongEditorResult.error, "Only the original reviewer can edit this review.");
    });

    await t.step("Requires: Fails if the edit window has passed", async () => {
      console.log("\n--- Test: editReview requires being within time window ---");
      // Manually update the document's createdAt to be in the past
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      await reviewing.reviews.updateOne({ _id: reviewId }, { $set: { createdAt: fourDaysAgo } });

      const lateEditResult = await reviewing.editReview({ review: reviewId, editor: alice, newRating: 5, newComment: "Too late" });
      assertEquals("error" in lateEditResult, true, "Should return an error for a late edit.");
      assertEquals(lateEditResult.error, "Review can only be edited within 72 hours of submission.");
    });

    await t.step("Requires: Fails for non-existent review", async () => {
      console.log("\n--- Test: editReview requires review to exist ---");
      const nonExistentReviewId = new ObjectId().toString() as ID;
      const result = await reviewing.editReview({ review: nonExistentReviewId, editor: alice, newRating: 5, newComment: "Does not exist" });
      assertEquals(result.error, "Review not found.");
    });

    await client.close();
  });

  await t.step("Action: deleteReview", async (t) => {
    const [db, client] = await testDb();
    const reviewing = new ReviewingConcept(db);
    const reviewResult = await reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction1, rating: 2, comment: "To be deleted." });
    const reviewId = (reviewResult as { review: ID }).review;

    await t.step("Requires: Fails if deleter is not the original reviewer", async () => {
      console.log("\n--- Test: deleteReview requires correct deleter ---");
      const wrongDeleterResult = await reviewing.deleteReview({ review: reviewId, deleter: charlie });
      assertEquals("error" in wrongDeleterResult, true, "Should return error for wrong deleter.");
      assertEquals(wrongDeleterResult.error, "Only the original reviewer can delete this review.");

      // Verify the review still exists
      const stillExists = await reviewing._getReviewById({ review: reviewId });
      assertEquals(stillExists.length, 1, "Review should not be deleted by wrong user.");
    });

    await t.step("Effects: Permanently removes the review record", async () => {
      console.log("\n--- Test: deleteReview success case ---");
      const deleteResult = await reviewing.deleteReview({ review: reviewId, deleter: alice });
      assertEquals("error" in deleteResult, false, "Valid deletion should not return an error.");

      // Verify the review is gone
      const gone = await reviewing._getReviewById({ review: reviewId });
      assertEquals(gone.length, 0, "Review should be deleted.");
    });

    await t.step("Requires: Fails for non-existent review", async () => {
      console.log("\n--- Test: deleteReview requires review to exist ---");
      const result = await reviewing.deleteReview({ review: reviewId, deleter: alice });
      assertEquals(result.error, "Review not found.");
    });

    await client.close();
  });
});
```
