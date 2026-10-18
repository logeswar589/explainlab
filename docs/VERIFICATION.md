# Verification notes

Checked on October 17, 2026, on Windows with Node.js v24.22.0.

## Completed

- `npm test`: 18 passing tests covering the HTTP routes, input and output limits, source references, concept links, quiz answer normalization, cancellation, timeouts, host/origin checks, provider failures, concurrency, and all three shipped samples.
- `node --check public/app.js`: JavaScript syntax passed.
- Twelve ad hoc interface checks using a simulated DOM: samples, concept selection, source dialogs, quiz feedback and reset, save/reopen and duplicate prevention, Markdown/JSON export, audience switching, generated output rendered as text, error recovery, cancellation, and library removal. The simulation harness is not part of the repository test suite and does not validate visual layout.
- Real generation through the local Ollama service using the already-installed `qwen3:4b-instruct` model, the bundled photosynthesis source, student audience, and simple detail level. The final request returned HTTP 200 in about 40 seconds with four concepts and three quiz questions. Each selected quiz answer agreed with its explanation when manually inspected. This is one successful example, not a speed or accuracy benchmark.
- The original live test exposed a mismatch between a model-generated numeric quiz index and its answer explanation. Generation now asks for exact answer text and derives the index in application code. Regression tests cover reordered options, absent answer text, and duplicate options.

## Remaining checks

Browser automation was disabled in the development environment, so rendered desktop/mobile layouts, focus behavior, browser downloads, and assistive-technology behavior have not been visually verified. CSS contains responsive layouts and keyboard focus treatments, but their presence is not proof of a successful browser check.

The configured GitHub Actions matrix targets Node 22 and 24 on Ubuntu. See the [Actions page](https://github.com/logeswar589/explainlab/actions) for remote test results after publication. macOS, rendered browser behavior on Linux, other browsers, and other models were not tested during the local checks above.

Model output may still include incorrect explanations, unsupported citations, or poor questions. Structural validation checks shape and identifiers; it does not establish factual correctness.

## Before public release

Run `npm start` and check the three samples at desktop and phone widths. Use the keyboard to switch tabs, inspect source references, answer a quiz, close dialogs, save/reopen a lesson, and export it. Then generate a lesson from a short original passage using an installed model and inspect its claims against the source. See [LAUNCH.md](LAUNCH.md) for the early-user plan.
