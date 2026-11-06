import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BtnCopyGrafik } from './BtnCopyGrafik';
import { OPSProfile, Pelanggan } from '../types/ops';
import { MONTH_NAMES_ID, MONTH_SHORT_ID, downloadCSV } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  Download,
  FileText,
  Calendar,
  BarChart3,
  AreaChart as AreaChartIcon,
  Table as TableIcon,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  selectedYear: number;
}

export const GrafikTrenPelanggan: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  selectedYear,
}) => {
  const [chartMode, setChartMode] = useState<'area' | 'bar' | 'table'>('area');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Filter customers belonging to the active OPS
  const relevantPelanggan = useMemo(() => {
    return pelangganList.filter(
      p => activeOPS.id === 'all' || p.opsId === activeOPS.id
    );
  }, [pelangganList, activeOPS.id]);

  // Overall counts
  const totalWarga = relevantPelanggan.length;
  const totalAktif = relevantPelanggan.filter(p => p.status === 'Aktif').length;
  const totalBerhenti = relevantPelanggan.filter(p => p.status === 'Berhenti').length;
  const tingkatRetensi = totalWarga > 0 ? Number(((totalAktif / totalWarga) * 100).toFixed(1)) : 100;

  // Monthly customer trajectory for 12 months
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const monthNum = idx + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const monthPrefix = `${selectedYear}-${monthStr}`;

      // Pelanggan yang mulai ikut layanan di bulan ini
      const baru = relevantPelanggan.filter(p => {
        if (!p.tanggalMulai) return false;
        return p.tanggalMulai.startsWith(monthPrefix);
      }).length;

      // Pelanggan yang berhenti di bulan ini
      const berhenti = relevantPelanggan.filter(p => {
        if (p.status !== 'Berhenti' || !p.tanggalBerhenti) return false;
        return p.tanggalBerhenti.startsWith(monthPrefix);
      }).length;

      // Pelanggan aktif kumulatif pada akhir bulan ini
      const aktifKumulatif = relevantPelanggan.filter(p => {
        const mulai = p.tanggalMulai || `${selectedYear}-01-01`;
        const hasStarted = mulai <= `${selectedYear}-${monthStr}-31`;
        if (!hasStarted) return false;

        if (p.status === 'Berhenti' && p.tanggalBerhenti) {
          const hasStopped = p.tanggalBerhenti <= `${selectedYear}-${monthStr}-31`;
          return !hasStopped;
        }
        return true;
      }).length;

      const netGrowth = baru - berhenti;

      return {
        bulan: MONTH_SHORT_ID[idx],
        bulanLengkap: MONTH_NAMES_ID[idx],
        monthNum,
        pelangganBaru: baru,
        pelangganBerhenti: berhenti,
        pelangganAktifKumulatif: aktifKumulatif,
        netGrowth,
      };
    });
  }, [relevantPelanggan, selectedYear]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Bulan',
      'Pelanggan Baru Bergabung (KK)',
      'Pelanggan Berhenti (KK)',
      'Pertumbuhan Bersih (Net)',
      'Total Pelanggan Aktif Kumulatif (KK)',
    ];
    const rows = monthlyData.map(m => [
      m.bulanLengkap,
      m.pelangganBaru,
      m.pelangganBerhenti,
      m.netGrowth,
      m.pelangganAktifKumulatif,
    ]);
    downloadCSV(`Tren_Pertumbuhan_Pelanggan_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
  };

  // Export PDF
  const handleExportPDF = () => {
    const headers = [
      'No',
      'Bulan',
      'Pelanggan Baru (+)',
      'Pelanggan Berhenti (-)',
      'Pertumbuhan Bersih',
      'Pelanggan Aktif Kumulatif (KK)',
    ];
    const rows = monthlyData.map((m, idx) => [
      idx + 1,
      m.bulanLengkap,
      `+${m.pelangganBaru} KK`,
      `-${m.pelangganBerhenti} KK`,
      m.netGrowth >= 0 ? `+${m.netGrowth} KK` : `${m.netGrowth} KK`,
      `${m.pelangganAktifKumulatif} KK`,
    ]);

    downloadPDF({
      filename: `Tren_Pertumbuhan_Pelanggan_${activeOPS.kode}_${selectedYear}.pdf`,
      title: `TREN PERTUMBUHAN PELANGGAN WARGA (${selectedYear})`,
      subtitle: `Organisasi: ${activeOPS.nama} | Tahun: ${selectedYear}`,
      opsName: activeOPS.nama,
      orientation: 'portrait',
      summaryItems: [
        { label: 'Total Terdaftar', value: `${totalWarga} KK` },
        { label: 'Pelanggan Aktif', value: `${totalAktif} KK` },
        { label: 'Pelanggan Berhenti', value: `${totalBerhenti} KK` },
        { label: 'Tingkat Retensi', value: `${tingkatRetensi}%` },
      ],
      headers,
      rows,
    });
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs font-sans min-w-[210px]">
          <p className="font-bold text-sm text-teal-300 border-b border-slate-700 pb-1 mb-2">
            Bulan {data.bulanLengkap} {selectedYear}
          </p>
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-emerald-300 font-bold">
              <span>Warga Aktif:</span>
              <span className="text-sm">{data.pelangganAktifKumulatif} KK</span>
            </div>
            <div className="flex justify-between items-center text-teal-200">
              <span>Warga Baru (+):</span>
              <span>+{data.pelangganBaru} KK</span>
            </div>
            <div className="flex justify-between items-center text-rose-300">
              <span>Warga Berhenti (-):</span>
              <span>-{data.pelangganBerhenti} KK</span>
            </div>
            <div className="pt-1.5 border-t border-slate-700 flex justify-between items-center text-2xs text-slate-400">
              <span>Pertumbuhan Bersih:</span>
              <span className={`font-bold ${data.netGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.netGrowth > 0 ? `+${data.netGrowth}` : data.netGrowth} KK
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-base text-slate-900 tracking-tight">
              Tren Pertumbuhan Pelanggan Warga
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {activeOPS.nama} · {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dinamika penambahan warga baru, pelanggan berhenti, dan tren akumulasi pelanggan aktif per bulan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart mode switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                chartMode === 'area'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AreaChartIcon className="w-3.5 h-3.5" />
              <span>Area Kumulatif</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Baru vs Berhenti</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                chartMode === 'table'
                  ? 'bg-teal-700 text-white shadow-xs'
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
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1 min-w-0">
            <span className="truncate">Total Terdaftar</span>
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
            {totalWarga} <span className="text-xs font-semibold text-slate-500">KK</span>
          </div>
          <p className="text-2xs text-slate-500 mt-0.5 truncate">Seluruh warga tercatat</p>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-2xs font-bold text-emerald-800 uppercase tracking-wider mb-1 min-w-0">
            <span className="truncate">Pelanggan Aktif</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono truncate">
            {totalAktif} <span className="text-xs font-semibold text-emerald-600">KK</span>
          </div>
          <p className="text-2xs text-emerald-800 mt-0.5 truncate">Terlayani rutin setiap rit</p>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-2xs font-bold text-rose-800 uppercase tracking-wider mb-1 min-w-0">
            <span className="truncate">Berhenti Berlangganan</span>
            <UserMinus className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-1" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono truncate">
            {totalBerhenti} <span className="text-xs font-semibold text-rose-600">KK</span>
          </div>
          <p className="text-2xs text-rose-800 mt-0.5 truncate">Non-aktif atau pindah</p>
        </div>

        <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-2xs font-bold text-teal-800 uppercase tracking-wider mb-1 min-w-0">
            <span className="truncate">Tingkat Retensi</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0 ml-1" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-900 font-mono truncate">
            {tingkatRetensi}%
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-500"
              style={{ width: `${Math.min(100, tingkatRetensi)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Visual Presentation */}
      {chartMode === 'area' && (
        <div ref={chartContainerRef} className="space-y-3 p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          {/* Header Sudut Kanan Atas Grafik */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Kurva Tren Akumulasi Pelanggan Aktif (KK)
              </h4>
              <p className="text-[11px] text-slate-500">
                {activeOPS.nama} — Tahun {selectedYear}
              </p>
            </div>
            <BtnCopyGrafik
              chartRef={chartContainerRef}
              fileName={`Grafik_Tren_Pelanggan_Area_${activeOPS.kode || 'OPS'}_${selectedYear}`}
              chartTitle="Grafik Tren Pelanggan (Area)"
              variant="slate"
            />
          </div>

          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorPelangganAktif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="bulan"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${val} KK`}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="pelangganAktifKumulatif"
                  name="Total Pelanggan Aktif (KK)"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPelangganAktif)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-2xs text-slate-400 text-center italic">
            * Menampilkan kurva tren jumlah pelanggan aktif yang terakumulasi setiap bulan sepanjang tahun {selectedYear}.
          </p>
        </div>
      )}

      {chartMode === 'bar' && (
        <div ref={chartContainerRef} className="space-y-3 p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          {/* Header Sudut Kanan Atas Grafik */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Grafik Penambahan Warga Baru vs Warga Berhenti
              </h4>
              <p className="text-[11px] text-slate-500">
                {activeOPS.nama} — Tahun {selectedYear}
              </p>
            </div>
            <BtnCopyGrafik
              chartRef={chartContainerRef}
              fileName={`Grafik_Tren_Pelanggan_Baru_vs_Berhenti_${activeOPS.kode || 'OPS'}_${selectedYear}`}
              chartTitle="Grafik Baru vs Berhenti"
              variant="slate"
            />
          </div>

          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="bulan"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${val} KK`}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="pelangganBaru"
                  name="Warga Baru Bergabung (+)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="pelangganBerhenti"
                  name="Warga Berhenti (-)"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-2xs text-slate-400 text-center italic">
            * Batang hijau menunjukkan penambahan warga baru dan batang merah menunjukkan warga yang berhenti berlangganan per bulan.
          </p>
        </div>
      )}

      {chartMode === 'table' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-teal-900 text-white font-bold uppercase text-2xs">
              <tr>
                <th className="px-4 py-2.5 border-r border-teal-800">Bulan</th>
                <th className="px-4 py-2.5 text-center bg-emerald-800 text-emerald-100 border-r border-emerald-700">Warga Baru (+)</th>
                <th className="px-4 py-2.5 text-center bg-rose-900 text-rose-100 border-r border-rose-800">Warga Berhenti (-)</th>
                <th className="px-4 py-2.5 text-center border-r border-teal-800">Pertumbuhan Bersih</th>
                <th className="px-4 py-2.5 text-center bg-teal-950 font-bold">Total Warga Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {monthlyData.map(m => (
                <tr key={m.monthNum} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-sans font-semibold text-slate-900 border-r border-slate-200">
                    {m.bulanLengkap}
                  </td>
                  <td className="px-4 py-2 text-center text-emerald-700 font-bold border-r border-slate-200">
                    {m.pelangganBaru > 0 ? `+${m.pelangganBaru}` : 0}
                  </td>
                  <td className="px-4 py-2 text-center text-rose-700 font-bold border-r border-slate-200">
                    {m.pelangganBerhenti > 0 ? `-${m.pelangganBerhenti}` : 0}
                  </td>
                  <td className="px-4 py-2 text-center font-bold border-r border-slate-200">
                    <span className={m.netGrowth > 0 ? 'text-emerald-700' : m.netGrowth < 0 ? 'text-rose-700' : 'text-slate-500'}>
                      {m.netGrowth > 0 ? `+${m.netGrowth}` : m.netGrowth}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-black text-teal-900 bg-teal-50/50">
                    {m.pelangganAktifKumulatif} KK
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
