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
  const [defaultImportBulan, setDefaultImportBulan] = useState<number>(2); // Default to Februari
  const [defaultImportZona, setDefaultImportZona] = useState<string>('Zona 1'); // Pilihan Zona khusus OPS Pulau Rhun
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed preview rows
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  const selectedOpsObj = opsList.find(o => o.id === targetOpsId);
  const isTargetMahu =
    targetOpsId === 'ops-mahu' ||
    targetOpsId === 'ops-mh' ||
    targetOpsId.toLowerCase().includes('mahu') ||
    targetOpsId.toLowerCase().includes('mh') ||
    (selectedOpsObj?.nama || '').toLowerCase().includes('mahu') ||
    (selectedOpsObj?.kode || '').toUpperCase().includes('MH') ||
    (selectedOpsObj?.wilayah || '').toLowerCase().includes('mahu');

  const isTargetOuw =
    targetOpsId === 'ops-ouw' ||
    targetOpsId.toLowerCase().includes('ouw') ||
    (selectedOpsObj?.nama || '').toLowerCase().includes('ouw') ||
    (selectedOpsObj?.kode || '').toUpperCase().includes('OUW') ||
    (selectedOpsObj?.kode || '').toUpperCase().includes('OW');

  const isTargetRhun =
    targetOpsId === 'ops-pulau-rhun' ||
    targetOpsId.toLowerCase().includes('rhun') ||
    (selectedOpsObj?.nama || '').toLowerCase().includes('rhun') ||
    (selectedOpsObj?.kode || '').toUpperCase().includes('PR') ||
    (selectedOpsObj?.wilayah || '').toLowerCase().includes('rhun') ||
    selectedOpsObj?.metodeUkurDefault === 'karung';

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

  // Helper to safely parse decimal/float numbers from Excel (e.g. weights, volumes, measurements)
  const parseExcelFloat = (val: any, defaultVal: number = 0): number => {
    if (val === null || val === undefined || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    let s = String(val).trim().replace(/^[Rr][Pp]\.?\s*/, '').replace(/\s+/g, '');
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',') && !s.includes('.')) {
      s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.-]/g, '');
    const num = parseFloat(s);
    return isNaN(num) ? defaultVal : num;
  };

  // Helper to normalize and match Pulau Rhun Zona (Zona 1, Zona 2, Zona 3, Semua Zona (1-3))
  const normalizeZona = (val: any): string | undefined => {
    if (val === null || val === undefined) return undefined;
    const s = String(val).trim();
    if (!s || s === '-' || s === '0') return undefined;
    const lower = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower === '1' || lower === 'zona1' || lower === 'z1') return 'Zona 1';
    if (lower === '2' || lower === 'zona2' || lower === 'z2') return 'Zona 2';
    if (lower === '3' || lower === 'zona3' || lower === 'z3') return 'Zona 3';
    if (
      lower.includes('semua') ||
      lower.includes('all') ||
      lower === '13' ||
      lower === '123' ||
      lower === 'zona13' ||
      lower === 'semuazona13'
    ) {
      return 'Semua Zona (1-3)';
    }
    if (lower.startsWith('zona')) {
      const num = lower.replace('zona', '');
      if (num === '1') return 'Zona 1';
      if (num === '2') return 'Zona 2';
      if (num === '3') return 'Zona 3';
    }
    return s;
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    if (importType === 'pelanggan') {
      const sampleData = [
        {
          'No': 1,
          'Nama Warga / Pelanggan': 'Ahmad Fauzi',
          'Penghuni Rumah (Jiwa)': 4,
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
          'Penghuni Rumah (Jiwa)': 5,
          'Kategori': 'Non Rumah Tangga',
          'Zona': 'Zona 2',
          'Sektor': 'Sektor 2',
          'Unit': 'Unit 3',
          'RT': '02',
          'Tanggal Mulai (YYYY-MM-DD)': '2026-01-15',
          'Status': 'Aktif',
          'Tarif Per Bulan (Rp)': 35000,
          'Catatan': 'Usaha kuliner warung',
        },
        {
          'No': 3,
          'Nama Warga / Pelanggan': 'Klinik Sehat Medika',
          'Penghuni Rumah (Jiwa)': 2,
          'Kategori': 'Non Rumah Tangga',
          'Zona': 'Zona 3',
          'Sektor': 'Sektor 3',
          'Unit': 'Unit 2',
          'RT': '03',
          'Tanggal Mulai (YYYY-MM-DD)': '2026-02-01',
          'Status': 'Aktif',
          'Tarif Per Bulan (Rp)': 50000,
          'Catatan': 'Fasilitas kesehatan',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Pelanggan');
      XLSX.writeFile(wb, titles.templateName);
    } else if (importType === 'transaksi') {
      const sampleData = [
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-02',
          'Zona': 'Zona 1',
          'Sumber Sampah': 'Pemukiman',
          'Metode Ukur (bak/karung)': 'karung',
          'Lokasi Pantai': '-',
          'Armada': 'Viar Roda 3',
          'Pelanggan Terlayani (KK) / Relawan': 109,
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
          'Catatan': 'Ritase karung Pulau Rhun Zona 1',
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-05',
          'Zona': 'Zona 2',
          'Sumber Sampah': 'Pemukiman',
          'Metode Ukur (bak/karung)': 'karung',
          'Lokasi Pantai': '-',
          'Armada': 'Viar Roda 3',
          'Pelanggan Terlayani (KK) / Relawan': 85,
          'Karung Campur (bh)': 12,
          'Berat Rata Campur (kg)': 20,
          'Karung Organik (bh)': 14,
          'Berat Rata Organik (kg)': 25,
          'Karung Anorganik (bh)': 6,
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
          'Catatan': 'Ukur karung ritase pagi Zona 2',
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-10',
          'Zona': 'Semua Zona (1-3)',
          'Sumber Sampah': 'Pemukiman',
          'Metode Ukur (bak/karung)': 'bak',
          'Lokasi Pantai': '-',
          'Armada': 'Dump Truck 01',
          'Pelanggan Terlayani (KK) / Relawan': 140,
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
          'Catatan': 'Ritase pagi dump truck seluruh zona',
        },
        {
          'Tanggal (YYYY-MM-DD)': '2026-03-15',
          'Zona': 'Zona 3',
          'Sumber Sampah': 'Clean-up Pantai',
          'Metode Ukur (bak/karung)': 'bak',
          'Lokasi Pantai': 'Pantai Pesisir',
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
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
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

    // Convert to 2D array first to detect header row and skip title/banner rows
    const rawRows2D: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawRows2D || rawRows2D.length === 0) {
      setPreviewItems([]);
      setRawRows([]);
      setErrorMsg('Sheet ini kosong atau tidak memiliki data.');
      return;
    }

    // Header keywords across domains
    const headerKeywords = [
      'tanggal', 'tgl', 'date', 'nama', 'warga', 'pelanggan', 'armada', 'kendaraan',
      'iuran', 'tarif', 'bulan', 'januari', 'februari', 'nobukti', 'kategori', 'uraian',
      'volume', 'berat', 'panjang', 'lebar', 'tinggi', 'ketinggian', 'karung', 'sampah',
      'kk', 'relawan', 'pemasukan', 'pengeluaran', 'nominal', 'kuitansi', 'kwitansi', 'metode',
      'sektor', 'unit', 'zona', 'rt', 'rw'
    ];

    let headerRowIdx = 0;
    let maxMatch = 0;
    for (let r = 0; r < Math.min(rawRows2D.length, 12); r++) {
      const row = rawRows2D[r];
      if (!Array.isArray(row)) continue;
      let matches = 0;
      row.forEach(cell => {
        const norm = normalizeKey(String(cell || ''));
        if (norm && headerKeywords.some(kw => norm.includes(kw))) {
          matches++;
        }
      });
      if (matches > maxMatch) {
        maxMatch = matches;
        headerRowIdx = r;
      }
    }

    const rawHeaders = (rawRows2D[headerRowIdx] || []).map(h => String(h || '').trim());
    const data: Record<string, any>[] = [];

    for (let r = headerRowIdx + 1; r < rawRows2D.length; r++) {
      const rowArr = rawRows2D[r];
      if (!Array.isArray(rowArr)) continue;
      // Skip row if completely empty
      const hasContent = rowArr.some(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (!hasContent) continue;

      const rowObj: Record<string, any> = {};
      rawHeaders.forEach((h, colIdx) => {
        const key = h || `col_${colIdx}`;
        rowObj[key] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
      });
      data.push(rowObj);
    }

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
        if (
          katRaw.includes('non') ||
          katRaw.includes('usaha') ||
          katRaw.includes('toko') ||
          katRaw.includes('warung') ||
          katRaw.includes('makan') ||
          katRaw.includes('kantor') ||
          katRaw.includes('faskes') ||
          katRaw.includes('klinik') ||
          katRaw.includes('bisnis') ||
          katRaw.includes('fasilitas')
        ) {
          kategori = 'Non Rumah Tangga';
        } else {
          kategori = 'Rumah Tangga';
        }

        let status: StatusPelanggan = 'Aktif';
        const statRaw = String(extractCol(rowNorm, ['status', 'statuspelanggan']) || '').toLowerCase();
        if (statRaw.includes('berhenti') || statRaw.includes('non') || statRaw.includes('stop')) status = 'Berhenti';

        const rtRaw = extractCol(rowNorm, ['rt', 'rukuntetangga', 'rw', 'norw', 'nort']) || '01';
        let rt = String(rtRaw).trim();
        if (/^\d+$/.test(rt)) {
          rt = rt.padStart(2, '0');
        } else if (/^rt\s*(\d+)/i.test(rt)) {
          const m = rt.match(/^rt\s*(\d+)/i);
          rt = m ? m[1].padStart(2, '0') : rt;
        }

        const anggotaRaw = extractCol(rowNorm, [
          'penghunirumah',
          'penghuni',
          'jumlahpenghunirumah',
          'jumlahpenghuni',
          'penghunijiwa',
          'penghunirumah(jiwa)',
          'jumlahanggotakeluarga',
          'anggotakeluarga',
          'jumlahanggota',
          'anggota',
          'jumlahjiwa',
          'jiwa',
          'jmlanggota',
          'jmljiwa',
        ]);
        const jumlahPenghuniRumah = Number(anggotaRaw) > 0 ? Number(anggotaRaw) : 4;

        const zonaRaw = extractCol(rowNorm, ['zona', 'zonawilayah', 'wilayahzona']);
        const zona = zonaRaw ? String(zonaRaw).trim() : (isTargetRhun ? 'Zona 1' : undefined);

        const sektorRaw = extractCol(rowNorm, [
          'sektor',
          'namasektor',
          'sektorwilayah',
          'wilayahsektor',
          'sektorwarga',
          'wargasektor',
          'sektorpelanggan',
          'sektorlayanan',
          'sektorunit',
          'unitsektor',
          'sektorrt',
          'kelompoksektor',
          'nosektor',
          'sektoral',
          'sktr',
        ]);

        let sektor: string | undefined = undefined;
        if (sektorRaw !== undefined && sektorRaw !== null && String(sektorRaw).trim() !== '' && String(sektorRaw).trim() !== '-') {
          let sVal = String(sektorRaw).trim();
          if (/^i+$/i.test(sVal)) {
            const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
            const n = romanMap[sVal.toLowerCase()];
            sVal = n ? `Sektor ${n}` : `Sektor ${sVal.toUpperCase()}`;
          } else if (/^\d+$/.test(sVal)) {
            sVal = `Sektor ${parseInt(sVal, 10)}`;
          } else if (/^sektor\s*([0-9ivx]+)/i.test(sVal)) {
            const m = sVal.match(/^sektor\s*([0-9ivx]+)/i);
            if (m) {
              const part = m[1];
              if (/^\d+$/.test(part)) {
                sVal = `Sektor ${parseInt(part, 10)}`;
              } else {
                const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
                const n = romanMap[part.toLowerCase()];
                sVal = n ? `Sektor ${n}` : `Sektor ${part.toUpperCase()}`;
              }
            }
          }
          sektor = sVal;
        } else if (isTargetMahu || isTargetOuw) {
          sektor = 'Sektor 1';
        }

        const unitRaw = extractCol(rowNorm, ['unit', 'namaunit', 'unitlayanan']);
        const unit = unitRaw ? String(unitRaw).trim() : (isTargetOuw ? 'Unit 1' : undefined);

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
          jumlahPenghuniRumah,
          jumlahAnggotaKeluarga: jumlahPenghuniRumah,
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
      let lastValidDate = '2026-03-01';

      data.forEach((row, idx) => {
        const rowNorm: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNorm[normalizeKey(k)] = row[k];
        });

        // Skip completely empty rows
        const hasValues = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!hasValues) return;

        // 1. Ekstraksi Tanggal Transaksi
        const rawTgl = extractCol(rowNorm, [
          'tanggalkegiatan',
          'tanggalangkut',
          'tglangkut',
          'tanggaltransaksi',
          'tanggal',
          'tgl',
          'date',
          'waktu',
          'hari',
          'periode',
          'haritanggal',
        ]);
        let tgl = lastValidDate;
        if (rawTgl !== undefined && rawTgl !== null && String(rawTgl).trim() !== '') {
          tgl = parseExcelDate(rawTgl, lastValidDate);
          lastValidDate = tgl;
        }

        // 2. Sumber Sampah & Deteksi Bersih Pantai
        const sumberRaw = String(extractCol(rowNorm, ['sumbersampah', 'sumber', 'asal', 'kategorisampah', 'kegiatan']) || '').toLowerCase();
        const lokasiPantaiRaw = extractCol(rowNorm, ['lokasipantai', 'pantai', 'lokasi', 'namapantai']);
        const daurRaw = extractCol(rowNorm, ['sampahdaurulang', 'daurulang', 'beratdaurulang', 'daurulangkg', 'anorganikdaurulang']);
        const plastikRaw = extractCol(rowNorm, ['sampahplastik', 'plastik', 'beratplastik', 'plastikkg']);
        const residuRaw = extractCol(rowNorm, ['sampahresidu', 'residu', 'beratresidu', 'residukg']);

        const daurVal = parseExcelFloat(daurRaw, 0);
        const plastikVal = parseExcelFloat(plastikRaw, 0);
        const residuVal = parseExcelFloat(residuRaw, 0);

        const isCleanUp =
          sumberRaw.includes('pantai') ||
          sumberRaw.includes('clean') ||
          (lokasiPantaiRaw !== undefined && String(lokasiPantaiRaw).trim() !== '' && String(lokasiPantaiRaw).trim() !== '-') ||
          (daurVal > 0 || plastikVal > 0 || residuVal > 0);

        // 3. Armada & Catatan & Zona
        const armada = String(
          extractCol(rowNorm, ['armada', 'kendaraan', 'mobil', 'truk', 'dumptruck', 'viar', 'motor', 'angkutan']) ||
          (isCleanUp ? 'Tim Clean-up Pantai' : 'Dump Truck 01')
        ).trim();
        const catatan = String(extractCol(rowNorm, ['catatan', 'keterangan', 'uraian', 'deskripsi', 'ket', 'notes']) || '').trim();
        const zonaRaw = extractCol(rowNorm, ['zonawilayah', 'wilayahzona', 'zona', 'wilayah']);
        const parsedZona = normalizeZona(zonaRaw);
        const finalZona = parsedZona || (isTargetRhun ? defaultImportZona : undefined);

        // 4. KK / Relawan
        const rawKK = extractCol(rowNorm, [
          'pelangganterlayanikkrelawan',
          'pelangganterlayanikk',
          'pelangganterlayani',
          'jumlahrelawan',
          'relawan',
          'pelanggan',
          'kk',
          'peserta',
        ]);
        const kk = Number(rawKK) > 0 ? Number(rawKK) : (isCleanUp ? 25 : 100);

        // 5. Cek jika file sudah mencantumkan Volume / Berat Langsung
        const directVolOrg = parseExcelFloat(extractCol(rowNorm, ['volumeorganikm3', 'volumeorganik', 'volorganik', 'volorg', 'volumeorg']), 0);
        const directBeratOrg = parseExcelFloat(extractCol(rowNorm, ['totalberatorganikkg', 'totalberatorganik', 'beratorganikkg', 'beratorganik', 'beratkgorganik', 'beratorg']), 0);
        const directVolAnorg = parseExcelFloat(extractCol(rowNorm, ['volumeanorganikm3', 'volumeanorganik', 'volanorganik', 'volanorg', 'volumeanorg']), 0);
        const directBeratAnorg = parseExcelFloat(extractCol(rowNorm, ['totalberatanorganikkg', 'totalberatanorganik', 'beratanorganikkg', 'beratanorganik', 'beratkganorganik', 'beratanorg']), 0);
        const directTotalVol = parseExcelFloat(extractCol(rowNorm, ['totalvolumem3', 'volumetotalm3', 'totalvolume', 'volumetotal', 'voltotal', 'totalvol', 'volm3']), 0);
        const directTotalBerat = parseExcelFloat(extractCol(rowNorm, ['totalberatsampahkg', 'totalberatsampah', 'totalberatkg', 'berattotalkg', 'totalberat', 'berattotal', 'totalsampah', 'beratkg']), 0);

        if (isCleanUp) {
          const lokasiFinal = lokasiPantaiRaw && String(lokasiPantaiRaw).trim() !== '-' ? String(lokasiPantaiRaw).trim() : 'Pantai Pesisir';
          const relawanCount = isNaN(kk) || kk <= 0 ? 25 : kk;
          const panjangPantai = parseExcelFloat(extractCol(rowNorm, ['panjangpesisirmeter', 'panjangpesisir', 'panjangpantai', 'pesisirmeter']), 500);

          parsed.push({
            id: `angkut-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            opsId: targetOpsId,
            tanggal: tgl,
            hariTanggalLabel: formatDateID(tgl),
            sumberSampah: 'Clean-up Pantai',
            zona: finalZona,
            _hasExcelZona: Boolean(parsedZona),
            lokasiPantai: lokasiFinal,
            jumlahRelawan: relawanCount,
            pelangganTerlayani: relawanCount,
            panjangPesisirMeter: panjangPantai,
            beratDaurUlangKg: Number(daurVal.toFixed(1)),
            beratPlastikKg: Number(plastikVal.toFixed(1)),
            beratResiduKg: Number(residuVal.toFixed(1)),
            panjangBakCm: 0,
            lebarBakCm: 0,
            ketinggianOrganikCm: 0,
            densitasOrganik: 320,
            volumeOrganikM3: Number((residuVal / 250).toFixed(2)),
            beratOrganikKg: Number(residuVal.toFixed(1)),
            ketinggianAnorganikCm: 0,
            densitasAnorganik: 127,
            volumeAnorganikM3: Number(((daurVal + plastikVal) / 127).toFixed(2)),
            beratAnorganikKg: Number((daurVal + plastikVal).toFixed(1)),
            armada,
            catatan,
          } as any);
        } else {
          // Regular Pemukiman: Cek apakah metode Karung atau Bak
          const metodeRaw = String(extractCol(rowNorm, ['metodeukurbakkarung', 'metodeukur', 'metode', 'caraukur']) || '').toLowerCase();
          const kCampurRaw = extractCol(rowNorm, ['karungcampurbh', 'karungcampur', 'campur', 'karungcampurbuah']);
          const kOrgRaw = extractCol(rowNorm, ['karungorganikbh', 'karungorganik', 'karungorganikbuah', 'organikkarung']);
          const kAnorgRaw = extractCol(rowNorm, ['karunganorganikbh', 'karunganorganik', 'karunganorganikbuah', 'anorganikkarung']);
          const totKarungRaw = extractCol(rowNorm, ['totalkarungbh', 'totalkarung', 'totalkrg', 'jumlahkarung', 'karung']);

          const isKarung =
            metodeRaw.includes('karung') ||
            kCampurRaw !== undefined ||
            kOrgRaw !== undefined ||
            kAnorgRaw !== undefined ||
            (totKarungRaw !== undefined && Number(totKarungRaw) > 0);

          if (isKarung) {
            const kCampur = parseExcelFloat(kCampurRaw, 0);
            const brCampur = parseExcelFloat(extractCol(rowNorm, ['beratratacampurkgkrg', 'beratratacampurkg', 'beratratacampur', 'beratratakarungcampur', 'ratacampur']), 20);
            const kOrg = parseExcelFloat(kOrgRaw, 0);
            const brOrg = parseExcelFloat(extractCol(rowNorm, ['beratrataorganikkgkrg', 'beratrataorganikkg', 'beratrataorganik', 'beratratakarungorganik', 'rataorganik']), 25);
            const kAnorg = parseExcelFloat(kAnorgRaw, 0);
            const brAnorg = parseExcelFloat(extractCol(rowNorm, ['beratrataanorganikkgkrg', 'beratrataanorganikkg', 'beratrataanorganik', 'beratratakarunganorganik', 'rataanorganik']), 12);

            const beratCampurKg = Number((kCampur * brCampur).toFixed(1));
            const beratOrgMurni = kOrg * brOrg;
            const beratAnorgMurni = kAnorg * brAnorg;

            let beratOrgFinal = Number((beratOrgMurni + beratCampurKg * 0.6).toFixed(1));
            let beratAnorgFinal = Number((beratAnorgMurni + beratCampurKg * 0.4).toFixed(1));

            // Jika file memiliki kolom berat langsung
            if (directBeratOrg > 0) beratOrgFinal = directBeratOrg;
            if (directBeratAnorg > 0) beratAnorgFinal = directBeratAnorg;
            if (beratOrgFinal === 0 && beratAnorgFinal === 0 && directTotalBerat > 0) {
              beratOrgFinal = Number((directTotalBerat * 0.6).toFixed(1));
              beratAnorgFinal = Number((directTotalBerat * 0.4).toFixed(1));
            }

            const volOrg = directVolOrg > 0 ? directVolOrg : Number((beratOrgFinal / 320).toFixed(2));
            const volAnorg = directVolAnorg > 0 ? directVolAnorg : Number((beratAnorgFinal / 127).toFixed(2));

            const totalKarungCount = (totKarungRaw !== undefined && Number(totKarungRaw) > 0)
              ? Number(totKarungRaw)
              : (kCampur + kOrg + kAnorg);

            parsed.push({
              id: `angkut-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              opsId: targetOpsId,
              tanggal: tgl,
              hariTanggalLabel: formatDateID(tgl),
              sumberSampah: 'Pemukiman',
              metodeUkur: 'karung',
              zona: finalZona,
              _hasExcelZona: Boolean(parsedZona),
              karungCampur: kCampur,
              beratRataKarungCampur: brCampur,
              beratCampurKg,
              karungOrganik: kOrg,
              beratRataKarungOrganik: brOrg,
              karungAnorganik: kAnorg,
              beratRataKarungAnorganik: brAnorg,
              totalKarung: totalKarungCount,
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
            } as any);
          } else {
            // Metode Ukur Dimensi Bak Kendaraan
            const p = parseExcelFloat(extractCol(rowNorm, ['panjangbakcm', 'panjangbak', 'panjang', 'pbak']), 190);
            const l = parseExcelFloat(extractCol(rowNorm, ['lebarbakcm', 'lebarbak', 'lebar', 'lbak']), 120);

            let hOrg = parseExcelFloat(extractCol(rowNorm, ['ketinggianorganikcm', 'tinggiorganikcm', 'ketinggianorganik', 'tinggiorganik', 'tinggiorg', 'horganik', 'horg']), 0);
            let hAnorg = parseExcelFloat(extractCol(rowNorm, ['ketinggiananorganikcm', 'tinggianorganikcm', 'ketinggiananorganik', 'tinggianorganik', 'tinggianorg', 'hanorganik', 'hanorg']), 0);

            const densOrg = parseExcelFloat(extractCol(rowNorm, ['densitasorganik', 'densorg', 'densitasorg']), 320);
            const densAnorg = parseExcelFloat(extractCol(rowNorm, ['densitasanorganik', 'densanorg', 'densitasanorg']), 127);

            let volOrg = Number(((p * l * hOrg) / 1000000).toFixed(2));
            let beratOrg = Number((volOrg * densOrg).toFixed(1));
            let volAnorg = Number(((p * l * hAnorg) / 1000000).toFixed(2));
            let beratAnorg = Number((volAnorg * densAnorg).toFixed(1));

            // Jika file memiliki volume atau berat langsung:
            if (directVolOrg > 0) {
              volOrg = directVolOrg;
              beratOrg = directBeratOrg > 0 ? directBeratOrg : Number((volOrg * densOrg).toFixed(1));
              if (hOrg === 0 && p > 0 && l > 0) {
                hOrg = Math.round((volOrg * 1000000) / (p * l));
              }
            } else if (directBeratOrg > 0) {
              beratOrg = directBeratOrg;
              volOrg = Number((beratOrg / densOrg).toFixed(2));
              if (hOrg === 0 && p > 0 && l > 0) {
                hOrg = Math.round((volOrg * 1000000) / (p * l));
              }
            }

            if (directVolAnorg > 0) {
              volAnorg = directVolAnorg;
              beratAnorg = directBeratAnorg > 0 ? directBeratAnorg : Number((volAnorg * densAnorg).toFixed(1));
              if (hAnorg === 0 && p > 0 && l > 0) {
                hAnorg = Math.round((volAnorg * 1000000) / (p * l));
              }
            } else if (directBeratAnorg > 0) {
              beratAnorg = directBeratAnorg;
              volAnorg = Number((beratAnorg / densAnorg).toFixed(2));
              if (hAnorg === 0 && p > 0 && l > 0) {
                hAnorg = Math.round((volAnorg * 1000000) / (p * l));
              }
            }

            // Jika hanya total berat atau volume yang ada:
            if (beratOrg === 0 && beratAnorg === 0) {
              if (directTotalBerat > 0) {
                beratOrg = Number((directTotalBerat * 0.6).toFixed(1));
                beratAnorg = Number((directTotalBerat * 0.4).toFixed(1));
                volOrg = Number((beratOrg / densOrg).toFixed(2));
                volAnorg = Number((beratAnorg / densAnorg).toFixed(2));
                if (p > 0 && l > 0) {
                  hOrg = Math.round((volOrg * 1000000) / (p * l));
                  hAnorg = Math.round((volAnorg * 1000000) / (p * l));
                }
              } else if (directTotalVol > 0) {
                volOrg = Number((directTotalVol * 0.6).toFixed(2));
                volAnorg = Number((directTotalVol * 0.4).toFixed(2));
                beratOrg = Number((volOrg * densOrg).toFixed(1));
                beratAnorg = Number((volAnorg * densAnorg).toFixed(1));
                if (p > 0 && l > 0) {
                  hOrg = Math.round((volOrg * 1000000) / (p * l));
                  hAnorg = Math.round((volAnorg * 1000000) / (p * l));
                }
              }
            }

            parsed.push({
              id: `angkut-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              opsId: targetOpsId,
              tanggal: tgl,
              hariTanggalLabel: formatDateID(tgl),
              sumberSampah: 'Pemukiman',
              metodeUkur: 'bak',
              zona: finalZona,
              _hasExcelZona: Boolean(parsedZona),
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
            } as any);
          }
        }
      });

      if (parsed.length === 0) {
        setErrorMsg('Data transaksi tidak ditemukan atau format kolom tidak cocok. Pastikan file memiliki kolom Tanggal, Armada, atau Data Sampah (Tinggi/Volume/Berat/Karung). Anda dapat mengunduh Template Transaksi terlebih dahulu.');
      } else {
        setErrorMsg(null);
      }
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
        1: ['januari', 'jan', 'january', 'bayarjan', 'bayarjanuari', 'iuranjan', 'iuranjanuari', 'bulan1', 'bln1', 'bulanjanuari', '1januari'],
        2: ['februari', 'feb', 'february', 'bayarfeb', 'bayarfebruari', 'iuranfeb', 'iuranfebruari', 'bulan2', 'bln2', 'bulanfebruari', '2februari'],
        3: ['maret', 'mar', 'march', 'bayarmar', 'bayarmaret', 'iuranmar', 'iuranmaret', 'bulan3', 'bln3', 'bulanmaret', '3maret'],
        4: ['april', 'apr', 'bayarapr', 'bayarapril', 'iuranapr', 'iuranapril', 'bulan4', 'bln4', 'bulanapril', '4april'],
        5: ['mei', 'may', 'bayarmei', 'iuranmei', 'bulan5', 'bln5', 'bulanmei', '5mei'],
        6: ['juni', 'jun', 'june', 'bayarjun', 'bayarjuni', 'iuranjun', 'iuranjuni', 'bulan6', 'bln6', 'bulanjuni', '6juni'],
        7: ['juli', 'jul', 'july', 'bayarjul', 'bayarjuli', 'iuranjul', 'iuranjuli', 'bulan7', 'bln7', 'bulanjuli', '7juli'],
        8: ['agustus', 'ags', 'agu', 'august', 'bayarags', 'bayaragu', 'bayaragustus', 'iuranags', 'iuranagustus', 'bulan8', 'bln8', 'bulanagustus', '8agustus'],
        9: ['september', 'sep', 'sept', 'bayarsep', 'bayarsept', 'bayarseptember', 'iuransep', 'iuranseptember', 'bulan9', 'bln9', 'bulanseptember', '9september'],
        10: ['oktober', 'okt', 'october', 'bayarokt', 'bayaroktober', 'iuranokt', 'iuranoktober', 'bulan10', 'bln10', 'bulanoktober', '10oktober'],
        11: ['november', 'nov', 'bayarnov', 'bayarnovember', 'iurannov', 'iurannovember', 'bulan11', 'bln11', 'bulannovember', '11november'],
        12: ['desember', 'des', 'december', 'bayardes', 'bayardesember', 'iurandes', 'iurandesember', 'bulan12', 'bln12', 'bulandesember', '12desember'],
      };

      // Kumpulkan semua keys unik dari header baris data
      const allRowKeys = new Set<string>();
      data.forEach(r => Object.keys(r).forEach(k => allRowKeys.add(normalizeKey(k))));

      // Deteksi kolom bulan yang benar-benar ada di spreadsheet
      const detectedMonthCols: Record<number, string> = {};
      for (let m = 1; m <= 12; m++) {
        const candidates = monthKeysMap[m];
        for (const k of allRowKeys) {
          if (candidates.includes(k)) {
            detectedMonthCols[m] = k;
            break;
          }
        }
      }

      const isMatrixSpreadsheet = Object.keys(detectedMonthCols).length > 0;

      // Lacak ID pelanggan yang sudah dicocokkan dalam batch file ini
      // agar warga dengan nama yang sama (misal Weni Ibrahim RT 01 dan Weni Ibrahim RT 02)
      // dipetakan secara akurat ke profil masing-masing dan tidak saling menimpa.
      const usedPelangganIdsInBatch = new Set<string>();

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

        // Ekstraksi data kolom pendukung untuk pencocokan presisi
        const normSearch = normalizeKey(namaWarga);
        const rawNo = extractCol(rowNorm, ['no', 'nomor', 'nourut']);
        const noVal = Number(rawNo);
        const rawRt = extractCol(rowNorm, ['rt', 'rukuntetangga', 'rw', 'dusun']);
        const rtVal = rawRt !== undefined && rawRt !== null ? String(rawRt).trim().padStart(2, '0') : '';

        // Prioritas 1: Cocokkan NO + NAMA (Paling presisi jika ada nama ganda di nomor urut berbeda)
        let matchingPelanggan: Pelanggan | undefined = undefined;

        if (noVal && !isNaN(noVal)) {
          matchingPelanggan = pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              p.no === noVal &&
              (p.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() ||
               normalizeKey(p.nama) === normSearch)
          );
        }

        // Prioritas 2: Cocokkan NAMA + RT (jika kolom RT tersedia di file Excel) di antara pelanggan yang belum terpakai di batch ini
        if (!matchingPelanggan && rtVal) {
          matchingPelanggan = pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              !usedPelangganIdsInBatch.has(p.id) &&
              (p.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() ||
               normalizeKey(p.nama) === normSearch) &&
              (p.rt === rtVal || String(Number(p.rt)) === String(Number(rtVal)))
          );
        }

        // Prioritas 3: Cocokkan NAMA PERSIS di antara pelanggan yang BELUM dipakai di batch impor ini
        if (!matchingPelanggan) {
          matchingPelanggan = pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              !usedPelangganIdsInBatch.has(p.id) &&
              (p.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() ||
               normalizeKey(p.nama) === normSearch)
          );
        }

        // Prioritas 4: Fallback nama persis (jika semua pelanggan dengan nama tersebut sudah pernah dipakai)
        if (!matchingPelanggan) {
          matchingPelanggan = pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              (p.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() ||
               normalizeKey(p.nama) === normSearch)
          );
        }

        // Prioritas 5: Cocokkan substring hanya untuk nama yang cukup panjang (>= 5 huruf) dan belum terpakai
        if (!matchingPelanggan && normSearch.length >= 5) {
          matchingPelanggan = pelangganList.find(
            p =>
              (p.opsId === targetOpsId || targetOpsId === 'all') &&
              !usedPelangganIdsInBatch.has(p.id) &&
              normalizeKey(p.nama).length >= 5 &&
              (normalizeKey(p.nama).includes(normSearch) || normSearch.includes(normalizeKey(p.nama)))
          );
        }

        // Prioritas 6: Fallback berdasarkan nomor urut hanya jika belum dipakai di batch ini
        if (!matchingPelanggan && noVal && !isNaN(noVal)) {
          matchingPelanggan = pelangganList.find(
            p => (p.opsId === targetOpsId || targetOpsId === 'all') && !usedPelangganIdsInBatch.has(p.id) && p.no === noVal
          );
        }

        const pelangganId = matchingPelanggan
          ? matchingPelanggan.id
          : `pel-imp-${targetOpsId}-${idx}-${Date.now()}`;

        if (matchingPelanggan) {
          usedPelangganIdsInBatch.add(matchingPelanggan.id);
        }

        const rowYear = Number(extractCol(rowNorm, ['tahun', 'thn', 'year']) || selectedYear) || selectedYear;

        if (isMatrixSpreadsheet) {
          // Format Matriks: Hanya ekstraksi bulan yang kolomnya memang ADA di file dan nominalnya terisi > 0
          Object.entries(detectedMonthCols).forEach(([mStrKey, colKey]) => {
            const m = Number(mStrKey);
            const rawVal = rowNorm[colKey];
            if (rawVal === undefined || rawVal === null) return;
            const strVal = String(rawVal).trim().toLowerCase();
            // Lewati jika cell kosong, strip '-', '0', 'nihil', atau tidak ada setoran
            if (strVal === '' || strVal === '-' || strVal === '0' || strVal === 'rp 0' || strVal === 'rp -' || strVal === 'nihil' || strVal === 'kosong') {
              return;
            }
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
          });
        } else {
          // Format Baris Tunggal (Single row per transaction)
          const blnRaw = String(extractCol(rowNorm, ['bulan', 'bln', 'month', 'periode', 'bulanke']) || '').toLowerCase().trim();
          let bulanNum = 0;
          if (blnRaw && blnRaw !== '-' && blnRaw !== '0') {
            for (let m = 1; m <= 12; m++) {
              if (monthKeysMap[m].some(k => blnRaw.includes(k))) {
                bulanNum = m;
                break;
              }
            }
            if (bulanNum === 0 && Number(blnRaw) >= 1 && Number(blnRaw) <= 12) {
              bulanNum = Number(blnRaw);
            }
          }

          // Jika kolom bulan tidak ada di spreadsheet baris tunggal, gunakan bulan yang dipilih di UI
          if (bulanNum === 0) {
            bulanNum = defaultImportBulan;
          }

          // Nominal pembayaran murni dari kolom setoran/bayar riil (tidak menggunakan tarif atau kata umum)
          const rawNominal = extractCol(rowNorm, [
            'nominaltransaksirp',
            'nominalbayar',
            'nominalsetoran',
            'jumlahbayar',
            'jumlahsetoran',
            'totalbayar',
            'nominal',
          ]);

          if (rawNominal === undefined || rawNominal === null) return;
          const strNom = String(rawNominal).trim().toLowerCase();
          if (strNom === '' || strNom === '-' || strNom === '0' || strNom === 'rp 0' || strNom === 'rp -') {
            return;
          }

          const nominal = parseExcelMoney(rawNominal);

          if (nominal > 0) {
            const mStr = String(bulanNum).padStart(2, '0');
            const rawTglBayar = extractCol(rowNorm, ['tanggalbayar', 'tglbayar', 'tanggal', 'tgl', 'date']);
            const tanggalBayar = parseExcelDate(rawTglBayar, `${rowYear}-${mStr}-15`);
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
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
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

    // Update targetOpsId on items and remove internal metadata
    const updatedItems = previewItems.map(item => {
      const cleanItem = { ...item };
      delete (cleanItem as any)._hasExcelZona;
      if (importType === 'transaksi' && isTargetRhun && !cleanItem.zona) {
        cleanItem.zona = defaultImportZona;
      }
      return {
        ...cleanItem,
        opsId: targetOpsId,
      };
    });

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
            jumlahPenghuniRumah: 4,
            jumlahAnggotaKeluarga: 4,
            ...(isTargetMahu || isTargetOuw ? { sektor: 'Sektor 1' } : {}),
            ...(isTargetOuw ? { unit: 'Unit 1' } : {}),
            ...(isTargetRhun ? { zona: 'Zona 1' } : {}),
            tanggalMulai: `${it.tahun}-${String(it.bulan || 1).padStart(2, '0')}-01`,
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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 bg-emerald-800 rounded-xl shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base tracking-tight truncate">{titles.title}</h3>
              <p className="text-[10px] sm:text-xs text-emerald-200/90 truncate">{titles.sub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/80 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-slate-700 overflow-y-auto flex-1 overscroll-contain">
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
                  onChange={e => {
                    const newOpsId = e.target.value;
                    setTargetOpsId(newOpsId);
                    const newTargetObj = opsList.find(o => o.id === newOpsId);
                    const isNewMahu =
                      newOpsId === 'ops-mahu' ||
                      newOpsId === 'ops-mh' ||
                      newOpsId.toLowerCase().includes('mahu') ||
                      newOpsId.toLowerCase().includes('mh') ||
                      (newTargetObj?.nama || '').toLowerCase().includes('mahu') ||
                      (newTargetObj?.kode || '').toUpperCase().includes('MH');

                    const isNewRhun =
                      newOpsId === 'ops-pulau-rhun' ||
                      newOpsId.toLowerCase().includes('rhun') ||
                      (newTargetObj?.nama || '').toLowerCase().includes('rhun') ||
                      (newTargetObj?.kode || '').toUpperCase().includes('PR') ||
                      (newTargetObj?.wilayah || '').toLowerCase().includes('rhun') ||
                      newTargetObj?.metodeUkurDefault === 'karung';

                    if (previewItems.length > 0) {
                      if (importType === 'pelanggan') {
                        setPreviewItems(prev =>
                          prev.map(item => ({
                            ...item,
                            opsId: newOpsId,
                            sektor: isNewMahu && (!item.sektor || item.sektor === '-') ? 'Sektor 1' : item.sektor,
                          }))
                        );
                      } else if (importType === 'transaksi') {
                        setPreviewItems(prev =>
                          prev.map(item => ({
                            ...item,
                            opsId: newOpsId,
                            zona: isNewRhun ? (item.zona || defaultImportZona) : item.zona,
                          }))
                        );
                      }
                    }
                  }}
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

              {/* Target Zona Default (Khusus Transaksi Rit Sampah Pulau Rhun) */}
              {importType === 'transaksi' && isTargetRhun && (
                <div className="sm:col-span-2 bg-emerald-50/80 border border-emerald-300 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                      Pilihan Zona Pengangkutan (Khusus OPS Pulau Rhun):
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                      Pilah Zona
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={defaultImportZona}
                      onChange={e => {
                        const newZona = e.target.value;
                        setDefaultImportZona(newZona);
                        if (previewItems.length > 0) {
                          setPreviewItems(prev =>
                            prev.map(item => ({
                              ...item,
                              zona: item._hasExcelZona ? item.zona : newZona,
                            }))
                          );
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900 shadow-2xs"
                    >
                      <option value="Zona 1">Zona 1</option>
                      <option value="Zona 2">Zona 2</option>
                      <option value="Zona 3">Zona 3</option>
                      <option value="Semua Zona (1-3)">Semua Zona (1-3)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-emerald-800 mt-1.5">
                    Zona ini akan diterapkan ke catatan rit sampah yang diimpor, sehingga data dapat difilter per zona di menu Transaksi Pengangkutan. Jika file Excel Anda sudah memiliki kolom Zona, nilai dari Excel akan diprioritaskan.
                  </p>
                </div>
              )}

              {/* Target Bulan Default (Khusus Pembayaran jika format baris tanpa nama bulan) */}
              {importType === 'pembayaran' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bulan Iuran (Jika Baris Tanpa Kolom Bulan):
                  </label>
                  <select
                    value={defaultImportBulan}
                    onChange={e => {
                      const newBln = Number(e.target.value);
                      setDefaultImportBulan(newBln);
                      if (selectedFile && sheets.length > 0) {
                        const reader = new FileReader();
                        reader.onload = evt => {
                          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                          const wb = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
                          parseSheetData(wb, selectedSheet || sheets[0]);
                        };
                        reader.readAsArrayBuffer(selectedFile);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    {MONTH_NAMES_ID.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        Bulan {i + 1} - {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                        <th className="px-3 py-2">Nama Pelanggan / Rumah</th>
                        <th className="px-2 py-2 text-center" title="Penghuni Rumah (Jiwa)">Penghuni (Jiwa)</th>
                        <th className="px-3 py-2">Kategori</th>
                        <th className="px-2 py-2 text-center">
                          {isTargetMahu ? 'Sektor' : isTargetOuw ? 'Sektor / Unit' : isTargetRhun ? 'Zona' : 'Wilayah / Sektor'}
                        </th>
                        <th className="px-2 py-2 text-center">RT</th>
                        <th className="px-3 py-2">Tgl Mulai</th>
                        <th className="px-2 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-right">Tarif (Rp)</th>
                      </tr>
                    )}
                    {importType === 'transaksi' && (
                      <tr>
                        <th className="px-3 py-2">Tanggal</th>
                        {isTargetRhun && <th className="px-2 py-2 text-center">Zona</th>}
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
                            <td className="px-2 py-2 text-center font-bold text-teal-800 font-mono">{p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga || 4} Jiwa</td>
                            <td className="px-3 py-2 font-sans text-slate-600">{p.kategori}</td>
                            <td className="px-2 py-2 text-center text-slate-700">
                              {p.sektor
                                ? (p.unit ? `${p.sektor} / ${p.unit}` : p.sektor)
                                : (p.zona || '-')}
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
                        const isClean = t.sumberSampah === 'Clean-up Pantai';
                        const isKrg = t.metodeUkur === 'karung';
                        const displayZona = t.zona || (isTargetRhun ? defaultImportZona : undefined);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-sans text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{t.tanggal}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                    isClean
                                      ? 'bg-cyan-100 text-cyan-800'
                                      : isKrg
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isClean ? 'Clean-Up' : isKrg ? 'Karung' : 'Bak'}
                                </span>
                              </div>
                            </td>
                            {isTargetRhun && (
                              <td className="px-2 py-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold border ${
                                    displayZona === 'Zona 1'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : displayZona === 'Zona 2'
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : displayZona === 'Zona 3'
                                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {displayZona || 'Zona 1'}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-2 font-sans text-slate-600">
                              <span className="truncate max-w-[140px] block" title={t.armada}>
                                {t.armada}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600">
                              {t.pelangganTerlayani} {isClean ? 'rel' : 'KK'}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-semibold">
                              {formatNumberID(t.beratOrganikKg, 1)} kg
                            </td>
                            <td className="px-3 py-2 text-right text-amber-700 font-semibold">
                              {formatNumberID(t.beratAnorganikKg, 1)} kg
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50/50">
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
