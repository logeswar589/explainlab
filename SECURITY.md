# Security policy

ExplainLab is an early local application. Security fixes target the current development version. There is no guaranteed response time or long-term-support commitment.

## Reporting a vulnerability

If this repository's **Security** tab offers **Report a vulnerability**, use that private reporting flow. The option depends on repository settings and may not be enabled.

If private reporting is unavailable, open an issue asking the maintainer for a private contact method. Keep that initial issue free of exploit steps, private source text, credentials, and other sensitive details. Do not assume that a public issue is a private security channel.

When a private channel is available, include the affected version, reproduction steps, expected security boundary, observed behavior, and any suggested mitigation. Use synthetic data in examples.

## Intended boundaries

- The server binds to the loopback interface for use on the same computer.
- The Ollama endpoint is configured on the server, not supplied by the browser.
- Input limits, same-origin mutation checks, static-file restrictions, and timeouts reduce accidental exposure and misuse.
- Source text and model output are untrusted. The interface should render them as text, and the server should validate the lesson structure and source references.
- A submitted passage can contain misleading instructions. Model prompts and output validation do not guarantee immunity to prompt injection or factual errors.

There is no authentication or authorization system for a public deployment. Do not expose this app directly to the internet as a multi-user service. Adding public hosting would require a separate security design.

## Local data

Saved lessons live in the current browser profile. Anyone with access to that profile may be able to read them. Markdown and JSON exports can contain source material. Generation sends source text to the configured Ollama endpoint; use an endpoint and model appropriate for the sensitivity of that text.
