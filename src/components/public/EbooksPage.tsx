import React, { useState, useMemo, useEffect } from 'react';
import { useLms } from '../../context/LmsContext';
import { HomepageEbookItem } from '../../types/lms';
import { apiClient } from '../../services/apiClient';
import {
  Smartphone, ArrowRight, FileText, Clock, Monitor, ShieldCheck,
  Download, CheckCircle2, ChevronRight, Lock, CreditCard, BookOpen
} from 'lucide-react';

const COVER_THEME_STYLES: Record<
  HomepageEbookItem['colorTheme'],
  { gradient: string; accent: string; pillBg: string }
> = {
  sky: {
    gradient: 'from-[#0B5CD5] via-[#0284C7] to-[#032D42]',
    accent: 'text-sky-200',
    pillBg: 'bg-sky-400/20'
  },
  emerald: {
    gradient: 'from-[#065F46] via-[#0D9488] to-[#022C22]',
    accent: 'text-emerald-200',
    pillBg: 'bg-emerald-400/20'
  },
  purple: {
    gradient: 'from-[#8B5CF6] via-[#C026D3] to-[#581C87]',
    accent: 'text-fuchsia-200',
    pillBg: 'bg-fuchsia-400/20'
  },
  indigo: {
    gradient: 'from-[#1E3A8A] via-[#4338CA] to-[#172554]',
    accent: 'text-indigo-200',
    pillBg: 'bg-indigo-400/20'
  }
};

export const EbooksPage: React.FC = () => {
  const {
    language,
    websiteSettings,
    setActiveView,
    selectedEbookId,
    setSelectedEbookId,
    isAuthenticated,
    currentUser
  } = useLms();

  const isBn = language === 'bn';
  const theme = websiteSettings.themeSettings;
  const lightCanvasBg = `linear-gradient(135deg, ${theme?.lightCanvasStart || '#EAE9FF'} 0%, ${theme?.lightCanvasMid || '#F2F3FF'} 45%, ${theme?.lightCanvasEnd || '#E5F4FE'} 100%)`;
  const primaryColor = theme?.primaryColor || '#0284C7';
  const cardBg = theme?.cardBg || '#FFFFFF';

  const ebooksSection = websiteSettings.ebooksSection || {
    titleEn: 'All E-Books',
    titleBn: 'সকল ই-বুক'
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceTypeFilter, setPriceTypeFilter] = useState<'all' | 'free' | 'premium' | 'mine'>('all');
  const [phoneInput, setPhoneInput] = useState(currentUser.phone || '');
  const [trxIdInput, setTrxIdInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [downloadToast, setDownloadToast] = useState('');
  const [unlockedEbookIds, setUnlockedEbookIds] = useState<string[]>([]);
  const [availableEbookFileIds, setAvailableEbookFileIds] = useState<string[]>([]);
  const ebooks = (websiteSettings.ebooks || []).filter(book => book.isActive !== false || unlockedEbookIds.includes(book.id));
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const paymentDestination = paymentMethod === 'bKash' ? websiteSettings.bkashNumber : websiteSettings.nagadNumber;
  const isPaymentDestinationConfigured = Boolean(paymentDestination?.trim()) && !['01712345678', '01812345678'].includes(paymentDestination.replace(/\D/g, ''));

  useEffect(() => {
    if (!isAuthenticated) { setUnlockedEbookIds([]); return; }
    let active = true;
    apiClient.storefront.getMyEbooks().then(result => {
      if (active && result.success && result.data) {
        setUnlockedEbookIds(result.data.ebook_ids || []);
        setAvailableEbookFileIds(result.data.available_file_ids || []);
      }
    }).catch(error => console.error('Could not load verified e-book purchases:', error));
    return () => { active = false; };
  }, [isAuthenticated]);

  const selectedBook = useMemo(
    () => ebooks.find(eb => eb.id === selectedEbookId) || null,
    [ebooks, selectedEbookId]
  );

  // Extract unique categories dynamically from CMS e-books
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    ebooks.forEach(eb => {
      const cat = (eb.category || 'General').trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [ebooks]);

  const categoryFiltered = useMemo(() => {
    if (selectedCategory === 'all') return ebooks;
    return ebooks.filter(eb => (eb.category || 'General').toLowerCase() === selectedCategory.toLowerCase());
  }, [ebooks, selectedCategory]);

  const freeCount = categoryFiltered.filter(e => e.isFree).length;
  const premiumCount = categoryFiltered.filter(e => !e.isFree).length;

  const visibleEbooks = useMemo(() => {
    if (priceTypeFilter === 'free') return categoryFiltered.filter(e => e.isFree);
    if (priceTypeFilter === 'premium') return categoryFiltered.filter(e => !e.isFree);
    if (priceTypeFilter === 'mine') return ebooks.filter(e => unlockedEbookIds.includes(e.id));
    return categoryFiltered;
  }, [categoryFiltered, ebooks, priceTypeFilter, unlockedEbookIds]);

  const calcDiscountPercent = (eb: HomepageEbookItem) => {
    if (eb.isFree || !eb.originalPrice || eb.originalPrice <= eb.price) return 0;
    return Math.round(((eb.originalPrice - eb.price) / eb.originalPrice) * 100);
  };

  const triggerBookDownload = (eb: HomepageEbookItem) => {
    const canPreviewPremium = currentUser.role === 'admin' || currentUser.role === 'super_admin';
    if (!eb.isFree && !unlockedEbookIds.includes(eb.id) && !canPreviewPremium) {
      setDownloadToast(isBn ? 'পেমেন্ট এখনো অ্যাডমিন যাচাই করেননি। যাচাই সম্পন্ন হলে ডাউনলোড চালু হবে।' : 'Payment is still awaiting staff verification. Download will unlock after approval.');
      return;
    }
    if (eb.isFree && eb.pdfUrl && eb.pdfUrl.trim()) {
      const a = document.createElement('a');
      a.href = eb.pdfUrl;
      a.download = `${eb.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (eb.isFree && !isAuthenticated) {
      setDownloadToast(isBn ? 'প্রাইভেট PDF ডাউনলোড করতে আগে সাইন ইন করুন।' : 'Please sign in to download this private PDF.');
      setActiveView('login');
      return;
    } else if (availableEbookFileIds.includes(eb.id)) {
      if (!isAuthenticated) {
        setDownloadToast(isBn ? 'প্রাইভেট PDF ডাউনলোড করতে আগে সাইন ইন করুন।' : 'Please sign in to download this private PDF.');
        setActiveView('login');
        return;
      }
      window.open(apiClient.storefront.getEbookDownloadUrl(eb.id), '_blank', 'noopener,noreferrer');
    } else {
      setDownloadToast(isBn ? 'এই ই-বুকের PDF ফাইল এখনো আপলোড করা হয়নি। অ্যাডমিনের সঙ্গে যোগাযোগ করুন।' : 'The PDF file has not been uploaded for this e-book yet. Please contact the administrator.');
      return;
    }
    setDownloadToast(
      isBn
        ? `"${eb.titleBn || eb.title}" ডাউনলোড শুরু হয়েছে!`
        : `"${eb.title}" download started.`
    );
    setTimeout(() => setDownloadToast(''), 4000);
  };

  const handleSubmitEbookPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBook || selectedBook.isFree || submittingPayment) return;
    if (!isPaymentDestinationConfigured) {
      setDownloadToast(isBn ? 'এই পেমেন্ট নম্বরটি অ্যাডমিন এখনো সেট করেননি। অনুগ্রহ করে পরে চেষ্টা করুন।' : 'The selected payment number has not been configured by the administrator yet.');
      return;
    }
    setSubmittingPayment(true);
    setDownloadToast('');
    try {
      const result = await apiClient.storefront.submitEbookPayment({
        ebook_id: selectedBook.id, payment_method: paymentMethod, trx_id: trxIdInput.trim(), sender_phone: phoneInput.trim(),
      });
      if (!result.success) {
        setDownloadToast(result.error || (isBn ? 'পেমেন্ট অনুরোধ জমা হয়নি। তথ্য যাচাই করুন।' : 'Payment request could not be submitted. Please check the details.'));
        return;
      }
      setTrxIdInput('');
      setShowCheckoutForm(false);
      setDownloadToast(isBn ? 'পেমেন্ট রেফারেন্স জমা হয়েছে। অ্যাডমিন যাচাই করার পর ই-বুক আনলক হবে।' : 'Payment reference submitted. The e-book will unlock after staff verification.');
      const refreshed = await apiClient.storefront.getMyEbooks();
      if (refreshed.success && refreshed.data) {
        setUnlockedEbookIds(refreshed.data.ebook_ids || []);
        setAvailableEbookFileIds(refreshed.data.available_file_ids || []);
      }
    } catch {
      setDownloadToast(isBn ? 'সার্ভারের সঙ্গে যোগাযোগ করা যায়নি। আবার চেষ্টা করুন।' : 'Could not reach the server. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenBookDetail = (eb: HomepageEbookItem) => {
    setSelectedEbookId(eb.id);
    setShowCheckoutForm(false);
    setDownloadToast('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderBookCover = (eb: HomepageEbookItem, variant: 'card' | 'detail') => {
    const style = COVER_THEME_STYLES[eb.colorTheme] || COVER_THEME_STYLES.sky;
    const discountPct = calcDiscountPercent(eb);
    const titleDisplay = isBn ? (eb.titleBn || eb.title) : eb.title;
    const brandName = (websiteSettings.logoText || websiteSettings.siteName || "ALOM'S ENGLISH").toUpperCase();

    if (eb.coverImageUrl) {
      return (
        <div className="relative w-full h-full overflow-hidden">
          <img
            src={eb.coverImageUrl}
            alt={titleDisplay}
            className="w-full h-full object-cover"
          />
          {variant === 'card' && (
            <>
              <span
                className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                  eb.isFree ? 'bg-[#10B981] text-white' : 'bg-[#F59E0B] text-slate-950'
                }`}
              >
                {eb.isFree ? 'FREE' : 'PREMIUM'}
              </span>
              {discountPct > 0 && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold shadow-sm">
                  -{discountPct}%
                </span>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div
        className={`relative w-full h-full bg-gradient-to-br ${style.gradient} p-5 flex flex-col justify-between text-white overflow-hidden select-none`}
      >
        {/* Subtle book spine & highlight overlay */}
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

        {/* Top row badges */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          {variant === 'card' ? (
            <>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-xs ${
                  eb.isFree ? 'bg-[#10B981] text-white' : 'bg-[#F59E0B] text-slate-950'
                }`}
              >
                {eb.isFree ? 'FREE' : 'PREMIUM'}
              </span>
              {discountPct > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold shadow-xs">
                  -{discountPct}%
                </span>
              ) : (
                <span className="text-[10px] font-mono text-white/80 font-semibold">{eb.pages}P</span>
              )}
            </>
          ) : (
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/85">
              {brandName}
            </span>
          )}
        </div>

        {/* Center Book Poster Typography */}
        <div className="relative z-10 my-auto py-3 space-y-2.5 text-center">
          <div className={`inline-block px-3 py-1 rounded-full ${style.pillBg} border border-white/20 text-[10px] font-extrabold uppercase tracking-widest`}>
            {eb.category}
          </div>
          <h3 className={`font-heading font-black leading-tight text-white drop-shadow-xs ${variant === 'detail' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
            {titleDisplay}
          </h3>
          <div className="inline-block px-3 py-0.5 rounded-md bg-white text-slate-900 font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
            {eb.isFree ? '100% Free Edition' : 'ShortNote 2.0 E-Book'}
          </div>
        </div>

        {/* Bottom Poster Strip */}
        <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between text-[10px] text-white/85 font-semibold">
          <span className="truncate">{eb.author || websiteSettings.siteName}</span>
          <span className="font-mono shrink-0">{eb.pages} Pages</span>
        </div>
      </div>
    );
  };

  // ==================== SCREENSHOT 2: SELECTED E-BOOK DETAIL VIEW ====================
  if (selectedBook) {
    const discountPct = calcDiscountPercent(selectedBook);
    const isUnlocked = unlockedEbookIds.includes(selectedBook.id);
    const titleDisplay = isBn ? (selectedBook.titleBn || selectedBook.title) : selectedBook.title;
    const summaryDisplay = isBn ? (selectedBook.summaryBn || selectedBook.summary) : selectedBook.summary;

    return (
      <div className="flex-1 flex flex-col w-full bg-[#F8FAFC]">
        {/* Breadcrumb Strip */}
        <div className="w-full bg-white border-b border-slate-100">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => {
                setSelectedEbookId(null);
                setActiveView('home');
              }}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              {isBn ? 'হোম' : 'Home'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => setSelectedEbookId(null)}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              {isBn ? 'ই-বুক' : 'E-books'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800 truncate">{titleDisplay}</span>
          </div>
        </div>

        {/* Hero Split Showcase Banner */}
        <section
          className="w-full py-10 sm:py-14 px-4 sm:px-6 border-b border-slate-200/70"
          style={{
            background: 'linear-gradient(135deg, #EEF6FF 0%, #FFFFFF 52%, #E5F4FE 100%)'
          }}
        >
          <div className="max-w-[980px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-center">
            {/* Left: Elevated Portrait Book Cover */}
            <div className="md:col-span-5 flex justify-center">
              <div className="w-[260px] sm:w-[295px] aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_28px_60px_-15px_rgba(15,23,42,0.32)] border border-white/80 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                {renderBookCover(selectedBook, 'detail')}
              </div>
            </div>

            {/* Right: Metadata, 4 Info Boxes, Price & Download CTA Card */}
            <div className="md:col-span-7 space-y-5">
              {/* Top Tag Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#E0F2FE] text-[#0284C7] text-[10px] font-extrabold uppercase tracking-wider">
                  {selectedBook.isFree ? (isBn ? 'ফ্রি ই-বুক' : 'FREE E-BOOK') : (isBn ? 'প্রিমিয়াম ই-বুক' : 'PREMIUM E-BOOK')}
                </span>
                {selectedBook.isFree ? (
                  <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold uppercase tracking-wider">
                    FREE
                  </span>
                ) : (
                  discountPct > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-extrabold uppercase tracking-wider">
                      -{discountPct}% OFF
                    </span>
                  )
                )}
              </div>

              {/* Main E-Book Heading */}
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {titleDisplay}
              </h1>

              {/* 4 Mini Attribute Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
                  <FileText className="w-4 h-4 text-[#0284C7]" />
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">FORMAT</div>
                  <div className="text-[11px] font-bold text-slate-800">PDF · Download</div>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
                  <Clock className="w-4 h-4 text-[#0284C7]" />
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">ACCESS</div>
                  <div className="text-[11px] font-bold text-slate-800">Lifetime</div>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
                  <Monitor className="w-4 h-4 text-[#0284C7]" />
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">READ</div>
                  <div className="text-[11px] font-bold text-slate-800">Any device</div>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">SECURE</div>
                  <div className="text-[11px] font-bold text-slate-800">Protected PDF</div>
                </div>
              </div>

              {/* Elevated White Price & Action Card */}
              <div
                className="rounded-2xl border border-slate-200/90 shadow-lg p-5 space-y-4"
                style={{ backgroundColor: cardBg }}
              >
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isBn ? 'মূল্য' : 'PRICE'}
                  </div>
                  {selectedBook.isFree ? (
                    <div className="text-3xl font-extrabold text-[#0077CC] tracking-tight">
                      {isBn ? 'সম্পূর্ণ ফ্রি' : 'Free'}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl font-extrabold font-mono text-[#0077CC] tracking-tight">
                        ৳{selectedBook.price}
                      </span>
                      {selectedBook.originalPrice && selectedBook.originalPrice > selectedBook.price && (
                        <span className="text-sm font-mono text-slate-400 line-through">
                          ৳{selectedBook.originalPrice}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {downloadToast && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{downloadToast}</span>
                  </div>
                )}

                {/* Action Button / Inline Quick Purchase */}
                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setActiveView('login')}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#0077CC] hover:bg-[#0060A8] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isBn ? 'ডাউনলোড করতে সাইন ইন করুন' : 'Sign in to download'}</span>
                  </button>
                ) : selectedBook.isFree || isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => triggerBookDownload(selectedBook)}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#0077CC] hover:bg-[#0060A8] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isUnlocked
                        ? (isBn ? 'পুনরায় PDF ডাউনলোড করুন' : 'Download PDF Again')
                        : (isBn ? 'এখনই ফ্রি ডাউনলোড করুন' : 'Download PDF Now')}
                    </span>
                  </button>
                ) : !showCheckoutForm ? (
                  <button
                    type="button"
                    onClick={() => setShowCheckoutForm(true)}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#0077CC] hover:bg-[#0060A8] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isBn ? `৳${selectedBook.price} দিয়ে ই-বুক আনলক করুন` : `Unlock & Download for ৳${selectedBook.price}`}</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleSubmitEbookPayment}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                  >
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#0077CC]" />
                      <span>{isBn ? 'bKash / Nagad পেমেন্ট রেফারেন্স জমা' : 'Submit bKash / Nagad Payment Reference'}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                      bKash: <strong className="font-mono text-pink-600">{websiteSettings.bkashNumber?.trim() || 'Not configured'}</strong> · Nagad: <strong className="font-mono text-orange-600">{websiteSettings.nagadNumber?.trim() || 'Not configured'}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value as 'bKash' | 'Nagad')}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                      >
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="01XXXXXXXXX"
                        value={phoneInput}
                        onChange={e => setPhoneInput(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Transaction ID (TrxID)"
                      value={trxIdInput}
                      onChange={e => setTrxIdInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono uppercase"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCheckoutForm(false)}
                        className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingPayment || !isPaymentDestinationConfigured}
                        className="flex-1 py-2 rounded-lg bg-[#0077CC] hover:bg-[#0060A8] text-white font-bold cursor-pointer"
                      >
                        {submittingPayment ? (isBn ? 'জমা হচ্ছে...' : 'Submitting...') : (isBn ? 'যাচাইয়ের জন্য জমা দিন' : 'Submit for Verification')}
                      </button>
                    </div>
                  </form>
                )}

                <p className="text-center text-[11px] text-slate-400">
                  {selectedBook.isFree
                    ? (isBn
                        ? 'সম্পূর্ণ ফ্রি — একবার সাইন ইন করে সাথে সাথেই ডাউনলোড করুন'
                        : 'Free — one-time verification, then instant download')
                    : (isBn
                        ? `${selectedBook.pages} পৃষ্ঠা · পেমেন্ট ভেরিফিকেশনের পর আজীবন অ্যাক্সেস`
                        : `${selectedBook.pages} Pages · Instant protected PDF access after verification`)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Clean Card: About this ebook */}
        <section className="flex-1 py-10 px-4 sm:px-6">
          <div className="max-w-[980px] mx-auto">
            <div
              className="rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5"
              style={{ backgroundColor: cardBg }}
            >
              <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-900 border-l-4 border-[#0077CC] pl-3">
                {isBn ? 'এই ই-বুক সম্পর্কে (About this ebook)' : 'About this ebook'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {summaryDisplay}
              </p>

              {selectedBook.topics && selectedBook.topics.length > 0 && (
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 pt-1">
                  {selectedBook.topics.map((topic, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold">-</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==================== SCREENSHOT 1: ALL E-BOOKS DIRECTORY ====================
  return (
    <main
      className="flex-1 py-10 sm:py-14 px-4 sm:px-6 w-full"
      style={{ background: lightCanvasBg }}
    >
      <div className="max-w-[1200px] mx-auto space-y-7">
        {/* Centered Header */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tracking-tight">
              {isBn ? ebooksSection.titleBn : ebooksSection.titleEn}
            </h1>
          </div>

          {/* Primary Category Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                if (priceTypeFilter === 'mine') setPriceTypeFilter('all');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                selectedCategory === 'all' && priceTypeFilter !== 'mine'
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              <span>{isBn ? 'সকল ই-বুক' : 'All E-Books'}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  selectedCategory === 'all' && priceTypeFilter !== 'mine'
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {ebooks.length}
              </span>
            </button>

            {categoryStats.map(cat => {
              const active = selectedCategory.toLowerCase() === cat.name.toLowerCase() && priceTypeFilter !== 'mine';
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    if (priceTypeFilter === 'mine') setPriceTypeFilter('all');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-md font-bold'
                      : 'bg-white text-slate-600 border border-slate-200/90 hover:border-blue-300 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Filter Strip: All | Free | Premium + My E-Books */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-1 bg-white/95 border border-slate-200/90 rounded-full p-1 shadow-2xs">
              {(
                [
                  { id: 'all', labelEn: 'All', labelBn: 'সকল', count: categoryFiltered.length },
                  { id: 'free', labelEn: 'Free', labelBn: 'ফ্রি', count: freeCount },
                  { id: 'premium', labelEn: 'Premium', labelBn: 'প্রিমিয়াম', count: premiumCount }
                ] as const
              ).map(tab => {
                const isTabActive = priceTypeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPriceTypeFilter(tab.id)}
                    className={`px-3.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isTabActive
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={isTabActive ? { backgroundColor: primaryColor } : undefined}
                  >
                    <span>{isBn ? tab.labelBn : tab.labelEn}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 rounded-full ${
                        isTabActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPriceTypeFilter(prev => (prev === 'mine' ? 'all' : 'mine'))}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                priceTypeFilter === 'mine'
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-700 border-sky-300 hover:border-sky-500'
              }`}
              style={priceTypeFilter === 'mine' ? { backgroundColor: primaryColor } : undefined}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {isBn ? `আমার ই-বুক (${unlockedEbookIds.length})` : `My E-Books${unlockedEbookIds.length > 0 ? ` (${unlockedEbookIds.length})` : ''}`}
              </span>
            </button>
          </div>
        </div>

        {/* 4-Column Portrait E-Book Cards Grid */}
        {visibleEbooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs max-w-lg mx-auto">
            <BookOpen className="w-8 h-8 text-[#0284C7] mx-auto" />
            <h3 className="font-bold text-sm text-slate-900">
              {priceTypeFilter === 'mine'
                ? (isBn ? 'আপনি এখনো কোনো ই-বুক আনলক করেননি' : 'No unlocked e-books in My E-Books yet')
                : (isBn ? 'এই ক্যাটাগরিতে কোনো ই-বুক পাওয়া যায়নি' : 'No e-books matched this filter')}
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setPriceTypeFilter('all');
              }}
              className="px-4 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
            >
              {isBn ? 'সকল ই-বুক দেখুন' : 'Browse All E-Books'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
            {visibleEbooks.map(eb => (
              <article
                key={eb.id}
                onClick={() => handleOpenBookDetail(eb)}
                className="rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between p-2.5 cursor-pointer group"
                style={{ backgroundColor: cardBg }}
              >
                {/* Tall Portrait Cover Artwork */}
                <div>
                  <div className="relative h-[300px] sm:h-[320px] rounded-xl overflow-hidden shadow-xs">
                    {renderBookCover(eb, 'card')}
                  </div>

                  {/* Metadata */}
                  <div className="px-2 pt-3.5 pb-1 space-y-1">
                    <h2 className="font-heading text-sm font-extrabold text-slate-900 line-clamp-2 group-hover:text-[#0284C7] transition-colors leading-snug">
                      {isBn ? (eb.titleBn || eb.title) : eb.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {isBn ? (eb.summaryBn || eb.summary) : eb.summary}
                    </p>
                  </div>
                </div>

                {/* Bottom Price & Action Pill Row */}
                <div className="px-2 pt-3 pb-1.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    {eb.isFree ? (
                      <span className="text-sm font-extrabold text-[#16A34A]">
                        {isBn ? 'ফ্রি' : 'Free'}
                      </span>
                    ) : (
                      <div className="flex flex-col leading-none">
                        <span className="text-sm font-extrabold font-mono text-[#0284C7]">
                          ৳{eb.price}
                        </span>
                        {eb.originalPrice && eb.originalPrice > eb.price && (
                          <span className="text-[10px] font-mono text-slate-400 line-through mt-0.5">
                            ৳{eb.originalPrice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#EFF6FF] group-hover:bg-[#0284C7] text-[#0284C7] group-hover:text-white text-[11px] font-bold transition-colors">
                    <span>{eb.isFree ? (isBn ? 'ফ্রি নিন' : 'Get free') : (isBn ? 'দেখুন' : 'View')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
