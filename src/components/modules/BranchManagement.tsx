import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, Save, X, Power } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';

type BranchRow = {
  id: number; code: string; name: string; city: string|null; address: string|null;
  phone: string|null; is_active: number; user_count?: number;
};

const emptyForm = { code: '', name: '', city: '', address: '', phone: '' };

export const BranchManagement: React.FC = () => {
  const { currentUser, language } = useLms();
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isBn = language === 'bn';
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<number|null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const result = await apiClient.branches.getAll();
    if (result.success && Array.isArray(result.data)) setBranches(result.data as BranchRow[]);
    else setError(result.error || 'Could not load branch records.');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); setError(''); };
  const startEdit = (branch: BranchRow) => {
    setEditingId(branch.id);
    setForm({ code: branch.code, name: branch.name, city: branch.city || '', address: branch.address || '', phone: branch.phone || '' });
    setShowForm(true); setError('');
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const result = editingId
      ? await apiClient.branches.update(editingId, form)
      : await apiClient.branches.create(form);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not save branch.'); return; }
    setNotice(editingId ? 'Branch updated.' : 'Branch created.');
    setShowForm(false); setEditingId(null); setForm(emptyForm); await load();
  };
  const deactivate = async (branch: BranchRow) => {
    if (!window.confirm(isBn ? 'এই শাখাটি নিষ্ক্রিয় করবেন? পুরোনো রেকর্ড থাকবে।' : 'Deactivate this branch? Existing records will be preserved.')) return;
    setSaving(true); setError(''); setNotice('');
    const result = await apiClient.branches.deactivate(branch.id);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not deactivate branch.'); return; }
    setNotice('Branch deactivated. Existing records were preserved.'); await load();
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Building2 className="h-5 w-5"/></div>
          <div><h2 className="text-lg font-bold text-slate-900">{isBn ? 'শাখা ব্যবস্থাপনা' : 'Branch Management'}</h2>
            <p className="text-xs text-slate-500">{isBn ? 'প্রতিটি শাখার ব্যবহারকারী ও একাডেমিক ডেটা আলাদা রাখা হয়।' : 'Branch-owned records are isolated by server-side authorization.'}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
          {isAdmin && <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Add branch</button>}
        </div>
      </header>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}
      {showForm && isAdmin && <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold">Branch code<input required maxLength={32} pattern="[A-Za-z0-9_-]{2,32}" value={form.code} onChange={e => setForm(v => ({...v,code:e.target.value.toUpperCase()}))} className="w-full rounded-lg border px-3 py-2"/></label>
        <label className="space-y-1 text-xs font-semibold">Branch name<input required maxLength={160} value={form.name} onChange={e => setForm(v => ({...v,name:e.target.value}))} className="w-full rounded-lg border px-3 py-2"/></label>
        <label className="space-y-1 text-xs font-semibold">City<input maxLength={120} value={form.city} onChange={e => setForm(v => ({...v,city:e.target.value}))} className="w-full rounded-lg border px-3 py-2"/></label>
        <label className="space-y-1 text-xs font-semibold">Phone<input maxLength={32} value={form.phone} onChange={e => setForm(v => ({...v,phone:e.target.value}))} className="w-full rounded-lg border px-3 py-2"/></label>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">Address<input maxLength={500} value={form.address} onChange={e => setForm(v => ({...v,address:e.target.value}))} className="w-full rounded-lg border px-3 py-2"/></label>
        <div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save branch'}</button><button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs"><X className="h-4 w-4"/>Cancel</button></div>
      </form>}
      {loading ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading branches…</div>
        : branches.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">No branch has been assigned to this account.</div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{branches.map(branch => <article key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold text-blue-700">{branch.code}</p><h3 className="mt-1 font-bold text-slate-900">{branch.name}</h3></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${Number(branch.is_active) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{Number(branch.is_active) ? 'Active' : 'Inactive'}</span></div>
          <div className="mt-3 space-y-1 text-xs text-slate-600"><p>{branch.city || 'City not set'}</p><p>{branch.address || 'Address not set'}</p><p>{branch.phone || 'Phone not set'}</p>{typeof branch.user_count === 'number' && <p className="pt-2 font-semibold">{branch.user_count} assigned users</p>}</div>
          {isAdmin && Number(branch.is_active) === 1 && <div className="mt-4 flex gap-2 border-t pt-3"><button onClick={() => startEdit(branch)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Edit</button><button disabled={saving} onClick={() => void deactivate(branch)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Power className="h-3.5 w-3.5"/>Deactivate</button></div>}
        </article>)}</div>}
      <p className="text-[11px] text-slate-500">Branch records cannot be hard-deleted. Deactivation preserves historical enrollments, payments, attendance and certificates.</p>
    </section>
  );
};
