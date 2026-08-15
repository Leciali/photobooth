# Setup Guide — Photo Booth Ecosystem
_Follow in order. This is Phase 0 in TODO.md._

## 1. Supabase
1. Create a new project at supabase.com (pick a region close to your venue for lower latency).
2. Open the SQL Editor → paste and run `supabase-schema.sql` in full.
3. Confirm in Table Editor that `operators`, `templates`, `events`, `printers`, `sessions`, `print_jobs` all exist with RLS enabled (shield icon).
4. Go to Authentication → create your own user (email/password or magic link).
5. In SQL Editor, insert your operator row, replacing the UUID with your new auth user's ID (find it in Authentication → Users):
   ```sql
   insert into operators (id, email, display_name, role)
   values ('YOUR-AUTH-USER-UUID', 'you@example.com', 'Your Name', 'owner');
   ```
6. Project Settings → API → copy `URL` and `anon` key into `.env.local`. Copy `service_role` key too (server-only, never client-exposed).

## 2. Cloudflare R2
1. Create a bucket, e.g. `photobooth-assets`.
2. Create an R2 API token scoped to that bucket (Account → R2 → Manage API Tokens).
3. Optional but recommended: connect a custom domain to the bucket for CDN delivery.
4. Fill `R2_*` values in `.env.local`.

## 3. Next.js Project Scaffold
```bash
npx create-next-app@latest photobooth --typescript --tailwind --app
cd photobooth
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr zustand
```
Copy `.env.example` → `.env.local` and fill in the values from steps 1–2.

## 4. Local Print Daemon (separate Node.js project, runs on the venue laptop — not inside the Next.js app)
```bash
mkdir photobooth-daemon && cd photobooth-daemon
npm init -y
npm install @supabase/supabase-js better-sqlite3 bonjour-service ws
```
* `bonjour-service` handles the mDNS advertisement (`photobooth-print-server.local`) — this is what fixes the offline-routing bug documented in WORKFLOW.md §2. Build this before wiring the kiosk's offline fallback so you have something real to point it at.
* Printer driver: on macOS/Linux, shell out to `lp`; on Windows, use the Print Spooler CLI (`PRINTER_DRIVER=windows-spooler` in env).

## 5. Order of Implementation (maps to TODO.md phases)
1. Get Supabase + R2 wired and confirm you can upload a test image via a presigned URL — before touching camera UI.
2. Build the kiosk capture flow against a **fake/static composite** first (skip the real Canvas renderer initially) so you can validate the session → upload → QR pipeline end to end.
3. Only then build the real 300 DPI Canvas compositor.
4. Build the print daemon against a **mock printer** (just log "would print X") before wiring a real CUPS/Spooler call — this de-risks the mDNS/networking piece separately from the hardware piece.
5. Wire retry/failover logic (WORKFLOW.md §3) once the happy path prints reliably.
6. Gallery + Admin Dashboard.
7. Defer everything in TODO.md's "Explicitly deferred" section until the above is solid end-to-end at one real event.

## 6. Sanity Checklist Before First Live Event
- [ ] Presigned upload → R2 → visible via `R2_PUBLIC_URL` works from an actual iPad on the venue Wi-Fi.
- [ ] Daemon resolves via `photobooth-print-server.local` from the iPad (test with router you'll actually use — some consumer routers block mDNS across subnets).
- [ ] Static-IP fallback tested at least once in case mDNS fails on-site.
- [ ] Pull the venue's internet cable mid-session and confirm local print still works, then confirm resync on reconnect.
- [ ] Confirm RLS: log out as operator, confirm you cannot read another event's `print_jobs`.
