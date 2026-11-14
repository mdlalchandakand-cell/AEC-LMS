import React, { useCallback, useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';
import { AlertCircle, CheckCircle2, Clock3, Plus, RefreshCw, Wallet, XCircle } from 'lucide-react';

type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';
type ExpenseItem = {
  id: number; category_id: number; category_name: string; category_name_bn?: string | null;
  branch_id: number | null; branch_name?: string | null; title: string; description?: string | null;
  amount: string; expense_date: string; vendor?: string | null; payment_method: string;
  reference?: string | null; paid_reference?: string | null; status: ExpenseStatus;
  rejection_reason?: string | null; created_by_name?: string | null; approved_by_name?: string | null;
  paid_by_name?: string | null; approved_at?: string | null; paid_at?: string | null;
};
type Category = { id: number; name: string; name_bn?: string | null };

export const ExpenseManager: React.FC = () => {
  const { language, currentUser } = useLms();
  const isBn = language === 'bn';
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');

  const load = useCallback(async () => {
    if (!isLaravelApiEnabled) {
      setError(isBn ? 'Laravel API চালু না হওয়া পর্যন্ত এই মডিউল নিরাপদভাবে ব্যবহার করা যাবে না।' : 'This module requires the Laravel API to be enabled and deployed.');
      return;
    }
    setLoading(true);
    setError('');
    const [categoryResult, expenseResult] = await Promise.all([
      laravelApiClient.expenses.categories(),
      laravelApiClient.expenses.list({ status: status === 'all' ? undefined : status, per_page: 100 }),
    ]);
    if (!categoryResult.success || !expenseResult.success) {
      setError(categoryResult.error || expenseResult.error || 'Could not load expenses.');
      setLoading(false);
      return;
    }
    setCategories(categoryResult.data?.items || []);
    setItems((expenseResult.data?.data || []) as ExpenseItem[]);
    setLoading(false);
  }, [isBn, status]);

  useEffect(() => { void load(); }, [load]);

  const createExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    const result = await laravelApiClient.expenses.create({
      category_id: Number(categoryId), title, amount, expense_date: expenseDate,
      vendor: vendor || null, payment_method: paymentMethod, reference: reference || null,
    });
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not save expense.'); return; }
    setTitle(''); setAmount(''); setVendor(''); setReference(''); setShowForm(false);
    setNotice(isBn ? 'ব্যয়ের তথ্য অনুমোদনের জন্য জমা হয়েছে।' : 'Expense submitted for approval.');
    await load();
  };

  const review = async (item: ExpenseItem, decision: 'approved' | 'rejected') => {
    const reason = decision === 'rejected' ? window.prompt(isBn ? 'বাতিলের কারণ লিখুন' : 'Enter rejection reason') : undefined;
    if (decision === 'rejected' && !reason?.trim()) return;
    setSaving(true); setError('');
    const result = await laravelApiClient.expenses.review(item.id, decision, reason || undefined);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not review expense.'); return; }
    setNotice(decision === 'approved' ? (isBn ? 'ব্যয় অনুমোদিত হয়েছে।' : 'Expense approved.') : (isBn ? 'ব্যয় বাতিল হয়েছে।' : 'Expense rejected.'));
    await load();
  };

  const markPaid = async (item: ExpenseItem) => {
    const paidReference = item.payment_method === 'Cash' ? undefined : window.prompt(isBn ? 'পেমেন্ট রেফারেন্স দিন' : 'Enter payment transaction/reference');
    if (item.payment_method !== 'Cash' && !paidReference?.trim()) return;
    setSaving(true); setError('');
    const result = await laravelApiClient.expenses.markPaid(item.id, paidReference || undefined);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not record payment.'); return; }
    setNotice(isBn ? 'পেমেন্ট রেকর্ড হয়েছে।' : 'Payment recorded.');
    await load();
  };

  const remove = async (item: ExpenseItem) => {
    if (!window.confirm(isBn ? 'এই Pending ব্যয়টি মুছে ফেলবেন?' : 'Delete this pending expense?')) return;
    setSaving(true); setError('');
    const result = await laravelApiClient.expenses.remove(item.id);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not delete expense.'); return; }
    setNotice(isBn ? 'ব্যয় মুছে ফেলা হয়েছে।' : 'Expense deleted.');
    await load();
  };

  const money = (value: string) => '৳' + Number(value).toLocaleString(isBn ? 'bn-BD' : 'en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const canManage = ['admin', 'super_admin', 'accountant', 'branch_manager'].includes(currentUser.role);
  const canApprove = ['admin', 'super_admin', 'accountant', 'branch_manager'].includes(currentUser.role);
  const canPay = ['admin', 'super_admin', 'accountant'].includes(currentUser.role);

  if (!isLaravelApiEnabled) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"><strong>{isBn ? 'Laravel API প্রয়োজন' : 'Laravel API required'}</strong><p className="mt-2">{error}</p><p className="mt-2 text-xs">VITE_LARAVEL_API_ENABLED=true and the deployed API URL are required. No local demo data is shown.</p></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div><h2 className="text-lg font-bold text-slate-900">{isBn ? 'ব্যয় ব্যবস্থাপনা' : 'Expense Management'}</h2><p className="mt-1 text-xs text-slate-500">{isBn ? 'শাখাভিত্তিক ব্যয়, অনুমোদন ও পেমেন্ট ট্র্যাকিং' : 'Branch-scoped expenses, approvals and payment tracking'}</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} disabled={loading || saving} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>{canManage && <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />{isBn ? 'নতুন ব্যয়' : 'Add Expense'}</button>}</div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</div>}
      {showForm && <form onSubmit={createExpense} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">{isBn ? 'খরচের শিরোনাম' : 'Expense title'}<input required minLength={2} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal" /></label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">{isBn ? 'ক্যাটাগরি' : 'Category'}<select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal"><option value="">{isBn ? 'নির্বাচন করুন' : 'Select category'}</option>{categories.map(c => <option key={c.id} value={c.id}>{isBn && c.name_bn ? c.name_bn : c.name}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">{isBn ? 'পরিমাণ (BDT)' : 'Amount (BDT)'}<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal" /></label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">{isBn ? 'তারিখ' : 'Expense date'}<input required type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal" /></label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">{isBn ? 'যাকে দেওয়া হবে / বিক্রেতা' : 'Payee / Vendor'}<input maxLength={160} value={vendor} onChange={e => setVendor(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal" /></label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">{isBn ? 'পেমেন্ট পদ্ধতি' : 'Payment method'}<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal">{['Cash','Bank Transfer','bKash','Nagad','Card','Other'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">{isBn ? 'রেফারেন্স / নোট' : 'Reference / note'}<input maxLength={120} value={reference} onChange={e => setReference(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal" /></label>
        <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">{isBn ? 'বাতিল' : 'Cancel'}</button><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? (isBn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…') : (isBn ? 'জমা দিন' : 'Submit Expense')}</button></div>
      </form>}
      <div className="flex flex-wrap items-center gap-2">{['all','pending','approved','rejected','paid'].map(v => <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === v ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{v === 'all' ? (isBn ? 'সব' : 'All') : v}</button>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">{isBn ? 'লোড হচ্ছে…' : 'Loading expenses…'}</div> : items.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">{isBn ? 'কোনো ব্যয়ের তথ্য নেই।' : 'No expenses found.'}</div> : <div className="divide-y divide-slate-100">{items.map(item => <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{item.title}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : item.status === 'rejected' ? 'bg-rose-100 text-rose-700' : item.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></div><p className="mt-1 text-xs text-slate-500">{isBn && item.category_name_bn ? item.category_name_bn : item.category_name} · {item.branch_name || (isBn ? 'কেন্দ্রীয়' : 'Central')} · {item.expense_date} · {item.payment_method}</p><p className="mt-1 text-[11px] text-slate-400">{isBn ? 'দাখিলকারী' : 'Submitted by'}: {item.created_by_name || '—'}{item.approved_by_name ? ' · ' + (isBn ? 'অনুমোদন' : 'Approved by') + ': ' + item.approved_by_name : ''}</p>{item.rejection_reason && <p className="mt-1 text-xs text-rose-600">{item.rejection_reason}</p>}</div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end"><strong className="mr-2 whitespace-nowrap text-sm font-black text-slate-900">{money(item.amount)}</strong>{item.status === 'pending' && canApprove && <><button disabled={saving} onClick={() => void review(item,'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-1 inline h-3 w-3" />{isBn ? 'অনুমোদন' : 'Approve'}</button><button disabled={saving} onClick={() => void review(item,'rejected')} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-600 disabled:opacity-50"><XCircle className="mr-1 inline h-3 w-3" />{isBn ? 'বাতিল' : 'Reject'}</button></>}{item.status === 'approved' && canPay && <button disabled={saving} onClick={() => void markPaid(item)} className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"><Wallet className="mr-1 inline h-3 w-3" />{isBn ? 'পেমেন্ট সম্পন্ন' : 'Mark Paid'}</button>}{item.status === 'pending' && canManage && <button disabled={saving} onClick={() => void remove(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500">{isBn ? 'মুছুন' : 'Delete'}</button>}</div>
        </div>)}</div>}
      </div>
      <p className="text-[11px] text-slate-400"><Clock3 className="mr-1 inline h-3 w-3" />{isBn ? 'Pending ব্যয় অনুমোদনের আগে পরিশোধ করা যায় না; সব পরিবর্তন audit log-এ সংরক্ষিত হয়।' : 'Pending expenses cannot be paid before approval; all changes are audit logged.'}</p>
    </div>
  );
};
