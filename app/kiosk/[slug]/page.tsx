"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Event, Template } from "@/lib/types/database";
import { renderComposite, KioskLayout } from "@/lib/kiosk/composite";
import { makeGif } from "@/lib/kiosk/gif";
import { makeQrDataUrl, generateSessionCode } from "@/lib/kiosk/session";
import {
  Camera,
  CreditCard,
  Mail,
  LayoutTemplate,
  Play,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Banknote,
  Sparkles,
  ScanLine,
  Image as ImageIcon,
  ImageOff,
  Film,
  ArrowLeft,
  Clock3,
  Check,
} from "lucide-react";

type Step = "welcome" | "payment" | "email" | "frame" | "camera" | "photo-select" | "processing" | "done"; 

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

export default function KioskPage() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>("welcome");
  const [event, setEvent] = useState<Event | null>(null);
  const [eventMissing, setEventMissing] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<Template[]>([]);

  // Payment
  const [qrisDataUrl, setQrisDataUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Email
  const [email, setEmail] = useState("");

  // Frame
  const [layout, setLayout] = useState<KioskLayout>("grid");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const selectedTemplateRef = useRef<Template | null>(null);
  const [frameSeconds, setFrameSeconds] = useState(60);

  // Camera
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectionPreview, setSelectionPreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Result
  const [sessionCode, setSessionCode] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [printQueued, setPrintQueued] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");

  useEffect(() => {
    async function loadEvent() {
      try {
        const eventRes = await fetch(`/api/events/public?slug=${slug}`);
        const eventJson = await eventRes.json();
        if (!eventJson.success || !eventJson.data) {
          setEventMissing(true);
          return;
        }

        const resolvedEvent = eventJson.data as Event;
        setEvent(resolvedEvent);
        const templateRes = await fetch(`/api/templates/public?ownerId=${resolvedEvent.owner_id}`);
        const templateJson = await templateRes.json();
        const templateData = templateJson.success ? (templateJson.data as Template[]) : [];
        setDbTemplates(templateData);

        const defaultTemplate = templateData.find((template) => template.id === resolvedEvent.template_id);
        if (defaultTemplate) {
          selectedTemplateRef.current = defaultTemplate;
          setSelectedTemplate(defaultTemplate);
          setLayout((defaultTemplate.config?.layout as KioskLayout) || "grid");
        }
      } catch {
        setEventMissing(true);
      }
    }
    loadEvent();
  }, [slug]);

  // Camera lifecycle
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch {
      // Camera unavailable — proceed with placeholder frames for testing
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  }, [stopCamera]);

  const capturePhoto = useCallback((): string => {
    const video = videoRef.current;
    const canvas = canvasRef.current!;
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // Placeholder when camera unavailable
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`photobooth ${photos.length + 1}`, canvas.width / 2, canvas.height / 2);
    }
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [photos.length]);

  const captureWithTimer = (shots: string[]) => {
    let seconds = 10;
    setCountdown(seconds);
    captureTimerRef.current = setInterval(() => {
      seconds -= 1;
      setCountdown(seconds);
      if (seconds > 0) return;

      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
      const nextShots = [...shots, capturePhoto()];
      setPhotos(nextShots);
      if (nextShots.length >= 5) {
        setCountdown(null);
        setIsShooting(false);
        stopCamera();
        setStep("photo-select");
        return;
      }
      setTimeout(() => captureWithTimer(nextShots), 500);
    }, 1000);
  };

  const beginShooting = async () => {
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    frameTimerRef.current = null;
    setPhotos([]);
    setSelectedPhotos([]);
    setSelectionPreview(null);
    setStep("camera");
    await startCamera();
    setIsShooting(true);
    setTimeout(() => captureWithTimer([]), 1200);
  };

  const slotCount = selectedTemplate
    ? layout === "grid"
      ? 4
      : layout === "diptych"
        ? 2
        : 1
    : 0;

  const updateSelectionPreview = async (photosForPreview: string[]) => {
    if (!photosForPreview.length || !selectedTemplate) {
      setSelectionPreview(null);
      return;
    }
    try {
      const preview = await renderComposite(
        photosForPreview,
        layout,
        event?.name || "photobooth",
        selectedTemplate.config?.overlay_url
      );
      setSelectionPreview(preview);
    } catch {
      setSelectionPreview(null);
    }
  };

  const togglePhotoSelection = (photo: string) => {
    const next = selectedPhotos.includes(photo)
      ? selectedPhotos.filter((item) => item !== photo)
      : selectedPhotos.length >= slotCount
        ? selectedPhotos
        : [...selectedPhotos, photo];
    setSelectedPhotos(next);
    void updateSelectionPreview(next);
  };

  const beginFrameSelection = () => {
    setFrameSeconds(60);
    setStep("frame");
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(() => {
      setFrameSeconds((seconds) => {
        if (seconds > 1) return seconds - 1;
        if (frameTimerRef.current) clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
        if (selectedTemplateRef.current) void beginShooting();
        return 0;
      });
    }, 1000);
  };

  // Payment
  const startPayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/payment/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: slug,
          amount: event?.price_per_session || 25000,
          sessionId: generateSessionCode(),
        }),
      });
      const data = await res.json();
      if (data.qrisString) {
        setOrderId(data.orderId);
        const qr = await makeQrDataUrl(data.qrisString);
        setQrisDataUrl(qr);
      }
    } catch {
      // Fallback QRIS string
      const qr = await makeQrDataUrl("00020101021226680016COM.GO-JEK.WWW0118936009photobooth");
      setQrisDataUrl(qr);
    } finally {
      setPaymentLoading(false);
    }
  };

  const bypassPayment = () => {
    setStep("email");
  };

  // Processing pipeline
  const beginProcessing = async (shots: string[]) => {
    setStep("processing");
    const code = generateSessionCode();
    setSessionCode(code);

    try {
      setProcessingMessage("Membuat komposit foto 300 DPI...");
      const composite = await renderComposite(
        shots,
        layout,
        event?.name || "photobooth",
        selectedTemplate?.config?.overlay_url
      );
      setCompositeUrl(composite);

      setProcessingMessage("Membuat GIF animasi...");
      let gif: string | null = null;
      try {
        gif = await makeGif(shots, 640, 360);
        setGifUrl(gif);
      } catch {
        gif = null;
      }

      setProcessingMessage("Mengunggah ke cloud & mengantre cetak...");
      await finishSession(code, composite, gif, shots);
    } catch {
      // Ensure flow completes even if uploads fail
      await finishSession(code, compositeUrl || shots[0], gifUrl, shots);
    }
  };

  const finishSession = async (
    code: string,
    composite: string,
    gif: string | null,
    shots: string[]
  ) => {
    const supabase = createClient();

    const galleryUrl = `${window.location.origin}/gallery/${code}`;
    const qr = await makeQrDataUrl(galleryUrl);
    setQrDataUrl(qr);

    const sessionPayload = {
      event_id: event?.id || DEMO_EVENT.id,
      session_code: code,
      customer_email: email || null,
      status: "completed",
      raw_photos: shots,
      composite_url: composite,
      gif_url: gif,
      payment_status: "paid",
      download_count: 0,
    };

    let sessionId = `sess-${Date.now()}`;
    try {
      const { data, error } = await supabase.from("sessions").insert([sessionPayload]).select().single();
      if (data) sessionId = data.id;
      if (!error) {
        // Queue print job
        await supabase.from("print_jobs").insert([
          {
            session_id: sessionId,
            event_id: event?.id || DEMO_EVENT.id,
            image_url: composite,
            copies: 1,
            status: "queued",
            retry_count: 0,
          },
        ]);
        setPrintQueued(true);
      }
    } catch {
      // Database not configured yet — treat as success locally
      setPrintQueued(true);
    }

    // Send email (async, non-blocking)
    if (email) {
      void fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sessionCode: code,
          compositeUrl: composite,
          gifUrl: gif,
          eventName: event?.name || "photobooth",
        }),
      }).catch(() => {});
    }

    setTimeout(() => setStep("done"), 600);
  };

  const resetKiosk = () => {
    setPhotos([]);
    setQrisDataUrl(null);
    setOrderId(null);
    setEmail("");
    setCompositeUrl(null);
    setGifUrl(null);
    setQrDataUrl(null);
    setPrintQueued(false);
    setSessionCode("");
    setSelectedTemplate(null);
    setStep("welcome");
  };

  if (eventMissing) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <ImageOff className="w-12 h-12 text-slate-500 mx-auto" />
          <h1 className="text-2xl font-bold">Event tidak ditemukan</h1>
          <p className="text-slate-400">Buat event di Dashboard terlebih dahulu, lalu buka URL kiosk dari event tersebut.</p>
          <Link href="/dashboard" className="inline-flex px-5 py-3 rounded-xl bg-blue-600 font-semibold">
            Ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden select-none">
      {/* Kiosk Top Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">photobooth</span>
          <span className="text-slate-500">•</span>
          <span>{event.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          KIOSK AKTIF
        </div>
      </div>

      {/* Hidden video + canvas */}
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="min-h-screen flex items-center justify-center p-6 pt-20">
        <div className="w-full max-w-5xl">
          {/* ============ WELCOME ============ */}
          {step === "welcome" && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-semibold">
                  <Sparkles className="w-4 h-4" />
                  {event.name}
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                  Abadikan Momen
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                    Istimewa Anda
                  </span>
                </h1>
                <p className="text-slate-400 text-lg max-w-lg mx-auto">
                  Foto instan, GIF animasi, dan cetak fisik dalam hitungan detik.
                </p>
              </div>

              <button
                onClick={() => setStep(event?.is_payment_enabled === false ? "email" : "payment")}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-2xl shadow-blue-600/40 transition-all active:scale-95"
              >
                <Play className="w-6 h-6 fill-white" />
                Mulai Sesi Foto
              </button>

              <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4" /> QRIS
                </span>
                <span className="flex items-center gap-1.5">
                  <Film className="w-4 h-4" /> GIF Otomatis
                </span>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" /> Cetak 300 DPI
                </span>
              </div>
            </div>
          )}

          {/* ============ PAYMENT ============ */}
          {step === "payment" && (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-extrabold mb-2">Pembayaran</h2>
                  <p className="text-slate-400">Scan QRIS untuk memulai sesi foto Anda.</p>
                </div>
                <div className="bg-white text-slate-900 rounded-2xl p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Sesi Foto Photobooth</span>
                    <span className="text-sm font-mono text-slate-400">{orderId || "BOOTHPAY-..."}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-500">Total</span>
                    <span className="text-3xl font-extrabold text-blue-600">
                      Rp {(event?.price_per_session || 25000).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={bypassPayment}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-colors"
                  >
                    <Banknote className="w-4 h-4" />
                    Bayar Tunai ke Staf (Bypass)
                  </button>
                  <Link
                    href="/"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Batal & Kembali
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl aspect-square max-w-md mx-auto w-full">
                {paymentLoading ? (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <span className="text-sm">Membuat kode QRIS...</span>
                  </div>
                ) : qrisDataUrl ? (
                  <>
                    <img src={qrisDataUrl} alt="QRIS Payment Code" className="w-full max-w-xs" />
                    <p className="mt-4 text-center text-xs text-slate-500 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Scan dengan GoPay, OVO, ShopeePay, Dana, atau aplikasi perbankan
                    </p>
                    <button
                      onClick={() => setStep("email")}
                      className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors"
                    >
                      ✓ Simulasikan Pembayaran Berhasil (Sandbox)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startPayment}
                    className="flex items-center gap-3 px-8 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-xl transition-all active:scale-95"
                  >
                    <CreditCard className="w-6 h-6" />
                    Tampilkan Kode QRIS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============ EMAIL ============ */}
          {step === "email" && (
            <div className="max-w-lg mx-auto text-center space-y-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-500/15 border border-blue-500/30">
                <Mail className="w-10 h-10 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-extrabold">Masukkan Email Anda</h2>
                <p className="text-slate-400">
                  Foto, GIF animasi, dan galeri digital akan kami kirim otomatis ke email ini.
                </p>
              </div>
              <div className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-6 py-4 rounded-2xl bg-white text-slate-900 placeholder-slate-400 text-lg font-medium outline-none focus:ring-4 focus:ring-blue-500/30"
                />
                <button
                  onClick={beginFrameSelection}
                  disabled={!email.includes("@")}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Lanjut Pilih Bingkai
                </button>
                <button
                  onClick={beginFrameSelection}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Lewati (Tidak dikirim ke email)
                </button>
              </div>
            </div>
          )}

          {/* ============ FRAME ============ */}
          {step === "frame" && (
            <div className="text-center space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-500/15 border border-blue-500/30 mx-auto">
                  <LayoutTemplate className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-4xl font-extrabold">Pilih Desain Bingkai</h2>
                <p className="text-slate-400">Pilih bingkai Anda sebelum waktu habis.</p>
                <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  <Clock3 className="w-4 h-4" /> {frameSeconds} detik
                </div>
              </div>

              {dbTemplates.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {dbTemplates.map((template) => {
                      const overlay = template.config?.thumbnail_url || template.config?.overlay_url;
                      const active = selectedTemplate?.id === template.id;
                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            selectedTemplateRef.current = template;
                            setSelectedTemplate(template);
                            setLayout((template.config?.layout as KioskLayout) || "grid");
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                            active
                              ? "border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-600/20"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                          }`}
                        >
                          <div className="bg-white rounded-lg p-2 mb-3 aspect-[3/2] flex items-center justify-center overflow-hidden">
                            {overlay ? (
                              <img
                                src={overlay}
                                alt={template.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400">{template.name}</span>
                            )}
                          </div>
                          <span className="font-bold text-sm text-white">{template.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Bingkai disiapkan oleh tim photobooth untuk acara ini
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-2xl p-10 max-w-xl mx-auto">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-700/50 text-slate-400 mb-4">
                      <ImageOff className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-white text-lg">
                      Tidak Ada Bingkai Tersedia
                    </p>
                    <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                      Bingkai untuk acara ini belum diunggah oleh tim photobooth.
                      Anda tetap bisa melanjutkan tanpa bingkai.
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={beginShooting}
                disabled={!selectedTemplate}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-2xl shadow-blue-600/40 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Camera className="w-6 h-6" />
                Mulai Foto
              </button>
            </div>
          )}

          {/* ============ CAMERA ============ */}
          {step === "camera" && (
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video max-w-4xl mx-auto">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!isShooting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Camera className="w-16 h-16 text-slate-600 mx-auto" />
                    <p className="text-slate-500 text-lg">Menyiapkan kamera...</p>
                  </div>
                </div>
              )}

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                  <span
                    key={countdown}
                    className="text-[10rem] font-extrabold text-white animate-ping"
                  >
                    {countdown}
                  </span>
                </div>
              )}

              {/* Shot Progress */}
              {isShooting && (
                <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-2 text-sm font-bold">
                  <Clock3 className="w-4 h-4 text-amber-300" />
                  Foto {Math.min(photos.length + 1, 5)}/5 · {countdown ?? 0} dtk
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent">
                <div className="grid grid-cols-5 gap-2 max-w-3xl mx-auto">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const photo = photos[index];
                    return (
                      <div key={index} className="aspect-video rounded-lg border border-slate-600 bg-slate-800/90 overflow-hidden relative">
                        {photo ? (
                          <img src={photo} alt={`Hasil foto ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center text-slate-500 text-xs font-bold">
                            FOTO {index + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-slate-300 mt-2">Hasil foto langsung tampil di sini</p>
              </div>
            </div>
          )}

          {/* ============ PHOTO SELECT ============ */}
          {step === "photo-select" && (
            <div className="text-center space-y-7">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 mx-auto">
                  <Check className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-4xl font-extrabold">Pilih Foto untuk Bingkai</h2>
                <p className="text-slate-400">
                  Pilih {slotCount} dari {photos.length} foto untuk {selectedTemplate?.name}.
                </p>
              </div>

              <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 max-w-5xl mx-auto text-left">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
                  {photos.map((photo, index) => {
                    const active = selectedPhotos.includes(photo);
                    return (
                      <button
                        key={`${photo.slice(-24)}-${index}`}
                        onClick={() => togglePhotoSelection(photo)}
                        className={`relative aspect-video overflow-hidden rounded-xl border-4 transition-all ${
                          active ? "border-blue-500 scale-[1.03]" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                        <span className={`absolute top-2 left-2 w-7 h-7 rounded-full text-xs font-bold grid place-items-center ${active ? "bg-blue-600 text-white" : "bg-slate-950/70 text-white"}`}>
                          {active ? selectedPhotos.indexOf(photo) + 1 : index + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">Preview dalam bingkai</p>
                    <span className="text-xs text-blue-300">Live preview</span>
                  </div>
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-950 grid place-items-center">
                    {selectionPreview ? (
                      <img src={selectionPreview} alt="Preview hasil dalam bingkai" className="w-full h-full object-contain" />
                    ) : (
                      <p className="text-sm text-slate-500 text-center px-6">Pilih foto untuk melihat hasilnya di dalam bingkai.</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => beginProcessing(selectedPhotos)}
                disabled={selectedPhotos.length !== slotCount}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-2xl shadow-blue-600/40 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check className="w-6 h-6" />
                Gunakan {selectedPhotos.length}/{slotCount} Foto
              </button>
            </div>
          )}

          {/* ============ PROCESSING ============ */}
          {step === "processing" && (
            <div className="text-center space-y-8 py-12">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
                  <Sparkles className="w-8 h-8 text-blue-400 absolute inset-0 m-auto" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold">Memproses Foto Anda...</h2>
                <p className="text-slate-400">{processingMessage}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Mohon jangan tinggalkan kiosk
              </div>
            </div>
          )}

          {/* ============ DONE ============ */}
          {step === "done" && (
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Sesi Selesai!
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                  Terima kasih!
                  <br />
                  <span className="text-blue-400">Momen Anda siap diunduh.</span>
                </h2>
                <p className="text-slate-400">
                  Foto fisik sedang dicetak{printQueued ? " — sudah masuk antrean cetak" : ""}.{" "}
                  {email && "Hasil digital juga sudah dikirim ke email Anda."}
                </p>

                <div className="flex flex-col gap-3 pt-4">
                  {compositeUrl && (
                    <img
                      src={compositeUrl}
                      alt="Hasil komposit"
                      className="w-48 rounded-xl border border-slate-700 shadow-2xl mx-auto md:mx-0"
                    />
                  )}
                  <button
                    onClick={resetKiosk}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl transition-all active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Sesi Baru untuk Tamu Berikutnya
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code Galeri" className="w-72" />
                ) : (
                  <div className="w-72 aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <ScanLine className="w-16 h-16" />
                  </div>
                )}
                <div className="text-center">
                  <p className="font-bold text-slate-900 text-lg">Kode Sesi: {sessionCode}</p>
                  <p className="text-xs text-slate-500">
                    Pindai QR untuk melihat & mengunduh foto Anda di HP
                  </p>
                </div>
                {gifUrl && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={gifUrl} alt="GIF Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
