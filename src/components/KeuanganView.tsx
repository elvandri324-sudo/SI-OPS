import React, { useState } from 'react';
import { TransaksiKas, OPSProfile, KategoriKas, Pelanggan, PembayaranIuran } from '../types/ops';
import { formatRupiah, downloadCSV, MONTH_SHORT_ID, MONTH_NAMES_ID } from '../utils/format';
import {
  Wallet,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';
import { GrafikIuranVsPengeluaran } from './GrafikIuranVsPengeluaran';

interface Props {
  activeOPS: OPSProfile;
  kasList: TransaksiKas[];
  pelangganList?: Pelanggan[];
  pembayaranList?: PembayaranIuran[];
  selectedYear: number;
  onOpenAddKas: () => void;
  onOpenEditKas: (item: TransaksiKas) => void;
  onDeleteKas: (id: string) => void;
  onDeleteKasBatch?: (ids: string[]) => void;
  onSyncMonthlyRekap?: () => void;
  onOpenImportExcel?: () => void;
}

export const KeuanganView: React.FC<Props> = ({
  activeOPS,
  kasList,
  pelangganList = [],
  pembayaranList = [],
  selectedYear,
  onOpenAddKas,
  onOpenEditKas,
  onDeleteKas,
  onDeleteKasBatch,
  onSyncMonthlyRekap,
  onOpenImportExcel,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bukuKas' | 'laporanBulanan' | 'rekapKategori' | 'grafikKomparasi'>('bukuKas');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterOPS, setFilterOPS] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<TransaksiKas | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);

  // Daftar tahun unik (termasuk 2025 dan tahun yang ada di kasList)
  const availableYears = Array.from(
    new Set([
      String(selectedYear),
      '2026',
      '2025',
      ...kasList.map(k => k.tanggal?.slice(0, 4)).filter(Boolean),
    ])
  ).sort((a, b) => b.localeCompare(a));

  // Filtered transactions (tampilkan semua data walaupun diinput sebelum tahun 2026 jika filterYear === 'all')
  const filteredKas = kasList.filter(item => {
    const matchesYear = filterYear === 'all' || item.tanggal.startsWith(filterYear);
    const matchesMonth =
      filterMonth === 'all' ||
      (filterYear === 'all'
        ? item.tanggal.slice(5, 7) === filterMonth
        : item.tanggal.startsWith(`${filterYear}-${filterMonth}`));
    const matchesOPS = filterOPS === 'all' || item.opsId === filterOPS;
    const matchesKat = filterKategori === 'all' || item.kategori === filterKategori;
    const matchesSearch =
      item.uraian.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.noBukti.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesMonth && matchesOPS && matchesKat && matchesSearch;
  });

  // Multiselect logic
  const allFilteredIds = filteredKas.map(k => k.id);
  const isAllSelected =
    filteredKas.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));

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

  const handleConfirmBatchDelete = () => {
    if (onDeleteKasBatch && selectedIds.length > 0) {
      onDeleteKasBatch(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);
    }
  };

  // Calculate annual summary table by 12 months (Exact replica of image 7)
  let cumulativeBalance = 0;
  const annualReportRows = Array.from({ length: 12 }, (_, idx) => {
    const mNum = idx + 1;
    const mStr = String(mNum).padStart(2, '0');
    const label = `${selectedYear}-${MONTH_SHORT_ID[idx]}`;

    const items = kasList.filter(k => k.tanggal.startsWith(`${selectedYear}-${mStr}`));
    const pemasukan = items.reduce((s, it) => s + (it.pemasukan || 0), 0);
    const pengeluaran = items.reduce((s, it) => s + (it.pengeluaran || 0), 0);

    // Saldo akhir accumulates month-by-month
    cumulativeBalance = cumulativeBalance + pemasukan - pengeluaran;

    return {
      monthLabel: label,
      monthName: MONTH_NAMES_ID[idx],
      pemasukan,
      pengeluaran,
      saldoAkhir: cumulativeBalance,
      netBulanIni: pemasukan - pengeluaran,
      transaksiCount: items.length,
    };
  });

  const totalYearPemasukan = annualReportRows.reduce((s, r) => s + r.pemasukan, 0);
  const totalYearPengeluaran = annualReportRows.reduce((s, r) => s + r.pengeluaran, 0);
  const finalYearSaldo = annualReportRows[11]?.saldoAkhir || 0;

  // Breakdown per Category according to User's Specification (image_515836fb.png)
  const kategoriPengeluaranList = [
    'Gaji Petugas OPS',
    'BBM & Transport',
    'Air dan Listrik',
    'Perawatan Alat',
    'ATK & Operasional Kantor',
    'Lain-lain',
    'Pembelian Peralatan',
  ];

  const kategoriPemasukanList = [
    'Iuran Warga',
    'Penjualan Produk',
    'Hibah',
    'Lain-lain',
  ];

  const pengeluaranPerKategori = kategoriPengeluaranList.map(nama => {
    const total = filteredKas
      .filter(k => k.pengeluaran > 0 && k.kategori === nama)
      .reduce((s, it) => s + (it.pengeluaran || 0), 0);
    return { nama, total };
  });
  const totalRekapPengeluaran = pengeluaranPerKategori.reduce((s, it) => s + it.total, 0);

  const pemasukanPerKategori = kategoriPemasukanList.map(nama => {
    const total = filteredKas
      .filter(k => k.pemasukan > 0 && k.kategori === nama)
      .reduce((s, it) => s + (it.pemasukan || 0), 0);
    return { nama, total };
  });
  const totalRekapPemasukan = pemasukanPerKategori.reduce((s, it) => s + it.total, 0);

  // Export CSV
  const handleExportCSV = () => {
    if (activeSubTab === 'bukuKas') {
      const headers = [
        'Tanggal',
        'No Bukti',
        'Kategori',
        'Uraian',
        'Jenis Kas (Tunai/Bank)',
        'Pemasukan',
        'Pengeluaran',
        'Saldo',
      ];
      const rows = filteredKas.map(k => [
        k.tanggal,
        k.noBukti,
        k.kategori,
        k.uraian,
        k.jenisKas,
        k.pemasukan,
        k.pengeluaran,
        k.saldo || 0,
      ]);
      downloadCSV(`Buku_Kas_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    } else if (activeSubTab === 'laporanBulanan') {
      const headers = ['Bulan', 'Total Pemasukan', 'Total Pengeluaran', 'Saldo Akhir'];
      const rows = annualReportRows.map(r => [
        r.monthLabel,
        r.pemasukan,
        r.pengeluaran,
        r.saldoAkhir,
      ]);
      downloadCSV(`Laporan_Keuangan_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    } else {
      const headers = ['Tipe', 'Nama Kategori', 'Total Nominal (Rp)'];
      const rows = [
        ...pengeluaranPerKategori.map(p => ['Pengeluaran', p.nama, p.total]),
        ['Pengeluaran', 'TOTAL PENGELUARAN', totalRekapPengeluaran],
        ...pemasukanPerKategori.map(p => ['Pemasukan', p.nama, p.total]),
        ['Pemasukan', 'TOTAL PEMASUKAN', totalRekapPemasukan],
      ];
      downloadCSV(`Rekap_Kategori_Kas_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Subtabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveSubTab('bukuKas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'bukuKas'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Pencatatan Arus Kas</span>
          </button>
          <button
            onClick={() => setActiveSubTab('laporanBulanan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'laporanBulanan'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Laporan Tahunan ({selectedYear})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rekapKategori')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'rekapKategori'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rekap Kategori Kas</span>
          </button>
          <button
            onClick={() => setActiveSubTab('grafikKomparasi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'grafikKomparasi'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Grafik Iuran vs Biaya</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* OPS filter when in Semua OPS mode */}
          {activeOPS.id === 'all' && (
            <select
              value={filterOPS}
              onChange={e => setFilterOPS(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50 text-emerald-900"
            >
              <option value="all">Semua Asal OPS</option>
              <option value="ops-tanah-rata">OPS Tanah Rata (OPS-TR)</option>
              <option value="ops-mekar-asri">OPS Mekar Asri (OPS-MA)</option>
            </select>
          )}

          {/* Year filter */}
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
          >
            <option value="all">Semua Tahun (Termasuk 2025 &amp; Sebelumnya)</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">Semua Bulan</option>
            {MONTH_NAMES_ID.map((name, idx) => (
              <option key={idx + 1} value={String(idx + 1).padStart(2, '0')}>
                {name}
              </option>
            ))}
          </select>

          {activeSubTab === 'bukuKas' && (
            <>
              {/* Category filter with exact groups */}
              <select
                value={filterKategori}
                onChange={e => setFilterKategori(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">Semua Kategori</option>
                <optgroup label="── Kategori Pemasukan ──">
                  <option value="Iuran Warga">Iuran Warga</option>
                  <option value="Penjualan Produk">Penjualan Produk</option>
                  <option value="Hibah">Hibah</option>
                  <option value="Lain-lain">Lain-lain</option>
                </optgroup>
                <optgroup label="── Kategori Pengeluaran ──">
                  <option value="Gaji Petugas OPS">Gaji Petugas OPS</option>
                  <option value="BBM & Transport">BBM &amp; Transport</option>
                  <option value="Air dan Listrik">Air dan Listrik</option>
                  <option value="Perawatan Alat">Perawatan Alat</option>
                  <option value="ATK & Operasional Kantor">ATK &amp; Operasional Kantor</option>
                  <option value="Pembelian Peralatan">Pembelian Peralatan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </optgroup>
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari uraian, no bukti..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-44"
                />
              </div>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {onOpenImportExcel && (
            <button
              type="button"
              onClick={onOpenImportExcel}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Import data transaksi kas / keuangan dari file Excel (.xlsx, .xls) atau CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}

          {onSyncMonthlyRekap && (
            <button
              type="button"
              onClick={onSyncMonthlyRekap}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Perbarui rekapitulasi iuran menjadi 1 baris per bulan pada tanggal akhir bulan"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rekap Iuran Bulanan</span>
            </button>
          )}

          <button
            onClick={onOpenAddKas}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Kas</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: BUKU KAS UMUM / PENCATATAN ARUS KAS (MATCHING IMAGE 6) */}
      {activeSubTab === 'bukuKas' && (
        <div className="space-y-3">
          {/* Floating Multi-select Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-emerald-950">
                  {selectedIds.length} transaksi kas dipilih
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Pencatatan Arus Kas {activeOPS.nama.toUpperCase()}
                </h3>
                <p className="text-[11px] text-emerald-200">
                  Penerimaan Iuran, Penjualan Sampah Daur Ulang, BBM Armada, &amp; Biaya Operasional Lingkungan
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-emerald-200">Saldo Akhir:</span>
                <div className="text-sm font-bold font-mono text-emerald-300 tabular-nums">
                  {formatRupiah(finalYearSaldo, true)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-emerald-800 text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center border-r border-emerald-700">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="p-1 hover:bg-emerald-700 rounded-sm cursor-pointer transition-colors"
                        title={isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <Square className="w-4 h-4 text-emerald-300/70" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 border-r border-emerald-700 min-w-[130px]">Tanggal</th>
                    {activeOPS.id === 'all' && (
                      <th className="px-3 py-3 border-r border-emerald-700 text-center min-w-[85px]">Asal OPS</th>
                    )}
                    <th className="px-3 py-3 text-center border-r border-emerald-700 w-24">No Bukti</th>
                    <th className="px-4 py-3 border-r border-emerald-700 min-w-[150px]">Kategori</th>
                    <th className="px-4 py-3 border-r border-emerald-700 min-w-[200px]">Uraian</th>
                    <th className="px-3 py-3 text-center border-r border-emerald-700 min-w-[120px]">
                      Jenis Kas (Tunai/Bank)
                    </th>
                    <th className="px-4 py-3 text-right border-r border-emerald-700 min-w-[130px]">
                      Pemasukan
                    </th>
                    <th className="px-4 py-3 text-right border-r border-emerald-700 min-w-[130px]">
                      Pengeluaran
                    </th>
                    <th className="px-4 py-3 text-right border-r border-emerald-700 min-w-[140px]">
                      Saldo
                    </th>
                    <th className="px-3 py-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 font-mono">
                  {filteredKas.length === 0 ? (
                    <tr>
                      <td colSpan={activeOPS.id === 'all' ? 11 : 10} className="px-4 py-8 text-center text-slate-400 font-sans">
                        Belum ada transaksi kas untuk kriteria yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredKas.map(item => {
                      const isNeg = (item.saldo || 0) < 0;
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors group ${
                            isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-2 text-center border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(item.id)}
                              className="p-1 hover:bg-slate-200 rounded-sm cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-700" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-2 font-sans font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            {item.tanggal}
                          </td>
                        {activeOPS.id === 'all' && (
                          <td className="px-2 py-2 text-center border-r border-slate-200 font-sans">
                            <span className="px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">
                              {item.opsId === 'ops-tanah-rata' ? 'OPS-TR' : item.opsId === 'ops-mekar-asri' ? 'OPS-MA' : item.opsId}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-200">
                          {item.noBukti}
                        </td>
                        <td className="px-4 py-2 text-slate-800 border-r border-slate-200 font-sans font-medium">
                          {item.kategori}
                        </td>
                        <td className="px-4 py-2 text-slate-700 border-r border-slate-200 font-sans">
                          {item.uraian}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-200 capitalize font-sans">
                          {item.jenisKas}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-700 font-semibold border-r border-slate-200 tabular-nums">
                          {item.pemasukan > 0 ? formatRupiah(item.pemasukan, true) : ''}
                        </td>
                        <td className="px-4 py-2 text-right text-rose-700 font-semibold border-r border-slate-200 tabular-nums">
                          {item.pengeluaran > 0 ? formatRupiah(item.pengeluaran, true) : ''}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-bold border-r border-slate-200 tabular-nums ${
                            isNeg ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'
                          }`}
                        >
                          {formatRupiah(item.saldo || 0, true)}
                        </td>
                        <td className="px-2 py-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100">
                            <button
                              onClick={() => onOpenEditKas(item)}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xs"
                              title="Edit Transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* VIEW 2: LAPORAN KEUANGAN TAHUNAN BULAN PER BULAN (MATCHING IMAGE 7) */}
      {activeSubTab === 'laporanBulanan' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden max-w-4xl mx-auto">
          <div className="p-6 bg-emerald-950 text-white text-center border-b border-emerald-800">
            <h2 className="text-base font-extrabold tracking-wider uppercase">
              Laporan Keuangan {activeOPS.nama.toUpperCase()}
            </h2>
            <h3 className="text-sm font-semibold text-emerald-300 mt-1">
              TAHUN {selectedYear}
            </h3>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-emerald-800 text-white font-bold text-center">
                <tr>
                  <th className="px-6 py-3 border border-emerald-700 text-left">Bulan</th>
                  <th className="px-6 py-3 border border-emerald-700 text-right">Total Pemasukan</th>
                  <th className="px-6 py-3 border border-emerald-700 text-right">Total Pengeluaran</th>
                  <th className="px-6 py-3 border border-emerald-700 text-right">Saldo Akhir</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono">
                {annualReportRows.map(row => {
                  const isNeg = row.saldoAkhir < 0;
                  return (
                    <tr key={row.monthLabel} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-2.5 font-sans font-medium text-slate-800 border-r border-slate-200">
                        {row.monthLabel}
                      </td>
                      <td className="px-6 py-2.5 text-right text-emerald-800 border-r border-slate-200 tabular-nums">
                        {formatRupiah(row.pemasukan, true)}
                      </td>
                      <td className="px-6 py-2.5 text-right text-rose-800 border-r border-slate-200 tabular-nums">
                        {formatRupiah(row.pengeluaran, true)}
                      </td>
                      <td
                        className={`px-6 py-2.5 text-right font-bold tabular-nums ${
                          isNeg ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(row.saldoAkhir, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="bg-slate-100 font-mono font-black text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td className="px-6 py-3 font-sans">TOTAL TAHUNAN</td>
                  <td className="px-6 py-3 text-right text-emerald-900 tabular-nums">
                    {formatRupiah(totalYearPemasukan, true)}
                  </td>
                  <td className="px-6 py-3 text-right text-rose-900 tabular-nums">
                    {formatRupiah(totalYearPengeluaran, true)}
                  </td>
                  <td
                    className={`px-6 py-3 text-right text-base tabular-nums ${
                      finalYearSaldo < 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(finalYearSaldo, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Keterangan: Saldo akhir terakumulasi dari bulan ke bulan (running net balance).
            </span>
            <span className="font-semibold text-slate-700">
              Bendahara: {activeOPS.bendahara || 'Petugas Keuangan OPS'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW 3: REKAPITULASI KATEGORI KAS (EXACT REPLICA OF USER'S SPREADSHEET) */}
      {activeSubTab === 'rekapKategori' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Card 1: Pengeluaran per Kategori */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  REKAP KAS KELUAR
                </span>
                <h3 className="font-extrabold text-sm uppercase">Nama Kategori Pengeluaran</h3>
              </div>
              <span className="text-xs font-mono font-bold text-rose-300">
                {formatRupiah(totalRekapPengeluaran, true)}
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-emerald-900 text-white font-bold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 border-r border-emerald-800">Nama Kategori</th>
                  <th className="px-4 py-2.5 text-right">Total Pengeluaran (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {pengeluaranPerKategori.map(item => (
                  <tr key={item.nama} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-900 border-r border-slate-100">
                      {item.nama}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-700 tabular-nums">
                      {item.total > 0 ? formatRupiah(item.total, true) : 'Rp 0,00'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider text-slate-900 border-r border-slate-200">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-800 text-sm tabular-nums">
                    {formatRupiah(totalRekapPengeluaran, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Card 2: Pemasukan per Kategori */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  REKAP KAS MASUK
                </span>
                <h3 className="font-extrabold text-sm uppercase">Nama Kategori Pemasukan</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300">
                {formatRupiah(totalRekapPemasukan, true)}
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-emerald-900 text-white font-bold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 border-r border-emerald-800">Nama Kategori</th>
                  <th className="px-4 py-2.5 text-right">Total Pemasukan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {pemasukanPerKategori.map(item => (
                  <tr key={item.nama} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-900 border-r border-slate-100">
                      {item.nama}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {item.total > 0 ? formatRupiah(item.total, true) : 'Rp 0,00'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider text-slate-900 border-r border-slate-200">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 text-sm tabular-nums">
                    {formatRupiah(totalRekapPemasukan, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: GRAFIK KOMPARASI POTENSI IURAN VS REALISASI IURAN VS PENGELUARAN */}
      {activeSubTab === 'grafikKomparasi' && (
        <GrafikIuranVsPengeluaran
          activeOPS={activeOPS}
          pelangganList={pelangganList}
          pembayaranList={pembayaranList}
          kasList={kasList}
          selectedYear={selectedYear}
        />
      )}

      <ModalConfirm
        isOpen={!!itemToDelete}
        title="Hapus Catatan Kas"
        message={`Hapus transaksi kas tanggal "${itemToDelete?.tanggal || ''}" [${itemToDelete?.noBukti || '-'}] "${itemToDelete?.uraian || ''}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteKas(itemToDelete.id);
            setSelectedIds(prev => prev.filter(id => id !== itemToDelete.id));
            setItemToDelete(null);
          }
        }}
        onClose={() => setItemToDelete(null)}
      />

      <ModalConfirm
        isOpen={isBatchDeleteConfirmOpen}
        title="Hapus Banyak Catatan Kas Sekaligus"
        message={
          <div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus <strong className="text-rose-600 font-bold">{selectedIds.length}</strong> transaksi kas yang dipilih?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Tindakan ini akan memperbarui saldo buku kas umum dan menyinkronkan data ke Cloud Firestore.
            </p>
          </div>
        }
        confirmText={`Ya, Hapus ${selectedIds.length} Transaksi`}
        cancelText="Batal"
        variant="danger"
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setIsBatchDeleteConfirmOpen(false)}
      />
    </div>
  );
};
