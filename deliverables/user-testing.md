## Task List

The following table lists the tasks used in the user test. Tasks are ordered so that later tasks depend on state created in earlier ones. Each task is tied to central goals of LocalLoop: reducing friction in finding items, simplifying lending, and replacing Dormspam with structured, sustainable sharing.

| Task Title | Instruction to Participant | Rationale for Inclusion |
| ----------- | ----------- | ----------- |
| Create an Account | “Please create a new LocalLoop account using your MIT email.” | Tests whether first-time users can easily onboard. Onboarding friction is a major barrier preventing adoption of alternatives to Dormspam. |
| Set Up Your Profile | “Please add your dorm, your name, and a short bio to your profile.” | User identity and dorm location are essential for trust and logistics. Tests clarity of required fields and visibility settings. |
| Browse for an Item You Need | “Please send a borrow request for any item of interest.” | Browsing/search is core to solving the ‘inefficiency of Dormspam.’ Tests whether users can navigate categorized listings, search, and filters. |
| Post an Item to Lend | “Please list an Ethernet cable you own as available to lend.” | Lending is essential for sustainability and must be easy to encourage participation. Tests whether users can complete the full listing workflow. |
| Log Out and Log Back In | “Please log out and then log back into your account." | Ensures the user understands session controls and can reaccess their listings/requests. Identifies potential navigational issues. |



## User Test Report

### User Test 1

Before beginning the user test, the participant was asked for consent and given a one-sentence explanation of LocalLoop’s purpose. They then proceeded through the task list while thinking aloud, and I took observation notes throughout.

For Task 1 (Create an Account), the participant completed the signup, but paused early on and asked, “Is this supposed to link to MIT Touchstone?” They hesitated between using their MIT email and creating a standalone password. This moment revealed an unexpected gulf of execution: the authentication flow does not match student expectations of campus apps, which almost always integrate with MIT Touchstone. Once they proceeded, they found the form simple and appreciated how “quick” it felt.

During Task 2 (Set Up Your Profile), the participant filled out their name and bio smoothly. However, they hesitated over the Dorm field, reading it aloud and asking whether “other users can see this.” This indicated a gulf of evaluation: the interface does not communicate privacy rules clearly. Still, the participant commented positively that the overall layout was “clean and simple.”

In Task 3 (Browse for an Item), the participant attempted to type their dorm name into the search bar, expecting the system to filter by dorm automatically. They did not initially notice the dorm-filter dropdown. When prompted to continue thinking aloud, they said, “Oh, I thought this search bar searched everything, including location.” This highlighted two issues: (1) the search bar does not match users’ mental model of global search, and (2) filters lack visibility. After discovering the dorm filter, the participant successfully located an item and submitted a request.

Task 4 (Post an Item) went smoothly. The participant completed the form with minor hesitation around the “Condition” and “Category” dropdowns. They verbally wondered what the category options meant—for example, whether “Electronics” included cables or only devices. They still finished the listing quickly and said the form was “straightforward.”

For Task 5 (Log Out / Log In), the participant completed the task without friction, noting it was “easy to find the login again” and that the session behaved as expected.

Overall, the participant described LocalLoop as “promising” and said they would use it “if more people start posting items.” However, their moments of hesitation consistently pointed toward issues of clarity, especially in search, filtering, and transparency of information.

### User Test 2

Before beginning the user test, the participant was asked for their consent and given a one line description of the app's purpose. After that, the participant began to go through the tasks and explore the different user interfaces and actions that are part of LocalLoop. 

In task 1, the user found it pretty straight forward, with no real questions or comments apart from mentioning that it "looks like a pretty standard registration page" but with "less password restrictions that  \[they\] usually encounter." Following that, for task 2, they created their profile with an also confident and intuitive demeanor, only noting that they "want to change their profile picture". From these first introductory tasks, we can conclude that there is very little user friction or barrier or entry for getting started with the application. Apart from a couple of tweaks like adding MIT verification or adding a profile picture changer, the direct and non-complicated profile and register interfaces we have created seem to a smooth part of the user journey.

Following that, the user began the task of browsing and requesting to borrow an item. The user quickly found the item listings page (since they were automatically redirected), and stated that they were impressed with how clean the feed looked. After selecting an item and going to the item page, they quickly went through and filled out the corresponding fields. A quick note, they were very surprised and impressed with the time slot interafce, saying it was "very organized", but were disappointed with how  "massive the time windows are," stating how it seems a little restrictive. This part also seemed to display a little user friction, but there were times where the user hesitated or paused to think about their actions, demonstrating that this UI was nto as intuitive, especially the time selection part.

After creating a request, they were then instructed to create a post for task 4. It took a little for them to find the list button, since they "thought it would be part of the listings page," but then were a little embarrassed that the list button was at the top all along. Once again, they had little trouble filling out the corresponding fields. The primary conclusion made from this that the user did state and appear to be a little overwhelmed by the amount of fields, emphasizing that maybe there is room for simplicity. 

The user then completed task 5 with no difficulty, major comments, or concerns.

One last point to make is that when the user saw the home page, they noted how it seemed so busy and a little misleading with how many elements it had. They stated how the "purpose of the app is simple, in a good way" but "the home page seems so busy, it honestly reflects badly on the purpose" of the application. Once again, highlighting how there is room for improvement in terms of simplicity,


## Flaws & Opportunities for Improvement


1. Unclear Authentication Expectations

Issue: Participant was unsure whether to use standard login or MIT Touchstone.

Cause: Login UI lacks labels or contextual text.

Fix: Add explicit text: “Log in with MIT Touchstone” or “Create password-based account.”


2. Ambiguous Profile Visibility Settings

Issue: Participant unsure whether their dorm would be publicly visible.

Cause: Profile section lacked explanatory text.

Fix: Add short descriptions (e.g., “Dorm visible only to borrowers/lenders you interact with”).


3. Home Page Rework for Simplicity

Issue: Participant clearly stated how the home page of the site is very busy, with a lot of elements that don't serve a clear purpose, and that are a little misleading in terms of appearing like they do.

Cause: Home page displays a lot of text and some stats elements that might not be absolutely necessary. 

Fix: Rework the Home page to be more simple and functional. Some ideas for here could be to limit the amount of explanatory text or make it interactive and maybe a short "sneak-peek" feed of the current items that are listed.


4. Low Visibility of Search Filters

Issue: Participants expected the search bar to filter by dorm automatically; they did not see the dorm dropdown.

Cause: Search bar appears visually dominant; filters are visually secondary and not grouped.

Fix: Increase visual prominence of filters; move them near search bar; add placeholder text “Search items (use filters for dorm).”
