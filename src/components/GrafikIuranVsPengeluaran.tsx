import React, { useState, useMemo, useRef } from 'react';
import { OPSProfile, Pelanggan, PembayaranIuran, TransaksiKas } from '../types/ops';
import { BtnCopyGrafik } from './BtnCopyGrafik';
import {
  formatRupiah,
  formatNumberID,
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  downloadCSV,
  isPelangganTargetDiBulan,
  getTarifPelangganBulan,
} from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  TrendingUp,
  BarChart3,
  LineChart,
  Table as TableIcon,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  PiggyBank,
  Receipt,
  HelpCircle,
  Calendar,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  kasList: TransaksiKas[];
  selectedYear: number;
}

export const GrafikIuranVsPengeluaran: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  pembayaranList,
  kasList,
  selectedYear,
}) => {
  const [viewMode, setViewMode] = useState<'bar' | 'line' | 'table'>('bar');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 12 Months Aggregation Data
  const monthlyData = useMemo(() => {
    // Relevant customers for active OPS
    const relevantPelanggan = pelangganList.filter(
      p => activeOPS.id === 'all' || p.opsId === activeOPS.id
    );

    return Array.from({ length: 12 }, (_, idx) => {
      const monthNum = idx + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const monthPrefix = `${selectedYear}-${monthStr}`;

      // 1. Potensi / Target Iuran
      // Hanya pelanggan Aktif sejak bulan mereka mulai ikut layanan (tidak aktif = tidak dihitung target)
      const activeInMonth = relevantPelanggan.filter(p =>
        isPelangganTargetDiBulan(p, selectedYear, monthNum)
      );

      const potensi = activeInMonth.reduce((sum, p) => sum + getTarifPelangganBulan(p, selectedYear, monthNum), 0);

      // 2. Realisasi Iuran
      // A) from pembayaranList (dihitung per pelanggan terdaftar agar 100% konsisten dengan matriks)
      const bayarSum = relevantPelanggan.reduce((sum, p) => {
        const byr = pembayaranList.find(
          b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === monthNum
        );
        return sum + (byr?.jumlah || 0);
      }, 0);

      // B) from kasList with kategori 'Iuran Warga'
      const kasIuranSum = kasList
        .filter(
          k =>
            k.tanggal.startsWith(monthPrefix) &&
            k.kategori === 'Iuran Warga' &&
            k.pemasukan > 0 &&
            (activeOPS.id === 'all' || k.opsId === activeOPS.id)
        )
        .reduce((sum, k) => sum + (k.pemasukan || 0), 0);

      // Take maximum to ensure whichever table is recorded is counted
      const realisasi = Math.max(bayarSum, kasIuranSum);

      // 3. Pengeluaran
      const pengeluaran = kasList
        .filter(
          k =>
            k.tanggal.startsWith(monthPrefix) &&
            k.pengeluaran > 0 &&
            (activeOPS.id === 'all' || k.opsId === activeOPS.id)
        )
        .reduce((sum, k) => sum + (k.pengeluaran || 0), 0);

      const tunggakan = Math.max(0, potensi - realisasi);
      const selisih = realisasi - pengeluaran;
      const efisiensiPct = potensi > 0 ? (realisasi / potensi) * 100 : 0;
      const coveragePct = pengeluaran > 0 ? (realisasi / pengeluaran) * 100 : 0;

      return {
        monthIndex: idx,
        monthName: MONTH_NAMES_ID[idx],
        monthShort: MONTH_SHORT_ID[idx],
        potensi,
        realisasi,
        pengeluaran,
        tunggakan,
        selisih,
        efisiensiPct,
        coveragePct,
        activePelangganCount: activeInMonth.length,
      };
    });
  }, [activeOPS.id, pelangganList, pembayaranList, kasList, selectedYear]);

  // Totals for the whole year
  const totals = useMemo(() => {
    const totalPotensi = monthlyData.reduce((s, m) => s + m.potensi, 0);
    const totalRealisasi = monthlyData.reduce((s, m) => s + m.realisasi, 0);
    const totalPengeluaran = monthlyData.reduce((s, m) => s + m.pengeluaran, 0);
    const totalTunggakan = Math.max(0, totalPotensi - totalRealisasi);
    const totalSelisih = totalRealisasi - totalPengeluaran;
    const efisiensiOverall = totalPotensi > 0 ? (totalRealisasi / totalPotensi) * 100 : 0;
    const coverageOverall = totalPengeluaran > 0 ? (totalRealisasi / totalPengeluaran) * 100 : 0;

    return {
      totalPotensi,
      totalRealisasi,
      totalPengeluaran,
      totalTunggakan,
      totalSelisih,
      efisiensiOverall,
      coverageOverall,
    };
  }, [monthlyData]);

  // Active monthly selection logic
  const isMonthView = selectedMonth !== 'all';
  const currentMonthData = isMonthView ? monthlyData[selectedMonth - 1] : null;

  const currentPotensi = currentMonthData ? currentMonthData.potensi : totals.totalPotensi;
  const currentRealisasi = currentMonthData ? currentMonthData.realisasi : totals.totalRealisasi;
  const currentPengeluaran = currentMonthData ? currentMonthData.pengeluaran : totals.totalPengeluaran;
  const currentSelisih = currentMonthData ? currentMonthData.selisih : totals.totalSelisih;
  const currentTunggakan = currentMonthData ? currentMonthData.tunggakan : totals.totalTunggakan;
  const currentEfisiensi = currentMonthData ? currentMonthData.efisiensiPct : totals.efisiensiOverall;
  const currentGap = currentPotensi > 0 ? (currentTunggakan / currentPotensi) * 100 : 0;

  // Max value for chart scaling
  const maxValue = useMemo(() => {
    let max = 100000;
    monthlyData.forEach(d => {
      max = Math.max(max, d.potensi, d.realisasi, d.pengeluaran);
    });
    return Math.ceil(max * 1.15); // 15% headroom
  }, [monthlyData]);

  const handleExportCSV = () => {
    const headers = [
      'Bulan',
      'Tahun',
      'Organisasi OPS',
      'Potensi Iuran (Rp)',
      'Realisasi Iuran (Rp)',
      'Capaian Penagihan (%)',
      'Pengeluaran (Rp)',
      'Surplus / Defisit (Rp)',
      'Tunggakan (Rp)',
      'Coverage Operasional (%)',
    ];

    const rows = monthlyData.map(d => [
      d.monthName,
      selectedYear,
      activeOPS.nama,
      d.potensi,
      d.realisasi,
      d.efisiensiPct.toFixed(1),
      d.pengeluaran,
      d.selisih,
      d.tunggakan,
      d.coveragePct.toFixed(1),
    ]);

    // Footer row
    rows.push([
      'TOTAL TAHUNAN',
      selectedYear,
      activeOPS.nama,
      totals.totalPotensi,
      totals.totalRealisasi,
      totals.efisiensiOverall.toFixed(1),
      totals.totalPengeluaran,
      totals.totalSelisih,
      totals.totalTunggakan,
      totals.coverageOverall.toFixed(1),
    ]);

    downloadCSV(
      `Grafik_Potensi_Realisasi_Pengeluaran_${activeOPS.kode}_${selectedYear}.csv`,
      headers,
      rows
    );
  };

  const handleExportPDF = () => {
    const headers = [
      'No',
      'Bulan',
      'Warga Aktif',
      'Target Iuran (Rp)',
      'Realisasi Iuran (Rp)',
      'Capaian (%)',
      'Pengeluaran (Rp)',
      'Surplus/Defisit (Rp)',
      'Tunggakan (Rp)',
    ];
    const rows = monthlyData.map((d, idx) => [
      idx + 1,
      d.monthName,
      `${d.activePelangganCount} KK`,
      formatRupiah(d.potensi, false),
      formatRupiah(d.realisasi, false),
      `${formatNumberID(d.efisiensiPct, 1)}%`,
      formatRupiah(d.pengeluaran, false),
      formatRupiah(d.selisih, false),
      formatRupiah(d.tunggakan, false),
    ]);
    const footRows = [
      [
        '',
        'TOTAL TAHUNAN',
        '-',
        formatRupiah(totals.totalPotensi, false),
        formatRupiah(totals.totalRealisasi, false),
        `${formatNumberID(totals.efisiensiOverall, 1)}%`,
        formatRupiah(totals.totalPengeluaran, false),
        formatRupiah(totals.totalSelisih, false),
        formatRupiah(totals.totalTunggakan, false),
      ],
    ];

    downloadPDF({
      filename: `Komparasi_Iuran_vs_Pengeluaran_${activeOPS.kode}_${selectedYear}.pdf`,
      title: `KOMPARASI TARGET IURAN VS REALISASI IURAN VS PENGELUARAN (${selectedYear})`,
      subtitle: `Organisasi: ${activeOPS.nama} | Tahun: ${selectedYear}`,
      opsName: activeOPS.nama,
      orientation: 'landscape',
      summaryItems: [
        { label: 'Target Tagihan Setahun', value: formatRupiah(totals.totalPotensi, false) },
        { label: 'Realisasi Iuran', value: formatRupiah(totals.totalRealisasi, false) },
        { label: 'Total Pengeluaran', value: formatRupiah(totals.totalPengeluaran, false) },
        { label: 'Surplus / Defisit', value: formatRupiah(totals.totalSelisih, false) },
      ],
      headers,
      rows,
      footRows,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </span>
            <h3 className="font-bold text-base text-slate-900 tracking-tight">
              Grafik Komparasi: Potensi Iuran vs Realisasi Iuran vs Pengeluaran
            </h3>
            {isMonthView ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-mono shadow-2xs">
                Bulan {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                Tahun {selectedYear} (Setahun)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analisis kemampuan penagihan iuran warga terhadap kebutuhan biaya operasional pengelolaan sampah ({activeOPS.nama})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'bar'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Tampilkan grafik batang 3 kolom"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'line'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Tampilkan grafik garis & area tren"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Tren Garis</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Tampilkan tabel data rekapitulasi lengkap"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>

          {/* Salin Grafik Button */}
          {viewMode !== 'table' && (
            <BtnCopyGrafik
              chartRef={chartContainerRef}
              fileName={`Grafik_Iuran_vs_Biaya_${activeOPS.kode || 'OPS'}_${selectedYear}`}
              chartTitle="Grafik Iuran vs Biaya Operasional"
              variant="emerald"
            />
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download CSV Rekapitulasi Komparasi"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Export PDF button */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download PDF Rekapitulasi Komparasi"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* PILIHAN PER BULAN / PERIODE BAR */}
      <div className="px-4 sm:px-5 py-3 bg-emerald-50/50 border-b border-emerald-100/90 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 shrink-0">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Pilihan Periode:</span>
          </div>

          {/* Dropdown Pilihan Bulan */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-bold border border-emerald-300 rounded-lg bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs max-w-full truncate"
            title="Pilih untuk melihat data kumulatif setahun atau per bulan spesifik"
          >
            <option value="all">📅 Semua Bulan (Kumulatif 1 Tahun {selectedYear})</option>
            {MONTH_NAMES_ID.map((name, idx) => (
              <option key={idx} value={idx + 1}>
                Bulan {name} {selectedYear}
              </option>
            ))}
          </select>

          {isMonthView && (
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-emerald-300 shadow-2xs shrink-0"
            >
              <span>✕ Tampilkan Setahun Penuh</span>
            </button>
          )}
        </div>

        {/* Quick Month Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold cursor-pointer shrink-0 ${
              selectedMonth === 'all'
                ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Setahun
          </button>
          {MONTH_SHORT_ID.map((mShort, idx) => {
            const mNum = idx + 1;
            const isSelected = selectedMonth === mNum;
            return (
              <button
                key={mShort}
                type="button"
                onClick={() => setSelectedMonth(mNum)}
                className={`px-2 py-1 text-xs rounded-md transition-all font-mono cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-2xs font-bold ring-1 ring-emerald-500'
                    : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50'
                }`}
                title={`Pilih bulan ${MONTH_NAMES_ID[idx]} ${selectedYear}`}
              >
                {mShort}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Row - Dynamic based on selectedMonth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-3 sm:p-5 bg-white border-b border-slate-100">
        {/* KPI 1: Potensi Iuran */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 text-xs text-blue-700 font-semibold mb-1 min-w-0">
              <span className="flex items-center gap-1 truncate shrink min-w-0">
                <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Potensi Iuran</span>
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                {isMonthView ? `${MONTH_SHORT_ID[selectedMonth - 1]}` : '100% Target'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-blue-950 tracking-tight truncate">
              {formatRupiah(currentPotensi, false)}
            </div>
          </div>
          <p className="text-[11px] text-blue-800/80 mt-1.5 leading-relaxed line-clamp-2">
            {isMonthView
              ? `Target penagihan bulan ${MONTH_NAMES_ID[selectedMonth - 1]} (${currentMonthData?.activePelangganCount || 0} KK)`
              : 'Maksimum penagihan bila seluruh KK tertib'}
          </p>
        </div>

        {/* KPI 2: Realisasi Iuran */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 text-xs text-emerald-800 font-semibold mb-1 min-w-0">
              <span className="flex items-center gap-1 truncate shrink min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Realisasi Iuran</span>
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                {currentEfisiensi.toFixed(1)}%
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-950 tracking-tight truncate">
              {formatRupiah(currentRealisasi, false)}
            </div>
          </div>
          <p className="text-[11px] text-emerald-800/80 mt-1.5 leading-relaxed line-clamp-2">
            {isMonthView
              ? `Penerimaan kas iuran bulan ${MONTH_NAMES_ID[selectedMonth - 1]}`
              : 'Penerimaan kas iuran warga yang telah masuk'}
          </p>
        </div>

        {/* KPI 3: Total Pengeluaran */}
        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 text-xs text-rose-800 font-semibold mb-1 min-w-0">
              <span className="flex items-center gap-1 truncate shrink min-w-0">
                <Receipt className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">Pengeluaran</span>
              </span>
              <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                {isMonthView ? `Biaya ${MONTH_SHORT_ID[selectedMonth - 1]}` : 'Biaya Riil'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-rose-950 tracking-tight truncate">
              {formatRupiah(currentPengeluaran, false)}
            </div>
          </div>
          <p className="text-[11px] text-rose-800/80 mt-1.5 leading-relaxed line-clamp-2">
            {isMonthView
              ? `Pengeluaran kas bulan ${MONTH_NAMES_ID[selectedMonth - 1]}`
              : 'Gaji petugas, BBM armada, listrik, & pemeliharaan'}
          </p>
        </div>

        {/* KPI 4: Surplus / Defisit Operasional Iuran */}
        <div
          className={`p-3.5 rounded-xl border min-w-0 overflow-hidden flex flex-col justify-between ${
            currentSelisih >= 0
              ? 'bg-emerald-50/50 border-emerald-300'
              : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <div>
            <div
              className={`flex items-center justify-between gap-1 text-xs font-semibold mb-1 min-w-0 ${
                currentSelisih >= 0 ? 'text-emerald-800' : 'text-amber-900'
              }`}
            >
              <span className="flex items-center gap-1 truncate shrink min-w-0">
                <PiggyBank className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Net Iuran vs Biaya</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                  currentSelisih >= 0
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {currentSelisih >= 0 ? 'Surplus' : 'Defisit'}
              </span>
            </div>
            <div
              className={`text-base sm:text-lg font-bold font-mono tracking-tight truncate ${
                currentSelisih >= 0 ? 'text-emerald-900' : 'text-amber-950'
              }`}
            >
              {formatRupiah(Math.abs(currentSelisih), false)}
            </div>
          </div>
          <p
            className={`text-[11px] mt-1.5 leading-relaxed line-clamp-2 ${
              currentSelisih >= 0 ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {currentSelisih >= 0
              ? 'Iuran menutup seluruh biaya operasional'
              : `Iuran belum menutup seluruh biaya (butuh dana lain)`}
          </p>
        </div>

        {/* KPI 5: Tunggakan Belum Tertagih */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 text-xs text-slate-700 font-semibold mb-1 min-w-0">
              <span className="flex items-center gap-1 truncate shrink min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Tunggakan</span>
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                {currentGap.toFixed(1)}% Gap
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight truncate">
              {formatRupiah(currentTunggakan, false)}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
            {isMonthView
              ? `Sisa tagihan bulan ${MONTH_NAMES_ID[selectedMonth - 1]}`
              : 'Potensi dana yang belum disetorkan warga'}
          </p>
        </div>
      </div>

      {/* Main Visual Presentation */}
      <div ref={chartContainerRef} className="p-5 bg-white">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-blue-500 shadow-2xs"></span>
              <span className="font-semibold text-slate-800">Potensi Iuran (Target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-emerald-600 shadow-2xs"></span>
              <span className="font-semibold text-slate-800">Realisasi Iuran (Uang Masuk)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-rose-500 shadow-2xs"></span>
              <span className="font-semibold text-slate-800">Pengeluaran (Biaya Operasional)</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 italic">
            *Arahkan kursor pada batang / grafik untuk melihat rincian bulan terkait
          </div>
        </div>

        {/* VIEW 1: GROUPED BAR CHART */}
        {viewMode === 'bar' && (
          <div className="space-y-4">
            <div className="relative h-72 sm:h-80 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-200">
              {/* Grid guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-dashed border-slate-400 w-full"></div>
                <div className="border-b border-dashed border-slate-400 w-full"></div>
                <div className="border-b border-dashed border-slate-400 w-full"></div>
                <div className="border-b border-dashed border-slate-400 w-full"></div>
              </div>

              {monthlyData.map((d, idx) => {
                const isHovered = hoveredMonthIdx === idx;
                const isSelected = selectedMonth === idx + 1;
                const potensiH = maxValue > 0 ? (d.potensi / maxValue) * 100 : 0;
                const realisasiH = maxValue > 0 ? (d.realisasi / maxValue) * 100 : 0;
                const pengeluaranH = maxValue > 0 ? (d.pengeluaran / maxValue) * 100 : 0;

                return (
                  <div
                    key={d.monthShort}
                    onClick={() => setSelectedMonth(selectedMonth === idx + 1 ? 'all' : idx + 1)}
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    className={`relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all p-0.5 rounded-lg ${
                      isSelected
                        ? 'bg-emerald-50/95 ring-2 ring-emerald-500 border border-emerald-400 shadow-sm'
                        : isHovered
                        ? 'bg-slate-100/90'
                        : 'hover:bg-slate-50'
                    }`}
                    title={`Klik untuk filter data bulan ${d.monthName}`}
                  >
                    {/* Hover Tooltip Popup */}
                    {isHovered && (
                      <div className="absolute -top-36 z-30 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl w-56 pointer-events-none transform -translate-x-1/2 left-1/2 animate-in fade-in zoom-in-95 duration-100">
                        <div className="font-bold border-b border-slate-700 pb-1 mb-2 text-emerald-400 flex items-center justify-between">
                          <span>{d.monthName} {selectedYear}</span>
                          <span className="text-[10px] text-slate-300">
                            Capaian: {d.efisiensiPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex justify-between items-center text-blue-300">
                            <span>Potensi:</span>
                            <span>{formatRupiah(d.potensi, false)}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-300">
                            <span>Realisasi:</span>
                            <span>{formatRupiah(d.realisasi, false)}</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-300">
                            <span>Pengeluaran:</span>
                            <span>{formatRupiah(d.pengeluaran, false)}</span>
                          </div>
                          <div className="pt-1 border-t border-slate-700 flex justify-between items-center font-bold">
                            <span className={d.selisih >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {d.selisih >= 0 ? 'Surplus:' : 'Defisit:'}
                            </span>
                            <span className={d.selisih >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {formatRupiah(d.selisih, false)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 text-[10px]">
                            <span>Tunggakan:</span>
                            <span>{formatRupiah(d.tunggakan, false)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Group of 3 Bars */}
                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full px-0.5">
                      {/* Bar 1: Potensi (Blue) */}
                      <div className="flex-1 max-w-[14px] flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${Math.max(potensiH, 3)}%` }}
                          className={`w-full rounded-t-xs transition-all ${
                            isHovered || isSelected ? 'bg-blue-400' : 'bg-blue-500'
                          }`}
                          title={`Potensi: ${formatRupiah(d.potensi, false)}`}
                        ></div>
                      </div>

                      {/* Bar 2: Realisasi (Emerald) */}
                      <div className="flex-1 max-w-[14px] flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${Math.max(realisasiH, 3)}%` }}
                          className={`w-full rounded-t-xs transition-all ${
                            isHovered || isSelected ? 'bg-emerald-500' : 'bg-emerald-600'
                          }`}
                          title={`Realisasi: ${formatRupiah(d.realisasi, false)}`}
                        ></div>
                      </div>

                      {/* Bar 3: Pengeluaran (Rose) */}
                      <div className="flex-1 max-w-[14px] flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${Math.max(pengeluaranH, 3)}%` }}
                          className={`w-full rounded-t-xs transition-all ${
                            isHovered || isSelected ? 'bg-rose-400' : 'bg-rose-500'
                          }`}
                          title={`Pengeluaran: ${formatRupiah(d.pengeluaran, false)}`}
                        ></div>
                      </div>
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-[10px] sm:text-xs mt-2 font-mono truncate transition-all ${
                        isSelected
                          ? 'text-emerald-900 font-bold underline decoration-emerald-500 decoration-2'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {d.monthShort}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom summary note */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 pt-2 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  Tingkat Penagihan Tahunan Rata-Rata: <strong>{totals.efisiensiOverall.toFixed(1)}%</strong>
                </span>
              </div>
              <div>
                Rata-rata Biaya Operasional Bulanan: <strong>{formatRupiah(totals.totalPengeluaran / 12, false)}/bln</strong>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: LINE & AREA TREND CHART */}
        {viewMode === 'line' && (
          <div className="space-y-4">
            <div className="relative h-72 sm:h-80 w-full pt-4 pb-2 border-b border-slate-200">
              {/* Responsive SVG Line Chart */}
              <svg viewBox="0 0 1000 300" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="gradientPotensi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradientRealisasi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradientPengeluaran" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0.2, 0.4, 0.6, 0.8].map(ratio => (
                  <line
                    key={ratio}
                    x1="40"
                    y1={300 - ratio * 260}
                    x2="960"
                    y2={300 - ratio * 260}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Calculate points for 12 months */}
                {(() => {
                  const pointsPotensi = monthlyData.map((d, i) => {
                    const x = 50 + (i * 900) / 11;
                    const y = 280 - (maxValue > 0 ? (d.potensi / maxValue) * 240 : 0);
                    return { x, y, val: d.potensi };
                  });

                  const pointsRealisasi = monthlyData.map((d, i) => {
                    const x = 50 + (i * 900) / 11;
                    const y = 280 - (maxValue > 0 ? (d.realisasi / maxValue) * 240 : 0);
                    return { x, y, val: d.realisasi };
                  });

                  const pointsPengeluaran = monthlyData.map((d, i) => {
                    const x = 50 + (i * 900) / 11;
                    const y = 280 - (maxValue > 0 ? (d.pengeluaran / maxValue) * 240 : 0);
                    return { x, y, val: d.pengeluaran };
                  });

                  const pathPotensi = pointsPotensi.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPotensi = `${pathPotensi} L ${pointsPotensi[11].x} 280 L ${pointsPotensi[0].x} 280 Z`;

                  const pathRealisasi = pointsRealisasi.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaRealisasi = `${pathRealisasi} L ${pointsRealisasi[11].x} 280 L ${pointsRealisasi[0].x} 280 Z`;

                  const pathPengeluaran = pointsPengeluaran.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPengeluaran = `${pathPengeluaran} L ${pointsPengeluaran[11].x} 280 L ${pointsPengeluaran[0].x} 280 Z`;

                  return (
                    <>
                      {/* Area Fills */}
                      <path d={areaPotensi} fill="url(#gradientPotensi)" />
                      <path d={areaRealisasi} fill="url(#gradientRealisasi)" />
                      <path d={areaPengeluaran} fill="url(#gradientPengeluaran)" />

                      {/* Line Strokes */}
                      <path d={pathPotensi} fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="5 3" />
                      <path d={pathRealisasi} fill="none" stroke="#059669" strokeWidth="3.5" />
                      <path d={pathPengeluaran} fill="none" stroke="#e11d48" strokeWidth="3" />

                      {/* Interactive Data Circles */}
                      {monthlyData.map((d, i) => {
                        const ptPot = pointsPotensi[i];
                        const ptReal = pointsRealisasi[i];
                        const ptKel = pointsPengeluaran[i];
                        const isHovered = hoveredMonthIdx === i;

                        return (
                          <g
                            key={d.monthShort}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredMonthIdx(i)}
                            onMouseLeave={() => setHoveredMonthIdx(null)}
                          >
                            {/* Hover vertical bar line */}
                            {isHovered && (
                              <line
                                x1={ptPot.x}
                                y1="20"
                                x2={ptPot.x}
                                y2="280"
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                                strokeDasharray="2 2"
                              />
                            )}

                            {/* Circles */}
                            <circle cx={ptPot.x} cy={ptPot.y} r={isHovered ? 6 : 4} fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                            <circle cx={ptReal.x} cy={ptReal.y} r={isHovered ? 7 : 4.5} fill="#059669" stroke="#ffffff" strokeWidth="2" />
                            <circle cx={ptKel.x} cy={ptKel.y} r={isHovered ? 6 : 4} fill="#e11d48" stroke="#ffffff" strokeWidth="2" />

                            {/* Month label along bottom */}
                            <text
                              x={ptPot.x}
                              y="298"
                              textAnchor="middle"
                              className={`text-[11px] font-mono select-none ${
                                isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                              }`}
                            >
                              {d.monthShort}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Hover details if active */}
            {hoveredMonthIdx !== null && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-800 font-sans">
                  {monthlyData[hoveredMonthIdx].monthName} {selectedYear}:
                </span>
                <span className="text-blue-700">
                  Potensi: {formatRupiah(monthlyData[hoveredMonthIdx].potensi, false)}
                </span>
                <span className="text-emerald-700 font-bold">
                  Realisasi: {formatRupiah(monthlyData[hoveredMonthIdx].realisasi, false)} (
                  {monthlyData[hoveredMonthIdx].efisiensiPct.toFixed(1)}%)
                </span>
                <span className="text-rose-700">
                  Pengeluaran: {formatRupiah(monthlyData[hoveredMonthIdx].pengeluaran, false)}
                </span>
                <span
                  className={`font-bold ${
                    monthlyData[hoveredMonthIdx].selisih >= 0 ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  Selisih: {formatRupiah(monthlyData[hoveredMonthIdx].selisih, false)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: DETAILED RECAPITULATION TABLE */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-emerald-900 text-white uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3 border-r border-emerald-800">Bulan</th>
                  <th className="px-4 py-3 text-right border-r border-emerald-800">
                    Potensi Iuran (Rp)
                  </th>
                  <th className="px-4 py-3 text-right border-r border-emerald-800">
                    Realisasi Iuran (Rp)
                  </th>
                  <th className="px-3 py-3 text-center border-r border-emerald-800">
                    Capaian (%)
                  </th>
                  <th className="px-4 py-3 text-right border-r border-emerald-800">
                    Tunggakan (Rp)
                  </th>
                  <th className="px-4 py-3 text-right border-r border-emerald-800">
                    Pengeluaran (Rp)
                  </th>
                  <th className="px-4 py-3 text-right border-r border-emerald-800">
                    Surplus / Defisit
                  </th>
                  <th className="px-3 py-3 text-center">Status Iuran vs Beban</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {monthlyData.map(d => {
                  const isSurplus = d.selisih >= 0;
                  const isSelected = selectedMonth === d.monthIndex + 1;
                  return (
                    <tr
                      key={d.monthShort}
                      onClick={() => setSelectedMonth(selectedMonth === d.monthIndex + 1 ? 'all' : d.monthIndex + 1)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-100/70 font-semibold ring-1 ring-emerald-500' : 'hover:bg-slate-50'
                      }`}
                      title={`Klik untuk filter data bulan ${d.monthName}`}
                    >
                      <td className="px-4 py-2.5 font-sans font-bold text-slate-900 border-r border-slate-100">
                        {d.monthName}
                      </td>
                      <td className="px-4 py-2.5 text-right text-blue-900 font-semibold border-r border-slate-100 tabular-nums">
                        {formatRupiah(d.potensi, false)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-800 font-bold border-r border-slate-100 tabular-nums">
                        {formatRupiah(d.realisasi, false)}
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-slate-100 tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.efisiensiPct >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.efisiensiPct >= 70
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.efisiensiPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 border-r border-slate-100 tabular-nums">
                        {d.tunggakan > 0 ? formatRupiah(d.tunggakan, false) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-rose-700 font-semibold border-r border-slate-100 tabular-nums">
                        {formatRupiah(d.pengeluaran, false)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-bold border-r border-slate-100 tabular-nums ${
                          isSurplus ? 'text-emerald-700' : 'text-amber-800'
                        }`}
                      >
                        {formatRupiah(d.selisih, false)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            isSurplus
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isSurplus ? 'Mencukupi' : 'Butuh Subsidi'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider font-sans border-r border-slate-200">
                    TOTAL TAHUN {selectedYear}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-900 border-r border-slate-200 tabular-nums">
                    {formatRupiah(totals.totalPotensi, false)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-800 border-r border-slate-200 tabular-nums">
                    {formatRupiah(totals.totalRealisasi, false)}
                  </td>
                  <td className="px-3 py-3 text-center border-r border-slate-200 tabular-nums">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-xs">
                      {totals.efisiensiOverall.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 border-r border-slate-200 tabular-nums">
                    {formatRupiah(totals.totalTunggakan, false)}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-800 border-r border-slate-200 tabular-nums">
                    {formatRupiah(totals.totalPengeluaran, false)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right border-r border-slate-200 tabular-nums ${
                      totals.totalSelisih >= 0 ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    {formatRupiah(totals.totalSelisih, false)}
                  </td>
                  <td className="px-3 py-3 text-center font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        totals.totalSelisih >= 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {totals.totalSelisih >= 0 ? 'Surplus Iuran' : 'Defisit Iuran'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Strategic Analysis & Insights Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900">
              Interpretasi Operasional &amp; Keberlanjutan Finansial OPS:
            </div>
            <p>
              • <strong>Potensi vs Realisasi ({totals.efisiensiOverall.toFixed(1)}% Tercapai):</strong> Menunjukkan efektivitas penagihan iuran warga bulanan. Masih terdapat potensi tertagih sebesar{' '}
              <span className="font-mono font-bold text-slate-800">{formatRupiah(totals.totalTunggakan, false)}</span> yang dapat dimaksimalkan melalui petugas penagihan keliling atau reminder RT/RW.
            </p>
            <p>
              • <strong>Realisasi vs Pengeluaran ({totals.totalSelisih >= 0 ? 'Surplus' : 'Defisit'} {formatRupiah(Math.abs(totals.totalSelisih), false)}):</strong>{' '}
              {totals.totalSelisih >= 0
                ? 'Iuran warga terbukti mandiri dan sanggup membiayai seluruh ongkos operasional harian (ritase bbm, gaji kru, dan pemeliharaan alat).'
                : 'Penerimaan iuran warga masih lebih kecil dari ongkos operasional bulanan. OPS membutuhkan diversifikasi sumber pendapatan tambahan seperti penjualan barang daur ulang (anorganik), pupuk kompos organik, atau dana stimulus desa.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
