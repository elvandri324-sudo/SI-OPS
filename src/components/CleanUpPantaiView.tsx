import React, { useState, useEffect, useMemo } from 'react';
import { TransaksiPengangkutan } from '../types/ops';
import { formatNumberID, downloadCSV, MONTH_NAMES_ID } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Waves,
  Plus,
  Search,
  Download,
  FileText,
  Edit2,
  Trash2,
  Calendar,
  Users,
  MapPin,
  Recycle,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';
import { GrafikCleanUpPantai } from './GrafikCleanUpPantai';
import { Pagination } from './Pagination';

interface Props {
  cleanupList: TransaksiPengangkutan[];
  selectedYear: number;
  onChangeYear?: (year: number) => void;
  isReadOnly?: boolean;
  onOpenAddCleanUp: () => void;
  onOpenEditCleanUp: (item: TransaksiPengangkutan) => void;
  onDeleteCleanUp: (id: string) => void;
  onDeleteCleanUpBatch?: (ids: string[]) => void;
}

export const CleanUpPantaiView: React.FC<Props> = ({
  cleanupList,
  selectedYear,
  onChangeYear,
  isReadOnly = false,
  onOpenAddCleanUp,
  onOpenEditCleanUp,
  onDeleteCleanUp,
  onDeleteCleanUpBatch,
}) => {
  // 1. Discover all years that actually exist in cleanupList
  const dataYears = useMemo(() => {
    const yrs = cleanupList
      .map(it => it.tanggal?.substring(0, 4))
      .filter((y): y is string => Boolean(y && /^\d{4}$/.test(y)));
    return Array.from(new Set(yrs)).sort().reverse();
  }, [cleanupList]);

  // 2. Discover available years for selection (selectedYear + any years found in data)
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    if (selectedYear) set.add(String(selectedYear));
    dataYears.forEach(y => set.add(y));
    if (set.size === 0) {
      set.add('2026');
    }
    return Array.from(set).sort().reverse();
  }, [dataYears, selectedYear]);

  // 3. Determine intelligent default year:
  // If data exists in selectedYear, use selectedYear.
  // If selectedYear has no data, but other years do have data, adjust to the year that HAS data!
  const getInitialYear = () => {
    if (dataYears.includes(String(selectedYear))) {
      return String(selectedYear);
    }
    if (dataYears.length > 0) {
      return dataYears[0];
    }
    return String(selectedYear);
  };

  const [filterYear, setFilterYear] = useState<string>(getInitialYear);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<TransaksiPengangkutan | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);

  // Synchronize when selectedYear changes from top toolbar or when data updates
  useEffect(() => {
    if (filterYear === 'all') return;

    if (dataYears.includes(String(selectedYear))) {
      setFilterYear(String(selectedYear));
    } else if (dataYears.length > 0 && !dataYears.includes(filterYear)) {
      setFilterYear(dataYears[0]);
    } else if (dataYears.length === 0) {
      setFilterYear(String(selectedYear));
    }
  }, [selectedYear, dataYears]);

  const handleFilterYearChange = (newYear: string) => {
    setFilterYear(newYear);
    if (newYear !== 'all' && /^\d{4}$/.test(newYear) && onChangeYear) {
      onChangeYear(Number(newYear));
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Reset page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterYear, filterMonth, searchQuery]);

  // Filter items by year, month, and search query
  const filteredList = cleanupList.filter(item => {
    const matchesYear = filterYear === 'all' || (item.tanggal && item.tanggal.startsWith(filterYear));
    const matchesMonth =
      filterMonth === 'all' ||
      (filterYear !== 'all'
        ? item.tanggal?.startsWith(`${filterYear}-${filterMonth}`)
        : item.tanggal?.split('-')[1] === filterMonth);
    const matchesSearch =
      (item.hariTanggalLabel && item.hariTanggalLabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.lokasiPantai && item.lokasiPantai.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.armada && item.armada.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.catatan && item.catatan.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesYear && matchesMonth && matchesSearch;
  });

  // Pagination slice
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  // Multiselect logic
  const allFilteredIds = filteredList.map(it => it.id);
  const isAllSelected =
    filteredList.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.some(id => allFilteredIds.includes(id));

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

  // Metrics calculation
  const totalKegiatan = filteredList.length;
  const totalRelawan = filteredList.reduce((s, it) => s + (it.jumlahRelawan || it.pelangganTerlayani || 0), 0);
  const totalDaurUlang = filteredList.reduce((s, it) => s + (it.beratDaurUlangKg || 0), 0);
  const totalPlastik = filteredList.reduce((s, it) => s + (it.beratPlastikKg || 0), 0);
  const totalResidu = filteredList.reduce((s, it) => s + (it.beratResiduKg || 0), 0);
  const totalSampahCleanUp = totalDaurUlang + totalPlastik + totalResidu;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Tanggal Kegiatan',
      'Lokasi Pantai / Pesisir',
      'Jumlah Relawan (Orang)',
      'Panjang Pesisir (Meter)',
      'Daur Ulang (Kg)',
      'Plastik (Kg)',
      'Residu (Kg)',
      'Total Sampah (Kg)',
      'Armada / Tim',
      'Catatan',
    ];
    const rows = filteredList.map(it => {
      const daur = it.beratDaurUlangKg || 0;
      const plastik = it.beratPlastikKg || 0;
      const residu = it.beratResiduKg || 0;
      const total = daur + plastik + residu;
      return [
        it.tanggal,
        it.lokasiPantai || 'Pantai Pesisir',
        it.jumlahRelawan || it.pelangganTerlayani || 0,
        it.panjangPesisirMeter || 500,
        daur,
        plastik,
        residu,
        total,
        it.armada || 'Tim Relawan',
        it.catatan || '',
      ];
    });
    downloadCSV(`Clean_Up_Pantai_${filterYear === 'all' ? 'Semua_Tahun' : filterYear}.csv`, headers, rows);
  };

  // Export PDF
  const handleExportPDF = () => {
    const periodLabel =
      filterYear === 'all'
        ? 'Semua Tahun'
        : filterMonth === 'all'
        ? `Tahun ${filterYear}`
        : `${MONTH_NAMES_ID[Number(filterMonth) - 1]} ${filterYear}`;

    const headers = [
      'No',
      'Tanggal',
      'Lokasi Pantai / Pesisir',
      'Relawan (Org)',
      'Panjang (m)',
      'Daur Ulang (kg)',
      'Plastik (kg)',
      'Residu (kg)',
      'Total (kg)',
      'Armada / Tim',
      'Catatan',
    ];

    const rows = filteredList.map((it, idx) => {
      const daur = it.beratDaurUlangKg || 0;
      const plastik = it.beratPlastikKg || 0;
      const residu = it.beratResiduKg || 0;
      const total = daur + plastik + residu;
      return [
        idx + 1,
        it.hariTanggalLabel || it.tanggal,
        it.lokasiPantai || 'Pantai Pesisir',
        it.jumlahRelawan || it.pelangganTerlayani || 0,
        it.panjangPesisirMeter || 500,
        formatNumberID(daur, 1),
        formatNumberID(plastik, 1),
        formatNumberID(residu, 1),
        formatNumberID(total, 1),
        it.armada || 'Tim Relawan',
        it.catatan || '-',
      ];
    });

    const totalPanjang = filteredList.reduce((s, it) => s + (it.panjangPesisirMeter || 500), 0);
    const footRows = [
      [
        '',
        'TOTAL AKUMULASI',
        `${totalKegiatan} Lokasi/Aksi`,
        `${formatNumberID(totalRelawan, 0)} Orang`,
        `${formatNumberID(totalPanjang, 0)} m`,
        `${formatNumberID(totalDaurUlang, 1)} kg`,
        `${formatNumberID(totalPlastik, 1)} kg`,
        `${formatNumberID(totalResidu, 1)} kg`,
        `${formatNumberID(totalSampahCleanUp, 1)} kg`,
        '-',
        '-',
      ],
    ];

    downloadPDF({
      filename: `Data_CleanUp_Pantai_${filterYear === 'all' ? 'Semua_Tahun' : filterYear}.pdf`,
      title: `LAPORAN KEGIATAN CLEAN-UP PANTAI & KONSERVASI PESISIR`,
      subtitle: `Data Mandiri Non-OPS | Periode: ${periodLabel}`,
      opsName: 'Program Konservasi Pesisir & Laut',
      orientation: 'landscape',
      summaryItems: [
        { label: 'Total Aksi Kegiatan', value: `${totalKegiatan} Kegiatan` },
        { label: 'Total Relawan Terlibat', value: `${formatNumberID(totalRelawan, 0)} Orang` },
        { label: 'Total Sampah Pesisir', value: `${formatNumberID(totalSampahCleanUp, 1)} Kg` },
        { label: 'Plastik & Daur Ulang', value: `${formatNumberID(totalPlastik + totalDaurUlang, 1)} Kg` },
      ],
      headers,
      rows,
      footRows,
    });
  };

  const handleConfirmBatchDelete = () => {
    if (onDeleteCleanUpBatch && selectedIds.length > 0) {
      onDeleteCleanUpBatch(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-cyan-900 via-teal-900 to-emerald-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-800/80 text-cyan-200 text-xs font-semibold mb-2 border border-cyan-700">
            <Waves className="w-3.5 h-3.5" />
            <span>Sumber Sampah Non-OPS / Pesisir &amp; Komunitas</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            Clean-up Pantai &amp; Konservasi Pesisir
          </h2>
          <p className="text-sm text-cyan-200/90 max-w-2xl mt-1">
            Pencatatan khusus aksi bersih pantai, pembersihan garis pantai oleh relawan &amp; masyarakat, serta pemilahan sampah daur ulang, plastik, dan residu pesisir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs border border-rose-400/40 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-rose-100" />
            <span>Export PDF</span>
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={onOpenAddCleanUp}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Clean-up Pantai</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider truncate">Aksi Kegiatan</span>
            <div className="p-2 bg-cyan-50 text-cyan-700 rounded-lg shrink-0 ml-1">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 truncate">{totalKegiatan}</div>
          <p className="text-2xs text-slate-500 mt-1 truncate">Aksi bersih pantai {filterYear === 'all' ? 'semua tahun' : `tahun ${filterYear}`}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider truncate">Total Relawan</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0 ml-1">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 truncate">{formatNumberID(totalRelawan, 0)}</div>
          <p className="text-2xs text-slate-500 mt-1 truncate">Warga &amp; relawan tergerak</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider truncate">Sampah Pesisir</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 ml-1">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 truncate">{formatNumberID(totalSampahCleanUp, 1)} <span className="text-xs font-normal text-slate-500">kg</span></div>
          <p className="text-2xs text-slate-500 mt-1 truncate">Total diangkat dari pantai</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider truncate">Proporsi Plastik</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg shrink-0 ml-1">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 truncate">
            {formatNumberID(totalPlastik, 1)} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <p className="text-2xs text-slate-500 mt-1 truncate">Daur ulang {formatNumberID(totalDaurUlang, 1)} kg</p>
        </div>
      </div>

      {/* Grafik Visualisasi Data Clean-up Pantai */}
      <GrafikCleanUpPantai
        cleanupList={cleanupList}
        selectedYear={selectedYear}
        filterYear={filterYear}
        onFilterYearChange={handleFilterYearChange}
        availableYears={availableYears}
      />

      {/* Filter and Multi-select Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Year - Allows viewing specific year or All Years */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Tahun:</label>
              <select
                value={filterYear}
                onChange={e => handleFilterYearChange(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="all">Semua Periode / Tahun</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Month */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Bulan:</label>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="all">Semua Bulan</option>
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={m} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari lokasi pantai, armada, catatan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-64 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-bold text-slate-800">{filteredList.length}</span> kegiatan clean-up
          </div>
        </div>

        {/* Floating Multi-select Action Bar */}
        {!isReadOnly && selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-2.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
              <span className="text-xs font-bold text-cyan-900">
                {selectedIds.length} data kegiatan dipilih
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
              <button
                type="button"
                onClick={() => setIsBatchDeleteConfirmOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Clean-up */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-cyan-900 text-white font-bold border-b border-cyan-800">
                {!isReadOnly && (
                  <th className="px-3 py-3 w-10 text-center border-r border-cyan-800">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-cyan-800 rounded-sm cursor-pointer transition-colors"
                      title={isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-300" />
                      ) : (
                        <Square className="w-4 h-4 text-cyan-300/70" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-3 py-3 border-r border-cyan-800 min-w-[150px]">Tanggal</th>
                <th className="px-3 py-3 border-r border-cyan-800 min-w-[160px]">Lokasi Pantai / Pesisir</th>
                <th className="px-3 py-3 text-center border-r border-cyan-800">Relawan</th>
                <th className="px-3 py-3 text-center border-r border-cyan-800">Panjang (m)</th>
                <th className="px-3 py-3 text-right bg-emerald-800 text-emerald-100 border-r border-emerald-700">Daur Ulang (kg)</th>
                <th className="px-3 py-3 text-right bg-sky-800 text-sky-100 border-r border-sky-700">Plastik (kg)</th>
                <th className="px-3 py-3 text-right bg-rose-800 text-rose-100 border-r border-rose-700">Residu (kg)</th>
                <th className="px-3 py-3 text-right bg-cyan-950 text-cyan-200 border-r border-cyan-900 font-extrabold">Total (kg)</th>
                <th className="px-3 py-3 border-r border-cyan-800">Armada / Tim</th>
                <th className="px-3 py-3 border-r border-cyan-800 min-w-[140px]">Catatan</th>
                {!isReadOnly && <th className="px-3 py-3 text-center w-20">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 10 : 12} className="px-4 py-12 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Waves className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">Belum ada catatan kegiatan clean-up pantai pada periode ini.</p>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={onOpenAddCleanUp}
                          className="mt-2 text-xs font-bold text-cyan-700 hover:text-cyan-800 underline cursor-pointer"
                        >
                          + Catat Aksi Clean-up Baru Sekarang
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map(item => {
                  const daur = item.beratDaurUlangKg || 0;
                  const plastik = item.beratPlastikKg || 0;
                  const residu = item.beratResiduKg || 0;
                  const total = daur + plastik + residu;
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-cyan-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      {!isReadOnly && (
                        <td className="px-3 py-2.5 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRow(item.id)}
                            className="p-1 hover:bg-slate-200 rounded-sm cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-cyan-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-2.5 font-sans font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        {item.hariTanggalLabel || item.tanggal}
                      </td>
                      <td className="px-3 py-2.5 font-sans font-semibold text-cyan-950 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>{item.lokasiPantai || 'Pantai Pesisir'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                        {item.jumlahRelawan || item.pelangganTerlayani || 0}
                      </td>
                      <td className="px-3 py-2.5 text-center font-sans text-slate-600 border-r border-slate-200">
                        {item.panjangPesisirMeter || 500} m
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-800 bg-emerald-50/50 border-r border-slate-200">
                        {formatNumberID(daur, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-sky-800 bg-sky-50/50 border-r border-slate-200">
                        {formatNumberID(plastik, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-rose-800 bg-rose-50/50 border-r border-slate-200">
                        {formatNumberID(residu, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-cyan-950 bg-cyan-100/50 border-r border-slate-200">
                        {formatNumberID(total, 1)}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-slate-700 border-r border-slate-200">
                        {item.armada || 'Tim Relawan'}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-slate-600 border-r border-slate-200 text-2xs">
                        {item.catatan || '-'}
                      </td>
                      {!isReadOnly && (
                        <td className="px-2 py-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditCleanUp(item)}
                              className="p-1 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-sm cursor-pointer"
                              title="Edit Aksi Clean-up"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-sm cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredList.length > 0 && (
              <tfoot className="bg-cyan-950 text-white font-mono font-bold border-t-2 border-cyan-800">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-sans">
                    TOTAL KESELURUHAN ({filteredList.length} KEGIATAN)
                  </td>
                  <td className="px-3 py-3 text-center font-sans">
                    {formatNumberID(totalRelawan, 0)} Relawan
                  </td>
                  <td></td>
                  <td className="px-3 py-3 text-right bg-emerald-900 text-emerald-100">
                    {formatNumberID(totalDaurUlang, 1)} kg
                  </td>
                  <td className="px-3 py-3 text-right bg-sky-900 text-sky-100">
                    {formatNumberID(totalPlastik, 1)} kg
                  </td>
                  <td className="px-3 py-3 text-right bg-rose-900 text-rose-100">
                    {formatNumberID(totalResidu, 1)} kg
                  </td>
                  <td className="px-3 py-3 text-right bg-cyan-900 text-cyan-100 text-sm">
                    {formatNumberID(totalSampahCleanUp, 1)} kg
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination for Clean-up Pantai */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 15, 25, 50]}
          itemLabel="kegiatan clean-up"
        />
      </div>

      {/* Confirmation: Single Delete */}
      <ModalConfirm
        isOpen={Boolean(itemToDelete)}
        title="Hapus Catatan Clean-up Pantai"
        message={
          itemToDelete ? (
            <div>
              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menghapus catatan aksi clean-up di{' '}
                <strong className="text-slate-900">{itemToDelete.lokasiPantai || 'Pantai Pesisir'}</strong> pada tanggal{' '}
                <strong className="text-slate-900">{itemToDelete.hariTanggalLabel || itemToDelete.tanggal}</strong>?
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus"
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteCleanUp(itemToDelete.id);
            setSelectedIds(prev => prev.filter(id => id !== itemToDelete.id));
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Confirmation: Batch Delete */}
      <ModalConfirm
        isOpen={isBatchDeleteConfirmOpen}
        title="Hapus Banyak Catatan Clean-up Sekaligus"
        message={
          <div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus <strong className="text-rose-600 font-bold">{selectedIds.length}</strong> kegiatan clean-up pantai yang dipilih?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Tindakan ini akan menghapus data terpilih secara permanen dari basis data dan Cloud Firestore.
            </p>
          </div>
        }
        confirmText={`Ya, Hapus ${selectedIds.length} Data`}
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setIsBatchDeleteConfirmOpen(false)}
      />
    </div>
  );
};
