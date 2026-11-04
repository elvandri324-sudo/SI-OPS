import React, { useState, useEffect } from 'react';
import { Pelanggan, PembayaranIuran, OPSProfile } from '../../types/ops';
import { MONTH_NAMES_ID, formatRupiah } from '../../utils/format';
import { X, CreditCard, Check, ArrowRight, DollarSign, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pembayaran: PembayaranIuran, syncToKas: boolean, pelangganNama?: string) => void;
  onDelete?: (id: string, pelangganNama?: string) => void;
  selectedPelanggan: Pelanggan | null;
  pelangganList: Pelanggan[];
  pembayaranList?: PembayaranIuran[];
  initialBulan?: number;
  initialTahun?: number;
  activeOPS: OPSProfile;
}

export const ModalFormIuran: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedPelanggan,
  pelangganList,
  pembayaranList = [],
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
  const [isConfirmDelete, setIsConfirmDelete] = useState<boolean>(false);

  // Check if payment already exists for this customer + year + month
  const existingPayment = pembayaranList.find(
    p => p.pelangganId === (pelangganId || selectedPelanggan?.id) && p.tahun === tahun && p.bulan === bulan
  );

  useEffect(() => {
    setIsConfirmDelete(false);
    const targetId = selectedPelanggan?.id || (pelangganList.length > 0 ? pelangganList[0].id : '');
    setPelangganId(targetId);
    setBulan(initialBulan);
    setTahun(initialTahun);

    // Look up existing payment for initial cell
    const found = pembayaranList.find(
      p => p.pelangganId === targetId && p.tahun === initialTahun && p.bulan === initialBulan
    );

    if (found) {
      setJumlah(found.jumlah || 0);
      setTanggalBayar(found.tanggalBayar || new Date().toISOString().split('T')[0]);
      setMetode((found.metode as 'Tunai' | 'Transfer') || 'Tunai');
      setNoBukti(found.noBukti || '');
    } else {
      const pel = pelangganList.find(p => p.id === targetId) || selectedPelanggan;
      setJumlah(pel?.tarifPerBulan || activeOPS.tarifDefault || 20000);
      setTanggalBayar(new Date().toISOString().split('T')[0]);
      setMetode('Tunai');
      setNoBukti(`KW/${initialTahun}/${String(initialBulan).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [selectedPelanggan, pelangganList, pembayaranList, initialBulan, initialTahun, isOpen, activeOPS]);

  if (!isOpen) return null;

  const currentPel = pelangganList.find(p => p.id === pelangganId) || selectedPelanggan;

  const handlePelangganChange = (id: string) => {
    setPelangganId(id);
    const found = pembayaranList.find(p => p.pelangganId === id && p.tahun === tahun && p.bulan === bulan);
    if (found) {
      setJumlah(found.jumlah);
      if (found.tanggalBayar) setTanggalBayar(found.tanggalBayar);
      if (found.metode) setMetode(found.metode as 'Tunai' | 'Transfer');
      if (found.noBukti) setNoBukti(found.noBukti);
    } else {
      const p = pelangganList.find(item => item.id === id);
      if (p) setJumlah(p.tarifPerBulan || 20000);
    }
  };

  const handleBulanChange = (newBulan: number) => {
    setBulan(newBulan);
    const found = pembayaranList.find(p => p.pelangganId === pelangganId && p.tahun === tahun && p.bulan === newBulan);
    if (found) {
      setJumlah(found.jumlah);
      if (found.tanggalBayar) setTanggalBayar(found.tanggalBayar);
      if (found.metode) setMetode(found.metode as 'Tunai' | 'Transfer');
      if (found.noBukti) setNoBukti(found.noBukti);
    } else {
      const p = pelangganList.find(item => item.id === pelangganId) || selectedPelanggan;
      if (p) setJumlah(p.tarifPerBulan || 20000);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-base truncate">Pencatatan Iuran Sampah Warga</h3>
              <p className="text-[10px] sm:text-xs text-emerald-200 truncate">{activeOPS.nama}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition-colors p-1 rounded-md shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Existing payment alert banner */}
          {existingPayment && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950">
                    Sudah Tercatat: {formatRupiah(existingPayment.jumlah, false)}
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    {MONTH_NAMES_ID[bulan - 1]} {tahun} • {existingPayment.metode || 'Tunai'} ({existingPayment.tanggalBayar || '-'})
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                {existingPayment.jumlah >= (currentPel?.tarifPerBulan || 20000) ? 'Lunas' : 'Cicil'}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Warga / Pelanggan *
            </label>
            <select
              value={pelangganId}
              onChange={e => handlePelangganChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {pelangganList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.no ? `${p.no}. ` : ''}{p.nama} {p.sektor ? `(${p.sektor} ${p.unit || ''})` : `(RT ${p.rt})`} - Tarif: {formatRupiah(p.tarifPerBulan, false)}
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
                onChange={e => handleBulanChange(Number(e.target.value))}
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
                onChange={e => {
                  const newYr = Number(e.target.value);
                  setTahun(newYr);
                  const found = pembayaranList.find(p => p.pelangganId === pelangganId && p.tahun === newYr && p.bulan === bulan);
                  if (found) {
                    setJumlah(found.jumlah);
                    if (found.tanggalBayar) setTanggalBayar(found.tanggalBayar);
                  }
                }}
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
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                Rp 20.000 (Lunas Penuh)
              </button>
              <button
                type="button"
                onClick={() => setJumlah(10000)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                Rp 10.000 (Cicil 50%)
              </button>
              {currentPel && currentPel.tarifPerBulan !== 20000 && (
                <button
                  type="button"
                  onClick={() => setJumlah(currentPel.tarifPerBulan)}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
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

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {/* Tombol Hapus Iuran jika pembayaran sudah tercatat */}
            {existingPayment && onDelete ? (
              <div>
                {!isConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmDelete(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Hapus setoran iuran bulan ini"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 hover:text-white" />
                    <span>Hapus Iuran</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-lg border border-rose-300 animate-in fade-in">
                    <span className="text-[11px] font-bold text-rose-900 px-1">Hapus iuran ini?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(existingPayment.id, currentPel?.nama);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmDelete(false)}
                      className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-md transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{existingPayment ? 'Update Pembayaran' : 'Simpan Pembayaran'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
