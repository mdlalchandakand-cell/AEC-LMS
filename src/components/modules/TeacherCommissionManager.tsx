import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { DollarSign, CheckCircle2, Clock, Send, Users, BookOpen, RefreshCw, AlertCircle, X, CreditCard } from 'lucide-react';

type CommissionRow = Record<string, unknown>;
type PayoutRow = Record<string, unknown>;
type AssignmentRow = Record<string, unknown>;
type TeacherOption = { id: number; name: string; email: string; role: string };

const money = (value: unknown) => `৳${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (value: unknown) => value ? new Date(String(value).replace(' ', 'T')).toLocaleDateString() : '—';

export const TeacherCommissionManager: React.FC = () => {
  const { currentUser, courses, language } = useLms();
  const isBn = language === 'bn';
  const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);
  const canManagePayouts = isAdmin || currentUser.role === 'accountant';
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totals, setTotals] = useState({ gross_commission: '0.00', paid_commission: '0.00', reserved_payouts: '0.00', available_balance: '0.00', overpaid_commission: '0.00' });
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer'>('bKash');
  const [account, setAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [rate, setRate] = useState('60');
  const [paidReference, setPaidReference] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<'commissions' | 'payouts' | 'assignments'>('commissions');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    const [summaryResult, payoutResult] = await Promise.all([
      apiClient.teacherCommissions.getSummary(),
      apiClient.teacherCommissions.getPayouts(),
    ]);
    if (summaryResult.success && summaryResult.data) {
      setCommissions(summaryResult.data.commissions || []);
      setTotals(summaryResult.data.totals || { gross_commission: '0.00', paid_commission: '0.00', reserved_payouts: '0.00', available_balance: '0.00', overpaid_commission: '0.00' });
    } else setError(summaryResult.error || 'Could not load commission summary.');
    if (payoutResult.success && Array.isArray(payoutResult.data)) setPayouts(payoutResult.data);
    else setError(payoutResult.error || 'Could not load payout records.');
    if (isAdmin) {
      const [assignmentResult, userResult] = await Promise.all([
        apiClient.teacherCommissions.getAssignments(),
        apiClient.users.getAll('', 200),
      ]);
      if (assignmentResult.success && Array.isArray(assignmentResult.data)) setAssignments(assignmentResult.data);
      else setError(assignmentResult.error || 'Could not load teacher assignments.');
      if (userResult.success && Array.isArray(userResult.data)) {
        setTeachers(userResult.data.filter((user: any) => ['teacher', 'assistant_teacher'].includes(String(user.role)) && Boolean(user.is_active ?? true)).map((user: any) => ({
          id: Number(user.id), name: String(user.name || ''), email: String(user.email || ''), role: String(user.role),
        })));
      } else setError(userResult.error || 'Could not load teacher accounts.');
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void refresh(); }, [refresh]);

  const totalStudents = useMemo(() => commissions.reduce((sum, row) => sum + Number(row.total_enrolled_students || 0), 0), [commissions]);

  const submitPayout = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const result = await apiClient.teacherCommissions.requestPayout({
      amount, payout_method: method, account_reference: account.trim(),
      ...(method === 'Bank Transfer' ? { bank_name: bankName.trim(), bank_branch: bankBranch.trim() } : {}),
      remarks: 'Course commission payout request',
    });
    if (result.success) {
      setShowPayoutForm(false); setAmount(''); setAccount('');
      setNotice(isBn ? 'পে-আউট অনুরোধ পাঠানো হয়েছে।' : 'Payout request submitted for review.');
      await refresh();
    } else setError(result.error || 'Could not submit payout request.');
    setBusy(false);
  };

  const assignTeacher = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const result = await apiClient.teacherCommissions.assign(Number(courseId), Number(teacherId), Number(rate));
    if (result.success) {
      setNotice(isBn ? 'শিক্ষককে কোর্সে যুক্ত করা হয়েছে।' : 'Teacher assigned to course.');
      setCourseId(''); setTeacherId(''); await refresh();
    } else setError(result.error || 'Could not assign teacher.');
    setBusy(false);
  };

  const reviewPayout = async (id: number, decision: 'approve' | 'reject') => {
    const reason = decision === 'reject' ? window.prompt(isBn ? 'প্রত্যাখ্যানের কারণ লিখুন' : 'Enter a rejection reason') || '' : '';
    if (decision === 'reject' && !reason.trim()) return;
    setBusy(true); setError(''); setNotice('');
    const result = await apiClient.teacherCommissions.reviewPayout(id, decision, reason);
    if (result.success) { setNotice(decision === 'approve' ? 'Payout approved. Complete the real transfer before marking it paid.' : 'Payout request rejected.'); await refresh(); }
    else setError(result.error || 'Could not update payout request.');
    setBusy(false);
  };

  const markPaid = async (id: number) => {
    const reference = (paidReference[id] || '').trim();
    if (!reference) { setError(isBn ? 'প্রকৃত ব্যাংক/মোবাইল লেনদেনের রেফারেন্স দিন।' : 'Enter the actual bank/mobile transaction reference.'); return; }
    setBusy(true); setError(''); setNotice('');
    const result = await apiClient.teacherCommissions.markPaid(id, reference);
    if (result.success) { setNotice('Payout marked paid with the supplied external reference.'); await refresh(); }
    else setError(result.error || 'Could not mark payout as paid.');
    setBusy(false);
  };

  const unassign = async (id: number) => {
    if (!window.confirm(isBn ? 'এই শিক্ষককে কোর্স থেকে সরাবেন?' : 'Remove this teacher assignment?')) return;
    setBusy(true);
    const result = await apiClient.teacherCommissions.unassign(id);
    if (result.success) { setNotice('Teacher assignment disabled. Historical commission remains.'); await refresh(); }
    else setError(result.error || 'Could not remove assignment.');
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-[10px] font-bold uppercase tracking-wider"><DollarSign className="w-4 h-4" />{isBn ? 'শিক্ষক কমিশন ও পে-আউট' : 'Persistent Teacher Earnings'}</div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">{isBn ? 'কমিশন ও পেমেন্ট ব্যবস্থাপনা' : 'Teacher Commission & Payout Management'}</h2>
          <p className="text-xs text-slate-500 mt-1">{isBn ? 'যাচাইকৃত পেমেন্ট ও ফেরত সমন্বয় করে সার্ভার থেকে কমিশন হিসাব করা হয়।' : 'Commission is calculated server-side from verified course payments, net of completed refunds.'}</p>
        </div>
        <div className="flex gap-2">
          {!isAdmin && !canManagePayouts && <button onClick={() => setShowPayoutForm(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"><Send className="w-4 h-4" />{isBn ? 'পে-আউট অনুরোধ' : 'Request payout'}</button>}
          <button onClick={() => void refresh()} className="p-2.5 rounded-xl border border-slate-200 text-slate-600" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{notice}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: isBn ? 'মোট কমিশন' : 'Gross commission', value: totals.gross_commission, icon: DollarSign },
          { label: isBn ? 'পরিশোধিত' : 'Paid out', value: totals.paid_commission, icon: CheckCircle2 },
          { label: isBn ? 'অনুরোধ/অনুমোদিত' : 'Reserved payouts', value: totals.reserved_payouts, icon: Clock },
          { label: isBn ? 'উত্তোলনযোগ্য' : 'Available balance', value: totals.available_balance, icon: CreditCard },
          { label: isBn ? 'সমন্বয় বকেয়া' : 'Recovery due', value: totals.overpaid_commission, icon: AlertCircle },
        ].map(item => <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4"><item.icon className="w-4 h-4 text-emerald-600" /><div className="text-xl font-extrabold text-slate-900 mt-2">{money(item.value)}</div><div className="text-[10px] text-slate-500">{item.label}</div></div>)}
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs">
        <button onClick={() => setActiveTab('commissions')} className={`px-3 py-2 rounded-lg font-bold ${activeTab === 'commissions' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{isBn ? 'কমিশন' : 'Commissions'}</button>
        <button onClick={() => setActiveTab('payouts')} className={`px-3 py-2 rounded-lg font-bold ${activeTab === 'payouts' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{isBn ? 'পে-আউট' : 'Payouts'} ({payouts.length})</button>
        {isAdmin && <button onClick={() => setActiveTab('assignments')} className={`px-3 py-2 rounded-lg font-bold ${activeTab === 'assignments' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{isBn ? 'শিক্ষক অ্যাসাইনমেন্ট' : 'Teacher assignments'}</button>}
      </div>

      {loading ? <div className="bg-white rounded-xl border border-slate-200 p-6 text-xs text-slate-500">{isBn ? 'লোড হচ্ছে…' : 'Loading…'}</div> : activeTab === 'commissions' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]"><tr>{canManagePayouts && <th className="p-3">Teacher</th>}<th className="p-3">Course</th><th className="p-3">Enrolled</th><th className="p-3">Rate</th><th className="p-3">Net revenue</th><th className="p-3 text-right">Commission earned</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {commissions.map((row, index) => <tr key={String(row.id || index)}><>{canManagePayouts && <td className="p-3 font-semibold">{String(row.teacher_name || '')}</td>}<td className="p-3 font-semibold">{String(row.course_title || '')}</td><td className="p-3">{Number(row.total_enrolled_students || 0)}</td><td className="p-3">{Number(row.commission_percentage || 0).toFixed(2)}%</td><td className="p-3">{money(row.total_course_revenue)}</td><td className="p-3 text-right font-bold text-emerald-700">{money(row.gross_commission)}</td></></tr>)}
              {commissions.length === 0 && <tr><td colSpan={canManagePayouts ? 6 : 5} className="p-8 text-center text-slate-500">{isBn ? 'এখনো কোনো শিক্ষক-কোর্স কমিশন অ্যাসাইনমেন্ট নেই।' : 'No active teacher-course commission assignments.'}</td></tr>}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'payouts' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]"><tr>{canManagePayouts && <th className="p-3">Teacher</th>}<th className="p-3">Amount</th><th className="p-3">Method / Account</th><th className="p-3">Requested</th><th className="p-3">Status</th>{canManagePayouts && <th className="p-3">Action</th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map(row => {
                const id = Number(row.id);
                const status = String(row.status);
                return <tr key={id}>
                  {canManagePayouts && <td className="p-3 font-semibold">{String(row.teacher_name || '')}</td>}
                  <td className="p-3 font-bold">{money(row.amount)}</td>
                  <td className="p-3"><div>{String(row.payout_method)} · {String(row.account_reference)}</div>{Boolean(row.bank_name) && <div className="text-slate-500">{String(row.bank_name)} / {String(row.bank_branch || '')}</div>}</td>
                  <td className="p-3">{dateText(row.requested_at)}</td>
                  <td className="p-3"><span className="capitalize">{status}</span>{Boolean(row.external_transaction_reference) && <div className="text-[10px] text-slate-500">{String(row.external_transaction_reference)}</div>}</td>
                  {canManagePayouts && <td className="p-3">
                    {status === 'pending' && <div className="flex gap-1"><button disabled={busy} onClick={() => void reviewPayout(id, 'approve')} className="px-2 py-1 rounded bg-emerald-600 text-white">Approve</button><button disabled={busy} onClick={() => void reviewPayout(id, 'reject')} className="px-2 py-1 rounded bg-rose-600 text-white">Reject</button></div>}
                    {status === 'approved' && <div className="space-y-1"><input value={paidReference[id] || ''} onChange={e => setPaidReference(prev => ({ ...prev, [id]: e.target.value }))} placeholder="Actual transfer reference" className="w-44 border rounded px-2 py-1" /><button disabled={busy} onClick={() => void markPaid(id)} className="px-2 py-1 rounded bg-blue-600 text-white">Confirm paid</button></div>}
                  </td>}
                </tr>;
              })}
              {payouts.length === 0 && <tr><td colSpan={canManagePayouts ? 6 : 4} className="p-8 text-center text-slate-500">No payout requests.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={assignTeacher} className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select required value={courseId} onChange={e => setCourseId(e.target.value)} className="border rounded-lg px-3 py-2 text-xs"><option value="">Select course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
            <select required value={teacherId} onChange={e => setTeacherId(e.target.value)} className="border rounded-lg px-3 py-2 text-xs"><option value="">Select teacher</option>{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.email})</option>)}</select>
            <input required type="number" min="0" max="100" step="0.01" value={rate} onChange={e => setRate(e.target.value)} className="border rounded-lg px-3 py-2 text-xs" aria-label="Commission percentage" />
            <button disabled={busy} className="rounded-lg bg-emerald-600 text-white text-xs font-bold px-4 py-2">{isBn ? 'অ্যাসাইন করুন' : 'Assign teacher'}</button>
          </form>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Course</th><th className="p-3">Teacher</th><th className="p-3">Commission</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{assignments.map(row => <tr key={String(row.id)}><td className="p-3">{String(row.course_title)}</td><td className="p-3">{String(row.teacher_name)}</td><td className="p-3">{Number(row.commission_percentage).toFixed(2)}%</td><td className="p-3">{Number(row.is_active) ? 'Active' : 'Inactive'}</td><td className="p-3">{Number(row.is_active) === 1 && <button onClick={() => void unassign(Number(row.id))} className="text-rose-600 hover:underline">Remove</button>}</td></tr>)}</tbody></table></div>
        </div>
      )}

      {showPayoutForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={submitPayout} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">{isBn ? 'পে-আউট অনুরোধ' : 'Request commission payout'}</h3><button type="button" onClick={() => setShowPayoutForm(false)} aria-label="Close"><X className="w-4 h-4" /></button></div>
            <p className="text-xs text-slate-500">{isBn ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Available balance'}: <strong>{money(totals.available_balance)}</strong></p>
            <input required type="number" min="0.01" max={Number(totals.available_balance)} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (BDT)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select value={method} onChange={e => setMethod(e.target.value as typeof method)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Bank Transfer">Bank Transfer</option></select>
            <input required value={account} onChange={e => setAccount(e.target.value)} placeholder={isBn ? 'বিকাশ/নগদ নম্বর বা ব্যাংক অ্যাকাউন্ট' : 'Mobile number or bank account reference'} className="w-full border rounded-lg px-3 py-2 text-sm" />
            {method === 'Bank Transfer' && <><input required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" className="w-full border rounded-lg px-3 py-2 text-sm" /><input required value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Bank branch" className="w-full border rounded-lg px-3 py-2 text-sm" /></>}
            <button disabled={busy} className="w-full rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-bold">{busy ? 'Submitting…' : (isBn ? 'অনুরোধ জমা দিন' : 'Submit payout request')}</button>
          </form>
        </div>
      )}
    </div>
  );
};
