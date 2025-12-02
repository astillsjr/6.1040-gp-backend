---
timestamp: 'Tue Dec 02 2025 04:11:17 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251202_041117.a639546d.md]]'
content_id: 5859601c84a6f8121e188ab776f07310b81cabc654cea5c1fa5dc88fddcc4e82
---

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
