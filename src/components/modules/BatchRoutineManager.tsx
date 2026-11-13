import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { Calendar, Clock, Users, Plus, Trash2, BookOpen, MapPin, CheckCircle2, Printer, RefreshCw, AlertCircle, X } from 'lucide-react';

type BatchRow = {
  id: number; course_id: number; course_title: string; branch_id: number | null;
  name: string; batch_code: string; schedule: string; room_number: string;
  instructor_id: number; instructor_name: string; max_capacity: number;
  enrolled_students_count: number; start_date: string; end_date: string; status: string;
};
type RoutineRow = {
  id: number; batch_id: number; batch_name: string; course_title: string;
  day_of_week: string; start_time: string; end_time: string; subject: string;
  instructor_user_id: number; instructor_name: string; room_number: string;
};
type Instructor = { id: number; name: string; email: string; role: string };

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_BN: Record<string, string> = { Sunday:'রবিবার', Monday:'সোমবার', Tuesday:'মঙ্গলবার', Wednesday:'বুধবার', Thursday:'বৃহস্পতিবার', Friday:'শুক্রবার', Saturday:'শনিবার' };
const timeText = (value: unknown) => String(value || '').slice(0, 5);

export const BatchRoutineManager: React.FC = () => {
  const { courses, currentUser, language } = useLms();
  const isBn = language === 'bn';
  const canManage = ['admin','super_admin','branch_manager'].includes(currentUser.role);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'batches'|'routine'|'print'>('batches');
  const [selectedDay, setSelectedDay] = useState('All');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedBatchForStudents, setSelectedBatchForStudents] = useState<BatchRow | null>(null);
  const [batchRoster, setBatchRoster] = useState<Array<Record<string, unknown>>>([]);
  const [eligibleStudents, setEligibleStudents] = useState<Array<Record<string, unknown>>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [rosterLoading, setRosterLoading] = useState(false);

  const [batchName, setBatchName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [batchCourseId, setBatchCourseId] = useState('');
  const [batchSchedule, setBatchSchedule] = useState('');
  const [batchRoom, setBatchRoom] = useState('');
  const [batchInstructorId, setBatchInstructorId] = useState('');
  const [batchCapacity, setBatchCapacity] = useState('35');
  const [batchStartDate, setBatchStartDate] = useState('2026-11-15');
  const [batchEndDate, setBatchEndDate] = useState('2027-03-01');
  const [batchStatus, setBatchStatus] = useState<'upcoming'|'ongoing'|'completed'>('upcoming');

  const [routineBatchId, setRoutineBatchId] = useState('');
  const [routineDay, setRoutineDay] = useState('Sunday');
  const [routineStart, setRoutineStart] = useState('10:00');
  const [routineEnd, setRoutineEnd] = useState('11:00');
  const [routineSubject, setRoutineSubject] = useState('');
  const [routineInstructorId, setRoutineInstructorId] = useState('');
  const [routineRoom, setRoutineRoom] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    const [batchResult, routineResult] = await Promise.all([
      apiClient.batches.getAll(), apiClient.batches.getRoutines(),
    ]);
    if (batchResult.success && Array.isArray(batchResult.data)) {
      const rows = batchResult.data as BatchRow[];
      setBatches(rows);
      setRoutineBatchId(previous => rows.some(row => String(row.id) === previous) ? previous : rows.length ? String(rows[0].id) : '');
      if (!batchCourseId && courses.length) setBatchCourseId(String(courses[0].id));
    } else setError(batchResult.error || 'Could not load batches.');
    if (routineResult.success && Array.isArray(routineResult.data)) setRoutines(routineResult.data as RoutineRow[]);
    else setError(routineResult.error || 'Could not load weekly routines.');
    if (canManage) {
      const instructorResult = await apiClient.batches.getInstructors();
      if (instructorResult.success && Array.isArray(instructorResult.data)) setInstructors(instructorResult.data as Instructor[]);
      else setError(instructorResult.error || 'Could not load instructors.');
    }
    setLoading(false);
  }, [canManage, courses, batchCourseId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredRoutines = useMemo(() => selectedDay === 'All' ? routines : routines.filter(row => row.day_of_week === selectedDay), [routines, selectedDay]);
  const selectedBatch = batches.find(row => String(row.id) === routineBatchId);

  const createBatch = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const result = await apiClient.batches.create({
      course_id: Number(batchCourseId), name: batchName.trim(), batch_code: batchCode.trim().toUpperCase(),
      schedule: batchSchedule.trim(), room_number: batchRoom.trim(), instructor_user_id: Number(batchInstructorId),
      max_capacity: Number(batchCapacity), start_date: batchStartDate, end_date: batchEndDate, status: batchStatus,
    });
    if (result.success) {
      setShowBatchModal(false); setBatchName(''); setBatchCode(''); setBatchSchedule(''); setBatchRoom('');
      setNotice(isBn ? 'নতুন ব্যাচ তৈরি হয়েছে।' : 'Batch created successfully.');
      await refresh();
    } else setError(result.error || 'Could not create batch.');
    setSaving(false);
  };

  const createRoutine = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const result = await apiClient.batches.createRoutine({
      batch_id: Number(routineBatchId), day_of_week: routineDay, start_time: routineStart, end_time: routineEnd,
      subject: routineSubject.trim(), instructor_user_id: routineInstructorId ? Number(routineInstructorId) : undefined,
      room_number: routineRoom.trim(),
    });
    if (result.success) {
      setShowRoutineModal(false); setRoutineSubject('');
      setNotice(isBn ? 'সাপ্তাহিক রুটিনে ক্লাস যোগ হয়েছে।' : 'Weekly routine slot created.');
      await refresh();
    } else setError(result.error || 'Could not create routine. Check instructor/room conflicts.');
    setSaving(false);
  };

  const openStudentManager = async (batch: BatchRow) => {
    setSelectedBatchForStudents(batch); setShowStudentsModal(true); setRosterLoading(true); setError('');
    const [rosterResult, eligibleResult] = await Promise.all([
      apiClient.batches.getStudents(batch.id), apiClient.batches.getEligibleStudents(batch.id),
    ]);
    if (rosterResult.success && Array.isArray(rosterResult.data)) setBatchRoster(rosterResult.data);
    else setError(rosterResult.error || 'Could not load the batch roster.');
    if (eligibleResult.success && Array.isArray(eligibleResult.data)) setEligibleStudents(eligibleResult.data);
    else setError(eligibleResult.error || 'Could not load eligible students.');
    setRosterLoading(false);
  };

  const addStudentToBatch = async () => {
    if (!selectedBatchForStudents || !selectedStudentId) return;
    setSaving(true); setError('');
    const result = await apiClient.batches.enroll(selectedBatchForStudents.id, Number(selectedStudentId));
    if (result.success) {
      setSelectedStudentId('');
      setNotice(isBn ? 'শিক্ষার্থী ব্যাচে যুক্ত হয়েছে।' : 'Student added to batch.');
      await openStudentManager(selectedBatchForStudents); await refresh();
    } else setError(result.error || 'Could not add student to batch.');
    setSaving(false);
  };

  const removeStudentFromBatch = async (studentUserId: number) => {
    if (!selectedBatchForStudents || !window.confirm(isBn ? 'শিক্ষার্থীকে ব্যাচ থেকে সরাবেন?' : 'Remove this student from the batch?')) return;
    setSaving(true); setError('');
    const result = await apiClient.batches.unenroll(selectedBatchForStudents.id, studentUserId);
    if (result.success) {
      setNotice(isBn ? 'শিক্ষার্থীকে ব্যাচ থেকে সরানো হয়েছে।' : 'Student removed from batch.');
      await openStudentManager(selectedBatchForStudents); await refresh();
    } else setError(result.error || 'Could not remove student.');
    setSaving(false);
  };

  const deleteBatch = async (id: number) => {
    if (!window.confirm(isBn ? 'ব্যাচটি রিসাইকেল বিনে পাঠাবেন?' : 'Move this batch to the recycle bin?')) return;
    const result = await apiClient.batches.delete(id);
    if (result.success) { setNotice(isBn ? 'ব্যাচটি রিসাইকেল বিনে পাঠানো হয়েছে।' : 'Batch moved to recycle bin.'); await refresh(); }
    else setError(result.error || 'Could not delete batch.');
  };

  const deleteRoutine = async (id: number) => {
    if (!window.confirm(isBn ? 'এই রুটিন স্লট মুছে ফেলবেন?' : 'Remove this routine slot?')) return;
    const result = await apiClient.batches.deleteRoutine(id);
    if (result.success) { setNotice(isBn ? 'রুটিন স্লট মুছে ফেলা হয়েছে।' : 'Routine slot removed.'); await refresh(); }
    else setError(result.error || 'Could not remove routine.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-[10px] font-bold uppercase tracking-wider"><Calendar className="w-4 h-4" />{isBn ? 'একাডেমিক অপারেশন' : 'Academic Operations'}</div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">{isBn ? 'ব্যাচ ও ক্লাস রুটিন ব্যবস্থাপনা' : 'Batch & Class Routine Management'}</h2>
          <p className="text-xs text-slate-500 mt-1">{isBn ? 'ডাটাবেজে সংরক্ষিত ব্যাচ, শিক্ষার্থী তালিকা এবং সংঘর্ষ-পরীক্ষিত সাপ্তাহিক রুটিন।' : 'Persistent batches, student placement, and weekly schedules with instructor/room conflict checks.'}</p>
        </div>
        <div className="flex gap-2">
          {canManage && <><button onClick={() => setShowBatchModal(true)} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4" />{isBn ? 'নতুন ব্যাচ' : 'New batch'}</button><button onClick={() => setShowRoutineModal(true)} disabled={!batches.length} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" />{isBn ? 'রুটিন যোগ' : 'Add routine'}</button></>}
          <button onClick={() => void refresh()} className="p-2 rounded-xl border border-slate-200 text-slate-600" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{notice}</div>}

      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs">
        <button onClick={() => setActiveTab('batches')} className={`px-3 py-2 rounded-lg font-bold ${activeTab === 'batches' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{isBn ? 'ব্যাচ' : 'Batches'} ({batches.length})</button>
        <button onClick={() => setActiveTab('routine')} className={`px-3 py-2 rounded-lg font-bold ${activeTab === 'routine' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{isBn ? 'সাপ্তাহিক রুটিন' : 'Weekly routine'} ({routines.length})</button>
        <button onClick={() => setActiveTab('print')} className={`px-3 py-2 rounded-lg font-bold ${activeTab === 'print' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Printer className="w-3.5 h-3.5 inline mr-1" />{isBn ? 'প্রিন্ট' : 'Print'}</button>
      </div>

      {loading ? <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-500">{isBn ? 'লোড হচ্ছে…' : 'Loading…'}</div> : activeTab === 'batches' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {batches.map(batch => {
            const fill = Math.min(100, Math.round((Number(batch.enrolled_students_count) / Math.max(1, Number(batch.max_capacity))) * 100));
            return <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between"><span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">{batch.batch_code}</span><span className="text-[10px] rounded-full bg-slate-100 px-2 py-1 capitalize">{batch.status}</span></div>
              <div><h3 className="font-bold text-slate-900">{batch.name}</h3><p className="text-xs text-blue-700">{batch.course_title}</p></div>
              <div className="space-y-2 text-xs text-slate-600"><div className="flex gap-2"><Clock className="w-4 h-4" />{batch.schedule || '—'}</div><div className="flex gap-2"><MapPin className="w-4 h-4" />{batch.room_number || '—'}</div><div className="flex gap-2"><Users className="w-4 h-4" />{batch.instructor_name}</div></div>
              <div><div className="flex justify-between text-[10px] text-slate-500"><span>{isBn ? 'শিক্ষার্থী' : 'Students'}</span><strong>{batch.enrolled_students_count}/{batch.max_capacity}</strong></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1"><div className="h-full bg-blue-600" style={{ width: `${fill}%` }} /></div></div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[10px] text-slate-500"><span>{batch.start_date} — {batch.end_date}</span>{canManage && <div className="flex items-center gap-3"><button onClick={() => void openStudentManager(batch)} className="text-blue-600 hover:underline flex items-center gap-1"><Users className="w-3.5 h-3.5" />{isBn ? 'শিক্ষার্থী' : 'Students'}</button><button onClick={() => void deleteBatch(batch.id)} className="text-rose-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />{isBn ? 'মুছুন' : 'Delete'}</button></div>}</div>
            </div>;
          })}
          {batches.length === 0 && <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-xs text-slate-500">{isBn ? 'এখনো কোনো ব্যাচ তৈরি হয়নি।' : 'No batches available.'}</div>}
        </div>
      ) : activeTab === 'routine' ? (
        <div className="space-y-4">
          <div className="flex gap-2 bg-white border border-slate-200 p-3 rounded-xl overflow-x-auto"><button onClick={() => setSelectedDay('All')} className={`px-3 py-1.5 rounded-lg text-xs ${selectedDay === 'All' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>All</button>{DAYS.map(day => <button key={day} onClick={() => setSelectedDay(day)} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${selectedDay === day ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>{day}</button>)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoutines.map(slot => <div key={slot.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"><div className="flex justify-between"><span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">{slot.day_of_week} · {DAYS_BN[slot.day_of_week] || ''}</span><span className="font-mono text-xs">{timeText(slot.start_time)}–{timeText(slot.end_time)}</span></div><div><h3 className="font-bold text-sm">{slot.subject}</h3><p className="text-xs text-blue-700">{slot.batch_name} · {slot.course_title}</p></div><div className="text-xs text-slate-600">Faculty: <strong>{slot.instructor_name}</strong></div><div className="flex justify-between items-center border-t border-slate-100 pt-2 text-xs text-slate-500"><span>{slot.room_number || '—'}</span>{canManage && <button onClick={() => void deleteRoutine(slot.id)} className="text-rose-600 hover:underline"><Trash2 className="w-3.5 h-3.5" /></button>}</div></div>)}
            {filteredRoutines.length === 0 && <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-xs text-slate-500">No routine slots for this filter.</div>}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-5xl mx-auto">
          <div className="text-center border-b border-slate-200 pb-4"><h2 className="text-xl font-black text-slate-900">ALOM'S ENGLISH CENTER</h2><p className="text-xs text-blue-700 font-bold mt-1">Official Master Weekly Class Timetable</p></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Day</th><th className="p-3">Time</th><th className="p-3">Batch / Course</th><th className="p-3">Subject</th><th className="p-3">Instructor</th><th className="p-3">Room</th></tr></thead><tbody className="divide-y">{routines.map(row => <tr key={row.id}><td className="p-3">{row.day_of_week}</td><td className="p-3">{timeText(row.start_time)}–{timeText(row.end_time)}</td><td className="p-3">{row.batch_name} / {row.course_title}</td><td className="p-3">{row.subject}</td><td className="p-3">{row.instructor_name}</td><td className="p-3">{row.room_number}</td></tr>)}</tbody></table></div>
          <div className="flex justify-end"><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Printer className="w-4 h-4" />Print routine</button></div>
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"><form onSubmit={createBatch} className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-3 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center"><h3 className="font-bold">{isBn ? 'নতুন ব্যাচ তৈরি' : 'Create academic batch'}</h3><button type="button" onClick={() => setShowBatchModal(false)} aria-label="Close"><X className="w-4 h-4" /></button></div>
          <select required value={batchCourseId} onChange={e => setBatchCourseId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Select course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
          <input required value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="Batch name" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input required value={batchCode} onChange={e => setBatchCode(e.target.value)} placeholder="Batch code (e.g. AEC-SSC-27)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select required value={batchInstructorId} onChange={e => setBatchInstructorId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Select instructor</option>{instructors.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select>
          <input value={batchSchedule} onChange={e => setBatchSchedule(e.target.value)} placeholder="Schedule label (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={batchRoom} onChange={e => setBatchRoom(e.target.value)} placeholder="Room / online" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3"><label className="text-xs">Capacity<input required type="number" min="1" max="1000" value={batchCapacity} onChange={e => setBatchCapacity(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" /></label><label className="text-xs">Status<select value={batchStatus} onChange={e => setBatchStatus(e.target.value as typeof batchStatus)} className="w-full border rounded-lg px-3 py-2 mt-1"><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs">Start date<input required type="date" value={batchStartDate} onChange={e => setBatchStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" /></label><label className="text-xs">End date<input required type="date" value={batchEndDate} onChange={e => setBatchEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" /></label></div>
          <button disabled={saving} className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-bold">{saving ? 'Saving…' : 'Create batch'}</button>
        </form></div>
      )}

      {showStudentsModal && selectedBatchForStudents && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="font-bold">{isBn ? 'ব্যাচের শিক্ষার্থী' : 'Batch students'} · {selectedBatchForStudents.name}</h3><p className="text-xs text-slate-500">{isBn ? 'শুধু কোর্সে সক্রিয় ভর্তি থাকা শিক্ষার্থী যুক্ত করা যাবে।' : 'Only students with an active course enrollment can be added.'}</p></div><button onClick={() => setShowStudentsModal(false)} aria-label="Close"><X className="w-4 h-4" /></button></div>
            {rosterLoading ? <p className="text-xs text-slate-500">Loading roster…</p> : <>
              <div className="flex flex-col sm:flex-row gap-2"><select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm"><option value="">Select eligible student</option>{eligibleStudents.map(student => <option key={String(student.id)} value={String(student.id)}>{String(student.name)} · {String(student.email)}</option>)}</select><button disabled={!selectedStudentId || saving} onClick={() => void addStudentToBatch()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{isBn ? 'ব্যাচে যুক্ত করুন' : 'Add to batch'}</button></div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">{batchRoster.filter(row => row.status === 'active').map(row => <div key={String(row.id)} className="p-3 flex items-center justify-between gap-3"><div><div className="font-semibold text-sm">{String(row.name)}</div><div className="text-xs text-slate-500">{String(row.email)}</div></div><button disabled={saving} onClick={() => void removeStudentFromBatch(Number(row.user_id))} className="text-rose-600 text-xs hover:underline">{isBn ? 'সরান' : 'Remove'}</button></div>)}{batchRoster.filter(row => row.status === 'active').length === 0 && <p className="p-5 text-center text-xs text-slate-500">No active students in this batch.</p>}</div>
            </>}
          </div>
        </div>
      )}

      {showRoutineModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"><form onSubmit={createRoutine} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3">
          <div className="flex justify-between items-center"><h3 className="font-bold">{isBn ? 'সাপ্তাহিক রুটিনে ক্লাস যোগ' : 'Add weekly routine slot'}</h3><button type="button" onClick={() => setShowRoutineModal(false)} aria-label="Close"><X className="w-4 h-4" /></button></div>
          <select required value={routineBatchId} onChange={e => { setRoutineBatchId(e.target.value); const b = batches.find(row => String(row.id) === e.target.value); setRoutineInstructorId(b ? String(b.instructor_id) : ''); setRoutineRoom(b?.room_number || ''); }} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Select batch</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select>
          <select value={routineDay} onChange={e => setRoutineDay(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">{DAYS.map(day => <option key={day} value={day}>{day}</option>)}</select>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs">Start time<input required type="time" value={routineStart} onChange={e => setRoutineStart(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" /></label><label className="text-xs">End time<input required type="time" value={routineEnd} onChange={e => setRoutineEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" /></label></div>
          <input required value={routineSubject} onChange={e => setRoutineSubject(e.target.value)} placeholder="Subject / module" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={routineInstructorId} onChange={e => setRoutineInstructorId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Use batch instructor</option>{instructors.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
          <input value={routineRoom} onChange={e => setRoutineRoom(e.target.value)} placeholder="Room / online" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button disabled={saving || !selectedBatch} className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-bold">{saving ? 'Saving…' : 'Add routine slot'}</button>
        </form></div>
      )}
    </div>
  );
};
