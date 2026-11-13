import React, { useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { Play, BookOpen, Clock, ArrowRight, FileText, X, CheckCircle2 } from 'lucide-react';
import { BlogPost, Lesson } from '../../types/lms';
import { apiClient } from '../../services/apiClient';
import ieltsCourseImg from '../../assets/images/course_ielts_masterclass_1794552235026.jpg';

export const LearnPage: React.FC = () => {
  const { language, courses, blogPosts, setActiveView, websiteSettings } = useLms();
  const isBn = language === 'bn';

  const [filterMode, setFilterMode] = useState<'all' | 'videos' | 'articles'>('all');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<BlogPost | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonLoadError, setLessonLoadError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.content.getPublic().then(result => {
      if (!active) return;
      if (!result.success || !Array.isArray(result.data)) {
        setLessonLoadError(result.error || 'Published free lessons could not be loaded.');
        setLessons([]);
        return;
      }
      const mapped = result.data
        .filter(row => ['lesson', 'video'].includes(String(row.content_type)))
        .map((row): Lesson => ({
          id: String(row.id),
          courseId: row.course_id == null ? '' : String(row.course_id),
          moduleTitle: String(row.course_title || 'Free Learning'),
          title: String(row.title || ''),
          titleBn: String(row.title_bn || ''),
          durationMinutes: Number(row.duration_minutes || 0),
          videoUrl: String(row.media_url || ''),
          isCompleted: false,
          notes: String(row.body || ''),
          resources: [],
        }));
      setLessons(mapped);
    }).catch(error => {
      if (active) setLessonLoadError(error instanceof Error ? error.message : 'Published free lessons could not be loaded.');
    }).finally(() => {
      if (active) setLoadingLessons(false);
    });
    return () => { active = false; };
  }, []);

  const visibleLessons = lessons.slice(0, 6);
  const theme = websiteSettings.themeSettings;
  const lightCanvasBg = `linear-gradient(135deg, ${theme?.lightCanvasStart || '#EAE9FF'} 0%, ${theme?.lightCanvasMid || '#F2F3FF'} 45%, ${theme?.lightCanvasEnd || '#E5F4FE'} 100%)`;

  const toEmbedUrl = (url: string) => {
    if (!url.trim()) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  return (
    <main
      className="flex-1 py-10 sm:py-14 px-4 sm:px-6 w-full"
      style={{ background: lightCanvasBg }}
    >
      <div className="max-w-[1160px] mx-auto space-y-10">
        {/* Top Breadcrumb + Section Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              {isBn ? 'হোম' : 'Home'}
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-slate-800">
              {isBn ? 'ফ্রি লার্নিং' : 'Learn'}
            </span>
          </nav>

          <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">
                {isBn ? 'ফ্রি লার্নিং হাব' : 'FREE LEARNING HUB'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {isBn ? 'ফ্রি ভিডিও লেসন ও স্টাডি গাইড' : 'Learn English & IELTS Concept Guides'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isBn
                  ? 'ক্লাস শুরু করার আগেই আমাদের ফ্রি ডেমো লেসন, গ্রামার শর্টকাট ও রাইটিং গাইড পড়ে প্রস্তুতি যাচাই করুন।'
                  : 'Explore curated video lectures, speaking frameworks, and IELTS writing blueprints straight from our faculty mentors.'}
              </p>
              <div className="pt-1">
                <div className="w-8 h-1 rounded-full bg-[#0284C7]" />
              </div>
            </div>

            {/* Filter Switch */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-full p-1 shadow-2xs self-start">
              {[
                { id: 'all', labelEn: 'All Resources', labelBn: 'সকল কন্টেন্ট' },
                { id: 'videos', labelEn: `Video Lessons (${visibleLessons.length})`, labelBn: `ভিডিও (${visibleLessons.length})` },
                { id: 'articles', labelEn: `Study Articles (${blogPosts.length})`, labelBn: `আর্টিকেল (${blogPosts.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isBn ? tab.labelBn : tab.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video Lectures Section */}
        {(filterMode === 'all' || filterMode === 'videos') && (
          <section className="space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-[#0284C7] fill-[#0284C7]" />
              <span>{isBn ? 'ফ্রি কনসেপ্ট ভিডিও লেসন' : 'Free Concept Video Lectures'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingLessons && <div className="col-span-full p-8 rounded-xl border border-slate-200 bg-white text-center text-sm text-slate-500">{isBn ? 'ফ্রি লেসন লোড হচ্ছে…' : 'Loading published free lessons…'}</div>}
              {!loadingLessons && lessonLoadError && <div role="alert" className="col-span-full p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">{lessonLoadError}</div>}
              {!loadingLessons && !lessonLoadError && visibleLessons.length === 0 && <div className="col-span-full p-8 rounded-xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">{isBn ? 'এখনো কোনো প্রকাশিত ফ্রি ভিডিও লেসন নেই।' : 'No published free video lessons are available yet.'}</div>}
              {visibleLessons.map(lesson => {
                const parentCourse = courses.find(c => c.id === lesson.courseId);
                return (
                  <article
                    key={lesson.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-40 bg-[#032D42] flex items-center justify-center p-5 text-white overflow-hidden">
                        <img
                          src={parentCourse?.thumbnail && !parentCourse.thumbnail.includes('unsplash') ? parentCourse.thumbnail : ieltsCourseImg}
                          alt={lesson.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-40"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedLesson(lesson)}
                          className="relative z-10 w-12 h-12 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                          aria-label={`Play ${lesson.title}`}
                        >
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </button>
                        <span className="absolute bottom-3 left-3 z-10 text-[11px] font-semibold text-sky-200">
                          {lesson.moduleTitle}
                        </span>
                        <span className="absolute bottom-3 right-3 z-10 text-[11px] font-mono text-slate-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lesson.durationMinutes}m
                        </span>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="text-[11px] font-bold text-[#2563EB]">
                          {parentCourse ? (isBn ? parentCourse.titleBn : parentCourse.title) : 'English Concept Series'}
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                          {isBn ? (lesson.titleBn || lesson.title) : lesson.title}
                        </h3>
                        {lesson.notes && (
                          <p className="text-xs text-slate-500 line-clamp-2">{lesson.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ফ্রি এক্সেস' : 'Free Access'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedLesson(lesson)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0284C7] hover:text-[#0369A1] cursor-pointer"
                      >
                        <span>{isBn ? 'ক্লাস দেখুন' : 'Watch Lesson'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Written Guides & Study Blog Articles */}
        {(filterMode === 'all' || filterMode === 'articles') && (
          <section className="space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4F46E5]" />
              <span>{isBn ? 'লিখিত স্টাডি আর্টিকেল ও সাজেশন' : 'Written Study Guides & Tips'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogPosts.map(post => (
                <article
                  key={post.id}
                  onClick={() => setSelectedArticle(post)}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col sm:flex-row cursor-pointer"
                >
                  <div className="sm:w-44 h-44 sm:h-auto shrink-0 bg-slate-900 overflow-hidden">
                    <img
                      src={post.thumbnail && !post.thumbnail.includes('unsplash') ? post.thumbnail : ieltsCourseImg}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#0284C7]">
                        <span>{post.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-400">{post.readTime}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {isBn ? (post.titleBn || post.title) : post.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{post.excerpt}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">{post.author}</span>
                      <span className="font-bold text-[#2563EB] inline-flex items-center gap-1">
                        <span>{isBn ? 'পড়ুন' : 'Read Guide'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-[#032D42] text-white flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-sky-300">{selectedLesson.moduleTitle}</div>
                <h3 className="text-base font-bold">{isBn ? (selectedLesson.titleBn || selectedLesson.title) : selectedLesson.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLesson(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-slate-950">
              {toEmbedUrl(selectedLesson.videoUrl) ? (
                <iframe
                  src={toEmbedUrl(selectedLesson.videoUrl)}
                  title={selectedLesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full min-h-48 flex items-center justify-center p-6 text-center text-sm text-slate-300">
                  {isBn ? 'এই লেসনের ভিডিও লিংক এখনো যোগ করা হয়নি।' : 'A video link has not been added to this lesson yet.'}
                </div>
              )}
            </div>
            {selectedLesson.notes && (
              <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Class Note:</strong> {selectedLesson.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[88vh] flex flex-col">
            <div className="px-6 py-4 bg-[#032D42] text-white flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-sky-300">{selectedArticle.category} · {selectedArticle.readTime}</div>
                <h3 className="text-base font-bold">{isBn ? (selectedArticle.titleBn || selectedArticle.title) : selectedArticle.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900">{selectedArticle.excerpt}</p>
              <p>{selectedArticle.content}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
