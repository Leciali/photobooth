# Product Requirement Document (PRD) — Photo Booth Web App
_Revision 2 — fixes metric inconsistencies from v1_

## 1. Executive Summary
A cloud-first, event-ready photo booth ecosystem: seamless digital capture, real-time framing, instant digital delivery (QR/download page), and automated physical print queues via a local print server. Built to run a single event today, but designed so it can be sold to multiple event operators later without a rewrite (see §7).

---

## 2. Target Users & Personas
1. **Event Guests** — intuitive, fast, high-quality experience, zero learning curve.
2. **Event Operators / Photobooth Owners** — uptime, offline resilience, fast queue-to-print throughput, live analytics, easy template setup.
3. **Clients / Event Hosts** — branded templates, instant digital gallery sharing, reliability.

---

## 3. Product Goals & Success Metrics
Two latency metrics were conflated in v1. They are now split and both are authoritative:

| Metric | Definition | Target |
|---|---|---|
| **Composite Processing Latency** | From last shot captured → composite preview shown on kiosk | < 2.5s |
| **Print Spool Latency** | From guest tapping "Confirm/Print" → print job status = `printing` (spool accepted by printer) | < 20s |
| **Physical Print Latency** | From `printing` → photo physically dispensed | < 15s (printer-hardware dependent, DNP DS620 baseline) |

* **Offline Resilience:** 100% operational on LAN during internet outages, with automatic background sync once connectivity returns.
* **Uptime & Reliability:** Zero missed print jobs during an active event session (jobs may queue/retry, never silently drop).

---

## 4. Feature Breakdown & Requirements

### 4.1 Guest Capture Interface (Kiosk / iPad Web App)
Welcome → Countdown (3‑2‑1) → Multi-shot capture (1–4 frames) → Frame/filter selection → Review & Confirm → QR code.
* Live camera via WebRTC/MediaDevices API, with tethered DSLR live-view as a stretch goal (not MVP).
* Composite rendering: HTML5 Canvas at 300 DPI export. **Heavy AI enhancement (background removal, smart lighting — see Agent-Vision in AGENTS.md) is explicitly OUT of the 2.5s real-time path in MVP.** It runs as an optional async enhancement pass on the R2-stored image after the guest already has their preview/print, not before.

### 4.2 Local Print Server & Daemon
* Queue Listener: Supabase Realtime subscription, with local SQLite queue as source of truth when offline.
* Print Automation: CUPS (macOS/Linux) or Windows Print Spooler CLI, targeting dye-sub printers (DNP DS620 / Citizen / HiTi).
* Hardware Status Monitoring: paper level, ink/ribbon status, job errors, latency telemetry, retry count (max 2 retries → flag admin + failover, see AGENTS.md §2.2).

### 4.3 Digital Delivery & Cloud Infrastructure
* Object Storage: Cloudflare R2, zero-egress, stores originals + composites + optional Boomerang/GIF.
* Database & Auth: Supabase (PostgreSQL, Realtime, Edge Functions, Row Level Security).
* Guest Gallery: mobile-optimized page via per-session QR code, with download/share and event branding. **QR link expires 72h after event end** (configurable per event) — see ARCHITECTURE.md §3 `events.gallery_expires_at`.

### 4.4 Admin Dashboard
* Create/edit events, upload frame templates, monitor live print queue, view session analytics.
* Requires authenticated operator accounts with role separation (owner vs staff) — see ARCHITECTURE.md `operators` table.

---

## 5. Non-Functional Requirements
* **Platform Compatibility:** PWA, iOS Safari (iPadOS), Chrome, Edge.
* **Security:** Signed upload URLs for R2, RLS on every Supabase table, ephemeral guest session identifiers, expiring gallery links, role-based access on admin dashboard.
* **Network Tolerance:** Automatic switch between cloud Supabase path and Local LAN Relay (mDNS `.local` hostname — never `localhost`, since kiosk and daemon are separate physical devices; see WORKFLOW.md §2).

---

## 6. Out of Scope for MVP
* AI background removal / smart lighting (moved to post-processing, async).
* Tethered DSLR live-view.
* Multi-printer load balancing (single printer per venue in MVP; schema supports future expansion).

---

## 7. Future Direction: Multi-Tenancy
Current schema is single-operator/single-venue per deployment. If this becomes a product sold to multiple event businesses (not just one client), `events` needs an `organization_id` foreign key and RLS policies scoped by org. This is flagged now so the schema (§ARCHITECTURE.md) can be extended later without a breaking migration — not required for MVP launch.
