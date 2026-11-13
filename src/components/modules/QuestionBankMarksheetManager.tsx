import React, { useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { 
  FileText, Award, CheckCircle2, Search, Plus, Printer, 
  Trash2, Filter, Sparkles, BookOpen, UserCheck, X 
} from 'lucide-react';
import { QuestionBankItem } from '../../types/lms';

export const QuestionBankMarksheetManager: React.FC = () => {
  const { language } = useLms();
  type MarksheetRow = { id: number; marksheet_number: string; exam_attempt_id: number; exam_id: number; student_user_id: number; student_name: string; student_email: string; exam_title: string; course_title: string | null; score: number; total_marks: number; percentage: number; passed: number; grade: string; issued_at: string; issued_by: string };
  type EligibleAttempt = { attempt_id: number; exam_id: number; student_user_id: number; student_name: string; student_email: string; exam_title: string; course_id: number | null; course_title: string | null; score: number; total_marks: number; percentage: number; passed: number; submitted_at: string };
  const [marksheets, setMarksheets] = useState<MarksheetRow[]>([]);
  const [eligibleAttempts, setEligibleAttempts] = useState<EligibleAttempt[]>([]);
  const [marksheetLoading, setMarksheetLoading] = useState(true);
  const [marksheetError, setMarksheetError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | ''>('');
  const [issuingMarksheet, setIssuingMarksheet] = useState(false);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'questions' | 'marksheets' | 'print_preview'>('questions');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showGenerateMarksheetModal, setShowGenerateMarksheetModal] = useState(false);
  const [activeMarksheetForPrint, setActiveMarksheetForPrint] = useState<MarksheetRow | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Question Form State
  const [qSubject, setQSubject] = useState('IELTS Reading');
  const [qCategory, setQCategory] = useState<QuestionBankItem['category']>('IELTS Academic');
  const [qDifficulty, setQDifficulty] = useState<QuestionBankItem['difficulty']>('Advanced');
  const [qText, setQText] = useState('');
  const [qOption1, setQOption1] = useState('');
  const [qOption2, setQOption2] = useState('');
  const [qOption3, setQOption3] = useState('');
  const [qOption4, setQOption4] = useState('');
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qMarks, setQMarks] = useState(1);
  const [qExplanation, setQExplanation] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    let active = true;
    apiClient.questionBank.getAll().then(result => {
      if (!active) return;
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.filter((row: Record<string, unknown>) => row.status !== 'archived').map((row: Record<string, unknown>) => {
          const rawCategory = String(row.category || 'Grammar');
          const allowedCategories: QuestionBankItem['category'][] = ['IELTS Academic', 'IELTS General', 'Spoken English', 'Grammar', 'Phonetics', 'Vocabulary'];
          const rawDifficulty = String(row.difficulty || 'intermediate').toLowerCase();
          return {
            id: String(row.id),
            subject: Array.isArray(row.tags) && row.tags.length ? String(row.tags[0]) : rawCategory,
            category: allowedCategories.includes(rawCategory as QuestionBankItem['category']) ? rawCategory as QuestionBankItem['category'] : 'Grammar',
            difficulty: (rawDifficulty.charAt(0).toUpperCase() + rawDifficulty.slice(1)) as QuestionBankItem['difficulty'],
            question: String(row.question_text || ''),
            options: Array.isArray(row.options) ? row.options as string[] : [],
            correctOptionIndex: Number(row.correct_option_index || 0),
            marks: Number(row.marks || 1),
            explanation: String(row.explanation || ''),
            authorName: 'Admin',
            createdDate: String(row.created_at || ''),
          } satisfies QuestionBankItem;
        });
        setQuestionBank(mapped);
      } else {
        showToast(result.error || 'Could not load the question bank.');
      }
      setBankLoading(false);
    }).catch(() => {
      if (active) {
        setBankLoading(false);
        showToast('Could not load the question bank.');
      }
    });
    return () => { active = false; };
  }, []);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawOptions = [qOption1, qOption2, qOption3, qOption4];
    const firstEmpty = rawOptions.findIndex(option => !option.trim());
    if (!qText.trim() || !qOption1.trim() || !qOption2.trim() || rawOptions.slice(0, firstEmpty < 0 ? rawOptions.length : firstEmpty).length < 2 || rawOptions.slice(firstEmpty < 0 ? rawOptions.length : firstEmpty).some(option => option.trim())) {
      showToast('Fill options in order without gaps. At least two options are required.');
      return;
    }
    const options = rawOptions.filter(option => option.trim());
    if (qCorrectIdx >= options.length) { showToast('Select a correct answer that exists in the filled options.'); return; }
    const result = await apiClient.questionBank.create({
      category: qCategory,
      question_text: qText.trim(),
      options,
      correct_option_index: Number(qCorrectIdx),
      marks: Number(qMarks),
      explanation: qExplanation.trim(),
      difficulty: qDifficulty.toLowerCase(),
      tags: [qSubject],
      status: 'published',
    });
    if (!result.success) {
      showToast(result.error || 'Could not save question to the bank.');
      return;
    }
    const refreshed = await apiClient.questionBank.getAll();
    if (refreshed.success && Array.isArray(refreshed.data)) {
      const rows = (refreshed.data as Array<Record<string, unknown>>).filter(row => row.status !== 'archived');
      const allowedCategories: QuestionBankItem['category'][] = ['IELTS Academic', 'IELTS General', 'Spoken English', 'Grammar', 'Phonetics', 'Vocabulary'];
      setQuestionBank(rows.map(row => ({
        id: String(row.id),
        subject: Array.isArray(row.tags) && row.tags.length ? String(row.tags[0]) : String(row.category || 'Grammar'),
        category: allowedCategories.includes(String(row.category || '') as QuestionBankItem['category']) ? String(row.category) as QuestionBankItem['category'] : 'Grammar',
        difficulty: (String(row.difficulty || 'intermediate').charAt(0).toUpperCase() + String(row.difficulty || 'intermediate').slice(1)) as QuestionBankItem['difficulty'],
        question: String(row.question_text || ''),
        options: Array.isArray(row.options) ? row.options as string[] : [],
        correctOptionIndex: Number(row.correct_option_index || 0),
        marks: Number(row.marks || 1),
        explanation: String(row.explanation || ''),
        authorName: 'Admin',
        createdDate: String(row.created_at || ''),
      })));
    }
    setShowAddQuestionModal(false);
    setQText('');
    setQOption1('');
    setQOption2('');
    setQOption3('');
    setQOption4('');
    setQCorrectIdx(0);
    showToast(isBn ? 'প্রশ্ন ব্যাংকে নতুন প্রশ্ন সংরক্ষিত হয়েছে!' : 'Question added to Question Bank repository!');
  };

  const refreshMarksheets = async (): Promise<MarksheetRow[]> => {
    setMarksheetLoading(true);
    setMarksheetError(null);
    const [issued, eligible] = await Promise.all([apiClient.marksheets.getAll(), apiClient.marksheets.getEligibleAttempts()]);
    const issuedRows = issued.success && Array.isArray(issued.data) ? issued.data as MarksheetRow[] : [];
    if (issued.success && Array.isArray(issued.data)) setMarksheets(issuedRows);
    else setMarksheetError(issued.error || 'Could not load issued marksheets.');
    if (eligible.success && Array.isArray(eligible.data)) {
      const rows = eligible.data as EligibleAttempt[];
      setEligibleAttempts(rows);
      setSelectedAttemptId(current => current || rows[0]?.attempt_id || '');
    } else if (eligible.error) setMarksheetError(current => current || eligible.error || 'Could not load submitted attempts.');
    setMarksheetLoading(false);
    return issuedRows;
  };

  useEffect(() => { void refreshMarksheets(); }, []);

  const handleGenerateMarksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttemptId || issuingMarksheet) return;
    setIssuingMarksheet(true);
    const result = await apiClient.marksheets.issue(Number(selectedAttemptId));
    setIssuingMarksheet(false);
    if (!result.success) { showToast(result.error || 'Marksheet could not be issued.'); return; }
    const refreshedRows = await refreshMarksheets();
    const issuedRow = refreshedRows.find(row => row.id === result.data?.id);
    if (issuedRow) setActiveMarksheetForPrint(issuedRow);
    setShowGenerateMarksheetModal(false);
    setActiveTab('marksheets');
    showToast(result.message || 'Official marksheet issued from submitted exam result.');
  };

  const filteredQuestions = questionBank.filter(q => {
    const matchesCategory = selectedCategory === 'All' || q.category === selectedCategory;
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              Examination & Diagnostics
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {isBn ? 'প্রশ্ন ব্যাংক ও একাডেমিক মার্কশিট ইঞ্জিন' : 'Central Question Bank & Marksheet Engine'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'প্রশ্ন ব্যাংক ও রেজাল্ট প্রসেসিং' : 'Question Repository & Marksheet Generator'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'আইইএলটিএস, স্পোকেন ও গ্রামার প্রশ্ন ব্যাংক সংরক্ষণ এবং জিপিএ স্কেলে অফিসিয়াল মার্কশিট তৈরি করুন' 
              : 'Repository of exam diagnostics and automated marksheet calculation with official British Council grade scale'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddQuestionModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'প্রশ্ন ব্যাংকে যোগ' : 'Add Question'}</span>
          </button>
          <button
            disabled={eligibleAttempts.length === 0}
            onClick={() => setShowGenerateMarksheetModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>{isBn ? 'মার্কশিট জেনারেট' : 'Generate Marksheet'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isBn ? `প্রশ্ন ব্যাংক (${questionBank.length})` : `Question Repository (${questionBank.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('marksheets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'marksheets'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isBn ? `মার্কশিট রেকর্ডস (${marksheets.length})` : `Issued Marksheets (${marksheets.length})`}</span>
        </button>

        {activeMarksheetForPrint && (
          <button
            onClick={() => setActiveTab('print_preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'print_preview'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{isBn ? 'মার্কশিট প্রিন্ট ভিউ' : 'Marksheet Print Layout'}</span>
          </button>
        )}
      </div>

      {/* ================= TAB 1: QUESTION BANK ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search questions or keywords..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {['All', 'IELTS Academic', 'Spoken English', 'Grammar', 'Phonetics'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                    selectedCategory === cat ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {bankLoading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">Loading question bank…</div> : filteredQuestions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {qIndex + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {q.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{q.marks} Mark</span>
                    <button
                      onClick={async () => { const result = await apiClient.questionBank.delete(q.id); if (!result.success) { showToast(result.error || 'Could not archive question.'); return; } setQuestionBank(current => current.filter(item => item.id !== q.id)); showToast('Question archived'); }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 leading-relaxed">
                  {q.question}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, oIdx) => (
                    <div 
                      key={oIdx}
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                        oIdx === q.correctOptionIndex 
                          ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-semibold' 
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        oIdx === q.correctOptionIndex ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  <span className="font-bold">Pedagogical Explanation: </span>
                  {q.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: MARKSHEETS LIST ================= */}
      {activeTab === 'marksheets' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            {marksheetLoading ? <div className="p-6 text-center text-xs text-slate-500">Loading marksheets…</div> : marksheetError ? <div className="p-6 text-center text-xs text-rose-600">{marksheetError}</div> : marksheets.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">No official marksheets have been issued yet.</div> : <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Marksheet #</th>
                  <th className="px-4 py-3.5">Student Details</th>
                  <th className="px-4 py-3.5">Course & Batch</th>
                  <th className="px-4 py-3.5">Exam Title</th>
                  <th className="px-4 py-3.5">Score</th>
                  <th className="px-4 py-3.5">Grade / Result</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marksheets.map(ms => (
                  <tr key={ms.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-mono font-bold text-blue-600">{ms.marksheet_number}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{ms.student_name}</div>
                      <div className="text-[11px] text-slate-500">{ms.student_email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-slate-800">{ms.course_title || 'Standalone exam'}</div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{`Attempt #${ms.exam_attempt_id}`}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{ms.exam_title}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">
                      {ms.score} / {ms.total_marks} ({ms.percentage}%)
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Grade {ms.grade} · {Number(ms.passed) === 1 ? 'Passed' : 'Not passed'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => { setActiveMarksheetForPrint(ms); setActiveTab('print_preview'); }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRINTABLE OFFICIAL MARKSHEET ================= */}
      {activeTab === 'print_preview' && activeMarksheetForPrint && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-10 max-w-3xl mx-auto space-y-6 relative overflow-hidden">
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none select-none">
            <span className="text-9xl font-black">AEC</span>
          </div>

          {/* Official Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">ALOM'S ENGLISH CENTER</h1>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Office of the Controller of Examinations
            </div>
            <p className="text-[11px] text-slate-500">
              Official examination result issued from the Alom's English Center LMS
            </p>
            <div className="inline-block mt-2 px-4 py-1 rounded-full bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider">
              Official Academic Marksheet & Transcript
            </div>
          </div>

          {/* Student & Exam Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-slate-500 block">Student Name:</span>
              <strong className="text-sm text-slate-950">{activeMarksheetForPrint.student_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Student Email:</span>
              <strong className="text-sm text-blue-600">{activeMarksheetForPrint.student_email}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Course Name:</span>
              <strong className="text-slate-900">{activeMarksheetForPrint.course_title || 'Standalone exam'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Exam Attempt:</span>
              <strong className="font-mono text-slate-900">{`Attempt #${activeMarksheetForPrint.exam_attempt_id}`}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Examination Title:</span>
              <strong className="text-slate-900">{activeMarksheetForPrint.exam_title}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Marksheet Serial:</span>
              <strong className="font-mono text-slate-700">{activeMarksheetForPrint.marksheet_number}</strong>
            </div>
          </div>

          {/* Results Score Table */}
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="p-3 border-r border-slate-300">Evaluation Component</th>
                <th className="p-3 border-r border-slate-300 text-center">Maximum Marks</th>
                <th className="p-3 border-r border-slate-300 text-center">Marks Obtained</th>
                <th className="p-3 border-r border-slate-300 text-center">Percentage</th>
                <th className="p-3 text-center">Grade / Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-r border-slate-300 font-medium">MCQ & Analytical Diagnostic Paper</td>
                <td className="p-3 border-r border-slate-300 text-center font-bold">{activeMarksheetForPrint.total_marks}</td>
                <td className="p-3 border-r border-slate-300 text-center font-bold text-blue-700">{activeMarksheetForPrint.score}</td>
                <td className="p-3 border-r border-slate-300 text-center font-bold">{activeMarksheetForPrint.percentage}%</td>
                <td className="p-3 text-center font-black text-emerald-700">
                  {activeMarksheetForPrint.grade} ({Number(activeMarksheetForPrint.passed) === 1 ? 'Passed' : 'Not passed'})
                </td>
              </tr>
            </tbody>
          </table>

          {/* Faculty Remarks */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-950">
            <span className="font-bold block mb-1">Result Record:</span>
            <p className="italic leading-relaxed">This marksheet preserves the score and result recorded when the examination attempt was submitted.</p>
          </div>

          {/* Signatures */}
          <div className="pt-10 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200">
            <div className="text-center">
              <div className="font-bold text-slate-900">{activeMarksheetForPrint.issued_by}</div>
              <div className="text-[10px] text-slate-400">Authorized Issuer</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[10px] text-slate-500">{activeMarksheetForPrint.marksheet_number}</div>
              <div className="text-[10px] text-slate-500 font-bold">OFFICIAL RECORD</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-900">Alom's English Center</div>
              <div className="text-[10px] text-slate-400">Examination Registry</div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Marksheet</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Question */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Add New Question to Central Repository</h3>
              <button onClick={() => setShowAddQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={qCategory}
                    onChange={e => setQCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="IELTS Academic">IELTS Academic</option>
                    <option value="Spoken English">Spoken English</option>
                    <option value="Grammar">Grammar</option>
                    <option value="Phonetics">Phonetics</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={qDifficulty}
                    onChange={e => setQDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Question Text *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter exam question..."
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Options (Select radio for correct answer)</label>
                {[
                  { val: qOption1, set: setQOption1, idx: 0, label: 'A' },
                  { val: qOption2, set: setQOption2, idx: 1, label: 'B' },
                  { val: qOption3, set: setQOption3, idx: 2, label: 'C' },
                  { val: qOption4, set: setQOption4, idx: 3, label: 'D' }
                ].map(opt => (
                  <div key={opt.idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qCorrectIdx === opt.idx}
                      onChange={() => setQCorrectIdx(opt.idx)}
                      className="cursor-pointer"
                    />
                    <span className="w-5 font-bold text-slate-500">{opt.label}:</span>
                    <input
                      type="text"
                      placeholder={`Option ${opt.label}`}
                      value={opt.val}
                      onChange={e => opt.set(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pedagogical Explanation</label>
                <input
                  type="text"
                  placeholder="Explain why this option is correct..."
                  value={qExplanation}
                  onChange={e => setQExplanation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Save to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue only from a server-submitted and scored exam attempt */}
      {showGenerateMarksheetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">{isBn ? 'জমা দেওয়া পরীক্ষার ফল থেকে মার্কশিট ইস্যু' : 'Issue Marksheet from Submitted Exam'}</h3>
              <button onClick={() => setShowGenerateMarksheetModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-600">{isBn ? 'শুধুমাত্র সার্ভারে জমা ও স্কোর করা পরীক্ষার ফল নির্বাচন করা যাবে। নম্বর বা গ্রেড সম্পাদনা করা যাবে না।' : 'Only submitted and server-scored attempts are eligible. Marks and grade cannot be edited here.'}</p>
            {eligibleAttempts.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">{isBn ? 'নতুন জমা দেওয়া পরীক্ষার ফল পাওয়া যায়নি।' : 'No new submitted exam attempts are eligible.'}</div>
            ) : (
              <form onSubmit={handleGenerateMarksheet} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isBn ? 'জমা দেওয়া পরীক্ষা নির্বাচন করুন' : 'Select submitted exam attempt'}</label>
                  <select required value={selectedAttemptId} onChange={e => setSelectedAttemptId(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-xl">
                    {eligibleAttempts.map(a => <option key={a.attempt_id} value={a.attempt_id}>{a.student_name} · {a.exam_title} · {a.score}/{a.total_marks}</option>)}
                  </select>
                </div>
                {eligibleAttempts.filter(a => a.attempt_id === Number(selectedAttemptId)).map(a => (
                  <div key={a.attempt_id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                    <div><strong>Student:</strong> {a.student_name} ({a.student_email})</div>
                    <div><strong>Exam:</strong> {a.exam_title}</div>
                    <div><strong>Course:</strong> {a.course_title || 'Standalone exam'}</div>
                    <div><strong>Result:</strong> {a.score} / {a.total_marks} ({a.percentage}%) · {Number(a.passed) === 1 ? 'Passed' : 'Not passed'}</div>
                  </div>
                ))}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowGenerateMarksheetModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl font-bold">Cancel</button>
                  <button type="submit" disabled={issuingMarksheet || !selectedAttemptId} className="px-4 py-2 bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl">{issuingMarksheet ? 'Issuing…' : 'Issue Official Marksheet'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
