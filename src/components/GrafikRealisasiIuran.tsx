import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { OPSProfile, Pelanggan, PembayaranIuran } from '../types/ops';
import { formatRupiah, formatNumberID, MONTH_NAMES_ID, MONTH_SHORT_ID, downloadCSV } from '../utils/format';
import {
  CheckCircle2,
  TrendingUp,
  Target,
  AlertCircle,
  Download,
  Calendar,
  BarChart3,
  Table as TableIcon,
  Percent,
  Receipt,
  Users,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  selectedYear: number;
}

export const GrafikRealisasiIuran: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  pembayaranList,
  selectedYear,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Aggregation of 12 months for fee billing vs realization
  const monthlyData = useMemo(() => {
    const relevantPelanggan = pelangganList.filter(
      p => activeOPS.id === 'all' || p.opsId === activeOPS.id
    );

    return Array.from({ length: 12 }, (_, idx) => {
      const monthNum = idx + 1;
      const monthStr = String(monthNum).padStart(2, '0');

      // 1. Pelanggan aktif di bulan tersebut
      const activeInMonth = relevantPelanggan.filter(p => {
        if (p.status === 'Aktif') return true;
        if (p.tanggalBerhenti) {
          return p.tanggalBerhenti >= `${selectedYear}-${monthStr}-01`;
        }
        return false;
      });

      // 2. Potensi Tagihan Iuran
      const potensiTagihan = activeInMonth.reduce(
        (sum, p) => sum + (p.tarifPerBulan || 20000),
        0
      );

      // 3. Realisasi Iuran Terbayar
      const realisasiIuran = pembayaranList
        .filter(
          p =>
            p.tahun === selectedYear &&
            p.bulan === monthNum &&
            (activeOPS.id === 'all' || p.opsId === activeOPS.id)
        )
        .reduce((sum, p) => sum + (p.jumlah || 0), 0);

      const tunggakan = Math.max(0, potensiTagihan - realisasiIuran);
      const persentase =
        potensiTagihan > 0 ? Number(((realisasiIuran / potensiTagihan) * 100).toFixed(1)) : 0;

      // Jumlah warga yang lunas
      const bayarBulanIni = pembayaranList.filter(
        p =>
          p.tahun === selectedYear &&
          p.bulan === monthNum &&
          (activeOPS.id === 'all' || p.opsId === activeOPS.id) &&
          (p.jumlah || 0) > 0
      );
      const wargaBayarCount = new Set(bayarBulanIni.map(p => p.pelangganId)).size;

      return {
        bulan: MONTH_SHORT_ID[idx],
        bulanLengkap: MONTH_NAMES_ID[idx],
        monthNum,
        potensiTagihan,
        realisasiIuran,
        tunggakan,
        persentase,
        wargaBayarCount,
        totalWargaAktif: activeInMonth.length,
      };
    });
  }, [activeOPS.id, pelangganList, pembayaranList, selectedYear]);

  // Overall Year Totals
  const totals = useMemo(() => {
    const totalPotensi = monthlyData.reduce((s, m) => s + m.potensiTagihan, 0);
    const totalRealisasi = monthlyData.reduce((s, m) => s + m.realisasiIuran, 0);
    const totalTunggakan = Math.max(0, totalPotensi - totalRealisasi);
    const persentaseTotal =
      totalPotensi > 0 ? Number(((totalRealisasi / totalPotensi) * 100).toFixed(1)) : 0;
    const avgMonthlyRealisasi = totalRealisasi / 12;

    return {
      totalPotensi,
      totalRealisasi,
      totalTunggakan,
      persentaseTotal,
      avgMonthlyRealisasi,
    };
  }, [monthlyData]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Bulan',
      'Warga Aktif (KK)',
      'Warga Bayar (KK)',
      'Target Tagihan (Rp)',
      'Realisasi Terbayar (Rp)',
      'Sisa Tagihan / Tunggakan (Rp)',
      'Persentase Realisasi (%)',
    ];
    const rows = monthlyData.map(m => [
      m.bulanLengkap,
      m.totalWargaAktif,
      m.wargaBayarCount,
      m.potensiTagihan,
      m.realisasiIuran,
      m.tunggakan,
      `${m.persentase}%`,
    ]);
    downloadCSV(`Realisasi_Iuran_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs font-sans min-w-[220px]">
          <p className="font-bold text-sm text-emerald-300 border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
            <span>Bulan {data.bulanLengkap}</span>
            <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {data.persentase}% Tercapai
            </span>
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Target Tagihan:</span>
              <span className="font-bold font-mono text-emerald-100">
                {formatRupiah(data.potensiTagihan, false)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Realisasi Masuk:</span>
              <span className="font-bold font-mono text-emerald-400">
                {formatRupiah(data.realisasiIuran, false)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Sisa Tunggakan:</span>
              <span className={`font-bold font-mono ${data.tunggakan > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatRupiah(data.tunggakan, false)}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-700 flex justify-between items-center text-2xs text-slate-400">
              <span>Warga Terbayar:</span>
              <span className="font-semibold text-white">
                {data.wargaBayarCount} dari {data.totalWargaAktif} KK
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
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Percent className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-base text-slate-900 tracking-tight">
              Persentase Tagihan &amp; Realisasi Iuran Warga
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Tahun {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Perbandingan target potensi tagihan pelanggan terhadap realisasi setoran iuran yang berhasil terkumpul
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-xs'
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
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span>Target Tagihan 1 Thn</span>
            <Target className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-black text-slate-900 font-mono tabular-nums">
            {formatRupiah(totals.totalPotensi, false)}
          </div>
          <p className="text-2xs text-slate-500 mt-0.5">Potensi seluruh warga aktif</p>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center justify-between text-2xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <span>Realisasi Terkumpul</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700 font-mono tabular-nums">
            {formatRupiah(totals.totalRealisasi, false)}
          </div>
          <p className="text-2xs text-emerald-800 mt-0.5">
            Rata-rata {formatRupiah(totals.avgMonthlyRealisasi, false)}/bln
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between text-2xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <span>Sisa Tunggakan</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-700 font-mono tabular-nums">
            {formatRupiah(totals.totalTunggakan, false)}
          </div>
          <p className="text-2xs text-amber-800 mt-0.5">Belum disetorkan warga</p>
        </div>

        <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50">
          <div className="flex items-center justify-between text-2xs font-bold text-teal-800 uppercase tracking-wider mb-1">
            <span>Persentase Realisasi</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-900 font-mono tabular-nums">
            {totals.persentaseTotal}%
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totals.persentaseTotal >= 80
                  ? 'bg-emerald-600'
                  : totals.persentaseTotal >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, totals.persentaseTotal)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main View: Chart or Table */}
      {viewMode === 'chart' ? (
        <div className="space-y-2">
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyData}
                margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="bulan"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `Rp${(val / 1000).toLocaleString('id-ID')}k`}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${val}%`}
                  tick={{ fill: '#d97706', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  yAxisId="left"
                  dataKey="potensiTagihan"
                  name="Target Tagihan (Rp)"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  yAxisId="left"
                  dataKey="realisasiIuran"
                  name="Realisasi Terbayar (Rp)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="persentase"
                  name="Persentase Realisasi (%)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#d97706' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-2xs text-slate-400 text-center italic">
            * Batang abu-abu menunjukkan target tagihan, batang hijau adalah iuran yang berhasil disetor, dan garis oranye adalah persentase pencapaian.
          </p>
        </div>
      ) : (
        /* Detailed 12 Months Table */
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-emerald-900 text-white font-bold uppercase text-2xs">
              <tr>
                <th className="px-3.5 py-2.5 border-r border-emerald-800">Bulan</th>
                <th className="px-3 py-2.5 text-center border-r border-emerald-800">Warga Aktif</th>
                <th className="px-3 py-2.5 text-center border-r border-emerald-800">Warga Bayar</th>
                <th className="px-3.5 py-2.5 text-right border-r border-emerald-800">Target Tagihan (Rp)</th>
                <th className="px-3.5 py-2.5 text-right border-r border-emerald-800">Realisasi (Rp)</th>
                <th className="px-3.5 py-2.5 text-right border-r border-emerald-800">Sisa Tunggakan (Rp)</th>
                <th className="px-3 py-2.5 text-center border-r border-emerald-800">Persentase</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {monthlyData.map(m => {
                const isFullyPaid = m.persentase >= 100;
                return (
                  <tr key={m.monthNum} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2 font-sans font-semibold text-slate-900 border-r border-slate-200">
                      {m.bulanLengkap}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-200">
                      {m.totalWargaAktif} KK
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-800 font-bold border-r border-slate-200">
                      {m.wargaBayarCount} KK
                    </td>
                    <td className="px-3.5 py-2 text-right text-slate-700 border-r border-slate-200">
                      {formatRupiah(m.potensiTagihan, false)}
                    </td>
                    <td className="px-3.5 py-2 text-right text-emerald-700 font-bold border-r border-slate-200">
                      {formatRupiah(m.realisasiIuran, false)}
                    </td>
                    <td className="px-3.5 py-2 text-right text-amber-700 border-r border-slate-200">
                      {formatRupiah(m.tunggakan, false)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded-full text-2xs ${
                        m.persentase >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.persentase >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {m.persentase}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-sans">
                      {isFullyPaid ? (
                        <span className="text-emerald-700 font-bold text-2xs">Tercapai 100%</span>
                      ) : m.persentase > 0 ? (
                        <span className="text-amber-700 font-semibold text-2xs">Sebagian</span>
                      ) : (
                        <span className="text-slate-400 text-2xs">Belum Ada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-mono font-bold border-t-2 border-slate-300">
              <tr>
                <td className="px-3.5 py-2.5 font-sans uppercase tracking-wider text-slate-900 border-r border-slate-200">
                  Total Tahunan
                </td>
                <td colSpan={2} className="px-3 py-2.5 text-center text-slate-600 border-r border-slate-200">
                  -
                </td>
                <td className="px-3.5 py-2.5 text-right text-slate-900 border-r border-slate-200">
                  {formatRupiah(totals.totalPotensi, false)}
                </td>
                <td className="px-3.5 py-2.5 text-right text-emerald-800 font-black border-r border-slate-200">
                  {formatRupiah(totals.totalRealisasi, false)}
                </td>
                <td className="px-3.5 py-2.5 text-right text-amber-800 border-r border-slate-200">
                  {formatRupiah(totals.totalTunggakan, false)}
                </td>
                <td className="px-3 py-2.5 text-center text-teal-900 text-sm font-black border-r border-slate-200">
                  {totals.persentaseTotal}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
