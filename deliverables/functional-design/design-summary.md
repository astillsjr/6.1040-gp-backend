# Design Summary

## Overall Design

Our primary design goal with our project is to make a resource-sharing platform for MIT students that is not only noticeably more organized than the existing methods that are in place,  but that it is also easy and inviting to use. We seek to create a service that users will **choose** to use over things like Dormspam, and as such we have to make an application that is functional, but simple enough that there is no barrier of entry. Our feature evolve around personal user interactions that are low-effort to use, and make it as easy as possible to lend and borrow items, regardless of location, time, or any other factor. 

## Concepts

Our features outlined in our problem framing revolve around ten different concepts that work together to accomplish this goal.

-  Foundational User Concepts
	-  UserAuthentication and UserProfile
	-  Standard concepts for a good user experience that ensures a safe and personal experience
-  Core Functionality
	-  ItemListing, Borrowing, ItemRequest, and ItemTransfer
	-  These are the concepts that do the primary work in order to address our defined problem. These concepts allow for an organized way for people to lend and borrow items in an efficient and non-complex fashion. Including parameters for location, availability times, and category, these concepts ensure that the exchange of items are MIT is a quick and seamless experience that is also secure.
-  User Experience Enhancements
	-  Reputation and Rewards
	-  These concepts allow for a more complete and innovative experience in our service. Through a reputation system, we are able to build trust with our users, and establish a system that is viewed as reliable and safe by everyone who uses it. 
	-  Our reward system is how we add innovation to our project. Having incentives as a part of our application increases the satisfaction that users may gain from this app, and also allows ourselves to stand out from other similar projects that may have a similar idea.
-  Functional Additions
	-  Communcation and Notifications
	-  These are final concepts that round out the user experience and make our service more complete. In an application where exchange of items is the main focus, in-app messaging is a welcome addition that just makes for more seamless usage,

## Ethical Analysis Concerns

We address most of our concerns in the ethical analysis itself. The main takeaway is that by limiting our application to MIT students, we ensure a safe and reliable system that is more resistant to usage by an unintended audience. We also place a focus on making our app easy and intuitive to use, in order to reduce the barrier of entry level for new users.

## Remaining Issues

The primary issue that remains unclear is how to establish a proper verification system for users in order to ensure that they are MIT affiliated. The ideal way would be to use Kerberos, but that is a possibility that we are still unsure of and requires further research.