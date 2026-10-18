# ExplainLab launch notes

These notes describe positioning and outreach experiments for the initial release. They do not imply that the user research or promotion below has been performed.

## Positioning to test

**Paste something confusing. Explore an explanation, follow its source references, and check what you understood.**

ExplainLab turns pasted code, study notes, or everyday instructions into a short lesson with a concept map and quiz. Its proposed appeal is the combination of inspectable source passages, no account requirement, and inference through a locally running Ollama model. The three curated samples let people inspect the experience before installing a model.

This is a differentiation hypothesis. AI explanations, visual lessons, quizzes, and account-free interfaces already exist. Source references help readers inspect a claim; they do not prove that a model's interpretation is correct. The first release should earn repeat use through clear explanations and low setup friction, rather than claim to explain every subject reliably.

## Existing projects worth learning from

These comparisons summarize the projects' own documentation, reviewed on October 17, 2026. Features may change.

| Project | Existing capability | ExplainLab hypothesis to validate |
| --- | --- | --- |
| [PDF to Interactive Lesson](https://github.com/Nutlope/pdf-to-interactive-lesson) | Converts PDFs into structured courses, quizzes, and ordering questions using Together AI; documents cloud storage and database services. | A smaller paste-to-lesson workflow with local inference may appeal to people who want to understand a short passage without creating a whole course. |
| [ClassroomPanel](https://github.com/rowant-labs/classroompanel) | Provides an interactive tutoring board, practice, and learner records; supports bring-your-own-provider keys and no accounts, with a separate fixed demo. | Source-linked explanations spanning code, notes, and instructions may offer a useful focused workflow. No login and clearly labeled demos are shared practices, not exclusive features. |

Avoid claims such as "the first," "most accurate," "completely private in every configuration," or "guaranteed to go viral." Describe the default local setup precisely. A remote Ollama endpoint or a cloud-backed model changes where content is processed.

## Three memorable demo cases

| Audience | Sample | Moment to show |
| --- | --- | --- |
| Developer | **Why does a search box wait before searching?** The JavaScript debounce sample. | Select the timer concept, open its source passage, and answer what happens when another keystroke arrives before the delay ends. |
| Student | **Where does a plant's food come from?** The photosynthesis sample. | Follow the relationship between light, inputs, and sugar; inspect the relevant paragraph before answering the quiz. |
| Everyday | **Why did my camera not focus?** The fictional camera quick-start sample. | Open the focus step and its source reference, then check the order of the shutter actions. Keep the camera explicitly fictional. |

Use the bundled original samples. Do not imply that they are model outputs from the current session.

## A concrete 30-second product demo

Record the curated debounce sample with its **prewritten sample** label visible. This clip demonstrates the interface, not inference speed.

| Time | On-screen action | Suggested narration |
| --- | --- | --- |
| 0–5 seconds | Open the debounce example and show the source. | "This small function is confusing at first glance." |
| 5–12 seconds | Open Explanation and select a source reference. | "Read the explanation, then jump back to the passage it points to." |
| 12–20 seconds | Open Concept map and select the timer concept. | "Explore how the timer and repeated calls relate." |
| 20–26 seconds | Answer one quiz question and reveal its explanation. | "Check whether you understood what happens next." |
| 26–30 seconds | Show the sample label and model settings. | "This is a prewritten demo. Connect a local Ollama model to explain your own text." |

Publish a separate live-generation recording only after a real run succeeds. State the model, hardware, source length, and elapsed time; label any accelerated or edited wait. A sample result must never substitute silently for a failed live run.

## Practical launch sequence

1. **Make the first run dependable.** Verify the README on a fresh checkout, the three samples, source navigation, quiz feedback, save/export, model selection, and the no-Ollama error. Record which operating systems and real models were actually tested. Keep untested combinations explicit.
2. **Run nine early sessions.** Invite three people from each audience when outreach is authorized. Ask them to use their own short material after trying a sample. Observe installation, time to the first useful result, and one task they can complete afterward. Keep observations anonymous and avoid collecting their source text by default.
3. **Fix the common obstacles.** Prioritize misleading explanations, unsupported source references, weak quiz questions, and setup failures. Use these findings to choose the next improvement across all three audiences.
4. **Prepare the public release.** Add the honest demo, clear setup requirements, known limitations, license, contribution guidance, and reproducible issue instructions. Review the actual release contents before publishing the repository and release tag.
5. **Share where the example is relevant.** Prepare separate developer, student, and everyday-use descriptions. Follow each community's self-promotion rules, disclose authorship, and ask for specific feedback. Publication and outreach are later actions; this document does not perform them.
6. **Follow up after a week.** Ask early users whether they returned with new material and what they used instead when they did not. Publish a small changelog of fixes supported by that feedback.

Treat successful live generations, useful source checks, repeat sessions, and actionable contributions as learning signals. Stars can indicate interest, but no star count or growth rate is promised. Do not buy stars, spam communities, or manufacture testimonials.

## Questions for first users

- What were you trying to understand, and which part remained confusing after the lesson?
- Did opening a source reference help you check the explanation? Show one claim whose reference did or did not support it.
- Did the concept map reveal a relationship you missed in the explanation?
- Which quiz question tested understanding, and which felt obvious, ambiguous, or wrong?
- Where did setup or local generation become difficult? What model and machine did you use?
- What material would you bring back next week? If you would use another tool instead, what does it do better?

Record feedback about curated samples separately from feedback about live model output. Sample polish is not evidence of live-generation quality or learning improvement.
