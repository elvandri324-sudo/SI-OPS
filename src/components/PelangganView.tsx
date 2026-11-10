import React, { useState, useEffect } from 'react';
import { Pelanggan, PembayaranIuran, OPSProfile } from '../types/ops';
import {
  formatRupiah,
  formatNumberID,
  downloadCSV,
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  isPelangganTargetDiBulan,
  hitungBulanTargetPelangganSetahun,
  getTarifPelangganBulan,
  hitungTargetTagihanPelangganSetahun,
} from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  FileText,
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
  Home,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';
import { GrafikRealisasiIuran } from './GrafikRealisasiIuran';
import { GrafikTrenPelanggan } from './GrafikTrenPelanggan';
import { GrafikPenghuniRumah } from './GrafikPenghuniRumah';
import { Pagination } from './Pagination';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  selectedYear: number;
  isReadOnly?: boolean;
  canDelete?: boolean;
  onOpenAddPelanggan: () => void;
  onOpenEditPelanggan: (pelanggan: Pelanggan) => void;
  onDeletePelanggan: (id: string) => void;
  onDeletePelangganBatch?: (ids: string[]) => void;
  onTogglePelangganStatus?: (pelanggan: Pelanggan) => void;
  onUpdatePelangganStatusBatch?: (ids: string[], newStatus: 'Aktif' | 'Berhenti') => void;
  onOpenAddIuranForCell: (pelanggan: Pelanggan, bulan: number) => void;
  onOpenImportExcel?: (type: 'pelanggan' | 'pembayaran') => void;
  onSyncMonthlyRekap?: () => void;
  mode?: 'pelanggan' | 'iuran';
}

export const PelangganView: React.FC<Props> = ({
  mode = 'pelanggan',
  activeOPS,
  pelangganList,
  pembayaranList,
  selectedYear,
  isReadOnly = false,
  canDelete = true,
  onOpenAddPelanggan,
  onOpenEditPelanggan,
  onDeletePelanggan,
  onDeletePelangganBatch,
  onTogglePelangganStatus,
  onUpdatePelangganStatusBatch,
  onOpenAddIuranForCell,
  onOpenImportExcel,
  onSyncMonthlyRekap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'matriks' | 'realisasi' | 'tren' | 'penghuni'>(
    mode === 'iuran' ? 'matriks' : 'daftar'
  );

  // Sync activeSubTab when mode prop changes
  useEffect(() => {
    if (mode === 'iuran') {
      if (activeSubTab !== 'matriks' && activeSubTab !== 'realisasi') {
        setActiveSubTab('matriks');
      }
    } else {
      if (activeSubTab !== 'daftar' && activeSubTab !== 'penghuni' && activeSubTab !== 'tren') {
        setActiveSubTab('daftar');
      }
    }
  }, [mode]);

  const [matriksYear, setMatriksYear] = useState<number>(selectedYear);
  const [selectedMatriksMonth, setSelectedMatriksMonth] = useState<number>(1);

  // Sync matriksYear when top toolbar selectedYear changes
  useEffect(() => {
    setMatriksYear(selectedYear);
  }, [selectedYear]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRT, setFilterRT] = useState<string>('all');
  const [filterZona, setFilterZona] = useState<string>('all');
  const [filterSektor, setFilterSektor] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pelangganToDelete, setPelangganToDelete] = useState<Pelanggan | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Pagination states
  const [daftarPage, setDaftarPage] = useState<number>(1);
  const [daftarPageSize, setDaftarPageSize] = useState<number>(25);
  const [matriksPage, setMatriksPage] = useState<number>(1);
  const [matriksPageSize, setMatriksPageSize] = useState<number>(25);

  // Reset page number whenever search or filters change
  useEffect(() => {
    setDaftarPage(1);
    setMatriksPage(1);
  }, [searchQuery, filterRT, filterZona, filterSektor, filterUnit, filterStatus, activeOPS.id]);

  // Reset regional filters when switching active OPS
  useEffect(() => {
    setFilterRT('all');
    setFilterZona('all');
    setFilterSektor('all');
    setFilterUnit('all');
  }, [activeOPS.id]);

  // Deteksi khusus OPS Pulau Rhun, OPS Ouw & OPS Negeri Mahu
  const isOuwActive =
    activeOPS.id === 'ops-ouw' ||
    (activeOPS.nama || '').toLowerCase().includes('ouw') ||
    (activeOPS.kode || '').toUpperCase().includes('OUW');

  const isMahuActive =
    activeOPS.id === 'ops-mahu' ||
    activeOPS.id === 'ops-mh' ||
    activeOPS.id.toLowerCase().includes('mahu') ||
    activeOPS.id.toLowerCase().includes('mh') ||
    (activeOPS.nama || '').toLowerCase().includes('mahu') ||
    (activeOPS.kode || '').toUpperCase().includes('MH') ||
    (activeOPS.wilayah || '').toLowerCase().includes('mahu');

  const isRhunActive =
    activeOPS.id === 'ops-pulau-rhun' ||
    (activeOPS.nama || '').toLowerCase().includes('rhun') ||
    (activeOPS.kode || '').toUpperCase().includes('PR');

  const isAllOPS = activeOPS.id === 'all';

  // Zona: OPS Pulau Rhun (atau mode Semua OPS)
  // Sektor: OPS Negeri Ouw, OPS Negeri Mahu (atau mode Semua OPS)
  // Unit: Khusus OPS Negeri Ouw (atau mode Semua OPS)
  // RT: OPS Tanah Rata, OPS Pulau Rhun, OPS Negeri Mahu (OPS Ouw tidak menggunakan RT)
  const hasRhun = isRhunActive || isAllOPS;
  const hasSektor = isOuwActive || isMahuActive || isAllOPS;
  const hasUnit = isOuwActive || isAllOPS;

  // Status counts for real-time filter indicators
  const totalCount = pelangganList.length;
  const aktifCount = pelangganList.filter(p => p.status === 'Aktif').length;
  const berhentiCount = pelangganList.filter(p => p.status === 'Berhenti').length;

  // Filter options
  const uniqueRTs = Array.from(new Set(pelangganList.map(p => p.rt).filter(r => r && r !== '-'))).sort();
  const uniqueZonas = Array.from(new Set(pelangganList.map(p => p.zona).filter(Boolean))).sort();
  const uniqueSektors = Array.from(new Set(pelangganList.map(p => p.sektor).filter(Boolean))).sort();
  const uniqueUnits = Array.from(new Set(pelangganList.map(p => p.unit).filter(Boolean))).sort();

  // Filtered customer list
  const filteredPelanggan = pelangganList.filter(p => {
    const matchesSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (!isOuwActive && p.rt && p.rt.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (hasRhun && p.zona && p.zona.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (hasSektor && p.sektor && p.sektor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (hasUnit && p.unit && p.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRT = isOuwActive ? true : (filterRT === 'all' || p.rt === filterRT);
    const matchesZona = !hasRhun ? true : (filterZona === 'all' || p.zona === filterZona);
    const matchesSektor = !hasSektor ? true : (filterSektor === 'all' || p.sektor === filterSektor);
    const matchesUnit = !hasUnit ? true : (filterUnit === 'all' || p.unit === filterUnit);
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesRT && matchesZona && matchesSektor && matchesUnit && matchesStatus;
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
        'Penghuni Rumah (Jiwa)',
        'Kategori',
        ...(hasRhun && !isOuwActive ? ['Zona'] : []),
        ...(hasSektor ? ['Sektor'] : []),
        ...(hasUnit ? ['Unit'] : []),
        ...(!isOuwActive ? ['RT'] : []),
        'Tanggal Mulai Ikut Layanan',
        'Status',
        'Tanggal Mulai Tidak Aktif',
        'Tarif (Rp/bulan)',
      ];
      const rows = filteredPelanggan.map((p, idx) => [
        idx + 1,
        p.nama,
        p.kategori === 'Non Rumah Tangga' ? '-' : (p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga || 4),
        p.kategori,
        ...(hasRhun && !isOuwActive ? [p.zona || '-'] : []),
        ...(hasSektor ? [p.sektor || '-'] : []),
        ...(hasUnit ? [p.unit || '-'] : []),
        ...(!isOuwActive ? [p.rt] : []),
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
        ...(hasSektor ? ['Sektor'] : []),
        ...(hasUnit ? ['Unit'] : []),
        ...(hasRhun && !isOuwActive ? ['Zona'] : []),
        ...(!isOuwActive ? ['RT'] : []),
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
        return [
          idx + 1,
          p.nama,
          ...(hasSektor ? [p.sektor || '-'] : []),
          ...(hasUnit ? [p.unit || '-'] : []),
          ...(hasRhun && !isOuwActive ? [p.zona || '-'] : []),
          ...(!isOuwActive ? [p.rt] : []),
          p.tarifPerBulan,
          ...monthAmounts,
        ];
      });
      downloadCSV(`Matriks_Iuran_${activeOPS.kode}_${selectedYear}.csv`, headers, rows);
    }
  };

  // Export PDF for customer list or matrix
  const handleExportPDF = () => {
    if (activeSubTab === 'daftar') {
      const headers = [
        'No',
        'Nama Pelanggan',
        'Penghuni Rumah (Jiwa)',
        'Kategori',
        ...(hasRhun && !isOuwActive ? ['Zona'] : []),
        ...(hasSektor ? ['Sektor'] : []),
        ...(hasUnit ? ['Unit'] : []),
        ...(!isOuwActive ? ['RT'] : []),
        'Tgl Mulai Layanan',
        'Status',
        'Tgl Berhenti',
        'Tarif/Bln (Rp)',
      ];
      const rows = filteredPelanggan.map((p, idx) => [
        idx + 1,
        p.nama,
        p.kategori === 'Non Rumah Tangga' ? '-' : `${p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga || 4} Jiwa`,
        p.kategori,
        ...(hasRhun && !isOuwActive ? [p.zona || '-'] : []),
        ...(hasSektor ? [p.sektor || '-'] : []),
        ...(hasUnit ? [p.unit || '-'] : []),
        ...(!isOuwActive ? [p.rt] : []),
        p.tanggalMulai,
        p.status,
        p.tanggalBerhenti || '-',
        formatRupiah(p.tarifPerBulan, false),
      ]);
      const totalTarifAktif = filteredPelanggan
        .filter(p => p.status === 'Aktif')
        .reduce((s, p) => s + (p.tarifPerBulan || 0), 0);

      downloadPDF({
        filename: `Data_Pelanggan_${activeOPS.kode}_${selectedYear}.pdf`,
        title: `DAFTAR PELANGGAN LAYANAN SAMPAH`,
        subtitle: `Organisasi: ${activeOPS.nama} | Tahun: ${selectedYear} | Filter Status: ${
          filterStatus === 'all' ? 'Semua' : filterStatus
        }`,
        opsName: activeOPS.nama,
        orientation: 'landscape',
        summaryItems: [
          { label: 'Total Pelanggan (Filter)', value: `${filteredPelanggan.length} KK` },
          {
            label: 'Pelanggan Aktif',
            value: `${filteredPelanggan.filter(p => p.status === 'Aktif').length} KK`,
          },
          {
            label: 'Pelanggan Berhenti',
            value: `${filteredPelanggan.filter(p => p.status === 'Berhenti').length} KK`,
          },
          {
            label: 'Potensi Iuran Aktif / Bln',
            value: formatRupiah(totalTarifAktif, false),
          },
        ],
        headers,
        rows,
      });
    } else {
      // Export Matriks Pembayaran Iuran 12 Bulan
      const yearToUse = matriksYear;
      const headers = [
        'No',
        'Nama Pelanggan',
        'Status',
        ...(hasSektor ? ['Sektor'] : []),
        ...(hasUnit ? ['Unit'] : []),
        ...(hasRhun && !isOuwActive ? ['Zona'] : []),
        ...(!isOuwActive ? ['RT'] : []),
        'Tarif/Bln',
        ...MONTH_SHORT_ID,
        'Total Terbayar',
        'Target Setahun',
      ];

      const monthlyTotals = Array.from({ length: 12 }, (_, mIdx) => {
        const mNum = mIdx + 1;
        return filteredPelanggan.reduce((sum, p) => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mNum
          );
          return sum + (byr?.jumlah || 0);
        }, 0);
      });

      const monthlyTargets = Array.from({ length: 12 }, (_, mIdx) => {
        const mNum = mIdx + 1;
        return filteredPelanggan.reduce((sum, p) => {
          if (!isPelangganTargetDiBulan(p, yearToUse, mNum)) return sum;
          return sum + getTarifPelangganBulan(p, yearToUse, mNum);
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

      const rows = filteredPelanggan.map((p, idx) => {
        const monthAmounts = Array.from({ length: 12 }, (_, mIdx) => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mIdx + 1
          );
          return byr && byr.jumlah > 0 ? formatNumberID(byr.jumlah, 0) : '-';
        });
        const rowPaid = Array.from({ length: 12 }, (_, mIdx) => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mIdx + 1
          );
          return byr?.jumlah || 0;
        }).reduce((s, a) => s + a, 0);
        const rowTarget = hitungTargetTagihanPelangganSetahun(p, yearToUse);

        return [
          idx + 1,
          p.nama,
          p.status,
          ...(hasSektor ? [p.sektor || '-'] : []),
          ...(hasUnit ? [p.unit || '-'] : []),
          ...(hasRhun && !isOuwActive ? [p.zona || '-'] : []),
          ...(!isOuwActive ? [p.rt] : []),
          formatNumberID(p.tarifPerBulan, 0),
          ...monthAmounts,
          formatRupiah(rowPaid, false),
          p.status === 'Aktif' ? formatRupiah(rowTarget, false) : 'Rp 0 (Non-Aktif)',
        ];
      });

      const prefixColsCount =
        4 +
        (hasSektor ? 1 : 0) +
        (hasUnit ? 1 : 0) +
        (hasRhun && !isOuwActive ? 1 : 0) +
        (!isOuwActive ? 1 : 0);

      const makeFootRow = (label: string, monthCells: string[], totalPaidCell: string, targetCell: string) => {
        const prefix = Array(prefixColsCount).fill('');
        prefix[prefixColsCount - 1] = label;
        return [...prefix, ...monthCells, totalPaidCell, targetCell];
      };

      // Perhitungan rincian KK untuk PDF
      const pdfMonthlyLunas = Array.from({ length: 12 }, (_, mIdx) => {
        const mNum = mIdx + 1;
        return filteredPelanggan.filter(p => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mNum
          );
          const amount = byr?.jumlah || 0;
          const tarif = getTarifPelangganBulan(p, yearToUse, mNum);
          return amount >= tarif && amount > 0;
        }).length;
      });

      const pdfMonthlyKurang = Array.from({ length: 12 }, (_, mIdx) => {
        const mNum = mIdx + 1;
        return filteredPelanggan.filter(p => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mNum
          );
          const amount = byr?.jumlah || 0;
          const tarif = getTarifPelangganBulan(p, yearToUse, mNum);
          return amount > 0 && amount < tarif;
        }).length;
      });

      const pdfMonthlyBelumBayar = Array.from({ length: 12 }, (_, mIdx) => {
        const mNum = mIdx + 1;
        return filteredPelanggan.filter(p => {
          if (!isPelangganTargetDiBulan(p, yearToUse, mNum)) return false;
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mNum
          );
          return (byr?.jumlah || 0) === 0;
        }).length;
      });

      const pdfMonthlyPayers = Array.from({ length: 12 }, (_, mIdx) => {
        const mNum = mIdx + 1;
        return filteredPelanggan.filter(p => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === yearToUse && b.bulan === mNum
          );
          return (byr?.jumlah || 0) > 0;
        }).length;
      });

      const footRows = [
        makeFootRow(
          'TOTAL REALISASI (RP)',
          monthlyTotals.map(t => (t > 0 ? formatNumberID(t, 0) : '-')),
          formatRupiah(grandTotalRealisasi, false),
          formatRupiah(grandTotalTarget, false)
        ),
        makeFootRow(
          'KK BAYAR LUNAS (KK)',
          pdfMonthlyLunas.map(c => (c > 0 ? `${c} KK` : '-')),
          '-',
          'Lunas Penuh'
        ),
        makeFootRow(
          'KK BAYAR KURANG (KK)',
          pdfMonthlyKurang.map(c => (c > 0 ? `${c} KK` : '-')),
          '-',
          'Kurang Tarif'
        ),
        makeFootRow(
          'KK BELUM BAYAR (KK)',
          pdfMonthlyBelumBayar.map(c => (c > 0 ? `${c} KK` : '-')),
          '-',
          'Nunggak'
        ),
        makeFootRow(
          'TOTAL WARGA SETOR (KK)',
          pdfMonthlyPayers.map(c => (c > 0 ? `${c} KK` : '-')),
          '-',
          'Ada Setoran'
        ),
        makeFootRow(
          'TARGET TAGIHAN (RP)',
          monthlyTargets.map(t => (t > 0 ? formatNumberID(t, 0) : '-')),
          '-',
          formatRupiah(grandTotalTarget, false)
        ),
        makeFootRow(
          '% CAPAIAN',
          monthlyPcts.map(pct => (pct > 0 ? `${formatNumberID(pct, 0)}%` : '-')),
          `${formatNumberID(grandTotalPct, 1)}%`,
          'Capaian Thn'
        ),
      ];

      downloadPDF({
        filename: `Matriks_Pembayaran_Iuran_${activeOPS.kode}_${yearToUse}.pdf`,
        title: `MATRIKS PEMBAYARAN IURAN WARGA (${yearToUse})`,
        subtitle: `Organisasi: ${activeOPS.nama} | Target Tagihan Hanya Pelanggan Aktif Sejak Mulai Layanan`,
        opsName: activeOPS.nama,
        orientation: 'landscape',
        summaryItems: [
          { label: `Total Realisasi (${yearToUse})`, value: formatRupiah(grandTotalRealisasi, false) },
          { label: 'Target Tagihan Setahun', value: formatRupiah(grandTotalTarget, false) },
          { label: 'Persentase Realisasi', value: `${formatNumberID(grandTotalPct, 1)}%` },
          {
            label: 'Pelanggan Aktif',
            value: `${filteredPelanggan.filter(p => p.status === 'Aktif').length} KK`,
          },
        ],
        headers,
        rows,
        footRows,
      });
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
          {mode === 'pelanggan' ? (
            <>
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
                onClick={() => setActiveSubTab('penghuni')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'penghuni'
                    ? 'bg-white text-teal-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-teal-600" />
                <span>Grafik Penghuni Rumah</span>
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
                <span>Tren Pertumbuhan Pelanggan</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveSubTab('matriks')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'matriks'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Matriks Pembayaran Iuran ({matriksYear})</span>
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
                <span>Persentase &amp; Realisasi Iuran</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                isOuwActive
                  ? 'Cari nama, sektor, unit...'
                  : hasRhun
                  ? 'Cari nama, RT, zona...'
                  : 'Cari nama, RT...'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-36 sm:w-48"
            />
          </div>

          {/* Zona Filter (for OPS Rhun or All) */}
          {hasRhun && !isOuwActive && (
            <select
              value={filterZona}
              onChange={e => setFilterZona(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950 cursor-pointer"
              title="Filter Pelanggan berdasarkan Zona (OPS Rhun)"
            >
              <option value="all">Semua Zona</option>
              <option value="Zona 1">Zona 1</option>
              <option value="Zona 2">Zona 2</option>
              <option value="Zona 3">Zona 3</option>
            </select>
          )}

          {/* Sektor Filter (for OPS Ouw, OPS Mahu, or All) */}
          {hasSektor && (
            <select
              value={filterSektor}
              onChange={e => setFilterSektor(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-cyan-50/60 font-semibold text-cyan-950 cursor-pointer"
              title="Filter Pelanggan berdasarkan Sektor"
            >
              <option value="all">Semua Sektor</option>
              {uniqueSektors.length > 0 ? (
                uniqueSektors.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              ) : (
                <>
                  <option value="Sektor 1">Sektor 1</option>
                  <option value="Sektor 2">Sektor 2</option>
                  <option value="Sektor 3">Sektor 3</option>
                </>
              )}
            </select>
          )}

          {/* Unit Filter (for OPS Ouw or All) */}
          {hasUnit && (
            <select
              value={filterUnit}
              onChange={e => setFilterUnit(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-cyan-50/60 font-semibold text-cyan-950 cursor-pointer"
              title="Filter Pelanggan berdasarkan Unit (OPS Ouw)"
            >
              <option value="all">Semua Unit</option>
              {uniqueUnits.length > 0 ? (
                uniqueUnits.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))
              ) : (
                <>
                  <option value="Unit 1">Unit 1</option>
                  <option value="Unit 2">Unit 2</option>
                  <option value="Unit 3">Unit 3</option>
                </>
              )}
            </select>
          )}

          {/* RT Filter (Hanya untuk non-Ouw karena OPS Ouw tidak memiliki RT) */}
          {!isOuwActive && (
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
          )}

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

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Download laporan dalam format PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Export PDF</span>
          </button>

          {/* Import Excel: Dynamically targets Warga or Pembayaran Iuran based on mode */}
          {!isReadOnly && onOpenImportExcel && (
            <div className="flex items-center gap-1">
              {mode === 'pelanggan' ? (
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

          {/* Add Customer Button (Only in Data Pelanggan mode) */}
          {!isReadOnly && mode === 'pelanggan' && (
            <button
              onClick={onOpenAddPelanggan}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pelanggan</span>
            </button>
          )}

          {isReadOnly && (
            <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
              👁️ Mode Hanya Lihat
            </span>
          )}
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
                {onUpdatePelangganStatusBatch && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePelangganStatusBatch(selectedIds, 'Aktif');
                        setSelectedIds([]);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Ubah status seluruh pelanggan terpilih menjadi Aktif"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Jadikan Aktif ({selectedIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePelangganStatusBatch(selectedIds, 'Berhenti');
                        setSelectedIds([]);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Ubah status seluruh pelanggan terpilih menjadi Berhenti"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Jadikan Berhenti ({selectedIds.length})</span>
                    </button>
                  </>
                )}
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
                    <th className="px-3 py-3 text-center border-r border-teal-600 min-w-[110px]" title="Jumlah Penghuni Rumah (Jiwa)">
                      Penghuni Rumah
                    </th>
                    <th className="px-4 py-3 border-r border-teal-600">Kategori</th>
                    {hasRhun && !isOuwActive && (
                      <th className="px-3 py-3 text-center border-r border-teal-600 min-w-[85px]">Zona</th>
                    )}
                    {hasSektor && (
                      <th className="px-3 py-3 text-center border-r border-teal-600 min-w-[80px]">Sektor</th>
                    )}
                    {hasUnit && (
                      <th className="px-3 py-3 text-center border-r border-teal-600 min-w-[70px]">Unit</th>
                    )}
                    {!isOuwActive && (
                      <th className="px-3 py-3 text-center border-r border-teal-600">RT</th>
                    )}
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
                      <td
                        colSpan={
                          9 +
                          (activeOPS.id === 'all' ? 1 : 0) +
                          (hasRhun && !isOuwActive ? 1 : 0) +
                          (hasSektor ? 1 : 0) +
                          (hasUnit ? 1 : 0) +
                          (!isOuwActive ? 1 : 0)
                        }
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        Tidak ada data pelanggan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const startIndexDaftar = (daftarPage - 1) * daftarPageSize;
                      const paginatedDaftarPelanggan = filteredPelanggan.slice(
                        startIndexDaftar,
                        startIndexDaftar + daftarPageSize
                      );
                      return paginatedDaftarPelanggan.map((pelanggan, index) => {
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
                              {startIndexDaftar + index + 1}
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
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-teal-800 bg-teal-50/30 border-r border-slate-200">
                          {pelanggan.kategori === 'Non Rumah Tangga' ? (
                            <span className="text-slate-400 font-normal font-sans" title="Non Rumah Tangga tidak hitung jiwa">-</span>
                          ) : (
                            `${pelanggan.jumlahPenghuniRumah || pelanggan.jumlahAnggotaKeluarga || 4} Jiwa`
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 border-r border-slate-200">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              pelanggan.kategori === 'Non Rumah Tangga'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {pelanggan.kategori}
                          </span>
                        </td>
                        {hasRhun && !isOuwActive && (
                          <td className="px-3 py-2.5 text-center border-r border-slate-200">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-xs font-bold font-mono">
                              {pelanggan.zona || '-'}
                            </span>
                          </td>
                        )}
                        {hasSektor && (
                          <td className="px-3 py-2.5 text-center font-semibold text-cyan-950 border-r border-slate-200">
                            {pelanggan.sektor || '-'}
                          </td>
                        )}
                        {hasUnit && (
                          <td className="px-3 py-2.5 text-center font-semibold text-cyan-950 border-r border-slate-200">
                            {pelanggan.unit || '-'}
                          </td>
                        )}
                        {!isOuwActive && (
                          <td className="px-3 py-2.5 text-center font-mono text-slate-700 border-r border-slate-200">
                            {pelanggan.rt}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-slate-700 border-r border-slate-200">
                          {pelanggan.tanggalMulai}
                        </td>
                        <td className="px-4 py-2.5 text-center border-r border-slate-200">
                          {onTogglePelangganStatus ? (
                            <button
                              type="button"
                              onClick={() => onTogglePelangganStatus(pelanggan)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                                isAktif
                                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                  : 'bg-rose-700 hover:bg-rose-800 text-white'
                              }`}
                              title={`Status saat ini: ${pelanggan.status}. Klik untuk langsung beralih ke "${isAktif ? 'Berhenti' : 'Aktif'}".`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-emerald-200 animate-pulse' : 'bg-rose-200'}`} />
                              <span>{pelanggan.status}</span>
                            </button>
                          ) : (
                            <span
                              className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                                isAktif
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-rose-700 text-white'
                              }`}
                            >
                              {pelanggan.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 border-r border-slate-200 font-mono">
                          {pelanggan.tanggalBerhenti || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900 border-r border-slate-200 tabular-nums">
                          {formatRupiah(pelanggan.tarifPerBulan, true)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isReadOnly ? (
                            <span className="text-[11px] text-slate-400 font-medium">Lihat Saja</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onOpenEditPelanggan(pelanggan)}
                                className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                title="Edit Data Pelanggan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setPelangganToDelete(pelanggan)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Hapus Pelanggan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Daftar Pelanggan */}
          <Pagination
            currentPage={daftarPage}
            totalItems={filteredPelanggan.length}
            pageSize={daftarPageSize}
            onPageChange={setDaftarPage}
            onPageSizeChange={setDaftarPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="pelanggan"
          />
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

        // 1. KK Bayar Lunas Penuh (nominal bayar >= tarif bulan tersebut)
        const monthlyLunasCounts = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          return filteredPelanggan.filter(p => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === mNum
            );
            const amount = byr?.jumlah || 0;
            const tarif = getTarifPelangganBulan(p, matriksYear, mNum);
            return amount >= tarif && amount > 0;
          }).length;
        });

        // 2. KK Bayar Kurang / Belum Lunas Sesuai Tarif (0 < nominal bayar < tarif bulan tersebut)
        const monthlyKurangCounts = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          return filteredPelanggan.filter(p => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === mNum
            );
            const amount = byr?.jumlah || 0;
            const tarif = getTarifPelangganBulan(p, matriksYear, mNum);
            return amount > 0 && amount < tarif;
          }).length;
        });

        // 3. KK Belum Bayar / Nunggak Penuh (nominal bayar === 0 untuk pelanggan target aktif)
        const monthlyBelumBayarCounts = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          return filteredPelanggan.filter(p => {
            if (!isPelangganTargetDiBulan(p, matriksYear, mNum)) return false;
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === mNum
            );
            const amount = byr?.jumlah || 0;
            return amount === 0;
          }).length;
        });

        const monthlyTargets = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = mIdx + 1;
          return filteredPelanggan.reduce((sum, p) => {
            if (!isPelangganTargetDiBulan(p, matriksYear, mNum)) {
              return sum;
            }
            return sum + getTarifPelangganBulan(p, matriksYear, mNum);
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

        // Akumulasi Status KK Tahunan (Setahun)
        let grandTotalLunasKK = 0;
        let grandTotalKurangKK = 0;
        let grandTotalBelumBayarKK = 0;

        filteredPelanggan.forEach(p => {
          const targetMonthsCount = hitungBulanTargetPelangganSetahun(p, matriksYear);
          if (targetMonthsCount === 0) return;
          const rowTargetRp = hitungTargetTagihanPelangganSetahun(p, matriksYear);
          const rowTotalPaid = Array.from({ length: 12 }, (_, m) => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === matriksYear && b.bulan === m + 1
            );
            return byr?.jumlah || 0;
          }).reduce((s, a) => s + a, 0);

          if (rowTotalPaid >= rowTargetRp && rowTotalPaid > 0) {
            grandTotalLunasKK++;
          } else if (rowTotalPaid > 0 && rowTotalPaid < rowTargetRp) {
            grandTotalKurangKK++;
          } else if (rowTotalPaid === 0) {
            grandTotalBelumBayarKK++;
          }
        });

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

                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg transition-all border border-rose-400/50 flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
                  title="Download data matriks pembayaran ke PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export Matriks PDF</span>
                </button>
              </div>
            </div>

            {/* Catatan Khusus Feb 2026 Tanah Rata */}
            {matriksYear === 2026 && (activeOPS.id === 'ops-tanah-rata' || activeOPS.id === 'all') && (
              <div className="bg-emerald-50/90 border-b border-emerald-200 px-3.5 py-2 flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
                <span className="font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] uppercase tracking-wider shrink-0">
                  Tarif Khusus Feb 2026
                </span>
                <span className="text-[11px] leading-tight">
                  Khusus <strong>OPS Tanah Rata pada Februari 2026</strong>, tarif iuran dihitung <strong>Rp 10.000</strong> (layanan dimulai per 15 Februari 2026). Warga yang membayar Rp 10.000 otomatis dihitung <strong>Lunas Sesuai Tarif</strong>.
                </span>
              </div>
            )}

            {/* Summary KPI Strip on Top of Matrix (Tahunan) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 p-3 bg-teal-900/10 border-b border-teal-200/50 text-xs font-medium">
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs min-w-0 overflow-hidden">
                <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">Total Terkumpul ({matriksYear})</div>
                <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-0.5 truncate">
                  {formatRupiah(grandTotalRealisasi, true)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs min-w-0 overflow-hidden">
                <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">Target Tagihan Setahun</div>
                <div className="text-sm font-bold text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                  {formatRupiah(grandTotalTarget, true)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  Khusus pelanggan Aktif sejak mulai layanan
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs min-w-0 overflow-hidden">
                <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">Persentase Realisasi</div>
                <div className="text-sm font-bold text-teal-700 font-mono tabular-nums mt-0.5 truncate">
                  {formatNumberID(grandTotalPct, 1)}%
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 shadow-2xs min-w-0 overflow-hidden">
                <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">Status Warga Iuran ({matriksYear})</div>
                <div className="text-sm font-bold text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                  {grandTotalPayers} / {filteredPelanggan.filter(p => p.status === 'Aktif').length} KK Aktif
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-mono">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{grandTotalLunasKK} Lunas</span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{grandTotalKurangKK} Kurang</span>
                  <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{grandTotalBelumBayarKK} Nunggak</span>
                </div>
              </div>
            </div>

            {/* Rincian Target & Realisasi Per Bulan di Bawah Kartu Tahunan */}
            <div className="p-3 bg-emerald-50/50 border-b border-teal-200/60 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                    Target &amp; Realisasi Per Bulan ({MONTH_NAMES_ID[selectedMatriksMonth - 1]} {matriksYear})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                    Klik bulan untuk lihat rincian
                  </span>
                </div>

                {/* Pilihan Bulan Cepat (Jan - Des) */}
                <div className="flex flex-wrap items-center gap-1">
                  {MONTH_SHORT_ID.map((mShort, idx) => {
                    const mNum = idx + 1;
                    const isSelected = selectedMatriksMonth === mNum;
                    const hasData = monthlyTotals[idx] > 0;
                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={() => setSelectedMatriksMonth(mNum)}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer tabular-nums ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-2xs'
                            : hasData
                            ? 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                            : 'bg-white/70 text-slate-500 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mShort}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 Kartu Target & Realisasi Bulan Terpilih */}
              {(() => {
                const mIdx = selectedMatriksMonth - 1;
                const monthRealisasi = monthlyTotals[mIdx] || 0;
                const monthTarget = monthlyTargets[mIdx] || 0;
                const monthPct = monthlyPcts[mIdx] || 0;
                const monthPayers = monthlyPayerCounts[mIdx] || 0;
                const activeKKInMonth = filteredPelanggan.filter(p =>
                  isPelangganTargetDiBulan(p, matriksYear, selectedMatriksMonth)
                ).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 text-xs font-medium">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs min-w-0 overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">
                        Realisasi Terkumpul ({MONTH_SHORT_ID[mIdx]} {matriksYear})
                      </div>
                      <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-0.5 truncate">
                        {formatRupiah(monthRealisasi, true)}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs min-w-0 overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">
                        Target Tagihan ({MONTH_SHORT_ID[mIdx]} {matriksYear})
                      </div>
                      <div className="text-sm font-bold text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                        {formatRupiah(monthTarget, true)}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs min-w-0 overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">
                        Persentase Realisasi ({MONTH_SHORT_ID[mIdx]})
                      </div>
                      <div className="text-sm font-bold text-teal-700 font-mono tabular-nums mt-0.5 truncate">
                        {formatNumberID(monthPct, 1)}%
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs min-w-0 overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold truncate">
                        Status Warga ({MONTH_SHORT_ID[mIdx]} {matriksYear})
                      </div>
                      <div className="text-sm font-bold text-slate-800 font-mono tabular-nums mt-0.5 truncate">
                        {monthPayers} / {activeKKInMonth} KK
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-mono">
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{monthlyLunasCounts[mIdx] || 0} Lunas</span>
                        <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{monthlyKurangCounts[mIdx] || 0} Kurang</span>
                        <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{monthlyBelumBayarCounts[mIdx] || 0} Nunggak</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Ringkasan Matriks 12 Bulan (Target vs Realisasi Per Bulan) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-1.5 pt-1">
                {MONTH_SHORT_ID.map((mShort, idx) => {
                  const mReal = monthlyTotals[idx] || 0;
                  const mTgt = monthlyTargets[idx] || 0;
                  const mPct = monthlyPcts[idx] || 0;
                  const mPay = monthlyPayerCounts[idx] || 0;
                  const isCurrentSelected = selectedMatriksMonth === idx + 1;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedMatriksMonth(idx + 1)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isCurrentSelected
                          ? 'bg-teal-900 text-white border-teal-700 shadow-xs'
                          : 'bg-white hover:bg-teal-50/50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={isCurrentSelected ? 'text-teal-200' : 'text-slate-600'}>
                          {MONTH_NAMES_ID[idx]}
                        </span>
                        <span
                          className={`font-mono tabular-nums px-1.5 py-0.2 rounded ${
                            isCurrentSelected
                              ? 'bg-teal-700 text-emerald-300'
                              : mPct >= 50
                              ? 'bg-emerald-100 text-emerald-800'
                              : mPct > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {formatNumberID(mPct, 1)}%
                        </span>
                      </div>
                      <div className="mt-1 font-mono tabular-nums text-[11px] font-bold truncate">
                        <span className={isCurrentSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                          {formatRupiah(mReal, false)}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] font-mono tabular-nums flex items-center justify-between mt-0.5 ${
                          isCurrentSelected ? 'text-teal-200/90' : 'text-slate-500'
                        }`}
                      >
                        <span className="truncate">Tgt: {formatRupiah(mTgt, false)}</span>
                        <span className="shrink-0 ml-1">{mPay} KK</span>
                      </div>
                    </div>
                  );
                })}
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
                    {hasSektor && (
                      <th className="px-2 py-2.5 text-center border-r border-teal-600 min-w-[70px]">Sektor</th>
                    )}
                    {hasUnit && (
                      <th className="px-2 py-2.5 text-center border-r border-teal-600 min-w-[65px]">Unit</th>
                    )}
                    {hasRhun && !isOuwActive && (
                      <th className="px-2 py-2.5 text-center border-r border-teal-600 min-w-[70px]">Zona</th>
                    )}
                    {!isOuwActive && (
                      <th className="px-2 py-2.5 text-center border-r border-teal-600">RT</th>
                    )}
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
                  {(() => {
                    const startIndexMatriks = (matriksPage - 1) * matriksPageSize;
                    const paginatedMatriksPelanggan = filteredPelanggan.slice(
                      startIndexMatriks,
                      startIndexMatriks + matriksPageSize
                    );
                    return paginatedMatriksPelanggan.map((pelanggan, idx) => {
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
                      const targetMonthsCount = hitungBulanTargetPelangganSetahun(pelanggan, matriksYear);
                      const rowTargetRp = hitungTargetTagihanPelangganSetahun(pelanggan, matriksYear);

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
                            {startIndexMatriks + idx + 1}
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
                                title={pelanggan.tanggalBerhenti ? `Tidak aktif sejak: ${pelanggan.tanggalBerhenti} (Tidak dihitung target tagihan)` : 'Tidak aktif (Tidak dihitung target tagihan)'}
                              >
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                <span>Berhenti</span>
                              </span>
                            ) : (
                              <span
                                className="px-1 py-0.2 rounded-xs bg-emerald-100 text-emerald-800 font-semibold text-[9px]"
                                title={`Mulai layanan: ${pelanggan.tanggalMulai} (${targetMonthsCount} bulan target di ${matriksYear})`}
                              >
                                Aktif
                              </span>
                            )}
                          </div>
                        </td>
                        {hasSektor && (
                          <td className="px-2 py-2 text-center font-semibold text-cyan-950 border-r border-slate-200 whitespace-nowrap">
                            {pelanggan.sektor || '-'}
                          </td>
                        )}
                        {hasUnit && (
                          <td className="px-2 py-2 text-center font-semibold text-cyan-950 border-r border-slate-200 whitespace-nowrap">
                            {pelanggan.unit || '-'}
                          </td>
                        )}
                        {hasRhun && !isOuwActive && (
                          <td className="px-2 py-2 text-center font-bold text-emerald-900 border-r border-slate-200 whitespace-nowrap font-mono text-xs">
                            {pelanggan.zona || '-'}
                          </td>
                        )}
                        {!isOuwActive && (
                          <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-200">
                            {pelanggan.rt}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right font-mono text-slate-800 border-r border-slate-200 tabular-nums">
                          {formatRupiah(pelanggan.tarifPerBulan, false)}
                        </td>

                        {/* 12 Months Cells */}
                        {customerMonthlyPayments.map((amount, mIdx) => {
                          const mNum = mIdx + 1;
                          const isTargetMonth = isPelangganTargetDiBulan(pelanggan, matriksYear, mNum);
                          const targetTarif = getTarifPelangganBulan(pelanggan, matriksYear, mNum);
                          const cellStyle = getCellPaymentStyle(amount, targetTarif);

                          return (
                            <td
                              key={mIdx}
                              onClick={() => onOpenAddIuranForCell(pelanggan, mNum)}
                              className={`p-1 border-r border-slate-200 text-center cursor-pointer transition-all hover:ring-1 hover:ring-emerald-500 ${
                                !isTargetMonth && amount === 0 ? 'bg-slate-50/80' : ''
                              }`}
                              title={
                                isBerhenti
                                  ? `${pelanggan.nama} berstatus Berhenti (tidak dihitung target tagihan). Klik jika ingin mencatat riwayat.`
                                  : !isTargetMonth
                                  ? `${pelanggan.nama} belum ikut layanan pada ${MONTH_NAMES_ID[mIdx]} ${matriksYear} (Mulai: ${pelanggan.tanggalMulai}).`
                                  : `${pelanggan.nama} (${MONTH_NAMES_ID[mIdx]} ${matriksYear}) - Setor: ${formatRupiah(amount, false)} / Target: ${formatRupiah(targetTarif, false)}${matriksYear === 2026 && mNum === 2 && pelanggan.opsId === 'ops-tanah-rata' ? ' (Khusus Feb 2026 Tanah Rata: tarif Rp 10.000 karena mulai 15 Feb, lunas penuh)' : ''}. Klik untuk edit.`
                              }
                            >
                              <div
                                className={`py-1.5 px-1 rounded-sm text-[11px] font-mono tabular-nums transition-colors ${cellStyle}`}
                              >
                                {amount > 0 ? formatRupiah(amount, false) : '-'}
                              </div>
                            </td>
                          );
                        })}

                        {/* Customer Row Total Terbayar & Target */}
                        <td className="px-3 py-2 text-right font-mono border-r border-slate-200 tabular-nums bg-emerald-50/40">
                          <div className="font-bold text-emerald-800">
                            {formatRupiah(rowTotalPaid, false)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isBerhenti
                              ? 'Tgt: Rp 0 (Non-Aktif)'
                              : `Tgt: ${formatRupiah(rowTargetRp, false)} (${targetMonthsCount} bln)`}
                          </div>
                        </td>

                        {/* Customer Row Status / Bulan */}
                        <td className="px-2 py-2 text-center bg-slate-50/50">
                          {isBerhenti ? (
                            <span
                              className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-[10px]"
                              title="Pelanggan tidak aktif tidak dihitung dalam target tagihan"
                            >
                              Non-Aktif
                            </span>
                          ) : targetMonthsCount > 0 && rowTotalPaid >= rowTargetRp ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Lunas {targetMonthsCount} Bln
                            </span>
                          ) : rowMonthsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                              {rowMonthsCount}/{targetMonthsCount} Bln
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                              0/{targetMonthsCount} Bln
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>

                {/* TFOOT: 4-Row Calculation of Monthly Totals & Realization Pct */}
                <tfoot className="border-t-2 border-teal-700 bg-slate-100 font-bold text-slate-900">
                  {/* Row 1: Total Realisasi Rupiah */}
                  <tr className="bg-teal-50 border-b border-teal-200">
                    <td
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
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

                  {/* Row 2A: KK Bayar Lunas Sesuai Tarif */}
                  <tr className="bg-emerald-50/60 border-b border-emerald-100">
                    <td
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
                      className="px-3 py-2 text-right uppercase text-[10px] text-emerald-800 font-bold sticky left-0 bg-emerald-50/95"
                    >
                      KK Bayar Lunas (Sesuai Tarif):
                    </td>
                    {monthlyLunasCounts.map((cnt, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2 text-center font-mono text-[11px] text-emerald-800 font-bold border-r border-emerald-100 bg-emerald-50/40"
                      >
                        {cnt > 0 ? `${cnt} KK` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-emerald-900 border-r border-emerald-200 bg-emerald-100/70">
                      {grandTotalLunasKK} KK
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-emerald-800 font-medium bg-emerald-50/50">
                      Lunas Penuh
                    </td>
                  </tr>

                  {/* Row 2B: KK Bayar Kurang (< Tarif) */}
                  <tr className="bg-amber-50/50 border-b border-amber-100">
                    <td
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
                      className="px-3 py-2 text-right uppercase text-[10px] text-amber-800 font-bold sticky left-0 bg-amber-50/95"
                    >
                      KK Bayar Kurang (&lt; Tarif):
                    </td>
                    {monthlyKurangCounts.map((cnt, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2 text-center font-mono text-[11px] text-amber-800 font-bold border-r border-amber-100 bg-amber-50/30"
                      >
                        {cnt > 0 ? `${cnt} KK` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-amber-900 border-r border-amber-200 bg-amber-100/70">
                      {grandTotalKurangKK} KK
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-amber-800 font-medium bg-amber-50/50">
                      Kurang Tarif
                    </td>
                  </tr>

                  {/* Row 2C: KK Belum Bayar (Nunggak Penuh) */}
                  <tr className="bg-rose-50/50 border-b border-rose-100">
                    <td
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
                      className="px-3 py-2 text-right uppercase text-[10px] text-rose-800 font-bold sticky left-0 bg-rose-50/95"
                    >
                      KK Belum Bayar (Nunggak):
                    </td>
                    {monthlyBelumBayarCounts.map((cnt, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2 text-center font-mono text-[11px] text-rose-700 font-bold border-r border-rose-100 bg-rose-50/30"
                      >
                        {cnt > 0 ? `${cnt} KK` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-rose-900 border-r border-rose-200 bg-rose-100/70">
                      {grandTotalBelumBayarKK} KK
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-rose-800 font-medium bg-rose-50/50">
                      Nunggak
                    </td>
                  </tr>

                  {/* Row 2D: Total Warga Setor Iuran (KK) */}
                  <tr className="bg-white border-b border-slate-200">
                    <td
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
                      className="px-3 py-2 text-right uppercase text-[10px] text-slate-700 font-bold sticky left-0 bg-white"
                    >
                      Total Warga Setor Iuran (KK):
                    </td>
                    {monthlyPayerCounts.map((cnt, mIdx) => (
                      <td
                        key={mIdx}
                        className="px-2 py-2 text-center font-mono text-[11px] text-slate-800 font-bold border-r border-slate-200"
                      >
                        {cnt > 0 ? `${cnt} KK` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-slate-800 border-r border-slate-200 bg-slate-100/70">
                      {grandTotalPayers} KK
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-slate-500 font-medium">
                      Ada Setoran
                    </td>
                  </tr>

                  {/* Row 3: Target Tagihan Bulanan */}
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
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
                      colSpan={
                        3 +
                        (activeOPS.id === 'all' ? 1 : 0) +
                        (hasSektor ? 1 : 0) +
                        (hasUnit ? 1 : 0) +
                        (hasRhun && !isOuwActive ? 1 : 0) +
                        (!isOuwActive ? 1 : 0)
                      }
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

            {/* Pagination for Matriks Iuran */}
            <Pagination
              currentPage={matriksPage}
              totalItems={filteredPelanggan.length}
              pageSize={matriksPageSize}
              onPageChange={setMatriksPage}
              onPageSizeChange={setMatriksPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="pelanggan matriks"
            />
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

      {/* SUBTAB 5: GRAFIK PENGHUNI RUMAH */}
      {activeSubTab === 'penghuni' && (
        <GrafikPenghuniRumah
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
