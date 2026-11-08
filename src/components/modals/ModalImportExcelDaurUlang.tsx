import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  JenisDaurUlangItem,
  TransaksiDaurUlang,
  TipeTransaksiDaurUlang,
  SumberDaurUlangMasuk,
  JenisPengeluaranDaurUlang,
  TujuanUangDiterima,
} from '../../types/ops';
import { formatNumberID, formatRupiah } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeOPSId: string;
  jenisList: JenisDaurUlangItem[];
  onImportSuccess: (imported: TransaksiDaurUlang[]) => void;
}

export const ModalImportExcelDaurUlang: React.FC<Props> = ({
  isOpen,
  onClose,
  activeOPSId,
  jenisList,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<TransaksiDaurUlang[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Tanggal (YYYY-MM-DD)': '2026-11-01',
        'Tipe (Masuk/Keluar)': 'Masuk',
        'Nama Jenis Sampah': 'Botol Bening',
        'Berat (Kg)': 18.5,
        'Sumber (Khusus Masuk)': 'Petugas angkut',
        'Jenis Pengeluaran (Khusus Keluar)': '',
        'Pembeli / Pengepul': '',
        'Harga per Kg (Rp)': '',
        'Uang Diterima di (Kas/Bank)': '',
        Keterangan: 'Timbang pos 1',
      },
      {
        'Tanggal (YYYY-MM-DD)': '2026-11-05',
        'Tipe (Masuk/Keluar)': 'Keluar',
        'Nama Jenis Sampah': 'Kardus',
        'Berat (Kg)': 40,
        'Sumber (Khusus Masuk)': '',
        'Jenis Pengeluaran (Khusus Keluar)': 'Dijual',
        'Pembeli / Pengepul': 'UD Berkah Plastik',
        'Harga per Kg (Rp)': 1800,
        'Uang Diterima di (Kas/Bank)': 'Kas (tunai)',
        Keterangan: 'Penjualan partai pertama',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Daur Ulang');
    XLSX.writeFile(wb, 'Template_Impor_Sampah_Daur_Ulang.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('File kosong atau format tidak sesuai.');
          setIsProcessing(false);
          return;
        }

        const items: TransaksiDaurUlang[] = [];

        rawJson.forEach((row, idx) => {
          // Detect fields with flexible column naming
          const rawTanggal =
            row['Tanggal (YYYY-MM-DD)'] ||
            row['Tanggal'] ||
            row['tanggal'] ||
            row['Date'];
          const rawTipe = (
            row['Tipe (Masuk/Keluar)'] ||
            row['Tipe'] ||
            row['tipe'] ||
            'Masuk'
          ).toString().trim();
          const rawNamaJenis = (
            row['Nama Jenis Sampah'] ||
            row['Jenis'] ||
            row['Nama Jenis'] ||
            row['jenis'] ||
            ''
          ).toString().trim();
          const rawBerat = parseFloat(
            (row['Berat (Kg)'] || row['Berat'] || row['berat'] || 0)
              .toString()
              .replace(',', '.')
          );

          if (!rawNamaJenis || isNaN(rawBerat) || rawBerat <= 0) return;

          // Find or fallback matching jenisId
          const matched = jenisList.find(
            j => j.nama.toLowerCase() === rawNamaJenis.toLowerCase()
          );
          const matchedJenis = matched || jenisList[0];
          if (!matchedJenis) return;

          let formattedTanggal = new Date().toISOString().split('T')[0];
          if (rawTanggal instanceof Date) {
            formattedTanggal = rawTanggal.toISOString().split('T')[0];
          } else if (typeof rawTanggal === 'string' && rawTanggal.trim()) {
            formattedTanggal = rawTanggal.trim().slice(0, 10);
          }

          const isKeluar =
            rawTipe.toLowerCase().includes('keluar') ||
            rawTipe.toLowerCase().includes('jual');
          const tipe: TipeTransaksiDaurUlang = isKeluar ? 'keluar' : 'masuk';

          const sumber = (row['Sumber (Khusus Masuk)'] ||
            row['Sumber'] ||
            'Petugas angkut') as SumberDaurUlangMasuk;

          const jenisPengeluaran = (row['Jenis Pengeluaran (Khusus Keluar)'] ||
            row['Jenis Pengeluaran'] ||
            'Dijual') as JenisPengeluaranDaurUlang;

          const pembeli = row['Pembeli / Pengepul'] || row['Pembeli'] || undefined;
          const rawHarga = parseFloat(
            (row['Harga per Kg (Rp)'] || row['Harga'] || 0)
              .toString()
              .replace(',', '.')
          );
          const hargaPerKg =
            !isNaN(rawHarga) && rawHarga > 0
              ? rawHarga
              : matchedJenis.hargaAcuanKg || undefined;

          const totalNilai =
            tipe === 'keluar' && jenisPengeluaran === 'Dijual' && hargaPerKg
              ? rawBerat * hargaPerKg
              : undefined;

          const rawTujuan = (
            row['Uang Diterima di (Kas/Bank)'] ||
            row['Tujuan Kas'] ||
            'Kas (tunai)'
          ).toString();
          const tujuanKas: TujuanUangDiterima = rawTujuan.toLowerCase().includes('bank')
            ? 'Bank'
            : 'Kas (tunai)';

          const keterangan = row['Keterangan'] || undefined;

          items.push({
            id: `trx_du_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            opsId: activeOPSId,
            tanggal: formattedTanggal,
            tipe,
            jenisId: matchedJenis.id,
            namaJenis: matchedJenis.nama,
            kategori: matchedJenis.kategori,
            beratKg: rawBerat,
            sumber: tipe === 'masuk' ? sumber : undefined,
            jenisPengeluaran: tipe === 'keluar' ? jenisPengeluaran : undefined,
            pembeli: tipe === 'keluar' && jenisPengeluaran === 'Dijual' ? pembeli : undefined,
            hargaPerKg: tipe === 'keluar' && jenisPengeluaran === 'Dijual' ? hargaPerKg : undefined,
            totalNilai,
            tujuanKas: tipe === 'keluar' && jenisPengeluaran === 'Dijual' ? tujuanKas : undefined,
            catatKeKas: tipe === 'keluar' && jenisPengeluaran === 'Dijual',
            keterangan,
            createdAt: new Date().toISOString(),
          });
        });

        if (items.length === 0) {
          setErrorMsg(
            'Tidak ada data valid yang dapat diimpor. Pastikan nama jenis sampah dan berat terisi dengan benar.'
          );
        } else {
          setParsedRows(items);
        }
      } catch (err: any) {
        setErrorMsg('Gagal membaca file Excel/CSV: ' + (err.message || 'Error parsing'));
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    onImportSuccess(parsedRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Impor Data Sampah Daur Ulang
              </h2>
              <p className="text-[11px] text-slate-500">
                Format file Excel (.xlsx, .xls) atau CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Download Template Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-xs text-slate-600">
              Belum punya template format impor? Unduh di sini:
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template</span>
            </button>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-800">
              {fileName || 'Pilih atau Tarik File Excel / CSV ke Sini'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Mendukung transaksi Timbang Masuk & Jual/Keluar sekaligus
            </div>
          </div>

          {isProcessing && (
            <div className="p-3 text-xs text-center text-slate-600 font-medium">
              Memproses dan memvalidasi file...
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Parsed */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                  Siap diimpor: {parsedRows.length} baris transaksi
                </span>
                <span className="text-slate-500">
                  Total Berat: {formatNumberID(parsedRows.reduce((acc, r) => acc + r.beratKg, 0), 1)} kg
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 sticky top-0 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2">Tanggal</th>
                      <th className="p-2">Tipe</th>
                      <th className="p-2">Jenis Sampah</th>
                      <th className="p-2 text-right">Berat (kg)</th>
                      <th className="p-2 text-right">Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map(r => (
                      <tr key={r.id}>
                        <td className="p-2 font-mono">{r.tanggal}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${
                              r.tipe === 'masuk'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {r.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td className="p-2 font-medium text-slate-800">{r.namaJenis}</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {formatNumberID(r.beratKg, 1)}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-800 font-semibold">
                          {r.totalNilai ? formatRupiah(r.totalNilai, false) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={handleConfirmImport}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
              parsedRows.length > 0
                ? 'bg-[#0c4a4a] hover:bg-[#083535]'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Impor Sekarang ({parsedRows.length})
          </button>
        </div>
      </div>
    </div>
  );
};
