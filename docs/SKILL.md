# Skill Definition: Photobooth Orchestration

## Metadata
* **Skill Name:** `photobooth-ops`
* **Version:** 1.1.0
* **Category:** Hardware-Software Integration & Event Ops

---

## Capabilities & Toolsets
1. **Print Queue Diagnostic:** Inspect real-time status of `print_jobs`, identify stuck spools, network deadlocks, or `retry_count` approaching the failover threshold (see AGENTS.md §2.2).
2. **Template Generator:** Validate and compile `templates.config` JSONB — DPI offsets, margins, custom stickers, frame masks.
3. **Storage Sync Auditor:** Audit Cloudflare R2 bucket against Supabase `sessions`/`print_jobs` records to detect orphaned files or un-synced local buffers (relevant after an offline-to-online resync, WORKFLOW.md §2.4).
4. **Local Daemon Configuration:** Generate/update the print daemon's config (Node.js only as of Revision 2 — see ARCHITECTURE.md §2.3) including mDNS advertisement name and static-IP fallback.
5. **Printer Fleet Status:** Read/update `printers.status` and `last_heartbeat_at` for multi-printer venues (post-MVP feature, schema is ready ahead of time).
