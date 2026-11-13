import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { Users, Link2, RefreshCw, ShieldCheck, CalendarCheck, BookOpen, Award, CreditCard, ClipboardList, AlertCircle } from 'lucide-react';

type GuardianLink = Record<string, unknown>;
type GuardianSummary = {
  student: Record<string, unknown>;
  courses: Array<Record<string, unknown>>;
  attendance: Array<Record<string, unknown>>;
  exams: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  certificates: Array<Record<string, unknown>>;
};

const money = (value: unknown) => `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const dateText = (value: unknown) => value ? new Date(String(value).replace(' ', 'T')).toLocaleDateString() : '—';

export const GuardianOverview: React.FC<{ onNavigateTab: (tab: string) => void }> = () => {
  const { currentUser, language } = useLms();
  const isBn = language === 'bn';
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [summary, setSummary] = useState<GuardianSummary | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeLinks = useMemo(() => links.filter(link => link.status === 'active'), [links]);
  const refreshLinks = useCallback(async () => {
    setLoading(true);
    const result = await apiClient.guardians.getMyStudents();
    if (result.success && Array.isArray(result.data)) {
      setLinks(result.data);
      const active = result.data.filter(item => item.status === 'active');
      setSelectedStudentId(previous => active.some(item => Number(item.student_user_id) === previous)
        ? previous : active.length ? Number(active[0].student_user_id) : null);
      setError('');
    } else setError(result.error || (isBn ? 'অভিভাবক সংযোগের তথ্য পাওয়া যায়নি।' : 'Could not load guardian links.'));
    setLoading(false);
  }, [isBn]);

  useEffect(() => { void refreshLinks(); }, [refreshLinks]);

  useEffect(() => {
    let active = true;
    if (!selectedStudentId) { setSummary(null); return () => { active = false; }; }
    setSummaryLoading(true);
    apiClient.guardians.getSummary(selectedStudentId).then(result => {
      if (!active) return;
      if (result.success && result.data) setSummary(result.data);
      else { setSummary(null); setError(result.error || 'Could not load the student summary.'); }
      setSummaryLoading(false);
    });
    return () => { active = false; };
  }, [selectedStudentId]);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const result = await apiClient.guardians.requestLink(studentEmail.trim(), relationship);
    if (result.success) {
      setStudentEmail('');
      setNotice(isBn ? 'অনুরোধ পাঠানো হয়েছে। শিক্ষার্থী অনুমোদন করলে তথ্য দেখা যাবে।' : 'Request sent. Student records remain private until the student accepts.');
      await refreshLinks();
    } else setError(result.error || 'Could not send guardian request.');
    setSaving(false);
  };

  const handleRevoke = async (linkId: number) => {
    if (!window.confirm(isBn ? 'এই অভিভাবক সংযোগ বাতিল করবেন?' : 'Revoke this guardian link?')) return;
    const result = await apiClient.guardians.revoke(linkId);
    if (!result.success) { setError(result.error || 'Could not revoke link.'); return; }
    setNotice(isBn ? 'সংযোগ বাতিল করা হয়েছে।' : 'Guardian access has been revoked.');
    await refreshLinks();
  };

  const selectedLink = activeLinks.find(item => Number(item.student_user_id) === selectedStudentId);
  const student = summary?.student || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider"><ShieldCheck className="w-4 h-4" /> {isBn ? 'নিরাপদ অভিভাবক পোর্টাল' : 'Verified Guardian Portal'}</div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">{isBn ? 'শিক্ষার্থীর অগ্রগতি ও তথ্য' : 'Student Progress & Records'}</h2>
          <p className="text-xs text-slate-500 mt-1">{isBn ? 'শিক্ষার্থীর অনুমোদিত সংযোগ ছাড়া কোনো তথ্য দেখানো হবে না।' : 'Only student-approved links can reveal academic or payment records.'}</p>
        </div>
        <div className="text-xs text-slate-500">{currentUser.name}</div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">{isBn ? 'শিক্ষার্থী সংযোগ' : 'Linked Students'}</h3>
            <button onClick={() => void refreshLinks()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Refresh links"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {loading ? <p className="text-xs text-slate-500">{isBn ? 'লোড হচ্ছে…' : 'Loading…'}</p> : links.length === 0 ? <p className="text-xs text-slate-500">{isBn ? 'এখনো কোনো শিক্ষার্থী সংযুক্ত নেই।' : 'No student links yet.'}</p> : (
            <div className="space-y-2">
              {links.map(link => (
                <div key={String(link.link_id)} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button disabled={link.status !== 'active'} onClick={() => setSelectedStudentId(Number(link.student_user_id))} className="text-left min-w-0 disabled:cursor-default">
                      <div className="font-semibold text-sm text-slate-900 truncate">{String(link.student_name || 'Student')}</div>
                      <div className="text-[11px] text-slate-500 truncate">{String(link.student_email || '')}</div>
                    </button>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-1 ${link.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{String(link.status)}</span>
                  </div>
                  {link.status === 'active' && <button onClick={() => void handleRevoke(Number(link.link_id))} className="mt-2 text-[11px] text-rose-600 hover:underline">{isBn ? 'সংযোগ বাতিল' : 'Revoke access'}</button>}
                  {link.status === 'pending' && <p className="mt-2 text-[11px] text-amber-700">{isBn ? 'শিক্ষার্থীর অনুমোদনের অপেক্ষায়' : 'Waiting for student approval'}</p>}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleRequest} className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="font-bold text-xs text-slate-800">{isBn ? 'নতুন শিক্ষার্থী যুক্ত করুন' : 'Request a student link'}</h4>
            <input type="email" required value={studentEmail} onChange={event => setStudentEmail(event.target.value)} placeholder={isBn ? 'শিক্ষার্থীর অ্যাকাউন্ট ইমেইল' : 'Student account email'} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs" />
            <select value={relationship} onChange={event => setRelationship(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
              <option value="Parent">Parent</option><option value="Father">Father</option><option value="Mother">Mother</option><option value="Guardian">Guardian</option><option value="Other">Other</option>
            </select>
            <button disabled={saving} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 text-xs font-bold flex items-center justify-center gap-2"><Link2 className="w-4 h-4" />{saving ? (isBn ? 'পাঠানো হচ্ছে…' : 'Sending…') : (isBn ? 'সংযোগের অনুরোধ পাঠান' : 'Send link request')}</button>
          </form>
        </section>

        <section className="lg:col-span-2 space-y-5">
          {!selectedLink && <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center"><Users className="w-8 h-8 text-slate-300 mx-auto mb-2" /><h3 className="font-bold text-slate-800">{isBn ? 'অনুমোদিত শিক্ষার্থী নির্বাচন করুন' : 'No approved student selected'}</h3><p className="text-xs text-slate-500 mt-1">{isBn ? 'প্রথমে শিক্ষার্থীর অ্যাকাউন্ট থেকে আপনার অনুরোধ অনুমোদন করতে হবে।' : 'The student must approve your request before their records are visible.'}</p></div>}
          {selectedLink && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center"><Users className="w-5 h-5" /></div><div><h3 className="font-bold text-base text-slate-900">{String(student.name || selectedLink.student_name || '')}</h3><p className="text-xs text-slate-500">{String(student.email || selectedLink.student_email || '')} · {String(selectedLink.relationship || 'Guardian')}</p></div></div>
              </div>
              {summaryLoading ? <div className="bg-white rounded-2xl border border-slate-200 p-6 text-xs text-slate-500">{isBn ? 'অগ্রগতির তথ্য লোড হচ্ছে…' : 'Loading student records…'}</div> : summary && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: isBn ? 'কোর্স' : 'Courses', value: summary.courses.length, icon: BookOpen },
                      { label: isBn ? 'উপস্থিতি' : 'Attendance records', value: summary.attendance.length, icon: CalendarCheck },
                      { label: isBn ? 'পরীক্ষার ফল' : 'Exam results', value: summary.exams.length, icon: ClipboardList },
                      { label: isBn ? 'সার্টিফিকেট' : 'Certificates', value: summary.certificates.length, icon: Award },
                    ].map(item => <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4"><item.icon className="w-4 h-4 text-blue-600" /><div className="text-xl font-extrabold text-slate-900 mt-2">{item.value}</div><div className="text-[10px] text-slate-500">{item.label}</div></div>)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"><h4 className="font-bold text-sm text-slate-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" />{isBn ? 'কোর্স' : 'Courses'}</h4>{summary.courses.length ? summary.courses.map(row => <div key={String(row.id)} className="border-b border-slate-100 pb-2 text-xs"><div className="font-semibold">{String(row.course_title)}</div><div className="text-slate-500">{String(row.status)} · {dateText(row.enrolled_at)}</div></div>) : <p className="text-xs text-slate-500">—</p>}</div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"><h4 className="font-bold text-sm text-slate-900 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-blue-600" />{isBn ? 'সাম্প্রতিক উপস্থিতি' : 'Recent attendance'}</h4>{summary.attendance.length ? summary.attendance.slice(0,8).map(row => <div key={String(row.id)} className="flex justify-between gap-2 border-b border-slate-100 pb-2 text-xs"><span>{String(row.course_title)} · {dateText(row.attendance_date)}</span><strong className="capitalize">{String(row.status)}</strong></div>) : <p className="text-xs text-slate-500">—</p>}</div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"><h4 className="font-bold text-sm text-slate-900 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-600" />{isBn ? 'পরীক্ষার ফলাফল' : 'Exam results'}</h4>{summary.exams.length ? summary.exams.map(row => <div key={String(row.id)} className="border-b border-slate-100 pb-2 text-xs"><div className="font-semibold">{String(row.exam_title)}</div><div className="text-slate-500">{String(row.score ?? '—')} / {String(row.total_marks ?? '—')} · {String(row.percentage ?? '—')}%</div></div>) : <p className="text-xs text-slate-500">—</p>}</div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"><h4 className="font-bold text-sm text-slate-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" />{isBn ? 'পেমেন্ট' : 'Payments'}</h4>{summary.payments.length ? summary.payments.map(row => <div key={String(row.id)} className="flex justify-between gap-2 border-b border-slate-100 pb-2 text-xs"><span>{String(row.course_title)} · {String(row.status)}</span><strong>{money(row.amount)}</strong></div>) : <p className="text-xs text-slate-500">—</p>}</div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
