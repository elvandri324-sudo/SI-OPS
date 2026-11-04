import React, { useState } from 'react';
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
  downloadCSV,
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
  const [selectedBulan, setSelectedBulan] = useState<number>(3); // Default Maret
  const [selectedPelangganId, setSelectedPelangganId] = useState<string>('all');

  const bulanStr = String(selectedBulan).padStart(2, '0');
  const monthName = MONTH_NAMES_ID[selectedBulan - 1];

  // Month-filtered data
  const monthHauls = pengangkutanList.filter(p =>
    p.tanggal.startsWith(`${selectedYear}-${bulanStr}`)
  );
  const monthKas = kasList.filter(k => k.tanggal.startsWith(`${selectedYear}-${bulanStr}`));
  const monthPayments = pembayaranList.filter(
    b => b.tahun === selectedYear && b.bulan === selectedBulan
  );

  // Calculations for this month
  const activePelanggan = pelangganList.filter(p => p.status === 'Aktif');
  const totalRit = monthHauls.length;
  const totalServed = monthHauls.reduce((s, it) => s + (it.pelangganTerlayani || 0), 0);
  const avgServed = totalRit > 0 ? Math.round(totalServed / totalRit) : 0;

  const totalVolOrg = monthHauls.reduce((s, it) => s + (it.volumeOrganikM3 || 0), 0);
  const totalBeratOrg = monthHauls.reduce((s, it) => s + (it.beratOrganikKg || 0), 0);
  const totalVolAnorg = monthHauls.reduce((s, it) => s + (it.volumeAnorganikM3 || 0), 0);
  const totalBeratAnorg = monthHauls.reduce((s, it) => s + (it.beratAnorganikKg || 0), 0);
  const totalSampahKg = totalBeratOrg + totalBeratAnorg;
  const totalSampahTon = totalSampahKg / 1000;

  // Composition weights
  const beratOrganik = (totalSampahKg * komposisiConfig.organikPct) / 100;
  const beratPlastik = (totalSampahKg * komposisiConfig.plastikPct) / 100;
  const beratKertas = (totalSampahKg * komposisiConfig.kertasPct) / 100;
  const beratKaca = (totalSampahKg * komposisiConfig.kacaPct) / 100;
  const beratLogam = (totalSampahKg * komposisiConfig.logamPct) / 100;
  const beratPopok = (totalSampahKg * komposisiConfig.popokPembalutPct) / 100;
  const beratLain = (totalSampahKg * komposisiConfig.lainnyaPct) / 100;

  // Financials for this month
  const totalPemasukan = monthKas.reduce((s, it) => s + (it.pemasukan || 0), 0);
  const totalPengeluaran = monthKas.reduce((s, it) => s + (it.pengeluaran || 0), 0);
  const netBulan = totalPemasukan - totalPengeluaran;

  // Last saldo of the month or overall running
  const lastMonthKasItem = monthKas[monthKas.length - 1];
  const saldoAkhir = lastMonthKasItem?.saldo ?? (kasList[kasList.length - 1]?.saldo || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (templateType === 'laporanBulanan') {
      downloadPDF({
        filename: `Laporan_Bulanan_${activeOPS.kode}_${monthName}_${selectedYear}.pdf`,
        title: `LAPORAN BULANAN PENGELOLAAN SAMPAH & KEUANGAN`,
        subtitle: `Organisasi: ${activeOPS.nama} | Periode: Bulan ${monthName} ${selectedYear}`,
        opsName: activeOPS.nama,
        orientation: 'portrait',
        summaryItems: [
          { label: 'Pelanggan Aktif', value: `${activePelanggan.length} KK` },
          { label: 'Total Sampah Terangkut', value: `${formatNumberID(totalSampahKg, 1)} Kg (${formatNumberID(totalSampahTon, 2)} Ton)` },
          { label: 'Total Pemasukan Kas', value: formatRupiah(totalPemasukan, false) },
          { label: 'Total Pengeluaran Kas', value: formatRupiah(totalPengeluaran, false) },
        ],
        headers: ['Parameter Pengangkutan', 'Satuan', 'Organik (Hijau)', 'Anorganik (Kuning)', 'Total Akumulasi'],
        rows: [
          [
            'Frekuensi Pengangkutan (Rit)',
            'Ritase',
            monthHauls.filter(h => h.beratOrganikKg > 0).length,
            monthHauls.filter(h => h.beratAnorganikKg > 0).length,
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
          {
            title: `LAPORAN ARUS KAS OPS (BULAN ${monthName.toUpperCase()} ${selectedYear})`,
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
      const targetCustomers =
        selectedPelangganId === 'all'
          ? pelangganList
          : pelangganList.filter(p => p.id === selectedPelangganId);

      const headers = ['No', 'Nama Pelanggan', 'RT', 'Kategori', 'Tarif/Bln', 'Status Bayar', 'Nominal Dibayar'];
      const rows = targetCustomers.map((p, idx) => {
        const pay = monthPayments.find(b => b.pelangganId === p.id);
        return [
          idx + 1,
          p.nama,
          p.rt,
          p.kategori,
          formatRupiah(p.tarifPerBulan, false),
          pay && pay.jumlah > 0 ? 'LUNAS' : 'BELUM BAYAR',
          pay && pay.jumlah > 0 ? formatRupiah(pay.jumlah, false) : 'Rp 0',
        ];
      });

      downloadPDF({
        filename: `Daftar_Kwitansi_Iuran_${activeOPS.kode}_${monthName}_${selectedYear}.pdf`,
        title: `REKAP KWITANSI IURAN WARGA (${monthName.toUpperCase()} ${selectedYear})`,
        subtitle: `Organisasi: ${activeOPS.nama} | Periode: ${monthName} ${selectedYear}`,
        opsName: activeOPS.nama,
        orientation: 'portrait',
        headers,
        rows,
      });
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
            <span>Laporan Bulanan Terpadu OPS</span>
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

        {/* Right: Month Selector & Print Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Pilih Bulan:</span>
            <select
              value={selectedBulan}
              onChange={e => setSelectedBulan(Number(e.target.value))}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {MONTH_NAMES_ID.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name} {selectedYear}
                </option>
              ))}
            </select>
          </div>

          {templateType === 'kwitansiIuran' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Warga:</span>
              <select
                value={selectedPelangganId}
                onChange={e => setSelectedPelangganId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium max-w-[180px]"
              >
                <option value="all">Semua Warga (Cetak Batch)</option>
                {pelangganList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama} (RT {p.rt})
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* PRINT TEMPLATE 1: LAPORAN BULANAN TERPADU */}
      {templateType === 'laporanBulanan' && (
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Formal Letterhead (Kop Surat OPS) */}
          <div className="border-b-2 border-emerald-900 pb-4 text-center relative">
            <h1 className="text-xl font-extrabold text-emerald-950 tracking-wider uppercase">
              {activeOPS.nama}
            </h1>
            <p className="text-xs text-emerald-800 font-semibold mt-0.5">
              ORGANISASI PENGELOLA SAMPAH BERBASIS MASYARAKAT &amp; PELESTARIAN LINGKUNGAN
            </p>
            <p className="text-[11px] text-slate-600">
              Wilayah Kerja: {activeOPS.wilayah} | Alamat: {activeOPS.alamat} | Telp: {activeOPS.kontak}
            </p>
          </div>

          {/* Report Title */}
          <div className="text-center my-6">
            <h2 className="text-base font-bold text-emerald-950 underline underline-offset-4 tracking-wide uppercase">
              LAPORAN BULANAN PENGELOLAAN SAMPAH DAN KEUANGAN
            </h2>
            <p className="text-xs text-emerald-800 font-semibold mt-1">
              PERIODE: BULAN {monthName.toUpperCase()} {selectedYear}
            </p>
          </div>

          {/* Section 1: Data Kepesertaan & Pelanggan */}
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 print:bg-transparent">
              <h3 className="font-bold text-emerald-950 uppercase text-[11px] tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-700 inline-block"></span>
                I. Ringkasan Pelanggan &amp; Layanan
              </h3>
              <div className="grid grid-cols-3 gap-4 font-mono text-slate-800">
                <div>
                  <span className="text-slate-500 font-sans block text-[10px]">Total Terdaftar:</span>
                  <strong>{pelangganList.length} KK</strong>
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
                II. Rekapitulasi Pengangkutan Sampah (Bulan {monthName} {selectedYear})
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
                    <td className="px-3 py-2 text-right">{monthHauls.filter(h => h.beratOrganikKg > 0).length}</td>
                    <td className="px-3 py-2 text-right">{monthHauls.filter(h => h.beratAnorganikKg > 0).length}</td>
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
                  {monthHauls.some(h => h.metodeUkur === 'karung') && (
                    <tr className="bg-purple-50/60 font-semibold text-purple-950">
                      <td className="px-3 py-2 font-sans">
                        🎒 Pengangkutan Metode Karung
                      </td>
                      <td className="px-3 py-2 text-center text-purple-700">Karung</td>
                      <td className="px-3 py-2 text-right text-emerald-800">
                        {monthHauls.reduce((s, h) => s + (h.karungOrganik || 0), 0)} krg
                      </td>
                      <td className="px-3 py-2 text-right text-amber-800">
                        {monthHauls.reduce((s, h) => s + (h.karungAnorganik || 0), 0)} krg
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-purple-900">
                        {monthHauls.reduce((s, h) => s + (h.totalKarung || 0), 0)} Karung
                        {monthHauls.reduce((s, h) => s + (h.karungCampur || 0), 0) > 0 &&
                          ` (Campur: ${monthHauls.reduce((s, h) => s + (h.karungCampur || 0), 0)})`}
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

              {/* Sub-table for Coastal Clean-up activities in the month */}
              {monthHauls.some(h => h.sumberSampah === 'Clean-up Pantai') && (
                <div className="border-t border-slate-200 p-3 bg-cyan-50/40 print:bg-transparent">
                  <div className="text-[11px] font-bold text-cyan-950 uppercase tracking-wide mb-2 flex items-center justify-between">
                    <span>🌊 Aksi Bersih Pantai &amp; Pesisir Laut ({monthHauls.filter(h => h.sumberSampah === 'Clean-up Pantai').length} Kegiatan)</span>
                    <span className="text-2xs font-normal text-cyan-800">
                      Total Relawan: {monthHauls.filter(h => h.sumberSampah === 'Clean-up Pantai').reduce((s, it) => s + (it.jumlahRelawan || 0), 0)} Orang
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
                      {monthHauls.filter(h => h.sumberSampah === 'Clean-up Pantai').map(item => {
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
                III. Estimasi Pemilahan Komposisi Sampah &amp; Daur Ulang
              </div>
              <div className="p-3 grid grid-cols-4 gap-2 font-mono text-xs">
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Organik (62.3%):</div>
                  <div className="font-bold text-emerald-800">{formatNumberID(beratOrganik, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Plastik (12.2%):</div>
                  <div className="font-bold text-amber-800">{formatNumberID(beratPlastik, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Kertas (8.2%):</div>
                  <div className="font-bold text-blue-800">{formatNumberID(beratKertas, 1)} Kg</div>
                </div>
                <div className="p-2 border border-slate-200 rounded-md">
                  <div className="text-[10px] text-slate-500 font-sans">Logam (3.6%):</div>
                  <div className="font-bold text-orange-800">{formatNumberID(beratLogam, 1)} Kg</div>
                </div>
              </div>
            </div>

            {/* Section 4: Laporan Keuangan Bulan Berjalan */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-teal-800 text-white px-3 py-2 font-bold text-[11px] uppercase tracking-wide flex items-center justify-between">
                <span>IV. Laporan Arus Kas OPS (Bulan {monthName} {selectedYear})</span>
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
                Tanggal: {new Date().getDate()} {monthName} {selectedYear}
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
          {pelangganList
            .filter(p => selectedPelangganId === 'all' || p.id === selectedPelangganId)
            .map((pelanggan, pIdx) => {
              const payment = pembayaranList.find(
                b => b.pelangganId === pelanggan.id && b.tahun === selectedYear && b.bulan === selectedBulan
              );
              const nominal = payment?.jumlah || pelanggan.tarifPerBulan || 20000;
              const noKwitansi = payment?.noBukti || `KW/${selectedYear}/${bulanStr}/${String(pIdx + 1).padStart(3, '0')}`;

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
                        {pelanggan.nama} (RT {pelanggan.rt})
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
                        Iuran Pengelolaan &amp; Angkutan Sampah Bulan <strong>{monthName} {selectedYear}</strong>
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
            })}
        </div>
      )}
    </div>
  );
};
