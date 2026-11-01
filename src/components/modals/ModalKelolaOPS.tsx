import React from 'react';
import { OPSProfile, Pelanggan, TransaksiPengangkutan, TransaksiKas } from '../../types/ops';
import {
  X,
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  MapPin,
  Phone,
  UserCheck,
  Shield,
  Layers,
} from 'lucide-react';
import { formatRupiah, formatNumberID } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  opsList: OPSProfile[];
  activeOPS: OPSProfile;
  onSelectOPS: (id: string) => void;
  onOpenAddOPS: () => void;
  onOpenEditOPS: (ops: OPSProfile) => void;
  onRequestDeleteOPS: (ops: OPSProfile) => void;
  pelangganList: Pelanggan[];
  pengangkutanList: TransaksiPengangkutan[];
  kasList: TransaksiKas[];
}

export const ModalKelolaOPS: React.FC<Props> = ({
  isOpen,
  onClose,
  opsList,
  activeOPS,
  onSelectOPS,
  onOpenAddOPS,
  onOpenEditOPS,
  onRequestDeleteOPS,
  pelangganList,
  pengangkutanList,
  kasList,
}) => {
  if (!isOpen) return null;

  const handleDelete = (ops: OPSProfile) => {
    onRequestDeleteOPS(ops);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-white text-emerald-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-emerald-950">
                Kelola Organisasi Pengelola Sampah (OPS)
              </h3>
              <p className="text-xs text-emerald-700">
                Manajemen data master sumber sampah, pengurus, parameter bak, dan tarif layanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAddOPS();
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah OPS Baru</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-950">
            <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Database Multi-OPS Terintegrasi:</span> Anda dapat menambahkan berbagai unit OPS
              yang melayani wilayah berbeda (misalnya RT, RW, atau dusun). Setiap OPS memiliki parameter bak kendaraan, tarif bulanan,
              serta pembukuan kas masing-masing yang dapat dilihat mandiri atau dikonsolidasi.
            </div>
          </div>

          {/* Cards Grid for OPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opsList.map(ops => {
              const isCurrent = activeOPS.id === ops.id;
              const countPel = pelangganList.filter(p => p.opsId === ops.id).length;
              const activePel = pelangganList.filter(p => p.opsId === ops.id && p.status === 'Aktif').length;
              const countHaul = pengangkutanList.filter(p => p.opsId === ops.id).length;
              const opsKas = kasList.filter(k => k.opsId === ops.id);
              const saldo = opsKas.length > 0 ? opsKas[opsKas.length - 1].saldo || 0 : 0;

              return (
                <div
                  key={ops.id}
                  className={`rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/30 shadow-xs ring-1 ring-emerald-400'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-300">
                            {ops.kode}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Sedang Digunakan
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1.5">
                          {ops.nama}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onClose();
                            onOpenEditOPS(ops);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Pengaturan OPS"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ops)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Hapus OPS"
                          disabled={opsList.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{ops.wilayah || 'Wilayah belum diatur'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Ketua: <strong>{ops.ketua || '-'}</strong> | Bendahara: <strong>{ops.bendahara || '-'}</strong></span>
                      </div>
                      {ops.kontak && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ops.kontak}</span>
                        </div>
                      )}
                    </div>

                    {/* Metrics Summary Badge Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center font-mono text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Pelanggan</span>
                        <span className="font-bold text-slate-800">{activePel}/{countPel} KK</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Rit Sampah</span>
                        <span className="font-bold text-slate-800">{countHaul} Rit</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Saldo Kas</span>
                        <span className="font-bold text-emerald-700">{formatRupiah(saldo, false)}</span>
                      </div>
                    </div>

                    {/* Technical Parameter info */}
                    <div className="mt-2.5 text-[11px] text-slate-500 bg-slate-50/60 p-2 rounded-md flex items-center justify-between">
                      <span>Bak: {ops.panjangBakDefaultCm}×{ops.lebarBakDefaultCm} cm</span>
                      <span>Tarif: {formatRupiah(ops.tarifDefault, false)}/bln</span>
                      <span>Densitas: {ops.densitasOrganikDefault}/{ops.densitasAnorganikDefault}</span>
                    </div>
                  </div>

                  {/* Action Bottom */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenEditOPS(ops);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title={`Edit profil dan parameter ${ops.nama}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit OPS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(ops)}
                        disabled={opsList.length <= 1}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                        title={opsList.length <= 1 ? 'Minimal harus ada 1 OPS di database' : `Hapus ${ops.nama}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    {!isCurrent ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectOPS(ops.id);
                          onClose();
                        }}
                        className="px-3 py-1 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        Pilih &amp; Aktifkan
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Sedang Aktif
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Total {opsList.length} Unit Organisasi Pengelola Sampah terdaftar di database lokal.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
