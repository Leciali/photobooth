# Implementation Roadmap (TODO) — Photo Booth Ecosystem
_Revision 2 — agents wired in, security/schema gaps closed_

## Phase 0: Project Setup (do this first — see SETUP.md)
- [ ] Create Supabase project, run `supabase-schema.sql`.
- [ ] Create Cloudflare R2 bucket + API token, configure custom domain.
- [ ] Scaffold Next.js 14 project (App Router, TypeScript, Tailwind, shadcn/ui).
- [ ] Copy `.env.example` → `.env.local`, fill in Supabase + R2 credentials.
- [ ] Create first `operators` row for yourself (owner role) via Supabase Auth.

## Phase 1: MVP Core (Web Client & Cloud Architecture)
- [ ] Configure Supabase Auth (operator login) and confirm RLS policies from schema work as expected.
- [ ] Build presigned-URL upload route (Edge Function) for R2.
- [ ] Build Kiosk Capture UI: WebRTC camera stream + 3‑2‑1 countdown.
- [ ] Implement client-side Canvas 300 DPI composite engine (plain Canvas 2D, no WebGL for MVP).
- [ ] Wire session creation: insert `sessions` row, upload raw photos + composite to R2.
- [ ] Generate and display guest QR code pointing to gallery page.

## Phase 2: Local Print Server & Daemon
- [ ] Build Node.js print daemon with Supabase Realtime listener on `print_jobs`.
- [ ] Implement mDNS self-advertisement (`photobooth-print-server.local`) — **do not use `localhost` anywhere in kiosk-to-daemon communication.**
- [ ] Integrate native print command utility (CUPS `lp` / Windows Print Spooler CLI).
- [ ] Implement local HTTP fallback server (port 8080) for offline LAN mode, per WORKFLOW.md §2.
- [ ] Implement local SQLite queue + resync-on-reconnect logic (WORKFLOW.md §2.4).
- [ ] Implement retry/failover state machine: `retry_count`, `failed` status, admin flag (WORKFLOW.md §3, AGENTS.md §2.2).
- [ ] Test print queue latency against both Print Spool Latency (<20s) and Physical Print Latency (<15s) targets separately.

## Phase 3: Guest Gallery & Admin Dashboard
- [ ] Build mobile-friendly Guest Gallery page (per-session, honors `gallery_expires_at`).
- [ ] Increment `sessions.download_count` on guest download action.
- [ ] Build Admin Dashboard: operator auth, create/edit events, upload templates, manage `printers` rows.
- [ ] Build live print queue view (Realtime subscription on `print_jobs`).
- [ ] Implement session analytics: print count, download count, peak hours (Agent-Insights basic counters, AGENTS.md §2.3).

## Phase 4: Production Hardening & Offline Resiliency
- [ ] Service worker for offline PWA caching on iPad.
- [ ] End-to-end test: offline-to-online automatic data sync, including image re-upload.
- [ ] Load-test print retry/failover path with a simulated printer failure.
- [ ] Hardware enclosure spec + venue deployment runbook (mDNS setup, static-IP fallback config per WORKFLOW.md §2).
- [ ] Design spike: Agent-Vision async enhancement pipeline (Edge Function vs external ML service) — decide before building.
- [ ] Security pass: confirm RLS policies, presigned URL expiry, gallery link expiry all match PRD §5.

## Explicitly deferred (see PRD §6)
- Multi-printer load balancing beyond single-backup failover.
- AI background removal / smart lighting in the real-time path.
- Tethered DSLR live-view.
- Multi-tenant / multi-organization support (PRD §7 — revisit only if this becomes a multi-client product).
