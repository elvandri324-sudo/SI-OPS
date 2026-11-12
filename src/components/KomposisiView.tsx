import React, { useState, useRef } from 'react';
import {
  OPSProfile,
  Pelanggan,
  TransaksiPengangkutan,
  KomposisiConfig,
} from '../types/ops';
import { formatNumberID, downloadCSV, MONTH_SHORT_ID } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  PieChart as PieChartIcon,
  Download,
  FileText,
  Sliders,
  Sparkles,
  Info,
  Check,
  RotateCcw,
  Users,
  Layers,
  TrendingUp,
  BarChart3,
  Recycle,
  Scale,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Line,
  Legend as RechartsLegend,
} from 'recharts';
import { BtnCopyGrafik } from './BtnCopyGrafik';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pengangkutanList: TransaksiPengangkutan[];
  komposisiConfig: KomposisiConfig;
  selectedYear: number;
  onUpdateConfig: (config: KomposisiConfig) => void;
}

export const KomposisiView: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  pengangkutanList,
  komposisiConfig,
  selectedYear,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'charts' | 'tables'>('all');
  const [pieMode, setPieMode] = useState<'komposisi' | 'plastik'>('komposisi');
  const [trendMode, setTrendMode] = useState<'tong' | 'fraksi' | 'plastik'>('tong');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<KomposisiConfig>(komposisiConfig);

  // References for copying charts
  const chartDonutRef = useRef<HTMLDivElement>(null);
  const chartPelangganRef = useRef<HTMLDivElement>(null);
  const chartTrendRef = useRef<HTMLDivElement>(null);

  const activePelangganCount = pelangganList.filter(p => p.status === 'Aktif').length;

  // Monthly aggregations for 12 months (Jan - Dec)
  const monthlyRows = Array.from({ length: 12 }, (_, idx) => {
    const mNum = idx + 1;
    const mStr = String(mNum).padStart(2, '0');
    const label = `${selectedYear}-${MONTH_SHORT_ID[idx]}`;

    // Filter collection logs in this month
    const hauls = pengangkutanList.filter(p => p.tanggal.startsWith(`${selectedYear}-${mStr}`));

    const totalHijauKg = hauls.reduce((s, it) => s + (it.beratOrganikKg || 0), 0);
    const totalKuningKg = hauls.reduce((s, it) => s + (it.beratAnorganikKg || 0), 0);
    const totalSampah = totalHijauKg + totalKuningKg;

    const totalServed = hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0);

    const isRhun =
      (activeOPS.nama || '').toLowerCase().includes('rhun') ||
      (activeOPS.kode || '').toUpperCase().includes('PR') ||
      (activeOPS.wilayah || '').toLowerCase().includes('rhun') ||
      activeOPS.metodeUkurDefault === 'karung';

    const z1Hauls = hauls.filter(it => it.zona === 'Zona 1');
    const z2Hauls = hauls.filter(it => it.zona === 'Zona 2');
    const z3Hauls = hauls.filter(it => it.zona === 'Zona 3');
    const hasZonedHauls = z1Hauls.length > 0 || z2Hauls.length > 0 || z3Hauls.length > 0;

    let avgServed = hauls.length > 0 ? Math.round(totalServed / hauls.length) : 0;
    if (isRhun && hasZonedHauls) {
      const avgZ1 = z1Hauls.length > 0 ? z1Hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0) / z1Hauls.length : 0;
      const avgZ2 = z2Hauls.length > 0 ? z2Hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0) / z2Hauls.length : 0;
      const avgZ3 = z3Hauls.length > 0 ? z3Hauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0) / z3Hauls.length : 0;
      avgServed = Math.round(avgZ1 + avgZ2 + avgZ3);
    }

    // Fractions of total waste
    const organikKg = (totalSampah * komposisiConfig.organikPct) / 100;
    const plastikKg = (totalSampah * komposisiConfig.plastikPct) / 100;
    const kertasKg = (totalSampah * komposisiConfig.kertasPct) / 100;
    const kacaKg = (totalSampah * komposisiConfig.kacaPct) / 100;
    const logamKg = (totalSampah * komposisiConfig.logamPct) / 100;
    const popokKg = (totalSampah * komposisiConfig.popokPembalutPct) / 100;
    const lainKg = (totalSampah * komposisiConfig.lainnyaPct) / 100;

    // Plastic sub-fractions
    const petKg = (plastikKg * komposisiConfig.petPct) / 100;
    const hdpeKg = (plastikKg * komposisiConfig.hdpePct) / 100;
    const pvcKg = (plastikKg * komposisiConfig.pvcPct) / 100;
    const ldpeKg = (plastikKg * komposisiConfig.ldpePct) / 100;
    const ppKg = (plastikKg * komposisiConfig.ppPct) / 100;
    const psKg = (plastikKg * komposisiConfig.psPct) / 100;
    const plastikLainKg = (plastikKg * komposisiConfig.plastikLainPct) / 100;

    return {
      monthLabel: label,
      monthNum: mNum,
      bulanShort: MONTH_SHORT_ID[idx],
      activePelanggan: hauls.length > 0 ? activePelangganCount : (mNum <= new Date().getMonth() + 1 ? activePelangganCount : 0),
      avgServed,
      cakupanPct: activePelangganCount > 0 ? Math.min(100, Math.round((avgServed / activePelangganCount) * 100)) : 0,
      totalHijauKg,
      totalKuningKg,
      totalSampah,
      // Composition
      organikKg,
      plastikKg,
      kertasKg,
      kacaKg,
      logamKg,
      popokKg,
      lainKg,
      // Plastic subtypes
      petKg,
      hdpeKg,
      pvcKg,
      ldpeKg,
      ppKg,
      psKg,
      plastikLainKg,
    };
  });

  // Totals for all 12 months
  const totalAllHijau = monthlyRows.reduce((s, r) => s + r.totalHijauKg, 0);
  const totalAllKuning = monthlyRows.reduce((s, r) => s + r.totalKuningKg, 0);
  const totalAllSampah = monthlyRows.reduce((s, r) => s + r.totalSampah, 0);

  const totalAllOrganik = monthlyRows.reduce((s, r) => s + r.organikKg, 0);
  const totalAllPlastik = monthlyRows.reduce((s, r) => s + r.plastikKg, 0);
  const totalAllKertas = monthlyRows.reduce((s, r) => s + r.kertasKg, 0);
  const totalAllKaca = monthlyRows.reduce((s, r) => s + r.kacaKg, 0);
  const totalAllLogam = monthlyRows.reduce((s, r) => s + r.logamKg, 0);
  const totalAllPopok = monthlyRows.reduce((s, r) => s + r.popokKg, 0);
  const totalAllLain = monthlyRows.reduce((s, r) => s + r.lainKg, 0);

  // Plastic subtype totals
  const totalPet = monthlyRows.reduce((s, r) => s + r.petKg, 0);
  const totalHdpe = monthlyRows.reduce((s, r) => s + r.hdpeKg, 0);
  const totalPvc = monthlyRows.reduce((s, r) => s + r.pvcKg, 0);
  const totalLdpe = monthlyRows.reduce((s, r) => s + r.ldpeKg, 0);
  const totalPp = monthlyRows.reduce((s, r) => s + r.ppKg, 0);
  const totalPs = monthlyRows.reduce((s, r) => s + r.psKg, 0);
  const totalPlastikLain = monthlyRows.reduce((s, r) => s + r.plastikLainKg, 0);

  // High-value plastics for circular economy (PET + HDPE + PP)
  const totalHighValuePlastic = totalPet + totalHdpe + totalPp;
  const highValuePlasticPct = totalAllPlastik > 0 ? ((totalHighValuePlastic / totalAllPlastik) * 100).toFixed(1) : '0';

  // Average customers served
  const activeMonths = monthlyRows.filter(r => r.totalSampah > 0);
  const avgServedOverall = activeMonths.length > 0
    ? Math.round(activeMonths.reduce((s, r) => s + r.avgServed, 0) / activeMonths.length)
    : 0;
  const coverageOverall = activePelangganCount > 0
    ? Math.min(100, Math.round((avgServedOverall / activePelangganCount) * 100))
    : 0;

  // Peak month of served customers
  const peakServedMonth = [...monthlyRows].sort((a, b) => b.avgServed - a.avgServed)[0];

  // 1. Dataset Donut: 7 Fraksi Sampah Utama
  const komposisiPieData = [
    { name: 'Organik', value: Number(totalAllOrganik.toFixed(1)), pct: komposisiConfig.organikPct, color: '#10b981', desc: 'Sisa makanan, dedaunan, ranting, limbah dapur' },
    { name: 'Plastik', value: Number(totalAllPlastik.toFixed(1)), pct: komposisiConfig.plastikPct, color: '#eab308', desc: 'Botol, kemasan sachet, kresek, wadah' },
    { name: 'Kertas', value: Number(totalAllKertas.toFixed(1)), pct: komposisiConfig.kertasPct, color: '#3b82f6', desc: 'Kardus, kertas arsip, karton kemasan' },
    { name: 'Kaca', value: Number(totalAllKaca.toFixed(1)), pct: komposisiConfig.kacaPct, color: '#06b6d4', desc: 'Botol sirup/kecap, pecahan kaca, toples' },
    { name: 'Logam', value: Number(totalAllLogam.toFixed(1)), pct: komposisiConfig.logamPct, color: '#f97316', desc: 'Kaleng minuman, paku, kawat, seng' },
    { name: 'Popok & Pembalut', value: Number(totalAllPopok.toFixed(1)), pct: komposisiConfig.popokPembalutPct, color: '#f43f5e', desc: 'Diapers bayi/lansia, pembalut wanita' },
    { name: 'Lain-lain', value: Number(totalAllLain.toFixed(1)), pct: komposisiConfig.lainnyaPct, color: '#475569', desc: 'Tekstil, karet, kulit, B3 rumah tangga' },
  ];

  // 2. Dataset Donut: 7 Karakterisasi Jenis Plastik
  const plastikPieData = [
    { code: 'PET 1', name: 'PET (Polyethylene Terephthalate)', value: Number(totalPet.toFixed(1)), pct: komposisiConfig.petPct, color: '#0284c7', desc: 'Botol mineral, botol soda, galon sekali pakai' },
    { code: 'HDPE 2', name: 'HDPE (High-Density Polyethylene)', value: Number(totalHdpe.toFixed(1)), pct: komposisiConfig.hdpePct, color: '#059669', desc: 'Botol sampo, jerigen minyak/oli, botol deterjen' },
    { code: 'PVC 3', name: 'PVC (Polyvinyl Chloride)', value: Number(totalPvc.toFixed(1)), pct: komposisiConfig.pvcPct, color: '#d97706', desc: 'Pipa paralon, talang air, kabel, tirai plastik' },
    { code: 'LDPE 4', name: 'LDPE (Low-Density Polyethylene)', value: Number(totalLdpe.toFixed(1)), pct: komposisiConfig.ldpePct, color: '#7c3aed', desc: 'Kantong kresek, bubble wrap, plastik wrapping' },
    { code: 'PP 5', name: 'PP (Polypropylene)', value: Number(totalPp.toFixed(1)), pct: komposisiConfig.ppPct, color: '#db2777', desc: 'Cup es/kopi, sedotan, tutup botol, wadah microwave' },
    { code: 'PS 6', name: 'PS (Polystyrene)', value: Number(totalPs.toFixed(1)), pct: komposisiConfig.psPct, color: '#ea580c', desc: 'Styrofoam makanan, sendok garpu plastik' },
    { code: 'OTHER 7', name: 'Plastik Lain (Multilayer)', value: Number(totalPlastikLain.toFixed(1)), pct: komposisiConfig.plastikLainPct, color: '#64748b', desc: 'Sachet kopi/snack, kemasan pouch multilayer' },
  ];

  // 3. Dataset Tren Pelanggan Terlayani
  const pelangganTrendData = monthlyRows.map((r, i) => ({
    bulan: MONTH_SHORT_ID[i],
    bulanFull: r.monthLabel,
    pelangganAktif: r.activePelanggan,
    avgServed: r.avgServed,
    cakupanPct: r.cakupanPct,
    totalSampahKg: Number(r.totalSampah.toFixed(1)),
    timbulanPerKK: r.avgServed > 0 ? Number((r.totalSampah / r.avgServed).toFixed(1)) : 0,
  }));

  const handleExportCSV = () => {
    const headers = [
      'Bulan/Tahun',
      'Pelanggan Aktif',
      'Rata-Rata Terlayani',
      'Tong Hijau (Kg)',
      'Tong Kuning (Kg)',
      'Total Sampah (Kg)',
      `Organik ${komposisiConfig.organikPct}% (Kg)`,
      `Plastik ${komposisiConfig.plastikPct}% (Kg)`,
      `Kertas ${komposisiConfig.kertasPct}% (Kg)`,
      `Kaca ${komposisiConfig.kacaPct}% (Kg)`,
      `Logam ${komposisiConfig.logamPct}% (Kg)`,
      `Popok & Pembalut ${komposisiConfig.popokPembalutPct}% (Kg)`,
      `Lain-lain ${komposisiConfig.lainnyaPct}% (Kg)`,
    ];
    const rows = monthlyRows.map(r => [
      r.monthLabel,
      r.activePelanggan,
      r.avgServed,
      r.totalHijauKg,
      r.totalKuningKg,
      r.totalSampah,
      r.organikKg.toFixed(1),
      r.plastikKg.toFixed(1),
      r.kertasKg.toFixed(1),
      r.kacaKg.toFixed(1),
      r.logamKg.toFixed(1),
      r.popokKg.toFixed(1),
      r.lainKg.toFixed(1),
    ]);
    downloadCSV(`Komposisi_Sampah_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
  };

  const handleExportPDF = () => {
    const headers = [
      'Bulan/Tahun',
      'KK Aktif',
      'Rata² Terlayani',
      'Tong Hijau (Kg)',
      'Tong Kuning (Kg)',
      'Total Sampah (Kg)',
      `Organik (${komposisiConfig.organikPct}%)`,
      `Plastik (${komposisiConfig.plastikPct}%)`,
      `Kertas (${komposisiConfig.kertasPct}%)`,
      `Kaca (${komposisiConfig.kacaPct}%)`,
      `Logam (${komposisiConfig.logamPct}%)`,
      `Popok (${komposisiConfig.popokPembalutPct}%)`,
      `Lainnya (${komposisiConfig.lainnyaPct}%)`,
    ];

    const rows = monthlyRows.map(r => [
      r.monthLabel,
      r.activePelanggan,
      r.avgServed,
      formatNumberID(r.totalHijauKg, 1),
      formatNumberID(r.totalKuningKg, 1),
      formatNumberID(r.totalSampah, 1),
      formatNumberID(r.organikKg, 1),
      formatNumberID(r.plastikKg, 1),
      formatNumberID(r.kertasKg, 1),
      formatNumberID(r.kacaKg, 1),
      formatNumberID(r.logamKg, 1),
      formatNumberID(r.popokKg, 1),
      formatNumberID(r.lainKg, 1),
    ]);

    const footRows = [
      [
        'TOTAL',
        activePelangganCount,
        '-',
        formatNumberID(totalAllHijau, 1),
        formatNumberID(totalAllKuning, 1),
        formatNumberID(totalAllSampah, 1),
        formatNumberID(totalAllOrganik, 1),
        formatNumberID(totalAllPlastik, 1),
        formatNumberID(totalAllKertas, 1),
        formatNumberID(totalAllKaca, 1),
        formatNumberID(totalAllLogam, 1),
        formatNumberID(totalAllPopok, 1),
        formatNumberID(totalAllLain, 1),
      ],
    ];

    const plasticHeaders = [
      'Bulan/Tahun',
      `PET (${komposisiConfig.petPct}%)`,
      `HDPE (${komposisiConfig.hdpePct}%)`,
      `PVC (${komposisiConfig.pvcPct}%)`,
      `LDPE (${komposisiConfig.ldpePct}%)`,
      `PP (${komposisiConfig.ppPct}%)`,
      `PS (${komposisiConfig.psPct}%)`,
      `Plastik Lain (${komposisiConfig.plastikLainPct}%)`,
      'Total Plastik (Kg)',
    ];

    const plasticRows = monthlyRows.map(r => [
      r.monthLabel,
      formatNumberID(r.petKg, 1),
      formatNumberID(r.hdpeKg, 1),
      formatNumberID(r.pvcKg, 1),
      formatNumberID(r.ldpeKg, 1),
      formatNumberID(r.ppKg, 1),
      formatNumberID(r.psKg, 1),
      formatNumberID(r.plastikLainKg, 1),
      formatNumberID(r.plastikKg, 1),
    ]);

    const plasticFootRows = [
      [
        'TOTAL PLASTIK',
        formatNumberID(totalPet, 1),
        formatNumberID(totalHdpe, 1),
        formatNumberID(totalPvc, 1),
        formatNumberID(totalLdpe, 1),
        formatNumberID(totalPp, 1),
        formatNumberID(totalPs, 1),
        formatNumberID(totalPlastikLain, 1),
        formatNumberID(totalAllPlastik, 1),
      ],
    ];

    downloadPDF({
      filename: `Komposisi_Sampah_${activeOPS.kode}_${selectedYear}.pdf`,
      title: `REKAPITULASI KOMPOSISI SAMPAH & KARAKTERISASI PLASTIK (${selectedYear})`,
      subtitle: `Organisasi: ${activeOPS.nama} | Tahun: ${selectedYear}`,
      opsName: activeOPS.nama,
      orientation: 'landscape',
      summaryItems: [
        { label: 'Total Sampah Terangkut', value: `${formatNumberID(totalAllSampah, 1)} Kg (${formatNumberID(totalAllSampah / 1000, 2)} Ton)` },
        { label: 'Total Organik', value: `${formatNumberID(totalAllOrganik, 1)} Kg` },
        { label: 'Total Plastik', value: `${formatNumberID(totalAllPlastik, 1)} Kg` },
        { label: 'Pelanggan Aktif', value: `${activePelangganCount} KK` },
      ],
      headers,
      rows,
      footRows,
      extraTables: [
        {
          title: `RINCIAN FRAKSI 7 JENIS SAMPAH PLASTIK (${selectedYear})`,
          headers: plasticHeaders,
          rows: plasticRows,
          footRows: plasticFootRows,
        },
      ],
    });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(configForm);
    setShowConfigModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-xs shrink-0">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Komposisi Sampah &amp; Karakterisasi Plastik
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Tahun {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi fraksi timbulan sampah, karakterisasi 7 polimer plastik, dan tren pelanggan terlayani di {activeOPS.nama}
            </p>
          </div>
        </div>

        {/* Action Buttons & View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'charts'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Grafik Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tables'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Tabel Data</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfigForm(komposisiConfig);
              setShowConfigModal(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Konfigurasi persentase fraksi komposisi sampah & polimer plastik"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Atur Persentase</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download CSV Rekapitulasi Komposisi"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download Laporan PDF Komposisi & Plastik"
          >
            <FileText className="w-3.5 h-3.5 text-rose-100" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPI HIGHLIGHT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Sampah Terkelola */}
        <div className="p-4 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200/80 rounded-2xl relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              Total Sampah
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-sans">
              Tahun {selectedYear}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
            {formatNumberID(totalAllSampah, 1)}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-medium">
            <span>± <strong>{formatNumberID(totalAllSampah / 1000, 2)}</strong> Ton Terkelola</span>
          </div>
        </div>

        {/* Card 2: Rata-Rata Pelanggan Terlayani */}
        <div className="p-4 bg-linear-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200/80 rounded-2xl relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Rata-rata Terlayani
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md font-sans">
              {coverageOverall}% Tercover
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
            {formatNumberID(avgServedOverall, 0)}{' '}
            <span className="text-xs font-normal text-slate-500">KK / bln</span>
          </div>
          <div className="text-xs text-indigo-700 mt-1 flex items-center gap-1 font-medium">
            <span>Dari <strong>{activePelangganCount}</strong> KK Aktif Terdaftar</span>
          </div>
        </div>

        {/* Card 3: Sampah Plastik Terkelola */}
        <div className="p-4 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Fraksi Plastik
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md font-sans">
              {komposisiConfig.plastikPct}% Fraksi
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
            {formatNumberID(totalAllPlastik, 1)}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-xs text-amber-800 mt-1 flex items-center gap-1 font-medium">
            <span>± <strong>{formatNumberID(totalAllPlastik / 1000, 2)}</strong> Ton Plastik</span>
          </div>
        </div>

        {/* Card 4: Potensi Daur Ulang Bernilai Tinggi (PET + HDPE + PP) */}
        <div className="p-4 bg-linear-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-200/80 rounded-2xl relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between text-xs text-teal-800 font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Recycle className="w-3.5 h-3.5 text-teal-600" />
              Sirkular Ekonomi
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded-md font-sans">
              PET + HDPE + PP
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
            {formatNumberID(totalHighValuePlastic, 1)}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-xs text-teal-700 mt-1 flex items-center gap-1 font-medium">
            <span><strong>{highValuePlasticPct}%</strong> Plastik Bernilai Tinggi</span>
          </div>
        </div>
      </div>

      {/* VISUAL CHARTS SECTION */}
      {(activeTab === 'all' || activeTab === 'charts') && (
        <div className="space-y-6">
          {/* ROW 1: DUA GRAFIK UTAMA DALAM GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRAFIK 1: DONUT KOMPOSISI FRAKSI & KARAKTERISASI PLASTIK */}
            <div
              ref={chartDonutRef}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              {/* Header Card with Copy Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-indigo-600" />
                    <span>
                      {pieMode === 'komposisi'
                        ? `Komposisi 7 Fraksi Sampah (${selectedYear})`
                        : `Karakterisasi 7 Polimer Plastik (${selectedYear})`}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {pieMode === 'komposisi'
                      ? 'Distribusi persentase & bobot seluruh jenis sampah terkelola'
                      : 'Klasifikasi jenis polimer plastik untuk daur ulang sirkular'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold border border-slate-200" data-html2canvas-ignore="true">
                    <button
                      type="button"
                      onClick={() => setPieMode('komposisi')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        pieMode === 'komposisi'
                          ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      7 Fraksi
                    </button>
                    <button
                      type="button"
                      onClick={() => setPieMode('plastik')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        pieMode === 'plastik'
                          ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      7 Plastik
                    </button>
                  </div>

                  {/* Tombol Salin Grafik di sudut kanan atas */}
                  <BtnCopyGrafik
                    chartRef={chartDonutRef}
                    fileName={`Grafik_Komposisi_${pieMode}_${activeOPS.kode || 'OPS'}_${selectedYear}`}
                    chartTitle={pieMode === 'komposisi' ? 'Grafik Komposisi Sampah' : 'Grafik 7 Jenis Plastik'}
                    variant="indigo"
                  />
                </div>
              </div>

              {/* Donut Chart & Side Legends */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
                {/* Donut Canvas */}
                <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieMode === 'komposisi' ? komposisiPieData : plastikPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {(pieMode === 'komposisi' ? komposisiPieData : plastikPieData).map(
                          (entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          )
                        )}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${formatNumberID(Number(val), 1)} kg (${item.payload.pct}%)`,
                          name,
                        ]}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>

                  {/* Center Stat Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total {pieMode === 'komposisi' ? 'Sampah' : 'Plastik'}
                    </span>
                    <span className="text-sm font-black text-slate-800 font-mono">
                      {formatNumberID(
                        (pieMode === 'komposisi' ? totalAllSampah : totalAllPlastik) / 1000,
                        2
                      )}{' '}
                      <span className="text-2xs font-normal text-slate-500">Ton</span>
                    </span>
                  </div>
                </div>

                {/* Right Breakdown List */}
                <div className="sm:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(pieMode === 'komposisi' ? komposisiPieData : plastikPieData).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 truncate block">
                            {'code' in item && item.code ? `${item.code} - ` : ''}
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2 font-mono">
                        <span className="font-bold text-slate-900 block">
                          {formatNumberID(item.value, 1)} kg
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Basis Karakterisasi: <strong>{activeOPS.nama}</strong> ({selectedYear})
                </span>
                <span className="italic text-slate-400">
                  Total 100% Fraksi
                </span>
              </div>
            </div>

            {/* GRAFIK 2: TREN PELANGGAN TERLAYANI & CAKUPAN BULANAN */}
            <div
              ref={chartPelangganRef}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              {/* Header Card with Copy Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Tren Pelanggan Terlayani &amp; Cakupan Layanan ({selectedYear})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Perbandingan rata-rata KK terlayani per ritase terhadap total pelanggan aktif terdaftar
                  </p>
                </div>

                {/* Tombol Salin Grafik di sudut kanan atas */}
                <BtnCopyGrafik
                  chartRef={chartPelangganRef}
                  fileName={`Grafik_Tren_Pelanggan_Terlayani_${activeOPS.kode || 'OPS'}_${selectedYear}`}
                  chartTitle="Grafik Tren Pelanggan Terlayani & Cakupan"
                  variant="indigo"
                />
              </div>

              {/* Legend Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs mb-2 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600 shadow-2xs"></span>
                  <span className="font-semibold text-slate-700">Rata² KK Terlayani</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-500"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-semibold text-slate-700">% Cakupan Layanan</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span>Target: {activePelangganCount} KK Aktif</span>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={pelangganTrendData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="bulan"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    {/* Left Y Axis: Jumlah Pelanggan (KK) */}
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, Math.max(activePelangganCount + 20, 150)]}
                      tickFormatter={val => `${val} KK`}
                    />
                    {/* Right Y Axis: Persentase Cakupan (%) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#f59e0b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={val => `${val}%`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800">
                              <div className="font-bold text-amber-300 border-b border-slate-800 pb-1">
                                {data.bulanFull}
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Rata² Terlayani:</span>
                                <span className="font-bold text-white font-mono">{data.avgServed} KK</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Pelanggan Aktif:</span>
                                <span className="font-bold text-white font-mono">{data.pelangganAktif} KK</span>
                              </div>
                              <div className="flex justify-between gap-4 text-amber-300 font-semibold">
                                <span>Cakupan Wilayah:</span>
                                <span>{data.cakupanPct}%</span>
                              </div>
                              <div className="flex justify-between gap-4 text-emerald-300 border-t border-slate-800 pt-1">
                                <span>Total Sampah:</span>
                                <span className="font-mono">{formatNumberID(data.totalSampahKg, 1)} kg</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-400 text-[10px]">
                                <span>Timbulan per KK:</span>
                                <span className="font-mono">{data.timbulanPerKK} kg/KK</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="avgServed"
                      name="Rata² Terlayani (KK)"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cakupanPct"
                      name="Cakupan Layanan (%)"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Footer Metrics */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Bulan Puncak Layanan: <strong>{peakServedMonth?.monthLabel || '-'}</strong> ({peakServedMonth?.avgServed || 0} KK)
                </span>
                <span className="text-emerald-700 font-medium">
                  Rata-rata Keseluruhan: <strong>{avgServedOverall} KK/bulan</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: GRAFIK TREN TIMBULAN FRAKSI BULANAN (FULL WIDTH) */}
          <div
            ref={chartTrendRef}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs"
          >
            {/* Header with Copy Button and Filter Mode */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                  <span>
                    {trendMode === 'tong'
                      ? `Tren Timbulan Tong Hijau (Organik) vs Tong Kuning (Anorganik) - ${selectedYear}`
                      : trendMode === 'fraksi'
                      ? `Tren Timbulan 7 Fraksi Sampah Bulanan (${selectedYear})`
                      : `Tren Karakterisasi 7 Polimer Plastik Bulanan (${selectedYear})`}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visualisasi fluktuasi berat timbulan sampah (Kg) setiap bulan sepanjang tahun {selectedYear}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Switcher Mode */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold border border-slate-200" data-html2canvas-ignore="true">
                  <button
                    type="button"
                    onClick={() => setTrendMode('tong')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      trendMode === 'tong'
                        ? 'bg-white text-teal-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hijau vs Kuning
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMode('fraksi')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      trendMode === 'fraksi'
                        ? 'bg-white text-teal-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    7 Fraksi Lengkap
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMode('plastik')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      trendMode === 'plastik'
                        ? 'bg-white text-teal-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rincian Plastik
                  </button>
                </div>

                {/* Tombol Salin Grafik di sudut kanan atas */}
                <BtnCopyGrafik
                  chartRef={chartTrendRef}
                  fileName={`Grafik_Tren_Timbulan_${trendMode}_${activeOPS.kode || 'OPS'}_${selectedYear}`}
                  chartTitle="Grafik Tren Timbulan Komposisi Sampah"
                  variant="indigo"
                />
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyRows}
                  margin={{ top: 10, right: 15, left: -5, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bulanShort"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}kg`}`}
                  />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [
                      `${formatNumberID(Number(val), 1)} kg`,
                      name,
                    ]}
                  />
                  <RechartsLegend
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />

                  {trendMode === 'tong' && (
                    <>
                      <Bar
                        dataKey="totalHijauKg"
                        name="Tong Hijau - Organik (Kg)"
                        stackId="a"
                        fill="#10b981"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="totalKuningKg"
                        name="Tong Kuning - Anorganik (Kg)"
                        stackId="a"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  )}

                  {trendMode === 'fraksi' && (
                    <>
                      <Bar dataKey="organikKg" name="Organik" stackId="a" fill="#10b981" />
                      <Bar dataKey="plastikKg" name="Plastik" stackId="a" fill="#eab308" />
                      <Bar dataKey="kertasKg" name="Kertas" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="kacaKg" name="Kaca" stackId="a" fill="#06b6d4" />
                      <Bar dataKey="logamKg" name="Logam" stackId="a" fill="#f97316" />
                      <Bar dataKey="popokKg" name="Popok/Pembalut" stackId="a" fill="#f43f5e" />
                      <Bar dataKey="lainKg" name="Lain-lain" stackId="a" fill="#475569" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {trendMode === 'plastik' && (
                    <>
                      <Bar dataKey="petKg" name="PET (1)" stackId="a" fill="#0284c7" />
                      <Bar dataKey="hdpeKg" name="HDPE (2)" stackId="a" fill="#059669" />
                      <Bar dataKey="pvcKg" name="PVC (3)" stackId="a" fill="#d97706" />
                      <Bar dataKey="ldpeKg" name="LDPE (4)" stackId="a" fill="#7c3aed" />
                      <Bar dataKey="ppKg" name="PP (5)" stackId="a" fill="#db2777" />
                      <Bar dataKey="psKg" name="PS (6)" stackId="a" fill="#ea580c" />
                      <Bar dataKey="plastikLainKg" name="Lain-lain (7)" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Summary Insights */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-slate-600">
                  Total Organik Terkelola:{' '}
                  <strong className="text-emerald-950 font-mono">
                    {formatNumberID(totalAllOrganik / 1000, 2)} Ton
                  </strong>
                </span>
              </div>
              <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-slate-600">
                  Total Plastik Terkelola:{' '}
                  <strong className="text-amber-950 font-mono">
                    {formatNumberID(totalAllPlastik / 1000, 2)} Ton
                  </strong>
                </span>
              </div>
              <div className="p-2.5 bg-teal-50/60 border border-teal-100 rounded-xl flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"></span>
                <span className="text-slate-600">
                  Potensi Daur Ulang:{' '}
                  <strong className="text-teal-950 font-mono">
                    {formatNumberID(totalHighValuePlastic, 1)} kg
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLES SECTION */}
      {(activeTab === 'all' || activeTab === 'tables') && (
        <div className="space-y-6">
          {/* TABLE 1: REKAPITULASI KOMPOSISI BULANAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-teal-800 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Rekapitulasi Komposisi Sampah Bulanan Tahun {selectedYear}
                </h3>
                <p className="text-[11px] text-teal-200">
                  Data timbulan per bulan dengan pembagian 7 fraksi material
                </p>
              </div>
              <span className="text-xs text-teal-200 font-mono self-start sm:self-auto">
                Total Akumulasi: <strong>{formatNumberID(totalAllSampah / 1000, 2)} Ton</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2.5 bg-teal-700 text-white font-bold text-center border-r border-teal-600 min-w-[90px]">
                      Bulan/Tahun
                    </th>
                    <th className="px-3 py-2.5 bg-teal-700 text-white font-bold text-center border-r border-teal-600 min-w-[85px]">
                      Pelanggan Aktif
                    </th>
                    <th className="px-3 py-2.5 bg-teal-700 text-white font-bold text-center border-r border-teal-600 min-w-[105px]">
                      Rata-Rata Pelanggan Terlayani
                    </th>
                    <th className="px-3 py-2.5 bg-teal-700 text-white font-bold text-right border-r border-teal-600 min-w-[110px]">
                      Total Sampah Tong Hijau (Kg)
                    </th>
                    <th className="px-3 py-2.5 bg-teal-700 text-white font-bold text-right border-r border-teal-600 min-w-[110px]">
                      Total Sampah Tong Kuning (Kg)
                    </th>
                    <th className="px-3 py-2.5 bg-teal-700 text-white font-bold text-right border-r border-teal-600 min-w-[115px]">
                      Total Sampah (Hijau + Kuning)
                    </th>

                    {/* 7 Fraksi Kolom dengan Warna Otentik dari Excel Spreadsheet */}
                    <th className="px-3 py-2.5 bg-emerald-600 text-white font-extrabold text-right border-r border-emerald-500 min-w-[85px]">
                      Organik {komposisiConfig.organikPct}%
                    </th>
                    <th className="px-3 py-2.5 bg-yellow-400 text-slate-900 font-extrabold text-right border-r border-yellow-300 min-w-[85px]">
                      Plastik {komposisiConfig.plastikPct}%
                    </th>
                    <th className="px-3 py-2.5 bg-blue-500 text-white font-extrabold text-right border-r border-blue-400 min-w-[80px]">
                      Kertas {komposisiConfig.kertasPct}%
                    </th>
                    <th className="px-3 py-2.5 bg-cyan-200 text-slate-900 font-extrabold text-right border-r border-cyan-100 min-w-[75px]">
                      Kaca {komposisiConfig.kacaPct}%
                    </th>
                    <th className="px-3 py-2.5 bg-orange-400 text-white font-extrabold text-right border-r border-orange-300 min-w-[80px]">
                      Logam {komposisiConfig.logamPct}%
                    </th>
                    <th className="px-3 py-2.5 bg-rose-200 text-slate-900 font-extrabold text-right border-r border-rose-100 min-w-[100px]">
                      Popok dan Pembalut {komposisiConfig.popokPembalutPct}%
                    </th>
                    <th className="px-3 py-2.5 bg-emerald-950 text-white font-extrabold text-right min-w-[80px]">
                      Lain-lain {komposisiConfig.lainnyaPct}%
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 font-mono">
                  {monthlyRows.map(row => (
                    <tr key={row.monthNum} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-sans font-medium text-slate-800 text-center border-r border-slate-200">
                        {row.monthLabel}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-800 border-r border-slate-200 tabular-nums">
                        {row.activePelanggan || 0}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-800 border-r border-slate-200 tabular-nums font-semibold text-indigo-900">
                        {row.avgServed || 0}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-800 border-r border-slate-200 tabular-nums font-semibold">
                        {formatNumberID(row.totalHijauKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-800 border-r border-slate-200 tabular-nums font-semibold">
                        {formatNumberID(row.totalKuningKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 border-r border-slate-200 tabular-nums bg-slate-50">
                        {formatNumberID(row.totalSampah, 1)}
                      </td>

                      {/* 7 Fractions */}
                      <td className="px-3 py-2 text-right text-emerald-900 border-r border-slate-200 tabular-nums bg-emerald-50/40 font-semibold">
                        {formatNumberID(row.organikKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-950 border-r border-slate-200 tabular-nums bg-amber-50/40 font-semibold">
                        {formatNumberID(row.plastikKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-900 border-r border-slate-200 tabular-nums bg-blue-50/40">
                        {formatNumberID(row.kertasKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-cyan-950 border-r border-slate-200 tabular-nums bg-cyan-50/40">
                        {formatNumberID(row.kacaKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-950 border-r border-slate-200 tabular-nums bg-orange-50/40">
                        {formatNumberID(row.logamKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-950 border-r border-slate-200 tabular-nums bg-rose-50/40">
                        {formatNumberID(row.popokKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 tabular-nums bg-slate-100/50">
                        {formatNumberID(row.lainKg, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Total Footer Row */}
                <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="px-3 py-2.5 text-center font-sans">TOTAL</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{activePelangganCount}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-indigo-900">
                      {avgServedOverall}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-800 tabular-nums">
                      {formatNumberID(totalAllHijau, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-800 tabular-nums">
                      {formatNumberID(totalAllKuning, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-slate-900 tabular-nums bg-slate-200/70">
                      {formatNumberID(totalAllSampah, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-950 tabular-nums bg-emerald-100">
                      {formatNumberID(totalAllOrganik, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-950 tabular-nums bg-amber-100">
                      {formatNumberID(totalAllPlastik, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-blue-950 tabular-nums bg-blue-100">
                      {formatNumberID(totalAllKertas, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-cyan-950 tabular-nums bg-cyan-100">
                      {formatNumberID(totalAllKaca, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-orange-950 tabular-nums bg-orange-100">
                      {formatNumberID(totalAllLogam, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-rose-950 tabular-nums bg-rose-100">
                      {formatNumberID(totalAllPopok, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-950 tabular-nums bg-slate-200">
                      {formatNumberID(totalAllLain, 1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* TABLE 2: RINCIAN JENIS PLASTIK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-teal-800 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Rincian Fraksi 7 Jenis Sampah Plastik ({selectedYear})
                </h3>
                <p className="text-[11px] text-teal-200">
                  Klasifikasi jenis polimer plastik untuk daur ulang dan ekonomi sirkular
                </p>
              </div>
              <span className="text-xs text-teal-200 font-mono self-start sm:self-auto">
                Total Plastik: <strong>{formatNumberID(totalAllPlastik, 1)} Kg</strong> ({formatNumberID(totalAllPlastik / 1000, 2)} Ton)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-teal-700 text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-center border-r border-teal-600 min-w-[90px]">
                      Bulan/Tahun
                    </th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600">
                      PET {komposisiConfig.petPct}%
                    </th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600">
                      HDPE {komposisiConfig.hdpePct}%
                    </th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600">
                      PVC {komposisiConfig.pvcPct}%
                    </th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600">
                      LDPE {komposisiConfig.ldpePct}%
                    </th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600">
                      PP {komposisiConfig.ppPct}%
                    </th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600">
                      PS {komposisiConfig.psPct}%
                    </th>
                    <th className="px-3 py-2.5 text-right">
                      Lain-lain {komposisiConfig.plastikLainPct}%
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 font-mono">
                  {monthlyRows.map(row => (
                    <tr key={row.monthNum} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-sans font-medium text-slate-800 text-center border-r border-slate-200">
                        {row.monthLabel}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(row.petKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(row.hdpeKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(row.pvcKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(row.ldpeKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200 tabular-nums font-semibold">
                        {formatNumberID(row.ppKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200 tabular-nums">
                        {formatNumberID(row.psKg, 1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800 tabular-nums">
                        {formatNumberID(row.plastikLainKg, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Total Footer Row in KG and TON */}
                <tfoot className="border-t-2 border-teal-800 font-mono font-bold">
                  <tr className="bg-teal-800 text-white">
                    <td className="px-4 py-2.5 text-center font-sans font-bold">Total (Kg)</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPet, 1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalHdpe, 1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPvc, 1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalLdpe, 1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPp, 1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPs, 1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPlastikLain, 1)}</td>
                  </tr>
                  <tr className="bg-teal-900 text-teal-200">
                    <td className="px-4 py-2 text-center font-sans font-bold">Total (Ton)</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumberID(totalPet / 1000, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalHdpe / 1000, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPvc / 1000, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalLdpe / 1000, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-white">
                      {formatNumberID(totalPp / 1000, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPs / 1000, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalPlastikLain / 1000, 2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configure Fractions */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-300" />
                <h3 className="font-semibold text-base">Konfigurasi Persentase Komposisi Sampah</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-indigo-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div className="text-xs text-slate-500">
                Sesuaikan persentase karakterisasi berdasarkan hasil survei atau uji timbangan periodik OPS:
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  1. Komposisi Umum (Total Harus 100%)
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-emerald-800 font-semibold block mb-1">Organik (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.organikPct}
                      onChange={e => setConfigForm({ ...configForm, organikPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-amber-800 font-semibold block mb-1">Plastik (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.plastikPct}
                      onChange={e => setConfigForm({ ...configForm, plastikPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-blue-800 font-semibold block mb-1">Kertas (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.kertasPct}
                      onChange={e => setConfigForm({ ...configForm, kertasPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-cyan-800 font-semibold block mb-1">Kaca (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.kacaPct}
                      onChange={e => setConfigForm({ ...configForm, kacaPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-orange-800 font-semibold block mb-1">Logam (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.logamPct}
                      onChange={e => setConfigForm({ ...configForm, logamPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-purple-800 font-semibold block mb-1">Popok &amp; Pembalut (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.popokPembalutPct}
                      onChange={e => setConfigForm({ ...configForm, popokPembalutPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-700 font-semibold block mb-1">Lain-lain (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.lainnyaPct}
                      onChange={e => setConfigForm({ ...configForm, lainnyaPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  2. Sub-Fraksi Plastik (% dari Total Plastik)
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-slate-600 block mb-1">PET (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.petPct}
                      onChange={e => setConfigForm({ ...configForm, petPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">HDPE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.hdpePct}
                      onChange={e => setConfigForm({ ...configForm, hdpePct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">PVC (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.pvcPct}
                      onChange={e => setConfigForm({ ...configForm, pvcPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">LDPE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.ldpePct}
                      onChange={e => setConfigForm({ ...configForm, ldpePct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">PP (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.ppPct}
                      onChange={e => setConfigForm({ ...configForm, ppPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">PS (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.psPct}
                      onChange={e => setConfigForm({ ...configForm, psPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-slate-600 block mb-1">Plastik Lain / Multilayer (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.plastikLainPct}
                      onChange={e => setConfigForm({ ...configForm, plastikLainPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Terapkan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
