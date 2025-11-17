---
timestamp: 'Mon Nov 17 2025 05:38:18 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251117_053818.40871fba.md]]'
content_id: 80f06ec00f3c71bd781e8740dc162827c95176f1fbb26b445aebe2ee633c6dd7
---

# Concept: LikertSurvey

**concept** LikertSurvey \[User, Target]

**purpose**
To gather quantifiable feedback from users on a subject by having them rate their agreement with various statements on an ordered, balanced scale.

**principle**
If an administrator creates a survey with a set of questions and an associated scale (e.g., from 'Strongly Disagree' to 'Strongly Agree'), and attaches it to a target item, then when multiple users submit their responses to the questions, the system can aggregate this data to provide a quantitative measure of sentiment, such as the average score for each question.

**state**

```
a set of Surveys with
  a target Target
  a title String
  a questions set of Question
  a scale set of ScaleOption

a set of Questions with
  a prompt String
  a survey Survey

a set of ScaleOptions with
  a label String
  a value Number
  a survey Survey

a set of Responses with
  a respondent User
  a question Question
  an option ScaleOption
```

**actions**
`createSurvey (target: Target, title: String, questions: [String], scale: [{label: String, value: Number}]) : (survey: Survey)`
**requires**
`title` is not empty.
The `questions` array is not empty.
The `scale` array contains at least two options.
No other survey exists for the given `target`.
**effects**
Creates a new `Survey` instance `s` and associates it with the given `target` and `title`.
For each string `p` in the `questions` input, creates a new `Question` with prompt `p` and associates it with survey `s`.
For each `{label, value}` pair in the `scale` input, creates a new `ScaleOption` with that `label` and `value` and associates it with survey `s`.
Returns the newly created `survey`.

`submitResponse (user: User, question: Question, option: ScaleOption)`
**requires**
The given `question` exists.
The given `option` belongs to the scale of the survey associated with the `question`.
**effects**
If a `Response` from the given `user` for the given `question` already exists, its `option` is updated to the new `option`.
Otherwise, a new `Response` is created linking the `user`, `question`, and `option`.

`deleteSurvey (survey: Survey)`
**requires**
The given `survey` exists.
**effects**
The `survey` is deleted.
All `Question` instances associated with the `survey` are deleted.
All `ScaleOption` instances associated with the `survey` are deleted.
All `Response` instances whose `question` is associated with the `survey` are deleted.

**queries**
`getSurveyForTarget (target: Target) : (survey: Survey)`
**requires** A survey exists for the given `target`.
**effects** Returns the `Survey` associated with the `target`.

`getUserResponse (user: User, question: Question) : (option: ScaleOption)`
**requires** The `user` has submitted a response for the `question`.
**effects** Returns the `ScaleOption` selected by the `user` for that `question`.

`getQuestionResults (question: Question) : (results: [{option: ScaleOption, count: Number}])`
**requires** The `question` exists.
**effects**
Returns a list of result objects. Each object contains a `ScaleOption` from the question's survey and the `count` of how many users selected that option for the given `question`.
