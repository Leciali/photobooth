# System Architecture — Photo Booth Ecosystem
_Revision 2 — schema completed, LAN routing bug fixed_

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 VENUE NETWORK                                     |
|                                                                                   |
|  +------------------------+                      +-----------------------------+  |
|  |   iPad / Kiosk Client  |   (LAN, mDNS host:   |     Local Print Server      |  |
|  |   (Next.js PWA UI)     |=== print-server.local=|  (Node.js Daemon + SQLite)  |  |
|  +-----------+------------+      :8080 Fallback) +--------------+--------------+  |
|              |                                                  |                 |
|              | (Internet / Cloud Sync)                          | (USB Tether)    |
|              v                                                  v                 |
|  +-----------+------------+                      +--------------+--------------+  |
|  |  Supabase Realtime/DB  |<====================>|    Dye-Sublimation Printer  |  |
|  +-----------+------------+   (Print Job Queue)  |    (DNP DS620 / Citizen)    |  |
|              |                                   +-----------------------------+  |
|              v                                                                    |
|  +-----------+------------+                      +-----------------------------+  |
|  |  Cloudflare R2 Storage |                      |   Guest Smartphone (QR Code)|  |
|  |  (Images & Composites) |=====================>|   (Next.js Gallery Page)    |  |
|  +------------------------+                      +-----------------------------+  |
+-----------------------------------------------------------------------------------+
```

**Fix from v1:** the kiosk previously fell back to `http://localhost:8080`, which is wrong — the kiosk (iPad) and the daemon (laptop) are different physical devices. The daemon must advertise itself via **mDNS/Bonjour** as `photobooth-print-server.local:8080`, and the kiosk always targets that hostname, never `localhost`. See WORKFLOW.md §2.

---

## 2. Component Specifications

### 2.1 Frontend (Kiosk Client, Gallery, Admin Dashboard)
* **Framework:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.
* **State Management:** Zustand — session capture state, countdown timers, offline sync queue.
* **Graphics & Rendering:** HTML5 Canvas for real-time 300 DPI composite. (No WebGL/Fabric.js dependency for MVP — plain Canvas 2D is sufficient and cuts a dependency; revisit only if perf profiling shows a need.)

### 2.2 Backend & Storage Layer
* **Database:** Supabase PostgreSQL, Realtime channel subscriptions.
* **Storage:** Cloudflare R2 (S3-compatible), custom CDN domain.
* **Edge Compute:** Supabase Edge Functions — webhook verification, analytics aggregation, scheduled cleanup, and the async Agent-Vision enhancement pass (see AGENTS.md).

### 2.3 Local Print Daemon
* **Runtime:** Node.js daemon (single runtime choice for MVP — drop the Python option from v1 to avoid maintaining two toolchains).
* **Capabilities:**
  * Subscribes to `print_jobs` via Supabase Realtime.
  * Advertises itself on the venue LAN via mDNS as `photobooth-print-server.local`.
  * Runs a local HTTP/WebSocket server (port 8080) for zero-latency direct printing when offline.
  * Local SQLite is the durable queue; Supabase is synced to, not required to be up.
  * System spooler interface: CUPS (`lp`) on macOS/Linux, Windows Print Spooler CLI on Windows.

---

## 3. Data Schema (Core Entities)

### `operators`
* `id` (UUID, PK, = `auth.users.id`)
* `email` (VARCHAR, Unique)
* `display_name` (VARCHAR)
* `role` (ENUM: `owner`, `staff`)
* `created_at` (TIMESTAMP)

### `events`
* `id` (UUID, PK)
* `slug` (VARCHAR, Unique)
* `name` (VARCHAR)
* `owner_id` (UUID, FK -> operators.id)
* `template_id` (UUID, FK -> templates.id, Nullable)
* `is_active` (BOOLEAN)
* `gallery_expires_at` (TIMESTAMP, Nullable — null = never expires)
* `created_at` (TIMESTAMP)

### `templates`
_Extracted from the old `events.template_config` blob so frames are reusable across events._
* `id` (UUID, PK)
* `owner_id` (UUID, FK -> operators.id)
* `name` (VARCHAR)
* `config` (JSONB: layout, dimensions, dpi_offsets, margins, overlay_url, sticker_positions)
* `created_at` (TIMESTAMP)

### `printers`
_New — required for Agent-PrintOps failover/load-balancing logic referenced in AGENTS.md._
* `id` (UUID, PK)
* `event_id` (UUID, FK -> events.id)
* `name` (VARCHAR, e.g. "DNP DS620 #1")
* `daemon_hostname` (VARCHAR, e.g. `photobooth-print-server.local`)
* `status` (ENUM: `online`, `offline`, `error`, `paper_low`, `ink_low`)
* `is_backup` (BOOLEAN, Default: false)
* `last_heartbeat_at` (TIMESTAMP)

### `sessions`
* `id` (UUID, PK)
* `event_id` (UUID, FK -> events.id)
* `session_code` (VARCHAR, Index)
* `status` (ENUM: `capturing`, `processing`, `completed`, `failed`)
* `raw_photos` (TEXT[])
* `composite_url` (TEXT)
* `enhanced_url` (TEXT, Nullable — output of async Agent-Vision pass, PRD §4.1)
* `download_count` (INTEGER, Default: 0)
* `created_at` (TIMESTAMP)

### `print_jobs`
* `id` (UUID, PK)
* `session_id` (UUID, FK -> sessions.id)
* `event_id` (UUID, FK -> events.id)
* `printer_id` (UUID, FK -> printers.id, Nullable until assigned)
* `image_url` (TEXT)
* `copies` (INTEGER, Default: 1)
* `status` (ENUM: `queued`, `printing`, `printed`, `failed`)
* `retry_count` (INTEGER, Default: 0)
* `error_message` (TEXT, Nullable)
* `created_at` (TIMESTAMP)
* `printed_at` (TIMESTAMP, Nullable)

See `supabase-schema.sql` for the runnable DDL, including RLS policies.

---

## 4. Security Model (summary — full detail in PRD §5)
* All tables have RLS enabled; operators can only read/write rows scoped to their own `owner_id` / event tree.
* Guest-facing routes (gallery, kiosk) use anonymous Supabase auth with session-scoped, time-limited access — never the operator's credentials.
* R2 uploads always go through a presigned URL issued by an Edge Function, never a client-held long-lived credential.
