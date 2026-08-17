"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Session, Event } from "@/lib/types/database";
import { Camera, Download, Loader2, Film, AlertCircle, ShieldCheck, Share2 } from "lucide-react";

export default function GalleryPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    async function loadGallery() {
      const supabase = createClient();

      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_code", sessionCode)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData as Session);
        setDownloadCount((sessionData as Session).download_count || 0);

        // Resolve event for expiry check
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .eq("id", (sessionData as Session).event_id)
          .maybeSingle();

        if (eventData) {
          setEvent(eventData as Event);
          const expiresAt = (eventData as Event).gallery_expires_at;
          if (expiresAt && new Date(expiresAt) < new Date()) {
            setExpired(true);
          }
        }
      }

      setLoading(false);
    }
    loadGallery();
  }, [sessionCode]);

  const handleDownload = async (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Increment download count
    if (session) {
      const supabase = createClient();
      void supabase
        .from("sessions")
        .update({ download_count: downloadCount + 1 })
        .eq("id", session.id);
      setDownloadCount((c) => c + 1);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Foto Photobooth Saya",
          text: "Lihat foto photobooth saya!",
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Memuat galeri Anda...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Tautan Galeri Kedaluwarsa</h1>
          <p className="text-slate-500 text-sm">
            Masa aktif galeri foto ini telah berakhir. Hubungi operator photobooth untuk bantuan.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sesi Tidak Ditemukan</h1>
          <p className="text-slate-500 text-sm">
            Periksa kembali kode sesi atau QR Code yang Anda pindai.
          </p>
          <Link href="/" className="inline-block text-blue-600 text-sm font-semibold hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              photobooth<span className="text-blue-600">.</span>
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {event?.name || "Galeri Foto Anda"}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Foto Anda Sudah Siap!</h1>
          <p className="text-sm text-slate-500">
            Sesi <span className="font-mono font-semibold text-blue-600">{session.session_code}</span> •{" "}
            {downloadCount} unduhan
          </p>
        </div>

        {/* Composite Photo */}
        {session.composite_url && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <img
              src={session.composite_url}
              alt="Hasil foto komposit photobooth"
              className="w-full rounded-xl"
            />
            <div className="flex gap-2 pt-4">
              <button
                onClick={() =>
                  handleDownload(session.composite_url!, `photobooth-${session.session_code}.png`)
                }
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors active:scale-95"
              >
                <Download className="w-4 h-4" />
                Unduh Foto
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Bagikan"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* GIF */}
        {session.gif_url && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
              <Film className="w-4 h-4 text-blue-600" />
              Versi GIF Animasi
            </div>
            <img
              src={session.gif_url}
              alt="GIF animasi photobooth"
              className="w-full rounded-xl"
            />
            <button
              onClick={() =>
                handleDownload(session.gif_url!, `photobooth-${session.session_code}.gif`)
              }
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors active:scale-95"
            >
              <Download className="w-4 h-4" />
              Unduh GIF
            </button>
          </div>
        )}

        {/* Raw photos strip */}
        {session.raw_photos && session.raw_photos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-sm font-bold text-slate-900 mb-3">Foto Mentah</p>
            <div className="grid grid-cols-4 gap-2">
              {session.raw_photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`Foto ${i + 1}`}
                  className="aspect-[4/3] object-cover rounded-lg border border-slate-100"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-4">
          <ShieldCheck className="w-4 h-4" />
          Galeri ini berlaku hingga batas waktu yang ditentukan operator acara.
        </div>
      </main>
    </div>
  );
}