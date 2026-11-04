import React from 'react';
import { OPSProfile, AdminAccount } from '../types/ops';
import {
  Plus,
  Layers,
  Edit2,
  Trash2,
  Cloud,
  RefreshCw,
  Menu,
  ChevronDown,
  Lock,
  LogOut,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  opsList: OPSProfile[];
  currentAdmin?: AdminAccount;
  onOpenLoginAdmin?: () => void;
  onOpenKelolaAdmin?: () => void;
  onLogoutRequest?: () => void;
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
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  activeTab?: string;
}

export const DesktopHeader: React.FC<Props> = ({
  activeOPS,
  opsList,
  currentAdmin,
  onOpenLoginAdmin,
  onOpenKelolaAdmin,
  onLogoutRequest,
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
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  activeTab,
}) => {
  const isSuperAdmin = currentAdmin?.role === 'superadmin';
  const canSwitchOPS = isSuperAdmin || currentAdmin?.opsId === 'all';
  const canEditActiveOPS = isSuperAdmin || currentAdmin?.role === 'admin_ops';
  const isCleanUpTab = activeTab === 'cleanup';

  const getRoleShortLabel = (admin?: AdminAccount) => {
    if (!admin) return 'Admin';
    if (admin.role === 'superadmin') return 'Super Admin';
    if (admin.role === 'entri_data') return 'Entri Data';
    if (admin.role === 'viewer') return 'Hanya Lihat';
    return admin.opsNama ? admin.opsNama.replace('OPS ', '') : 'Admin OPS';
  };

  return (
    <header className="bg-white text-emerald-900 select-none border-b border-slate-200 shrink-0 z-30 shadow-xs">
      {/* Native Desktop Window Bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-slate-50 flex items-center justify-between text-xs text-emerald-800 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="p-1 -ml-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg md:hidden flex items-center gap-1.5 cursor-pointer border border-emerald-300 bg-white shadow-2xs"
              aria-label="Toggle Menu"
            >
              <Menu className="w-4 h-4 text-emerald-700" />
              <span className="text-[11px] font-bold text-emerald-900">Menu</span>
            </button>
          )}

          {/* Simulated Mac / Windows Window Dot buttons */}
          <div className="hidden md:flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block hover:bg-rose-500 transition-colors"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block hover:bg-amber-500 transition-colors"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block hover:bg-emerald-400 transition-colors"></span>
          </div>
          <span className="font-bold text-emerald-950 tracking-tight text-xs">
            Sistem Informasi Pengelolaan Sampah OPS
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Cloud Firestore Indicator */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-sm border font-medium transition-colors ${
              cloudStatus === 'connected'
                ? 'bg-sky-50 text-sky-900 border-sky-300'
                : cloudStatus === 'syncing'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Database tersimpan permanen di Google Cloud Firestore secara real-time"
          >
            {cloudStatus === 'syncing' ? (
              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
            ) : (
              <Cloud className="w-3 h-3 text-sky-600" />
            )}
            <span className="font-mono text-[10px] sm:text-[11px]">
              {cloudStatus === 'connected'
                ? 'Cloud Aktif'
                : cloudStatus === 'syncing'
                ? 'Sinkron...'
                : 'Menghubungkan'}
            </span>
            {cloudStatus === 'connected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </div>

          {/* Admin Account Pill & Quick Switcher */}
          {currentAdmin && (
            <button
              type="button"
              onClick={onOpenLoginAdmin}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-950 transition-all cursor-pointer shadow-2xs group"
              title={`Klik untuk ganti akun pengguna (Sedang aktif: ${currentAdmin.nama})`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                style={{ backgroundColor: currentAdmin.avatarColor || '#059669' }}
              />
              <span className="font-bold text-[11px] max-w-[130px] truncate hidden sm:inline">
                {currentAdmin.nama}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  currentAdmin.role === 'viewer'
                    ? 'bg-slate-100 text-slate-700'
                    : currentAdmin.role === 'entri_data'
                    ? 'bg-violet-100 text-violet-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {getRoleShortLabel(currentAdmin)}
              </span>
              <ChevronDown className="w-3 h-3 text-emerald-600 group-hover:translate-y-0.5 transition-transform" />
            </button>
          )}

          {/* Logout Button */}
          {onLogoutRequest && (
            <button
              type="button"
              onClick={onLogoutRequest}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-all cursor-pointer shadow-2xs text-[11px] font-bold"
              title="Keluar dari sistem (Logout)"
            >
              <LogOut className="w-3 h-3 text-rose-600" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile-Only Compact Toolbar (< md) */}
      <div className="md:hidden px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {isCleanUpTab ? (
            <div className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-300 px-2.5 py-1 rounded-md text-xs font-bold text-cyan-950 truncate">
              <span className="truncate">🌊 Data Mandiri Clean-up Pantai (Non-OPS)</span>
            </div>
          ) : (
            <>
              <label htmlFor="mobile-ops-select" className="text-[10px] font-bold text-emerald-900 uppercase shrink-0">
                OPS:
              </label>
              {canSwitchOPS ? (
                <select
                  id="mobile-ops-select"
                  value={activeOPS.id}
                  onChange={(e) => onSelectOPS(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-md px-2 py-1 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden truncate"
                >
                  <option value="all">🌐 Semua OPS (Gabungan)</option>
                  {opsList.map((ops) => (
                    <option key={ops.id} value={ops.id}>
                      {ops.nama} ({ops.kode})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded-md text-xs font-bold text-emerald-950 truncate">
                  <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span className="truncate">{activeOPS.nama} ({activeOPS.kode})</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Compact Year Selector on Mobile */}
        <div className="flex items-center bg-white rounded-md border border-emerald-300 shrink-0">
          <button
            type="button"
            onClick={() => onChangeYear(selectedYear - 1)}
            className="px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 font-bold"
          >
            -
          </button>
          <span className="px-1.5 py-0.5 text-[11px] font-bold text-emerald-950 font-mono">
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => onChangeYear(selectedYear + 1)}
            className="px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 font-bold"
          >
            +
          </button>
        </div>

        {/* Add OPS button on mobile - Superadmin only */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={onOpenAddOPS}
            className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer shrink-0 shadow-2xs"
            title="Tambah OPS Baru"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Mobile Logout Button */}
        {onLogoutRequest && (
          <button
            type="button"
            onClick={onLogoutRequest}
            className="p-1 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-md cursor-pointer shrink-0 shadow-2xs"
            title="Keluar dari sistem (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Desktop App Toolbar & Multi-OPS Selector (hidden on mobile, visible md+) */}
      <div className="hidden md:flex px-5 py-2.5 items-center justify-between gap-4">
        {/* Left: OPS Switcher or Standalone Clean-up Pantai Indicator */}
        <div className="flex items-center gap-3">
          {isCleanUpTab ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-800 uppercase tracking-widest font-bold">
                Kategori Data Mandiri (Non-OPS):
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="px-3.5 py-1.5 rounded-lg bg-cyan-50 border border-cyan-300 text-xs font-bold text-cyan-950 flex items-center gap-2 shadow-2xs">
                  <span>🌊 Clean-up Pantai &amp; Konservasi Pesisir (Data Berdiri Sendiri / Tidak Terikat OPS)</span>
                </div>
              </div>
            </div>
          ) : (
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-800 uppercase tracking-widest font-bold">
              {canSwitchOPS ? 'Organisasi Aktif (Sumber Sampah):' : 'Wilayah Tugas / Unit OPS:'}
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              {canSwitchOPS ? (
                <>
                  {/* Choice Dropdown for OPS Switcher (Kompak & Tidak Makan Tempat) */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex items-center">
                      <select
                        id="desktop-ops-select"
                        value={activeOPS.id}
                        onChange={(e) => onSelectOPS(e.target.value)}
                        className="bg-white hover:bg-emerald-50/50 border border-emerald-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all cursor-pointer shadow-2xs appearance-none min-w-[220px] max-w-[320px]"
                        title="Pilih Organisasi Pengelola Sampah (OPS) Aktif"
                      >
                        <option value="all">🌐 Semua OPS (Data Gabungan)</option>
                        {opsList.map((ops) => (
                          <option key={ops.id} value={ops.id}>
                            {ops.nama} ({ops.kode})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-700 pointer-events-none absolute right-2.5" />
                    </div>

                    <span
                      className={`text-[10px] px-2 py-1 rounded-md font-mono font-bold shadow-2xs ${
                        activeOPS.id === 'all'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-emerald-700 text-white'
                      }`}
                      title={activeOPS.id === 'all' ? 'Seluruh Unit OPS' : `Kode: ${activeOPS.kode}`}
                    >
                      {activeOPS.id === 'all' ? 'SEMUA' : activeOPS.kode}
                    </span>
                  </div>

                  {isSuperAdmin && (
                    <>
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
                    </>
                  )}
                </>
              ) : (
                /* Non-Superadmin (Admin OPS / Entri Data / Viewer Khusus 1 OPS) */
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-xs font-black text-emerald-950">{activeOPS.nama}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-700 text-white">
                      {activeOPS.kode}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 ml-1 border-l border-emerald-300 pl-2">
                      🔒 Akses Khusus Wilayah ({activeOPS.wilayah || 'Terkunci'})
                    </span>
                  </div>

                  {canEditActiveOPS && (
                    <button
                      type="button"
                      onClick={() => onOpenEditOPS(activeOPS)}
                      className="text-xs text-blue-800 hover:text-blue-950 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-300 cursor-pointer font-semibold flex items-center gap-1 shadow-2xs"
                      title={`Ubah profil ${activeOPS.nama}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Profil {activeOPS.kode}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
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
        </div>
      </div>
    </header>
  );
};
