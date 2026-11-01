import React, { useState, useEffect } from 'react';
import { Pelanggan, PembayaranIuran, OPSProfile } from '../../types/ops';
import { MONTH_NAMES_ID, formatRupiah } from '../../utils/format';
import { X, CreditCard, Check, ArrowRight, DollarSign } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pembayaran: PembayaranIuran, syncToKas: boolean, pelangganNama?: string) => void;
  selectedPelanggan: Pelanggan | null;
  pelangganList: Pelanggan[];
  initialBulan?: number;
  initialTahun?: number;
  activeOPS: OPSProfile;
}

export const ModalFormIuran: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  selectedPelanggan,
  pelangganList,
  initialBulan = 2,
  initialTahun = 2026,
  activeOPS,
}) => {
  const [pelangganId, setPelangganId] = useState<string>('');
  const [bulan, setBulan] = useState<number>(initialBulan);
  const [tahun, setTahun] = useState<number>(initialTahun);
  const [jumlah, setJumlah] = useState<number>(20000);
  const [tanggalBayar, setTanggalBayar] = useState<string>(new Date().toISOString().split('T')[0]);
  const [metode, setMetode] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [noBukti, setNoBukti] = useState<string>('');
  const [syncToKas, setSyncToKas] = useState<boolean>(true);

  useEffect(() => {
    if (selectedPelanggan) {
      setPelangganId(selectedPelanggan.id);
      setJumlah(selectedPelanggan.tarifPerBulan || activeOPS.tarifDefault || 20000);
    } else if (pelangganList.length > 0) {
      setPelangganId(pelangganList[0].id);
      setJumlah(pelangganList[0].tarifPerBulan || activeOPS.tarifDefault || 20000);
    }
    setBulan(initialBulan);
    setTahun(initialTahun);
    setTanggalBayar(new Date().toISOString().split('T')[0]);
    setNoBukti(`KW/${initialTahun}/${String(initialBulan).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`);
  }, [selectedPelanggan, pelangganList, initialBulan, initialTahun, isOpen, activeOPS]);

  if (!isOpen) return null;

  const currentPel = pelangganList.find(p => p.id === pelangganId) || selectedPelanggan;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pelangganId || jumlah <= 0) return;

    const payload: PembayaranIuran = {
      id: `byr-${pelangganId}-${tahun}-${bulan}`,
      opsId: activeOPS.id,
      pelangganId,
      tahun,
      bulan,
      jumlah,
      tanggalBayar,
      metode,
      noBukti,
    };

    onSave(payload, syncToKas, currentPel?.nama);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-semibold text-base">Pencatatan Iuran Sampah Warga</h3>
              <p className="text-xs text-emerald-200">{activeOPS.nama}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Warga / Pelanggan *
            </label>
            <select
              value={pelangganId}
              onChange={e => {
                const id = e.target.value;
                setPelangganId(id);
                const p = pelangganList.find(item => item.id === id);
                if (p) setJumlah(p.tarifPerBulan || 20000);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {pelangganList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.no ? `${p.no}. ` : ''}{p.nama} (RT {p.rt} - Tarif: {formatRupiah(p.tarifPerBulan, false)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bulan Iuran *
              </label>
              <select
                value={bulan}
                onChange={e => setBulan(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tahun *
              </label>
              <input
                type="number"
                value={tahun}
                onChange={e => setTahun(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nominal Iuran Diterima (Rp) *
              </label>
              {currentPel && (
                <span className="text-xs text-slate-500">
                  Tarif Bulanan: {formatRupiah(currentPel.tarifPerBulan, false)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={jumlah}
                onChange={e => setJumlah(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 text-base font-bold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono tabular-nums"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setJumlah(20000)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-md border border-slate-200 transition-colors"
              >
                Rp 20.000 (Lunas Penuh)
              </button>
              <button
                type="button"
                onClick={() => setJumlah(10000)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 rounded-md border border-slate-200 transition-colors"
              >
                Rp 10.000 (Cicil 50%)
              </button>
              {currentPel && currentPel.tarifPerBulan !== 20000 && (
                <button
                  type="button"
                  onClick={() => setJumlah(currentPel.tarifPerBulan)}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-md border border-slate-200 transition-colors"
                >
                  Sesuai Tarif ({formatRupiah(currentPel.tarifPerBulan, false)})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Pembayaran *
              </label>
              <input
                type="date"
                required
                value={tanggalBayar}
                onChange={e => setTanggalBayar(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Metode Pembayaran
              </label>
              <select
                value={metode}
                onChange={e => setMetode(e.target.value as 'Tunai' | 'Transfer')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Tunai">Tunai (Cash)</option>
                <option value="Transfer">Transfer Bank / QRIS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nomor Bukti / Kuitansi
            </label>
            <input
              type="text"
              value={noBukti}
              onChange={e => setNoBukti(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          {/* Real-Time Monthly Recap Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-950">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Rekap Real-Time di Arus Kas:</strong> Pembayaran ini langsung diakumulasikan ke <strong>1 baris Rekap Kas Bulanan</strong> pada tanggal terakhir di-update ({MONTH_NAMES_ID[bulan - 1]} {tahun}). Total rumah dan uang langsung ter-update seketika di Buku Kas tanpa harus menunggu akhir bulan.
            </div>
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
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
