import React, { useState } from 'react';
import { X } from 'lucide-react';
import { JenisDaurUlangItem, SumberDaurUlangMasuk } from '../../types/ops';
import { formatNumberID } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jenisList: JenisDaurUlangItem[];
  stokMap: Record<string, number>;
  onSave: (data: {
    tanggal: string;
    jenisId: string;
    beratKg: number;
    sumber: SumberDaurUlangMasuk;
    petugas?: string;
    keterangan?: string;
  }) => void;
}

export const ModalTimbangMasuk: React.FC<Props> = ({
  isOpen,
  onClose,
  jenisList,
  stokMap,
  onSave,
}) => {
  const activeJenis = jenisList.filter(j => j.aktif);
  const today = new Date().toISOString().split('T')[0];

  const [tanggal, setTanggal] = useState(today);
  const [jenisId, setJenisId] = useState(activeJenis[0]?.id || '');
  const [beratKg, setBeratKg] = useState<string>('');
  const [sumber, setSumber] = useState<SumberDaurUlangMasuk>('Petugas angkut');
  const [petugas, setPetugas] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const berat = parseFloat(beratKg.replace(',', '.'));
    if (!jenisId) {
      setError('Pilih jenis sampah daur ulang');
      return;
    }
    if (isNaN(berat) || berat <= 0) {
      setError('Masukkan berat timbang yang valid (> 0 kg)');
      return;
    }

    onSave({
      tanggal,
      jenisId,
      beratKg: berat,
      sumber,
      petugas: petugas.trim() || undefined,
      keterangan: keterangan.trim() || undefined,
    });

    // Reset
    setBeratKg('');
    setPetugas('');
    setKeterangan('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Timbang masuk sampah daur ulang
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Jenis Sampah */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis sampah
              </label>
              <select
                value={jenisId}
                onChange={e => setJenisId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {activeJenis.map(j => {
                  const currentStok = stokMap[j.id] || 0;
                  return (
                    <option key={j.id} value={j.id}>
                      {j.nama} — stok {formatNumberID(currentStok, 1)} kg
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Berat (kg) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Berat (kg)
              </label>
              <input
                type="text"
                value={beratKg}
                onChange={e => setBeratKg(e.target.value)}
                placeholder="mis. 12,5"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
              />
            </div>

            {/* Sumber */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sumber
              </label>
              <select
                value={sumber}
                onChange={e => setSumber(e.target.value as SumberDaurUlangMasuk)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                <option value="Petugas angkut">Petugas angkut</option>
                <option value="Drop box warga">Drop box warga</option>
                <option value="Bank sampah">Bank sampah</option>
                <option value="Pilah TPS">Pilah TPS</option>
                <option value="Clean-up pantai">Clean-up pantai</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Petugas / penimbang */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Petugas / penimbang
              </label>
              <input
                type="text"
                value={petugas}
                onChange={e => setPetugas(e.target.value)}
                placeholder="boleh dikosongkan"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Keterangan
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={e => setKeterangan(e.target.value)}
                placeholder="opsional"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0e484b] hover:bg-[#0b3b3d] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
