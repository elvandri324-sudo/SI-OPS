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
