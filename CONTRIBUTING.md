# Contributing to ExplainLab

Thanks for helping make difficult material easier to understand. Small, focused changes are welcome.

## Run the project

Use Node.js 22 or newer. There are no external npm dependencies to install.

```sh
npm start
npm test
```

The first command runs the local app; run the test command in a separate terminal, or stop the server first. Curated samples work without Ollama. Live generation requires a running Ollama service and a downloaded text model.

## Before changing behavior

For a substantial feature, describe the problem and a concrete example in an issue first. For a bug report, include your operating system, Node version, steps to reproduce, expected behavior, and what happened. For model-related problems, include the model name and Ollama version if available. Use a small non-sensitive input that demonstrates the problem; do not share secrets, private documents, or personal data.

## Pull requests

Keep a pull request focused on one problem. Explain the observable before-and-after behavior and how you verified the change. Run `npm test` for code changes; add meaningful tests when they protect behavior that could regress.

For interface changes, check keyboard navigation, narrow screens, readable contrast, and source-reference interactions. Verify that sample lessons remain visibly labeled and work without a model. For generation changes, preserve clear errors and never silently substitute a sample for failed inference.

## Content and source references

Use original or appropriately licensed sample text. Every concept, step, and quiz answer must point to valid source paragraph IDs. Do not imply that a valid paragraph reference proves a statement is true. Make assumptions and source gaps visible in the lesson caveat.

New samples should be short enough to inspect manually and contain four concepts, four steps, and three quiz questions. Follow the existing shape in `public/examples.json` and the [architecture notes](docs/ARCHITECTURE.md).

## Scope

The current focus is a local, understandable app with a small dependency footprint. Avoid adding hosted accounts, analytics, subscriptions, or a large framework unless an issue establishes a specific need and a maintainer agrees on the approach.

By submitting a contribution, you agree that it may be distributed under this repository's MIT license.
