import React, { useState, useEffect } from 'react';
import { Pelanggan, KategoriPelanggan, StatusPelanggan, OPSProfile } from '../../types/ops';
import { X, UserPlus, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pelanggan: Pelanggan) => void;
  editingPelanggan: Pelanggan | null;
  activeOPSId: string;
  defaultTarif: number;
  opsList?: OPSProfile[];
}

export const ModalFormPelanggan: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingPelanggan,
  activeOPSId,
  defaultTarif,
  opsList = [],
}) => {
  const [targetOPSId, setTargetOPSId] = useState<string>(
    activeOPSId === 'all' && opsList.length > 0 ? opsList[0].id : activeOPSId
  );

  const selectedOps = opsList.find(o => o.id === targetOPSId);
  const isRhun =
    (selectedOps?.nama || '').toLowerCase().includes('rhun') ||
    (selectedOps?.kode || '').toUpperCase().includes('PR') ||
    (selectedOps?.wilayah || '').toLowerCase().includes('rhun');

  const isOuw =
    (selectedOps?.nama || '').toLowerCase().includes('ouw') ||
    (selectedOps?.kode || '').toUpperCase().includes('OUW') ||
    (selectedOps?.wilayah || '').toLowerCase().includes('ouw');

  const isMahu =
    (selectedOps?.nama || '').toLowerCase().includes('mahu') ||
    (selectedOps?.kode || '').toUpperCase().includes('MH') ||
    (selectedOps?.wilayah || '').toLowerCase().includes('mahu');

  const [formData, setFormData] = useState<Partial<Pelanggan>>({
    nama: '',
    kategori: 'Rumah Tangga',
    rt: '01',
    jumlahAnggotaKeluarga: 4,
    zona: 'Zona 1',
    sektor: 'Sektor 1',
    unit: 'Unit 1',
    tanggalMulai: new Date().toISOString().split('T')[0],
    status: 'Aktif',
    tarifPerBulan: defaultTarif || 20000,
    catatan: '',
  });

  useEffect(() => {
    if (editingPelanggan) {
      setFormData({
        ...editingPelanggan,
        jumlahAnggotaKeluarga: editingPelanggan.jumlahAnggotaKeluarga || 4,
        zona: editingPelanggan.zona || 'Zona 1',
        sektor: editingPelanggan.sektor || 'Sektor 1',
        unit: editingPelanggan.unit || 'Unit 1',
      });
      setTargetOPSId(editingPelanggan.opsId);
    } else {
      setTargetOPSId(activeOPSId === 'all' && opsList.length > 0 ? opsList[0].id : activeOPSId);
      setFormData({
        nama: '',
        kategori: 'Rumah Tangga',
        rt: '01',
        jumlahAnggotaKeluarga: 4,
        zona: 'Zona 1',
        sektor: 'Sektor 1',
        unit: 'Unit 1',
        tanggalMulai: '2026-02-01',
        status: 'Aktif',
        tarifPerBulan: defaultTarif || 20000,
        catatan: '',
      });
    }
  }, [editingPelanggan, isOpen, defaultTarif, activeOPSId, opsList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama?.trim()) return;

    const isNonRT = (formData.kategori as KategoriPelanggan) === 'Non Rumah Tangga';
    const penghuni = isNonRT
      ? undefined
      : (Number(formData.jumlahPenghuniRumah || formData.jumlahAnggotaKeluarga) > 0
          ? Number(formData.jumlahPenghuniRumah || formData.jumlahAnggotaKeluarga)
          : 4);

    const payload: Pelanggan = {
      id: editingPelanggan ? editingPelanggan.id : 'pel-' + Date.now(),
      opsId: editingPelanggan ? editingPelanggan.opsId : (targetOPSId === 'all' ? (opsList[0]?.id || 'ops-tanah-rata') : targetOPSId),
      no: editingPelanggan?.no || 0,
      nama: formData.nama.trim(),
      kategori: isNonRT ? 'Non Rumah Tangga' : 'Rumah Tangga',
      rt: isOuw ? '-' : (formData.rt?.trim() || '01'),
      jumlahPenghuniRumah: penghuni,
      jumlahAnggotaKeluarga: penghuni,
      tanggalMulai: formData.tanggalMulai || '2026-02-01',
      status: (formData.status as StatusPelanggan) || 'Aktif',
      tarifPerBulan: Number(formData.tarifPerBulan) || 20000,
      catatan: formData.catatan || '',
    };

    if (isRhun) {
      payload.zona = formData.zona || 'Zona 1';
    }

    if (isOuw || isMahu) {
      payload.sektor = formData.sektor || 'Sektor 1';
    }

    if (isOuw) {
      payload.unit = formData.unit || 'Unit 1';
    }

    if (formData.status === 'Berhenti') {
      payload.tanggalBerhenti = formData.tanggalBerhenti || new Date().toISOString().substring(0, 10);
    }

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 shrink-0" />
            <h3 className="font-semibold text-xs sm:text-base truncate">
              {editingPelanggan ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition-colors p-1 rounded-md cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {opsList.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Pilih Organisasi (OPS) *
              </label>
              <select
                value={targetOPSId}
                onChange={e => setTargetOPSId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-emerald-300 bg-emerald-50/40 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-950"
              >
                {opsList.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nama} ({o.kode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 1: Nama & Jumlah Penghuni Rumah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Pelanggan / Kepala Rumah Tangga *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Acan La Hamuna"
                value={formData.nama || ''}
                onChange={e => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1" title="Jumlah penghuni dalam satu rumah/tempat tinggal (jiwa)">
                Penghuni Rumah (Jiwa) {formData.kategori === 'Non Rumah Tangga' ? '' : '*'}
              </label>
              <input
                type="number"
                disabled={formData.kategori === 'Non Rumah Tangga'}
                required={formData.kategori !== 'Non Rumah Tangga'}
                min="1"
                max="50"
                placeholder={formData.kategori === 'Non Rumah Tangga' ? '-' : '4'}
                value={formData.kategori === 'Non Rumah Tangga' ? '' : (formData.jumlahPenghuniRumah ?? formData.jumlahAnggotaKeluarga ?? 4)}
                onChange={e => {
                  const val = Number(e.target.value);
                  setFormData({
                    ...formData,
                    jumlahPenghuniRumah: val,
                    jumlahAnggotaKeluarga: val,
                  });
                }}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-center ${
                  formData.kategori === 'Non Rumah Tangga'
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'border-slate-300 bg-white'
                }`}
              />
              {formData.kategori === 'Non Rumah Tangga' ? (
                <p className="text-[10px] text-amber-700 mt-1 font-sans font-medium">
                  *Non Rumah Tangga tidak hitung jiwa
                </p>
              ) : null}
            </div>
          </div>

          {/* Row 2: Kategori (Hanya 2: Rumah Tangga & Non Rumah Tangga) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Kategori Pelanggan *
            </label>
            <select
              value={formData.kategori === 'Non Rumah Tangga' ? 'Non Rumah Tangga' : 'Rumah Tangga'}
              onChange={e => {
                const newKat = e.target.value as KategoriPelanggan;
                setFormData({
                  ...formData,
                  kategori: newKat,
                  jumlahPenghuniRumah: newKat === 'Non Rumah Tangga' ? undefined : (formData.jumlahPenghuniRumah || 4),
                  jumlahAnggotaKeluarga: newKat === 'Non Rumah Tangga' ? undefined : (formData.jumlahAnggotaKeluarga || 4),
                });
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
            >
              <option value="Rumah Tangga">Rumah Tangga</option>
              <option value="Non Rumah Tangga">Non Rumah Tangga</option>
            </select>
            <p className="text-2xs text-slate-400 mt-1">
              Pilihan kategori: Rumah Tangga (berpenghuni jiwa) atau Non Rumah Tangga (kios, warung, kantor - tidak menghitung jiwa).
            </p>
          </div>

          {/* KHUSUS OPS PULAU RHUN: Pilihan Zona dan RT */}
          {isRhun && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase">
                  Konfigurasi Wilayah OPS Pulau Rhun
                </span>
                <span className="text-2xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Pulau Rhun
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Pilihan Zona *
                  </label>
                  <select
                    value={formData.zona || 'Zona 1'}
                    onChange={e => setFormData({ ...formData, zona: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-emerald-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  >
                    <option value="Zona 1">Zona 1</option>
                    <option value="Zona 2">Zona 2</option>
                    <option value="Zona 3">Zona 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Rukun Tetangga (RT) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 01"
                    value={formData.rt || ''}
                    onChange={e => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-emerald-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* KHUSUS OPS OUW: Sektor dan Unit (Negeri Ouw tidak memiliki RT) */}
          {isOuw && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-950 uppercase">
                  Konfigurasi Wilayah OPS Ouw (Sektor &amp; Unit)
                </span>
                <span className="text-2xs bg-cyan-200 text-cyan-900 font-bold px-2 py-0.5 rounded-full">
                  Negeri Ouw (Tanpa RT)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-900 mb-1">
                    Sektor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sektor 1"
                    value={formData.sektor || 'Sektor 1'}
                    onChange={e => setFormData({ ...formData, sektor: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-cyan-300 bg-white rounded-lg focus:ring-2 focus:ring-cyan-500 font-semibold text-cyan-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cyan-900 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Unit 1"
                    value={formData.unit || 'Unit 1'}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-cyan-300 bg-white rounded-lg focus:ring-2 focus:ring-cyan-500 font-semibold text-cyan-950"
                  />
                </div>
              </div>
            </div>
          )}

          {/* KHUSUS OPS MAHU: Sektor dan RT */}
          {isMahu && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 uppercase">
                  Konfigurasi Wilayah OPS Mahu (Sektor &amp; RT)
                </span>
                <span className="text-2xs bg-teal-200 text-teal-900 font-bold px-2 py-0.5 rounded-full">
                  Negeri Mahu
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">
                    Sektor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sektor 1"
                    value={formData.sektor || 'Sektor 1'}
                    onChange={e => setFormData({ ...formData, sektor: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-teal-300 bg-white rounded-lg focus:ring-2 focus:ring-teal-500 font-semibold text-teal-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">
                    Rukun Tetangga (RT) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 01"
                    value={formData.rt || '01'}
                    onChange={e => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-teal-300 bg-white rounded-lg focus:ring-2 focus:ring-teal-500 font-mono font-bold text-teal-950"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Regular OPS RT input (if neither Rhun, Ouw, nor Mahu) */}
          {!isRhun && !isOuw && !isMahu && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Rukun Tetangga (RT) *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 01"
                value={formData.rt || ''}
                onChange={e => setFormData({ ...formData, rt: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tarif Iuran (Rp / Bulan) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={formData.tarifPerBulan ?? 20000}
                  onChange={e => setFormData({ ...formData, tarifPerBulan: Number(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono tabular-nums font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status Layanan *
              </label>
              <select
                value={formData.status || 'Aktif'}
                onChange={e => setFormData({ ...formData, status: e.target.value as StatusPelanggan })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
              >
                <option value="Aktif">Aktif</option>
                <option value="Berhenti">Berhenti</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Mulai Layanan *
              </label>
              <input
                type="date"
                required
                value={formData.tanggalMulai || ''}
                onChange={e => setFormData({ ...formData, tanggalMulai: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {formData.status === 'Berhenti' && (
              <div>
                <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">
                  Tanggal Berhenti Layanan *
                </label>
                <input
                  type="date"
                  required={formData.status === 'Berhenti'}
                  value={formData.tanggalBerhenti || ''}
                  onChange={e => setFormData({ ...formData, tanggalBerhenti: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-rose-300 bg-rose-50/50 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Titik jemput depan pagar hijau"
              value={formData.catatan || ''}
              onChange={e => setFormData({ ...formData, catatan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
