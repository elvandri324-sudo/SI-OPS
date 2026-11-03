export type MetodeUkurSampah = 'bak' | 'karung';

export interface OPSProfile {
  id: string;
  nama: string; // e.g. "OPS Tanah Rata"
  kode: string; // e.g. "TR-01"
  wilayah: string; // e.g. "Kelurahan Tanah Rata, RW 01 - 04"
  ketua: string; // e.g. "H. Ahmad Fauzi"
  bendahara: string; // e.g. "Siti Rahmawati"
  kontak: string;
  alamat: string;
  metodeUkurDefault?: MetodeUkurSampah; // default 'bak' atau 'karung'
  panjangBakDefaultCm: number; // default 190
  lebarBakDefaultCm: number; // default 120
  densitasOrganikDefault: number; // default 320 kg/m3
  densitasAnorganikDefault: number; // default 127 kg/m3
  // Standar Berat Rata-rata per Karung (Kg/karung):
  beratRataKarungCampurDefault?: number; // default 20 kg
  beratRataKarungOrganikDefault?: number; // default 25 kg
  beratRataKarungAnorganikDefault?: number; // default 12 kg
  tarifDefault: number; // default 20000
}

export type StatusPelanggan = 'Aktif' | 'Berhenti';
export type KategoriPelanggan = 'Rumah Tangga' | 'Usaha / Toko' | 'Warung / Rumah Makan' | 'Kantor / Faskes';

export interface Pelanggan {
  id: string;
  opsId: string;
  no: number;
  nama: string;
  kategori: KategoriPelanggan;
  rt: string;
  tanggalMulai: string; // YYYY-MM-DD
  status: StatusPelanggan;
  tanggalBerhenti?: string; // YYYY-MM-DD
  tarifPerBulan: number;
  catatan?: string;
  jumlahAnggotaKeluarga?: number; // Jumlah anggota keluarga (jiwa)
  zona?: string; // Pilihan Zona (khusus OPS Pulau Rhun: Zona 1-3)
  sektor?: string; // Khusus OPS Ouw (Sektor)
  unit?: string; // Khusus OPS Ouw (Unit)
}

export interface PembayaranIuran {
  id: string;
  opsId: string;
  pelangganId: string;
  tahun: number;
  bulan: number; // 1 (Jan) - 12 (Des)
  jumlah: number;
  tanggalBayar: string;
  metode: 'Tunai' | 'Transfer';
  noBukti?: string;
  keterangan?: string;
}

export type SumberSampah = 'Pemukiman' | 'Clean-up Pantai';

export interface TransaksiPengangkutan {
  id: string;
  opsId: string;
  tanggal: string; // YYYY-MM-DD
  hariTanggalLabel: string; // e.g. "Minggu, 15 Februari 2026"
  sumberSampah?: SumberSampah; // default: 'Pemukiman'
  metodeUkur?: MetodeUkurSampah; // default 'bak' atau 'karung'
  zona?: string; // Khusus OPS Pulau Rhun: 'Zona 1' | 'Zona 2' | 'Zona 3' | 'Semua Zona (1-3)'
  pelangganTerlayani: number; // e.g. 109 KK (atau relawan jika clean-up)
  panjangBakCm: number; // e.g. 190
  lebarBakCm: number; // e.g. 120
  // Organik (Reguler Pemukiman)
  ketinggianOrganikCm: number;
  densitasOrganik: number; // kg/m3 (default 320)
  volumeOrganikM3: number; // (P * L * T) / 1,000,000
  beratOrganikKg: number; // volume * densitas
  // Anorganik (Reguler Pemukiman)
  ketinggianAnorganikCm: number;
  densitasAnorganik: number; // kg/m3 (default 127)
  volumeAnorganikM3: number; // (P * L * T) / 1,000,000
  beratAnorganikKg: number; // volume * densitas

  // Khusus Pengukuran Menggunakan Alat Ukur Karung (Campur, Organik, Anorganik):
  karungCampur?: number; // Jumlah karung sampah campur
  beratRataKarungCampur?: number; // Berat rata-rata (kg/karung)
  beratCampurKg?: number; // karungCampur * beratRataKarungCampur

  karungOrganik?: number; // Jumlah karung sampah organik
  beratRataKarungOrganik?: number; // Berat rata-rata (kg/karung)

  karungAnorganik?: number; // Jumlah karung sampah anorganik
  beratRataKarungAnorganik?: number; // Berat rata-rata (kg/karung)

  totalKarung?: number; // karungCampur + karungOrganik + karungAnorganik

  // Khusus Aksi Clean-up di Pantai:
  // Input sampahnya: sampah daur ulang, plastik, dan residu
  beratDaurUlangKg?: number; // Sampah daur ulang (kardus/kertas, kaca, kaleng/logam)
  beratPlastikKg?: number; // Sampah plastik (botol PET, kresek, cup, sedotan, sachet)
  beratResiduKg?: number; // Sampah residu (kain basah, puntung, styrofoam hancur, sampah kotor)
  lokasiPantai?: string; // e.g. "Pantai Ouw", "Pesisir Negeri Ouw"
  jumlahRelawan?: number; // e.g. 25 orang
  panjangPesisirMeter?: number; // e.g. 500 meter

  catatan?: string;
  armada?: string;
}

export type KategoriPemasukan =
  | 'Iuran Warga'
  | 'Penjualan Produk'
  | 'Hibah'
  | 'Lain-lain';

export type KategoriPengeluaran =
  | 'Gaji Petugas OPS'
  | 'BBM & Transport'
  | 'Air dan Listrik'
  | 'Perawatan Alat'
  | 'ATK & Operasional Kantor'
  | 'Lain-lain'
  | 'Pembelian Peralatan';

export type KategoriKas = KategoriPemasukan | KategoriPengeluaran;

export const KATEGORI_PEMASUKAN_LIST: KategoriPemasukan[] = [
  'Iuran Warga',
  'Penjualan Produk',
  'Hibah',
  'Lain-lain',
];

export const KATEGORI_PENGELUARAN_LIST: KategoriPengeluaran[] = [
  'Gaji Petugas OPS',
  'BBM & Transport',
  'Air dan Listrik',
  'Perawatan Alat',
  'ATK & Operasional Kantor',
  'Lain-lain',
  'Pembelian Peralatan',
];

export type JenisKas = 'tunai' | 'bank';

export interface TransaksiKas {
  id: string;
  opsId: string;
  tanggal: string; // YYYY-MM-DD
  noBukti: string;
  kategori: KategoriKas;
  uraian: string;
  jenisKas: JenisKas;
  pemasukan: number;
  pengeluaran: number;
  saldo?: number; // calculated in ledger
}

export interface KomposisiConfig {
  organikPct: number; // 62.3
  plastikPct: number; // 12.2
  kertasPct: number; // 8.2
  kacaPct: number; // 1.2
  logamPct: number; // 3.6
  popokPembalutPct: number; // 6.8
  lainnyaPct: number; // 5.7
  // Plastik sub-breakdown
  petPct: number; // 14.3
  hdpePct: number; // 5.7
  pvcPct: number; // 2.7
  ldpePct: number; // 23.1
  ppPct: number; // 38.4
  psPct: number; // 1.5
  plastikLainPct: number; // 14.6
}
