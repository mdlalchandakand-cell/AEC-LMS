import React from 'react';
import { useLms } from '../../context/LmsContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, FileCheck,
  Video, UserPlus, CreditCard, CalendarCheck, BarChart3,
  Settings, LogOut, Award, IdCard, Bell, Building2, BookMarked,
  ArrowLeft, Download, ShieldCheck, Puzzle, Trash2, DollarSign,
  Target, Package, UserRound, ShoppingBag
} from 'lucide-react';

interface DashboardSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile,
  onCloseMobile
}) => {
  const { currentUser, language, t, setActiveView, signOut, websiteSettings } = useLms();

  const getNavItems = () => {
    switch (currentUser.role) {
      case 'student':
        return [
          { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
          { id: 'my_courses', label: language === 'bn' ? 'আমার কোর্স' : 'My Courses', icon: BookOpen },
          { id: 'online_exam', label: language === 'bn' ? 'অনলাইন পরীক্ষা' : 'Online Exam', icon: FileCheck },
          { id: 'my_results', label: language === 'bn' ? 'আমার ফলাফল' : 'My Results', icon: BarChart3 },
          { id: 'attendance', label: t.attendanceMenu, icon: CalendarCheck },
          { id: 'my_payments', label: language === 'bn' ? 'আমার পেমেন্ট' : 'My Payments', icon: CreditCard },
          { id: 'id_card', label: language === 'bn' ? 'স্টুডেন্ট আইডি' : 'Student ID Card', icon: IdCard },
          { id: 'certificates', label: language === 'bn' ? 'সনদপত্র' : 'Certificates', icon: Award },
          { id: 'cpanel_export', label: 'cPanel PHP Export', icon: Download }
        ];
      case 'teacher':
      case 'assistant_teacher':
        return [
          { id: 'overview', label: t.teacherDashboard, icon: LayoutDashboard },
          { id: 'my_courses', label: t.myCourses, icon: BookOpen },
          { id: 'batches_routine', label: language === 'bn' ? 'ক্লাস রুটিন' : 'Class Routine', icon: CalendarCheck },
          { id: 'question_bank_marksheets', label: language === 'bn' ? 'প্রশ্ন ব্যাংক ও মার্কশিট' : 'Question Bank & Marksheets', icon: Award },
          { id: 'teacher_commissions', label: language === 'bn' ? 'আমার কমিশন ও পে-আউট' : 'Earnings & Payouts', icon: DollarSign, badge: 'BDT' },
          { id: 'live_classes', label: t.liveClassesMenu, icon: Video, badge: 'LIVE' },
          { id: 'exams', label: t.examsMenu, icon: FileCheck },
          { id: 'attendance', label: t.attendanceMenu, icon: CalendarCheck },
          { id: 'students', label: t.studentsMenu, icon: Users },
          { id: 'notices', label: t.notices, icon: Bell }
        ];
      case 'accountant':
        return [
          { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
          { id: 'payments', label: language === 'bn' ? 'পেমেন্ট ও হিসাব' : 'Fee Collections', icon: CreditCard },
          { id: 'teacher_commissions', label: language === 'bn' ? 'শিক্ষক কমিশন পে-আউট' : 'Teacher Payout Approvals', icon: DollarSign },
          { id: 'admissions', label: language === 'bn' ? 'ভর্তি ফি অনুমোদন' : 'Pending Approvals', icon: UserPlus },
          { id: 'students', label: t.studentsMenu, icon: Users },
          { id: 'reports_analytics', label: language === 'bn' ? 'আর্থিক বিবরণী ও সিএসভি' : 'Financial Ledger CSV', icon: BarChart3 },
          { id: 'cpanel_export', label: 'cPanel PHP Export', icon: Download }
        ];
      case 'support_staff':
        return [
          { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
          { id: 'students', label: t.studentsMenu, icon: Users },
          { id: 'batches_routine', label: language === 'bn' ? 'ব্যাচ ও রুটিন' : 'Batches & Routine', icon: CalendarCheck },
          { id: 'live_classes', label: t.liveClassesMenu, icon: Video },
          { id: 'facilities', label: language === 'bn' ? 'লাইব্রেরি ও হোস্টেল' : 'Facilities Hub', icon: BookMarked },
          { id: 'notices', label: t.notices, icon: Bell }
        ];
      case 'branch_manager':
        return [
          { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
          { id: 'courses', label: language === 'bn' ? 'শাখার কোর্স' : 'Branch Courses', icon: BookOpen },
          { id: 'students', label: t.studentsMenu, icon: Users },
          { id: 'enrollments', label: language === 'bn' ? 'কোর্স এনরোলমেন্ট' : 'Course Enrollments', icon: BookOpen },
          { id: 'attendance', label: t.attendanceMenu, icon: CalendarCheck },
          { id: 'payments', label: t.paymentsMenu, icon: CreditCard },
          { id: 'live_classes', label: t.liveClassesMenu, icon: Video },
          { id: 'branch_info', label: language === 'bn' ? 'আমার শাখার তথ্য' : 'My Branch', icon: Building2 }
        ];
      case 'guardian':
        return [
          { id: 'overview', label: t.guardianDashboard, icon: LayoutDashboard },
          { id: 'ward_attendance', label: language === 'bn' ? 'উপস্থিতি রেকর্ড' : 'Attendance Log', icon: CalendarCheck },
          { id: 'ward_results', label: language === 'bn' ? 'পরীক্ষার ফলাফল' : 'Exam Scores', icon: BarChart3 },
          { id: 'ward_payments', label: language === 'bn' ? 'ফি পরিশোধের হিসেব' : 'Fee Invoices', icon: CreditCard }
        ];
      case 'super_admin':
      case 'admin':
      default:
        return [
          { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
          { id: 'saas_superadmin', label: language === 'bn' ? 'সুপার অ্যাডমিন SaaS প্যানেল' : 'SaaS Super Admin (HQ)', icon: Building2, badge: 'SaaS' },
          { id: 'branch_management', label: language === 'bn' ? 'শাখা ব্যবস্থাপনা' : 'Branch Management', icon: Building2 },
          { id: 'plugins', label: language === 'bn' ? 'প্লাগইন ও এপিআই' : 'Modular Plugins & APIs', icon: Puzzle, badge: 'PLUG' },
          { id: 'teacher_commissions', label: language === 'bn' ? 'শিক্ষক কমিশন ও পে-আউট' : 'Teacher Commissions', icon: DollarSign },
          { id: 'marketing_analytics', label: language === 'bn' ? 'মার্কেটিং, পিক্সেল ও এসইও' : 'Marketing & SEO Suite', icon: Target },
          { id: 'site_settings', label: language === 'bn' ? 'সাইট সেটিংস (লোগো, স্লাইডার)' : 'Site Settings (Logo, Slider)', icon: Settings },
          { id: 'roadmap', label: language === 'bn' ? '১০-ধাপের রোডম্যাপ' : '10-Step Master Plan', icon: ShieldCheck },
          { id: 'batches_routine', label: language === 'bn' ? 'ব্যাচ ও সাপ্তাহিক রুটিন' : 'Batches & Timetable', icon: CalendarCheck, badge: 'NEW' },
          { id: 'question_bank_marksheets', label: language === 'bn' ? 'প্রশ্ন ব্যাংক ও মার্কশিট' : 'Question Bank & Marksheet', icon: Award, badge: 'AUTO' },
          { id: 'facilities', label: language === 'bn' ? 'ফ্যাসিলিটি (লাইব্রেরি, বাস, হোস্টেল)' : 'Facilities (Library, Bus)', icon: BookMarked },
          { id: 'reports_analytics', label: language === 'bn' ? 'রিপোর্ট ও অ্যানালিটিক্স' : 'Analytics & CSV Reports', icon: BarChart3 },
          { id: 'students', label: language === 'bn' ? 'স্টুডেন্ট পোর্টাল (৪)' : 'Students Portal (4)', icon: Users },
          { id: 'enrollments', label: language === 'bn' ? 'কোর্স এনরোলমেন্ট' : 'Course Enrollments', icon: BookOpen },
          { id: 'certificates', label: language === 'bn' ? 'সনদপত্র ও ভেরিফিকেশন (৯)' : 'Certificates (9)', icon: Award },
          { id: 'teachers', label: t.teachersMenu, icon: GraduationCap },
          { id: 'courses', label: language === 'bn' ? 'কোর্স ও লেসন (৫)' : 'Courses & Lessons (5)', icon: BookOpen },
          { id: 'live_classes', label: language === 'bn' ? 'লাইভ ক্লাস ও ভিডিও (৬)' : 'Live Classes (6)', icon: Video, badge: 'LIVE' },
          { id: 'exams', label: language === 'bn' ? 'পরীক্ষা ও রেজাল্ট (৭)' : 'Exams & Results (7)', icon: FileCheck },
          { id: 'payments', label: language === 'bn' ? 'পেমেন্ট ও হিসাব (৮)' : 'Payments & Ledger (8)', icon: CreditCard },
          { id: 'storefront_catalog', label: language === 'bn' ? 'ই-বুক ও প্রোডাক্ট ক্যাটালগ' : 'Storefront Catalog', icon: ShoppingBag },
          { id: 'storefront_orders', label: language === 'bn' ? 'ই-বুক ও প্রোডাক্ট অর্ডার' : 'Storefront Orders', icon: ShoppingBag, badge: 'NEW' },
          { id: 'attendance', label: t.attendanceMenu, icon: CalendarCheck },
          { id: 'recycle_bin', label: language === 'bn' ? 'রিসাইকেল বিন' : 'Recycle Bin & Trash', icon: Trash2 },
          { id: 'envato_packages', label: 'CodeCanyon Package Hub', icon: Package, badge: 'ENVATO' },
          { id: 'users_admin', label: language === 'bn' ? 'ইউজার ম্যানেজমেন্ট' : 'User Management', icon: Users },
          { id: 'permissions', label: language === 'bn' ? 'রোল ও পারমিশন (২)' : 'RBAC & Auth (2)', icon: Settings },
          { id: 'cms', label: language === 'bn' ? 'ওয়েবসাইট CMS (৩)' : 'Website CMS (3)', icon: BookMarked },
          { id: 'migrations', label: language === 'bn' ? 'ডাটাবেজ মাইগ্রেশন (১)' : 'DB & Migrations (1)', icon: Building2 },
          { id: 'security', label: language === 'bn' ? 'সিকিউরিটি ও টেস্ট (১০)' : 'Security & Tests (10)', icon: FileCheck },
          { id: 'cpanel_export', label: 'cPanel Package Export', icon: Download }
        ];
    }
  };

  const navItems = [...getNavItems(), { id: 'profile', label: language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile', icon: UserRound }];

  return (
    <aside className={`w-64 bg-[#0a192f] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800/90 select-none ${isOpenMobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl block' : 'hidden md:flex'}`}>
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        {websiteSettings.logoStyle === 'image_only' && websiteSettings.logoUrl ? (
          <img src={websiteSettings.logoUrl} alt={websiteSettings.siteName || 'Logo'} className="h-10 max-w-[140px] object-contain filter brightness-110" />
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-extrabold text-white tracking-tight leading-none truncate">{websiteSettings.logoText || "Alom's"}</div>
              <div className="text-[10px] font-bold text-blue-400 tracking-wider uppercase mt-1 truncate">{websiteSettings.logoTagline || 'English Center'}</div>
            </div>
          </>
        )}
      </div>
      <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/50 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium text-[11px]">{language === 'bn' ? 'বর্তমান পোর্টাল:' : 'Active Portal:'}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 capitalize tracking-wide">{currentUser.role.replace('_', ' ')}</span>
      </div>
      <div className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button key={item.id} onClick={() => { setCurrentTab(item.id); onCloseMobile?.(); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-normal text-left transition-all duration-200 cursor-pointer group ${isActive ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40 translate-x-0.5' : 'text-slate-300 hover:text-white hover:bg-slate-800/80 hover:translate-x-1 border border-transparent hover:border-slate-700/50'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-white/20 text-white shadow-xs' : 'bg-slate-800/80 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/80 group-hover:scale-105'}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>
              {(item as any).badge && <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider shrink-0 ${(item as any).badge === 'LIVE' ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'}`}>{(item as any).badge}</span>}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-800/90 space-y-1.5 bg-[#081527]">
        <button onClick={() => setActiveView('home')} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-850 hover:bg-blue-950/60 hover:text-white hover:border-blue-500/40 border border-slate-700/60 rounded-xl transition-all duration-200">
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400 transition-transform" />
          <span>{language === 'bn' ? 'মূল ওয়েবসাইটে ফিরুন' : 'Back to Public Website'}</span>
        </button>
        <button onClick={() => { void signOut(); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-950/20 hover:bg-rose-950/60 border border-rose-900/30 rounded-xl transition-all duration-200">
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.logout}</span>
        </button>
      </div>
    </aside>
  );
};
