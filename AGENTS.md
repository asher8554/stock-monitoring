# AGENTS.md

## Context Compaction Recovery

When this thread resumes after context compaction, summary replacement, context transition, or interrupted work, immediately invoke `$caveman ultra`, not plain `$caveman`, before progress updates, planning, file reads, edits, validation, or final response.

Until the user says `stop caveman` or `normal mode`, every progress update and final response must stay in ultra mode. Use short fragments, no filler, and no long rationale. Treat long explanatory status messages as a recovery-rule violation unless normal clear prose is required for safety or precision.

After invoking `$caveman ultra`, read the newest user request, the available summary, `plan.md`, `checklist.md`, and `context-notes.md`. Continue the active task from the latest verified state instead of restarting from scratch.

Use normal clear prose when compression could create ambiguity, especially for security warnings, irreversible operations, multi-step instructions, code, commands, generated files, validation errors, and user interview questions. Resume `$caveman ultra` for concise conversational updates after those clear sections unless the user says `stop caveman` or `normal mode`.

For non-trivial work, keep `plan.md`, `checklist.md`, and `context-notes.md` current. Record decisions, assumptions, verification results, and resume-critical details before long operations or final response.
