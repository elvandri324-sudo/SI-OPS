import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export const ModalConfirm: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
  onClose,
  disabled = false,
  disabledReason,
}) => {
  if (!isOpen) return null;

  const handleDismiss = onCancel || onClose || (() => {});

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isDanger ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <h3 className="font-bold text-base text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-sm text-slate-600 space-y-3">
          <div className="leading-relaxed">{message}</div>

          {disabled && disabledReason && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
              ⚠️ {disabledReason}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          {!disabled ? (
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isDanger && <Trash2 className="w-3.5 h-3.5" />}
              <span>{confirmText}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-200 rounded-lg cursor-not-allowed"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
