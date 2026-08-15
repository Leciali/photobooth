# AGENTS.md — Instructions for AI Coding Agents

This file is for tools like Claude Code, Cursor, or any AI agent working in this repo. It is **not** the same as `docs/AGENTS.md`, which specifies the product's own automation agents (Agent-Vision, Agent-PrintOps, Agent-Insights) — read that separately when relevant.

## Before doing anything
Read, in order: `docs/PRD.md` → `docs/ARCHITECTURE.md` → `docs/TODO.md`. Do not start writing code until you know what phase the project is in (`docs/TODO.md`) and what's explicitly out of scope (`docs/PRD.md` §6).

## Working conventions
- **Follow the build order in `docs/SETUP.md` §5.** Don't jump to the real Canvas compositor or real printer integration before the upload/session pipeline is validated with stubs. This order exists to de-risk hardware/network integration separately from app logic.
- **Schema changes go through `supabase/schema.sql` first.** If a task requires a new column or table, propose the DDL change and update `docs/ARCHITECTURE.md` §3 to match — don't let the two drift apart.
- **Never route kiosk → print daemon via `localhost`.** They are different physical devices. Use the mDNS hostname (`photobooth-print-server.local`) per `docs/WORKFLOW.md` §2. If you write code with `localhost:8080` in the kiosk-to-daemon path, that's a bug — stop and re-check.
- **Print daemon is a separate Node.js project**, not part of the Next.js app (see `docs/SETUP.md` §4). Don't merge them.
- **RLS is mandatory** on every Supabase table. If you create a new table, write its RLS policy in the same migration — don't leave it open "temporarily."
- **Real-time path stays light.** The 2.5s composite-processing budget (`docs/PRD.md` §3) means no heavy ML/background-removal calls in the synchronous capture→preview flow. Anything like that goes in the async Agent-Vision pass.

## When picking up a task from TODO.md
- Check off items only once they're actually working end-to-end, not just scaffolded.
- If you discover something TODO.md missed, add it under the relevant phase rather than silently doing extra work — keep the roadmap accurate for the next session (human or agent).
- Don't build anything listed under "Explicitly deferred" in `docs/TODO.md` unless the user asks for it by name.

## Environment
- Credentials come from `.env.local` (gitignored). Never commit real keys — `.env.example` is the only env file that belongs in the repo.
- `pip`/`npm` installs: standard, no special flags needed for this stack.

## Commit style
Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), scoped to the phase/component being touched, e.g. `feat(daemon): add mDNS advertisement`.
