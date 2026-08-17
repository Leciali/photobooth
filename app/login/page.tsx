"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();

      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        throw new Error(
          authError.message ||
            "Gagal masuk. Periksa email dan kata sandi Anda.",
        );
      }

      if (!authData.user) {
        throw new Error("Pengguna tidak ditemukan.");
      }

      // 2. Check operator role in `operators` table
      const { data: operatorData, error: operatorError } = await supabase
        .from("operators")
        .select("id, role, display_name")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (operatorError || !operatorData) {
        // Sign out if not authorized in operators table
        await supabase.auth.signOut();
        throw new Error(
          "Akses Ditolak: Akun ini tidak terdaftar sebagai staf atau pemilik photobooth.",
        );
      }

      // 3. Login successful -> redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
              <Camera className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              photobooth<span className="text-blue-600">.</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Login Aplikasi Operator
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Login dengan akun Owner atau Staff.
          </p>
        </div>

        {/* Form Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Error Alert */}
              {errorMsg && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start gap-3 text-red-700 text-sm animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Alamat Email Staf
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@photobooth.app"
                    className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 placeholder-slate-400 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Kata Sandi
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 placeholder-slate-400 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memeriksa Otentikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Terproteksi RLS Supabase</span>
              </div>
              <Link
                href="/"
                className="text-blue-600 hover:underline font-medium"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
