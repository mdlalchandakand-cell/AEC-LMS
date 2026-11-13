import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, Search, UserRound, UserX, UserCheck, Pencil, X } from 'lucide-react';
import { accountApi } from '../../services/accountApi';
import { apiClient } from '../../services/apiClient';
import { UserRole } from '../../types/lms';

type ManagedUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  branch_id: number | null;
  is_active: number | boolean;
  created_at: string;
  last_login_at: string | null;
  email_verified_at?: string | null;
};

type UserForm = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branch_id: string;
  password: string;
};

const emptyForm: UserForm = {
  name: '', email: '', phone: '', role: 'student', branch_id: '', password: '',
};

const roles: UserRole[] = [
  'admin', 'branch_manager', 'teacher', 'assistant_teacher',
  'accountant', 'student', 'guardian', 'support_staff',
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [branches, setBranches] = useState<Array<{id:number;name:string;code:string;is_active:number}>>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await apiClient.users.getAll(query, 100);
    if (result.success && Array.isArray(result.data)) {
      setUsers(result.data as ManagedUser[]);
    } else {
      setError(result.error || 'Unable to load users. Please sign in with an administrator account.');
    }
    setLoading(false);
  }, [query]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    let active = true;
    apiClient.branches.getAll().then(result => {
      if (active && result.success && Array.isArray(result.data)) {
        setBranches((result.data as Array<Record<string, unknown>>).map(row => ({
          id: Number(row.id), name: String(row.name || ''), code: String(row.code || ''), is_active: Number(row.is_active),
        })));
      }
    });
    return () => { active = false; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  };

  const openEdit = (user: ManagedUser) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      branch_id: user.branch_id ? String(user.branch_id) : '',
      password: '',
    });
    setShowForm(true);
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      branch_id: form.branch_id.trim() ? Number(form.branch_id) : null,
      ...(form.password ? { password: form.password } : {}),
    };
    const result = editingId
      ? await apiClient.users.update(editingId, payload)
      : await apiClient.users.create({ ...payload, password: form.password });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'The user could not be saved.');
      return;
    }
    setShowForm(false);
    setNotice(editingId ? 'User updated successfully.' : 'User created successfully.');
    await loadUsers();
  };

  const deactivate = async (user: ManagedUser) => {
    if (!window.confirm(`Deactivate ${user.name}? Their account will no longer be able to sign in.`)) return;
    setError('');
    const result = await apiClient.users.deactivate(user.id);
    if (!result.success) {
      setError(result.error || 'The account could not be deactivated.');
      return;
    }
    setNotice(`${user.name} has been deactivated.`);
    await loadUsers();
  };

  const activate = async (user: ManagedUser) => {
    if (!user.email_verified_at) {
      setError('This student must verify their email before an administrator can activate the account.');
      return;
    }
    setError('');
    const session = await apiClient.auth.me();
    const csrf = session.data?.csrf_token;
    if (!session.success || !csrf) {
      setError(session.error || 'Your session expired. Sign in again.');
      return;
    }
    const result = await accountApi.adminActivate(user.id, csrf);
    if (!result.success) {
      setError(result.error || 'The account could not be activated.');
      return;
    }
    setNotice(`${user.name} has been activated.`);
    await loadUsers();
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User Management</h2>
          <p className="mt-1 text-xs text-slate-500">Manage staff, teachers, students and account access using the PHP backend.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadUsers()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}

      {showForm && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{editingId ? 'Edit User' : 'Create User'}</h3>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs font-semibold text-slate-600">Full name
              <input required maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">Email
              <input required type="email" maxLength={190} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">Phone
              <input maxLength={32} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">Role
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                {roles.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">Assigned branch
              <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                <option value="">No branch / Global</option>
                {branches.map(branch => <option key={branch.id} value={String(branch.id)} disabled={branch.is_active !== 1}>
                  {branch.name} ({branch.code}){branch.is_active === 1 ? '' : ' — Inactive'}
                </option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">{editingId ? 'New password (optional)' : 'Password (minimum 12 characters)'}
              <input required={!editingId} minLength={12} type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
            </label>
          </div>
          <p className="text-[11px] text-slate-500">Administrator role changes are restricted by the backend. Branch-scoped permissions are not enabled yet.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save User'}</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email or phone…" className="w-full bg-transparent text-xs outline-none" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading users…</td></tr>
                : users.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No users found.</td></tr>
                : users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" /><div><div className="font-semibold text-slate-900">{user.name}</div><div className="text-[11px] text-slate-500">{user.email}{user.phone ? ` · ${user.phone}` : ''}</div></div></div></td>
                    <td className="px-4 py-3 capitalize text-slate-700">{user.role.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600">{user.branch_id ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-slate-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(user)} title="Edit user" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                      {Boolean(user.is_active) ? <button onClick={() => void deactivate(user)} title="Deactivate user" className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50"><UserX className="h-3.5 w-3.5" /></button> : <button onClick={() => void activate(user)} title="Activate verified account" className="rounded-lg border border-emerald-100 p-2 text-emerald-700 hover:bg-emerald-50"><UserCheck className="h-3.5 w-3.5" /></button>}
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
