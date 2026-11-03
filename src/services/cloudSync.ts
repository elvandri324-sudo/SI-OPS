import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { dbFirestore, handleFirestoreError, OperationType, testFirestoreConnection } from './firebase';
import {
  OPSProfile,
  Pelanggan,
  PembayaranIuran,
  TransaksiPengangkutan,
  TransaksiKas,
  KomposisiConfig,
  AdminAccount,
} from '../types/ops';
import { db } from './db';

export type SyncStatus = 'connecting' | 'connected' | 'syncing' | 'offline' | 'error';

class CloudSyncService {
  private status: SyncStatus = 'connecting';
  private listeners: (() => void)[] = [];
  private onStatusChangeCallbacks: ((status: SyncStatus) => void)[] = [];
  private onDataSyncedCallbacks: (() => void)[] = [];
  private isInitialized = false;

  public getStatus(): SyncStatus {
    return this.status;
  }

  public subscribeStatus(cb: (status: SyncStatus) => void): () => void {
    this.onStatusChangeCallbacks.push(cb);
    cb(this.status);
    return () => {
      this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter(c => c !== cb);
    };
  }

  public subscribeDataSynced(cb: () => void): () => void {
    this.onDataSyncedCallbacks.push(cb);
    return () => {
      this.onDataSyncedCallbacks = this.onDataSyncedCallbacks.filter(c => c !== cb);
    };
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.onStatusChangeCallbacks.forEach(cb => cb(status));
  }

  private notifyDataSynced() {
    this.onDataSyncedCallbacks.forEach(cb => cb());
  }

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.setStatus('connecting');

    try {
      await testFirestoreConnection();
      await this.bootstrapInitialDataIfEmpty();
      this.startRealtimeListeners();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Cloud sync offline or error:', err);
      this.setStatus('offline');
    }
  }

  /**
   * Jika database Firestore masih baru / kosong, upload initial seed / local data ke Firestore
   */
  private async bootstrapInitialDataIfEmpty() {
    try {
      const opsSnap = await getDocs(collection(dbFirestore, 'ops_profiles'));
      if (opsSnap.empty) {
        this.setStatus('syncing');
        console.info('Firestore is empty. Bootstrapping initial data to Cloud...');
        const batch = writeBatch(dbFirestore);

        // Upload OPS List
        const opsList = db.getOPSList();
        opsList.forEach(ops => {
          if (ops.id !== 'all') {
            const ref = doc(dbFirestore, 'ops_profiles', ops.id);
            batch.set(ref, ops);
          }
        });

        // Upload Pelanggan List
        const pelList = db.getAllPelanggan();
        pelList.forEach(pel => {
          const ref = doc(dbFirestore, 'pelanggan', pel.id);
          batch.set(ref, pel);
        });

        // Upload Pembayaran List
        const byrList = db.getAllPembayaran();
        byrList.forEach(byr => {
          const ref = doc(dbFirestore, 'pembayaran', byr.id);
          batch.set(ref, byr);
        });

        // Upload Pengangkutan List
        const angkutList = db.getAllPengangkutan();
        angkutList.forEach(angkut => {
          const ref = doc(dbFirestore, 'pengangkutan', angkut.id);
          batch.set(ref, angkut);
        });

        // Upload Kas List
        const kasList = db.getAllKas();
        kasList.forEach(k => {
          const ref = doc(dbFirestore, 'transaksi_kas', k.id);
          batch.set(ref, k);
        });

        // Upload Admin Accounts List
        const adminList = db.getAdminAccounts();
        adminList.forEach(acc => {
          const ref = doc(dbFirestore, 'admin_accounts', acc.id);
          batch.set(ref, acc);
        });

        await batch.commit();
        console.info('Initial data successfully bootstrapped to Cloud Firestore!');
      } else {
        // Also check if admin_accounts is populated
        const adminSnap = await getDocs(collection(dbFirestore, 'admin_accounts'));
        if (adminSnap.empty) {
          const adminBatch = writeBatch(dbFirestore);
          const adminList = db.getAdminAccounts();
          adminList.forEach(acc => {
            const ref = doc(dbFirestore, 'admin_accounts', acc.id);
            adminBatch.set(ref, acc);
          });
          await adminBatch.commit();
        }
      }
    } catch (err) {
      console.error('Error during Firestore bootstrap:', err);
    }
  }

  /**
   * Listen to real-time changes across Firestore collections
   */
  private startRealtimeListeners() {
    // 1. OPS Profiles
    const unsubOps = onSnapshot(
      collection(dbFirestore, 'ops_profiles'),
      snapshot => {
        const items: OPSProfile[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as OPSProfile);
        });
        if (items.length > 0) {
          db.syncFromCloud('opsList', items);
          this.notifyDataSynced();
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'ops_profiles')
    );
    this.listeners.push(unsubOps);

    // 2. Pelanggan
    const unsubPel = onSnapshot(
      collection(dbFirestore, 'pelanggan'),
      snapshot => {
        const items: Pelanggan[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Pelanggan);
        });
        if (items.length > 0) {
          db.syncFromCloud('pelangganList', items);
          this.notifyDataSynced();
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'pelanggan')
    );
    this.listeners.push(unsubPel);

    // 3. Pembayaran
    const unsubByr = onSnapshot(
      collection(dbFirestore, 'pembayaran'),
      snapshot => {
        const items: PembayaranIuran[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as PembayaranIuran);
        });
        if (items.length > 0) {
          db.syncFromCloud('pembayaranList', items);
          this.notifyDataSynced();
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'pembayaran')
    );
    this.listeners.push(unsubByr);

    // 4. Pengangkutan
    const unsubAngkut = onSnapshot(
      collection(dbFirestore, 'pengangkutan'),
      snapshot => {
        const items: TransaksiPengangkutan[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as TransaksiPengangkutan);
        });
        if (items.length > 0) {
          db.syncFromCloud('pengangkutanList', items);
          this.notifyDataSynced();
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'pengangkutan')
    );
    this.listeners.push(unsubAngkut);

    // 5. Transaksi Kas
    const unsubKas = onSnapshot(
      collection(dbFirestore, 'transaksi_kas'),
      snapshot => {
        const items: TransaksiKas[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as TransaksiKas);
        });
        if (items.length > 0) {
          db.syncFromCloud('kasList', items);
          this.notifyDataSynced();
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'transaksi_kas')
    );
    this.listeners.push(unsubKas);

    // 6. Admin Accounts for Each OPS
    const unsubAdmin = onSnapshot(
      collection(dbFirestore, 'admin_accounts'),
      snapshot => {
        const items: AdminAccount[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as AdminAccount);
        });
        if (items.length > 0) {
          db.syncFromCloud('adminAccounts', items);
          this.notifyDataSynced();
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'admin_accounts')
    );
    this.listeners.push(unsubAdmin);
  }

  // --- Cloud Mutation Helpers ---

  public async saveOPSToCloud(ops: OPSProfile) {
    if (ops.id === 'all') return;
    try {
      await setDoc(doc(dbFirestore, 'ops_profiles', ops.id), ops);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `ops_profiles/${ops.id}`);
    }
  }

  public async deleteOPSFromCloud(id: string) {
    try {
      await deleteDoc(doc(dbFirestore, 'ops_profiles', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `ops_profiles/${id}`);
    }
  }

  public async savePelangganToCloud(pel: Pelanggan) {
    try {
      await setDoc(doc(dbFirestore, 'pelanggan', pel.id), pel);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `pelanggan/${pel.id}`);
    }
  }

  public async deletePelangganFromCloud(id: string) {
    try {
      await deleteDoc(doc(dbFirestore, 'pelanggan', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pelanggan/${id}`);
    }
  }

  public async savePembayaranToCloud(byr: PembayaranIuran) {
    try {
      await setDoc(doc(dbFirestore, 'pembayaran', byr.id), byr);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `pembayaran/${byr.id}`);
    }
  }

  public async deletePembayaranFromCloud(id: string) {
    try {
      await deleteDoc(doc(dbFirestore, 'pembayaran', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pembayaran/${id}`);
    }
  }

  public async savePengangkutanToCloud(item: TransaksiPengangkutan) {
    try {
      await setDoc(doc(dbFirestore, 'pengangkutan', item.id), item);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `pengangkutan/${item.id}`);
    }
  }

  public async deletePengangkutanFromCloud(id: string) {
    try {
      await deleteDoc(doc(dbFirestore, 'pengangkutan', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pengangkutan/${id}`);
    }
  }

  public async saveKasToCloud(k: TransaksiKas) {
    try {
      await setDoc(doc(dbFirestore, 'transaksi_kas', k.id), k);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `transaksi_kas/${k.id}`);
    }
  }

  public async deleteKasFromCloud(id: string) {
    try {
      await deleteDoc(doc(dbFirestore, 'transaksi_kas', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `transaksi_kas/${id}`);
    }
  }

  public async saveKomposisiToCloud(opsId: string, cfg: KomposisiConfig) {
    try {
      await setDoc(doc(dbFirestore, 'komposisi', opsId), cfg);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `komposisi/${opsId}`);
    }
  }

  public async batchImportToCloud<T extends { id: string }>(
    collectionName: string,
    items: T[]
  ) {
    if (items.length === 0) return;
    try {
      // Chunk batches by 450 (Firestore limit is 500)
      const chunkSize = 400;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(dbFirestore);
        chunk.forEach(item => {
          const ref = doc(dbFirestore, collectionName, item.id);
          batch.set(ref, item);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, collectionName);
    }
  }

  public async batchDeleteFromCloud(collectionName: string, ids: string[]) {
    if (ids.length === 0) return;
    try {
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(dbFirestore);
        chunk.forEach(id => {
          const ref = doc(dbFirestore, collectionName, id);
          batch.delete(ref);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, collectionName);
    }
  }
  public async saveAdminToCloud(account: AdminAccount) {
    try {
      await setDoc(doc(dbFirestore, 'admin_accounts', account.id), account);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `admin_accounts/${account.id}`);
    }
  }

  public async deleteAdminFromCloud(id: string) {
    try {
      await deleteDoc(doc(dbFirestore, 'admin_accounts', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `admin_accounts/${id}`);
    }
  }
}

export const cloudSync = new CloudSyncService();
