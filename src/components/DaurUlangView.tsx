import React, { useState, useMemo, useRef } from 'react';
import {
  Recycle,
  CheckCircle2,
  Layers,
  Plus,
  ArrowUpRight,
  Settings,
  FileSpreadsheet,
  Download,
  ChevronDown,
  Calendar,
  Filter,
  Search,
  Trash2,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  AlertCircle,
  FileText,
} from 'lucide-react';
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
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  JenisDaurUlangItem,
  TransaksiDaurUlang,
  OPSProfile,
  AdminAccount,
  KategoriDaurUlang,
} from '../types/ops';
import { formatNumberID, formatRupiah } from '../utils/format';
import { BtnCopyGrafik } from './BtnCopyGrafik';
import { ModalConfirm } from './modals/ModalConfirm';

interface Props {
  jenisList: JenisDaurUlangItem[];
  transaksiList: TransaksiDaurUlang[];
  activeOPS?: OPSProfile;
  selectedYear: number;
  currentAdmin?: AdminAccount;
  onOpenTimbangMasuk: () => void;
  onOpenJualKeluar: () => void;
  onOpenJenisHarga: () => void;
  onOpenImportExcel: () => void;
  onDeleteTransaksi: (id: string) => void;
  onDeleteTransaksiBatch?: (ids: string[]) => void;
}

const KATEGORI_COLORS: Record<KategoriDaurUlang, { dot: string; border: string; bg: string; text: string }> = {
  Plastik: {
    dot: '#06b6d4',
    border: 'border-t-cyan-500',
    bg: 'bg-cyan-50 text-cyan-800',
    text: 'text-cyan-700',
  },
  Kertas: {
    dot: '#f59e0b',
    border: 'border-t-amber-500',
    bg: 'bg-amber-50 text-amber-800',
    text: 'text-amber-700',
  },
  Logam: {
    dot: '#6366f1',
    border: 'border-t-indigo-500',
    bg: 'bg-indigo-50 text-indigo-800',
    text: 'text-indigo-700',
  },
  Kaca: {
    dot: '#10b981',
    border: 'border-t-emerald-600',
    bg: 'bg-emerald-50 text-emerald-800',
    text: 'text-emerald-700',
  },
  Elektronik: {
    dot: '#0284c7',
    border: 'border-t-sky-500',
    bg: 'bg-sky-50 text-sky-800',
    text: 'text-sky-700',
  },
  Lainnya: {
    dot: '#8b5cf6',
    border: 'border-t-purple-500',
    bg: 'bg-purple-50 text-purple-800',
    text: 'text-purple-700',
  },
};

export const DaurUlangView: React.FC<Props> = ({
  jenisList,
  transaksiList,
  activeOPS,
  selectedYear,
  currentAdmin,
  onOpenTimbangMasuk,
  onOpenJualKeluar,
  onOpenJenisHarga,
  onOpenImportExcel,
  onDeleteTransaksi,
  onDeleteTransaksiBatch,
}) => {
  const isReadOnly = currentAdmin?.role === 'viewer';
  const [activeSubTab, setActiveSubTab] = useState<'stok_grafik' | 'riwayat' | 'rekap'>('stok_grafik');
  const [filterTipe, setFilterTipe] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  // Multiselect & Delete confirmation states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [trxToDelete, setTrxToDelete] = useState<TransaksiDaurUlang | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Chart container refs for BtnCopyGrafik
  const chartTrenRef = useRef<HTMLDivElement | null>(null);
  const chartDonutRef = useRef<HTMLDivElement | null>(null);
  const chartBarRef = useRef<HTMLDivElement | null>(null);

  // Formatted current date e.g. "Minggu, 8 November 2026"
  const formattedToday = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
    } catch {
      return 'Minggu, 8 November 2026';
    }
  }, []);

  // Filter transaksi by selected OPS (or all) and year
  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter(t => {
      const matchOPS = !activeOPS || activeOPS.id === 'all' || t.opsId === activeOPS.id;
      const tYear = parseInt(t.tanggal.slice(0, 4), 10);
      const matchYear = !selectedYear || tYear === selectedYear;
      return matchOPS && matchYear;
    });
  }, [transaksiList, activeOPS, selectedYear]);

  // Calculate current stock per jenisId
  const stokMap = useMemo(() => {
    const map: Record<string, number> = {};
    jenisList.forEach(j => {
      map[j.id] = 0;
    });

    // We calculate stock using all-time or scoped by OPS
    transaksiList.forEach(t => {
      if (activeOPS && activeOPS.id !== 'all' && t.opsId !== activeOPS.id) return;
      if (t.tipe === 'masuk') {
        map[t.jenisId] = (map[t.jenisId] || 0) + t.beratKg;
      } else if (t.tipe === 'keluar') {
        map[t.jenisId] = Math.max(0, (map[t.jenisId] || 0) - t.beratKg);
      }
    });

    return map;
  }, [jenisList, transaksiList, activeOPS]);

  // KPI Calculations
  const activeJenisList = useMemo(() => jenisList.filter(j => j.aktif), [jenisList]);

  const totalStokKg = useMemo(() => {
    return Object.values(stokMap).reduce((sum, w) => sum + w, 0);
  }, [stokMap]);

  const totalPerkiraanNilai = useMemo(() => {
    return activeJenisList.reduce((sum, j) => {
      const stok = stokMap[j.id] || 0;
      return sum + stok * (j.hargaAcuanKg || 0);
    }, 0);
  }, [activeJenisList, stokMap]);

  const jenisLayakJualCount = useMemo(() => {
    return activeJenisList.filter(j => {
      const stok = stokMap[j.id] || 0;
      return j.ambangJualKg > 0 && stok >= j.ambangJualKg;
    }).length;
  }, [activeJenisList, stokMap]);

  const jenisPunyaStokCount = useMemo(() => {
    return activeJenisList.filter(j => (stokMap[j.id] || 0) > 0).length;
  }, [activeJenisList, stokMap]);

  // Monthly trend for charts
  const bulanNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const monthlyChartData = useMemo(() => {
    return bulanNames.map((namaBulan, idx) => {
      const monthNum = idx + 1;
      const monthPrefix = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
      const trxMonth = filteredTransaksi.filter(t => t.tanggal.startsWith(monthPrefix));

      const masukKg = trxMonth
        .filter(t => t.tipe === 'masuk')
        .reduce((sum, t) => sum + t.beratKg, 0);

      const keluarKg = trxMonth
        .filter(t => t.tipe === 'keluar')
        .reduce((sum, t) => sum + t.beratKg, 0);

      const pendapatanRp = trxMonth
        .filter(t => t.tipe === 'keluar' && t.totalNilai)
        .reduce((sum, t) => sum + (t.totalNilai || 0), 0);

      return {
        bulan: namaBulan,
        masukKg: Math.round(masukKg * 10) / 10,
        keluarKg: Math.round(keluarKg * 10) / 10,
        pendapatanRp,
      };
    });
  }, [filteredTransaksi, selectedYear]);

  // Donut chart: stock by category
  const donutCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {
      Plastik: 0,
      Kertas: 0,
      Logam: 0,
      Kaca: 0,
      Lainnya: 0,
    };

    activeJenisList.forEach(j => {
      const stok = stokMap[j.id] || 0;
      catMap[j.kategori] = (catMap[j.kategori] || 0) + stok;
    });

    return Object.entries(catMap)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 10) / 10,
        color: KATEGORI_COLORS[name as KategoriDaurUlang]?.dot || '#0d9488',
      }));
  }, [activeJenisList, stokMap]);

  // Bar chart: stock rank by item
  const barRankData = useMemo(() => {
    return activeJenisList
      .map(j => ({
        name: j.nama,
        stok: Math.round((stokMap[j.id] || 0) * 10) / 10,
        ambang: j.ambangJualKg,
        kategori: j.kategori,
        color: KATEGORI_COLORS[j.kategori]?.dot || '#0d9488',
      }))
      .sort((a, b) => b.stok - a.stok);
  }, [activeJenisList, stokMap]);

  // Filtered Riwayat table
  const tableData = useMemo(() => {
    return filteredTransaksi.filter(t => {
      if (filterTipe !== 'all' && t.tipe !== filterTipe) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = t.namaJenis.toLowerCase().includes(query);
        const matchPembeli = t.pembeli?.toLowerCase().includes(query);
        const matchSumber = t.sumber?.toLowerCase().includes(query);
        const matchKet = t.keterangan?.toLowerCase().includes(query);
        if (!matchName && !matchPembeli && !matchSumber && !matchKet) return false;
      }
      return true;
    });
  }, [filteredTransaksi, filterTipe, searchQuery]);

  // Multiselect helper logic
  const allFilteredIds = useMemo(() => tableData.map(t => t.id), [tableData]);
  const isAllSelected = tableData.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Export Handlers
  const handleExportExcel = () => {
    const rows = filteredTransaksi.map((t, idx) => ({
      No: idx + 1,
      Tanggal: t.tanggal,
      Tipe: t.tipe === 'masuk' ? 'Timbang Masuk' : 'Jual / Keluar',
      'Jenis Sampah': t.namaJenis,
      Kategori: t.kategori,
      'Berat (Kg)': t.beratKg,
      Sumber: t.sumber || '-',
      'Jenis Pengeluaran': t.jenisPengeluaran || '-',
      'Pembeli / Pengepul': t.pembeli || '-',
      'Harga / Kg (Rp)': t.hargaPerKg || 0,
      'Total Nilai (Rp)': t.totalNilai || 0,
      'Tujuan Kas': t.tujuanKas || '-',
      Keterangan: t.keterangan || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Daur Ulang');

    // Also append stock sheet
    const stokRows = activeJenisList.map(j => ({
      'Nama Jenis': j.nama,
      Kategori: j.kategori,
      'Stok Siap Jual (Kg)': stokMap[j.id] || 0,
      'Harga Acuan / Kg (Rp)': j.hargaAcuanKg,
      'Estimasi Nilai (Rp)': (stokMap[j.id] || 0) * j.hargaAcuanKg,
      'Ambang Jual (Kg)': j.ambangJualKg,
      'Status Layak Jual':
        j.ambangJualKg > 0 && (stokMap[j.id] || 0) >= j.ambangJualKg
          ? 'LAYAK JUAL'
          : 'BELUM LAYAK',
    }));
    const wsStok = XLSX.utils.json_to_sheet(stokRows);
    XLSX.utils.book_append_sheet(wb, wsStok, 'Stok Siap Jual');

    XLSX.writeFile(wb, `Laporan_Sampah_Daur_Ulang_${selectedYear}.xlsx`);
    setExportOpen(false);
  };

  const handleExportCSV = () => {
    const rows = filteredTransaksi.map((t, idx) => ({
      No: idx + 1,
      Tanggal: t.tanggal,
      Tipe: t.tipe === 'masuk' ? 'Timbang Masuk' : 'Jual / Keluar',
      'Jenis Sampah': t.namaJenis,
      Kategori: t.kategori,
      'Berat (Kg)': t.beratKg,
      Sumber: t.sumber || '',
      'Pembeli': t.pembeli || '',
      'Total Nilai (Rp)': t.totalNilai || 0,
      Keterangan: t.keterangan || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Daur_Ulang_${selectedYear}.csv`;
    link.click();
    setExportOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`LAPORAN SAMPAH DAUR ULANG SIAP JUAL (TAHUN ${selectedYear})`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Total Stok: ${formatNumberID(totalStokKg, 1)} kg`, 14, 22);

    const bodyData = filteredTransaksi.map((t, idx) => [
      idx + 1,
      t.tanggal,
      t.tipe === 'masuk' ? 'Masuk' : 'Keluar',
      t.namaJenis,
      t.kategori,
      `${formatNumberID(t.beratKg, 1)} kg`,
      t.pembeli || t.sumber || '-',
      t.totalNilai ? formatRupiah(t.totalNilai, false) : '-',
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['No', 'Tanggal', 'Tipe', 'Jenis', 'Kategori', 'Berat', 'Pihak/Sumber', 'Nilai (Rp)']],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 72, 72] },
    });

    doc.save(`Laporan_Daur_Ulang_${selectedYear}.pdf`);
    setExportOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching image_822611f9.png */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Daur ulang siap jual
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manajemen stok material daur ulang terpilah, ambang jual, dan pencatatan transaksi penjualan
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 self-start sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedToday}</span>
        </div>
      </div>

      {/* 4 Colored KPI Cards matching image_822611f9.png */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Stok Siap Jual (Dark Teal) */}
        <div className="relative overflow-hidden bg-[#0c4a4a] text-white rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <div className="relative z-10 space-y-1">
            <div className="text-3xl font-extrabold tracking-tight font-mono">
              {formatNumberID(totalStokKg, 1)} kg
            </div>
            <div className="text-xs font-medium text-teal-100/90 tracking-wide">
              stok siap jual
            </div>
          </div>
          {/* Watermark Icon */}
          <Recycle className="absolute right-4 bottom-3 w-16 h-16 text-teal-400/10 pointer-events-none stroke-[1.2]" />
        </div>

        {/* Card 2: Perkiraan Nilai Stok (Emerald Green) */}
        <div className="relative overflow-hidden bg-[#15803d] text-white rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <div className="relative z-10 space-y-1">
            <div className="text-3xl font-extrabold tracking-tight font-mono truncate">
              {formatRupiah(totalPerkiraanNilai, false)}
            </div>
            <div className="text-xs font-medium text-emerald-100/90 tracking-wide">
              perkiraan nilai stok
            </div>
          </div>
          {/* Watermark Text */}
          <span className="absolute right-4 bottom-2 text-5xl font-black text-emerald-300/15 pointer-events-none select-none">
            Rp
          </span>
        </div>

        {/* Card 3: Jenis Sudah Layak Jual (Warm Ochre) */}
        <div className="relative overflow-hidden bg-[#b45309] text-white rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <div className="relative z-10 space-y-1">
            <div className="text-3xl font-extrabold tracking-tight font-mono">
              {jenisLayakJualCount}
            </div>
            <div className="text-xs font-medium text-amber-100/90 tracking-wide">
              jenis sudah layak jual
            </div>
          </div>
          {/* Watermark Icon */}
          <CheckCircle2 className="absolute right-4 bottom-3 w-16 h-16 text-amber-300/15 pointer-events-none stroke-[1.5]" />
        </div>

        {/* Card 4: Jenis Punya Stok (Brick Red) */}
        <div className="relative overflow-hidden bg-[#9a3412] text-white rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <div className="relative z-10 space-y-1">
            <div className="text-3xl font-extrabold tracking-tight font-mono">
              {jenisPunyaStokCount} / {activeJenisList.length}
            </div>
            <div className="text-xs font-medium text-orange-100/90 tracking-wide">
              jenis punya stok
            </div>
          </div>
          {/* Watermark Icon */}
          <Layers className="absolute right-4 bottom-3 w-16 h-16 text-orange-300/15 pointer-events-none stroke-[1.2]" />
        </div>
      </div>

      {/* Main Stock Section & Action Header matching image_822611f9.png */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        {/* Section Header with Buttons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Stok siap jual
            </h2>
            <p className="text-xs text-slate-500">
              Pantau timbulan stok per kategori dan ambang berat minimal penjualan
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={onOpenTimbangMasuk}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#13593b] hover:bg-[#0f452d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Timbang masuk</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenJualKeluar}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0d4a4d] hover:bg-[#093537] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Jual / keluar</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenJenisHarga}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300/90 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Jenis & harga</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenImportExcel}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300/90 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  <span>Impor Excel</span>
                </button>
              </>
            )}

            {/* Dropdown Ekspor */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300/90 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Ekspor</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {exportOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setExportOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Ekspor Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Unduh PDF (.pdf)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-cyan-600" />
                      <span>Unduh CSV (.csv)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 10 Items Stock Grid matching image_822611f9.png */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {activeJenisList.map(item => {
            const currentWeight = stokMap[item.id] || 0;
            const categoryStyle = KATEGORI_COLORS[item.kategori] || KATEGORI_COLORS.Plastik;
            const isLayakJual = item.ambangJualKg > 0 && currentWeight >= item.ambangJualKg;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all border-t-[3.5px] ${categoryStyle.border} shadow-2xs relative flex flex-col justify-between`}
              >
                {/* Header: Name + Category badge */}
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: categoryStyle.dot }}
                      />
                      <span className="text-xs font-bold text-slate-900 truncate" title={item.nama}>
                        {item.nama}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium shrink-0">
                      {item.kategori}
                    </span>
                  </div>

                  {/* Big Number */}
                  <div className="text-2xl font-black text-slate-900 tracking-tight font-mono my-1">
                    {formatNumberID(currentWeight, 1)}
                    <span className="text-sm font-semibold text-slate-600 ml-1">kg</span>
                  </div>
                </div>

                {/* Subtext and Layak Jual Badge */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="truncate">
                    {item.hargaAcuanKg > 0 ? (
                      <span className="text-slate-600 font-medium font-mono text-[10px]">
                        Rp {formatNumberID(item.hargaAcuanKg, 0)}/kg
                      </span>
                    ) : (
                      <span>harga acuan belum diisi</span>
                    )}
                  </div>

                  {isLayakJual && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0 ml-1">
                      ✓ Layak Jual
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Sub-Tabs: Visualisasi & Grafik | Riwayat Transaksi | Rekap Bulanan */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('stok_grafik')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'stok_grafik'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Grafik & Visualisasi Daur Ulang</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('riwayat')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'riwayat'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Riwayat Transaksi Daur Ulang ({filteredTransaksi.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rekap')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'rekap'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Rekap Bulanan (Tahun {selectedYear})</span>
        </button>
      </div>

      {/* SubTab 1: Grafik & Visualisasi */}
      {activeSubTab === 'stok_grafik' && (
        <div className="space-y-6">
          {/* Main Chart 1: Tren Bulanan Timbang Masuk vs Jual (kg) & Nilai Pendapatan */}
          <div
            ref={chartTrenRef}
            className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Tren Bulanan Timbang Masuk vs Penjualan (Kg) & Pendapatan (Tahun {selectedYear})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grafik balok bertingkat volume sampah masuk dan keluar serta garis tren omzet penjualan kas
                </p>
              </div>

              {/* BtnCopyGrafik */}
              <BtnCopyGrafik
                chartRef={chartTrenRef}
                fileName={`Tren_Daur_Ulang_${selectedYear}`}
                chartTitle="Tren Daur Ulang"
              />
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis
                    yAxisId="kg"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    unit=" kg"
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    yAxisId="rp"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#b45309' }}
                    tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                    axisLine={{ stroke: '#fde68a' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => {
                      if (name === 'Pendapatan Penjualan') {
                        return [formatRupiah(val, false), name];
                      }
                      return [`${formatNumberID(val, 1)} kg`, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Bar
                    yAxisId="kg"
                    dataKey="masukKg"
                    name="Timbang Masuk (kg)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    yAxisId="kg"
                    dataKey="keluarKg"
                    name="Jual / Keluar (kg)"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="rp"
                    type="monotone"
                    dataKey="pendapatanRp"
                    name="Pendapatan Penjualan"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#d97706', strokeWidth: 1, stroke: '#ffffff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row of 2 Supporting Charts: Donut Komposisi & Bar Peringkat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Komposisi Stok per Kategori */}
            <div
              ref={chartDonutRef}
              className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-emerald-600" />
                    <span>Komposisi Stok per Kategori Material</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribusi persentase stok aktif berdasarkan kelompok daur ulang
                  </p>
                </div>
                <BtnCopyGrafik
                  chartRef={chartDonutRef}
                  fileName={`Komposisi_Daur_Ulang_${selectedYear}`}
                  chartTitle="Komposisi Material"
                />
              </div>

              {donutCategoryData.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <AlertCircle className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                  <span>Belum ada stok material tercatat</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutCategoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {donutCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px',
                          }}
                          formatter={(val: any) => [`${formatNumberID(val, 1)} kg`, 'Berat']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {donutCategoryData.map(item => {
                      const pct = totalStokKg > 0 ? (item.value / totalStokKg) * 100 : 0;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-xs shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <div className="font-mono text-slate-700">
                            {formatNumberID(item.value, 1)} kg ({pct.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Chart 3: Peringkat Stok per Jenis */}
            <div
              ref={chartBarRef}
              className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Peringkat Stok per Jenis Daur Ulang</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Urutan berat material yang siap diangkut / dijual
                  </p>
                </div>
                <BtnCopyGrafik
                  chartRef={chartBarRef}
                  fileName={`Peringkat_Stok_${selectedYear}`}
                  chartTitle="Peringkat Stok"
                />
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barRankData.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" unit=" kg" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10, fill: '#334155' }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      formatter={(val: any) => [`${formatNumberID(val, 1)} kg`, 'Stok']}
                    />
                    <Bar dataKey="stok" name="Stok (kg)" fill="#0d9488" radius={[0, 4, 4, 0]}>
                      {barRankData.slice(0, 8).map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Riwayat Transaksi */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Tipe filter */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterTipe('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterTipe === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Transaksi
              </button>
              <button
                type="button"
                onClick={() => setFilterTipe('masuk')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterTipe === 'masuk'
                    ? 'bg-[#13593b] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Timbang Masuk
              </button>
              <button
                type="button"
                onClick={() => setFilterTipe('keluar')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterTipe === 'keluar'
                    ? 'bg-[#0d4a4d] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jual / Keluar
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari jenis, pembeli, keterangan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Floating / Sticky Multi-select Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-emerald-950">
                  {selectedIds.length} data transaksi daur ulang dipilih
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  Batal Pilihan
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setIsBatchDeleteConfirmOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Terpilih ({selectedIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          {tableData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <span>Belum ada transaksi daur ulang yang cocok dengan filter.</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0c4a4a] text-white font-semibold uppercase text-[11px]">
                  <tr>
                    {!isReadOnly && (
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Pilih Semua Data"
                        />
                      </th>
                    )}
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Tipe</th>
                    <th className="p-3">Jenis Sampah</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-right">Berat (Kg)</th>
                    <th className="p-3">Sumber / Pembeli</th>
                    <th className="p-3 text-right">Harga/Kg</th>
                    <th className="p-3 text-right">Total Nilai</th>
                    <th className="p-3">Keterangan</th>
                    {!isReadOnly && <th className="p-3 text-center w-16">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableData.map((trx, idx) => {
                    const isSelected = selectedIds.includes(trx.id);
                    return (
                      <tr
                        key={trx.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 hover:bg-emerald-100/70'
                            : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => {
                          if (!isReadOnly) handleToggleSelectRow(trx.id);
                        }}
                      >
                        {!isReadOnly && (
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(trx.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              title="Pilih data ini"
                            />
                          </td>
                        )}
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-medium text-slate-700">{trx.tanggal}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              trx.tipe === 'masuk'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {trx.tipe === 'masuk' ? 'Timbang Masuk' : 'Jual / Keluar'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{trx.namaJenis}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              KATEGORI_COLORS[trx.kategori]?.bg || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {trx.kategori}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatNumberID(trx.beratKg, 1)} kg
                        </td>
                        <td className="p-3 text-slate-700">
                          {trx.tipe === 'masuk' ? trx.sumber : trx.pembeli || trx.jenisPengeluaran || '-'}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {trx.hargaPerKg ? formatRupiah(trx.hargaPerKg, false) : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          {trx.totalNilai ? formatRupiah(trx.totalNilai, false) : '-'}
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate" title={trx.keterangan}>
                          {trx.keterangan || '-'}
                        </td>
                        {!isReadOnly && (
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTrxToDelete(trx);
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs inline-flex items-center justify-center"
                              title="Hapus baris transaksi ini"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2]" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Rekap Bulanan */}
      {activeSubTab === 'rekap' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Rekapitulasi Bulanan Daur Ulang (Tahun {selectedYear})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ringkasan akumulasi timbulan masuk, penjualan keluar, dan penerimaan kas
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0c4a4a] text-white font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3">Bulan</th>
                  <th className="p-3 text-right">Timbang Masuk (Kg)</th>
                  <th className="p-3 text-right">Jual / Keluar (Kg)</th>
                  <th className="p-3 text-right">Selisih Bulan Ini (Kg)</th>
                  <th className="p-3 text-right">Total Penjualan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyChartData.map(m => (
                  <tr key={m.bulan} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{m.bulan} {selectedYear}</td>
                    <td className="p-3 text-right font-mono font-medium text-emerald-800">
                      {formatNumberID(m.masukKg, 1)} kg
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-teal-800">
                      {formatNumberID(m.keluarKg, 1)} kg
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {formatNumberID(m.masukKg - m.keluarKg, 1)} kg
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {formatRupiah(m.pendapatanRp, false)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="p-3 text-slate-900 uppercase">Total Akumulasi {selectedYear}</td>
                  <td className="p-3 text-right font-mono text-emerald-900">
                    {formatNumberID(
                      monthlyChartData.reduce((acc, m) => acc + m.masukKg, 0),
                      1
                    )}{' '}
                    kg
                  </td>
                  <td className="p-3 text-right font-mono text-teal-900">
                    {formatNumberID(
                      monthlyChartData.reduce((acc, m) => acc + m.keluarKg, 0),
                      1
                    )}{' '}
                    kg
                  </td>
                  <td className="p-3 text-right font-mono text-slate-900">
                    {formatNumberID(
                      monthlyChartData.reduce(
                        (acc, m) => acc + (m.masukKg - m.keluarKg),
                        0
                      ),
                      1
                    )}{' '}
                    kg
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-900">
                    {formatRupiah(
                      monthlyChartData.reduce((acc, m) => acc + m.pendapatanRp, 0),
                      false
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Confirm: Hapus 1 Baris Transaksi Daur Ulang */}
      <ModalConfirm
        isOpen={trxToDelete !== null}
        title="Konfirmasi Hapus Transaksi Daur Ulang"
        message={
          trxToDelete ? (
            <div className="space-y-2.5">
              <p>
                Apakah Anda yakin ingin menghapus data{' '}
                <strong>{trxToDelete.tipe === 'masuk' ? 'Timbang Masuk' : 'Jual / Keluar'}</strong>{' '}
                material <strong>{trxToDelete.namaJenis}</strong> seberat{' '}
                <strong>{formatNumberID(trxToDelete.beratKg, 1)} kg</strong> pada tanggal{' '}
                <span className="font-mono font-semibold">{trxToDelete.tanggal}</span>?
              </p>
              {trxToDelete.tipe === 'keluar' && trxToDelete.catatKeKas && trxToDelete.totalNilai && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  ℹ️ Pemasukan kas sebesar <strong>{formatRupiah(trxToDelete.totalNilai)}</strong> dari penjualan ini juga akan disesuaikan otomatis pada Buku Kas Keuangan.
                </div>
              )}
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          if (trxToDelete) {
            onDeleteTransaksi(trxToDelete.id);
            setSelectedIds(prev => prev.filter(id => id !== trxToDelete.id));
            setTrxToDelete(null);
          }
        }}
        onCancel={() => setTrxToDelete(null)}
      />

      {/* Modal Confirm: Hapus Massal Transaksi Daur Ulang */}
      <ModalConfirm
        isOpen={isBatchDeleteConfirmOpen}
        title="Konfirmasi Hapus Terpilih Transaksi Daur Ulang"
        message={
          <div className="space-y-2.5">
            <p>
              Apakah Anda yakin ingin menghapus{' '}
              <strong className="text-rose-600">{selectedIds.length} baris transaksi daur ulang</strong> yang dipilih?
            </p>
            <div className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 space-y-1">
              <p className="font-bold">⚠️ Perhatian Hapus Permanen:</p>
              <p>
                Data yang dihapus akan langsung hilang dari database. Jika ada transaksi penjualan terkait kas, catatan kas juga akan dibersihkan otomatis.
              </p>
            </div>
          </div>
        }
        confirmText={`Ya, Hapus ${selectedIds.length} Data`}
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          if (onDeleteTransaksiBatch) {
            onDeleteTransaksiBatch(selectedIds);
          } else {
            selectedIds.forEach(id => onDeleteTransaksi(id));
          }
          setSelectedIds([]);
          setIsBatchDeleteConfirmOpen(false);
        }}
        onCancel={() => setIsBatchDeleteConfirmOpen(false)}
      />
    </div>
  );
};
