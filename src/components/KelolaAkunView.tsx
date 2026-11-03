import React, { useState } from 'react';
import {
  AdminAccount,
  AdminRole,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_DESCRIPTIONS,
  OPSProfile,
} from '../types/ops';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileEdit,
  Building2,
  LogIn,
  Sparkles,
  Lock,
} from 'lucide-react';
import { ModalConfirm } from './modals/ModalConfirm';

interface Props {
  adminAccounts: AdminAccount[];
  currentAdmin: AdminAccount;
  opsList: OPSProfile[];
  onSaveAdmin: (account: AdminAccount) => void;
  onDeleteAdmin: (id: string) => void;
  onSelectAdmin: (adminId: string) => void;
}

export const KelolaAkunView: React.FC<Props> = ({
  adminAccounts,
  currentAdmin,
  opsList,
  onSaveAdmin,
  onDeleteAdmin,
  onSelectAdmin,
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
  const [formRole, setFormRole] = useState<AdminRole>('entri_data');
  const [formOpsId, setFormOpsId] = useState<string>('ops-tanah-rata');
  const [formKontak, setFormKontak] = useState<string>('');
  const [formAvatarColor, setFormAvatarColor] = useState<string>('#7c3aed');
  const [formError, setFormError] = useState<string | null>(null);

  const isReadOnlyUser = currentAdmin.role === 'viewer';

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

  const handleOpenAdd = (defaultRole: AdminRole = 'entri_data') => {
    const firstOps = opsList[0]?.id || 'ops-tanah-rata';
    setFormId(`admin-${Date.now()}`);
    setFormNama('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('admin123');
    setFormRole(defaultRole);
    setFormOpsId(defaultRole === 'superadmin' || defaultRole === 'viewer' ? 'all' : firstOps);
    setFormKontak('');
    setFormAvatarColor(
      defaultRole === 'superadmin'
        ? '#0f766e'
        : defaultRole === 'admin_ops'
        ? '#059669'
        : defaultRole === 'entri_data'
        ? '#7c3aed'
        : '#4b5563'
    );
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

  const handleOpsChange = (selectedOpsId: string) => {
    setFormOpsId(selectedOpsId);
    const targetOps = opsList.find(o => o.id === selectedOpsId);
    if (!editingAdmin && targetOps) {
      const slug = (targetOps.kode || targetOps.nama).toLowerCase().replace(/[^a-z0-9]/g, '');
      const prefix =
        formRole === 'entri_data' ? 'entri' : formRole === 'viewer' ? 'lihat' : 'admin';
      const labelPrefix =
        formRole === 'entri_data'
          ? 'Petugas Entri'
          : formRole === 'viewer'
          ? 'Pengamat'
          : 'Admin';
      if (!formNama) setFormNama(`${labelPrefix} ${targetOps.nama}`);
      if (!formUsername) setFormUsername(`${prefix}.${slug}`);
      if (!formEmail) setFormEmail(`${prefix}.${slug}@siops.id`);
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

    const duplicate = adminAccounts.find(
      a =>
        a.id !== formId &&
        (a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanEmail)
    );
    if (duplicate) {
      setFormError(`Username atau Email sudah digunakan oleh "${duplicate.nama}".`);
      return;
    }

    const assignedOps = opsList.find(o => o.id === formOpsId);
    const finalOpsId = formRole === 'superadmin' ? 'all' : formOpsId;
    const finalOpsNama =
      finalOpsId === 'all'
        ? 'Semua OPS (Gabungan)'
        : assignedOps?.nama || 'Wilayah OPS';

    const updatedAccount: AdminAccount = {
      id: formId,
      nama: cleanNama,
      username: cleanUser,
      email: cleanEmail,
      password: cleanPass,
      role: formRole,
      opsId: finalOpsId,
      opsNama: finalOpsNama,
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

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
            <ShieldCheck className="w-3 h-3 text-teal-700" />
            <span>Super Admin</span>
          </span>
        );
      case 'admin_ops':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Building2 className="w-3 h-3 text-emerald-700" />
            <span>Admin OPS</span>
          </span>
        );
      case 'entri_data':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-300">
            <FileEdit className="w-3 h-3 text-violet-700" />
            <span>Entri Data</span>
          </span>
        );
      case 'viewer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Eye className="w-3 h-3 text-slate-600" />
            <span>Hanya Lihat</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-xl border border-emerald-700/50 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                Manajemen Pengguna &amp; Peran
              </span>
              <span className="text-xs text-emerald-200">
                {adminAccounts.length} Akun Terdaftar
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-1">
              Kelola Akun, Peran Entri Data, &amp; Akses Hanya Lihat
            </h1>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Atur hak akses pengguna berdasarkan peran: Super Admin, Admin Wilayah OPS, Petugas Entri Data, atau Pengamat (Hanya Lihat).
            </p>
          </div>
        </div>

        {!isReadOnlyUser && !isEditing && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAdd('entri_data')}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>+ Akun Entri Data</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdd('viewer')}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>+ Akun Hanya Lihat</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdd('admin_ops')}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Role Permission Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Super Admin */}
        <div
          onClick={() => setFilterRole(filterRole === 'superadmin' ? 'all' : 'superadmin')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterRole === 'superadmin'
              ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-500/40'
              : 'bg-white border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            {getRoleBadge('superadmin')}
            <span className="text-xs font-mono font-bold text-teal-800">
              {adminAccounts.filter(a => a.role === 'superadmin').length} Akun
            </span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-900">Akses Penuh &amp; Konsolidasi</div>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            {ADMIN_ROLE_DESCRIPTIONS.superadmin}
          </p>
        </div>

        {/* Card 2: Admin OPS */}
        <div
          onClick={() => setFilterRole(filterRole === 'admin_ops' ? 'all' : 'admin_ops')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterRole === 'admin_ops'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/40'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            {getRoleBadge('admin_ops')}
            <span className="text-xs font-mono font-bold text-emerald-800">
              {adminAccounts.filter(a => a.role === 'admin_ops').length} Akun
            </span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-900">Pengelola Unit OPS</div>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            {ADMIN_ROLE_DESCRIPTIONS.admin_ops}
          </p>
        </div>

        {/* Card 3: Petugas Entri Data */}
        <div
          onClick={() => setFilterRole(filterRole === 'entri_data' ? 'all' : 'entri_data')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterRole === 'entri_data'
              ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-500/40'
              : 'bg-white border-slate-200 hover:border-violet-300'
          }`}
        >
          <div className="flex items-center justify-between">
            {getRoleBadge('entri_data')}
            <span className="text-xs font-mono font-bold text-violet-800">
              {adminAccounts.filter(a => a.role === 'entri_data').length} Akun
            </span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-900">Peran Entri Data Operasional</div>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            {ADMIN_ROLE_DESCRIPTIONS.entri_data}
          </p>
        </div>

        {/* Card 4: Hanya Lihat (Viewer) */}
        <div
          onClick={() => setFilterRole(filterRole === 'viewer' ? 'all' : 'viewer')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterRole === 'viewer'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/40'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            {getRoleBadge('viewer')}
            <span className="text-xs font-mono font-bold text-slate-700">
              {adminAccounts.filter(a => a.role === 'viewer').length} Akun
            </span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-900">Peran Hanya Bisa Melihat</div>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            {ADMIN_ROLE_DESCRIPTIONS.viewer}
          </p>
        </div>
      </div>

      {/* Main Content Card: Form or Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isEditing ? (
          <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingAdmin ? `Edit Akun: ${editingAdmin.nama}` : 'Buat Akun Pengguna Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih peran sebagai Entri Data, Hanya Lihat, Admin OPS, atau Super Admin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
              >
                Kembali ke Daftar
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Peran Hak Akses (Role) *
                </label>
                <select
                  value={formRole}
                  onChange={e => {
                    const r = e.target.value as AdminRole;
                    setFormRole(r);
                    if (r === 'superadmin') {
                      setFormOpsId('all');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold bg-white text-slate-900"
                >
                  <option value="entri_data">✏️ Petugas Entri Data (Input &amp; Edit Data)</option>
                  <option value="viewer">👁️ Pengamat / Hanya Lihat (Read-Only)</option>
                  <option value="admin_ops">🏢 Admin OPS (Kelola Penuh 1 Wilayah OPS)</option>
                  <option value="superadmin">🌐 Super Admin (Akses Penuh Seluruh OPS)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {ADMIN_ROLE_DESCRIPTIONS[formRole]}
                </p>
              </div>

              {/* Assigned OPS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cakupan Wilayah OPS *
                </label>
                {formRole === 'superadmin' ? (
                  <input
                    type="text"
                    disabled
                    value="🌐 Semua OPS (Konsolidasi Pusat)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-500 font-semibold"
                  />
                ) : (
                  <select
                    value={formOpsId}
                    onChange={e => handleOpsChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold bg-white"
                  >
                    {(formRole === 'entri_data' || formRole === 'viewer') && (
                      <option value="all">🌐 Semua OPS (Seluruh Wilayah)</option>
                    )}
                    {opsList.map(o => (
                      <option key={o.id} value={o.id}>
                        🏢 {o.nama} ({o.kode})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  {formOpsId === 'all'
                    ? 'Dapat memilih & melihat semua unit OPS.'
                    : 'Terkunci khusus pada wilayah OPS yang dipilih.'}
                </p>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pengguna / Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                  placeholder="Contoh: Petugas Entri Tanah Rata"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  placeholder="Contoh: entri.tanahrata"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-semibold"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="Contoh: entri.tr@siops.id"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Login *
                </label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Default: admin123"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Kontak */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. Kontak / WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={formKontak}
                  onChange={e => setFormKontak(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Warna Avatar Profil
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {colorPalette.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormAvatarColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        formAvatarColor === c
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                          : 'opacity-80 hover:opacity-100'
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
                <span>{editingAdmin ? 'Simpan Perubahan Akun' : 'Simpan Akun Baru'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama, username, peran..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56 bg-white"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold bg-white text-slate-700"
                >
                  <option value="all">Semua Peran ({adminAccounts.length})</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="admin_ops">Admin OPS</option>
                  <option value="entri_data">Petugas Entri Data</option>
                  <option value="viewer">Pengamat / Hanya Lihat</option>
                </select>

                <select
                  value={filterOPS}
                  onChange={e => setFilterOPS(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-medium bg-white text-slate-700"
                >
                  <option value="all">Semua Wilayah OPS</option>
                  {opsList.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <span>Akun Aktif:</span>
                <strong className="text-emerald-900">{currentAdmin.nama}</strong>
                {getRoleBadge(currentAdmin.role)}
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-teal-800 text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-center w-10 border-r border-teal-700">No</th>
                    <th className="px-4 py-3 border-r border-teal-700">Nama Pengguna</th>
                    <th className="px-3 py-3 border-r border-teal-700">Username &amp; Sandi</th>
                    <th className="px-3 py-3 text-center border-r border-teal-700">Peran / Hak Akses</th>
                    <th className="px-3 py-3 border-r border-teal-700">Wilayah OPS</th>
                    <th className="px-3 py-3 border-r border-teal-700">Kewenangan</th>
                    <th className="px-3 py-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada akun yang sesuai dengan filter pencarian.
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
                      const opsObj = opsList.find(o => o.id === acc.opsId);

                      return (
                        <tr
                          key={acc.id}
                          className={`transition-colors ${
                            isCurrent ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-3 text-center font-mono text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-200">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-2xs"
                                style={{ backgroundColor: acc.avatarColor || '#059669' }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{acc.nama}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold text-[9px]">
                                      Sedang Digunakan
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-normal">
                                  {acc.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono border-r border-slate-200">
                            <div className="font-bold text-slate-900">@{acc.username}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Sandi: <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-700">{acc.password}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center border-r border-slate-200">
                            {getRoleBadge(acc.role)}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200">
                            {acc.opsId === 'all' ? (
                              <span className="font-bold text-teal-800 text-xs">
                                🌐 Semua OPS
                              </span>
                            ) : (
                              <span className="font-bold text-slate-800 text-xs">
                                🏢 {opsObj ? `${opsObj.nama} (${opsObj.kode})` : acc.opsNama || acc.opsId}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[11px] text-slate-600 border-r border-slate-200 max-w-[220px]">
                            {ADMIN_ROLE_DESCRIPTIONS[acc.role]}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectAdmin(acc.id)}
                                disabled={isCurrent}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                  isCurrent
                                    ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                                title="Gunakan akun ini sekarang"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>{isCurrent ? 'Aktif' : 'Gunakan'}</span>
                              </button>

                              {!isReadOnlyUser && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(acc)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 cursor-pointer"
                                    title="Edit Akun & Peran"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAccountToDelete(acc)}
                                    disabled={
                                      acc.role === 'superadmin' &&
                                      adminAccounts.filter(a => a.role === 'superadmin').length <= 1
                                    }
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Hapus Akun"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
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

      {/* Confirmation Delete Dialog */}
      <ModalConfirm
        isOpen={Boolean(accountToDelete)}
        title="Hapus Akun Pengguna"
        message={
          accountToDelete ? (
            <div>
              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menghapus akun <strong className="text-slate-900">{accountToDelete.nama}</strong> (@{accountToDelete.username}) dengan peran <strong>{ADMIN_ROLE_LABELS[accountToDelete.role]}</strong>?
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
