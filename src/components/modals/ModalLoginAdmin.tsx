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
  const [activeTab, setActiveTab] = useState<'quick' | 'form'>('quick');
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = (admin: AdminAccount) => {
    onSelectAdmin(admin.id);
    const roleLabel =
      admin.role === 'superadmin'
        ? 'Super Admin'
        : admin.role === 'entri_data'
        ? 'Petugas Entri Data'
        : admin.role === 'viewer'
        ? 'Pengamat (Hanya Lihat)'
        : admin.opsNama || 'Admin OPS';
    setSuccessNotice(`Berhasil masuk sebagai ${admin.nama} (${roleLabel})`);
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 900);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMessage('Harap masukkan username atau email admin.');
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
      setErrorMessage('Username/Email atau kata sandi tidak cocok. Silakan coba lagi atau gunakan tombol Pilih Cepat.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Akun Admin OPS</h2>
              <p className="text-[11px] text-emerald-200">
                Pilih atau login ke akun administrator masing-masing unit OPS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successNotice && (
          <div className="px-4 py-2.5 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Current Active Account Indicator */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Akun Aktif Sekarang:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: currentAdmin.avatarColor || '#059669' }}
              />
              {currentAdmin.nama}
            </span>
          </div>
          <div>{getOpsBadge(currentAdmin)}</div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('quick');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'quick'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilih Cepat Admin OPS (1-Click)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('form');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'form'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login Manual (Sandi)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'quick' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Klik salah satu akun di bawah ini untuk langsung beralih hak akses dan wilayah kerja OPS terkait:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {adminAccounts.map(acc => {
                  const isCurrent = acc.id === currentAdmin.id;
                  const ops = opsList.find(o => o.id === acc.opsId);
                  const initials = acc.nama
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleQuickLogin(acc)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCurrent
                          ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-2xs"
                          style={{ backgroundColor: acc.avatarColor || '#059669' }}
                        >
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {acc.nama}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-extrabold text-[9px]">
                                Sedang Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>@{acc.username}</span>
                            <span>•</span>
                            <span className="truncate">{acc.email}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {getOpsBadge(acc)}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700'
                          }`}
                        >
                          <span>{isCurrent ? 'Aktif' : 'Pilih Akun'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Password notice */}
              <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] flex items-center justify-between">
                <span>
                  💡 Sandi bawaan untuk semua akun admin OPS adalah: <code className="font-bold font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">admin123</code>
                </span>
                {onOpenKelolaAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenKelolaAdmin();
                    }}
                    className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0 ml-2"
                  >
                    Kelola / Tambah Akun
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username atau Email Admin:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={e => setUsernameOrEmail(e.target.value)}
                    placeholder="Contoh: superadmin atau admin.rhun atau email"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Daftar username: <span className="font-mono text-slate-600">superadmin, admin.tanahrata, admin.mekarasri, admin.rhun, admin.ouw</span>
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
                <p className="mt-1 text-[11px] text-slate-400">
                  Sandi default sistem: <code className="font-mono font-bold text-slate-600">admin123</code>
                </p>
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
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk ke Akun</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Total {adminAccounts.length} Akun Administrator OPS Terdaftar
          </span>
          {onOpenKelolaAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenKelolaAdmin();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Akun Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
