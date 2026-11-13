import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { Menu, X } from 'lucide-react';

interface PublicNavbarProps {
  onOpenAdmission?: () => void;
  onOpenVerifyModal?: () => void;
  onOpenVideoPreview?: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ onOpenVerifyModal }) => {
  const { language, currentUser, isAuthenticated, activeView, setActiveView, setSelectedEbookId, websiteSettings } = useLms();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isBn = language === 'bn';

  const scrollToHomeSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (activeView !== 'home') {
      setActiveView('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems: {
    id: string;
    label: string;
    action: () => void;
    isActive: boolean;
  }[] = [
    {
      id: 'home',
      label: isBn ? 'হোম' : 'Home',
      action: () => {
        setActiveView('home');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'home'
    },
    {
      id: 'courses',
      label: isBn ? 'কোর্সসমূহ' : 'Courses',
      action: () => {
        setActiveView('courses');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'courses'
    },
    {
      id: 'learn',
      label: isBn ? 'ফ্রি লার্নিং' : 'Learn',
      action: () => {
        setActiveView('learn');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'learn'
    },
    {
      id: 'instructors',
      label: isBn ? 'শিক্ষকমণ্ডলী' : 'Instructors',
      action: () => {
        setActiveView('instructors');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'instructors'
    },
    {
      id: 'exams',
      label: isBn ? 'পরীক্ষা' : 'Exams',
      action: () => {
        setActiveView('exams');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'exams'
    },
    {
      id: 'products',
      label: isBn ? 'প্রোডাক্টস' : 'Products',
      action: () => {
        setActiveView('products');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'products'
    },
    {
      id: 'ebooks',
      label: isBn ? 'ই-বুক' : 'E-Books',
      action: () => {
        setSelectedEbookId(null);
        setActiveView('ebooks');
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeView === 'ebooks'
    },
    {
      id: 'result',
      label: isBn ? 'রেজাল্ট' : 'Result',
      action: () => {
        if (onOpenVerifyModal) {
          onOpenVerifyModal();
          setMobileMenuOpen(false);
        } else {
          scrollToHomeSection('result-portal-section');
        }
      },
      isActive: false
    }
  ];

  const brandName = isBn
    ? (websiteSettings.siteNameBn || "আলম'স ইংলিশ সেন্টার")
    : (websiteSettings.logoText || websiteSettings.siteName || "ALOM'S ENGLISH");

  const theme = websiteSettings.themeSettings;
  const navbarBg = theme?.navbarBg || '#FFFFFF';
  const primaryColor = theme?.primaryColor || '#0284C7';
  const secondaryColor = theme?.secondaryColor || '#4F46E5';

  return (
    <header
      className="w-full text-slate-800 border-b border-slate-200/80 sticky top-0 z-40 shadow-2xs"
      style={{ backgroundColor: navbarBg }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Admin-Controlled Brand Emblem / Custom Uploaded Logo */}
        <button
          type="button"
          onClick={() => {
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-lg"
        >
          {websiteSettings.logoStyle === 'image_only' && websiteSettings.logoUrl ? (
            <img
              src={websiteSettings.logoUrl}
              alt={brandName}
              className="h-9 max-w-[180px] object-contain"
            />
          ) : (
            <>
              {websiteSettings.logoStyle !== 'text_only' && (
                <span
                  className="w-8 h-8 rounded-lg text-white font-black text-sm flex items-center justify-center shadow-xs"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  {brandName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="leading-tight">
                <span className="block text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                  {brandName}
                </span>
                {websiteSettings.logoTagline && (
                  <span
                    className="block text-[10px] font-semibold tracking-wider uppercase leading-none"
                    style={{ color: primaryColor }}
                  >
                    {websiteSettings.logoTagline}
                  </span>
                )}
              </span>
            </>
          )}
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`whitespace-nowrap shrink-0 py-1.5 transition-colors duration-150 cursor-pointer ${
                item.isActive ? 'font-semibold' : 'hover:text-slate-900'
              }`}
              style={item.isActive ? { color: primaryColor } : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Soft Lavender-Blue Pill Login Button + Mobile Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView(isAuthenticated ? 'dashboard' : 'login')}
            className="px-5 py-2 text-xs sm:text-sm font-semibold bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-full transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2"
            style={{ color: primaryColor }}
          >
            {isAuthenticated
              ? (isBn ? `${currentUser.name.split(' ')[0]} · ড্যাশবোর্ড` : `${currentUser.name.split(' ')[0]} · Portal`)
              : (isBn ? 'লগইন' : 'Login')}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-1 shadow-md">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                item.isActive
                  ? 'bg-[#EEF2FF] text-[#0284C7] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#0284C7]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
