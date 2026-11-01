import React from 'react';
import {
  LayoutDashboard,
  Users,
  Truck,
  PieChart,
  Wallet,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'pelanggan' | 'transaksi' | 'komposisi' | 'keuangan' | 'cetak';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activePelangganCount: number;
  saldoKas: number;
  totalSampahBulanIniKg: number;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  activePelangganCount,
  saldoKas,
  totalSampahBulanIniKg,
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
      label: 'Data Pelanggan & Iuran',
      sub: 'Input Warga & Matriks Iuran',
      icon: Users,
      badge: `${activePelangganCount} Aktif`,
    },
    {
      id: 'transaksi' as NavTab,
      label: 'Transaksi Sampah',
      sub: 'Rit, Dimensi Bak, & Timbangan',
      icon: Truck,
    },
    {
      id: 'komposisi' as NavTab,
      label: 'Komposisi & Plastik',
      sub: 'Karakterisasi & 7 Jenis Plastik',
      icon: PieChart,
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
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-xs">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
          Menu Navigasi Lingkungan
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
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
      <div className="p-4 m-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
            Status Keuangan OPS
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>

        <div>
          <div className="text-[11px] text-emerald-700">Saldo Kas Riil:</div>
          <div className="text-sm font-bold text-emerald-950 font-mono tabular-nums">
            {saldoKas < 0 ? `-Rp ${Math.abs(saldoKas).toLocaleString('id-ID')}` : `Rp ${saldoKas.toLocaleString('id-ID')}`}
          </div>
        </div>

        <div className="pt-2 border-t border-emerald-200">
          <div className="text-[11px] text-emerald-700">Sampah Terangkut:</div>
          <div className="text-xs font-bold text-emerald-800 font-mono tabular-nums">
            {(totalSampahBulanIniKg / 1000).toFixed(2)} Ton ({(totalSampahBulanIniKg).toLocaleString('id-ID')} Kg)
          </div>
        </div>

        <div className="pt-1 text-[10px] text-emerald-700/80 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Sistem Berjalan Offline</span>
        </div>
      </div>
    </aside>
  );
};
