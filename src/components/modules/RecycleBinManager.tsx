import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, RefreshCw, RotateCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';

type RecycleItem = {
  id: number;
  entity_type: 'course' | 'content' | 'batch' | 'exam' | 'cms_post' | 'cms_testimonial' | string;
  entity_id: number;
  title: string;
  branch_id: number | null;
  status: 'active' | 'restored' | 'purged';
  deleted_at: string;
  expires_at: string;
  purge_error: string | null;
  deleted_by: string;
  retention_days_left: number;
  can_restore: boolean | number | string;
  can_purge: boolean | number | string;
};

const canRestoreItem = (item: RecycleItem) => Number(item.can_restore) === 1;
const canPurgeItem = (item: RecycleItem) => Number(item.can_purge) === 1;

const typeLabel = (type: string, isBn: boolean) => {
  const labels: Record<string, [string, string]> = {
    course: ['Course', 'কোর্স'],
    content: ['Content', 'কনটেন্ট'],
    batch: ['Batch', 'ব্যাচ'],
    exam: ['Exam', 'পরীক্ষা'],
    cms_post: ['CMS post', 'ব্লগ পোস্ট'],
    cms_testimonial: ['Testimonial', 'টেস্টিমোনিয়াল'],
  };
  return labels[type]?.[isBn ? 1 : 0] || type;
};

const dateText = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

export const RecycleBinManager: React.FC = () => {
  const { currentUser, language } = useLms();
  const isBn = language === 'bn';
  const canManage = ['admin', 'super_admin', 'branch_manager'].includes(currentUser.role);
  const canPurge = ['admin', 'super_admin'].includes(currentUser.role);
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = isLaravelApiEnabled
        ? await laravelApiClient.recycleBin.list()
        : await apiClient.recycleBin.getAll();
      if (!response.success) throw new Error(response.error || response.message || 'Could not load the recycle bin.');
      const rows = isLaravelApiEnabled
        ? (response.data as { items?: unknown[] } | undefined)?.items
        : response.data;
      setItems(Array.isArray(rows) ? rows as RecycleItem[] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : (isBn ? 'রিসাইকেল বিন লোড করা যায়নি।' : 'Could not load the recycle bin.'));
    } finally {
      setLoading(false);
    }
  }, [isBn]);

  useEffect(() => { void load(); }, [load]);

  const filteredItems = useMemo(() => items.filter(item => {
    const matchesType = filterType === 'all' || item.entity_type === filterType;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || item.title.toLowerCase().includes(query) || String(item.deleted_by || '').toLowerCase().includes(query);
    return matchesType && matchesSearch;
  }), [items, filterType, searchQuery]);

  const expiredCount = items.filter(item => canPurgeItem(item)).length;

  const restoreItem = async (item: RecycleItem) => {
    if (!canRestoreItem(item)) {
      setError(isBn ? '৩০ দিনের মেয়াদ শেষ; আইটেমটি আর রিস্টোর করা যাবে না।' : 'The 30-day retention period has expired; this item cannot be restored.');
      return;
    }
    if (!window.confirm(isBn ? 'এই আইটেমটি রিস্টোর করবেন?' : 'Restore this item?')) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = isLaravelApiEnabled
        ? await laravelApiClient.recycleBin.restore(item.id)
        : await apiClient.recycleBin.restore(item.id);
      if (!response.success) throw new Error(response.error || response.message || 'Restore failed.');
      setSuccess(isBn ? 'আইটেমটি রিস্টোর হয়েছে।' : 'Item restored.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (isBn ? 'রিস্টোর করা যায়নি।' : 'Restore failed.'));
    } finally { setBusy(false); }
  };

  const purgeItem = async (item: RecycleItem) => {
    if (!canPurge || !canPurgeItem(item)) return;
    if (!window.confirm(isBn ? '৩০ দিনের মেয়াদ শেষ। স্থায়ীভাবে মুছে ফেলবেন?' : 'The retention period has expired. Permanently delete this item?')) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = isLaravelApiEnabled
        ? await laravelApiClient.recycleBin.permanentlyDelete(item.id)
        : await apiClient.recycleBin.permanentDelete(item.id);
      if (!response.success) throw new Error(response.error || response.message || 'Permanent deletion failed.');
      setSuccess(isBn ? 'আইটেমটি স্থায়ীভাবে মুছে ফেলা হয়েছে।' : 'Item permanently deleted.');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : (isBn ? 'স্থায়ীভাবে মুছতে ব্যর্থ।' : 'Permanent deletion failed.');
      await load();
      setError(message);
    } finally { setBusy(false); }
  };

  const purgeExpired = async () => {
    if (!canPurge || expiredCount === 0) return;
    if (!window.confirm(isBn ? 'শুধু ৩০ দিনের মেয়াদ শেষ হওয়া আইটেমগুলো মুছবেন? লিঙ্কযুক্ত রেকর্ড রাখা হবে।' : 'Purge only items past the 30-day retention period? Items with linked history will be kept.')) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await apiClient.recycleBin.purgeExpired();
      if (!response.success || !response.data) throw new Error(response.error || response.message || 'Expired items could not be purged.');
      const { purged, blocked: blockedItems } = response.data;
      const blocked = Array.isArray(blockedItems) ? blockedItems.length : 0;
      setSuccess(isBn
        ? `${purged}টি মুছে ফেলা হয়েছে; ${blocked}টি লিঙ্কযুক্ত রেকর্ডের কারণে রাখা হয়েছে।`
        : `${purged} purged; ${blocked} retained because linked records remain.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (isBn ? 'মেয়াদোত্তীর্ণ আইটেম পরিষ্কার করা যায়নি।' : 'Expired items could not be purged.'));
    } finally { setBusy(false); }
  };

  if (!canManage) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{isBn ? 'এই মডিউল ব্যবহারের অনুমতি নেই।' : 'You do not have permission to use the recycle bin.'}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-700">
            <ShieldCheck className="h-4 w-4" />
            {isBn ? 'নিরাপদ রিস্টোর ও ৩০ দিনের সংরক্ষণ' : 'Safe restore and 30-day retention'}
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{isBn ? 'রিসাইকেল বিন' : 'Recycle Bin'}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {isBn ? 'মেয়াদ শেষ হওয়ার আগে রিস্টোর করুন। মেয়াদোত্তীর্ণ আইটেমও লিঙ্কযুক্ত ইতিহাস থাকলে স্থায়ীভাবে মোছা হবে না।' : 'Restore before expiry. Expired items with linked history are retained rather than force-deleted.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={busy || loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </button>
          {canPurge && !isLaravelApiEnabled && (
            <button onClick={() => void purgeExpired()} disabled={busy || expiredCount === 0} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
              <Trash2 className="h-4 w-4" /> {isBn ? 'মেয়াদোত্তীর্ণ আইটেম পরিষ্কার' : 'Purge expired items'} ({expiredCount})
            </button>
          )}
        </div>
      </section>

      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{success}</div>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isBn ? 'নাম বা মুছে ফেলা ব্যক্তির নাম খুঁজুন...' : 'Search by title or deleted by...'} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">{isBn ? 'সব ধরনের' : 'All types'}</option>
          <option value="course">{isBn ? 'কোর্স' : 'Courses'}</option>
          <option value="content">{isBn ? 'কনটেন্ট' : 'Content'}</option>
          <option value="batch">{isBn ? 'ব্যাচ' : 'Batches'}</option>
          <option value="exam">{isBn ? 'পরীক্ষা' : 'Exams'}</option>
          <option value="cms_post">{isBn ? 'ব্লগ পোস্ট' : 'CMS posts'}</option>
          <option value="cms_testimonial">{isBn ? 'টেস্টিমোনিয়াল' : 'Testimonials'}</option>
        </select>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">{isBn ? 'আইটেম' : 'Item'}</th>
                <th className="p-3">{isBn ? 'মুছে ফেলা হয়েছে' : 'Deleted'}</th>
                <th className="p-3">{isBn ? 'মুছে ফেলেছেন' : 'Deleted by'}</th>
                <th className="p-3">{isBn ? 'মেয়াদ' : 'Retention'}</th>
                <th className="p-3">{isBn ? 'অবস্থা' : 'Status'}</th>
                <th className="p-3 text-right">{isBn ? 'কাজ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">{isBn ? 'লোড হচ্ছে...' : 'Loading recycle-bin items...'}</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">{isBn ? 'কোনো আইটেম পাওয়া যায়নি।' : 'No recycle-bin items found.'}</td></tr>
              ) : filteredItems.map(item => {
                const expired = canPurgeItem(item);
                return (
                  <tr key={item.id} className="align-top">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{typeLabel(item.entity_type, isBn)} · #{item.entity_id}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-600">{dateText(item.deleted_at)}</td>
                    <td className="p-3 text-xs text-slate-600">{item.deleted_by || '—'}</td>
                    <td className="p-3">
                      <div className={`inline-flex items-center gap-1 text-xs font-semibold ${expired ? 'text-rose-700' : 'text-emerald-700'}`}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {expired ? (isBn ? 'মেয়াদ শেষ' : 'Expired') : `${item.retention_days_left} ${isBn ? 'দিন বাকি' : 'days left'}`}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{dateText(item.expires_at)}</div>
                    </td>
                    <td className="p-3">
                      {item.purge_error ? (
                        <div className="max-w-[220px] text-xs text-amber-700" title={item.purge_error}>{isBn ? 'লিঙ্কযুক্ত রেকর্ড রাখা হয়েছে' : 'Retained: linked records'}</div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{isBn ? 'সংরক্ষিত' : 'Retained'}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => void restoreItem(item)} disabled={busy || expired} title={expired ? 'Retention expired' : 'Restore'} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-40">
                          <RotateCcw className="h-3.5 w-3.5" /> {isBn ? 'রিস্টোর' : 'Restore'}
                        </button>
                        {canPurge && expired && (
                          <button onClick={() => void purgeItem(item)} disabled={busy} title="Permanently delete" className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-40">
                            <Trash2 className="h-3.5 w-3.5" /> {isBn ? 'মুছুন' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-slate-500">
        <Clock className="mr-1 inline h-3.5 w-3.5" />
        {isBn ? 'স্থায়ীভাবে মুছে ফেলার আগে ৩০ দিন অপেক্ষা করা হয়। অন্য রেকর্ডের সঙ্গে সম্পর্ক থাকলে সেগুলো মুছে ফেলা হবে না।' : 'Permanent deletion is available only after 30 days. Records with linked history are retained.'}
      </p>
    </div>
  );
};
