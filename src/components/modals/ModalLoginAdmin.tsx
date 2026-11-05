import React, { useState } from 'react';
import { AdminAccount, OPSProfile } from '../../types/ops';
import {
  ShieldCheck,
  User,
  KeyRound,
  LogIn,
  CheckCircle2,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminAccounts: AdminAccount[];
  currentAdmin: AdminAccount;
  opsList: OPSProfile[];
  onSelectAdmin: (adminId: string) => void;
  onOpenKelolaAdmin?: () => void;
}

export const ModalLoginAdmin: React.FC<Props> = ({
  isOpen,
  onClose,
  adminAccounts,
  currentAdmin,
  opsList,
  onSelectAdmin,
  onOpenKelolaAdmin,
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMessage('Harap masukkan username atau email admin yang terdaftar.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Harap masukkan kata sandi.');
      return;
    }

    const matched = adminAccounts.find(
      a =>
        (a.username.toLowerCase() === cleanInput || a.email.toLowerCase() === cleanInput) &&
        a.password === cleanPass
    );

    if (!matched) {
      setErrorMessage('Username/Email atau kata sandi tidak cocok. Silakan periksa kembali atau hubungi Super Admin.');
      return;
    }

    onSelectAdmin(matched.id);
    setSuccessNotice(`Selamat datang, ${matched.nama}!`);
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 900);
  };

  const getOpsBadge = (admin: AdminAccount) => {
    if (admin.role === 'superadmin') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
          🌐 SEMUA OPS (SUPER ADMIN)
        </span>
      );
    }
    const ops = opsList.find(o => o.id === admin.opsId);
    const opsLabel = admin.opsId === 'all' ? 'Semua OPS' : (ops ? ops.nama : admin.opsNama || 'OPS');
    if (admin.role === 'entri_data') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
          ✏️ ENTRI DATA • {opsLabel}
        </span>
      );
    }
    if (admin.role === 'viewer') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          👁️ HANYA LIHAT • {opsLabel}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        🏢 ADMIN OPS • {opsLabel}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">Login Pengurus &amp; Admin OPS</h2>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 truncate">
                Masukkan kredensial akun terdaftar untuk mengedit data operasional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successNotice && (
          <div className="px-4 py-2 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2 duration-150 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Current Active Account Indicator */}
        <div className="px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] text-slate-500 shrink-0">Status saat ini:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: currentAdmin.avatarColor || '#059669' }}
              />
              <span className="truncate">{currentAdmin.nama}</span>
            </span>
          </div>
          <div className="shrink-0">{getOpsBadge(currentAdmin)}</div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username atau Email Terdaftar:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="Masukkan username atau email..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              Jika Anda belum memiliki akun atau lupa kata sandi, silakan <strong>hubungi Super Admin</strong> untuk didaftarkan.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Masuk ke Akun</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-center text-xs">
          <span className="text-[11px] text-slate-500">
            Sistem Autentikasi Pengurus OPS
          </span>
        </div>
      </div>
    </div>
  );
};
