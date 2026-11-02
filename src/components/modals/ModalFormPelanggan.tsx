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
  const [formData, setFormData] = useState<Partial<Pelanggan>>({
    nama: '',
    kategori: 'Rumah Tangga',
    rt: '01',
    tanggalMulai: new Date().toISOString().split('T')[0],
    status: 'Aktif',
    tarifPerBulan: defaultTarif || 20000,
    catatan: '',
  });

  useEffect(() => {
    if (editingPelanggan) {
      setFormData(editingPelanggan);
      setTargetOPSId(editingPelanggan.opsId);
    } else {
      setTargetOPSId(activeOPSId === 'all' && opsList.length > 0 ? opsList[0].id : activeOPSId);
      setFormData({
        nama: '',
        kategori: 'Rumah Tangga',
        rt: '01',
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

    const payload: Pelanggan = {
      id: editingPelanggan ? editingPelanggan.id : 'pel-' + Date.now(),
      opsId: editingPelanggan ? editingPelanggan.opsId : (targetOPSId === 'all' ? (opsList[0]?.id || 'ops-tanah-rata') : targetOPSId),
      no: editingPelanggan?.no || 0,
      nama: formData.nama.trim(),
      kategori: (formData.kategori as KategoriPelanggan) || 'Rumah Tangga',
      rt: formData.rt?.trim() || '01',
      tanggalMulai: formData.tanggalMulai || '2026-02-01',
      status: (formData.status as StatusPelanggan) || 'Aktif',
      tanggalBerhenti: formData.status === 'Berhenti' ? formData.tanggalBerhenti : undefined,
      tarifPerBulan: Number(formData.tarifPerBulan) || 20000,
      catatan: formData.catatan || '',
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-300" />
            <h3 className="font-semibold text-base">
              {editingPelanggan ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Pelanggan / Kepala Keluarga *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Acan La Hamuna"
              value={formData.nama || ''}
              onChange={e => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kategori *
              </label>
              <select
                value={formData.kategori || 'Rumah Tangga'}
                onChange={e => setFormData({ ...formData, kategori: e.target.value as KategoriPelanggan })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Rumah Tangga">Rumah Tangga</option>
                <option value="Usaha / Toko">Usaha / Toko</option>
                <option value="Warung / Rumah Makan">Warung / Rumah Makan</option>
                <option value="Kantor / Faskes">Kantor / Faskes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{isRhun ? 'Wilayah / Zona *' : 'Rukun Tetangga (RT) *'}</span>
                {isRhun && <span className="text-2xs text-emerald-700 font-bold">OPS Pulau Rhun</span>}
              </label>
              <input
                type="text"
                required
                placeholder={isRhun ? "Contoh: Zona 1" : "Contoh: 01"}
                value={formData.rt || ''}
                onChange={e => setFormData({ ...formData, rt: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              {isRhun && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-2xs text-slate-500">Pilih cepat:</span>
                  {['Zona 1', 'Zona 2', 'Zona 3'].map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setFormData({ ...formData, rt: z })}
                      className={`text-2xs px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                        formData.rt === z
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono tabular-nums"
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
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
