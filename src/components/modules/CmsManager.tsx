import React, { useCallback, useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Globe, LayoutDashboard, Save, Plus, Edit3, Trash2, 
  MessageSquare, BookOpen, Star, CheckCircle, Bell, ArrowRight, X 
} from 'lucide-react';
import { BlogPost, Testimonial } from '../../types/lms';
import { apiClient } from '../../services/apiClient';

export const CmsManager: React.FC = () => {
  const { 
    websiteSettings, updateWebsiteSettings, blogPosts, addBlogPost, updateBlogPost, deleteBlogPost,
    testimonials, addTestimonial, updateTestimonial, deleteTestimonial, language, t 
  } = useLms();

  const [activeTab, setActiveTab] = useState<'general' | 'blogs' | 'testimonials'>('general');
  const [saveAlert, setSaveAlert] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [managedPosts, setManagedPosts] = useState<BlogPost[]>(blogPosts);
  const [managedTestimonials, setManagedTestimonials] = useState<Testimonial[]>(testimonials);
  const [loadingCms, setLoadingCms] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [articleStatus, setArticleStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [testiStatus, setTestiStatus] = useState<'draft' | 'published' | 'archived'>('published');

  // New Blog Post Modal state
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('IELTS Preparation');
  const [articleExcerpt, setArticleExcerpt] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleSlug, setArticleSlug] = useState('');
  const [articleSeoTitle, setArticleSeoTitle] = useState('');
  const [articleSeoDescription, setArticleSeoDescription] = useState('');
  const [articleThumbnail, setArticleThumbnail] = useState('');
  const [articleAuthor, setArticleAuthor] = useState("Alom's English Center");
  const [articleReadTime, setArticleReadTime] = useState('5 min read');

  // New Testimonial Modal state
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testiName, setTestiName] = useState('');
  const [testiAchievement, setTestiAchievement] = useState('');
  const [testiQuote, setTestiQuote] = useState('');
  const [testiCourse, setTestiCourse] = useState('');
  const [testiRating, setTestiRating] = useState(5);
  const [testiAvatar, setTestiAvatar] = useState('');

  const loadManagedContent = useCallback(async () => {
    setLoadingCms(true);
    const [postsResult, testimonialsResult] = await Promise.all([
      apiClient.cms.getPosts(),
      apiClient.cms.getTestimonials(),
    ]);
    if (postsResult.success && Array.isArray(postsResult.data)) {
      setManagedPosts(postsResult.data.map((row: Record<string, unknown>) => ({
        id: String(row.id), title: String(row.title || ''), titleBn: String(row.titleBn || ''),
        slug: String(row.slug || ''), excerpt: String(row.excerpt || ''), content: String(row.content || ''),
        author: String(row.author || ''), date: String(row.date || ''), category: String(row.category || 'General'),
        thumbnail: String(row.thumbnail || ''), readTime: String(row.readTime || '5 min read'),
        seoTitle: String(row.seoTitle || ''), seoDescription: String(row.seoDescription || ''),
        status: String(row.status || 'draft') as 'draft' | 'published' | 'archived',
      })));
    } else {
      setSaveError(postsResult.error || 'Could not load CMS articles.');
    }
    if (testimonialsResult.success && Array.isArray(testimonialsResult.data)) {
      setManagedTestimonials(testimonialsResult.data.map((row: Record<string, unknown>) => ({
        id: String(row.id), studentName: String(row.studentName || ''), achievement: String(row.achievement || ''),
        quote: String(row.quote || ''), quoteBn: String(row.quoteBn || ''), rating: Number(row.rating || 5),
        avatar: String(row.avatar || ''), course: String(row.course || ''),
        status: String(row.status || 'draft') as 'draft' | 'published' | 'archived',
      })));
    } else {
      setSaveError(testimonialsResult.error || 'Could not load CMS testimonials.');
    }
    setLoadingCms(false);
  }, []);

  useEffect(() => { void loadManagedContent(); }, [loadManagedContent]);

  const resetArticleForm = () => {
    setArticleTitle(''); setArticleExcerpt(''); setArticleContent(''); setArticleSlug('');
    setArticleSeoTitle(''); setArticleSeoDescription(''); setArticleThumbnail('');
    setArticleCategory('IELTS Preparation'); setArticleAuthor("Alom's English Center");
    setArticleReadTime('5 min read'); setArticleStatus('published'); setEditingPostId(null);
  };

  const resetTestimonialForm = () => {
    setTestiName(''); setTestiAchievement(''); setTestiQuote(''); setTestiAvatar('');
    setTestiCourse(''); setTestiRating(5); setTestiStatus('published'); setEditingTestimonialId(null);
  };

  const openEditPost = (post: BlogPost) => {
    setArticleTitle(post.title); setArticleExcerpt(post.excerpt); setArticleContent(post.content);
    setArticleSlug(post.slug); setArticleSeoTitle(post.seoTitle || '');
    setArticleSeoDescription(post.seoDescription || ''); setArticleThumbnail(post.thumbnail || '');
    setArticleCategory(post.category); setArticleAuthor(post.author); setArticleReadTime(post.readTime);
    setArticleStatus(post.status || 'published'); setEditingPostId(post.id); setShowArticleModal(true);
  };

  const openEditTestimonial = (item: Testimonial) => {
    setTestiName(item.studentName); setTestiAchievement(item.achievement); setTestiQuote(item.quote);
    setTestiAvatar(item.avatar || ''); setTestiCourse(item.course); setTestiRating(item.rating);
    setTestiStatus(item.status || 'published'); setEditingTestimonialId(item.id); setShowTestimonialModal(true);
  };

  const handleDeletePost = async (post: BlogPost) => {
    if (!window.confirm(`Archive the article "${post.title}"?`)) return;
    const deleted = await deleteBlogPost(post.id);
    if (!deleted) { setSaveError('Article could not be archived.'); return; }
    await loadManagedContent();
  };

  const handleDeleteTestimonial = async (item: Testimonial) => {
    if (!window.confirm(`Archive the testimonial from "${item.studentName}"?`)) return;
    const deleted = await deleteTestimonial(item.id);
    if (!deleted) { setSaveError('Testimonial could not be archived.'); return; }
    await loadManagedContent();
  };

  // Form states
  const [heroHeadline, setHeroHeadline] = useState(websiteSettings.heroHeadline);
  const [heroHighlight, setHeroHighlight] = useState(websiteSettings.heroHighlight);
  const [heroSubtitle, setHeroSubtitle] = useState(websiteSettings.heroSubtitle);
  const [hotline, setHotline] = useState(websiteSettings.hotline);
  const [email, setEmail] = useState(websiteSettings.email);
  const [bkashNumber, setBkashNumber] = useState(websiteSettings.bkashNumber);
  const [noticeTicker, setNoticeTicker] = useState(websiteSettings.noticeTicker);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const saved = await updateWebsiteSettings({
      heroHeadline,
      heroHighlight,
      heroSubtitle,
      hotline,
      email,
      bkashNumber,
      noticeTicker
    });
    if (!saved) {
      setSaveError('Website settings could not be saved to the server.');
      return;
    }
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
            Roadmap Step 3 · অ্যাডমিন ড্যাশবোর্ড ও CMS
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Public Website CMS & Content Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify public portal headlines, blogs, notices, and testimonials without touching code
          </p>
        </div>

        {saveAlert && (
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            Website Content Updated! ✓
          </span>
        )}
      </div>

      {saveError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</div>}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          General & Homepage Settings
        </button>
        <button
          onClick={() => setActiveTab('blogs')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'blogs'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Blog Articles ({blogPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'testimonials'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Student Testimonials ({testimonials.length})
        </button>
      </div>

      {/* Tab 1: General & Homepage CMS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hero Main Headline</label>
              <input
                type="text"
                value={heroHeadline}
                onChange={e => setHeroHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hero Yellow Highlight Phrase</label>
              <input
                type="text"
                value={heroHighlight}
                onChange={e => setHeroHighlight(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden text-amber-600 font-bold"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Hero Subtitle Paragraph</label>
            <textarea
              rows={3}
              value={heroSubtitle}
              onChange={e => setHeroSubtitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Hotline (+880)</label>
              <input
                type="text"
                value={hotline}
                onChange={e => setHotline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">bKash Merchant Account Number</label>
              <input
                type="text"
                value={bkashNumber}
                onChange={e => setBkashNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Top Announcement Banner / Notice Ticker</label>
            <input
              type="text"
              value={noticeTicker}
              onChange={e => setNoticeTicker(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save & Publish Live to Website</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Blog Posts */}
      {activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Articles & Study Resources</h3>
              <p className="text-xs text-slate-500">Publish guides, IELTS writing samples, and British phonetics tips</p>
            </div>
            <button
              onClick={() => { resetArticleForm(); setShowArticleModal(true); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Article</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingCms ? <div className="col-span-full p-8 text-center text-xs text-slate-500">Loading CMS articles…</div> : managedPosts.map(post => (
              <div key={post.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-blue-600">{post.category}</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{post.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{post.excerpt}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Author: {post.author}</span>
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : post.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{post.status || 'published'}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEditPost(post)} className="rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                    <button type="button" onClick={() => void handleDeletePost(post)} className="rounded border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Archive</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Testimonials */}
      {activeTab === 'testimonials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Student Success Wall Reviews</h3>
              <p className="text-xs text-slate-500">Manage verified quotes, band scores, and graduate feedback</p>
            </div>
            <button
              onClick={() => { resetTestimonialForm(); setShowTestimonialModal(true); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingCms ? <div className="col-span-full p-8 text-center text-xs text-slate-500">Loading testimonials…</div> : managedTestimonials.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.studentName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{t.studentName}</h4>
                    <span className="text-[11px] text-blue-600 font-semibold">{t.achievement}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic">"{t.quote}"</p>
                <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[11px] text-slate-400 ml-2">{t.course}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${t.status === 'published' ? 'bg-emerald-50 text-emerald-700' : t.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{t.status || 'published'}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEditTestimonial(t)} className="rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                    <button type="button" onClick={() => void handleDeleteTestimonial(t)} className="rounded border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Archive</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Article */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">{editingPostId ? 'Edit Article' : 'Publish New English Study Article'}</h3>
              <button onClick={() => { setShowArticleModal(false); resetArticleForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaveError('');
                if (!articleTitle.trim() || !articleExcerpt.trim() || !articleContent.trim()) return;
                const payload = {
                  title: articleTitle.trim(),
                  titleBn: articleTitle.trim(),
                  slug: articleSlug.trim() || articleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                  excerpt: articleExcerpt.trim(),
                  content: articleContent.trim(),
                  category: articleCategory,
                  author: articleAuthor,
                  readTime: articleReadTime,
                  thumbnail: articleThumbnail.trim(),
                  seoTitle: articleSeoTitle.trim() || articleTitle.trim(),
                  seoDescription: articleSeoDescription.trim() || articleExcerpt.trim(),
                  status: articleStatus,
                } as Omit<BlogPost, 'id' | 'date'>;
                const saved = editingPostId
                  ? await updateBlogPost(editingPostId, payload)
                  : Boolean(await addBlogPost(payload));
                if (!saved) {
                  setSaveError('Article could not be saved. Check the title, slug and content, then try again.');
                  return;
                }
                await loadManagedContent();
                setShowArticleModal(false);
                resetArticleForm();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Subject-Verb Agreement in 3 Easy Steps"
                  value={articleTitle}
                  onChange={e => setArticleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={articleCategory}
                    onChange={e => setArticleCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="IELTS Preparation">IELTS Preparation</option>
                    <option value="Spoken English">Spoken English</option>
                    <option value="Grammar & Syntax">Grammar & Syntax</option>
                    <option value="Study Abroad">Study Abroad</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={articleAuthor}
                    onChange={e => setArticleAuthor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Summary / Excerpt *</label>
                <textarea
                  rows={3}
                  required
                  maxLength={600}
                  placeholder="Brief summary of key learning points..."
                  value={articleExcerpt}
                  onChange={e => setArticleExcerpt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Article Content *</label>
                <textarea
                  rows={7}
                  required
                  maxLength={200000}
                  placeholder="Write the complete article content here..."
                  value={articleContent}
                  onChange={e => setArticleContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL Slug (optional)</label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="subject-verb-agreement"
                  value={articleSlug}
                  onChange={e => setArticleSlug(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SEO Title</label>
                  <input type="text" maxLength={180} value={articleSeoTitle} onChange={e => setArticleSeoTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thumbnail URL</label>
                  <input type="url" value={articleThumbnail} onChange={e => setArticleThumbnail(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Publishing Status</label>
                <select value={articleStatus} onChange={e => setArticleStatus(e.target.value as 'draft' | 'published' | 'archived')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SEO Description</label>
                <textarea rows={2} maxLength={320} value={articleSeoDescription} onChange={e => setArticleSeoDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Publishing Status</label>
                <select value={testiStatus} onChange={e => setTestiStatus(e.target.value as 'draft' | 'published' | 'archived')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowArticleModal(false); resetArticleForm(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {editingPostId ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Testimonial */}
      {showTestimonialModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">{editingTestimonialId ? 'Edit Student Review' : 'Add Student Review & Band Score'}</h3>
              <button onClick={() => { setShowTestimonialModal(false); resetTestimonialForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaveError('');
                if (!testiName.trim() || !testiQuote.trim()) return;
                const payload = {
                  studentName: testiName.trim(),
                  achievement: testiAchievement.trim(),
                  quote: testiQuote.trim(),
                  quoteBn: testiQuote.trim(),
                  rating: testiRating,
                  course: testiCourse.trim(),
                  avatar: testiAvatar.trim(),
                  status: testiStatus,
                } as Omit<Testimonial, 'id'>;
                const saved = editingTestimonialId
                  ? await updateTestimonial(editingTestimonialId, payload)
                  : Boolean(await addTestimonial(payload));
                if (!saved) {
                  setSaveError('Testimonial could not be saved. Please check the form and try again.');
                  return;
                }
                await loadManagedContent();
                setShowTestimonialModal(false);
                resetTestimonialForm();
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanmoy Roy"
                    value={testiName}
                    onChange={e => setTestiName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Achievement Badge *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Band 8.0 First Attempt"
                    value={testiAchievement}
                    onChange={e => setTestiAchievement(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Enrolled Course</label>
                <input
                  type="text"
                  value={testiCourse}
                  onChange={e => setTestiCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Avatar URL (optional)</label>
                <input
                  type="url"
                  value={testiAvatar}
                  onChange={e => setTestiAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Review / Feedback *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write the student's quote..."
                  value={testiQuote}
                  onChange={e => setTestiQuote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowTestimonialModal(false); resetTestimonialForm(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {editingTestimonialId ? 'Update Testimonial' : 'Save Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
