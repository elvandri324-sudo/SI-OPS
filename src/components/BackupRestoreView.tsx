import React, { useRef, useState } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileJson,
  Sparkles,
  Lock,
  Cloud,
} from 'lucide-react';
import { AdminAccount, OPSProfile } from '../types/ops';
import { ModalConfirm } from './modals/ModalConfirm';

interface Props {
  currentAdmin: AdminAccount;
  activeOPS: OPSProfile;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => void;
  onResetDatabase: () => void;
  isReadOnly?: boolean;
}

export const BackupRestoreView: React.FC<Props> = ({
  currentAdmin,
  activeOPS,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
  isReadOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState<boolean>(false);
  const [pendingRestoreContent, setPendingRestoreContent] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isSuperAdmin = currentAdmin.role === 'superadmin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setPendingRestoreContent(content);
        setRestoreConfirmOpen(true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteRestore = () => {
    if (!pendingRestoreContent) return;
    try {
      onImportBackup(pendingRestoreContent);
      setRestoreConfirmOpen(false);
      setPendingRestoreContent(null);
      setFeedbackNotice({
        message: `Database berhasil dipulihkan dari file "${selectedFileName || 'cadangan'}"!`,
        type: 'success',
      });
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err) {
      setFeedbackNotice({
        message: 'Gagal memulihkan database. Format file tidak valid.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-700/50 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                Pusat Cadangan Sistem
              </span>
              <span className="text-xs text-emerald-200">
                Format Standar JSON
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-1">
              Sistem Backup, Restore, &amp; Pemulihan Database
            </h1>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Simpan salinan data operasional seluruh unit OPS ke komputer lokal Anda atau pulihkan data dari file cadangan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/15 text-xs shrink-0">
          <Cloud className="w-4 h-4 text-sky-300 shrink-0" />
          <div>
            <div className="font-bold text-white">Sinkronisasi Cloud Aktif</div>
            <div className="text-[10px] text-emerald-200">Google Firestore Real-time</div>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150 ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {feedbackNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackNotice.message}</span>
        </div>
      )}

      {/* Main 2-Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: BACKUP DATA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Backup Data (Ekspor JSON)</h2>
                <p className="text-xs text-slate-500">Unduh salinan lengkap database ke file lokal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Membuat cadangan data terkini yang mencakup seluruh profil organisasi OPS, daftar pelanggan warga, matriks iuran, transaksi ritase penimbangan sampah, kas masuk/keluar, dan konfigurasi komposisi sampah.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-emerald-600" />
                <span>Isi Paket Cadangan Database:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                <li>Seluruh Wilayah Unit OPS &amp; Parameter Teknis</li>
                <li>Daftar Pelanggan Warga (Aktif &amp; Berhenti)</li>
                <li>Riwayat Pembayaran Iuran &amp; Matriks Bulanan</li>
                <li>Pencatatan Ritase Sampah Pemukiman &amp; Clean-up</li>
                <li>Buku Kas &amp; Arus Kas Operasional</li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={onExportBackup}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs tracking-wide shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Cadangan Database (.json)</span>
          </button>
        </div>

        {/* CARD 2: RESTORE DATA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Restore Data (Impor JSON)</h2>
                <p className="text-xs text-slate-500">Pulihkan sistem dari file cadangan sebelumnya</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Memuat kembali database dari file JSON cadangan yang telah Anda unduh sebelumnya. Seluruh data operasional akan diperbarui sesuai isi file cadangan yang diunggah.
            </p>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Perhatian Saat Pemulihan:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Pemulihan akan menimpa data yang saat ini ada di aplikasi dengan data dari file cadangan. Pastikan file JSON yang diunggah berasal dari cadangan SI-OPS resmi.
              </p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              if (isReadOnly) return;
              fileInputRef.current?.click();
            }}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 ${
              isReadOnly
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs cursor-pointer'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Pilih File &amp; Pulihkan Database</span>
          </button>
        </div>
      </div>

      {/* CARD 3: RESET TO DEFAULT INITIAL SPREADSHEET DATA */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Reset ke Data Awal Spreadsheet</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Opsi khusus Super Admin: Mengembalikan seluruh data aplikasi (OPS Tanah Rata, Ouw, Rhun, dll.) ke kondisi awal sesuai spreadsheet sampel master.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Awal</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirm Restore Dialog */}
      <ModalConfirm
        isOpen={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        onConfirm={handleExecuteRestore}
        title="Konfirmasi Pemulihan Database"
        message={`Apakah Anda yakin ingin memulihkan database dari file "${selectedFileName || 'cadangan'}"? Seluruh data yang ada di aplikasi saat ini akan digantikan oleh isi file cadangan tersebut.`}
        confirmText="Ya, Pulihkan Sekarang"
        variant="warning"
      />

      {/* Confirm Reset Dialog */}
      <ModalConfirm
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          onResetDatabase();
        }}
        title="Konfirmasi Reset Database ke Data Awal"
        message="Peringatan: Seluruh data perubahan yang belum dibackup akan digantikan dengan data spreadsheet awal. Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?"
        confirmText="Ya, Reset ke Data Awal"
        variant="danger"
      />
    </div>
  );
};
