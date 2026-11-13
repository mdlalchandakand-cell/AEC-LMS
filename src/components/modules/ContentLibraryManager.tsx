import React, { useCallback, useEffect, useState } from 'react';
import { Archive, BookOpen, Edit2, FilePlus2, RefreshCw, Save, X } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';

type ContentType = 'lesson' | 'video' | 'article' | 'file' | 'quiz';
type ContentStatus = 'draft' | 'published' | 'archived';

interface ContentItem {
  id: number;
  title: string;
  content_type: ContentType;
  body: string | null;
  media_url: string | null;
  duration_minutes: number;
  status: ContentStatus;
  created_at: string;
}

const emptyForm = {
  title: '',
  content_type: 'lesson' as ContentType,
  body: '',
  media_url: '',
  duration_minutes: 0,
  status: 'draft' as ContentStatus,
};

export const ContentLibraryManager: React.FC = () => {
  const { courses } = useLms();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [previewCourseIds, setPreviewCourseIds] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    const result = await apiClient.content.getAll();
    if (result.success && Array.isArray(result.data)) {
      setItems(result.data as unknown as ContentItem[]);
      setError('');
    } else {
      setError(result.error || 'Could not load the content library.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedCourseIds([]);
    setPreviewCourseIds([]);
    setSelectedFile(null);
    setError('');
    setNotice('');
    setShowForm(false);
  };

  const startNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedCourseIds([]);
    setPreviewCourseIds([]);
    setSelectedFile(null);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const editItem = async (item: ContentItem) => {
    setSelectedFile(null);
    setError('');
    setNotice('');
    setForm({
      title: item.title,
      content_type: item.content_type,
      body: item.body || '',
      media_url: item.media_url || '',
      duration_minutes: Number(item.duration_minutes || 0),
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
    const links = await apiClient.content.getLinks(item.id);
    if (!links.success || !Array.isArray(links.data)) {
      setError(links.error || 'Could not load the selected course links.');
      return;
    }
    setSelectedCourseIds(links.data.map(link => Number(link.course_id)));
    setPreviewCourseIds(links.data.filter(link => Number(link.is_preview) === 1).map(link => Number(link.course_id)));
  };

  const toggleCourse = (courseId: number) => {
    setSelectedCourseIds(current => current.includes(courseId)
      ? current.filter(id => id !== courseId)
      : [...current, courseId]);
    setPreviewCourseIds(current => current.filter(id => id !== courseId));
  };

  const togglePreview = (courseId: number) => {
    setPreviewCourseIds(current => current.includes(courseId)
      ? current.filter(id => id !== courseId)
      : [...current, courseId]);
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      title: form.title.trim(),
      content_type: form.content_type,
      body: form.body,
      media_url: form.media_url.trim(),
      duration_minutes: Math.max(0, Number(form.duration_minutes) || 0),
      status: form.status,
    };

    let contentId = editingId;
    if (contentId === null) {
      const created = await apiClient.content.create(payload);
      if (!created.success || !created.data?.id) {
        setError(created.error || 'Could not create the content item.');
        setSaving(false);
        return;
      }
      contentId = created.data.id;
      setEditingId(contentId);
    } else {
      const updated = await apiClient.content.update(contentId, payload);
      if (!updated.success) {
        setError(updated.error || 'Could not update the content item.');
        setSaving(false);
        return;
      }
    }

    if (selectedFile && contentId !== null) {
      const uploaded = await apiClient.media.upload(contentId, selectedFile);
      if (!uploaded.success || !uploaded.data?.download_url) {
        setError(uploaded.error || 'Content was saved, but the private media upload failed. Retry the upload.');
        setSaving(false);
        await loadItems();
        return;
      }
      payload.media_url = uploaded.data.download_url;
      setSelectedFile(null);
      setForm(current => ({ ...current, media_url: uploaded.data!.download_url }));
      const attached = await apiClient.content.update(contentId, payload);
      if (!attached.success) {
        setError(attached.error || 'The file was uploaded privately, but could not be attached to the content item.');
        setSaving(false);
        await loadItems();
        return;
      }
    }

    const links = selectedCourseIds.map((courseId, index) => ({
      course_id: courseId,
      sort_order: index,
      is_preview: previewCourseIds.includes(courseId),
    }));
    const linked = await apiClient.content.syncLinks(contentId, links);
    if (!linked.success) {
      setError(linked.error || 'Content was saved, but its course links could not be updated. Retry to finish linking.');
      setSaving(false);
      await loadItems();
      return;
    }

    await loadItems();
    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    setSelectedCourseIds([]);
    setPreviewCourseIds([]);
    setSelectedFile(null);
    setShowForm(false);
    setNotice('Content and course links saved successfully.');
  };

  const archiveItem = async (item: ContentItem) => {
    if (!window.confirm(`Set "${item.title}" to archived status? You can edit it later to publish it again.`)) return;
    const result = await apiClient.content.update(item.id, {
      title: item.title,
      content_type: item.content_type,
      body: item.body || '',
      media_url: item.media_url || '',
      duration_minutes: item.duration_minutes,
      status: 'archived',
    });
    if (!result.success) {
      setError(result.error || 'Could not archive the content item.');
      return;
    }
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, status: 'archived' } : entry));
    setNotice('Content item set to archived. Edit it any time to publish it again.');
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Reusable Content Library</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">Create lessons, videos and resources once, then attach the same item to multiple courses. Preview access is controlled per course.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadItems()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={startNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            <FilePlus2 className="h-3.5 w-3.5" /> Add Content
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}

      {showForm && (
        <form onSubmit={saveItem} className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">{editingId === null ? 'Create content item' : `Edit content #${editingId}`}</h4>
            <button type="button" onClick={resetForm} disabled={saving} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Content title *
              <input required maxLength={180} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Content type
              <select value={form.content_type} onChange={event => setForm(current => ({ ...current, content_type: event.target.value as ContentType }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                <option value="lesson">Lesson</option>
                <option value="video">Video</option>
                <option value="article">Article / Post</option>
                <option value="file">File / Resource</option>
                <option value="quiz">Quiz</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Duration (minutes)
              <input type="number" min="0" max="65535" value={form.duration_minutes} onChange={event => setForm(current => ({ ...current, duration_minutes: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Publishing status
              <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as ContentStatus }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            Lesson body / article content
            <textarea rows={4} value={form.body} onChange={event => setForm(current => ({ ...current, body: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            Video or resource URL
            <input type="url" value={form.media_url} onChange={event => setForm(current => ({ ...current, media_url: event.target.value }))} placeholder="https://..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            Upload private course media (optional, max 20 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/mpeg,audio/mp4,audio/ogg,video/mp4,video/webm" onChange={event => setSelectedFile(event.target.files?.[0] || null)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
            <span className="block text-[11px] font-normal text-slate-500">{selectedFile ? `Selected: ${selectedFile.name}` : 'Allowed: JPG, PNG, WebP, GIF, PDF, MP3, M4A, OGG, MP4 and WebM. Files are stored outside the public web root.'}</span>
          </label>

          <div className="space-y-2">
            <div>
              <h5 className="text-xs font-bold text-slate-800">Attach this content to courses</h5>
              <p className="text-[11px] text-slate-500">Select multiple courses to reuse the same lesson. Mark a course as preview to make this item publicly viewable there.</p>
            </div>
            {courses.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Create a course first before attaching content.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {courses.map(course => {
                  const courseId = Number(course.id);
                  const selected = selectedCourseIds.includes(courseId);
                  return (
                    <div key={course.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <label className="flex items-start gap-2 text-xs font-semibold text-slate-800">
                        <input type="checkbox" checked={selected} onChange={() => toggleCourse(courseId)} className="mt-0.5" />
                        <span>{course.title}<span className="mt-0.5 block text-[10px] font-normal text-slate-500">{course.category}</span></span>
                      </label>
                      {selected && (
                        <label className="ml-6 mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                          <input type="checkbox" checked={previewCourseIds.includes(courseId)} onChange={() => togglePreview(courseId)} />
                          Public preview in this course
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button type="button" onClick={resetForm} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || !form.title.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save content & course links'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">Loading content library…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">No content items yet. Add a lesson, video, article or resource to get started.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-slate-900">{item.title}</h4>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{item.content_type}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${item.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{item.body || item.media_url || 'No body or media URL added.'}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void editItem(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Edit2 className="h-3.5 w-3.5" /> Edit & link</button>
                  <button type="button" onClick={() => void archiveItem(item)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Archive className="h-3.5 w-3.5" /> Set archived</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
