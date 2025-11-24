I have taken some very loose notes on suggestions for how to refactor your concepts. Note that these are not super refined, so please use your best judgement. I also created some draft states for the concepts I suggested (FYI, I may have left out some trivial state). This should help you reduce the amount of things you need to implement by creating more modular and reusable concepts! Below are my comments, please let me know if you have further questions!

- Extract Item as its own standalone concept
  - store dormVisibility in the ItemListing concept
  - status (LISTED/UNLISTED) does not need to be stored, you can calculate it when needed by using findOne on ItemListing
  - we set owner to be optional in the case that someone wants to make an item request 

- Expand ItemListing concept to include 
  - a type (BORROW or TRANSFER)
  - dormVisibility
  - a status

- Remove ItemTransfer, ItemRequest, Borrowing and consolidate functionality into Requesting, ItemTransaction (see below)
  - ItemTransfer is handled with an instance of Item but with no owner field (also marked as the ITEM type in Reqeusting and ItemTransaction)

- Create Requesting
  - only need to store requester because we know the requestee from the Item owner
  - store type (BORROW or TRANSFER or ITEM)
  - requesterNotes

- Create ItemTransaction concept
  - this helps store any transactions
  - store type (BORROW or TRANSFER or ITEM)
    - an ItemRequest
  - item associated with transaction is stored, store 

- Split up Reputation into Reviewing and Flagging
  - I would skip the Flagging concept for now, can implement later if needed
  - We can use the reviews to calculate the user reputation scores when needed
  - The totalLends and totalBorrows should be calculated using the Borrowing concept
  - If you would like to store the scores, you can do so in the UserProfile concept!

- Combine the Transactions + Redemptions in the Rewarding concept
  - I would skip out on the types of transactions/redemptions, seems unnecessary (?), it would be a lot more annoying to handle the expiring stuff than i feel is worth lol

Item // to be used in all other concepts that use Item
- a set of Items with:
  - owner?
  - title, description, category, description, condition, createdAt

ItemListing
- set of Items
  - type: BORROW, TRANSFER
  - dormVisibility
  - status: AVAILABLE, PENDING, CLAIMED, EXPIRED
- set of ItemPhotos
  - item, photoUrl, order number
- set of AvailabilityWindows 
  - item, startTime, endTime, status

ItemTransactions
- set of ItemTransactions
  - from, to
  - item
  - type: BORROW, TRANSFER, ITEM
  - createdAt, approvedAt, etc.
  - fromNotes, toNotes

Requesting
- set of Requests
  - requester
  - item
    - we know who the owner is bc that is stored in the item
    - in the case of ITEM request, item does not have an owner
  - type: BORROW, TRANSFER, ITEM
    - BORROW means “requester” is requesting to borrow the item
    - TRANSFER means “requester” is requesting to transfer the item
    - ITEM means “requester” is requesting item, item has no owner. NOTE: ITEM is a special case, so be aware of how you handle someone resolving this request with their own item
  - description
  - category
  - createdAt
  - NOTE we handle the approvedAt/returnedAt/etc + lender/borrower notes in the ItemTransaction concept

Reviewing
- set of Reviews with:
  - reviewer
  - reviewee
  - rating
  - comment
  - type: Lender or Borrower // can remove this, you are storing the borrower/lender in the BorrowRequest
  - transaction BorrowRequest
  - createdAt
// we use the reviews to calculate the user reputation
// if you would like to store the scores, you can do so in the UserProfile concept!
// then update the scores in syncs

Flagging // I would skip this concept for now
- set of UserFlags:
  - flagger, flagged
  - reason
  - status: PENDING, RESOLVED, DISMISSED
  - createdAt
  - resolvedAt

Rewarding
- set of Users with points
- a set of PointTransactions 
  - user, amount (+ or -)
  - description (reason or redemptionType)
  - transaction? // store associated transaction???
  - createdAt

Notification
Communication
