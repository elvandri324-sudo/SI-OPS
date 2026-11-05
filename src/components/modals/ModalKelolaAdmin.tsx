import React, { useState } from 'react';
import { AdminAccount, AdminRole, OPSProfile } from '../../types/ops';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Building2,
  Mail,
  KeyRound,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Phone,
} from 'lucide-react';
import { ModalConfirm } from './ModalConfirm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminAccounts: AdminAccount[];
  currentAdmin: AdminAccount;
  opsList: OPSProfile[];
  onSaveAdmin: (account: AdminAccount) => void;
  onDeleteAdmin: (id: string) => void;
}

export const ModalKelolaAdmin: React.FC<Props> = ({
  isOpen,
  onClose,
  adminAccounts,
  currentAdmin,
  opsList,
  onSaveAdmin,
  onDeleteAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterOPS, setFilterOPS] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AdminAccount | null>(null);

  // Form State
  const [formId, setFormId] = useState<string>('');
  const [formNama, setFormNama] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('admin123');
  const [formRole, setFormRole] = useState<AdminRole>('admin_ops');
  const [formOpsId, setFormOpsId] = useState<string>('ops-tanah-rata');
  const [formKontak, setFormKontak] = useState<string>('');
  const [formAvatarColor, setFormAvatarColor] = useState<string>('#059669');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const colorPalette = [
    '#0f766e', // teal-700
    '#059669', // emerald-600
    '#2563eb', // blue-600
    '#d97706', // amber-600
    '#0891b2', // cyan-600
    '#7c3aed', // violet-600
    '#e11d48', // rose-600
    '#4b5563', // slate-600
  ];

  const handleOpenAdd = () => {
    const firstOps = opsList[0]?.id || 'ops-tanah-rata';
    setFormId(`admin-${Date.now()}`);
    setFormNama('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('admin123');
    setFormRole('admin_ops');
    setFormOpsId(firstOps);
    setFormKontak('');
    setFormAvatarColor('#059669');
    setFormError(null);
    setIsEditing(true);
    setEditingAdmin(null);
  };

  const handleOpenEdit = (account: AdminAccount) => {
    setFormId(account.id);
    setFormNama(account.nama);
    setFormUsername(account.username);
    setFormEmail(account.email);
    setFormPassword(account.password);
    setFormRole(account.role);
    setFormOpsId(account.opsId);
    setFormKontak(account.kontak || '');
    setFormAvatarColor(account.avatarColor || '#059669');
    setFormError(null);
    setIsEditing(true);
    setEditingAdmin(account);
  };

  // Auto-generate username and email recommendation when selecting OPS or name
  const handleOpsChange = (selectedOpsId: string) => {
    setFormOpsId(selectedOpsId);
    const targetOps = opsList.find(o => o.id === selectedOpsId);
    if (!editingAdmin && targetOps) {
      const slug = (targetOps.kode || targetOps.nama).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!formNama) setFormNama(`Admin ${targetOps.nama}`);
      if (!formUsername) setFormUsername(`admin.${slug}`);
      if (!formEmail) setFormEmail(`admin.${slug}@siops.id`);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNama = formNama.trim();
    const cleanUser = formUsername.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanPass = formPassword.trim();

    if (!cleanNama || !cleanUser || !cleanEmail || !cleanPass) {
      setFormError('Semua kolom wajib diisi.');
      return;
    }

    // Check username uniqueness
    const duplicate = adminAccounts.find(
      a => a.id !== formId && (a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanEmail)
    );
    if (duplicate) {
      setFormError(`Username atau Email sudah digunakan oleh "${duplicate.nama}".`);
      return;
    }

    const assignedOps = opsList.find(o => o.id === formOpsId);
    const finalOpsId = formRole === 'superadmin' ? 'all' : formOpsId;
    const updatedAccount: AdminAccount = {
      id: formId,
      nama: cleanNama,
      username: cleanUser,
      email: cleanEmail,
      password: cleanPass,
      role: formRole,
      opsId: finalOpsId,
      opsNama: finalOpsId === 'all' ? 'Semua OPS' : assignedOps?.nama || 'Admin OPS',
      kontak: formKontak.trim() || '-',
      avatarColor: formAvatarColor,
      createdAt: editingAdmin?.createdAt || new Date().toISOString().substring(0, 10),
    };

    onSaveAdmin(updatedAccount);
    setIsEditing(false);
  };

  const filteredAccounts = adminAccounts.filter(acc => {
    const matchesSearch =
      acc.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.opsNama && acc.opsNama.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === 'all' || acc.role === filterRole;
    const matchesOPS = filterOPS === 'all' || acc.opsId === filterOPS;
    return matchesSearch && matchesRole && matchesOPS;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[82dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">Manajemen Akun &amp; Peran Pengguna</h2>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 truncate">
                Kelola hak akses Super Admin, Admin OPS, Petugas Entri Data, dan Pengunjung (Hanya Lihat)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content area: Table or Form */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {isEditing ? (
            /* ========================================================================= */
            /* FORM ADD / EDIT ADMIN ACCOUNT                                             */
            /* ========================================================================= */
            <form onSubmit={handleSaveForm} className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-sm text-slate-900">
                  {editingAdmin ? `Edit Akun: ${editingAdmin.nama}` : 'Tambah Akun Pengguna Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Kembali ke Daftar
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat Peran / Role:
                  </label>
                  <select
                    value={formRole}
                    onChange={e => {
                      const r = e.target.value as AdminRole;
                      setFormRole(r);
                      if (r === 'superadmin') {
                        setFormOpsId('all');
                      } else if (r === 'admin_ops' && formOpsId === 'all') {
                        setFormOpsId(opsList[0]?.id || 'ops-tanah-rata');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold bg-white"
                  >
                    <option value="entri_data">✏️ Petugas Entri Data (Tambah &amp; Edit Data)</option>
                    <option value="admin_ops">🏢 Admin OPS Spesifik (Khusus 1 Wilayah)</option>
                    <option value="superadmin">🌐 Super Admin (Akses Seluruh OPS &amp; Konsolidasi)</option>
                  </select>
                </div>

                {/* Assigned OPS */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ditugaskan ke OPS:
                  </label>
                  {formRole === 'superadmin' ? (
                    <input
                      type="text"
                      disabled
                      value="Semua OPS (Konsolidasi Pusat)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-500 font-semibold"
                    />
                  ) : (
                    <select
                      value={formOpsId}
                      onChange={e => handleOpsChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold bg-white"
                    >
                      {formRole === 'entri_data' && (
                        <option value="all">🌐 Semua OPS (Lintas Wilayah)</option>
                      )}
                      {opsList.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.nama} ({o.kode})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Pengguna:
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={e => setFormNama(e.target.value)}
                    placeholder="Contoh: Petugas Entri Data atau Pengunjung"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login:
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="Contoh: entri.data atau pengunjung"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-semibold"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Pengguna:
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="Contoh: entri@siops.id"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Login:
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Kontak */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Kontak / WhatsApp (Opsional):
                  </label>
                  <input
                    type="text"
                    value={formKontak}
                    onChange={e => setFormKontak(e.target.value)}
                    placeholder="Contoh: 0812-4455-6677"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Warna Avatar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warna Avatar Profil:
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {colorPalette.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormAvatarColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                          formAvatarColor === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingAdmin ? 'Simpan Perubahan' : 'Buat Akun Baru'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================================= */
            /* TABLE LIST OF ALL ADMIN ACCOUNTS                                          */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari pengguna, username, OPS..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-52 bg-white"
                    />
                  </div>

                  <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-medium bg-white text-slate-700"
                  >
                    <option value="all">Semua Peran</option>
                    <option value="superadmin">Super Admin</option>
                    <option value="admin_ops">Admin OPS</option>
                    <option value="entri_data">Petugas Entri Data</option>
                  </select>

                  <select
                    value={filterOPS}
                    onChange={e => setFilterOPS(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-medium bg-white text-slate-700"
                  >
                    <option value="all">Semua OPS</option>
                    {opsList.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Akun Baru</span>
                </button>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10 border-r border-slate-200">No</th>
                      <th className="px-4 py-2.5 border-r border-slate-200">Nama Pengguna</th>
                      <th className="px-4 py-2.5 border-r border-slate-200">Username &amp; Email</th>
                      <th className="px-4 py-2.5 border-r border-slate-200">Unit OPS Ditugaskan</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-200">Peran</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-200">Sandi</th>
                      <th className="px-3 py-2.5 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada akun pengguna yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((acc, idx) => {
                        const isCurrent = acc.id === currentAdmin.id;
                        const initials = acc.nama
                          .split(' ')
                          .map(w => w[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();

                        return (
                          <tr
                            key={acc.id}
                            className={`transition-colors ${isCurrent ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-3 py-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 border-r border-slate-200">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-extrabold text-[10px] shrink-0"
                                  style={{ backgroundColor: acc.avatarColor || '#059669' }}
                                >
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate">{acc.nama}</span>
                                    {isCurrent && (
                                      <span className="px-1.5 py-0.2 rounded-xs bg-emerald-600 text-white font-bold text-[9px]">
                                        Anda
                                      </span>
                                    )}
                                  </div>
                                  {acc.kontak && acc.kontak !== '-' && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {acc.kontak}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-700 border-r border-slate-200">
                              <div className="font-bold text-slate-900">@{acc.username}</div>
                              <div className="text-[11px] text-slate-500">{acc.email}</div>
                            </td>
                            <td className="px-4 py-2.5 border-r border-slate-200">
                              {acc.opsId === 'all' ? (
                                <span className="font-bold text-teal-800">
                                  🌐 Seluruh Wilayah OPS
                                </span>
                              ) : (
                                <span className="font-bold text-slate-900">
                                  🏢 {acc.opsNama || opsList.find(o => o.id === acc.opsId)?.nama || acc.opsId}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-slate-200">
                              {acc.role === 'superadmin' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                  Super Admin
                                </span>
                              )}
                              {acc.role === 'admin_ops' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Admin OPS
                                </span>
                              )}
                              {acc.role === 'entri_data' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                                  ✏️ Entri Data
                                </span>
                              )}
                              {acc.role === 'viewer' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                  👁️ Hanya Lihat
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-slate-600 border-r border-slate-200">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                                {acc.password}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(acc)}
                                  className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm cursor-pointer"
                                  title="Edit Akun"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAccountToDelete(acc)}
                                  disabled={acc.role === 'superadmin' && adminAccounts.filter(a => a.role === 'superadmin').length <= 1}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={
                                    acc.role === 'superadmin' && adminAccounts.filter(a => a.role === 'superadmin').length <= 1
                                      ? 'Tidak dapat menghapus superadmin utama'
                                      : 'Hapus Akun'
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            Total {adminAccounts.length} akun administrator terdaftar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Delete Dialog */}
      <ModalConfirm
        isOpen={Boolean(accountToDelete)}
        title="Hapus Akun Admin OPS"
        message={
          accountToDelete ? (
            <div>
              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menghapus akun admin <strong className="text-slate-900">{accountToDelete.nama}</strong> (@{accountToDelete.username})?
              </p>
              <p className="text-xs text-rose-600 mt-2 font-medium">
                Tindakan ini akan menghapus akses login untuk admin ini dari sistem.
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Akun"
        onConfirm={() => {
          if (accountToDelete) {
            onDeleteAdmin(accountToDelete.id);
            setAccountToDelete(null);
          }
        }}
        onCancel={() => setAccountToDelete(null)}
      />
    </div>
  );
};
