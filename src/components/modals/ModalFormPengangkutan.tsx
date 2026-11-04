import React, { useState, useEffect } from 'react';
import { TransaksiPengangkutan, OPSProfile, SumberSampah, MetodeUkurSampah } from '../../types/ops';
import { formatDateID, formatNumberID } from '../../utils/format';
import {
  X,
  Truck,
  Check,
  Calculator,
  Sparkles,
  Waves,
  Recycle,
  Trash,
  Users,
  MapPin,
  Package,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransaksiPengangkutan) => void;
  editingItem: TransaksiPengangkutan | null;
  activeOPS: OPSProfile;
  opsList?: OPSProfile[];
  initialSumber?: SumberSampah;
}

export const ModalFormPengangkutan: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  activeOPS,
  opsList = [],
  initialSumber = 'Pemukiman',
}) => {
  const [sumberSampah, setSumberSampah] = useState<SumberSampah>(initialSumber);
  const [selectedOPSId, setSelectedOPSId] = useState<string>(
    activeOPS.id === 'all' && opsList.length > 0 ? opsList[0].id : activeOPS.id
  );
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);

  // Metode ukur untuk Pemukiman: 'bak' (dimensi bak) vs 'karung' (hitung karung)
  const [metodeUkur, setMetodeUkur] = useState<MetodeUkurSampah>(activeOPS.metodeUkurDefault || 'bak');

  // Fields for Pemukiman (Metode Bak)
  const [pelangganTerlayani, setPelangganTerlayani] = useState<number>(100);
  const [panjangBakCm, setPanjangBakCm] = useState<number>(activeOPS.panjangBakDefaultCm || 190);
  const [lebarBakCm, setLebarBakCm] = useState<number>(activeOPS.lebarBakDefaultCm || 120);
  const [ketinggianOrganikCm, setKetinggianOrganikCm] = useState<number>(0);
  const [densitasOrganik, setDensitasOrganik] = useState<number>(activeOPS.densitasOrganikDefault || 320);
  const [ketinggianAnorganikCm, setKetinggianAnorganikCm] = useState<number>(0);
  const [densitasAnorganik, setDensitasAnorganik] = useState<number>(activeOPS.densitasAnorganikDefault || 127);

  // Fields for Pemukiman (Metode Karung: Campur, Organik, Anorganik dengan berat rata-rata per jenis)
  const [karungCampur, setKarungCampur] = useState<number>(0);
  const [beratRataKarungCampur, setBeratRataKarungCampur] = useState<number>(
    activeOPS.beratRataKarungCampurDefault || 20
  );

  const [karungOrganik, setKarungOrganik] = useState<number>(0);
  const [beratRataKarungOrganik, setBeratRataKarungOrganik] = useState<number>(
    activeOPS.beratRataKarungOrganikDefault || 25
  );

  const [karungAnorganik, setKarungAnorganik] = useState<number>(0);
  const [beratRataKarungAnorganik, setBeratRataKarungAnorganik] = useState<number>(
    activeOPS.beratRataKarungAnorganikDefault || 12
  );

  // Fields for Clean-up di Pantai
  // Input: Sampah Daur Ulang, Plastik, dan Residu
  const [beratDaurUlangKg, setBeratDaurUlangKg] = useState<number>(0);
  const [beratPlastikKg, setBeratPlastikKg] = useState<number>(0);
  const [beratResiduKg, setBeratResiduKg] = useState<number>(0);
  const [lokasiPantai, setLokasiPantai] = useState<string>('Pantai Pesisir Ouw');
  const [jumlahRelawan, setJumlahRelawan] = useState<number>(25);
  const [panjangPesisirMeter, setPanjangPesisirMeter] = useState<number>(500);

  // Shared
  const [armada, setArmada] = useState<string>('Armada Rit 01');
  const [catatan, setCatatan] = useState<string>('');
  const [zona, setZona] = useState<string>('Zona 1');

  // Deteksi khusus OPS Pulau Rhun
  const currentSelectedOps = opsList.find(o => o.id === selectedOPSId) || activeOPS;
  const isPulauRhun =
    (currentSelectedOps.nama || '').toLowerCase().includes('rhun') ||
    (currentSelectedOps.kode || '').toUpperCase().includes('PR') ||
    (currentSelectedOps.wilayah || '').toLowerCase().includes('rhun') ||
    (activeOPS.nama || '').toLowerCase().includes('rhun') ||
    (activeOPS.kode || '').toUpperCase().includes('PR');

  useEffect(() => {
    if (editingItem) {
      setSumberSampah(editingItem.sumberSampah || 'Pemukiman');
      setMetodeUkur(editingItem.metodeUkur || activeOPS.metodeUkurDefault || 'bak');
      setTanggal(editingItem.tanggal);
      setCatatan(editingItem.catatan || '');
      setArmada(editingItem.armada || 'Armada Rit 01');
      setZona(editingItem.zona || 'Zona 1');

      if (editingItem.sumberSampah === 'Clean-up Pantai') {
        setBeratDaurUlangKg(editingItem.beratDaurUlangKg || 0);
        setBeratPlastikKg(editingItem.beratPlastikKg || 0);
        setBeratResiduKg(editingItem.beratResiduKg || 0);
        setLokasiPantai(editingItem.lokasiPantai || 'Pantai Pesisir Ouw');
        setJumlahRelawan(editingItem.jumlahRelawan || editingItem.pelangganTerlayani || 25);
        setPanjangPesisirMeter(editingItem.panjangPesisirMeter || 500);
      } else {
        setPelangganTerlayani(editingItem.pelangganTerlayani);
        // Bak
        setPanjangBakCm(editingItem.panjangBakCm || activeOPS.panjangBakDefaultCm || 190);
        setLebarBakCm(editingItem.lebarBakCm || activeOPS.lebarBakDefaultCm || 120);
        setKetinggianOrganikCm(editingItem.ketinggianOrganikCm || 0);
        setDensitasOrganik(editingItem.densitasOrganik || activeOPS.densitasOrganikDefault || 320);
        setKetinggianAnorganikCm(editingItem.ketinggianAnorganikCm || 0);
        setDensitasAnorganik(editingItem.densitasAnorganik || activeOPS.densitasAnorganikDefault || 127);
        // Karung
        setKarungCampur(editingItem.karungCampur || 0);
        setBeratRataKarungCampur(editingItem.beratRataKarungCampur || activeOPS.beratRataKarungCampurDefault || 20);
        setKarungOrganik(editingItem.karungOrganik || 0);
        setBeratRataKarungOrganik(editingItem.beratRataKarungOrganik || activeOPS.beratRataKarungOrganikDefault || 25);
        setKarungAnorganik(editingItem.karungAnorganik || 0);
        setBeratRataKarungAnorganik(editingItem.beratRataKarungAnorganik || activeOPS.beratRataKarungAnorganikDefault || 12);
      }
    } else {
      setSumberSampah(initialSumber);
      const defaultMet = (isPulauRhun || activeOPS.metodeUkurDefault === 'karung') ? 'karung' : (activeOPS.metodeUkurDefault || 'bak');
      setMetodeUkur(defaultMet);
      setTanggal(new Date().toISOString().split('T')[0]);
      setPelangganTerlayani(115);
      // Bak Defaults
      setPanjangBakCm(activeOPS.panjangBakDefaultCm || 190);
      setLebarBakCm(activeOPS.lebarBakDefaultCm || 120);
      setKetinggianOrganikCm(75);
      setDensitasOrganik(activeOPS.densitasOrganikDefault || 320);
      setKetinggianAnorganikCm(0);
      setDensitasAnorganik(activeOPS.densitasAnorganikDefault || 127);
      // Karung Defaults
      setKarungCampur(10);
      setBeratRataKarungCampur(activeOPS.beratRataKarungCampurDefault || 20);
      setKarungOrganik(12);
      setBeratRataKarungOrganik(activeOPS.beratRataKarungOrganikDefault || 25);
      setKarungAnorganik(8);
      setBeratRataKarungAnorganik(activeOPS.beratRataKarungAnorganikDefault || 12);

      // Clean-up defaults
      setBeratDaurUlangKg(25);
      setBeratPlastikKg(50);
      setBeratResiduKg(15);
      setLokasiPantai('Pantai Pesisir Ouw');
      setJumlahRelawan(25);
      setPanjangPesisirMeter(500);

      setArmada(
        initialSumber === 'Clean-up Pantai'
          ? 'Tim Relawan Clean-up'
          : activeOPS.metodeUkurDefault === 'karung'
          ? 'Motor Roda Tiga (Viar)'
          : 'Dump Truck 01'
      );
      setCatatan('');
      setZona('Zona 1');
    }
  }, [editingItem, isOpen, activeOPS, initialSumber]);

  if (!isOpen) return null;

  // Real-time calculations for Pemukiman (Metode Bak)
  const volOrganik = (panjangBakCm * lebarBakCm * (ketinggianOrganikCm || 0)) / 1000000;
  const beratOrganik = volOrganik * densitasOrganik;
  const volAnorganik = (panjangBakCm * lebarBakCm * (ketinggianAnorganikCm || 0)) / 1000000;
  const beratAnorganik = volAnorganik * densitasAnorganik;
  const totalBeratBak = beratOrganik + beratAnorganik;
  const totalVolumeBak = volOrganik + volAnorganik;

  // Real-time calculations for Pemukiman (Metode Karung)
  const beratCampurHasil = (Number(karungCampur) || 0) * (Number(beratRataKarungCampur) || 0);
  const beratOrganikKarungHasil = (Number(karungOrganik) || 0) * (Number(beratRataKarungOrganik) || 0);
  const beratAnorganikKarungHasil = (Number(karungAnorganik) || 0) * (Number(beratRataKarungAnorganik) || 0);
  const totalKarungHitung = (Number(karungCampur) || 0) + (Number(karungOrganik) || 0) + (Number(karungAnorganik) || 0);
  const totalBeratKarungHasil = beratCampurHasil + beratOrganikKarungHasil + beratAnorganikKarungHasil;

  // Real-time calculations for Clean-up di Pantai
  const cleanDaur = Number(beratDaurUlangKg || 0);
  const cleanPlastik = Number(beratPlastikKg || 0);
  const cleanResidu = Number(beratResiduKg || 0);
  const totalBeratCleanUp = cleanDaur + cleanPlastik + cleanResidu;
  const daurPct = totalBeratCleanUp > 0 ? ((cleanDaur / totalBeratCleanUp) * 100).toFixed(1) : '0';
  const plastikPct = totalBeratCleanUp > 0 ? ((cleanPlastik / totalBeratCleanUp) * 100).toFixed(1) : '0';
  const residuPct = totalBeratCleanUp > 0 ? ((cleanResidu / totalBeratCleanUp) * 100).toFixed(1) : '0';
  const perRelawanKg = jumlahRelawan > 0 ? (totalBeratCleanUp / jumlahRelawan).toFixed(1) : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetOps = editingItem
      ? editingItem.opsId
      : selectedOPSId === 'all'
      ? opsList[0]?.id || 'ops-tanah-rata'
      : selectedOPSId;

    const zonaValue = isPulauRhun ? (zona || 'Zona 1') : undefined;

    if (sumberSampah === 'Clean-up Pantai') {
      const payload: TransaksiPengangkutan = {
        id: editingItem ? editingItem.id : 'angkut-cleanup-' + Date.now(),
        opsId: targetOps,
        tanggal,
        hariTanggalLabel: formatDateID(tanggal),
        sumberSampah: 'Clean-up Pantai',
        zona: zonaValue,
        lokasiPantai: lokasiPantai.trim() || 'Pantai Pesisir',
        jumlahRelawan: Number(jumlahRelawan) || 0,
        panjangPesisirMeter: Number(panjangPesisirMeter) || 0,
        beratDaurUlangKg: Number(cleanDaur.toFixed(1)),
        beratPlastikKg: Number(cleanPlastik.toFixed(1)),
        beratResiduKg: Number(cleanResidu.toFixed(1)),
        pelangganTerlayani: Number(jumlahRelawan) || 0,
        // Compatibility values:
        panjangBakCm: 0,
        lebarBakCm: 0,
        ketinggianOrganikCm: 0,
        densitasOrganik: 320,
        volumeOrganikM3: Number((cleanResidu / 250).toFixed(2)),
        beratOrganikKg: Number(cleanResidu.toFixed(1)),
        ketinggianAnorganikCm: 0,
        densitasAnorganik: 127,
        volumeAnorganikM3: Number(((cleanDaur + cleanPlastik) / 127).toFixed(2)),
        beratAnorganikKg: Number((cleanDaur + cleanPlastik).toFixed(1)),
        armada: armada.trim() || 'Tim Clean-up Relawan',
        catatan,
      };
      onSave(payload);
    } else if (metodeUkur === 'karung') {
      // Pemukiman dengan Alat Ukur Karung (Campur, Organik, Anorganik)
      const cmpKeOrg = Number((beratCampurHasil * 0.60).toFixed(1));
      const cmpKeAnorg = Number((beratCampurHasil * 0.40).toFixed(1));
      const finalOrg = Number((beratOrganikKarungHasil + cmpKeOrg).toFixed(1));
      const finalAnorg = Number((beratAnorganikKarungHasil + cmpKeAnorg).toFixed(1));

      const payload: TransaksiPengangkutan = {
        id: editingItem ? editingItem.id : 'angkut-karung-' + Date.now(),
        opsId: targetOps,
        tanggal,
        hariTanggalLabel: formatDateID(tanggal),
        sumberSampah: 'Pemukiman',
        metodeUkur: 'karung',
        zona: zonaValue,
        pelangganTerlayani: Number(pelangganTerlayani) || 0,
        // Detail Karung
        karungCampur: Number(karungCampur) || 0,
        beratRataKarungCampur: Number(beratRataKarungCampur) || 20,
        beratCampurKg: Number(beratCampurHasil.toFixed(1)),
        karungOrganik: Number(karungOrganik) || 0,
        beratRataKarungOrganik: Number(beratRataKarungOrganik) || 25,
        karungAnorganik: Number(karungAnorganik) || 0,
        beratRataKarungAnorganik: Number(beratRataKarungAnorganik) || 12,
        totalKarung: totalKarungHitung,
        // Aggregat compatibility
        beratOrganikKg: finalOrg,
        beratAnorganikKg: finalAnorg,
        volumeOrganikM3: Number((finalOrg / 320).toFixed(2)),
        volumeAnorganikM3: Number((finalAnorg / 127).toFixed(2)),
        panjangBakCm: 0,
        lebarBakCm: 0,
        ketinggianOrganikCm: 0,
        densitasOrganik: 320,
        ketinggianAnorganikCm: 0,
        densitasAnorganik: 127,
        armada: armada.trim() || 'Motor Roda Tiga (Viar)',
        catatan,
      };
      onSave(payload);
    } else {
      // Pemukiman dengan Dimensi Bak Kendaraan
      const payload: TransaksiPengangkutan = {
        id: editingItem ? editingItem.id : 'angkut-' + Date.now(),
        opsId: targetOps,
        tanggal,
        hariTanggalLabel: formatDateID(tanggal),
        sumberSampah: 'Pemukiman',
        metodeUkur: 'bak',
        zona: zonaValue,
        pelangganTerlayani: Number(pelangganTerlayani) || 0,
        panjangBakCm: Number(panjangBakCm) || 190,
        lebarBakCm: Number(lebarBakCm) || 120,
        ketinggianOrganikCm: Number(ketinggianOrganikCm) || 0,
        densitasOrganik: Number(densitasOrganik) || 320,
        volumeOrganikM3: Number(volOrganik.toFixed(2)),
        beratOrganikKg: Number(beratOrganik.toFixed(1)),
        ketinggianAnorganikCm: Number(ketinggianAnorganikCm) || 0,
        densitasAnorganik: Number(densitasAnorganik) || 127,
        volumeAnorganikM3: Number(volAnorganik.toFixed(2)),
        beratAnorganikKg: Number(beratAnorganik.toFixed(1)),
        armada: armada.trim() || 'Dump Truck 01',
        catatan,
      };
      onSave(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div
          className={`px-4 py-3 sm:px-6 sm:py-4 text-white flex items-center justify-between transition-colors shrink-0 ${
            sumberSampah === 'Clean-up Pantai' ? 'bg-cyan-800' : 'bg-teal-800'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-white/10 shrink-0">
              {sumberSampah === 'Clean-up Pantai' ? (
                <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-200" />
              ) : metodeUkur === 'karung' ? (
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200" />
              ) : (
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-base leading-tight truncate">
                {editingItem
                  ? `Edit ${
                      sumberSampah === 'Clean-up Pantai'
                        ? 'Aksi Clean-up Pantai'
                        : metodeUkur === 'karung'
                        ? 'Pengangkutan Sampah (Karung)'
                        : 'Ritase Pengangkutan (Bak)'
                    }`
                  : `Catat ${
                      sumberSampah === 'Clean-up Pantai'
                        ? 'Aksi Clean-up di Pantai'
                        : metodeUkur === 'karung'
                        ? 'Pengangkutan Sampah (Karung)'
                        : 'Pengangkutan Sampah Harian'
                    }`}
              </h3>
              <p className="text-[10px] sm:text-xs text-white/80 truncate">{activeOPS.nama}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Selector: Sumber Sampah */}
        <div className="px-4 pt-2.5 pb-2.5 sm:p-4 sm:pb-0 bg-slate-50 border-b border-slate-200 shrink-0">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Pilih Sumber Sampah
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setSumberSampah('Pemukiman');
                if (armada.includes('Relawan') || armada.includes('Clean-up')) {
                  setArmada(metodeUkur === 'karung' ? 'Motor Roda Tiga (Viar)' : 'Dump Truck 01');
                }
              }}
              className={`py-1.5 sm:py-2 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sumberSampah === 'Pemukiman'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
              <span className="truncate">Warga / Pemukiman</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSumberSampah('Clean-up Pantai');
                if (armada.includes('Dump Truck') || armada.includes('Viar')) {
                  setArmada('Tim Relawan Bersih Pantai');
                }
              }}
              className={`py-1.5 sm:py-2 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sumberSampah === 'Clean-up Pantai'
                  ? 'bg-white text-cyan-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Waves className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 shrink-0" />
              <span className="truncate">Clean-up Pantai</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {opsList.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Pilih Organisasi (OPS Penanggung Jawab) *
              </label>
              <select
                value={selectedOPSId}
                onChange={e => setSelectedOPSId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900"
              >
                {opsList.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nama} ({o.kode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ============================================================== */}
          {/* JIKA SUMBER SAMPAH: AKSI CLEAN-UP DI PANTAI                    */}
          {/* ============================================================== */}
          {sumberSampah === 'Clean-up Pantai' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-cyan-600 text-white rounded-lg">
                  <Waves className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-cyan-950">Aksi Pembersihan Pantai &amp; Pesisir Laut</h4>
                  <p className="text-cyan-800">
                    Input hasil timbangan sampah dari aksi clean-up: sampah daur ulang, plastik, dan residu.
                  </p>
                </div>
              </div>

              {/* Row 1: Tanggal, Lokasi Pantai, Armada/Tim */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Tanggal Kegiatan *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const parts = tanggal.split('-');
                          const monthDay = parts.length === 3 ? `${parts[1]}-${parts[2]}` : '08-15';
                          setTanggal(`2025-${monthDay}`);
                        }}
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold cursor-pointer transition-colors border ${
                          tanggal.startsWith('2025')
                            ? 'bg-cyan-700 text-white border-cyan-800'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                        }`}
                        title="Ubah tahun kegiatan ke 2025"
                      >
                        2025
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const parts = tanggal.split('-');
                          const monthDay = parts.length === 3 ? `${parts[1]}-${parts[2]}` : '08-15';
                          setTanggal(`2026-${monthDay}`);
                        }}
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold cursor-pointer transition-colors border ${
                          tanggal.startsWith('2026')
                            ? 'bg-cyan-700 text-white border-cyan-800'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                        }`}
                        title="Ubah tahun kegiatan ke 2026"
                      >
                        2026
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    Lokasi Pantai / Pesisir *
                  </label>
                  <input
                    type="text"
                    required
                    value={lokasiPantai}
                    onChange={e => setLokasiPantai(e.target.value)}
                    placeholder="Contoh: Pantai Ouw / Pesisir Barat"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tim / Kendaraan Pengangkut
                  </label>
                  <input
                    type="text"
                    value={armada}
                    onChange={e => setArmada(e.target.value)}
                    placeholder="Contoh: Pick-Up Relawan Clean-up"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Row 2: Partisipan & Panjang Pantai */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-600" />
                    Jumlah Relawan / Peserta (Orang) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={jumlahRelawan}
                    onChange={e => setJumlahRelawan(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Panjang Garis Pantai (Meter)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={panjangPesisirMeter}
                    onChange={e => setPanjangPesisirMeter(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Tiga Kategori Sampah yang Diminta: Daur Ulang, Plastik, Residu */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Input Sampah Hasil Clean-up (Kilogram / Kg)
                  </span>
                  <span className="text-xs text-slate-500">Timbangan Langsung di Lokasi</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Sampah Daur Ulang */}
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Recycle className="w-4 h-4 text-emerald-600" />
                        1. Daur Ulang
                      </span>
                      <span className="text-2xs font-semibold px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full">
                        {daurPct}%
                      </span>
                    </div>
                    <p className="text-2xs text-emerald-700">Kardus, kertas, botol kaca, kaleng &amp; logam</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={beratDaurUlangKg}
                        onChange={e => setBeratDaurUlangKg(Number(e.target.value))}
                        className="w-full px-3 py-2 text-base font-bold text-emerald-950 border border-emerald-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-mono pr-10"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-600">Kg</span>
                    </div>
                  </div>

                  {/* 2. Sampah Plastik */}
                  <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center text-white text-2xs font-bold">
                          P
                        </span>
                        2. Sampah Plastik
                      </span>
                      <span className="text-2xs font-semibold px-2 py-0.5 bg-sky-200 text-sky-800 rounded-full">
                        {plastikPct}%
                      </span>
                    </div>
                    <p className="text-2xs text-sky-700">Botol PET, tutup botol, kantong kresek, sachet, cup</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={beratPlastikKg}
                        onChange={e => setBeratPlastikKg(Number(e.target.value))}
                        className="w-full px-3 py-2 text-base font-bold text-sky-950 border border-sky-300 rounded-lg bg-white focus:ring-2 focus:ring-sky-500 font-mono pr-10"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-sky-600">Kg</span>
                    </div>
                  </div>

                  {/* 3. Sampah Residu */}
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Trash className="w-4 h-4 text-rose-600" />
                        3. Sampah Residu
                      </span>
                      <span className="text-2xs font-semibold px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full">
                        {residuPct}%
                      </span>
                    </div>
                    <p className="text-2xs text-rose-700">Puntung, kain/jaring usang, styrofoam, sampah kotor</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={beratResiduKg}
                        onChange={e => setBeratResiduKg(Number(e.target.value))}
                        className="w-full px-3 py-2 text-base font-bold text-rose-950 border border-rose-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 font-mono pr-10"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-rose-600">Kg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean-up Total Summary Card */}
              <div className="p-4 bg-cyan-950 text-white rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-200">
                      Total Sampah Terangkat dari Pantai:
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-cyan-300 font-mono">
                      {formatNumberID(totalBeratCleanUp, 1)} Kg
                    </span>
                    <span className="text-xs text-cyan-400 ml-1.5">
                      ({formatNumberID(totalBeratCleanUp / 1000, 2)} Ton)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-cyan-900/80 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${daurPct}%` }}
                    className="bg-emerald-400 h-full"
                    title={`Daur Ulang: ${daurPct}%`}
                  />
                  <div
                    style={{ width: `${plastikPct}%` }}
                    className="bg-sky-400 h-full"
                    title={`Plastik: ${plastikPct}%`}
                  />
                  <div
                    style={{ width: `${residuPct}%` }}
                    className="bg-rose-400 h-full"
                    title={`Residu: ${residuPct}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-2xs text-cyan-200 pt-1">
                  <span>
                    Efisiensi: <strong>{perRelawanKg} Kg/relawan</strong>
                  </span>
                  <span>
                    Pesisir: <strong>{panjangPesisirMeter} meter</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* JIKA SUMBER SAMPAH: REGULER PEMUKIMAN                          */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Khusus OPS Pulau Rhun: Pilah Zona 1-3 */}
              {isPulauRhun && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      Pilah Zona Pengangkutan (Khusus OPS Pulau Rhun) *
                    </label>
                    <span className="text-2xs font-extrabold px-2.5 py-0.5 bg-emerald-700 text-white rounded-full">
                      Terpilih: {zona}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Zona 1', 'Zona 2', 'Zona 3', 'Semua Zona (1-3)'] as const).map(z => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZona(z)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          zona === z
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-500/40'
                            : 'bg-white text-emerald-950 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${zona === z ? 'bg-white' : 'bg-emerald-500'}`} />
                        <span>{z}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 1: Tanggal, Pelanggan, Armada */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Tanggal Pengambilan *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const parts = tanggal.split('-');
                          const monthDay = parts.length === 3 ? `${parts[1]}-${parts[2]}` : '08-15';
                          setTanggal(`2025-${monthDay}`);
                        }}
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold cursor-pointer transition-colors border ${
                          tanggal.startsWith('2025')
                            ? 'bg-teal-700 text-white border-teal-800'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                        }`}
                        title="Ubah tahun kegiatan ke 2025"
                      >
                        2025
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const parts = tanggal.split('-');
                          const monthDay = parts.length === 3 ? `${parts[1]}-${parts[2]}` : '08-15';
                          setTanggal(`2026-${monthDay}`);
                        }}
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold cursor-pointer transition-colors border ${
                          tanggal.startsWith('2026')
                            ? 'bg-teal-700 text-white border-teal-800'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                        }`}
                        title="Ubah tahun kegiatan ke 2026"
                      >
                        2026
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Pelanggan Terlayani (KK) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={pelangganTerlayani}
                    onChange={e => setPelangganTerlayani(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono tabular-nums"
                    placeholder="109"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Armada / Kendaraan
                  </label>
                  <input
                    type="text"
                    value={armada}
                    onChange={e => setArmada(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Dump Truck / Viar"
                  />
                </div>
              </div>

              {/* Selector Alat Ukur: Karung vs Dimensi Bak */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-emerald-700" />
                    Pilih Alat Ukur Pengangkutan Sampah:
                  </span>
                  <span className="text-2xs text-slate-500 font-medium">
                    {metodeUkur === 'karung' ? 'Metode Hitung Karung' : 'Metode Dimensi Bak'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodeUkur('karung')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      metodeUkur === 'karung'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Alat Ukur Karung (Campur, Organik, Anorganik)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodeUkur('bak')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      metodeUkur === 'bak'
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Dimensi Bak Kendaraan (P x L x Tinggi cm)</span>
                  </button>
                </div>
              </div>

              {/* ========================================================== */}
              {/* METODE 1: ALAT UKUR KARUNG                                */}
              {/* ========================================================== */}
              {metodeUkur === 'karung' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      Hitung Jumlah Karung Sesuai Jenis Sampah
                      {isPulauRhun && (
                        <span className="text-2xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                          📍 {zona}
                        </span>
                      )}
                    </span>
                    <span className="text-2xs text-slate-500 font-mono">
                      Total: {totalKarungHitung} Karung
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Card 1: Sampah Campur (Purple/Indigo) */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                        <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                          Sampah Campur
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jumlah Karung Campur
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={karungCampur}
                            onChange={e => setKarungCampur(Number(e.target.value))}
                            className="w-full px-3 py-2 text-base font-bold text-indigo-950 border border-indigo-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono pr-14"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-indigo-600 font-bold">
                            Karung
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-2xs text-slate-500 mb-1">
                          Berat Rata-rata per Karung (Kg/Karung)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={beratRataKarungCampur}
                            onChange={e => setBeratRataKarungCampur(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-md bg-white font-mono pr-7"
                          />
                          <span className="absolute right-2 top-1.5 text-2xs text-indigo-600 font-bold">
                            Kg
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-indigo-200/80">
                        <div className="p-2 bg-indigo-100/70 rounded-md flex items-center justify-between text-xs">
                          <span className="text-indigo-900 font-medium">Berat Hasil:</span>
                          <span className="text-base font-bold text-indigo-950 font-mono">
                            {formatNumberID(beratCampurHasil, 1)} kg
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Sampah Organik (Green/Emerald) */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          Sampah Organik
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jumlah Karung Organik
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={karungOrganik}
                            onChange={e => setKarungOrganik(Number(e.target.value))}
                            className="w-full px-3 py-2 text-base font-bold text-emerald-950 border border-emerald-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-mono pr-14"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-emerald-600 font-bold">
                            Karung
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-2xs text-slate-500 mb-1">
                          Berat Rata-rata per Karung (Kg/Karung)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={beratRataKarungOrganik}
                            onChange={e => setBeratRataKarungOrganik(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-emerald-200 rounded-md bg-white font-mono pr-7"
                          />
                          <span className="absolute right-2 top-1.5 text-2xs text-emerald-600 font-bold">
                            Kg
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/80">
                        <div className="p-2 bg-emerald-100/70 rounded-md flex items-center justify-between text-xs">
                          <span className="text-emerald-900 font-medium">Berat Hasil:</span>
                          <span className="text-base font-bold text-emerald-950 font-mono">
                            {formatNumberID(beratOrganikKarungHasil, 1)} kg
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Sampah Anorganik (Yellow/Amber) */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                        <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          Sampah Anorganik
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jumlah Karung Anorganik
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={karungAnorganik}
                            onChange={e => setKarungAnorganik(Number(e.target.value))}
                            className="w-full px-3 py-2 text-base font-bold text-amber-950 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-mono pr-14"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-amber-600 font-bold">
                            Karung
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-2xs text-slate-500 mb-1">
                          Berat Rata-rata per Karung (Kg/Karung)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={beratRataKarungAnorganik}
                            onChange={e => setBeratRataKarungAnorganik(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-md bg-white font-mono pr-7"
                          />
                          <span className="absolute right-2 top-1.5 text-2xs text-amber-600 font-bold">
                            Kg
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/80">
                        <div className="p-2 bg-amber-100/70 rounded-md flex items-center justify-between text-xs">
                          <span className="text-amber-900 font-medium">Berat Hasil:</span>
                          <span className="text-base font-bold text-amber-950 font-mono">
                            {formatNumberID(beratAnorganikKarungHasil, 1)} kg
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Combined Calculation Strip for Karung */}
                  <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Total Sampah Berdasarkan Karung:
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-mono tabular-nums">
                      <span>
                        Total Karung:{' '}
                        <strong className="text-white">{totalKarungHitung} Karung</strong>
                      </span>
                      <span>
                        Total Berat:{' '}
                        <strong className="text-emerald-400">
                          {formatNumberID(totalBeratKarungHasil, 1)} kg
                        </strong>{' '}
                        <span className="text-xs text-slate-400">
                          ({formatNumberID(totalBeratKarungHasil / 1000, 2)} Ton)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================== */
                /* METODE 2: ALAT UKUR DIMENSI BAK KENDARAAN (P x L x T)     */
                /* ========================================================== */
                <div className="space-y-4">
                  {/* Bak Dimensions */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-slate-500" />
                        Dimensi Bak Kendaraan
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Luas Dasar: {((panjangBakCm * lebarBakCm) / 10000).toFixed(2)} m²
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Panjang Bak (cm)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={panjangBakCm}
                          onChange={e => setPanjangBakCm(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Lebar Bak (cm)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={lebarBakCm}
                          onChange={e => setLebarBakCm(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Two Columns: Organik (Green) & Anorganik (Yellow) as shown in user screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Organik Card */}
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          SAMPAH ORGANIK (TONG HIJAU)
                        </span>
                        <span className="text-xs font-medium text-emerald-700">
                          Densitas: {densitasOrganik} kg/m³
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ketinggian Sampah (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={ketinggianOrganikCm}
                          onChange={e => setKetinggianOrganikCm(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Densitas Standar (kg/m³)
                        </label>
                        <input
                          type="number"
                          value={densitasOrganik}
                          onChange={e => setDensitasOrganik(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs border border-emerald-200 rounded-md bg-white/80 font-mono"
                        />
                      </div>

                      <div className="pt-2 border-t border-emerald-200/80 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-emerald-100/70 rounded-md">
                          <div className="text-emerald-800 font-medium">Volume:</div>
                          <div className="text-base font-bold text-emerald-950 font-mono tabular-nums">
                            {formatNumberID(volOrganik, 2)} m³
                          </div>
                        </div>
                        <div className="p-2 bg-emerald-200/60 rounded-md">
                          <div className="text-emerald-800 font-medium">Berat Hasil:</div>
                          <div className="text-base font-bold text-emerald-950 font-mono tabular-nums">
                            {formatNumberID(beratOrganik, 1)} kg
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Anorganik Card */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          SAMPAH ANORGANIK (TONG KUNING)
                        </span>
                        <span className="text-xs font-medium text-amber-700">
                          Densitas: {densitasAnorganik} kg/m³
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ketinggian Sampah (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={ketinggianAnorganikCm}
                          onChange={e => setKetinggianAnorganikCm(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-mono"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Densitas Standar (kg/m³)
                        </label>
                        <input
                          type="number"
                          value={densitasAnorganik}
                          onChange={e => setDensitasAnorganik(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs border border-amber-200 rounded-md bg-white/80 font-mono"
                        />
                      </div>

                      <div className="pt-2 border-t border-amber-200/80 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-amber-100/70 rounded-md">
                          <div className="text-amber-800 font-medium">Volume:</div>
                          <div className="text-base font-bold text-amber-950 font-mono tabular-nums">
                            {formatNumberID(volAnorganik, 2)} m³
                          </div>
                        </div>
                        <div className="p-2 bg-amber-200/60 rounded-md">
                          <div className="text-amber-800 font-medium">Berat Hasil:</div>
                          <div className="text-base font-bold text-amber-950 font-mono tabular-nums">
                            {formatNumberID(beratAnorganik, 1)} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Combined Calculation Strip for Bak */}
                  <div className="p-3 bg-emerald-950 text-white rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-200">
                        Total Pengangkutan Hari Ini (Metode Bak):
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-mono tabular-nums">
                      <span>
                        Total Volume:{' '}
                        <strong className="text-white">
                          {formatNumberID(totalVolumeBak, 2)} m³
                        </strong>
                      </span>
                      <span>
                        Total Berat:{' '}
                        <strong className="text-emerald-400">
                          {formatNumberID(totalBeratBak, 1)} kg
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shared Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Catatan / Kondisi Kegiatan
            </label>
            <input
              type="text"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder={
                sumberSampah === 'Clean-up Pantai'
                  ? 'Contoh: Clean-up pantai bersama Karang Taruna & pelajar, cuaca cerah'
                  : metodeUkur === 'karung'
                  ? 'Contoh: Sampah warga diangkut menggunakan karung ukuran 50kg'
                  : 'Contoh: Kondisi cuaca hujan, pengangkutan selesai pukul 11:30'
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                sumberSampah === 'Clean-up Pantai'
                  ? 'bg-cyan-700 hover:bg-cyan-800'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              <Check className="w-4 h-4" />
              Simpan {sumberSampah === 'Clean-up Pantai' ? 'Data Clean-up' : 'Transaksi Ritase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
