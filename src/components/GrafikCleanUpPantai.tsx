import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BtnCopyGrafik } from './BtnCopyGrafik';
import { TransaksiPengangkutan } from '../types/ops';
import { formatNumberID, MONTH_NAMES_ID, MONTH_SHORT_ID, downloadCSV } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Waves,
  Recycle,
  Trash2,
  Users,
  Download,
  FileText,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface Props {
  cleanupList: TransaksiPengangkutan[];
  selectedYear: number;
}

export const GrafikCleanUpPantai: React.FC<Props> = ({ cleanupList, selectedYear }) => {
  const [filterYear, setFilterYear] = useState<string>(String(selectedYear));
  const [activeView, setActiveView] = useState<'grafik' | 'tabel'>('grafik');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize when selectedYear changes from top toolbar
  useEffect(() => {
    setFilterYear(String(selectedYear));
  }, [selectedYear]);

  // Discover all available years from cleanup items
  const availableYears = useMemo(() => {
    const years = cleanupList
      .map(it => it.tanggal?.substring(0, 4))
      .filter(Boolean);
    const set = new Set([String(selectedYear), ...years, '2026', '2025']);
    return Array.from(set).sort().reverse();
  }, [cleanupList, selectedYear]);

  // Filtered clean-up items (show all data even before 2026 when 'all' is selected)
  const filteredItems = useMemo(() => {
    return cleanupList.filter(item => {
      if (filterYear === 'all') return true;
      return item.tanggal?.startsWith(filterYear);
    });
  }, [cleanupList, filterYear]);

  // Aggregate by month (1 to 12)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const monthNum = idx + 1;
      const mStr = String(monthNum).padStart(2, '0');

      const monthItems = filteredItems.filter(item => {
        if (!item.tanggal) return false;
        const parts = item.tanggal.split('-');
        return parts[1] === mStr;
      });

      const daurUlangKg = monthItems.reduce((s, it) => s + (it.beratDaurUlangKg || 0), 0);
      const plastikKg = monthItems.reduce((s, it) => s + (it.beratPlastikKg || 0), 0);
      const residuKg = monthItems.reduce((s, it) => s + (it.beratResiduKg || 0), 0);
      const totalKg = daurUlangKg + plastikKg + residuKg;
      const relawan = monthItems.reduce(
        (s, it) => s + (it.jumlahRelawan || it.pelangganTerlayani || 0),
        0
      );
      const kegiatanCount = monthItems.length;

      return {
        bulanIndex: monthNum,
        bulanName: MONTH_SHORT_ID[idx],
        bulanFullName: MONTH_NAMES_ID[idx],
        kegiatanCount,
        daurUlangKg: Number(daurUlangKg.toFixed(1)),
        plastikKg: Number(plastikKg.toFixed(1)),
        residuKg: Number(residuKg.toFixed(1)),
        totalKg: Number(totalKg.toFixed(1)),
        relawan,
      };
    });
  }, [filteredItems]);

  // Totals for KPI cards
  const totalDaurUlang = useMemo(
    () => filteredItems.reduce((s, it) => s + (it.beratDaurUlangKg || 0), 0),
    [filteredItems]
  );
  const totalPlastik = useMemo(
    () => filteredItems.reduce((s, it) => s + (it.beratPlastikKg || 0), 0),
    [filteredItems]
  );
  const totalResidu = useMemo(
    () => filteredItems.reduce((s, it) => s + (it.beratResiduKg || 0), 0),
    [filteredItems]
  );
  const totalSampahCleanUp = totalDaurUlang + totalPlastik + totalResidu;
  const totalRelawan = useMemo(
    () =>
      filteredItems.reduce(
        (s, it) => s + (it.jumlahRelawan || it.pelangganTerlayani || 0),
        0
      ),
    [filteredItems]
  );
  const totalKegiatan = filteredItems.length;

  const pctPlastik = totalSampahCleanUp > 0 ? (totalPlastik / totalSampahCleanUp) * 100 : 0;
  const pctDaur = totalSampahCleanUp > 0 ? (totalDaurUlang / totalSampahCleanUp) * 100 : 0;
  const pctResidu = totalSampahCleanUp > 0 ? (totalResidu / totalSampahCleanUp) * 100 : 0;

  // Pie chart data
  const pieData = [
    { name: 'Sampah Plastik', value: Number(totalPlastik.toFixed(1)), color: '#0284c7' }, // Sky-600
    { name: 'Daur Ulang', value: Number(totalDaurUlang.toFixed(1)), color: '#059669' }, // Emerald-600
    { name: 'Residu', value: Number(totalResidu.toFixed(1)), color: '#e11d48' }, // Rose-600
  ].filter(d => d.value > 0);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'Lokasi Pantai',
      'Relawan (Org)',
      'Daur Ulang (kg)',
      'Plastik (kg)',
      'Residu (kg)',
      'Total Sampah (kg)',
      'Armada',
      'Catatan',
    ];
    const rows = filteredItems.map((it, idx) => [
      idx + 1,
      it.tanggal,
      it.lokasiPantai || '-',
      it.jumlahRelawan || it.pelangganTerlayani || 0,
      it.beratDaurUlangKg || 0,
      it.beratPlastikKg || 0,
      it.beratResiduKg || 0,
      (it.beratDaurUlangKg || 0) + (it.beratPlastikKg || 0) + (it.beratResiduKg || 0),
      it.armada || '-',
      it.catatan || '-',
    ]);
    downloadCSV(
      `Laporan_CleanUp_Pantai_${filterYear === 'all' ? 'Semua_Tahun' : filterYear}.csv`,
      headers,
      rows
    );
  };

  // Export PDF
  const handleExportPDF = () => {
    const periodLabel = filterYear === 'all' ? 'Semua Tahun' : `Tahun ${filterYear}`;
    const headers = [
      'No',
      'Tanggal',
      'Lokasi Pantai',
      'Relawan (Org)',
      'Daur Ulang (kg)',
      'Plastik (kg)',
      'Residu (kg)',
      'Total Sampah (kg)',
      'Armada',
      'Catatan',
    ];
    const rows = filteredItems.map((it, idx) => {
      const daur = it.beratDaurUlangKg || 0;
      const plastik = it.beratPlastikKg || 0;
      const residu = it.beratResiduKg || 0;
      return [
        idx + 1,
        it.tanggal,
        it.lokasiPantai || '-',
        it.jumlahRelawan || it.pelangganTerlayani || 0,
        formatNumberID(daur, 1),
        formatNumberID(plastik, 1),
        formatNumberID(residu, 1),
        formatNumberID(daur + plastik + residu, 1),
        it.armada || '-',
        it.catatan || '-',
      ];
    });
    const footRows = [
      [
        '',
        'TOTAL AKUMULASI',
        `${totalKegiatan} Aksi`,
        `${formatNumberID(totalRelawan, 0)} Org`,
        `${formatNumberID(totalDaurUlang, 1)} kg`,
        `${formatNumberID(totalPlastik, 1)} kg`,
        `${formatNumberID(totalResidu, 1)} kg`,
        `${formatNumberID(totalSampahCleanUp, 1)} kg`,
        '-',
        '-',
      ],
    ];

    downloadPDF({
      filename: `Laporan_CleanUp_Pantai_${filterYear === 'all' ? 'Semua_Tahun' : filterYear}.pdf`,
      title: `LAPORAN VOLUME & KOMPOSISI BERSIH PANTAI`,
      subtitle: `Data Mandiri Non-OPS | Periode: ${periodLabel}`,
      opsName: 'Program Konservasi Pesisir & Laut',
      orientation: 'landscape',
      summaryItems: [
        { label: 'Total Aksi Kegiatan', value: `${totalKegiatan} Kegiatan` },
        { label: 'Total Relawan', value: `${formatNumberID(totalRelawan, 0)} Orang` },
        { label: 'Total Sampah Pesisir', value: `${formatNumberID(totalSampahCleanUp, 1)} Kg` },
        { label: 'Proporsi Plastik', value: `${formatNumberID(totalPlastik, 1)} Kg (${formatNumberID(pctPlastik, 1)}%)` },
      ],
      headers,
      rows,
      footRows,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 bg-linear-to-r from-cyan-900 via-teal-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <Waves className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-2xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950">
                Grafik &amp; Analisis
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-white">
                Volume &amp; Komposisi Bersih Pantai
              </h3>
            </div>
            <p className="text-[10px] sm:text-xs text-cyan-200/90 mt-0.5">
              Tren timbulan sampah pesisir per kategori dan partisipasi relawan laut
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-600/60 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-[10px] text-cyan-200 uppercase font-bold">Periode:</span>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-hidden text-xs"
            >
              <option value="all" className="bg-slate-900 text-white">
                Semua Periode / Tahun
              </option>
              {availableYears.map(yr => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle View */}
          <div className="flex items-center bg-cyan-950/90 p-0.5 rounded-lg border border-cyan-700/60">
            <button
              type="button"
              onClick={() => setActiveView('grafik')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                activeView === 'grafik'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-cyan-200 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tabel')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                activeView === 'tabel'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-cyan-200 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>

          {/* Salin Grafik Button */}
          {activeView === 'grafik' && (
            <BtnCopyGrafik
              chartRef={chartContainerRef}
              fileName={`Grafik_CleanUp_Pantai_${filterYear}`}
              chartTitle="Grafik Clean-up Pantai"
              variant="cyan"
            />
          )}

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1 bg-cyan-700/80 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg border border-cyan-500/50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download data clean-up ke file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg border border-rose-400/50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download data clean-up ke file PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200">
        {/* Total Sampah */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs min-w-0 overflow-hidden">
          <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 truncate">
            <Waves className="w-3 h-3 text-cyan-600 shrink-0" />
            <span className="truncate">Total Terangkat</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5 truncate">
            {formatNumberID(totalSampahCleanUp, 1)} <span className="text-xs text-slate-500 font-normal">kg</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans truncate">
            {totalKegiatan} kegiatan pesisir
          </div>
        </div>

        {/* Sampah Plastik */}
        <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200 shadow-2xs min-w-0 overflow-hidden">
          <div className="text-[10px] text-sky-800 uppercase font-bold flex items-center gap-1 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[8px] font-bold shrink-0">P</span>
            <span className="truncate">Sampah Plastik</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-sky-900 font-mono mt-0.5 truncate">
            {formatNumberID(totalPlastik, 1)} <span className="text-xs text-sky-700 font-normal">kg</span>
          </div>
          <div className="text-[10px] text-sky-700 mt-0.5 font-bold truncate">
            {formatNumberID(pctPlastik, 1)}% dari total
          </div>
        </div>

        {/* Sampah Daur Ulang */}
        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs min-w-0 overflow-hidden">
          <div className="text-[10px] text-emerald-800 uppercase font-bold flex items-center gap-1 truncate">
            <Recycle className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">Daur Ulang</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-900 font-mono mt-0.5 truncate">
            {formatNumberID(totalDaurUlang, 1)} <span className="text-xs text-emerald-700 font-normal">kg</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5 font-bold truncate">
            {formatNumberID(pctDaur, 1)}% dari total
          </div>
        </div>

        {/* Sampah Residu */}
        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs min-w-0 overflow-hidden">
          <div className="text-[10px] text-rose-800 uppercase font-bold flex items-center gap-1 truncate">
            <Trash2 className="w-3 h-3 text-rose-600 shrink-0" />
            <span className="truncate">Residu Pantai</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-900 font-mono mt-0.5 truncate">
            {formatNumberID(totalResidu, 1)} <span className="text-xs text-rose-700 font-normal">kg</span>
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5 font-bold truncate">
            {formatNumberID(pctResidu, 1)}% dari total
          </div>
        </div>

        {/* Relawan */}
        <div className="bg-cyan-50/70 p-3 rounded-xl border border-cyan-200 shadow-2xs min-w-0 overflow-hidden col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <div className="text-[10px] text-cyan-800 uppercase font-bold flex items-center gap-1 truncate">
            <Users className="w-3 h-3 text-cyan-600 shrink-0" />
            <span className="truncate">Total Relawan</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-cyan-950 font-mono mt-0.5 truncate">
            {formatNumberID(totalRelawan, 0)} <span className="text-xs text-cyan-700 font-normal">orang</span>
          </div>
          <div className="text-[10px] text-cyan-700 mt-0.5 font-sans truncate">
            {totalKegiatan > 0 ? (totalRelawan / totalKegiatan).toFixed(1) : 0} org/aksi
          </div>
        </div>
      </div>

      {/* Main Body */}
      {activeView === 'grafik' ? (
        <div ref={chartContainerRef} className="p-4 sm:p-5 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Stacked Bar Chart with Relawan Line */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Tren Bulanan Sampah Bersih Pantai (Kg) &amp; Relawan
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Grafik balok bertingkat (Plastik, Daur Ulang, Residu) dengan garis jumlah relawan
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="bulanName"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    {/* Left YAxis: Berat Sampah Kg */}
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickFormatter={val => `${val} kg`}
                    />
                    {/* Right YAxis: Jumlah Relawan */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#0891b2', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickFormatter={val => `${val} org`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700 min-w-[200px]">
                              <div className="font-bold text-cyan-300 border-b border-slate-700 pb-1 mb-1.5 flex justify-between">
                                <span>{item.bulanFullName}</span>
                                <span>{item.kegiatanCount} Aksi</span>
                              </div>
                              <div className="space-y-1 font-mono text-[11px]">
                                <div className="flex justify-between text-sky-300">
                                  <span>Plastik:</span>
                                  <span>{formatNumberID(item.plastikKg, 1)} kg</span>
                                </div>
                                <div className="flex justify-between text-emerald-300">
                                  <span>Daur Ulang:</span>
                                  <span>{formatNumberID(item.daurUlangKg, 1)} kg</span>
                                </div>
                                <div className="flex justify-between text-rose-300">
                                  <span>Residu:</span>
                                  <span>{formatNumberID(item.residuKg, 1)} kg</span>
                                </div>
                                <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1">
                                  <span>Total Sampah:</span>
                                  <span>{formatNumberID(item.totalKg, 1)} kg</span>
                                </div>
                                <div className="flex justify-between text-cyan-300 font-bold">
                                  <span>Relawan:</span>
                                  <span>{item.relawan} Relawan</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                      formatter={value => {
                        if (value === 'plastikKg') return 'Sampah Plastik (kg)';
                        if (value === 'daurUlangKg') return 'Daur Ulang (kg)';
                        if (value === 'residuKg') return 'Residu (kg)';
                        if (value === 'relawan') return 'Partisipasi Relawan (org)';
                        return value;
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="plastikKg"
                      stackId="sampah"
                      fill="#0284c7"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="daurUlangKg"
                      stackId="sampah"
                      fill="#059669"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="residuKg"
                      stackId="sampah"
                      fill="#e11d48"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="relawan"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#06b6d4', stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right 1 Col: Donut Chart of Waste Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <PieChartIcon className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Komposisi Limbah Pesisir</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Persentase jenis sampah yang berhasil diangkat dari garis pantai
                </p>
              </div>

              <div className="h-48 w-full my-2">
                {totalSampahCleanUp > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`${formatNumberID(Number(val), 1)} kg`, 'Berat']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Belum ada data kegiatan
                  </div>
                )}
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs font-medium">
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-sky-100/60 text-sky-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                    <span>Plastik</span>
                  </span>
                  <span className="font-mono font-bold">
                    {formatNumberID(totalPlastik, 1)} kg ({formatNumberID(pctPlastik, 0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-100/60 text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span>Daur Ulang</span>
                  </span>
                  <span className="font-mono font-bold">
                    {formatNumberID(totalDaurUlang, 1)} kg ({formatNumberID(pctDaur, 0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-rose-100/60 text-rose-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                    <span>Residu</span>
                  </span>
                  <span className="font-mono font-bold">
                    {formatNumberID(totalResidu, 1)} kg ({formatNumberID(pctResidu, 0)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Bulan</th>
                <th className="px-3 py-2.5 text-center">Kegiatan</th>
                <th className="px-3 py-2.5 text-center">Relawan (Org)</th>
                <th className="px-3 py-2.5 text-right text-sky-700">Plastik (kg)</th>
                <th className="px-3 py-2.5 text-right text-emerald-700">Daur Ulang (kg)</th>
                <th className="px-3 py-2.5 text-right text-rose-700">Residu (kg)</th>
                <th className="px-4 py-2.5 text-right font-black">Total Sampah (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {monthlyData.map(m => (
                <tr key={m.bulanIndex} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-sans font-semibold text-slate-800">
                    {m.bulanFullName}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-600">{m.kegiatanCount}</td>
                  <td className="px-3 py-2 text-center text-cyan-800 font-bold">{m.relawan}</td>
                  <td className="px-3 py-2 text-right text-sky-800 font-medium">
                    {formatNumberID(m.plastikKg, 1)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-800 font-medium">
                    {formatNumberID(m.daurUlangKg, 1)}
                  </td>
                  <td className="px-3 py-2 text-right text-rose-800 font-medium">
                    {formatNumberID(m.residuKg, 1)}
                  </td>
                  <td className="px-4 py-2 text-right font-black text-slate-900 bg-slate-50/50">
                    {formatNumberID(m.totalKg, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="px-4 py-2.5 font-bold uppercase text-[11px]">Total Akumulasi:</td>
                <td className="px-3 py-2.5 text-center font-mono">{totalKegiatan}</td>
                <td className="px-3 py-2.5 text-center font-mono text-cyan-900 font-black">
                  {totalRelawan}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sky-900 font-black">
                  {formatNumberID(totalPlastik, 1)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-900 font-black">
                  {formatNumberID(totalDaurUlang, 1)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-rose-900 font-black">
                  {formatNumberID(totalResidu, 1)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-emerald-800 text-sm font-black bg-emerald-50">
                  {formatNumberID(totalSampahCleanUp, 1)} kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
