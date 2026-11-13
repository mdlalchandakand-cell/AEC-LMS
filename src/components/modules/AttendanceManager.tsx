import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarCheck, CheckCircle2, Clock, RefreshCw, Save, Users } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type MarkingStatus = AttendanceStatus | 'unmarked';

interface RosterStudent {
  id: number;
  name: string;
  email: string;
  branch_id: number | null;
  status: AttendanceStatus | null;
  remarks: string | null;
}

interface MyAttendanceRecord {
  id: number;
  course_id: number;
  course_title: string;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
}

const getLocalDate = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
};

export const AttendanceManager: React.FC = () => {
  const { currentUser, courses, t } = useLms();
  const isStudent = currentUser.role === 'student';
  const canManage = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(getLocalDate);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [myRecords, setMyRecords] = useState<MyAttendanceRecord[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, MarkingStatus>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRoster = useCallback(async () => {
    if (!selectedCourseId) {
      setRoster([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const result = await apiClient.attendance.getRoster(selectedCourseId, selectedDate);
    if (result.success && Array.isArray(result.data)) {
      const nextRoster = result.data as RosterStudent[];
      setRoster(nextRoster);
      setStatusMap(Object.fromEntries(nextRoster.map(student => [String(student.id), student.status || 'unmarked'])));
      setRemarksMap(Object.fromEntries(nextRoster.map(student => [String(student.id), student.remarks || ''])));
    } else {
      setRoster([]);
      setError(result.error || 'Could not load the enrolled student attendance roster.');
    }
    setLoading(false);
  }, [selectedCourseId, selectedDate]);

  const loadMyAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await apiClient.attendance.getMy();
    if (result.success && Array.isArray(result.data)) {
      setMyRecords(result.data as MyAttendanceRecord[]);
    } else {
      setMyRecords([]);
      setError(result.error || 'Could not load your attendance history.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isStudent && canManage && !selectedCourseId && courses.length > 0) {
      setSelectedCourseId(String(courses[0].id));
    }
  }, [isStudent, canManage, selectedCourseId, courses]);

  useEffect(() => {
    if (isStudent) void loadMyAttendance();
    else if (canManage) void loadRoster();
    else {
      setLoading(false);
      setError('Your account does not have permission to manage attendance.');
    }
  }, [isStudent, canManage, loadMyAttendance, loadRoster]);

  const markedCount = useMemo(
    () => roster.filter(student => statusMap[String(student.id)] !== 'unmarked').length,
    [roster, statusMap]
  );
  const presentCount = useMemo(
    () => roster.filter(student => statusMap[String(student.id)] === 'present').length,
    [roster, statusMap]
  );
  const attendanceRate = roster.length ? Math.round((presentCount / roster.length) * 100) : 0;

  const handleToggle = (studentId: number, status: AttendanceStatus) => {
    setStatusMap(current => ({ ...current, [String(studentId)]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourseId || roster.length === 0 || saving) return;
    if (roster.some(student => statusMap[String(student.id)] === 'unmarked' || !statusMap[String(student.id)])) {
      setError('Mark every enrolled student as Present, Late, Absent or Excused before saving.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const records = roster.map(student => ({
      user_id: student.id,
      status: statusMap[String(student.id)] as AttendanceStatus,
      remarks: remarksMap[String(student.id)] || '',
    }));
    const result = await apiClient.attendance.save(selectedCourseId, selectedDate, records);
    if (!result.success) {
      setError(result.error || 'Attendance could not be saved. Please try again.');
      setSaving(false);
      return;
    }
    setNotice(`Attendance saved for ${result.data?.saved_count ?? records.length} students.`);
    setSaving(false);
    await loadRoster();
  };

  if (isStudent) {
    const present = myRecords.filter(record => record.status === 'present').length;
    const late = myRecords.filter(record => record.status === 'late').length;
    const absent = myRecords.filter(record => record.status === 'absent').length;
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">My Attendance History</h2>
          <p className="mt-1 text-xs text-slate-500">Your attendance records saved by the course administration.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3"><span className="block text-lg font-bold text-emerald-700">{present}</span><span className="text-[11px] text-emerald-700">Present</span></div>
            <div className="rounded-xl bg-amber-50 p-3"><span className="block text-lg font-bold text-amber-700">{late}</span><span className="text-[11px] text-amber-700">Late</span></div>
            <div className="rounded-xl bg-rose-50 p-3"><span className="block text-lg font-bold text-rose-700">{absent}</span><span className="text-[11px] text-rose-700">Absent</span></div>
          </div>
        </header>
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="text-sm font-bold text-slate-900">Attendance records</h3>
            <button type="button" onClick={() => void loadMyAttendance()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
          {loading ? <p className="p-8 text-center text-xs text-slate-500">Loading attendance…</p> : myRecords.length === 0 ? <p className="p-8 text-center text-xs text-slate-500">No attendance records have been added yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Remarks</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{myRecords.map(record => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-mono">{record.attendance_date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{record.course_title}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${record.status === 'present' ? 'bg-emerald-50 text-emerald-700' : record.status === 'late' ? 'bg-amber-50 text-amber-700' : record.status === 'absent' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{statusLabels[record.status]}</span></td>
                    <td className="px-4 py-3 text-slate-500">{record.remarks || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (!canManage) {
    return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{error || 'Attendance management permission is required.'}</div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.attendanceMenu} Management Register</h2>
          <p className="mt-1 text-xs text-slate-500">Daily roll call for students actively enrolled in the selected course.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadRoster()} disabled={loading || !selectedCourseId} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button type="button" onClick={() => void handleSaveAttendance()} disabled={saving || loading || roster.length === 0 || markedCount !== roster.length} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" /><span>{saving ? 'Saving…' : 'Save attendance'}</span></button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}

      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <label className="space-y-1 text-[11px] font-semibold text-slate-600">
            Course
            <select value={selectedCourseId} onChange={event => setSelectedCourseId(event.target.value)} className="block min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800">
              <option value="">Select a course</option>
              {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-[11px] font-semibold text-slate-600">
            Attendance date
            <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800" />
          </label>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right"><span className="block font-bold text-emerald-700">{attendanceRate}% Present</span><span className="text-[11px] text-slate-500">{presentCount} present · {markedCount}/{roster.length} marked</span></div>
          <div className="h-2 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} /></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4 text-sm font-bold text-slate-900"><Users className="h-4 w-4 text-blue-600" /> Enrolled students <span className="text-xs font-normal text-slate-500">({roster.length})</span></div>
        {loading ? <p className="p-8 text-center text-xs text-slate-500">Loading enrolled students…</p> : !selectedCourseId ? <p className="p-8 text-center text-xs text-slate-500">Select a course to load its attendance roster.</p> : roster.length === 0 ? <p className="p-8 text-center text-xs text-slate-500">No active students are enrolled in this course.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3">Remarks</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{roster.map(student => {
                const id = String(student.id);
                const currentStatus = statusMap[id] || 'unmarked';
                return (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><span className="block font-bold text-slate-900">{student.name}</span><span className="text-[10px] text-slate-500">{student.email}</span></td>
                    <td className="px-4 py-3 font-mono text-blue-700">#{student.id}</td>
                    <td className="px-4 py-3 text-slate-600">{student.branch_id ? `Branch #${student.branch_id}` : '—'}</td>
                    <td className="px-4 py-3"><div className="flex justify-center gap-1">
                      {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map(status => (
                        <button key={status} type="button" onClick={() => handleToggle(student.id, status)} disabled={saving} title={statusLabels[status]} aria-label={`${statusLabels[status]} for ${student.name}`} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition-colors disabled:opacity-50 ${currentStatus === status ? status === 'present' ? 'bg-emerald-600 text-white' : status === 'late' ? 'bg-amber-500 text-white' : status === 'absent' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {status === 'present' ? 'P' : status === 'late' ? 'L' : status === 'absent' ? 'A' : 'E'}
                        </button>
                      ))}
                    </div></td>
                    <td className="px-4 py-3"><input type="text" maxLength={1000} value={remarksMap[id] || ''} onChange={event => setRemarksMap(current => ({ ...current, [id]: event.target.value }))} disabled={saving} placeholder="Optional remarks…" className="w-44 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 disabled:opacity-50" /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-[11px] text-slate-500">Attendance is saved to the database for the selected course and date. Every enrolled student must be marked before the sheet can be saved.</p>
    </div>
  );
};
