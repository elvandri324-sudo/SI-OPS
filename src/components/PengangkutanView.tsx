import React, { useState } from 'react';
import { TransaksiPengangkutan, OPSProfile, SumberSampah } from '../types/ops';
import { formatNumberID, downloadCSV, MONTH_NAMES_ID } from '../utils/format';
import {
  Truck,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Waves,
  Recycle,
  Trash,
  Users,
  MapPin,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';

interface Props {
  activeOPS: OPSProfile;
  pengangkutanList: TransaksiPengangkutan[];
  selectedYear: number;
  onOpenAddPengangkutan: (sumber?: SumberSampah) => void;
  onOpenEditPengangkutan: (item: TransaksiPengangkutan) => void;
  onDeletePengangkutan: (id: string) => void;
  onOpenImportExcel?: () => void;
}

export const PengangkutanView: React.FC<Props> = ({
  activeOPS,
  pengangkutanList,
  selectedYear,
  onOpenAddPengangkutan,
  onOpenEditPengangkutan,
  onDeletePengangkutan,
  onOpenImportExcel,
}) => {
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterOPS, setFilterOPS] = useState<string>('all');
  const [filterSumber, setFilterSumber] = useState<'all' | 'Pemukiman' | 'Clean-up Pantai'>('all');
  const [filterZona, setFilterZona] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'semua' | 'pemukiman' | 'cleanup'>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<TransaksiPengangkutan | null>(null);

  // Deteksi jika melihat OPS Pulau Rhun atau ada transaksi dengan data Zona
  const isRhunActive =
    activeOPS.id === 'all' ||
    (activeOPS.nama || '').toLowerCase().includes('rhun') ||
    (activeOPS.kode || '').toUpperCase().includes('PR') ||
    (activeOPS.wilayah || '').toLowerCase().includes('rhun') ||
    pengangkutanList.some(p => p.zona);

  // Filter
  const filteredList = pengangkutanList.filter(item => {
    const matchesYear = item.tanggal.startsWith(String(selectedYear));
    const matchesMonth =
      filterMonth === 'all' || item.tanggal.startsWith(`${selectedYear}-${filterMonth}`);
    const matchesOPS = filterOPS === 'all' || item.opsId === filterOPS;
    const matchesZona = filterZona === 'all' || item.zona === filterZona;
    const itemSumber = item.sumberSampah || 'Pemukiman';
    const matchesSumber =
      filterSumber === 'all'
        ? activeSubTab === 'semua'
          ? true
          : activeSubTab === 'pemukiman'
          ? itemSumber === 'Pemukiman'
          : itemSumber === 'Clean-up Pantai'
        : itemSumber === filterSumber;
    const matchesSearch =
      item.hariTanggalLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.armada && item.armada.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.catatan && item.catatan.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.zona && item.zona.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.lokasiPantai && item.lokasiPantai.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesYear && matchesMonth && matchesOPS && matchesZona && matchesSumber && matchesSearch;
  });

  // Segregated list for calculations
  const allYearItems = pengangkutanList.filter(item => {
    const matchesYear = item.tanggal.startsWith(String(selectedYear));
    const matchesOPS = filterOPS === 'all' || item.opsId === filterOPS;
    const matchesZona = filterZona === 'all' || item.zona === filterZona;
    return matchesYear && matchesOPS && matchesZona;
  });

  const pemukimanItems = filteredList.filter(i => (i.sumberSampah || 'Pemukiman') === 'Pemukiman');
  const cleanupItems = filteredList.filter(i => i.sumberSampah === 'Clean-up Pantai');

  // Pemukiman Totals
  const totalVolOrg = pemukimanItems.reduce((s, it) => s + (it.volumeOrganikM3 || 0), 0);
  const totalBeratOrg = pemukimanItems.reduce((s, it) => s + (it.beratOrganikKg || 0), 0);
  const totalVolAnorg = pemukimanItems.reduce((s, it) => s + (it.volumeAnorganikM3 || 0), 0);
  const totalBeratAnorg = pemukimanItems.reduce((s, it) => s + (it.beratAnorganikKg || 0), 0);
  const totalBeratPemukiman = totalBeratOrg + totalBeratAnorg;
  const totalPelangganServed = pemukimanItems.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0);
  const avgPelangganServed = pemukimanItems.length > 0 ? Math.round(totalPelangganServed / pemukimanItems.length) : 0;
  const totalKarungTerhitung = pemukimanItems.reduce((s, it) => s + (it.totalKarung || 0), 0);

  // Clean-up Pantai Totals
  const totalCleanDaur = cleanupItems.reduce((s, it) => s + (it.beratDaurUlangKg || 0), 0);
  const totalCleanPlastik = cleanupItems.reduce((s, it) => s + (it.beratPlastikKg || 0), 0);
  const totalCleanResidu = cleanupItems.reduce((s, it) => s + (it.beratResiduKg || 0), 0);
  const totalBeratCleanUp = totalCleanDaur + totalCleanPlastik + totalCleanResidu;
  const totalRelawan = cleanupItems.reduce((s, it) => s + (it.jumlahRelawan || 0), 0);

  // Grand Total for all filtered records
  const grandTotalBeratKg = totalBeratPemukiman + totalBeratCleanUp;

  const handleExportCSV = () => {
    const headers = [
      'Tanggal Kegiatan',
      'Sumber Sampah',
      'Metode Ukur',
      'Zona Wilayah',
      'Lokasi Pantai / Wilayah',
      'Armada / Tim',
      'Pelanggan Terlayani (KK) / Relawan',
      'Karung Campur (bh)',
      'Berat Rata Campur (kg/krg)',
      'Berat Campur (kg)',
      'Karung Organik (bh)',
      'Berat Rata Organik (kg/krg)',
      'Berat Organik (kg)',
      'Karung Anorganik (bh)',
      'Berat Rata Anorganik (kg/krg)',
      'Berat Anorganik (kg)',
      'Total Karung (bh)',
      'Daur Ulang (Kg)',
      'Plastik (Kg)',
      'Residu (Kg)',
      'Panjang Bak (cm)',
      'Lebar Bak (cm)',
      'Tinggi Organik (cm)',
      'Volume Organik (m3)',
      'Tinggi Anorganik (cm)',
      'Volume Anorganik (m3)',
      'Total Berat (kg)',
      'Catatan',
    ];

    const rows = filteredList.map(item => {
      const isClean = item.sumberSampah === 'Clean-up Pantai';
      const isKarung = item.metodeUkur === 'karung';
      const daur = item.beratDaurUlangKg || 0;
      const plastik = item.beratPlastikKg || 0;
      const residu = item.beratResiduKg || 0;
      const tot = isClean
        ? daur + plastik + residu
        : (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0);

      return [
        item.hariTanggalLabel || item.tanggal,
        item.sumberSampah || 'Pemukiman',
        isClean ? 'Timbangan Kg' : isKarung ? 'Alat Ukur Karung' : 'Dimensi Bak Truk',
        item.zona || '-',
        item.lokasiPantai || '-',
        item.armada || '-',
        item.sumberSampah === 'Clean-up Pantai' ? item.jumlahRelawan || 0 : item.pelangganTerlayani,
        isKarung ? item.karungCampur || 0 : 0,
        isKarung ? item.beratRataKarungCampur || 20 : 0,
        isKarung ? Number((item.beratCampurKg || 0).toFixed(1)) : 0,
        isKarung ? item.karungOrganik || 0 : 0,
        isKarung ? item.beratRataKarungOrganik || 25 : 0,
        Number((item.beratOrganikKg || 0).toFixed(1)),
        isKarung ? item.karungAnorganik || 0 : 0,
        isKarung ? item.beratRataKarungAnorganik || 12 : 0,
        Number((item.beratAnorganikKg || 0).toFixed(1)),
        isKarung ? item.totalKarung || 0 : 0,
        isClean ? daur : 0,
        isClean ? plastik : 0,
        isClean ? residu : 0,
        !isClean && !isKarung ? item.panjangBakCm || 0 : 0,
        !isClean && !isKarung ? item.lebarBakCm || 0 : 0,
        !isClean && !isKarung ? item.ketinggianOrganikCm || 0 : 0,
        item.volumeOrganikM3 || 0,
        !isClean && !isKarung ? item.ketinggianAnorganikCm || 0 : 0,
        item.volumeAnorganikM3 || 0,
        Number(tot.toFixed(1)),
        item.catatan || '',
      ];
    });

    downloadCSV(`Transaksi_Sampah_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Transaksi Pengangkutan Sampah &amp; Clean-up Pantai
            </h2>
            <p className="text-xs text-slate-500">
              Pencatatan ritase sampah pemukiman warga dan aksi bersih pantai / pesisir laut
            </p>
          </div>
        </div>

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

          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="all">Semua Bulan ({selectedYear})</option>
            {MONTH_NAMES_ID.map((name, idx) => {
              const mStr = String(idx + 1).padStart(2, '0');
              return (
                <option key={mStr} value={mStr}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Sumber Sampah filter */}
          <select
            value={filterSumber}
            onChange={e => setFilterSumber(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-slate-800"
          >
            <option value="all">Semua Sumber Sampah</option>
            <option value="Pemukiman">🚚 Warga / Pemukiman</option>
            <option value="Clean-up Pantai">🌊 Aksi Clean-up Pantai</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari pantai, hari, armada..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 w-44"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {onOpenImportExcel && (
            <button
              type="button"
              onClick={onOpenImportExcel}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Import data ritase pengangkutan sampah dan clean-up dari file Excel (.xlsx, .xls) atau CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}

          {/* Action button: Clean-up Pantai */}
          <button
            type="button"
            onClick={() => onOpenAddPengangkutan('Clean-up Pantai')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Catat hasil aksi bersih pantai (sampah daur ulang, plastik, dan residu)"
          >
            <Waves className="w-3.5 h-3.5 text-cyan-200" />
            <span>+ Clean-up Pantai</span>
          </button>

          {/* Action button: Ritase Pemukiman */}
          <button
            type="button"
            onClick={() => onOpenAddPengangkutan('Pemukiman')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Catat ritase pengangkutan sampah reguler warga"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Ritase</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Semua Transaksi | Pemukiman Warga | Aksi Clean-up Pantai */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('semua')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'semua'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Transaksi ({filteredList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('pemukiman')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'pemukiman'
              ? 'bg-teal-700 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Ritase Pemukiman ({pemukimanItems.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('cleanup')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'cleanup'
              ? 'bg-cyan-700 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Aksi Clean-up di Pantai ({cleanupItems.length})</span>
        </button>
      </div>

      {/* Filter / Pilah Zona (Khusus OPS Pulau Rhun atau Transaksi Ber-Zona) */}
      {isRhunActive && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 mr-1">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Pilah Zona (OPS Pulau Rhun):</span>
          </div>
          {(['all', 'Zona 1', 'Zona 2', 'Zona 3'] as const).map(z => {
            const label = z === 'all' ? 'Semua Zona' : z;
            const count = z === 'all'
              ? pengangkutanList.filter(item => item.tanggal.startsWith(String(selectedYear)) && (filterOPS === 'all' || item.opsId === filterOPS)).length
              : pengangkutanList.filter(item => item.tanggal.startsWith(String(selectedYear)) && (filterOPS === 'all' || item.opsId === filterOPS) && item.zona === z).length;

            return (
              <button
                key={z}
                type="button"
                onClick={() => setFilterZona(z)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterZona === z
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-emerald-950 border-emerald-200 hover:bg-emerald-100/70'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
                    filterZona === z ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Card 1: Total Keseluruhan Sampah */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Sampah Terkelola</span>
            <span className="p-1 rounded bg-slate-100 text-slate-700">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {formatNumberID(grandTotalBeratKg, 1)} <span className="text-xs font-normal text-slate-500">Kg</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {formatNumberID(grandTotalBeratKg / 1000, 2)} Ton dari {filteredList.length} aktivitas
          </div>
        </div>

        {/* Card 2: Pemukiman Warga */}
        <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl shadow-2xs">
          <div className="text-2xs font-bold text-teal-800 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Ritase Pemukiman</span>
            <span className="p-1 rounded bg-teal-200/60 text-teal-900">
              <Truck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-teal-950 font-mono">
            {formatNumberID(totalBeratPemukiman, 1)} <span className="text-xs font-normal text-teal-700">Kg</span>
          </div>
          <div className="text-xs text-teal-700 mt-1">
            {pemukimanItems.length} ritase ({formatNumberID(totalBeratPemukiman / 1000, 2)} Ton)
            {totalKarungTerhitung > 0 && ` • 🎒 ${totalKarungTerhitung} karung`}
          </div>
        </div>

        {/* Card 3: Clean-up di Pantai */}
        <div className="p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-xl shadow-2xs">
          <div className="text-2xs font-bold text-cyan-800 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Aksi Clean-up Pantai</span>
            <span className="p-1 rounded bg-cyan-200/60 text-cyan-900">
              <Waves className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-cyan-950 font-mono">
            {formatNumberID(totalBeratCleanUp, 1)} <span className="text-xs font-normal text-cyan-700">Kg</span>
          </div>
          <div className="text-xs text-cyan-700 mt-1">
            {cleanupItems.length} aksi bersih • {totalRelawan} relawan
          </div>
        </div>

        {/* Card 4: Breakdown Clean-up Sampah: Daur Ulang, Plastik, Residu */}
        <div className="p-3.5 bg-slate-900 text-white border border-slate-800 rounded-xl shadow-2xs">
          <div className="text-2xs font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Kategori Clean-up Pantai</span>
            <span className="text-cyan-400 font-mono text-[10px]">3 Kategori</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
            <div className="p-1 bg-emerald-950/80 rounded border border-emerald-700/50">
              <div className="text-[10px] text-emerald-300 font-sans">Daur Ulang</div>
              <div className="text-xs font-bold text-emerald-200">{formatNumberID(totalCleanDaur, 0)} kg</div>
            </div>
            <div className="p-1 bg-sky-950/80 rounded border border-sky-700/50">
              <div className="text-[10px] text-sky-300 font-sans">Plastik</div>
              <div className="text-xs font-bold text-sky-200">{formatNumberID(totalCleanPlastik, 0)} kg</div>
            </div>
            <div className="p-1 bg-rose-950/80 rounded border border-rose-700/50">
              <div className="text-[10px] text-rose-300 font-sans">Residu</div>
              <div className="text-xs font-bold text-rose-200">{formatNumberID(totalCleanResidu, 0)} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: Display clean-up or combined */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeSubTab === 'cleanup' ? (
            /* ========================================================== */
            /* TABEL KHUSUS AKSI CLEAN-UP DI PANTAI                      */
            /* ========================================================== */
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-cyan-800 text-white font-bold">
                  <th className="px-4 py-3 border-r border-cyan-700 min-w-[150px]">Tanggal Aksi</th>
                  {activeOPS.id === 'all' && (
                    <th className="px-3 py-3 border-r border-cyan-700 text-center">OPS</th>
                  )}
                  <th className="px-3 py-3 border-r border-cyan-700 min-w-[140px]">Lokasi Pantai / Pesisir</th>
                  <th className="px-3 py-3 border-r border-cyan-700 text-center">Relawan (Orang)</th>
                  <th className="px-3 py-3 border-r border-cyan-700 text-right bg-emerald-700 text-white min-w-[110px]">
                    ♻️ Daur Ulang (Kg)
                  </th>
                  <th className="px-3 py-3 border-r border-cyan-700 text-right bg-sky-700 text-white min-w-[110px]">
                    🧴 Plastik (Kg)
                  </th>
                  <th className="px-3 py-3 border-r border-cyan-700 text-right bg-rose-700 text-white min-w-[110px]">
                    🗑️ Residu (Kg)
                  </th>
                  <th className="px-3 py-3 border-r border-cyan-700 text-right bg-cyan-900 text-white min-w-[110px]">
                    Total Berat (Kg)
                  </th>
                  <th className="px-3 py-3 border-r border-cyan-700">Tim / Armada</th>
                  <th className="px-3 py-3 border-r border-cyan-700 min-w-[160px]">Catatan / Dokumentasi</th>
                  <th className="px-3 py-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {cleanupItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-400 font-sans">
                      Belum ada catatan aksi clean-up di pantai untuk periode ini. Klik <strong>"+ Clean-up Pantai"</strong> untuk mencatat hasil timbangan.
                    </td>
                  </tr>
                ) : (
                  cleanupItems.map(item => {
                    const daur = item.beratDaurUlangKg || 0;
                    const plastik = item.beratPlastikKg || 0;
                    const residu = item.beratResiduKg || 0;
                    const total = daur + plastik + residu;

                    return (
                      <tr key={item.id} className="hover:bg-cyan-50/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {item.hariTanggalLabel || item.tanggal}
                        </td>
                        {activeOPS.id === 'all' && (
                          <td className="px-2 py-2 text-center border-r border-slate-200 font-sans">
                            <span className="px-1.5 py-0.5 rounded-xs bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                              {item.opsId === 'ops-tanah-rata' ? 'OPS-TR' : item.opsId === 'ops-mekar-asri' ? 'OPS-MA' : item.opsId}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-2.5 font-sans font-semibold text-cyan-950 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            <span>{item.lokasiPantai || 'Pantai Pesisir'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                          {item.jumlahRelawan || item.pelangganTerlayani || 0}
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
                          {item.armada || 'Tim Clean-up'}
                        </td>
                        <td className="px-3 py-2.5 font-sans text-slate-600 border-r border-slate-200 text-2xs">
                          {item.catatan || '-'}
                        </td>
                        <td className="px-2 py-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenEditPengangkutan(item)}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-cyan-900 text-white font-mono font-bold border-t-2 border-cyan-800">
                <tr>
                  <td colSpan={activeOPS.id === 'all' ? 3 : 2} className="px-4 py-2.5 font-sans">
                    TOTAL AKSI CLEAN-UP ({cleanupItems.length} KEGIATAN)
                  </td>
                  <td className="px-3 py-2.5 text-center font-sans">
                    {totalRelawan} Relawan
                  </td>
                  <td className="px-3 py-2.5 text-right bg-emerald-800 text-emerald-100">
                    {formatNumberID(totalCleanDaur, 1)} kg
                  </td>
                  <td className="px-3 py-2.5 text-right bg-sky-800 text-sky-100">
                    {formatNumberID(totalCleanPlastik, 1)} kg
                  </td>
                  <td className="px-3 py-2.5 text-right bg-rose-800 text-rose-100">
                    {formatNumberID(totalCleanResidu, 1)} kg
                  </td>
                  <td className="px-3 py-2.5 text-right bg-cyan-950 text-cyan-200">
                    {formatNumberID(totalBeratCleanUp, 1)} kg
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* ========================================================== */
            /* TABEL KONSOLIDASI ATAU KHUSUS PEMUKIMAN WARGA             */
            /* ========================================================== */
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-teal-700 text-white font-bold">
                  <th
                    rowSpan={2}
                    className="px-4 py-3 bg-teal-800 text-white font-bold text-center border-r border-teal-700 min-w-[160px]"
                  >
                    Tanggal
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-800 text-white font-bold text-center border-r border-teal-700 min-w-[130px]"
                  >
                    Sumber Sampah
                  </th>
                  {activeOPS.id === 'all' && (
                    <th
                      rowSpan={2}
                      className="px-3 py-3 bg-teal-800 text-white font-bold text-center border-r border-teal-700 min-w-[85px]"
                    >
                      Asal OPS
                    </th>
                  )}
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-800 text-white font-bold text-center border-r border-teal-700 min-w-[90px]"
                  >
                    KK / Relawan
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-800 text-white font-bold text-center border-r border-teal-700"
                  >
                    P (cm)
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-800 text-white font-bold text-center border-r border-teal-700"
                  >
                    L (cm)
                  </th>

                  {/* Organik Multi-column Header */}
                  <th
                    colSpan={4}
                    className="px-4 py-2 bg-emerald-600 text-white font-extrabold text-center tracking-wide border-r border-emerald-500 uppercase"
                  >
                    Sampah Organik / Residu Clean-up
                  </th>

                  {/* Anorganik Multi-column Header */}
                  <th
                    colSpan={4}
                    className="px-4 py-2 bg-yellow-400 text-slate-900 font-extrabold text-center tracking-wide border-r border-yellow-300 uppercase"
                  >
                    Sampah Anorganik / Daur Ulang &amp; Plastik Clean-up
                  </th>

                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-900 text-white font-bold text-center min-w-[90px] border-r border-teal-700"
                  >
                    Total Berat
                  </th>

                  <th
                    rowSpan={2}
                    className="px-3 py-3 bg-teal-800 text-white font-bold text-center w-16"
                  >
                    Aksi
                  </th>
                </tr>

                {/* Sub-Header Row */}
                <tr>
                  {/* Organik Subheaders */}
                  <th className="px-3 py-2 bg-emerald-600 text-white font-bold text-center border-r border-emerald-500 min-w-[80px]">
                    Tinggi (Cm)
                  </th>
                  <th className="px-3 py-2 bg-emerald-600 text-white font-bold text-center border-r border-emerald-500">
                    Densitas
                  </th>
                  <th className="px-3 py-2 bg-emerald-600 text-white font-bold text-center border-r border-emerald-500">
                    Vol (m3)
                  </th>
                  <th className="px-3 py-2 bg-emerald-600 text-white font-bold text-center border-r border-emerald-500">
                    Berat (kg)
                  </th>

                  {/* Anorganik Subheaders */}
                  <th className="px-3 py-2 bg-yellow-400 text-slate-900 font-bold text-center border-r border-yellow-300 min-w-[80px]">
                    Tinggi (Cm)
                  </th>
                  <th className="px-3 py-2 bg-yellow-400 text-slate-900 font-bold text-center border-r border-yellow-300">
                    Densitas
                  </th>
                  <th className="px-3 py-2 bg-yellow-400 text-slate-900 font-bold text-center border-r border-yellow-300">
                    Vol (m3)
                  </th>
                  <th className="px-3 py-2 bg-yellow-400 text-slate-900 font-bold text-center border-r border-yellow-300">
                    Berat (kg)
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={activeOPS.id === 'all' ? 16 : 15} className="px-4 py-8 text-center text-slate-400 font-sans">
                      Tidak ada catatan transaksi pengangkutan untuk periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                    filteredList.map(item => {
                    const isClean = item.sumberSampah === 'Clean-up Pantai';
                    const isKarung = item.metodeUkur === 'karung';
                    const totalBaris = isClean
                      ? (item.beratDaurUlangKg || 0) + (item.beratPlastikKg || 0) + (item.beratResiduKg || 0)
                      : (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isClean ? 'bg-cyan-50/20' : isKarung ? 'bg-purple-50/15' : ''
                        }`}
                      >
                        <td className="px-4 py-2 font-sans font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span>{item.hariTanggalLabel || item.tanggal}</span>
                            {item.zona && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 w-fit">
                                <MapPin className="w-3 h-3 text-emerald-700" />
                                {item.zona}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 font-sans">
                          {isClean ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px] w-fit">
                                <Waves className="w-3 h-3 text-cyan-600" />
                                Clean-up Pantai
                              </span>
                              <span className="text-[10px] text-cyan-900 font-medium">
                                {item.lokasiPantai}
                              </span>
                            </div>
                          ) : isKarung ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] w-fit">
                                🎒 {item.totalKarung || (item.karungCampur || 0) + (item.karungOrganik || 0) + (item.karungAnorganik || 0)} Karung
                              </span>
                              <span className="text-[10px] text-purple-950 font-bold">
                                Alat Ukur Karung
                              </span>
                              <span className="text-[9px] text-purple-700">
                                C:{item.karungCampur || 0} • O:{item.karungOrganik || 0} • A:{item.karungAnorganik || 0}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] w-fit">
                              <Truck className="w-3 h-3 text-emerald-600" />
                              Pemukiman (Bak)
                            </span>
                          )}
                        </td>
                        {activeOPS.id === 'all' && (
                          <td className="px-2 py-2 text-center border-r border-slate-200 font-sans">
                            <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-800 font-bold text-[10px]">
                              {item.opsId === 'ops-tanah-rata' ? 'OPS-TR' : item.opsId === 'ops-mekar-asri' ? 'OPS-MA' : item.opsId}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-2 text-center text-slate-800 border-r border-slate-200 tabular-nums">
                          {isClean ? `${item.jumlahRelawan || item.pelangganTerlayani} relawan` : item.pelangganTerlayani}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-200 tabular-nums">
                          {isClean ? '-' : isKarung ? 'Karung' : item.panjangBakCm}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-200 tabular-nums">
                          {isClean || isKarung ? '-' : item.lebarBakCm}
                        </td>

                        {/* Organik / Residu */}
                        <td className="px-3 py-2 text-right text-emerald-950 font-bold border-r border-slate-200 tabular-nums bg-emerald-50/30">
                          {isClean
                            ? '-'
                            : isKarung
                            ? `${item.karungOrganik || 0} krg`
                            : item.ketinggianOrganikCm > 0
                            ? formatNumberID(item.ketinggianOrganikCm, 1)
                            : ''}
                        </td>
                        <td className="px-3 py-2 text-center text-emerald-800 border-r border-slate-200 tabular-nums bg-emerald-50/30">
                          {isKarung ? `@${item.beratRataKarungOrganik || 25}kg` : item.densitasOrganik}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-900 border-r border-slate-200 tabular-nums bg-emerald-50/30">
                          {formatNumberID(item.volumeOrganikM3, 2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-900 border-r border-slate-200 tabular-nums bg-emerald-100/40">
                          {formatNumberID(item.beratOrganikKg, 1)}
                        </td>

                        {/* Anorganik / Daur Ulang & Plastik */}
                        <td className="px-3 py-2 text-right text-amber-950 font-bold border-r border-slate-200 tabular-nums bg-amber-50/30">
                          {isClean
                            ? '-'
                            : isKarung
                            ? `${item.karungAnorganik || 0} krg`
                            : item.ketinggianAnorganikCm > 0
                            ? formatNumberID(item.ketinggianAnorganikCm, 1)
                            : ''}
                        </td>
                        <td className="px-3 py-2 text-center text-amber-800 border-r border-slate-200 tabular-nums bg-amber-50/30">
                          {isKarung ? `@${item.beratRataKarungAnorganik || 12}kg` : item.densitasAnorganik}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-900 border-r border-slate-200 tabular-nums bg-amber-50/30">
                          {formatNumberID(item.volumeAnorganikM3, 2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-amber-900 border-r border-slate-200 tabular-nums bg-amber-100/40">
                          {formatNumberID(item.beratAnorganikKg, 1)}
                        </td>

                        {/* Total Berat Baris */}
                        <td className="px-3 py-2 text-right font-extrabold text-teal-950 bg-teal-50/60 border-r border-slate-200 tabular-nums">
                          <div>{formatNumberID(totalBaris, 1)} kg</div>
                          {isKarung && item.karungCampur && item.karungCampur > 0 ? (
                            <div className="text-[9px] font-sans font-medium text-purple-700">
                              +Cmp: {item.karungCampur} krg ({formatNumberID(item.beratCampurKg || 0, 1)} kg)
                            </div>
                          ) : null}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenEditPengangkutan(item)}
                              className="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-sm cursor-pointer"
                              title="Edit Catatan"
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

              {/* Summary Footer Row */}
              <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={activeOPS.id === 'all' ? 3 : 2} className="px-4 py-2.5 font-sans">
                    TOTAL KESELURUHAN ({filteredList.length} AKTIVITAS)
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    Rata²: {avgPelangganServed}
                  </td>
                  <td colSpan={2} className="px-3 py-2.5 text-center text-slate-500 font-sans text-[11px]">
                    Konsolidasi
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-800">-</td>
                  <td className="px-3 py-2.5 text-center text-emerald-800">320</td>
                  <td className="px-3 py-2.5 text-right text-emerald-900 tabular-nums">
                    {formatNumberID(totalVolOrg, 2)} m³
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-900 bg-emerald-200/60 tabular-nums">
                    {formatNumberID(totalBeratOrg, 1)} kg
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-800">-</td>
                  <td className="px-3 py-2.5 text-center text-amber-800">127</td>
                  <td className="px-3 py-2.5 text-right text-amber-900 tabular-nums">
                    {formatNumberID(totalVolAnorg, 2)} m³
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-900 bg-amber-200/60 tabular-nums">
                    {formatNumberID(totalBeratAnorg, 1)} kg
                  </td>
                  <td className="px-3 py-2.5 text-right text-teal-950 bg-teal-200/60 tabular-nums font-extrabold">
                    {formatNumberID(grandTotalBeratKg, 1)} kg
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Deleting Pengangkutan */}
      <ModalConfirm
        isOpen={itemToDelete !== null}
        title="Konfirmasi Hapus Transaksi Sampah"
        message={
          itemToDelete ? (
            <div className="space-y-2">
              <p>
                Hapus catatan transaksi{' '}
                <strong>
                  {itemToDelete.sumberSampah === 'Clean-up Pantai' ? 'Clean-up Pantai' : 'Ritase'} (
                  {itemToDelete.hariTanggalLabel || itemToDelete.tanggal})
                </strong>
                ?
              </p>
              {itemToDelete.sumberSampah === 'Clean-up Pantai' && (
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-900">
                  Lokasi: <strong>{itemToDelete.lokasiPantai}</strong> • Total:{' '}
                  <strong>
                    {(itemToDelete.beratDaurUlangKg || 0) +
                      (itemToDelete.beratPlastikKg || 0) +
                      (itemToDelete.beratResiduKg || 0)}{' '}
                    Kg
                  </strong>
                </div>
              )}
            </div>
          ) : null
        }
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          if (itemToDelete) {
            onDeletePengangkutan(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
