### Core User & Identity Concepts

*   **UserAuthentication:** Manages user registration and login, leveraging the MIT Kerberos system to verify identity.
    *   **Implementation Complexity: Low.** The core logic relies on an existing, trusted external system (Kerberos), reducing the need for password management and security protocols from scratch.

*   **UserProfile:** Manages user-facing information such as display name, dorm, and contact preferences.
    *   **Implementation Complexity: Low.** This is primarily a data-centric concept with simple create, read, and update actions.

*   **Session:** Represents an active user's logged-in state, which is essential for authorizing actions across the application.
    *   **Implementation Complexity: Low.** This is a standard concept for managing user sessions, typically involving creating a token on login and deleting it on logout.

### Core Marketplace & Transaction Concepts

*   **ItemListing:** Manages the catalog of items available for lending, including their description, category, photos, availability, and owner.
    *   **Implementation Complexity: Medium.** Involves managing a collection of items with multiple attributes (including images) and handling the full lifecycle (create, update, hide, delete).

*   **ItemLoan:** Manages the entire lifecycle of a borrowing transaction: request, acceptance, scheduled pick-up, confirmation of exchange, and return.
    *   **Implementation Complexity: Medium.** This concept has a clear state machine (e.g., `REQUESTED` -> `ACCEPTED` -> `IN_PROGRESS` -> `COMPLETED`/`CANCELED`). The logic for managing these state transitions correctly is non-trivial.

*   **SourcingRequest:** Allows users to post "micro-requests" for items or materials they need, which other users can then offer to fulfill.
    *   **Implementation Complexity: Medium.** Similar to `ItemListing` but for requests. It requires managing the request's lifecycle from posting to fulfillment by one or more providers.

### Community & Trust Concepts

*   **Reputation:** Calculates and stores reliability scores for both lenders and borrowers based on their transaction history (e.g., timeliness, item condition).
    *   **Implementation Complexity: Medium.** While the state is simple (a score per user), the logic for updating scores based on triggers from `ItemLoan` events can be complex and requires careful design to be fair and effective.

*   **Review:** Allows users to leave qualitative feedback and ratings on a completed loan transaction.
    *   **Implementation Complexity: Low.** This concept involves creating and storing review records linked to a user and a specific loan, which is a straightforward data management task.

*   **Moderation:** Enables users to flag inappropriate listings, problematic users, or damaged items for review by administrators.
    *   **Implementation Complexity: Medium.** Involves managing flags, a review queue for administrators, and actions to resolve issues (e.g., hiding a listing, warning a user). The workflow management adds complexity.

### Engagement & Communication Concepts

*   **Rewards:** Manages the point-based incentive system, tracking points earned by users for lending and responsible borrowing, and potentially managing redemptions.
    *   **Implementation Complexity: Medium.** Involves creating a ledger-like system to track point transactions accurately. The rules for awarding and spending points can add significant business logic.

*   **Messaging:** Provides a direct, in-app communication channel between borrowers and lenders to coordinate logistics.
    *   **Implementation Complexity: High.** A basic version is medium complexity, but a real-time chat system with message history, read receipts, and push notifications is significantly more complex to implement robustly.

*   **Notification:** Handles sending automated reminders and alerts to users (e.g., for pending pick-ups, return deadlines, new messages) via preferred channels.
    *   **Implementation Complexity: Medium.** Requires integration with external services (email, push notifications) and managing user preferences. The logic to trigger notifications at the right time is key.

### Organizational Concepts

*   **Categorization:** Manages the set of available categories and tags (e.g., "Electronics," "Interview Attire") that can be applied to item listings to aid search and discovery.
    *   **Implementation Complexity: Low.** This is typically a simple data management concept, often managed by an administrator, to create and maintain a taxonomy for listings.