import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BtnCopyGrafik } from './BtnCopyGrafik';
import { OPSProfile, Pelanggan } from '../types/ops';
import { downloadCSV } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Home,
  Users,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Download,
  FileText,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  selectedYear: number;
}

const COLORS_DISTRIBUSI = ['#0d9488', '#0284c7', '#f59e0b', '#ec4899'];
const COLORS_KATEGORI = ['#10b981', '#f59e0b'];

export const GrafikPenghuniRumah: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  selectedYear,
}) => {
  const chartCardRef = useRef<HTMLDivElement>(null);
  const [filterKategori, setFilterKategori] = useState<'all' | 'Rumah Tangga' | 'Non Rumah Tangga'>('all');
  const [activeTabVisual, setActiveTabVisual] = useState<'distribusi' | 'wilayah' | 'kategori' | 'tabel'>('distribusi');

  // Filter pelanggan berdasarkan activeOPS dan kategori yang dipilih
  const relevantPelanggan = useMemo(() => {
    return pelangganList.filter(p => {
      const matchOPS = activeOPS.id === 'all' || p.opsId === activeOPS.id;
      const matchKat = filterKategori === 'all' || p.kategori === filterKategori;
      return matchOPS && matchKat;
    });
  }, [pelangganList, activeOPS.id, filterKategori]);

  // Pelanggan Aktif saja untuk estimasi timbulan dan beban riil
  const pelangganAktif = useMemo(() => {
    return relevantPelanggan.filter(p => p.status === 'Aktif');
  }, [relevantPelanggan]);

  // Statistik Ringkasan
  const totalRumah = relevantPelanggan.length;
  const totalRumahAktif = pelangganAktif.length;

  // Statistik Pelanggan Rumah Tangga (HANYA Rumah Tangga yang berpenghuni jiwa)
  const countRumahTangga = relevantPelanggan.filter(p => p.kategori === 'Rumah Tangga').length;
  const countNonRumahTangga = relevantPelanggan.filter(p => p.kategori === 'Non Rumah Tangga').length;
  const pelangganRumahTangga = relevantPelanggan.filter(p => p.kategori === 'Rumah Tangga');
  const pelangganRumahTanggaAktif = pelangganRumahTangga.filter(p => p.status === 'Aktif');

  // Total Jiwa HANYA dihitung dari Rumah Tangga (Non Rumah Tangga bebas hitung jiwa)
  const totalJiwa = useMemo(() => {
    return pelangganRumahTangga.reduce((acc, p) => {
      const jiwa = Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga) > 0
        ? Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga)
        : 4;
      return acc + jiwa;
    }, 0);
  }, [pelangganRumahTangga]);

  const totalJiwaAktif = useMemo(() => {
    return pelangganRumahTanggaAktif.reduce((acc, p) => {
      const jiwa = Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga) > 0
        ? Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga)
        : 4;
      return acc + jiwa;
    }, 0);
  }, [pelangganRumahTanggaAktif]);

  // Rata-rata penghuni dihitung khusus per Rumah Tangga
  const rataRataPenghuni = countRumahTangga > 0 ? (totalJiwa / countRumahTangga).toFixed(1) : '0';

  // 1. DATA DISTRIBUSI KELAS PENGHUNI RUMAH (Hanya Rumah Tangga)
  const dataDistribusi = useMemo(() => {
    const bins = [
      { key: '1-2', label: '1 - 2 Jiwa', subLabel: 'Kecil', count: 0, totalJiwa: 0 },
      { key: '3-4', label: '3 - 4 Jiwa', subLabel: 'Sedang (Standar)', count: 0, totalJiwa: 0 },
      { key: '5-6', label: '5 - 6 Jiwa', subLabel: 'Besar', count: 0, totalJiwa: 0 },
      { key: '7+', label: '7+ Jiwa', subLabel: 'Multi-Generasi', count: 0, totalJiwa: 0 },
    ];

    pelangganRumahTangga.forEach(p => {
      const jiwa = Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga) || 4;
      if (jiwa <= 2) {
        bins[0].count += 1;
        bins[0].totalJiwa += jiwa;
      } else if (jiwa <= 4) {
        bins[1].count += 1;
        bins[1].totalJiwa += jiwa;
      } else if (jiwa <= 6) {
        bins[2].count += 1;
        bins[2].totalJiwa += jiwa;
      } else {
        bins[3].count += 1;
        bins[3].totalJiwa += jiwa;
      }
    });

    return bins.map(b => ({
      ...b,
      persenRumah: countRumahTangga > 0 ? Number(((b.count / countRumahTangga) * 100).toFixed(1)) : 0,
      persenJiwa: totalJiwa > 0 ? Number(((b.totalJiwa / totalJiwa) * 100).toFixed(1)) : 0,
    }));
  }, [pelangganRumahTangga, countRumahTangga, totalJiwa]);

  // 2. DATA SEBARAN PER RT / WILAYAH / SEKTOR (Jiwa hanya dari Rumah Tangga)
  const dataWilayah = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalJiwa: number; aktif: number; rtCount: number; nonRtCount: number }>();

    relevantPelanggan.forEach(p => {
      let key = p.rt && p.rt !== '-' ? `RT ${p.rt}` : (p.sektor ? `${p.sektor}` : (p.zona || 'Wilayah'));
      if (!map.has(key)) {
        map.set(key, { label: key, count: 0, totalJiwa: 0, aktif: 0, rtCount: 0, nonRtCount: 0 });
      }
      const item = map.get(key)!;
      item.count += 1;
      if (p.status === 'Aktif') item.aktif += 1;

      if (p.kategori === 'Rumah Tangga') {
        const jiwa = Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga) || 4;
        item.totalJiwa += jiwa;
        item.rtCount += 1;
      } else {
        item.nonRtCount += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [relevantPelanggan]);

  // 3. DATA DONUT KATEGORI (Rumah Tangga vs Non Rumah Tangga)
  const dataKategori = useMemo(() => {
    return [
      {
        name: 'Rumah Tangga',
        jumlahRumah: countRumahTangga,
        totalJiwa: totalJiwa,
        persenRumah: totalRumah > 0 ? Number(((countRumahTangga / totalRumah) * 100).toFixed(1)) : 0,
      },
      {
        name: 'Non Rumah Tangga',
        jumlahRumah: countNonRumahTangga,
        totalJiwa: 0, // Non Rumah Tangga tidak hitung jiwa
        persenRumah: totalRumah > 0 ? Number(((countNonRumahTangga / totalRumah) * 100).toFixed(1)) : 0,
      },
    ];
  }, [countRumahTangga, countNonRumahTangga, totalJiwa, totalRumah]);

  // Export CSV Data Penghuni Rumah
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Pelanggan / Rumah',
      'Penghuni Rumah (Jiwa)',
      'Kategori',
      'Wilayah / RT',
      'Status Layanan',
      'Tarif Per Bulan (Rp)',
    ];
    const rows = relevantPelanggan.map((p, idx) => [
      idx + 1,
      p.nama,
      p.kategori === 'Non Rumah Tangga' ? '-' : (p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga || 4),
      p.kategori,
      p.rt && p.rt !== '-' ? `RT ${p.rt}` : (p.sektor ? `${p.sektor} - ${p.unit || ''}` : (p.zona || '-')),
      p.status,
      p.tarifPerBulan,
    ]);
    downloadCSV(`Data_Penghuni_Rumah_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
  };

  // Export PDF Data Penghuni Rumah
  const handleExportPDF = () => {
    const headers = [
      'No',
      'Nama Pelanggan / Rumah',
      'Penghuni (Jiwa)',
      'Kategori',
      'RT / Wilayah',
      'Status',
    ];
    const rows = relevantPelanggan.map((p, idx) => [
      idx + 1,
      p.nama,
      p.kategori === 'Non Rumah Tangga' ? '-' : `${p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga || 4} Jiwa`,
      p.kategori,
      p.rt && p.rt !== '-' ? `RT ${p.rt}` : (p.sektor ? `${p.sektor}` : (p.zona || '-')),
      p.status,
    ]);

    downloadPDF({
      filename: `Analisis_Penghuni_Rumah_${activeOPS.kode}_${selectedYear}.pdf`,
      title: `ANALISIS PENGHUNI RUMAH & DEMOGRAFI LAYANAN (${selectedYear})`,
      subtitle: `Organisasi: ${activeOPS.nama} | Basis Data: Rumah Tangga & Jiwa`,
      opsName: activeOPS.nama,
      orientation: 'portrait',
      summaryItems: [
        { label: 'Total Rumah / KK', value: `${totalRumah} Rumah` },
        { label: 'Total Jiwa Penghuni', value: `${totalJiwa} Jiwa` },
        { label: 'Rata-rata Jiwa/Rumah', value: `${rataRataPenghuni} Jiwa` },
        { label: 'Rumah Tangga', value: `${countRumahTangga} (${dataKategori[0]?.persenRumah || 0}%)` },
        { label: 'Non Rumah Tangga', value: `${countNonRumahTangga} (${dataKategori[1]?.persenRumah || 0}%)` },
      ],
      headers,
      rows,
    });
  };

  return (
    <div ref={chartCardRef} className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                <Home className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                    Grafik &amp; Analisis Penghuni Rumah
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Basis Data: Rumah &amp; Jiwa
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisasi sebaran jumlah penghuni (jiwa) per rumah, perbandingan Rumah Tangga vs Non Rumah Tangga, dan kepadatan per wilayah
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Kategori */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <button
                type="button"
                onClick={() => setFilterKategori('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterKategori === 'all'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterKategori('Rumah Tangga')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterKategori === 'Rumah Tangga'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rumah Tangga
              </button>
              <button
                type="button"
                onClick={() => setFilterKategori('Non Rumah Tangga')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterKategori === 'Non Rumah Tangga'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Non Rumah Tangga
              </button>
            </div>

            {/* Salin Grafik Button */}
            <BtnCopyGrafik
              chartRef={chartCardRef}
              fileName={`Grafik_Penghuni_Rumah_${activeOPS.kode}_${selectedYear}`}
              chartTitle="Grafik Penghuni Rumah"
              variant="emerald"
            />

            {/* Export CSV & PDF */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Unduh data penghuni format CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Cetak ringkasan PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          {/* Card 1: Total Jiwa Penghuni */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50/40 p-3.5 rounded-xl border border-teal-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-teal-800 mb-1">
              <span>TOTAL PENGHUNI</span>
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-950 font-mono tracking-tight">
              {totalJiwa.toLocaleString('id-ID')}
              <span className="text-xs font-bold text-teal-700 ml-1.5 font-sans">Jiwa</span>
            </div>
            <div className="text-2xs text-teal-700 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{totalJiwaAktif} Jiwa dari rumah aktif</span>
            </div>
          </div>

          {/* Card 2: Total Rumah Terlayani */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50/40 p-3.5 rounded-xl border border-sky-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-800 mb-1">
              <span>TOTAL RUMAH (KK)</span>
              <Home className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-950 font-mono tracking-tight">
              {totalRumah.toLocaleString('id-ID')}
              <span className="text-xs font-bold text-sky-700 ml-1.5 font-sans">Rumah</span>
            </div>
            <div className="text-2xs text-sky-700 mt-1 font-medium">
              {totalRumahAktif} rumah aktif terlayani rutin
            </div>
          </div>

          {/* Card 3: Rata-rata Penghuni per Rumah */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-3.5 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1">
              <span>RATA-RATA PENGHUNI</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 font-mono tracking-tight">
              {rataRataPenghuni}
              <span className="text-xs font-bold text-amber-700 ml-1.5 font-sans">Jiwa / Rumah</span>
            </div>
            <div className="text-2xs text-amber-700 mt-1 font-medium">
              Standar BPS: 3.8 – 4.5 Jiwa/Keluarga
            </div>
          </div>

          {/* Card 4: Kategori (Rumah Tangga vs Non RT) */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50/40 p-3.5 rounded-xl border border-violet-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-violet-800 mb-1">
              <span>KATEGORI PELANGGAN</span>
              <Building2 className="w-4 h-4 text-violet-600" />
            </div>
            <div className="text-sm font-black text-violet-950 mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                RT: {countRumahTangga} ({dataKategori[0]?.persenRumah}%)
              </span>
              <span className="flex items-center gap-1 text-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Non RT: {countNonRumahTangga}
              </span>
            </div>
            <div className="text-2xs text-violet-700 mt-1.5 font-medium flex items-center justify-between">
              <span>{totalJiwa} Jiwa ({countRumahTangga} Rumah Tangga)</span>
              <span className="text-slate-400">Non RT: Bebas hitung jiwa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTabVisual('distribusi')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTabVisual === 'distribusi'
              ? 'bg-teal-800 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Distribusi Penghuni per Rumah</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTabVisual('wilayah')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTabVisual === 'wilayah'
              ? 'bg-teal-800 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Sebaran Jiwa per Wilayah / RT</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTabVisual('kategori')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTabVisual === 'kategori'
              ? 'bg-teal-800 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieIcon className="w-3.5 h-3.5" />
          <span>Komposisi RT vs Non RT</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTabVisual('tabel')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTabVisual === 'tabel'
              ? 'bg-teal-800 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Tabel Rincian</span>
        </button>
      </div>

      {/* Visual Chart 1: Distribusi Kelas Penghuni Rumah */}
      {activeTabVisual === 'distribusi' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Distribusi Kelompok Jumlah Penghuni Rumah (Jiwa)
              </h4>
              <p className="text-xs text-slate-500">
                Menunjukkan proporsi rumah tangga kecil (1-2 jiwa), sedang (3-4 jiwa), besar (5-6 jiwa), dan multi-generasi (&gt;6 jiwa)
              </p>
            </div>
            <span className="text-2xs bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-full font-bold">
              Total {totalRumah} Rumah · {totalJiwa} Jiwa
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataDistribusi} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs font-sans min-w-[200px]">
                          <p className="font-bold text-teal-300 border-b border-slate-700 pb-1 mb-2">
                            {item.label} ({item.subLabel})
                          </p>
                          <div className="space-y-1 font-mono text-2xs">
                            <div className="flex justify-between">
                              <span className="text-slate-300">Jumlah Rumah:</span>
                              <span className="font-bold text-white">{item.count} Rumah ({item.persenRumah}%)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-300">Total Jiwa Terlayani:</span>
                              <span className="font-bold text-teal-300">{item.totalJiwa} Jiwa ({item.persenJiwa}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={value => (
                    <span className="text-xs font-semibold text-slate-700">
                      {value === 'count' ? 'Jumlah Rumah (KK)' : 'Total Penghuni (Jiwa)'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="count"
                  name="Jumlah Rumah (KK)"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="totalJiwa"
                  name="Total Penghuni (Jiwa)"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {dataDistribusi.map((item, idx) => (
              <div
                key={item.key}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS_DISTRIBUSI[idx % COLORS_DISTRIBUSI.length] }}
                  />
                  <span className="text-xs font-bold text-slate-800">{item.label}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">{item.subLabel}</div>
                <div className="mt-2 flex items-baseline justify-between font-mono">
                  <span className="text-base font-black text-slate-900">{item.count} <span className="text-2xs font-normal text-slate-500">Rumah</span></span>
                  <span className="text-xs font-bold text-teal-700">{item.totalJiwa} <span className="text-2xs font-normal text-slate-500">Jiwa</span></span>
                </div>
                <div className="text-2xs text-slate-400 mt-1">
                  {item.persenRumah}% dari total rumah
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Chart 2: Sebaran Jiwa per Wilayah / RT */}
      {activeTabVisual === 'wilayah' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Sebaran Jiwa Penghuni &amp; Rumah per RT / Wilayah
              </h4>
              <p className="text-xs text-slate-500">
                Menampilkan perbandingan kepadatan jiwa dan jumlah rumah di setiap RT / Sektor pelayanan
              </p>
            </div>
            <span className="text-2xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-bold">
              {dataWilayah.length} Wilayah / RT Terdaftar
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataWilayah} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const avg = d.count > 0 ? (d.totalJiwa / d.count).toFixed(1) : '0';
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs font-sans min-w-[200px]">
                          <p className="font-bold text-cyan-300 border-b border-slate-700 pb-1 mb-2">
                            {d.label}
                          </p>
                          <div className="space-y-1 font-mono text-2xs">
                            <div className="flex justify-between">
                              <span className="text-slate-300">Total Rumah:</span>
                              <span className="font-bold text-white">{d.count} Rumah</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-300">Total Jiwa:</span>
                              <span className="font-bold text-teal-300">{d.totalJiwa} Jiwa</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-300">Rata-rata/Rumah:</span>
                              <span className="font-bold text-amber-300">{avg} Jiwa</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-700">
                              <span className="text-slate-400">Rumah Tangga:</span>
                              <span>{d.rtCount} KK</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Non Rumah Tangga:</span>
                              <span>{d.nonRtCount} Unit</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={value => (
                    <span className="text-xs font-semibold text-slate-700">
                      {value === 'totalJiwa' ? 'Total Jiwa Penghuni' : 'Jumlah Rumah (KK)'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="totalJiwa"
                  name="Total Jiwa Penghuni"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="count"
                  name="Jumlah Rumah (KK)"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Visual Chart 3: Komposisi Rumah Tangga vs Non Rumah Tangga */}
      {activeTabVisual === 'kategori' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Perbandingan Kategori: Rumah Tangga vs Non Rumah Tangga
              </h4>
              <p className="text-xs text-slate-500">
                Proporsi hunian warga keluarga dibanding tempat usaha/warung/faskes yang dilayani
              </p>
            </div>
            <span className="text-2xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
              2 Kategori Resmi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            {/* Donut Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataKategori}
                    dataKey="jumlahRumah"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {dataKategori.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS_KATEGORI[index % COLORS_KATEGORI.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs font-sans min-w-[190px]">
                            <p className="font-bold text-emerald-300 border-b border-slate-700 pb-1 mb-2">
                              {d.name}
                            </p>
                            <div className="space-y-1 font-mono text-2xs">
                              <div className="flex justify-between">
                                <span className="text-slate-300">Jumlah Unit/Rumah:</span>
                                <span className="font-bold text-white">{d.jumlahRumah} ({d.persenRumah}%)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-teal-300">Total Penghuni:</span>
                                <span className="font-bold text-teal-300">{d.totalJiwa} Jiwa</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 10 }}
                    formatter={(value, entry: any) => (
                      <span className="text-xs font-semibold text-slate-700">
                        {value} ({entry.payload.jumlahRumah} unit)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory Cards */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="font-bold text-sm text-emerald-950">Rumah Tangga</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
                    {dataKategori[0]?.persenRumah}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Tempat tinggal hunian keluarga. Menggunakan basis data penghuni jiwa untuk kalkulasi timbulan sampah domestik.
                </p>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-900 pt-2 border-t border-emerald-200/60">
                  <span>{countRumahTangga} Rumah</span>
                  <span>{totalJiwa} Jiwa Terlayani</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="font-bold text-sm text-amber-950">Non Rumah Tangga</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-mono">
                    {dataKategori[1]?.persenRumah}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Unit tempat usaha, warung, toko, kantor, atau fasilitas umum. Kategori ini tidak menghitung jumlah jiwa.
                </p>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-900 pt-2 border-t border-amber-200/60">
                  <span>{countNonRumahTangga} Unit Terdaftar</span>
                  <span className="text-slate-500 font-sans font-medium text-2xs">*Tidak hitung jiwa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Chart 4: Tabel Rincian */}
      {activeTabVisual === 'tabel' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Tabel Rincian Sebaran Penghuni per Wilayah / RT
              </h4>
              <p className="text-xs text-slate-500">
                Matriks perbandingan unit rumah dan total jiwa penghuni di setiap RT/wilayah
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-teal-900 text-white font-bold uppercase text-2xs">
                <tr>
                  <th className="px-4 py-2.5 border-r border-teal-800">Wilayah / RT</th>
                  <th className="px-4 py-2.5 text-center border-r border-teal-800">Total Rumah (KK)</th>
                  <th className="px-4 py-2.5 text-center bg-teal-800 text-teal-100 border-r border-teal-700" title="Total jiwa dari kategori Rumah Tangga">Total Jiwa (RT)</th>
                  <th className="px-4 py-2.5 text-center border-r border-teal-800" title="Rata-rata jiwa per Rumah Tangga">Rata-rata Jiwa/RT</th>
                  <th className="px-4 py-2.5 text-center border-r border-teal-800">Rumah Tangga</th>
                  <th className="px-4 py-2.5 text-center border-r border-teal-800">Non Rumah Tangga</th>
                  <th className="px-4 py-2.5 text-center">Pelanggan Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {dataWilayah.map(item => {
                  const avg = item.rtCount > 0 ? (item.totalJiwa / item.rtCount).toFixed(1) : '-';
                  return (
                    <tr key={item.label} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-sans font-bold text-slate-900 border-r border-slate-200">
                        {item.label}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                        {item.count} KK
                      </td>
                      <td className="px-4 py-2.5 text-center font-black text-teal-900 bg-teal-50/50 border-r border-slate-200">
                        {item.totalJiwa} Jiwa
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-700 border-r border-slate-200">
                        {avg !== '-' ? `${avg} Jiwa` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-emerald-700 font-semibold border-r border-slate-200">
                        {item.rtCount}
                      </td>
                      <td className="px-4 py-2.5 text-center text-amber-700 font-semibold border-r border-slate-200">
                        {item.nonRtCount}
                      </td>
                      <td className="px-4 py-2.5 text-center text-emerald-800 font-bold">
                        {item.aktif} KK
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold font-mono text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="px-4 py-2.5 font-sans">TOTAL</td>
                  <td className="px-4 py-2.5 text-center">{totalRumah} KK</td>
                  <td className="px-4 py-2.5 text-center text-teal-900">{totalJiwa} Jiwa</td>
                  <td className="px-4 py-2.5 text-center">{rataRataPenghuni} Jiwa</td>
                  <td className="px-4 py-2.5 text-center text-emerald-800">{countRumahTangga}</td>
                  <td className="px-4 py-2.5 text-center text-amber-800">{countNonRumahTangga}</td>
                  <td className="px-4 py-2.5 text-center text-emerald-800">{totalRumahAktif} KK</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
