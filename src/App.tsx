/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Truck,
  Wallet,
  Menu,
  Eye,
  PenLine,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  OPSProfile,
  Pelanggan,
  TransaksiPengangkutan,
  TransaksiKas,
  PembayaranIuran,
  KomposisiConfig,
  SumberSampah,
  AdminAccount,
  StatusPelanggan,
  ADMIN_ROLE_LABELS,
} from './types/ops';
import { db } from './services/db';
import { cloudSync, SyncStatus } from './services/cloudSync';
import { formatRupiah } from './utils/format';
import { DesktopHeader } from './components/DesktopHeader';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PelangganView } from './components/PelangganView';
import { PengangkutanView } from './components/PengangkutanView';
import { CleanUpPantaiView } from './components/CleanUpPantaiView';
import { KomposisiView } from './components/KomposisiView';
import { KeuanganView } from './components/KeuanganView';
import { CetakLaporanView } from './components/CetakLaporanView';
import { KelolaAkunView } from './components/KelolaAkunView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { LoginScreen } from './components/LoginScreen';

// Modals
import { ModalFormPelanggan } from './components/modals/ModalFormPelanggan';
import { ModalFormPengangkutan } from './components/modals/ModalFormPengangkutan';
import { ModalFormKas } from './components/modals/ModalFormKas';
import { ModalFormIuran } from './components/modals/ModalFormIuran';
import { ModalFormOPS } from './components/modals/ModalFormOPS';
import { ModalKelolaOPS } from './components/modals/ModalKelolaOPS';
import { ModalConfirm } from './components/modals/ModalConfirm';
import { ModalImportExcel, ImportDataType } from './components/modals/ModalImportExcel';
import { ModalLoginAdmin } from './components/modals/ModalLoginAdmin';
import { ModalKelolaAdmin } from './components/modals/ModalKelolaAdmin';
import { ModalLogoutConfirm } from './components/modals/ModalLogoutConfirm';

export default function App() {
  const [sessionUser, setSessionUser] = useState<AdminAccount | null>(() => db.getSessionUser());
  const [isModalLogoutOpen, setIsModalLogoutOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [cloudStatus, setCloudStatus] = useState<SyncStatus>('connecting');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Entities
  const [opsList, setOpsList] = useState<OPSProfile[]>([]);
  const [activeOPS, setActiveOPS] = useState<OPSProfile>(db.getActiveOPS());
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [pembayaranList, setPembayaranList] = useState<PembayaranIuran[]>([]);
  const [pengangkutanList, setPengangkutanList] = useState<TransaksiPengangkutan[]>([]);
  const [cleanupList, setCleanupList] = useState<TransaksiPengangkutan[]>([]);
  const [kasList, setKasList] = useState<TransaksiKas[]>([]);
  const [komposisiConfig, setKomposisiConfig] = useState<KomposisiConfig>(
    db.getKomposisiConfig(activeOPS.id)
  );

  // Modals state
  const [isModalPelangganOpen, setIsModalPelangganOpen] = useState<boolean>(false);
  const [editingPelanggan, setEditingPelanggan] = useState<Pelanggan | null>(null);

  const [isModalPengangkutanOpen, setIsModalPengangkutanOpen] = useState<boolean>(false);
  const [editingPengangkutan, setEditingPengangkutan] = useState<TransaksiPengangkutan | null>(null);
  const [modalPengangkutanInitialSumber, setModalPengangkutanInitialSumber] = useState<SumberSampah>('Pemukiman');

  const [isModalKasOpen, setIsModalKasOpen] = useState<boolean>(false);
  const [editingKas, setEditingKas] = useState<TransaksiKas | null>(null);

  const [isModalIuranOpen, setIsModalIuranOpen] = useState<boolean>(false);
  const [selectedIuranPelanggan, setSelectedIuranPelanggan] = useState<Pelanggan | null>(null);
  const [iuranBulan, setIuranBulan] = useState<number>(2);

  const [isModalOPSOpen, setIsModalOPSOpen] = useState<boolean>(false);
  const [isModalKelolaOPSOpen, setIsModalKelolaOPSOpen] = useState<boolean>(false);
  const [editingOPS, setEditingOPS] = useState<OPSProfile | null>(null);

  // Import Excel modal state
  const [isModalImportExcelOpen, setIsModalImportExcelOpen] = useState<boolean>(false);
  const [importExcelType, setImportExcelType] = useState<ImportDataType>('pelanggan');

  // Admin accounts state
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(db.getAdminAccounts());
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount>(db.getCurrentAdmin());
  const [isModalLoginAdminOpen, setIsModalLoginAdminOpen] = useState<boolean>(false);
  const [isModalKelolaAdminOpen, setIsModalKelolaAdminOpen] = useState<boolean>(false);

  // In-app confirmations & toast (No window.confirm or alert for iframe safety)
  const [opsToDelete, setOpsToDelete] = useState<OPSProfile | null>(null);
  const [deleteOPSReason, setDeleteOPSReason] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Role Permission Checks
  const isReadOnly = currentAdmin.role === 'viewer';
  const canDeleteRecords = currentAdmin.role === 'superadmin' || currentAdmin.role === 'admin_ops';

  const guardWritePermission = (actionDesc?: string): boolean => {
    if (isReadOnly) {
      showToast(
        actionDesc
          ? `Perlu Login: Silakan masuk dengan akun Admin OPS atau Petugas untuk ${actionDesc}.`
          : 'Perlu Login: Anda sedang dalam mode Lihat Saja. Silakan masuk sebagai Admin OPS untuk menambah atau mengedit data.',
        'info'
      );
      setIsModalLoginAdminOpen(true);
      return false;
    }
    return true;
  };

  const guardDeletePermission = (actionDesc?: string): boolean => {
    if (isReadOnly) {
      showToast(
        actionDesc
          ? `Perlu Login: Silakan masuk dengan akun Admin OPS untuk ${actionDesc}.`
          : 'Perlu Login: Anda sedang dalam mode Lihat Saja. Silakan masuk sebagai Admin OPS untuk menghapus data.',
        'info'
      );
      setIsModalLoginAdminOpen(true);
      return false;
    }
    if (!canDeleteRecords) {
      showToast(
        'Akses Dibatasi: Peran Petugas Entri Data hanya dapat menambah dan mengedit data, tidak dapat menghapus data.',
        'error'
      );
      return false;
    }
    return true;
  };

  // Reload all data from local database
  const reloadData = useCallback(() => {
    const allOps = db.getOPSList();
    setOpsList(allOps);

    const admin = db.getCurrentAdmin();
    setCurrentAdmin(admin);

    // Enforce active OPS matching specific OPS assignment
    if (admin.role !== 'superadmin' && admin.opsId && admin.opsId !== 'all') {
      const curOps = db.getActiveOPS();
      if (curOps.id !== admin.opsId) {
        db.setActiveOPSId(admin.opsId);
      }
    }

    const currentOPS = db.getActiveOPS();
    setActiveOPS(currentOPS);

    const pelList = db.getPelangganList(currentOPS.id);
    setPelangganList(pelList);

    // Muat semua riwayat pembayaran dari semua tahun (termasuk sebelum 2026)
    const byrList = db.getPembayaranList(currentOPS.id);
    setPembayaranList(byrList);

    // Data pengangkutan OPS khusus pemukiman sesuai OPS yang dipilih
    const angkutList = db
      .getPengangkutanList(currentOPS.id)
      .filter(p => (p.sumberSampah || 'Pemukiman') !== 'Clean-up Pantai');
    setPengangkutanList(angkutList);

    // Data Clean-up Pantai berdiri sendiri (tidak terikat dengan pilihan OPS tertentu)
    const allCleanups = db
      .getPengangkutanList('all')
      .filter(p => p.sumberSampah === 'Clean-up Pantai');
    setCleanupList(allCleanups);

    // Sinkronkan rekapitulasi iuran matriks ke arus kas agar nominal selalu 100% konsisten
    db.syncAllIuranMatriksKeKas(selectedYear, currentOPS.id);
    const kList = db.getKasList(currentOPS.id);
    setKasList(kList);

    const comp = db.getKomposisiConfig(currentOPS.id);
    setKomposisiConfig(comp);

    setAdminAccounts(db.getAdminAccounts());
  }, [selectedYear]);

  useEffect(() => {
    reloadData();
    cloudSync.init();
    const unsubStatus = cloudSync.subscribeStatus(setCloudStatus);
    const unsubData = cloudSync.subscribeDataSynced(() => {
      reloadData();
    });
    return () => {
      unsubStatus();
      unsubData();
    };
  }, [reloadData]);

  // Admin Account Actions
  const handleSelectAdmin = (adminId: string) => {
    const admin = db.setCurrentAdminId(adminId);
    db.setSessionUser(admin);
    setSessionUser(admin);
    setCurrentAdmin(admin);
    if (admin.role !== 'superadmin' && admin.role !== 'viewer' && activeTab === 'cleanup') {
      setActiveTab('dashboard');
    }
    if (admin.role !== 'superadmin' && admin.opsId && admin.opsId !== 'all') {
      db.setActiveOPSId(admin.opsId);
    }
    reloadData();
    showToast(
      `Beralih ke akun "${admin.nama}" (${ADMIN_ROLE_LABELS[admin.role] || admin.role})`,
      'success'
    );
  };

  const handleConfirmLogout = () => {
    db.logout();
    setSessionUser(null);
    const guestViewer = db.getCurrentAdmin();
    setCurrentAdmin(guestViewer);
    setIsModalLogoutOpen(false);
    setIsMobileMenuOpen(false);
    if (activeTab === 'akun' || activeTab === 'backup') {
      setActiveTab('dashboard');
    }
    reloadData();
    showToast('Anda telah keluar ke Mode Lihat Saja (Pengunjung).', 'info');
  };

  // Ensure non-superadmin users cannot access Kelola Akun or Backup tab
  useEffect(() => {
    if (currentAdmin.role !== 'superadmin' && (activeTab === 'akun' || activeTab === 'backup')) {
      setActiveTab('dashboard');
    }
  }, [currentAdmin.role, activeTab]);

  const handleSaveAdmin = (account: AdminAccount) => {
    db.saveAdminAccount(account);
    cloudSync.saveAdminToCloud(account);
    reloadData();
    showToast(`Akun "${account.nama}" (${ADMIN_ROLE_LABELS[account.role]}) berhasil disimpan`, 'success');
  };

  const handleDeleteAdmin = (id: string) => {
    const ok = db.deleteAdminAccount(id);
    if (ok) {
      cloudSync.deleteAdminFromCloud(id);
      reloadData();
      showToast('Akun pengguna berhasil dihapus', 'info');
    } else {
      showToast('Tidak dapat menghapus akun superadmin utama terakhir', 'error');
    }
  };

  // OPS Switcher
  const handleSelectOPS = (opsId: string) => {
    if (currentAdmin.role === 'admin_ops') {
      if (opsId !== currentAdmin.opsId) {
        showToast(
          `Akses Terkunci: Admin OPS hanya dapat membuka data wilayah ${currentAdmin.opsNama || 'unit OPSnya'}.`,
          'error'
        );
        return;
      }
    }
    const canAccessAll = currentAdmin.role === 'superadmin' || currentAdmin.opsId === 'all';
    if (!canAccessAll && opsId !== currentAdmin.opsId) {
      showToast(
        `Akses Ditolak: Akun "${currentAdmin.nama}" dibatasi khusus untuk wilayah ${currentAdmin.opsNama || 'unit OPS terkait'}.`,
        'error'
      );
      return;
    }
    db.setActiveOPSId(opsId);
    reloadData();
  };

  // --- Handlers: Pelanggan ---
  const handleSavePelanggan = (pelanggan: Pelanggan) => {
    if (!guardWritePermission()) return;
    const cleanPel: Pelanggan = { ...pelanggan };
    if (cleanPel.status === 'Aktif') {
      delete cleanPel.tanggalBerhenti;
    }
    db.savePelanggan(cleanPel);
    cloudSync.savePelangganToCloud(cleanPel);
    reloadData();
    showToast(
      `Data pelanggan "${cleanPel.nama}" status (${cleanPel.status}) berhasil disimpan dan disinkronkan ke Cloud.`,
      'success'
    );
  };

  const handleTogglePelangganStatus = (pelanggan: Pelanggan) => {
    if (!guardWritePermission()) return;
    const newStatus: StatusPelanggan = pelanggan.status === 'Aktif' ? 'Berhenti' : 'Aktif';
    const updated: Pelanggan = {
      ...pelanggan,
      status: newStatus,
    };
    if (newStatus === 'Berhenti') {
      updated.tanggalBerhenti = new Date().toISOString().substring(0, 10);
    } else {
      delete updated.tanggalBerhenti;
    }
    db.savePelanggan(updated);
    cloudSync.savePelangganToCloud(updated);
    reloadData();
    showToast(
      `Status "${pelanggan.nama}" berhasil diubah menjadi "${newStatus}" & tersimpan di Cloud.`,
      'success'
    );
  };

  const handleUpdatePelangganStatusBatch = (ids: string[], newStatus: StatusPelanggan) => {
    if (!guardWritePermission()) return;
    if (ids.length === 0) return;
    const updatedList = db.batchUpdatePelangganStatus(ids, newStatus);
    cloudSync.batchUpdatePelangganStatusInCloud(updatedList);
    reloadData();
    showToast(
      `Berhasil mengubah status ${ids.length} pelanggan menjadi "${newStatus}" & tersimpan di Cloud.`,
      'success'
    );
  };

  const handleDeletePelanggan = (id: string) => {
    if (!guardDeletePermission()) return;
    db.deletePelanggan(id);
    cloudSync.deletePelangganFromCloud(id);
    reloadData();
  };

  const handleDeletePelangganBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    db.deletePelangganBatch(ids);
    cloudSync.batchDeleteFromCloud('pelanggan', ids);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} data pelanggan terpilih.`, 'info');
  };

  // --- Handlers: Pengangkutan ---
  const handleSavePengangkutan = (data: TransaksiPengangkutan) => {
    if (!guardWritePermission()) return;
    db.savePengangkutan(data);
    cloudSync.savePengangkutanToCloud(data);
    reloadData();
  };

  const handleDeletePengangkutan = (id: string) => {
    if (!guardDeletePermission()) return;
    db.deletePengangkutan(id);
    cloudSync.deletePengangkutanFromCloud(id);
    reloadData();
  };

  const handleDeletePengangkutanBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    db.deletePengangkutanBatch(ids);
    cloudSync.batchDeleteFromCloud('pengangkutan', ids);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} catatan ritase/kegiatan terpilih.`, 'info');
  };

  // --- Handlers: Kas ---
  const handleSaveKas = (data: TransaksiKas) => {
    if (!guardWritePermission()) return;
    db.saveKas(data);
    cloudSync.saveKasToCloud(data);
    reloadData();
  };

  const handleDeleteKas = (id: string) => {
    if (!guardDeletePermission()) return;
    db.deleteKas(id);
    cloudSync.deleteKasFromCloud(id);
    reloadData();
  };

  const handleDeleteKasBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    db.deleteKasBatch(ids);
    cloudSync.batchDeleteFromCloud('transaksi_kas', ids);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} transaksi kas terpilih.`, 'info');
  };

  // --- Handlers: Iuran ---
  const handleSaveIuran = (
    bayar: PembayaranIuran,
    syncToKas: boolean,
    pelangganNama?: string
  ) => {
    if (!guardWritePermission()) return;
    db.savePembayaran(bayar, syncToKas, pelangganNama);
    cloudSync.savePembayaranToCloud(bayar);
    const rekapKas = db.getKasList(bayar.opsId).filter(k => k.id.startsWith('kas-rekap-'));
    if (rekapKas.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', rekapKas);
    }
    reloadData();
    showToast(
      `Setoran iuran ${pelangganNama || 'warga'} tersimpan ke Cloud Firestore & direkap ke tanggal akhir bulan.`,
      'success'
    );
  };

  const handleSyncMonthlyRekap = () => {
    if (!guardWritePermission()) return;
    const result = db.syncAllIuranMatriksKeKas(selectedYear, activeOPS.id);
    const rekapKas = db.getKasList(activeOPS.id).filter(k => k.id.startsWith('kas-rekap-'));
    if (rekapKas.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', rekapKas);
    }
    reloadData();
    showToast(
      `Penerimaan iuran matriks berhasil dihitung & disinkronkan ke Arus Kas (${result.count} bulan, total ${formatRupiah(result.totalUang, true)}).`,
      'success'
    );
  };

  const handleOpenAddIuranForCell = (pelanggan: Pelanggan, bulan: number) => {
    if (!guardWritePermission()) return;
    setSelectedIuranPelanggan(pelanggan);
    setIuranBulan(bulan);
    setIsModalIuranOpen(true);
  };

  const handleDeleteIuran = (id: string, pelangganNama?: string) => {
    if (!guardDeletePermission()) return;
    const deleted = db.getAllPembayaran().find(p => p.id === id);
    db.deletePembayaran(id);
    cloudSync.deletePembayaranFromCloud(id);
    if (deleted) {
      const rekapKas = db.getKasList(deleted.opsId).filter(k => k.id.startsWith('kas-rekap-'));
      if (rekapKas.length > 0) {
        cloudSync.batchImportToCloud('transaksi_kas', rekapKas);
      }
    }
    reloadData();
    showToast(
      `Pembayaran iuran ${pelangganNama || 'warga'} berhasil dihapus & rekapitulasi arus kas otomatis diperbarui.`,
      'info'
    );
  };

  // --- Excel Import Handlers ---
  const handleOpenImportExcel = (type: ImportDataType) => {
    if (!guardWritePermission()) return;
    setImportExcelType(type);
    setIsModalImportExcelOpen(true);
  };

  const handleImportPelangganBatch = (items: Pelanggan[], replace: boolean, targetOpsId: string) => {
    if (!guardWritePermission()) return;
    const count = db.importPelangganBatch(items, replace, targetOpsId);
    cloudSync.batchImportToCloud('pelanggan', items);
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} data pelanggan warga ke Cloud (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  const handleImportPengangkutanBatch = (
    items: TransaksiPengangkutan[],
    replace: boolean,
    targetOpsId: string
  ) => {
    if (!guardWritePermission()) return;
    const count = db.importPengangkutanBatch(items, replace, targetOpsId);
    cloudSync.batchImportToCloud('pengangkutan', items);
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} ritase pengangkutan sampah ke Cloud (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  const handleImportKasBatch = (items: TransaksiKas[], replace: boolean, targetOpsId: string) => {
    if (!guardWritePermission()) return;
    const count = db.importKasBatch(items, replace, targetOpsId);
    cloudSync.batchImportToCloud('transaksi_kas', items);
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} catatan arus kas keuangan ke Cloud (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  const handleImportPembayaranBatch = (
    items: PembayaranIuran[],
    replace: boolean,
    targetOpsId: string
  ) => {
    if (!guardWritePermission()) return;
    const count = db.importPembayaranBatch(items, replace, targetOpsId);
    cloudSync.batchImportToCloud('pembayaran', items);
    // Also sync the generated monthly recap in kas
    const rekapKas = db.getKasList(targetOpsId).filter(k => k.id.startsWith('kas-rekap-'));
    if (rekapKas.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', rekapKas);
    }
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} catatan pembayaran iuran warga (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  // --- Handlers: OPS ---
  const handleSaveOPS = (ops: OPSProfile) => {
    if (!guardWritePermission()) return;
    if (currentAdmin.role !== 'superadmin' && ops.id !== currentAdmin.opsId) {
      showToast('Akses Ditolak: Hanya Super Admin yang berhak membuat atau memodifikasi unit OPS lain.', 'error');
      return;
    }
    db.saveOPS(ops);
    cloudSync.saveOPSToCloud(ops);
    db.setActiveOPSId(ops.id);
    reloadData();
    showToast(`Profil "${ops.nama}" (${ops.kode}) tersimpan ke Cloud Firestore.`, 'success');
  };

  const handleOpenEditOPS = (ops?: OPSProfile) => {
    if (!guardWritePermission()) return;
    if (currentAdmin.role !== 'superadmin' && currentAdmin.role !== 'admin_ops') {
      showToast('Akses Ditolak: Hanya Super Admin atau Admin OPS yang berwenang mengedit profil organisasi.', 'error');
      return;
    }
    if (currentAdmin.role !== 'superadmin' && ops && ops.id !== currentAdmin.opsId) {
      showToast('Akses Ditolak: Anda hanya berwenang mengedit profil unit OPS Anda.', 'error');
      return;
    }
    setIsModalKelolaOPSOpen(false);
    const target = ops || activeOPS;
    const toEdit = target.id === 'all' ? (opsList.find(o => o.id !== 'all') || opsList[0]) : target;
    setEditingOPS(toEdit);
    setIsModalOPSOpen(true);
  };

  const handleRequestDeleteOPS = (ops: OPSProfile) => {
    if (currentAdmin.role !== 'superadmin') {
      showToast('Akses Ditolak: Hanya Super Admin yang memiliki hak menghapus unit OPS.', 'error');
      return;
    }
    if (opsList.length <= 1) {
      setDeleteOPSReason('Tidak dapat menghapus OPS. Minimal harus ada 1 Organisasi Pengelola Sampah terdaftar dalam sistem.');
      setOpsToDelete(ops);
      return;
    }
    setDeleteOPSReason(null);
    setOpsToDelete(ops);
  };

  const handleConfirmDeleteOPS = () => {
    if (!opsToDelete) return;
    const deletedName = opsToDelete.nama;
    db.deleteOPS(opsToDelete.id);
    cloudSync.deleteOPSFromCloud(opsToDelete.id);
    setOpsToDelete(null);
    reloadData();
    showToast(`Organisasi "${deletedName}" berhasil dihapus dari database.`, 'success');
  };

  // --- Handlers: Komposisi ---
  const handleUpdateKomposisi = (config: KomposisiConfig) => {
    if (!guardWritePermission()) return;
    db.saveKomposisiConfig(activeOPS.id, config);
    cloudSync.saveKomposisiToCloud(activeOPS.id, config);
    setKomposisiConfig(config);
  };

  // --- Handlers: Backup & Restore ---
  const handleExportBackup = () => {
    const jsonStr = db.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SI_OPS_BACKUP_${activeOPS.kode}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File backup database JSON berhasil diunduh.', 'success');
  };

  const handleImportBackup = (jsonContent: string) => {
    if (!guardDeletePermission()) return;
    const success = db.importDatabaseJSON(jsonContent);
    if (success) {
      reloadData();
      showToast('Database lokal berhasil dipulihkan dari file backup!', 'success');
    } else {
      showToast('Gagal memulihkan database. Format file backup JSON tidak valid.', 'error');
    }
  };

  const handleResetDatabase = () => {
    if (!guardDeletePermission()) return;
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    db.resetToDefaults();
    setIsResetConfirmOpen(false);
    reloadData();
    showToast('Database berhasil direset ke data awal spreadsheet.', 'info');
  };

  // Calculations for sidebar status (strictly synced with activeOPS or consolidated 'all' OPS)
  const kasUpToSelectedYear = kasList.filter(k => (k.tanggal?.slice(0, 4) || '') <= String(selectedYear));
  const currentSaldo = kasUpToSelectedYear.length > 0
    ? kasUpToSelectedYear[kasUpToSelectedYear.length - 1].saldo || 0
    : (kasList.length > 0 ? kasList[kasList.length - 1].saldo || 0 : 0);

  const activePelangganCount = pelangganList.filter(p => p.status === 'Aktif').length;

  const isSuperAdmin = currentAdmin.role === 'superadmin';
  const canViewCleanUp = currentAdmin.role === 'superadmin' || currentAdmin.role === 'viewer';

  const getItemWeightKg = (item: TransaksiPengangkutan) => {
    const orgAnorg = (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0);
    if (orgAnorg > 0) return orgAnorg;
    return (item.beratCampurKg || 0) + (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0);
  };

  const yearPengangkutanForSidebar = pengangkutanList.filter(p =>
    p.tanggal?.startsWith(String(selectedYear))
  );
  const totalSampahTahunIniKg = yearPengangkutanForSidebar.reduce(
    (sum, item) => sum + getItemWeightKg(item),
    0
  );
  const totalSemuaSampahTercatatKg = pengangkutanList.reduce(
    (sum, item) => sum + getItemWeightKg(item),
    0
  );
  const sidebarSampahKg =
    totalSampahTahunIniKg > 0 ? totalSampahTahunIniKg : totalSemuaSampahTercatatKg;

  // Role-based visible OPS list (superadmin or accounts with opsId === 'all' see all OPS, admin_ops ONLY sees their assigned OPS)
  const canAccessAllOPS = currentAdmin.role === 'superadmin' || (currentAdmin.opsId === 'all' && currentAdmin.role !== 'admin_ops');
  const visibleOPSList = canAccessAllOPS ? opsList : opsList.filter(o => o.id === currentAdmin.opsId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Desktop Window Header */}
      <div className="no-print">
        <DesktopHeader
          activeOPS={activeOPS}
          opsList={visibleOPSList}
          currentAdmin={currentAdmin}
          onOpenLoginAdmin={() => setIsModalLoginAdminOpen(true)}
          onOpenKelolaAdmin={() => setActiveTab('akun')}
          onLogoutRequest={() => setIsModalLogoutOpen(true)}
          onSelectOPS={handleSelectOPS}
          onOpenAddOPS={() => {
            if (!guardWritePermission()) return;
            setEditingOPS(null);
            setIsModalOPSOpen(true);
          }}
          onOpenEditOPS={handleOpenEditOPS}
          onRequestDeleteOPS={handleRequestDeleteOPS}
          onOpenKelolaOPS={() => setIsModalKelolaOPSOpen(true)}
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetDatabase={handleResetDatabase}
          onNavigateToPrint={() => setActiveTab('cetak')}
          cloudStatus={cloudStatus}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          isMobileMenuOpen={isMobileMenuOpen}
          activeTab={activeTab}
        />
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (hidden on print) */}
        <div className="no-print flex shrink-0">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            activeOPS={activeOPS}
            selectedYear={selectedYear}
            activePelangganCount={activePelangganCount}
            saldoKas={currentSaldo}
            totalSampahBulanIniKg={sidebarSampahKg}
            currentAdmin={currentAdmin}
            onOpenLoginAdmin={() => setIsModalLoginAdminOpen(true)}
            onLogoutRequest={() => setIsModalLogoutOpen(true)}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        </div>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto print:p-0 print:overflow-visible min-w-0">
          {/* Role Permission Banner for Read-Only Viewer or Data Entry */}
          {(currentAdmin.role === 'viewer' || currentAdmin.role === 'entri_data') && activeTab !== 'akun' && (
            <div
              className={`mb-4 px-3.5 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs no-print ${
                currentAdmin.role === 'viewer'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-violet-50 text-violet-950 border-violet-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {currentAdmin.role === 'viewer' ? (
                  <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <PenLine className="w-4 h-4 text-violet-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold">
                    {currentAdmin.role === 'viewer'
                      ? `Mode Hanya Lihat (${currentAdmin.nama}): `
                      : `Peran Petugas Entri Data (${currentAdmin.nama}): `}
                  </span>
                  <span className={currentAdmin.role === 'viewer' ? 'text-slate-300' : 'text-violet-800'}>
                    {currentAdmin.role === 'viewer'
                      ? 'Anda dapat melihat seluruh dashboard, tabel, dan mencetak laporan, namun tidak dapat menambah, mengubah, atau menghapus data.'
                      : 'Anda dapat menambah dan mengedit data operasional (pelanggan, iuran, ritase sampah, kas), namun penghapusan data dikunci.'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {currentAdmin.role === 'viewer' ? (
                  <button
                    type="button"
                    onClick={() => setIsModalLoginAdminOpen(true)}
                    className="px-3.5 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <User className="w-4 h-4 text-white shrink-0" />
                    <span>Login Pengurus / Edit Data</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsModalLoginAdminOpen(true)}
                    className="px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Ganti Akun</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              activeOPS={activeOPS}
              opsList={visibleOPSList}
              onSelectOPS={handleSelectOPS}
              onOpenKelolaOPS={() => setIsModalKelolaOPSOpen(true)}
              onOpenEditOPS={handleOpenEditOPS}
              onRequestDeleteOPS={handleRequestDeleteOPS}
              pelangganList={pelangganList}
              pengangkutanList={pengangkutanList}
              cleanupList={cleanupList}
              kasList={kasList}
              pembayaranList={pembayaranList}
              komposisiConfig={komposisiConfig}
              selectedYear={selectedYear}
              isSuperAdmin={isSuperAdmin}
              canViewCleanUp={canViewCleanUp}
              onOpenAddPelanggan={() => {
                if (!guardWritePermission()) return;
                setEditingPelanggan(null);
                setIsModalPelangganOpen(true);
              }}
              onOpenAddPengangkutan={(sumber) => {
                if (!guardWritePermission()) return;
                setEditingPengangkutan(null);
                setModalPengangkutanInitialSumber(
                  isSuperAdmin && sumber ? sumber : 'Pemukiman'
                );
                setIsModalPengangkutanOpen(true);
              }}
              onOpenAddKas={() => {
                if (!guardWritePermission()) return;
                setEditingKas(null);
                setIsModalKasOpen(true);
              }}
              onOpenAddIuran={() => {
                if (!guardWritePermission()) return;
                setSelectedIuranPelanggan(pelangganList[0] || null);
                setIsModalIuranOpen(true);
              }}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'pelanggan' && (
            <PelangganView
              mode="pelanggan"
              activeOPS={activeOPS}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              selectedYear={selectedYear}
              isReadOnly={isReadOnly}
              canDelete={canDeleteRecords}
              onOpenAddPelanggan={() => {
                if (!guardWritePermission()) return;
                setEditingPelanggan(null);
                setIsModalPelangganOpen(true);
              }}
              onOpenEditPelanggan={pelanggan => {
                if (!guardWritePermission()) return;
                setEditingPelanggan(pelanggan);
                setIsModalPelangganOpen(true);
              }}
              onDeletePelanggan={handleDeletePelanggan}
              onDeletePelangganBatch={handleDeletePelangganBatch}
              onTogglePelangganStatus={handleTogglePelangganStatus}
              onUpdatePelangganStatusBatch={handleUpdatePelangganStatusBatch}
              onOpenAddIuranForCell={handleOpenAddIuranForCell}
              onSyncMonthlyRekap={handleSyncMonthlyRekap}
              onOpenImportExcel={(type) => handleOpenImportExcel(type || 'pelanggan')}
            />
          )}

          {activeTab === 'iuran' && (
            <PelangganView
              mode="iuran"
              activeOPS={activeOPS}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              selectedYear={selectedYear}
              isReadOnly={isReadOnly}
              canDelete={canDeleteRecords}
              onOpenAddPelanggan={() => {
                if (!guardWritePermission()) return;
                setEditingPelanggan(null);
                setIsModalPelangganOpen(true);
              }}
              onOpenEditPelanggan={pelanggan => {
                if (!guardWritePermission()) return;
                setEditingPelanggan(pelanggan);
                setIsModalPelangganOpen(true);
              }}
              onDeletePelanggan={handleDeletePelanggan}
              onDeletePelangganBatch={handleDeletePelangganBatch}
              onTogglePelangganStatus={handleTogglePelangganStatus}
              onUpdatePelangganStatusBatch={handleUpdatePelangganStatusBatch}
              onOpenAddIuranForCell={handleOpenAddIuranForCell}
              onSyncMonthlyRekap={handleSyncMonthlyRekap}
              onOpenImportExcel={(type) => handleOpenImportExcel(type || 'pembayaran')}
            />
          )}

          {activeTab === 'transaksi' && (
            <PengangkutanView
              activeOPS={activeOPS}
              pengangkutanList={pengangkutanList}
              selectedYear={selectedYear}
              onOpenAddPengangkutan={() => {
                if (!guardWritePermission()) return;
                setEditingPengangkutan(null);
                setModalPengangkutanInitialSumber('Pemukiman');
                setIsModalPengangkutanOpen(true);
              }}
              onOpenEditPengangkutan={item => {
                if (!guardWritePermission()) return;
                setEditingPengangkutan(item);
                setModalPengangkutanInitialSumber(item.sumberSampah || 'Pemukiman');
                setIsModalPengangkutanOpen(true);
              }}
              onDeletePengangkutan={handleDeletePengangkutan}
              onDeletePengangkutanBatch={handleDeletePengangkutanBatch}
              onOpenImportExcel={() => handleOpenImportExcel('transaksi')}
            />
          )}

          {activeTab === 'cleanup' && canViewCleanUp && (
            <CleanUpPantaiView
              cleanupList={cleanupList}
              selectedYear={selectedYear}
              isReadOnly={!isSuperAdmin}
              onOpenAddCleanUp={() => {
                if (!isSuperAdmin || !guardWritePermission()) return;
                setEditingPengangkutan(null);
                setModalPengangkutanInitialSumber('Clean-up Pantai');
                setIsModalPengangkutanOpen(true);
              }}
              onOpenEditCleanUp={item => {
                if (!isSuperAdmin || !guardWritePermission()) return;
                setEditingPengangkutan(item);
                setModalPengangkutanInitialSumber('Clean-up Pantai');
                setIsModalPengangkutanOpen(true);
              }}
              onDeleteCleanUp={handleDeletePengangkutan}
              onDeleteCleanUpBatch={handleDeletePengangkutanBatch}
            />
          )}

          {activeTab === 'komposisi' && (
            <KomposisiView
              activeOPS={activeOPS}
              pelangganList={pelangganList}
              pengangkutanList={pengangkutanList}
              komposisiConfig={komposisiConfig}
              selectedYear={selectedYear}
              onUpdateConfig={handleUpdateKomposisi}
            />
          )}

          {activeTab === 'keuangan' && (
            <KeuanganView
              activeOPS={activeOPS}
              kasList={kasList}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              selectedYear={selectedYear}
              onOpenAddKas={() => {
                if (!guardWritePermission()) return;
                setEditingKas(null);
                setIsModalKasOpen(true);
              }}
              onOpenEditKas={item => {
                if (!guardWritePermission()) return;
                setEditingKas(item);
                setIsModalKasOpen(true);
              }}
              onDeleteKas={handleDeleteKas}
              onDeleteKasBatch={handleDeleteKasBatch}
              onSyncMonthlyRekap={handleSyncMonthlyRekap}
              onOpenImportExcel={() => handleOpenImportExcel('keuangan')}
            />
          )}

          {activeTab === 'cetak' && (
            <CetakLaporanView
              activeOPS={activeOPS}
              pelangganList={pelangganList}
              pengangkutanList={pengangkutanList}
              kasList={kasList}
              pembayaranList={pembayaranList}
              komposisiConfig={komposisiConfig}
              selectedYear={selectedYear}
            />
          )}

          {activeTab === 'akun' && currentAdmin.role === 'superadmin' && (
            <KelolaAkunView
              adminAccounts={adminAccounts}
              currentAdmin={currentAdmin}
              opsList={opsList}
              onSelectAdmin={handleSelectAdmin}
              onSaveAdmin={handleSaveAdmin}
              onDeleteAdmin={handleDeleteAdmin}
            />
          )}

          {activeTab === 'backup' && currentAdmin.role === 'superadmin' && (
            <BackupRestoreView
              currentAdmin={currentAdmin}
              activeOPS={activeOPS}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetDatabase={handleResetDatabase}
              isReadOnly={isReadOnly}
            />
          )}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg no-print">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pelanggan')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'pelanggan'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'pelanggan' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('iuran')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'iuran'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className={`w-5 h-5 mb-0.5 ${activeTab === 'iuran' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Iuran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transaksi')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'transaksi'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className={`w-5 h-5 mb-0.5 ${activeTab === 'transaksi' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Ritase</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            isMobileMenuOpen
              ? 'text-emerald-700 font-bold'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
          aria-label="Buka Semua Menu"
        >
          <Menu className="w-5 h-5 mb-0.5 text-slate-500" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Global Modals */}
      <ModalFormPelanggan
        isOpen={isModalPelangganOpen}
        onClose={() => setIsModalPelangganOpen(false)}
        onSave={handleSavePelanggan}
        editingPelanggan={editingPelanggan}
        activeOPSId={activeOPS.id}
        defaultTarif={activeOPS.tarifDefault || 20000}
        opsList={visibleOPSList}
      />

      <ModalFormPengangkutan
        isOpen={isModalPengangkutanOpen}
        onClose={() => setIsModalPengangkutanOpen(false)}
        onSave={handleSavePengangkutan}
        editingItem={editingPengangkutan}
        activeOPS={activeOPS}
        opsList={visibleOPSList}
        initialSumber={modalPengangkutanInitialSumber}
        isSuperAdmin={isSuperAdmin}
      />

      <ModalFormKas
        isOpen={isModalKasOpen}
        onClose={() => setIsModalKasOpen(false)}
        onSave={handleSaveKas}
        editingItem={editingKas}
        activeOPS={activeOPS}
        opsList={visibleOPSList}
      />

      <ModalFormIuran
        isOpen={isModalIuranOpen}
        onClose={() => setIsModalIuranOpen(false)}
        onSave={handleSaveIuran}
        onDelete={handleDeleteIuran}
        selectedPelanggan={selectedIuranPelanggan}
        pelangganList={pelangganList}
        pembayaranList={pembayaranList}
        initialBulan={iuranBulan}
        initialTahun={selectedYear}
        activeOPS={activeOPS}
      />

      <ModalFormOPS
        isOpen={isModalOPSOpen}
        onClose={() => setIsModalOPSOpen(false)}
        onSave={handleSaveOPS}
        onRequestDelete={handleRequestDeleteOPS}
        editingOPS={editingOPS}
        opsList={visibleOPSList}
        onSelectEditingOPS={setEditingOPS}
      />

      <ModalKelolaOPS
        isOpen={isModalKelolaOPSOpen}
        onClose={() => setIsModalKelolaOPSOpen(false)}
        opsList={opsList}
        activeOPS={activeOPS}
        onSelectOPS={handleSelectOPS}
        onOpenAddOPS={() => {
          setIsModalKelolaOPSOpen(false);
          setEditingOPS(null);
          setIsModalOPSOpen(true);
        }}
        onOpenEditOPS={handleOpenEditOPS}
        onRequestDeleteOPS={handleRequestDeleteOPS}
        pelangganList={db.getPelangganList('all')}
        pengangkutanList={db.getPengangkutanList('all')}
        kasList={db.getKasList('all')}
      />

      {/* Global Excel Import Modal (Pelanggan, Transaksi Sampah, Arus Kas) */}
      <ModalImportExcel
        isOpen={isModalImportExcelOpen}
        onClose={() => setIsModalImportExcelOpen(false)}
        importType={importExcelType}
        activeOPS={activeOPS}
        opsList={visibleOPSList}
        pelangganList={pelangganList}
        selectedYear={selectedYear}
        onImportPelanggan={handleImportPelangganBatch}
        onImportPengangkutan={handleImportPengangkutanBatch}
        onImportKas={handleImportKasBatch}
        onImportPembayaran={handleImportPembayaranBatch}
      />

      {/* In-app Confirmation Modal for Deleting OPS */}
      <ModalConfirm
        isOpen={opsToDelete !== null}
        title="Konfirmasi Hapus Organisasi Pengelola Sampah"
        message={
          opsToDelete ? (
            <div className="space-y-3">
              <p>
                Apakah Anda yakin ingin menghapus <strong>{opsToDelete.nama} ({opsToDelete.kode})</strong>?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5">
                <p className="font-bold">⚠️ PERINGATAN HAPUS PERMANEN:</p>
                <p>
                  Seluruh data pelanggan warga, riwayat ritase pengangkutan sampah, dan catatan arus kas yang
                  terhubung dengan <strong>{opsToDelete.nama}</strong> akan ikut dihapus dari database lokal.
                </p>
              </div>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        disabled={opsList.length <= 1}
        disabledReason={deleteOPSReason || undefined}
        onConfirm={handleConfirmDeleteOPS}
        onCancel={() => {
          setOpsToDelete(null);
          setDeleteOPSReason(null);
        }}
      />

      {/* In-app Confirmation Modal for Reset Database */}
      <ModalConfirm
        isOpen={isResetConfirmOpen}
        title="Reset Database ke Data Contoh Awal"
        message={
          <div className="space-y-2">
            <p>
              Kembalikan seluruh database ke data awal contoh spreadsheet (OPS Tanah Rata &amp; OPS Mekar Asri)?
            </p>
            <p className="text-xs text-slate-500">
              Catatan baru yang telah Anda input akan dibersihkan dan diganti dengan data contoh awal.
            </p>
          </div>
        }
        confirmText="Reset Database"
        cancelText="Batal"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Modal Login & Switch Admin OPS */}
      <ModalLoginAdmin
        isOpen={isModalLoginAdminOpen}
        onClose={() => setIsModalLoginAdminOpen(false)}
        adminAccounts={adminAccounts}
        currentAdmin={currentAdmin}
        opsList={opsList}
        onSelectAdmin={handleSelectAdmin}
        onOpenKelolaAdmin={() => {
          setIsModalLoginAdminOpen(false);
          setIsModalKelolaAdminOpen(true);
        }}
      />

      {/* Modal Kelola Akun Admin OPS */}
      <ModalKelolaAdmin
        isOpen={isModalKelolaAdminOpen}
        onClose={() => setIsModalKelolaAdminOpen(false)}
        adminAccounts={adminAccounts}
        currentAdmin={currentAdmin}
        opsList={opsList}
        onSaveAdmin={handleSaveAdmin}
        onDeleteAdmin={handleDeleteAdmin}
      />

      {/* Modal Konfirmasi Logout */}
      <ModalLogoutConfirm
        isOpen={isModalLogoutOpen}
        onClose={() => setIsModalLogoutOpen(false)}
        onConfirmLogout={handleConfirmLogout}
        currentAdmin={currentAdmin}
      />

      {/* Floating In-App Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-800 text-white border-rose-700'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/70 hover:text-white p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
