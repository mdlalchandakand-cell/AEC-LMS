import React, { useCallback, useEffect, useState } from 'react';
import { Award, BookOpen, Clock, Play, RefreshCw } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';

interface ExamSummary {
  id: number;
  course_id: number | null;
  course_title: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  negative_mark_per_wrong: number;
  max_attempts: number;
  status: string;
  question_count: number;
}

interface ExamAttempt {
  id: number;
  exam_id: number;
  exam_title: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  passed: number | null;
  status: string;
}

interface ExamPortalProps {
  onStartExam: (examId: string) => void;
  showResults?: boolean;
}

export const ExamPortal: React.FC<ExamPortalProps> = ({ onStartExam, showResults = false }) => {
  const { isAuthenticated } = useLms();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!isAuthenticated) {
      setError('Please sign in to view examinations and results.');
      setLoading(false);
      return;
    }
    if (showResults) {
      const result = isLaravelApiEnabled
        ? await laravelApiClient.exams.attempts()
        : await apiClient.exams.getAttempts();
      const items = isLaravelApiEnabled
        ? (result.data as { items?: unknown[] } | undefined)?.items
        : result.data;
      if (result.success && Array.isArray(items)) setAttempts(items as ExamAttempt[]);
      else setError(result.error || 'Could not load exam results.');
    } else {
      const result = isLaravelApiEnabled
        ? await laravelApiClient.exams.list()
        : await apiClient.exams.getAll();
      const items = isLaravelApiEnabled
        ? (result.data as { items?: unknown[] } | undefined)?.items
        : result.data;
      if (result.success && Array.isArray(items)) setExams(items as ExamSummary[]);
      else setError(result.error || 'Could not load available examinations.');
    }
    setLoading(false);
  }, [isAuthenticated, showResults]);

  useEffect(() => { void loadData(); }, [loadData]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{showResults ? 'My Examination Results' : 'Online Examination Portal'}</h2>
          <p className="mt-1 text-xs text-slate-500">{showResults ? 'Your submitted attempts and server-calculated results.' : 'Timed examinations with server-side scoring, negative marking and answer review.'}</p>
        </div>
        <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Loading…</div>
      ) : showResults ? (
        attempts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">No examination attempts yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {attempts.map(attempt => (
              <div key={attempt.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Award className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div><h3 className="text-sm font-semibold text-slate-900">{attempt.exam_title}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">Submitted: {attempt.submitted_at || 'Not submitted'} · Attempt #{attempt.id}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {attempt.status === 'submitted' ? <><p className="text-sm font-bold text-slate-900">{attempt.score} / {attempt.total_marks} ({attempt.percentage}%)</p><span className={`text-[10px] font-bold uppercase ${Number(attempt.passed) === 1 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(attempt.passed) === 1 ? 'Passed' : 'Not passed'}</span></> : <span className="text-xs font-semibold text-amber-700">{attempt.status}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        exams.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-2 text-xs text-slate-500">No examinations are currently available for your enrolled courses.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {exams.map(exam => (
              <article key={exam.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div><span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{exam.course_title || 'General assessment'}</span><h3 className="mt-1 text-base font-bold text-slate-900">{exam.title}</h3></div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">Available</span>
                </div>
                {exam.description && <p className="text-xs leading-relaxed text-slate-500">{exam.description}</p>}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600"><Clock className="h-3.5 w-3.5" /> {exam.duration_minutes} minutes</span>
                  <span className="text-slate-600">{exam.question_count} questions</span>
                  <span className="text-slate-600">{exam.total_marks} total marks</span>
                  <span className="text-slate-600">Pass: {exam.pass_marks}</span>
                  <span className="col-span-2 text-[11px] text-slate-500">Negative marking: {exam.negative_mark_per_wrong} per wrong answer · Max attempts: {exam.max_attempts}</span>
                </div>
                <button type="button" onClick={() => onStartExam(String(exam.id))} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"><Play className="h-3.5 w-3.5 fill-current" /> Start Exam</button>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
};
