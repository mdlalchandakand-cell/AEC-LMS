import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck, Search, RefreshCw, FileText, Layers, BookOpen, AlertCircle } from 'lucide-react';

type RecycleItem = {
  id: number; entity_type: string; entity_id: number; title: string;
  deleted_by: string; deleted_at: string; expires_at: string;
  retention_days_left: number; purge_error?: string | null; branch_id?: number | null;
};

const typeLabel: Record<string, string> = {
  course: 'Course', content: 'Learning content', batch: 'Batch', exam: 'Exam',
  cms_post: 'Website post / notice', cms_testimonial: 'Student testimonial',
};
const dateText = (value: unknown) => value ? new Date(String(value).replace(' ', 'T')).toLocaleString() : '—';

export const RecycleBinManager: React.FC = () => {
  const { language } = useLms();
  const isBn = language === 'bn';
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedItem, setSelectedItem] = useState<RecycleItem | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    const result = await apiClient.recycleBin.getAll();
    if (result.success && Array.isArray(result.data)) setItems(result.data as RecycleItem[]);
    else setError(result.error || 'Could not load the recycle bin.');
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredItems = useMemo(() => items.filter(item => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || item.title.toLowerCase().includes(query) || String(item.deleted_by || '').toLowerCase().includes(query);
    return matchesSearch && (filterType === 'all' || item.entity_type === filterType);
  }), [items, searchQuery, filterType]);

  const restoreItem = async (item: RecycleItem) => {
    setBusyId(item.id); setError(''); setNotice('');
    const result = await apiClient.recycleBin.restore(item.id);
    if (result.success) {
      setNotice(isBn ? `“${item.title}” পুনরুদ্ধার করা হয়েছে।` : `“${item.title}” restored successfully.`);
      await refresh();
    } else setError(result.error || 'Restore failed.');
    setBusyId(null);
  };

  const permanentlyDelete = async () => {
    if (!selectedItem) return;
    const item = selectedItem;
    setBusyId(item.id); setError(''); setNotice('');
    const result = await apiClient.recycleBin.permanentDelete(item.id);
    if (result.success) {
      setNotice(isBn ? 'রেকর্ডটি স্থায়ীভাবে মুছে ফেলা হয়েছে।' : 'Record permanently deleted.');
      setSelectedItem(null); await refresh();
    } else setError(result.error || 'Permanent deletion was blocked.');
    setBusyId(null);
  };

  const emptyAll = async () => {
    if (!window.confirm(isBn ? 'রিসাইকেল বিনের সব নিরাপদে মুছে ফেলা যায় এমন রেকর্ড স্থায়ীভাবে মুছবেন?' : 'Permanently delete all recycle-bin records that have no linked history?')) return;
    setEmptying(true); setError(''); setNotice('');
    const result = await apiClient.recycleBin.empty();
    if (result.success && result.data) {
      const blocked = result.data.blocked || [];
      setNotice(isBn
        ? `${result.data.purged}টি রেকর্ড মুছে ফেলা হয়েছে; ${blocked.length}টি linked history থাকার কারণে রাখা হয়েছে।`
        : `${result.data.purged} record(s) deleted; ${blocked.length} retained because linked history must be preserved.`);
      if (blocked.length) setError(blocked.map(item => `${item.title}: ${item.reason}`).join(' · '));
      await refresh();
    } else setError(result.error || 'Could not empty recycle bin.');
    setEmptying(false);
  };

  const counts = useMemo(() => ({
    all: items.length,
    course: items.filter(x => x.entity_type === 'course').length,
    content: items.filter(x => x.entity_type === 'content').length,
    batch: items.filter(x => x.entity_type === 'batch').length,
    exam: items.filter(x => x.entity_type === 'exam').length,
    cms: items.filter(x => ['cms_post','cms_testimonial'].includes(x.entity_type)).length,
  }), [items]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-700 text-[10px] font-bold uppercase tracking-wider"><ShieldCheck className="w-4 h-4" />{isBn ? 'নিরাপদ ডিলিট ম্যানেজমেন্ট' : 'Persistent deletion management'}</div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">{isBn ? 'রিসাইকেল বিন' : 'Recycle Bin'}</h2>
          <p className="text-xs text-slate-500 mt-1">{isBn ? 'ডিলিট করা রেকর্ড ৩০ দিন রাখা হয়। সম্পর্কিত হিস্ট্রি থাকলে স্থায়ী ডিলিট বন্ধ থাকবে।' : 'Deleted records are retained for 30 days. Permanent deletion is blocked when linked academic or payment history must be preserved.'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void refresh()} className="p-2.5 rounded-xl border border-slate-200 text-slate-600" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => void emptyAll()} disabled={emptying || items.length === 0} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Trash2 className="w-4 h-4" />{emptying ? 'Working…' : (isBn ? 'নিরাপদে সব খালি করুন' : 'Empty eligible items')}</button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{notice}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key:'all', label:isBn?'সব রেকর্ড':'All items', value:counts.all, icon:Layers },
          { key:'course', label:isBn?'কোর্স':'Courses', value:counts.course, icon:BookOpen },
          { key:'content', label:isBn?'কনটেন্ট':'Content', value:counts.content, icon:FileText },
          { key:'batch', label:isBn?'ব্যাচ':'Batches', value:counts.batch, icon:Layers },
          { key:'exam', label:isBn?'পরীক্ষা':'Exams', value:counts.exam, icon:FileText },
          { key:'cms', label:isBn?'ওয়েবসাইট':'Website', value:counts.cms, icon:FileText },
        ].map(card => <button key={card.key} onClick={() => setFilterType(card.key === 'cms' ? 'cms_post' : card.key)} className={`bg-white rounded-xl border p-4 text-left ${(filterType === card.key || (card.key === 'cms' && ['cms_post','cms_testimonial'].includes(filterType))) ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'}`}><card.icon className="w-4 h-4 text-slate-500" /><div className="text-xl font-extrabold mt-2">{card.value}</div><div className="text-[10px] text-slate-500">{card.label}</div></button>)}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isBn ? 'নাম বা ডিলিটকারী দিয়ে খুঁজুন…' : 'Search by title or deleted by…'} className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs" /></div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs"><option value="all">All types</option><option value="course">Courses</option><option value="content">Learning content</option><option value="batch">Batches</option><option value="exam">Exams</option><option value="cms_post">Website posts</option><option value="cms_testimonial">Testimonials</option></select>
        </div>

        {loading ? <div className="p-8 text-center text-xs text-slate-500">Loading recycle bin…</div> : filteredItems.length === 0 ? <div className="p-10 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="text-sm font-bold text-slate-700">{isBn ? 'রিসাইকেল বিন খালি' : 'Recycle bin is empty'}</p><p className="text-xs text-slate-500 mt-1">{isBn ? 'কোনো মুছে ফেলা রেকর্ড নেই।' : 'No deleted records match this filter.'}</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]"><tr><th className="p-3">Record</th><th className="p-3">Type</th><th className="p-3">Deleted by</th><th className="p-3">Deleted at</th><th className="p-3">Retention</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredItems.map(item => <tr key={item.id}>
              <td className="p-3"><div className="font-bold text-slate-900">{item.title}</div><div className="text-[10px] text-slate-400">ID #{item.entity_id}</div>{item.purge_error && <div className="mt-1 text-[10px] text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{item.purge_error}</div>}</td>
              <td className="p-3">{typeLabel[item.entity_type] || item.entity_type}</td>
              <td className="p-3">{item.deleted_by || '—'}</td>
              <td className="p-3">{dateText(item.deleted_at)}</td>
              <td className="p-3"><span className={item.retention_days_left <= 3 ? 'text-rose-700 font-bold' : 'text-slate-600'}>{item.retention_days_left} day(s) left</span></td>
              <td className="p-3"><div className="flex justify-end gap-2"><button disabled={busyId === item.id} onClick={() => void restoreItem(item)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold disabled:opacity-50 flex items-center gap-1"><RotateCcw className="w-3 h-3" />Restore</button><button disabled={busyId === item.id} onClick={() => setSelectedItem(item)} className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold disabled:opacity-50"><Trash2 className="w-3 h-3" /></button></div></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>

      {selectedItem && <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4"><div className="flex items-center gap-2 text-rose-700"><AlertTriangle className="w-5 h-5" /><h3 className="font-bold">{isBn ? 'স্থায়ীভাবে মুছে ফেলবেন?' : 'Permanently delete this record?'}</h3></div><p className="text-xs text-slate-600">“{selectedItem.title}” {isBn ? 'পুনরুদ্ধার করা যাবে না। সংযুক্ত রেকর্ড থাকলে সার্ভার ডিলিট বন্ধ করবে।' : 'cannot be restored. The server will block deletion if linked records or history still exist.'}</p><div className="flex justify-end gap-2"><button onClick={() => setSelectedItem(null)} className="px-4 py-2 rounded-lg border text-xs font-bold">Cancel</button><button disabled={busyId === selectedItem.id} onClick={() => void permanentlyDelete()} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold disabled:opacity-50">Permanently delete</button></div></div></div>}
    </div>
  );
};
