import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Printer,
  QrCode,
  ShieldCheck,
  Zap,
  WifiOff,
  ArrowRight,
  CheckCircle2,
  Mail,
  CreditCard,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              photobooth<span className="text-blue-600">.</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Fitur
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              Alur Kerja
            </a>
            <a href="#hardware" className="hover:text-blue-600 transition-colors">
              Perangkat
            </a>
            <a href="#offline" className="hover:text-blue-600 transition-colors">
              Ketahanan Offline
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all duration-200 active:scale-95"
            >
              <span>Launch App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden bg-[radial-gradient(circle_at_75%_20%,#dbeafe_0,transparent_30%),linear-gradient(135deg,#f8fbff_0%,#fff_52%,#eef5ff_100%)]">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] items-center gap-10 max-w-7xl mx-auto">
            <div className="text-center lg:text-left max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide uppercase shadow-sm">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Cloud-First & Event-Ready Photo Booth
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Pengalaman Bilik Foto iPad <br />
              <span className="text-blue-700">Instan, Otomatis & Offline-Resilient</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-normal">
              Sistem photobooth pintar untuk acara profesional. Dari pembayaran QRIS, pengambilan foto iPad, pembuatan GIF animasi, pengiriman email otomatis, hingga cetak fisik instan di lokasi.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-xl shadow-blue-600/25 hover:shadow-blue-600/35 transition-all duration-200 active:scale-95 flex items-center justify-center gap-3"
              >
                <span>Masuk ke Konsol Staff</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#workflow"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-base shadow-sm hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Lihat Cara Kerja
              </a>
            </div>

            {/* Quick Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Render Komposit &lt; 2.5 Detik</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Spool Cetak &lt; 20 Detik</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Support Offline LAN Relay</span>
              </div>
            </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-[580px] flex items-center justify-center">
              <div className="absolute w-72 h-72 rounded-full bg-blue-300/30 blur-3xl motion-safe:animate-pulse" />
              <Image src="/photobooth-machine.svg" alt="Mesin photobooth 3D" width={700} height={700} priority className="relative z-10 w-full max-w-[560px] drop-shadow-[0_28px_35px_rgba(18,66,130,0.22)] motion-safe:animate-[float_6s_ease-in-out_infinite]" />
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur">Studio-grade kiosk hardware</div>
            </div>
          </div>


        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Didesain Khusus Untuk Keandalan Acara Real-Time
            </h2>
            <p className="text-slate-600 text-base">
              Setiap komponen dibuat untuk memastikan kelancaran alur tamu dari antrean pembayaran hingga cetak fisik.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Integrasi Pembayaran QRIS
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Dukungan pembayaran QRIS instan otomatis via Midtrans/Xendit Sandbox atau mode tunai (Bypass) oleh staf lapangan.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Local Print Server Daemon
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Daemon Node.js independen di komputer pendamping untuk mencetak ke printer dye-sub secara otomatis dengan antrean aman.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Kirim Email & GIF Otomatis
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Tamu secara otomatis mendapatkan foto cetak komposit, rekaman animasi GIF, dan tautan galeri digital di inbox email mereka.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Ketahanan Offline mDNS LAN
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Jika internet mati di venue, iPad Kiosk beralih otomatis ke jaringan Wi-Fi lokal untuk mencetak tanpa jeda.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Galeri QR Kode Per Sesi
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                QR Code unik langsung ditampilkan di layar iPad setelah foto selesai, mengarahkan tamu ke galeri ponsel mereka.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Proteksi Peran Admin & Staff
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Pemisahan hak akses yang aman di Supabase RLS. Hanya tim terdaftar yang dapat meluncurkan aplikasi atau mengedit templat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Alur Operasional Sederhana & Cepat
            </h2>
            <p className="text-slate-600 text-base">
              4 langkah mudah bagi tamu dari awal hingga foto tercetak di tangan mereka.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-2">Bayar & Email</h4>
              <p className="text-slate-600 text-sm">
                Tamu memindai QRIS di layar iPad dan memasukkan email untuk penerimaan berkas digital.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-2">Pilih Frame & Foto</h4>
              <p className="text-slate-600 text-sm">
                Memilih templat desain favorit, lalu mengambil 3-4 foto dengan hitungan mundur 3-2-1.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-2">Proses & GIF</h4>
              <p className="text-slate-600 text-sm">
                Sistem merender hasil komposit 300 DPI dan membuat GIF animasi secara otomatis.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-2">Cetak & Scan QR</h4>
              <p className="text-slate-600 text-sm">
                Printer otomatis mencetak lembaran fisik, sementara tamu dapat memindai QR Code untuk HP.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-white">photobooth.</span>
          </div>

          <p className="text-sm">
            © {new Date().getFullYear()} photobooth Ecosystem. Hak cipta dilindungi undang-undang.
          </p>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">
              Masuk Konsol Staff
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
