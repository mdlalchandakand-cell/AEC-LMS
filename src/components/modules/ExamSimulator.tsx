import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Award, CheckCircle2, Clock, Flag, ShieldCheck, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '../../services/apiClient';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';

interface Question { id: number; question: string; options: string[]; }
interface Exam { id: number; title: string; course_title: string | null; total_marks: number; pass_marks: number; negative_mark_per_wrong: number; questions: Question[]; }
interface Review { question_id: number; question: string; options: string[]; user_answer: number | null; correct_option_index: number; explanation: string | null; }
interface Result { score: number; total_marks: number; percentage: number; passed: boolean; review: Review[]; }
interface Props { examId?: string; onExit: () => void; }

export const ExamSimulator: React.FC<Props> = ({ examId, onExit }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!examId) { setError('No examination was selected.'); setLoading(false); return; }
      const detail = isLaravelApiEnabled
        ? await laravelApiClient.exams.getById(Number(examId))
        : await apiClient.exams.getById(examId);
      if (!detail.success || !detail.data) { if (active) setError(detail.error || 'Could not load exam.'); if (active) setLoading(false); return; }
      const started = isLaravelApiEnabled
        ? await laravelApiClient.exams.start(Number(examId))
        : await apiClient.exams.start(examId);
      if (!started.success || !started.data?.attempt) { if (active) setError(started.error || 'Could not start exam.'); if (active) setLoading(false); return; }
      if (!active) return;
      const startData = started.data as Record<string, any>;
      const raw = isLaravelApiEnabled && startData.exam
        ? startData.exam as Record<string, unknown>
        : detail.data as Record<string, unknown>;
      const attempt = startData.attempt as Record<string, unknown>;
      const rows = Array.isArray(raw.questions) ? raw.questions as Array<Record<string, unknown>> : [];
      setExam({
        id: Number(raw.id), title: String(raw.title || 'Examination'),
        course_title: raw.course_title == null ? null : String(raw.course_title),
        total_marks: Number(raw.total_marks || 0), pass_marks: Number(raw.pass_marks || 0),
        negative_mark_per_wrong: Number(raw.negative_mark_per_wrong || 0),
        questions: rows.map(row => ({ id: Number(row.id), question: String(row.question || ''), options: Array.isArray(row.options) ? row.options as string[] : [] })),
      });
      setAttemptId(Number(attempt.id));
      setAnswers(attempt.answers && typeof attempt.answers === 'object' ? attempt.answers as Record<string, number> : {});
      setSeconds(Number(attempt.remaining_seconds || 0));
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [examId]);

  const submit = useCallback(async () => {
    if (!attemptId || submitting || result) return;
    setSubmitting(true);
    setError('');
    const response = isLaravelApiEnabled
      ? await laravelApiClient.exams.submit(attemptId, answers)
      : await apiClient.exams.submitAttempt(attemptId, answers);
    if (!response.success || !response.data) {
      setError(response.error || 'Submission failed. Please try again.');
      setSubmitting(false);
      return;
    }
    const data = response.data as unknown as Result;
    setResult(data);
    setSubmitting(false);
    if (data.passed) confetti({ particleCount: 70, spread: 60 });
  }, [attemptId, submitting, result, answers]);

  useEffect(() => {
    if (!attemptId || loading || result || submitting) return;
    if (seconds <= 0) { void submit(); return; }
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [attemptId, loading, result, submitting, seconds, submit]);

  const selectAnswer = (questionId: number, option: number) => {
    if (!attemptId || submitting || result) return;
    const next = { ...answers, [String(questionId)]: option };
    setAnswers(next);
    saveQueue.current = saveQueue.current.then(async () => {
      const saved = isLaravelApiEnabled
        ? await laravelApiClient.exams.saveAnswers(attemptId, next)
        : await apiClient.exams.saveAnswers(attemptId, next);
      if (!saved.success) setError(saved.error || 'Autosave failed; current answers will still be sent on submit.');
    }).catch(() => setError('Autosave failed; current answers will still be sent on submit.'));
  };

  const finish = () => { if (window.confirm('Submit your examination now? You cannot change answers after submission.')) void submit(); };
  const formatTime = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading examination…</div>;
  if (error && !exam) return <div className="space-y-4 rounded-2xl border border-rose-200 bg-white p-6"><p role="alert" className="text-sm text-rose-700">{error}</p><button type="button" onClick={onExit} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Back to examinations</button></div>;
  if (!exam || !attemptId || !exam.questions.length) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No questions are available. <button onClick={onExit} className="ml-2 text-blue-700 underline">Back</button></div>;

  const current = exam.questions[index];
  const answered = Object.keys(answers).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div><span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{exam.course_title || 'General examination'}</span><h2 className="text-lg font-bold text-slate-900">{exam.title}</h2><p className="mt-1 text-xs text-slate-500">{exam.total_marks} marks · Pass: {exam.pass_marks} · Negative: {exam.negative_mark_per_wrong} per wrong answer</p></div>
        {!result && <div className="flex items-center gap-3"><span className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-sm font-bold ${seconds < 120 ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}><Clock className="h-4 w-4" />{formatTime(seconds)}</span><button type="button" onClick={finish} disabled={submitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit exam'}</button></div>}
      </header>
      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {result ? (
        <div className="space-y-5">
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center"><Award className={`mx-auto h-10 w-10 ${result.passed ? 'text-emerald-600' : 'text-rose-600'}`} /><h3 className="mt-3 text-2xl font-extrabold text-slate-900">{result.score} / {result.total_marks}</h3><p className="text-sm text-slate-500">{result.percentage}% · {result.passed ? 'Passed' : 'Not passed'}</p><button type="button" onClick={onExit} className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white">Back to dashboard</button></div>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"><h3 className="text-base font-bold text-slate-900">Answer review</h3>
            {result.review.map((item, i) => <div key={item.question_id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-slate-900">{i + 1}. {item.question}</p>{item.user_answer === item.correct_option_index ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}</div>{item.options.map((option, optionIndex) => <p key={optionIndex} className={`rounded-lg border px-3 py-2 text-xs ${optionIndex === item.correct_option_index ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : optionIndex === item.user_answer ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-600'}`}>{String.fromCharCode(65 + optionIndex)}. {option}{optionIndex === item.correct_option_index ? ' — Correct' : optionIndex === item.user_answer ? ' — Your answer' : ''}</p>)}{item.explanation && <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900"><strong>Explanation:</strong> {item.explanation}</p>}</div>)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
          <main className="space-y-4"><div className="flex justify-between text-xs text-slate-500"><span>Question {index + 1} of {exam.questions.length}</span><span>{answered} answered</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${Math.round(answered / exam.questions.length * 100)}%` }} /></div>
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold leading-relaxed text-slate-900">{index + 1}. {current.question}</h3><button type="button" onClick={() => setFlags(previous => ({ ...previous, [String(current.id)]: !previous[String(current.id)] }))} className={`rounded-lg p-2 ${flags[String(current.id)] ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><Flag className="h-4 w-4" /></button></div>
              <div className="space-y-2">{current.options.map((option, optionIndex) => { const selected = answers[String(current.id)] === optionIndex; return <button key={optionIndex} type="button" onClick={() => selectAnswer(current.id, optionIndex)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm ${selected ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>; })}</div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4"><button type="button" disabled={index === 0} onClick={() => setIndex(value => Math.max(0, value - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5" /> Previous</button>{index < exam.questions.length - 1 ? <button type="button" onClick={() => setIndex(value => Math.min(exam.questions.length - 1, value + 1))} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Next <ArrowRight className="h-3.5 w-3.5" /></button> : <button type="button" onClick={finish} disabled={submitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Finish exam</button>}</div>
            </section>
          </main>
          <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-bold text-slate-900">Question navigator</h3></div><div className="grid grid-cols-5 gap-2">{exam.questions.map((question, questionIndex) => <button key={question.id} type="button" onClick={() => setIndex(questionIndex)} className={`relative flex h-9 items-center justify-center rounded-lg border text-xs font-bold ${questionIndex === index ? 'border-blue-600 bg-blue-600 text-white' : answers[String(question.id)] !== undefined ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{questionIndex + 1}{flags[String(question.id)] && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />}</button>)}</div><p className="text-[10px] text-slate-500">Answers are autosaved to the server during your attempt.</p><button type="button" onClick={finish} disabled={submitting} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Submit exam</button></aside>
        </div>
      )}
    </div>
  );
};
