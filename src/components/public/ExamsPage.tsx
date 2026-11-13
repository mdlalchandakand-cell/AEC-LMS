import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import {
  Lock, ArrowRight, Clock, FileQuestion, Award, Play,
  CheckCircle2, BookOpen, ShieldCheck, X
} from 'lucide-react';

interface ExamsPageProps {
  onLaunchExam: (examId: string) => void;
}

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const ExamsPage: React.FC<ExamsPageProps> = ({ onLaunchExam }) => {
  const {
    language,
    isAuthenticated,
    setActiveView,
    exams,
    examSubmissions,
    courses,
    websiteSettings
  } = useLms();

  const isBn = language === 'bn';
  const theme = websiteSettings.themeSettings;
  const canvasBg = `linear-gradient(135deg, ${theme?.lightCanvasStart || '#EAE9FF'} 0%, ${theme?.lightCanvasMid || '#F2F3FF'} 45%, ${theme?.lightCanvasEnd || '#E5F4FE'} 100%)`;
  const cardBg = theme?.cardBg || '#FFFFFF';

  const [courseFilter, setCourseFilter] = useState<string>('all');

  // ==================== UNAUTHENTICATED LOCKED STATE (MATCHES SCREENSHOT) ====================
  if (!isAuthenticated) {
    return (
      <main
        className="flex-1 min-h-[calc(100vh-4rem)] w-full flex items-center justify-center px-4 py-12"
        style={{ background: canvasBg }}
      >
        <section
          className="w-full max-w-[440px] rounded-2xl px-7 sm:px-9 py-9 text-center shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] border border-white/90"
          style={{ backgroundColor: cardBg }}
        >
          {/* Rounded-Square Solid Blue Lock Icon */}
          <div className="w-12 h-12 rounded-xl bg-[#0077CC] text-white flex items-center justify-center mx-auto shadow-md shadow-[#0077CC]/25">
            <Lock className="w-5 h-5" />
          </div>

          <h1 className="font-heading text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight mt-5">
            {isBn ? 'পরীক্ষাসমূহ দেখতে সাইন ইন করুন' : 'Sign in to explore exams'}
          </h1>

          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {isBn
              ? 'সাইন ইন করার পর সকল পাবলিক এবং কোর্স-ভিত্তিক পরীক্ষা দেখতে ও অংশগ্রহণ করতে পারবেন।'
              : 'Browse public and private course exams once you are signed in.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView('login')}
              className="px-5 py-2.5 rounded-lg bg-[#0077CC] hover:bg-[#0060A8] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span>{isBn ? 'প্রোফাইলে যান' : 'Go to Profile'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>


          </div>
        </section>

      </main>
    );
  }

  // ==================== AUTHENTICATED EXAMS DIRECTORY ====================
  const visibleExams = courseFilter === 'all'
    ? exams
    : exams.filter(ex => ex.courseId === courseFilter);

  return (
    <main className="flex-1 py-12 px-4 sm:px-6 w-full" style={{ background: canvasBg }}>
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Top Portal Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0077CC] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>{isBn ? 'অনলাইন এক্সাম ইঞ্জিন (ভেরিফায়েড)' : 'Automated MCQ & Mock Tests'}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1E3A8A] tracking-tight">
              {isBn ? 'মক টেস্ট ও মূল্যায়ন পরীক্ষাসমূহ' : 'Available Mock Tests & Assessments'}
            </h1>
            <p className="text-sm text-slate-600">
              {isBn
                ? 'তাৎক্ষণিক রেজাল্ট ও নেগেটিভ মার্কিং সহ রিয়েল টাইম পরীক্ষার প্রস্তুতি।'
                : 'Browse public and enrolled course exams with timed timers and instant scorecards.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCourseFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                courseFilter === 'all'
                  ? 'bg-[#0077CC] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {isBn ? `সকল পরীক্ষা (${exams.length})` : `All Exams (${exams.length})`}
            </button>
            {courses.slice(0, 4).map(crs => (
              <button
                key={crs.id}
                type="button"
                onClick={() => setCourseFilter(crs.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  courseFilter === crs.id
                    ? 'bg-[#0077CC] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                }`}
              >
                {crs.category}
              </button>
            ))}
          </div>
        </div>

        {/* Exams Grid */}
        {visibleExams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2 shadow-xs">
            <BookOpen className="w-8 h-8 text-[#0077CC] mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              {isBn ? 'এই ক্যাটাগরিতে কোনো পরীক্ষা এখনো যুক্ত হয়নি।' : 'No exams listed for this course filter yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleExams.map(ex => {
              const latestAttempt = examSubmissions.find(sub => sub.examId === ex.id);
              const linkedCourse = courses.find(c => c.id === ex.courseId);
              return (
                <article
                  key={ex.id}
                  className="rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-lg transition-all"
                  style={{ backgroundColor: cardBg }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0077CC] text-[10px] font-bold uppercase tracking-wider">
                        {linkedCourse?.category || 'General Mock'}
                      </span>
                      {latestAttempt && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{latestAttempt.percentage}%</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-heading text-base font-bold text-slate-900 leading-snug">
                      {isBn ? ex.titleBn : ex.title}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                      <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-[#0077CC] mx-auto mb-0.5" />
                        <div className="font-mono font-bold text-slate-900">{ex.durationMinutes}m</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                        <FileQuestion className="w-3.5 h-3.5 text-[#0077CC] mx-auto mb-0.5" />
                        <div className="font-mono font-bold text-slate-900">{ex.questions.length} Qs</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                        <Award className="w-3.5 h-3.5 text-[#0077CC] mx-auto mb-0.5" />
                        <div className="font-mono font-bold text-slate-900">{ex.totalMarks} M</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {isBn ? `পাশ নম্বর: ${ex.passMarks}` : `Pass Score: ${ex.passMarks}`}
                      {ex.negativeMarkPerWrong > 0 ? ` · Negative: -${ex.negativeMarkPerWrong}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLaunchExam(ex.id)}
                    className="w-full py-2.5 rounded-xl bg-[#0077CC] hover:bg-[#0060A8] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{isBn ? 'পরীক্ষা শুরু করুন' : 'Start Exam Now'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
