---
timestamp: 'Tue Nov 25 2025 19:58:37 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_195837.708c2521.md]]'
content_id: 24d5c115b85acd72905b090e1f6bbd46a62e10b2b645357cec60dc57b5c15cb4
---

# response:

You are correct to be cautious about these. Those routes were added to the concepts specifically to enable the synchronization logic, and they should **not** be exposed publicly. Exposing them would create security vulnerabilities and allow users to see data they shouldn't.

**The short answer is: All five of these routes must be added to the `exclusions` list.**

Here is the reasoning for each one:

* **`/api/ItemRequesting/*` (all three routes):** These queries expose the details of private requests between users. A random person should not be able to query the system to see who is requesting what item. They are internal tools used by the syncs to orchestrate the transaction logic.
* **`/api/ItemTransaction/_getTransaction`:** Similar to the above, this exposes the details of a private transaction between two users. It should only be accessible through an authenticated and authorized flow.
* **`/api/UserAuthentication/_getUserFromToken`:** This is the most critical one to exclude. This query is the very mechanism used to *authenticate* a user within a sync. If it were a public passthrough route, anyone could use it to check the validity of any access token they find, which is a security risk. It is a tool for the backend, not an endpoint for the frontend.

Based on this analysis, here is the updated and correct `passthrough.ts` file with these routes properly excluded.

***
