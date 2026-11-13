import React from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  BookOpen, Video, Users, FileCheck, Calendar, Clock, 
  ArrowRight, CheckCircle2, MessageSquare 
} from 'lucide-react';

interface TeacherOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({ onNavigateTab }) => {
  const { currentUser, liveClasses, courses, assignments, t } = useLms();

  const assignedLiveClasses = liveClasses.filter(c => c.status === 'upcoming');

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Assigned Courses</div>
              <div className="text-2xl font-bold text-slate-900 font-mono">2 Batches</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Scheduled Live Sessions</div>
              <div className="text-2xl font-bold text-slate-900 font-mono">{assignedLiveClasses.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Pending Submissions</div>
              <div className="text-2xl font-bold text-slate-900 font-mono">120</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Active Students</div>
              <div className="text-2xl font-bold text-slate-900 font-mono">3,420</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Live Class launcher */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Your Next Scheduled Live Session</h3>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold">Google Meet</span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <h4 className="font-bold text-sm text-slate-900">
              Spoken English & Fluency Drill - Pronunciation Lab
            </h4>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Today at 07:00 PM BST</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>85 Enrolled Students</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <a
                href="https://meet.google.com/aec-live-spoken"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-xs"
              >
                <Video className="w-4 h-4" />
                <span>Start Live Session as Host</span>
              </a>
              <button
                onClick={() => onNavigateTab('attendance')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Mark Attendance
              </button>
            </div>
          </div>
        </div>

        {/* Assignments to grade */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Pending Assignments</h3>
            <span className="text-xs text-slate-500 font-mono">2 Tasks</span>
          </div>

          <div className="space-y-3">
            {assignments.map(asg => (
              <div key={asg.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="font-bold text-slate-900">{asg.title}</div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Submissions: <strong className="text-blue-600">{asg.submissionsCount} files</strong></span>
                  <span>Deadline: {asg.deadline.split(' ')[0]}</span>
                </div>
                <button
                  onClick={() => onNavigateTab('question_bank_marksheets')}
                  className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded font-semibold text-[11px] cursor-pointer"
                >
                  Grade Submissions & Issue Marksheet
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
