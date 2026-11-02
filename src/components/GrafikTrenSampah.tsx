import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  LineChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TransaksiPengangkutan, OPSProfile } from '../types/ops';
import { formatNumberID, MONTH_NAMES_ID, MONTH_SHORT_ID, downloadCSV } from '../utils/format';
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Table as TableIcon,
  Download,
  Calendar,
  Layers,
  Scale,
  Box,
  Truck,
  Sparkles,
  Info,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  pengangkutanList: TransaksiPengangkutan[];
  selectedYear: number;
}

type MetricMode = 'volume' | 'berat';
type ChartType = 'bar' | 'area' | 'line' | 'table';

export const GrafikTrenSampah: React.FC<Props> = ({
  activeOPS,
  pengangkutanList,
  selectedYear,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('volume');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Aggregasi 12 Bulan Transaksi Sampah
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const monthNum = idx + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const monthPrefix = `${selectedYear}-${monthStr}`;

      const items = pengangkutanList.filter(
        item =>
          item.tanggal.startsWith(monthPrefix) &&
          (activeOPS.id === 'all' || item.opsId === activeOPS.id)
      );

      let volOrg = 0;
      let volAnorg = 0;
      let beratOrg = 0;
      let beratAnorg = 0;
      let cleanDaur = 0;
      let cleanPlastik = 0;
      let cleanResidu = 0;
      let totalPelanggan = 0;

      items.forEach(it => {
        if (it.sumberSampah === 'Clean-up Pantai') {
          cleanDaur += it.beratDaurUlangKg || 0;
          cleanPlastik += it.beratPlastikKg || 0;
          cleanResidu += it.beratResiduKg || 0;
          // Residu ke organik/residu volume, daur ulang & plastik ke anorganik volume
          volOrg += it.volumeOrganikM3 || (it.beratResiduKg || 0) / 250;
          volAnorg += it.volumeAnorganikM3 || ((it.beratDaurUlangKg || 0) + (it.beratPlastikKg || 0)) / 127;
          beratOrg += it.beratOrganikKg || it.beratResiduKg || 0;
          beratAnorg += it.beratAnorganikKg || (it.beratDaurUlangKg || 0) + (it.beratPlastikKg || 0);
          totalPelanggan += it.jumlahRelawan || it.pelangganTerlayani || 0;
        } else {
          volOrg += it.volumeOrganikM3 || 0;
          volAnorg += it.volumeAnorganikM3 || 0;
          beratOrg += it.beratOrganikKg || 0;
          beratAnorg += it.beratAnorganikKg || 0;
          totalPelanggan += it.pelangganTerlayani || 0;
        }
      });

      const totalVol = volOrg + volAnorg;
      const totalBerat = beratOrg + beratAnorg;

      return {
        bulan: MONTH_SHORT_ID[idx],
        bulanLengkap: MONTH_NAMES_ID[idx],
        monthNum,
        // Metric Volume (m3)
        volumeOrganik: Number(volOrg.toFixed(2)),
        volumeAnorganik: Number(volAnorg.toFixed(2)),
        volumeTotal: Number(totalVol.toFixed(2)),
        // Metric Berat (Kg & Ton)
        beratOrganik: Number(beratOrg.toFixed(1)),
        beratAnorganik: Number(beratAnorg.toFixed(1)),
        beratTotal: Number(totalBerat.toFixed(1)),
        beratTotalTon: Number((totalBerat / 1000).toFixed(2)),
        // Clean-up details
        cleanDaur: Number(cleanDaur.toFixed(1)),
        cleanPlastik: Number(cleanPlastik.toFixed(1)),
        cleanResidu: Number(cleanResidu.toFixed(1)),
        // Activities
        ritaseCount: items.length,
        pelangganServed: totalPelanggan,
      };
    });
  }, [pengangkutanList, activeOPS, selectedYear]);

  // Statistik Ringkasan Tahunan
  const summary = useMemo(() => {
    const totalVol = monthlyData.reduce((s, m) => s + m.volumeTotal, 0);
    const totalVolOrg = monthlyData.reduce((s, m) => s + m.volumeOrganik, 0);
    const totalVolAnorg = monthlyData.reduce((s, m) => s + m.volumeAnorganik, 0);

    const totalBeratKg = monthlyData.reduce((s, m) => s + m.beratTotal, 0);
    const totalBeratOrgKg = monthlyData.reduce((s, m) => s + m.beratOrganik, 0);
    const totalBeratAnorgKg = monthlyData.reduce((s, m) => s + m.beratAnorganik, 0);
    const totalRitase = monthlyData.reduce((s, m) => s + m.ritaseCount, 0);

    // Bulan aktif (bulan yang memiliki ritase)
    const activeMonths = monthlyData.filter(m => m.ritaseCount > 0);
    const divisor = activeMonths.length > 0 ? activeMonths.length : 1;
    const avgVolPerBulan = totalVol / divisor;
    const avgBeratPerBulanKg = totalBeratKg / divisor;

    // Bulan Tertinggi (Peak Month)
    let peakVolMonth = monthlyData[0];
    monthlyData.forEach(m => {
      if (m.volumeTotal > peakVolMonth.volumeTotal) {
        peakVolMonth = m;
      }
    });

    return {
      totalVol: Number(totalVol.toFixed(2)),
      totalVolOrg: Number(totalVolOrg.toFixed(2)),
      totalVolAnorg: Number(totalVolAnorg.toFixed(2)),
      totalBeratKg: Number(totalBeratKg.toFixed(1)),
      totalBeratTon: Number((totalBeratKg / 1000).toFixed(2)),
      totalBeratOrgKg: Number(totalBeratOrgKg.toFixed(1)),
      totalBeratAnorgKg: Number(totalBeratAnorgKg.toFixed(1)),
      avgVolPerBulan: Number(avgVolPerBulan.toFixed(2)),
      avgBeratPerBulanKg: Number(avgBeratPerBulanKg.toFixed(1)),
      totalRitase,
      peakMonthName: peakVolMonth.volumeTotal > 0 ? peakVolMonth.bulanLengkap : '-',
      peakVolValue: peakVolMonth.volumeTotal,
      orgPercentage: totalVol > 0 ? Math.round((totalVolOrg / totalVol) * 100) : 0,
      anorgPercentage: totalVol > 0 ? Math.round((totalVolAnorg / totalVol) * 100) : 0,
    };
  }, [monthlyData]);

  // Handler Export CSV Data Bulanan
  const handleExportCSV = () => {
    const headers = [
      'Bulan',
      'Volume Organik (m3)',
      'Volume Anorganik (m3)',
      'Total Volume (m3)',
      'Berat Organik (kg)',
      'Berat Anorganik (kg)',
      'Total Berat (kg)',
      'Total Berat (Ton)',
      'Jumlah Ritase',
      'Pelanggan/Relawan Terlayani',
    ];

    const rows = monthlyData.map(m => [
      m.bulanLengkap,
      m.volumeOrganik,
      m.volumeAnorganik,
      m.volumeTotal,
      m.beratOrganik,
      m.beratAnorganik,
      m.beratTotal,
      m.beratTotalTon,
      m.ritaseCount,
      m.pelangganServed,
    ]);

    downloadCSV(
      `Tren_Volume_Sampah_${activeOPS.kode}_${selectedYear}.csv`,
      headers,
      rows
    );
  };

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentMonth = monthlyData.find(m => m.bulan === label);
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-xs text-xs space-y-2 min-w-[210px] animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 font-bold">
            <span className="text-emerald-400 font-sans">
              {currentMonth?.bulanLengkap || label} {selectedYear}
            </span>
            <span className="text-2xs font-mono text-slate-400">
              {currentMonth?.ritaseCount || 0} Ritase
            </span>
          </div>

          {metricMode === 'volume' ? (
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-emerald-300">
                <span className="flex items-center gap-1.5 font-sans">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                  Organik:
                </span>
                <span className="font-bold">
                  {formatNumberID(currentMonth?.volumeOrganik || 0, 2)} m³
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-300">
                <span className="flex items-center gap-1.5 font-sans">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block"></span>
                  Anorganik:
                </span>
                <span className="font-bold">
                  {formatNumberID(currentMonth?.volumeAnorganik || 0, 2)} m³
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-700 flex items-center justify-between text-white font-bold">
                <span className="font-sans text-slate-300">Total Volume:</span>
                <span className="text-sm text-teal-300">
                  {formatNumberID(currentMonth?.volumeTotal || 0, 2)} m³
                </span>
              </div>
              <div className="text-2xs text-slate-400 text-right font-sans">
                Setara: {formatNumberID(currentMonth?.beratTotal || 0, 1)} kg (
                {formatNumberID((currentMonth?.beratTotal || 0) / 1000, 2)} Ton)
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-emerald-300">
                <span className="flex items-center gap-1.5 font-sans">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                  Organik:
                </span>
                <span className="font-bold">
                  {formatNumberID(currentMonth?.beratOrganik || 0, 1)} kg
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-300">
                <span className="flex items-center gap-1.5 font-sans">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block"></span>
                  Anorganik:
                </span>
                <span className="font-bold">
                  {formatNumberID(currentMonth?.beratAnorganik || 0, 1)} kg
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-700 flex items-center justify-between text-white font-bold">
                <span className="font-sans text-slate-300">Total Berat:</span>
                <span className="text-sm text-amber-300">
                  {formatNumberID(currentMonth?.beratTotal || 0, 1)} kg
                </span>
              </div>
              <div className="text-2xs text-slate-400 text-right font-sans">
                Volume: {formatNumberID(currentMonth?.volumeTotal || 0, 2)} m³ • (
                {formatNumberID((currentMonth?.beratTotal || 0) / 1000, 2)} Ton)
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-5">
      {/* Header Visualisasi */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
                Visualisasi Tren Volume Sampah Bulanan
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                  Tahun {selectedYear}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring tren volume pengangkutan sampah Organik vs Anorganik selama setahun penuh
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar: Switch Metrik & Tampilan */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Metrik: Volume (m3) vs Berat (Kg) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetricMode('volume')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Volume (m³)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('berat')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                metricMode === 'berat'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Berat (Kg / Ton)</span>
            </button>
          </div>

          {/* Toggle Tipe Grafik: Bar, Area, Line, Tabel */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang Bertumpuk (Bar Chart)"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Area Kumulatif (Area Chart)"
            >
              <AreaChartIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                chartType === 'line'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Garis Tren (Line Chart)"
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                chartType === 'table'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tabel Rekapitulasi Angka Bulanan"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Download Data Tren Bulanan (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <div className="text-2xs font-bold uppercase tracking-wider text-emerald-800 mb-0.5">
            Total Volume Setahun
          </div>
          <div className="text-lg font-bold text-emerald-950 font-mono">
            {formatNumberID(summary.totalVol, 2)}{' '}
            <span className="text-xs font-normal text-emerald-700">m³</span>
          </div>
          <div className="text-2xs text-emerald-700 mt-0.5 font-mono">
            {formatNumberID(summary.totalBeratTon, 2)} Ton Sampah
          </div>
        </div>

        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
          <div className="text-2xs font-bold uppercase tracking-wider text-teal-800 mb-0.5">
            Rata-rata per Bulan
          </div>
          <div className="text-lg font-bold text-teal-950 font-mono">
            {formatNumberID(summary.avgVolPerBulan, 2)}{' '}
            <span className="text-xs font-normal text-teal-700">m³/bln</span>
          </div>
          <div className="text-2xs text-teal-700 mt-0.5 font-mono">
            ± {formatNumberID(summary.avgBeratPerBulanKg, 0)} kg/bulan
          </div>
        </div>

        <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl">
          <div className="text-2xs font-bold uppercase tracking-wider text-sky-800 mb-0.5">
            Bulan Tertinggi (Peak)
          </div>
          <div className="text-lg font-bold text-sky-950 truncate">
            {summary.peakMonthName}
          </div>
          <div className="text-2xs text-sky-700 mt-0.5 font-mono">
            Puncak: {formatNumberID(summary.peakVolValue, 2)} m³
          </div>
        </div>

        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
          <div className="text-2xs font-bold uppercase tracking-wider text-indigo-800 mb-0.5">
            Komposisi Rasio
          </div>
          <div className="text-lg font-bold text-indigo-950 font-mono">
            {summary.orgPercentage}% : {summary.anorgPercentage}%
          </div>
          <div className="text-2xs text-indigo-700 mt-0.5">
            Organik (Hijau) vs Anorganik (Kuning)
          </div>
        </div>
      </div>

      {/* Konten Visualisasi Utama Recharts */}
      {chartType === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Bulan</th>
                <th className="px-3 py-2.5 text-right text-emerald-800">Vol Organik (m³)</th>
                <th className="px-3 py-2.5 text-right text-amber-700">Vol Anorganik (m³)</th>
                <th className="px-3 py-2.5 text-right font-extrabold text-slate-900">Total Vol (m³)</th>
                <th className="px-3 py-2.5 text-right text-emerald-800">Berat Organik (kg)</th>
                <th className="px-3 py-2.5 text-right text-amber-700">Berat Anorganik (kg)</th>
                <th className="px-3 py-2.5 text-right font-extrabold text-slate-900">Total Berat (kg)</th>
                <th className="px-3 py-2.5 text-center text-slate-600">Ritase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {monthlyData.map(m => (
                <tr key={m.monthNum} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-2 font-sans font-semibold text-slate-900">
                    {m.bulanLengkap}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700">
                    {formatNumberID(m.volumeOrganik, 2)}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-600">
                    {formatNumberID(m.volumeAnorganik, 2)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50/50">
                    {formatNumberID(m.volumeTotal, 2)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700">
                    {formatNumberID(m.beratOrganik, 1)}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-600">
                    {formatNumberID(m.beratAnorganik, 1)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50/50">
                    {formatNumberID(m.beratTotal, 1)}
                  </td>
                  <td className="px-3 py-2 text-center font-sans">
                    <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
                      {m.ritaseCount} rit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-800 text-white font-mono font-bold text-xs">
              <tr>
                <td className="px-3.5 py-2.5 font-sans">TOTAL TAHUNAN</td>
                <td className="px-3 py-2.5 text-right text-emerald-300">
                  {formatNumberID(summary.totalVolOrg, 2)}
                </td>
                <td className="px-3 py-2.5 text-right text-amber-300">
                  {formatNumberID(summary.totalVolAnorg, 2)}
                </td>
                <td className="px-3 py-2.5 text-right text-teal-200">
                  {formatNumberID(summary.totalVol, 2)} m³
                </td>
                <td className="px-3 py-2.5 text-right text-emerald-300">
                  {formatNumberID(summary.totalBeratOrgKg, 1)}
                </td>
                <td className="px-3 py-2.5 text-right text-amber-300">
                  {formatNumberID(summary.totalBeratAnorgKg, 1)}
                </td>
                <td className="px-3 py-2.5 text-right text-teal-200">
                  {formatNumberID(summary.totalBeratKg, 1)} kg
                </td>
                <td className="px-3 py-2.5 text-center font-sans text-slate-200">
                  {summary.totalRitase} rit
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorAnorg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bulan"
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
                  tickFormatter={val =>
                    metricMode === 'volume' ? `${val} m³` : `${val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}kg`}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey={metricMode === 'volume' ? 'volumeOrganik' : 'beratOrganik'}
                  name={metricMode === 'volume' ? 'Organik (m³)' : 'Organik (kg)'}
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrg)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey={metricMode === 'volume' ? 'volumeAnorganik' : 'beratAnorganik'}
                  name={metricMode === 'volume' ? 'Anorganik (m³)' : 'Anorganik (kg)'}
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnorg)"
                  stackId="1"
                />
              </AreaChart>
            ) : chartType === 'line' ? (
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bulan"
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
                  tickFormatter={val =>
                    metricMode === 'volume' ? `${val} m³` : `${val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}kg`}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey={metricMode === 'volume' ? 'volumeTotal' : 'beratTotal'}
                  name={metricMode === 'volume' ? 'Total Volume (m³)' : 'Total Berat (kg)'}
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0f766e' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey={metricMode === 'volume' ? 'volumeOrganik' : 'beratOrganik'}
                  name={metricMode === 'volume' ? 'Organik (m³)' : 'Organik (kg)'}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey={metricMode === 'volume' ? 'volumeAnorganik' : 'beratAnorganik'}
                  name={metricMode === 'volume' ? 'Anorganik (m³)' : 'Anorganik (kg)'}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </LineChart>
            ) : (
              /* Default: Bar Chart Bertumpuk */
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bulan"
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
                  tickFormatter={val =>
                    metricMode === 'volume' ? `${val} m³` : `${val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}kg`}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                />
                <Bar
                  dataKey={metricMode === 'volume' ? 'volumeOrganik' : 'beratOrganik'}
                  name={metricMode === 'volume' ? 'Organik (m³)' : 'Organik (kg)'}
                  fill="#10b981"
                  stackId="sampah"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey={metricMode === 'volume' ? 'volumeAnorganik' : 'beratAnorganik'}
                  name={metricMode === 'volume' ? 'Anorganik (m³)' : 'Anorganik (kg)'}
                  fill="#f59e0b"
                  stackId="sampah"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Info Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-2xs text-slate-500 pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Data dihitung otomatis dari ritase bak kendaraan dan timbangan karung seluruh wilayah{' '}
            <strong>{activeOPS.nama}</strong>.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Tong Hijau (Organik)
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Tong Kuning (Anorganik)
          </span>
        </div>
      </div>
    </div>
  );
};
