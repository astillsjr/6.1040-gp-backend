---
timestamp: 'Tue Dec 02 2025 04:11:17 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251202_041117.a639546d.md]]'
content_id: 3a8792db93f3980029f8837f9affb63fc432259850cb6ce01464f0cef88eb79c
---

# trace:

The principle of the `Reviewing` concept is that after a transaction, both parties can review each other to build community trust. The following trace demonstrates this:

1. **Setup**: We have two users, Alice and Bob, who have just completed a transaction `transaction1`.
2. **Action**: Alice submits a review for Bob.
   * `reviewing.submitReview({ reviewer: alice, reviewee: bob, transaction: transaction1, rating: 5, comment: "Great experience!" })`
   * **Effect**: A new `Review` document is created in the database, with Alice as the `reviewer` and Bob as the `reviewee`. The action returns the ID of this new review.
3. **Action**: Bob submits a review for Alice for the same transaction.
   * `reviewing.submitReview({ reviewer: bob, reviewee: alice, transaction: transaction1, rating: 4, comment: "Alice was a great recipient." })`
   * **Effect**: A second `Review` document is created, this time with Bob as the `reviewer` and Alice as the `reviewee`.
4. **Verification**: The system can now retrieve these reviews to display them.
   * A query for all reviews on `transaction1` (`_getReviewsForTransaction`) will now return two documents, one from Alice and one from Bob.
   * A query for all reviews received by Bob (`_getReviewsByReviewee`) will show the 5-star review from Alice.
   * A query for all reviews received by Alice (`_getReviewsByReviewee`) will show the 4-star review from Bob.

This sequence fulfills the concept's purpose by successfully capturing mutual feedback for a single transaction, making it visible to the community (via queries) and establishing a foundation of trust.
