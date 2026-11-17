/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Truck,
  Menu,
  PenLine,
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
  JenisDaurUlangItem,
  TransaksiDaurUlang,
  SumberDaurUlangMasuk,
  JenisPengeluaranDaurUlang,
  TujuanUangDiterima,
  KunciBulanKas,
  LogAktivitas,
  LogAktivitasAksi,
  LogAktivitasModul,
} from './types/ops';
import { db, ALL_OPS_PROFILE } from './services/db';
import { cloudSync, SyncStatus } from './services/cloudSync';
import { formatRupiah, MONTH_NAMES_ID } from './utils/format';
import { DesktopHeader } from './components/DesktopHeader';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PelangganView } from './components/PelangganView';
import { PengangkutanView } from './components/PengangkutanView';
import { CleanUpPantaiView } from './components/CleanUpPantaiView';
import { KomposisiView } from './components/KomposisiView';
import { DaurUlangView } from './components/DaurUlangView';
import { KeuanganView } from './components/KeuanganView';
import { CetakLaporanView } from './components/CetakLaporanView';
import { LogAktivitasView } from './components/LogAktivitasView';
import { KelolaAkunView } from './components/KelolaAkunView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { LoginScreen } from './components/LoginScreen';
import { PublicWebsiteView } from './components/PublicWebsiteView';

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
import { ModalTimbangMasuk } from './components/modals/ModalTimbangMasuk';
import { ModalJualKeluar } from './components/modals/ModalJualKeluar';
import { ModalJenisHarga } from './components/modals/ModalJenisHarga';
import { ModalImportExcelDaurUlang } from './components/modals/ModalImportExcelDaurUlang';

export default function App() {
  const [sessionUser, setSessionUser] = useState<AdminAccount | null>(() => db.getSessionUser());
  const [publicViewMode, setPublicViewMode] = useState<'website' | 'login'>('website');
  const [showPublicWebsite, setShowPublicWebsite] = useState<boolean>(false);
  const [isModalLogoutOpen, setIsModalLogoutOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [cloudStatus, setCloudStatus] = useState<SyncStatus>('connecting');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Entities (Portal Admin active-OPS scoped)
  const [opsList, setOpsList] = useState<OPSProfile[]>([]);
  const [activeOPS, setActiveOPS] = useState<OPSProfile>(() => db.getActiveOPS());
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [pembayaranList, setPembayaranList] = useState<PembayaranIuran[]>([]);
  const [pengangkutanList, setPengangkutanList] = useState<TransaksiPengangkutan[]>([]);
  const [cleanupList, setCleanupList] = useState<TransaksiPengangkutan[]>([]);
  const [kasList, setKasList] = useState<TransaksiKas[]>([]);
  const [lockedKasMonths, setLockedKasMonths] = useState<KunciBulanKas[]>([]);
  const [activityLogs, setActivityLogs] = useState<LogAktivitas[]>([]);
  const [komposisiConfig, setKomposisiConfig] = useState<KomposisiConfig>(
    db.getKomposisiConfig(activeOPS.id)
  );

  // Full datasets for Public Website (strictly non-financial props passed)
  const [publicPelangganList, setPublicPelangganList] = useState<Pelanggan[]>([]);
  const [publicPembayaranList, setPublicPembayaranList] = useState<PembayaranIuran[]>([]);
  const [publicPengangkutanList, setPublicPengangkutanList] = useState<TransaksiPengangkutan[]>([]);
  const [publicDaurUlangList, setPublicDaurUlangList] = useState<TransaksiDaurUlang[]>([]);

  // Daur Ulang state
  const [jenisDaurUlangList, setJenisDaurUlangList] = useState<JenisDaurUlangItem[]>([]);
  const [transaksiDaurUlangList, setTransaksiDaurUlangList] = useState<TransaksiDaurUlang[]>([]);
  const [isModalTimbangMasukOpen, setIsModalTimbangMasukOpen] = useState<boolean>(false);
  const [isModalJualKeluarOpen, setIsModalJualKeluarOpen] = useState<boolean>(false);
  const [isModalJenisHargaOpen, setIsModalJenisHargaOpen] = useState<boolean>(false);
  const [isModalImportDaurUlangOpen, setIsModalImportDaurUlangOpen] = useState<boolean>(false);

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
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => db.getCurrentAdmin());
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

  // Role Permission Checks (Portal Admin only allows authenticated accounts)
  const isReadOnly = !currentAdmin;
  const canDeleteRecords =
    currentAdmin?.role === 'superadmin' || currentAdmin?.role === 'admin_ops';

  const guardWritePermission = (actionDesc?: string): boolean => {
    if (!currentAdmin) {
      showToast(
        actionDesc
          ? `Perlu Login: Silakan masuk ke Portal Admin untuk ${actionDesc}.`
          : 'Perlu Login: Silakan masuk dengan akun terdaftar untuk mengakses Portal Admin.',
        'info'
      );
      setPublicViewMode('login');
      return false;
    }
    return true;
  };

  const guardDeletePermission = (actionDesc?: string): boolean => {
    if (!currentAdmin) {
      showToast(
        actionDesc
          ? `Perlu Login: Silakan masuk ke Portal Admin untuk ${actionDesc}.`
          : 'Perlu Login: Silakan masuk dengan akun terdaftar untuk menghapus data.',
        'info'
      );
      setPublicViewMode('login');
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
    setSessionUser(admin);

    // Kunci unit OPS untuk admin OPS wilayah tertentu
    if (admin && admin.role !== 'superadmin' && admin.opsId && admin.opsId !== 'all') {
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

    // Public Website datasets (selalu memuat seluruh OPS agar pengunjung bisa memfilter bebas tanpa status keuangan)
    setPublicPelangganList(db.getPelangganList('all'));
    setPublicPembayaranList(db.getPembayaranList('all'));
    setPublicPengangkutanList(
      db.getPengangkutanList('all').filter(p => (p.sumberSampah || 'Pemukiman') !== 'Clean-up Pantai')
    );
    setPublicDaurUlangList(db.getTransaksiDaurUlangList('all'));

    // Sinkronkan rekapitulasi iuran matriks ke arus kas (bulan terkunci otomatis dilindungi)
    setLockedKasMonths(db.getLockedKasMonths(currentOPS.id));
    db.syncAllIuranMatriksKeKas(selectedYear, currentOPS.id);
    const kList = db.getKasList(currentOPS.id);
    setKasList(kList);

    const comp = db.getKomposisiConfig(currentOPS.id);
    setKomposisiConfig(comp);

    setJenisDaurUlangList(db.getJenisDaurUlangList());
    setTransaksiDaurUlangList(db.getTransaksiDaurUlangList(currentOPS.id));

    setActivityLogs(db.getActivityLogs(currentOPS.id));
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

  const recordActivity = useCallback(
    (
      modul: LogAktivitasModul,
      aksi: LogAktivitasAksi,
      deskripsi: string,
      opts?: {
        actor?: AdminAccount | null;
        opsId?: string;
        targetId?: string;
        detail?: string;
      }
    ) => {
      const actor = opts?.actor ?? currentAdmin;
      const targetOpsId = opts?.opsId ?? activeOPS.id ?? 'all';
      const allOps = db.getOPSList();
      const opsObj =
        targetOpsId === 'all'
          ? ALL_OPS_PROFILE
          : allOps.find(o => o.id === targetOpsId) || activeOPS;
      const now = new Date();
      const entry: LogAktivitas = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now.toISOString(),
        tanggal: now.toISOString().substring(0, 10),
        actorId: actor?.id || 'system',
        actorName: actor?.nama || 'Sistem',
        actorRole: actor?.role || 'system',
        opsId: targetOpsId,
        opsNama: targetOpsId === 'all' ? 'Semua OPS' : opsObj?.nama || targetOpsId,
        modul,
        aksi,
        deskripsi,
        ...(opts?.targetId ? { targetId: opts.targetId } : {}),
        ...(opts?.detail ? { detail: opts.detail } : {}),
      };
      const saved = db.addActivityLog(entry);
      cloudSync.saveActivityLogToCloud(saved);
    },
    [currentAdmin, activeOPS]
  );

  // Admin Account Actions
  const handleLoginSuccess = (account: AdminAccount) => {
    setSessionUser(account);
    setCurrentAdmin(account);
    setPublicViewMode('website');
    setShowPublicWebsite(false);
    if (account.role !== 'superadmin' && activeTab === 'cleanup') {
      setActiveTab('dashboard');
    }
    if (account.role !== 'superadmin' && account.opsId && account.opsId !== 'all') {
      db.setActiveOPSId(account.opsId);
    } else if (account.role === 'superadmin') {
      db.setActiveOPSId('all');
    }
    recordActivity(
      'Auth',
      'LOGIN',
      `Login ke Portal Admin sebagai ${ADMIN_ROLE_LABELS[account.role] || account.role}`,
      {
        actor: account,
        opsId: account.role === 'superadmin' ? 'all' : account.opsId || 'all',
      }
    );
    reloadData();
    showToast(
      `Selamat datang di Portal Admin, ${account.nama} (${ADMIN_ROLE_LABELS[account.role] || account.role}).`,
      'success'
    );
  };

  const handleSelectAdmin = (adminId: string) => {
    const admin = db.setCurrentAdminId(adminId, true);
    if (!admin) return;
    setSessionUser(admin);
    setCurrentAdmin(admin);
    if (admin.role !== 'superadmin' && activeTab === 'cleanup') {
      setActiveTab('dashboard');
    }
    if (admin.role !== 'superadmin' && admin.opsId && admin.opsId !== 'all') {
      db.setActiveOPSId(admin.opsId);
    }
    recordActivity(
      'Auth',
      'GANTI_AKUN',
      `Beralih ke akun "${admin.nama}" (${ADMIN_ROLE_LABELS[admin.role] || admin.role})`,
      {
        actor: admin,
        opsId: admin.role === 'superadmin' ? activeOPS.id : admin.opsId || 'all',
      }
    );
    reloadData();
    showToast(
      `Beralih ke akun "${admin.nama}" (${ADMIN_ROLE_LABELS[admin.role] || admin.role})`,
      'success'
    );
  };

  const handleConfirmLogout = () => {
    const prevAdmin = currentAdmin;
    const prevOpsId = activeOPS.id;
    recordActivity('Auth', 'LOGOUT', 'Keluar dari Portal Admin', {
      actor: prevAdmin,
      opsId: prevOpsId,
    });
    db.logout();
    setSessionUser(null);
    setCurrentAdmin(null);
    setPublicViewMode('website');
    setShowPublicWebsite(false);
    setActiveOPS(ALL_OPS_PROFILE);
    setIsModalLogoutOpen(false);
    setIsMobileMenuOpen(false);
    setActiveTab('dashboard');
    reloadData();
    showToast('Anda telah keluar dari Portal Admin dan kembali ke Beranda Website.', 'info');
  };

  // Ensure non-superadmin users cannot access Kelola Akun or Backup tab, and entri_data cannot access Log Aktivitas
  useEffect(() => {
    if (currentAdmin && currentAdmin.role !== 'superadmin' && (activeTab === 'akun' || activeTab === 'backup')) {
      setActiveTab('dashboard');
    }
    if (currentAdmin && currentAdmin.role === 'entri_data' && activeTab === 'log') {
      setActiveTab('dashboard');
    }
  }, [currentAdmin, activeTab]);

  const handleSaveAdmin = (account: AdminAccount) => {
    const isEdit = adminAccounts.some(a => a.id === account.id);
    db.saveAdminAccount(account);
    cloudSync.saveAdminToCloud(account);
    recordActivity(
      'Kelola Akun',
      isEdit ? 'UBAH' : 'TAMBAH',
      `${isEdit ? 'Memperbarui' : 'Menambahkan'} akun "${account.nama}" (${ADMIN_ROLE_LABELS[account.role]})`,
      { opsId: account.opsId || 'all', targetId: account.id }
    );
    reloadData();
    showToast(`Akun "${account.nama}" (${ADMIN_ROLE_LABELS[account.role]}) berhasil disimpan`, 'success');
  };

  const handleDeleteAdmin = (id: string) => {
    const target = adminAccounts.find(a => a.id === id);
    const ok = db.deleteAdminAccount(id);
    if (ok) {
      cloudSync.deleteAdminFromCloud(id);
      recordActivity(
        'Kelola Akun',
        'HAPUS',
        `Menghapus akun pengguna "${target?.nama || id}"`,
        { opsId: target?.opsId || 'all', targetId: id }
      );
      reloadData();
      showToast('Akun pengguna berhasil dihapus', 'info');
    } else {
      showToast('Tidak dapat menghapus akun superadmin utama terakhir', 'error');
    }
  };

  // OPS Switcher
  const handleSelectOPS = (opsId: string) => {
    if (!currentAdmin) return;
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
    const isEdit = db.getAllPelanggan().some(p => p.id === pelanggan.id);
    const cleanPel: Pelanggan = { ...pelanggan };
    if (cleanPel.status === 'Aktif') {
      delete cleanPel.tanggalBerhenti;
    }
    db.savePelanggan(cleanPel);
    cloudSync.savePelangganToCloud(cleanPel);
    recordActivity(
      'Pelanggan',
      isEdit ? 'UBAH' : 'TAMBAH',
      `${isEdit ? 'Memperbarui' : 'Menambahkan'} pelanggan "${cleanPel.nama}"`,
      {
        opsId: cleanPel.opsId,
        targetId: cleanPel.id,
        detail: `Kategori: ${cleanPel.kategori}, RT: ${cleanPel.rt}, Status: ${cleanPel.status}`,
      }
    );
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
    recordActivity(
      'Pelanggan',
      'UBAH',
      `Mengubah status pelanggan "${pelanggan.nama}" menjadi ${newStatus}`,
      { opsId: pelanggan.opsId, targetId: pelanggan.id }
    );
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
    recordActivity(
      'Pelanggan',
      'UBAH',
      `Mengubah status massal ${ids.length} pelanggan menjadi "${newStatus}"`
    );
    reloadData();
    showToast(
      `Berhasil mengubah status ${ids.length} pelanggan menjadi "${newStatus}" & tersimpan di Cloud.`,
      'success'
    );
  };

  const handleDeletePelanggan = (id: string) => {
    if (!guardDeletePermission()) return;
    const target = db.getAllPelanggan().find(p => p.id === id);
    db.deletePelanggan(id);
    cloudSync.deletePelangganFromCloud(id);
    recordActivity(
      'Pelanggan',
      'HAPUS',
      `Menghapus data pelanggan "${target?.nama || id}"`,
      { opsId: target?.opsId || activeOPS.id, targetId: id }
    );
    reloadData();
  };

  const handleDeletePelangganBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    db.deletePelangganBatch(ids);
    cloudSync.batchDeleteFromCloud('pelanggan', ids);
    recordActivity('Pelanggan', 'HAPUS', `Menghapus massal ${ids.length} data pelanggan`);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} data pelanggan terpilih.`, 'info');
  };

  // --- Handlers: Pengangkutan ---
  const handleSavePengangkutan = (data: TransaksiPengangkutan) => {
    if (!guardWritePermission('mencatat ritase sampah')) return;
    const isEdit = db.getAllPengangkutan().some(p => p.id === data.id);
    // Pastikan opsId terarah ke activeOPS bila sedang membuka wilayah OPS spesifik
    if (activeOPS.id !== 'all' && data.sumberSampah !== 'Clean-up Pantai') {
      data.opsId = activeOPS.id;
    }
    db.savePengangkutan(data);
    cloudSync.savePengangkutanToCloud(data);
    const modul: LogAktivitasModul =
      data.sumberSampah === 'Clean-up Pantai' ? 'Clean-up Pantai' : 'Transaksi Sampah';
    recordActivity(
      modul,
      isEdit ? 'UBAH' : 'TAMBAH',
      `${isEdit ? 'Memperbarui' : 'Mencatat'} ${
        modul === 'Clean-up Pantai' ? 'aksi Clean-up Pantai' : 'ritase pengangkutan'
      } (${data.hariTanggalLabel || data.tanggal})`,
      {
        opsId: data.opsId || activeOPS.id,
        targetId: data.id,
        detail: data.armada ? `Armada: ${data.armada}` : data.lokasiPantai ? `Lokasi: ${data.lokasiPantai}` : undefined,
      }
    );
    reloadData();
    showToast(
      `Catatan ritase pengangkutan (${data.hariTanggalLabel || data.tanggal}) berhasil disimpan.`,
      'success'
    );
  };

  const handleDeletePengangkutan = (id: string) => {
    if (!guardDeletePermission()) return;
    const target = db.getAllPengangkutan().find(p => p.id === id);
    db.deletePengangkutan(id);
    cloudSync.deletePengangkutanFromCloud(id);
    const modul: LogAktivitasModul =
      target?.sumberSampah === 'Clean-up Pantai' ? 'Clean-up Pantai' : 'Transaksi Sampah';
    recordActivity(
      modul,
      'HAPUS',
      `Menghapus catatan ${
        modul === 'Clean-up Pantai' ? 'Clean-up Pantai' : 'ritase pengangkutan'
      } (${target?.hariTanggalLabel || target?.tanggal || id})`,
      { opsId: target?.opsId || activeOPS.id, targetId: id }
    );
    reloadData();
    showToast('Catatan ritase berhasil dihapus.', 'info');
  };

  const handleDeletePengangkutanBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    db.deletePengangkutanBatch(ids);
    cloudSync.batchDeleteFromCloud('pengangkutan', ids);
    recordActivity(
      activeTab === 'cleanup' ? 'Clean-up Pantai' : 'Transaksi Sampah',
      'HAPUS',
      `Menghapus massal ${ids.length} catatan ritase/kegiatan`
    );
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} catatan ritase/kegiatan terpilih.`, 'info');
  };

  // --- Handlers: Kas ---
  const handleSaveKas = (data: TransaksiKas) => {
    if (!guardWritePermission('mencatat transaksi arus kas')) return;
    const isEdit = db.getAllKas().some(k => k.id === data.id);
    if (activeOPS.id !== 'all') {
      data.opsId = activeOPS.id;
    }
    db.saveKas(data);
    cloudSync.saveKasToCloud(data);
    recordActivity(
      'Keuangan',
      isEdit ? 'UBAH' : 'TAMBAH',
      `${isEdit ? 'Memperbarui' : 'Mencatat'} transaksi kas "${data.uraian}"`,
      {
        opsId: data.opsId || activeOPS.id,
        targetId: data.id,
        detail:
          data.pemasukan > 0
            ? `Pemasukan ${formatRupiah(data.pemasukan, true)}`
            : `Pengeluaran ${formatRupiah(data.pengeluaran, true)}`,
      }
    );
    reloadData();
    showToast('Transaksi kas berhasil disimpan.', 'success');
  };

  const handleDeleteKas = (id: string) => {
    if (!guardDeletePermission()) return;
    const target = db.getAllKas().find(k => k.id === id);
    db.deleteKas(id);
    cloudSync.deleteKasFromCloud(id);
    recordActivity(
      'Keuangan',
      'HAPUS',
      `Menghapus transaksi kas "${target?.uraian || id}"`,
      { opsId: target?.opsId || activeOPS.id, targetId: id }
    );
    reloadData();
  };

  const handleDeleteKasBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    db.deleteKasBatch(ids);
    cloudSync.batchDeleteFromCloud('transaksi_kas', ids);
    recordActivity('Keuangan', 'HAPUS', `Menghapus massal ${ids.length} transaksi kas`);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} transaksi kas terpilih.`, 'info');
  };

  // --- Handlers: Iuran & Kunci Bulan Kas (Tutup Buku) ---
  const handleSaveIuran = (
    bayar: PembayaranIuran,
    syncToKas: boolean,
    pelangganNama?: string
  ) => {
    if (!guardWritePermission()) return;
    const pel = db.getAllPelanggan().find(p => p.id === bayar.pelangganId);
    const effectiveOpsId =
      bayar.opsId && bayar.opsId !== 'all' ? bayar.opsId : pel?.opsId || bayar.opsId;
    const normalizedBayar: PembayaranIuran = { ...bayar, opsId: effectiveOpsId };
    const existedPay = db.getAllPembayaran().some(p => p.id === normalizedBayar.id);
    const tunggakanId = `kas-tunggakan-${normalizedBayar.id}`;
    const existedTunggakan = db.getAllKas().some(k => k.id === tunggakanId);
    const isLocked = Boolean(
      db.isMonthLocked(effectiveOpsId, normalizedBayar.tahun, normalizedBayar.bulan)
    );

    db.savePembayaran(normalizedBayar, syncToKas, pelangganNama);
    cloudSync.savePembayaranToCloud(normalizedBayar);

    const monthName = MONTH_NAMES_ID[normalizedBayar.bulan - 1] || `Bulan ${normalizedBayar.bulan}`;
    recordActivity(
      'Iuran',
      existedPay ? 'UBAH' : 'TAMBAH',
      `${existedPay ? 'Memperbarui' : 'Mencatat'} iuran ${pelangganNama || pel?.nama || 'warga'} (${monthName} ${normalizedBayar.tahun})`,
      {
        opsId: effectiveOpsId,
        targetId: normalizedBayar.id,
        detail: `Nominal: ${formatRupiah(normalizedBayar.jumlah, true)} • Metode: ${normalizedBayar.metode}${isLocked ? ' • Masuk Penerimaan Tunggakan (Tutup Buku)' : ''}`,
      }
    );

    if (isLocked) {
      const tunggakanKas = db.getAllKas().find(k => k.id === tunggakanId);
      if (tunggakanKas) {
        cloudSync.saveKasToCloud(tunggakanKas);
      } else if (existedTunggakan) {
        cloudSync.deleteKasFromCloud(tunggakanId);
      }
      reloadData();
      showToast(
        tunggakanKas
          ? `Setoran ${pelangganNama || 'warga'} tersimpan! Karena ${monthName} ${normalizedBayar.tahun} sudah Tutup Buku, selisihnya (${formatRupiah(tunggakanKas.pemasukan, false)}) otomatis dicatat sebagai Penerimaan Tunggakan per ${normalizedBayar.tanggalBayar}.`
          : `Catatan iuran ${pelangganNama || 'warga'} diperbarui tanpa mengubah rekap kas ${monthName} ${normalizedBayar.tahun} yang sudah Tutup Buku.`,
        'success'
      );
    } else {
      if (existedTunggakan) {
        cloudSync.deleteKasFromCloud(tunggakanId);
      }
      const rekapId = `kas-rekap-${effectiveOpsId}-${normalizedBayar.tahun}-${String(normalizedBayar.bulan).padStart(2, '0')}`;
      const rekapItem = db.getAllKas().find(k => k.id === rekapId);
      if (rekapItem) {
        cloudSync.saveKasToCloud(rekapItem);
      }
      reloadData();
      showToast(
        `Setoran iuran ${pelangganNama || 'warga'} tersimpan ke Cloud Firestore & direkap ke akhir bulan.`,
        'success'
      );
    }
  };

  const handleSyncMonthlyRekap = () => {
    if (!guardWritePermission()) return;
    const result = db.syncAllIuranMatriksKeKas(selectedYear, activeOPS.id);
    if (result.rekapList.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', result.rekapList);
    }
    recordActivity(
      'Iuran',
      'UBAH',
      `Sinkronisasi rekap iuran matriks tahun ${selectedYear} ke Arus Kas (${result.count} bulan, ${formatRupiah(result.totalUang, true)})`
    );
    reloadData();
    showToast(
      `Penerimaan iuran matriks bulan terbuka berhasil disinkronkan ke Arus Kas (${result.count} bulan, total ${formatRupiah(result.totalUang, true)}). Bulan terkunci tetap aman.`,
      'success'
    );
  };

  const handleLockKasMonth = (bulan: number, tahunParam?: number) => {
    if (!guardWritePermission('mengunci rekap kas bulan ini (Tutup Buku)')) return;
    const yr = tahunParam || selectedYear;
    const res = db.lockKasMonth(
      activeOPS.id,
      yr,
      bulan,
      currentAdmin?.nama || currentAdmin?.username
    );
    if (res.updatedRekapKas.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', res.updatedRekapKas);
    }
    if (res.locks.length > 0) {
      cloudSync.batchImportToCloud('kunci_bulan_kas', res.locks);
    }
    recordActivity(
      'Tutup Buku',
      'KUNCI',
      `Mengunci Tutup Buku kas bulan ${MONTH_NAMES_ID[bulan - 1]} ${yr}`
    );
    reloadData();
    showToast(
      `Tutup Buku ${MONTH_NAMES_ID[bulan - 1]} ${yr} aktif! Nominal rekap kas bulan tersebut kini terkunci.`,
      'success'
    );
  };

  const handleLockPastKasMonths = (tahunParam?: number) => {
    if (!guardWritePermission('mengunci bulan-bulan yang sudah lewat (Tutup Buku)')) return;
    const yr = tahunParam || selectedYear;
    const res = db.lockPastKasMonths(
      activeOPS.id,
      yr,
      currentAdmin?.nama || currentAdmin?.username
    );
    if (res.locks.length === 0) {
      showToast(`Tidak ada bulan yang sudah lewat untuk dikunci pada tahun ${yr}.`, 'info');
      return;
    }
    if (res.updatedRekapKas.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', res.updatedRekapKas);
    }
    cloudSync.batchImportToCloud('kunci_bulan_kas', res.locks);
    recordActivity(
      'Tutup Buku',
      'KUNCI',
      `Tutup Buku massal bulan-bulan yang sudah lewat di tahun ${yr}`,
      { detail: `${res.locks.length} kunci bulan diterapkan` }
    );
    reloadData();
    showToast(
      `Berhasil Tutup Buku seluruh bulan yang sudah lewat di tahun ${yr}. Pembayaran susulan akan tercatat sebagai Penerimaan Tunggakan di bulan tanggal bayar.`,
      'success'
    );
  };

  const handleUnlockKasMonth = (bulan: number, tahunParam?: number) => {
    if (!guardDeletePermission('membuka kunci Tutup Buku kas bulanan')) return;
    const yr = tahunParam || selectedYear;
    const res = db.unlockKasMonth(activeOPS.id, yr, bulan);
    if (res.removedLockIds.length > 0) {
      cloudSync.batchDeleteFromCloud('kunci_bulan_kas', res.removedLockIds);
    }
    const kasToDelete = [...res.removedTunggakanKasIds, ...res.removedRekapKasIds];
    if (kasToDelete.length > 0) {
      cloudSync.batchDeleteFromCloud('transaksi_kas', kasToDelete);
    }
    if (res.updatedRekapKas.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', res.updatedRekapKas);
    }
    recordActivity(
      'Tutup Buku',
      'BUKA_KUNCI',
      `Membuka kunci Tutup Buku kas bulan ${MONTH_NAMES_ID[bulan - 1]} ${yr}`
    );
    reloadData();
    showToast(
      `Kunci Tutup Buku ${MONTH_NAMES_ID[bulan - 1]} ${yr} dibuka kembali & rekap kas disesuaikan ulang dengan matriks.`,
      'info'
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
    const tunggakanId = `kas-tunggakan-${id}`;
    const existedTunggakan = db.getAllKas().some(k => k.id === tunggakanId);

    db.deletePembayaran(id);
    cloudSync.deletePembayaranFromCloud(id);
    if (existedTunggakan) {
      cloudSync.deleteKasFromCloud(tunggakanId);
    }
    if (deleted && !db.isMonthLocked(deleted.opsId, deleted.tahun, deleted.bulan)) {
      const rekapId = `kas-rekap-${deleted.opsId}-${deleted.tahun}-${String(deleted.bulan).padStart(2, '0')}`;
      const rekapItem = db.getAllKas().find(k => k.id === rekapId);
      if (rekapItem) {
        cloudSync.saveKasToCloud(rekapItem);
      } else {
        cloudSync.deleteKasFromCloud(rekapId);
      }
    }
    recordActivity(
      'Iuran',
      'HAPUS',
      `Menghapus pembayaran iuran ${pelangganNama || 'warga'}${deleted ? ` (${MONTH_NAMES_ID[deleted.bulan - 1]} ${deleted.tahun})` : ''}`,
      { opsId: deleted?.opsId || activeOPS.id, targetId: id }
    );
    reloadData();
    showToast(
      `Pembayaran iuran ${pelangganNama || 'warga'} berhasil dihapus.`,
      'info'
    );
  };

  const handleDeletePembayaranBatch = (ids: string[]) => {
    if (!guardDeletePermission()) return;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const deletedPayments = db.getAllPembayaran().filter(p => idSet.has(p.id));
    const tunggakanIdsToDelete = ids
      .map(id => `kas-tunggakan-${id}`)
      .filter(kId => db.getAllKas().some(k => k.id === kId));

    const count = db.deletePembayaranBatch(ids);
    cloudSync.batchDeleteFromCloud('pembayaran', ids);
    if (tunggakanIdsToDelete.length > 0) {
      cloudSync.batchDeleteFromCloud('transaksi_kas', tunggakanIdsToDelete);
    }

    // Sinkronkan hanya bulan terbuka yang terdampak
    const unlockedMonths = new Set<string>();
    deletedPayments.forEach(p => {
      if (!db.isMonthLocked(p.opsId, p.tahun, p.bulan)) {
        unlockedMonths.add(`${p.opsId}|${p.tahun}|${p.bulan}`);
      }
    });
    const kasToUpdate: TransaksiKas[] = [];
    const rekapIdsToDelete: string[] = [];
    const allKasAfter = db.getAllKas();
    unlockedMonths.forEach(key => {
      const [oId, yr, mo] = key.split('|');
      const rekapId = `kas-rekap-${oId}-${yr}-${String(mo).padStart(2, '0')}`;
      const found = allKasAfter.find(k => k.id === rekapId);
      if (found) kasToUpdate.push(found);
      else rekapIdsToDelete.push(rekapId);
    });
    if (kasToUpdate.length > 0) cloudSync.batchImportToCloud('transaksi_kas', kasToUpdate);
    if (rekapIdsToDelete.length > 0) cloudSync.batchDeleteFromCloud('transaksi_kas', rekapIdsToDelete);

    recordActivity('Iuran', 'HAPUS', `Menghapus massal ${count} catatan pembayaran iuran`);
    reloadData();
    showToast(`Berhasil menghapus ${count} catatan pembayaran iuran terpilih.`, 'info');
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
    recordActivity(
      'Pelanggan',
      'IMPOR',
      `Mengimpor ${count} data pelanggan (${replace ? 'mode timpa' : 'mode tambah'})`,
      { opsId: targetOpsId || activeOPS.id }
    );
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
    recordActivity(
      'Transaksi Sampah',
      'IMPOR',
      `Mengimpor ${count} catatan ritase pengangkutan (${replace ? 'mode timpa' : 'mode tambah'})`,
      { opsId: targetOpsId || activeOPS.id }
    );
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
    recordActivity(
      'Keuangan',
      'IMPOR',
      `Mengimpor ${count} catatan arus kas keuangan (${replace ? 'mode timpa' : 'mode tambah'})`,
      { opsId: targetOpsId || activeOPS.id }
    );
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
    // Sync rekap bulan terbuka & tunggakan bulan terkunci
    const kasToSync = db.getKasList(targetOpsId).filter(k => {
      if (k.id.startsWith('kas-tunggakan-')) return true;
      if (k.id.startsWith('kas-rekap-')) {
        const parts = k.id.split('-');
        const yr = Number(parts[parts.length - 2]);
        const mo = Number(parts[parts.length - 1]);
        return !db.isMonthLocked(k.opsId, yr, mo);
      }
      return false;
    });
    if (kasToSync.length > 0) {
      cloudSync.batchImportToCloud('transaksi_kas', kasToSync);
    }
    recordActivity(
      'Iuran',
      'IMPOR',
      `Mengimpor ${count} catatan pembayaran iuran (${replace ? 'mode timpa' : 'mode tambah'})`,
      { opsId: targetOpsId || activeOPS.id }
    );
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} catatan pembayaran iuran warga (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  // --- Handlers: OPS ---
  const handleSaveOPS = (ops: OPSProfile) => {
    if (!guardWritePermission() || !currentAdmin) return;
    if (currentAdmin.role !== 'superadmin' && ops.id !== currentAdmin.opsId) {
      showToast('Akses Ditolak: Hanya Super Admin yang berhak membuat atau memodifikasi unit OPS lain.', 'error');
      return;
    }
    const isEdit = opsList.some(o => o.id === ops.id);
    db.saveOPS(ops);
    cloudSync.saveOPSToCloud(ops);
    db.setActiveOPSId(ops.id);
    recordActivity(
      'Profil OPS',
      isEdit ? 'UBAH' : 'TAMBAH',
      `${isEdit ? 'Memperbarui' : 'Menambahkan'} profil unit "${ops.nama}" (${ops.kode})`,
      { opsId: ops.id, targetId: ops.id }
    );
    reloadData();
    showToast(`Profil "${ops.nama}" (${ops.kode}) tersimpan ke Cloud Firestore.`, 'success');
  };

  const handleOpenEditOPS = (ops?: OPSProfile) => {
    if (!guardWritePermission() || !currentAdmin) return;
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
    if (currentAdmin?.role !== 'superadmin') {
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
    const deletedId = opsToDelete.id;
    db.deleteOPS(opsToDelete.id);
    cloudSync.deleteOPSFromCloud(opsToDelete.id);
    setOpsToDelete(null);
    recordActivity('Profil OPS', 'HAPUS', `Menghapus unit "${deletedName}" dari sistem`, {
      opsId: 'all',
      targetId: deletedId,
    });
    reloadData();
    showToast(`Organisasi "${deletedName}" berhasil dihapus dari database.`, 'success');
  };

  // --- Handlers: Komposisi ---
  const handleUpdateKomposisi = (config: KomposisiConfig) => {
    if (!guardWritePermission()) return;
    db.saveKomposisiConfig(activeOPS.id, config);
    cloudSync.saveKomposisiToCloud(activeOPS.id, config);
    setKomposisiConfig(config);
    recordActivity(
      'Komposisi',
      'UBAH',
      `Memperbarui persentase komposisi sampah untuk ${activeOPS.nama}`
    );
    reloadData();
  };

  // --- Handlers: Daur Ulang ---
  const stokDaurUlangMap = useMemo(() => {
    const map: Record<string, number> = {};
    jenisDaurUlangList.forEach(j => {
      map[j.id] = 0;
    });
    transaksiDaurUlangList.forEach(t => {
      if (activeOPS && activeOPS.id !== 'all' && t.opsId !== activeOPS.id) return;
      if (t.tipe === 'masuk') {
        map[t.jenisId] = (map[t.jenisId] || 0) + t.beratKg;
      } else if (t.tipe === 'keluar') {
        map[t.jenisId] = Math.max(0, (map[t.jenisId] || 0) - t.beratKg);
      }
    });
    return map;
  }, [jenisDaurUlangList, transaksiDaurUlangList, activeOPS]);

  const handleSaveTimbangMasuk = (data: {
    tanggal: string;
    jenisId: string;
    beratKg: number;
    sumber: SumberDaurUlangMasuk;
    petugas?: string;
    keterangan?: string;
  }) => {
    if (!guardWritePermission()) return;
    const item = jenisDaurUlangList.find(j => j.id === data.jenisId);
    if (!item) return;

    const trx: TransaksiDaurUlang = {
      id: `trx_du_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      opsId: activeOPS.id === 'all' ? (opsList.find(o => o.id !== 'all')?.id || 'ops_1') : activeOPS.id,
      tanggal: data.tanggal,
      tipe: 'masuk',
      jenisId: data.jenisId,
      namaJenis: item.nama,
      kategori: item.kategori,
      beratKg: data.beratKg,
      sumber: data.sumber,
      petugas: data.petugas,
      keterangan: data.keterangan,
      createdAt: new Date().toISOString(),
    };

    db.saveTransaksiDaurUlang(trx);
    recordActivity(
      'Daur Ulang',
      'TAMBAH',
      `Timbang masuk daur ulang ${item.nama} (${data.beratKg} kg)`,
      { opsId: trx.opsId || activeOPS.id, targetId: trx.id, detail: `Sumber: ${data.sumber}` }
    );
    reloadData();
    showToast(`Timbang masuk ${item.nama} (${data.beratKg} kg) berhasil disimpan.`, 'success');
  };

  const handleSaveJualKeluar = (data: {
    tanggal: string;
    jenisId: string;
    beratKg: number;
    jenisPengeluaran: JenisPengeluaranDaurUlang;
    pembeli?: string;
    hargaPerKg?: number;
    tujuanKas?: TujuanUangDiterima;
    catatKeKas?: boolean;
    keterangan?: string;
  }) => {
    if (!guardWritePermission()) return;
    const item = jenisDaurUlangList.find(j => j.id === data.jenisId);
    if (!item) return;

    const totalNilai = data.jenisPengeluaran === 'Dijual' && data.hargaPerKg
      ? data.beratKg * data.hargaPerKg
      : undefined;

    const trx: TransaksiDaurUlang = {
      id: `trx_du_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      opsId: activeOPS.id === 'all' ? (opsList.find(o => o.id !== 'all')?.id || 'ops_1') : activeOPS.id,
      tanggal: data.tanggal,
      tipe: 'keluar',
      jenisId: data.jenisId,
      namaJenis: item.nama,
      kategori: item.kategori,
      beratKg: data.beratKg,
      jenisPengeluaran: data.jenisPengeluaran,
      pembeli: data.pembeli,
      hargaPerKg: data.hargaPerKg,
      totalNilai,
      tujuanKas: data.tujuanKas,
      catatKeKas: data.catatKeKas,
      keterangan: data.keterangan,
      createdAt: new Date().toISOString(),
    };

    db.saveTransaksiDaurUlang(trx);
    recordActivity(
      'Daur Ulang',
      'TAMBAH',
      `${data.jenisPengeluaran === 'Dijual' ? 'Penjualan' : 'Pengeluaran'} daur ulang ${item.nama} (${data.beratKg} kg)`,
      {
        opsId: trx.opsId || activeOPS.id,
        targetId: trx.id,
        detail: totalNilai ? `Nilai: ${formatRupiah(totalNilai, true)}` : data.jenisPengeluaran,
      }
    );
    reloadData();
    showToast(
      data.jenisPengeluaran === 'Dijual' && totalNilai
        ? `Penjualan ${item.nama} (${data.beratKg} kg, ${formatRupiah(totalNilai)}) berhasil dicatat ke Kas!`
        : `Pengeluaran ${item.nama} (${data.beratKg} kg) berhasil dicatat.`,
      'success'
    );
  };

  const handleSaveJenisHarga = (items: JenisDaurUlangItem[]) => {
    if (!guardWritePermission()) return;
    db.saveJenisDaurUlangList(items);
    recordActivity('Daur Ulang', 'UBAH', `Memperbarui daftar jenis daur ulang & harga acuan (${items.length} jenis)`);
    reloadData();
    showToast('Daftar jenis daur ulang & harga acuan berhasil diperbarui.', 'success');
  };

  const handleImportDaurUlangBatch = (imported: TransaksiDaurUlang[]) => {
    if (!guardWritePermission()) return;
    imported.forEach(trx => {
      db.saveTransaksiDaurUlang(trx);
    });
    recordActivity('Daur Ulang', 'IMPOR', `Mengimpor ${imported.length} transaksi sampah daur ulang`);
    reloadData();
    showToast(`Berhasil mengimpor ${imported.length} data transaksi daur ulang.`, 'success');
  };

  const handleDeleteTransaksiDaurUlang = (id: string) => {
    if (!guardDeletePermission('menghapus transaksi daur ulang')) return;
    db.deleteTransaksiDaurUlang(id);
    recordActivity('Daur Ulang', 'HAPUS', 'Menghapus 1 transaksi sampah daur ulang', { targetId: id });
    reloadData();
    showToast('Transaksi daur ulang berhasil dihapus.', 'info');
  };

  const handleDeleteTransaksiDaurUlangBatch = (ids: string[]) => {
    if (!guardDeletePermission('menghapus massal transaksi daur ulang')) return;
    db.deleteTransaksiDaurUlangBatch(ids);
    recordActivity('Daur Ulang', 'HAPUS', `Menghapus massal ${ids.length} transaksi sampah daur ulang`);
    reloadData();
    showToast(`${ids.length} transaksi daur ulang berhasil dihapus.`, 'info');
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
    recordActivity('Backup & Impor', 'BACKUP', `Mengunduh file backup JSON database (${activeOPS.nama})`);
    reloadData();
    showToast('File backup database JSON berhasil diunduh.', 'success');
  };

  const handleImportBackup = (jsonContent: string) => {
    if (!guardDeletePermission()) return;
    const success = db.importDatabaseJSON(jsonContent);
    if (success) {
      recordActivity('Backup & Impor', 'RESTORE', 'Memulihkan database lokal dari file backup JSON');
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
    recordActivity('Backup & Impor', 'RESET', 'Mereset database lokal ke data awal default');
    reloadData();
    showToast('Database berhasil direset ke data awal spreadsheet.', 'info');
  };

  // --- Handlers: Log Aktivitas ---
  const handleClearActivityLogs = () => {
    if (currentAdmin?.role !== 'superadmin') return;
    const removedIds = db.clearActivityLogs(activeOPS.id);
    if (removedIds.length > 0) {
      cloudSync.batchDeleteFromCloud('log_aktivitas', removedIds);
    }
    reloadData();
    showToast('Riwayat log aktivitas berhasil dibersihkan.', 'info');
  };

  const handleDeleteActivityLogsBatch = (ids: string[]) => {
    if (currentAdmin?.role !== 'superadmin' || ids.length === 0) return;
    const removedIds = db.deleteActivityLogsBatch(ids);
    if (removedIds.length > 0) {
      cloudSync.batchDeleteFromCloud('log_aktivitas', removedIds);
    }
    reloadData();
    showToast(`${removedIds.length} catatan log aktivitas berhasil dihapus.`, 'info');
  };

  // Calculations for sidebar status (strictly synced with activeOPS or consolidated 'all' OPS)
  const kasUpToSelectedYear = kasList.filter(k => (k.tanggal?.slice(0, 4) || '') <= String(selectedYear));
  const currentSaldo = kasUpToSelectedYear.length > 0
    ? kasUpToSelectedYear[kasUpToSelectedYear.length - 1].saldo || 0
    : (kasList.length > 0 ? kasList[kasList.length - 1].saldo || 0 : 0);

  const activePelangganCount = pelangganList.filter(p => p.status === 'Aktif').length;

  const isSuperAdmin = currentAdmin?.role === 'superadmin';
  const canViewCleanUp = currentAdmin?.role === 'superadmin';

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
  const canAccessAllOPS =
    currentAdmin?.role === 'superadmin' ||
    (currentAdmin?.opsId === 'all' && currentAdmin?.role !== 'admin_ops');
  const visibleOPSList = canAccessAllOPS
    ? opsList
    : opsList.filter(o => o.id === currentAdmin?.opsId);

  // Unauthenticated Gateway or Logged-in Website Preview
  if (!sessionUser || !currentAdmin || showPublicWebsite) {
    const isLoggedIn = Boolean(sessionUser && currentAdmin);
    return (
      <>
        {!isLoggedIn && publicViewMode === 'login' ? (
          <LoginScreen
            opsList={opsList}
            onLoginSuccess={handleLoginSuccess}
            onBackToWebsite={() => setPublicViewMode('website')}
          />
        ) : (
          <PublicWebsiteView
            opsList={opsList}
            pelangganList={publicPelangganList}
            pembayaranList={publicPembayaranList}
            pengangkutanList={publicPengangkutanList}
            cleanupList={cleanupList}
            transaksiDaurUlangList={publicDaurUlangList}
            getKomposisiConfig={(opsId) => db.getKomposisiConfig(opsId)}
            cloudStatus={cloudStatus}
            isAdminLoggedIn={isLoggedIn}
            onOpenPortalAdmin={() => {
              if (isLoggedIn) {
                setShowPublicWebsite(false);
              } else {
                setPublicViewMode('login');
              }
            }}
          />
        )}

        {/* Floating Toast Notification */}
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
      </>
    );
  }

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
          onOpenWebsite={() => setShowPublicWebsite(true)}
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
            onOpenWebsite={() => setShowPublicWebsite(true)}
            onLogoutRequest={() => setIsModalLogoutOpen(true)}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        </div>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto print:p-0 print:overflow-visible min-w-0">
          {/* Role Permission Banner for Data Entry */}
          {currentAdmin.role === 'entri_data' && activeTab !== 'akun' && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs no-print bg-violet-50 text-violet-950 border-violet-200">
              <div className="flex items-center gap-2.5">
                <PenLine className="w-4 h-4 text-violet-600 shrink-0" />
                <div>
                  <span className="font-bold">
                    {`Peran Petugas Entri Data (${currentAdmin.nama}): `}
                  </span>
                  <span className="text-violet-800">
                    Anda dapat menambah dan mengedit data operasional (pelanggan, iuran, ritase sampah, kas), namun penghapusan data dikunci.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalLoginAdminOpen(true)}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Ganti Akun</span>
                </button>
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
              isReadOnly={isReadOnly}
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
              opsList={opsList}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              lockedKasMonths={lockedKasMonths}
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
              onDeletePembayaranBatch={handleDeletePembayaranBatch}
              onSyncMonthlyRekap={handleSyncMonthlyRekap}
              onOpenImportExcel={(type) => handleOpenImportExcel(type || 'pelanggan')}
            />
          )}

          {activeTab === 'iuran' && (
            <PelangganView
              mode="iuran"
              activeOPS={activeOPS}
              opsList={opsList}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              lockedKasMonths={lockedKasMonths}
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
              onDeletePembayaranBatch={handleDeletePembayaranBatch}
              onSyncMonthlyRekap={handleSyncMonthlyRekap}
              onOpenImportExcel={(type) => handleOpenImportExcel(type || 'pembayaran')}
            />
          )}

          {activeTab === 'transaksi' && (
            <PengangkutanView
              activeOPS={activeOPS}
              opsList={opsList}
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
              onChangeYear={setSelectedYear}
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

          {activeTab === 'daurulang' && (
            <DaurUlangView
              jenisList={jenisDaurUlangList}
              transaksiList={transaksiDaurUlangList}
              activeOPS={activeOPS}
              selectedYear={selectedYear}
              currentAdmin={currentAdmin}
              onOpenTimbangMasuk={() => {
                if (!guardWritePermission('menimbang masuk sampah daur ulang')) return;
                setIsModalTimbangMasukOpen(true);
              }}
              onOpenJualKeluar={() => {
                if (!guardWritePermission('menjual / mengeluarkan sampah daur ulang')) return;
                setIsModalJualKeluarOpen(true);
              }}
              onOpenJenisHarga={() => {
                if (!guardWritePermission('mengelola jenis daur ulang & harga acuan')) return;
                setIsModalJenisHargaOpen(true);
              }}
              onOpenImportExcel={() => {
                if (!guardWritePermission('mengimpor data sampah daur ulang')) return;
                setIsModalImportDaurUlangOpen(true);
              }}
              onDeleteTransaksi={handleDeleteTransaksiDaurUlang}
              onDeleteTransaksiBatch={handleDeleteTransaksiDaurUlangBatch}
            />
          )}

          {activeTab === 'keuangan' && (
            <KeuanganView
              activeOPS={activeOPS}
              opsList={visibleOPSList}
              kasList={kasList}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              lockedKasMonths={lockedKasMonths}
              selectedYear={selectedYear}
              canUnlockKas={canDeleteRecords}
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
              onLockKasMonth={handleLockKasMonth}
              onLockPastKasMonths={handleLockPastKasMonths}
              onUnlockKasMonth={handleUnlockKasMonth}
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

          {activeTab === 'log' && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'admin_ops') && (
            <LogAktivitasView
              logs={activityLogs}
              activeOPS={activeOPS}
              opsList={visibleOPSList}
              currentAdmin={currentAdmin}
              onClearLogs={handleClearActivityLogs}
              onDeleteLogsBatch={handleDeleteActivityLogsBatch}
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
        lockedKasMonths={lockedKasMonths}
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

      {/* Modals: Sampah Daur Ulang */}
      <ModalTimbangMasuk
        isOpen={isModalTimbangMasukOpen}
        onClose={() => setIsModalTimbangMasukOpen(false)}
        jenisList={jenisDaurUlangList}
        stokMap={stokDaurUlangMap}
        onSave={handleSaveTimbangMasuk}
      />

      <ModalJualKeluar
        isOpen={isModalJualKeluarOpen}
        onClose={() => setIsModalJualKeluarOpen(false)}
        jenisList={jenisDaurUlangList}
        stokMap={stokDaurUlangMap}
        onSave={handleSaveJualKeluar}
      />

      <ModalJenisHarga
        isOpen={isModalJenisHargaOpen}
        onClose={() => setIsModalJenisHargaOpen(false)}
        jenisList={jenisDaurUlangList}
        onSave={handleSaveJenisHarga}
      />

      <ModalImportExcelDaurUlang
        isOpen={isModalImportDaurUlangOpen}
        onClose={() => setIsModalImportDaurUlangOpen(false)}
        activeOPSId={activeOPS.id === 'all' ? (opsList.find(o => o.id !== 'all')?.id || 'ops_1') : activeOPS.id}
        jenisList={jenisDaurUlangList}
        onImportSuccess={handleImportDaurUlangBatch}
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
