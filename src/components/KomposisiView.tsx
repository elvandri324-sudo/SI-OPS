import React, { useState } from 'react';
import {
  OPSProfile,
  Pelanggan,
  TransaksiPengangkutan,
  KomposisiConfig,
} from '../types/ops';
import { formatNumberID, downloadCSV, MONTH_SHORT_ID } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  PieChart,
  Download,
  FileText,
  Sliders,
  Sparkles,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';

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
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<KomposisiConfig>(komposisiConfig);

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
    const avgServed = hauls.length > 0 ? Math.round(totalServed / hauls.length) : 0;

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
      activePelanggan: hauls.length > 0 ? activePelangganCount : (mNum <= new Date().getMonth() + 1 ? activePelangganCount : 0),
      avgServed,
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rekapitulasi Komposisi Sampah &amp; Karakterisasi Plastik
            </h2>
            <p className="text-xs text-slate-500">
              Pemilahan fraksi sampah berdasarkan hasil pencatatan harian OPS {activeOPS.nama}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setConfigForm(komposisiConfig);
              setShowConfigModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Atur Persentase Fraksi</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* TABLE 1: REKAPITULASI KOMPOSISI BULANAN (EXACT REPLICA OF IMAGE 4) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 bg-teal-800 text-white flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider">
            Rekapitulasi Komposisi Sampah Bulanan Tahun {selectedYear}
          </h3>
          <span className="text-xs text-teal-200 font-mono">
            Total Akumulasi: {formatNumberID(totalAllSampah / 1000, 2)} Ton
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
                  <td className="px-3 py-2 text-center text-slate-800 border-r border-slate-200 tabular-nums">
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
                  <td className="px-3 py-2 text-right text-emerald-900 border-r border-slate-200 tabular-nums bg-emerald-50/40">
                    {formatNumberID(row.organikKg, 1)}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-950 border-r border-slate-200 tabular-nums bg-amber-50/40">
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
                <td className="px-3 py-2.5 text-center tabular-nums">-</td>
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

      {/* TABLE 2: RINCIAN JENIS PLASTIK (EXACT REPLICA OF IMAGE 5) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 bg-teal-800 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider">
              Rincian Fraksi 7 Jenis Sampah Plastik ({selectedYear})
            </h3>
            <p className="text-[11px] text-teal-200">
              Klasifikasi jenis polimer plastik untuk daur ulang dan ekonomi sirkular
            </p>
          </div>
          <span className="text-xs text-teal-200 font-mono">
            Total Plastik: {formatNumberID(totalAllPlastik, 1)} Kg (
            {formatNumberID(totalAllPlastik / 1000, 2)} Ton)
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

            {/* Total Footer Row in KG and TON (Matching image 5) */}
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
                <td className="px-3 py-2 text-right tabular-nums">{formatNumberID(totalPet / 1000, 1)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatNumberID(totalHdpe / 1000, 1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumberID(totalPvc / 1000, 1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumberID(totalLdpe / 1000, 1)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-white">
                  {formatNumberID(totalPp / 1000, 1)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumberID(totalPs / 1000, 1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumberID(totalPlastikLain / 1000, 1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Configure Fractions */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-300" />
                <h3 className="font-semibold text-base">Konfigurasi Persentase Komposisi Sampah</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div className="text-xs text-slate-500">
                Sesuaikan persentase karakterisasi berdasarkan hasil survei / uji laboratorium:
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
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-amber-800 font-semibold block mb-1">Plastik (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.plastikPct}
                      onChange={e => setConfigForm({ ...configForm, plastikPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-blue-800 font-semibold block mb-1">Kertas (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.kertasPct}
                      onChange={e => setConfigForm({ ...configForm, kertasPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-cyan-800 font-semibold block mb-1">Kaca (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.kacaPct}
                      onChange={e => setConfigForm({ ...configForm, kacaPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-orange-800 font-semibold block mb-1">Logam (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.logamPct}
                      onChange={e => setConfigForm({ ...configForm, logamPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-purple-800 font-semibold block mb-1">Popok &amp; Pembalut (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.popokPembalutPct}
                      onChange={e => setConfigForm({ ...configForm, popokPembalutPct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
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
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">HDPE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.hdpePct}
                      onChange={e => setConfigForm({ ...configForm, hdpePct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">PVC (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.pvcPct}
                      onChange={e => setConfigForm({ ...configForm, pvcPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">LDPE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.ldpePct}
                      onChange={e => setConfigForm({ ...configForm, ldpePct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">PP (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.ppPct}
                      onChange={e => setConfigForm({ ...configForm, ppPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">PS (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.psPct}
                      onChange={e => setConfigForm({ ...configForm, psPct: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
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
