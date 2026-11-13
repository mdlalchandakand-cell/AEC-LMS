import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Menu, Calendar, Bell, ChevronDown, ExternalLink 
} from 'lucide-react';

interface DashboardHeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenNotifications?: () => void;
  title?: string;
  subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  onToggleMobileMenu,
  onOpenNotifications,
  title,
  subtitle
}) => {
  const { 
    currentUser, language, setLanguage, t, setActiveView, unreadNotificationsCount
  } = useLms();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const currentDateFormatted = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {title || (currentUser.role === 'student' ? t.studentDashboard : t.adminDashboard)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {subtitle || (
              <>
                {t.welcomeBack}, <span className="font-semibold text-slate-700">{currentUser.name}</span>! {t.whatsHappening}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right side controls: Date badge, Quick Role Switcher, Tenant Switcher, Notifications, Language & Profile */}
      <div className="flex items-center gap-3">
        {/* Date badge matching collage */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{currentDateFormatted}</span>
        </div>

        {/* In-App Live Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
          title={language === 'bn' ? 'বিজ্ঞপ্তি কেন্দ্র' : 'Notification Center'}
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Language switcher */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded transition-colors ${
              language === 'en' ? 'bg-white shadow-2xs text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('bn')}
            className={`px-2 py-0.5 rounded transition-colors ${
              language === 'bn' ? 'bg-white shadow-2xs text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            বাং
          </button>
        </div>

        {/* Profile Card */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-300"
            />
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-800 leading-tight flex items-center gap-1">
                <span>{currentUser.name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-blue-600 font-bold capitalize">
                {(currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'accountant')
                  ? (language === 'bn' ? 'প্রধান অ্যাডমিন (Admin & Accounts)' : 'Principal Admin')
                  : currentUser.role.replace('_', ' ')}
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                {currentUser.studentId && (
                  <p className="text-[10px] font-mono text-blue-600 mt-1">ID: {currentUser.studentId}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveView('home');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'bn' ? 'পাবলিক ওয়েবসাইটে যান' : 'Go to Public Site'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
