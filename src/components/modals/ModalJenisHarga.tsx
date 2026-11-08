import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { JenisDaurUlangItem, KategoriDaurUlang } from '../../types/ops';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jenisList: JenisDaurUlangItem[];
  onSave: (items: JenisDaurUlangItem[]) => void;
}

export const ModalJenisHarga: React.FC<Props> = ({
  isOpen,
  onClose,
  jenisList,
  onSave,
}) => {
  const [items, setItems] = useState<JenisDaurUlangItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setItems(JSON.parse(JSON.stringify(jenisList)));
    }
  }, [isOpen, jenisList]);

  if (!isOpen) return null;

  const handleChange = (
    index: number,
    field: keyof JenisDaurUlangItem,
    value: any
  ) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    const newItem: JenisDaurUlangItem = {
      id: `jenis_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      nama: 'Nama jenis baru',
      kategori: 'Plastik',
      hargaAcuanKg: 0,
      ambangJualKg: 0,
      aktif: true,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = items.map(item => ({
      ...item,
      nama: item.nama.trim() || 'Item Daur Ulang',
      hargaAcuanKg: Number(item.hargaAcuanKg) || 0,
      ambangJualKg: Number(item.ambangJualKg) || 0,
    }));
    onSave(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            Jenis daur ulang & harga acuan
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtext description matching screenshot */}
        <div className="px-6 pt-4 pb-2 text-xs text-slate-500 leading-relaxed border-b border-slate-50 shrink-0">
          Harga acuan dipakai untuk perkiraan nilai stok dan terisi otomatis saat mencatat penjualan. Ambang = berat minimal yang layak dijual (0 = tanpa ambang). Petugas tidak melihat harga.
        </div>

        {/* Table content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="form-jenis-harga" onSubmit={handleSubmit}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-2 w-[30%]">Nama</th>
                  <th className="py-2.5 px-2 w-[20%]">Kategori</th>
                  <th className="py-2.5 px-2 w-[22%]">Harga Acuan/Kg (Rp)</th>
                  <th className="py-2.5 px-2 w-[18%]">Ambang Jual (Kg)</th>
                  <th className="py-2.5 px-2 w-[10%] text-center">Aktif</th>
                  <th className="py-2.5 px-1 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Nama */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.nama}
                        onChange={e => handleChange(index, 'nama', e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 font-medium text-slate-900"
                      />
                    </td>

                    {/* Kategori */}
                    <td className="py-2 px-2">
                      <select
                        value={item.kategori}
                        onChange={e =>
                          handleChange(
                            index,
                            'kategori',
                            e.target.value as KategoriDaurUlang
                          )
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 cursor-pointer"
                      >
                        <option value="Plastik">Plastik</option>
                        <option value="Kertas">Kertas</option>
                        <option value="Logam">Logam</option>
                        <option value="Kaca">Kaca</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </td>

                    {/* Harga Acuan/Kg */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.hargaAcuanKg}
                        onChange={e =>
                          handleChange(
                            index,
                            'hargaAcuanKg',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 font-mono text-slate-900"
                      />
                    </td>

                    {/* Ambang Jual (Kg) */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.ambangJualKg}
                        onChange={e =>
                          handleChange(
                            index,
                            'ambangJualKg',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 font-mono text-slate-900"
                      />
                    </td>

                    {/* Aktif */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.aktif}
                        onChange={e =>
                          handleChange(index, 'aktif', e.target.checked)
                        }
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* Delete row */}
                    <td className="py-2 px-1 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus jenis"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </form>

          {/* Add row button matching screenshot */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#0c4a4a] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Baris jenis baru</span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="submit"
            form="form-jenis-harga"
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0c4a4a] hover:bg-[#083535] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Simpan perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
