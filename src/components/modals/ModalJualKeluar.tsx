import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import {
  JenisDaurUlangItem,
  JenisPengeluaranDaurUlang,
  TujuanUangDiterima,
} from '../../types/ops';
import { formatNumberID, formatRupiah } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jenisList: JenisDaurUlangItem[];
  stokMap: Record<string, number>;
  onSave: (data: {
    tanggal: string;
    jenisId: string;
    beratKg: number;
    jenisPengeluaran: JenisPengeluaranDaurUlang;
    pembeli?: string;
    hargaPerKg?: number;
    tujuanKas?: TujuanUangDiterima;
    catatKeKas?: boolean;
    keterangan?: string;
  }) => void;
}

export const ModalJualKeluar: React.FC<Props> = ({
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
  const [jenisPengeluaran, setJenisPengeluaran] =
    useState<JenisPengeluaranDaurUlang>('Dijual');
  const [pembeli, setPembeli] = useState('');
  const [hargaPerKg, setHargaPerKg] = useState<string>('');
  const [tujuanKas, setTujuanKas] = useState<TujuanUangDiterima>('Kas (tunai)');
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Autofill price when selected item changes
  useEffect(() => {
    const selected = jenisList.find(j => j.id === jenisId);
    if (selected && selected.hargaAcuanKg > 0) {
      setHargaPerKg(selected.hargaAcuanKg.toString());
    }
  }, [jenisId, jenisList]);

  if (!isOpen) return null;

  const currentStok = stokMap[jenisId] || 0;
  const parsedBerat = parseFloat(beratKg.replace(',', '.')) || 0;
  const parsedHarga = parseFloat(hargaPerKg.replace(',', '.')) || 0;
  const totalNilaiPenjualan = parsedBerat * parsedHarga;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenisId) {
      setError('Pilih jenis sampah daur ulang');
      return;
    }
    if (isNaN(parsedBerat) || parsedBerat <= 0) {
      setError('Masukkan berat keluar yang valid (> 0 kg)');
      return;
    }
    if (parsedBerat > currentStok) {
      setError(`Berat keluar (${parsedBerat} kg) melebihi stok yang tersedia (${currentStok} kg)`);
      return;
    }

    if (jenisPengeluaran === 'Dijual') {
      if (parsedHarga <= 0) {
        setError('Masukkan harga per kg yang valid');
        return;
      }
    }

    onSave({
      tanggal,
      jenisId,
      beratKg: parsedBerat,
      jenisPengeluaran,
      pembeli: jenisPengeluaran === 'Dijual' ? pembeli.trim() || undefined : undefined,
      hargaPerKg: jenisPengeluaran === 'Dijual' ? parsedHarga : undefined,
      tujuanKas: jenisPengeluaran === 'Dijual' ? tujuanKas : undefined,
      catatKeKas: jenisPengeluaran === 'Dijual',
      keterangan: keterangan.trim() || undefined,
    });

    setBeratKg('');
    setPembeli('');
    setKeterangan('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-900">
            Jual / keluarkan sampah daur ulang
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
                  const stok = stokMap[j.id] || 0;
                  return (
                    <option key={j.id} value={j.id}>
                      {j.nama} — stok {formatNumberID(stok, 1)} kg
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
              <p className="mt-1 text-[11px] text-slate-500">
                Stok tersedia: <span className="font-semibold text-slate-700">{formatNumberID(currentStok, 1)} kg</span>
              </p>
            </div>

            {/* Jenis Pengeluaran */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis pengeluaran
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['Dijual', 'Susut / afkir', 'Lainnya'] as JenisPengeluaranDaurUlang[]).map(
                  jp => (
                    <button
                      key={jp}
                      type="button"
                      onClick={() => setJenisPengeluaran(jp)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg text-center transition-all cursor-pointer truncate ${
                        jenisPengeluaran === jp
                          ? 'bg-[#0e484b] text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {jp}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Conditional Fields based on Jenis Pengeluaran */}
          {jenisPengeluaran === 'Dijual' ? (
            <>
              {/* Pembeli / pengepul */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pembeli / pengepul
                </label>
                <input
                  type="text"
                  value={pembeli}
                  onChange={e => setPembeli(e.target.value)}
                  placeholder="Nama pengepul"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Harga per kg */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Harga per kg
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={hargaPerKg}
                      onChange={e => setHargaPerKg(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                    />
                  </div>
                </div>

                {/* Uang diterima di */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Uang diterima di
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTujuanKas('Kas (tunai)')}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                        tujuanKas === 'Kas (tunai)'
                          ? 'bg-[#0e484b] text-white border-[#0e484b] font-semibold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Kas (tunai)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTujuanKas('Bank')}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                        tujuanKas === 'Bank'
                          ? 'bg-[#0e484b] text-white border-[#0e484b] font-semibold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Bank
                    </button>
                  </div>
                </div>
              </div>

              {/* Total revenue calculation box */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-amber-950">
                    Total Penerimaan: {formatRupiah(totalNilaiPenjualan)}
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Penjualan ini akan otomatis dicatat sebagai pemasukan pada Laporan Keuangan Buku Kas ({tujuanKas}).
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Keterangan / Alasan pengeluaran
              </label>
              <textarea
                rows={2}
                value={keterangan}
                onChange={e => setKeterangan(e.target.value)}
                placeholder="mis. Rusak terkontaminasi atau susut penguapan"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
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
