import React, { useEffect, useState } from 'react';
import { UserRound, Save, LoaderCircle, ShieldCheck } from 'lucide-react';
import { accountApi } from '../../services/accountApi';
import { apiClient } from '../../services/apiClient';

export const ProfileSettings: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    accountApi.getProfile().then(result => {
      if (!active) return;
      if (!result.success || !result.data) { setError(result.error || 'Could not load your profile.'); return; }
      setName(result.data.name || '');
      setEmail(result.data.email || '');
      setPhone(result.data.phone || '');
      setRole(result.data.role || '');
      setVerified(Boolean(result.data.email_verified_at));
    }).catch(() => { if (active) setError('Could not load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    const session = await apiClient.auth.me();
    const csrf = session.data?.csrf_token;
    if (!session.success || !csrf) {
      setSaving(false); setError(session.error || 'Your session expired. Sign in again.'); return;
    }
    const result = await accountApi.updateProfile(name.trim(), phone.trim(), csrf);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Profile update failed.'); return; }
    setNotice('Profile updated successfully.');
  };

  return <section className="mx-auto max-w-2xl space-y-5">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><UserRound className="h-6 w-6"/></div><div><h2 className="text-lg font-bold text-slate-900">My Profile</h2><p className="text-xs text-slate-500">Manage your personal account information.</p></div></div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}
    {loading ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loading profile…</div> : <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block space-y-1 text-xs font-semibold text-slate-700">Full name<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"/></label>
      <label className="block space-y-1 text-xs font-semibold text-slate-700">Email address<input disabled value={email} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal text-slate-500"/></label>
      <label className="block space-y-1 text-xs font-semibold text-slate-700">Phone number<input type="tel" maxLength={32} value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"/></label>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="capitalize text-slate-600">Account role: {role.replace('_', ' ')}</span><span className={verified ? 'text-emerald-700' : 'text-amber-700'}>{verified ? 'Email verified' : 'Email not verified'}</span></div>
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Save profile</button>
    </form>}
    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0"/> Your email and account role cannot be changed from this page. Contact an administrator if those details need correction.</p>
  </section>;
};
