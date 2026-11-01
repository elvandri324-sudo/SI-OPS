import React, { useRef } from 'react';
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono">Database Lokal (Aktif &amp; Terenkripsi)</span>
          </div>
          <span className="text-emerald-700 font-medium">
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs ml-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
