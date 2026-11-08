import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Truck,
  PieChart,
  Wallet,
  Printer,
  ChevronRight,
  Sparkles,
  X,
  Layers,
  Waves,
  ShieldCheck,
  LogOut,
  HardDrive,
  User,
  Recycle,
} from 'lucide-react';

import { AdminAccount, ADMIN_ROLE_LABELS, OPSProfile } from '../types/ops';
import { formatNumberID, formatRupiah } from '../utils/format';

export type NavTab = 'dashboard' | 'pelanggan' | 'iuran' | 'transaksi' | 'cleanup' | 'komposisi' | 'daurulang' | 'keuangan' | 'cetak' | 'akun' | 'backup';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeOPS?: OPSProfile;
  selectedYear?: number;
  activePelangganCount: number;
  saldoKas: number;
  totalSampahBulanIniKg: number;
  currentAdmin?: AdminAccount;
  onOpenLoginAdmin?: () => void;
  onLogoutRequest?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  activeOPS,
  selectedYear,
  activePelangganCount,
  saldoKas,
  totalSampahBulanIniKg,
  currentAdmin,
  onOpenLoginAdmin,
  onLogoutRequest,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard Ringkasan',
      sub: 'Statistik & Ringkasan Umum',
      icon: LayoutDashboard,
    },
    {
      id: 'pelanggan' as NavTab,
      label: 'Data Pelanggan',
      sub: 'Daftar Warga & Tren Pelanggan',
      icon: Users,
      badge: `${activePelangganCount} Aktif`,
    },
    {
      id: 'iuran' as NavTab,
      label: 'Pembayaran Iuran',
      sub: 'Matriks & Realisasi Iuran',
      icon: CreditCard,
    },
    {
      id: 'transaksi' as NavTab,
      label: 'Transaksi Sampah',
      sub: 'Rit, Dimensi Bak, & Karung',
      icon: Truck,
    },
    ...(currentAdmin?.role === 'superadmin' || currentAdmin?.role === 'viewer'
      ? [
          {
            id: 'cleanup' as NavTab,
            label: 'Clean-up Pantai',
            sub: 'Sumber Sampah Pesisir & Relawan',
            icon: Waves,
          },
        ]
      : []),
    {
      id: 'komposisi' as NavTab,
      label: 'Komposisi & Plastik',
      sub: 'Karakterisasi & 7 Jenis Plastik',
      icon: PieChart,
    },
    {
      id: 'daurulang' as NavTab,
      label: 'Sampah Daur Ulang',
      sub: 'Stok Siap Jual & Penjualan',
      icon: Recycle,
    },
    {
      id: 'keuangan' as NavTab,
      label: 'Laporan Keuangan',
      sub: 'Arus Kas & Neraca Saldo',
      icon: Wallet,
    },
    {
      id: 'cetak' as NavTab,
      label: 'Cetak Laporan',
      sub: 'Laporan Bulanan & Kwitansi',
      icon: Printer,
    },
    ...(currentAdmin?.role === 'superadmin'
      ? [
          {
            id: 'akun' as NavTab,
            label: 'Kelola Akun',
            sub: 'Admin OPS & Petugas Entri',
            icon: ShieldCheck,
          },
          {
            id: 'backup' as NavTab,
            label: 'Backup & Restore',
            sub: 'Cadangan & Pemulihan Data',
            icon: HardDrive,
          },
        ]
      : []),
  ];

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile & Tablet Dark Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-2xs transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Fixed Drawer on Mobile & Tablet (<lg), Fixed Left Column on Desktop (lg+) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-2xl transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:shadow-xs lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-3 space-y-1 overflow-y-auto">
          {/* Header on Mobile & Tablet: Title + Close Button */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 lg:border-b-0 pb-2 mb-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700 lg:hidden" />
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Menu Navigasi
              </span>
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors lg:hidden cursor-pointer"
                aria-label="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center justify-between transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700'
                    : 'text-emerald-900 hover:bg-emerald-50 hover:text-emerald-950 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-emerald-600 group-hover:text-emerald-700'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold tracking-tight leading-snug">{item.label}</div>
                    <div className={`text-[10px] ${isActive ? 'text-emerald-100 font-normal' : 'text-emerald-700/80 font-normal'}`}>
                      {item.sub}
                    </div>
                  </div>
                </div>

                {item.badge ? (
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-opacity ${
                      isActive ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-100 text-emerald-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Summary Snapshot */}
        <div className="p-3.5 m-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider truncate">
              Status Keuangan OPS
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          </div>

          {activeOPS && (
            <div className="text-[10px] font-semibold text-emerald-900 bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-md truncate">
              {activeOPS.id === 'all' ? '🌐 Semua OPS (Konsolidasi)' : `${activeOPS.kode} • ${activeOPS.nama}`}
            </div>
          )}

          <div>
            <div className="text-[11px] text-emerald-700">
              Saldo Kas Riil {selectedYear ? `(${selectedYear})` : ''}:
            </div>
            <div
              className={`text-sm font-bold font-mono tabular-nums ${
                saldoKas < 0 ? 'text-rose-600' : 'text-emerald-950'
              }`}
            >
              {formatRupiah(saldoKas, false)}
            </div>
          </div>

          <div className="pt-1.5 border-t border-emerald-200">
            <div className="text-[11px] text-emerald-700">
              Sampah Terangkut {selectedYear ? `(${selectedYear})` : ''}:
            </div>
            <div className="text-xs font-bold text-emerald-800 font-mono tabular-nums">
              {formatNumberID(totalSampahBulanIniKg / 1000, 2)} Ton ({formatNumberID(totalSampahBulanIniKg, 1)} Kg)
            </div>
          </div>

          <div className="pt-1 text-[10px] text-emerald-700/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Tersinkronisasi Real-time</span>
          </div>
        </div>

        {/* Admin Account Profile Card in Sidebar */}
        {currentAdmin && (
          <div className="p-3 mx-3 mb-3 bg-white border border-emerald-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: currentAdmin.avatarColor || '#059669' }}
              >
                {currentAdmin.nama.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentAdmin.nama}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold truncate">
                  {ADMIN_ROLE_LABELS[currentAdmin.role] || 'Admin OPS'} • {currentAdmin.opsId === 'all' ? 'Semua OPS' : currentAdmin.opsNama}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-col gap-1.5">
              {currentAdmin.role === 'viewer' ? (
                <button
                  type="button"
                  onClick={onOpenLoginAdmin}
                  className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-white shrink-0" />
                  <span>Login Pengurus / Edit Data</span>
                </button>
              ) : (
                <>
                  <div className={currentAdmin?.role === 'superadmin' ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}>
                    {onOpenLoginAdmin && (
                      <button
                        type="button"
                        onClick={onOpenLoginAdmin}
                        className="py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>Ganti Akun</span>
                      </button>
                    )}
                    {currentAdmin?.role === 'superadmin' && (
                      <button
                        type="button"
                        onClick={() => handleItemClick('akun')}
                        className="py-1 text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>Kelola Akun</span>
                      </button>
                    )}
                  </div>

                  {onLogoutRequest && (
                    <button
                      type="button"
                      onClick={onLogoutRequest}
                      className="w-full py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3 h-3 text-rose-600" />
                      <span>Keluar (Kembali ke Pengunjung)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
