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
  LogIn,
  User,
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
    if (admin.role === 'viewer') return 'Pengunjung';
    return admin.opsNama ? admin.opsNama.replace('OPS ', '') : 'Admin OPS';
  };

  return (
    <header className="bg-white text-emerald-900 select-none border-b border-slate-200 shrink-0 z-30 shadow-xs">
      {/* Native Desktop Window Bar */}
      <div className="px-2.5 sm:px-4 py-1.5 bg-slate-50 flex items-center justify-between gap-2 text-xs text-emerald-800 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0 shrink">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="px-2 py-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg lg:hidden flex items-center gap-1.5 cursor-pointer border border-emerald-300 bg-white shadow-2xs shrink-0"
              aria-label="Toggle Menu"
            >
              <Menu className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-900">Menu</span>
            </button>
          )}

          {/* Simulated Mac / Windows Window Dot buttons on desktop */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          </div>

          {/* Clean App Title */}
          <div className="min-w-0 truncate">
            <span className="lg:hidden font-extrabold text-emerald-950 text-xs tracking-tight whitespace-nowrap">
              SIOPS Sampah
            </span>
            <span className="hidden lg:inline font-bold text-emerald-950 tracking-tight text-xs">
              Sistem Informasi Pengelolaan Sampah OPS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          {/* Cloud Firestore Indicator */}
          <div
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md border font-medium transition-colors shrink-0 ${
              cloudStatus === 'connected'
                ? 'bg-sky-50 text-sky-900 border-sky-300'
                : cloudStatus === 'syncing'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Database tersimpan permanen di Google Cloud Firestore secara real-time"
          >
            {cloudStatus === 'syncing' ? (
              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin shrink-0" />
            ) : (
              <Cloud className="w-3 h-3 text-sky-600 shrink-0" />
            )}
            <span className="font-mono text-[10px] hidden sm:inline whitespace-nowrap">
              {cloudStatus === 'connected'
                ? 'Cloud Aktif'
                : cloudStatus === 'syncing'
                ? 'Sinkron...'
                : 'Menghubungkan'}
            </span>
            {cloudStatus === 'connected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            )}
          </div>

          {/* Admin Account Pill & Quick Switcher */}
          {currentAdmin && (
            <button
              type="button"
              onClick={onOpenLoginAdmin}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-950 transition-all cursor-pointer shadow-2xs group shrink-0"
              title={
                currentAdmin.role === 'viewer'
                  ? 'Mode Pengunjung (Klik untuk Login Pengurus)'
                  : `Klik untuk ganti akun (Sedang aktif: ${currentAdmin.nama})`
              }
            >
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
                style={{ backgroundColor: currentAdmin.avatarColor || '#059669' }}
              />
              <span className="font-bold text-[11px] max-w-[110px] truncate hidden sm:inline">
                {currentAdmin.nama}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                  currentAdmin.role === 'viewer'
                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                    : currentAdmin.role === 'entri_data'
                    ? 'bg-violet-100 text-violet-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {getRoleShortLabel(currentAdmin)}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-emerald-600 group-hover:translate-y-0.5 transition-transform shrink-0" />
            </button>
          )}

          {/* Quick Login for Viewer (Desktop md+) or Logout for Logged-in Admin (Desktop md+) */}
          {currentAdmin?.role === 'viewer' ? (
            <button
              type="button"
              onClick={onOpenLoginAdmin}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs text-xs font-bold shrink-0"
              title="Masuk menggunakan akun Admin OPS untuk menambah atau mengedit data"
            >
              <User className="w-4 h-4 text-white shrink-0" />
              <span className="whitespace-nowrap">Login Pengurus</span>
            </button>
          ) : (
            onLogoutRequest && (
              <button
                type="button"
                onClick={onLogoutRequest}
                className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-all cursor-pointer shadow-xs text-xs font-bold shrink-0"
                title="Keluar ke mode Pengunjung (Logout)"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="whitespace-nowrap">Keluar</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Mobile-Only Compact Toolbar (< md) */}
      <div className="md:hidden px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1.5">
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {isCleanUpTab ? (
            <div className="flex items-center gap-1 bg-cyan-50 border border-cyan-300 px-2 py-1 rounded-lg text-xs font-bold text-cyan-950 truncate">
              <span className="truncate">🌊 Clean-up Pantai</span>
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
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden truncate shadow-2xs"
                >
                  <option value="all">🌐 Semua OPS</option>
                  {opsList.map((ops) => (
                    <option key={ops.id} value={ops.id}>
                      {ops.nama} ({ops.kode})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded-lg text-xs font-bold text-emerald-950 truncate">
                  <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span className="truncate">{activeOPS.nama} ({activeOPS.kode})</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Compact Year Selector on Mobile */}
        <div className="flex items-center bg-white rounded-lg border border-emerald-300 shadow-2xs shrink-0 overflow-hidden">
          <button
            type="button"
            onClick={() => onChangeYear(selectedYear - 1)}
            className="px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 font-bold cursor-pointer"
          >
            -
          </button>
          <span className="px-1.5 py-0.5 text-[11px] font-bold text-emerald-950 font-mono">
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => onChangeYear(selectedYear + 1)}
            className="px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 font-bold cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Add OPS button on mobile - Superadmin only */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={onOpenAddOPS}
            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer shrink-0 shadow-2xs"
            title="Tambah OPS Baru"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Mobile Login / Logout Button */}
        {currentAdmin?.role === 'viewer' ? (
          <button
            type="button"
            onClick={onOpenLoginAdmin}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 text-[11px] font-bold"
            title="Login Pengurus"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Login</span>
          </button>
        ) : (
          onLogoutRequest && (
            <button
              type="button"
              onClick={onLogoutRequest}
              className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-lg cursor-pointer shrink-0 shadow-xs flex items-center justify-center transition-colors"
              title="Keluar ke mode Pengunjung (Logout)"
            >
              <LogOut className="w-4 h-4 text-rose-700 shrink-0" />
            </button>
          )
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
