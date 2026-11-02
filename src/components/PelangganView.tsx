import React, { useState } from 'react';
import { Pelanggan, PembayaranIuran, OPSProfile } from '../types/ops';
import { formatRupiah, formatNumberID, downloadCSV, MONTH_NAMES_ID, MONTH_SHORT_ID } from '../utils/format';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  CreditCard,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  CheckSquare,
  Square,
  BarChart3,
  TrendingUp,
  RefreshCw,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';
import { GrafikRealisasiIuran } from './GrafikRealisasiIuran';
import { GrafikTrenPelanggan } from './GrafikTrenPelanggan';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  selectedYear: number;
  onOpenAddPelanggan: () => void;
  onOpenEditPelanggan: (pelanggan: Pelanggan) => void;
  onDeletePelanggan: (id: string) => void;
  onDeletePelangganBatch?: (ids: string[]) => void;
  onOpenAddIuranForCell: (pelanggan: Pelanggan, bulan: number) => void;
  onOpenImportExcel?: (type: 'pelanggan' | 'pembayaran') => void;
  onSyncMonthlyRekap?: () => void;
}

export const PelangganView: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  pembayaranList,
  selectedYear,
  onOpenAddPelanggan,
  onOpenEditPelanggan,
  onDeletePelanggan,
  onDeletePelangganBatch,
  onOpenAddIuranForCell,
  onOpenImportExcel,
  onSyncMonthlyRekap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'matriks' | 'realisasi' | 'tren'>('daftar');
  const [matriksYear, setMatriksYear] = useState<number>(selectedYear);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRT, setFilterRT] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pelangganToDelete, setPelangganToDelete] = useState<Pelanggan | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Status counts for real-time filter indicators
  const totalCount = pelangganList.length;
  const aktifCount = pelangganList.filter(p => p.status === 'Aktif').length;
  const berhentiCount = pelangganList.filter(p => p.status === 'Berhenti').length;

  // Filter RT options
  const uniqueRTs = Array.from(new Set(pelangganList.map(p => p.rt))).sort();

  // Filtered customer list
  const filteredPelanggan = pelangganList.filter(p => {
    const matchesSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.rt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRT = filterRT === 'all' || p.rt === filterRT;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesRT && matchesStatus;
  });

  // Multiselect logic
  const allFilteredIds = filteredPelanggan.map(p => p.id);
  const isAllSelected =
    filteredPelanggan.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));

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
    if (onDeletePelangganBatch && selectedIds.length > 0) {
      onDeletePelangganBatch(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);
    }
  };

  // Export CSV for customer list
  const handleExportCSV = () => {
    if (activeSubTab === 'daftar') {
      const headers = [
        'No',
        'Nama Pelanggan',
        'Kategori',
        'RT',
        'Tanggal Mulai Ikut Layanan',
        'Status',
        'Tanggal Mulai Tidak Aktif',
        'Tarif (Rp/bulan)',
      ];
      const rows = filteredPelanggan.map((p, idx) => [
        idx + 1,
        p.nama,
        p.kategori,
        p.rt,
        p.tanggalMulai,
        p.status,
        p.tanggalBerhenti || '-',
        p.tarifPerBulan,
      ]);
      downloadCSV(`Data_Pelanggan_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    } else {
      // Export Iuran Matrix
      const headers = [
        'No',
        'Nama Pelanggan',
        'RT',
        'Tarif/Bulan',
        ...MONTH_SHORT_ID.map(m => `Bayar_${m}`),
      ];
      const rows = filteredPelanggan.map((p, idx) => {
        const monthAmounts = Array.from({ length: 12 }, (_, mIdx) => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === mIdx + 1
          );
          return byr ? byr.jumlah : 0;
        });
        return [idx + 1, p.nama, p.rt, p.tarifPerBulan, ...monthAmounts];
      });
      downloadCSV(`Matriks_Iuran_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    }
  };

  // Helper for matrix cell payment styling
  const getCellPaymentStyle = (amount: number, tarif: number) => {
    if (!amount || amount === 0) {
      return 'bg-white text-transparent hover:bg-slate-100 hover:text-slate-400';
    }
    if (amount >= tarif) {
      // Full payment (Green like Excel image)
      return 'bg-emerald-600 text-white font-semibold hover:bg-emerald-500';
    }
    if (amount >= tarif * 0.5) {
      // Partial ~50-90% (Lime / Yellow-green like Excel image)
      return 'bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300';
    }
    if (amount >= tarif * 0.25) {
      // Partial ~25-50% (Amber / Orange like Excel image)
      return 'bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300';
    }
    // Very low payment (Red-orange like Excel image)
    return 'bg-rose-500 text-white font-semibold hover:bg-rose-400';
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Subtabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: View Mode Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveSubTab('daftar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'daftar'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Pelanggan</span>
          </button>
          <button
            onClick={() => setActiveSubTab('matriks')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'matriks'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Matriks Iuran ({matriksYear})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('realisasi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'realisasi'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Persentase &amp; Realisasi</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tren')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'tren'
                ? 'bg-white text-blue-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Tren Pertumbuhan</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, RT..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-36 sm:w-44"
            />
          </div>

          {/* RT Filter */}
          <select
            value={filterRT}
            onChange={e => setFilterRT(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">Semua RT</option>
            {uniqueRTs.map(rt => (
              <option key={rt} value={rt}>
                RT {rt}
              </option>
            ))}
          </select>

          {/* Interactive Status Filter Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
              title="Tampilkan semua pelanggan aktif maupun berhenti"
            >
              <span>Semua</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 font-mono text-slate-700">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('Aktif')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'Aktif'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold ring-1 ring-emerald-500'
                  : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 font-medium'
              }`}
              title="Filter hanya pelanggan yang masih aktif berlangganan"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Aktif</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  filterStatus === 'Aktif'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {aktifCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('Berhenti')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'Berhenti'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold ring-1 ring-rose-500'
                  : 'text-rose-800 hover:text-rose-950 hover:bg-rose-50 font-medium'
              }`}
              title="Filter pelanggan yang sudah berhenti berlangganan"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
              <span>Berhenti</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  filterStatus === 'Berhenti'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {berhentiCount}
              </span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Download file CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Import Excel: Dynamically targets Warga or Pembayaran Iuran based on active subtab */}
          {onOpenImportExcel && (
            <div className="flex items-center gap-1">
              {activeSubTab === 'daftar' ? (
                <button
                  type="button"
                  onClick={() => onOpenImportExcel('pelanggan')}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Import daftar nama warga / pelanggan dari file Excel (.xlsx) atau CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Data Warga</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenImportExcel('pembayaran')}
                  className="px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Import rekap pembayaran iuran warga 12 bulan dari file Excel (.xlsx) atau CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                  <span>Import Pembayaran Iuran</span>
                </button>
              )}
            </div>
          )}

          {/* Add Customer Button */}
          <button
            onClick={onOpenAddPelanggan}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: DAFTAR DATA PELANGGAN (MATCHING IMAGE 1) */}
      {activeSubTab === 'daftar' && (
        <div className="space-y-3">
          {/* Floating Multi-select Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                <span className="text-xs font-bold text-teal-950">
                  {selectedIds.length} pelanggan dipilih
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
            <div className="px-5 py-3 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-300" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Daftar Pelanggan Layanan Sampah {activeOPS.nama}
                </h3>
              </div>
              <span className="text-xs text-teal-200 font-mono">
                Total: {filteredPelanggan.length} Pelanggan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                {/* Header with Teal Styling matching original spreadsheet */}
                <thead className="bg-teal-700 text-white uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-center w-10 border-r border-teal-600">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="p-1 hover:bg-teal-600 rounded-sm cursor-pointer transition-colors"
                        title={isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-teal-300" />
                        ) : (
                          <Square className="w-4 h-4 text-teal-300/70" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center w-12 border-r border-teal-600">No</th>
                    {activeOPS.id === 'all' && (
                      <th className="px-3 py-3 border-r border-teal-600 text-center">OPS</th>
                    )}
                    <th className="px-4 py-3 border-r border-teal-600">Nama Pelanggan</th>
                    <th className="px-4 py-3 border-r border-teal-600">Kategori</th>
                    <th className="px-3 py-3 text-center border-r border-teal-600">RT</th>
                    <th className="px-4 py-3 border-r border-teal-600">Tanggal Mulai Ikut Layanan</th>
                    <th className="px-4 py-3 text-center border-r border-teal-600">Status</th>
                    <th className="px-4 py-3 border-r border-teal-600">Tanggal Mulai Tidak Aktif</th>
                    <th className="px-4 py-3 text-right border-r border-teal-600">Tarif (Rp/bulan)</th>
                    <th className="px-4 py-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPelanggan.length === 0 ? (
                    <tr>
                      <td colSpan={activeOPS.id === 'all' ? 11 : 10} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada data pelanggan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPelanggan.map((pelanggan, index) => {
                      const isAktif = pelanggan.status === 'Aktif';
                      const isSelected = selectedIds.includes(pelanggan.id);
                      return (
                        <tr
                          key={pelanggan.id}
                          className={`transition-colors group ${
                            isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(pelanggan.id)}
                              className="p-1 hover:bg-slate-200 rounded-sm cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-teal-700" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-slate-600 border-r border-slate-200">
                            {index + 1}
                          </td>
                        {activeOPS.id === 'all' && (
                          <td className="px-3 py-2.5 text-center border-r border-slate-200">
                            <span className="px-2 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 font-semibold text-[10px] font-mono">
                              {pelanggan.opsId === 'ops-tanah-rata' ? 'OPS-TR' : pelanggan.opsId === 'ops-mekar-asri' ? 'OPS-MA' : pelanggan.opsId}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-2.5 font-semibold text-slate-900 border-r border-slate-200">
                          {pelanggan.nama}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 border-r border-slate-200">
                          {pelanggan.kategori}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-700 border-r border-slate-200">
                          {pelanggan.rt}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 border-r border-slate-200">
                          {pelanggan.tanggalMulai}
                        </td>
                        <td className="px-4 py-2.5 text-center border-r border-slate-200">
                          <span
                            className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                              isAktif
                                ? 'bg-emerald-700 text-white'
                                : 'bg-rose-700 text-white'
                            }`}
                          >
                            {pelanggan.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 border-r border-slate-200 font-mono">
                          {pelanggan.tanggalBerhenti || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900 border-r border-slate-200 tabular-nums">
                          {formatRupiah(pelanggan.tarifPerBulan, true)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onOpenEditPelanggan(pelanggan)}
                              className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Edit Data Pelanggan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPelangganToDelete(pelanggan)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Pelanggan"
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

      {/* SUBTAB 2: MATRIKS PEMBAYARAN IURAN */}
      {activeSubTab === 'matriks' && (() => {
        // Calculations for Matrix columns & footer
        const monthlyTotals = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          return filteredPelanggan.reduce((sum, p) => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === mNum
            );
            return sum + (byr?.jumlah || 0);
          }, 0);
        });

        const monthlyPayerCounts = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          return filteredPelanggan.filter(p => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === mNum
            );
            return (byr?.jumlah || 0) > 0;
          }).length;
        });

        const monthlyTargets = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          const monthStr = `${matriksYear}-${String(mNum).padStart(2, '0')}-01`;
          return filteredPelanggan.reduce((sum, p) => {
            if (p.status === 'Berhenti' && p.tanggalBerhenti && p.tanggalBerhenti < monthStr) {
              return sum;
            }
            return sum + (p.tarifPerBulan || 0);
          }, 0);
        });

        const monthlyPcts = Array.from({ length: 12 }, (_, mIdx) => {
          const tgt = monthlyTargets[mIdx];
          const tot = monthlyTotals[mIdx];
          return tgt > 0 ? (tot / tgt) * 100 : 0;
        });

        const grandTotalRealisasi = monthlyTotals.reduce((s, a) => s + a, 0);
        const grandTotalTarget = monthlyTargets.reduce((s, a) => s + a, 0);
        const grandTotalPct = grandTotalTarget > 0 ? (grandTotalRealisasi / grandTotalTarget) * 100 : 0;
        const grandTotalPayers = filteredPelanggan.filter(p => {
          return Array.from({ length: 12 }, (_, m) => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === m + 1
            );
            return byr?.jumlah || 0;
          }).some(a => a > 0);
        }).length;

        const availableYears = Array.from(
          new Set([
            selectedYear,
            ...pembayaranList.map(p => p.tahun).filter(Boolean),
            2026,
            2025,
            2024,
          ])
        ).sort((a, b) => b - a);

        const handleSyncMatriksKeKas = () => {
          setIsSyncing(true);
          setTimeout(() => {
            if (onSyncMonthlyRekap) {
              onSyncMonthlyRekap();
            }
            setSyncNotice(`Matriks Iuran ${matriksYear} berhasil disinkronkan ke Buku Arus Kas (${formatRupiah(grandTotalRealisasi, true)}).`);
            setIsSyncing(false);
            setTimeout(() => setSyncNotice(null), 5000);
          }, 250);
        };

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            {/* Sync Notice Alert */}
            {syncNotice && (
              <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{syncNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncNotice(null)}
                  className="text-emerald-200 hover:text-white text-xs underline cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Header Controls: Title, Year Picker, Arus Kas Sync Button, & Legend */}
            <div className="px-5 py-3.5 bg-teal-800 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-white">
                    <CreditCard className="w-4 h-4 text-teal-300" />
                    Matriks Pembayaran Iuran Warga
                  </h3>
                  {/* Matrix Year Picker */}
                  <div className="flex items-center gap-1.5 bg-teal-900/90 px-2 py-0.5 rounded-md border border-teal-600/70">
                    <span className="text-[10px] text-teal-200 uppercase font-bold">Tahun:</span>
                    <select
                      value={matriksYear}
                      onChange={e => setMatriksYear(Number(e.target.value))}
                      className="bg-transparent text-white text-xs font-bold font-mono focus:outline-hidden cursor-pointer"
                    >
                      {availableYears.map(yr => (
                        <option key={yr} value={yr} className="text-slate-900 bg-white font-sans">
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-teal-200 mt-0.5">
                  Klik pada kotak bulan untuk mencatat atau mengubah nominal pembayaran iuran warga
                </p>
              </div>

              {/* Action Buttons: Sync to Arus Kas & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncMatriksKeKas}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Hitung total pembayaran pada matriks dan sinkronkan tepat ke catatan Arus Kas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Arus Kas'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded-lg transition-all border border-teal-500/50 flex items-center gap-1.5 cursor-pointer font-medium"
                  title="Download data matriks pembayaran ke CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Matriks CSV</span>
                </button>
              </div>
            </div>

            {/* Summary KPI Strip on Top of Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-teal-900/10 border-b border-teal-200/50 text-xs font-medium">
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Terkumpul ({matriksYear})</div>
                <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                  {formatRupiah(grandTotalRealisasi, true)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Target Tagihan Setahun</div>
                <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                  {formatRupiah(grandTotalTarget, true)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Persentase Realisasi</div>
                <div className="text-sm font-bold text-teal-700 font-mono mt-0.5">
                  {formatNumberID(grandTotalPct, 1)}%
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Warga Pembayar</div>
                <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                  {grandTotalPayers} / {filteredPelanggan.length} KK
                </div>
              </div>
            </div>

            {/* Color Legend from Spreadsheet */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">Keterangan Warna Status:</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
                  <span>Lunas (Sesuai Tarif)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-lime-400 border border-lime-500"></span>
                  <span>Cicil Tinggi (≥50%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-amber-400 border border-amber-500"></span>
                  <span>Cicil Rendah (≥25%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
                  <span>Di Bawah 25%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-200 border border-slate-300"></span>
                  <span>Belum Bayar</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-teal-700 text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-10 border-r border-teal-600 sticky left-0 z-10 bg-teal-700">No</th>
                    {activeOPS.id === 'all' && (
                      <th className="px-2 py-2.5 text-center border-r border-teal-600">OPS</th>
                    )}
                    <th className="px-3 py-2.5 border-r border-teal-600 min-w-[150px] sticky left-10 z-10 bg-teal-700">Nama Pelanggan</th>
                    <th className="px-2 py-2.5 text-center border-r border-teal-600">RT</th>
                    <th className="px-3 py-2.5 text-right border-r border-teal-600 min-w-[95px]">Tarif/Bln</th>
                    {MONTH_NAMES_ID.map((monthName, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-2.5 text-center border-r border-teal-600 min-w-[105px]"
                      >
                        {monthName}
                      </th>
                    ))}
                    {/* Customer Row Total Columns */}
                    <th className="px-3 py-2.5 text-right border-r border-teal-600 min-w-[115px] bg-teal-800">
                      Total Terbayar
                    </th>
                    <th className="px-2 py-2.5 text-center min-w-[100px] bg-teal-800">
                      Status Setor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPelanggan.map((pelanggan, idx) => {
                    const isBerhenti = pelanggan.status === 'Berhenti';

                    // 12 months array for this row
                    const customerMonthlyPayments = Array.from({ length: 12 }, (_, mIdx) => {
                      const mNum = mIdx + 1;
                      const payment = pembayaranList.find(
                        b => b.pelangganId === pelanggan.id && b.tahun === matriksYear && b.bulan === mNum
                      );
                      return payment?.jumlah || 0;
                    });

                    const rowTotalPaid = customerMonthlyPayments.reduce((s, a) => s + a, 0);
                    const rowMonthsCount = customerMonthlyPayments.filter(a => a > 0).length;

                    return (
                      <tr
                        key={pelanggan.id}
                        className={`transition-colors ${
                          isBerhenti
                            ? 'bg-rose-50/50 hover:bg-rose-100/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2 text-center font-mono text-slate-500 border-r border-slate-200 sticky left-0 bg-white">
                          {idx + 1}
                        </td>
                        {activeOPS.id === 'all' && (
                          <td className="px-2 py-2 text-center border-r border-slate-200">
                            <span className="px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">
                              {pelanggan.opsId === 'ops-tanah-rata' ? 'OPS-TR' : pelanggan.opsId === 'ops-mekar-asri' ? 'OPS-MA' : pelanggan.opsId}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-2 font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap sticky left-10 bg-white">
                          <div className="flex items-center gap-1.5">
                            <span className={isBerhenti ? 'text-slate-600 line-through' : 'text-slate-900 font-bold'}>
                              {pelanggan.nama}
                            </span>
                            {isBerhenti ? (
                              <span
                                className="px-1.5 py-0.2 rounded-xs bg-rose-100 text-rose-800 font-bold text-[9px] border border-rose-200 inline-flex items-center gap-0.5"
                                title={pelanggan.tanggalBerhenti ? `Berhenti sejak: ${pelanggan.tanggalBerhenti}` : 'Berhenti berlangganan'}
                              >
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                <span>Berhenti</span>
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 rounded-xs bg-emerald-100 text-emerald-800 font-semibold text-[9px]">
                                Aktif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-200">
                          {pelanggan.rt}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-800 border-r border-slate-200 tabular-nums">
                          {formatRupiah(pelanggan.tarifPerBulan, false)}
                        </td>

                        {/* 12 Months Cells */}
                        {customerMonthlyPayments.map((amount, mIdx) => {
                          const mNum = mIdx + 1;
                          const cellStyle = getCellPaymentStyle(amount, pelanggan.tarifPerBulan);

                          return (
                            <td
                              key={mIdx}
                              onClick={() => onOpenAddIuranForCell(pelanggan, mNum)}
                              className="p-1 border-r border-slate-200 text-center cursor-pointer transition-all hover:ring-1 hover:ring-emerald-500"
                              title={`Klik untuk edit iuran ${pelanggan.nama} (${MONTH_NAMES_ID[mIdx]} ${matriksYear})`}
                            >
                              <div
                                className={`py-1.5 px-1 rounded-sm text-[11px] font-mono tabular-nums transition-colors ${cellStyle}`}
                              >
                                {amount > 0 ? formatRupiah(amount, false) : '-'}
                              </div>
                            </td>
                          );
                        })}

                        {/* Customer Row Total Terbayar */}
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800 border-r border-slate-200 tabular-nums bg-emerald-50/40">
                          {formatRupiah(rowTotalPaid, false)}
                        </td>

                        {/* Customer Row Status / Bulan */}
                        <td className="px-2 py-2 text-center bg-slate-50/50">
                          {rowMonthsCount >= 12 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Lunas 12 Bln
                            </span>
                          ) : rowMonthsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                              {rowMonthsCount}/12 Bln
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                              0 Bln
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* TFOOT: 4-Row Calculation of Monthly Totals & Realization Pct */}
                <tfoot className="border-t-2 border-teal-700 bg-slate-100 font-bold text-slate-900">
                  {/* Row 1: Total Realisasi Rupiah */}
                  <tr className="bg-teal-50 border-b border-teal-200">
                    <td
                      colSpan={activeOPS.id === 'all' ? 5 : 4}
                      className="px-3 py-2.5 text-right uppercase text-[11px] text-teal-900 font-extrabold sticky left-0 bg-teal-50"
                    >
                      Total Realisasi Iuran (Rp):
                    </td>
                    {monthlyTotals.map((tot, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2.5 text-center font-mono text-[11px] text-emerald-800 border-r border-teal-200 tabular-nums bg-emerald-50/60 font-extrabold"
                      >
                        {tot > 0 ? formatRupiah(tot, false) : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-black text-emerald-900 border-r border-teal-300 tabular-nums bg-emerald-100">
                      {formatRupiah(grandTotalRealisasi, true)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-[10px] text-emerald-800 bg-emerald-100 font-bold">
                      Setahun
                    </td>
                  </tr>

                  {/* Row 2: Warga Bayar KK */}
                  <tr className="bg-white border-b border-slate-200">
                    <td
                      colSpan={activeOPS.id === 'all' ? 5 : 4}
                      className="px-3 py-2 text-right uppercase text-[10px] text-slate-600 font-bold sticky left-0 bg-white"
                    >
                      Warga Setor Iuran (KK):
                    </td>
                    {monthlyPayerCounts.map((cnt, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2 text-center font-mono text-[11px] text-slate-700 border-r border-slate-200"
                      >
                        {cnt > 0 ? `${cnt} KK` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-slate-800 border-r border-slate-200">
                      {grandTotalPayers} KK
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-slate-500 font-medium">
                      Pernah Setor
                    </td>
                  </tr>

                  {/* Row 3: Target Tagihan Bulanan */}
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td
                      colSpan={activeOPS.id === 'all' ? 5 : 4}
                      className="px-3 py-2 text-right uppercase text-[10px] text-slate-600 font-bold sticky left-0 bg-slate-50"
                    >
                      Target Tagihan (Rp):
                    </td>
                    {monthlyTargets.map((tgt, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 tabular-nums"
                      >
                        {formatRupiah(tgt, false)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-slate-700 border-r border-slate-200 tabular-nums">
                      {formatRupiah(grandTotalTarget, true)}
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-slate-600 font-semibold">
                      Target 1 Thn
                    </td>
                  </tr>

                  {/* Row 4: Persentase Realisasi */}
                  <tr className="bg-teal-900 text-white">
                    <td
                      colSpan={activeOPS.id === 'all' ? 5 : 4}
                      className="px-3 py-2.5 text-right uppercase text-[11px] text-teal-200 font-bold sticky left-0 bg-teal-900"
                    >
                      % Realisasi Capaian:
                    </td>
                    {monthlyPcts.map((pct, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2.5 text-center font-mono text-[11px] font-bold border-r border-teal-800"
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            pct >= 90
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : pct >= 60
                              ? 'bg-lime-400 text-slate-950 font-bold'
                              : pct >= 30
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-teal-800 text-teal-200'
                          }`}
                        >
                          {pct > 0 ? `${formatNumberID(pct, 0)}%` : '-'}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-black text-amber-300 border-r border-teal-800 tabular-nums bg-teal-950">
                      {formatNumberID(grandTotalPct, 1)}%
                    </td>
                    <td className="px-2 py-2.5 text-center text-[10px] text-amber-200 bg-teal-950 font-bold">
                      Capaian Thn
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* SUBTAB 3: PERSENTASE & GRAFIK REALISASI IURAN */}
      {activeSubTab === 'realisasi' && (
        <GrafikRealisasiIuran
          activeOPS={activeOPS}
          pelangganList={filteredPelanggan}
          pembayaranList={pembayaranList}
          selectedYear={matriksYear}
        />
      )}

      {/* SUBTAB 4: TREN PERTUMBUHAN PELANGGAN */}
      {activeSubTab === 'tren' && (
        <GrafikTrenPelanggan
          activeOPS={activeOPS}
          pelangganList={filteredPelanggan}
          selectedYear={matriksYear}
        />
      )}

      {/* Modal Confirm Hapus Pelanggan */}
      <ModalConfirm
        isOpen={pelangganToDelete !== null}
        title="Hapus Data Pelanggan"
        message={
          pelangganToDelete ? (
            <div>
              Yakin ingin menghapus data pelanggan <strong>{pelangganToDelete.nama}</strong> (RT {pelangganToDelete.rt})?
            </div>
          ) : null
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          if (pelangganToDelete) {
            onDeletePelanggan(pelangganToDelete.id);
            setSelectedIds(prev => prev.filter(id => id !== pelangganToDelete.id));
            setPelangganToDelete(null);
          }
        }}
        onCancel={() => setPelangganToDelete(null)}
      />

      {/* Modal Confirm Batch Delete Pelanggan */}
      <ModalConfirm
        isOpen={isBatchDeleteConfirmOpen}
        title="Hapus Banyak Data Pelanggan Sekaligus"
        message={
          <div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus <strong className="text-rose-600 font-bold">{selectedIds.length}</strong> data pelanggan yang dipilih?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Seluruh riwayat pembayaran iuran yang terafiliasi dengan pelanggan terpilih juga akan ikut dibersihkan.
            </p>
          </div>
        }
        confirmText={`Ya, Hapus ${selectedIds.length} Pelanggan`}
        cancelText="Batal"
        variant="danger"
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setIsBatchDeleteConfirmOpen(false)}
      />
    </div>
  );
};
