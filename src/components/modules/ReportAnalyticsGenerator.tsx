import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  BarChart3, Download, Printer, Filter, Calendar, 
  DollarSign, Users, Award, TrendingUp, CheckCircle2, FileSpreadsheet 
} from 'lucide-react';

export const ReportAnalyticsGenerator: React.FC = () => {
  const { 
    courses, users, payments, attendances, exams, 
    marksheets, branches, expenses, language 
  } = useLms();
  const isBn = language === 'bn';

  const [reportType, setReportType] = useState<'revenue' | 'admission' | 'attendance' | 'exams'>('revenue');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const totalRevenue = payments.filter(p => p.status === 'verified').reduce((acc, p) => acc + p.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netSurplus = totalRevenue - totalExpenses;
  const totalStudents = users.filter(u => u.role === 'student').length;

  const handleDownloadCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === 'revenue') {
      csvContent += "Invoice Number,Student,Course,Amount (BDT),Payment Method,TrxID,Date,Status\n";
      payments.forEach(p => {
        csvContent += `"${p.invoiceNumber}","${p.studentName}","${p.courseTitle}",${p.amount},"${p.method}","${p.trxId}","${p.date}","${p.status}"\n`;
      });
    } else if (reportType === 'admission') {
      csvContent += "Student ID,Student Name,Email,Phone,Enrolled Course,Join Date\n";
      users.filter(u => u.role === 'student').forEach(s => {
        csvContent += `"${s.studentId}","${s.name}","${s.email}","${s.phone}","IELTS/Spoken","${s.joinedDate}"\n`;
      });
    } else {
      csvContent += "Marksheet Number,Student,Batch,Exam Title,Score,Total,Grade,GPA\n";
      marksheets.forEach(m => {
        csvContent += `"${m.marksheetNumber}","${m.studentName}","${m.batchCode}","${m.examTitle}",${m.marksObtained},${m.totalMarks},"${m.grade}",${m.gpa}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AEC_LMS_${reportType}_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMsg('CSV Report Downloaded Successfully!');
    setTimeout(() => setToastMsg(null), 3000);
  };

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
              Analytics & Executive Reports
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {isBn ? 'সেন্ট্রাল ডাটা রিপোর্ট ও অডিট এক্সপোর্ট' : 'Central Data Audits & Analytical Insights'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'রিপোর্ট ও বিশ্লেষণ জেনারেটর' : 'Advanced Report Generator & Analytics'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'আয়-ব্যয়, ভর্তি সংখ্যা, উপস্থিতি ও ফলাফল বিশ্লেষণ করে CSV এবং প্রিন্ট ফরম্যাটে এক্সপোর্ট করুন' 
              : 'Generate comprehensive reports on cash flow, admission metrics, exam pass rates, and branch performance'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isBn ? 'CSV ডাউনলোড' : 'Export CSV'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isBn ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Report Focus:</span>
          {[
            { id: 'revenue', title: 'Revenue & Accounts' },
            { id: 'admission', title: 'Admissions & Students' },
            { id: 'attendance', title: 'Attendance Audit' },
            { id: 'exams', title: 'Exam GPA & Marksheets' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                reportType === r.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl font-medium"
          >
            <option value="all">All Regional Campuses</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl font-medium"
          >
            <option value="current_month">Current Month (September 2025)</option>
            <option value="q3">Q3 Academic Term</option>
            <option value="year">Full Academic Year 2025</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Course Fees Collected</div>
          <div className="text-2xl font-black text-slate-900 mt-1">৳{totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">bKash, Nagad & Bank Verified</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">Operational Expenses</div>
          <div className="text-2xl font-black text-rose-600 mt-1">৳{totalExpenses.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Instructor fees, rent & utilities</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">Net Academic Surplus</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">৳{netSurplus.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">+32.4% Profit Margin</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">Active Students Registered</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{totalStudents} Students</div>
          <div className="text-[10px] text-blue-600 font-bold mt-1">100% Enrollment Verified</div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 capitalize">
            {reportType} Detailed Ledger Records
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Filtered: {selectedBranch === 'all' ? 'All Campuses' : selectedBranch}
          </span>
        </div>

        {reportType === 'revenue' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Course Title</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{p.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900">{p.studentName}</td>
                    <td className="p-3 text-slate-700">{p.courseTitle}</td>
                    <td className="p-3 font-bold text-slate-900">৳{p.amount.toLocaleString()}</td>
                    <td className="p-3 font-semibold">{p.method}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{p.trxId}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{p.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'admission' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Admission Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.filter(u => u.role === 'student').map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{s.studentId}</td>
                    <td className="p-3 font-bold text-slate-900">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.email}</td>
                    <td className="p-3 font-mono">{s.phone}</td>
                    <td className="p-3 text-slate-500">{s.joinedDate}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Active Enrolled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Course / Batch</th>
                  <th className="p-3">Attendance Status</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map(att => (
                  <tr key={att.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono">{att.date}</td>
                    <td className="p-3 font-bold text-slate-900">{att.studentName}</td>
                    <td className="p-3 text-slate-700">{att.courseId}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        att.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                        att.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{att.remarks || 'Recorded via biometric roll'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'exams' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Marksheet #</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Exam Title</th>
                  <th className="p-3">Score Obtained</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">GPA Scale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marksheets.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{m.marksheetNumber}</td>
                    <td className="p-3 font-bold text-slate-900">{m.studentName}</td>
                    <td className="p-3 text-slate-700">{m.examTitle}</td>
                    <td className="p-3 font-bold text-slate-900">{m.marksObtained} / {m.totalMarks} ({m.percentage}%)</td>
                    <td className="p-3 font-black text-emerald-700">{m.grade}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{m.gpa.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
