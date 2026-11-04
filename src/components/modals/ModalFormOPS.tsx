import React, { useState, useEffect } from 'react';
import { OPSProfile } from '../../types/ops';
import { X, Building2, Check, Sliders, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ops: OPSProfile) => void;
  onRequestDelete?: (ops: OPSProfile) => void;
  editingOPS: OPSProfile | null;
  opsList?: OPSProfile[];
  onSelectEditingOPS?: (ops: OPSProfile) => void;
}

export const ModalFormOPS: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onRequestDelete,
  editingOPS,
  opsList = [],
  onSelectEditingOPS,
}) => {
  const [nama, setNama] = useState<string>('');
  const [kode, setKode] = useState<string>('');
  const [wilayah, setWilayah] = useState<string>('');
  const [ketua, setKetua] = useState<string>('');
  const [bendahara, setBendahara] = useState<string>('');
  const [adminOps, setAdminOps] = useState<string>('');
  const [kepalaPemerintahNegeri, setKepalaPemerintahNegeri] = useState<string>('');
  const [kontak, setKontak] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [metodeUkurDefault, setMetodeUkurDefault] = useState<'bak' | 'karung'>('bak');
  const [panjangBakDefaultCm, setPanjangBakDefaultCm] = useState<number>(190);
  const [lebarBakDefaultCm, setLebarBakDefaultCm] = useState<number>(120);
  const [densitasOrganikDefault, setDensitasOrganikDefault] = useState<number>(320);
  const [densitasAnorganikDefault, setDensitasAnorganikDefault] = useState<number>(127);
  // Karung Defaults
  const [beratRataKarungCampurDefault, setBeratRataKarungCampurDefault] = useState<number>(20);
  const [beratRataKarungOrganikDefault, setBeratRataKarungOrganikDefault] = useState<number>(25);
  const [beratRataKarungAnorganikDefault, setBeratRataKarungAnorganikDefault] = useState<number>(12);
  const [tarifDefault, setTarifDefault] = useState<number>(20000);

  useEffect(() => {
    if (editingOPS) {
      setNama(editingOPS.nama);
      setKode(editingOPS.kode);
      setWilayah(editingOPS.wilayah);
      setKetua(editingOPS.ketua);
      setBendahara(editingOPS.bendahara);
      setAdminOps(editingOPS.adminOps || '');
      setKepalaPemerintahNegeri(editingOPS.kepalaPemerintahNegeri || '');
      setKontak(editingOPS.kontak);
      setAlamat(editingOPS.alamat);
      setMetodeUkurDefault(editingOPS.metodeUkurDefault || 'bak');
      setPanjangBakDefaultCm(editingOPS.panjangBakDefaultCm || 190);
      setLebarBakDefaultCm(editingOPS.lebarBakDefaultCm || 120);
      setDensitasOrganikDefault(editingOPS.densitasOrganikDefault || 320);
      setDensitasAnorganikDefault(editingOPS.densitasAnorganikDefault || 127);
      setBeratRataKarungCampurDefault(editingOPS.beratRataKarungCampurDefault || 20);
      setBeratRataKarungOrganikDefault(editingOPS.beratRataKarungOrganikDefault || 25);
      setBeratRataKarungAnorganikDefault(editingOPS.beratRataKarungAnorganikDefault || 12);
      setTarifDefault(editingOPS.tarifDefault || 20000);
    } else {
      setNama('');
      setKode('');
      setWilayah('');
      setKetua('');
      setBendahara('');
      setAdminOps('');
      setKepalaPemerintahNegeri('');
      setKontak('');
      setAlamat('');
      setMetodeUkurDefault('bak');
      setPanjangBakDefaultCm(190);
      setLebarBakDefaultCm(120);
      setDensitasOrganikDefault(320);
      setDensitasAnorganikDefault(127);
      setBeratRataKarungCampurDefault(20);
      setBeratRataKarungOrganikDefault(25);
      setBeratRataKarungAnorganikDefault(12);
      setTarifDefault(20000);
    }
  }, [editingOPS, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    const payload: OPSProfile = {
      id: editingOPS ? editingOPS.id : 'ops-' + Date.now(),
      nama: nama.trim(),
      kode: kode.trim() || 'OPS-' + Math.floor(10 + Math.random() * 90),
      wilayah: wilayah.trim(),
      ketua: ketua.trim(),
      bendahara: bendahara.trim(),
      adminOps: adminOps.trim(),
      kepalaPemerintahNegeri: kepalaPemerintahNegeri.trim(),
      kontak: kontak.trim(),
      alamat: alamat.trim(),
      metodeUkurDefault,
      panjangBakDefaultCm: Number(panjangBakDefaultCm) || 190,
      lebarBakDefaultCm: Number(lebarBakDefaultCm) || 120,
      densitasOrganikDefault: Number(densitasOrganikDefault) || 320,
      densitasAnorganikDefault: Number(densitasAnorganikDefault) || 127,
      beratRataKarungCampurDefault: Number(beratRataKarungCampurDefault) || 20,
      beratRataKarungOrganikDefault: Number(beratRataKarungOrganikDefault) || 25,
      beratRataKarungAnorganikDefault: Number(beratRataKarungAnorganikDefault) || 12,
      tarifDefault: Number(tarifDefault) || 20000,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white text-emerald-900 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-xs sm:text-base text-emerald-950 truncate">
              {editingOPS ? `Pengaturan Profil: ${editingOPS.nama}` : 'Tambah Organisasi Pengelola Sampah (OPS)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Quick Switcher between registered OPS when editing */}
        {editingOPS && opsList.length > 1 && (
          <div className="px-4 py-2 sm:px-6 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 text-[11px] sm:text-xs shrink-0">
            <span className="font-semibold text-emerald-950 truncate">Pilih OPS:</span>
            <select
              value={editingOPS.id}
              onChange={e => {
                const found = opsList.find(o => o.id === e.target.value);
                if (found && onSelectEditingOPS) {
                  onSelectEditingOPS(found);
                }
              }}
              className="bg-white border border-emerald-300 rounded px-2 py-1 font-bold text-emerald-900 cursor-pointer shadow-2xs text-[11px] sm:text-xs max-w-[65%]"
            >
              {opsList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nama} ({o.kode})
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Organisasi (OPS) *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: OPS Tanah Rata"
                value={nama}
                onChange={e => setNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kode Singkat
              </label>
              <input
                type="text"
                placeholder="OPS-TR"
                value={kode}
                onChange={e => setKode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cakupan Wilayah / Lingkungan Kerja
            </label>
            <input
              type="text"
              placeholder="Contoh: Kelurahan Tanah Rata, RT 01 - 05"
              value={wilayah}
              onChange={e => setWilayah(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Ketua OPS
              </label>
              <input
                type="text"
                placeholder="Nama Ketua OPS"
                value={ketua}
                onChange={e => setKetua(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Admin OPS
              </label>
              <input
                type="text"
                placeholder="Nama Admin OPS"
                value={adminOps}
                onChange={e => setAdminOps(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kepala Pemerintah Negeri
              </label>
              <input
                type="text"
                placeholder="Nama Kepala Pemerintah Negeri"
                value={kepalaPemerintahNegeri}
                onChange={e => setKepalaPemerintahNegeri(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Bendahara OPS
              </label>
              <input
                type="text"
                placeholder="Nama Bendahara"
                value={bendahara}
                onChange={e => setBendahara(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kontak / No. Telepon
              </label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={kontak}
                onChange={e => setKontak(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tarif Iuran Standar (Rp/Bln)
              </label>
              <input
                type="number"
                step="1000"
                value={tarifDefault}
                onChange={e => setTarifDefault(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Technical Specs Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Metode Pengukuran &amp; Parameter Teknis
              </span>
              <span className="text-2xs text-slate-500 font-medium">Standar Acuan OPS</span>
            </div>

            {/* Pilihan Metode Ukur Utama OPS */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Metode Alat Ukur Pengangkutan Utama
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMetodeUkurDefault('bak')}
                  className={`p-2.5 rounded-lg border font-medium flex items-center gap-2 transition-all cursor-pointer ${
                    metodeUkurDefault === 'bak'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">📐</span>
                  <div className="text-left">
                    <div className="leading-tight">Dimensi Bak Truk</div>
                    <div className="text-2xs text-slate-500">P x L x Tinggi (cm)</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodeUkurDefault('karung')}
                  className={`p-2.5 rounded-lg border font-medium flex items-center gap-2 transition-all cursor-pointer ${
                    metodeUkurDefault === 'karung'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">🎒</span>
                  <div className="text-left">
                    <div className="leading-tight">Hitung Jumlah Karung</div>
                    <div className="text-2xs text-slate-500">Campur, Organik, Anorganik</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Standar Berat Rata-rata per Karung */}
            <div className="p-3 bg-white border border-emerald-200 rounded-lg space-y-2">
              <span className="text-xs font-bold text-emerald-900 block">
                🎒 Standar Berat Rata-rata per Karung (Kg/Karung)
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Karung Campur</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={beratRataKarungCampurDefault}
                      onChange={e => setBeratRataKarungCampurDefault(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono pr-7"
                    />
                    <span className="absolute right-2 top-1.5 text-2xs text-slate-400 font-bold">Kg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-emerald-800 font-medium mb-1">Karung Organik</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={beratRataKarungOrganikDefault}
                      onChange={e => setBeratRataKarungOrganikDefault(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-md font-mono text-emerald-900 pr-7"
                    />
                    <span className="absolute right-2 top-1.5 text-2xs text-emerald-600 font-bold">Kg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-amber-800 font-medium mb-1">Karung Anorganik</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={beratRataKarungAnorganikDefault}
                      onChange={e => setBeratRataKarungAnorganikDefault(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md font-mono text-amber-900 pr-7"
                    />
                    <span className="absolute right-2 top-1.5 text-2xs text-amber-600 font-bold">Kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Standar Dimensi Bak & Densitas */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                📐 Parameter Standar Dimensi Bak &amp; Densitas
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Panjang Bak Standar (cm)</label>
                  <input
                    type="number"
                    value={panjangBakDefaultCm}
                    onChange={e => setPanjangBakDefaultCm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Lebar Bak Standar (cm)</label>
                  <input
                    type="number"
                    value={lebarBakDefaultCm}
                    onChange={e => setLebarBakDefaultCm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-800 font-medium mb-1">Densitas Organik (kg/m³)</label>
                  <input
                    type="number"
                    value={densitasOrganikDefault}
                    onChange={e => setDensitasOrganikDefault(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-md bg-white font-mono text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-amber-800 font-medium mb-1">Densitas Anorganik (kg/m³)</label>
                  <input
                    type="number"
                    value={densitasAnorganikDefault}
                    onChange={e => setDensitasAnorganikDefault(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md bg-white font-mono text-amber-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Alamat Sekretariat / TPS 3R
            </label>
            <input
              type="text"
              placeholder="Jl. / RT / Lokasi TPS"
              value={alamat}
              onChange={e => setAlamat(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              {editingOPS && onRequestDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestDelete(editingOPS);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus OPS Ini
                </button>
              )}
            </div>

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
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Simpan OPS
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
