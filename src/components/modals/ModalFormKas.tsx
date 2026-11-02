import React, { useState, useEffect } from 'react';
import { TransaksiKas, KategoriKas, JenisKas, OPSProfile } from '../../types/ops';
import { X, Receipt, Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransaksiKas) => void;
  editingItem: TransaksiKas | null;
  activeOPS: OPSProfile;
  opsList?: OPSProfile[];
}

export const ModalFormKas: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  activeOPS,
  opsList = [],
}) => {
  const [selectedOPSId, setSelectedOPSId] = useState<string>(
    activeOPS.id === 'all' && opsList.length > 0 ? opsList[0].id : activeOPS.id
  );
  const [tipe, setTipe] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [noBukti, setNoBukti] = useState<string>('');
  const [kategori, setKategori] = useState<KategoriKas>('Iuran Warga');
  const [uraian, setUraian] = useState<string>('');
  const [jenisKas, setJenisKas] = useState<JenisKas>('tunai');
  const [nominal, setNominal] = useState<number>(0);

  useEffect(() => {
    if (editingItem) {
      setSelectedOPSId(editingItem.opsId);
      setTanggal(editingItem.tanggal);
      setNoBukti(editingItem.noBukti);
      setKategori(editingItem.kategori);
      setUraian(editingItem.uraian);
      setJenisKas(editingItem.jenisKas);
      if (editingItem.pemasukan > 0) {
        setTipe('pemasukan');
        setNominal(editingItem.pemasukan);
      } else {
        setTipe('pengeluaran');
        setNominal(editingItem.pengeluaran);
      }
    } else {
      setSelectedOPSId(activeOPS.id === 'all' && opsList.length > 0 ? opsList[0].id : activeOPS.id);
      setTanggal(new Date().toISOString().split('T')[0]);
      setNoBukti('');
      setKategori('Iuran Warga');
      setUraian('');
      setJenisKas('tunai');
      setNominal(0);
      setTipe('pemasukan');
    }
  }, [editingItem, isOpen, activeOPS.id, opsList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) return;

    const payload: TransaksiKas = {
      id: editingItem ? editingItem.id : 'kas-' + Date.now(),
      opsId: editingItem ? editingItem.opsId : (selectedOPSId === 'all' ? (opsList[0]?.id || 'ops-tanah-rata') : selectedOPSId),
      tanggal,
      noBukti: noBukti || '-',
      kategori,
      uraian: uraian.trim(),
      jenisKas,
      pemasukan: tipe === 'pemasukan' ? nominal : 0,
      pengeluaran: tipe === 'pengeluaran' ? nominal : 0,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-300" />
            <h3 className="font-semibold text-base">
              {editingItem ? 'Edit Transaksi Kas' : 'Catat Arus Kas Baru'}
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
                value={selectedOPSId}
                onChange={e => setSelectedOPSId(e.target.value)}
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

          {/* Transaction Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Jenis Arus Kas *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setTipe('pemasukan');
                  setKategori('Iuran Warga');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                  tipe === 'pemasukan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Pemasukan (Masuk)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipe('pengeluaran');
                  setKategori('Gaji Petugas OPS');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                  tipe === 'pengeluaran'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Pengeluaran (Keluar)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                No. Bukti / Kuitansi
              </label>
              <input
                type="text"
                placeholder="Contoh: 1 / BKT-01"
                value={noBukti}
                onChange={e => setNoBukti(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kategori Akun ({tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}) *
              </label>
              <select
                value={kategori}
                onChange={e => setKategori(e.target.value as KategoriKas)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {tipe === 'pemasukan' ? (
                  <>
                    <option value="Iuran Warga">Iuran Warga</option>
                    <option value="Penjualan Produk">Penjualan Produk</option>
                    <option value="Hibah">Hibah</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </>
                ) : (
                  <>
                    <option value="Gaji Petugas OPS">Gaji Petugas OPS</option>
                    <option value="BBM & Transport">BBM &amp; Transport</option>
                    <option value="Air dan Listrik">Air dan Listrik</option>
                    <option value="Perawatan Alat">Perawatan Alat</option>
                    <option value="ATK & Operasional Kantor">ATK &amp; Operasional Kantor</option>
                    <option value="Lain-lain">Lain-lain</option>
                    <option value="Pembelian Peralatan">Pembelian Peralatan</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Jenis Kas *
              </label>
              <select
                value={jenisKas}
                onChange={e => setJenisKas(e.target.value as JenisKas)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white capitalize"
              >
                <option value="tunai">Tunai (Cash)</option>
                <option value="bank">Bank / Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nominal Transaksi (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={nominal || ''}
                onChange={e => setNominal(Number(e.target.value))}
                placeholder="100000"
                className={`w-full pl-9 pr-3 py-2 text-base font-bold rounded-lg border focus:ring-2 font-mono tabular-nums ${
                  tipe === 'pemasukan'
                    ? 'border-emerald-300 text-emerald-700 focus:ring-emerald-500'
                    : 'border-rose-300 text-rose-700 focus:ring-rose-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Uraian / Deskripsi *
            </label>
            <textarea
              required
              rows={2}
              value={uraian}
              onChange={e => setUraian(e.target.value)}
              placeholder={
                tipe === 'pemasukan'
                  ? 'Contoh: 99 Rumah atau Penjualan Sampah Plastik PET'
                  : 'Contoh: Bensin 8 Liter atau Gaji Petugas (KP)'
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 ${
                tipe === 'pemasukan'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Check className="w-4 h-4" />
              Simpan {tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
