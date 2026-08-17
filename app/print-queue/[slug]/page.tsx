"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PrintJob, Event, Printer, PrintJobStatus } from "@/lib/types/database";
import {
  Printer as PrinterIcon,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

const STATUS_META: Record<PrintJobStatus, { label: string; color: string }> = {
  queued: { label: "Antre", color: "bg-blue-100 text-blue-700 border-blue-200" },
  printing: { label: "Mencetak", color: "bg-amber-100 text-amber-700 border-amber-200" },
  printed: { label: "Selesai", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed: { label: "Gagal", color: "bg-red-100 text-red-700 border-red-200" },
};

const DEMO_EVENT: Event = {
  id: "demo-event",
  slug: "demo",
  name: "Wedding Reception & Party 2026",
  owner_id: "demo",
  template_id: null,
  is_active: true,
  price_per_session: 25000,
  is_payment_enabled: true,
  gallery_expires_at: null,
  created_at: new Date().toISOString(),
};

export default function PrintQueuePage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadQueue() {
      // Resolve event by slug
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      const resolved = (eventData as Event) || DEMO_EVENT;
      setEvent(resolved);

      // Load printers
      const { data: printerData } = await supabase
        .from("printers")
        .select("*")
        .eq("event_id", resolved.id);
      setPrinters((printerData as Printer[]) || []);

      // Load print jobs
      const { data: jobData } = await supabase
        .from("print_jobs")
        .select("*")
        .eq("event_id", resolved.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setJobs((jobData as PrintJob[]) || []);

      setLoading(false);

      // Realtime subscription
      const channel = supabase
        .channel(`print-queue-${resolved.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "print_jobs", filter: `event_id=eq.${resolved.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setJobs((prev) => [payload.new as PrintJob, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setJobs((prev) =>
                prev.map((j) => (j.id === (payload.new as PrintJob).id ? (payload.new as PrintJob) : j))
              );
            }
          }
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }

    loadQueue();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [slug]);

  const refreshJobs = async () => {
    if (!event) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setJobs(data as PrintJob[]);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const counts = {
    queued: jobs.filter((j) => j.status === "queued").length,
    printing: jobs.filter((j) => j.status === "printing").length,
    printed: jobs.filter((j) => j.status === "printed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <PrinterIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Monitor Antrean Cetak</p>
                <p className="text-xs text-slate-500 leading-tight">{event?.name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                online
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {online ? "Cloud Online" : "Offline — LAN Relay"}
            </span>
            <button
              onClick={refreshJobs}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Segarkan"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{counts.queued}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Dalam Antrean</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{counts.printing}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Sedang Cetak</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{counts.printed}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Berhasil</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-red-600">{counts.failed}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Gagal</p>
          </div>
        </div>

        {/* Printers */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Status Printer
          </h2>
          {printers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">
              Belum ada printer terdaftar. Tambahkan di panel admin.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {printers.map((printer) => (
                <div
                  key={printer.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm">{printer.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{printer.daemon_hostname}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {printer.is_backup && (
                      <span className="text-[10px] font-bold uppercase bg-slate-900 text-white px-2 py-1 rounded-full">
                        Backup
                      </span>
                    )}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        printer.status === "online"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : printer.status === "error"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : printer.status === "paper_low"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {printer.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job list */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Riwayat Cetak Terbaru
          </h2>
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              Belum ada pekerjaan cetak untuk event ini.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {jobs.map((job) => {
                const meta = STATUS_META[job.status] || STATUS_META.queued;
                return (
                  <div key={job.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {job.status === "printed" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : job.status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      ) : job.status === "printing" ? (
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {job.image_url.startsWith("data:")
                            ? "Foto sesi (lokal)"
                            : job.image_url}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatTime(job.created_at)} • {job.copies}x cetak
                          {job.retry_count > 0 && ` • Retry ke-${job.retry_count}`}
                        </p>
                        {job.error_message && (
                          <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {job.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}