/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  OPSProfile,
  Pelanggan,
  TransaksiPengangkutan,
  TransaksiKas,
  PembayaranIuran,
  KomposisiConfig,
  SumberSampah,
} from './types/ops';
import { db } from './services/db';
import { DesktopHeader } from './components/DesktopHeader';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PelangganView } from './components/PelangganView';
import { PengangkutanView } from './components/PengangkutanView';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

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

    const currentOPS = db.getActiveOPS();
    setActiveOPS(currentOPS);

    const pelList = db.getPelangganList(currentOPS.id);
    setPelangganList(pelList);

    const byrList = db.getPembayaranList(currentOPS.id, selectedYear);
    setPembayaranList(byrList);

    const angkutList = db.getPengangkutanList(currentOPS.id);
    setPengangkutanList(angkutList);

    const kList = db.getKasList(currentOPS.id);
    setKasList(kList);

    const comp = db.getKomposisiConfig(currentOPS.id);
    setKomposisiConfig(comp);
  }, [selectedYear]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // OPS Switcher
  const handleSelectOPS = (opsId: string) => {
    db.setActiveOPSId(opsId);
    reloadData();
  };

  // --- Handlers: Pelanggan ---
  const handleSavePelanggan = (pelanggan: Pelanggan) => {
    db.savePelanggan(pelanggan);
    reloadData();
  };

  const handleDeletePelanggan = (id: string) => {
    db.deletePelanggan(id);
    reloadData();
  };

  // --- Handlers: Pengangkutan ---
  const handleSavePengangkutan = (data: TransaksiPengangkutan) => {
    db.savePengangkutan(data);
    reloadData();
  };

  const handleDeletePengangkutan = (id: string) => {
    db.deletePengangkutan(id);
    reloadData();
  };

  // --- Handlers: Kas ---
  const handleSaveKas = (data: TransaksiKas) => {
    db.saveKas(data);
    reloadData();
  };

  const handleDeleteKas = (id: string) => {
    db.deleteKas(id);
    reloadData();
  };

  // --- Handlers: Iuran ---
  const handleSaveIuran = (
    bayar: PembayaranIuran,
    syncToKas: boolean,
    pelangganNama?: string
  ) => {
    db.savePembayaran(bayar, syncToKas, pelangganNama);
    reloadData();
    showToast(
      `Setoran iuran ${pelangganNama || 'warga'} tersimpan & otomatis direkap ke tanggal akhir bulan.`,
      'success'
    );
  };

  const handleSyncMonthlyRekap = () => {
    const count = db.consolidateAllIuranRekap(activeOPS.id);
    reloadData();
    showToast(
      `Penerimaan iuran berhasil dikonsolidasi menjadi 1 baris per bulan pada tanggal akhir bulan (${count} bulan).`,
      'success'
    );
  };

  const handleOpenAddIuranForCell = (pelanggan: Pelanggan, bulan: number) => {
    setSelectedIuranPelanggan(pelanggan);
    setIuranBulan(bulan);
    setIsModalIuranOpen(true);
  };

  // --- Excel Import Handlers ---
  const handleOpenImportExcel = (type: ImportDataType) => {
    setImportExcelType(type);
    setIsModalImportExcelOpen(true);
  };

  const handleImportPelangganBatch = (items: Pelanggan[], replace: boolean, targetOpsId: string) => {
    const count = db.importPelangganBatch(items, replace, targetOpsId);
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} data pelanggan warga (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  const handleImportPengangkutanBatch = (
    items: TransaksiPengangkutan[],
    replace: boolean,
    targetOpsId: string
  ) => {
    const count = db.importPengangkutanBatch(items, replace, targetOpsId);
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} ritase pengangkutan sampah (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  const handleImportKasBatch = (items: TransaksiKas[], replace: boolean, targetOpsId: string) => {
    const count = db.importKasBatch(items, replace, targetOpsId);
    reloadData();
    setIsModalImportExcelOpen(false);
    showToast(
      `Berhasil mengimpor ${count} catatan arus kas keuangan (${replace ? 'mode timpa' : 'mode tambah'}).`,
      'success'
    );
  };

  // --- Handlers: OPS ---
  const handleSaveOPS = (ops: OPSProfile) => {
    db.saveOPS(ops);
    db.setActiveOPSId(ops.id);
    reloadData();
    showToast(`Profil "${ops.nama}" (${ops.kode}) berhasil disimpan.`, 'success');
  };

  const handleOpenEditOPS = (ops?: OPSProfile) => {
    setIsModalKelolaOPSOpen(false);
    const target = ops || activeOPS;
    const toEdit = target.id === 'all' ? (opsList.find(o => o.id !== 'all') || opsList[0]) : target;
    setEditingOPS(toEdit);
    setIsModalOPSOpen(true);
  };

  const handleRequestDeleteOPS = (ops: OPSProfile) => {
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
    setOpsToDelete(null);
    reloadData();
    showToast(`Organisasi "${deletedName}" berhasil dihapus dari database.`, 'success');
  };

  // --- Handlers: Komposisi ---
  const handleUpdateKomposisi = (config: KomposisiConfig) => {
    db.saveKomposisiConfig(activeOPS.id, config);
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
  const currentSaldo = kasList.length > 0 ? kasList[kasList.length - 1].saldo || 0 : 0;
  const activePelangganCount = pelangganList.filter(p => p.status === 'Aktif').length;
  const totalSampahBulanIniKg = pengangkutanList
    .filter(p => p.tanggal.startsWith(`${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`))
    .reduce((sum, item) => sum + (item.beratOrganikKg || 0) + (item.beratAnorganikKg || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Desktop Window Header */}
      <div className="no-print">
        <DesktopHeader
          activeOPS={activeOPS}
          opsList={opsList}
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
        />
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (hidden on print) */}
        <div className="no-print flex">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            activePelangganCount={activePelangganCount}
            saldoKas={currentSaldo}
            totalSampahBulanIniKg={totalSampahBulanIniKg || 3044.3}
          />
        </div>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto print:p-0 print:overflow-visible">
          {activeTab === 'dashboard' && (
            <DashboardView
              activeOPS={activeOPS}
              opsList={opsList}
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
              onOpenAddIuranForCell={handleOpenAddIuranForCell}
              onOpenImportExcel={() => handleOpenImportExcel('pelanggan')}
            />
          )}

          {activeTab === 'transaksi' && (
            <PengangkutanView
              activeOPS={activeOPS}
              pengangkutanList={pengangkutanList}
              selectedYear={selectedYear}
              onOpenAddPengangkutan={(sumber) => {
                setEditingPengangkutan(null);
                setModalPengangkutanInitialSumber(sumber || 'Pemukiman');
                setIsModalPengangkutanOpen(true);
              }}
              onOpenEditPengangkutan={item => {
                setEditingPengangkutan(item);
                setModalPengangkutanInitialSumber(item.sumberSampah || 'Pemukiman');
                setIsModalPengangkutanOpen(true);
              }}
              onDeletePengangkutan={handleDeletePengangkutan}
              onOpenImportExcel={() => handleOpenImportExcel('transaksi')}
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

      {/* Global Modals */}
      <ModalFormPelanggan
        isOpen={isModalPelangganOpen}
        onClose={() => setIsModalPelangganOpen(false)}
        onSave={handleSavePelanggan}
        editingPelanggan={editingPelanggan}
        activeOPSId={activeOPS.id}
        defaultTarif={activeOPS.tarifDefault || 20000}
        opsList={opsList}
      />

      <ModalFormPengangkutan
        isOpen={isModalPengangkutanOpen}
        onClose={() => setIsModalPengangkutanOpen(false)}
        onSave={handleSavePengangkutan}
        editingItem={editingPengangkutan}
        activeOPS={activeOPS}
        opsList={opsList}
        initialSumber={modalPengangkutanInitialSumber}
      />

      <ModalFormKas
        isOpen={isModalKasOpen}
        onClose={() => setIsModalKasOpen(false)}
        onSave={handleSaveKas}
        editingItem={editingKas}
        activeOPS={activeOPS}
        opsList={opsList}
      />

      <ModalFormIuran
        isOpen={isModalIuranOpen}
        onClose={() => setIsModalIuranOpen(false)}
        onSave={handleSaveIuran}
        selectedPelanggan={selectedIuranPelanggan}
        pelangganList={pelangganList}
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
        opsList={opsList}
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
        opsList={opsList}
        onImportPelanggan={handleImportPelangganBatch}
        onImportPengangkutan={handleImportPengangkutanBatch}
        onImportKas={handleImportKasBatch}
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
