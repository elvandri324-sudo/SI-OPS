export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatRupiah(amount: number, includeCents: boolean = true): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = parts[1];

  if (includeCents) {
    return `${isNegative ? '-Rp' : 'Rp'}${integerPart},${cents}`;
  }
  return `${isNegative ? '-Rp ' : 'Rp '}${integerPart}`;
}

export function formatNumberID(value: number, decimals: number = 1): string {
  const parts = value.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimals === 0) return integerPart;
  return `${integerPart},${parts[1] || '0'}`;
}

export function getLastDateOfMonth(year: number, month: number): string {
  // month is 1-12, new Date(year, month, 0) returns last day of that month
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function formatDateID(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = dayNames[date.getDay()];
    const monthName = MONTH_NAMES_ID[month - 1];
    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatShortDateID(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const monthName = MONTH_NAMES_ID[month - 1] || '';
    return `${day} ${monthName} ${year}`;
  } catch {
    return dateString;
  }
}

export function terbilang(n: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];
  n = Math.floor(Math.abs(n));

  if (n < 12) return bilangan[n];
  if (n < 20) return terbilang(n - 10) + ' Belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10);
  if (n < 200) return 'Seratus ' + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100);
  if (n < 2000) return 'Seribu ' + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta ' + terbilang(n % 1000000);
  if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + ' Miliar ' + terbilang(n % 1000000000);
  return n.toString();
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const content = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseYearMonthFromDate(dateStr?: string): { year: number; month: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s || s === '-') return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY-MM
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year >= 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month > 12 && day <= 12) {
      month = day;
    }
    if (year >= 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // 3. Indonesian / English month name (e.g. "15 Februari 2026", "Feb 2026", "Februari 2026")
  const indoMonths: Record<string, number> = {
    jan: 1, januari: 1,
    feb: 2, februari: 2,
    mar: 3, maret: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6,
    jul: 7, juli: 7,
    ags: 8, agu: 8, agustus: 8, aug: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oktober: 10, oct: 10,
    nov: 11, november: 11,
    des: 12, desember: 12, dec: 12,
  };
  const lower = s.toLowerCase();
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    for (const [key, mNum] of Object.entries(indoMonths)) {
      if (lower.includes(key)) {
        return { year, month: mNum };
      }
    }
  }

  return null;
}

/**
 * Menentukan apakah pelanggan dihitung dalam target tagihan pada tahun & bulan (1-12) tertentu.
 * Aturan:
 * 1. Jika pelanggan tidak aktif (status !== 'Aktif'), maka TIDAK dihitung dalam target tagihan.
 * 2. Jika pelanggan aktif (status === 'Aktif'), dihitung mulai dari bulan & tahun dia ikut layanan (tanggalMulai).
 */
export function isPelangganTargetDiBulan(
  pelanggan: { status: string; tanggalMulai?: string },
  tahun: number,
  bulan: number
): boolean {
  if (pelanggan.status !== 'Aktif') {
    return false;
  }

  const parsedStart = parseYearMonthFromDate(pelanggan.tanggalMulai);
  if (parsedStart) {
    if (tahun < parsedStart.year) return false;
    if (tahun === parsedStart.year && bulan < parsedStart.month) return false;
  }

  return true;
}

/**
 * Menghitung jumlah bulan aktif layanan pelanggan dalam 1 tahun tertentu (0 - 12 bulan).
 * Jika pelanggan tidak aktif, hasilnya 0.
 */
export function hitungBulanTargetPelangganSetahun(
  pelanggan: { status: string; tanggalMulai?: string },
  tahun: number
): number {
  if (pelanggan.status !== 'Aktif') return 0;
  let count = 0;
  for (let m = 1; m <= 12; m++) {
    if (isPelangganTargetDiBulan(pelanggan, tahun, m)) {
      count++;
    }
  }
  return count;
}

/**
 * Menentukan nominal tarif iuran per bulan untuk seorang pelanggan pada tahun & bulan tertentu.
 * Aturan khusus:
 * - OPS Tanah Rata ('ops-tanah-rata') pada Februari 2026 (bulan 2, tahun 2026) tarifnya Rp 10.000
 *   karena layanan baru resmi dimulai pada tanggal 15 Februari 2026.
 * - Pembayaran Rp 10.000 pada Feb 2026 di Tanah Rata dianggap Lunas penuh.
 */
export function getTarifPelangganBulan(
  pelanggan: { opsId?: string; tarifPerBulan?: number },
  tahun: number,
  bulan: number
): number {
  const baseTarif = pelanggan.tarifPerBulan || 20000;
  const isTanahRata = pelanggan.opsId === 'ops-tanah-rata';
  if (isTanahRata && tahun === 2026 && bulan === 2) {
    return 10000;
  }
  return baseTarif;
}

/**
 * Menghitung akumulasi total target tagihan nominal seorang pelanggan dalam 1 tahun penuh.
 * Memperhitungkan variasi tarif khusus bulanan (misal Feb 2026 Tanah Rata = Rp 10.000).
 */
export function hitungTargetTagihanPelangganSetahun(
  pelanggan: { opsId?: string; status: string; tanggalMulai?: string; tarifPerBulan?: number },
  tahun: number
): number {
  if (pelanggan.status !== 'Aktif') return 0;
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    if (isPelangganTargetDiBulan(pelanggan, tahun, m)) {
      total += getTarifPelangganBulan(pelanggan, tahun, m);
    }
  }
  return total;
}


