import {
  OPSProfile,
  Pelanggan,
  PembayaranIuran,
  TransaksiPengangkutan,
  TransaksiKas,
  KomposisiConfig,
  AdminAccount,
  StatusPelanggan,
  JenisDaurUlangItem,
  TransaksiDaurUlang,
} from '../types/ops';
import {
  INITIAL_OPS_LIST,
  INITIAL_PELANGGAN,
  INITIAL_PEMBAYARAN,
  INITIAL_PENGANGKUTAN,
  INITIAL_KAS,
  DEFAULT_KOMPOSISI,
  INITIAL_ADMIN_ACCOUNTS,
  INITIAL_JENIS_DAUR_ULANG,
  INITIAL_TRANSAKSI_DAUR_ULANG,
} from './seedData';
import { getLastDateOfMonth, MONTH_NAMES_ID } from '../utils/format';

const DB_KEY = 'si_ops_local_database_v1';

export interface DatabaseState {
  opsList: OPSProfile[];
  pelangganList: Pelanggan[];
  pembayaranList: PembayaranIuran[];
  pengangkutanList: TransaksiPengangkutan[];
  kasList: TransaksiKas[];
  komposisiConfigs: Record<string, KomposisiConfig>;
  activeOPSId: string;
  adminAccounts: AdminAccount[];
  currentAdminId: string;
  jenisDaurUlangList?: JenisDaurUlangItem[];
  transaksiDaurUlangList?: TransaksiDaurUlang[];
}

export const GUEST_VIEWER_ACCOUNT: AdminAccount = {
  id: 'guest-viewer',
  username: 'pengunjung',
  nama: 'Pengunjung',
  email: 'pengunjung@siops.id',
  password: '',
  role: 'viewer',
  opsId: 'all',
  opsNama: 'Semua OPS (Hanya Lihat)',
  kontak: '-',
  avatarColor: '#0284c7', // Sky-600
  createdAt: '2026-01-01',
};

export const ALL_OPS_PROFILE: OPSProfile = {
  id: 'all',
  nama: 'Semua OPS (Konsolidasikan Data)',
  kode: 'SEMUA-OPS',
  wilayah: 'Seluruh Wilayah / Gabungan Semua OPS',
  ketua: 'Koordinator Gabungan',
  bendahara: 'Bendahara Konsolidasi',
  kontak: '-',
  alamat: 'Rekapitulasi Konsolidasi Seluruh Wilayah',
  metodeUkurDefault: 'bak',
  panjangBakDefaultCm: 190,
  lebarBakDefaultCm: 120,
  densitasOrganikDefault: 320,
  densitasAnorganikDefault: 127,
  beratRataKarungCampurDefault: 20,
  beratRataKarungOrganikDefault: 25,
  beratRataKarungAnorganikDefault: 12,
  tarifDefault: 20000,
};

class LocalDB {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadFromStorage();
    // Harmonisasi rekapitulasi iuran arus kas agar 100% konsisten dengan matriks pembayaran
    this.syncAllIuranMatriksKeKas(2026);
  }

  private loadFromStorage(): DatabaseState {
    try {
      const data = localStorage.getItem(DB_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.opsList && parsed.pelangganList) {
          // Check if there are legacy fragmented kas entries (kas-sync-* or old daily items)
          const hasFragmentedKas = parsed.kasList && (
            parsed.kasList.some((k: TransaksiKas) => k.id.startsWith('kas-sync-')) ||
            parsed.kasList.some((k: TransaksiKas) => k.id === 'kas-1' && k.kategori === 'Iuran Warga')
          );

          if (hasFragmentedKas) {
            // Remove legacy fragmented iuran entries from kasList
            parsed.kasList = parsed.kasList.filter(
              (k: TransaksiKas) => !k.id.startsWith('kas-sync-') &&
              !(k.kategori === 'Iuran Warga' && ['kas-1','kas-2','kas-3','kas-4','kas-5','kas-8','kas-9','kas-11','kas-13','kas-14','kas-15','kas-17','kas-18','kas-19','kas-21'].includes(k.id))
            );
            this.saveToStorage(parsed);
          }

          // Ensure clean-up sample data exists in pengangkutanList
          if (parsed.pengangkutanList && !parsed.pengangkutanList.some((p: TransaksiPengangkutan) => p.sumberSampah === 'Clean-up Pantai')) {
            const cleanUpSamples = INITIAL_PENGANGKUTAN.filter(p => p.sumberSampah === 'Clean-up Pantai');
            parsed.pengangkutanList.push(...cleanUpSamples);
          }

          // Filter out legacy built-in sample demo accounts
          const defaultBuiltinDummyIds = new Set([
            'admin-tanah-rata',
            'admin-mekar-asri',
            'admin-pulau-rhun',
            'admin-negeri-ouw',
            'admin-entri-data',
            'admin-viewer',
          ]);
          const defaultBuiltinDummyUsernames = new Set([
            'admin.tanahrata',
            'admin.mekarasri',
            'admin.rhun',
            'admin.ouw',
            'entri.data',
            'pengamat',
          ]);

          if (parsed.adminAccounts && Array.isArray(parsed.adminAccounts)) {
            parsed.adminAccounts = parsed.adminAccounts.filter(
              (a: AdminAccount) =>
                !defaultBuiltinDummyIds.has(a.id) &&
                !defaultBuiltinDummyUsernames.has(a.username) &&
                !(a.id.startsWith('admin-ops-') && a.password === 'admin123' && a.email?.endsWith('@siops.id'))
            );
          } else {
            parsed.adminAccounts = [];
          }

          // Ensure master registered superadmin account exists if empty
          if (parsed.adminAccounts.length === 0 || !parsed.adminAccounts.some((a: AdminAccount) => a.role === 'superadmin')) {
            parsed.adminAccounts = [...INITIAL_ADMIN_ACCOUNTS, ...parsed.adminAccounts.filter((a: AdminAccount) => a.id !== 'admin-super')];
          }

          if (!parsed.currentAdminId || (!localStorage.getItem('si_ops_auth_session_user') && parsed.currentAdminId !== GUEST_VIEWER_ACCOUNT.id)) {
            parsed.currentAdminId = GUEST_VIEWER_ACCOUNT.id;
          }

          // Jika mode pengunjung, langsung default dan tampilkan data Semua OPS (Data Gabungan)
          if (parsed.currentAdminId === GUEST_VIEWER_ACCOUNT.id) {
            parsed.activeOPSId = 'all';
          }

          // Normalize customer category: Non Rumah Tangga tidak hitung jiwa
          if (parsed.pelangganList && Array.isArray(parsed.pelangganList)) {
            parsed.pelangganList = parsed.pelangganList.map((p: any) => {
              const kat = p.kategori === 'Rumah Tangga' ? 'Rumah Tangga' : 'Non Rumah Tangga';
              if (kat === 'Non Rumah Tangga') {
                return {
                  ...p,
                  kategori: 'Non Rumah Tangga',
                  jumlahPenghuniRumah: undefined,
                  jumlahAnggotaKeluarga: undefined,
                };
              }
              const jiwa = Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga) > 0 ? Number(p.jumlahPenghuniRumah || p.jumlahAnggotaKeluarga) : 4;
              return {
                ...p,
                kategori: 'Rumah Tangga',
                jumlahPenghuniRumah: jiwa,
                jumlahAnggotaKeluarga: jiwa,
              };
            });
          }

          // Ensure Sampah Daur Ulang master list and transactions exist
          if (!parsed.jenisDaurUlangList || parsed.jenisDaurUlangList.length === 0) {
            parsed.jenisDaurUlangList = INITIAL_JENIS_DAUR_ULANG;
          }
          if (!parsed.transaksiDaurUlangList) {
            parsed.transaksiDaurUlangList = INITIAL_TRANSAKSI_DAUR_ULANG;
          }

          this.saveToStorage(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse database from localStorage, initializing defaults', e);
    }

    const defaultState: DatabaseState = {
      opsList: INITIAL_OPS_LIST,
      pelangganList: INITIAL_PELANGGAN,
      pembayaranList: INITIAL_PEMBAYARAN,
      pengangkutanList: INITIAL_PENGANGKUTAN,
      kasList: INITIAL_KAS,
      komposisiConfigs: {
        'ops-tanah-rata': DEFAULT_KOMPOSISI,
        'ops-mekar-asri': DEFAULT_KOMPOSISI,
      },
      activeOPSId: 'all',
      adminAccounts: INITIAL_ADMIN_ACCOUNTS,
      currentAdminId: GUEST_VIEWER_ACCOUNT.id,
      jenisDaurUlangList: INITIAL_JENIS_DAUR_ULANG,
      transaksiDaurUlangList: INITIAL_TRANSAKSI_DAUR_ULANG,
    };
    this.saveToStorage(defaultState);
    return defaultState;
  }

  private saveToStorage(state: DatabaseState) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  // --- OPS Management ---
  public getOPSList(): OPSProfile[] {
    return this.state.opsList;
  }

  public getActiveOPS(): OPSProfile {
    if (this.state.activeOPSId === 'all') {
      return ALL_OPS_PROFILE;
    }
    const found = this.state.opsList.find(o => o.id === this.state.activeOPSId);
    return found || this.state.opsList[0] || INITIAL_OPS_LIST[0];
  }

  public setActiveOPSId(id: string) {
    this.state.activeOPSId = id;
    this.saveToStorage(this.state);
  }

  public saveOPS(ops: OPSProfile) {
    const idx = this.state.opsList.findIndex(o => o.id === ops.id);
    if (idx >= 0) {
      this.state.opsList[idx] = ops;
    } else {
      this.state.opsList.push(ops);
      this.ensureAdminAccountForOPS(ops);
    }
    this.saveToStorage(this.state);
  }

  public deleteOPS(id: string) {
    this.state.opsList = this.state.opsList.filter(o => o.id !== id);
    // Clean up records associated with this deleted OPS
    this.state.pelangganList = this.state.pelangganList.filter(p => p.opsId !== id);
    this.state.pengangkutanList = this.state.pengangkutanList.filter(p => p.opsId !== id);
    this.state.kasList = this.state.kasList.filter(k => k.opsId !== id);
    this.state.pembayaranList = this.state.pembayaranList.filter(p => p.opsId !== id);
    delete this.state.komposisiConfigs[id];

    if (this.state.activeOPSId === id) {
      this.state.activeOPSId = this.state.opsList.length > 0 ? this.state.opsList[0].id : 'all';
    }
    this.saveToStorage(this.state);
  }

  // --- Pelanggan Management ---
  private sanitizePelangganRegion(pelanggan: Pelanggan): Pelanggan {
    const clean: Pelanggan = { ...pelanggan };
    if (clean.status === 'Aktif') {
      delete clean.tanggalBerhenti;
    }
    const isRhun = clean.opsId === 'ops-pulau-rhun' || clean.opsId?.includes('rhun');
    const isOuw = clean.opsId === 'ops-ouw' || clean.opsId?.includes('ouw');

    if (!isRhun) {
      delete clean.zona;
    }
    if (!isOuw) {
      delete clean.sektor;
      delete clean.unit;
    }
    return clean;
  }

  public getPelangganList(opsId?: string): Pelanggan[] {
    const list = this.state.pelangganList.map(p => this.sanitizePelangganRegion(p));
    if (!opsId || opsId === 'all') {
      return list;
    }
    return list.filter(p => p.opsId === opsId);
  }

  public savePelanggan(pelanggan: Pelanggan) {
    const cleanPel = this.sanitizePelangganRegion(pelanggan);
    const idx = this.state.pelangganList.findIndex(p => p.id === cleanPel.id);
    if (idx >= 0) {
      this.state.pelangganList[idx] = cleanPel;
    } else {
      // auto calculate no if not provided
      if (!cleanPel.no) {
        const opsItems = this.getPelangganList(cleanPel.opsId);
        const maxNo = opsItems.reduce((max, item) => Math.max(max, item.no || 0), 0);
        cleanPel.no = maxNo + 1;
      }
      this.state.pelangganList.push(cleanPel);
    }
    this.saveToStorage(this.state);
  }

  public batchUpdatePelangganStatus(ids: string[], newStatus: StatusPelanggan): Pelanggan[] {
    const idSet = new Set(ids);
    const today = new Date().toISOString().substring(0, 10);
    const updatedList: Pelanggan[] = [];
    this.state.pelangganList = this.state.pelangganList.map(p => {
      if (idSet.has(p.id)) {
        const updated: Pelanggan = {
          ...p,
          status: newStatus,
        };
        if (newStatus === 'Berhenti') {
          updated.tanggalBerhenti = p.tanggalBerhenti || today;
        } else {
          delete updated.tanggalBerhenti;
        }
        updatedList.push(updated);
        return updated;
      }
      return p;
    });
    this.saveToStorage(this.state);
    return updatedList;
  }

  public deletePelanggan(id: string) {
    this.state.pelangganList = this.state.pelangganList.filter(p => p.id !== id);
    this.state.pembayaranList = this.state.pembayaranList.filter(p => p.pelangganId !== id);
    this.saveToStorage(this.state);
  }

  public deletePelangganBatch(ids: string[]) {
    const idSet = new Set(ids);
    this.state.pelangganList = this.state.pelangganList.filter(p => !idSet.has(p.id));
    this.state.pembayaranList = this.state.pembayaranList.filter(p => !idSet.has(p.pelangganId));
    this.saveToStorage(this.state);
  }

  public importPelangganBatch(items: Pelanggan[], replace: boolean = false, targetOpsId?: string): number {
    if (replace && targetOpsId && targetOpsId !== 'all') {
      this.state.pelangganList = this.state.pelangganList.filter(p => p.opsId !== targetOpsId);
    }
    items.forEach(item => {
      const idx = this.state.pelangganList.findIndex(p => p.id === item.id);
      if (idx >= 0) {
        this.state.pelangganList[idx] = item;
      } else {
        this.state.pelangganList.push(item);
      }
    });
    this.saveToStorage(this.state);
    return items.length;
  }

  // --- Pembayaran Iuran Management ---
  public getPembayaranList(opsId?: string, tahun?: number): PembayaranIuran[] {
    let items = this.state.pembayaranList;
    if (opsId && opsId !== 'all') {
      items = items.filter(p => p.opsId === opsId);
    }
    if (tahun) {
      items = items.filter(p => p.tahun === tahun);
    }
    return items;
  }

  public savePembayaran(bayar: PembayaranIuran, _syncToKas: boolean = true, _pelangganNama?: string) {
    const idx = this.state.pembayaranList.findIndex(p => p.id === bayar.id);
    if (idx >= 0) {
      this.state.pembayaranList[idx] = bayar;
    } else {
      this.state.pembayaranList.push(bayar);
    }

    // Clean up any legacy individual sync entry for this payment
    this.state.kasList = this.state.kasList.filter(k => k.id !== 'kas-sync-' + bayar.id);

    // Auto-update the single consolidated monthly recap entry on the last date of the month
    this.syncRekapIuranBulananKeKas(bayar.opsId, bayar.tahun, bayar.bulan);
    this.saveToStorage(this.state);
  }

  public deletePembayaran(id: string) {
    const toDelete = this.state.pembayaranList.find(p => p.id === id);
    this.state.pembayaranList = this.state.pembayaranList.filter(p => p.id !== id);
    this.state.kasList = this.state.kasList.filter(k => k.id !== 'kas-sync-' + id);

    if (toDelete) {
      this.syncRekapIuranBulananKeKas(toDelete.opsId, toDelete.tahun, toDelete.bulan);
    }
    this.saveToStorage(this.state);
  }

  public importPembayaranBatch(items: PembayaranIuran[], replace: boolean = false, targetOpsId?: string): number {
    if (replace && targetOpsId && targetOpsId !== 'all') {
      this.state.pembayaranList = this.state.pembayaranList.filter(p => p.opsId !== targetOpsId);
    }

    const affectedMonths = new Set<string>();

    items.forEach(item => {
      const idx = this.state.pembayaranList.findIndex(
        p => p.id === item.id || (p.pelangganId === item.pelangganId && p.tahun === item.tahun && p.bulan === item.bulan && p.opsId === item.opsId)
      );
      if (idx >= 0) {
        this.state.pembayaranList[idx] = item;
      } else {
        this.state.pembayaranList.push(item);
      }
      affectedMonths.add(`${item.opsId}|${item.tahun}|${item.bulan}`);
    });

    // Re-sync monthly recap for all affected months to kasList
    affectedMonths.forEach(key => {
      const [opsId, tahunStr, bulanStr] = key.split('|');
      this.syncRekapIuranBulananKeKas(opsId, Number(tahunStr), Number(bulanStr));
    });

    this.saveToStorage(this.state);
    return items.length;
  }

  /**
   * Rekap Iuran Bulanan Real-Time:
   * Mengakumulasi seluruh pembayaran iuran bulan tersebut secara real-time menjadi 1 baris di kasList.
   * Tanggal transaksi otomatis diset ke tanggal terakhir di-update (tanggal setoran pembayaran terakhir),
   * sehingga pengguna tidak perlu menunggu akhir bulan untuk melihat hasil rekapitulasi jumlah rumah dan nominal kasnya.
   */
  public syncRekapIuranBulananKeKas(opsId: string, tahun: number, bulan: number): TransaksiKas | null {
    const targetOpsList = (opsId && opsId !== 'all')
      ? [opsId]
      : this.state.opsList.map(o => o.id).filter(id => id !== 'all');

    let lastRekap: TransaksiKas | null = null;

    targetOpsList.forEach(currentOpsId => {
      // Ambil seluruh pelanggan untuk OPS ini
      const opsPelanggan = this.state.pelangganList.filter(p => p.opsId === currentOpsId);

      // Hitung per pelanggan persis seperti di Matriks Iuran (1 sel per pelanggan)
      let totalUang = 0;
      let totalRumah = 0;
      const paymentDates: string[] = [];

      opsPelanggan.forEach(p => {
        const byr = this.state.pembayaranList.find(
          b => b.pelangganId === p.id && b.tahun === tahun && b.bulan === bulan
        );
        if (byr && (byr.jumlah || 0) > 0) {
          totalUang += byr.jumlah;
          totalRumah++;
          if (byr.tanggalBayar) paymentDates.push(byr.tanggalBayar);
        }
      });

      const rekapId = `kas-rekap-${currentOpsId}-${tahun}-${String(bulan).padStart(2, '0')}`;
      const tanggalAkhirBulan = getLastDateOfMonth(tahun, bulan);
      const monthName = MONTH_NAMES_ID[bulan - 1] || `Bulan ${bulan}`;

      if (totalUang > 0) {
        const rekapItem: TransaksiKas = {
          id: rekapId,
          opsId: currentOpsId,
          tanggal: tanggalAkhirBulan,
          noBukti: `REKAP/${tahun}/${String(bulan).padStart(2, '0')}`,
          kategori: 'Iuran Warga',
          uraian: `Rekap Penerimaan Iuran Warga Bulan ${monthName} ${tahun} (Total ${totalRumah} Rumah)`,
          jenisKas: 'tunai',
          pemasukan: totalUang,
          pengeluaran: 0,
        };

        const idx = this.state.kasList.findIndex(k => k.id === rekapId);
        if (idx >= 0) {
          this.state.kasList[idx] = rekapItem;
        } else {
          this.state.kasList.push(rekapItem);
        }
        lastRekap = rekapItem;
      } else {
        this.state.kasList = this.state.kasList.filter(k => k.id !== rekapId);
      }
    });

    this.saveToStorage(this.state);
    return lastRekap;
  }

  /**
   * Mengonsolidasi seluruh data iuran yang ada ke dalam rekap 1 baris per bulan pada tanggal akhir bulan
   */
  public consolidateAllIuranRekap(targetOpsId?: string): number {
    this.state.kasList = this.state.kasList.filter(k => !k.id.startsWith('kas-sync-'));

    const monthKeys = new Set<string>();
    this.state.pembayaranList.forEach(p => {
      if (!targetOpsId || targetOpsId === 'all' || p.opsId === targetOpsId) {
        monthKeys.add(`${p.opsId}|${p.tahun}|${p.bulan}`);
      }
    });

    let count = 0;
    monthKeys.forEach(key => {
      const [opsId, tahunStr, bulanStr] = key.split('|');
      this.syncRekapIuranBulananKeKas(opsId, Number(tahunStr), Number(bulanStr));
      count++;
    });

    this.saveToStorage(this.state);
    return count;
  }

  /**
   * Menghitung total pembayaran pada matriks iuran dan menyinkronkannya secara tepat ke Arus Kas
   */
  public syncAllIuranMatriksKeKas(
    tahun: number,
    targetOpsId?: string
  ): { count: number; totalUang: number; rekapList: TransaksiKas[] } {
    let totalUangSemua = 0;
    let countSynced = 0;
    const rekapList: TransaksiKas[] = [];

    const targetList = (targetOpsId && targetOpsId !== 'all')
      ? [targetOpsId]
      : this.state.opsList.map(o => o.id).filter(id => id !== 'all');

    targetList.forEach(opsId => {
      const opsPelanggan = this.state.pelangganList.filter(p => p.opsId === opsId);

      for (let m = 1; m <= 12; m++) {
        let totalUang = 0;
        let totalRumah = 0;
        const paymentDates: string[] = [];

        opsPelanggan.forEach(p => {
          const byr = this.state.pembayaranList.find(
            b => b.pelangganId === p.id && b.tahun === tahun && b.bulan === m
          );
          if (byr && (byr.jumlah || 0) > 0) {
            totalUang += byr.jumlah;
            totalRumah++;
            if (byr.tanggalBayar) paymentDates.push(byr.tanggalBayar);
          }
        });

        const rekapId = `kas-rekap-${opsId}-${tahun}-${String(m).padStart(2, '0')}`;

        if (totalUang > 0) {
          totalUangSemua += totalUang;
          countSynced++;

          const tanggalAkhirBulan = getLastDateOfMonth(tahun, m);
          const monthName = MONTH_NAMES_ID[m - 1] || `Bulan ${m}`;
          const rekapItem: TransaksiKas = {
            id: rekapId,
            opsId: opsId,
            tanggal: tanggalAkhirBulan,
            noBukti: `REKAP/${tahun}/${String(m).padStart(2, '0')}`,
            kategori: 'Iuran Warga',
            uraian: `Rekap Penerimaan Iuran Warga Bulan ${monthName} ${tahun} (Total ${totalRumah} Rumah)`,
            jenisKas: 'tunai',
            pemasukan: totalUang,
            pengeluaran: 0,
          };

          const idx = this.state.kasList.findIndex(k => k.id === rekapId);
          if (idx >= 0) {
            this.state.kasList[idx] = rekapItem;
          } else {
            this.state.kasList.push(rekapItem);
          }
          rekapList.push(rekapItem);
        } else {
          this.state.kasList = this.state.kasList.filter(k => k.id !== rekapId);
        }
      }
    });

    this.saveToStorage(this.state);
    return { count: countSynced, totalUang: totalUangSemua, rekapList };
  }

  // --- Transaksi Pengangkutan Management ---
  public getPengangkutanList(opsId?: string): TransaksiPengangkutan[] {
    let list = this.state.pengangkutanList;
    if (opsId && opsId !== 'all') {
      list = list.filter(p => p.opsId === opsId);
    }
    return [...list].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }

  public savePengangkutan(item: TransaksiPengangkutan) {
    if (item.sumberSampah === 'Clean-up Pantai') {
      const daur = Number(item.beratDaurUlangKg || 0);
      const plast = Number(item.beratPlastikKg || 0);
      const resid = Number(item.beratResiduKg || 0);

      item.beratDaurUlangKg = Number(daur.toFixed(1));
      item.beratPlastikKg = Number(plast.toFixed(1));
      item.beratResiduKg = Number(resid.toFixed(1));

      // Compatibility values for standard total aggregations
      item.beratAnorganikKg = Number((daur + plast).toFixed(1));
      item.beratOrganikKg = Number(resid.toFixed(1));
      item.volumeAnorganikM3 = Number(((daur + plast) / 127).toFixed(2));
      item.volumeOrganikM3 = Number((resid / 250).toFixed(2));
      item.pelangganTerlayani = Number(item.jumlahRelawan || item.pelangganTerlayani || 0);
    } else if (item.metodeUkur === 'karung') {
      // Reguler Pemukiman dengan Alat Ukur Karung (Campur, Organik, Anorganik)
      item.sumberSampah = 'Pemukiman';
      item.metodeUkur = 'karung';

      const kCmp = Math.max(0, Number(item.karungCampur) || 0);
      const rCmp = Math.max(0.1, Number(item.beratRataKarungCampur) || 20);
      const beratCmp = Number((kCmp * rCmp).toFixed(1));

      const kOrg = Math.max(0, Number(item.karungOrganik) || 0);
      const rOrg = Math.max(0.1, Number(item.beratRataKarungOrganik) || 25);
      const beratOrg = Number((kOrg * rOrg).toFixed(1));

      const kAnorg = Math.max(0, Number(item.karungAnorganik) || 0);
      const rAnorg = Math.max(0.1, Number(item.beratRataKarungAnorganik) || 12);
      const beratAnorg = Number((kAnorg * rAnorg).toFixed(1));

      item.karungCampur = kCmp;
      item.beratRataKarungCampur = rCmp;
      item.beratCampurKg = beratCmp;

      item.karungOrganik = kOrg;
      item.beratRataKarungOrganik = rOrg;

      item.karungAnorganik = kAnorg;
      item.beratRataKarungAnorganik = rAnorg;

      item.totalKarung = kCmp + kOrg + kAnorg;

      // Alokasi proporsi sampah campur (60% organik, 40% anorganik) agar komposisi tetap terpadu
      const cmpKeOrg = Number((beratCmp * 0.60).toFixed(1));
      const cmpKeAnorg = Number((beratCmp * 0.40).toFixed(1));

      item.beratOrganikKg = Number((beratOrg + cmpKeOrg).toFixed(1));
      item.beratAnorganikKg = Number((beratAnorg + cmpKeAnorg).toFixed(1));

      item.volumeOrganikM3 = Number((item.beratOrganikKg / 320).toFixed(2));
      item.volumeAnorganikM3 = Number((item.beratAnorganikKg / 127).toFixed(2));
      item.panjangBakCm = 0;
      item.lebarBakCm = 0;
      item.ketinggianOrganikCm = 0;
      item.ketinggianAnorganikCm = 0;
    } else {
      // Reguler Pemukiman dengan Dimensi Bak Kendaraan
      item.sumberSampah = 'Pemukiman';
      item.metodeUkur = 'bak';
      const p = item.panjangBakCm || 190;
      const l = item.lebarBakCm || 120;

      let volOrg = (p * l * (item.ketinggianOrganikCm || 0)) / 1000000;
      let beratOrg = volOrg * (item.densitasOrganik || 320);

      // JIKA data diimpor dengan volume / berat yang sudah ada (height 0 / tidak diisi):
      if (item.ketinggianOrganikCm === 0 || !item.ketinggianOrganikCm) {
        if (item.beratOrganikKg && item.beratOrganikKg > 0) {
          beratOrg = item.beratOrganikKg;
          volOrg = item.volumeOrganikM3 && item.volumeOrganikM3 > 0
            ? item.volumeOrganikM3
            : Number((beratOrg / (item.densitasOrganik || 320)).toFixed(2));
          if (p > 0 && l > 0) {
            item.ketinggianOrganikCm = Math.round((volOrg * 1000000) / (p * l));
          }
        } else if (item.volumeOrganikM3 && item.volumeOrganikM3 > 0) {
          volOrg = item.volumeOrganikM3;
          beratOrg = Number((volOrg * (item.densitasOrganik || 320)).toFixed(1));
          if (p > 0 && l > 0) {
            item.ketinggianOrganikCm = Math.round((volOrg * 1000000) / (p * l));
          }
        }
      }

      let volAnorg = 0;
      let beratAnorg = 0;
      if (item.metodeAnorganik === 'karung') {
        const kAnorg = Math.max(0, Number(item.karungAnorganik) || 0);
        const rAnorg = Math.max(0.1, Number(item.beratRataKarungAnorganik) || 12);
        beratAnorg = Number((kAnorg * rAnorg).toFixed(1));
        const densAnorg = item.densitasAnorganik || 127;
        volAnorg = densAnorg > 0 ? Number((beratAnorg / densAnorg).toFixed(2)) : Number((kAnorg * 0.05).toFixed(2));
        item.karungAnorganik = kAnorg;
        item.beratRataKarungAnorganik = rAnorg;
        item.ketinggianAnorganikCm = 0;
      } else {
        volAnorg = (p * l * (item.ketinggianAnorganikCm || 0)) / 1000000;
        beratAnorg = volAnorg * (item.densitasAnorganik || 127);

        // JIKA data diimpor dengan volume / berat anorganik yang sudah ada:
        if (item.ketinggianAnorganikCm === 0 || !item.ketinggianAnorganikCm) {
          if (item.beratAnorganikKg && item.beratAnorganikKg > 0) {
            beratAnorg = item.beratAnorganikKg;
            volAnorg = item.volumeAnorganikM3 && item.volumeAnorganikM3 > 0
              ? item.volumeAnorganikM3
              : Number((beratAnorg / (item.densitasAnorganik || 127)).toFixed(2));
            if (p > 0 && l > 0) {
              item.ketinggianAnorganikCm = Math.round((volAnorg * 1000000) / (p * l));
            }
          } else if (item.volumeAnorganikM3 && item.volumeAnorganikM3 > 0) {
            volAnorg = item.volumeAnorganikM3;
            beratAnorg = Number((volAnorg * (item.densitasAnorganik || 127)).toFixed(1));
            if (p > 0 && l > 0) {
              item.ketinggianAnorganikCm = Math.round((volAnorg * 1000000) / (p * l));
            }
          }
        }
      }

      item.volumeOrganikM3 = Number(volOrg.toFixed(2));
      item.beratOrganikKg = Number(beratOrg.toFixed(1));
      item.volumeAnorganikM3 = Number(volAnorg.toFixed(2));
      item.beratAnorganikKg = Number(beratAnorg.toFixed(1));
    }

    const idx = this.state.pengangkutanList.findIndex(x => x.id === item.id);
    if (idx >= 0) {
      this.state.pengangkutanList[idx] = item;
    } else {
      this.state.pengangkutanList.push(item);
    }
    this.saveToStorage(this.state);
  }

  public deletePengangkutan(id: string) {
    this.state.pengangkutanList = this.state.pengangkutanList.filter(p => p.id !== id);
    this.saveToStorage(this.state);
  }

  public deletePengangkutanBatch(ids: string[]) {
    const idSet = new Set(ids);
    this.state.pengangkutanList = this.state.pengangkutanList.filter(p => !idSet.has(p.id));
    this.saveToStorage(this.state);
  }

  public importPengangkutanBatch(items: TransaksiPengangkutan[], replace: boolean = false, targetOpsId?: string): number {
    if (replace && targetOpsId && targetOpsId !== 'all') {
      this.state.pengangkutanList = this.state.pengangkutanList.filter(p => p.opsId !== targetOpsId);
    }
    items.forEach(item => {
      this.savePengangkutan(item);
    });
    return items.length;
  }

  // --- Kas / Keuangan Management ---
  public getKasList(opsId?: string): TransaksiKas[] {
    let list = this.state.kasList;
    if (opsId && opsId !== 'all') {
      list = list.filter(k => k.opsId === opsId);
    }
    // Sort chronologically ascending to calculate running balance
    const sorted = [...list].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    let currentBalance = 0;
    return sorted.map(item => {
      currentBalance = currentBalance + (item.pemasukan || 0) - (item.pengeluaran || 0);
      return {
        ...item,
        saldo: currentBalance,
      };
    });
  }

  public saveKas(item: TransaksiKas) {
    const idx = this.state.kasList.findIndex(k => k.id === item.id);
    if (idx >= 0) {
      this.state.kasList[idx] = item;
    } else {
      this.state.kasList.push(item);
    }
    this.saveToStorage(this.state);
  }

  public deleteKas(id: string) {
    this.state.kasList = this.state.kasList.filter(k => k.id !== id);
    this.saveToStorage(this.state);
  }

  public deleteKasBatch(ids: string[]) {
    const idSet = new Set(ids);
    this.state.kasList = this.state.kasList.filter(k => !idSet.has(k.id));
    this.saveToStorage(this.state);
  }

  public importKasBatch(items: TransaksiKas[], replace: boolean = false, targetOpsId?: string): number {
    if (replace && targetOpsId && targetOpsId !== 'all') {
      this.state.kasList = this.state.kasList.filter(k => k.opsId !== targetOpsId);
    }
    items.forEach(item => {
      this.saveKas(item);
    });
    return items.length;
  }

  // --- Komposisi Configuration ---
  public getKomposisiConfig(opsId: string): KomposisiConfig {
    return this.state.komposisiConfigs[opsId] || DEFAULT_KOMPOSISI;
  }

  public saveKomposisiConfig(opsId: string, config: KomposisiConfig) {
    this.state.komposisiConfigs[opsId] = config;
    this.saveToStorage(this.state);
  }

  // --- Backup & Restore Database ---
  public exportDatabaseJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importDatabaseJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr) as DatabaseState;
      if (parsed.opsList && parsed.pelangganList) {
        this.state = parsed;
        this.saveToStorage(this.state);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  public getAllPelanggan(): Pelanggan[] {
    return this.state.pelangganList;
  }

  public getAllPembayaran(): PembayaranIuran[] {
    return this.state.pembayaranList;
  }

  public getAllPengangkutan(): TransaksiPengangkutan[] {
    return this.state.pengangkutanList;
  }

  public getAllKas(): TransaksiKas[] {
    return this.state.kasList;
  }

  public syncFromCloud(key: keyof DatabaseState, items: any[]) {
    if (Array.isArray(items)) {
      if (key === 'adminAccounts') {
        const defaultBuiltinDummyIds = new Set([
          'admin-tanah-rata',
          'admin-mekar-asri',
          'admin-pulau-rhun',
          'admin-negeri-ouw',
          'admin-entri-data',
          'admin-viewer',
        ]);
        const defaultBuiltinDummyUsernames = new Set([
          'admin.tanahrata',
          'admin.mekarasri',
          'admin.rhun',
          'admin.ouw',
          'entri.data',
          'pengamat',
        ]);
        let cleaned = (items as AdminAccount[]).filter(
          a =>
            !defaultBuiltinDummyIds.has(a.id) &&
            !defaultBuiltinDummyUsernames.has(a.username) &&
            !(a.id.startsWith('admin-ops-') && a.password === 'admin123' && a.email?.endsWith('@siops.id'))
        );
        if (!cleaned.some(a => a.role === 'superadmin')) {
          cleaned = [...INITIAL_ADMIN_ACCOUNTS, ...cleaned];
        }
        this.state.adminAccounts = cleaned;
      } else if (key === 'kasList') {
        this.state.kasList = items;
        // Always reconcile monthly rekapitulasi iuran so Arus Kas strictly equals Matriks Pembayaran
        this.syncAllIuranMatriksKeKas(2026);
      } else if (key === 'pembayaranList' || key === 'pelangganList') {
        (this.state as any)[key] = items;
        this.syncAllIuranMatriksKeKas(2026);
      } else {
        (this.state as any)[key] = items;
      }
      this.saveToStorage(this.state);
    }
  }

  // --- Admin Accounts Management ---
  public getAdminAccounts(): AdminAccount[] {
    return this.state.adminAccounts || INITIAL_ADMIN_ACCOUNTS;
  }

  public getCurrentAdmin(): AdminAccount {
    const session = this.getSessionUser();
    if (session) return session;

    // Mutlak: Pengunjung umum / orang yang membuka link share WAJIB masuk sebagai Mode Pengunjung (Viewer)
    // Kecuali dia telah berhasil login menggunakan username dan password akunnya
    return GUEST_VIEWER_ACCOUNT;
  }

  public setCurrentAdminId(id: string): AdminAccount {
    this.state.currentAdminId = id;
    if (id === GUEST_VIEWER_ACCOUNT.id) {
      this.setSessionUser(null);
      return GUEST_VIEWER_ACCOUNT;
    }
    const list = this.getAdminAccounts();
    const admin = list.find(a => a.id === id) || GUEST_VIEWER_ACCOUNT;
    if (admin.role !== 'viewer') {
      this.setSessionUser(admin);
    }
    // Auto-scope active OPS to their assigned OPS if assigned to a specific OPS
    if (admin.role !== 'superadmin' && admin.opsId && admin.opsId !== 'all') {
      this.state.activeOPSId = admin.opsId;
    }
    this.saveToStorage(this.state);
    return admin;
  }

  public saveAdminAccount(account: AdminAccount): AdminAccount {
    if (!this.state.adminAccounts) {
      this.state.adminAccounts = [...INITIAL_ADMIN_ACCOUNTS];
    }
    const idx = this.state.adminAccounts.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      this.state.adminAccounts[idx] = { ...this.state.adminAccounts[idx], ...account };
    } else {
      this.state.adminAccounts.push(account);
    }
    this.saveToStorage(this.state);
    return account;
  }

  public deleteAdminAccount(id: string): boolean {
    if (!this.state.adminAccounts) return false;
    const target = this.state.adminAccounts.find(a => a.id === id);
    if (target?.role === 'superadmin') {
      const superCount = this.state.adminAccounts.filter(a => a.role === 'superadmin').length;
      if (superCount <= 1) {
        return false; // protect at least 1 superadmin
      }
    }
    this.state.adminAccounts = this.state.adminAccounts.filter(a => a.id !== id);
    if (this.state.currentAdminId === id) {
      this.state.currentAdminId = this.state.adminAccounts[0]?.id || 'admin-super';
    }
    this.saveToStorage(this.state);
    return true;
  }

  public authenticateAdmin(usernameOrEmail: string, pass: string): AdminAccount | null {
    const clean = usernameOrEmail.trim().toLowerCase();
    const accounts = this.getAdminAccounts();
    const found = accounts.find(
      a =>
        (a.username.toLowerCase() === clean || a.email.toLowerCase() === clean) &&
        a.password === pass
    );

    if (found) {
      found.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 19);
      this.saveAdminAccount(found);
      this.setCurrentAdminId(found.id);
      this.setSessionUser(found);
      return found;
    }
    return null;
  }

  public getSessionUser(): AdminAccount | null {
    try {
      const savedId = localStorage.getItem('si_ops_auth_session_user');
      if (!savedId) return null;
      if (savedId === GUEST_VIEWER_ACCOUNT.id) return GUEST_VIEWER_ACCOUNT;
      const accounts = this.getAdminAccounts();
      const found = accounts.find(a => a.id === savedId);
      return found || null;
    } catch {
      return null;
    }
  }

  public setSessionUser(account: AdminAccount | null) {
    try {
      if (account) {
        localStorage.setItem('si_ops_auth_session_user', account.id);
        this.state.currentAdminId = account.id;
      } else {
        localStorage.removeItem('si_ops_auth_session_user');
        this.state.currentAdminId = GUEST_VIEWER_ACCOUNT.id;
        this.state.activeOPSId = 'all'; // Langsung arahkan ke data Semua OPS untuk mode pengunjung
      }
      this.saveToStorage(this.state);
    } catch (e) {
      console.warn('Failed to update session in localStorage', e);
    }
  }

  public logout() {
    this.setSessionUser(null);
  }

  public ensureAdminAccountForOPS(ops: OPSProfile): AdminAccount {
    if (!this.state.adminAccounts) {
      this.state.adminAccounts = [...INITIAL_ADMIN_ACCOUNTS];
    }
    const existing = this.state.adminAccounts.find(a => a.opsId === ops.id);
    if (existing) {
      existing.opsNama = ops.nama;
      this.saveToStorage(this.state);
      return existing;
    }

    const slug = (ops.kode || ops.nama || 'ops').toLowerCase().replace(/[^a-z0-9]/g, '');
    const newAdmin: AdminAccount = {
      id: `admin-${ops.id}`,
      username: `admin.${slug}`,
      nama: `Admin ${ops.nama}`,
      email: `admin.${slug}@siops.id`,
      password: 'admin123',
      role: 'admin_ops',
      opsId: ops.id,
      opsNama: ops.nama,
      kontak: ops.kontak || '-',
      avatarColor: '#059669',
      createdAt: new Date().toISOString().substring(0, 10),
    };
    this.state.adminAccounts.push(newAdmin);
    this.saveToStorage(this.state);
    return newAdmin;
  }

  // --- Sampah Daur Ulang (Stok & Penjualan) ---
  public getJenisDaurUlangList(): JenisDaurUlangItem[] {
    if (!this.state.jenisDaurUlangList || this.state.jenisDaurUlangList.length === 0) {
      this.state.jenisDaurUlangList = [...INITIAL_JENIS_DAUR_ULANG];
      this.saveToStorage(this.state);
    }
    return this.state.jenisDaurUlangList;
  }

  public saveJenisDaurUlangList(items: JenisDaurUlangItem[]) {
    this.state.jenisDaurUlangList = items;
    this.saveToStorage(this.state);
  }

  public getTransaksiDaurUlangList(opsId?: string): TransaksiDaurUlang[] {
    if (!this.state.transaksiDaurUlangList) {
      this.state.transaksiDaurUlangList = [...INITIAL_TRANSAKSI_DAUR_ULANG];
      this.saveToStorage(this.state);
    }
    if (!opsId || opsId === 'all') {
      return this.state.transaksiDaurUlangList;
    }
    return this.state.transaksiDaurUlangList.filter(t => !t.opsId || t.opsId === 'all' || t.opsId === opsId);
  }

  public saveTransaksiDaurUlang(trx: TransaksiDaurUlang): TransaksiDaurUlang {
    if (!this.state.transaksiDaurUlangList) {
      this.state.transaksiDaurUlangList = [];
    }

    const idx = this.state.transaksiDaurUlangList.findIndex(t => t.id === trx.id);
    if (idx >= 0) {
      this.state.transaksiDaurUlangList[idx] = trx;
    } else {
      this.state.transaksiDaurUlangList.unshift(trx);
    }

    // Jika penjualan bernilai uang dan dicatat ke Kas
    if (trx.tipe === 'keluar' && trx.jenisPengeluaran === 'Dijual' && trx.totalNilai && trx.totalNilai > 0 && trx.catatKeKas) {
      const kasId = trx.kasId || `kas-daurulang-${trx.id}`;
      trx.kasId = kasId;
      const targetOpsId = trx.opsId && trx.opsId !== 'all' ? trx.opsId : this.state.activeOPSId || 'ops-tanah-rata';

      const kasItem: TransaksiKas = {
        id: kasId,
        opsId: targetOpsId,
        tanggal: trx.tanggal,
        noBukti: `PJ-DU-${trx.id.slice(-4).toUpperCase()}`,
        kategori: 'Penjualan Produk',
        uraian: `Penjualan ${trx.jenisSampahNama} (${trx.beratKg} kg @ Rp ${(trx.hargaPerKg || 0).toLocaleString('id-ID')}) ${trx.pembeliPengepul ? 'ke ' + trx.pembeliPengepul : ''}`,
        jenisKas: trx.uangDiterimaDi === 'Bank' ? 'bank' : 'tunai',
        pemasukan: trx.totalNilai,
        pengeluaran: 0,
      };
      this.saveKas(kasItem);
    }

    this.saveToStorage(this.state);
    return trx;
  }

  public deleteTransaksiDaurUlang(id: string) {
    if (!this.state.transaksiDaurUlangList) return;
    const item = this.state.transaksiDaurUlangList.find(t => t.id === id);
    if (item && item.kasId) {
      this.deleteKas(item.kasId);
    }
    this.state.transaksiDaurUlangList = this.state.transaksiDaurUlangList.filter(t => t.id !== id);
    this.saveToStorage(this.state);
  }

  public deleteTransaksiDaurUlangBatch(ids: string[]) {
    const list = this.state.transaksiDaurUlangList || [];
    if (list.length === 0 || ids.length === 0) return;
    const idSet = new Set(ids);
    ids.forEach(id => {
      const item = list.find(t => t.id === id);
      if (item && item.kasId) {
        this.deleteKas(item.kasId);
      }
    });
    this.state.transaksiDaurUlangList = list.filter(t => !idSet.has(t.id));
    this.saveToStorage(this.state);
  }

  public resetToDefaults() {
    localStorage.removeItem(DB_KEY);
    this.state = this.loadFromStorage();
  }
}

export const db = new LocalDB();
