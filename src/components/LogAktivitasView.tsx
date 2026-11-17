import React, { useMemo, useState, useEffect } from 'react';
import {
  History,
  Search,
  Download,
  FileText,
  Trash2,
  RotateCcw,
  Calendar,
  Filter,
  UserCheck,
  Activity,
  ShieldAlert,
  Clock,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  AdminAccount,
  ADMIN_ROLE_LABELS,
  LogAktivitas,
  LogAktivitasAksi,
  LogAktivitasModul,
  OPSProfile,
} from '../types/ops';
import { downloadPDF } from '../utils/pdfExport';
import { ModalConfirm } from './modals/ModalConfirm';

interface Props {
  logs: LogAktivitas[];
  activeOPS: OPSProfile;
  opsList: OPSProfile[];
  currentAdmin: AdminAccount;
  onClearLogs: () => void;
  onDeleteLogsBatch: (ids: string[]) => void;
}

const MODUL_OPTIONS: LogAktivitasModul[] = [
  'Auth',
  'Pelanggan',
  'Iuran',
  'Transaksi Sampah',
  'Clean-up Pantai',
  'Keuangan',
  'Tutup Buku',
  'Komposisi',
  'Daur Ulang',
  'Profil OPS',
  'Kelola Akun',
  'Backup & Impor',
];

const AKSI_OPTIONS: LogAktivitasAksi[] = [
  'LOGIN',
  'LOGOUT',
  'GANTI_AKUN',
  'TAMBAH',
  'UBAH',
  'HAPUS',
  'IMPOR',
  'KUNCI',
  'BUKA_KUNCI',
  'BACKUP',
  'RESTORE',
  'RESET',
];

const AKSI_LABELS: Record<LogAktivitasAksi, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  GANTI_AKUN: 'Ganti Akun',
  TAMBAH: 'Tambah',
  UBAH: 'Ubah',
  HAPUS: 'Hapus',
  IMPOR: 'Impor',
  KUNCI: 'Kunci Bulan',
  BUKA_KUNCI: 'Buka Kunci',
  BACKUP: 'Backup',
  RESTORE: 'Restore',
  RESET: 'Reset DB',
};

const AKSI_BADGE_CLASS: Record<LogAktivitasAksi, string> = {
  LOGIN: 'bg-sky-50 text-sky-700 border-sky-200',
  LOGOUT: 'bg-slate-100 text-slate-600 border-slate-200',
  GANTI_AKUN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  TAMBAH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UBAH: 'bg-amber-50 text-amber-700 border-amber-200',
  HAPUS: 'bg-rose-50 text-rose-700 border-rose-200',
  IMPOR: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  KUNCI: 'bg-teal-50 text-teal-800 border-teal-200',
  BUKA_KUNCI: 'bg-orange-50 text-orange-700 border-orange-200',
  BACKUP: 'bg-blue-50 text-blue-700 border-blue-200',
  RESTORE: 'bg-purple-50 text-purple-700 border-purple-200',
  RESET: 'bg-rose-100 text-rose-800 border-rose-300',
};

function formatDateTimeID(isoStr: string): { date: string; time: string } {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      return { date: isoStr.slice(0, 10), time: isoStr.slice(11, 19) || '-' };
    }
    const date = d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return { date, time };
  } catch {
    return { date: isoStr.slice(0, 10), time: '-' };
  }
}

export const LogAktivitasView: React.FC<Props> = ({
  logs,
  activeOPS,
  opsList,
  currentAdmin,
  onClearLogs,
  onDeleteLogsBatch,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterModul, setFilterModul] = useState<string>('all');
  const [filterAksi, setFilterAksi] = useState<string>('all');
  const [filterOPS, setFilterOPS] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isDeleteBatchConfirmOpen, setIsDeleteBatchConfirmOpen] = useState<boolean>(false);

  const pageSize = 25;
  const isSuperAdmin = currentAdmin.role === 'superadmin';

  const opsMap = useMemo(() => {
    const map = new Map<string, OPSProfile>();
    opsList.forEach(o => map.set(o.id, o));
    return map;
  }, [opsList]);

  const resolveOpsName = (log: LogAktivitas): string => {
    if (!log.opsId || log.opsId === 'all') return 'Semua OPS';
    const found = opsMap.get(log.opsId);
    if (found) return found.nama;
    if (log.opsNama && !log.opsNama.startsWith('ops-')) return log.opsNama;
    return log.opsId;
  };

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter(log => {
      if (filterModul !== 'all' && log.modul !== filterModul) return false;
      if (filterAksi !== 'all' && log.aksi !== filterAksi) return false;
      if (activeOPS.id === 'all' && filterOPS !== 'all' && log.opsId !== filterOPS) return false;
      if (filterDate && log.tanggal !== filterDate) return false;
      if (q) {
        const opsLabel = resolveOpsName(log).toLowerCase();
        const hay = [
          log.deskripsi,
          log.actorName,
          log.modul,
          AKSI_LABELS[log.aksi] || log.aksi,
          opsLabel,
          log.detail || '',
          log.targetId || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchQuery, filterModul, filterAksi, filterOPS, filterDate, activeOPS.id, opsMap]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, filterModul, filterAksi, filterOPS, filterDate, activeOPS.id]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safePage]);

  // KPI Metrics
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayCount = useMemo(
    () => filteredLogs.filter(l => l.tanggal === todayStr).length,
    [filteredLogs, todayStr]
  );
  const mutationCount = useMemo(
    () =>
      filteredLogs.filter(
        l =>
          l.aksi === 'UBAH' ||
          l.aksi === 'HAPUS' ||
          l.aksi === 'KUNCI' ||
          l.aksi === 'BUKA_KUNCI' ||
          l.aksi === 'RESET'
      ).length,
    [filteredLogs]
  );
  const uniqueActorsCount = useMemo(() => {
    const set = new Set<string>();
    filteredLogs.forEach(l => set.add(l.actorId || l.actorName));
    return set.size;
  }, [filteredLogs]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterModul !== 'all' ||
    filterAksi !== 'all' ||
    filterOPS !== 'all' ||
    Boolean(filterDate);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterModul('all');
    setFilterAksi('all');
    setFilterOPS('all');
    setFilterDate('');
  };

  const pageIds = paginatedLogs.map(l => l.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Waktu',
      'Tanggal',
      'Pengguna',
      'Peran',
      'Unit OPS',
      'Modul',
      'Aksi',
      'Deskripsi',
      'Detail',
    ];
    const escapeCSV = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((l, idx) => {
      const dt = formatDateTimeID(l.timestamp);
      const roleLabel =
        l.actorRole === 'system'
          ? 'Sistem'
          : ADMIN_ROLE_LABELS[l.actorRole] || l.actorRole;
      return [
        String(idx + 1),
        `${dt.date} ${dt.time}`,
        l.tanggal,
        l.actorName,
        roleLabel,
        resolveOpsName(l),
        l.modul,
        AKSI_LABELS[l.aksi] || l.aksi,
        l.deskripsi,
        l.detail || '',
      ]
        .map(escapeCSV)
        .join(',');
    });
    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Log_Aktivitas_${activeOPS.kode}_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const rows = filteredLogs.slice(0, 500).map((l, idx) => {
      const dt = formatDateTimeID(l.timestamp);
      const roleLabel =
        l.actorRole === 'system'
          ? 'Sistem'
          : ADMIN_ROLE_LABELS[l.actorRole] || l.actorRole;
      return [
        idx + 1,
        `${dt.date}\n${dt.time}`,
        `${l.actorName}\n(${roleLabel})`,
        resolveOpsName(l),
        l.modul,
        AKSI_LABELS[l.aksi] || l.aksi,
        l.detail ? `${l.deskripsi}\n[${l.detail}]` : l.deskripsi,
      ];
    });

    downloadPDF({
      filename: `Log_Aktivitas_${activeOPS.kode}_${todayStr}.pdf`,
      title: 'LAPORAN LOG AKTIVITAS & AUDIT SISTEM',
      subtitle: `Unit OPS: ${activeOPS.nama} • Menampilkan ${rows.length} catatan aktivitas terbaru`,
      opsName: activeOPS.id === 'all' ? 'SI-OPS KONSOLIDASI WILAYAH' : activeOPS.nama,
      orientation: 'landscape',
      summaryItems: [
        { label: 'Total Log Sesuai Filter', value: `${filteredLogs.length} Catatan` },
        { label: 'Aktivitas Hari Ini', value: `${todayCount} Aktivitas` },
        { label: 'Ubah / Hapus / Kunci', value: `${mutationCount} Aksi` },
        { label: 'Pengguna Aktif', value: `${uniqueActorsCount} Akun` },
      ],
      headers: ['No', 'Waktu', 'Pengguna', 'Unit OPS', 'Modul', 'Aksi', 'Deskripsi Aktivitas'],
      rows,
      ketuaName: activeOPS.ketua,
      adminName: currentAdmin.nama,
      kepalaNegeriName: activeOPS.kepalaPemerintahNegeri,
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-700/50 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                Jejak Audit &amp; Riwayat
              </span>
              <span className="text-xs text-emerald-200 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {activeOPS.nama}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-1">
              Log Aktivitas Pengguna &amp; Sistem
            </h1>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Pantau seluruh riwayat login, penambahan, perubahan, penghapusan data, impor Excel, tutup buku kas, hingga pencadangan sistem secara real-time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Total Log Tercatat
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {filteredLogs.length.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-500">
              {hasActiveFilters ? `Dari ${logs.length} total log` : 'Sinkron Cloud Firestore'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Aktivitas Hari Ini
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {todayCount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-500">Tanggal {todayStr}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Ubah, Hapus &amp; Kunci
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {mutationCount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-500">Aksi sensitif tercatat</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Pengguna Terlibat
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {uniqueActorsCount}
            </div>
            <div className="text-[10px] text-slate-500">Akun admin &amp; petugas</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengguna, deskripsi aktivitas, detail, atau unit OPS..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Modul Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={filterModul}
              onChange={e => setFilterModul(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Modul</option>
              {MODUL_OPTIONS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Aksi Filter */}
          <select
            value={filterAksi}
            onChange={e => setFilterAksi(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Aksi</option>
            {AKSI_OPTIONS.map(a => (
              <option key={a} value={a}>
                {AKSI_LABELS[a]}
              </option>
            ))}
          </select>

          {/* OPS Filter (only when viewing consolidated 'all') */}
          {activeOPS.id === 'all' && (
            <select
              value={filterOPS}
              onChange={e => setFilterOPS(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Unit OPS</option>
              {opsList
                .filter(o => o.id !== 'all')
                .map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
            </select>
          )}

          {/* Date Filter */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              title="Filter berdasarkan tanggal"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Batch Delete Bar (Super Admin) */}
        {isSuperAdmin && selectedIds.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-emerald-800">
              {selectedIds.length} log dipilih pada halaman ini
            </span>
            <button
              type="button"
              onClick={() => setIsDeleteBatchConfirmOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {logs.length === 0
                ? 'Belum Ada Aktivitas Tercatat'
                : 'Tidak Ada Log yang Cocok dengan Filter'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {logs.length === 0
                ? 'Setiap aktivitas penting seperti login, tambah/ubah/hapus data, impor Excel, tutup buku kas, dan pencadangan akan otomatis terekam di sini.'
                : 'Coba ubah kata kunci pencarian atau reset filter untuk melihat catatan aktivitas lainnya.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Tampilkan Semua Log
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {isSuperAdmin && (
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAllPage}
                          className="text-slate-500 hover:text-emerald-700 cursor-pointer inline-flex items-center justify-center"
                          title="Pilih semua pada halaman ini"
                        >
                          {allPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-3 whitespace-nowrap">Waktu</th>
                    <th className="py-3 px-3 whitespace-nowrap">Pengguna</th>
                    <th className="py-3 px-3 whitespace-nowrap">Unit OPS</th>
                    <th className="py-3 px-3 whitespace-nowrap">Modul</th>
                    <th className="py-3 px-3 whitespace-nowrap">Aksi</th>
                    <th className="py-3 px-4">Deskripsi Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedLogs.map(log => {
                    const dt = formatDateTimeID(log.timestamp);
                    const isChecked = selectedIds.includes(log.id);
                    const opsName = resolveOpsName(log);
                    const roleLabel =
                      log.actorRole === 'system'
                        ? 'Sistem'
                        : ADMIN_ROLE_LABELS[log.actorRole] || log.actorRole;
                    const initials = (log.actorName || 'S')
                      .split(' ')
                      .slice(0, 2)
                      .map(w => w[0]?.toUpperCase() || '')
                      .join('');

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isChecked ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        {isSuperAdmin && (
                          <td className="py-3 px-3 text-center align-top">
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(log.id)}
                              className="text-slate-400 hover:text-emerald-700 cursor-pointer mt-0.5"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <div className="font-semibold text-slate-800">{dt.date}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{dt.time}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {initials || 'AD'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{log.actorName}</div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {roleLabel}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                            {opsName}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {log.modul}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              AKSI_BADGE_CLASS[log.aksi] ||
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {AKSI_LABELS[log.aksi] || log.aksi}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top min-w-[260px]">
                          <div className="font-medium text-slate-900 leading-snug">
                            {log.deskripsi}
                          </div>
                          {log.detail && (
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {log.detail}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
              <div>
                Menampilkan{' '}
                <span className="font-bold text-slate-900">
                  {(safePage - 1) * pageSize + 1}
                </span>
                {' - '}
                <span className="font-bold text-slate-900">
                  {Math.min(safePage * pageSize, filteredLogs.length)}
                </span>{' '}
                dari{' '}
                <span className="font-bold text-slate-900">
                  {filteredLogs.length.toLocaleString('id-ID')}
                </span>{' '}
                catatan aktivitas
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="px-2.5 font-semibold text-slate-700">
                    Hal {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirm Clear All Logs */}
      <ModalConfirm
        isOpen={isClearConfirmOpen}
        title="Bersihkan Riwayat Log Aktivitas"
        message={
          <div className="space-y-2">
            <p>
              Apakah Anda yakin ingin menghapus seluruh riwayat log aktivitas{' '}
              {activeOPS.id === 'all' ? 'di semua unit OPS' : `untuk ${activeOPS.nama}`}?
            </p>
            <p className="text-xs text-slate-500">
              Data operasional (pelanggan, iuran, ritase, dan kas) tidak akan terpengaruh.
            </p>
          </div>
        }
        confirmText="Ya, Bersihkan Log"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          onClearLogs();
          setIsClearConfirmOpen(false);
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      {/* Confirm Delete Selected Logs */}
      <ModalConfirm
        isOpen={isDeleteBatchConfirmOpen}
        title="Hapus Log Terpilih"
        message={
          <p>
            Apakah Anda yakin ingin menghapus <strong>{selectedIds.length}</strong> catatan log aktivitas yang dipilih?
          </p>
        }
        confirmText="Ya, Hapus Terpilih"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          onDeleteLogsBatch(selectedIds);
          setSelectedIds([]);
          setIsDeleteBatchConfirmOpen(false);
        }}
        onCancel={() => setIsDeleteBatchConfirmOpen(false)}
      />
    </div>
  );
};
