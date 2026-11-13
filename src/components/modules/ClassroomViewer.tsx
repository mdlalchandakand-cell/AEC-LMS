import React, { useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import {
  CheckCircle2, Circle, ArrowLeft, Download, FileText,
  MessageSquare, BookOpen, Save, Clock
} from 'lucide-react';
import { Lesson } from '../../types/lms';

interface ClassroomLesson extends Lesson {
  contentType: string;
  body: string;
  mediaUrl: string;
}

interface ClassroomViewerProps {
  courseId: string;
  onBack: () => void;
}

export const ClassroomViewer: React.FC<ClassroomViewerProps> = ({ courseId, onBack }) => {
  const { courses, isAuthenticated } = useLms();
  const contextCourse = courses.find(item => item.id === courseId);
  const [serverCourse, setServerCourse] = useState<Record<string, unknown> | null>(null);
  const [courseLessons, setCourseLessons] = useState<ClassroomLesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [contentError, setContentError] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [canTrackProgress, setCanTrackProgress] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);
  const courseTitle = String(serverCourse?.title || contextCourse?.title || 'Course');
  const courseCategory = contextCourse?.category || 'Course';
  const activeLesson = courseLessons.find(lesson => lesson.id === activeLessonId) || courseLessons[0] || null;

  useEffect(() => {
    let active = true;
    setLoadingContent(true);
    setContentError('');
    setServerCourse(null);
    setCourseLessons([]);
    setActiveLessonId(null);
    setCanTrackProgress(false);
    setProgressError('');
    apiClient.courses.getById(courseId).then(async result => {
      if (!active) return;
      if (!result.success || !result.data) {
        setContentError(result.error || 'Course content could not be loaded. Please check your enrollment or preview access.');
        return;
      }
      setServerCourse(result.data);
      const mayTrackProgress = Boolean(result.data.can_track_progress);
      setCanTrackProgress(mayTrackProgress);
      let progressByContentId = new Map<number, { is_completed: number; notes: string | null }>();
      if (isAuthenticated && mayTrackProgress) {
        const progressResult = await apiClient.content.getProgress(courseId);
        if (progressResult.success && Array.isArray(progressResult.data)) {
          progressByContentId = new Map(progressResult.data.map(entry => [
            Number(entry.content_item_id),
            { is_completed: Number(entry.is_completed), notes: entry.notes },
          ]));
        }
        if (!active) return;
      }
      const rawItems = Array.isArray(result.data.content) ? result.data.content as Array<Record<string, unknown>> : [];
      const mapped: ClassroomLesson[] = rawItems.map((item, index) => {
        const id = String(item.id);
        const title = String(item.title || `Lesson ${index + 1}`);
        const mediaUrl = String(item.media_url || '');
        const contentType = String(item.content_type || 'lesson');
        const progress = progressByContentId.get(Number(id));
        return {
          id,
          courseId,
          moduleTitle: 'Course Curriculum',
          title,
          titleBn: title,
          durationMinutes: Number(item.duration_minutes || 0),
          videoUrl: mediaUrl,
          isCompleted: Number(progress?.is_completed || 0) === 1,
          notes: String(progress?.notes || ''),
          resources: contentType === 'file' && mediaUrl
            ? [{ name: title, type: 'pdf' as const, size: 'Course resource', url: mediaUrl }]
            : [],
          contentType,
          body: String(item.body || ''),
          mediaUrl,
        };
      });
      setCourseLessons(mapped);
      setActiveLessonId(mapped[0]?.id || null);
      setNoteContent(mapped[0]?.notes || '');
    }).catch(error => {
      if (active) setContentError(error instanceof Error ? error.message : 'Course content could not be loaded.');
    }).finally(() => {
      if (active) setLoadingContent(false);
    });
    return () => { active = false; };
  }, [courseId, isAuthenticated]);

  const handleSelectLesson = (lesson: ClassroomLesson) => {
    setActiveLessonId(lesson.id);
    setNoteContent(lesson.notes || '');
    setNoteSaved(false);
    setProgressError('');
  };

  const handleSaveNote = async () => {
    if (!activeLesson || !canTrackProgress || savingProgress) return;
    setSavingProgress(true);
    setProgressError('');
    const result = await apiClient.content.saveProgress({
      course_id: Number(courseId),
      content_item_id: Number(activeLesson.id),
      is_completed: Boolean(activeLesson.isCompleted),
      notes: noteContent,
    });
    if (!result.success) {
      setProgressError(result.error || 'Could not save lesson notes.');
      setSavingProgress(false);
      return;
    }
    setCourseLessons(current => current.map(lesson => lesson.id === activeLesson.id ? { ...lesson, notes: noteContent } : lesson));
    setNoteSaved(true);
    setSavingProgress(false);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleToggleCompleted = async () => {
    if (!activeLesson || !canTrackProgress || savingProgress) return;
    const nextCompleted = !activeLesson.isCompleted;
    setSavingProgress(true);
    setProgressError('');
    const result = await apiClient.content.saveProgress({
      course_id: Number(courseId),
      content_item_id: Number(activeLesson.id),
      is_completed: nextCompleted,
      notes: noteContent,
    });
    if (!result.success) {
      setProgressError(result.error || 'Could not update lesson completion.');
      setSavingProgress(false);
      return;
    }
    setCourseLessons(current => current.map(lesson => lesson.id === activeLesson.id ? { ...lesson, isCompleted: nextCompleted, notes: noteContent } : lesson));
    setSavingProgress(false);
  };

  const completedCount = courseLessons.filter(l => l.isCompleted).length;
  const progressPercent = courseLessons.length ? Math.round((completedCount / courseLessons.length) * 100) : 0;

  if (loadingContent) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading course lessons…</div>;
  }
  if (contentError) {
    return <div className="space-y-4 rounded-2xl border border-rose-200 bg-white p-6">
      <p className="text-sm text-rose-700">{contentError}</p>
      <button type="button" onClick={onBack} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Back to courses</button>
    </div>;
  }
  if (!activeLesson) {
    return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
      <h2 className="text-base font-bold text-slate-900">{courseTitle}</h2>
      <p className="text-sm text-slate-500">No published lessons are available in this course yet.</p>
      <button type="button" onClick={onBack} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Back to courses</button>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with back button and progress indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
              {courseCategory} Classroom
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {courseTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="font-bold text-slate-800">{progressPercent}% Completed</span>
            <span className="text-slate-500 block">({completedCount}/{courseLessons.length} lessons done)</span>
          </div>
          <div className="w-24 h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Main Classroom Grid: Video & Tools (Left 8 cols), Playlist (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Video Player, Notes, Resources, Discussion */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Responsive 16:9 Video Player */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
            <div className="relative aspect-video w-full bg-black">
              {activeLesson.mediaUrl && activeLesson.contentType !== 'file' ? (
                /\.(mp4|webm|ogg)(\?.*)?$/i.test(activeLesson.mediaUrl) ? (
                  <video src={activeLesson.mediaUrl} controls className="h-full w-full" />
                ) : (
                  <iframe
                    src={(() => {
                      const match = activeLesson.mediaUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
                      return match ? `https://www.youtube.com/embed/${match[1]}` : activeLesson.mediaUrl;
                    })()}
                    title={activeLesson.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
                  {activeLesson.contentType === 'file' ? 'Open the resource below to view or download it.' : 'This lesson has no video. Read the lesson content below.'}
                </div>
              )}
            </div>
            {activeLesson.body && (
              <div className="border-t border-slate-800 bg-slate-900 p-5 text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                {activeLesson.body}
              </div>
            )}

            {/* Lesson Title Bar & Completion toggle */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-blue-400 font-semibold block">{activeLesson.moduleTitle}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{activeLesson.title}</h3>
                <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  {activeLesson.durationMinutes} Minutes Lecture
                </span>
              </div>

              {canTrackProgress ? (
                <button
                  onClick={() => void handleToggleCompleted()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeLesson.isCompleted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {activeLesson.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Completed</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4 text-slate-400" />
                      <span>Mark as Complete</span>
                    </>
                  )}
                </button>
              ) : <span className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">Preview access</span>}
            </div>
          </div>

          {/* Interactive Lesson Notes Scratchpad */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>My Personal Study Notes for this Lesson</span>
              </div>
              <button
                onClick={() => void handleSaveNote()}
                disabled={!canTrackProgress || savingProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProgress ? 'Saving…' : noteSaved ? 'Saved! ✓' : 'Save Notes'}</span>
              </button>
            </div>

            {!canTrackProgress && <p className="text-[11px] text-amber-700">Preview mode: notes and completion are saved only for enrolled students.</p>}
            {progressError && <p role="alert" className="text-[11px] text-rose-600">{progressError}</p>}
            <textarea
              rows={4}
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Write your study notes, key vocabulary, or essay frameworks here, then select Save Notes."
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50 text-slate-800 leading-relaxed font-sans"
            />
          </div>

          {/* Downloadable PDF & Resource Attachments */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Downloadable Lecture Materials & Practice Worksheets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeLesson.resources.map((res, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-blue-50/50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold text-[10px] uppercase">
                      {res.type}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 truncate">{res.name}</div>
                      <div className="text-[10px] text-slate-400">{res.size}</div>
                    </div>
                  </div>

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                    title="Open resource"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Do not show fabricated learner questions or mentor replies. */}
          <div className="bg-white p-5 rounded-2xl border border-dashed border-slate-300 space-y-2">
            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Lesson Discussion &amp; Mentor Q&amp;A</span>
            </div>
            <p className="text-xs leading-5 text-slate-600">The discussion backend is not connected yet. Questions and mentor replies will appear here after that module is implemented.</p>
          </div>

        </div>

        {/* Right Column: Complete Course Syllabus & Lesson Playlist */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Course Playlist</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {courseLessons.length} Lessons
            </span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {courseLessons.map((lesson, idx) => {
              const isSelected = lesson.id === activeLesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="pt-0.5">
                    {lesson.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Lesson {idx + 1} · {lesson.durationMinutes}m
                    </span>
                    <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                      {lesson.title}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
