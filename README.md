# Photobooth Ecosystem

Cloud-first, event-ready photo booth system: kiosk capture (iPad/PWA), local print daemon with offline resilience, guest gallery via QR, and admin dashboard. Stack: Next.js 14, TypeScript, Tailwind, Supabase, Cloudflare R2, Node.js print daemon.

## Read in this order before doing anything
1. `docs/PRD.md` — product requirements, success metrics, scope (what's in vs. explicitly deferred)
2. `docs/ARCHITECTURE.md` — components, data schema, security model
3. `docs/TODO.md` — phased roadmap; **check this first for current status**
4. `docs/WORKFLOW.md` — end-to-end session lifecycle, offline fallback, print retry logic
5. `AGENTS.md` — instructions and conventions for AI coding agents working in this repo (also see `docs/AGENTS.md` for the product-level automation agent specs — Vision/PrintOps/Insights — which are a different thing)
6. `docs/SETUP.md` — step-by-step environment setup and recommended build order
7. `docs/SKILL.md` — photobooth-ops skill definition (print queue diagnostics, template validation, etc.)

## Status
Phase 0 (setup) — see `docs/TODO.md` for the live checklist.

## Quick start
```bash
cp .env.example .env.local   # fill in Supabase + R2 credentials
npm install
npm run dev
```
Full setup instructions, including the separate print-daemon project and Supabase schema, are in `docs/SETUP.md`.

## Repo structure
```
photobooth/
├── docs/                  # product & architecture docs (see reading order above)
├── supabase/
│   └── schema.sql         # run this in the Supabase SQL editor
├── AGENTS.md               # instructions for AI coding agents (Claude Code, Cursor, etc.)
├── .env.example
└── README.md
```

## Key constraints worth remembering
- Kiosk (iPad) and print daemon (venue laptop) are **separate physical devices**. Never route between them via `localhost` — use the daemon's mDNS hostname (`photobooth-print-server.local`). See `docs/WORKFLOW.md` §2.
- Real-time AI enhancement (background removal, smart lighting) is explicitly **out of the 2.5s composite path** — it's an async post-process. See `docs/PRD.md` §4.1 and §6.
- Print retry/failover: max 2 retries before flagging admin and failing over to a backup printer. See `docs/WORKFLOW.md` §3.
