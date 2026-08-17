"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Event, Operator, Template, TemplateConfig } from "@/lib/types/database";
import {
  Camera,
  Plus,
  Play,
  Printer,
  LogOut,
  QrCode,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  LayoutTemplate,
  ImagePlus,
  Upload,
  FolderOpen,
} from "lucide-react";

type Tab = "events" | "create-event" | "templates";

const LAYOUT_LABELS: Record<string, string> = {
  grid: "Klasik 4-in-1",
  diptych: "Duo Momen",
  single: "Foto Tunggal",
};

function detectLayoutFromImage(img: HTMLImageElement): Promise<TemplateConfig["layout"]> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      const W = 240;
      const H = 160;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("grid");
      ctx.drawImage(img, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;

      // Sample a coarse grid; a cell is "transparent" if its mean alpha is low
      const cell = 8;
      const cols = Math.floor(W / cell);
      const rows = Math.floor(H / cell);
      const transparent: boolean[][] = [];
      for (let cy = 0; cy < rows; cy++) {
        transparent[cy] = [];
        for (let cx = 0; cx < cols; cx++) {
          let sum = 0;
          let count = 0;
          for (let y = cy * cell; y < Math.min(cy * cell + cell, H); y += 2) {
            for (let x = cx * cell; x < Math.min(cx * cell + cell, W); x += 2) {
              sum += data[(y * W + x) * 4 + 3];
              count++;
            }
          }
          transparent[cy][cx] = sum / count < 100;
        }
      }

      // Count connected transparent regions (BFS), ignoring tiny holes
      const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
      const minSize = Math.round(cols * rows * 0.02);
      const regionSizes: number[] = [];
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          if (!transparent[cy][cx] || visited[cy][cx]) continue;
          let size = 0;
          const queue: Array<[number, number]> = [[cy, cx]];
          visited[cy][cx] = true;
          while (queue.length > 0) {
            const [y, x] = queue.pop()!;
            size++;
            for (const [dy, dx] of dirs) {
              const ny = y + dy;
              const nx = x + dx;
              if (
                ny >= 0 &&
                ny < rows &&
                nx >= 0 &&
                nx < cols &&
                transparent[ny][nx] &&
                !visited[ny][nx]
              ) {
                visited[ny][nx] = true;
                queue.push([ny, nx]);
              }
            }
          }
          if (size >= minSize) regionSizes.push(size);
        }
      }

      const holes = regionSizes.length;
      if (holes === 4) resolve("grid");
      else if (holes === 2) resolve("diptych");
      else if (holes === 1) resolve("single");
      else resolve("grid");
    } catch {
      resolve("grid");
    }
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("events");

  // Event form state
  const [newEventName, setNewEventName] = useState("");
  const [newEventSlug, setNewEventSlug] = useState("");
  const [newEventPrice, setNewEventPrice] = useState(25000);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(true);
  const [newEventTemplateId, setNewEventTemplateId] = useState("");
  const [creating, setCreating] = useState(false);

  // Template upload state
  const [templateName, setTemplateName] = useState("");
  const [templateLayout, setTemplateLayout] = useState<TemplateConfig["layout"]>("grid");
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formMsg, setFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      const supabase = createClient();

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/login");
        return;
      }

      const { data: opData } = await supabase
        .from("operators")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (opData) {
        setOperator(opData as Operator);
      } else {
        // Demo fallback so the dashboard is usable before the database is wired
        const mockOperator: Operator = {
          id: authData.user.id,
          email: authData.user.email || "staff@photobooth.app",
          display_name: authData.user.email?.split("@")[0] || "Crew Staff",
          role: "owner",
          created_at: new Date().toISOString(),
        };
        setOperator(mockOperator);
      }

      // Fetch events via server API (service role) — reliable regardless of RLS policy state
      try {
        const res = await fetch("/api/events");
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setEvents(json.data as Event[]);
        } else {
          const defaultEvent: Event = {
            id: "demo-event-id-001",
            slug: "wedding-reception-2026",
            name: "Wedding Reception & Party 2026",
            owner_id: authData.user.id,
            template_id: null,
            is_active: true,
            price_per_session: 25000,
            is_payment_enabled: true,
            gallery_expires_at: null,
            created_at: new Date().toISOString(),
          };
          setEvents([defaultEvent]);
        }
      } catch {
        const defaultEvent: Event = {
          id: "demo-event-id-001",
          slug: "wedding-reception-2026",
          name: "Wedding Reception & Party 2026",
          owner_id: authData.user.id,
          template_id: null,
          is_active: true,
          price_per_session: 25000,
          is_payment_enabled: true,
          gallery_expires_at: null,
          created_at: new Date().toISOString(),
        };
        setEvents([defaultEvent]);
      }

      // Fetch templates via server API (service role) — reliable regardless of RLS policy state
      try {
        const res = await fetch("/api/templates");
        const json = await res.json();
        if (json.success && json.data) setTemplates(json.data as Template[]);
      } catch {
        // keep empty list
      }

      setLoading(false);
    }

    loadDashboardData();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventSlug) return;

    setCreating(true);
    setFormMsg(null);

    try {
      const slugClean = newEventSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      const newEventData = {
        name: newEventName,
        slug: slugClean,
        template_id: newEventTemplateId || null,
        price_per_session: Number(newEventPrice),
        is_payment_enabled: isPaymentEnabled,
      };

      const apiRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEventData),
      });
      const apiData = await apiRes.json();

      if (!apiRes.ok || !apiData.data) {
        setFormMsg({
          type: "error",
          text: `Gagal membuat event: ${apiData.message || "terjadi kesalahan"}`,
        });
        return;
      }

      setEvents((prev) => [apiData.data as Event, ...prev]);
      setFormMsg({ type: "success", text: "Event baru berhasil dibuat!" });
      setNewEventName("");
      setNewEventSlug("");
      setNewEventTemplateId("");
      setActiveTab("events");
    } catch {
      setFormMsg({ type: "error", text: "Gagal membuat event." });
    } finally {
      setCreating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setTemplateImage(dataUrl);
      setTemplatePreview(dataUrl);
      // Auto-detect layout from the frame's transparent photo cutouts
      try {
        const img = new window.Image();
        img.onload = async () => {
          const layout = await detectLayoutFromImage(img);
          setTemplateLayout(layout);
        };
        img.src = dataUrl;
      } catch {
        // keep current layout
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !templateImage) return;

    setUploadingTemplate(true);
    setFormMsg(null);

    try {
      const slugClean = templateName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

      // Upload overlay image (R2 if configured, otherwise stored as data URL fallback)
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: templateImage,
          filename: `frame-${slugClean}-${Date.now()}.png`,
          folder: "templates",
        }),
      });
      const uploadData = await uploadRes.json();
      const overlayUrl = uploadData.url || templateImage;

      const config: TemplateConfig = {
        layout: templateLayout,
        overlay_url: overlayUrl,
        thumbnail_url: uploadData.url || null,
      };

      // Save via server API (service role) so RLS policy issues never block it
      const apiRes = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          config,
        }),
      });
      const apiData = await apiRes.json();

      if (!apiRes.ok || !apiData.data) {
        setFormMsg({
          type: "error",
          text: `Gagal menyimpan bingkai ke database: ${apiData.message || "terjadi kesalahan"}`,
        });
        return;
      }

      setTemplates((prev) => [apiData.data as Template, ...prev]);
      setFormMsg({ type: "success", text: `Bingkai "${templateName}" berhasil disimpan!` });
      setTemplateName("");
      setTemplateLayout("grid");
      setTemplateImage(null);
      setTemplatePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setFormMsg({ type: "error", text: "Gagal mengunggah bingkai." });
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: template.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormMsg({ type: "error", text: `Gagal menghapus bingkai: ${json.message || "terjadi kesalahan"}` });
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      setFormMsg({ type: "success", text: `Bingkai "${template.name}" dihapus.` });
    } catch {
      setFormMsg({ type: "error", text: "Gagal menghapus bingkai." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Memuat Konsol Operator...</p>
        </div>
      </div>
    );
  }

  const isOwner = operator?.role === "owner";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              photobooth<span className="text-blue-600">.</span>
            </span>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
              {isOwner ? "Super Admin" : "Crew Staff"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{operator?.display_name || "Operator"}</p>
              <p className="text-xs text-slate-500">{operator?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kelola Event Photobooth</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isOwner
                ? "Kelola event, unggah bingkai foto, dan pantau antrean cetak."
                : "Pilih event untuk meluncurkan Kiosk di iPad atau memantau antrean cetak."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("events")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "events"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Daftar Event
            </button>
            {isOwner && (
              <button
                onClick={() => setActiveTab("templates")}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === "templates"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <LayoutTemplate className="w-4 h-4" />
                <span>Bingkai Foto</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("create-event")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "create-event"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Buat Event Baru</span>
            </button>
          </div>
        </div>

        {/* Form Messages */}
        {formMsg && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm ${
              formMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {formMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span>{formMsg.text}</span>
          </div>
        )}

        {/* ============ TAB: Daftar Event ============ */}
        {activeTab === "events" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const template = templates.find((t) => t.id === event.template_id);
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          event.is_active
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {event.is_active ? "Aktif" : "Selesai"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        /kiosk/{event.slug}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">{event.name}</h3>

                    <div className="space-y-2 text-sm text-slate-600 mt-4 mb-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>
                          Harga/Sesi:{" "}
                          <strong className="text-slate-900">
                            Rp {(event.price_per_session || 25000).toLocaleString("id-ID")}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-blue-600" />
                        <span>
                          Pembayaran:{" "}
                          <strong>{event.is_payment_enabled ? "QRIS" : "Tunai / Gratis"}</strong>
                        </span>
                      </div>
                      {template && (
                        <div className="flex items-center gap-2">
                          <LayoutTemplate className="w-4 h-4 text-blue-600" />
                          <span>
                            Bingkai: <strong className="text-slate-900">{template.name}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Actions */}
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <Link
                      href={`/kiosk/${event.slug}`}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Luncurkan Kiosk iPad</span>
                    </Link>

                    <Link
                      href={`/print-queue/${event.slug}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Monitor Antrean Cetak</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============ TAB: Template Bingkai (owner only) ============ */}
        {activeTab === "templates" && isOwner && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Upload form */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Unggah Bingkai Baru</h2>
              <p className="text-xs text-slate-500 mb-5">
                Gunakan PNG transparan full-bleed (misal 1800×1200) dengan area tengah kosong untuk foto.
              </p>

              <form onSubmit={handleUploadTemplate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Nama Bingkai
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bingkai Pernikahan Elegan"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Gambar Bingkai (PNG)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors"
                  >
                    <ImagePlus className="w-5 h-5" />
                    {templatePreview ? "Ganti Gambar" : "Pilih File PNG"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {templatePreview && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={templatePreview} alt="Pratinjau bingkai" className="w-full" />
                      <p className="text-[10px] text-slate-400 text-center py-1.5">
                        Pratinjau bingkai — area transparan adalah lubang foto
                      </p>
                      <div className="px-3 pb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          Layout terdeteksi: {LAYOUT_LABELS[templateLayout || "grid"]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploadingTemplate || !templateImage}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {uploadingTemplate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Simpan Bingkai</span>
                </button>
              </form>
            </div>

            {/* Template list */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Daftar Bingkai ({templates.length})
              </h2>

              {templates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mb-4">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-slate-700">Belum ada bingkai</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Unggah bingkai pertama Anda melalui formulir di samping.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {templates.map((template) => {
                    const config = template.config || {};
                    const overlay = config.thumbnail_url || config.overlay_url;
                    return (
                      <div
                        key={template.id}
                        className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-[3/2] bg-slate-50 flex items-center justify-center p-3">
                          {overlay ? (
                            <img
                              src={overlay}
                              alt={template.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Tanpa pratinjau</span>
                          )}
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-slate-900">{template.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {LAYOUT_LABELS[config.layout || "grid"]}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteTemplate(template)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus bingkai"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ TAB: Buat Event Baru ============ */}
        {activeTab === "create-event" && (
          <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Formulir Event Baru</h2>

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nama Event
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Resepsi Pernikahan Andi & Budi"
                  value={newEventName}
                  onChange={(e) => {
                    setNewEventName(e.target.value);
                    setNewEventSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .replace(/\s+/g, "-")
                    );
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Slug URL Kiosk
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 text-slate-500 px-3 py-3 rounded-l-xl border border-r-0 border-slate-200 text-xs font-mono">
                    /kiosk/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="resepsi-andi-budi"
                    value={newEventSlug}
                    onChange={(e) => setNewEventSlug(e.target.value)}
                    className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Harga Per Sesi (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    step="1000"
                    value={newEventPrice}
                    onChange={(e) => setNewEventPrice(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Metode Pembayaran
                  </label>
                  <select
                    value={isPaymentEnabled ? "true" : "false"}
                    onChange={(e) => setIsPaymentEnabled(e.target.value === "true")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm bg-white"
                  >
                    <option value="true">QRIS Pembayaran Aktif</option>
                    <option value="false">Bypass / Sesi Gratis</option>
                  </select>
                </div>
              </div>

              {/* Template selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Bingkai Default (Opsional)
                </label>
                <select
                  value={newEventTemplateId}
                  onChange={(e) => setNewEventTemplateId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm bg-white"
                >
                  <option value="">Tidak ada (tamu memilih sendiri di kiosk)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {LAYOUT_LABELS[t.config?.layout || "grid"]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("events")}
                  className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Event Baru</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}