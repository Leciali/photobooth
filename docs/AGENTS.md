# AI Agents & Automation Modules — Photo Booth Ecosystem
_Revision 2 — scoped against MVP, wired into schema_

## 1. Agent Ecosystem Overview
Background workers that enhance guest output and reduce manual ops work. **None of these are required for MVP to function end-to-end** — they layer on top of the core capture → composite → print flow (TODO.md Phases 1–2). Build core first, agents second.

---

## 2. Agent Specifications

### 2.1 Template & Visual Enhancement Agent (`Agent-Vision`)
* **Role:** Background removal, auto-cropping, smart-lighting/exposure correction.
* **Input:** `sessions.composite_url` (already-rendered composite, not the raw camera buffer).
* **Output:** Writes to `sessions.enhanced_url`. Does **not** block the print or guest-preview path — see PRD §4.1 and §6 (Out of Scope for MVP).
* **Trigger:** Async, post-capture, runs as a Supabase Edge Function invoked by a DB trigger on `sessions.composite_url` being set.
* **Status:** Phase 3+ (post-MVP). Do not build before core capture/print loop is stable.

### 2.2 Local Print Queue Supervisor (`Agent-PrintOps`)
* **Role:** Monitors printer status, manages spool retries, load-balances multi-printer setups, detects ink/paper depletion.
* **Health Check Rules:**
  * Daemon writes to `printers.last_heartbeat_at` every 3 seconds.
  * If a `print_jobs` row fails more than 2 times (`retry_count > 2`), flag admin and, if available, re-queue on a printer where `is_backup = true` — see WORKFLOW.md §3 for the exact state machine.
  * If internet drops, daemon switches its own sync channel to Local LAN Relay (WORKFLOW.md §2) — this is daemon-side logic, not a separate agent process.
* **Status:** Core to Phase 2 (Local Print Server). The retry/failover *rule* ships in MVP even though multi-printer load-balancing itself is post-MVP (PRD §6) — single-printer retry logic still needs `retry_count` and the `failed` → admin-flag path.

### 2.3 Event Analytics & Social Agent (`Agent-Insights`)
* **Role:** Analyzes session velocity, popular layout selections, guest dwell time; generates a post-event client summary report.
* **Output:** Markdown/PDF Event Recap Report, generated from `sessions`, `print_jobs`, and `sessions.download_count`.
* **Status:** Phase 3 (Guest Gallery & Admin Dashboard) — basic counts only for MVP (sessions count, print count, download count per PRD's analytics requirement). The narrative "recap report" generation is a nice-to-have for Phase 4, not a blocker.

---

## 3. Build Order
Agents are ordered here by dependency, not by document order:
1. Agent-PrintOps retry rule (needs `retry_count`, ships with Phase 2 daemon).
2. Agent-Insights basic counters (needs `download_count`, ships with Phase 3 dashboard).
3. Agent-PrintOps multi-printer load balancing (needs `printers` table fully wired, post-MVP).
4. Agent-Vision background removal (needs an async pipeline decision — Edge Function vs external ML service — not yet made; flag as a design spike before Phase 4).
