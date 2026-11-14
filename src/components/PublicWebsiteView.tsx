import React, { useState, useMemo } from 'react';
import {
  Lock,
  Menu,
  X,
  Users,
  Percent,
  Truck,
  Waves,
  PieChart as PieChartIcon,
  Recycle,
  ArrowRight,
  Building2,
  Calendar,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  OPSProfile,
  Pelanggan,
  PembayaranIuran,
  TransaksiPengangkutan,
  KomposisiConfig,
  TransaksiDaurUlang,
  KategoriDaurUlang,
} from '../types/ops';
import { ALL_OPS_PROFILE } from '../services/db';
import { SyncStatus } from '../services/cloudSync';
import {
  formatNumberID,
  isPelangganTargetDiBulan,
  getTarifPelangganBulan,
} from '../utils/format';
import { GrafikTrenPelanggan } from './GrafikTrenPelanggan';
import {
  GrafikPelangganTerlayaniPublik,
  computePelangganTerlayaniStats,
} from './GrafikPelangganTerlayaniPublik';
import { GrafikPenghuniRumah } from './GrafikPenghuniRumah';
import { GrafikTingkatPembayaranPublik } from './GrafikTingkatPembayaranPublik';
import { GrafikTrenSampah } from './GrafikTrenSampah';
import { GrafikCleanUpPantai } from './GrafikCleanUpPantai';
import { Logo3R } from './Logo3R';

interface Props {
  opsList: OPSProfile[];
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  pengangkutanList: TransaksiPengangkutan[];
  cleanupList: TransaksiPengangkutan[];
  transaksiDaurUlangList: TransaksiDaurUlang[];
  getKomposisiConfig: (opsId: string) => KomposisiConfig;
  cloudStatus: SyncStatus;
  onOpenPortalAdmin: () => void;
  isAdminLoggedIn?: boolean;
}

const DAUR_ULANG_CAT_COLORS: Record<KategoriDaurUlang, string> = {
  Plastik: '#0284c7',
  Kertas: '#d97706',
  Logam: '#4f46e5',
  Kaca: '#059669',
  Elektronik: '#0891b2',
  Lainnya: '#64748b',
};

export const PublicWebsiteView: React.FC<Props> = ({
  opsList,
  pelangganList,
  pembayaranList,
  pengangkutanList,
  cleanupList,
  transaksiDaurUlangList,
  getKomposisiConfig,
  cloudStatus,
  onOpenPortalAdmin,
  isAdminLoggedIn = false,
}) => {
  const [selectedOpsId, setSelectedOpsId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [komposisiPieMode, setKomposisiPieMode] = useState<'komposisi' | 'plastik'>('komposisi');

  const availableYears = useMemo(() => {
    const years = new Set<number>([2025, 2026]);
    pembayaranList.forEach(b => {
      if (b.tahun >= 2020 && b.tahun <= 2035) years.add(b.tahun);
    });
    pengangkutanList.forEach(p => {
      const y = Number(p.tanggal?.slice(0, 4));
      if (y >= 2020 && y <= 2035) years.add(y);
    });
    cleanupList.forEach(c => {
      const y = Number(c.tanggal?.slice(0, 4));
      if (y >= 2020 && y <= 2035) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [pembayaranList, pengangkutanList, cleanupList]);

  const activeOPS: OPSProfile = useMemo(() => {
    if (selectedOpsId === 'all') return ALL_OPS_PROFILE;
    return opsList.find(o => o.id === selectedOpsId) || ALL_OPS_PROFILE;
  }, [selectedOpsId, opsList]);

  const filteredPelanggan = useMemo(() => {
    if (selectedOpsId === 'all') return pelangganList;
    return pelangganList.filter(p => p.opsId === selectedOpsId);
  }, [pelangganList, selectedOpsId]);

  const filteredPembayaran = useMemo(() => {
    if (selectedOpsId === 'all') return pembayaranList;
    return pembayaranList.filter(b => b.opsId === selectedOpsId);
  }, [pembayaranList, selectedOpsId]);

  const filteredPengangkutan = useMemo(() => {
    if (selectedOpsId === 'all') return pengangkutanList;
    return pengangkutanList.filter(p => p.opsId === selectedOpsId);
  }, [pengangkutanList, selectedOpsId]);

  const filteredDaurUlang = useMemo(() => {
    return transaksiDaurUlangList.filter(t => {
      const matchOps = selectedOpsId === 'all' || t.opsId === selectedOpsId;
      const matchYear = t.tanggal?.startsWith(String(selectedYear));
      return matchOps && matchYear;
    });
  }, [transaksiDaurUlangList, selectedOpsId, selectedYear]);

  const komposisiConfig = useMemo(() => {
    return getKomposisiConfig(selectedOpsId);
  }, [getKomposisiConfig, selectedOpsId]);

  // Top KPI computations (Strictly non-financial)
  const kpi = useMemo(() => {
    const totalPelanggan = filteredPelanggan.length;
    const aktifPelanggan = filteredPelanggan.filter(p => p.status === 'Aktif');
    const totalAktif = aktifPelanggan.length;
    const retensiPct = totalPelanggan > 0 ? (totalAktif / totalPelanggan) * 100 : 100;

    const totalJiwa = aktifPelanggan
      .filter(p => p.kategori === 'Rumah Tangga')
      .reduce((sum, p) => {
        const j = Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga);
        return sum + (j > 0 ? j : 4);
      }, 0);

    // Compliance rate for selectedYear (KK paying vs target KK across 12 months)
    const payMap = new Map<string, PembayaranIuran>();
    for (let i = 0; i < filteredPembayaran.length; i++) {
      const b = filteredPembayaran[i];
      if (b.tahun === selectedYear) {
        payMap.set(`${b.pelangganId}_${b.bulan}`, b);
      }
    }

    let totalTargetSlots = 0;
    let totalBayarSlots = 0;
    let totalLunasSlots = 0;

    for (let m = 1; m <= 12; m++) {
      for (let i = 0; i < filteredPelanggan.length; i++) {
        const p = filteredPelanggan[i];
        if (!isPelangganTargetDiBulan(p, selectedYear, m)) continue;
        totalTargetSlots++;
        const byr = payMap.get(`${p.id}_${m}`);
        const amt = byr?.jumlah || 0;
        const tarif = getTarifPelangganBulan(p, selectedYear, m);
        if (amt >= tarif && amt > 0) {
          totalLunasSlots++;
          totalBayarSlots++;
        } else if (amt > 0) {
          totalBayarSlots++;
        }
      }
    }

    const tingkatBayarPct = totalTargetSlots > 0 ? (totalBayarSlots / totalTargetSlots) * 100 : 0;
    const tingkatLunasPct = totalTargetSlots > 0 ? (totalLunasSlots / totalTargetSlots) * 100 : 0;

    // Waste hauled in selectedYear
    const yearHauls = filteredPengangkutan.filter(p => p.tanggal?.startsWith(String(selectedYear)));
    const totalBeratKg = yearHauls.reduce((s, it) => {
      const orgAnorg = (it.beratOrganikKg || 0) + (it.beratAnorganikKg || 0);
      return s + (orgAnorg > 0 ? orgAnorg : it.beratCampurKg || 0);
    }, 0);
    const totalVolumeM3 = yearHauls.reduce(
      (s, it) => s + (it.volumeOrganikM3 || 0) + (it.volumeAnorganikM3 || 0),
      0
    );

    // Clean-up Pantai in selectedYear
    const yearCleanups = cleanupList.filter(c => c.tanggal?.startsWith(String(selectedYear)));
    const totalCleanupKg = yearCleanups.reduce(
      (s, it) => s + (it.beratDaurUlangKg || 0) + (it.beratPlastikKg || 0) + (it.beratResiduKg || 0),
      0
    );
    const totalRelawan = yearCleanups.reduce(
      (s, it) => s + (it.jumlahRelawan || it.pelangganTerlayani || 0),
      0
    );

    // Daur Ulang weight in selectedYear (Kg only, no Rupiah)
    const totalDaurUlangMasukKg = filteredDaurUlang
      .filter(t => t.tipe === 'masuk')
      .reduce((s, t) => s + (t.beratKg || 0), 0);

    return {
      totalPelanggan,
      totalAktif,
      retensiPct,
      totalJiwa,
      tingkatBayarPct,
      tingkatLunasPct,
      totalBeratKg,
      totalVolumeM3,
      totalRitase: yearHauls.length,
      totalCleanupKg,
      totalCleanupAksi: yearCleanups.length,
      totalRelawan,
      totalDaurUlangMasukKg,
    };
  }, [filteredPelanggan, filteredPembayaran, filteredPengangkutan, cleanupList, filteredDaurUlang, selectedYear]);

  const terlayaniStats = useMemo(
    () =>
      computePelangganTerlayaniStats(
        activeOPS,
        opsList,
        pelangganList,
        pengangkutanList,
        selectedYear
      ),
    [activeOPS, opsList, pelangganList, pengangkutanList, selectedYear]
  );

  // Komposisi 7 Fraksi & 7 Polimer Plastik (Non-financial weights)
  const komposisiBreakdown = useMemo(() => {
    const totalSampahKg = kpi.totalBeratKg;
    const fraksi = [
      { name: 'Organik', value: Number(((totalSampahKg * komposisiConfig.organikPct) / 100).toFixed(1)), pct: komposisiConfig.organikPct, color: '#10b981' },
      { name: 'Plastik', value: Number(((totalSampahKg * komposisiConfig.plastikPct) / 100).toFixed(1)), pct: komposisiConfig.plastikPct, color: '#eab308' },
      { name: 'Kertas', value: Number(((totalSampahKg * komposisiConfig.kertasPct) / 100).toFixed(1)), pct: komposisiConfig.kertasPct, color: '#3b82f6' },
      { name: 'Popok & Pembalut', value: Number(((totalSampahKg * komposisiConfig.popokPembalutPct) / 100).toFixed(1)), pct: komposisiConfig.popokPembalutPct, color: '#f43f5e' },
      { name: 'Lain-lain', value: Number(((totalSampahKg * komposisiConfig.lainnyaPct) / 100).toFixed(1)), pct: komposisiConfig.lainnyaPct, color: '#475569' },
      { name: 'Logam', value: Number(((totalSampahKg * komposisiConfig.logamPct) / 100).toFixed(1)), pct: komposisiConfig.logamPct, color: '#f97316' },
      { name: 'Kaca', value: Number(((totalSampahKg * komposisiConfig.kacaPct) / 100).toFixed(1)), pct: komposisiConfig.kacaPct, color: '#06b6d4' },
    ];

    const totalPlastikKg = (totalSampahKg * komposisiConfig.plastikPct) / 100;
    const plastik = [
      { name: 'PP (5)', value: Number(((totalPlastikKg * komposisiConfig.ppPct) / 100).toFixed(1)), pct: komposisiConfig.ppPct, color: '#db2777' },
      { name: 'LDPE (4)', value: Number(((totalPlastikKg * komposisiConfig.ldpePct) / 100).toFixed(1)), pct: komposisiConfig.ldpePct, color: '#7c3aed' },
      { name: 'Multilayer (7)', value: Number(((totalPlastikKg * komposisiConfig.plastikLainPct) / 100).toFixed(1)), pct: komposisiConfig.plastikLainPct, color: '#64748b' },
      { name: 'PET (1)', value: Number(((totalPlastikKg * komposisiConfig.petPct) / 100).toFixed(1)), pct: komposisiConfig.petPct, color: '#0284c7' },
      { name: 'HDPE (2)', value: Number(((totalPlastikKg * komposisiConfig.hdpePct) / 100).toFixed(1)), pct: komposisiConfig.hdpePct, color: '#059669' },
      { name: 'PVC (3)', value: Number(((totalPlastikKg * komposisiConfig.pvcPct) / 100).toFixed(1)), pct: komposisiConfig.pvcPct, color: '#d97706' },
      { name: 'PS (6)', value: Number(((totalPlastikKg * komposisiConfig.psPct) / 100).toFixed(1)), pct: komposisiConfig.psPct, color: '#ea580c' },
    ];

    return { totalSampahKg, totalPlastikKg, fraksi, plastik };
  }, [kpi.totalBeratKg, komposisiConfig]);

  // Daur ulang by category (Weights only — NO Rupiah)
  const daurUlangByCategory = useMemo(() => {
    const map = new Map<KategoriDaurUlang, { kategori: KategoriDaurUlang; masukKg: number; keluarKg: number }>();
    const cats: KategoriDaurUlang[] = ['Plastik', 'Kertas', 'Logam', 'Kaca', 'Elektronik', 'Lainnya'];
    cats.forEach(c => map.set(c, { kategori: c, masukKg: 0, keluarKg: 0 }));

    filteredDaurUlang.forEach(t => {
      const entry = map.get(t.kategori) || { kategori: t.kategori, masukKg: 0, keluarKg: 0 };
      if (t.tipe === 'masuk') {
        entry.masukKg += t.beratKg || 0;
      } else {
        entry.keluarKg += t.beratKg || 0;
      }
      map.set(t.kategori, entry);
    });

    return Array.from(map.values()).filter(d => d.masukKg > 0 || d.keluarKg > 0);
  }, [filteredDaurUlang]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-emerald-600 selection:text-white flex flex-col">
      {/* 1. Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Clean single-line Brand */}
          <a
            href="#ringkasan"
            onClick={e => {
              e.preventDefault();
              scrollToSection('ringkasan');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <Logo3R className="w-10 h-10 shrink-0" />
            <span className="flex flex-col leading-[1.15] min-w-0">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-wider text-emerald-800 whitespace-nowrap">
                SISTEM INFORMASI
              </span>
              <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 truncate max-w-[200px] sm:max-w-none">
                ORGANISASI PENGELOLA SAMPAH (OPS)
              </span>
            </span>
          </a>

          {/* Zone 2: Concise single-line Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('ringkasan')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Ringkasan
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pelanggan')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Data Pelanggan
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pembayaran')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Tingkat Bayar
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('sampah')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Pengelolaan Sampah
            </button>
          </nav>

          {/* Zone 3: Single Primary CTA + Mobile Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenPortalAdmin}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAdminLoggedIn ? 'Kembali ke Portal Admin' : 'Portal Admin'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              aria-label="Buka Menu Navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <button
              type="button"
              onClick={() => scrollToSection('ringkasan')}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ringkasan
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pelanggan')}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Data Pelanggan
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pembayaran')}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tingkat Bayar
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('sampah')}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Pengelolaan Sampah
            </button>
            <button
              type="button"
              onClick={onOpenPortalAdmin}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-bold"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAdminLoggedIn ? 'Kembali ke Portal Admin' : 'Masuk Portal Admin'}</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero & Interactive Filter Section */}
        <section id="ringkasan" className="bg-white border-b border-slate-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
            <div className="space-y-8">
              <div className="max-w-3xl space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Data Operasional Publik · {cloudStatus === 'connected' ? 'Tersinkronisasi Cloud' : 'Database Aktif'}
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-slate-900 leading-[1.15] text-balance">
                  Transparansi Layanan &amp; Pengelolaan Sampah OPS
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Pantau perkembangan pelanggan terlayani, persentase kepatuhan pembayaran iuran, volume pengangkutan sampah, komposisi fraksi, serta aksi bersih pesisir secara terbuka. Data status keuangan internal hanya tersedia pada Portal Admin.
                </p>
              </div>

              {/* Interactive Filter Panel (Enlarged + Visitor Guidance) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
                      <SlidersHorizontal className="w-5 h-5 text-emerald-700 shrink-0" />
                      <h2>Pilih Data yang Ingin Ditampilkan</h2>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                      <span className="font-semibold text-slate-800">Petunjuk pengunjung:</span> Pilih{' '}
                      <span className="font-bold text-emerald-800">Semua OPS (Data Gabungan)</span> untuk melihat akumulasi data seluruh wilayah, atau pilih salah satu{' '}
                      <span className="font-bold text-slate-800">Unit Pengelola (OPS)</span> untuk menampilkan grafik dan statistik khusus wilayah tersebut.
                    </p>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap shrink-0 flex items-center gap-1.5 pt-0.5">
                    <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Aktif:{' '}
                      <strong className="text-slate-900">
                        {selectedOpsId === 'all' ? 'Gabungan Semua OPS' : activeOPS.nama}
                      </strong>{' '}
                      · <strong className="font-mono tabular-nums text-slate-900">{selectedYear}</strong>
                    </span>
                  </div>
                </div>

                {/* Primary Enlarged Selectors */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                  <div className="lg:col-span-8 space-y-2">
                    <label
                      htmlFor="public-ops-select"
                      className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700"
                    >
                      <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>1. Cakupan Wilayah / Unit Pengelola (OPS)</span>
                    </label>
                    <select
                      id="public-ops-select"
                      value={selectedOpsId}
                      onChange={e => setSelectedOpsId(e.target.value)}
                      className="w-full min-h-[52px] px-4 py-3 bg-white border-2 border-slate-300 hover:border-emerald-600 rounded-xl text-sm sm:text-base font-bold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/30 focus:outline-hidden cursor-pointer transition-colors"
                    >
                      <option value="all">Semua OPS (Data Gabungan Seluruh Wilayah)</option>
                      {opsList.map(ops => (
                        <option key={ops.id} value={ops.id}>
                          Per OPS — {ops.nama} ({ops.kode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-4 space-y-2">
                    <label
                      htmlFor="public-year-select"
                      className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700"
                    >
                      <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>2. Tahun Data</span>
                    </label>
                    <select
                      id="public-year-select"
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      className="w-full min-h-[52px] px-4 py-3 bg-white border-2 border-slate-300 hover:border-emerald-600 rounded-xl text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/30 focus:outline-hidden cursor-pointer transition-colors"
                    >
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>
                          Tahun {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick-Switch Mode Buttons (Gabungan vs Per OPS) */}
                {opsList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-slate-500">
                      Pilihan cepat tampilan (Gabungan atau per OPS):
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOpsId('all')}
                        className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          selectedOpsId === 'all'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-800'
                        }`}
                      >
                        Semua OPS (Gabungan)
                      </button>
                      {opsList.map(ops => (
                        <button
                          key={ops.id}
                          type="button"
                          onClick={() => setSelectedOpsId(ops.id)}
                          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            selectedOpsId === ops.id
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-800'
                          }`}
                        >
                          {ops.nama}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4 Key Non-Financial Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-200">
              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Pelanggan Terlayani ({selectedYear})</span>
                  <Users className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {formatNumberID(terlayaniStats.avgServedOverall, 0)}{' '}
                  <span className="text-sm font-semibold text-slate-500 font-sans">KK/bln</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  {formatNumberID(terlayaniStats.coverageOverall, 1)}% dari {formatNumberID(kpi.totalAktif, 0)} KK aktif · {formatNumberID(kpi.totalJiwa, 0)} jiwa
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Tingkat Pembayaran ({selectedYear})</span>
                  <Percent className="w-4 h-4 text-teal-700" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-800 font-mono tabular-nums">
                  {formatNumberID(kpi.tingkatBayarPct, 1)}%
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  {formatNumberID(kpi.tingkatLunasPct, 1)}% lunas penuh · tanpa data nominal
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Sampah Pemukiman ({selectedYear})</span>
                  <Truck className="w-4 h-4 text-sky-700" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {formatNumberID(kpi.totalBeratKg / 1000, 2)}{' '}
                  <span className="text-sm font-semibold text-slate-500 font-sans">Ton</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  {formatNumberID(kpi.totalVolumeM3, 1)} m³ · {formatNumberID(kpi.totalRitase, 0)} ritase terangkut
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Clean-up &amp; Daur Ulang ({selectedYear})</span>
                  <Waves className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {formatNumberID(kpi.totalCleanupKg + kpi.totalDaurUlangMasukKg, 0)}{' '}
                  <span className="text-sm font-semibold text-slate-500 font-sans">Kg</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  {kpi.totalCleanupAksi} aksi pesisir ({kpi.totalRelawan} relawan) · {formatNumberID(kpi.totalDaurUlangMasukKg, 0)} kg pilah
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Sections Container */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
          {/* SECTION 1: DATA PELANGGAN & DEMOGRAFI */}
          <section id="pelanggan" className="scroll-mt-24 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  01 · Basis Layanan Warga
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Data Pelanggan Terlayani, Pertumbuhan &amp; Demografi
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Unit: <strong className="text-slate-800">{activeOPS.nama}</strong> · Tahun {selectedYear}
              </span>
            </div>

            <div className="space-y-6">
              <GrafikPelangganTerlayaniPublik
                activeOPS={activeOPS}
                opsList={opsList}
                pelangganList={pelangganList}
                pengangkutanList={pengangkutanList}
                selectedYear={selectedYear}
              />

              <GrafikTrenPelanggan
                activeOPS={activeOPS}
                pelangganList={filteredPelanggan}
                selectedYear={selectedYear}
              />

              <GrafikPenghuniRumah
                activeOPS={activeOPS}
                pelangganList={filteredPelanggan}
                selectedYear={selectedYear}
                publicMode={true}
              />
            </div>
          </section>

          {/* SECTION 2: TINGKAT PEMBAYARAN IURAN (TANPA STATUS KEUANGAN) */}
          <section id="pembayaran" className="scroll-mt-24 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  02 · Partisipasi Iuran
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Tingkat Pembayaran Iuran Pelanggan
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Hanya menampilkan rasio kepatuhan KK · Status keuangan diproteksi
              </span>
            </div>

            <GrafikTingkatPembayaranPublik
              activeOPS={activeOPS}
              opsList={opsList}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              selectedYear={selectedYear}
            />
          </section>

          {/* SECTION 3: PENGELOLAAN SAMPAH, KOMPOSISI & CLEAN-UP PANTAI */}
          <section id="sampah" className="scroll-mt-24 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  03 · Operasional &amp; Lingkungan
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Pengelolaan Sampah, Komposisi &amp; Clean-up Pantai
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Volume m³ · Berat Ton/Kg · Komposisi Fraksi &amp; Daur Ulang
              </span>
            </div>

            <div className="space-y-6">
              <GrafikTrenSampah
                activeOPS={activeOPS}
                pengangkutanList={filteredPengangkutan}
                selectedYear={selectedYear}
              />

              {/* Komposisi 7 Fraksi & Daur Ulang Berat (Non-Finansial) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Komposisi 7 Fraksi / 7 Plastik */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-700" />
                        <span>
                          {komposisiPieMode === 'komposisi'
                            ? `Komposisi 7 Fraksi Sampah (${selectedYear})`
                            : `Karakterisasi 7 Jenis Plastik (${selectedYear})`}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Estimasi distribusi bobot material dari {formatNumberID(komposisiBreakdown.totalSampahKg / 1000, 2)} Ton sampah terangkut
                      </p>
                    </div>

                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setKomposisiPieMode('komposisi')}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          komposisiPieMode === 'komposisi'
                            ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        7 Fraksi
                      </button>
                      <button
                        type="button"
                        onClick={() => setKomposisiPieMode('plastik')}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          komposisiPieMode === 'plastik'
                            ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        7 Plastik
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={komposisiPieMode === 'komposisi' ? komposisiBreakdown.fraksi : komposisiBreakdown.plastik}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={2.5}
                            dataKey="value"
                          >
                            {(komposisiPieMode === 'komposisi'
                              ? komposisiBreakdown.fraksi
                              : komposisiBreakdown.plastik
                            ).map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(val: any, name: any, item: any) => [
                              `${formatNumberID(Number(val), 1)} kg (${item.payload.pct}%)`,
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {komposisiPieMode === 'komposisi' ? 'Total' : 'Plastik'}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                          {formatNumberID(
                            (komposisiPieMode === 'komposisi'
                              ? komposisiBreakdown.totalSampahKg
                              : komposisiBreakdown.totalPlastikKg) / 1000,
                            2
                          )}{' '}
                          Ton
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-7 space-y-2">
                      {(komposisiPieMode === 'komposisi'
                        ? komposisiBreakdown.fraksi
                        : komposisiBreakdown.plastik
                      ).map(item => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                          </div>
                          <div className="font-mono tabular-nums text-right shrink-0">
                            <span className="font-bold text-slate-900">{formatNumberID(item.value, 1)} kg</span>
                            <span className="text-slate-400 ml-2">{item.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Timbangan Sampah Daur Ulang (Berat Kg Saja, Tanpa Nilai Rupiah) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Recycle className="w-4 h-4 text-emerald-700" />
                      <span>Pemilahan Sampah Daur Ulang ({selectedYear})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total berat material terpilah per kategori (Kg) tanpa data harga atau nilai penjualan.
                    </p>
                  </div>

                  {daurUlangByCategory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
                      <Recycle className="w-8 h-8 text-slate-300 mb-2" />
                      Belum ada catatan pemilahan daur ulang pada periode ini.
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={daurUlangByCategory}
                          margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="kategori"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={val => `${val} kg`}
                          />
                          <RechartsTooltip
                            formatter={(val: any, name: any) => [
                              `${formatNumberID(Number(val), 1)} kg`,
                              name,
                            ]}
                          />
                          <Bar dataKey="masukKg" name="Timbang Masuk (Kg)" radius={[4, 4, 0, 0]}>
                            {daurUlangByCategory.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={DAUR_ULANG_CAT_COLORS[entry.kategori] || '#059669'}
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="keluarKg" name="Tersalurkan (Kg)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Total Terpilah Masuk:</span>
                    <span className="font-mono font-bold text-emerald-800 tabular-nums">
                      {formatNumberID(kpi.totalDaurUlangMasukKg, 1)} kg
                    </span>
                  </div>
                </div>
              </div>

              <GrafikCleanUpPantai
                cleanupList={cleanupList}
                selectedYear={selectedYear}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 leading-snug">
              <div className="text-xs font-extrabold tracking-wider text-emerald-800">
                SISTEM INFORMASI
              </div>
              <div>ORGANISASI PENGELOLA SAMPAH (OPS)</div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Beranda publik menampilkan data layanan, kepatuhan iuran (%), dan operasional sampah. Status keuangan internal hanya dapat diakses melalui Portal Admin.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPortalAdmin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:border-emerald-700 hover:text-emerald-800 bg-white text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isAdminLoggedIn ? 'Kembali ke Portal Admin' : 'Masuk Portal Admin'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
