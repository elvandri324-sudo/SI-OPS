import React, { useState, useMemo } from 'react';
import {
  OPSProfile,
  Pelanggan,
  TransaksiPengangkutan,
  TransaksiKas,
  PembayaranIuran,
  KomposisiConfig,
} from '../types/ops';
import {
  formatRupiah,
  formatNumberID,
  formatDateID,
  terbilang,
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  downloadCSV,
  getTarifPelangganBulan,
  isPelangganTargetDiBulan,
  hitungTargetTagihanPelangganSetahun,
  hitungBulanTargetPelangganSetahun,
} from '../utils/format';
import { downloadPDF } from '../utils/pdfExport';
import {
  Printer,
  FileText,
  CreditCard,
  Download,
  Building2,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  activeOPS: OPSProfile;
  pelangganList: Pelanggan[];
  pengangkutanList: TransaksiPengangkutan[];
  kasList: TransaksiKas[];
  pembayaranList: PembayaranIuran[];
  komposisiConfig: KomposisiConfig;
  selectedYear: number;
}

export const CetakLaporanView: React.FC<Props> = ({
  activeOPS,
  pelangganList,
  pengangkutanList,
  kasList,
  pembayaranList,
  komposisiConfig,
  selectedYear,
}) => {
  const [templateType, setTemplateType] = useState<'laporanBulanan' | 'kwitansiIuran'>('laporanBulanan');
  // selectedBulan: 0 = 1 Tahun Penuh (Jan - Des), 1..12 = Bulan spesifik
  const [selectedBulan, setSelectedBulan] = useState<number>(3); // Default Maret
  const [selectedPelangganId, setSelectedPelangganId] = useState<string>('all');
  const [kwitansiBulan, setKwitansiBulan] = useState<number>(3);

  const isTahunan = selectedBulan === 0;
  const bulanStr = String(selectedBulan).padStart(2, '0');
  const monthName = isTahunan ? `Tahun Penuh ${selectedYear}` : MONTH_NAMES_ID[selectedBulan - 1];

  // Periode data filtering
  const periodHauls = useMemo(() => {
    if (isTahunan) {
      return pengangkutanList.filter(p => p.tanggal.startsWith(String(selectedYear)));
    }
    return pengangkutanList.filter(p => p.tanggal.startsWith(`${selectedYear}-${bulanStr}`));
  }, [pengangkutanList, isTahunan, selectedYear, bulanStr]);

  const periodKas = useMemo(() => {
    if (isTahunan) {
      return kasList.filter(k => k.tanggal.startsWith(String(selectedYear)));
    }
    return kasList.filter(k => k.tanggal.startsWith(`${selectedYear}-${bulanStr}`));
  }, [kasList, isTahunan, selectedYear, bulanStr]);

  const periodPayments = useMemo(() => {
    if (isTahunan) {
      return pembayaranList.filter(b => b.tahun === selectedYear);
    }
    return pembayaranList.filter(b => b.tahun === selectedYear && b.bulan === selectedBulan);
  }, [pembayaranList, isTahunan, selectedYear, selectedBulan]);

  // Customers relevant to active OPS
  const relevantPelanggan = useMemo(() => {
    return pelangganList.filter(p => activeOPS.id === 'all' || p.opsId === activeOPS.id);
  }, [pelangganList, activeOPS.id]);

  const activePelanggan = useMemo(() => {
    return relevantPelanggan.filter(p => p.status === 'Aktif');
  }, [relevantPelanggan]);

  // Operational metrics for the period
  const totalRit = periodHauls.length;
  const totalServed = periodHauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0);
  const avgServed = totalRit > 0 ? Math.round(totalServed / totalRit) : 0;

  const totalVolOrg = periodHauls.reduce((s, it) => s + (it.volumeOrganikM3 || 0), 0);
  const totalBeratOrg = periodHauls.reduce((s, it) => s + (it.beratOrganikKg || 0), 0);
  const totalVolAnorg = periodHauls.reduce((s, it) => s + (it.volumeAnorganikM3 || 0), 0);
  const totalBeratAnorg = periodHauls.reduce((s, it) => s + (it.beratAnorganikKg || 0), 0);
  const totalSampahKg = totalBeratOrg + totalBeratAnorg;
  const totalSampahTon = totalSampahKg / 1000;

  // Composition estimates
  const beratOrganik = (totalSampahKg * komposisiConfig.organikPct) / 100;
  const beratPlastik = (totalSampahKg * komposisiConfig.plastikPct) / 100;
  const beratKertas = (totalSampahKg * komposisiConfig.kertasPct) / 100;
  const beratKaca = (totalSampahKg * komposisiConfig.kacaPct) / 100;
  const beratLogam = (totalSampahKg * komposisiConfig.logamPct) / 100;

  // Arus kas metrics
  const totalPemasukan = periodKas.reduce((s, it) => s + (it.pemasukan || 0), 0);
  const totalPengeluaran = periodKas.reduce((s, it) => s + (it.pengeluaran || 0), 0);
  const netBulan = totalPemasukan - totalPengeluaran;

  const lastPeriodKasItem = periodKas[periodKas.length - 1];
  const saldoAkhir = lastPeriodKasItem?.saldo ?? (kasList[kasList.length - 1]?.saldo || 0);

  // --- REKAPITULASI IURAN (TAGIHAN vs REALISASI TERKUMPUL) ---
  // Monthly array 12 months for 1-year view or deep monthly drill-down
  const monthlyIuranData = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const targetWarga = relevantPelanggan.filter(p => isPelangganTargetDiBulan(p, selectedYear, m));
      const targetTagihan = targetWarga.reduce(
        (sum, p) => sum + getTarifPelangganBulan(p, selectedYear, m),
        0
      );
      let realisasiIuran = 0;
      let wargaBayarCount = 0;
      let lunasCount = 0;
      let cicilCount = 0;
      let belumBayarCount = 0;

      relevantPelanggan.forEach(p => {
        const b = pembayaranList.find(
          pay => pay.pelangganId === p.id && pay.tahun === selectedYear && pay.bulan === m
        );
        const amount = b?.jumlah || 0;
        const tarif = getTarifPelangganBulan(p, selectedYear, m);
        const isTarget = isPelangganTargetDiBulan(p, selectedYear, m);

        if (amount > 0) {
          realisasiIuran += amount;
          wargaBayarCount++;
        }

        if (isTarget) {
          if (amount >= tarif && amount > 0) {
            lunasCount++;
          } else if (amount > 0 && amount < tarif) {
            cicilCount++;
          } else {
            belumBayarCount++;
          }
        }
      });

      const persentase = targetTagihan > 0 ? (realisasiIuran / targetTagihan) * 100 : 0;
      const tunggakan = Math.max(0, targetTagihan - realisasiIuran);

      return {
        monthNum: m,
        namaBulan: MONTH_NAMES_ID[idx],
        namaBulanShort: MONTH_SHORT_ID[idx],
        targetWargaCount: targetWarga.length,
        targetTagihan,
        realisasiIuran,
        persentase,
        tunggakan,
        lunasCount,
        cicilCount,
        belumBayarCount,
        wargaBayarCount,
      };
    });
  }, [relevantPelanggan, pembayaranList, selectedYear]);

  // Overall Tagihan & Realisasi according to selected period
  const {
    targetTagihanPeriode,
    realisasiIuranPeriode,
    persentasePeriode,
    tunggakanPeriode,
    kkLunasPeriode,
    kkCicilPeriode,
    kkBelumBayarPeriode,
    targetKKPeriode,
  } = useMemo(() => {
    if (isTahunan) {
      const targetTagihan = monthlyIuranData.reduce((s, m) => s + m.targetTagihan, 0);
      const realisasiIuran = monthlyIuranData.reduce((s, m) => s + m.realisasiIuran, 0);
      const persentase = targetTagihan > 0 ? (realisasiIuran / targetTagihan) * 100 : 0;
      const tunggakan = Math.max(0, targetTagihan - realisasiIuran);

      const payingCustomerIds = new Set<string>();
      relevantPelanggan.forEach(p => {
        for (let m = 1; m <= 12; m++) {
          const byr = pembayaranList.find(b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === m);
          if (byr && (byr.jumlah || 0) > 0) {
            payingCustomerIds.add(p.id);
            break;
          }
        }
      });

      return {
        targetTagihanPeriode: targetTagihan,
        realisasiIuranPeriode: realisasiIuran,
        persentasePeriode: persentase,
        tunggakanPeriode: tunggakan,
        kkLunasPeriode: payingCustomerIds.size,
        kkCicilPeriode: 0,
        kkBelumBayarPeriode: Math.max(0, activePelanggan.length - payingCustomerIds.size),
        targetKKPeriode: activePelanggan.length,
      };
    } else {
      const mData = monthlyIuranData[selectedBulan - 1] || {
        targetTagihan: 0,
        realisasiIuran: 0,
        persentase: 0,
        tunggakan: 0,
        lunasCount: 0,
        cicilCount: 0,
        belumBayarCount: 0,
        targetWargaCount: 0,
      };

      return {
        targetTagihanPeriode: mData.targetTagihan,
        realisasiIuranPeriode: mData.realisasiIuran,
        persentasePeriode: mData.persentase,
        tunggakanPeriode: mData.tunggakan,
        kkLunasPeriode: mData.lunasCount,
        kkCicilPeriode: mData.cicilCount,
        kkBelumBayarPeriode: mData.belumBayarCount,
        targetKKPeriode: mData.targetWargaCount,
      };
    }
  }, [isTahunan, monthlyIuranData, selectedBulan, activePelanggan.length, relevantPelanggan, pembayaranList, selectedYear]);

  // Breakdown by customer category (Rumah Tangga vs Non Rumah Tangga)
  const kategoriBreakdown = useMemo(() => {
    const isTargetInSelected = (p: Pelanggan) => {
      if (isTahunan) {
        return hitungBulanTargetPelangganSetahun(p, selectedYear) > 0;
      }
      return isPelangganTargetDiBulan(p, selectedYear, selectedBulan);
    };

    const rtPelanggan = relevantPelanggan.filter(
      p => p.kategori === 'Rumah Tangga' && isTargetInSelected(p)
    );
    const nonRtPelanggan = relevantPelanggan.filter(
      p => p.kategori !== 'Rumah Tangga' && isTargetInSelected(p)
    );

    const calcTarget = (list: Pelanggan[]) => {
      if (isTahunan) {
        return list.reduce((s, p) => s + hitungTargetTagihanPelangganSetahun(p, selectedYear), 0);
      }
      return list.reduce((s, p) => s + getTarifPelangganBulan(p, selectedYear, selectedBulan), 0);
    };

    const rtTarget = calcTarget(rtPelanggan);
    const nonRtTarget = calcTarget(nonRtPelanggan);

    const calcCategoryRealisasi = (list: Pelanggan[]) => {
      if (isTahunan) {
        return Array.from({ length: 12 }, (_, mIdx) => mIdx + 1).reduce((sumM, m) => {
          return sumM + list.reduce((sumP, p) => {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === m
            );
            return sumP + (byr?.jumlah || 0);
          }, 0);
        }, 0);
      } else {
        return list.reduce((sumP, p) => {
          const byr = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === selectedBulan
          );
          return sumP + (byr?.jumlah || 0);
        }, 0);
      }
    };

    const rtRealisasi = calcCategoryRealisasi(rtPelanggan);
    const nonRtRealisasi = calcCategoryRealisasi(nonRtPelanggan);

    const rtPersen = rtTarget > 0 ? (rtRealisasi / rtTarget) * 100 : 0;
    const nonRtPersen = nonRtTarget > 0 ? (nonRtRealisasi / nonRtTarget) * 100 : 0;

    const rtTunggakan = Math.max(0, rtTarget - rtRealisasi);
    const nonRtTunggakan = Math.max(0, nonRtTarget - nonRtRealisasi);

    const countLunas = (list: Pelanggan[]) => {
      if (isTahunan) {
        return list.filter(p => {
          const target = hitungTargetTagihanPelangganSetahun(p, selectedYear);
          let paid = 0;
          for (let m = 1; m <= 12; m++) {
            const byr = pembayaranList.find(
              b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === m
            );
            paid += byr?.jumlah || 0;
          }
          return paid >= target && target > 0;
        }).length;
      } else {
        return list.filter(p => {
          const tarif = getTarifPelangganBulan(p, selectedYear, selectedBulan);
          const pay = pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === selectedBulan
          );
          return (pay?.jumlah || 0) >= tarif && (pay?.jumlah || 0) > 0;
        }).length;
      }
    };

    return {
      rtTargetCount: rtPelanggan.length,
      rtTarget,
      rtRealisasi,
      rtPersen,
      rtTunggakan,
      rtLunas: countLunas(rtPelanggan),
      nonRtTargetCount: nonRtPelanggan.length,
      nonRtTarget,
      nonRtRealisasi,
      nonRtPersen,
      nonRtTunggakan,
      nonRtLunas: countLunas(nonRtPelanggan),
    };
  }, [relevantPelanggan, isTahunan, selectedYear, selectedBulan, periodPayments]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (templateType === 'laporanBulanan') {
      const titleText = isTahunan
        ? `LAPORAN TAHUNAN PENGELOLAAN SAMPAH & KEUANGAN`
        : `LAPORAN BULANAN PENGELOLAAN SAMPAH & KEUANGAN`;
      const subtitleText = isTahunan
        ? `Organisasi: ${activeOPS.nama} | Periode: Tahun ${selectedYear} (1 Tahun Penuh)`
        : `Organisasi: ${activeOPS.nama} | Periode: Bulan ${monthName} ${selectedYear}`;
      const filenameText = isTahunan
        ? `Laporan_Tahunan_${activeOPS.kode}_${selectedYear}.pdf`
        : `Laporan_Bulanan_${activeOPS.kode}_${monthName}_${selectedYear}.pdf`;

      // Extra table for Iuran
      const iuranTable = isTahunan
        ? {
            title: `REKAPITULASI TARGET & REALISASI IURAN PER BULAN (TAHUN ${selectedYear})`,
            headers: [
              'No',
              'Bulan',
              'Target KK',
              'Target Tagihan (Rp)',
              'Iuran Terkumpul (Rp)',
              '% Capaian',
              'Sisa Tunggakan (Rp)',
            ],
            rows: monthlyIuranData.map((m, idx) => [
              idx + 1,
              m.namaBulan,
              `${m.targetWargaCount} KK`,
              formatRupiah(m.targetTagihan, false),
              formatRupiah(m.realisasiIuran, false),
              `${m.persentase.toFixed(1)}%`,
              m.tunggakan > 0 ? formatRupiah(m.tunggakan, false) : '-',
            ]),
            footRows: [
              [
                'TOTAL',
                '1 TAHUN PENUH',
                `${targetKKPeriode} KK`,
                formatRupiah(targetTagihanPeriode, false),
                formatRupiah(realisasiIuranPeriode, false),
                `${persentasePeriode.toFixed(1)}%`,
                formatRupiah(tunggakanPeriode, false),
              ],
            ],
          }
        : {
            title: `REKAPITULASI TARGET & REALISASI IURAN (BULAN ${monthName.toUpperCase()} ${selectedYear})`,
            headers: [
              'Kategori Pelanggan',
              'Target KK',
              'Target Tagihan (Rp)',
              'Iuran Terkumpul (Rp)',
              '% Realisasi',
              'Sisa Tunggakan (Rp)',
            ],
            rows: [
              [
                'Rumah Tangga',
                `${kategoriBreakdown.rtTargetCount} KK`,
                formatRupiah(kategoriBreakdown.rtTarget, false),
                formatRupiah(kategoriBreakdown.rtRealisasi, false),
                `${kategoriBreakdown.rtPersen.toFixed(1)}%`,
                formatRupiah(kategoriBreakdown.rtTunggakan, false),
              ],
              [
                'Non Rumah Tangga',
                `${kategoriBreakdown.nonRtTargetCount} Unit`,
                formatRupiah(kategoriBreakdown.nonRtTarget, false),
                formatRupiah(kategoriBreakdown.nonRtRealisasi, false),
                `${kategoriBreakdown.nonRtPersen.toFixed(1)}%`,
                formatRupiah(kategoriBreakdown.nonRtTunggakan, false),
              ],
            ],
            footRows: [
              [
                'TOTAL AKUMULASI',
                `${targetKKPeriode} Pelanggan`,
                formatRupiah(targetTagihanPeriode, false),
                formatRupiah(realisasiIuranPeriode, false),
                `${persentasePeriode.toFixed(1)}%`,
                formatRupiah(tunggakanPeriode, false),
              ],
            ],
          };

      downloadPDF({
        filename: filenameText,
        title: titleText,
        subtitle: subtitleText,
        opsName: activeOPS.nama,
        orientation: 'portrait',
        summaryItems: [
          { label: 'Pelanggan Aktif', value: `${activePelanggan.length} KK` },
          {
            label: 'Total Sampah Terangkut',
            value: `${formatNumberID(totalSampahKg, 1)} Kg (${formatNumberID(totalSampahTon, 2)} Ton)`,
          },
          { label: 'Target Tagihan Iuran', value: formatRupiah(targetTagihanPeriode, false) },
          {
            label: 'Iuran Terkumpul (Realisasi)',
            value: `${formatRupiah(realisasiIuranPeriode, false)} (${persentasePeriode.toFixed(1)}%)`,
          },
          { label: 'Sisa Tunggakan Iuran', value: formatRupiah(tunggakanPeriode, false) },
          { label: 'Total Pemasukan Kas', value: formatRupiah(totalPemasukan, false) },
          { label: 'Total Pengeluaran Kas', value: formatRupiah(totalPengeluaran, false) },
          { label: 'Saldo Akhir Kas', value: formatRupiah(saldoAkhir, false) },
        ],
        headers: ['Parameter Pengangkutan', 'Satuan', 'Organik (Hijau)', 'Anorganik (Kuning)', 'Total Akumulasi'],
        rows: [
          [
            'Frekuensi Pengangkutan (Rit)',
            'Ritase',
            periodHauls.filter(h => h.beratOrganikKg > 0).length,
            periodHauls.filter(h => h.beratAnorganikKg > 0).length,
            `${totalRit} Rit`,
          ],
          [
            'Volume Sampah',
            'm³',
            formatNumberID(totalVolOrg, 2),
            formatNumberID(totalVolAnorg, 2),
            `${formatNumberID(totalVolOrg + totalVolAnorg, 2)} m³`,
          ],
          [
            'Total Berat Sampah Terangkut',
            'Kg',
            `${formatNumberID(totalBeratOrg, 1)} kg`,
            `${formatNumberID(totalBeratAnorg, 1)} kg`,
            `${formatNumberID(totalSampahKg, 1)} kg`,
          ],
          [
            'Konversi Tonase',
            'Ton',
            `${formatNumberID(totalBeratOrg / 1000, 2)} Ton`,
            `${formatNumberID(totalBeratAnorg / 1000, 2)} Ton`,
            `${formatNumberID(totalSampahTon, 2)} Ton`,
          ],
        ],
        extraTables: [
          iuranTable,
          {
            title: `LAPORAN ARUS KAS OPS (${isTahunan ? `TAHUN ${selectedYear}` : `BULAN ${monthName.toUpperCase()} ${selectedYear}`})`,
            headers: ['Komponen Keuangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Surplus / Defisit'],
            rows: [
              [
                'Total Transaksi Kas Masuk & Keluar',
                formatRupiah(totalPemasukan, false),
                formatRupiah(totalPengeluaran, false),
                formatRupiah(netBulan, false),
              ],
            ],
            footRows: [['SALDO AKHIR KAS OPS', '-', '-', formatRupiah(saldoAkhir, false)]],
          },
        ],
      });
    } else {
      const activeKwBulan = isTahunan ? kwitansiBulan : selectedBulan;
      const kwMonthName = MONTH_NAMES_ID[activeKwBulan - 1];
      const targetCustomers =
        selectedPelangganId === 'all'
          ? relevantPelanggan
          : relevantPelanggan.filter(p => p.id === selectedPelangganId);

      const headers = ['No', 'Nama Pelanggan', 'RT', 'Kategori', 'Tarif/Bln', 'Status Bayar', 'Nominal Dibayar'];
      const rows = targetCustomers.map((p, idx) => {
        const pay = pembayaranList.find(b => b.pelangganId === p.id && b.tahun === selectedYear && b.bulan === activeKwBulan);
        return [
          idx + 1,
          p.nama,
          p.rt || '-',
          p.kategori,
          formatRupiah(getTarifPelangganBulan(p, selectedYear, activeKwBulan), false),
          pay && pay.jumlah > 0 ? 'LUNAS' : 'BELUM BAYAR',
          pay && pay.jumlah > 0 ? formatRupiah(pay.jumlah, false) : 'Rp 0',
        ];
      });

      downloadPDF({
        filename: `Daftar_Kwitansi_Iuran_${activeOPS.kode}_${kwMonthName}_${selectedYear}.pdf`,
        title: `REKAP KWITANSI IURAN WARGA (${kwMonthName.toUpperCase()} ${selectedYear})`,
        subtitle: `Organisasi: ${activeOPS.nama} | Periode: ${kwMonthName} ${selectedYear}`,
        opsName: activeOPS.nama,
        orientation: 'portrait',
        headers,
        rows,
      });
    }
  };

  const handleExportCSV = () => {
    if (isTahunan) {
      const headers = [
        'No',
        'Bulan',
        'Target KK',
        'Target Tagihan (Rp)',
        'Iuran Terkumpul (Rp)',
        'Persentase Realisasi (%)',
        'Sisa Tunggakan (Rp)',
        'KK Lunas',
      ];
      const rows = monthlyIuranData.map((m, idx) => [
        idx + 1,
        m.namaBulan,
        m.targetWargaCount,
        m.targetTagihan,
        m.realisasiIuran,
        m.persentase.toFixed(1),
        m.tunggakan,
        m.lunasCount,
      ]);
      downloadCSV(`Laporan_Iuran_${activeOPS.kode}_Tahun_${selectedYear}.csv`, headers, rows);
    } else {
      const headers = [
        'No',
        'Nama Pelanggan',
        'RT',
        'Kategori',
        'Tarif Bulan Ini (Rp)',
        'Nominal Terbayar (Rp)',
        'Status Bayar',
        'Sisa Tunggakan (Rp)',
      ];
      const rows = relevantPelanggan.map((p, idx) => {
        const pay = periodPayments.find(b => b.pelangganId === p.id);
        const tarif = getTarifPelangganBulan(p, selectedYear, selectedBulan);
        const bayar = pay?.jumlah || 0;
        return [
          idx + 1,
          p.nama,
          p.rt || '-',
          p.kategori,
          tarif,
          bayar,
          bayar >= tarif ? 'LUNAS' : bayar > 0 ? 'CICIL' : 'BELUM BAYAR',
          Math.max(0, tarif - bayar),
        ];
      });
      downloadCSV(`Laporan_Iuran_${activeOPS.kode}_${monthName}_${selectedYear}.csv`, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Control Bar (Hidden when printing via .no-print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Template Type Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setTemplateType('laporanBulanan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              templateType === 'laporanBulanan'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Laporan Terpadu OPS</span>
          </button>
          <button
            onClick={() => setTemplateType('kwitansiIuran')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              templateType === 'kwitansiIuran'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Kwitansi Iuran Warga</span>
          </button>
        </div>

        {/* Right: Period Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Periode Mode Quick Toggle & Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Periode:</span>
            <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedBulan(0)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  isTahunan
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                1 Tahun ({selectedYear})
              </button>
              <button
                type="button"
                onClick={() => setSelectedBulan(selectedBulan === 0 ? 3 : selectedBulan)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  !isTahunan
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                Bulanan
              </button>
            </div>

            {/* Dropdown for specific month or 1 year */}
            <select
              value={selectedBulan}
              onChange={e => setSelectedBulan(Number(e.target.value))}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value={0}>📅 Akumulasi 1 Tahun Penuh ({selectedYear})</option>
              <optgroup label={`Pilihan Bulan Tahun ${selectedYear}`}>
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Bulan {name} {selectedYear}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {templateType === 'kwitansiIuran' && (
            <>
              {isTahunan && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">Bulan Kwitansi:</span>
                  <select
                    value={kwitansiBulan}
                    onChange={e => setKwitansiBulan(Number(e.target.value))}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    {MONTH_NAMES_ID.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name} {selectedYear}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Warga:</span>
                <select
                  value={selectedPelangganId}
                  onChange={e => setSelectedPelangganId(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium max-w-[180px]"
                >
                  <option value="all">Semua Warga (Cetak Batch)</option>
                  {relevantPelanggan.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} {p.rt ? `(RT ${p.rt})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download Format CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-rose-100" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* PRINT TEMPLATE 1: LAPORAN TERPADU OPS (BULANAN / TAHUNAN) */}
      {templateType === 'laporanBulanan' && (
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Formal Letterhead (Kop Surat OPS) */}
          <div className="border-b-2 border-emerald-900 pb-4 text-center relative">
            <h1 className="text-xl font-extrabold text-emerald-950 tracking-wider uppercase">
              {activeOPS.nama}
            </h1>
            <p className="text-xs text-emerald-800 font-semibold mt-0.5 tracking-wide uppercase">
              ORGANISASI PENGELOLA SAMPAH MANDIRI
            </p>
            <p className="text-[11px] text-slate-600">
              Wilayah Kerja: {activeOPS.wilayah} | Alamat: {activeOPS.alamat} | Telp: {activeOPS.kontak}
            </p>
          </div>

          {/* Report Title */}
          <div className="text-center my-6">
            <h2 className="text-base font-bold text-emerald-950 underline underline-offset-4 tracking-wide uppercase">
              {isTahunan
                ? `LAPORAN TAHUNAN PENGELOLAAN SAMPAH DAN KEUANGAN`
                : `LAPORAN BULANAN PENGELOLAAN SAMPAH DAN KEUANGAN`}
            </h2>
            <p className="text-xs text-emerald-800 font-semibold mt-1 uppercase">
              PERIODE: {isTahunan ? `TAHUN ${selectedYear} (1 TAHUN PENUH / JANUARI - DESEMBER)` : `BULAN ${monthName.toUpperCase()} ${selectedYear}`}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-5 text-xs">
            {/* Section 1: Data Kepesertaan & Pelanggan */}
            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 print:bg-transparent">
              <h3 className="font-bold text-emerald-950 uppercase text-[11px] tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-700 inline-block"></span>
                I. Ringkasan Pelanggan &amp; Layanan
              </h3>
              <div className="grid grid-cols-3 gap-4 font-mono text-slate-800">
                <div>
                  <span className="text-slate-500 font-sans block text-[10px]">Total Terdaftar:</span>
                  <strong>{relevantPelanggan.length} KK</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block text-[10px]">Pelanggan Aktif:</span>
                  <strong className="text-emerald-700">{activePelanggan.length} KK</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block text-[10px]">Rata² Terlayani / Rit:</span>
                  <strong>{avgServed} KK / Pengangkutan</strong>
                </div>
              </div>
            </div>

            {/* Section 2: Ringkasan Pengangkutan Sampah */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-teal-800 text-white px-3 py-2 font-bold text-[11px] uppercase tracking-wide">
                II. Rekapitulasi Pengangkutan Sampah ({isTahunan ? `Tahun ${selectedYear} (1 Tahun Penuh)` : `Bulan ${monthName} ${selectedYear}`})
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Parameter Pengangkutan</th>
                    <th className="px-3 py-2 text-center">Satuan</th>
                    <th className="px-3 py-2 text-right">Organik (Hijau)</th>
                    <th className="px-3 py-2 text-right">Anorganik (Kuning)</th>
                    <th className="px-3 py-2 text-right">Total Akumulasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="px-3 py-2 font-sans">Frekuensi Pengangkutan (Rit)</td>
                    <td className="px-3 py-2 text-center text-slate-500">Ritase</td>
                    <td className="px-3 py-2 text-right">{periodHauls.filter(h => h.beratOrganikKg > 0).length}</td>
                    <td className="px-3 py-2 text-right">{periodHauls.filter(h => h.beratAnorganikKg > 0).length}</td>
                    <td className="px-3 py-2 text-right font-bold">{totalRit} Rit</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-sans">Volume Sampah</td>
                    <td className="px-3 py-2 text-center text-slate-500">m³</td>
                    <td className="px-3 py-2 text-right">{formatNumberID(totalVolOrg, 2)}</td>
                    <td className="px-3 py-2 text-right">{formatNumberID(totalVolAnorg, 2)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatNumberID(totalVolOrg + totalVolAnorg, 2)} m³</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-sans">Densitas Acuan Standar</td>
                    <td className="px-3 py-2 text-center text-slate-500">kg/m³</td>
                    <td className="px-3 py-2 text-right">{activeOPS.densitasOrganikDefault || 320}</td>
                    <td className="px-3 py-2 text-right">{activeOPS.densitasAnorganikDefault || 127}</td>
                    <td className="px-3 py-2 text-right text-slate-500">-</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2 font-sans">Total Berat Sampah Terangkut</td>
                    <td className="px-3 py-2 text-center text-slate-500">Kg</td>
                    <td className="px-3 py-2 text-right text-emerald-800">{formatNumberID(totalBeratOrg, 1)} kg</td>
                    <td className="px-3 py-2 text-right text-amber-800">{formatNumberID(totalBeratAnorg, 1)} kg</td>
                    <td className="px-3 py-2 text-right text-slate-900">{formatNumberID(totalSampahKg, 1)} kg</td>
                  </tr>
                  {periodHauls.some(h => h.metodeUkur === 'karung') && (
                    <tr className="bg-purple-50/60 font-semibold text-purple-950">
                      <td className="px-3 py-2 font-sans">
                        🎒 Pengangkutan Metode Karung
                      </td>
                      <td className="px-3 py-2 text-center text-purple-700">Karung</td>
                      <td className="px-3 py-2 text-right text-emerald-800">
                        {periodHauls.reduce((s, h) => s + (h.karungOrganik || 0), 0)} krg
                      </td>
                      <td className="px-3 py-2 text-right text-amber-800">
                        {periodHauls.reduce((s, h) => s + (h.karungAnorganik || 0), 0)} krg
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-purple-900">
                        {periodHauls.reduce((s, h) => s + (h.totalKarung || 0), 0)} Karung
                        {periodHauls.reduce((s, h) => s + (h.karungCampur || 0), 0) > 0 &&
                          ` (Campur: ${periodHauls.reduce((s, h) => s + (h.karungCampur || 0), 0)})`}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 font-bold">
                    <td className="px-3 py-2 font-sans">Konversi Tonase</td>
                    <td className="px-3 py-2 text-center text-slate-500">Ton</td>
                    <td className="px-3 py-2 text-right text-emerald-800">{formatNumberID(totalBeratOrg / 1000, 2)} Ton</td>
                    <td className="px-3 py-2 text-right text-amber-800">{formatNumberID(totalBeratAnorg / 1000, 2)} Ton</td>
                    <td className="px-3 py-2 text-right text-emerald-950 font-black">{formatNumberID(totalSampahTon, 2)} Ton</td>
                  </tr>
                </tbody>
              </table>

              {/* Sub-table for Coastal Clean-up activities in the period */}
              {periodHauls.some(h => h.sumberSampah === 'Clean-up Pantai') && (
                <div className="border-t border-slate-200 p-3 bg-cyan-50/40 print:bg-transparent">
                  <div className="text-[11px] font-bold text-cyan-950 uppercase tracking-wide mb-2 flex items-center justify-between">
                    <span>🌊 Aksi Bersih Pantai &amp; Pesisir Laut ({periodHauls.filter(h => h.sumberSampah === 'Clean-up Pantai').length} Kegiatan)</span>
                    <span className="text-2xs font-normal text-cyan-800">
                      Total Relawan: {periodHauls.filter(h => h.sumberSampah === 'Clean-up Pantai').reduce((s, it) => s + (it.jumlahRelawan || 0), 0)} Orang
                    </span>
                  </div>
                  <table className="w-full text-2xs text-left">
                    <thead className="bg-cyan-100/70 text-cyan-950 font-semibold">
                      <tr>
                        <th className="px-2 py-1">Tanggal</th>
                        <th className="px-2 py-1">Lokasi Pantai</th>
                        <th className="px-2 py-1 text-center">Relawan</th>
                        <th className="px-2 py-1 text-right">Daur Ulang</th>
                        <th className="px-2 py-1 text-right">Plastik</th>
                        <th className="px-2 py-1 text-right">Residu</th>
                        <th className="px-2 py-1 text-right">Total Berat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-100 font-mono">
                      {periodHauls.filter(h => h.sumberSampah === 'Clean-up Pantai').map(item => {
                        const daur = item.beratDaurUlangKg || 0;
                        const plastik = item.beratPlastikKg || 0;
                        const residu = item.beratResiduKg || 0;
                        const total = daur + plastik + residu;
                        return (
                          <tr key={item.id}>
                            <td className="px-2 py-1 font-sans">{item.hariTanggalLabel || item.tanggal}</td>
                            <td className="px-2 py-1 font-sans font-medium">{item.lokasiPantai || 'Pantai Pesisir'}</td>
                            <td className="px-2 py-1 text-center">{item.jumlahRelawan || item.pelangganTerlayani}</td>
                            <td className="px-2 py-1 text-right text-emerald-800">{formatNumberID(daur, 1)} kg</td>
                            <td className="px-2 py-1 text-right text-sky-800">{formatNumberID(plastik, 1)} kg</td>
                            <td className="px-2 py-1 text-right text-rose-800">{formatNumberID(residu, 1)} kg</td>
                            <td className="px-2 py-1 text-right font-bold text-cyan-950">{formatNumberID(total, 1)} kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 3: Karakterisasi Sampah */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-teal-800 text-white px-3 py-2 font-bold text-[11px] uppercase tracking-wide">
                III. Estimasi Pemilahan Komposisi Sampah &amp; Daur Ulang ({isTahunan ? `Akumulasi Tahun ${selectedYear}` : `Bulan ${monthName} ${selectedYear}`})
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Organik ({komposisiConfig.organikPct}%):</div>
                  <div className="font-bold text-emerald-800">{formatNumberID(beratOrganik, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Plastik ({komposisiConfig.plastikPct}%):</div>
                  <div className="font-bold text-amber-800">{formatNumberID(beratPlastik, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Kertas ({komposisiConfig.kertasPct}%):</div>
                  <div className="font-bold text-blue-800">{formatNumberID(beratKertas, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Kaca ({komposisiConfig.kacaPct}%):</div>
                  <div className="font-bold text-cyan-800">{formatNumberID(beratKaca, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Logam ({komposisiConfig.logamPct}%):</div>
                  <div className="font-bold text-orange-800">{formatNumberID(beratLogam, 1)} Kg</div>
                </div>
              </div>
            </div>

            {/* SECTION 4: REKAPITULASI IURAN TERKUMPUL & PERSENTASE PEMBAYARAN DARI TAGIHAN DAN REALISASI */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-teal-800 text-white px-3 py-2 font-bold text-[11px] uppercase tracking-wide flex items-center justify-between">
                <span>
                  IV. Rekapitulasi Iuran Pelanggan: Tagihan vs Realisasi Terkumpul ({isTahunan ? `Tahun ${selectedYear} (1 Tahun Penuh)` : `Bulan ${monthName} ${selectedYear}`})
                </span>
                <span className="font-mono text-emerald-200 text-2xs">
                  Capaian: {persentasePeriode.toFixed(1)}% | Realisasi: {formatRupiah(realisasiIuranPeriode, false)}
                </span>
              </div>

              {/* 4 Cards Summary: Tagihan, Realisasi, Persentase, Tunggakan */}
              <div className="p-3 bg-slate-50/80 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div className="p-2.5 bg-white border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans uppercase font-semibold">1. Target Tagihan (Potensi)</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{formatRupiah(targetTagihanPeriode, false)}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                    {isTahunan ? `Akumulasi 12 Bulan (${targetKKPeriode} KK)` : `${targetKKPeriode} KK Pelanggan Terdaftar`}
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-md">
                  <div className="text-[10px] text-emerald-800 font-sans uppercase font-semibold">2. Iuran Terkumpul (Realisasi)</div>
                  <div className="text-sm font-black text-emerald-900 mt-0.5">{formatRupiah(realisasiIuranPeriode, false)}</div>
                  <div className="text-[10px] text-emerald-700 font-sans mt-0.5">
                    {isTahunan ? `${periodPayments.length} Pembayaran Masuk` : `${kkLunasPeriode + kkCicilPeriode} KK telah membayar`}
                  </div>
                </div>

                <div className="p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-md">
                  <div className="text-[10px] text-cyan-800 font-sans uppercase font-semibold">3. Persentase Pembayaran</div>
                  <div className="text-sm font-black text-cyan-900 mt-0.5">{persentasePeriode.toFixed(1)}%</div>
                  <div className="text-[10px] text-cyan-700 font-sans mt-0.5">
                    {persentasePeriode >= 100
                      ? '✅ Target 100% Tercapai'
                      : persentasePeriode >= 75
                      ? '⚡ Kolektibilitas Optimal'
                      : persentasePeriode >= 50
                      ? '⚠️ Pembayaran Sedang'
                      : '🔴 Perlu Ditagih'}
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-md">
                  <div className="text-[10px] text-rose-800 font-sans uppercase font-semibold">4. Sisa Tunggakan (Belum Bayar)</div>
                  <div className="text-sm font-extrabold text-rose-900 mt-0.5">{formatRupiah(tunggakanPeriode, false)}</div>
                  <div className="text-[10px] text-rose-700 font-sans mt-0.5">
                    {isTahunan
                      ? `${((tunggakanPeriode / (targetTagihanPeriode || 1)) * 100).toFixed(1)}% belum terkumpul`
                      : `${kkBelumBayarPeriode} KK belum bayar lunas`}
                  </div>
                </div>
              </div>

              {/* Table: If 1 Year Selected, Show 12-Month Breakdown Table */}
              {isTahunan ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-1.5 text-center w-8">No</th>
                        <th className="px-3 py-1.5">Bulan</th>
                        <th className="px-3 py-1.5 text-center">KK Target</th>
                        <th className="px-3 py-1.5 text-right">Target Tagihan (Rp)</th>
                        <th className="px-3 py-1.5 text-right">Iuran Terkumpul (Rp)</th>
                        <th className="px-3 py-1.5 text-center">% Realisasi</th>
                        <th className="px-3 py-1.5 text-right">Sisa Tunggakan (Rp)</th>
                        <th className="px-3 py-1.5 text-center">KK Lunas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {monthlyIuranData.map((m, idx) => (
                        <tr key={m.monthNum} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                          <td className="px-3 py-1.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-sans font-medium text-slate-900">{m.namaBulan}</td>
                          <td className="px-3 py-1.5 text-center">{m.targetWargaCount} KK</td>
                          <td className="px-3 py-1.5 text-right">{formatRupiah(m.targetTagihan, false)}</td>
                          <td className="px-3 py-1.5 text-right text-emerald-800 font-bold">{formatRupiah(m.realisasiIuran, false)}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-2xs font-bold ${
                                m.persentase >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.persentase >= 70
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : m.persentase > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.persentase.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-rose-700">
                            {m.tunggakan > 0 ? formatRupiah(m.tunggakan, false) : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-center text-slate-700">{m.lunasCount} KK</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/80 font-bold border-t-2 border-emerald-300">
                        <td className="px-3 py-2 text-center" colSpan={2}>
                          TOTAL 1 TAHUN PENUH
                        </td>
                        <td className="px-3 py-2 text-center">{targetKKPeriode} KK</td>
                        <td className="px-3 py-2 text-right">{formatRupiah(targetTagihanPeriode, false)}</td>
                        <td className="px-3 py-2 text-right text-emerald-900 font-black">
                          {formatRupiah(realisasiIuranPeriode, false)}
                        </td>
                        <td className="px-3 py-2 text-center text-emerald-900 font-black">
                          {persentasePeriode.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right text-rose-800 font-bold">
                          {formatRupiah(tunggakanPeriode, false)}
                        </td>
                        <td className="px-3 py-2 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Table: If Monthly Selected, Show Breakdown by Customer Category */
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Kategori Pelanggan</th>
                      <th className="px-3 py-2 text-center">KK Target</th>
                      <th className="px-3 py-2 text-right">Target Tagihan (Rp)</th>
                      <th className="px-3 py-2 text-right">Iuran Terkumpul (Rp)</th>
                      <th className="px-3 py-2 text-center">% Realisasi</th>
                      <th className="px-3 py-2 text-right">Sisa Tunggakan (Rp)</th>
                      <th className="px-3 py-2 text-center">Status Lunas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-900">
                        🏠 Pelanggan Rumah Tangga
                      </td>
                      <td className="px-3 py-2 text-center">{kategoriBreakdown.rtTargetCount} KK</td>
                      <td className="px-3 py-2 text-right">{formatRupiah(kategoriBreakdown.rtTarget, false)}</td>
                      <td className="px-3 py-2 text-right text-emerald-800 font-bold">
                        {formatRupiah(kategoriBreakdown.rtRealisasi, false)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800">
                        {kategoriBreakdown.rtPersen.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-rose-700">
                        {formatRupiah(kategoriBreakdown.rtTunggakan, false)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600 font-sans text-2xs">
                        {kategoriBreakdown.rtLunas} Lunas / {kategoriBreakdown.rtTargetCount} KK
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-900">
                        🏢 Pelanggan Non Rumah Tangga (Usaha/Toko/Faskes)
                      </td>
                      <td className="px-3 py-2 text-center">{kategoriBreakdown.nonRtTargetCount} Unit</td>
                      <td className="px-3 py-2 text-right">{formatRupiah(kategoriBreakdown.nonRtTarget, false)}</td>
                      <td className="px-3 py-2 text-right text-emerald-800 font-bold">
                        {formatRupiah(kategoriBreakdown.nonRtRealisasi, false)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800">
                        {kategoriBreakdown.nonRtPersen.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-rose-700">
                        {formatRupiah(kategoriBreakdown.nonRtTunggakan, false)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600 font-sans text-2xs">
                        {kategoriBreakdown.nonRtLunas} Lunas / {kategoriBreakdown.nonRtTargetCount} Unit
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/80 font-bold border-t-2 border-emerald-300">
                      <td className="px-3 py-2 font-sans">TOTAL KESELURUHAN</td>
                      <td className="px-3 py-2 text-center">{targetKKPeriode} Pelanggan</td>
                      <td className="px-3 py-2 text-right">{formatRupiah(targetTagihanPeriode, false)}</td>
                      <td className="px-3 py-2 text-right text-emerald-900 font-black">
                        {formatRupiah(realisasiIuranPeriode, false)}
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-900 font-black">
                        {persentasePeriode.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-rose-800 font-bold">
                        {formatRupiah(tunggakanPeriode, false)}
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-950 font-sans text-2xs">
                        {kkLunasPeriode} Lunas / {targetKKPeriode} KK
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 5: Laporan Keuangan Arus Kas OPS */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-teal-800 text-white px-3 py-2 font-bold text-[11px] uppercase tracking-wide flex items-center justify-between">
                <span>V. Laporan Arus Kas OPS ({isTahunan ? `Tahun ${selectedYear} (1 Tahun Penuh)` : `Bulan ${monthName} ${selectedYear}`})</span>
                <span className="font-mono text-emerald-200">
                  Saldo: {formatRupiah(saldoAkhir, false)}
                </span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Komponen Keuangan</th>
                    <th className="px-3 py-2 text-right">Pemasukan (Rp)</th>
                    <th className="px-3 py-2 text-right">Pengeluaran (Rp)</th>
                    <th className="px-3 py-2 text-right">Surplus / Defisit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="px-3 py-2 font-sans">Total Transaksi Kas Masuk &amp; Keluar</td>
                    <td className="px-3 py-2 text-right text-emerald-700 font-semibold">
                      {formatRupiah(totalPemasukan, true)}
                    </td>
                    <td className="px-3 py-2 text-right text-rose-700 font-semibold">
                      {formatRupiah(totalPengeluaran, true)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-bold ${
                        netBulan < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatRupiah(netBulan, true)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2 font-sans" colSpan={3}>
                      SALDO KAS AKHIR OPS (KUMULATIF):
                    </td>
                    <td className="px-3 py-2 text-right text-slate-900 font-black">
                      {formatRupiah(saldoAkhir, true)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Block (Tanda Tangan Pengurus OPS & Kepala Pemerintah Negeri) */}
            <div className="pt-8 print-break-inside-avoid">
              <div className="text-right text-xs text-slate-600 mb-3">
                Tanggal:{' '}
                {isTahunan
                  ? `31 Desember ${selectedYear}`
                  : `${new Date().getDate()} ${monthName} ${selectedYear}`}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="text-slate-600">Disetujui Oleh,</p>
                  <p className="font-bold text-slate-900 mt-0.5">Ketua OPS</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 underline">
                    {activeOPS.ketua && activeOPS.ketua !== '-'
                      ? `( ${activeOPS.ketua} )`
                      : '( ........................................ )'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-600">Disiapkan Oleh,</p>
                  <p className="font-bold text-slate-900 mt-0.5">Admin OPS</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 underline">
                    {activeOPS.adminOps && activeOPS.adminOps !== '-'
                      ? `( ${activeOPS.adminOps} )`
                      : '( ........................................ )'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-600">Mengetahui,</p>
                  <p className="font-bold text-slate-900 mt-0.5">Kepala Pemerintah Negeri</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 underline">
                    {activeOPS.kepalaPemerintahNegeri && activeOPS.kepalaPemerintahNegeri !== '-'
                      ? `( ${activeOPS.kepalaPemerintahNegeri} )`
                      : '( ........................................ )'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT TEMPLATE 2: KWITANSI IURAN WARGA */}
      {templateType === 'kwitansiIuran' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {(() => {
            const activeKwBulan = isTahunan ? kwitansiBulan : selectedBulan;
            const kwMonthName = MONTH_NAMES_ID[activeKwBulan - 1];
            const kwBulanStr = String(activeKwBulan).padStart(2, '0');

            return relevantPelanggan
              .filter(p => selectedPelangganId === 'all' || p.id === selectedPelangganId)
              .map((pelanggan, pIdx) => {
                const payment = pembayaranList.find(
                  b => b.pelangganId === pelanggan.id && b.tahun === selectedYear && b.bulan === activeKwBulan
                );
                const nominal = payment?.jumlah || getTarifPelangganBulan(pelanggan, selectedYear, activeKwBulan);
                const noKwitansi = payment?.noBukti || `KW/${selectedYear}/${kwBulanStr}/${String(pIdx + 1).padStart(3, '0')}`;

                return (
                  <div
                    key={pelanggan.id}
                    className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 print:border-slate-400 print:shadow-none print:p-4 print-break-inside-avoid relative overflow-hidden"
                  >
                    {/* Decorative Watermark Header */}
                    <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 tracking-wider">
                            {activeOPS.nama}
                          </span>
                          <span className="text-xs text-emerald-700 font-semibold px-2 py-0.5 bg-emerald-50 rounded-xs">
                            BUKTI IURAN SAMPAH
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{activeOPS.alamat}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">NO. KWITANSI:</span>
                        <div className="text-xs font-mono font-bold text-slate-900">{noKwitansi}</div>
                      </div>
                    </div>

                    {/* Body Receipt Fields */}
                    <div className="py-4 space-y-2 text-xs">
                      <div className="grid grid-cols-4 gap-2 items-baseline">
                        <span className="text-slate-500 font-medium">Telah terima dari</span>
                        <div className="col-span-3 font-bold text-slate-900 text-sm border-b border-dotted border-slate-300 pb-0.5">
                          {pelanggan.nama} {pelanggan.rt ? `(RT ${pelanggan.rt})` : ''}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 items-baseline">
                        <span className="text-slate-500 font-medium">Uang Sejumlah</span>
                        <div className="col-span-3 font-semibold italic text-slate-800 border-b border-dotted border-slate-300 pb-0.5">
                          # {terbilang(nominal)} Rupiah #
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 items-baseline">
                        <span className="text-slate-500 font-medium">Untuk Pembayaran</span>
                        <div className="col-span-3 text-slate-900 border-b border-dotted border-slate-300 pb-0.5">
                          Iuran Pengelolaan &amp; Angkutan Sampah Bulan <strong>{kwMonthName} {selectedYear}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Receipt Bar */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg">
                        <span className="text-[10px] text-emerald-800 font-semibold block">JUMLAH PEMBAYARAN:</span>
                        <span className="text-base font-extrabold text-emerald-900 font-mono tabular-nums">
                          {formatRupiah(nominal, true)}
                        </span>
                      </div>

                      <div className="text-right text-xs">
                        <p className="text-slate-500 text-[11px]">
                          Diterima tanggal: {payment?.tanggalBayar || formatDateID(new Date().toISOString().split('T')[0])}
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">Penerima / Petugas OPS</p>
                        <div className="h-8"></div>
                        <p className="font-bold text-slate-900 underline">
                          {activeOPS.bendahara || 'Petugas Penarik'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              });
          })()}
        </div>
      )}
    </div>
  );
};
