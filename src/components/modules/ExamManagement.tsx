import React, { useCallback, useEffect, useState } from 'react';
import { Archive, BookPlus, Edit2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { isLaravelApiEnabled, laravelApiClient } from '../../services/laravelApiClient';

type ExamStatus = 'draft' | 'published' | 'archived';

interface ExamRecord {
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
  status: ExamStatus;
  question_count: number;
}

interface QuestionForm {
  question: string;
  options: string[];
  correct_option_index: number;
  marks: number;
  explanation: string;
}

const blankQuestion = (): QuestionForm => ({
  question: '',
  options: ['', '', '', ''],
  correct_option_index: 0,
  marks: 1,
  explanation: '',
});

const blankExam = {
  course_id: '',
  title: '',
  description: '',
  duration_minutes: 30,
  pass_marks: 0,
  negative_mark_per_wrong: 0,
  max_attempts: 1,
  status: 'draft' as ExamStatus,
  opens_at: '',
  closes_at: '',
};

export const ExamManagement: React.FC = () => {
  const { courses } = useLms();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [bankItems, setBankItems] = useState<Array<Record<string, unknown>>>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankExam);
  const [questions, setQuestions] = useState<QuestionForm[]>([blankQuestion()]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadExams = useCallback(async () => {
    setLoading(true);
    const [result, bankResult] = await Promise.all([
      isLaravelApiEnabled ? laravelApiClient.exams.list() : apiClient.exams.getAll(),
      isLaravelApiEnabled ? laravelApiClient.questionBank.list() : apiClient.questionBank.getAll(),
    ]);
    const examItems = isLaravelApiEnabled
      ? (result.data as { items?: unknown[] } | undefined)?.items
      : result.data;
    const questionItems = isLaravelApiEnabled
      ? (bankResult.data as { items?: unknown[] } | undefined)?.items
      : bankResult.data;
    if (result.success && Array.isArray(examItems)) {
      setExams(examItems as ExamRecord[]);
      setError('');
    } else {
      setError(result.error || 'Could not load examinations.');
    }
    if (bankResult.success && Array.isArray(questionItems)) {
      setBankItems(questionItems
        .map(item => isLaravelApiEnabled ? { ...item, question: item.question_text } : item)
        .filter(item => item.status === 'published'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadExams(); }, [loadExams]);

  const openNew = () => {
    setEditingId(null);
    setForm(blankExam);
    setQuestions([blankQuestion()]);
    setSelectedBankIds([]);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const editExam = async (exam: ExamRecord) => {
    setError('');
    setNotice('');
    const result = isLaravelApiEnabled
      ? await laravelApiClient.exams.getById(exam.id)
      : await apiClient.exams.getById(exam.id);
    if (!result.success || !result.data) {
      setError(result.error || 'Could not load the examination.');
      return;
    }
    const raw = result.data;
    const questionRows = Array.isArray(raw.questions) ? raw.questions as Array<Record<string, unknown>> : [];
    setEditingId(exam.id);
    setForm({
      course_id: raw.course_id == null ? '' : String(raw.course_id),
      title: String(raw.title || ''),
      description: String(raw.description || ''),
      duration_minutes: Number(raw.duration_minutes || 30),
      pass_marks: Number(raw.pass_marks || 0),
      negative_mark_per_wrong: Number(raw.negative_mark_per_wrong || 0),
      max_attempts: Number(raw.max_attempts || 1),
      status: (raw.status as ExamStatus) || 'draft',
      opens_at: raw.opens_at ? String(raw.opens_at).replace(' ', 'T').slice(0, 16) : '',
      closes_at: raw.closes_at ? String(raw.closes_at).replace(' ', 'T').slice(0, 16) : '',
    });
    const importedIds = questionRows.map(question => Number(question.question_bank_item_id || 0)).filter(id => id > 0);
    setSelectedBankIds(importedIds);
    const manualQuestions = questionRows.filter(question => !question.question_bank_item_id);
    setQuestions(manualQuestions.map(question => ({
      question: String(question.question || ''),
      options: Array.isArray(question.options) ? (question.options as string[]).slice(0, 8) : ['', ''],
      correct_option_index: Number(question.correct_option_index || 0),
      marks: Number(question.marks || 1),
      explanation: String(question.explanation || ''),
    })));
    setShowForm(true);
  };

  const updateQuestion = (index: number, patch: Partial<QuestionForm>) => {
    setQuestions(current => current.map((question, i) => i === index ? { ...question, ...patch } : question));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(current => current.map((question, i) => i === questionIndex
      ? { ...question, options: question.options.map((option, j) => j === optionIndex ? value : option) }
      : question));
  };

  const addOption = (questionIndex: number) => {
    setQuestions(current => current.map((question, i) => i === questionIndex && question.options.length < 8
      ? { ...question, options: [...question.options, ''] }
      : question));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(current => current.map((question, i) => {
      if (i !== questionIndex || question.options.length <= 2) return question;
      const options = question.options.filter((_, j) => j !== optionIndex);
      const correct = question.correct_option_index >= options.length ? options.length - 1 : question.correct_option_index;
      return { ...question, options, correct_option_index: correct };
    }));
  };

  const saveExam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const manualQuestions = questions.filter(question => question.question.trim() || question.options.some(option => option.trim()));
    if (manualQuestions.length + selectedBankIds.length < 1 || manualQuestions.some(question => !question.question.trim() || question.options.some(option => !option.trim()) || question.options.length < 2)) {
      setError('Add at least one manual or reusable question. Every manual question needs non-empty options.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    const desiredStatus = form.status;
    const payload = {
      ...form,
      course_id: form.course_id || null,
      opens_at: form.opens_at ? `${form.opens_at.replace('T', ' ')}:00` : null,
      closes_at: form.closes_at ? `${form.closes_at.replace('T', ' ')}:00` : null,
      status: 'draft',
    };

    let examId = editingId;
    if (examId === null) {
      const created = isLaravelApiEnabled
        ? await laravelApiClient.exams.create(payload)
        : await apiClient.exams.create(payload);
      if (!created.success || !created.data?.id) {
        setError(created.error || 'Could not create the examination.');
        setSaving(false);
        return;
      }
      examId = created.data.id;
      setEditingId(examId);
    } else {
      const updated = isLaravelApiEnabled
        ? await laravelApiClient.exams.update(examId, payload)
        : await apiClient.exams.update(examId, payload);
      if (!updated.success) {
        setError(updated.error || 'Could not update examination settings.');
        setSaving(false);
        return;
      }
    }

    const cleanQuestions = manualQuestions.map(question => ({
      question: question.question.trim(),
      options: question.options.map(option => option.trim()).filter(Boolean),
      correct_option_index: question.correct_option_index,
      marks: Number(question.marks),
      explanation: question.explanation.trim(),
    }));
    const savedQuestions = isLaravelApiEnabled
      ? await laravelApiClient.exams.saveQuestions(examId, cleanQuestions)
      : await apiClient.exams.saveQuestions(examId, cleanQuestions);
    if (!savedQuestions.success) {
      setError(savedQuestions.error || 'Exam settings were saved, but questions could not be saved. Review and retry.');
      setSaving(false);
      return;
    }
    if (selectedBankIds.length > 0) {
      const imported = isLaravelApiEnabled
        ? await laravelApiClient.questionBank.addToExam(examId, selectedBankIds)
        : await apiClient.questionBank.addToExam(examId, selectedBankIds);
      if (!imported.success) {
        setError(imported.error || 'Manual questions were saved, but reusable questions could not be imported.');
        setSaving(false);
        return;
      }
    }

    if (desiredStatus !== 'draft') {
      const published = isLaravelApiEnabled
        ? await laravelApiClient.exams.update(examId, { ...payload, status: desiredStatus })
        : await apiClient.exams.update(examId, { ...payload, status: desiredStatus });
      if (!published.success) {
        setError(published.error || 'Questions were saved, but the exam status could not be updated.');
        setSaving(false);
        return;
      }
    }

    await loadExams();
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(blankExam);
    setQuestions([blankQuestion()]);
    setSelectedBankIds([]);
    setNotice('Examination and questions saved successfully.');
  };

  const archiveExam = async (exam: ExamRecord) => {
    if (!window.confirm(`Archive "${exam.title}"? Exams with attempts cannot be archived.`)) return;
    const result = isLaravelApiEnabled
      ? await laravelApiClient.exams.archive(exam.id)
      : await apiClient.exams.delete(exam.id);
    if (!result.success) {
      setError(result.error || 'Could not archive the examination.');
      return;
    }
    setNotice('Examination archived.');
    await loadExams();
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Examination Management</h2>
          <p className="mt-1 text-xs text-slate-500">Build timed MCQ exams, configure negative marking and publish only after questions are saved. Scores are calculated by the server.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadExams()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
            <BookPlus className="h-3.5 w-3.5" /> Create Exam
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}

      {showForm && (
        <form onSubmit={saveExam} className="space-y-5 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{editingId === null ? 'Create new examination' : `Edit examination #${editingId}`}</h3>
            <button type="button" disabled={saving} onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Exam title *
              <input required maxLength={180} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Description
              <textarea rows={2} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Course (optional)
              <select value={form.course_id} onChange={event => setForm(current => ({ ...current, course_id: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                <option value="">Standalone exam</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Status
              <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as ExamStatus }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Duration (minutes)
              <input type="number" min="1" max="1440" value={form.duration_minutes} onChange={event => setForm(current => ({ ...current, duration_minutes: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Pass marks
              <input type="number" min="0" step="0.01" value={form.pass_marks} onChange={event => setForm(current => ({ ...current, pass_marks: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Negative mark per wrong answer
              <input type="number" min="0" step="0.01" value={form.negative_mark_per_wrong} onChange={event => setForm(current => ({ ...current, negative_mark_per_wrong: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Maximum attempts
              <input type="number" min="1" max="20" value={form.max_attempts} onChange={event => setForm(current => ({ ...current, max_attempts: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Opens at (optional)
              <input type="datetime-local" value={form.opens_at} onChange={event => setForm(current => ({ ...current, opens_at: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">Closes at (optional)
              <input type="datetime-local" value={form.closes_at} onChange={event => setForm(current => ({ ...current, closes_at: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div><h4 className="text-sm font-bold text-slate-900">Questions</h4><p className="text-[11px] text-slate-500">Correct answers remain private until the student submits.</p></div>
              <button type="button" onClick={() => setQuestions(current => [...current, blankQuestion()])} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Plus className="h-3.5 w-3.5" /> Add question</button>
            </div>
            {questions.map((question, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-800">Question {index + 1}</span>
                  {questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, i) => i !== index))} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <label className="block space-y-1 text-xs font-semibold text-slate-700">Question text *
                  <textarea required rows={2} value={question.question} onChange={event => updateQuestion(index, { question: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center text-[11px] font-bold text-slate-500">{String.fromCharCode(65 + optionIndex)}</span>
                      <input value={option} onChange={event => updateOption(index, optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                      {question.options.length > 2 && <button type="button" onClick={() => removeOption(index, optionIndex)} className="text-slate-400 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  ))}
                </div>
                {question.options.length < 8 && <button type="button" onClick={() => addOption(index)} className="text-[11px] font-semibold text-blue-700 hover:underline">+ Add option</button>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-slate-700">Correct answer
                    <select value={question.correct_option_index} onChange={event => updateQuestion(index, { correct_option_index: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal">
                      {question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-700">Marks
                    <input type="number" min="0.01" step="0.01" value={question.marks} onChange={event => updateQuestion(index, { marks: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                  </label>
                </div>
                <label className="block space-y-1 text-xs font-semibold text-slate-700">Answer explanation
                  <textarea rows={2} value={question.explanation} onChange={event => updateQuestion(index, { explanation: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div><h4 className="text-sm font-bold text-slate-900">Import reusable question bank items</h4><p className="text-[11px] text-slate-500">Published bank questions are copied into this draft exam. You can reuse one bank item in different exams.</p></div>
            {bankItems.length === 0 ? <p className="text-xs text-slate-500">No published question bank items available. Add them in Question Bank & Marksheets first.</p> : (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {bankItems.map(item => {
                  const bankId = Number(item.id);
                  return <label key={bankId} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                    <input type="checkbox" checked={selectedBankIds.includes(bankId)} onChange={() => setSelectedBankIds(current => current.includes(bankId) ? current.filter(id => id !== bankId) : [...current, bankId])} className="mt-0.5" />
                    <span className="min-w-0"><strong className="block text-slate-800">{String(item.question_text || '')}</strong><span className="mt-1 block text-[10px] text-slate-500">{String(item.category || 'General')} · {String(item.difficulty || 'intermediate')} · {Number(item.marks || 0)} marks</span></span>
                  </label>;
                })}
              </div>
            )}
            <p className="text-[10px] text-indigo-700">Selected reusable questions: {selectedBankIds.length}</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button type="button" disabled={saving} onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save examination'}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ? <p className="p-6 text-center text-xs text-slate-500">Loading examinations…</p> : exams.length === 0 ? <p className="p-6 text-center text-xs text-slate-500">No examinations created yet.</p> : (
          <div className="divide-y divide-slate-100">
            {exams.map(exam => (
              <div key={exam.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900">{exam.title}</h3>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${exam.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{exam.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{exam.course_title || 'Standalone exam'} · {exam.question_count} questions · {exam.total_marks} marks · {exam.duration_minutes} min</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void editExam(exam)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"><Edit2 className="h-3.5 w-3.5" /> Edit</button>
                  <button type="button" onClick={() => void archiveExam(exam)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Archive className="h-3.5 w-3.5" /> Archive</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
