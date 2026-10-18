# Architecture

ExplainLab is a local Node.js application with a vanilla JavaScript interface. It uses Node's built-in HTTP server, fetch, and test runner; no external npm packages are required. The supported runtime is Node.js 22 or newer.

## Request flow

```text
Browser interface
  |-- curated sample --> GET /api/examples --> original prewritten lesson
  |-- available models --> GET /api/models --> configured Ollama service
  |-- source + audience + depth + model --> POST /api/explain
  |                                           |
  |                                      validate request
  |                                      number paragraphs
  |                                      request structured lesson
  |                                           |
  |                                      Ollama service
  |                                           |
  |                                      validate model output
  |<-- lesson + numbered source paragraphs ----|
  |
  |-- explicit Save --> browser local storage
  |-- export --> Markdown or JSON download
```

The server listens on `127.0.0.1:4173` by default. `PORT` changes the port. `OLLAMA_URL` configures the server's Ollama endpoint and defaults to `http://127.0.0.1:11434`; `OLLAMA_MODEL` optionally supplies a default model. The browser does not choose an endpoint URL.

## HTTP API

| Route | Behavior |
| --- | --- |
| `GET /api/health` | Returns `{ "ok": true, "version": "0.1.0" }` |
| `GET /api/models` | Reports availability and model names as `{ available, models, message? }` |
| `GET /api/examples` | Returns the curated sample array from `public/examples.json` |
| `POST /api/explain` | Validates an input, generates a lesson, and returns `{ lesson, paragraphs, model }` |

A generation request contains `source` (80–20,000 characters), `audience` (`developer`, `student`, or `everyday`), `depth` (`simple`, `balanced`, or `deep`), and `model`. Failures return an appropriate HTTP status and an `{ error }` object. A failed generation is never replaced with an unmarked curated sample.

## Numbering the source

Trim the full source and split it on blank lines using `/\n\s*\n/`. Paragraph IDs are `S1`, `S2`, and so on, in source order. A passage without a blank line is one paragraph, even if it has several single line breaks.

The response exposes these as `{ id, text }` objects. The browser can use the same rule to show sample source paragraphs. Clicking a reference opens the corresponding passage. A reference is a traceability aid; structural validation cannot determine whether a paragraph actually supports a claim.

## Lesson shape

```json
{
  "title": "A short lesson title",
  "summary": "An overview grounded in the supplied text.",
  "concepts": [
    {
      "id": "c1",
      "title": "A concept",
      "explanation": "What it means.",
      "analogy": "A useful comparison, clearly treated as an analogy.",
      "sourceIds": ["S1"]
    }
  ],
  "connections": [
    { "from": "c1", "to": "c2", "label": "helps explain" }
  ],
  "steps": [
    { "title": "A step", "detail": "What to do or follow.", "sourceIds": ["S1"] }
  ],
  "quiz": [
    {
      "question": "A question about the source?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Why the selected answer is correct.",
      "sourceIds": ["S1"]
    }
  ],
  "caveat": "What this source leaves out and what remains uncertain."
}
```

This is an abbreviated shape illustration, not a complete valid lesson: a real lesson needs 3–6 concepts, 1–8 connections, 3–6 steps, and 3–5 quiz questions. Every quiz has exactly four options and a zero-based answer index from 0 to 3. Every concept, step, and question has at least one source ID, and every referenced ID must exist. Connection endpoints must identify two distinct existing concepts.

String lengths are bounded. Malformed responses are rejected before the interface receives a usable lesson. Validation catches structural failures and nonexistent references; it does not prove factual correctness or defeat every prompt-injection attempt.

The model-facing quiz schema uses `correctOption`, an exact copy of one option's text, instead of `answer`. The server requires a unique exact match and derives the zero-based `answer` index for the public lesson format above. This avoids asking the model to count option positions, which caused an answer/explanation mismatch during a real-model test. It cannot guarantee that the selected answer is factually correct.

## Curated samples

Each sample has `id`, `audience`, `title`, `description`, `source`, and `lesson`. Samples follow the same lesson contract but are original prewritten content. The default lesson explains JavaScript debounce; two alternatives cover photosynthesis and a fictional camera. Each has four concepts, four steps, three questions, and three or four connections.

The interface labels samples explicitly. Their availability does not imply that Ollama is connected or that live generation has succeeded.

## Storage and trust

An unsaved source or lesson stays in the current page state. Explicitly saving a lesson writes it to this browser's local storage. The server does not keep a lesson database. Exports write portable copies, which can contain the original input.

Generation sends the source through the app server to the configured Ollama service. Local inference depends on using a locally served model; choosing another endpoint or provider changes that boundary. Logs must avoid source text.

Requests have bounded bodies, mutation requests are checked for same-origin use, static paths are restricted, and model calls have timeouts and abort handling. These are defenses for a local application, not a public-service security design. Model output and source text must remain untrusted when rendered.

## Extending the app

Keep the source-paragraph rules consistent between the server and browser. When changing the lesson contract, update validation, generation prompts, rendering, exports, and samples together. Prefer tests that exercise observable request or validation behavior over tests that duplicate implementation details.

The server exports `createServer` so tests can start an isolated instance. It starts listening automatically only when invoked as the application entry point.
