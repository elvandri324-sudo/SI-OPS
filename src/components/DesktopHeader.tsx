import React, { useRef, useState } from 'react';
import { OPSProfile } from '../types/ops';
import {
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Printer,
  Layers,
  Edit2,
  Trash2,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  Smartphone,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  opsList: OPSProfile[];
  onSelectOPS: (id: string) => void;
  onOpenAddOPS: () => void;
  onOpenEditOPS: (ops?: OPSProfile) => void;
  onRequestDeleteOPS?: (ops: OPSProfile) => void;
  onOpenKelolaOPS: () => void;
  selectedYear: number;
  onChangeYear: (year: number) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => void;
  onResetDatabase: () => void;
  onNavigateToPrint: () => void;
  cloudStatus?: 'connecting' | 'connected' | 'syncing' | 'offline' | 'error';
}

export const DesktopHeader: React.FC<Props> = ({
  activeOPS,
  opsList,
  onSelectOPS,
  onOpenAddOPS,
  onOpenEditOPS,
  onRequestDeleteOPS,
  onOpenKelolaOPS,
  selectedYear,
  onChangeYear,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
  onNavigateToPrint,
  cloudStatus = 'connected',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // URL resmi aplikasi untuk dibagikan ke HP / perangkat lain
  const appSharedUrl = typeof window !== 'undefined'
    ? window.location.origin.includes('ais-dev-')
      ? window.location.origin.replace('ais-dev-', 'ais-pre-')
      : window.location.origin.includes('run.app')
      ? window.location.origin
      : 'https://ais-pre-piz5qvpwqg3a7v7ug3yy4k-865847542132.asia-southeast1.run.app'
    : 'https://ais-pre-piz5qvpwqg3a7v7ug3yy4k-865847542132.asia-southeast1.run.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appSharedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        onImportBackup(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="bg-white text-emerald-900 select-none border-b border-slate-200 shrink-0 z-30 shadow-xs">
      {/* Native Desktop Window Bar */}
      <div className="px-4 py-1.5 bg-slate-50 flex items-center justify-between text-xs text-emerald-800 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* Simulated Mac / Windows Window Dot buttons */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block hover:bg-rose-500 transition-colors"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block hover:bg-amber-500 transition-colors"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block hover:bg-emerald-400 transition-colors"></span>
          </div>
          <span className="font-bold text-emerald-950 tracking-tight">SI-OPS v2.6 Desktop Edition</span>
          <span className="text-emerald-300">|</span>
          <span className="truncate text-emerald-700 font-medium">
            Sistem Informasi Pengelolaan Sampah &amp; Arus Kas Ramah Lingkungan
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {/* Cloud Firestore Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm border font-medium transition-colors ${
              cloudStatus === 'connected'
                ? 'bg-sky-50 text-sky-900 border-sky-300'
                : cloudStatus === 'syncing'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Database tersimpan permanen di Google Cloud Firestore secara real-time"
          >
            {cloudStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span className="font-mono text-[11px]">
              {cloudStatus === 'connected'
                ? 'Cloud Firestore (Aktif)'
                : cloudStatus === 'syncing'
                ? 'Cloud (Sinkronisasi...)'
                : 'Cloud (Menghubungkan)'}
            </span>
            {cloudStatus === 'connected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono text-[11px]">Offline Cache</span>
          </div>

          <span className="text-emerald-700 font-medium hidden sm:inline">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main App Toolbar & Multi-OPS Selector */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-4">
        {/* Left: OPS Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-800 uppercase tracking-widest font-bold">
              Organisasi Aktif (Sumber Sampah):
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              {/* Quick Toggle Pill Buttons for Instant 1-Click Access */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => onSelectOPS('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeOPS.id === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                      : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70 font-semibold'
                  }`}
                  title="Tampilkan semua data gabungan dari seluruh OPS"
                >
                  <span>🌐 Semua OPS</span>
                </button>
                {opsList.map(ops => (
                  <button
                    key={ops.id}
                    type="button"
                    onClick={() => onSelectOPS(ops.id)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
                      activeOPS.id === ops.id
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                        : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70 font-semibold'
                    }`}
                    title={`${ops.nama} (${ops.kode})`}
                  >
                    <span>{ops.nama}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        activeOPS.id === ops.id
                          ? 'bg-emerald-700/90 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ops.kode}
                    </span>
                  </button>
                ))}
              </div>

              {activeOPS.id !== 'all' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenEditOPS(activeOPS)}
                    className="text-xs text-blue-800 hover:text-blue-950 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-300 cursor-pointer font-semibold flex items-center gap-1 shadow-2xs"
                    title={`Ubah profil & parameter ${activeOPS.nama}`}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit OPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteOPS?.(activeOPS)}
                    className="text-xs text-rose-700 hover:text-rose-900 px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-300 cursor-pointer font-semibold flex items-center gap-1 shadow-2xs"
                    title={`Hapus ${activeOPS.nama} beserta seluruh datanya`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus OPS</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenEditOPS()}
                    className="text-xs text-blue-800 hover:text-blue-950 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-300 cursor-pointer font-semibold flex items-center gap-1 shadow-2xs"
                    title="Edit profil Organisasi OPS"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit OPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenKelolaOPS}
                    className="text-xs text-rose-700 hover:text-rose-900 px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-300 cursor-pointer font-semibold flex items-center gap-1 shadow-2xs"
                    title="Buka panel untuk memilih OPS yang ingin dihapus"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus OPS</span>
                  </button>
                </div>
              )}

              {/* CRUD OPS Buttons */}
              <button
                type="button"
                onClick={onOpenAddOPS}
                className="text-xs text-emerald-800 hover:text-emerald-950 px-2.5 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                title="Tambah Organisasi OPS Baru"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Tambah OPS
              </button>

              <button
                type="button"
                onClick={onOpenKelolaOPS}
                className="text-xs text-emerald-900 hover:text-emerald-950 px-2.5 py-1.5 rounded-md bg-emerald-100 hover:bg-emerald-200 transition-colors border border-emerald-300 flex items-center gap-1.5 cursor-pointer font-bold shadow-2xs"
                title="Buka panel manajemen master CRUD data seluruh OPS"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                Kelola OPS ({opsList.length})
              </button>
            </div>
          </div>
        </div>

        {/* Right: Year Picker, Database Backup/Restore, Print */}
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center bg-slate-50 rounded-md p-0.5 border border-emerald-200">
            <button
              onClick={() => onChangeYear(selectedYear - 1)}
              className="px-2 py-1 text-xs text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-xs cursor-pointer font-bold"
            >
              -
            </button>
            <span className="px-2.5 py-1 text-xs font-bold text-emerald-950 font-mono">
              Tahun {selectedYear}
            </span>
            <button
              onClick={() => onChangeYear(selectedYear + 1)}
              className="px-2 py-1 text-xs text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-xs cursor-pointer font-bold"
            >
              +
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1"></div>

          {/* Backup Database */}
          <button
            onClick={onExportBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-300 cursor-pointer shadow-2xs"
            title="Download backup seluruh data ke file JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Backup Data</span>
          </button>

          {/* Restore Database */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-300 cursor-pointer shadow-2xs"
            title="Pulihkan database dari file backup JSON"
          >
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            <span>Restore Data</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetDatabase}
            className="p-1.5 text-emerald-700 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Reset ke data awal spreadsheet"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Cetak Quick Action */}
          <button
            onClick={onNavigateToPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-300 ml-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>

          {/* Bagikan Link Akses HP / Petugas */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shadow-xs cursor-pointer ml-1"
            title="Dapatkan link resmi untuk membuka aplikasi di HP petugas atau laptop lain"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Link HP Petugas</span>
          </button>
        </div>
      </div>

      {/* Modal Bagikan Link Aplikasi */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-sky-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-800 rounded-xl">
                  <Smartphone className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Link Akses Aplikasi di HP &amp; Perangkat Lain</h3>
                  <p className="text-2xs text-sky-100">
                    Gunakan tautan ini untuk membuka sistem di HP petugas lapangan atau komputer lain
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-lg text-sky-200 hover:text-white hover:bg-sky-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              {/* Option 1: Live Dev URL */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Link Server Aktif (Bisa Dibuka Sekarang):
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-200 text-emerald-900">
                    Aktif
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://ais-dev-piz5qvpwqg3a7v7ug3yy4k-865847542132.asia-southeast1.run.app"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-lg text-slate-900 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("https://ais-dev-piz5qvpwqg3a7v7ug3yy4k-865847542132.asia-southeast1.run.app");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs ${
                      copied
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-900 leading-normal">
                  *Buka link ini di browser HP Anda. Jika diminta login, masuk menggunakan akun Google Anda (<strong>elvandri324@gmail.com</strong>).
                </p>
              </div>

              {/* Option 2: Public URL after Deploy */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Link Publik Umum (Untuk Petugas Lain):
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700">
                    Perlu Klik Publish
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value="https://ais-pre-piz5qvpwqg3a7v7ug3yy4k-865847542132.asia-southeast1.run.app"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-700 select-all"
                />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Agar link publik di atas aktif dan tidak muncul pesan <em>"Error: Page not found"</em>, klik tombol <strong>"Publish"</strong> atau <strong>"Deploy"</strong> di pojok kanan atas layar Google AI Studio Anda.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
