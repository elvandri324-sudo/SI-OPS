import React, { useState, useEffect } from 'react';
import { TransaksiPengangkutan, OPSProfile } from '../types/ops';
import { formatNumberID, downloadCSV, MONTH_NAMES_ID } from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Truck,
  Plus,
  Search,
  Download,
  FileText,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Users,
  Filter,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';
import { Pagination } from './Pagination';

interface Props {
  activeOPS: OPSProfile;
  pengangkutanList: TransaksiPengangkutan[];
  selectedYear: number;
  onOpenAddPengangkutan: () => void;
  onOpenEditPengangkutan: (item: TransaksiPengangkutan) => void;
  onDeletePengangkutan: (id: string) => void;
  onDeletePengangkutanBatch?: (ids: string[]) => void;
  onOpenImportExcel?: () => void;
}

export const PengangkutanView: React.FC<Props> = ({
  activeOPS,
  pengangkutanList,
  selectedYear,
  onOpenAddPengangkutan,
  onOpenEditPengangkutan,
  onDeletePengangkutan,
  onDeletePengangkutanBatch,
  onOpenImportExcel,
}) => {
  const [filterYear, setFilterYear] = useState<string>(String(selectedYear));
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterOPS, setFilterOPS] = useState<string>('all');
  const [filterZona, setFilterZona] = useState<string>('all');
  const [formatViewMode, setFormatViewMode] = useState<'auto' | 'karung' | 'bak'>('auto');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<TransaksiPengangkutan | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);

  // Sync with top toolbar year selector
  useEffect(() => {
    setFilterYear(String(selectedYear));
  }, [selectedYear]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterYear, filterMonth, filterOPS, filterZona, formatViewMode, searchQuery]);

  // Deteksi khusus OPS Pulau Rhun
  const isRhun =
    (activeOPS.nama || '').toLowerCase().includes('rhun') ||
    (activeOPS.kode || '').toUpperCase().includes('PR') ||
    (activeOPS.wilayah || '').toLowerCase().includes('rhun') ||
    activeOPS.metodeUkurDefault === 'karung';

  // Hapus clean-up pantai dari Transaksi Sampah OPS (Clean-up Pantai sudah memiliki menu tersendiri)
  const opsListOnly = pengangkutanList.filter(
    item => (item.sumberSampah || 'Pemukiman') !== 'Clean-up Pantai'
  );

  // Daftar tahun unik (termasuk 2025 dan tahun yang ada di database)
  const availableYears = Array.from(
    new Set([
      String(selectedYear),
      '2026',
      '2025',
      ...opsListOnly.map(it => it.tanggal?.slice(0, 4)).filter(Boolean),
    ])
  ).sort((a, b) => b.localeCompare(a));

  // Filter (Tampilkan semua data walaupun diinput sebelum tahun 2026 jika filterYear === 'all')
  const filteredList = opsListOnly.filter(item => {
    const matchesYear = filterYear === 'all' || item.tanggal.startsWith(filterYear);
    const matchesMonth =
      filterMonth === 'all' ||
      (filterYear === 'all'
        ? item.tanggal.slice(5, 7) === filterMonth
        : item.tanggal.startsWith(`${filterYear}-${filterMonth}`));
    const matchesOPS = filterOPS === 'all' || item.opsId === filterOPS;
    const matchesZona = filterZona === 'all' || item.zona === filterZona;
    const matchesSearch =
      (item.hariTanggalLabel && item.hariTanggalLabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.armada && item.armada.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.catatan && item.catatan.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.zona && item.zona.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesYear && matchesMonth && matchesOPS && matchesZona && matchesSearch;
  });

  // Pagination slice
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  // Tentukan apakah format tabel yang ditampilkan adalah metode karung (Pulau Rhun)
  const isKarungTable =
    formatViewMode === 'karung' ||
    (formatViewMode === 'auto' && (isRhun || filteredList.some(it => it.metodeUkur === 'karung' || it.zona)));

  // Multiselect logic
  const allFilteredIds = filteredList.map(it => it.id);
  const isAllSelected =
    filteredList.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));

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

  // Metrics for Totals
  const totalKarungCampur = filteredList.reduce((s, it) => s + (it.karungCampur || 0), 0);
  const totalBeratCampur = filteredList.reduce((s, it) => s + (it.beratCampurKg || 0), 0);
  const totalKarungOrganik = filteredList.reduce((s, it) => s + (it.karungOrganik || 0), 0);
  const totalBeratOrganik = filteredList.reduce((s, it) => s + (it.beratOrganikKg || 0), 0);
  const totalKarungAnorganik = filteredList.reduce((s, it) => s + (it.karungAnorganik || 0), 0);
  const totalBeratAnorganik = filteredList.reduce((s, it) => s + (it.beratAnorganikKg || 0), 0);
  const totalKarungSemua = totalKarungCampur + totalKarungOrganik + totalKarungAnorganik;
  const totalBeratSemua = filteredList.reduce((s, it) => {
    if (it.metodeUkur === 'karung') {
      return s + (it.beratCampurKg || 0) + (it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0);
    }
    return s + (it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0);
  }, 0);
  const totalPelangganServed = filteredList.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0);
  const avgPelangganServed = filteredList.length > 0 ? Math.round(totalPelangganServed / filteredList.length) : 0;

  // Export CSV
  const handleExportCSV = () => {
    if (isKarungTable) {
      const headers = [
        'Tanggal Kegiatan',
        'Zona Wilayah',
        'Pelanggan Terlayani (KK)',
        'Karung Campur (bh)',
        'Berat Rata Campur (kg/krg)',
        'Total Berat Campur (kg)',
        'Karung Organik (bh)',
        'Berat Rata Organik (kg/krg)',
        'Total Berat Organik (kg)',
        'Karung Anorganik (bh)',
        'Berat Rata Anorganik (kg/krg)',
        'Total Berat Anorganik (kg)',
        'Total Karung (bh)',
        'Total Berat Sampah (kg)',
        'Armada / Kendaraan',
        'Catatan',
      ];
      const rows = filteredList.map(it => [
        it.hariTanggalLabel || it.tanggal,
        it.zona || 'Zona 1',
        it.pelangganTerlayani || 0,
        it.karungCampur || 0,
        it.beratRataKarungCampur || 20,
        Number((it.beratCampurKg || 0).toFixed(1)),
        it.karungOrganik || 0,
        it.beratRataKarungOrganik || 25,
        Number((it.beratOrganikKg || 0).toFixed(1)),
        it.karungAnorganik || 0,
        it.beratRataKarungAnorganik || 12,
        Number((it.beratAnorganikKg || 0).toFixed(1)),
        it.totalKarung || (it.karungCampur || 0) + (it.karungOrganik || 0) + (it.karungAnorganik || 0),
        Number(((it.beratCampurKg || 0) + (it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0)).toFixed(1)),
        it.armada || 'Viar Roda 3',
        it.catatan || '',
      ]);
      downloadCSV(`Log_Sampah_Pulau_Rhun_${selectedYear}.csv`, headers, rows);
    } else {
      const headers = [
        'Tanggal Kegiatan',
        'Pelanggan Terlayani (KK)',
        'Panjang Bak (cm)',
        'Lebar Bak (cm)',
        'Tinggi Organik (cm)',
        'Densitas Organik',
        'Volume Organik (m3)',
        'Berat Organik (kg)',
        'Tinggi Anorganik (cm)',
        'Densitas Anorganik',
        'Volume Anorganik (m3)',
        'Berat Anorganik (kg)',
        'Total Berat (kg)',
        'Armada / Kendaraan',
        'Catatan',
      ];
      const rows = filteredList.map(it => [
        it.hariTanggalLabel || it.tanggal,
        it.pelangganTerlayani || 0,
        it.panjangBakCm || 190,
        it.lebarBakCm || 120,
        it.ketinggianOrganikCm || 0,
        it.densitasOrganik || 320,
        it.volumeOrganikM3 || 0,
        it.beratOrganikKg || 0,
        it.ketinggianAnorganikCm || 0,
        it.densitasAnorganik || 127,
        it.volumeAnorganikM3 || 0,
        it.beratAnorganikKg || 0,
        Number(((it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0)).toFixed(1)),
        it.armada || 'Dump Truck 01',
        it.catatan || '',
      ]);
      downloadCSV(`Transaksi_Sampah_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    const periodLabel =
      filterYear === 'all'
        ? 'Semua Tahun'
        : filterMonth === 'all'
        ? `Tahun ${filterYear}`
        : `${MONTH_NAMES_ID[Number(filterMonth) - 1]} ${filterYear}`;

    if (isKarungTable) {
      const headers = [
        'No',
        'Tanggal',
        'Zona',
        'KK Terlayani',
        'Krg Campur',
        'Brt Campur (kg)',
        'Krg Organik',
        'Brt Organik (kg)',
        'Krg Anorganik',
        'Brt Anorganik (kg)',
        'Total Krg',
        'Total Berat (kg)',
        'Armada',
      ];
      const rows = filteredList.map((it, idx) => [
        idx + 1,
        it.hariTanggalLabel || it.tanggal,
        it.zona || 'Zona 1',
        it.pelangganTerlayani || 0,
        it.karungCampur || 0,
        formatNumberID(it.beratCampurKg || 0, 1),
        it.karungOrganik || 0,
        formatNumberID(it.beratOrganikKg || 0, 1),
        it.karungAnorganik || 0,
        formatNumberID(it.beratAnorganikKg || 0, 1),
        it.totalKarung || (it.karungCampur || 0) + (it.karungOrganik || 0) + (it.karungAnorganik || 0),
        formatNumberID((it.beratCampurKg || 0) + (it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0), 1),
        it.armada || 'Viar Roda 3',
      ]);
      const footRows = [
        [
          '',
          'TOTAL AKUMULASI',
          '-',
          `${avgPelangganServed} KK (Rata²)`,
          totalKarungCampur,
          formatNumberID(totalBeratCampur, 1),
          totalKarungOrganik,
          formatNumberID(totalBeratOrganik, 1),
          totalKarungAnorganik,
          formatNumberID(totalBeratAnorganik, 1),
          totalKarungSemua,
          `${formatNumberID(totalBeratSemua, 1)} kg`,
          `${filteredList.length} Rit`,
        ],
      ];

      downloadPDF({
        filename: `Data_Sampah_Karung_${activeOPS.kode}_${selectedYear}.pdf`,
        title: `LAPORAN TRANSAKSI PENGANGKUTAN SAMPAH (METODE KARUNG)`,
        subtitle: `Organisasi: ${activeOPS.nama} | Periode: ${periodLabel}`,
        opsName: activeOPS.nama,
        orientation: 'landscape',
        summaryItems: [
          { label: 'Total Frekuensi Angkut', value: `${filteredList.length} Ritase` },
          { label: 'Total Karung Terangkut', value: `${formatNumberID(totalKarungSemua, 0)} Karung` },
          { label: 'Total Berat Sampah', value: `${formatNumberID(totalBeratSemua, 1)} Kg (${formatNumberID(totalBeratSemua / 1000, 2)} Ton)` },
          { label: 'Rata-rata KK Terlayani', value: `${avgPelangganServed} KK / Rit` },
        ],
        headers,
        rows,
        footRows,
      });
    } else {
      const headers = [
        'No',
        'Tanggal Kegiatan',
        'KK Terlayani',
        'Dimensi Bak (P×L)',
        'Tinggi Org (cm)',
        'Vol Org (m³)',
        'Berat Org (kg)',
        'Tinggi Anorg (cm)',
        'Vol Anorg (m³)',
        'Berat Anorg (kg)',
        'Total Berat (kg)',
        'Armada',
      ];
      const rows = filteredList.map((it, idx) => [
        idx + 1,
        it.hariTanggalLabel || it.tanggal,
        it.pelangganTerlayani || 0,
        `${it.panjangBakCm || 190}×${it.lebarBakCm || 120} cm`,
        it.ketinggianOrganikCm || 0,
        formatNumberID(it.volumeOrganikM3 || 0, 2),
        formatNumberID(it.beratOrganikKg || 0, 1),
        it.ketinggianAnorganikCm || 0,
        formatNumberID(it.volumeAnorganikM3 || 0, 2),
        formatNumberID(it.beratAnorganikKg || 0, 1),
        formatNumberID((it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0), 1),
        it.armada || 'Dump Truck 01',
      ]);
      const totalVolOrg = filteredList.reduce((s, it) => s + (it.volumeOrganikM3 || 0), 0);
      const totalVolAnorg = filteredList.reduce((s, it) => s + (it.volumeAnorganikM3 || 0), 0);

      const footRows = [
        [
          '',
          'TOTAL AKUMULASI',
          `${avgPelangganServed} KK (Rata²)`,
          '-',
          '-',
          `${formatNumberID(totalVolOrg, 2)} m³`,
          `${formatNumberID(totalBeratOrganik, 1)} kg`,
          '-',
          `${formatNumberID(totalVolAnorg, 2)} m³`,
          `${formatNumberID(totalBeratAnorganik, 1)} kg`,
          `${formatNumberID(totalBeratSemua, 1)} kg`,
          `${filteredList.length} Rit`,
        ],
      ];

      downloadPDF({
        filename: `Data_Sampah_${activeOPS.kode}_${selectedYear}.pdf`,
        title: `LAPORAN TRANSAKSI PENGANGKUTAN SAMPAH OPS`,
        subtitle: `Organisasi: ${activeOPS.nama} | Periode: ${periodLabel}`,
        opsName: activeOPS.nama,
        orientation: 'landscape',
        summaryItems: [
          { label: 'Total Frekuensi Angkut', value: `${filteredList.length} Ritase` },
          { label: 'Total Sampah Organik', value: `${formatNumberID(totalBeratOrganik, 1)} Kg` },
          { label: 'Total Sampah Anorganik', value: `${formatNumberID(totalBeratAnorganik, 1)} Kg` },
          { label: 'Total Berat Sampah', value: `${formatNumberID(totalBeratSemua, 1)} Kg (${formatNumberID(totalBeratSemua / 1000, 2)} Ton)` },
        ],
        headers,
        rows,
        footRows,
      });
    }
  };

  const handleConfirmBatchDelete = () => {
    if (onDeletePengangkutanBatch && selectedIds.length > 0) {
      onDeletePengangkutanBatch(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Transaksi Pengangkutan Sampah OPS
              {isRhun && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  OPS Pulau Rhun (Metode Karung &amp; Zona 1-3)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {isRhun
                ? 'Pencatatan ritase sampah pemukiman berdasarkan hitungan karung (campur, organik, anorganik) & zona'
                : 'Pencatatan ritase sampah pemukiman operasional OPS terlayani'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            {MONTH_NAMES_ID.map((name, idx) => {
              const mStr = String(idx + 1).padStart(2, '0');
              return (
                <option key={mStr} value={mStr}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Filter Zona Khusus Pulau Rhun */}
          {isRhun && (
            <select
              value={filterZona}
              onChange={e => setFilterZona(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50 text-emerald-900"
            >
              <option value="all">Semua Zona (1-3)</option>
              <option value="Zona 1">Zona 1</option>
              <option value="Zona 2">Zona 2</option>
              <option value="Zona 3">Zona 3</option>
            </select>
          )}

          {/* Toggle format tabel jika dalam mode 'Semua OPS' */}
          {activeOPS.id === 'all' && (
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setFormatViewMode('karung')}
                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all ${
                  isKarungTable ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log Karung (Pulau Rhun)
              </button>
              <button
                type="button"
                onClick={() => setFormatViewMode('bak')}
                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all ${
                  !isKarungTable ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log Dimensi Bak
              </button>
            </div>
          )}

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari armada, tanggal, zona..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-44 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Import Excel */}
          {onOpenImportExcel && (
            <button
              type="button"
              onClick={onOpenImportExcel}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Export PDF</span>
          </button>

          {/* Add Rit Button */}
          <button
            type="button"
            onClick={onOpenAddPengangkutan}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Rit Sampah</span>
          </button>
        </div>
      </div>

      {/* Floating Multi-select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-emerald-950">
              {selectedIds.length} data ritase pengangkutan dipilih
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

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isKarungTable ? (
            /* ========================================================================= */
            /* TABEL METODE KARUNG SESUAI JENIS SAMPAH (KHUSUS OPS PULAU RHUN / KARUNG) */
            /* ========================================================================= */
            <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-emerald-900 text-white font-bold">
                  <th
                    rowSpan={2}
                    className="px-3 py-3 w-10 text-center bg-emerald-950 border-r border-emerald-800"
                  >
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-emerald-800 rounded-sm cursor-pointer transition-colors"
                      title={isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Square className="w-4 h-4 text-emerald-300/70" />
                      )}
                    </button>
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 bg-emerald-950 text-white font-bold text-center border-r border-emerald-800 min-w-[160px]"
                  >
                    Tanggal
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-emerald-950 text-white font-bold text-center border-r border-emerald-800 min-w-[90px]"
                  >
                    Zona
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-emerald-950 text-white font-bold text-center border-r border-emerald-800 min-w-[80px]"
                  >
                    KK Terlayani
                  </th>

                  {/* Header Sampah Campur */}
                  <th
                    colSpan={3}
                    className="px-3 py-2 bg-indigo-700 text-white font-extrabold text-center tracking-wide border-r border-indigo-600 uppercase"
                  >
                    Sampah Campur
                  </th>

                  {/* Header Sampah Organik */}
                  <th
                    colSpan={3}
                    className="px-3 py-2 bg-emerald-700 text-white font-extrabold text-center tracking-wide border-r border-emerald-600 uppercase"
                  >
                    Sampah Organik
                  </th>

                  {/* Header Sampah Anorganik */}
                  <th
                    colSpan={3}
                    className="px-3 py-2 bg-amber-600 text-white font-extrabold text-center tracking-wide border-r border-amber-500 uppercase"
                  >
                    Sampah Anorganik
                  </th>

                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-800 text-teal-100 font-extrabold text-center border-r border-teal-700 min-w-[90px]"
                  >
                    Total Karung
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 bg-emerald-950 text-emerald-200 font-extrabold text-center border-r border-emerald-800 min-w-[100px]"
                  >
                    Total Berat (kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-emerald-950 text-white font-bold text-center border-r border-emerald-800 min-w-[110px]"
                  >
                    Armada
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-emerald-950 text-white font-bold text-center border-r border-emerald-800 min-w-[130px]"
                  >
                    Catatan
                  </th>
                  <th
                    rowSpan={2}
                    className="px-2 py-3 bg-emerald-950 text-white font-bold text-center min-w-[75px]"
                  >
                    Aksi
                  </th>
                </tr>

                {/* Sub-header Karung & Berat */}
                <tr className="text-2xs font-mono font-semibold text-center border-b border-emerald-800">
                  {/* Campur Sub-headers */}
                  <th className="px-2 py-1.5 bg-indigo-50 text-indigo-900 border-r border-indigo-200">Karung</th>
                  <th className="px-2 py-1.5 bg-indigo-50 text-indigo-700 border-r border-indigo-200">Kg/Krg</th>
                  <th className="px-2 py-1.5 bg-indigo-100 text-indigo-950 font-bold border-r border-indigo-200">Berat (kg)</th>

                  {/* Organik Sub-headers */}
                  <th className="px-2 py-1.5 bg-emerald-50 text-emerald-900 border-r border-emerald-200">Karung</th>
                  <th className="px-2 py-1.5 bg-emerald-50 text-emerald-700 border-r border-emerald-200">Kg/Krg</th>
                  <th className="px-2 py-1.5 bg-emerald-100 text-emerald-950 font-bold border-r border-emerald-200">Berat (kg)</th>

                  {/* Anorganik Sub-headers */}
                  <th className="px-2 py-1.5 bg-amber-50 text-amber-900 border-r border-amber-200">Karung</th>
                  <th className="px-2 py-1.5 bg-amber-50 text-amber-700 border-r border-amber-200">Kg/Krg</th>
                  <th className="px-2 py-1.5 bg-amber-100 text-amber-950 font-bold border-r border-amber-200">Berat (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="px-4 py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-medium">Belum ada catatan ritase sampah untuk periode ini.</p>
                        <button
                          type="button"
                          onClick={onOpenAddPengangkutan}
                          className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                        >
                          + Catat Rit Sampah Sekarang
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const kCmp = item.karungCampur || 0;
                    const rCmp = item.beratRataKarungCampur || 20;
                    const bCmp = item.beratCampurKg !== undefined ? item.beratCampurKg : kCmp * rCmp;

                    const kOrg = item.karungOrganik || 0;
                    const rOrg = item.beratRataKarungOrganik || 25;
                    const bOrg = item.karungOrganik !== undefined ? (item.karungOrganik * rOrg) : (item.beratOrganikKg || 0);

                    const kAnorg = item.karungAnorganik || 0;
                    const rAnorg = item.beratRataKarungAnorganik || 12;
                    const bAnorg = item.karungAnorganik !== undefined ? (item.karungAnorganik * rAnorg) : (item.beratAnorganikKg || 0);

                    const totK = item.totalKarung || (kCmp + kOrg + kAnorg);
                    const totB = bCmp + bOrg + bAnorg;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center border-r border-slate-200">
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
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {item.hariTanggalLabel || item.tanggal}
                        </td>
                        <td className="px-3 py-2.5 text-center font-sans font-bold border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full text-2xs ${
                            item.zona === 'Zona 1'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : item.zona === 'Zona 2'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {item.zona || 'Zona 1'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                          {item.pelangganTerlayani || 0}
                        </td>

                        {/* Sampah Campur */}
                        <td className="px-2 py-2 text-center text-indigo-900 bg-indigo-50/30 border-r border-slate-200">
                          {kCmp}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 text-2xs bg-indigo-50/30 border-r border-slate-200">
                          {rCmp}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-indigo-900 bg-indigo-50/60 border-r border-slate-200">
                          {formatNumberID(bCmp, 1)}
                        </td>

                        {/* Sampah Organik */}
                        <td className="px-2 py-2 text-center text-emerald-900 bg-emerald-50/30 border-r border-slate-200">
                          {kOrg}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 text-2xs bg-emerald-50/30 border-r border-slate-200">
                          {rOrg}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-emerald-900 bg-emerald-50/60 border-r border-slate-200">
                          {formatNumberID(bOrg, 1)}
                        </td>

                        {/* Sampah Anorganik */}
                        <td className="px-2 py-2 text-center text-amber-900 bg-amber-50/30 border-r border-slate-200">
                          {kAnorg}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 text-2xs bg-amber-50/30 border-r border-slate-200">
                          {rAnorg}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-amber-900 bg-amber-50/60 border-r border-slate-200">
                          {formatNumberID(bAnorg, 1)}
                        </td>

                        {/* Totals */}
                        <td className="px-3 py-2 text-center font-extrabold text-teal-900 bg-teal-50 border-r border-slate-200">
                          {totK}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-emerald-950 bg-emerald-100/60 border-r border-slate-200">
                          {formatNumberID(totB, 1)}
                        </td>

                        <td className="px-3 py-2.5 font-sans text-slate-700 border-r border-slate-200">
                          {item.armada || 'Viar Roda 3'}
                        </td>
                        <td className="px-3 py-2.5 font-sans text-slate-600 border-r border-slate-200 text-2xs">
                          {item.catatan || '-'}
                        </td>
                        <td className="px-2 py-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditPengangkutan(item)}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm cursor-pointer"
                              title="Edit Ritase"
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
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredList.length > 0 && (
                <tfoot className="bg-emerald-950 text-white font-mono font-bold border-t-2 border-emerald-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-sans">
                      TOTAL ({filteredList.length} RITASE)
                    </td>
                    <td className="px-3 py-3 text-center font-sans text-emerald-200">
                      {formatNumberID(totalPelangganServed, 0)} KK
                    </td>
                    <td className="px-2 py-3 text-center bg-indigo-950 text-indigo-200">
                      {totalKarungCampur}
                    </td>
                    <td></td>
                    <td className="px-2 py-3 text-right bg-indigo-900 text-indigo-100">
                      {formatNumberID(totalBeratCampur, 1)} kg
                    </td>
                    <td className="px-2 py-3 text-center bg-emerald-900 text-emerald-200">
                      {totalKarungOrganik}
                    </td>
                    <td></td>
                    <td className="px-2 py-3 text-right bg-emerald-800 text-emerald-100">
                      {formatNumberID(totalBeratOrganik, 1)} kg
                    </td>
                    <td className="px-2 py-3 text-center bg-amber-950 text-amber-200">
                      {totalKarungAnorganik}
                    </td>
                    <td></td>
                    <td className="px-2 py-3 text-right bg-amber-900 text-amber-100">
                      {formatNumberID(totalBeratAnorganik, 1)} kg
                    </td>
                    <td className="px-3 py-3 text-center bg-teal-900 text-teal-100 font-extrabold text-sm">
                      {totalKarungSemua} Krg
                    </td>
                    <td className="px-3 py-3 text-right bg-emerald-900 text-emerald-100 text-sm font-black">
                      {formatNumberID(totalBeratSemua, 1)} kg
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            /* ========================================================================= */
            /* TABEL METODE DIMENSI BAK KENDARAAN (OPS NEGERI MAHU / OPS NEGERI OUW)     */
            /* ========================================================================= */
            <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-teal-800 text-white font-bold">
                  <th
                    rowSpan={2}
                    className="px-3 py-3 w-10 text-center bg-teal-900 border-r border-teal-700"
                  >
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-teal-700 rounded-sm cursor-pointer transition-colors"
                      title={isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-300" />
                      ) : (
                        <Square className="w-4 h-4 text-teal-300/70" />
                      )}
                    </button>
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 bg-teal-900 text-white font-bold text-center border-r border-teal-700 min-w-[160px]"
                  >
                    Tanggal
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-900 text-white font-bold text-center border-r border-teal-700 min-w-[90px]"
                  >
                    KK Terlayani
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-900 text-white font-bold text-center border-r border-teal-700"
                  >
                    P (cm)
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-900 text-white font-bold text-center border-r border-teal-700"
                  >
                    L (cm)
                  </th>

                  {/* Header Organik */}
                  <th
                    colSpan={4}
                    className="px-4 py-2 bg-emerald-600 text-white font-extrabold text-center tracking-wide border-r border-emerald-500 uppercase"
                  >
                    Sampah Organik
                  </th>

                  {/* Header Anorganik */}
                  <th
                    colSpan={4}
                    className="px-4 py-2 bg-yellow-400 text-slate-900 font-extrabold text-center tracking-wide border-r border-yellow-300 uppercase"
                  >
                    Sampah Anorganik
                  </th>

                  <th
                    rowSpan={2}
                    className="px-4 py-3 bg-teal-900 text-teal-100 font-extrabold text-center border-r border-teal-700 min-w-[100px]"
                  >
                    Total Berat (kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-900 text-white font-bold text-center border-r border-teal-700 min-w-[110px]"
                  >
                    Armada
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-900 text-white font-bold text-center border-r border-teal-700 min-w-[130px]"
                  >
                    Catatan
                  </th>
                  <th
                    rowSpan={2}
                    className="px-2 py-3 bg-teal-900 text-white font-bold text-center min-w-[75px]"
                  >
                    Aksi
                  </th>
                </tr>

                <tr className="text-2xs font-mono font-semibold text-center border-b border-teal-700">
                  <th className="px-2 py-1.5 bg-emerald-50 text-emerald-900 border-r border-emerald-200">Tinggi (cm)</th>
                  <th className="px-2 py-1.5 bg-emerald-50 text-emerald-700 border-r border-emerald-200">Densitas</th>
                  <th className="px-2 py-1.5 bg-emerald-100 text-emerald-950 border-r border-emerald-200">Vol (m3)</th>
                  <th className="px-2 py-1.5 bg-emerald-100 text-emerald-950 font-bold border-r border-emerald-200">Berat (kg)</th>

                  <th className="px-2 py-1.5 bg-yellow-50 text-amber-900 border-r border-yellow-200">
                    Tinggi (cm) / Karung
                  </th>
                  <th className="px-2 py-1.5 bg-yellow-50 text-amber-700 border-r border-yellow-200">
                    Densitas / Kg/Krg
                  </th>
                  <th className="px-2 py-1.5 bg-yellow-100 text-amber-950 border-r border-yellow-200">Vol (m3)</th>
                  <th className="px-2 py-1.5 bg-yellow-100 text-amber-950 font-bold border-r border-yellow-200">Berat (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-4 py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-medium">Belum ada catatan ritase sampah untuk periode ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const totalBerat = (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0);
                    const isAnorgKarung =
                      item.metodeAnorganik === 'karung' ||
                      ((item.karungAnorganik || 0) > 0 && !(item.ketinggianAnorganikCm || 0));

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRow(item.id)}
                            className="p-1 hover:bg-slate-200 rounded-sm cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {item.hariTanggalLabel || item.tanggal}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                          {item.pelangganTerlayani || 0}
                        </td>
                        <td className="px-3 py-2.5 text-center border-r border-slate-200 text-slate-600">
                          {item.panjangBakCm || 190}
                        </td>
                        <td className="px-3 py-2.5 text-center border-r border-slate-200 text-slate-600">
                          {item.lebarBakCm || 120}
                        </td>

                        {/* Organik */}
                        <td className="px-2 py-2 text-center text-emerald-900 bg-emerald-50/30 border-r border-slate-200">
                          {item.ketinggianOrganikCm || 0}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 text-2xs bg-emerald-50/30 border-r border-slate-200">
                          {item.densitasOrganik || 320}
                        </td>
                        <td className="px-2 py-2 text-right text-emerald-950 bg-emerald-50/50 border-r border-slate-200">
                          {formatNumberID(item.volumeOrganikM3 || 0, 2)}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-emerald-900 bg-emerald-100/60 border-r border-slate-200">
                          {formatNumberID(item.beratOrganikKg || 0, 1)}
                        </td>

                        {/* Anorganik (Mendukung Dimensi Bak cm maupun Jumlah Karung untuk OPS Ouw) */}
                        <td className="px-2 py-2 text-center text-amber-900 bg-yellow-50/30 border-r border-slate-200">
                          {isAnorgKarung ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold text-[10px]">
                              {item.karungAnorganik || 0} Krg
                            </span>
                          ) : (
                            <span>{item.ketinggianAnorganikCm || 0} cm</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 text-2xs bg-yellow-50/30 border-r border-slate-200">
                          {isAnorgKarung
                            ? `${item.beratRataKarungAnorganik || 12} kg/krg`
                            : `${item.densitasAnorganik || 127}`}
                        </td>
                        <td className="px-2 py-2 text-right text-amber-950 bg-yellow-50/50 border-r border-slate-200">
                          {formatNumberID(item.volumeAnorganikM3 || 0, 2)}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-amber-900 bg-yellow-100/60 border-r border-slate-200">
                          {formatNumberID(item.beratAnorganikKg || 0, 1)}
                        </td>

                        {/* Total Berat */}
                        <td className="px-4 py-2 text-right font-black text-teal-950 bg-teal-100/60 border-r border-slate-200">
                          {formatNumberID(totalBerat, 1)}
                        </td>
                        <td className="px-3 py-2.5 font-sans text-slate-700 border-r border-slate-200">
                          {item.armada || 'Dump Truck 01'}
                        </td>
                        <td className="px-3 py-2.5 font-sans text-slate-600 border-r border-slate-200 text-2xs">
                          {item.catatan || '-'}
                        </td>
                        <td className="px-2 py-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditPengangkutan(item)}
                              className="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-sm cursor-pointer"
                              title="Edit Ritase"
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination for Pengangkutan */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 25, 50, 100]}
          itemLabel="ritase"
        />
      </div>

      {/* Confirmation: Single Delete */}
      <ModalConfirm
        isOpen={Boolean(itemToDelete)}
        title="Hapus Catatan Ritase Sampah"
        message={
          itemToDelete ? (
            <div>
              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menghapus catatan ritase tanggal{' '}
                <strong className="text-slate-900">{itemToDelete.hariTanggalLabel || itemToDelete.tanggal}</strong>{' '}
                armada <strong className="text-slate-900">{itemToDelete.armada || 'Ritase'}</strong>?
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus"
        onConfirm={() => {
          if (itemToDelete) {
            onDeletePengangkutan(itemToDelete.id);
            setSelectedIds(prev => prev.filter(id => id !== itemToDelete.id));
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Confirmation: Batch Delete */}
      <ModalConfirm
        isOpen={isBatchDeleteConfirmOpen}
        title="Hapus Banyak Catatan Ritase Sekaligus"
        message={
          <div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus <strong className="text-rose-600 font-bold">{selectedIds.length}</strong> catatan ritase sampah yang dipilih?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Data yang terhapus tidak dapat dikembalikan dan akan disinkronkan ke Cloud Firestore.
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
