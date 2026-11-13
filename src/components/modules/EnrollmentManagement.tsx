import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, BookOpen, Users } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

type Enrollment = {
  id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  course_id: number;
  course_title: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  enrolled_at: string;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
};

type StudentOption = { id: number; name: string; email: string; role: string };
type CourseOption = { id: number; title: string };

const statuses: Enrollment['status'][] = ['pending', 'active', 'completed', 'cancelled'];

export const EnrollmentManagement: React.FC = () => {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState<Enrollment['status']>('pending');
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [enrollments, userResult, courseResult] = await Promise.all([
      apiClient.enrollments.getAll(filter, 200),
      apiClient.users.getAll('', 100),
      apiClient.courses.getAll(),
    ]);
    if (enrollments.success && Array.isArray(enrollments.data)) setItems(enrollments.data as Enrollment[]);
    else setError(enrollments.error || 'Could not load enrollments.');
    if (userResult.success && Array.isArray(userResult.data)) {
      setStudents((userResult.data as StudentOption[]).filter(user => user.role === 'student'));
    }
    if (courseResult.success && Array.isArray(courseResult.data)) setCourses(courseResult.data as CourseOption[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const createEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId || !courseId) return;
    setSaving(true);
    setError('');
    const result = await apiClient.enrollments.create({
      user_id: Number(studentId),
      course_id: Number(courseId),
      status,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Enrollment could not be created.');
      return;
    }
    setNotice('Enrollment created successfully.');
    setShowCreate(false);
    setStudentId('');
    setCourseId('');
    setStatus('pending');
    await load();
  };

  const updateStatus = async (item: Enrollment, nextStatus: Enrollment['status']) => {
    const result = await apiClient.enrollments.update(item.id, { status: nextStatus });
    if (!result.success) {
      setError(result.error || 'Enrollment status could not be updated.');
      return;
    }
    setNotice(`Enrollment #${item.id} updated.`);
    await load();
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Enrollments</h2>
          <p className="mt-1 text-xs text-slate-500">Assign active students to published courses and control access status.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button onClick={() => { setShowCreate(value => !value); setError(''); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Enrollment</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}

      {showCreate && <form onSubmit={createEnrollment} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-semibold text-slate-600">Student
          <select required value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
            <option value="">Select student</option>
            {students.map(student => <option key={student.id} value={student.id}>{student.name} — {student.email}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">Published course
          <select required value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
            <option value="">Select course</option>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">Initial access status
          <select value={status} onChange={e => setStatus(e.target.value as Enrollment['status'])} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
            {statuses.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <div className="flex items-end"><button disabled={saving} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Create Enrollment'}</button></div>
        <p className="text-[11px] text-slate-500 sm:col-span-2 lg:col-span-4">Setting status to Active grants course access. Only authorized administrators can do this. Payment verification is not connected to this manual workflow.</p>
      </form>}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold text-slate-600">Filter status</span>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">
          <option value="">All statuses</option>
          {statuses.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500">{items.length} records loaded</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Enrolled</th><th className="px-4 py-3">Access status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading enrollments…</td></tr>
                : items.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No enrollment records found.</td></tr>
                : items.map(item => <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /><div><div className="font-semibold text-slate-900">{item.student_name}</div><div className="text-[11px] text-slate-500">{item.student_email}</div></div></div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /><span className="font-medium text-slate-800">{item.course_title}</span></div></td>
                  <td className="px-4 py-3 text-slate-500">{item.enrolled_at ? new Date(item.enrolled_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><select aria-label={`Status for enrollment ${item.id}`} value={item.status} onChange={e => void updateStatus(item, e.target.value as Enrollment['status'])} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 capitalize text-xs">{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select></td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
