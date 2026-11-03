import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Pelanggan,
  TransaksiPengangkutan,
  TransaksiKas,
  PembayaranIuran,
  OPSProfile,
  KategoriPelanggan,
  StatusPelanggan,
  KategoriKas,
  JenisKas,
} from '../../types/ops';
import { formatDateID, formatRupiah, formatNumberID, MONTH_NAMES_ID } from '../../utils/format';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react';

export type ImportDataType = 'pelanggan' | 'transaksi' | 'keuangan' | 'pembayaran';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportDataType;
  activeOPS: OPSProfile;
  opsList: OPSProfile[];
  pelangganList?: Pelanggan[];
  selectedYear?: number;
  onImportPelanggan?: (items: Pelanggan[], replace: boolean, targetOpsId: string) => void;
  onImportPengangkutan?: (items: TransaksiPengangkutan[], replace: boolean, targetOpsId: string) => void;
  onImportKas?: (items: TransaksiKas[], replace: boolean, targetOpsId: string) => void;
  onImportPembayaran?: (items: PembayaranIuran[], replace: boolean, targetOpsId: string) => void;
}

export const ModalImportExcel: React.FC<Props> = ({
  isOpen,
  onClose,
  importType,
  activeOPS,
  opsList,
  pelangganList = [],
  selectedYear = 2026,
  onImportPelanggan,
  onImportPengangkutan,
  onImportKas,
  onImportPembayaran,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [targetOpsId, setTargetOpsId] = useState<string>(activeOPS.id === 'all' ? (opsList[0]?.id || 'ops-tanah-rata') : activeOPS.id);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed preview rows
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  if (!isOpen) return null;

  // Title and labels based on type
  const titles = {
    pelanggan: {
      title: 'Import Data Pelanggan / Warga dari Excel',
      sub: 'Unggah file spreadsheet .xlsx, .xls, atau .csv berisi data warga, RT, kategori, & tarif iuran.',
      templateName: 'Template_Import_Pelanggan_SI_OPS.xlsx',
      countLabel: 'Data Pelanggan',
    },
    transaksi: {
      title: 'Import Transaksi Rit Sampah dari Excel',
      sub: 'Unggah file spreadsheet data ritase sampah, dimensi bak kendaraan, & ketinggian sampah organik/anorganik.',
      templateName: 'Template_Import_Ritase_Sampah_SI_OPS.xlsx',
      countLabel: 'Catatan Rit Sampah',
    },
    keuangan: {
      title: 'Import Pencatatan Arus Kas dari Excel',
      sub: 'Unggah file spreadsheet buku kas umum, penerimaan kas, bukti kuitansi, & biaya pengeluaran operasional.',
      templateName: 'Template_Import_Arus_Kas_SI_OPS.xlsx',
      countLabel: 'Transaksi Arus Kas',
    },
    pembayaran: {
      title: 'Import Pembayaran Iuran Warga dari Excel',
      sub: 'Unggah file spreadsheet rekap matriks iuran 12 bulan (Jan-Des) atau catatan setoran iuran warga.',
      templateName: 'Template_Import_Pembayaran_Iuran_SI_OPS.xlsx',
      countLabel: 'Catatan Pembayaran Iuran',
    },
  }[importType];

  // Helper to normalize cell keys by removing all non-alphanumeric characters
  const normalizeKey = (key: string): string => {
    return String(key || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  };

  // Helper to extract a column value from row by trying multiple candidate names
  const extractCol = (rowNorm: Record<string, any>, candidateKeywords: string[]): any => {
    // 1. Exact match against candidate keywords
    for (const cand of candidateKeywords) {
      const normCand = normalizeKey(cand);
      if (rowNorm[normCand] !== undefined && rowNorm[normCand] !== null && rowNorm[normCand] !== '') {
        return rowNorm[normCand];
      }
    }
    // 2. Partial match (if a key contains candidate keyword, only for keywords > 2 chars to prevent false matches)
    for (const k of Object.keys(rowNorm)) {
      for (const cand of candidateKeywords) {
        const normCand = normalizeKey(cand);
        if (normCand && normCand.length > 2 && k.includes(normCand) && rowNorm[k] !== undefined && rowNorm[k] !== null && rowNorm[k] !== '') {
          return rowNorm[k];
        }
      }
    }
    return undefined;
  };

  // Helper to safely parse dates from Excel
  const parseExcelDate = (val: any, fallbackDate?: string): string => {
    if (val === null || val === undefined || val === '') {
      return fallbackDate || '2026-01-01';
    }
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return fallbackDate || '2026-01-01';
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number') {
      try {
        const parsedCode = XLSX.SSF.parse_date_code(val);
        if (parsedCode && parsedCode.y) {
          const y = parsedCode.y;
          const m = String(parsedCode.m).padStart(2, '0');
          const d = String(parsedCode.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch (e) {
        // continue
      }
    }
    const s = String(val).trim();
    // YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)) {
      const parts = s.split(/[-/]/);
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`;
    }
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    if (/^\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4}/.test(s)) {
      const parts = s.split(/[-/. ]/);
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      const year = parts[2].slice(0, 4);
      if (month > 12 && day <= 12) {
        const tmp = day;
        day = month;
        month = tmp;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    // Indonesian month name support (e.g. 27 Februari 2026, 27-Feb-2026)
    const indoMonths: Record<string, string> = {
      jan: '01', januari: '01',
      feb: '02', februari: '02',
      mar: '03', maret: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06',
      jul: '07', juli: '07',
      ags: '08', agu: '08', agustus: '08', aug: '08',
      sep: '09', sept: '09', september: '09',
      okt: '10', oktober: '10', oct: '10',
      nov: '11', november: '11',
      des: '12', desember: '12', dec: '12',
    };
    const indoMatch = s.match(/(\d{1,2})\s*[-/ ]\s*([a-zA-Z]+)\s*[-/ ]\s*(\d{2,4})/);
    if (indoMatch) {
      const day = String(indoMatch[1]).padStart(2, '0');
      const monName = indoMatch[2].toLowerCase();
      let year = indoMatch[3];
      if (year.length === 2) year = '20' + year;
      const mon = Object.keys(indoMonths).find(k => monName.startsWith(k));
      if (mon) {
        return `${year}-${indoMonths[mon]}-${day}`;
      }
    }
    return s.length >= 10 ? s.slice(0, 10) : (fallbackDate || '2026-01-01');
  };

  // Helper to safely parse currency/money values from Excel
  const parseExcelMoney = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
    let s = String(val).trim().replace(/^[Rr][Pp]\.?\s*/, '').replace(/\s+/g, '');
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes('.') && !s.includes(',')) {
      const parts = s.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/\./g, '');
      }
    } else if (s.includes(',') && !s.includes('.')) {
      const parts = s.split(',');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(',', '.');
      }
    }
    s = s.replace(/[^0-9.-]/g, '');
    const num = parseFloat(s);
    return isNaN(num) ? 0 : Math.round(num);
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    if (importType === 'pelanggan') {
      const sampleData = [
        {
          'No': 1,
          'Nama Warga / Pelanggan': 'Ahmad Fauzi',
          'Jumlah Anggota Keluarga (Jiwa)': 4,
          'Kategori': 'Rumah Tangga',
          'Zona': 'Zona 1',
          'Sektor': 'Sektor 1',
          'Unit': 'Unit 1',
          'RT': '01',
          'Tanggal Mulai (YYYY-MM-DD)': '2026-01-01',
          'Status': 'Aktif',
          'Tarif Per Bulan (Rp)': 20000,
          'Catatan': 'Dekat pos ronda',
        },
        {
          'No': 2,
          'Nama Warga / Pelanggan': 'Warung Berkah Ibu Siti',
          'Jumlah Anggota Keluarga (Jiwa)': 5,
          'Kategori': 'Warung / Rumah Makan',
          'Zona': 'Zona 2',
          'Sektor': 'Sektor 2',
          'Unit': 'Unit 3',
          'RT': '02',
          'Tanggal Mulai (YYYY-MM-DD)': '2026-01-15',
          'Status': 'Aktif',
          'Tarif Per Bulan (Rp)': 35000,
          'Catatan': 'Usaha kuliner',
        },
        {
          'No': 3,
          'Nama Warga / Pelanggan': 'Klinik Sehat Medika',
          'Jumlah Anggota Keluarga (Jiwa)': 2,
          'Kategori': 'Kantor / Faskes',
          'Zona': 'Zona 3',
          'Sektor': 'Sektor 3',
          'Unit': 'Unit 2',
          'RT': '03',
          'Tanggal Mulai (YYYY-MM-DD)': '2026-02-01',
          'Status': 'Aktif',
          'Tarif Per Bulan (Rp)': 50000,
          'Catatan': 'Layanan kesehatan',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Pelanggan');
      XLSX.writeFile(wb, titles.templateName);
    } else if (importType === 'transaksi') {
      const sampleData = [
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-02',
          'Sumber Sampah': 'Pemukiman',
          'Metode Ukur (bak/karung)': 'bak',
          'Lokasi Pantai': '-',
          'Armada': 'Dump Truck 01',
          'Pelanggan Terlayani (KK) / Relawan': 109,
          'Karung Campur (bh)': 0,
          'Berat Rata Campur (kg)': 20,
          'Karung Organik (bh)': 0,
          'Berat Rata Organik (kg)': 25,
          'Karung Anorganik (bh)': 0,
          'Berat Rata Anorganik (kg)': 12,
          'Sampah Daur Ulang (Kg)': 0,
          'Sampah Plastik (Kg)': 0,
          'Sampah Residu (Kg)': 0,
          'Panjang Bak (cm)': 190,
          'Lebar Bak (cm)': 120,
          'Ketinggian Organik (cm)': 150,
          'Ketinggian Anorganik (cm)': 0,
          'Densitas Organik': 320,
          'Densitas Anorganik': 127,
          'Catatan': 'Ritase pagi dump truck pemukiman RT 01-03',
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-05',
          'Sumber Sampah': 'Pemukiman',
          'Metode Ukur (bak/karung)': 'karung',
          'Lokasi Pantai': '-',
          'Armada': 'Viar Roda 3',
          'Pelanggan Terlayani (KK) / Relawan': 85,
          'Karung Campur (bh)': 10,
          'Berat Rata Campur (kg)': 20,
          'Karung Organik (bh)': 15,
          'Berat Rata Organik (kg)': 25,
          'Karung Anorganik (bh)': 8,
          'Berat Rata Anorganik (kg)': 12,
          'Sampah Daur Ulang (Kg)': 0,
          'Sampah Plastik (Kg)': 0,
          'Sampah Residu (Kg)': 0,
          'Panjang Bak (cm)': 0,
          'Lebar Bak (cm)': 0,
          'Ketinggian Organik (cm)': 0,
          'Ketinggian Anorganik (cm)': 0,
          'Densitas Organik': 320,
          'Densitas Anorganik': 127,
          'Catatan': 'Ukur karung ritase pagi (10 campur, 15 organik, 8 anorganik)',
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-15',
          'Sumber Sampah': 'Clean-up Pantai',
          'Metode Ukur (bak/karung)': 'bak',
          'Lokasi Pantai': 'Pantai Pesisir Ouw',
          'Armada': 'Tim Relawan Bersih Pantai',
          'Pelanggan Terlayani (KK) / Relawan': 30,
          'Karung Campur (bh)': 0,
          'Berat Rata Campur (kg)': 20,
          'Karung Organik (bh)': 0,
          'Berat Rata Organik (kg)': 25,
          'Karung Anorganik (bh)': 0,
          'Berat Rata Anorganik (kg)': 12,
          'Sampah Daur Ulang (Kg)': 35.5,
          'Sampah Plastik (Kg)': 72.0,
          'Sampah Residu (Kg)': 21.5,
          'Panjang Bak (cm)': 0,
          'Lebar Bak (cm)': 0,
          'Ketinggian Organik (cm)': 0,
          'Ketinggian Anorganik (cm)': 0,
          'Densitas Organik': 320,
          'Densitas Anorganik': 127,
          'Catatan': 'Aksi bersih pantai bersama komunitas pemuda & relawan',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Transaksi');
      XLSX.writeFile(wb, titles.templateName);
    } else if (importType === 'pembayaran') {
      // Template Matriks Iuran 12 Bulan (Jan - Des)
      const sampleData = [
        {
          'No': 1,
          'Nama Warga / Pelanggan': 'Ahmad Fauzi',
          'RT': '01',
          'Tarif/Bulan': 20000,
          'Tahun': selectedYear,
          'Januari': 20000,
          'Februari': 20000,
          'Maret': 20000,
          'April': 20000,
          'Mei': 0,
          'Juni': 0,
          'Juli': 0,
          'Agustus': 0,
          'September': 0,
          'Oktober': 0,
          'November': 0,
          'Desember': 0,
        },
        {
          'No': 2,
          'Nama Warga / Pelanggan': 'Warung Berkah Ibu Siti',
          'RT': '02',
          'Tarif/Bulan': 35000,
          'Tahun': selectedYear,
          'Januari': 35000,
          'Februari': 35000,
          'Maret': 35000,
          'April': 0,
          'Mei': 0,
          'Juni': 0,
          'Juli': 0,
          'Agustus': 0,
          'September': 0,
          'Oktober': 0,
          'November': 0,
          'Desember': 0,
        },
        {
          'No': 3,
          'Nama Warga / Pelanggan': 'Klinik Sehat Medika',
          'RT': '03',
          'Tarif/Bulan': 50000,
          'Tahun': selectedYear,
          'Januari': 50000,
          'Februari': 50000,
          'Maret': 50000,
          'April': 50000,
          'Mei': 0,
          'Juni': 0,
          'Juli': 0,
          'Agustus': 0,
          'September': 0,
          'Oktober': 0,
          'November': 0,
          'Desember': 0,
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Matriks Iuran 12 Bulan');
      XLSX.writeFile(wb, titles.templateName);
    } else {
      const sampleData = [
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-06',
          'No Bukti': 'BBM-02',
          'Kategori': 'BBM & Transport',
          'Uraian': 'Bensin 8 Liter Armada Viar',
          'Jenis Kas (tunai/bank)': 'tunai',
          'Pemasukan (Rp)': 0,
          'Pengeluaran (Rp)': 128000,
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-08',
          'No Bukti': 'PJ-01',
          'Kategori': 'Penjualan Produk',
          'Uraian': 'Penjualan Sampah Daur Ulang Plastik',
          'Jenis Kas (tunai/bank)': 'tunai',
          'Pemasukan (Rp)': 194340,
          'Pengeluaran (Rp)': 0,
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-12',
          'No Bukti': 'BBM-03',
          'Kategori': 'BBM & Transport',
          'Uraian': 'Bensin 10 liter',
          'Jenis Kas (tunai/bank)': 'tunai',
          'Pemasukan (Rp)': 0,
          'Pengeluaran (Rp)': 160000,
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-18',
          'No Bukti': 'G-01',
          'Kategori': 'Gaji Petugas OPS',
          'Uraian': 'Gaji Petugas & Driver KP',
          'Jenis Kas (tunai/bank)': 'tunai',
          'Pemasukan (Rp)': 0,
          'Pengeluaran (Rp)': 950000,
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Arus Kas');
      XLSX.writeFile(wb, titles.templateName);
    }
  };

  // Process uploaded Excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setErrorMsg(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetList = workbook.SheetNames;
        setSheets(sheetList);

        const activeSheetName = sheetList[0] || '';
        setSelectedSheet(activeSheetName);

        if (activeSheetName) {
          parseSheetData(workbook, activeSheetName);
        }
      } catch (err: any) {
        console.error('Error parsing Excel file:', err);
        setErrorMsg('Gagal membaca file Excel. Pastikan format file .xlsx, .xls, atau .csv valid.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseSheetData = (workbook: XLSX.WorkBook, sheetName: string) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    // Convert to JSON array of objects
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    setRawRows(data);

    // Map data to target domain model
    if (importType === 'pelanggan') {
      const parsed: Pelanggan[] = [];
      data.forEach((row, idx) => {
        const rowNorm: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNorm[normalizeKey(k)] = row[k];
        });

        const nama = extractCol(rowNorm, [
          'namawargapelanggan',
          'namawarga',
          'namapelanggan',
          'nama',
          'namakk',
          'namakeluarga',
          'warga',
          'pelanggan',
        ]);
        if (!nama || String(nama).trim() === '') return;

        let kategori: KategoriPelanggan = 'Rumah Tangga';
        const katRaw = String(extractCol(rowNorm, ['kategori', 'kategoripelanggan', 'jenis']) || '').toLowerCase();
        if (katRaw.includes('warung') || katRaw.includes('makan')) kategori = 'Warung / Rumah Makan';
        else if (katRaw.includes('usaha') || katRaw.includes('toko')) kategori = 'Usaha / Toko';
        else if (katRaw.includes('kantor') || katRaw.includes('faskes') || katRaw.includes('klinik')) kategori = 'Kantor / Faskes';

        let status: StatusPelanggan = 'Aktif';
        const statRaw = String(extractCol(rowNorm, ['status', 'statuspelanggan']) || '').toLowerCase();
        if (statRaw.includes('berhenti') || statRaw.includes('non') || statRaw.includes('stop')) status = 'Berhenti';

        const rtRaw = extractCol(rowNorm, ['rt', 'rw', 'zona', 'wilayah']) || '01';
        const rt = String(rtRaw).padStart(2, '0');

        const anggotaRaw = extractCol(rowNorm, [
          'jumlahanggotakeluarga',
          'anggotakeluarga',
          'jumlahanggota',
          'anggota',
          'jumlahjiwa',
          'jiwa',
          'jmlanggota',
          'jmljiwa',
        ]);
        const jumlahAnggotaKeluarga = Number(anggotaRaw) > 0 ? Number(anggotaRaw) : 4;

        const zonaRaw = extractCol(rowNorm, ['zona', 'zonawilayah', 'wilayahzona']);
        const zona = zonaRaw ? String(zonaRaw).trim() : 'Zona 1';

        const sektorRaw = extractCol(rowNorm, ['sektor', 'namasektor']);
        const sektor = sektorRaw ? String(sektorRaw).trim() : 'Sektor 1';

        const unitRaw = extractCol(rowNorm, ['unit', 'namaunit']);
        const unit = unitRaw ? String(unitRaw).trim() : 'Unit 1';

        const rawTglMulai = extractCol(rowNorm, ['tanggalmulai', 'tglmulai', 'mulai', 'tanggal', 'tgl']);
        const tglMulai = parseExcelDate(rawTglMulai, '2026-01-01');

        const tarif = parseExcelMoney(extractCol(rowNorm, ['tarifperbulan', 'tarif', 'iuran', 'biaya', 'nominal'])) || 20000;
        const catatan = String(extractCol(rowNorm, ['catatan', 'keterangan']) || '');

        parsed.push({
          id: `pel-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          opsId: targetOpsId,
          no: Number(extractCol(rowNorm, ['no', 'nomor'])) || idx + 1,
          nama: String(nama).trim(),
          kategori,
          rt,
          jumlahAnggotaKeluarga,
          zona,
          sektor,
          unit,
          tanggalMulai: tglMulai,
          status,
          tarifPerBulan: tarif,
          catatan,
        });
      });
      setPreviewItems(parsed);
    } else if (importType === 'transaksi') {
      const parsed: TransaksiPengangkutan[] = [];
      data.forEach((row, idx) => {
        const rowNorm: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNorm[normalizeKey(k)] = row[k];
        });

        const rawTgl = rowNorm['tanggal'] || rowNorm['tgl'];
        let tgl = new Date().toISOString().split('T')[0];
        if (rawTgl instanceof Date) {
          tgl = rawTgl.toISOString().split('T')[0];
        } else if (rawTgl) {
          tgl = String(rawTgl);
        }

        const sumberRaw = String(rowNorm['sumbersampah'] || rowNorm['sumber'] || '').toLowerCase();
        const hasCleanUpKeys =
          rowNorm['daurulang'] !== undefined ||
          rowNorm['sampahdaurulang'] !== undefined ||
          rowNorm['sampahplastik'] !== undefined ||
          rowNorm['beratresidu'] !== undefined ||
          rowNorm['lokasipantai'] !== undefined;
        const isCleanUp = sumberRaw.includes('pantai') || sumberRaw.includes('clean') || hasCleanUpKeys;

        const armada = String(rowNorm['armada'] || rowNorm['kendaraan'] || (isCleanUp ? 'Tim Clean-up' : 'Dump Truck 01'));
        const catatan = String(rowNorm['catatan'] || '');

        if (isCleanUp) {
          const daur = Number(rowNorm['sampahdaurulang'] || rowNorm['daurulang'] || rowNorm['beratdaurulang'] || 0);
          const plastik = Number(rowNorm['sampahplastik'] || rowNorm['plastik'] || rowNorm['beratplastik'] || 0);
          const residu = Number(rowNorm['sampahresidu'] || rowNorm['residu'] || rowNorm['beratresidu'] || 0);
          const relawan = Number(rowNorm['relawan'] || rowNorm['jumlahrelawan'] || rowNorm['pelangganterlayani'] || rowNorm['kk'] || 25);
          const lokasi = String(rowNorm['lokasipantai'] || rowNorm['lokasi'] || rowNorm['pantai'] || 'Pantai Pesisir');

          parsed.push({
            id: `angkut-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            opsId: targetOpsId,
            tanggal: tgl.length === 10 ? tgl : '2026-03-01',
            hariTanggalLabel: formatDateID(tgl.length === 10 ? tgl : '2026-03-01'),
            sumberSampah: 'Clean-up Pantai',
            lokasiPantai: lokasi,
            jumlahRelawan: relawan,
            pelangganTerlayani: relawan,
            panjangPesisirMeter: Number(rowNorm['panjangpesisir'] || rowNorm['panjangpantai'] || 500),
            beratDaurUlangKg: Number(daur.toFixed(1)),
            beratPlastikKg: Number(plastik.toFixed(1)),
            beratResiduKg: Number(residu.toFixed(1)),
            panjangBakCm: 0,
            lebarBakCm: 0,
            ketinggianOrganikCm: 0,
            densitasOrganik: 320,
            volumeOrganikM3: Number((residu / 250).toFixed(2)),
            beratOrganikKg: Number(residu.toFixed(1)),
            ketinggianAnorganikCm: 0,
            densitasAnorganik: 127,
            volumeAnorganikM3: Number(((daur + plastik) / 127).toFixed(2)),
            beratAnorganikKg: Number((daur + plastik).toFixed(1)),
            armada,
            catatan,
          });
        } else {
          const kk = Number(rowNorm['pelangganterlayani'] || rowNorm['kk'] || rowNorm['pelanggan'] || 100);
          const metodeRaw = String(rowNorm['metodeukur'] || rowNorm['metode'] || '').toLowerCase();
          const hasKarungKeys =
            rowNorm['karungcampur'] !== undefined ||
            rowNorm['karungorganik'] !== undefined ||
            rowNorm['karunganorganik'] !== undefined ||
            rowNorm['totalkarung'] !== undefined ||
            rowNorm['karung'] !== undefined;
          const isKarung = metodeRaw.includes('karung') || hasKarungKeys;

          if (isKarung) {
            const kCampur = Number(rowNorm['karungcampur'] || 0);
            const brCampur = Number(rowNorm['beratratacampur'] || rowNorm['beratratakarungcampur'] || 20);
            const kOrg = Number(rowNorm['karungorganik'] || 0);
            const brOrg = Number(rowNorm['beratrataorganik'] || rowNorm['beratratakarungorganik'] || 25);
            const kAnorg = Number(rowNorm['karunganorganik'] || 0);
            const brAnorg = Number(rowNorm['beratrataanorganik'] || rowNorm['beratratakarunganorganik'] || 12);

            const beratCampurKg = Number((kCampur * brCampur).toFixed(1));
            const beratOrgMurni = kOrg * brOrg;
            const beratAnorgMurni = kAnorg * brAnorg;

            // Alokasi campur ke organik (60%) dan anorganik (40%) untuk kalkulasi komposisi
            const beratOrgFinal = Number((beratOrgMurni + beratCampurKg * 0.6).toFixed(1));
            const beratAnorgFinal = Number((beratAnorgMurni + beratCampurKg * 0.4).toFixed(1));
            const volOrg = Number((beratOrgFinal / 320).toFixed(2));
            const volAnorg = Number((beratAnorgFinal / 127).toFixed(2));

            parsed.push({
              id: `angkut-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              opsId: targetOpsId,
              tanggal: tgl.length === 10 ? tgl : '2026-03-01',
              hariTanggalLabel: formatDateID(tgl.length === 10 ? tgl : '2026-03-01'),
              sumberSampah: 'Pemukiman',
              metodeUkur: 'karung',
              karungCampur: kCampur,
              beratRataKarungCampur: brCampur,
              beratCampurKg,
              karungOrganik: kOrg,
              beratRataKarungOrganik: brOrg,
              karungAnorganik: kAnorg,
              beratRataKarungAnorganik: brAnorg,
              totalKarung: kCampur + kOrg + kAnorg,
              pelangganTerlayani: kk,
              panjangBakCm: 0,
              lebarBakCm: 0,
              ketinggianOrganikCm: 0,
              densitasOrganik: 320,
              volumeOrganikM3: volOrg,
              beratOrganikKg: beratOrgFinal,
              ketinggianAnorganikCm: 0,
              densitasAnorganik: 127,
              volumeAnorganikM3: volAnorg,
              beratAnorganikKg: beratAnorgFinal,
              catatan,
              armada,
            });
          } else {
            const p = Number(rowNorm['panjangbak'] || rowNorm['panjang'] || 190);
            const l = Number(rowNorm['lebarbak'] || rowNorm['lebar'] || 120);

            const hOrg = Number(rowNorm['ketinggianorganik'] || rowNorm['tinggiorganik'] || 0);
            const hAnorg = Number(rowNorm['ketinggiananorganik'] || rowNorm['tinggianorganik'] || 0);
            const densOrg = Number(rowNorm['densitasorganik'] || 320);
            const densAnorg = Number(rowNorm['densitasanorganik'] || 127);

            // Vol & Berat
            const volOrg = Number(((p * l * hOrg) / 1000000).toFixed(2));
            const beratOrg = Number((volOrg * densOrg).toFixed(1));
            const volAnorg = Number(((p * l * hAnorg) / 1000000).toFixed(2));
            const beratAnorg = Number((volAnorg * densAnorg).toFixed(1));

            parsed.push({
              id: `angkut-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              opsId: targetOpsId,
              tanggal: tgl.length === 10 ? tgl : '2026-03-01',
              hariTanggalLabel: formatDateID(tgl.length === 10 ? tgl : '2026-03-01'),
              sumberSampah: 'Pemukiman',
              metodeUkur: 'bak',
              pelangganTerlayani: kk,
              panjangBakCm: p,
              lebarBakCm: l,
              ketinggianOrganikCm: hOrg,
              densitasOrganik: densOrg,
              volumeOrganikM3: volOrg,
              beratOrganikKg: beratOrg,
              ketinggianAnorganikCm: hAnorg,
              densitasAnorganik: densAnorg,
              volumeAnorganikM3: volAnorg,
              beratAnorganikKg: beratAnorg,
              catatan,
              armada,
            });
          }
        }
      });
      setPreviewItems(parsed);
    } else if (importType === 'keuangan') {
      // Keuangan: Arus Kas Masuk & Keluar
      let lastValidDate = '2026-01-01';
      const parsed: TransaksiKas[] = [];
      data.forEach((row, idx) => {
        const rowNorm: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNorm[normalizeKey(k)] = row[k];
        });

        // 1. Ekstraksi Tanggal Transaksi (Pertahankan tanggal dari template, bukan tanggal import)
        const rawTgl = extractCol(rowNorm, [
          'tanggaltransaksi',
          'tanggalkegiatan',
          'tanggal',
          'tgltransaksi',
          'tgl',
          'date',
          'waktu',
          'hari',
          'periode',
        ]);
        let tgl = lastValidDate;
        if (rawTgl !== undefined && rawTgl !== null && String(rawTgl).trim() !== '') {
          tgl = parseExcelDate(rawTgl, lastValidDate);
          lastValidDate = tgl;
        }

        // 2. No Bukti & Uraian Deskripsi
        const noBukti = String(
          extractCol(rowNorm, ['nobukti', 'nokuitansi', 'bukti', 'kuitansi', 'kwitansi', 'ref', 'nomor', 'nota']) || `IMP/${idx + 1}`
        ).trim();

        const uraian = String(
          extractCol(rowNorm, ['uraian', 'deskripsi', 'keterangan', 'rincian', 'catatan', 'transaksi', 'keperluan']) || 'Transaksi Kas'
        ).trim();

        // 3. Kategori Kas
        const katRaw = String(extractCol(rowNorm, ['kategori', 'kategoriakun', 'poskas', 'pos', 'akun']) || '').trim();
        let kategori: KategoriKas = 'Lain-lain';
        const lowerKat = katRaw.toLowerCase();
        const lowerUraian = uraian.toLowerCase();

        if (lowerKat.includes('iuran') || lowerUraian.includes('iuran') || lowerUraian.includes('rumah')) {
          kategori = 'Iuran Warga';
        } else if (lowerKat.includes('produk') || lowerKat.includes('jual') || lowerUraian.includes('penjualan') || lowerUraian.includes('daur ulang')) {
          kategori = 'Penjualan Produk';
        } else if (lowerKat.includes('gaji') || lowerUraian.includes('gaji') || lowerUraian.includes('honor')) {
          kategori = 'Gaji Petugas OPS';
        } else if (lowerKat.includes('bbm') || lowerKat.includes('bensin') || lowerUraian.includes('bbm') || lowerUraian.includes('bensin') || lowerUraian.includes('solar')) {
          kategori = 'BBM & Transport';
        } else if (lowerKat.includes('air') || lowerKat.includes('listrik') || lowerUraian.includes('listrik') || lowerUraian.includes('pdam')) {
          kategori = 'Air dan Listrik';
        } else if (lowerKat.includes('rawat') || lowerKat.includes('alat') || lowerUraian.includes('service') || lowerUraian.includes('perawatan') || lowerUraian.includes('oli')) {
          kategori = 'Perawatan Alat';
        } else if (lowerKat.includes('sarana') || lowerKat.includes('bina') || lowerKat.includes('beli')) {
          kategori = 'Pembelian Peralatan';
        } else if (lowerKat.includes('admin') || lowerKat.includes('kantor') || lowerKat.includes('atk')) {
          kategori = 'ATK & Operasional Kantor';
        } else if (lowerKat) {
          kategori = 'Lain-lain';
        }

        // 4. Jenis Kas
        let jenisKas: JenisKas = 'tunai';
        const jenisRaw = String(extractCol(rowNorm, ['jeniskas', 'metode', 'metodebayar', 'rekening', 'kas', 'tipe']) || '').toLowerCase();
        if (jenisRaw.includes('bank') || jenisRaw.includes('transfer') || jenisRaw.includes('bca') || jenisRaw.includes('bri') || jenisRaw.includes('mandiri')) {
          jenisKas = 'bank';
        }

        // 5. Ekstraksi Nominal Uang Pemasukan vs Pengeluaran
        const rawMasuk = extractCol(rowNorm, ['pemasukanrp', 'pemasukan', 'debit', 'debet', 'penerimaan', 'terima', 'masuk']);
        const rawKeluar = extractCol(rowNorm, ['pengeluaranrp', 'pengeluaran', 'kredit', 'credit', 'biaya', 'beban', 'keluar', 'belanja']);
        const rawNominal = extractCol(rowNorm, ['nominaltransaksirp', 'nominaltransaksi', 'nominalrp', 'nominal', 'jumlahtransaksi', 'jumlahuang', 'jumlah', 'nilai', 'total', 'uang', 'tarif', 'setoran']);

        let masuk = Math.round(parseExcelMoney(rawMasuk));
        let keluar = Math.round(parseExcelMoney(rawKeluar));

        // Jika pemasukan dan pengeluaran spesifik belum terisi, periksa kolom nominal umum
        if (masuk === 0 && keluar === 0 && rawNominal !== undefined && rawNominal !== null) {
          const nominalVal = Math.round(parseExcelMoney(rawNominal));
          if (nominalVal !== 0) {
            const tipeArusRaw = String(extractCol(rowNorm, ['jenisatransaksi', 'tipearus', 'jenisaruskas', 'arus', 'arah', 'dk', 'debitkredit']) || '').toLowerCase();
            const isKeluar =
              tipeArusRaw.includes('keluar') ||
              tipeArusRaw.includes('kredit') ||
              tipeArusRaw.includes('pengeluaran') ||
              tipeArusRaw.includes('biaya') ||
              ['Gaji Petugas OPS', 'BBM & Transport', 'Air dan Listrik', 'Perawatan Alat', 'Bina Sarana', 'Biaya Administrasi'].includes(kategori) ||
              lowerUraian.includes('bensin') || lowerUraian.includes('gaji') || lowerUraian.includes('beli') || lowerUraian.includes('bayar') || lowerUraian.includes('biaya');

            if (isKeluar) {
              keluar = Math.abs(nominalVal);
            } else {
              masuk = Math.abs(nominalVal);
            }
          }
        }

        if (masuk > 0 || keluar > 0 || (uraian && uraian !== 'Transaksi Kas')) {
          parsed.push({
            id: `kas-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            opsId: targetOpsId,
            tanggal: tgl,
            noBukti,
            kategori,
            uraian,
            jenisKas,
            pemasukan: masuk,
            pengeluaran: keluar,
          });
        }
      });
      setPreviewItems(parsed);
    } else if (importType === 'pembayaran') {
      const parsed: (PembayaranIuran & { namaWargaDisplay?: string })[] = [];
      const monthKeysMap: Record<number, string[]> = {
        1: ['januari', 'jan', 'january', 'bulan1', 'bln1', 'm01', 'm1'],
        2: ['februari', 'feb', 'february', 'bulan2', 'bln2', 'm02', 'm2'],
        3: ['maret', 'mar', 'march', 'bulan3', 'bln3', 'm03', 'm3'],
        4: ['april', 'apr', 'bulan4', 'bln4', 'm04', 'm4'],
        5: ['mei', 'may', 'bulan5', 'bln5', 'm05', 'm5'],
        6: ['juni', 'jun', 'june', 'bulan6', 'bln6', 'm06', 'm6'],
        7: ['juli', 'jul', 'july', 'bulan7', 'bln7', 'm07', 'm7'],
        8: ['agustus', 'ags', 'agu', 'august', 'bulan8', 'bln8', 'm08', 'm8'],
        9: ['september', 'sep', 'sept', 'bulan9', 'bln9', 'm09', 'm9'],
        10: ['oktober', 'okt', 'october', 'bulan10', 'bln10', 'm10'],
        11: ['november', 'nov', 'bulan11', 'bln11', 'm11'],
        12: ['desember', 'des', 'december', 'bulan12', 'bln12', 'm12'],
      };

      data.forEach((row, idx) => {
        const rowNorm: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNorm[normalizeKey(k)] = row[k];
        });

        const namaWarga = String(
          extractCol(rowNorm, [
            'namawargapelanggan',
            'namawarga',
            'namapelanggan',
            'nama',
            'namakk',
            'warga',
            'pelanggan',
          ]) || ''
        ).trim();

        if (!namaWarga) return;

        // Pencarian pelanggan dengan fleksibilitas tinggi (nama persis, normalisasi, nomor urut)
        const normSearch = normalizeKey(namaWarga);
        const rawNo = extractCol(rowNorm, ['no', 'nomor', 'nourut']);
        const noVal = Number(rawNo);

        let matchingPelanggan =
          pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              (p.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() ||
               normalizeKey(p.nama) === normSearch)
          ) ||
          pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              (normalizeKey(p.nama).includes(normSearch) || normSearch.includes(normalizeKey(p.nama)))
          ) ||
          (noVal && !isNaN(noVal)
            ? pelangganList.find(p => (p.opsId === targetOpsId || targetOpsId === 'all') && p.no === noVal)
            : undefined);

        const pelangganId = matchingPelanggan
          ? matchingPelanggan.id
          : `pel-imp-${targetOpsId}-${idx}-${Date.now()}`;

        const rowYear = Number(extractCol(rowNorm, ['tahun', 'thn', 'year']) || selectedYear) || selectedYear;

        // Deteksi format matriks 12 bulan (Januari - Desember)
        let isMatrixFormat = false;
        for (let m = 1; m <= 12; m++) {
          const keys = monthKeysMap[m];
          // Cek exact key atau candidates
          if (keys.some(k => rowNorm[k] !== undefined && rowNorm[k] !== '')) {
            isMatrixFormat = true;
            break;
          }
          if (rowNorm[String(m)] !== undefined && rowNorm[String(m)] !== '') {
            isMatrixFormat = true;
            break;
          }
        }

        if (isMatrixFormat) {
          // Format Matriks: 12 kolom bulan
          for (let m = 1; m <= 12; m++) {
            const keys = monthKeysMap[m];
            const rawVal = extractCol(rowNorm, keys) ?? rowNorm[String(m)];
            const nominal = parseExcelMoney(rawVal);
            if (nominal > 0) {
              const mStr = String(m).padStart(2, '0');
              parsed.push({
                id: `byr-imp-${targetOpsId}-${pelangganId}-${rowYear}-${m}`,
                opsId: targetOpsId,
                pelangganId,
                tahun: rowYear,
                bulan: m,
                jumlah: nominal,
                tanggalBayar: `${rowYear}-${mStr}-15`,
                metode: 'Tunai',
                noBukti: `IURAN/${rowYear}/${mStr}`,
                keterangan: `Import Excel iuran ${namaWarga}`,
                namaWargaDisplay: namaWarga,
              });
            }
          }
        } else {
          // Format Baris Tunggal (Single row)
          const blnRaw = String(extractCol(rowNorm, ['bulan', 'bln', 'month', 'periode']) || '1').toLowerCase();
          let bulanNum = 1;
          for (let m = 1; m <= 12; m++) {
            if (monthKeysMap[m].some(k => blnRaw.includes(k))) {
              bulanNum = m;
              break;
            }
          }
          if (Number(blnRaw) >= 1 && Number(blnRaw) <= 12) {
            bulanNum = Number(blnRaw);
          }

          const nominal = parseExcelMoney(
            extractCol(rowNorm, ['nominaltransaksirp', 'nominalrp', 'nominal', 'jumlah', 'bayar', 'iuran', 'setoran', 'total', 'tarif'])
          );
          if (nominal > 0) {
            const mStr = String(bulanNum).padStart(2, '0');
            const rawTglBayar = extractCol(rowNorm, ['tanggalbayar', 'tglbayar', 'tanggal', 'tgl', 'date']);
            const tanggalBayar = parseExcelDate(rawTglBayar, `${rowYear}-${mStr}-10`);
            const metodeRaw = String(extractCol(rowNorm, ['metode', 'metodebayar', 'carabayar', 'jenis']) || '').toLowerCase();
            const metode = metodeRaw.includes('transfer') || metodeRaw.includes('bank') ? 'Transfer' : 'Tunai';

            parsed.push({
              id: `byr-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              opsId: targetOpsId,
              pelangganId,
              tahun: rowYear,
              bulan: bulanNum,
              jumlah: nominal,
              tanggalBayar,
              metode,
              noBukti: String(extractCol(rowNorm, ['nobukti', 'bukti', 'kuitansi', 'kwitansi']) || `IURAN/${rowYear}/${mStr}`),
              keterangan: String(extractCol(rowNorm, ['keterangan', 'catatan', 'uraian', 'deskripsi']) || `Import iuran ${namaWarga}`),
              namaWargaDisplay: namaWarga,
            });
          }
        }
      });
      setPreviewItems(parsed);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        parseSheetData(workbook, sheetName);
      } catch (e) {
        console.error('Error switching sheet:', e);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleExecuteImport = () => {
    if (previewItems.length === 0) {
      setErrorMsg('Tidak ada baris data yang valid untuk diimpor.');
      return;
    }

    const isReplace = importMode === 'replace';

    // Update targetOpsId on items
    const updatedItems = previewItems.map(item => ({
      ...item,
      opsId: targetOpsId,
    }));

    if (importType === 'pelanggan' && onImportPelanggan) {
      onImportPelanggan(updatedItems as Pelanggan[], isReplace, targetOpsId);
    } else if (importType === 'transaksi' && onImportPengangkutan) {
      onImportPengangkutan(updatedItems as TransaksiPengangkutan[], isReplace, targetOpsId);
    } else if (importType === 'keuangan' && onImportKas) {
      onImportKas(updatedItems as TransaksiKas[], isReplace, targetOpsId);
    } else if (importType === 'pembayaran' && onImportPembayaran) {
      // Auto-register any missing customer so they appear in PelangganView and payment matrix table
      const newCustomers: Pelanggan[] = [];
      const existingNames = new Set(pelangganList.map(p => p.nama.toLowerCase().trim()));

      (previewItems as (PembayaranIuran & { namaWargaDisplay?: string })[]).forEach((it) => {
        if (it.namaWargaDisplay && !existingNames.has(it.namaWargaDisplay.toLowerCase().trim())) {
          existingNames.add(it.namaWargaDisplay.toLowerCase().trim());
          newCustomers.push({
            id: it.pelangganId,
            opsId: targetOpsId,
            no: (pelangganList.length || 0) + newCustomers.length + 1,
            nama: it.namaWargaDisplay,
            kategori: 'Rumah Tangga',
            rt: '01',
            tanggalMulai: `${it.tahun}-01-01`,
            status: 'Aktif',
            tarifPerBulan: it.jumlah || 20000,
          });
        }
      });

      if (newCustomers.length > 0 && onImportPelanggan) {
        onImportPelanggan(newCustomers, false, targetOpsId);
      }

      onImportPembayaran(updatedItems as PembayaranIuran[], isReplace, targetOpsId);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">{titles.title}</h3>
              <p className="text-xs text-emerald-200/90">{titles.sub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Step 1: Download Template Excel & Instructions */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <span>1. Gunakan Template Standar SI-OPS</span>
              </span>
              <p className="text-emerald-800 text-xs mt-0.5">
                Pastikan kolom spreadsheet Anda sesuai dengan susunan kolom template untuk menghindari kesalahan baca.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Download Template Excel</span>
            </button>
          </div>

          {/* Step 2: Upload File Drag & Drop */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Pilih File Excel / CSV (.xlsx, .xls, .csv)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
            >
              <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-slate-800 text-sm">
                {fileName ? fileName : 'Klik untuk memilih file spreadsheet atau seret file ke sini'}
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Format yang didukung: Microsoft Excel (.xlsx, .xls) atau Comma Separated (.csv)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 3: Target Configuration & Sheet Selector */}
          {previewItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-100/70 rounded-xl border border-slate-200">
              {/* Sheet selector */}
              {sheets.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pilih Lembar (Sheet)
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={e => handleSheetChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {sheets.map(sh => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target OPS */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Masukkan ke Organisasi OPS:
                </label>
                <select
                  value={targetOpsId}
                  onChange={e => setTargetOpsId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-950"
                >
                  {opsList.map(ops => (
                    <option key={ops.id} value={ops.id}>
                      {ops.nama} ({ops.kode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Import Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mode Penggabungan:
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tambahkan (Append)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-rose-700">Timpa (Replace)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preview Table */}
          {previewItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pratinjau Data ({previewItems.length} {titles.countLabel} Berhasil Dibaca)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Menampilkan sampel 5 baris pertama
                </span>
              </div>

              <div className="max-h-48 overflow-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px] sticky top-0 border-b border-slate-200">
                    {importType === 'pelanggan' && (
                      <tr>
                        <th className="px-3 py-2">No</th>
                        <th className="px-3 py-2">Nama Warga</th>
                        <th className="px-2 py-2 text-center">Jiwa</th>
                        <th className="px-3 py-2">Kategori</th>
                        <th className="px-2 py-2 text-center">Zona / Sektor</th>
                        <th className="px-2 py-2 text-center">RT</th>
                        <th className="px-3 py-2">Tgl Mulai</th>
                        <th className="px-2 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-right">Tarif (Rp)</th>
                      </tr>
                    )}
                    {importType === 'transaksi' && (
                      <tr>
                        <th className="px-3 py-2">Tanggal</th>
                        <th className="px-3 py-2">Armada</th>
                        <th className="px-2 py-2 text-center">KK</th>
                        <th className="px-3 py-2 text-right">Organik (Kg)</th>
                        <th className="px-3 py-2 text-right">Anorganik (Kg)</th>
                        <th className="px-3 py-2 text-right">Total Berat</th>
                      </tr>
                    )}
                    {importType === 'keuangan' && (
                      <tr>
                        <th className="px-3 py-2">Tanggal</th>
                        <th className="px-3 py-2">No Bukti</th>
                        <th className="px-3 py-2">Kategori</th>
                        <th className="px-4 py-2">Uraian</th>
                        <th className="px-3 py-2 text-right">Pemasukan</th>
                        <th className="px-3 py-2 text-right">Pengeluaran</th>
                      </tr>
                    )}
                    {importType === 'pembayaran' && (
                      <tr>
                        <th className="px-3 py-2">Nama Warga / Pelanggan</th>
                        <th className="px-2 py-2 text-center">Bulan / Periode</th>
                        <th className="px-2 py-2 text-center">Tahun</th>
                        <th className="px-3 py-2 text-right">Nominal Iuran</th>
                        <th className="px-3 py-2">Tanggal Bayar</th>
                        <th className="px-2 py-2 text-center">Metode</th>
                        <th className="px-3 py-2">No Bukti</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewItems.slice(0, 5).map((row, idx) => {
                      if (importType === 'pelanggan') {
                        const p = row as Pelanggan;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-sans font-bold text-slate-900">{p.nama}</td>
                            <td className="px-2 py-2 text-center font-bold text-cyan-800">{p.jumlahAnggotaKeluarga || 4}</td>
                            <td className="px-3 py-2 font-sans text-slate-600">{p.kategori}</td>
                            <td className="px-2 py-2 text-center text-slate-700">
                              {p.zona || (p.sektor ? `${p.sektor}/${p.unit || ''}` : '-')}
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600">{p.rt}</td>
                            <td className="px-3 py-2 text-slate-600">{p.tanggalMulai}</td>
                            <td className="px-2 py-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                                  p.status === 'Aktif'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-700">
                              {formatRupiah(p.tarifPerBulan, false)}
                            </td>
                          </tr>
                        );
                      } else if (importType === 'transaksi') {
                        const t = row as TransaksiPengangkutan;
                        const total = (t.beratOrganikKg || 0) + (t.beratAnorganikKg || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-sans text-slate-900">{t.tanggal}</td>
                            <td className="px-3 py-2 font-sans text-slate-600">{t.armada}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{t.pelangganTerlayani}</td>
                            <td className="px-3 py-2 text-right text-emerald-700">
                              {formatNumberID(t.beratOrganikKg, 1)} kg
                            </td>
                            <td className="px-3 py-2 text-right text-amber-700">
                              {formatNumberID(t.beratAnorganikKg, 1)} kg
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900">
                              {formatNumberID(total, 1)} kg
                            </td>
                          </tr>
                        );
                      } else if (importType === 'pembayaran') {
                        const b = row as (PembayaranIuran & { namaWargaDisplay?: string });
                        const matching = pelangganList.find(p => p.id === b.pelangganId);
                        const customerName = b.namaWargaDisplay || matching?.nama || b.pelangganId;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-sans font-bold text-slate-900">
                              {customerName}
                              {!matching && (
                                <span className="ml-1 text-[10px] font-normal text-amber-600">(Baru)</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center font-sans font-semibold text-emerald-800">
                              {MONTH_NAMES_ID[b.bulan - 1] || `Bulan ${b.bulan}`}
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600 font-bold">{b.tahun}</td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-bold">
                              {formatRupiah(b.jumlah, false)}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{b.tanggalBayar}</td>
                            <td className="px-2 py-2 text-center font-sans text-[11px] font-semibold text-slate-700">
                              {b.metode}
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-[11px] font-mono">{b.noBukti}</td>
                          </tr>
                        );
                      } else {
                        const k = row as TransaksiKas;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700">{k.tanggal}</td>
                            <td className="px-3 py-2 font-sans text-slate-600">{k.noBukti}</td>
                            <td className="px-3 py-2 font-sans font-medium text-slate-800">{k.kategori}</td>
                            <td className="px-4 py-2 font-sans text-slate-600 truncate max-w-[180px]">{k.uraian}</td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-bold">
                              {k.pemasukan > 0 ? formatRupiah(k.pemasukan, false) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-rose-700 font-bold">
                              {k.pengeluaran > 0 ? formatRupiah(k.pengeluaran, false) : '-'}
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {previewItems.length > 0 && (
              <span>
                Total <strong>{previewItems.length}</strong> {titles.countLabel} akan dimasukkan ke{' '}
                <strong>{opsList.find(o => o.id === targetOpsId)?.nama || targetOpsId}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={previewItems.length === 0}
              onClick={handleExecuteImport}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 ${
                previewItems.length > 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Simpan &amp; Import ({previewItems.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
