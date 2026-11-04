import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Layers,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { AdminAccount, OPSProfile } from '../types/ops';
import { db } from '../services/db';

interface Props {
  onLoginSuccess: (account: AdminAccount) => void;
  opsList: OPSProfile[];
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  // Login Form State
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setLoginError('Harap masukkan Username atau Email yang terdaftar.');
      setIsSubmitting(false);
      return;
    }
    if (!cleanPass) {
      setLoginError('Harap masukkan kata sandi.');
      setIsSubmitting(false);
      return;
    }

    // Authenticate strictly against registered accounts
    const authenticated = db.authenticateAdmin(cleanInput, cleanPass);

    if (!authenticated) {
      setLoginError(
        'Akun tidak terdaftar atau kata sandi salah. Jika Anda belum memiliki akun, silakan hubungi Super Admin.'
      );
      setIsSubmitting(false);
      return;
    }

    // Save session if rememberMe
    if (rememberMe) {
      db.setSessionUser(authenticated);
    } else {
      db.setCurrentAdminId(authenticated.id);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(authenticated);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex flex-col justify-between py-6 px-4 sm:px-6 relative overflow-x-hidden">
      {/* Background aesthetic blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Branding */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4 sm:mb-8 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              SI-OPS Waste Management
            </h1>
            <p className="text-[10px] sm:text-xs text-emerald-300/80 font-medium">
              Sistem Informasi Pengelolaan Sampah Unit OPS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-200 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Autentikasi Terverifikasi</span>
          <span className="sm:hidden">Aman</span>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col">
        {/* Card Header (Login Only - Tanpa Menu Daftar) */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  Gerbang Akses SI-OPS
                </h2>
                <p className="text-[11px] text-emerald-200">
                  Masuk menggunakan akun resmi yang terdaftar
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-[11px] font-bold">
              Login Sistem
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{loginError}</span>
              </div>
            )}

            {/* Username / Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Username atau Email Terdaftar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="Contoh: superadmin atau nama@siops.id"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Ingat sesi saya di browser ini
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>

            {/* Notice: Belum Punya Akun -> Hubungi Super Admin */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 space-y-0.5">
                  <div className="font-bold">Belum Memiliki Akun?</div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Sistem ini tidak menyediakan pendaftaran akun mandiri. Jika Anda belum memiliki akun atau lupa kata sandi, silakan <strong>hubungi Super Admin</strong> untuk didaftarkan sesuai hak akses dan unit OPS tugas Anda.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Akun Utama Super Admin:</span>
                </div>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs font-mono">
                  <span className="text-slate-700">
                    Username: <strong className="text-emerald-950">superadmin</strong>
                  </span>
                  <span className="text-slate-700">
                    Sandi: <strong className="text-emerald-950">admin123</strong>
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Roles Reference Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ketentuan Hak Akses Peran:</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-600">
            • <strong>Pengamat</strong>: Hanya dapat melihat data, visualisasi, dan mencetak laporan.<br />
            • <strong>Admin OPS</strong>: Terkunci khusus mengelola dan membuka data pada wilayah OPSnya.<br />
            • <strong>Super Admin</strong>: Memiliki otoritas penuh seluruh OPS dan penambahan akun pengguna.
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-[11px] text-emerald-200/60 font-medium mt-6 z-10">
        SI-OPS © 2026 • Sistem Informasi Pengelolaan Sampah Berbasis Komunitas &amp; Pesisir
      </div>
    </div>
  );
};
