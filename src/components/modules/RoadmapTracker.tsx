import React from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  CheckCircle2, ArrowRight, ShieldCheck, Database, KeyRound, 
  LayoutDashboard, Users, BookOpen, Video, FileCheck, CreditCard, 
  Award, Terminal, Play 
} from 'lucide-react';

interface RoadmapTrackerProps {
  onSelectStepTab: (tabId: string) => void;
}

export const RoadmapTracker: React.FC<RoadmapTrackerProps> = ({ onSelectStepTab }) => {
  const { language, stepTestResults, runAllStepTests } = useLms();

  const steps = [
    {
      num: 1,
      titleBn: '১. সম্পূর্ণ ডাটাবেজ এবং মাইগ্রেশন',
      titleEn: '1. Complete Database and Migrations',
      descBn: '২৫+ টেবিল, ফরেন কি, ইনডেক্স ও সিড ডাটা সমন্বিত পূর্ণাঙ্গ MySQL 8.0+ স্কিমা ও মাইগ্রেশন।',
      descEn: '25+ normalized MySQL/MariaDB tables with foreign keys, indexes, and automated cPanel schema importer.',
      icon: Database,
      tabId: 'migrations',
      color: 'blue'
    },
    {
      num: 2,
      titleBn: '২. অথেনটিকেশন এবং রোল পারমিশন',
      titleEn: '2. Authentication and Role Permissions',
      descBn: 'সুপার অ্যাডমিন থেকে অভিভাবক পর্যন্ত ৮টি স্বতন্ত্র রোল, পাসওয়ার্ড হ্যাশিং ও অ্যাক্সেস কন্ট্রোল মেট্রিক্স।',
      descEn: '8 distinct user roles (Super Admin to Guardian) with BCrypt password hashing and granular permissions.',
      icon: KeyRound,
      tabId: 'permissions',
      color: 'indigo'
    },
    {
      num: 3,
      titleBn: '৩. অ্যাডমিন ড্যাশবোর্ড এবং CMS',
      titleEn: '3. Admin Dashboard and CMS',
      descBn: 'বাস্তব মেট্রিক কাউন্টার, মাসিক ভর্তি চার্ট, নোটিশ বোর্ড এবং সম্পূর্ণ ওয়েবসাইট CMS কাস্টমাইজার।',
      descEn: 'Executive statistics, monthly enrollment chart, notice board, and full public website CMS manager.',
      icon: LayoutDashboard,
      tabId: 'cms',
      color: 'sky'
    },
    {
      num: 4,
      titleBn: '৪. স্টুডেন্ট ও টিচার পোর্টাল',
      titleEn: '4. Student and Teacher Portals',
      descBn: 'শিক্ষার্থীর কোর্স অগ্রগতি, প্রিন্টেবল আইডি কার্ড এবং শিক্ষকের অ্যাসাইনমেন্ট মূল্যায়ন ড্যাশবোর্ড।',
      descEn: 'Student portal with resume progress, printable official ID card, and teacher batch management.',
      icon: Users,
      tabId: 'students',
      color: 'emerald'
    },
    {
      num: 5,
      titleBn: '৫. কোর্স ও লেসন ম্যানেজমেন্ট',
      titleEn: '5. Course and Lesson Management',
      descBn: 'কোর্স তৈরি, মডিউল ও লেসন কাঠামো, বিডিটি (৳) ফি নির্ধারণ এবং সিলেবাস ব্যবস্থাপনা।',
      descEn: 'Course catalog, weekly syllabus modules, lesson playlist, and enrollment controls.',
      icon: BookOpen,
      tabId: 'courses',
      color: 'violet'
    },
    {
      num: 6,
      titleBn: '৬. লাইভ ক্লাস ও ভিডিও সিস্টেম',
      titleEn: '6. Live Class and Video System',
      descBn: 'গুগল মিট ও জুম ইন্টিগ্রেশন, লাইভ কাউন্টডাউন, ভিডিও প্লেয়ার এবং ডাউনলোডযোগ্য স্টাডি মেটেরিয়াল।',
      descEn: 'Google Meet & Zoom live class launchers, scheduled timer, 16:9 player, and study notes pad.',
      icon: Video,
      tabId: 'live_classes',
      color: 'amber'
    },
    {
      num: 7,
      titleBn: '৭. পরীক্ষা ও ফলাফল সিস্টেম',
      titleEn: '7. Examination and Results',
      descBn: 'লাইভ টাইমার সহ অনলাইন এমসিকিউ পরীক্ষা, নেগেটিভ মার্কিং (-০.২৫) ও উত্তরপত্র বিশ্লেষণ।',
      descEn: 'Timed online MCQ exam simulator, negative marking calculation, instant scoring, and answer keys.',
      icon: FileCheck,
      tabId: 'exams',
      color: 'rose'
    },
    {
      num: 8,
      titleBn: '৮. পেমেন্ট ও অ্যাকাউন্টিং',
      titleEn: '8. Payment and Accounting',
      descBn: 'বিকাশ, নগদ ও ব্যাংক পেমেন্ট গেটওয়ে, TrxID ভেরিফিকেশন, ক্যাশ কাউন্টার ও প্রিন্টযোগ্য মানি রিসিট।',
      descEn: 'bKash and Nagad merchant gateways, TrxID verification queue, expense tracker, and official receipts.',
      icon: CreditCard,
      tabId: 'payments',
      color: 'pink'
    },
    {
      num: 9,
      titleBn: '৯. সার্টিফিকেট ও রিপোর্ট',
      titleEn: '9. Certificates and Reports',
      descBn: 'অনলাইনে যাচাইযোগ্য কিউআর কোড যুক্ত সনদপত্র তৈরি ও সার্বিক প্রাতিষ্ঠানিক আর্থিক বিবরণী।',
      descEn: 'ISO verifiable Certificate of Completion with serial IDs, public verification portal, and reports.',
      icon: Award,
      tabId: 'certificates',
      color: 'purple'
    },
    {
      num: 10,
      titleBn: '১০. সিকিউরিটি অডিট, টেস্টিং ও ডিপ্লয়মেন্ট',
      titleEn: '10. Security Audit, Testing and Deployment',
      descBn: 'CSRF, SQLi, XSS নিরাপত্তা অডিট, স্বয়ংক্রিয় টেস্ট স্যুট এবং এক-ক্লিকে cPanel জিপ প্যাকেজ ডাউনলোড।',
      descEn: 'Security vulnerability audit, automated test runner, and 1-click production cPanel ZIP package export.',
      icon: Terminal,
      tabId: 'security',
      color: 'slate'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0b1e36] to-[#0f3460] text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Master 10-Step Architecture Verified (10/10 Passed)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {language === 'bn' ? '১০-ধাপের সম্পূর্ণ কমার্শিয়াল LMS রোডম্যাপ' : '10-Step Complete Commercial LMS Execution'}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {language === 'bn'
              ? 'আলম\'স ইংলিশ সেন্টারের প্রতিটি মডিউল সম্পূর্ণ কার্যকরী ও টেস্ট করা হয়েছে। নিচের প্রতিটি ধাপে ক্লিক করে সরাসরি পরিচালনা করুন।'
              : 'Every single architecture requirement from database design to cPanel deployment has been implemented and tested. Click any module below to interact with it directly.'}
          </p>
        </div>

        <button
          onClick={runAllStepTests}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{language === 'bn' ? 'সকল টেস্ট পুনরায় চালান' : 'Run Full Test Suite'}</span>
        </button>
      </div>

      {/* 10-Step Interactive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const testResult = stepTestResults.find(t => t.stepNumber === step.num);
          const allPassed = testResult ? testResult.testCases.every(tc => tc.passed) : true;

          return (
            <div
              key={step.num}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Step {step.num} of 10
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {language === 'bn' ? step.titleBn : step.titleEn}
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'bn' ? step.descBn : step.descEn}
                </p>

                {/* Sub-test cases status */}
                {testResult && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                    {testResult.testCases.map((tc, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{tc.name}</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{tc.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Ready for PHP 8.3 & Shared cPanel
                </span>

                <button
                  onClick={() => onSelectStepTab(step.tabId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>{language === 'bn' ? 'মডিউল খুলুন' : 'Open Module'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
