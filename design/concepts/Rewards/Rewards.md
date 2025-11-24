# Rewards

**concept**: Rewards [User]
**purpose**: To incentivize lending and responsible community behavior through a simple, point-based system.
**principle**: When a user performs a positive action, like completing a loan, they are awarded points. These points accumulate in their balance and can be redeemed for community perks.

**state**:
  * a set of RewardAccounts with
	  * a user User
	  * a pointsBalance Number
  * a set of PointTransactions with
	  * a user User
	  * an amount Number
	  * a description String
	  * an optional transaction ItemTransaction
	  * a createdAt Date

**actions**:
  * `initializeAccount (user: User): ()`
	  * **requires**: The user must not already have a rewards account.
	  * **effects**: Creates a rewards account for the user with a balance of 0.
  * `grantPoints (user: User, amount: Number, reason: String): (transaction: PointTransaction)`
	  * **requires**: The amount must be positive.
	  * **effects**: Increases the user's points balance and creates a positive transaction record.
  * `redeemPoints (user: User, amount: Number, redemptionType: String): (transaction: PointTransaction)`
	  * **requires**: The amount must be positive. The user's balance must be >= amount.
	  * **effects**: Decreases the user's points balance and creates a negative transaction record with the redemption type as the description.
  * `revokePoints(user: User, amount: Number, reason: String): (transaction: PointTransaction)`
	  * **requires**: The amount must be positive. This is an administrative action.
	  * **effects**: Decreases the user's `pointsBalance` and creates a negative `PointTransaction` record.