import React from 'react';
import {
  OPSProfile,
  Pelanggan,
  TransaksiPengangkutan,
  TransaksiKas,
  PembayaranIuran,
  KomposisiConfig,
  SumberSampah,
} from '../types/ops';
import {
  formatRupiah,
  formatNumberID,
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  isPelangganTargetDiBulan,
} from '../utils/format';
import {
  Users,
  Truck,
  Wallet,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  FileText,
  Printer,
  Building2,
  Edit2,
  Trash2,
  Waves,
  Recycle,
  Trash,
  MapPin,
} from 'lucide-react';
import { GrafikIuranVsPengeluaran } from './GrafikIuranVsPengeluaran';
import { GrafikTrenSampah } from './GrafikTrenSampah';
import { GrafikCleanUpPantai } from './GrafikCleanUpPantai';
import { GrafikRealisasiIuran } from './GrafikRealisasiIuran';
import { GrafikTrenPelanggan } from './GrafikTrenPelanggan';
import { NavTab } from './Sidebar';

interface Props {
  activeOPS: OPSProfile;
  opsList?: OPSProfile[];
  onSelectOPS?: (id: string) => void;
  onOpenKelolaOPS?: () => void;
  onOpenEditOPS?: (ops: OPSProfile) => void;
  onRequestDeleteOPS?: (ops: OPSProfile) => void;
  pelangganList: Pelanggan[];
  pengangkutanList: TransaksiPengangkutan[];
  cleanupList?: TransaksiPengangkutan[];
  kasList: TransaksiKas[];
  pembayaranList: PembayaranIuran[];
  komposisiConfig: KomposisiConfig;
  selectedYear: number;
  isSuperAdmin?: boolean;
  canViewCleanUp?: boolean;
  onOpenAddPelanggan: () => void;
  onOpenAddPengangkutan: (sumber?: SumberSampah) => void;
  onOpenAddKas: () => void;
  onOpenAddIuran: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<Props> = ({
  activeOPS,
  opsList = [],
  onSelectOPS,
  onOpenKelolaOPS,
  onOpenEditOPS,
  onRequestDeleteOPS,
  pelangganList,
  pengangkutanList,
  cleanupList = [],
  kasList,
  pembayaranList,
  komposisiConfig,
  selectedYear,
  isSuperAdmin = false,
  canViewCleanUp = false,
  onOpenAddPelanggan,
  onOpenAddPengangkutan,
  onOpenAddKas,
  onOpenAddIuran,
  onNavigateTab,
}) => {
  const yearStr = String(selectedYear);

  // Data pengangkutan OPS murni (tidak dicampur dengan Clean-up Pantai)
  const effectivePengangkutanList = pengangkutanList.filter(
    p => (p.sumberSampah || 'Pemukiman') !== 'Clean-up Pantai'
  );

  // Transactions & cash filtered by selected year
  const yearPengangkutan = effectivePengangkutanList.filter(p => p.tanggal?.startsWith(yearStr));
  const yearKas = kasList.filter(k => k.tanggal?.startsWith(yearStr));

  // Customers status (strictly synced with Daftar Pelanggan & Sidebar)
  const activePelanggan = pelangganList.filter(p => p.status === 'Aktif');
  const stoppedPelanggan = pelangganList.filter(p => p.status === 'Berhenti');

  // Total waste haul for selectedYear (khusus OPS)
  const totalOrganikKg = yearPengangkutan.reduce((sum, item) => sum + (item.beratOrganikKg || 0), 0);
  const totalAnorganikKg = yearPengangkutan.reduce((sum, item) => sum + (item.beratAnorganikKg || 0), 0);
  const totalSampahKg = totalOrganikKg + totalAnorganikKg;
  const totalSampahTon = totalSampahKg / 1000;

  // Coastal Clean-up Metrics (Data Mandiri Non-OPS, tidak bergantung pada pilihan OPS)
  const allCleanupItems = cleanupList;
  const cleanupItems = allCleanupItems.filter(p => p.tanggal?.startsWith(yearStr));
  const totalCleanDaur = cleanupItems.reduce((s, it) => s + (it.beratDaurUlangKg || 0), 0);
  const totalCleanPlastik = cleanupItems.reduce((s, it) => s + (it.beratPlastikKg || 0), 0);
  const totalCleanResidu = cleanupItems.reduce((s, it) => s + (it.beratResiduKg || 0), 0);
  const totalCleanUpKg = totalCleanDaur + totalCleanPlastik + totalCleanResidu;
  const totalRelawanCleanUp = cleanupItems.reduce((s, it) => s + (it.jumlahRelawan || 0), 0);

  // Total cash balance up to selectedYear & cash flows for selectedYear
  const kasUpToYear = kasList.filter(k => (k.tanggal?.slice(0, 4) || '') <= yearStr);
  const currentSaldo = kasUpToYear.length > 0 ? kasUpToYear[kasUpToYear.length - 1].saldo || 0 : 0;
  const totalPemasukan = yearKas.reduce((sum, item) => sum + (item.pemasukan || 0), 0);
  const totalPengeluaran = yearKas.reduce((sum, item) => sum + (item.pengeluaran || 0), 0);

  // Current month fee collection rate for selectedYear (hanya pelanggan aktif yang sudah ikut layanan di bulan ini)
  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const activeTargetPelangganThisMonth = activePelanggan.filter(p =>
    isPelangganTargetDiBulan(p, selectedYear, currentMonthNum)
  );
  const paymentsThisMonth = pembayaranList.filter(
    p => p.tahun === selectedYear && p.bulan === currentMonthNum
  );
  const paidCountThisMonth = paymentsThisMonth.filter(p => p.jumlah >= (activeOPS.tarifDefault || 20000)).length;
  const collectionRate = activeTargetPelangganThisMonth.length > 0
    ? Math.min(100, Math.round((paidCountThisMonth / activeTargetPelangganThisMonth.length) * 100))
    : 0;

  // Monthly haul aggregations for 12 months
  const monthlyHaulKg = Array.from({ length: 12 }, (_, idx) => {
    const mNum = idx + 1;
    const mStr = String(mNum).padStart(2, '0');
    const items = pengangkutanList.filter(
      p => p.tanggal.startsWith(`${selectedYear}-${mStr}`)
    );
    const org = items.reduce((s, it) => s + (it.beratOrganikKg || 0), 0);
    const anorg = items.reduce((s, it) => s + (it.beratAnorganikKg || 0), 0);
    return {
      month: MONTH_SHORT_ID[idx],
      org,
      anorg,
      total: org + anorg,
      count: items.length,
    };
  });

  const maxMonthlyHaul = Math.max(...monthlyHaulKg.map(m => m.total), 100);

  // Monthly cash flow aggregations for 12 months
  const monthlyCash = Array.from({ length: 12 }, (_, idx) => {
    const mNum = idx + 1;
    const mStr = String(mNum).padStart(2, '0');
    const items = kasList.filter(k => k.tanggal.startsWith(`${selectedYear}-${mStr}`));
    const masuk = items.reduce((s, it) => s + (it.pemasukan || 0), 0);
    const keluar = items.reduce((s, it) => s + (it.pengeluaran || 0), 0);
    return {
      month: MONTH_SHORT_ID[idx],
      masuk,
      keluar,
      net: masuk - keluar,
    };
  });

  const maxCashValue = Math.max(...monthlyCash.map(c => Math.max(c.masuk, c.keluar)), 500000);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Organization Snapshot */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {activeOPS.kode}
            </span>
            <span className="text-xs text-slate-500 font-medium">·</span>
            <span className="text-xs text-slate-500">{activeOPS.wilayah}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ringkasan Operasional {activeOPS.nama}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan data sampah terpadu: Pencatatan ritase pemukiman, rekapitulasi iuran warga, dan pembukuan kas.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenAddPengangkutan('Pemukiman')}
            className="px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Catat ritase sampah pemukiman"
          >
            <Truck className="w-4 h-4" />
            <span>+ Rit Sampah</span>
          </button>
          <button
            onClick={onOpenAddIuran}
            className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>+ Iuran Warga</span>
          </button>
          <button
            onClick={onOpenAddKas}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-slate-500" />
            <span>Catat Kas</span>
          </button>
          <button
            onClick={() => onNavigateTab('cetak')}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Consolidated Mode Alert & Quick OPS Switcher Banner */}
      {activeOPS.id === 'all' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <span>🌐 Menampilkan Seluruh Data Terkonsolidasi dari Semua OPS</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800">
                  {opsList.length} Organisasi Aktif
                </span>
              </div>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Semua angka pelanggan, ritase sampah, dan arus kas di bawah adalah akumulasi dari {opsList.map(o => o.nama).join(' & ')}.
              </p>
            </div>
          </div>
          {onSelectOPS && opsList.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-slate-600 font-medium text-[11px]">Filter OPS:</span>
              <button
                type="button"
                onClick={() => onSelectOPS('all')}
                className="px-2.5 py-1 rounded-md bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
              >
                🌐 Semua OPS
              </button>
              {opsList.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onSelectOPS(o.id)}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  {o.kode}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Pelanggan */}
        <div
          onClick={() => onNavigateTab('pelanggan')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Pelanggan Terdaftar ({selectedYear})
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2 truncate">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {activePelanggan.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">KK Aktif</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
            <span className="truncate">Total: {pelangganList.length} KK</span>
            <span className="text-rose-600 truncate">{stoppedPelanggan.length} Berhenti</span>
          </div>
        </div>

        {/* Card 2: Sampah Terangkut */}
        <div
          onClick={() => onNavigateTab('transaksi')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Sampah Terangkut ({selectedYear})
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100 transition-colors shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2 truncate">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatNumberID(totalSampahTon, 1)}
            </span>
            <span className="text-xs text-teal-700 font-medium truncate">Ton ({formatNumberID(totalSampahKg, 0)} Kg)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
            <span className="text-emerald-700 truncate">Org: {formatNumberID(totalOrganikKg, 0)} kg</span>
            <span className="text-amber-700 truncate">Anorg: {formatNumberID(totalAnorganikKg, 0)} kg</span>
          </div>
        </div>

        {/* Card 3: Saldo Kas */}
        <div
          onClick={() => onNavigateTab('keuangan')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Saldo Kas OPS ({selectedYear})
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100 transition-colors shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2 truncate">
            <span
              className={`text-xl sm:text-2xl font-bold font-mono tabular-nums truncate ${
                currentSaldo < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatRupiah(currentSaldo, false)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
            <span className="text-emerald-600 truncate">Masuk: {formatRupiah(totalPemasukan, false)}</span>
            <span className="text-rose-600 truncate">Keluar: {formatRupiah(totalPengeluaran, false)}</span>
          </div>
        </div>

        {/* Card 4: Kepatuhan Iuran */}
        <div
          onClick={() => onNavigateTab('iuran')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Kolektibilitas ({MONTH_SHORT_ID[currentMonthNum - 1]} {selectedYear})
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2 truncate">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {collectionRate}%
            </span>
            <span className="text-xs text-slate-500 truncate">
              ({paidCountThisMonth}/{activeTargetPelangganThisMonth.length} KK Aktif)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${collectionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Comparison Table between OPS */}
      {activeOPS.id === 'all' && opsList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 bg-white text-emerald-900 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                Matriks Perbandingan &amp; Rekapitulasi per Sumber OPS (Tahun {selectedYear})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-700 font-medium">
                Total {opsList.length} Organisasi Terdaftar
              </span>
              {onOpenKelolaOPS && (
                <button
                  type="button"
                  onClick={onOpenKelolaOPS}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                >
                  Kelola Seluruh Master OPS
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-emerald-800 text-white uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-2.5 border-r border-emerald-700">Kode &amp; Nama OPS</th>
                  <th className="px-4 py-2.5 border-r border-emerald-700">Wilayah Layanan</th>
                  <th className="px-3 py-2.5 text-center border-r border-emerald-700">Pelanggan Aktif</th>
                  <th className="px-3 py-2.5 text-center border-r border-emerald-700">Ritase</th>
                  <th className="px-3 py-2.5 text-right border-r border-emerald-700">Sampah (Kg)</th>
                  <th className="px-3 py-2.5 text-right border-r border-emerald-700">Sampah (Ton)</th>
                  <th className="px-3 py-2.5 text-right border-r border-emerald-700">Pemasukan</th>
                  <th className="px-3 py-2.5 text-right border-r border-emerald-700">Pengeluaran</th>
                  <th className="px-3 py-2.5 text-right border-r border-emerald-700">Saldo Kas</th>
                  <th className="px-3 py-2.5 text-center w-44">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {opsList.map(ops => {
                  const opsPelanggan = pelangganList.filter(p => p.opsId === ops.id);
                  const opsActivePel = opsPelanggan.filter(p => p.status === 'Aktif');
                  const opsHauls = pengangkutanList.filter(p => p.opsId === ops.id && p.tanggal?.startsWith(yearStr));
                  const opsTotalKg = opsHauls.reduce((s, it) => s + (it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0), 0);
                  const opsKas = kasList.filter(k => k.opsId === ops.id && k.tanggal?.startsWith(yearStr));
                  const opsMasuk = opsKas.reduce((s, it) => s + (it.pemasukan || 0), 0);
                  const opsKeluar = opsKas.reduce((s, it) => s + (it.pengeluaran || 0), 0);
                  const opsKasUpToYear = kasList.filter(k => k.opsId === ops.id && (k.tanggal?.slice(0, 4) || '') <= yearStr);
                  const opsSaldo = opsKasUpToYear.length > 0 ? opsKasUpToYear[opsKasUpToYear.length - 1].saldo || 0 : (opsMasuk - opsKeluar);

                  return (
                    <tr key={ops.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-sans font-bold text-slate-900 border-r border-slate-200">
                        <span className="px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 font-mono text-[10px] mr-2">
                          {ops.kode}
                        </span>
                        {ops.nama}
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-600 border-r border-slate-200">
                        {ops.wilayah}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-900 font-semibold border-r border-slate-200 tabular-nums">
                        {opsActivePel.length} KK
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-200 tabular-nums">
                        {opsHauls.length} Rit
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(opsTotalKg, 1)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(opsTotalKg / 1000, 2)}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-700 border-r border-slate-200 tabular-nums">
                        {formatRupiah(opsMasuk, false)}
                      </td>
                      <td className="px-3 py-3 text-right text-rose-700 border-r border-slate-200 tabular-nums">
                        {formatRupiah(opsKeluar, false)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 border-r border-slate-200 tabular-nums">
                        {formatRupiah(opsSaldo, false)}
                      </td>
                      <td className="px-3 py-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {onSelectOPS && (
                            <button
                              type="button"
                              onClick={() => onSelectOPS(ops.id)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                              title={`Pilih & kelola data ${ops.nama}`}
                            >
                              Pilih
                            </button>
                          )}
                          {onOpenEditOPS && (
                            <button
                              type="button"
                              onClick={() => onOpenEditOPS(ops)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title={`Edit data & parameter ${ops.nama}`}
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                          {onRequestDeleteOPS && (
                            <button
                              type="button"
                              onClick={() => onRequestDeleteOPS(ops)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title={`Hapus ${ops.nama}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Primary Financial Comparison Chart: Potensi Iuran vs Realisasi Iuran vs Pengeluaran */}
      <GrafikIuranVsPengeluaran
        activeOPS={activeOPS}
        pelangganList={pelangganList}
        pembayaranList={pembayaranList}
        kasList={kasList}
        selectedYear={selectedYear}
      />

      {/* Visualisasi Data Tren Volume Sampah Bulanan Menggunakan Recharts */}
      <GrafikTrenSampah
        activeOPS={activeOPS}
        pengangkutanList={effectivePengangkutanList}
        selectedYear={selectedYear}
      />

      {/* Visualisasi Persentase Tagihan & Realisasi Iuran Menggunakan Recharts */}
      <GrafikRealisasiIuran
        activeOPS={activeOPS}
        pelangganList={pelangganList}
        pembayaranList={pembayaranList}
        selectedYear={selectedYear}
      />

      {/* Visualisasi Tren Pertumbuhan Pelanggan Menggunakan Recharts */}
      <GrafikTrenPelanggan
        activeOPS={activeOPS}
        pelangganList={pelangganList}
        selectedYear={selectedYear}
      />

      {/* Main Charts & Visualizations Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Karakterisasi Komposisi Sampah & Plastik */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Karakterisasi Komposisi Sampah
              </h3>
              <p className="text-xs text-slate-500">
                Distribusi persentase fraksi sampah sesuai standar pemilahan OPS
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('komposisi')}
              className="text-xs text-teal-700 hover:text-teal-900 font-medium hover:underline flex items-center gap-1"
            >
              Lihat Rincian <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Segmented multi-color progress bar */}
          <div className="h-5 w-full rounded-lg overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${komposisiConfig.organikPct}%` }}
              className="bg-emerald-600 hover:opacity-90 transition-opacity"
              title={`Organik: ${komposisiConfig.organikPct}%`}
            ></div>
            <div
              style={{ width: `${komposisiConfig.plastikPct}%` }}
              className="bg-amber-400 hover:opacity-90 transition-opacity"
              title={`Plastik: ${komposisiConfig.plastikPct}%`}
            ></div>
            <div
              style={{ width: `${komposisiConfig.kertasPct}%` }}
              className="bg-blue-500 hover:opacity-90 transition-opacity"
              title={`Kertas: ${komposisiConfig.kertasPct}%`}
            ></div>
            <div
              style={{ width: `${komposisiConfig.kacaPct}%` }}
              className="bg-cyan-300 hover:opacity-90 transition-opacity"
              title={`Kaca: ${komposisiConfig.kacaPct}%`}
            ></div>
            <div
              style={{ width: `${komposisiConfig.logamPct}%` }}
              className="bg-orange-500 hover:opacity-90 transition-opacity"
              title={`Logam: ${komposisiConfig.logamPct}%`}
            ></div>
            <div
              style={{ width: `${komposisiConfig.popokPembalutPct}%` }}
              className="bg-purple-300 hover:opacity-90 transition-opacity"
              title={`Popok & Pembalut: ${komposisiConfig.popokPembalutPct}%`}
            ></div>
            <div
              style={{ width: `${komposisiConfig.lainnyaPct}%` }}
              className="bg-emerald-950 hover:opacity-90 transition-opacity"
              title={`Lain-lain: ${komposisiConfig.lainnyaPct}%`}
            ></div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 shrink-0"></span>
              <span className="text-slate-700 truncate">Organik ({komposisiConfig.organikPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-amber-400 shrink-0"></span>
              <span className="text-slate-700 truncate">Plastik ({komposisiConfig.plastikPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-blue-500 shrink-0"></span>
              <span className="text-slate-700 truncate">Kertas ({komposisiConfig.kertasPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-cyan-300 shrink-0"></span>
              <span className="text-slate-700 truncate">Kaca ({komposisiConfig.kacaPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-orange-500 shrink-0"></span>
              <span className="text-slate-700 truncate">Logam ({komposisiConfig.logamPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-purple-300 shrink-0"></span>
              <span className="text-slate-700 truncate">Popok/Pembalut ({komposisiConfig.popokPembalutPct}%)</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Estimasi Sampah Plastik: <strong>{((totalSampahKg * komposisiConfig.plastikPct) / 100).toFixed(1)} kg</strong></span>
            <span>Estimasi Organik: <strong>{((totalSampahKg * komposisiConfig.organikPct) / 100).toFixed(1)} kg</strong></span>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Haulings & Recent Cash Flows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hauling Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-teal-700" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Pengangkutan Sampah Terkini ({selectedYear})
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab('transaksi')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
            >
              Semua Transaksi →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2 text-right">Pelanggan</th>
                  <th className="px-3 py-2 text-right">Organik</th>
                  <th className="px-3 py-2 text-right">Anorganik</th>
                  <th className="px-3 py-2 text-right">Total Berat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {yearPengangkutan.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400 font-sans italic text-xs">
                      Belum ada transaksi pengangkutan sampah di tahun {selectedYear}
                    </td>
                  </tr>
                ) : (
                  yearPengangkutan.slice(0, 5).map(item => {
                    const total = (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 text-slate-900 font-sans font-medium whitespace-nowrap">
                          {item.hariTanggalLabel || item.tanggal}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                          {item.pelangganTerlayani} KK
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-700 tabular-nums">
                          {formatNumberID(item.beratOrganikKg, 1)} kg
                        </td>
                        <td className="px-3 py-2 text-right text-amber-700 tabular-nums">
                          {formatNumberID(item.beratAnorganikKg, 1)} kg
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                          {formatNumberID(total, 1)} kg
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Cash Flow Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-700" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Arus Kas Terkini ({selectedYear})
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab('keuangan')}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold"
            >
              Buku Kas Lengkap →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Kategori &amp; Uraian</th>
                  <th className="px-3 py-2 text-right">Masuk</th>
                  <th className="px-3 py-2 text-right">Keluar</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {yearKas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400 font-sans italic text-xs">
                      Belum ada catatan buku kas di tahun {selectedYear}
                    </td>
                  </tr>
                ) : (
                  yearKas.slice(-5).reverse().map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-slate-600 font-sans whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="px-3 py-2 text-slate-900 font-sans">
                        <div className="font-medium text-xs truncate max-w-[160px]">{item.kategori}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{item.uraian}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-600 tabular-nums">
                        {item.pemasukan > 0 ? formatRupiah(item.pemasukan, false) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-600 tabular-nums">
                        {item.pengeluaran > 0 ? formatRupiah(item.pengeluaran, false) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                        {formatRupiah(item.saldo || 0, false)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
