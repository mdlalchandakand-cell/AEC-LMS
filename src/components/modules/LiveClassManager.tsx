import React, { useCallback, useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { Video, Calendar, Clock, Plus, Play, Users, X, Trash2, RefreshCw } from 'lucide-react';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

type LiveClassRow = {
  id: number; course_id: number; course_title: string; instructor_id: number; instructor_name: string;
  title: string; starts_at: string; timezone: string; meeting_platform: 'google_meet'|'zoom'|'teams';
  meeting_url: string; recording_url?: string|null; status: 'upcoming'|'live'|'completed'|'cancelled';
};
type Instructor = { id: number; name: string; role: string };

const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

export const LiveClassManager: React.FC = () => {
  const { courses, currentUser, language, t } = useLms();
  const [classes, setClasses] = useState<LiveClassRow[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [classToCancel, setClassToCancel] = useState<LiveClassRow|null>(null);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [instructorId, setInstructorId] = useState('');
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState('19:30');
  const [platform, setPlatform] = useState<'google_meet'|'zoom'|'teams'>('google_meet');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [recordingUrls, setRecordingUrls] = useState<Record<number,string>>({});

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const canSchedule = isAdmin || currentUser.role === 'teacher';
  const canManage = canSchedule;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const result = await apiClient.liveClasses.getAll();
    if (result.success && Array.isArray(result.data)) {
      setClasses(result.data as LiveClassRow[]);
    } else {
      setError(result.error || 'Could not load live classes from the LMS server.');
    }
    if (isAdmin) {
      const people = await apiClient.users.getAll('', 200);
      if (people.success && Array.isArray(people.data)) {
        setInstructors((people.data as Instructor[]).filter(person =>
          ['teacher','assistant_teacher'].includes(person.role)
        ));
      }
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courses, courseId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = {
      course_id: Number(courseId), title: title.trim(), date, time,
      meeting_platform: platform, meeting_url: meetingUrl.trim(),
      ...(isAdmin ? { instructor_id: Number(instructorId) } : {}),
    };
    const result = await apiClient.liveClasses.create(payload);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not schedule the live class.'); return; }
    setNotice('Live class saved to the database.');
    setShowAddModal(false); setTitle(''); setMeetingUrl('');
    await load();
  };

  const updateStatus = async (item: LiveClassRow, status: 'live'|'completed') => {
    setSaving(true); setError(''); setNotice('');
    const result = await apiClient.liveClasses.update(item.id, {
      status,
      ...(status === 'completed' && recordingUrls[item.id]?.trim()
        ? { recording_url: recordingUrls[item.id].trim() } : {}),
    });
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not update the live class.'); return; }
    setNotice(status === 'live' ? 'Live class marked as live.' : 'Live class marked as completed.');
    await load();
  };

  const cancelClass = async () => {
    if (!classToCancel) return;
    setSaving(true); setError('');
    const result = await apiClient.liveClasses.cancel(classToCancel.id);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not cancel the live class.'); return; }
    setClassToCancel(null); setNotice('Live class cancelled. The record remains in the audit history.');
    await load();
  };

  const splitDate = (value: string) => value.replace(' ', 'T');
  const canManageClass = (item: LiveClassRow) =>
    isAdmin || (currentUser.role === 'teacher' && item.instructor_id === Number(currentUser.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.liveClassesMenu} & Virtual Classrooms</h2>
          <p className="mt-1 text-xs text-slate-500">Schedules are stored in MySQL. Students only see classes for courses in which they are enrolled.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh
          </button>
          {canSchedule && <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">
            <Plus className="h-4 w-4"/>Schedule live class
          </button>}
        </div>
      </header>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}
      {loading ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading live classes…</div>
        : classes.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">No live classes are scheduled for your account.</div>
        : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {classes.map(item => {
            const editable = canManageClass(item) && item.status !== 'cancelled';
            const starts = splitDate(item.starts_at);
            return <article key={item.id} className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white ${item.status === 'live' ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${item.status === 'live' ? 'bg-rose-600 text-white' : item.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{item.status}</span>
                  <span className="text-[10px] capitalize text-slate-500">{item.meeting_platform.replace('_',' ')}</span>
                </div>
                <div><span className="block truncate text-xs font-semibold text-blue-600">{item.course_title}</span><h3 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h3></div>
                <div className="space-y-2 border-t pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-blue-600"/>{starts.slice(0,10)}</div>
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-blue-600"/>{starts.slice(11,16)} Bangladesh time</div>
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-blue-600"/>Instructor: {item.instructor_name}</div>
                </div>
              </div>
              <div className="space-y-2 border-t bg-slate-50 p-4">
                {item.status === 'completed' && item.recording_url
                  ? <a href={item.recording_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 text-xs font-semibold text-white"><Play className="h-3.5 w-3.5"/>Watch recording</a>
                  : <a href={item.meeting_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white"><Video className="h-4 w-4"/>Join session</a>}
                {editable && <div className="flex flex-wrap gap-2">
                  {item.status === 'upcoming' && <button disabled={saving} onClick={() => void updateStatus(item,'live')} className="rounded-lg border bg-white px-3 py-2 text-[11px] font-semibold">Start class</button>}
                  {item.status === 'live' && <button disabled={saving} onClick={() => void updateStatus(item,'completed')} className="rounded-lg border bg-white px-3 py-2 text-[11px] font-semibold">Mark completed</button>}
                  {item.status === 'live' && <input aria-label="Recording URL" type="url" placeholder="HTTPS recording URL (optional)" value={recordingUrls[item.id] || ''} onChange={e => setRecordingUrls(current => ({...current,[item.id]:e.target.value}))} className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-[10px]"/>}
                  <button disabled={saving} onClick={() => setClassToCancel(item)} title="Cancel class" className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600"><Trash2 className="h-4 w-4"/></button>
                </div>}
              </div>
            </article>;
          })}
        </div>}
      {showAddModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#0b1e36] px-5 py-3 text-white"><span className="text-sm font-bold">Schedule live class</span><button onClick={() => setShowAddModal(false)}><X className="h-5 w-5"/></button></div>
          <form onSubmit={handleCreate} className="space-y-4 p-5 text-xs">
            <label className="block space-y-1">Class title<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>
            <label className="block space-y-1">Course<select required value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2"><option value="">Select course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            {isAdmin && <label className="block space-y-1">Instructor<select required value={instructorId} onChange={e => setInstructorId(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2"><option value="">Select instructor</option>{instructors.map(person => <option key={person.id} value={person.id}>{person.name} ({person.role.replace('_',' ')})</option>)}</select></label>}
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">Date<input required type="date" min={localDate()} value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>
              <label className="block space-y-1">Time (BST)<input required type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>
            </div>
            <label className="block space-y-1">Platform<select value={platform} onChange={e => setPlatform(e.target.value as typeof platform)} className="w-full rounded-lg border bg-white px-3 py-2"><option value="google_meet">Google Meet</option><option value="zoom">Zoom</option><option value="teams">Microsoft Teams</option></select></label>
            <label className="block space-y-1">Meeting URL<input required type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="HTTPS meeting URL" className="w-full rounded-lg border px-3 py-2"/></label>
            <button type="submit" disabled={saving || !courseId || (isAdmin && !instructorId)} className="w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save schedule'}</button>
          </form>
        </div>
      </div>}
      <ConfirmDeleteModal
        isOpen={Boolean(classToCancel)}
        onClose={() => setClassToCancel(null)}
        onConfirm={() => { void cancelClass(); }}
        title="Cancel live class"
        titleBn="লাইভ ক্লাস বাতিল করুন"
        itemName={classToCancel ? classToCancel.title : ''}
        message="This will cancel the scheduled session. The record will remain in the database."
        messageBn="সেশনটি বাতিল হবে, তবে রেকর্ড ডাটাবেজে থাকবে।"
        confirmText="Confirm cancellation"
        confirmTextBn="বাতিল নিশ্চিত করুন"
        requireTyping={false}
        language={language}
      />
    </div>
  );
};
