import React from 'react';
import { LogOut, X, ShieldAlert } from 'lucide-react';
import { AdminAccount, ADMIN_ROLE_LABELS } from '../../types/ops';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  currentAdmin: AdminAccount;
}

export const ModalLogoutConfirm: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmLogout,
  currentAdmin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold tracking-tight">Konfirmasi Keluar</h3>
              <p className="text-[10px] text-rose-100">Keluar dari sesi kerja SI-OPS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-rose-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin keluar dari <strong>Portal Admin</strong>? Anda akan diarahkan kembali ke <strong>Beranda Website Publik</strong> dan perlu login ulang untuk mengakses Portal Admin.
          </p>

          {/* Account Snapshot */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-xs"
              style={{ backgroundColor: currentAdmin.avatarColor || '#059669' }}
            >
              {currentAdmin.nama.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{currentAdmin.nama}</div>
              <div className="text-[11px] text-emerald-700 font-semibold truncate">
                {ADMIN_ROLE_LABELS[currentAdmin.role] || 'Admin OPS'} •{' '}
                {currentAdmin.opsId === 'all' ? 'Semua OPS' : currentAdmin.opsNama || 'OPS'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                @{currentAdmin.username}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirmLogout}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ya, Keluar Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
