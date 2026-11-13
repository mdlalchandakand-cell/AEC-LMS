import React, { useState, useEffect, useRef } from 'react';
import { useLms } from '../../context/LmsContext';
import {
  Play, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight,
  Bell, MapPin, Phone, MessageCircle, ChevronDown, ChevronUp,
  BookOpen, ShieldCheck, Smartphone, Star, X, Globe,
  GraduationCap, Users, Video, Award, BookMarked, Sparkles,
  Headphones, Briefcase, Quote, Search, FileCheck2, ExternalLink
} from 'lucide-react';
import {
  Course, Notice, SliderItem, HomepageEbookItem,
  HomepageLearningPathItem
} from '../../types/lms';

// Local verified generated images
import heroEducatorImg from '../../assets/images/hero_educator_studio_1794552233836.jpg';
import ieltsCourseImg from '../../assets/images/course_ielts_masterclass_1794552235026.jpg';
import spokenCourseImg from '../../assets/images/course_spoken_fluency_1794552235255.jpg';
import grammarCourseImg from '../../assets/images/course_grammar_bundle_1794552235221.jpg';
import appMockupImg from '../../assets/images/app_learning_mockup_1794552235813.jpg';

interface HeroSectionProps {
  onOpenAdmission: (course?: Course) => void;
  onOpenVideoPreview: () => void;
  onSelectCourse: (course: Course) => void;
  onOpenVerifyModal?: () => void;
}

const getFallbackCourseImage = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('spoken') || cat.includes('phonetics')) return spokenCourseImg;
  if (cat.includes('grammar') || cat.includes('writing')) return grammarCourseImg;
  return ieltsCourseImg;
};

const isBrokenExternalUrl = (url?: string): boolean => {
  if (!url) return true;
  return url.includes('images.unsplash.com') || url.includes('placeholder');
};

const PATH_THEME_STYLES: Record<HomepageLearningPathItem['theme'], {
  cardBg: string;
  iconBg: string;
  titleColor: string;
  linkColor: string;
  Icon: React.ElementType;
}> = {
  blue: {
    cardBg: 'bg-[#D6E9FF] hover:bg-[#CBE2FF] border-[#BBD8FF]',
    iconBg: 'bg-[#1D63FF]',
    titleColor: 'text-[#1D63FF]',
    linkColor: 'text-[#1D63FF]',
    Icon: GraduationCap
  },
  green: {
    cardBg: 'bg-[#CEFCE0] hover:bg-[#C0F9D6] border-[#B2F5CD]',
    iconBg: 'bg-[#00A647]',
    titleColor: 'text-[#00A647]',
    linkColor: 'text-[#00A647]',
    Icon: BookOpen
  },
  purple: {
    cardBg: 'bg-[#F0DEFF] hover:bg-[#E8CEFF] border-[#E1C2FF]',
    iconBg: 'bg-[#9333EA]',
    titleColor: 'text-[#9333EA]',
    linkColor: 'text-[#9333EA]',
    Icon: BookMarked
  },
  orange: {
    cardBg: 'bg-[#FFE6C7] hover:bg-[#FFDCAD] border-[#FFD09B]',
    iconBg: 'bg-[#F94E00]',
    titleColor: 'text-[#F94E00]',
    linkColor: 'text-[#F94E00]',
    Icon: Headphones
  },
  indigo: {
    cardBg: 'bg-[#DDE6FF] hover:bg-[#CFD9FF] border-[#C4D2FF]',
    iconBg: 'bg-[#4F46E5]',
    titleColor: 'text-[#4F46E5]',
    linkColor: 'text-[#4F46E5]',
    Icon: Briefcase
  },
  pink: {
    cardBg: 'bg-[#FFE0EE] hover:bg-[#FFD2E6] border-[#FFC4DE]',
    iconBg: 'bg-[#EC0075]',
    titleColor: 'text-[#EC0075]',
    linkColor: 'text-[#EC0075]',
    Icon: Users
  }
};

const EBOOK_GRADIENTS: Record<HomepageEbookItem['colorTheme'], string> = {
  sky: 'from-[#0284C7] via-[#0369A1] to-[#0F172A]',
  emerald: 'from-[#059669] via-[#047857] to-[#064E3B]',
  purple: 'from-[#7C3AED] via-[#6D28D9] to-[#3B0764]',
  indigo: 'from-[#2563EB] via-[#1D4ED8] to-[#1E1B4B]'
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenAdmission,
  onOpenVideoPreview,
  onOpenVerifyModal
}) => {
  const {
    language, setLanguage, courses, categories, websiteSettings,
    setActiveView, setSelectedEbookId, notices, testimonials, branches, isAuthenticated
  } = useLms();
  const isBn = language === 'bn';

  const theme = {
    headingFont: websiteSettings.themeSettings?.headingFont || 'Plus Jakarta Sans',
    bodyFont: websiteSettings.themeSettings?.bodyFont || 'Plus Jakarta Sans',
    headingWeight: websiteSettings.themeSettings?.headingWeight || '800',
    headingScale: websiteSettings.themeSettings?.headingScale || 'standard',
    primaryColor: websiteSettings.themeSettings?.primaryColor || '#0284C7',
    secondaryColor: websiteSettings.themeSettings?.secondaryColor || '#4F46E5',
    accentCyanColor: websiteSettings.themeSettings?.accentCyanColor || '#38BDF8',
    accentEmeraldColor: websiteSettings.themeSettings?.accentEmeraldColor || '#10B981',
    learningPathTitleColor: websiteSettings.themeSettings?.learningPathTitleColor || '#0EA5E9',
    heroBgTop: websiteSettings.themeSettings?.heroBgTop || '#022D41',
    heroBgBottom: websiteSettings.themeSettings?.heroBgBottom || '#022233',
    bentoLeftBgTop: websiteSettings.themeSettings?.bentoLeftBgTop || '#064844',
    bentoLeftBgBottom: websiteSettings.themeSettings?.bentoLeftBgBottom || '#032833',
    bentoRightBgTop: websiteSettings.themeSettings?.bentoRightBgTop || '#073E66',
    bentoRightBgBottom: websiteSettings.themeSettings?.bentoRightBgBottom || '#03233E',
    lightCanvasStart: websiteSettings.themeSettings?.lightCanvasStart || '#EAE9FF',
    lightCanvasMid: websiteSettings.themeSettings?.lightCanvasMid || '#F2F3FF',
    lightCanvasEnd: websiteSettings.themeSettings?.lightCanvasEnd || '#E5F4FE',
    cardBg: websiteSettings.themeSettings?.cardBg || '#FFFFFF',
    reviewsBgTop: websiteSettings.themeSettings?.reviewsBgTop || '#0E1729',
    reviewsBgBottom: websiteSettings.themeSettings?.reviewsBgBottom || '#0B1220',
    reviewsCardBg: websiteSettings.themeSettings?.reviewsCardBg || '#1B2537'
  };

  const lightCanvasBg = `linear-gradient(135deg, ${theme.lightCanvasStart} 0%, ${theme.lightCanvasMid} 45%, ${theme.lightCanvasEnd} 100%)`;
  const headingScaleClass =
    theme.headingScale === 'compact'
      ? 'text-2xl sm:text-3xl'
      : theme.headingScale === 'large'
      ? 'text-3xl sm:text-5xl'
      : 'text-3xl sm:text-4xl';

  const sections = {
    showUtilityStrip: websiteSettings.homepageSections?.showUtilityStrip ?? true,
    showSlider: websiteSettings.homepageSections?.showSlider ?? true,
    showStats: websiteSettings.homepageSections?.showStats ?? true,
    showLearningPaths: websiteSettings.homepageSections?.showLearningPaths ?? true,
    showCourses: websiteSettings.homepageSections?.showCourses ?? true,
    showCombo: websiteSettings.homepageSections?.showCombo ?? true,
    showInstructors: websiteSettings.homepageSections?.showInstructors ?? true,
    showWhyUs: websiteSettings.homepageSections?.showWhyUs ?? true,
    showAppBanner: websiteSettings.homepageSections?.showAppBanner ?? true,
    showEbooks: websiteSettings.homepageSections?.showEbooks ?? true,
    showResultPortal: websiteSettings.homepageSections?.showResultPortal ?? true,
    showReviews: websiteSettings.homepageSections?.showReviews ?? true,
    showFaq: websiteSettings.homepageSections?.showFaq ?? true,
    showBranches: websiteSettings.homepageSections?.showBranches ?? true
  };

  // Active sliders sorted by order
  const sortedActiveSliders = [...(websiteSettings.sliders || [])]
    .filter(s => s.isActive)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const fallbackSlider: SliderItem = {
    id: 'sld_fallback',
    title: websiteSettings.heroHeadline || 'Master English',
    titleBn: 'সঠিক মেথডে ইংরেজি শিখুন',
    highlight: websiteSettings.heroHighlight || 'Basic to Pro Fluency',
    highlightBn: 'বেসিক থেকে প্রো প্রস্তুতি',
    subtitle:
      websiteSettings.heroSubtitle ||
      'Structured live and recorded programs for IELTS, Spoken English, and Grammar with weekly realistic mock exams.',
    subtitleBn:
      'দেশসেরা মেন্টরদের তত্ত্বাবধানে IELTS, স্পোকেন ইংলিশ ও ফাউন্ডেশন গ্রামারের পূর্ণাঙ্গ অনলাইন ও অফলাইন প্রস্তুতি।',
    badge: 'Admission Going On · 2026 Batches',
    badgeBn: 'নতুন ব্যাচে ভর্তি চলছে · ২০২৬',
    imageUrl: heroEducatorImg,
    buttonText: 'Explore Courses',
    buttonTextBn: 'ব্যাচগুলোতে ভর্তি হোন',
    buttonLink: '#courses',
    showTextOverlay: true,
    isActive: true,
    order: 1
  };

  const slidesToRender = sortedActiveSliders.length > 0 ? sortedActiveSliders : [fallbackSlider];

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [ebookFilter, setEbookFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const [selectedNoticeModal, setSelectedNoticeModal] = useState<Notice | null>(null);
  const [previewCourseModal, setPreviewCourseModal] = useState<Course | null>(null);
  const [selectedEbookModal, setSelectedEbookModal] = useState<HomepageEbookItem | null>(null);

  const safeSlideIndex = slidesToRender.length > 0 ? currentSlideIndex % slidesToRender.length : 0;
  const prevSlideIndex = (safeSlideIndex - 1 + slidesToRender.length) % slidesToRender.length;
  const nextSlideIndex = (safeSlideIndex + 1) % slidesToRender.length;

  useEffect(() => {
    if (currentSlideIndex >= slidesToRender.length && slidesToRender.length > 0) {
      setCurrentSlideIndex(0);
    }
  }, [slidesToRender.length, currentSlideIndex]);

  useEffect(() => {
    if (!websiteSettings.sliderAutoPlay || slidesToRender.length <= 1 || isSliderHovered) return;
    const intervalTime = Math.max(2, websiteSettings.sliderIntervalSec || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % slidesToRender.length);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [websiteSettings.sliderAutoPlay, websiteSettings.sliderIntervalSec, slidesToRender.length, isSliderHovered]);

  const goToPrevSlide = () => {
    setCurrentSlideIndex(prev => (prev - 1 + slidesToRender.length) % slidesToRender.length);
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex(prev => (prev + 1) % slidesToRender.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || slidesToRender.length <= 1) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) goToNextSlide();
    else if (diff < -45) goToPrevSlide();
    touchStartX.current = null;
  };

  const handleSlideCtaAction = (link?: string) => {
    const target = (link || '#courses').trim();
    if (target === '#admission') {
      onOpenAdmission();
    } else if (target === '#video') {
      onOpenVideoPreview();
    } else if (target === '#courses') {
      const el = document.getElementById('featured-courses-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else setActiveView('courses');
    } else if (target === '/courses') {
      setActiveView('courses');
    } else if (target === '/live_classes') {
      setActiveView('live_classes');
    } else if (target === '/exams') {
      setActiveView('exams');
    } else if (target === '/contact') {
      setActiveView('contact');
    } else if (target === '/login') {
      setActiveView('login');
    } else if (target.startsWith('#')) {
      const el = document.getElementById(target.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else onOpenAdmission();
    } else if (target.startsWith('http://') || target.startsWith('https://')) {
      window.location.href = target;
    } else {
      setActiveView('courses');
    }
  };

  const publishedCourses = courses.filter(c => c.status !== 'draft' && c.status !== 'archived');
  const displayCourses = publishedCourses.length > 0 ? publishedCourses : courses;

  const filteredCourses =
    selectedCategory === 'all'
      ? displayCourses
      : displayCourses.filter(
          c =>
            c.category.toLowerCase() === selectedCategory.toLowerCase() ||
            c.category.toLowerCase().includes(selectedCategory.toLowerCase())
        );

  const countForCategory = (catName: string) =>
    displayCourses.filter(
      c =>
        c.category.toLowerCase() === catName.toLowerCase() ||
        c.category.toLowerCase().includes(catName.toLowerCase())
    ).length;

  const bentoOngoing = websiteSettings.bentoOngoing || {
    badgeEn: 'Online Course',
    badgeBn: 'অনলাইন কোর্সসমূহ',
    titleEn: 'Online Batches are ongoing!',
    titleBn: 'অনলাইন ব্যাচসমূহ চলমান আছে!',
    subtitleEn: 'Book your seat now!',
    subtitleBn: 'আজই আপনার আসন নিশ্চিত করুন!',
    track1TitleEn: 'IELTS Academic & GT',
    track1TitleBn: 'IELTS একাডেমিক ও জিটি',
    track1DescEn: 'Band 7.5+ Target Intensive Preparation',
    track1DescBn: 'ব্যান্ড ৭.৫+ টার্গেট পূর্ণাঙ্গ প্রস্তুতি',
    track1Cat: 'IELTS',
    track2TitleEn: 'Spoken & Grammar Foundation',
    track2TitleBn: 'স্পোকেন ও ফাউন্ডেশন গ্রামার',
    track2DescEn: 'Basic to Pro Communication Batches',
    track2DescBn: 'বেসিক থেকে ফ্লুয়েন্ট হওয়ার লাইভ ব্যাচ',
    track2Cat: 'Spoken'
  };

  const heroStats =
    websiteSettings.heroStats && websiteSettings.heroStats.length > 0
      ? websiteSettings.heroStats
      : [
          { value: '15,000+', labelEn: 'Students', labelBn: 'শিক্ষার্থী', highlight: false },
          { value: '24+', labelEn: 'Active Courses', labelBn: 'চলমান কোর্স', highlight: false },
          { value: '18+', labelEn: 'Expert Teachers', labelBn: 'অভিজ্ঞ মেন্টর', highlight: false },
          { value: '500+', labelEn: 'HD Video Lessons', labelBn: 'এইচডি লেসন', highlight: true }
        ];

  const statIcons = [Users, Play, GraduationCap, Video];

  const pathsSection = websiteSettings.pathsSection || {
    titleEn: 'Choose Your Learning Path',
    titleBn: 'আপনার লার্নিং পাথ বেছে নিন',
    subtitleEn:
      'Discover structured English programs across multiple tracks designed to help you speak and score with confidence.',
    subtitleBn: 'একাডেমিক, স্পোকেন এবং আইইএলটিএস প্রস্তুতির জন্য সাজানো আমাদের বিশেষায়িত প্রোগ্রামসমূহ'
  };

  const learningPaths = websiteSettings.learningPaths || [];

  const comboOffer = websiteSettings.comboOffer || {
    enabled: true,
    eyebrowEn: 'All-in-One Mastery Combo Offer',
    eyebrowBn: 'স্পেশাল কম্বো অফার · পূর্ণাঙ্গ প্যাকেজ',
    titleEn: 'Complete English Fluency & IELTS Preparation Combo Track',
    titleBn: 'আইইএলটিএস + স্পোকেন + গ্রামার কম্বো প্যাকেজে একসাথে সম্পূর্ণ প্রস্তুতি',
    descEn:
      'Save 35% when enrolling in our integrated Spoken English, Grammar Foundation, and IELTS Academic Masterclass bundle with full mock test evaluation.',
    descBn:
      'আলাদা আলাদা ব্যাচে ভর্তি না হয়ে একই সাথে পূর্ণাঙ্গ লাইভ ক্লাস, রেকর্ডেড ভিডিও, ৪টি লেকচার বই ও ২০টি ফুল মক টেস্ট পান সাশ্রয়ী মূল্যে।',
    bulletsEn: ['78+ Live & Recorded Classes', 'Downloadable Study Handbooks', '1-on-1 Speaking Evaluation'],
    bulletsBn: ['৭৮+ এইচডি রেকর্ডেড ও লাইভ ক্লাস', 'প্রিন্টেবল পিডিএফ শিট', 'সরাসরি মেন্টর গাইডলাইন'],
    price: 9500,
    originalPrice: 18500,
    ctaEn: 'Claim Combo Seat',
    ctaBn: 'কম্বো ব্যাচে ভর্তি হোন'
  };

  const linkedComboCourse =
    (comboOffer.courseId ? displayCourses.find(c => c.id === comboOffer.courseId) : undefined) || displayCourses[0];

  const coursesSection = websiteSettings.coursesSection || {
    eyebrowEn: 'Structured Batches',
    eyebrowBn: 'বেসিক টু প্রো প্রোগ্রাম',
    titleEn: 'All Courses',
    titleBn: 'সকল কোর্সসমূহ',
    subtitleEn: 'Select your target program category to filter live batches, video tracks, and guided mock exam packs.',
    subtitleBn: 'আপনার লক্ষ্য অনুযায়ী আইইএলটিএস, স্পোকেন বা ফাউন্ডেশন গ্রামার ব্যাচ বেছে নিন।'
  };

  const instructorsSection = websiteSettings.instructorsSection || {
    titleEn: 'Our Expert Instructors',
    titleBn: 'আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী',
    subtitleEn: "Meet our dedicated team of British Council & Cambridge aligned educators at Alom's English Center.",
    subtitleBn: 'আইইএলটিএস ও ইংরেজি শিক্ষায় দেশের শীর্ষস্থানীয় মেন্টরদের সাথে পরিচিত হোন',
    panelLabelEn: 'Faculty Panel',
    panelLabelBn: 'মেন্টর প্যানেল'
  };

  const instructors = websiteSettings.instructors || [];

  const whyUsSection = websiteSettings.whyUsSection || {
    eyebrowEn: "Why Learners Choose Alom's Method",
    eyebrowBn: 'কেন আমাদের মেথড আলাদা?',
    titleEn: 'Built Around Clarity, Regular Practice, and Measurable Progress',
    titleBn: 'সঠিক গাইডলাইন ও কাঠামোগত প্রস্তুতির নির্ভরযোগ্য প্ল্যাটফর্ম',
    pillars: []
  };

  const appBannerSection = websiteSettings.appBannerSection || {
    eyebrowEn: 'Distraction-Free Web & Mobile Study Portal',
    eyebrowBn: 'যেখানেই থাকুন, শেখা চলবে নির্বিঘ্নে',
    titleEn: 'Stream Lectures, Download Notes, and Track Exam Rankings Anywhere',
    titleBn: 'স্মার্টফোন ও ল্যাপটপ থেকেই লাইভ ক্লাস, নোটস ও মক টেস্ট',
    descEn:
      'Access your enrolled batch curriculum, live meeting links, recorded replays, MCQ assessments, and official verified certificates from a single student dashboard.',
    descBn:
      'শিক্ষার্থীদের জন্য তৈরি আমাদের ডেডিকেটেড স্টুডেন্ট পোর্টালে এক জায়গায় থাকছে ক্লাস রুটিন, অ্যাটেনডেন্স রিপোর্ট, রাইটিং ফিডব্যাক এবং অটোমেটেড মার্কশিট।',
    imageUrl: appMockupImg,
    feature1TitleEn: 'Focused Video Player',
    feature1TitleBn: 'অ্যাড-ফ্রি ভিডিও স্ট্রিমিং',
    feature1DescEn: 'Built-in study notes & progress tracking',
    feature1DescBn: 'অধ্যায়ভিত্তিক নোট ও বুকমার্ক',
    feature2TitleEn: 'Instant Exam Scorecard',
    feature2TitleBn: 'তাৎক্ষণিক রেজাল্ট ও র‍্যাংক',
    feature2DescEn: 'Automated grading & answer breakdown',
    feature2DescBn: 'নেগেটিভ মার্কিং সহ রিয়েল টেস্ট',
    primaryCtaEn: 'Open Student Portal',
    primaryCtaBn: 'স্টুডেন্ট পোর্টালে প্রবেশ করুন',
    secondaryCtaEn: 'Try Sample Mock Test',
    secondaryCtaBn: 'ফ্রি মক টেস্ট দিন'
  };

  const ebooksSection = websiteSettings.ebooksSection || {
    titleEn: 'All E-Books & Study Guides',
    titleBn: 'সকল ই-বুক ও স্টাডি নোটস'
  };

  const ebooks = websiteSettings.ebooks || [];
  const freeEbookCount = ebooks.filter(e => e.isFree).length;
  const premiumEbookCount = ebooks.filter(e => !e.isFree).length;
  const filteredEbooks = ebooks.filter(eb => {
    if (ebookFilter === 'free') return eb.isFree;
    if (ebookFilter === 'premium') return !eb.isFree;
    return true;
  });

  const resultPortal = websiteSettings.resultPortalSection || {
    titleEn: 'Official Result & Certificate Portal',
    titleBn: 'রেজাল্ট ও সার্টিফিকেট ভেরিফিকেশন পোর্টাল',
    subtitleEn: 'Verify official student examination scorecards and issued digital certificates instantly.',
    subtitleBn: "আলম'স ইংলিশ সেন্টারের অফিশিয়াল মক টেস্ট রেজাল্ট ও সনদ অনলাইনে যাচাই করুন",
    cardTitleEn: 'Official Result Portals',
    cardTitleBn: 'অফিশিয়াল রেজাল্ট পোর্টাল',
    cardDescEn:
      'Access instant scorecard lookup and verified digital credential checks using your registration ID or student roll.',
    cardDescBn: 'আপনার সার্টিফিকেট আইডি অথবা স্টুডেন্ট রোল নম্বর দিয়ে তাৎক্ষণিক ফলাফল এবং অর্জিত ব্যান্ড স্কোর যাচাই করুন।'
  };

  const faqs = websiteSettings.faqItems || [];
  const activeBranches = branches.filter(br => br.isActive !== false);

  const selectPathCategory = (targetCat: string) => {
    if (targetCat === 'ebooks') {
      const el = document.getElementById('ebooks-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setSelectedCategory(targetCat);
    const el = document.getElementById('featured-courses-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="w-full text-slate-900"
      style={{ background: lightCanvasBg, fontFamily: `'${theme.bodyFont}', 'Hind Siliguri', sans-serif` }}
    >
      {/* Optional Non-Sticky Announcement Strip */}
      {websiteSettings.enableNoticeRibbon && websiteSettings.emergencyNotice && (
        <div className="text-white py-2 px-4 text-xs font-medium" style={{ backgroundColor: theme.primaryColor }}>
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
            <p className="truncate">{websiteSettings.emergencyNotice}</p>
            <button
              type="button"
              onClick={() => onOpenAdmission()}
              className="whitespace-nowrap shrink-0 font-semibold underline hover:text-sky-100 cursor-pointer"
            >
              {isBn ? 'ভর্তি তথ্য দেখুন' : 'View Admission'}
            </button>
          </div>
        </div>
      )}

      {/* 1. DEEP TEAL-NAVY HERO STAGE */}
      {(sections.showUtilityStrip || sections.showSlider || sections.showStats) && (
        <section
          className="text-white overflow-hidden"
          style={{ background: `linear-gradient(180deg, ${theme.heroBgTop} 0%, ${theme.heroBgBottom} 100%)` }}
        >
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-14">
            {/* Compact Sub-Hero Utility Strip */}
            {sections.showUtilityStrip && (
              <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-3 min-w-0">
                  {notices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedNoticeModal(notices[0])}
                      className="inline-flex items-center gap-2 text-left text-slate-200 hover:text-white transition-colors truncate cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate font-medium">
                        {isBn ? (notices[0].titleBn || notices[0].title) : notices[0].title}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {onOpenVerifyModal && (
                    <button
                      type="button"
                      onClick={onOpenVerifyModal}
                      className="inline-flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isBn ? 'সার্টিফিকেট যাচাই' : 'Verify Certificate'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 bg-[#021B29] border border-white/15 rounded-md p-0.5">
                    <Globe className="w-3.5 h-3.5 text-sky-300 ml-1.5 mr-0.5" />
                    <button
                      type="button"
                      onClick={() => setLanguage('bn')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        language === 'bn' ? 'bg-[#0284C7] text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      বাংলা
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        language === 'en' ? 'bg-[#0284C7] text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3-CARD PEEK PROMOTIONAL CAROUSEL */}
            {sections.showSlider && (
              <div
                className="flex items-center justify-center gap-4 lg:gap-6"
                onMouseEnter={() => setIsSliderHovered(true)}
                onMouseLeave={() => setIsSliderHovered(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {slidesToRender.length > 1 && (
                  <button
                    type="button"
                    onClick={goToPrevSlide}
                    aria-label="Previous slide preview"
                    className="hidden lg:block w-[11%] h-[340px] rounded-2xl overflow-hidden border border-white/15 opacity-35 hover:opacity-60 transition-opacity shrink-0 relative cursor-pointer bg-[#021C2B]"
                  >
                    <img
                      src={!isBrokenExternalUrl(slidesToRender[prevSlideIndex].imageUrl) ? slidesToRender[prevSlideIndex].imageUrl : heroEducatorImg}
                      alt="Previous slide"
                      referrerPolicy="no-referrer"
                      onError={e => {
                        e.currentTarget.src = heroEducatorImg;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#032D42]/45" />
                  </button>
                )}

                <div className="w-full lg:w-[76%] max-w-[940px] relative rounded-2xl overflow-hidden border border-white/15 bg-[#021C2B] shadow-2xl">
                  <div
                    className="flex transition-transform duration-500 ease-out will-change-transform"
                    style={{ transform: `translateX(-${safeSlideIndex * 100}%)` }}
                  >
                    {slidesToRender.map((slide, idx) => {
                      const imgSrc = !isBrokenExternalUrl(slide.imageUrl) ? slide.imageUrl : heroEducatorImg;
                      const showOverlay = slide.showTextOverlay !== false;

                      return (
                        <div
                          key={slide.id || idx}
                          className="w-full shrink-0 relative min-h-[380px] sm:min-h-[430px] lg:min-h-[450px] flex items-center"
                        >
                          <img
                            src={imgSrc}
                            alt={isBn ? slide.titleBn : slide.title}
                            referrerPolicy="no-referrer"
                            onError={e => {
                              e.currentTarget.src = heroEducatorImg;
                            }}
                            onClick={() => {
                              if (!showOverlay) handleSlideCtaAction(slide.buttonLink);
                            }}
                            className={`absolute inset-0 w-full h-full object-cover object-center ${
                              !showOverlay ? 'cursor-pointer' : ''
                            }`}
                          />

                          {showOverlay ? (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-r from-[#021D2E]/95 via-[#032D42]/80 to-[#032D42]/25" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#021D2E]/85 via-transparent to-transparent sm:hidden" />

                              <div className="relative z-10 w-full px-6 sm:px-12 py-10 sm:py-12 max-w-2xl space-y-4">
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-sky-300 backdrop-blur-xs">
                                  {isBn ? (slide.badgeBn || slide.badge) : slide.badge}
                                </span>

                                <h1
                                  className="font-extrabold tracking-tight text-white leading-[1.12] text-balance"
                                  style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3rem)' }}
                                >
                                  {isBn ? (slide.titleBn || slide.title) : slide.title}
                                  {(slide.highlightBn || slide.highlight) && (
                                    <span className="block text-[#FACC15] mt-1">
                                      {isBn ? (slide.highlightBn || slide.highlight) : slide.highlight}
                                    </span>
                                  )}
                                </h1>

                                <p className="text-sm sm:text-base text-slate-200 max-w-xl leading-relaxed">
                                  {isBn ? (slide.subtitleBn || slide.subtitle) : slide.subtitle}
                                </p>

                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSlideCtaAction(slide.buttonLink)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
                                  >
                                    <span>{isBn ? (slide.buttonTextBn || slide.buttonText) : slide.buttonText}</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={onOpenVideoPreview}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer backdrop-blur-xs"
                                  >
                                    <Play className="w-4 h-4 fill-white" />
                                    <span>{isBn ? 'ফ্রি গাইডলাইন ভিডিও' : 'Watch Demo Class'}</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="relative z-10 w-full h-full min-h-[380px] sm:min-h-[430px] flex items-end justify-end p-6 sm:p-8 pointer-events-none">
                              <button
                                type="button"
                                onClick={() => handleSlideCtaAction(slide.buttonLink)}
                                className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-sm transition-colors shadow-xl cursor-pointer"
                              >
                                <span>{isBn ? (slide.buttonTextBn || slide.buttonText) : slide.buttonText}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {slidesToRender.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goToPrevSlide}
                        aria-label="Previous slide"
                        className="absolute left-4 bottom-4 z-20 w-9 h-9 rounded-full bg-slate-950/65 hover:bg-[#0284C7] text-white border border-white/20 flex items-center justify-center transition-colors backdrop-blur-xs cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={goToNextSlide}
                        aria-label="Next slide"
                        className="absolute right-4 bottom-4 z-20 w-9 h-9 rounded-full bg-slate-950/65 hover:bg-[#0284C7] text-white border border-white/20 flex items-center justify-center transition-colors backdrop-blur-xs cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                        {slidesToRender.map((s, idx) => (
                          <button
                            key={s.id || idx}
                            type="button"
                            onClick={() => setCurrentSlideIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                              idx === safeSlideIndex
                                ? 'w-5 bg-white'
                                : 'w-1.5 bg-white/40 hover:bg-white/75'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {slidesToRender.length > 1 && (
                  <button
                    type="button"
                    onClick={goToNextSlide}
                    aria-label="Next slide preview"
                    className="hidden lg:block w-[11%] h-[340px] rounded-2xl overflow-hidden border border-white/15 opacity-35 hover:opacity-60 transition-opacity shrink-0 relative cursor-pointer bg-[#021C2B]"
                  >
                    <img
                      src={!isBrokenExternalUrl(slidesToRender[nextSlideIndex].imageUrl) ? slidesToRender[nextSlideIndex].imageUrl : heroEducatorImg}
                      alt="Next slide"
                      referrerPolicy="no-referrer"
                      onError={e => {
                        e.currentTarget.src = heroEducatorImg;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#032D42]/45" />
                  </button>
                )}
              </div>
            )}

            {/* DUAL BENTO CARDS (Admin-Controlled Ongoing Box + 4 Stats) */}
            {sections.showStats && (
              <div className="max-w-[1060px] mx-auto mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                  className="border border-[#14B8A6]/20 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${theme.bentoLeftBgTop} 0%, ${theme.bentoLeftBgBottom} 100%)` }}
                >
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-[#A7F3D0]">
                      {isBn ? bentoOngoing.badgeBn : bentoOngoing.badgeEn}
                    </span>
                    <h2 className="text-xl sm:text-2xl text-white tracking-tight" style={{ fontWeight: theme.headingWeight }}>
                      {isBn ? bentoOngoing.titleBn : bentoOngoing.titleEn}
                    </h2>
                    <p className="text-sm font-medium text-[#2DD4BF]">
                      {isBn ? bentoOngoing.subtitleBn : bentoOngoing.subtitleEn}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => selectPathCategory(bentoOngoing.track1Cat || 'IELTS')}
                      className="w-full text-left bg-[#0B2A35]/85 hover:bg-[#103643] border border-white/[0.08] rounded-xl p-3.5 flex items-center gap-3.5 transition-colors cursor-pointer"
                    >
                      <div
                        className="w-10 h-10 rounded-lg text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: theme.accentEmeraldColor }}
                      >
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {isBn ? bentoOngoing.track1TitleBn : bentoOngoing.track1TitleEn}
                        </div>
                        <div className="text-xs text-slate-300 truncate">
                          {isBn ? bentoOngoing.track1DescBn : bentoOngoing.track1DescEn}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => selectPathCategory(bentoOngoing.track2Cat || 'Spoken')}
                      className="w-full text-left bg-[#0B2A35]/85 hover:bg-[#103643] border border-white/[0.08] rounded-xl p-3.5 flex items-center gap-3.5 transition-colors cursor-pointer"
                    >
                      <div
                        className="w-10 h-10 rounded-lg text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: theme.accentEmeraldColor }}
                      >
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {isBn ? bentoOngoing.track2TitleBn : bentoOngoing.track2TitleEn}
                        </div>
                        <div className="text-xs text-slate-300 truncate">
                          {isBn ? bentoOngoing.track2DescBn : bentoOngoing.track2DescEn}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => selectPathCategory('all')}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2DD4BF] hover:text-[#5EEAD4] transition-colors cursor-pointer"
                    >
                      <span>{isBn ? 'সকল কোর্স দেখুন' : 'See All Courses'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="border border-[#38BDF8]/20 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${theme.bentoRightBgTop} 0%, ${theme.bentoRightBgBottom} 100%)` }}
                >
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-[#BAE6FD]">
                      {isBn ? 'অনলাইন কোর্স' : 'Online Course'}
                    </span>
                    <h2 className="text-xl sm:text-2xl text-white tracking-tight" style={{ fontWeight: theme.headingWeight }}>
                      {isBn ? 'আমাদের সাফল্যের পরিসংখ্যান!' : 'See the stats!'}
                    </h2>
                    <p className="text-sm font-medium" style={{ color: theme.accentCyanColor }}>
                      {isBn ? 'শিক্ষার্থীদের আস্থার প্রতিফলন!' : 'The trust we are building!'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {heroStats.slice(0, 4).map((stat, idx) => {
                      const StatIcon = statIcons[idx % statIcons.length];
                      return (
                        <div
                          key={idx}
                          className="bg-[#0C2B47]/85 border border-white/[0.08] rounded-xl p-3.5 flex items-center gap-3"
                        >
                          <div
                            className="w-10 h-10 rounded-lg text-white flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: theme.accentCyanColor }}
                          >
                            <StatIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-white leading-tight truncate">
                              {stat.value}
                            </div>
                            <div className="text-[11px] text-slate-300 truncate mt-0.5">
                              {isBn ? stat.labelBn : stat.labelEn}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => selectPathCategory('all')}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold hover:opacity-85 transition-opacity cursor-pointer"
                      style={{ color: theme.accentCyanColor }}
                    >
                      <span>{isBn ? 'সকল কোর্স দেখুন' : 'See All Courses'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. SOFT LAVENDER-TO-ICE-BLUE DIAGONAL SURFACE */}
      <div style={{ background: lightCanvasBg }}>
        {/* CHOOSE YOUR LEARNING PATH (Admin-Controlled) */}
        {sections.showLearningPaths && learningPaths.length > 0 && (
          <section className="py-16 px-4 sm:px-6">
            <div className="max-w-[1160px] mx-auto space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-2.5">
                <h2
                  className={`${headingScaleClass} tracking-tight`}
                  style={{ color: theme.learningPathTitleColor, fontWeight: theme.headingWeight }}
                >
                  {isBn ? pathsSection.titleBn : pathsSection.titleEn}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {isBn ? pathsSection.subtitleBn : pathsSection.subtitleEn}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {learningPaths.map((path, idx) => {
                  const style = PATH_THEME_STYLES[path.theme] || PATH_THEME_STYLES.blue;
                  const PathIcon = style.Icon;
                  return (
                    <button
                      key={path.id || idx}
                      type="button"
                      onClick={() => selectPathCategory(path.targetCat)}
                      className={`text-left p-6 rounded-2xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between space-y-5 cursor-pointer ${style.cardBg}`}
                    >
                      <div className="space-y-4">
                        <div className={`w-11 h-11 rounded-xl ${style.iconBg} text-white flex items-center justify-center shadow-xs`}>
                          <PathIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className={`text-base font-extrabold ${style.titleColor}`}>
                            {isBn ? path.titleBn : path.titleEn}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {isBn ? path.descBn : path.descEn}
                          </p>
                        </div>
                      </div>
                      <div className={`flex justify-end items-center gap-1 text-xs font-bold ${style.linkColor}`}>
                        <span>{isBn ? 'এক্সপ্লোর করুন' : 'Explore'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ALL COURSES SECTION */}
        {sections.showCourses && (
          <section id="featured-courses-section" className="py-12 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto space-y-9">
              <div className="text-center space-y-5">
                <div className="inline-flex items-center justify-center gap-3">
                  <span
                    className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md"
                    style={{ backgroundColor: theme.secondaryColor }}
                  >
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <h2 className="text-2xl sm:text-3xl text-[#24306E] tracking-tight" style={{ fontWeight: theme.headingWeight }}>
                    {isBn ? coursesSection.titleBn : coursesSection.titleEn}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white border border-slate-200/80 text-slate-700 hover:border-blue-300 shadow-2xs'
                    }`}
                    style={
                      selectedCategory === 'all'
                        ? { background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }
                        : { backgroundColor: theme.cardBg }
                    }
                  >
                    <span>{isBn ? 'সকল কোর্স' : 'All Courses'}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                        selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {displayCourses.length}
                    </span>
                  </button>

                  {categories.map(cat => {
                    const active = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                    const catCount = countForCategory(cat.name);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? 'text-white shadow-md'
                            : 'bg-white border border-slate-200/80 text-slate-700 hover:border-blue-300 shadow-2xs'
                        }`}
                        style={
                          active
                            ? { background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }
                            : { backgroundColor: theme.cardBg }
                        }
                      >
                        <span>{isBn ? cat.nameBn : cat.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-[#0284C7] mx-auto" />
                  <p className="text-sm text-slate-600">
                    {isBn ? 'এই ক্যাটাগরিতে বর্তমানে কোনো কোর্স পাওয়া যায়নি।' : 'No active courses found in this category yet.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg cursor-pointer"
                  >
                    {isBn ? 'সকল কোর্স দেখুন' : 'Show All Courses'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map(course => {
                    const saveAmount = Math.max(0, (course.originalPrice || 0) - (course.price || 0));
                    const thumbSrc = !isBrokenExternalUrl(course.thumbnail)
                      ? course.thumbnail
                      : getFallbackCourseImage(course.category);

                    return (
                      <article
                        key={course.id}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg overflow-hidden flex flex-col justify-between transition-all duration-150"
                      >
                        <div>
                          <div className="relative aspect-[16/10] bg-[#032D42] overflow-hidden">
                            <img
                              src={thumbSrc}
                              alt={isBn ? course.titleBn : course.title}
                              referrerPolicy="no-referrer"
                              onError={e => {
                                e.currentTarget.src = getFallbackCourseImage(course.category);
                              }}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#4F46E5] text-white text-[11px] font-bold shadow-sm">
                              {course.category}
                            </span>
                          </div>

                          <div className="p-5 space-y-3.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="px-2.5 py-0.5 rounded bg-[#EEF2FF] text-[#4338CA] font-semibold font-mono tabular-nums">
                                {course.totalLessons} {isBn ? 'টি লেসন' : 'Lessons'} · {course.durationWeeks}w
                              </span>
                              <span className="font-mono tabular-nums text-amber-500 font-semibold">
                                ★ {course.rating}
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                              {isBn ? course.titleBn : course.title}
                            </h3>

                            <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 space-y-2">
                              <div className="text-[11px] font-bold text-slate-600 text-center">
                                {isBn ? 'কোর্স মডিউলসমূহ:' : 'Modules Included:'}
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {course.syllabus.slice(0, 3).map((week, wIdx) => (
                                  <div
                                    key={wIdx}
                                    className="bg-[#F0F7FF] border border-[#DBEAFE] rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#2563EB] text-center truncate"
                                  >
                                    {week.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-2 space-y-3">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-extrabold font-mono tabular-nums text-[#4338CA]">
                                ৳{course.price.toLocaleString()}
                              </span>
                              {course.originalPrice > course.price && (
                                <span className="text-xs font-mono tabular-nums text-slate-400 line-through">
                                  ৳{course.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {saveAmount > 0 && (
                              <span className="text-xs font-bold text-[#16A34A] font-mono tabular-nums">
                                {isBn ? `সাশ্রয় ৳${saveAmount.toLocaleString()}` : `Save ৳${saveAmount.toLocaleString()}`}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setPreviewCourseModal(course)}
                              className="px-3 py-2 rounded-lg border border-slate-200 hover:border-[#0284C7] text-slate-700 hover:text-[#0284C7] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                            >
                              {isBn ? 'সিলেবাস দেখুন' : 'View Syllabus'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenAdmission(course)}
                              className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shadow-xs"
                            >
                              {isBn ? 'ভর্তি হোন' : 'Enroll Now'}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setActiveView('courses')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 bg-white hover:border-[#2563EB] text-slate-800 hover:text-[#2563EB] font-semibold text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{isBn ? 'সকল কোর্স ও বিস্তারিত দেখুন' : 'View Complete Course Directory'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* COMBO BUNDLE PROMOTION BAND */}
        {sections.showCombo && comboOffer.enabled && (
          <section className="py-10 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto bg-gradient-to-r from-[#032D42] via-[#043454] to-[#053A68] text-white rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-sky-400/20 shadow-xl">
              <div className="lg:col-span-8 space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBn ? comboOffer.eyebrowBn : comboOffer.eyebrowEn}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
                  {isBn ? comboOffer.titleBn : comboOffer.titleEn}
                </h2>
                <p className="text-sm text-slate-200 max-w-2xl leading-relaxed">
                  {isBn ? comboOffer.descBn : comboOffer.descEn}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-sky-200">
                  {(isBn ? comboOffer.bulletsBn : comboOffer.bulletsEn).map((bullet: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{bullet}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 lg:text-right space-y-3 border-t lg:border-t-0 lg:border-l border-white/15 pt-6 lg:pt-0 lg:pl-8">
                <div className="text-xs text-sky-200">{isBn ? 'বিশেষ কম্বো ফি' : 'Combo Bundle Tuition'}</div>
                <div className="flex lg:justify-end items-baseline gap-2.5">
                  <span className="text-3xl font-extrabold font-mono tabular-nums text-white">
                    ৳{(comboOffer.price || 9500).toLocaleString()}
                  </span>
                  {comboOffer.originalPrice > comboOffer.price && (
                    <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                      ৳{comboOffer.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAdmission(linkedComboCourse)}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg"
                >
                  <span>{isBn ? comboOffer.ctaBn : comboOffer.ctaEn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* OUR EXPERT INSTRUCTORS SECTION (Admin-Controlled) */}
        {sections.showInstructors && instructors.length > 0 && (
          <section id="instructors-section" className="py-16 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-2.5">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0284C7] tracking-tight">
                  {isBn ? instructorsSection.titleBn : instructorsSection.titleEn}
                </h2>
                <p className="text-sm text-slate-600">
                  {isBn ? instructorsSection.subtitleBn : instructorsSection.subtitleEn}
                </p>
                <div className="pt-2">
                  <div className="text-sm font-bold text-[#0284C7]">
                    {isBn ? instructorsSection.panelLabelBn : instructorsSection.panelLabelEn}
                  </div>
                  <div className="w-10 h-0.5 bg-[#0284C7] mx-auto mt-1.5 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {instructors.map(inst => (
                  <article
                    key={inst.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md overflow-hidden text-center flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="bg-[#1284C8] h-20" />
                      <div className="px-5 pb-5">
                        <img
                          src={!isBrokenExternalUrl(inst.avatar) ? inst.avatar : heroEducatorImg}
                          alt={isBn ? (inst.nameBn || inst.name) : inst.name}
                          referrerPolicy="no-referrer"
                          onError={e => {
                            e.currentTarget.src = heroEducatorImg;
                          }}
                          className="w-24 h-24 rounded-full border-4 border-white ring-2 ring-[#1284C8] shadow-md -mt-12 mx-auto object-cover bg-slate-100"
                        />
                        <h3 className="text-base font-extrabold text-slate-900 mt-3">
                          {isBn ? (inst.nameBn || inst.name) : inst.name}
                        </h3>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0284C7] text-[11px] font-semibold mt-2">
                          <BookOpen className="w-3 h-3" />
                          <span>{isBn ? (inst.subjectBn || inst.subject) : inst.subject}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-3">
                          {isBn ? (inst.roleBn || inst.role) : inst.role}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {isBn ? (inst.credentialsBn || inst.credentials) : inst.credentials}
                        </p>
                      </div>
                    </div>

                    <div className="pb-5 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={onOpenVideoPreview}
                        aria-label={`Watch demo lecture by ${inst.name}`}
                        className="w-9 h-9 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                        title={isBn ? 'ডেমো ক্লাস দেখুন' : 'Watch Demo Lecture'}
                      >
                        <Play className="w-4 h-4 fill-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAdmission()}
                        aria-label={`Enroll with ${inst.name}`}
                        className="w-9 h-9 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                        title={isBn ? 'ব্যাচে ভর্তি হোন' : 'Enroll in Batch'}
                      >
                        <GraduationCap className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* WHY ALOM'S METHOD */}
        {sections.showWhyUs && whyUsSection.pillars.length > 0 && (
          <section className="py-12 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="text-xs sm:text-sm font-bold text-[#0284C7]">
                  {isBn ? whyUsSection.eyebrowBn : whyUsSection.eyebrowEn}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
                  {isBn ? whyUsSection.titleBn : whyUsSection.titleEn}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {whyUsSection.pillars.map((pillar: Record<string, any>, idx: number) => (
                  <div
                    key={pillar.num || idx}
                    className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5"
                  >
                    <div className="text-sm font-mono font-extrabold text-[#2563EB]">{pillar.num}</div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {isBn ? pillar.titleBn : pillar.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {isBn ? pillar.descBn : pillar.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DIGITAL STUDY PORTAL ECOSYSTEM */}
        {sections.showAppBanner && (
          <section className="py-10 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto bg-gradient-to-br from-[#032D42] to-[#042136] text-white rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch border border-sky-400/20 shadow-xl">
              <div className="lg:col-span-6">
                <div className="h-full min-h-[260px] rounded-xl overflow-hidden border border-white/15 bg-[#021C2B]">
                  <img
                    src={!isBrokenExternalUrl(appBannerSection.imageUrl) ? appBannerSection.imageUrl : appMockupImg}
                    alt={isBn ? 'মোবাইল ও ওয়েব লার্নিং পোর্টাল' : 'Web and Mobile Study Portal'}
                    referrerPolicy="no-referrer"
                    onError={e => {
                      e.currentTarget.src = appMockupImg;
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-sky-300">
                  <Smartphone className="w-4 h-4" />
                  <span>{isBn ? appBannerSection.eyebrowBn : appBannerSection.eyebrowEn}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                  {isBn ? appBannerSection.titleBn : appBannerSection.titleEn}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {isBn ? appBannerSection.descBn : appBannerSection.descEn}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-200 pt-1">
                  <div className="p-3.5 rounded-xl bg-white/[0.05] border border-white/10">
                    <div className="font-semibold text-white">
                      {isBn ? appBannerSection.feature1TitleBn : appBannerSection.feature1TitleEn}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {isBn ? appBannerSection.feature1DescBn : appBannerSection.feature1DescEn}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.05] border border-white/10">
                    <div className="font-semibold text-white">
                      {isBn ? appBannerSection.feature2TitleBn : appBannerSection.feature2TitleEn}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {isBn ? appBannerSection.feature2DescBn : appBannerSection.feature2DescEn}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveView(isAuthenticated ? 'dashboard' : 'login')}
                    className="px-6 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    {isBn ? appBannerSection.primaryCtaBn : appBannerSection.primaryCtaEn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('exams')}
                    className="px-6 py-2.5 rounded-lg border border-white/25 hover:border-white/50 text-white font-medium text-sm transition-colors cursor-pointer"
                  >
                    {isBn ? appBannerSection.secondaryCtaBn : appBannerSection.secondaryCtaEn}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ALL E-BOOKS & STUDY GUIDES (Admin-Controlled) */}
        {sections.showEbooks && ebooks.length > 0 && (
          <section id="ebooks-section" className="py-14 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto space-y-8">
              <div className="text-center space-y-5">
                <div className="inline-flex items-center justify-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white flex items-center justify-center shadow-md">
                    <BookMarked className="w-5 h-5" />
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A] tracking-tight">
                    {isBn ? ebooksSection.titleBn : ebooksSection.titleEn}
                  </h2>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                  {(['all', 'free', 'premium'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEbookFilter(tab)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        ebookFilter === tab
                          ? 'bg-[#0284C7] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'all'
                        ? (isBn ? `সকল (${ebooks.length})` : `All (${ebooks.length})`)
                        : tab === 'free'
                        ? (isBn ? `ফ্রি (${freeEbookCount})` : `Free (${freeEbookCount})`)
                        : (isBn ? `প্রিমিয়াম (${premiumEbookCount})` : `Premium (${premiumEbookCount})`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredEbooks.map(eb => (
                  <article
                    key={eb.id}
                    onClick={() => {
                      setSelectedEbookId(eb.id);
                      setActiveView('ebooks');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md overflow-hidden flex flex-col justify-between transition-all cursor-pointer group"
                  >
                    <div>
                      <div className={`relative h-44 ${eb.coverImageUrl ? '' : `bg-gradient-to-br ${EBOOK_GRADIENTS[eb.colorTheme] || EBOOK_GRADIENTS.sky} p-5`} flex flex-col justify-between text-white overflow-hidden`}>
                        {eb.coverImageUrl ? (
                          <img src={eb.coverImageUrl} alt={isBn ? eb.titleBn : eb.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200" />
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                              <span
                                className={`px-2.5 py-0.5 rounded-full ${
                                  eb.isFree ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
                                }`}
                              >
                                {eb.isFree ? 'FREE' : 'PREMIUM'}
                              </span>
                              <span className="font-mono text-white/85">{eb.pages} Pages</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-sky-200">{eb.category}</div>
                              <h3 className="text-sm font-extrabold leading-snug line-clamp-2">
                                {isBn ? eb.titleBn : eb.title}
                              </h3>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        {eb.coverImageUrl && (
                          <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                            {isBn ? eb.titleBn : eb.title}
                          </h3>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {isBn ? eb.summaryBn : eb.summary}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {eb.isFree ? (
                          <span className="text-sm font-extrabold text-[#16A34A]">
                            {isBn ? 'সম্পূর্ণ ফ্রি' : 'Free'}
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold font-mono text-[#0284C7]">৳{eb.price}</span>
                            {eb.originalPrice && (
                              <span className="text-[11px] text-slate-400 line-through font-mono">৳{eb.originalPrice}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedEbookId(eb.id);
                          setActiveView('ebooks');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0284C7] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>{eb.isFree ? (isBn ? 'পড়ুন' : 'Get Free') : (isBn ? 'দেখুন' : 'View')}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* RESULT & CERTIFICATE VERIFICATION PORTAL CARD (Admin-Controlled) */}
        {sections.showResultPortal && (
          <section id="result-portal-section" className="py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0284C7] tracking-tight">
                  {isBn ? resultPortal.titleBn : resultPortal.titleEn}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {isBn ? resultPortal.subtitleBn : resultPortal.subtitleEn}
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#F4F9FF] via-white to-[#FBF7FF] rounded-2xl border border-white shadow-lg p-8 sm:p-10 space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mx-auto">
                  <GraduationCap className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {isBn ? resultPortal.cardTitleBn : resultPortal.cardTitleEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {isBn ? resultPortal.cardDescBn : resultPortal.cardDescEn}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-1">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mx-auto">
                      <Search className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">{isBn ? 'দ্রুত অনুসন্ধান' : 'Quick Search'}</div>
                    <div className="text-[11px] text-slate-400">{isBn ? 'রোল বা আইডি দিয়ে' : 'By ID or Roll No'}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mx-auto">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">{isBn ? 'যাচাইকৃত সনদ' : 'Official Records'}</div>
                    <div className="text-[11px] text-slate-400">{isBn ? 'ডিজিটাল রেজিস্ট্রি' : 'Live Registry'}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center mx-auto">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">{isBn ? 'সকল ব্যাচ' : 'All Batches'}</div>
                    <div className="text-[11px] text-slate-400">{isBn ? 'ঢাকা ও অনলাইন' : 'Online & Campus'}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenVerifyModal) onOpenVerifyModal();
                      else setActiveView('exams');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <span>{isBn ? 'সার্টিফিকেট যাচাই করুন' : 'Verify Certificate'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView(isAuthenticated ? 'dashboard' : 'login')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <span>{isBn ? 'স্টুডেন্ট রেজাল্ট পোর্টাল' : 'Student Result Portal'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQ ACCORDION & BRANCH DIRECTORY */}
        {(sections.showFaq || sections.showBranches) && (
          <section className="py-14 px-4 sm:px-6">
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
              {sections.showFaq && (
                <div className={`${sections.showBranches ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6`}>
                  <div className="space-y-1.5">
                    <div className="text-xs sm:text-sm font-bold text-[#0284C7]">
                      {isBn ? 'সাধারণ জিজ্ঞাসা' : 'Frequently Asked Questions'}
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {isBn ? 'ভর্তি ও ক্লাস সংক্রান্ত প্রশ্নের উত্তর' : 'Admissions & Study Guide'}
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                      <div key={faq.id || idx} className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                          className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 hover:text-[#0284C7] transition-colors cursor-pointer"
                        >
                          <span>{isBn ? faq.qBn : faq.q}</span>
                          {activeFaqIndex === idx ? (
                            <ChevronUp className="w-4 h-4 text-[#0284C7] shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {activeFaqIndex === idx && (
                          <div className="px-5 pb-4 pt-2 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {isBn ? faq.aBn : faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sections.showBranches && (
                <div className={`${sections.showFaq ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-6`}>
                  <div className="space-y-1.5">
                    <div className="text-xs sm:text-sm font-bold text-[#0284C7]">
                      {isBn ? 'ক্যাম্পাস ও যোগাযোগ' : 'Offline Campuses'}
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {isBn ? 'আমাদের শাখাসমূহ' : 'Visit Our Study Centers'}
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {activeBranches.slice(0, 3).map(br => (
                      <div key={br.id} className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                            <MapPin className="w-4 h-4 text-[#0284C7] shrink-0" />
                            <span>{isBn ? br.nameBn : br.name}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">{br.code}</span>
                        </div>
                        <p className="text-xs text-slate-600">{br.address}</p>
                        <div className="pt-1 flex items-center justify-between text-xs">
                          <a
                            href={`tel:${br.phone.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold text-slate-800 hover:text-[#0284C7]"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>{br.phone}</span>
                          </a>
                          <span className="text-slate-500">{br.managerName}</span>
                        </div>
                      </div>
                    ))}

                    <div className="bg-[#032D42] text-white rounded-xl p-5 flex items-center justify-between gap-4 shadow-md">
                      <div>
                        <div className="text-xs text-sky-300">{isBn ? 'হোয়াটসঅ্যাপ ও ফোন সাপোর্ট' : 'Need Help Choosing a Batch?'}</div>
                        <div className="text-sm font-bold mt-0.5">{isBn ? 'সরাসরি কাউন্সেলিং নিন' : 'Chat with Admission Desk'}</div>
                      </div>
                      <a
                        href={`https://wa.me/${(websiteSettings.whatsappNumber || '+8801712345678').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* 3. DEEP NAVY SLATE DUAL-ROW AUTO-SCROLLING REVIEWS CAROUSEL */}
      {sections.showReviews && testimonials.length > 0 && (() => {
        const baseList = testimonials.length >= 4
          ? testimonials
          : [...testimonials, ...testimonials, ...testimonials];
        const splitIdx = Math.ceil(baseList.length / 2);
        const row1 = baseList.slice(0, splitIdx).length >= 3 ? baseList.slice(0, splitIdx) : baseList;
        const row2Source = baseList.slice(splitIdx).length >= 3 ? baseList.slice(splitIdx) : [...baseList].reverse();
        const row2 = row2Source.length >= 4 ? row2Source : [...row2Source, ...row1].slice(0, 6);

        const renderReviewCard = (item: typeof testimonials[number], keySuffix: string) => (
          <article
            key={`${item.id}-${keySuffix}`}
            className="w-[330px] sm:w-[365px] shrink-0 border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg"
            style={{ backgroundColor: theme.reviewsCardBg }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${item.rating} out of 5 stars`}>
                  {[...Array(item.rating)].map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <Quote className="w-5 h-5 text-slate-600/80" />
              </div>
              <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed italic line-clamp-4">
                {isBn ? (item.quoteBn || item.quote) : item.quote}
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.07] flex items-center gap-3">
              {!isBrokenExternalUrl(item.avatar) ? (
                <img
                  src={item.avatar}
                  alt={item.studentName}
                  referrerPolicy="no-referrer"
                  onError={e => {
                    e.currentTarget.src = heroEducatorImg;
                  }}
                  className="w-9 h-9 rounded-full object-cover border border-white/15 bg-slate-800 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {item.studentName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{item.studentName}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {isBn ? 'যাচাইকৃত শিক্ষার্থী' : 'Verified Student'}
                </div>
              </div>
            </div>
          </article>
        );

        return (
          <section
            className="py-16 sm:py-20 text-white overflow-hidden"
            style={{ background: `linear-gradient(180deg, ${theme.reviewsBgTop} 0%, ${theme.reviewsBgBottom} 100%)` }}
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mb-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="text-xs font-semibold tracking-wide" style={{ color: theme.accentCyanColor }}>
                  {isBn ? 'শিক্ষার্থীদের মতামত' : 'Student Reviews'}
                </div>
                <h2 className={`${headingScaleClass} text-white tracking-tight`} style={{ fontWeight: theme.headingWeight }}>
                  {isBn ? 'আমাদের শিক্ষার্থীরা যা বলছেন' : 'What Our Students Say'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isBn
                    ? "আমাদের প্লাটফর্মের সাথে ইংরেজি ও IELTS প্রস্তুতির সফল অভিজ্ঞতা শেয়ার করেছেন আমাদের শিক্ষার্থীরা"
                    : "Feedbacks from students who have transformed their learning journey with our guided preparation."}
                </p>

                <div className="pt-2 flex justify-center">
                  <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#162238] border border-white/10 text-xs shadow-sm">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-bold text-white font-mono">5.0</span>
                    <span className="text-slate-400">{isBn ? 'গড় রেটিং' : 'average rating'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="marquee-wrapper relative overflow-hidden space-y-5">
              {/* Edge Fades matched cleanly to reviewsBgTop */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-28 z-10"
                style={{ background: `linear-gradient(90deg, ${theme.reviewsBgTop}, transparent)` }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-28 z-10"
                style={{ background: `linear-gradient(270deg, ${theme.reviewsBgTop}, transparent)` }}
              />

              {/* Row 1: Auto Scroll Left */}
              <div className="animate-marquee-left">
                <div className="flex gap-5 pr-5 shrink-0">
                  {row1.map((item, idx) => renderReviewCard(item, `r1a-${idx}`))}
                </div>
                <div className="flex gap-5 pr-5 shrink-0" aria-hidden="true">
                  {row1.map((item, idx) => renderReviewCard(item, `r1b-${idx}`))}
                </div>
              </div>

              {/* Row 2: Auto Scroll Right */}
              <div className="animate-marquee-right">
                <div className="flex gap-5 pr-5 shrink-0">
                  {row2.map((item, idx) => renderReviewCard(item, `r2a-${idx}`))}
                </div>
                <div className="flex gap-5 pr-5 shrink-0" aria-hidden="true">
                  {row2.map((item, idx) => renderReviewCard(item, `r2b-${idx}`))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* MODALS */}
      {previewCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[#032D42] text-white flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-sky-300 font-semibold">{previewCourseModal.category}</div>
                <h3 className="text-base sm:text-lg font-bold">
                  {isBn ? previewCourseModal.titleBn : previewCourseModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCourseModal(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close course syllabus"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <p className="text-sm text-slate-600 leading-relaxed">
                {isBn ? previewCourseModal.descriptionBn : previewCourseModal.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 border-y border-slate-100 py-3">
                <span>
                  {isBn ? 'মেন্টর:' : 'Mentor:'} <strong className="text-slate-900">{previewCourseModal.instructorName}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{previewCourseModal.durationWeeks} {isBn ? 'সপ্তাহ' : 'Weeks'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{previewCourseModal.totalLessons} {isBn ? 'লেসন' : 'Lessons'}</span>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  {isBn ? 'কোর্স কারিকুলাম ও পাঠ্যক্রম:' : 'Course Syllabus Outline:'}
                </h4>
                {previewCourseModal.syllabus.map((week, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5">
                    <div className="text-xs font-bold text-[#0284C7]">
                      Week {week.week}: {week.title}
                    </div>
                    <div className="text-xs text-slate-600">{week.topics.join(' · ')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">{isBn ? 'কোর্স ফি' : 'Tuition Fee'}</div>
                <div className="text-xl font-extrabold font-mono tabular-nums text-[#4338CA]">
                  ৳{previewCourseModal.price.toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const chosen = previewCourseModal;
                  setPreviewCourseModal(null);
                  onOpenAdmission(chosen);
                }}
                className="px-6 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {isBn ? 'এই ব্যাচে ভর্তি হোন' : 'Enroll in This Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEbookModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className={`p-6 bg-gradient-to-br ${EBOOK_GRADIENTS[selectedEbookModal.colorTheme] || EBOOK_GRADIENTS.sky} text-white flex items-start justify-between gap-4`}>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-sky-200">{selectedEbookModal.category} · {selectedEbookModal.pages} Pages</div>
                <h3 className="text-lg font-extrabold leading-snug">
                  {isBn ? selectedEbookModal.titleBn : selectedEbookModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEbookModal(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close e-book modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isBn ? selectedEbookModal.summaryBn : selectedEbookModal.summary}
              </p>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  {isBn ? 'এই ই-বুকে যা যা থাকছে:' : 'Inside This Guide:'}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {(selectedEbookModal.topics || []).map((tp: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{tp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#0284C7]">
                  {selectedEbookModal.isFree
                    ? (isBn ? 'ফ্রি এক্সেস' : 'Free for Students')
                    : `৳${selectedEbookModal.price}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEbookModal(null);
                    setActiveView(isAuthenticated ? 'dashboard' : 'login');
                  }}
                  className="px-5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
                >
                  {isAuthenticated
                    ? (isBn ? 'পোর্টালে ডাউনলোড করুন' : 'Access in Portal')
                    : (isBn ? 'পড়তে লগইন করুন' : 'Sign In to Download')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
              <span className="font-semibold text-[#0284C7] uppercase">{selectedNoticeModal.category}</span>
              <span className="font-mono tabular-nums text-slate-500">{selectedNoticeModal.date}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {isBn ? (selectedNoticeModal.titleBn || selectedNoticeModal.title) : selectedNoticeModal.title}
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {isBn ? (selectedNoticeModal.contentBn || selectedNoticeModal.content) : selectedNoticeModal.content}
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {isBn ? "অফিশিয়াল নোটিশ · আলম'স ইংলিশ সেন্টার" : "Official Circular · Alom's English Center"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNoticeModal(null)}
                className="px-4 py-2 bg-[#032D42] hover:bg-[#0284C7] text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
