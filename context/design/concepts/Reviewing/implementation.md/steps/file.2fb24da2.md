---
timestamp: 'Tue Dec 02 2025 04:11:17 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251202_041117.a639546d.md]]'
content_id: 2fb24da28dbb253c8375885e6d18a612779711c477822b2e4d7404294f57322d
---

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
