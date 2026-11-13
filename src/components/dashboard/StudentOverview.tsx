import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useLms } from '../../context/LmsContext';
import { 
  BookOpen, FileCheck, Award, Star, ArrowRight, Play, 
  Video, Calendar, Clock, CreditCard, LifeBuoy, CheckCircle2,
  Phone, MessageSquare, Mail, X
} from 'lucide-react';

interface StudentOverviewProps {
  onNavigateTab: (tab: string) => void;
  onContinueCourse: (courseId: string) => void;
  onTakeExam: (examId?: string) => void;
}

export const StudentOverview: React.FC<StudentOverviewProps> = ({ 
  onNavigateTab,
  onContinueCourse,
  onTakeExam
}) => {
  const { currentUser, language, t, courses, exams, liveClasses, websiteSettings } = useLms();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [certificateCount, setCertificateCount] = useState(0);

  useEffect(() => {
    let active = true;
    apiClient.certificates.getMine().then(result => {
      if (active && result.success && result.data) setCertificateCount(result.data.filter(item => item.status === 'issued').length);
    });
    return () => { active = false; };
  }, []);

  const enrolledCourse = courses[0]; // IELTS Preparation Masterclass
  const upcomingClass = liveClasses[0]; // Spoken English Live Class

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards matching collage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* My Courses (3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.myCourses}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                3
              </div>
            </div>
          </div>
        </div>

        {/* Available Exams (5) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.availableExams}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                5
              </div>
            </div>
          </div>
        </div>

        {/* Certificates (1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.certificates}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                {certificateCount}
              </div>
            </div>
          </div>
        </div>

        {/* Total Points (850) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.totalPoints}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                850
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: My Courses (Left) & Upcoming Classes (Right) matching collage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* My Courses Section matching collage */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">{t.myCourses}</h3>
            <button
              onClick={() => onNavigateTab('my_courses')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Enrolled Course Card matching collage: IELTS Preparation, 70% Complete */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:w-36 h-24 rounded-lg overflow-hidden bg-slate-900 shrink-0">
              <img
                src={enrolledCourse.thumbnail}
                alt={enrolledCourse.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                IELTS
              </span>
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {enrolledCourse.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Instructor: Tanvir Ahmed (IELTS 8.5)</span>
                </div>
              </div>

              {/* Progress Bar matching collage (70% Complete) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-700">70% Complete</span>
                  <span className="text-slate-400">18 / 24 Lessons</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>

              {/* Continue Course Button matching collage */}
              <button
                onClick={() => onContinueCourse(enrolledCourse.id)}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{t.continueCourse}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Classes Section matching collage */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">{t.upcomingClasses}</h3>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Class Card matching collage */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                ● LIVE
              </span>
              <span className="text-xs font-bold text-slate-800">
                {upcomingClass.title}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Sep 10, 2025</span>
              </div>
              <span>|</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>07:00 PM (BST)</span>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Platform: <strong>Google Meet</strong> (Interactive Speaking Drill)
            </div>

            <a
              href={upcomingClass.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Video className="w-4 h-4" />
              <span>{t.joinNow}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Quick Links matching collage: Take Exam, View Result, Payment, Support */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <h3 className="font-bold text-base text-slate-900">{t.quickLinks}</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Take Exam */}
          <button
            onClick={() => onTakeExam()}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center flex flex-col items-center gap-2.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
              {t.takeExam}
            </span>
          </button>

          {/* 2. View Result */}
          <button
            onClick={() => onNavigateTab('my_results')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center flex flex-col items-center gap-2.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-600">
              {t.viewResult}
            </span>
          </button>

          {/* 3. Payment */}
          <button
            onClick={() => onNavigateTab('my_payments')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center flex flex-col items-center gap-2.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
              {t.payment}
            </span>
          </button>

          {/* 4. Support */}
          <button
            onClick={() => setShowSupportModal(true)}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center flex flex-col items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-amber-600">
              {t.support}
            </span>
          </button>
        </div>
      </div>

      {/* Student Support Hotline Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Student Helpline & Academic Desk</h3>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Connect with your dedicated course mentor or student affairs executive for syllabus doubts, batch timing shifts, or technical assistance.
            </p>

            <div className="space-y-2.5">
              <a
                href={`tel:${websiteSettings.hotline || '+8801712345678'}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Official Campus Hotline</div>
                    <div className="text-[11px] text-slate-500 font-mono">{websiteSettings.hotline || '+880 1712 345678'}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">Call Now</span>
              </a>

              <a
                href={`https://wa.me/${(websiteSettings.whatsappNumber || '+8801712345678').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Direct WhatsApp Assistance</div>
                    <div className="text-[11px] text-emerald-700">Immediate response from support team</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700">Open Chat</span>
              </a>

              <a
                href={`mailto:${websiteSettings.email || 'info@alomsenglish.com'}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Email Academic Support</div>
                    <div className="text-[11px] text-slate-500">{websiteSettings.email || 'info@alomsenglish.com'}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600">Send Mail</span>
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
