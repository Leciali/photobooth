/**
 * photobooth Local Print Daemon
 *
 * - Advertises itself on the venue LAN via mDNS (bonjour-service) as
 *   `photobooth-print-server.local` on port 8080.
 * - Listens to Supabase Realtime for new `print_jobs` rows (status=queued),
 *   downloads the image, dispatches to the native spooler (CUPS `lp` or
 *   Windows Print Spooler), then reports back status=printing / printed.
 * - Runs a local HTTP server for offline LAN printing fallback (kiosk
 *   sends the image directly when internet is down).
 * - Uses SQLite (better-sqlite3) as the durable local queue; resyncs to
 *   Supabase when connectivity returns.
 *
 * Usage: cp ../.env.local .env (or set env vars) && npm start
 */

try {
  require("dotenv").config();
} catch {
  // dotenv optional — env vars may be set by the shell instead
}
const http = require("http");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const bonjour = require("bonjour-service").default || require("bonjour-service");
const { createClient } = require("@supabase/supabase-js");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MDNS_NAME = process.env.DAEMON_MDNS_NAME || "photobooth-print-server";
const HTTP_PORT = Number(process.env.DAEMON_HTTP_PORT || 8080);
const PRINTER_DRIVER = process.env.PRINTER_DRIVER || "cups"; // cups | windows-spooler
const PRINTER_NAME = process.env.PRINTER_NAME || "DNP_DS620";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "queue.sqlite");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// SQLite durable queue (built-in node:sqlite — no native build required)
// ---------------------------------------------------------------------------
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    event_id TEXT,
    image_url TEXT NOT NULL,
    image_local_path TEXT,
    copies INTEGER DEFAULT 1,
    status TEXT DEFAULT 'queued',       -- queued | printing | printed | failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    printed_at TEXT
  );
`);

const insertLocalJob = db.prepare(
  `INSERT OR REPLACE INTO print_jobs (id, session_id, event_id, image_url, image_local_path, copies, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)`
);
const getJob = db.prepare(`SELECT * FROM print_jobs WHERE id = ?`);
const updateJob = db.prepare(
  `UPDATE print_jobs SET status = ?, retry_count = ?, error_message = ?, printed_at = ? WHERE id = ?`
);
const listQueued = db.prepare(`SELECT * FROM print_jobs WHERE status = 'queued' ORDER BY created_at ASC`);

function rowToJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    session_id: row.session_id,
    event_id: row.event_id,
    image_url: row.image_url,
    image_local_path: row.image_local_path,
    copies: row.copies || 1,
    retry_count: row.retry_count || 0,
    error_message: row.error_message,
    printed_at: row.printed_at,
  };
}

// ---------------------------------------------------------------------------
// Supabase (cloud) client — with service role if available
// ---------------------------------------------------------------------------
const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

let online = !!supabase;

function setOnlineStatus(next) {
  if (next === online) return;
  online = next;
  console.log(`[network] ${online ? "ONLINE (cloud)" : "OFFLINE (LAN mode)"}`);
  if (online) {
    syncLocalQueueToCloud().catch((err) => console.error("[sync]", err.message));
  }
}

// ---------------------------------------------------------------------------
// Printing — native spooler dispatch
// ---------------------------------------------------------------------------
function dispatchPrint(imagePathOrUrl, copies) {
  return new Promise((resolve, reject) => {
    let cmd, args;

    if (PRINTER_DRIVER === "windows-spooler") {
      // Windows: copy to spooler via PowerShell + `print` or use a temp file
      cmd = "powershell";
      args = [
        "-NoProfile",
        "-Command",
        `Start-Process -FilePath "print" -ArgumentList '/D:"${PRINTER_NAME}"', '"${imagePathOrUrl}"' -Wait`,
      ];
    } else {
      // CUPS (macOS/Linux): lp -d <printer> -n <copies> <file>
      cmd = "lp";
      args = ["-d", PRINTER_NAME, "-n", String(copies), imagePathOrUrl];
    }

    execFile(cmd, args, { timeout: 60_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout || "ok");
      }
    });
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    if (url.startsWith("data:")) {
      const b64 = url.split(",")[1];
      const buf = Buffer.from(b64, "base64");
      const file = path.join(DATA_DIR, `img-${Date.now()}.png`);
      fs.writeFileSync(file, buf);
      return resolve(file);
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const client = url.startsWith("https") ? require("https") : require("http");
      const file = path.join(DATA_DIR, `img-${Date.now()}.jpg`);
      const out = fs.createWriteStream(file);
      client.get(url, (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} downloading image`));
          return;
        }
        res.pipe(out);
        out.on("finish", () => resolve(file));
        out.on("error", reject);
      }).on("error", reject);
      return;
    }
    reject(new Error(`Unsupported image URL: ${url.slice(0, 40)}`));
  });
}

// ---------------------------------------------------------------------------
// Print a job: download -> dispatch -> record
// ---------------------------------------------------------------------------
async function processJob(job) {
  const key = job.id;
  console.log(`[print] processing job ${key} (${job.copies}x)`);

  try {
    updateJob.run("printing", job.retry_count, null, null, key);
    reportCloudJob(job, "printing").catch(() => {});

    const localPath = job.image_local_path || (await downloadImage(job.image_url));
    await dispatchPrint(localPath, job.copies);

    const now = new Date().toISOString();
    updateJob.run("printed", job.retry_count, null, now, key);
    reportCloudJob(job, "printed", null, now).catch(() => {});
    console.log(`[print] job ${key} PRINTED`);
  } catch (err) {
    const retries = job.retry_count + 1;
    console.error(`[print] job ${key} failed attempt ${retries}: ${err.message}`);

    if (retries <= 2) {
      updateJob.run("queued", retries, err.message, null, key);
      setTimeout(() => {
        try {
          processJob(rowToJob(getJob.get(key)));
        } catch {}
      }, 3000 * retries);
    } else {
      updateJob.run("failed", retries, err.message, null, key);
      reportCloudJob(job, "failed", err.message).catch(() => {});
      console.error(`[print] job ${key} FAILED after ${retries} attempts`);
    }
  }
}

async function reportCloudJob(job, status, errorMessage = null, printedAt = null) {
  if (!supabase || !online) return;
  const { error } = await supabase
    .from("print_jobs")
    .update({
      status,
      ...(errorMessage ? { error_message: errorMessage } : {}),
      ...(printedAt ? { printed_at: printedAt } : {}),
    })
    .eq("id", job.id);
  if (error) console.error(`[cloud] failed to report ${status} for ${job.id}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Supabase Realtime listener (online path)
// ---------------------------------------------------------------------------
function subscribeCloud() {
  if (!supabase) {
    console.log("[cloud] Supabase not configured — running in LAN-only mode");
    setOnlineStatus(false);
    return;
  }

  supabase
    .channel("print-jobs-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "print_jobs", filter: "status=eq.queued" },
      (payload) => {
        const row = payload.new;
        console.log(`[realtime] new queued job ${row.id}`);
        const job = {
          id: row.id,
          session_id: row.session_id,
          event_id: row.event_id,
          image_url: row.image_url,
          image_local_path: null,
          copies: row.copies || 1,
          retry_count: row.retry_count || 0,
          error_message: null,
        };
        insertLocalJob.run(
          job.id,
          job.session_id,
          job.event_id,
          job.image_url,
          job.image_local_path,
          job.copies,
          new Date().toISOString()
        );
        processJob(job).catch(() => {});
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setOnlineStatus(true);
        // Drain anything queued locally while offline
        for (const row of listQueued.all()) {
          processJob(rowToJob(row)).catch(() => {});
        }
      } else {
        setOnlineStatus(false);
      }
    });
}

// ---------------------------------------------------------------------------
// Resync: push local printed jobs + uploads to cloud when back online
// ---------------------------------------------------------------------------
async function syncLocalQueueToCloud() {
  if (!supabase) return;
  for (const row of listQueued.all()) {
    const job = rowToJob(row);
    if (job && job.status === "printed") {
      await reportCloudJob(job, "printed", null, job.printed_at);
    }
  }
}

// ---------------------------------------------------------------------------
// Local HTTP server (offline LAN path) — kiosk POSTs image data
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/print") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 50 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const body = JSON.parse(raw);
        const id = `LAN-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const created = new Date().toISOString();
        const localPath = path.join(DATA_DIR, `${id}.png`);
        if (body.imageDataUrl && body.imageDataUrl.startsWith("data:")) {
          fs.writeFileSync(localPath, Buffer.from(body.imageDataUrl.split(",")[1], "base64"));
        }

        const job = {
          id,
          session_id: body.sessionId || id,
          event_id: body.eventId || "lan-event",
          image_url: body.imageUrl || id,
          image_local_path: localPath,
          copies: body.copies || 1,
          retry_count: 0,
          error_message: null,
        };
        insertLocalJob.run(
          job.id,
          job.session_id,
          job.event_id,
          job.image_url,
          job.image_local_path,
          job.copies,
          created
        );
        console.log(`[lan] received offline print request ${id}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, jobId: id, status: "queued" }));

        processJob(job).catch(() => {});
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        hostname: `${MDNS_NAME}.local`,
        port: HTTP_PORT,
        driver: PRINTER_DRIVER,
        printer: PRINTER_NAME,
        online,
      })
    );
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

// ---------------------------------------------------------------------------
// mDNS advertisement
// ---------------------------------------------------------------------------
const bonjourInstance = new bonjour.Bonjour();
bonjourInstance.publish({
  name: MDNS_NAME,
  type: "http",
  port: HTTP_PORT,
  txt: { app: "photobooth-print-daemon", driver: PRINTER_DRIVER },
});
console.log(`[mdns] advertising ${MDNS_NAME}.local:${HTTP_PORT}`);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
server.listen(HTTP_PORT, () => {
  console.log(`[http] local print server listening on port ${HTTP_PORT}`);
  console.log(`[daemon] photobooth print daemon started (driver=${PRINTER_DRIVER}, printer=${PRINTER_NAME})`);
  subscribeCloud();
});