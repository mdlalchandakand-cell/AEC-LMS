import React from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Users, CalendarCheck, BarChart3, CreditCard, Award, 
  CheckCircle2, Clock, Phone, Mail, BookOpen 
} from 'lucide-react';

interface GuardianOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const GuardianOverview: React.FC<GuardianOverviewProps> = ({ onNavigateTab }) => {
  const { currentUser, attendances, examSubmissions, payments, t } = useLms();

  const studentName = 'Rafiq Hasan';
  const studentRoll = 'AEC-2025-0824';

  const wardAttendance = attendances.filter(a => a.studentId === studentRoll || a.studentName.includes('Rafiq'));
  const wardPayments = payments.filter(p => p.studentId === studentRoll || p.studentName.includes('Rafiq'));

  return (
    <div className="space-y-6">
      {/* Student Profile Card for Guardian */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80"
            alt={studentName}
            className="w-16 h-16 rounded-full object-cover border-4 border-blue-600 shadow-md"
          />
          <div>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">
              Enrolled Ward / Student
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              {studentName}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Roll ID: {studentRoll} · IELTS Preparation Masterclass
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-center">
            <span className="text-[10px] text-emerald-600 block uppercase font-bold">Attendance Rate</span>
            <span className="text-base font-extrabold">95% Present</span>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-center">
            <span className="text-[10px] text-blue-600 block uppercase font-bold">Latest Exam Mock</span>
            <span className="text-base font-extrabold">Band 8.0</span>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-center">
            <span className="text-[10px] text-purple-600 block uppercase font-bold">Tuition Dues</span>
            <span className="text-base font-extrabold text-emerald-700">৳0 (Clear)</span>
          </div>
        </div>
      </div>

      {/* Ward Attendance Log & Fee Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Log */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <span>Class Attendance History</span>
          </h3>

          <div className="space-y-2.5">
            {wardAttendance.map(att => (
              <div key={att.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Date: {att.date}</div>
                  <div className="text-[11px] text-slate-500">IELTS Preparation Masterclass (Live Lecture)</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                  att.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                  att.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {att.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tuition Payment Receipts */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Official Fee Invoices</span>
          </h3>

          <div className="space-y-3">
            {wardPayments.map(pay => (
              <div key={pay.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="font-mono text-blue-700">{pay.invoiceNumber}</span>
                  <span className="text-emerald-700 font-extrabold">৳ {pay.amount.toLocaleString()}</span>
                </div>
                <div className="text-slate-600">{pay.courseTitle}</div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Method: {pay.method} ({pay.trxId})</span>
                  <span>{pay.date.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
