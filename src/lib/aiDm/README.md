This folder contains narration adapters.

- `mockDm.ts`: deterministic placeholder narrator
- `ollamaClient.ts`: minimal client for calling a local Ollama HTTP API
- `dmPrompt.ts`: prompt + parser for strict JSON narration

The rules engine remains authoritative; the LLM only generates narration text.
