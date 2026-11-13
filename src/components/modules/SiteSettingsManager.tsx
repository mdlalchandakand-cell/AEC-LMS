import React, { useState, useRef } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Settings, Image, Sliders, Info, Save, Plus, Trash2, Edit3, 
  CheckCircle, Globe, MapPin, Phone, Mail, MessageSquare, 
  ExternalLink, Eye, ArrowUpDown, ShieldCheck, Sparkles, AlertCircle,
  UploadCloud, FileUp, X, RefreshCw, Laptop
} from 'lucide-react';
import { SliderItem, HomepageSectionVisibility, HomepageThemeSettings } from '../../types/lms';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import heroEducatorImg from '../../assets/images/hero_educator_studio_1794552233836.jpg';
import ieltsCourseImg from '../../assets/images/course_ielts_masterclass_1794552235026.jpg';
import spokenCourseImg from '../../assets/images/course_spoken_fluency_1794552235255.jpg';
import grammarCourseImg from '../../assets/images/course_grammar_bundle_1794552235221.jpg';
import appMockupImg from '../../assets/images/app_learning_mockup_1794552235813.jpg';

export const SiteSettingsManager: React.FC = () => {
  const { websiteSettings, updateWebsiteSettings, language } = useLms();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'logo' | 'sliders' | 'info' | 'notice' | 'homepage'>('logo');
  const [saveToast, setSaveToast] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [brandingSaveToast, setBrandingSaveToast] = useState(false);

  const [homepageSections, setHomepageSections] = useState<HomepageSectionVisibility>(websiteSettings.homepageSections || {
    showUtilityStrip: true, showSlider: true, showStats: true, showLearningPaths: true, showCourses: true,
    showCombo: true, showInstructors: false, showWhyUs: true, showAppBanner: true, showEbooks: true,
    showResultPortal: true, showReviews: false, showFaq: true, showBranches: false,
  });
  const [themeSettings, setThemeSettings] = useState<HomepageThemeSettings>(websiteSettings.themeSettings || {});
  const [homepageSaveError, setHomepageSaveError] = useState('');
  const [homepageSaveSuccess, setHomepageSaveSuccess] = useState(false);

  const homepageSectionOptions: Array<{ key: keyof HomepageSectionVisibility; en: string; bn: string }> = [
    { key: 'showUtilityStrip', en: 'Utility strip', bn: 'ইউটিলিটি স্ট্রিপ' },
    { key: 'showSlider', en: 'Hero slider', bn: 'হিরো স্লাইডার' },
    { key: 'showStats', en: 'Statistics', bn: 'পরিসংখ্যান' },
    { key: 'showLearningPaths', en: 'Learning paths', bn: 'লার্নিং পাথ' },
    { key: 'showCourses', en: 'Featured courses', bn: 'বিশেষ কোর্স' },
    { key: 'showCombo', en: 'Combo offer', bn: 'কম্বো অফার' },
    { key: 'showInstructors', en: 'Instructor profiles', bn: 'শিক্ষক প্রোফাইল' },
    { key: 'showWhyUs', en: 'Why choose us', bn: 'কেন আমাদের বেছে নেবেন' },
    { key: 'showAppBanner', en: 'App banner', bn: 'অ্যাপ ব্যানার' },
    { key: 'showEbooks', en: 'E-books', bn: 'ই-বুক' },
    { key: 'showResultPortal', en: 'Result portal', bn: 'রেজাল্ট পোর্টাল' },
    { key: 'showReviews', en: 'Student reviews', bn: 'শিক্ষার্থী রিভিউ' },
    { key: 'showFaq', en: 'FAQ', bn: 'প্রশ্নোত্তর' },
    { key: 'showBranches', en: 'Branch locations', bn: 'শাখার ঠিকানা' },
  ];

  const saveHomepageSettings = async () => {
    setHomepageSaveError('');
    setHomepageSaveSuccess(false);
    const saved = await updateWebsiteSettings({ homepageSections, themeSettings });
    if (!saved) { setHomepageSaveError(isBn ? 'হোমপেজ সেটিংস সংরক্ষণ হয়নি।' : 'Homepage settings could not be saved.'); return; }
    setHomepageSaveSuccess(true);
  };

  // Logo & Branding Form State
  const [logoStyle, setLogoStyle] = useState<'icon_and_text' | 'image_only' | 'text_only'>(
    websiteSettings.logoStyle || 'icon_and_text'
  );
  const [logoUrl, setLogoUrl] = useState(websiteSettings.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(websiteSettings.faviconUrl || '');
  const [logoText, setLogoText] = useState(websiteSettings.logoText || "Alom's");
  const [logoTagline, setLogoTagline] = useState(websiteSettings.logoTagline || "English Center");

  // Logo & Favicon File Upload State
  const [logoInputMode, setLogoInputMode] = useState<'file' | 'url'>('file');
  const [faviconInputMode, setFaviconInputMode] = useState<'file' | 'url'>('file');
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [faviconFileName, setFaviconFileName] = useState<string>('');
  const [logoFileError, setLogoFileError] = useState<string | null>(null);
  const [faviconFileError, setFaviconFileError] = useState<string | null>(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [isFaviconDragging, setIsFaviconDragging] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  // Slider System State
  const [sliders, setSliders] = useState<SliderItem[]>(websiteSettings.sliders || []);
  const [sliderAutoPlay, setSliderAutoPlay] = useState(websiteSettings.sliderAutoPlay ?? true);
  const [sliderIntervalSec, setSliderIntervalSec] = useState(websiteSettings.sliderIntervalSec || 5);
  const [editingSlide, setEditingSlide] = useState<SliderItem | null>(null);
  const [isAddingSlide, setIsAddingSlide] = useState(false);

  // Slider Delete Confirmation State
  const [slideToDelete, setSlideToDelete] = useState<SliderItem | null>(null);

  // Info & Contact Form State
  const [address, setAddress] = useState(websiteSettings.address || '');
  const [addressBn, setAddressBn] = useState(websiteSettings.addressBn || '');
  const [chittagongAddress, setChittagongAddress] = useState(websiteSettings.chittagongAddress || '');
  const [chittagongAddressBn, setChittagongAddressBn] = useState(websiteSettings.chittagongAddressBn || '');
  const [hotline, setHotline] = useState(websiteSettings.hotline || '');
  const [whatsappNumber, setWhatsappNumber] = useState(websiteSettings.whatsappNumber || '');
  const [email, setEmail] = useState(websiteSettings.email || '');
  const [supportHours, setSupportHours] = useState(websiteSettings.supportHours || '');
  const [supportHoursBn, setSupportHoursBn] = useState(websiteSettings.supportHoursBn || '');
  const [facebookPage, setFacebookPage] = useState(websiteSettings.facebookPage || '');
  const [youtubeChannel, setYoutubeChannel] = useState(websiteSettings.youtubeChannel || '');
  const [googleMapEmbedUrl, setGoogleMapEmbedUrl] = useState(websiteSettings.googleMapEmbedUrl || '');

  // Emergency Ribbon State
  const [emergencyNotice, setEmergencyNotice] = useState(websiteSettings.emergencyNotice || '');
  const [enableNoticeRibbon, setEnableNoticeRibbon] = useState(websiteSettings.enableNoticeRibbon ?? true);
  const [noticeTicker, setNoticeTicker] = useState(websiteSettings.noticeTicker || '');

  const slideFileInputRef = useRef<HTMLInputElement>(null);
  const [slideImageDraft, setSlideImageDraft] = useState<string>('');
  const [slideShowOverlayDraft, setSlideShowOverlayDraft] = useState<boolean>(true);

  // Preset logo options for fast 1-click styling
  const logoPresets = [
    { name: isBn ? 'ডিফল্ট বুক এমব্লেম (AEC)' : 'Default Book Emblem (AEC)', url: '' },
    { name: isBn ? 'এডুকেটর ব্যাজ লোগো' : 'Educator Crest Emblem', url: heroEducatorImg },
    { name: isBn ? 'আইইএলটিএস একাডেমি আইকন' : 'IELTS Academy Crest', url: ieltsCourseImg }
  ];

  // Preset favicon options
  const faviconPresets = [
    { name: isBn ? 'অফিসিয়াল ব্লু বুক' : 'Official Blue Emblem', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%232563eb"/><path d="M25 35 C35 30 50 35 50 45 C50 35 65 30 75 35 L75 75 C65 70 50 75 50 85 C50 75 35 70 25 75 Z" fill="white"/></svg>' },
    { name: isBn ? 'গোল্ডেন স্টার শিল্ড' : 'Golden Star Shield', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23f59e0b"/><polygon points="50,20 60,40 82,42 66,58 71,80 50,68 29,80 34,58 18,42 40,40" fill="white"/></svg>' }
  ];

  // Preset slider background images
  const presetSlideImages = [
    heroEducatorImg,
    ieltsCourseImg,
    spokenCourseImg,
    grammarCourseImg,
    appMockupImg
  ];

  // Process Logo File to Data URL
  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoFileError(isBn ? 'অনুগ্রহ করে একটি ছবি ফাইল আপলোড করুন (PNG, JPG, SVG, WebP)' : 'Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 3.5 * 1024 * 1024) {
      setLogoFileError(isBn ? 'ফাইলের আকার ৩.৫ মেগাবাইটের কম হতে হবে' : 'File size must be under 3.5MB');
      return;
    }
    setLogoFileError(null);
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setLogoUrl(e.target.result);
        if (logoStyle !== 'image_only') {
          setLogoStyle('image_only');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processLogoFile(file);
  };

  // Process Favicon File to Data URL
  const processFaviconFile = (file: File) => {
    if (file.size > 1.5 * 1024 * 1024) {
      setFaviconFileError(isBn ? 'ফেভিকন ফাইলের আকার ১.৫ মেগাবাইটের কম হতে হবে' : 'Favicon size must be under 1.5MB');
      return;
    }
    setFaviconFileError(null);
    setFaviconFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setFaviconUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFaviconFile(file);
  };

  const handleFaviconDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFaviconDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFaviconFile(file);
  };

  // Dedicated Handler: Persist Branding Globally (Logo, Favicon, Title, Tagline)
  const handleSaveBrandingSettings = async () => {
    setSaveError('');
    const saved = await updateWebsiteSettings({
      logoStyle,
      logoUrl,
      faviconUrl,
      logoText,
      logoTagline,
      siteName: logoText,
      tagline: logoTagline
    });
    if (!saved) {
      setSaveError('Branding settings could not be saved to the server. Check image size and URL format.');
      return;
    }
    setBrandingSaveToast(true);
    setTimeout(() => setBrandingSaveToast(false), 3500);
  };

  const handleSaveAllSettings = async () => {
    setSaveError('');
    const saved = await updateWebsiteSettings({
      logoStyle,
      logoUrl,
      faviconUrl,
      logoText,
      logoTagline,
      siteName: logoText,
      tagline: logoTagline,
      sliders,
      sliderAutoPlay,
      sliderIntervalSec,
      address,
      addressBn,
      chittagongAddress,
      chittagongAddressBn,
      hotline,
      whatsappNumber,
      email,
      supportHours,
      supportHoursBn,
      facebookPage,
      youtubeChannel,
      googleMapEmbedUrl,
      emergencyNotice,
      enableNoticeRibbon,
      noticeTicker
    });
    if (!saved) {
      setSaveError('Website settings could not be saved. Check the URL fields and total image size.');
      return;
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleToggleSlideActive = (id: string) => {
    const updated = sliders.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setSliders(updated);
    updateWebsiteSettings({ sliders: updated });
  };

  const handleSaveSlideForm = (slide: SliderItem) => {
    let updated: SliderItem[];
    if (editingSlide) {
      updated = sliders.map(s => s.id === slide.id ? slide : s);
      setEditingSlide(null);
    } else {
      updated = [...sliders, { ...slide, id: `sld_${Date.now()}`, order: sliders.length + 1 }];
      setIsAddingSlide(false);
    }
    setSliders(updated);
    updateWebsiteSettings({ sliders: updated, sliderAutoPlay, sliderIntervalSec });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleConfirmDeleteSlide = () => {
    if (!slideToDelete) return;
    const updated = sliders.filter(s => s.id !== slideToDelete.id);
    setSliders(updated);
    updateWebsiteSettings({ sliders: updated });
    setSlideToDelete(null);
  };

  return (
    <div className="space-y-6">
      {saveError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</div>}
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              {isBn ? 'সিস্টেম সেটিংস' : 'System Settings'}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {isBn ? 'লোগো, স্লাইডার ও তথ্য ব্যবস্থাপনা' : 'Logo, Slider & Information Engine'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'ওয়েবসাইট ও ব্র্যান্ড সেটিংস কন্ট্রোল' : 'Website & Brand Settings System'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'লোগো, হোমপেজ হিরো স্লাইডার, ব্রাঞ্চ ঠিকানা, হটলাইন ও হেল্পলাইন সম্পূর্ণ কনফিগার করুন' 
              : 'Configure visual branding, homepage dynamic sliders, branch locations, and instant contact info'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>{isBn ? 'সেটিংস সফলভাবে সংরক্ষিত!' : 'Settings Saved & Live!'}</span>
            </span>
          )}

          <button
            onClick={handleSaveAllSettings}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isBn ? 'সকল পরিবর্তন সংরক্ষণ করুন' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('logo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'logo'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>{isBn ? '১. লোগো ও ব্র্যান্ড সেটিংস' : '1. Logo & Brand System'}</span>
        </button>

        <button
          onClick={() => setActiveTab('sliders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'sliders'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{isBn ? `২. হোম স্লাইডার সিস্টেম (${sliders.length})` : `2. Hero Slider System (${sliders.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'info'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{isBn ? '৩. ব্রাঞ্চ ও যোগাযোগ তথ্য' : '3. Info, Hotline & Branches'}</span>
        </button>

        <button
          onClick={() => setActiveTab('homepage')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'homepage' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Laptop className="w-4 h-4" />
          {isBn ? 'হোমপেজ ও থিম' : 'Homepage & Theme'}
        </button>
        <button
          onClick={() => setActiveTab('notice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'notice'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isBn ? '৪. নোটিশ রিবন ও ব্যানার' : '4. Notice Ribbon & Banner'}</span>
        </button>
      </div>

      {/* ================= TAB 1: LOGO & BRANDING SYSTEM ================= */}
      {activeTab === 'logo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Settings Column */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Image className="w-4 h-4 text-blue-600" />
                <span>{isBn ? 'লোগো ও ব্র্যান্ড কনফিগারেশন' : 'Brand Logo & Favicon Configuration'}</span>
              </h3>
              <span className="text-[11px] font-medium text-slate-500">
                {isBn ? 'গ্লোবাল পারসিস্টেন্স সক্রিয়' : 'Global sync enabled'}
              </span>
            </div>

            {/* Logo Style Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isBn ? 'লোগো ডিসপ্লে ফরম্যাট:' : 'Logo Display Style:'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'icon_and_text', title: isBn ? 'আইকন + নাম' : 'Icon + Brand Text', desc: isBn ? 'বুক এমব্লেম ও টেক্সট' : 'Book Icon & Name' },
                  { id: 'image_only', title: isBn ? 'কাস্টম ইমেজ লোগো' : 'Custom Image Logo', desc: isBn ? 'সরাসরি আপলোড / URL' : 'Direct Image File / URL' },
                  { id: 'text_only', title: isBn ? 'কেবলমাত্র টাইপোগ্রাফি' : 'Typography Only', desc: isBn ? 'টেক্সট ভিত্তিক টাইটেল' : 'Text-based Title' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLogoStyle(opt.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      logoStyle === opt.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* BRAND LOGO: File Upload OR URL Mode */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBn ? 'ব্র্যান্ড লোগো ফাইল / URL নির্বাচন:' : 'Brand Logo Input Source:'}</span>
                </label>
                <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setLogoInputMode('file')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      logoInputMode === 'file' 
                        ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? '📁 ফাইল আপলোড' : '📁 File Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoInputMode('url')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      logoInputMode === 'url' 
                        ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? '🔗 ইমেজ URL' : '🔗 Image URL'}
                  </button>
                </div>
              </div>

              {/* Mode 1: File Upload with Drag & Drop */}
              {logoInputMode === 'file' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoFileChange}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsLogoDragging(true); }}
                    onDragLeave={() => setIsLogoDragging(false)}
                    onDrop={handleLogoDrop}
                    onClick={() => logoFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isLogoDragging 
                        ? 'border-blue-600 bg-blue-50/80' 
                        : 'border-slate-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {isBn ? 'লোগো ফাইল আপলোড করতে এখানে ক্লিক করুন অথবা ড্র্যাগ করুন' : 'Click to browse logo image or drag & drop here'}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        PNG, JPG, SVG, WebP (Max: 3.5MB · Transparent PNG recommended)
                      </p>
                    </div>
                  </div>

                  {logoFileError && (
                    <div className="text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{logoFileError}</span>
                    </div>
                  )}

                  {logoUrl && (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <img src={logoUrl} alt="Logo Preview" className="w-7 h-7 object-contain bg-white rounded border border-emerald-200 p-0.5" />
                        <div>
                          <div className="font-semibold text-emerald-950 truncate max-w-[200px]">
                            {logoFileName || (isBn ? 'আপলোডকৃত লোগো' : 'Active Logo File')}
                          </div>
                          <div className="text-[10px] text-emerald-700">
                            {isBn ? 'সিস্টেমে সক্রিয় করা হয়েছে' : 'Ready to persist'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setLogoUrl(''); setLogoFileName(''); setLogoStyle('icon_and_text'); }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold p-1 hover:bg-rose-50 rounded"
                        title={isBn ? 'লোগো সরিয়ে ফেলুন' : 'Remove logo'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Direct Image URL */}
              {logoInputMode === 'url' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={e => {
                      setLogoUrl(e.target.value);
                      if (e.target.value && logoStyle !== 'image_only') setLogoStyle('image_only');
                    }}
                    placeholder="https://example.com/logo.png (or CDN link)"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span className="font-semibold">{isBn ? 'দ্রুত প্রিসেট:' : 'Quick Presets:'}</span>
                    {logoPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLogoUrl(p.url);
                          if (!p.url) setLogoStyle('icon_and_text');
                          else setLogoStyle('image_only');
                        }}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer text-[10px]"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Brand Title and Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isBn ? 'প্রধান ব্র্যান্ড নাম (ইংরেজি):' : 'Main Brand Text:'}
                </label>
                <input
                  type="text"
                  value={logoText}
                  onChange={e => setLogoText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isBn ? 'ট্যাগলাইন / সাবটাইটেল:' : 'Logo Subtitle / Tagline:'}
                </label>
                <input
                  type="text"
                  value={logoTagline}
                  onChange={e => setLogoTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            {/* BROWSER FAVICON: File Upload OR URL Mode */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBn ? 'ব্রাউজার ট্যাব ফেভিকন (.ico / .png / .svg):' : 'Browser Tab Favicon (.ico / .png / .svg):'}</span>
                </label>
                <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setFaviconInputMode('file')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      faviconInputMode === 'file' 
                        ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? '📁 ফাইল আপলোড' : '📁 File Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaviconInputMode('url')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      faviconInputMode === 'url' 
                        ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? '🔗 ফেভিকন URL' : '🔗 Favicon URL'}
                  </button>
                </div>
              </div>

              {/* Favicon Mode 1: File Upload */}
              {faviconInputMode === 'file' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={faviconFileInputRef}
                    onChange={handleFaviconFileChange}
                    accept=".ico, image/png, image/svg+xml, image/x-icon"
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsFaviconDragging(true); }}
                    onDragLeave={() => setIsFaviconDragging(false)}
                    onDrop={handleFaviconDrop}
                    onClick={() => faviconFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      isFaviconDragging 
                        ? 'border-blue-600 bg-blue-50/80' 
                        : 'border-slate-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileUp className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {isBn ? 'ফেভিকন ফাইল নির্বাচন করতে ক্লিক করুন' : 'Click to browse favicon (.ico, .png, .svg)'}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Max: 1.5MB · Recommended 32x32 or 64x64 square
                      </p>
                    </div>
                  </div>

                  {faviconFileError && (
                    <div className="text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{faviconFileError}</span>
                    </div>
                  )}

                  {faviconUrl && (
                    <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <img src={faviconUrl} alt="Favicon" className="w-5 h-5 object-contain" />
                        <span className="font-semibold text-emerald-950 text-[11px]">
                          {faviconFileName || (isBn ? 'কাস্টম ফেভিকন সক্রিয়' : 'Custom Favicon Active')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFaviconUrl(''); setFaviconFileName(''); }}
                        className="text-xs text-rose-600 hover:text-rose-800 p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Favicon Mode 2: URL Input */}
              {faviconInputMode === 'url' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={e => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/favicon.ico or data:image/..."
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span className="font-semibold">{isBn ? 'প্রিসেট ফেভিকন:' : 'Presets:'}</span>
                    {faviconPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFaviconUrl(p.url)}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer text-[10px]"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Primary Action: Save Branding Settings Globally */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                {isBn 
                  ? 'লোগো ও ফেভিকন সাথে সাথে হেড ট্যাগ ও স্টোরেজে গ্লোবালি সংরক্ষিত হবে' 
                  : 'Saves logo, favicon & title across all pages and syncs document head'}
              </div>
              <div className="flex items-center gap-2">
                {brandingSaveToast && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle className="w-4 h-4" />
                    <span>{isBn ? 'ব্র্যান্ডিং সফলভাবে কার্যকর!' : 'Branding Saved & Live!'}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveBrandingSettings}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ব্র্যান্ডিং সংরক্ষণ করুন' : 'Save Branding Globally'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Visualizer Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <h4 className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>{isBn ? 'লাইভ প্রিভিউ (ওয়েবসাইট হেডার)' : 'Live Preview (Navbar Header)'}</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Realtime
                </span>
              </h4>

              {/* Light Mode Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                {logoStyle === 'image_only' && logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 max-w-[160px] object-contain" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <span className="font-bold text-lg">A</span>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-slate-900 leading-tight">
                        {logoText || "Alom's"}
                      </div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {logoTagline || "English Center"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Dark Mode Preview (matches collage header & sidebar) */}
              <div className="p-4 rounded-xl bg-[#0a192f] border border-slate-800 flex items-center gap-3">
                {logoStyle === 'image_only' && logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 max-w-[160px] object-contain filter brightness-110" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <span className="font-bold text-lg">A</span>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-white leading-tight">
                        {logoText || "Alom's"}
                      </div>
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        {logoTagline || "English Center"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Realistic Browser Tab Mockup */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isBn ? 'ব্রাউজার ট্যাব ভিজ্যুয়ালাইজার (Favicon View):' : 'Browser Tab Visualizer:'}</span>
                </span>
                
                {/* Simulated Chrome Browser Header */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs">
                  {/* Top Bar with window buttons & active tab */}
                  <div className="flex items-center gap-2 px-3 pt-2 pb-0 bg-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>

                    {/* Active Browser Tab */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-t-lg border-t border-x border-slate-200 text-xs font-medium text-slate-800 max-w-[210px] shadow-2xs">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="w-3.5 h-3.5 object-contain shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-sm bg-blue-600 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                          A
                        </div>
                      )}
                      <span className="truncate text-[11px] font-semibold">
                        {logoText || "Alom's"} English Center LMS
                      </span>
                      <X className="w-3 h-3 text-slate-400 ml-auto shrink-0 hover:text-slate-600" />
                    </div>
                  </div>

                  {/* Browser URL Bar */}
                  <div className="px-3 py-2 bg-white flex items-center gap-2 border-t border-slate-200">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-xs">←</span>
                      <span className="text-xs">→</span>
                      <RefreshCw className="w-2.5 h-2.5 ml-1" />
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                      <span className="text-emerald-600 text-[10px]">🔒</span>
                      <span>https://alomsenglishcenter.com</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-[11px] leading-relaxed">
                {isBn 
                  ? 'এই লোগো ও ব্র্যান্ড সেটিংস পাবলিক ওয়েবসাইট, স্টুডেন্ট আইডি কার্ড এবং এডমিন সাইডবারে স্বয়ংক্রিয়ভাবে কার্যকর হবে।'
                  : 'Changes made here will instantly reflect across the public landing page, student certificates, ID cards, and dashboard header.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: HERO SLIDER SYSTEM ================= */}
      {activeTab === 'sliders' && (
        <div className="space-y-6">
          {/* Slider Controls Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={sliderAutoPlay}
                  onChange={e => {
                    const checked = e.target.checked;
                    setSliderAutoPlay(checked);
                    updateWebsiteSettings({ sliderAutoPlay: checked });
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>{isBn ? 'অটো-স্লাইড সক্রিয় (Auto-play Carousel)' : 'Auto-play Carousel'}</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">{isBn ? 'টাইমার বিরতি:' : 'Slide Interval:'}</span>
                <select
                  value={sliderIntervalSec}
                  onChange={e => {
                    const sec = Number(e.target.value);
                    setSliderIntervalSec(sec);
                    updateWebsiteSettings({ sliderIntervalSec: sec });
                  }}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value={3}>3 Seconds</option>
                  <option value={5}>5 Seconds (Recommended)</option>
                  <option value={8}>8 Seconds</option>
                  <option value={10}>10 Seconds</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingSlide(null);
                setSlideImageDraft(presetSlideImages[0]);
                setSlideShowOverlayDraft(true);
                setIsAddingSlide(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন স্লাইড তৈরি করুন' : 'Add New Slide'}</span>
            </button>
          </div>

          {/* Active Slider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sliders.map((slide, index) => (
              <div 
                key={slide.id}
                className={`bg-white rounded-2xl border shadow-2xs overflow-hidden flex flex-col justify-between transition-all ${
                  slide.isActive ? 'border-slate-200/90' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                {/* Visual slide thumbnail preview */}
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <img 
                    src={slide.imageUrl} 
                    alt={slide.title} 
                    className="w-full h-full object-cover filter brightness-90 hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] tracking-wider uppercase">
                        Slide #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSlideActive(slide.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                          slide.isActive
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-slate-700 text-slate-300 border-slate-600'
                        }`}
                      >
                        {slide.isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                      </button>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-amber-300 block line-clamp-1">
                        {slide.badge}
                      </span>
                      <h4 className="text-white font-extrabold text-sm line-clamp-1">
                        {slide.title} · <span className="text-amber-400">{slide.highlight}</span>
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Slide Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {slide.subtitle}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">
                      CTA: {slide.buttonText}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingSlide(slide);
                          setSlideImageDraft(slide.imageUrl || presetSlideImages[0]);
                          setSlideShowOverlayDraft(slide.showTextOverlay ?? true);
                          setIsAddingSlide(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title={isBn ? 'সম্পাদনা করুন' : 'Edit Slide'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSlideToDelete(slide)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={isBn ? 'মুছে ফেলুন' : 'Delete Slide'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Slide Modal */}
          {isAddingSlide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingSlide 
                      ? (isBn ? 'স্লাইড সম্পাদনা করুন' : 'Edit Slide Content')
                      : (isBn ? 'নতুন হিরো স্লাইড যোগ করুন' : 'Create New Hero Slide')}
                  </h3>
                  <button
                    onClick={() => {
                      setIsAddingSlide(false);
                      setEditingSlide(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newSlide: SliderItem = {
                      id: editingSlide ? editingSlide.id : `sld_${Date.now()}`,
                      title: (formData.get('title') as string) || 'Learn English',
                      titleBn: (formData.get('titleBn') as string) || 'ইংরেজি শিখুন',
                      highlight: (formData.get('highlight') as string) || 'Build a Better Future',
                      highlightBn: (formData.get('highlightBn') as string) || 'গড়ুন উজ্জ্বল ভবিষ্যৎ',
                      subtitle: (formData.get('subtitle') as string) || '',
                      subtitleBn: (formData.get('subtitleBn') as string) || '',
                      badge: (formData.get('badge') as string) || "Alom's Method",
                      badgeBn: (formData.get('badgeBn') as string) || 'বিশেষ ব্যাচ',
                      imageUrl: slideImageDraft || (formData.get('imageUrl') as string) || presetSlideImages[0],
                      buttonText: (formData.get('buttonText') as string) || 'Enroll Now',
                      buttonTextBn: (formData.get('buttonTextBn') as string) || 'ভর্তি হতে ক্লিক করুন',
                      buttonLink: (formData.get('buttonLink') as string) || '#courses',
                      showTextOverlay: slideShowOverlayDraft,
                      isActive: editingSlide ? editingSlide.isActive : true,
                      order: editingSlide ? editingSlide.order : sliders.length + 1
                    };
                    handleSaveSlideForm(newSlide);
                  }}
                  className="space-y-4 text-xs"
                >
                  {/* Display Mode Switch: Text Overlay vs Pure Graphic Poster */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {isBn ? 'স্লাইডের উপর লেখা ও বাটন প্রদর্শন (Text Overlay)' : 'Show Headline & Buttons Overlay on Slide'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {isBn 
                          ? 'বন্ধ রাখলে কেবল আপনার আপলোড করা পূর্ণাঙ্গ পোস্টার ব্যানার দেখাবে (Pure Graphic Banner Mode)' 
                          : 'Uncheck for Pure Graphic Poster mode (only shows your uploaded banner image cleanly)'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={slideShowOverlayDraft}
                      onChange={e => setSlideShowOverlayDraft(e.target.checked)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Image Source + Direct Upload + Presets */}
                  <div className="p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">
                        {isBn ? 'স্লাইড ব্যানার ছবি (আপলোড বা URL)' : 'Slide Banner Image (Upload or URL)'}
                      </label>
                      <input
                        type="file"
                        ref={slideFileInputRef}
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (typeof ev.target?.result === 'string') {
                              setSlideImageDraft(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => slideFileInputRef.current?.click()}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ফাইল আপলোড' : 'Upload File'}</span>
                      </button>
                    </div>
                    <input
                      name="imageUrl"
                      value={slideImageDraft}
                      onChange={e => setSlideImageDraft(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span className="font-semibold">{isBn ? 'প্রিসেট:' : 'Quick presets:'}</span>
                      {presetSlideImages.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSlideImageDraft(img)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                        >
                          Banner {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Slide Title (English)</label>
                      <input
                        name="title"
                        defaultValue={editingSlide?.title || 'Learn English'}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Slide Title (বাংলা)</label>
                      <input
                        name="titleBn"
                        defaultValue={editingSlide?.titleBn || 'ইংরেজি শিখুন'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Highlight Phrase</label>
                      <input
                        name="highlight"
                        defaultValue={editingSlide?.highlight || 'Build a Better Future'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-amber-600 font-bold focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Highlight Phrase (বাংলা)</label>
                      <input
                        name="highlightBn"
                        defaultValue={editingSlide?.highlightBn || 'গড়ুন উজ্জ্বল ভবিষ্যৎ'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-amber-600 font-bold focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Subtitle Description (EN)</label>
                      <textarea
                        name="subtitle"
                        rows={2}
                        defaultValue={editingSlide?.subtitle || 'Join Alom\'s English Center and master IELTS, Spoken English, and Corporate Communication.'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Subtitle Description (বাংলা)</label>
                      <textarea
                        name="subtitleBn"
                        rows={2}
                        defaultValue={editingSlide?.subtitleBn || 'দক্ষ মেন্টরদের সাথে সহজে ইংরেজি ও IELTS শিখুন।'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Badge Tagline (EN)</label>
                      <input
                        name="badge"
                        defaultValue={editingSlide?.badge || "Alom's Method"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Badge Tagline (বাংলা)</label>
                      <input
                        name="badgeBn"
                        defaultValue={editingSlide?.badgeBn || "স্পেশাল ব্যাচ"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Button CTA (EN)</label>
                      <input
                        name="buttonText"
                        defaultValue={editingSlide?.buttonText || 'Enroll Now'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Button CTA (বাংলা)</label>
                      <input
                        name="buttonTextBn"
                        defaultValue={editingSlide?.buttonTextBn || 'ভর্তি হতে ক্লিক করুন'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target Link (#section)</label>
                      <input
                        name="buttonLink"
                        defaultValue={editingSlide?.buttonLink || '#courses'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSlide(false);
                        setEditingSlide(null);
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                    >
                      {isBn ? 'স্লাইড সেভ করুন' : 'Save Slide'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: INFO & CONTACT SETTINGS ================= */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{isBn ? 'ব্রাঞ্চ ঠিকানা ও হেল্পলাইন তথ্য' : 'Campus Locations & Contact Information'}</span>
            </h3>

            {/* Dhaka Campus */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dhaka Head Campus Address (English)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ঢাকা প্রধান ক্যাম্পাস ঠিকানা (বাংলা)
                </label>
                <input
                  type="text"
                  value={addressBn}
                  onChange={e => setAddressBn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            {/* Chittagong Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chittagong Branch Address (English)
                </label>
                <input
                  type="text"
                  value={chittagongAddress}
                  onChange={e => setChittagongAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  চট্টগ্রাম শাখা ঠিকানা (বাংলা)
                </label>
                <input
                  type="text"
                  value={chittagongAddressBn}
                  onChange={e => setChittagongAddressBn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            {/* Hotlines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Hotline (+880)
                </label>
                <input
                  type="text"
                  value={hotline}
                  onChange={e => setHotline(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Support Number
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-hidden text-emerald-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Support Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Office Working Hours (English)
                </label>
                <input
                  type="text"
                  value={supportHours}
                  onChange={e => setSupportHours(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  অফিস খোলা থাকার সময়সূচি (বাংলা)
                </label>
                <input
                  type="text"
                  value={supportHoursBn}
                  onChange={e => setSupportHoursBn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            {/* Social Media Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Facebook Page URL
                </label>
                <input
                  type="text"
                  value={facebookPage}
                  onChange={e => setFacebookPage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  YouTube Channel URL
                </label>
                <input
                  type="text"
                  value={youtubeChannel}
                  onChange={e => setYoutubeChannel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden text-rose-600"
                />
              </div>
            </div>

            {/* Google Map Embed */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Map Embed Iframe URL
              </label>
              <input
                type="text"
                value={googleMapEmbedUrl}
                onChange={e => setGoogleMapEmbedUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Quick Preview Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>{isBn ? 'লাইভ যোগাযোগ উইজেট' : 'Live Contact Summary'}</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dhaka Main Campus</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-5">{address || 'Not configured'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Direct Hotline & WhatsApp</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 font-bold pl-5">{hotline || 'Not configured'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Official Email</span>
                  </div>
                  <div className="text-[11px] text-slate-600 pl-5">{email || 'Not configured'}</div>
                </div>
              </div>

              {googleMapEmbedUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 h-36">
                  <iframe
                    title="Campus Map"
                    src={googleMapEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: NOTICE RIBBON & TICKER ================= */}
      {activeTab === 'homepage' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 space-y-4">
            <div><h3 className="font-bold text-sm text-slate-900">{isBn ? 'হোমপেজ সেকশন' : 'Homepage Sections'}</h3><p className="text-xs text-slate-500 mt-1">{isBn ? 'কোন কোন অংশ পাবলিক হোমপেজে দেখাবে তা নির্বাচন করুন।' : 'Choose which sections appear on the public homepage.'}</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {homepageSectionOptions.map(option => (
                <label key={option.key} className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700">
                  <input type="checkbox" checked={Boolean(homepageSections[option.key])} onChange={event => setHomepageSections(previous => ({ ...previous, [option.key]: event.target.checked }))} className="rounded text-blue-600" />
                  {isBn ? option.bn : option.en}
                </label>
              ))}
            </div>
          </section>
          <section className="xl:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 space-y-4">
            <div><h3 className="font-bold text-sm text-slate-900">{isBn ? 'ডিজাইন ও থিম' : 'Design Theme'}</h3><p className="text-xs text-slate-500 mt-1">{isBn ? 'কালার, ফন্ট ও টাইপোগ্রাফি পরিবর্তন করুন।' : 'Customize colors, typography and visual hierarchy.'}</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['primaryColor','Primary color'],['secondaryColor','Secondary color'],['accentCyanColor','Cyan accent'],
                ['accentEmeraldColor','Emerald accent'],['navbarBg','Navbar background'],['cardBg','Card background'],
                ['footerBg','Footer background'],['footerTextColor','Footer text'],['loginButtonColor','Login button'],
              ] as Array<[keyof HomepageThemeSettings,string]>).map(([key,label]) => (
                <label key={key} className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                  <span>{label}</span>
                  <input type="color" value={String(themeSettings[key] || '#2563EB')} onChange={event => setThemeSettings(previous => ({ ...previous, [key]: event.target.value }))} className="w-12 h-8 border border-slate-200 rounded cursor-pointer" />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-700">Heading font<input value={themeSettings.headingFont || ''} onChange={event => setThemeSettings(previous => ({ ...previous, headingFont: event.target.value }))} placeholder="Inter, sans-serif" className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal" /></label>
              <label className="text-xs font-semibold text-slate-700">Body font<input value={themeSettings.bodyFont || ''} onChange={event => setThemeSettings(previous => ({ ...previous, bodyFont: event.target.value }))} placeholder="Inter, sans-serif" className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal" /></label>
              <label className="text-xs font-semibold text-slate-700">Base font size (px)<input type="number" min="12" max="24" value={themeSettings.baseFontSizePx || 16} onChange={event => setThemeSettings(previous => ({ ...previous, baseFontSizePx: Number(event.target.value) }))} className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal" /></label>
              <label className="text-xs font-semibold text-slate-700">Heading scale<select value={themeSettings.headingScale || 'standard'} onChange={event => setThemeSettings(previous => ({ ...previous, headingScale: event.target.value as HomepageThemeSettings['headingScale'] }))} className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal"><option value="compact">Compact</option><option value="standard">Standard</option><option value="large">Large</option></select></label>
            </div>
            {homepageSaveError && <p role="alert" className="text-xs text-rose-600">{homepageSaveError}</p>}
            {homepageSaveSuccess && <p role="status" className="text-xs text-emerald-700">{isBn ? 'হোমপেজ ও থিম সেটিংস সংরক্ষিত হয়েছে।' : 'Homepage and theme settings saved.'}</p>}
            <div className="flex justify-end"><button type="button" onClick={() => void saveHomepageSettings()} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold"><Save className="w-4 h-4 inline mr-1.5" />{isBn ? 'সেটিংস সংরক্ষণ' : 'Save Homepage Settings'}</button></div>
          </section>
        </div>
      )}

      {activeTab === 'notice' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isBn ? 'জরুরি নোটিশ রিবন ও স্ক্রলিং টিকার' : 'Emergency Notice Ribbon & Ticker'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBn ? 'ওয়েবসাইটের একদম উপরে গুরুত্বপূর্ণ ঘোষণা প্রদর্শনের জন্য' : 'Display urgent announcements, admission alerts, or exam updates'}
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enableNoticeRibbon}
                onChange={e => setEnableNoticeRibbon(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>{isBn ? 'রিবন প্রদর্শন সক্রিয়' : 'Enable Notice Ribbon'}</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isBn ? 'জরুরি নোটিশ বার্তা (Top Alert Ribbon):' : 'Emergency Banner Ribbon Message:'}
              </label>
              <input
                type="text"
                value={emergencyNotice}
                onChange={e => setEmergencyNotice(e.target.value)}
                placeholder="e.g. New admission batch registration is now open."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isBn ? 'স্ক্রলিং নোটিশ টিকার (Notice Ticker):' : 'Scrolling News Ticker (Secondary):'}
              </label>
              <input
                type="text"
                value={noticeTicker}
                onChange={e => setNoticeTicker(e.target.value)}
                placeholder="Upcoming Cambridge IELTS Mock Exam on Friday. Bring Registration Slip."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden font-mono"
              />
            </div>

            {/* Live Ribbon Preview */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                {isBn ? 'লাইভ প্রিভিউ:' : 'Live Banner Preview:'}
              </span>
              <div className="p-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] uppercase">
                    Notice
                  </span>
                  <span>{emergencyNotice || 'Welcome to Alom\'s English Center – Professional LMS'}</span>
                </div>
                <span className="text-[11px] opacity-80 underline cursor-pointer">
                  {isBn ? 'বিস্তারিত দেখুন →' : 'Learn More →'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Delete Confirmation Modal for Slide Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(slideToDelete)}
        onClose={() => setSlideToDelete(null)}
        onConfirm={handleConfirmDeleteSlide}
        title="Confirm Slide Deletion"
        titleBn="স্লাইড মুছে ফেলার নিশ্চিতকরণ"
        itemName={slideToDelete ? `${slideToDelete.title} (${slideToDelete.badge})` : ''}
        message="Are you sure you want to delete this slider? It will be permanently removed from the homepage hero carousel."
        messageBn="আপনি কি নিশ্চিতভাবে এই স্লাইডারটি মুছে ফেলতে চান? এটি হোমপেজ হিরো ক্যারোসেল থেকে স্থায়ীভাবে মুছে যাবে।"
        confirmText="Yes, Delete Slide"
        confirmTextBn="হ্যাঁ, স্লাইডটি মুছে ফেলুন"
        language={language}
      />
    </div>
  );
};
