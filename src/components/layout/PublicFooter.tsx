import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { Phone, Mail, MapPin, ShieldCheck, ArrowRight, FileText, Globe, X } from 'lucide-react';

interface PublicFooterProps {
  onOpenVerifyModal?: () => void;
  onOpenAdmission?: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onOpenVerifyModal, onOpenAdmission }) => {
  const { language, setLanguage, setActiveView, websiteSettings } = useLms();
  const isBn = language === 'bn';
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'refund' | null>(null);

  const footerCfg = websiteSettings.footerSettings || {
    missionEn:
      "Alom's English Center is a structured online and campus learning platform providing IELTS, Spoken English, and Grammar programs delivered by certified educators nationwide.",
    missionBn:
      'দেশের প্রত্যন্ত অঞ্চল থেকে শুরু করে প্রতিটি শিক্ষার্থীর কাছে মানসম্মত IELTS ও ইংরেজি শিক্ষাকে সহজলভ্য করতে আমাদের আধুনিক লার্নিং প্ল্যাটফর্ম।',
    licenseNo: '',
    copyrightText: `© ${new Date().getFullYear()} Alom's English Center. All Rights Reserved.`,
    showPaymentStrip: true
  };

  const brandName = isBn
    ? (websiteSettings.siteNameBn || "আলম'স ইংলিশ সেন্টার")
    : (websiteSettings.logoText || websiteSettings.siteName || "Alom's English Center");

  const paymentGateways = [
    { name: 'bKash', accent: 'text-[#E2136E] border-pink-200 bg-pink-50/70' },
    { name: 'Nagad', accent: 'text-[#F6921E] border-orange-200 bg-orange-50/70' },
    { name: 'Rocket', accent: 'text-[#8C3494] border-purple-200 bg-purple-50/70' },
    { name: 'Upay', accent: 'text-[#0066B3] border-sky-200 bg-sky-50/70' },
    { name: 'VISA', accent: 'text-[#1A1F71] border-indigo-200 bg-indigo-50/70' },
    { name: 'Mastercard', accent: 'text-[#EB001B] border-red-200 bg-red-50/70' },
    { name: 'DBBL Nexus', accent: 'text-[#005B9F] border-blue-200 bg-blue-50/70' },
    { name: 'City Bank', accent: 'text-[#B91C1C] border-rose-200 bg-rose-50/70' }
  ];

  const legalCopy = {
    terms: {
      title: isBn ? 'শর্তাবলী (Terms & Conditions)' : 'Terms & Conditions',
      body: isBn
        ? "আলম'স ইংলিশ সেন্টারের সকল অনলাইন ও অফলাইন কোর্স, রেকর্ডেড ভিডিও এবং লেকচার শিট কেবলমাত্র নিবন্ধিত শিক্ষার্থীদের ব্যক্তিগত ব্যবহারের জন্য। অনুমতি ব্যতীত কোনো কন্টেন্ট শেয়ার বা পুনঃবিতরণ সম্পূর্ণ নিষিদ্ধ।"
        : "All live classes, recorded lectures, and PDF study handbooks on Alom's English Center are licensed exclusively to enrolled students for personal study. Unauthorized sharing or redistribution is prohibited."
    },
    privacy: {
      title: isBn ? 'গোপনীয়তা নীতি (Privacy Policy)' : 'Privacy Policy',
      body: isBn
        ? 'ভর্তি ও শিক্ষার্থী অ্যাকাউন্ট পরিচালনার জন্য সংগৃহীত আপনার নাম, ফোন নম্বর ও একাডেমিক তথ্য সর্বোচ্চ নিরাপত্তার সাথে সংরক্ষিত থাকে এবং কখনোই তৃতীয় পক্ষের নিকট বিক্রয় বা শেয়ার করা হয় না।'
        : 'Student profile details, attendance records, and mock exam performance data are securely stored strictly for academic administration and certification verification.'
    },
    refund: {
      title: isBn ? 'রিফান্ড নীতিমালা (Refund Policy)' : 'Refund Policy',
      body: isBn
        ? 'অনলাইন পেমেন্টের ক্ষেত্রে ভর্তির ৭২ ঘণ্টার মধ্যে কোনো টেকনিক্যাল সমস্যার কারণে ব্যাচে যুক্ত হতে না পারলে অ্যাডমিশন ডেস্কে যোগাযোগ সাপেক্ষে ফি সমন্বয় বা রিফান্ডের আবেদন করা যাবে।'
        : 'Students encountering technical access issues within 72 hours of online enrollment may request a fee transfer or refund via the Admission Support Desk.'
    }
  };

  const footerTheme = websiteSettings.themeSettings;

  return (
    <footer
      className="pt-14 pb-8 border-t border-slate-200/90"
      style={{
        backgroundColor: footerTheme?.footerBg || '#F3F5F8',
        color: footerTheme?.footerTextColor || '#475569'
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-10">
          {/* Column 1: Brand Overview + Language Switcher */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              {websiteSettings.logoStyle === 'image_only' && websiteSettings.logoUrl ? (
                <img src={websiteSettings.logoUrl} alt={brandName} className="h-9 max-w-[170px] object-contain" />
              ) : (
                <>
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {brandName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    {brandName}
                  </span>
                </>
              )}
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              {isBn ? footerCfg.missionBn : footerCfg.missionEn}
            </p>

            {/* Language Switcher */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-[#0284C7] text-xs font-semibold text-slate-700 hover:text-[#0284C7] transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>{language === 'bn' ? 'Switch to English' : 'বাংলা ভাষা'}</span>
              </button>
            </div>
          </div>

          {/* Column 2: Links */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">
              {isBn ? 'লিংকসমূহ' : 'Links'}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'হোম' : 'Home'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('courses');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'সকল কোর্স' : 'All Courses'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('learn');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'ফ্রি লার্নিং (Learn)' : 'Free Learn Hub'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('products');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'প্রোডাক্টস ও বই (Shop)' : 'Products & Books'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('about')}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'আমাদের সম্পর্কে' : 'About Us'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('contact')}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'যোগাযোগ' : 'Contact Us'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenVerifyModal) onOpenVerifyModal();
                    else setActiveView('exams');
                  }}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'বোর্ড ও সার্টিফিকেট যাচাই' : 'Certificate & Result Verify'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAdmission) onOpenAdmission();
                    else setActiveView('contact');
                  }}
                  className="inline-flex items-center gap-2 hover:text-[#0284C7] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{isBn ? 'অনলাইন ভর্তি আবেদন' : 'Online Admission'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Institute Details */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">
              {isBn ? 'প্রতিষ্ঠানের তথ্য' : 'Center Details'}
            </h4>
            <div className="space-y-3 text-xs text-slate-600">
              {footerCfg.licenseNo?.trim() && (
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                  <span>
                    {isBn ? 'রেজিস্ট্রেশন নং:' : 'License No:'}{' '}
                    <strong className="font-mono text-slate-800">{footerCfg.licenseNo}</strong>
                  </span>
                </div>
              )}
              {(websiteSettings.address || websiteSettings.addressBn) && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                  <span>{isBn ? (websiteSettings.addressBn || websiteSettings.address) : (websiteSettings.address || websiteSettings.addressBn)}</span>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{isBn ? 'IELTS ও স্পোকেন ইংলিশ শেখার প্ল্যাটফর্ম' : 'IELTS & Spoken English Learning Platform'}</span>
              </div>
            </div>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">
              {isBn ? 'যোগাযোগ' : 'Contact'}
            </h4>
            <div className="space-y-3 text-xs text-slate-600">
              {websiteSettings.hotline?.trim() && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <a href={`tel:${websiteSettings.hotline.replace(/\s+/g, '')}`} className="font-mono tabular-nums font-semibold text-slate-800 hover:text-[#0284C7]">
                    {websiteSettings.hotline}
                  </a>
                </div>
              )}
              {websiteSettings.email?.trim() && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <a href={`mailto:${websiteSettings.email}`} className="hover:text-[#0284C7]">
                    {websiteSettings.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Centered White Payment Gateway Strip (Admin Controllable) */}
        {footerCfg.showPaymentStrip !== false && (
          <div className="max-w-4xl mx-auto my-4 bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold text-[#0284C7] mr-2 whitespace-nowrap">
              {isBn ? 'পেমেন্ট মাধ্যম:' : 'Pay With'}
            </span>
            {paymentGateways.map(gw => (
              <span
                key={gw.name}
                className={`px-2.5 py-1 rounded border text-[11px] font-bold tracking-tight whitespace-nowrap ${gw.accent}`}
              >
                {gw.name}
              </span>
            ))}
            <span className="ml-1 pl-2 border-l border-slate-200 text-[11px] font-bold text-[#0284C7] whitespace-nowrap">
              SSLCommerz Verified
            </span>
          </div>
        )}

        {/* Bottom Copyright & Policy Row */}
        <div className="mt-8 pt-5 border-t border-slate-300/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>{footerCfg.copyrightText || `© ${new Date().getFullYear()} Alom's English Center. All Rights Reserved.`}</div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Terms & Conditions
            </button>
            <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button type="button" onClick={() => setLegalModal('refund')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Refund Policy
            </button>
          </div>
        </div>
      </div>

      {/* Legal Policy Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">{legalCopy[legalModal].title}</h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{legalCopy[legalModal].body}</p>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
              >
                {isBn ? 'বুঝেছি' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
