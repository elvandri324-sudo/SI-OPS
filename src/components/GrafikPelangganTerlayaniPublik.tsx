import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  UserCheck,
  Truck,
  Percent,
  Building2,
  BarChart3,
  Table as TableIcon,
  Download,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { OPSProfile, Pelanggan, TransaksiPengangkutan } from '../types/ops';
import {
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  formatNumberID,
  downloadCSV,
} from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import { BtnCopyGrafik } from './BtnCopyGrafik';

interface Props {
  activeOPS: OPSProfile;
  opsList: OPSProfile[];
  pelangganList: Pelanggan[];
  pengangkutanList: TransaksiPengangkutan[];
  selectedYear: number;
}

export interface MonthlyServedPoint {
  monthNum: number;
  bulan: string;
  bulanLengkap: string;
  avgServed: number;
  pelangganAktif: number;
  cakupanPct: number;
  ritaseCount: number;
  avgZona1: number;
  avgZona2: number;
  avgZona3: number;
  hasZonedData: boolean;
}

export interface OpsServedSummary {
  opsId: string;
  nama: string;
  kode: string;
  isRhun: boolean;
  pelangganAktif: number;
  avgServed: number;
  cakupanPct: number;
  ritaseCount: number;
  activeMonths: number;
}

export function isRhunOPSProfile(ops?: OPSProfile | null): boolean {
  if (!ops) return false;
  return (
    (ops.nama || '').toLowerCase().includes('rhun') ||
    (ops.kode || '').toUpperCase().includes('PR') ||
    (ops.wilayah || '').toLowerCase().includes('rhun') ||
    ops.metodeUkurDefault === 'karung'
  );
}

function calcOpsMonthServed(
  ops: OPSProfile | undefined,
  hauls: TransaksiPengangkutan[]
): {
  avgServed: number;
  avgZona1: number;
  avgZona2: number;
  avgZona3: number;
  hasZonedData: boolean;
} {
  if (hauls.length === 0) {
    return {
      avgServed: 0,
      avgZona1: 0,
      avgZona2: 0,
      avgZona3: 0,
      hasZonedData: false,
    };
  }

  const z1Hauls = hauls.filter(it => it.zona === 'Zona 1');
  const z2Hauls = hauls.filter(it => it.zona === 'Zona 2');
  const z3Hauls = hauls.filter(it => it.zona === 'Zona 3');
  const hasZonedData = z1Hauls.length > 0 || z2Hauls.length > 0 || z3Hauls.length > 0;

  if (isRhunOPSProfile(ops) && hasZonedData) {
    const avgZona1 =
      z1Hauls.length > 0
        ? z1Hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0) / z1Hauls.length
        : 0;
    const avgZona2 =
      z2Hauls.length > 0
        ? z2Hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0) / z2Hauls.length
        : 0;
    const avgZona3 =
      z3Hauls.length > 0
        ? z3Hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0) / z3Hauls.length
        : 0;
    return {
      avgServed: Math.round(avgZona1 + avgZona2 + avgZona3),
      avgZona1: Math.round(avgZona1),
      avgZona2: Math.round(avgZona2),
      avgZona3: Math.round(avgZona3),
      hasZonedData: true,
    };
  }

  const totalServed = hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0);
  return {
    avgServed: Math.round(totalServed / hauls.length),
    avgZona1: 0,
    avgZona2: 0,
    avgZona3: 0,
    hasZonedData: false,
  };
}

export function computePelangganTerlayaniStats(
  activeOPS: OPSProfile,
  opsList: OPSProfile[],
  pelangganList: Pelanggan[],
  pengangkutanList: TransaksiPengangkutan[],
  selectedYear: number
) {
  const isAll = activeOPS.id === 'all';

  const relevantPelanggan = pelangganList.filter(
    p => isAll || p.opsId === activeOPS.id
  );
  const activePelangganCount = relevantPelanggan.filter(p => p.status === 'Aktif').length;

  const yearHauls = pengangkutanList.filter(
    it =>
      it.sumberSampah !== 'Clean-up Pantai' &&
      it.tanggal?.startsWith(String(selectedYear)) &&
      (isAll || it.opsId === activeOPS.id)
  );

  const monthlyData: MonthlyServedPoint[] = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = idx + 1;
    const monthStr = String(monthNum).padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}`;
    const monthHauls = yearHauls.filter(it => it.tanggal.startsWith(prefix));

    let avgServed = 0;
    let avgZona1 = 0;
    let avgZona2 = 0;
    let avgZona3 = 0;
    let hasZonedData = false;

    if (isAll && opsList.length > 0) {
      let combinedServed = 0;
      const handledOpsIds = new Set<string>();
      opsList.forEach(ops => {
        handledOpsIds.add(ops.id);
        const opsMonthHauls = monthHauls.filter(it => it.opsId === ops.id);
        if (opsMonthHauls.length > 0) {
          combinedServed += calcOpsMonthServed(ops, opsMonthHauls).avgServed;
        }
      });
      const orphanHauls = monthHauls.filter(it => !handledOpsIds.has(it.opsId));
      if (orphanHauls.length > 0) {
        combinedServed += calcOpsMonthServed(undefined, orphanHauls).avgServed;
      }
      avgServed = combinedServed;
    } else {
      const calc = calcOpsMonthServed(activeOPS, monthHauls);
      avgServed = calc.avgServed;
      avgZona1 = calc.avgZona1;
      avgZona2 = calc.avgZona2;
      avgZona3 = calc.avgZona3;
      hasZonedData = calc.hasZonedData;
    }

    const cakupanPct =
      activePelangganCount > 0
        ? Math.min(100, Number(((avgServed / activePelangganCount) * 100).toFixed(1)))
        : 0;

    return {
      monthNum,
      bulan: MONTH_SHORT_ID[idx],
      bulanLengkap: MONTH_NAMES_ID[idx],
      avgServed,
      pelangganAktif: activePelangganCount,
      cakupanPct,
      ritaseCount: monthHauls.length,
      avgZona1,
      avgZona2,
      avgZona3,
      hasZonedData,
    };
  });

  const activeMonths = monthlyData.filter(m => m.ritaseCount > 0);
  const avgServedOverall =
    activeMonths.length > 0
      ? Math.round(activeMonths.reduce((s, m) => s + m.avgServed, 0) / activeMonths.length)
      : 0;
  const coverageOverall =
    activePelangganCount > 0
      ? Math.min(100, Number(((avgServedOverall / activePelangganCount) * 100).toFixed(1)))
      : 0;
  const totalRitase = yearHauls.length;
  const peakMonth =
    activeMonths.length > 0
      ? [...activeMonths].sort((a, b) => b.avgServed - a.avgServed)[0]
      : monthlyData[0];

  const perOpsSummary: OpsServedSummary[] = opsList.map(ops => {
    const opsPelangganAktif = pelangganList.filter(
      p => p.opsId === ops.id && p.status === 'Aktif'
    ).length;
    const opsHauls = pengangkutanList.filter(
      it =>
        it.sumberSampah !== 'Clean-up Pantai' &&
        it.opsId === ops.id &&
        it.tanggal?.startsWith(String(selectedYear))
    );

    const monthAverages: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const prefix = `${selectedYear}-${String(m).padStart(2, '0')}`;
      const mh = opsHauls.filter(it => it.tanggal.startsWith(prefix));
      if (mh.length > 0) {
        monthAverages.push(calcOpsMonthServed(ops, mh).avgServed);
      }
    }

    const avgOpsServed =
      monthAverages.length > 0
        ? Math.round(monthAverages.reduce((s, v) => s + v, 0) / monthAverages.length)
        : 0;

    return {
      opsId: ops.id,
      nama: ops.nama,
      kode: ops.kode,
      isRhun: isRhunOPSProfile(ops),
      pelangganAktif: opsPelangganAktif,
      avgServed: avgOpsServed,
      cakupanPct:
        opsPelangganAktif > 0
          ? Math.min(100, Number(((avgOpsServed / opsPelangganAktif) * 100).toFixed(1)))
          : 0,
      ritaseCount: opsHauls.length,
      activeMonths: monthAverages.length,
    };
  });

  return {
    activePelangganCount,
    monthlyData,
    activeMonthsCount: activeMonths.length,
    avgServedOverall,
    coverageOverall,
    totalRitase,
    peakMonth,
    perOpsSummary,
    isRhunActive: !isAll && isRhunOPSProfile(activeOPS),
  };
}

export const GrafikPelangganTerlayaniPublik: React.FC<Props> = ({
  activeOPS,
  opsList,
  pelangganList,
  pengangkutanList,
  selectedYear,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'ops' | 'table'>('chart');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(
    () =>
      computePelangganTerlayaniStats(
        activeOPS,
        opsList,
        pelangganList,
        pengangkutanList,
        selectedYear
      ),
    [activeOPS, opsList, pelangganList, pengangkutanList, selectedYear]
  );

  const effectiveViewMode =
    viewMode === 'ops' && activeOPS.id !== 'all' ? 'chart' : viewMode;

  const hasZonedRows = stats.monthlyData.some(m => m.hasZonedData);

  const handleExportCSV = () => {
    if (effectiveViewMode === 'ops' && activeOPS.id === 'all') {
      const headers = [
        'Unit OPS',
        'Kode OPS',
        'KK Aktif Terdaftar',
        'Rata-rata KK Terlayani / Bulan',
        'Cakupan Layanan (%)',
        'Total Ritase',
      ];
      const rows = stats.perOpsSummary.map(o => [
        o.nama,
        o.kode,
        o.pelangganAktif,
        o.avgServed,
        `${o.cakupanPct}%`,
        o.ritaseCount,
      ]);
      downloadCSV(`Pelanggan_Terlayani_Per_OPS_${selectedYear}.csv`, headers, rows);
      return;
    }

    const headers = hasZonedRows
      ? [
          'Bulan',
          'Rata-rata KK Terlayani',
          'Zona 1 (KK)',
          'Zona 2 (KK)',
          'Zona 3 (KK)',
          'KK Aktif Terdaftar',
          'Cakupan Layanan (%)',
          'Jumlah Ritase',
        ]
      : [
          'Bulan',
          'Rata-rata KK Terlayani',
          'KK Aktif Terdaftar',
          'Cakupan Layanan (%)',
          'Jumlah Ritase',
        ];

    const rows = stats.monthlyData.map(m =>
      hasZonedRows
        ? [
            m.bulanLengkap,
            m.avgServed,
            m.avgZona1,
            m.avgZona2,
            m.avgZona3,
            m.pelangganAktif,
            `${m.cakupanPct}%`,
            m.ritaseCount,
          ]
        : [m.bulanLengkap, m.avgServed, m.pelangganAktif, `${m.cakupanPct}%`, m.ritaseCount]
    );
    downloadCSV(
      `Data_Pelanggan_Terlayani_${activeOPS.kode || 'OPS'}_${selectedYear}.csv`,
      headers,
      rows
    );
  };

  const handleExportPDF = () => {
    const headers = hasZonedRows
      ? [
          'Bulan',
          'Rata² Terlayani',
          'Zona 1',
          'Zona 2',
          'Zona 3',
          'KK Aktif',
          'Cakupan',
          'Ritase',
        ]
      : ['Bulan', 'Rata² Terlayani (KK)', 'KK Aktif', 'Cakupan (%)', 'Ritase'];

    const rows = stats.monthlyData.map(m =>
      hasZonedRows
        ? [
            m.bulanLengkap,
            `${m.avgServed} KK`,
            `${m.avgZona1}`,
            `${m.avgZona2}`,
            `${m.avgZona3}`,
            `${m.pelangganAktif} KK`,
            `${m.cakupanPct}%`,
            `${m.ritaseCount} rit`,
          ]
        : [
            m.bulanLengkap,
            `${m.avgServed} KK`,
            `${m.pelangganAktif} KK`,
            `${m.cakupanPct}%`,
            `${m.ritaseCount} rit`,
          ]
    );

    downloadPDF({
      title: `Data Pelanggan Terlayani — ${activeOPS.nama}`,
      subtitle: `Tahun ${selectedYear} • Rata-rata Terlayani: ${stats.avgServedOverall} KK/bulan (${stats.coverageOverall}% cakupan)`,
      filename: `Data_Pelanggan_Terlayani_${activeOPS.kode || 'OPS'}_${selectedYear}.pdf`,
      headers,
      rows,
    });
  };

  return (
    <div
      ref={chartContainerRef}
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Data Pelanggan Terlayani &amp; Cakupan Layanan ({selectedYear})</span>
          </h3>
          <p className="text-xs text-slate-500">
            {stats.isRhunActive
              ? 'Rata-rata KK terlayani per bulan dihitung dari penjumlahan rata-rata Zona 1 + Zona 2 + Zona 3.'
              : activeOPS.id === 'all'
              ? 'Akumulasi rata-rata KK terlayani bulanan dari seluruh Unit Pengelola (OPS) terhadap total KK aktif.'
              : 'Perbandingan rata-rata KK terlayani per ritase pengangkutan terhadap total pelanggan aktif terdaftar.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Segmented Switch */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                effectiveViewMode === 'chart'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tren Bulanan</span>
            </button>
            {activeOPS.id === 'all' && opsList.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('ops')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  effectiveViewMode === 'ops'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Per OPS</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                effectiveViewMode === 'table'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <BtnCopyGrafik
            chartRef={chartContainerRef}
            fileName={`Pelanggan_Terlayani_${activeOPS.kode || 'OPS'}_${selectedYear}`}
            chartTitle={`Data Pelanggan Terlayani ${activeOPS.nama} (${selectedYear})`}
            variant="emerald"
          />
        </div>
      </div>

      {/* 4 Summary Metrics Row (Clean divider separation, no nested card borders) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Rata-rata Terlayani</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatNumberID(stats.avgServedOverall, 0)}{' '}
            <span className="text-xs font-semibold text-slate-500 font-sans">KK / bulan</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Dari {stats.activeMonthsCount} bulan dengan catatan ritase
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-teal-700" />
            <span>Cakupan Layanan</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-800 font-mono tabular-nums">
            {formatNumberID(stats.coverageOverall, 1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Target terdaftar: {formatNumberID(stats.activePelangganCount, 0)} KK aktif
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-700" />
            <span>Bulan Puncak Layanan</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatNumberID(stats.peakMonth?.avgServed || 0, 0)}{' '}
            <span className="text-xs font-semibold text-slate-500 font-sans">KK</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {stats.peakMonth?.ritaseCount ? `${stats.peakMonth.bulanLengkap} (${stats.peakMonth.ritaseCount} rit)` : 'Belum ada ritase'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-sky-700" />
            <span>Total Ritase Pengangkutan</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatNumberID(stats.totalRitase, 0)}{' '}
            <span className="text-xs font-semibold text-slate-500 font-sans">Rit</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Pengangkutan pemukiman tahun {selectedYear}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {effectiveViewMode === 'chart' && (
        <div className="space-y-3">
          {stats.totalRitase === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
              <UserCheck className="w-8 h-8 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">
                Belum ada data pengangkutan pemukiman untuk {activeOPS.nama} pada tahun {selectedYear}.
              </p>
              <p className="text-slate-500 mt-1">
                Data pelanggan terlayani otomatis tampil setelah pencatatan ritase pengangkutan tersedia.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={stats.monthlyData}
                  margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bulan"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[
                      0,
                      Math.max(
                        stats.activePelangganCount + 20,
                        ...stats.monthlyData.map(m => m.avgServed + 20),
                        100
                      ),
                    ]}
                    tickFormatter={val => `${val} KK`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#d97706"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={val => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload as MonthlyServedPoint;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800">
                          <div className="font-bold text-emerald-300 border-b border-slate-800 pb-1">
                            {d.bulanLengkap} {selectedYear}
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">Rata² Terlayani:</span>
                            <span className="font-bold font-mono tabular-nums text-white">
                              {formatNumberID(d.avgServed, 0)} KK
                            </span>
                          </div>
                          {d.hasZonedData && (
                            <div className="text-[11px] text-slate-300 border-t border-slate-800 pt-1 space-y-0.5">
                              <div className="flex justify-between gap-4">
                                <span>Rata² Zona 1:</span>
                                <span className="font-mono">{d.avgZona1} KK</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Rata² Zona 2:</span>
                                <span className="font-mono">{d.avgZona2} KK</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Rata² Zona 3:</span>
                                <span className="font-mono">{d.avgZona3} KK</span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">KK Aktif Terdaftar:</span>
                            <span className="font-mono tabular-nums">
                              {formatNumberID(d.pelangganAktif, 0)} KK
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-amber-300 font-semibold">
                            <span>Cakupan Layanan:</span>
                            <span className="font-mono tabular-nums">{d.cakupanPct}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-400 border-t border-slate-800 pt-1">
                            <span>Jumlah Ritase:</span>
                            <span className="font-mono tabular-nums">{d.ritaseCount} rit</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="avgServed"
                    name="Rata² KK Terlayani"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cakupanPct"
                    name="Cakupan Layanan (%)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#d97706', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {effectiveViewMode === 'ops' && activeOPS.id === 'all' && (
        <div className="space-y-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.perOpsSummary}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="nama"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${val} KK`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${formatNumberID(Number(val), 0)} KK`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar
                  dataKey="avgServed"
                  name="Rata² KK Terlayani / Bulan"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="pelangganAktif"
                  name="Pelanggan Aktif Terdaftar"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Unit Pengelola (OPS)</th>
                  <th className="px-4 py-2.5 text-right">KK Aktif</th>
                  <th className="px-4 py-2.5 text-right">Rata² Terlayani / Bln</th>
                  <th className="px-4 py-2.5 text-right">Cakupan</th>
                  <th className="px-4 py-2.5 text-right">Total Ritase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.perOpsSummary.map(item => (
                  <tr key={item.opsId} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {item.nama}{' '}
                      <span className="text-slate-400 font-mono font-normal">({item.kode})</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {formatNumberID(item.pelangganAktif, 0)} KK
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-emerald-800">
                      {formatNumberID(item.avgServed, 0)} KK
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {item.cakupanPct}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumberID(item.ritaseCount, 0)} rit
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {effectiveViewMode === 'table' && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Bulan</th>
                <th className="px-4 py-2.5 text-right">Rata² Terlayani</th>
                {hasZonedRows && (
                  <>
                    <th className="px-3 py-2.5 text-right">Zona 1</th>
                    <th className="px-3 py-2.5 text-right">Zona 2</th>
                    <th className="px-3 py-2.5 text-right">Zona 3</th>
                  </>
                )}
                <th className="px-4 py-2.5 text-right">KK Aktif</th>
                <th className="px-4 py-2.5 text-right">Cakupan</th>
                <th className="px-4 py-2.5 text-right">Ritase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.monthlyData.map(row => (
                <tr key={row.monthNum} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">
                    {row.bulanLengkap} {selectedYear}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-emerald-800">
                    {formatNumberID(row.avgServed, 0)} KK
                  </td>
                  {hasZonedRows && (
                    <>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {row.avgZona1}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {row.avgZona2}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {row.avgZona3}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {formatNumberID(row.pelangganAktif, 0)} KK
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {row.cakupanPct}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                    {row.ritaseCount} rit
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
