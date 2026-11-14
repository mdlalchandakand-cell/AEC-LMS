import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';
import { RefreshCw, CheckCircle2, Clock, XCircle, Wallet, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';

type Payment = {
  id:number; user_id:number; student_name?:string; student_email?:string; course_id:number; course_title:string;
  amount:string|number; refunded_amount?:string|number; currency:string; payment_method:string; trx_id:string;
  status:'pending'|'verified'|'rejected'|'refunded'; submitted_at:string; rejection_reason?:string|null;
};
type Course = { id:number; title:string; price:string|number };
type Ledger = {
  ledger_id:number; reference:string; transaction_type?:'payment'|'refund'; student_name:string;
  course_title:string; account_name:string; debit:string|number; credit:string|number;
  refund_reference?:string|null; refund_reason?:string|null;
};
type Reconciliation = { balanced:boolean; discrepancies:Array<Record<string,unknown>> };
const money=(v:string|number)=>Number(v||0).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});

export const PaymentApiPanel:React.FC=()=>{
 const [serverRole,setServerRole]=useState(''); const student=serverRole==='student';
 const [payments,setPayments]=useState<Payment[]>([]); const [courses,setCourses]=useState<Course[]>([]); const [ledger,setLedger]=useState<Ledger[]>([]);
 const [reconciliation,setReconciliation]=useState<Reconciliation|null>(null);
 const [courseId,setCourseId]=useState(''); const [amount,setAmount]=useState(''); const [method,setMethod]=useState<'bKash'|'Nagad'|'Bank Transfer'>('bKash'); const [trx,setTrx]=useState(''); const [phone,setPhone]=useState('');
 const [status,setStatus]=useState(''); const [rejectId,setRejectId]=useState<number|null>(null); const [reason,setReason]=useState('');
 const [refundId,setRefundId]=useState<number|null>(null); const [refundAmount,setRefundAmount]=useState(''); const [refundReference,setRefundReference]=useState(''); const [refundReason,setRefundReason]=useState('');
 const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');

 const load=useCallback(async()=>{
  setLoading(true);setError('');
  const session=isLaravelApiEnabled?await laravelApiClient.auth.me():await apiClient.auth.me();
  if(!session.success){setError(session.error||'Please sign in through the secure LMS login first.');setLoading(false);return;}
  const role=(session.data?.user as {role?:string}|undefined)?.role||'';
  setServerRole(role);
  const isStudent=role==='student';
  const p=isLaravelApiEnabled
   ?(isStudent?await laravelApiClient.payments.my(50):await laravelApiClient.payments.list(status,100))
   :(isStudent?await apiClient.payments.getMine():await apiClient.payments.getAll(status));
  const paymentRows=isLaravelApiEnabled?(p.data as {items?:unknown[]}|undefined)?.items:p.data;
  if(p.success&&Array.isArray(paymentRows))setPayments(paymentRows as Payment[]);else setError(p.error||'Could not load payment records. Financial access is restricted to authorized staff.');
  if(isStudent){
   const c=await apiClient.courses.getAll();if(c.success&&Array.isArray(c.data))setCourses(c.data as Course[]);
   setLedger([]);setReconciliation(null);
  } else if(p.success){
   const [l,r]=await Promise.all([
    isLaravelApiEnabled?laravelApiClient.payments.ledger():apiClient.payments.getLedger(),
    isLaravelApiEnabled?laravelApiClient.payments.reconcile():apiClient.payments.reconcile(),
   ]);
   const ledgerRows=isLaravelApiEnabled?(l.data as {items?:unknown[]}|undefined)?.items:l.data;
   if(l.success&&Array.isArray(ledgerRows))setLedger(ledgerRows as Ledger[]);else setError(l.error||'Could not load ledger entries.');
   if(r.success&&r.data)setReconciliation(r.data as Reconciliation);else setError(r.error||'Could not reconcile the ledger.');
  }
  setLoading(false);
 },[status]);
 useEffect(()=>{void load();},[load]);

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();setSaving(true);setError('');
  const payload={course_id:Number(courseId),amount:amount.trim(),method,trx_id:trx.trim(),sender_phone:phone.trim()||undefined};
  const r=isLaravelApiEnabled
   ?await laravelApiClient.payments.submit(payload)
   :await apiClient.payments.submit({...payload,amount:Number(amount)});
  setSaving(false);if(!r.success){setError(r.error||'Payment submission failed.');return;}
  setNotice('Payment submitted for manual verification.');setAmount('');setTrx('');setPhone('');await load();
 };
 const review=async(p:Payment,action:'verify'|'reject')=>{
  setSaving(true);setError('');
  const r=action==='verify'
   ?(isLaravelApiEnabled?await laravelApiClient.payments.verify(p.id):await apiClient.payments.verify(p.id))
   :(isLaravelApiEnabled?await laravelApiClient.payments.reject(p.id,reason.trim()):await apiClient.payments.reject(p.id,reason.trim()));
  setSaving(false);if(!r.success){setError(r.error||'Payment review failed.');return;}
  setNotice(action==='verify'?'Payment verified and balanced ledger entries posted.':'Payment rejected.');
  setRejectId(null);setReason('');await load();
 };
 const openRefund=(p:Payment)=>{
  setRefundId(p.id);
  setRefundAmount(Math.max(0,Number(p.amount)-Number(p.refunded_amount||0)).toFixed(2));
  setRefundReference('');setRefundReason('');setError('');
 };
 const recordRefund=async(e:React.FormEvent)=>{
  e.preventDefault();if(refundId===null)return;
  setSaving(true);setError('');
  const refundPayload={amount:refundAmount,refund_reference:refundReference.trim(),reason:refundReason.trim()};
  const r=isLaravelApiEnabled
   ?await laravelApiClient.payments.refund(refundId,refundPayload)
   :await apiClient.payments.refund(refundId,refundPayload);
  setSaving(false);
  if(!r.success){setError(r.error||'Refund could not be recorded.');return;}
  setNotice(`Refund recorded. Journal: ${r.data?.ledger_reference || 'posted'}; remaining refundable: ৳${money(r.data?.remaining_refundable || '0.00')}.`);
  setRefundId(null);setRefundAmount('');setRefundReference('');setRefundReason('');await load();
 };
 const total=(s:string)=>payments.filter(p=>p.status===s).reduce((n,p)=>n+(s==='verified'?Math.max(0,Number(p.amount)-Number(p.refunded_amount||0)):Number(p.amount)),0);
 const refundedTotal=payments.reduce((n,p)=>n+Number(p.refunded_amount||0),0);

 return <section className="space-y-5">
  <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
   <div><h2 className="text-lg font-bold">{student?'My Payments':'Payments & Accounting Ledger'}</h2><p className="mt-1 text-xs text-slate-500">{student?'Submit transaction details and track verification.':'Review payments, record provider-confirmed refunds and reconcile accounting entries.'}</p></div>
   <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>
  </header>
  {error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
  {notice&&<div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}
  {student?<form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
   <div className="sm:col-span-2 lg:col-span-3"><h3 className="font-bold">Submit course fee payment</h3><p className="text-[11px] text-slate-500">Your payment remains pending until staff confirm the transaction directly with the provider.</p></div>
   <label className="space-y-1 text-xs">Course<select required value={courseId} onChange={e=>setCourseId(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2"><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title} — ৳{money(c.price)}</option>)}</select></label>
   <label className="space-y-1 text-xs">Amount (BDT)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>
   <label className="space-y-1 text-xs">Payment channel<select value={method} onChange={e=>setMethod(e.target.value as typeof method)} className="w-full rounded-lg border bg-white px-3 py-2"><option>bKash</option><option>Nagad</option><option>Bank Transfer</option></select></label>
   <label className="space-y-1 text-xs">Transaction ID<input required maxLength={120} value={trx} onChange={e=>setTrx(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>
   <label className="space-y-1 text-xs">Sender phone (optional)<input maxLength={32} value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>
   <div className="flex items-end"><button disabled={saving||!courseId} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving?'Submitting…':'Submit for verification'}</button></div>
  </form>:<>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Net verified (loaded)</div><div className="mt-1 text-xl font-bold text-emerald-700">৳{money(total('verified'))}</div></div>
    <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Pending (loaded)</div><div className="mt-1 text-xl font-bold text-amber-600">৳{money(total('pending'))}</div></div>
    <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Refunded (loaded)</div><div className="mt-1 text-xl font-bold text-rose-700">৳{money(refundedTotal)}</div></div>
    <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Ledger rows</div><div className="mt-1 text-xl font-bold">{ledger.length}</div></div>
   </div>
   {reconciliation&&<div className={`flex items-start gap-2 rounded-xl border p-4 text-xs ${reconciliation.balanced?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>
    {reconciliation.balanced?<ShieldCheck className="h-4 w-4 shrink-0"/>:<AlertTriangle className="h-4 w-4 shrink-0"/>}
    <div><div className="font-bold">{reconciliation.balanced?'Ledger reconciliation passed':'Ledger discrepancies detected'}</div><p className="mt-1">{reconciliation.balanced?'Every posted payment/refund journal has at least two entries and matching debit/credit totals.':`${reconciliation.discrepancies.length} journal(s) require investigation. No entries were changed automatically.`}</p></div>
   </div>}
  </>}
  <div className="flex items-center gap-2 rounded-xl border bg-white p-3"><span className="text-xs font-semibold">Payment records</span>{!student&&<select value={status} onChange={e=>setStatus(e.target.value)} className="ml-auto rounded-lg border bg-white px-3 py-2 text-xs"><option value="">All statuses</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="refunded">Refunded</option></select>}</div>
  <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>{!student&&<th className="px-3 py-3">Student</th>}<th className="px-3 py-3">Course</th><th className="px-3 py-3">Channel / TrxID</th><th className="px-3 py-3">Amount / Refund</th><th className="px-3 py-3">Status</th>{!student&&<th className="px-3 py-3 text-right">Review</th>}</tr></thead>
   <tbody className="divide-y">{loading?<tr><td colSpan={student?5:6} className="p-8 text-center">Loading…</td></tr>:payments.length===0?<tr><td colSpan={student?5:6} className="p-8 text-center text-slate-500">No payment records found.</td></tr>:payments.map(p=><tr key={p.id}>
    <td className="px-3 py-3">{!student&&<div className="font-semibold">{p.student_name}<div className="text-[10px] text-slate-500">{p.student_email}</div></div>}{student&&p.course_title}</td>
    {!student&&<td className="px-3 py-3">{p.course_title}</td>}
    <td className="px-3 py-3">{p.payment_method}<div className="font-mono text-[10px] text-slate-500">{p.trx_id}</div></td>
    <td className="px-3 py-3 font-semibold">৳{money(p.amount)}{Number(p.refunded_amount||0)>0&&<div className="text-[10px] font-normal text-rose-700">Refunded: ৳{money(p.refunded_amount||0)}</div>}</td>
    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${p.status==='verified'?'bg-emerald-50 text-emerald-700':p.status==='pending'?'bg-amber-50 text-amber-700':p.status==='refunded'?'bg-rose-50 text-rose-700':'bg-slate-100 text-slate-700'}`}>{p.status==='verified'?<CheckCircle2 className="h-3 w-3"/>:p.status==='pending'?<Clock className="h-3 w-3"/>:<XCircle className="h-3 w-3"/>}{p.status}</span>{p.rejection_reason&&<div className="mt-1 text-[10px] text-rose-600">{p.rejection_reason}</div>}</td>
    {!student&&<td className="px-3 py-3 text-right">{p.status==='pending'?<div className="flex justify-end gap-1"><button disabled={saving} onClick={()=>void review(p,'verify')} className="rounded bg-emerald-600 px-2 py-1 text-[10px] text-white">Verify</button><button disabled={saving} onClick={()=>{setRejectId(p.id);setReason('');}} className="rounded border border-rose-200 px-2 py-1 text-[10px] text-rose-700">Reject</button></div>:p.status==='verified'&&Number(p.refunded_amount||0)<Number(p.amount)?<button disabled={saving} onClick={()=>openRefund(p)} className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700"><RotateCcw className="h-3 w-3"/>Refund</button>:'—'}</td>}
   </tr>)}</tbody>
  </table></div></div>
  {rejectId!==null&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><h3 className="text-sm font-bold">Reject payment #{rejectId}</h3><textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} rows={2} placeholder="Reason required…" className="mt-2 w-full rounded border bg-white p-2 text-xs"/><div className="mt-2 flex justify-end gap-2"><button onClick={()=>setRejectId(null)} className="rounded border bg-white px-3 py-2 text-xs">Cancel</button><button disabled={saving||!reason.trim()} onClick={()=>{const p=payments.find(x=>x.id===rejectId);if(p)void review(p,'reject');}} className="rounded bg-rose-600 px-3 py-2 text-xs text-white disabled:opacity-50">Confirm rejection</button></div></div>}
  {refundId!==null&&<form onSubmit={recordRefund} className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
   <div><h3 className="text-sm font-bold">Record provider-confirmed refund — Payment #{refundId}</h3><p className="mt-1 text-[11px] text-rose-800">First process the refund in bKash, Nagad or your bank portal. This screen records the provider reference and posts the reversing ledger entries; it does not transfer money.</p></div>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="space-y-1 text-xs">Refund amount (BDT)<input required type="number" min="0.01" step="0.01" value={refundAmount} onChange={e=>setRefundAmount(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2"/></label>
    <label className="space-y-1 text-xs">External refund reference<input required maxLength={120} value={refundReference} onChange={e=>setRefundReference(e.target.value)} placeholder="Provider refund reference" className="w-full rounded-lg border bg-white px-3 py-2"/></label>
    <label className="space-y-1 text-xs sm:col-span-2">Reason<textarea required maxLength={500} rows={2} value={refundReason} onChange={e=>setRefundReason(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2"/></label>
   </div>
   <div className="flex justify-end gap-2"><button type="button" onClick={()=>setRefundId(null)} className="rounded-lg border bg-white px-3 py-2 text-xs">Cancel</button><button disabled={saving||!refundAmount||!refundReference.trim()||!refundReason.trim()} className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5"/>{saving?'Saving…':'Record refund'}</button></div>
  </form>}
  {!student&&<section className="space-y-3"><div className="flex items-center gap-2"><Wallet className="h-4 w-4"/><h3 className="font-bold">Ledger entries</h3></div><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Reference</th><th className="p-3">Type</th><th className="p-3">Student / Course</th><th className="p-3">Account</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th></tr></thead><tbody className="divide-y">{ledger.map((e,i)=><tr key={`${e.ledger_id}-${i}`}><td className="p-3 font-mono">{e.reference}</td><td className="p-3">{e.transaction_type||'payment'}</td><td className="p-3">{e.student_name}<div className="text-[10px] text-slate-500">{e.course_title}</div></td><td className="p-3">{e.account_name}</td><td className="p-3 text-right">{Number(e.debit)?'৳'+money(e.debit):'—'}</td><td className="p-3 text-right">{Number(e.credit)?'৳'+money(e.credit):'—'}</td></tr>)}</tbody></table></div></section>}
 </section>;
};
