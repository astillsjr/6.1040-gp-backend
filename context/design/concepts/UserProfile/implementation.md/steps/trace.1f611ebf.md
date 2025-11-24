---
timestamp: 'Mon Nov 24 2025 15:54:02 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251124_155402.5a895931.md]]'
content_id: 1f611ebfc51864854f4fc3807e9089eb7af45301ad2f5f58707d9cb995d41f7e
---

# trace:

The principle test trace demonstrates the core functionality as follows:

1. **Setup**: Two new users, Bob and Charlie, create profiles in different dorms ("Simmons Hall" and "East Campus", respectively). An existing user, Alice, is already in "Simmons Hall" from a previous test step.
2. **Action**: The system performs a query using `_getUsersByDorm` for "Simmons Hall".
3. **Result**: The query correctly returns a list containing Alice and Bob, but not Charlie. This fulfills the first part of the principle: "other users can find them by dorm".
4. **Action**: The system performs a query using `_getProfile` for Bob.
5. **Result**: The query returns Bob's full profile, which includes his display name "Bob". This fulfills the second part of the principle: "see their display name".
6. **Conclusion**: The sequence of creating profiles and then successfully querying for them by dorm demonstrates that the concept's principle is correctly implemented.
