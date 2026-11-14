import React, { useCallback, useEffect, useState } from 'react';
import { Award, Search, Plus, Printer, ShieldCheck, X, Ban, RefreshCw } from 'lucide-react';
import { apiClient, CertificateApiRecord } from '../../services/apiClient';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';

interface StudentOption { id: number; name: string; email: string; }
interface CourseOption { id: number; title: string; }

const normalizeLaravelCertificate = (row: Record<string, unknown>): CertificateApiRecord => ({
  id: Number(row.id),
  certificateNumber: String(row.certificate_number || ''),
  studentUserId: Number(row.student_user_id || 0),
  studentId: String(row.student_id_snapshot || ''),
  studentName: String(row.student_name_snapshot || ''),
  courseId: Number(row.course_id || 0),
  courseTitle: String(row.course_title_snapshot || ''),
  completionDate: String(row.completion_date || ''),
  grade: String(row.grade || ''),
  issueDate: String(row.issued_at || row.issue_date || ''),
  authorizedBy: String(row.authorized_by || ''),
  status: row.status === 'revoked' ? 'revoked' : 'issued',
  revokedAt: row.revoked_at ? String(row.revoked_at) : null,
  revokeReason: row.revoke_reason ? String(row.revoke_reason) : null,
});

export const CertificateManager: React.FC = () => {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [certificates, setCertificates] = useState<CertificateApiRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [showIssue, setShowIssue] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [grade, setGrade] = useState('Completed');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<CertificateApiRecord | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CertificateApiRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const [certResult, studentResult, courseResult] = await Promise.all([
      isLaravelApiEnabled ? laravelApiClient.certificates.list(query) : apiClient.certificates.getAll(query),
      isLaravelApiEnabled ? laravelApiClient.certificates.students(studentSearch) : apiClient.certificates.getStudents(studentSearch),
      apiClient.courses.getAll(),
    ]);
    const certificateRows = isLaravelApiEnabled
      ? (certResult.data as { items?: unknown[] } | undefined)?.items
      : certResult.data;
    const studentRows = isLaravelApiEnabled
      ? (studentResult.data as { items?: unknown[] } | undefined)?.items
      : studentResult.data;
    if (certResult.success && Array.isArray(certificateRows)) {
      setCertificates(isLaravelApiEnabled
        ? (certificateRows as Array<Record<string, unknown>>).map(normalizeLaravelCertificate)
        : certificateRows as CertificateApiRecord[]);
    } else setError(certResult.error || 'Could not load certificates from the server.');
    if (studentResult.success && Array.isArray(studentRows)) {
      setStudents(studentRows as StudentOption[]);
    } else if (!studentResult.success) {
      setError(studentResult.error || 'Could not load student accounts.');
    }
    if (courseResult.success && courseResult.data) {
      setCourses((courseResult.data as Array<Record<string, unknown>>).map(course => ({ id: Number(course.id), title: String(course.title) })).filter(course => Number.isInteger(course.id) && course.id > 0));
    }
    setLoading(false);
  }, [query, studentSearch]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId || !courseId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const result = isLaravelApiEnabled
      ? await laravelApiClient.certificates.issue({ student_user_id: Number(studentId), course_id: Number(courseId), grade: grade.trim() })
      : await apiClient.certificates.issue(Number(studentId), Number(courseId), grade.trim());
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Certificate could not be issued.');
      return;
    }
    setShowIssue(false);
    setStudentId('');
    setStudentSearch('');
    setGrade('Completed');
    const issuedNumber = isLaravelApiEnabled
      ? String((result.data as Record<string, unknown> | undefined)?.certificate_number || 'saved successfully')
      : result.data?.certificate_number || 'saved successfully';
    setSuccess(`Certificate issued: ${issuedNumber}`);
    await refresh();
  };

  const handleRevoke = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!revokeTarget || !revokeReason.trim()) return;
    setSaving(true);
    setSuccess('');
    const result = isLaravelApiEnabled
      ? await laravelApiClient.certificates.revoke(revokeTarget.id, revokeReason.trim())
      : await apiClient.certificates.revoke(revokeTarget.id, revokeReason.trim());
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Certificate could not be revoked.');
      return;
    }
    setRevokeTarget(null);
    setRevokeReason('');
    setSuccess('Certificate revoked. Public verification will now show it as invalid.');
    await refresh();
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Certificate Registry</h2>
          <p className="text-xs text-slate-500 mt-1">Server-issued credentials with public verification and an auditable revocation history.</p>
        </div>
        <button onClick={() => setShowIssue(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Issue Certificate
        </button>
      </div>

      {success && <div role="status" className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">{success}</div>}
      {error && <div role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs">{error}</div>}

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-2">
        <Search className="w-4 h-4 text-slate-400 mt-2" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search certificate number, student or course" className="flex-1 text-xs outline-none" />
        <button onClick={() => void refresh()} aria-label="Refresh certificates" className="p-2 text-slate-500 hover:text-blue-600"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="text-sm text-slate-500">Loading certificate registry…</div> :
          certificates.length === 0 ? <div className="text-sm text-slate-500 bg-white border rounded-xl p-6">No certificates found in the database.</div> :
          certificates.map(certificate => (
            <article key={certificate.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-blue-700 break-all">{certificate.certificateNumber}</span>
                <span className={certificate.status === 'issued' ? 'text-[10px] rounded-full px-2 py-1 bg-emerald-50 text-emerald-700' : 'text-[10px] rounded-full px-2 py-1 bg-rose-50 text-rose-700'}>
                  {certificate.status === 'issued' ? 'Issued' : 'Revoked'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{certificate.studentName}</h3>
                <p className="text-xs text-slate-500">{certificate.courseTitle}</p>
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 border-t pt-3">
                <p>Student ID: {certificate.studentId}</p>
                <p>Grade: {certificate.grade}</p>
                <p>Issued: {formatDate(certificate.issueDate)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(certificate)} className="flex-1 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> View / Print
                </button>
                {certificate.status === 'issued' && <button onClick={() => setRevokeTarget(certificate)} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50" title="Revoke certificate"><Ban className="w-4 h-4" /></button>}
              </div>
            </article>
          ))
        }
      </div>

      {showIssue && <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <form onSubmit={handleIssue} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold">Issue course certificate</h3><button type="button" onClick={() => setShowIssue(false)}><X className="w-5 h-5" /></button></div>
          <p className="text-xs text-slate-500">The server checks active enrolment and course completion before issuing. A student can receive only one certificate per course.</p>
          <label className="block text-xs font-semibold">Find student
            <input value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="Search student name or email" className="mt-1 mb-2 w-full border rounded-lg p-2" />
            <select required value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-1 w-full border rounded-lg p-2 bg-white">
              <option value="">Select a student</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.name} — {student.email}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Course
            <select required value={courseId} onChange={event => setCourseId(event.target.value)} className="mt-1 w-full border rounded-lg p-2 bg-white">
              <option value="">Select a course</option>
              {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Grade / Result
            <input required maxLength={100} value={grade} onChange={event => setGrade(event.target.value)} className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <button disabled={saving} className="w-full bg-blue-600 disabled:opacity-50 text-white rounded-lg p-2.5 text-sm font-bold">{saving ? 'Issuing…' : 'Issue certificate'}</button>
        </form>
      </div>}

      {revokeTarget && <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <form onSubmit={handleRevoke} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
          <div className="flex justify-between"><h3 className="font-bold text-rose-700">Revoke certificate</h3><button type="button" onClick={() => setRevokeTarget(null)}><X className="w-5 h-5" /></button></div>
          <p className="text-xs text-slate-600">{revokeTarget.certificateNumber} — {revokeTarget.studentName}</p>
          <label className="block text-xs font-semibold">Reason (required)
            <textarea required maxLength={500} value={revokeReason} onChange={event => setRevokeReason(event.target.value)} className="mt-1 w-full border rounded-lg p-2" rows={3} />
          </label>
          <button disabled={saving} className="w-full bg-rose-600 disabled:opacity-50 text-white rounded-lg p-2.5 text-sm font-bold">{saving ? 'Revoking…' : 'Confirm revocation'}</button>
        </form>
      </div>}

      {selected && <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 overflow-y-auto">
        <div className="certificate-print bg-white w-full max-w-3xl rounded-xl p-8 text-center border-[10px] border-amber-500/40">
          <div className="flex justify-end gap-2 mb-4">
            <button onClick={() => window.print()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
            <button onClick={() => setSelected(null)} className="px-3 py-2 bg-slate-100 rounded-lg text-xs">Close</button>
          </div>
          <ShieldCheck className="w-12 h-12 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-black mt-3">ALOM'S ENGLISH CENTER</h1>
          <p className="text-xs tracking-widest text-amber-700 mt-1">CERTIFICATE OF COMPLETION</p>
          <p className="text-sm text-slate-500 mt-8">This certifies that</p>
          <h2 className="text-3xl font-serif font-bold my-3">{selected.studentName}</h2>
          <p className="text-sm text-slate-600">has successfully completed</p>
          <h3 className="text-xl font-bold text-blue-900 my-2">{selected.courseTitle}</h3>
          <p className="text-sm mt-4">Result: <strong>{selected.grade}</strong></p>
          <p className="text-xs text-slate-500 mt-2">Completion date: {formatDate(selected.completionDate)}</p>
          <div className="border-t mt-8 pt-4 flex flex-col sm:flex-row justify-between gap-3 text-left text-xs">
            <div><strong>{selected.certificateNumber}</strong><p>Issued: {formatDate(selected.issueDate)}</p></div>
            <div className="text-right"><strong>{selected.authorizedBy}</strong><p>Authorized by</p></div>
          </div>
          <p className={selected.status === 'issued' ? 'mt-4 text-xs text-emerald-700' : 'mt-4 text-xs text-rose-700'}>{selected.status === 'issued' ? 'Valid in the official certificate registry' : 'REVOKED — this certificate is no longer valid'}</p>
        </div>
      </div>}
    </div>
  );
};
