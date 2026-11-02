import React, { useState } from 'react';
import { Pelanggan, PembayaranIuran, OPSProfile } from '../types/ops';
import { formatRupiah, downloadCSV, MONTH_NAMES_ID, MONTH_SHORT_ID } from '../utils/format';
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
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  selectedYear: number;
  onOpenAddPelanggan: () => void;
  onOpenEditPelanggan: (pelanggan: Pelanggan) => void;
  onDeletePelanggan: (id: string) => void;
  onOpenAddIuranForCell: (pelanggan: Pelanggan, bulan: number) => void;
  onOpenImportExcel?: (type: 'pelanggan' | 'pembayaran') => void;
}

export const PelangganView: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  pembayaranList,
  selectedYear,
  onOpenAddPelanggan,
  onOpenEditPelanggan,
  onDeletePelanggan,
  onOpenAddIuranForCell,
  onOpenImportExcel,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'matriks'>('daftar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRT, setFilterRT] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pelangganToDelete, setPelangganToDelete] = useState<Pelanggan | null>(null);

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
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveSubTab('daftar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'daftar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Input &amp; Daftar Pelanggan</span>
          </button>
          <button
            onClick={() => setActiveSubTab('matriks')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'matriks'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Matriks Pembayaran Iuran ({selectedYear})</span>
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
                    <td colSpan={activeOPS.id === 'all' ? 10 : 9} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data pelanggan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredPelanggan.map((pelanggan, index) => {
                    const isAktif = pelanggan.status === 'Aktif';
                    return (
                      <tr
                        key={pelanggan.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
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
      )}

      {/* SUBTAB 2: MATRIKS PEMBAYARAN IURAN (MATCHING IMAGE 2) */}
      {activeSubTab === 'matriks' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 bg-teal-800 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-300" />
                Matriks Pembayaran Iuran Warga Tahun {selectedYear}
              </h3>
              <p className="text-[11px] text-teal-200">
                Klik pada kotak bulan untuk mencatat atau mengubah nominal pembayaran iuran
              </p>
            </div>

            {/* Color Legend from Spreadsheet */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
                <span>Lunas (Rp 20.000)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-lime-400"></span>
                <span>Cicil Tinggi (Rp 8-18k)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-400"></span>
                <span>Cicil Rendah (Rp 2-6k)</span>
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
                  <th className="px-3 py-2.5 text-center w-10 border-r border-teal-600">No</th>
                  {activeOPS.id === 'all' && (
                    <th className="px-2 py-2.5 text-center border-r border-teal-600">OPS</th>
                  )}
                  <th className="px-3 py-2.5 border-r border-teal-600 min-w-[140px]">Nama Pelanggan</th>
                  <th className="px-2 py-2.5 text-center border-r border-teal-600">RT</th>
                  <th className="px-3 py-2.5 text-right border-r border-teal-600 min-w-[100px]">Tarif/Bln</th>
                  {MONTH_NAMES_ID.map((monthName, idx) => (
                    <th
                      key={idx}
                      className="px-2 py-2.5 text-center border-r border-teal-600 min-w-[105px]"
                    >
                      Pembayaran {monthName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPelanggan.map((pelanggan, idx) => {
                  const isBerhenti = pelanggan.status === 'Berhenti';
                  return (
                    <tr
                      key={pelanggan.id}
                      className={`transition-colors ${
                        isBerhenti
                          ? 'bg-rose-50/50 hover:bg-rose-100/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-center font-mono text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      {activeOPS.id === 'all' && (
                        <td className="px-2 py-2 text-center border-r border-slate-200">
                          <span className="px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">
                            {pelanggan.opsId === 'ops-tanah-rata' ? 'OPS-TR' : pelanggan.opsId === 'ops-mekar-asri' ? 'OPS-MA' : pelanggan.opsId}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2 font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
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
                    {Array.from({ length: 12 }, (_, mIdx) => {
                      const mNum = mIdx + 1;
                      const payment = pembayaranList.find(
                        b => b.pelangganId === pelanggan.id && b.tahun === selectedYear && b.bulan === mNum
                      );
                      const amount = payment?.jumlah || 0;
                      const cellStyle = getCellPaymentStyle(amount, pelanggan.tarifPerBulan);

                      return (
                        <td
                          key={mIdx}
                          onClick={() => onOpenAddIuranForCell(pelanggan, mNum)}
                          className="p-1 border-r border-slate-200 text-center cursor-pointer transition-all hover:ring-1 hover:ring-emerald-500"
                          title={`Klik untuk edit iuran ${pelanggan.nama} (${MONTH_NAMES_ID[mIdx]} ${selectedYear})`}
                        >
                          <div
                            className={`py-1.5 px-1 rounded-sm text-[11px] font-mono tabular-nums transition-colors ${cellStyle}`}
                          >
                            {amount > 0 ? formatRupiah(amount, false) : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
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
          setPelangganToDelete(null);
        }
      }}
      onCancel={() => setPelangganToDelete(null)}
    />
  </div>
  );
};
