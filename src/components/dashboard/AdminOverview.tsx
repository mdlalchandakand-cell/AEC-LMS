import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Users, BookOpen, CreditCard, Video, TrendingUp, ArrowUpRight, 
  Clock, CheckCircle, UserPlus, Calendar, ArrowRight, ShieldCheck 
} from 'lucide-react';

interface AdminOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const { language, t, payments, users, liveClasses, courses } = useLms();
  const [selectedChartRange, setSelectedChartRange] = useState<'9m' | '6m' | '1y'>('9m');

  // Exact data points matching collage chart curve (Jan to Sep, 0 to 8k)
  const chartPoints = [
    { month: 'Jan', students: 1200 },
    { month: 'Feb', students: 2400 },
    { month: 'Mar', students: 3100 },
    { month: 'Apr', students: 3750 },
    { month: 'May', students: 4300 },
    { month: 'Jun', students: 4950 },
    { month: 'Jul', students: 5600 },
    { month: 'Aug', students: 6100 },
    { month: 'Sep', students: 6850 }
  ];

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards matching collage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Students (8,250, +12%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5" />
              12%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.totalStudents}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
              8,250
            </div>
          </div>
        </div>

        {/* Total Courses (24, +8%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5" />
              8%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.totalCourses}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
              24
            </div>
          </div>
        </div>

        {/* Total Revenue (৳ 484,750, +15%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5" />
              15%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.totalRevenue}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
              {t.currency} 484,750
            </div>
          </div>
        </div>

        {/* Live Classes (12, +20%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Video className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5" />
              20%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.liveClassesCount}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
              12
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Monthly Enrollment Chart (Left) & Recent Activities (Right) matching collage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly Enrollment Interactive SVG Chart (Left 8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">{t.monthlyEnrollment}</h3>
              <p className="text-xs text-slate-500">Student admissions trend across all branches</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button 
                onClick={() => setSelectedChartRange('9m')}
                className={`px-2.5 py-1 rounded-md transition-colors ${selectedChartRange === '9m' ? 'bg-white font-semibold text-blue-700 shadow-2xs' : 'text-slate-600'}`}
              >
                2025 YTD
              </button>
              <button 
                onClick={() => setSelectedChartRange('6m')}
                className={`px-2.5 py-1 rounded-md transition-colors ${selectedChartRange === '6m' ? 'bg-white font-semibold text-blue-700 shadow-2xs' : 'text-slate-600'}`}
              >
                6 Months
              </button>
            </div>
          </div>

          {/* Chart Canvas Graphic matching collage */}
          <div className="relative pt-6">
            <div className="h-64 w-full">
              <svg viewBox="0 0 600 240" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="80" x2="580" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="130" x2="580" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="180" x2="580" y2="180" stroke="#f1f5f9" strokeWidth="1" />

                {/* Y-Axis Labels */}
                <text x="20" y="34" fontSize="10" fill="#94a3b8" textAnchor="middle">8k</text>
                <text x="20" y="84" fontSize="10" fill="#94a3b8" textAnchor="middle">6k</text>
                <text x="20" y="134" fontSize="10" fill="#94a3b8" textAnchor="middle">4k</text>
                <text x="20" y="184" fontSize="10" fill="#94a3b8" textAnchor="middle">2k</text>
                <text x="20" y="224" fontSize="10" fill="#94a3b8" textAnchor="middle">0</text>

                {/* Spline Area Fill */}
                <path
                  d="M 50,210 L 50,195 Q 115,160 180,140 T 310,115 T 440,80 T 570,55 L 570,220 L 50,220 Z"
                  fill="url(#chartFillGradient)"
                />

                {/* Main Blue Line Curve */}
                <path
                  d="M 50,195 Q 115,160 180,140 T 310,115 T 440,80 T 570,55"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Interactive Data Dots */}
                {[
                  { cx: 50, cy: 195, label: '1.2k' },
                  { cx: 115, cy: 165, label: '2.4k' },
                  { cx: 180, cy: 140, label: '3.1k' },
                  { cx: 245, cy: 130, label: '3.7k' },
                  { cx: 310, cy: 115, label: '4.3k' },
                  { cx: 375, cy: 98, label: '4.9k' },
                  { cx: 440, cy: 80, label: '5.6k' },
                  { cx: 505, cy: 68, label: '6.1k' },
                  { cx: 570, cy: 55, label: '6,850' }
                ].map((pt, idx) => (
                  <g key={idx} className="cursor-pointer group">
                    <circle cx={pt.cx} cy={pt.cy} r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                    {idx === 8 && (
                      <g>
                        <rect x={pt.cx - 28} y={pt.cy - 28} width="56" height="20" rx="4" fill="#0f172a" />
                        <text x={pt.cx} y={pt.cy - 14} fontSize="10" fill="#ffffff" fontWeight="bold" textAnchor="middle">
                          {pt.label}
                        </text>
                      </g>
                    )}
                  </g>
                ))}

                {/* X-Axis Month labels */}
                {chartPoints.map((pt, idx) => {
                  const x = 50 + idx * 65;
                  return (
                    <text key={idx} x={x} y="235" fontSize="11" fill="#64748b" textAnchor="middle">
                      {pt.month}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Recent Activities Feed (Right 4 cols) matching collage */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">{t.recentActivities}</h3>
              <button 
                onClick={() => onNavigateTab('students')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Item 1: New student registered */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">New student registered</div>
                  <div className="text-[11px] text-slate-500">Tanzim Ahmed · Mirpur Branch</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">2 min ago</div>
                </div>
              </div>

              {/* Item 2: Payment received */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Payment received (৳1,500)</div>
                  <div className="text-[11px] text-slate-500">bKash Trx: BK9X72Q99M</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">5 min ago</div>
                </div>
              </div>

              {/* Item 3: New admission IELTS */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">New admission (IELTS)</div>
                  <div className="text-[11px] text-slate-500">Masterclass Target Band 7.5+</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">10 min ago</div>
                </div>
              </div>

              {/* Item 4: Live class started */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Live class started</div>
                  <div className="text-[11px] text-slate-500">Spoken English Accent Drill</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">15 min ago</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick link button to branch report */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('reports')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              Generate Daily Branch Report
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
