/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Truck,
  Wallet,
  Menu,
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

export default function App() {
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

  // Reload all data from local database
  const reloadData = useCallback(() => {
    const allOps = db.getOPSList();
    setOpsList(allOps);

    const admin = db.getCurrentAdmin();
    setCurrentAdmin(admin);

    // Enforce active OPS matching admin_ops restriction
    if (admin.role !== 'superadmin' && admin.opsId) {
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

    const angkutList = db.getPengangkutanList(currentOPS.id);
    setPengangkutanList(angkutList);

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
    setCurrentAdmin(admin);
    if (admin.role !== 'superadmin' && admin.opsId) {
      db.setActiveOPSId(admin.opsId);
    }
    reloadData();
    showToast(
      `Beralih ke akun "${admin.nama}" (${
        admin.role === 'superadmin'
          ? 'Super Admin - Semua Akses OPS'
          : `Admin Khusus ${admin.opsNama || 'OPS'}`
      })`,
      'success'
    );
  };

  const handleSaveAdmin = (account: AdminAccount) => {
    db.saveAdminAccount(account);
    cloudSync.saveAdminToCloud(account);
    reloadData();
    showToast(`Akun admin "${account.nama}" berhasil disimpan`, 'success');
  };

  const handleDeleteAdmin = (id: string) => {
    const ok = db.deleteAdminAccount(id);
    if (ok) {
      cloudSync.deleteAdminFromCloud(id);
      reloadData();
      showToast('Akun admin berhasil dihapus', 'info');
    } else {
      showToast('Tidak dapat menghapus akun superadmin utama terakhir', 'error');
    }
  };

  // OPS Switcher
  const handleSelectOPS = (opsId: string) => {
    if (currentAdmin.role !== 'superadmin' && opsId !== currentAdmin.opsId) {
      showToast(
        `Akses Ditolak: Akun "${currentAdmin.nama}" dibatasi khusus untuk wilayah ${currentAdmin.opsNama || 'unit OPS terkait'}. Silakan login sebagai Super Admin untuk melihat unit lain.`,
        'error'
      );
      return;
    }
    db.setActiveOPSId(opsId);
    reloadData();
  };

  // --- Handlers: Pelanggan ---
  const handleSavePelanggan = (pelanggan: Pelanggan) => {
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
    db.deletePelanggan(id);
    cloudSync.deletePelangganFromCloud(id);
    reloadData();
  };

  const handleDeletePelangganBatch = (ids: string[]) => {
    if (ids.length === 0) return;
    db.deletePelangganBatch(ids);
    cloudSync.batchDeleteFromCloud('pelanggan', ids);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} data pelanggan terpilih.`, 'info');
  };

  // --- Handlers: Pengangkutan ---
  const handleSavePengangkutan = (data: TransaksiPengangkutan) => {
    db.savePengangkutan(data);
    cloudSync.savePengangkutanToCloud(data);
    reloadData();
  };

  const handleDeletePengangkutan = (id: string) => {
    db.deletePengangkutan(id);
    cloudSync.deletePengangkutanFromCloud(id);
    reloadData();
  };

  const handleDeletePengangkutanBatch = (ids: string[]) => {
    if (ids.length === 0) return;
    db.deletePengangkutanBatch(ids);
    cloudSync.batchDeleteFromCloud('pengangkutan', ids);
    reloadData();
    showToast(`Berhasil menghapus ${ids.length} catatan ritase/kegiatan terpilih.`, 'info');
  };

  // --- Handlers: Kas ---
  const handleSaveKas = (data: TransaksiKas) => {
    db.saveKas(data);
    cloudSync.saveKasToCloud(data);
    reloadData();
  };

  const handleDeleteKas = (id: string) => {
    db.deleteKas(id);
    cloudSync.deleteKasFromCloud(id);
    reloadData();
  };

  const handleDeleteKasBatch = (ids: string[]) => {
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
    db.savePembayaran(bayar, syncToKas, pelangganNama);
    cloudSync.savePembayaranToCloud(bayar);
    reloadData();
    showToast(
      `Setoran iuran ${pelangganNama || 'warga'} tersimpan ke Cloud Firestore & direkap ke akhir bulan.`,
      'success'
    );
  };

  const handleSyncMonthlyRekap = () => {
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
    setSelectedIuranPelanggan(pelanggan);
    setIuranBulan(bulan);
    setIsModalIuranOpen(true);
  };

  const handleDeleteIuran = (id: string, pelangganNama?: string) => {
    db.deletePembayaran(id);
    cloudSync.deletePembayaranFromCloud(id);
    reloadData();
    showToast(
      `Pembayaran iuran ${pelangganNama || 'warga'} berhasil dihapus & rekapitulasi arus kas otomatis diperbarui.`,
      'info'
    );
  };

  // --- Excel Import Handlers ---
  const handleOpenImportExcel = (type: ImportDataType) => {
    setImportExcelType(type);
    setIsModalImportExcelOpen(true);
  };

  const handleImportPelangganBatch = (items: Pelanggan[], replace: boolean, targetOpsId: string) => {
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
    const success = db.importDatabaseJSON(jsonContent);
    if (success) {
      reloadData();
      showToast('Database lokal berhasil dipulihkan dari file backup!', 'success');
    } else {
      showToast('Gagal memulihkan database. Format file backup JSON tidak valid.', 'error');
    }
  };

  const handleResetDatabase = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    db.resetToDefaults();
    setIsResetConfirmOpen(false);
    reloadData();
    showToast('Database berhasil direset ke data awal spreadsheet.', 'info');
  };

  // Calculations for sidebar status
  const kasUpToSelectedYear = kasList.filter(k => (k.tanggal?.slice(0, 4) || '') <= String(selectedYear));
  const currentSaldo = kasUpToSelectedYear.length > 0
    ? kasUpToSelectedYear[kasUpToSelectedYear.length - 1].saldo || 0
    : (kasList.length > 0 ? kasList[kasList.length - 1].saldo || 0 : 0);

  const activePelangganCount = pelangganList.filter(p => {
    const startYear = parseInt(p.tanggalMulai?.slice(0, 4) || '2026', 10);
    if (startYear > selectedYear) return false;
    if (p.status === 'Berhenti' && p.tanggalBerhenti) {
      const stopYear = parseInt(p.tanggalBerhenti.slice(0, 4), 10);
      if (stopYear < selectedYear) return false;
    }
    return true;
  }).length;

  const totalSampahBulanIniKg = pengangkutanList
    .filter(p => p.tanggal.startsWith(`${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`))
    .reduce((sum, item) => sum + (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0), 0);

  // Role-based visible OPS list (superadmin sees all, admin_ops strictly sees only their own OPS)
  const isSuperAdmin = currentAdmin.role === 'superadmin';
  const visibleOPSList = isSuperAdmin ? opsList : opsList.filter(o => o.id === currentAdmin.opsId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Desktop Window Header */}
      <div className="no-print">
        <DesktopHeader
          activeOPS={activeOPS}
          opsList={visibleOPSList}
          currentAdmin={currentAdmin}
          onOpenLoginAdmin={() => setIsModalLoginAdminOpen(true)}
          onOpenKelolaAdmin={() => setIsModalKelolaAdminOpen(true)}
          onSelectOPS={handleSelectOPS}
          onOpenAddOPS={() => {
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
        />
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (hidden on print) */}
        <div className="no-print flex shrink-0">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            activePelangganCount={activePelangganCount}
            saldoKas={currentSaldo}
            totalSampahBulanIniKg={totalSampahBulanIniKg || 3044.3}
            currentAdmin={currentAdmin}
            onOpenLoginAdmin={() => setIsModalLoginAdminOpen(true)}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        </div>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto print:p-0 print:overflow-visible min-w-0">
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
              kasList={kasList}
              pembayaranList={pembayaranList}
              komposisiConfig={komposisiConfig}
              selectedYear={selectedYear}
              onOpenAddPelanggan={() => {
                setEditingPelanggan(null);
                setIsModalPelangganOpen(true);
              }}
              onOpenAddPengangkutan={() => {
                setEditingPengangkutan(null);
                setIsModalPengangkutanOpen(true);
              }}
              onOpenAddKas={() => {
                setEditingKas(null);
                setIsModalKasOpen(true);
              }}
              onOpenAddIuran={() => {
                setSelectedIuranPelanggan(pelangganList[0] || null);
                setIsModalIuranOpen(true);
              }}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'pelanggan' && (
            <PelangganView
              activeOPS={activeOPS}
              pelangganList={pelangganList}
              pembayaranList={pembayaranList}
              selectedYear={selectedYear}
              onOpenAddPelanggan={() => {
                setEditingPelanggan(null);
                setIsModalPelangganOpen(true);
              }}
              onOpenEditPelanggan={pelanggan => {
                setEditingPelanggan(pelanggan);
                setIsModalPelangganOpen(true);
              }}
              onDeletePelanggan={handleDeletePelanggan}
              onDeletePelangganBatch={handleDeletePelangganBatch}
              onTogglePelangganStatus={handleTogglePelangganStatus}
              onUpdatePelangganStatusBatch={handleUpdatePelangganStatusBatch}
              onOpenAddIuranForCell={handleOpenAddIuranForCell}
              onOpenImportExcel={(type) => handleOpenImportExcel(type || 'pelanggan')}
            />
          )}

          {activeTab === 'transaksi' && (
            <PengangkutanView
              activeOPS={activeOPS}
              pengangkutanList={pengangkutanList}
              selectedYear={selectedYear}
              onOpenAddPengangkutan={() => {
                setEditingPengangkutan(null);
                setModalPengangkutanInitialSumber('Pemukiman');
                setIsModalPengangkutanOpen(true);
              }}
              onOpenEditPengangkutan={item => {
                setEditingPengangkutan(item);
                setModalPengangkutanInitialSumber(item.sumberSampah || 'Pemukiman');
                setIsModalPengangkutanOpen(true);
              }}
              onDeletePengangkutan={handleDeletePengangkutan}
              onDeletePengangkutanBatch={handleDeletePengangkutanBatch}
              onOpenImportExcel={() => handleOpenImportExcel('transaksi')}
            />
          )}

          {activeTab === 'cleanup' && (
            <CleanUpPantaiView
              cleanupList={pengangkutanList.filter(p => p.sumberSampah === 'Clean-up Pantai')}
              selectedYear={selectedYear}
              onOpenAddCleanUp={() => {
                setEditingPengangkutan(null);
                setModalPengangkutanInitialSumber('Clean-up Pantai');
                setIsModalPengangkutanOpen(true);
              }}
              onOpenEditCleanUp={item => {
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
                setEditingKas(null);
                setIsModalKasOpen(true);
              }}
              onOpenEditKas={item => {
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
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'pelanggan'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'pelanggan' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Warga</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transaksi')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
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
          onClick={() => setActiveTab('keuangan')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'keuangan'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className={`w-5 h-5 mb-0.5 ${activeTab === 'keuangan' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Kas</span>
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
