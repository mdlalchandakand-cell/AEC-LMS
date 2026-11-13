import React, { useState, useMemo } from 'react';
import { useLms } from '../../context/LmsContext';
import { Course, Lesson, Exam, ExamQuestion, CourseCategory } from '../../types/lms';
import { 
  BookOpen, Video, HelpCircle, Plus, Edit3, Trash2, Play, Eye, 
  Search, Filter, CheckCircle2, AlertCircle, Sparkles, Layers, 
  Tag, DollarSign, Users, Clock, Check, X, ArrowUpDown, Grid, 
  List, Star, ExternalLink, Settings, BarChart2, ShieldCheck, 
  FileText, ArrowRight, RotateCcw, AlertTriangle, ChevronRight,
  Maximize2
} from 'lucide-react';

interface CourseCatalogManagerProps {
  onStartCourse: (courseId: string) => void;
  onLaunchExam?: (examId?: string) => void;
  onOpenCreateModal: () => void;
  onDeleteCourse: (course: Course) => void;
}

export const CourseCatalogManager: React.FC<CourseCatalogManagerProps> = ({
  onStartCourse,
  onLaunchExam,
  onOpenCreateModal,
  onDeleteCourse
}) => {
  const { 
    courses, updateCourse, lessons, addLesson, updateLesson, deleteLesson,
    exams, addExam, updateExam, addExamQuestion, updateExamQuestion, deleteExamQuestion,
    categories, addCategory, updateCategory, deleteCategory,
    currentUser, language 
  } = useLms();

  const isBn = language === 'bn';

  // Category Manager State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catColor, setCatColor] = useState('blue');

  // Catalog View & Filter States
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price_low' | 'price_high' | 'students' | 'rating'>('date');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Modals
  const [activeCourseForContent, setActiveCourseForContent] = useState<Course | null>(null);
  const [contentActiveTab, setContentActiveTab] = useState<'videos' | 'questions' | 'settings'>('videos');
  
  // Lesson Add/Edit Modal
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonFormModule, setLessonFormModule] = useState('Module 1: Foundation');
  const [lessonFormTitle, setLessonFormTitle] = useState('');
  const [lessonFormTitleBn, setLessonFormTitleBn] = useState('');
  const [lessonFormVideoUrl, setLessonFormVideoUrl] = useState('https://www.youtube.com/embed/dQw4w9WgXcQ');
  const [lessonFormDuration, setLessonFormDuration] = useState(45);
  const [lessonFormNotes, setLessonFormNotes] = useState('');

  // Question Add/Edit Modal
  const [editingQuestion, setEditingQuestion] = useState<{ examId: string; question: ExamQuestion } | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [targetExamIdForQuestion, setTargetExamIdForQuestion] = useState<string>('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionPromptBn, setQuestionPromptBn] = useState('');
  const [questionOptions, setQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [questionExplanation, setQuestionExplanation] = useState('');
  const [questionMarks, setQuestionMarks] = useState<number>(4);

  // Quick Edit Modal
  const [quickEditCourse, setQuickEditCourse] = useState<Course | null>(null);
  const [quickPrice, setQuickPrice] = useState<number>(0);
  const [quickOriginalPrice, setQuickOriginalPrice] = useState<number>(0);
  const [quickMaxSeats, setQuickMaxSeats] = useState<number>(40);
  const [quickStatus, setQuickStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [quickCategory, setQuickCategory] = useState<any>('IELTS');
  const [quickCode, setQuickCode] = useState<string>('');

  // Video Player Preview
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Success Notification banner
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Filtered and Sorted courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.titleBn && course.titleBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (course.code && course.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        course.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
      const status = course.status || 'published';
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

      const maxSeats = course.maxSeats || 40;
      const enrolled = course.totalStudents || 0;
      const seatsLeft = Math.max(0, maxSeats - (enrolled % maxSeats));
      
      let matchesStock = true;
      if (selectedStockFilter === 'low') {
        matchesStock = seatsLeft <= 10 && seatsLeft > 0;
      } else if (selectedStockFilter === 'available') {
        matchesStock = seatsLeft > 10;
      } else if (selectedStockFilter === 'sold_out') {
        matchesStock = seatsLeft === 0;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    }).sort((a, b) => {
      if (sortBy === 'price_low') return a.price - b.price;
      if (sortBy === 'price_high') return b.price - a.price;
      if (sortBy === 'students') return b.totalStudents - a.totalStudents;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [courses, searchQuery, selectedCategory, selectedStatus, selectedStockFilter, sortBy]);

  // Catalog Metrics
  const catalogMetrics = useMemo(() => {
    const total = courses.length;
    const published = courses.filter(c => (c.status || 'published') === 'published').length;
    const draft = courses.filter(c => c.status === 'draft').length;
    const totalSeats = courses.reduce((acc, c) => acc + (c.maxSeats || 40), 0);
    const totalEnrolled = courses.reduce((acc, c) => acc + c.totalStudents, 0);
    const totalCatalogValue = courses.reduce((acc, c) => acc + (c.price * (c.maxSeats || 40)), 0);
    return { total, published, draft, totalSeats, totalEnrolled, totalCatalogValue };
  }, [courses]);

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCourseIds(filteredCourses.map(c => c.id));
    } else {
      setSelectedCourseIds([]);
    }
  };

  const handleToggleSelectCourse = (id: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (status: 'published' | 'draft' | 'archived') => {
    const ids = [...selectedCourseIds];
    const results = await Promise.all(ids.map(id => updateCourse(id, { status })));
    const failedIds = ids.filter((_, index) => !results[index]);
    setSelectedCourseIds(failedIds);
    if (failedIds.length) {
      showToast(`Updated ${ids.length - failedIds.length} course(s); ${failedIds.length} could not be saved.`);
      return;
    }
    showToast(`Updated status for ${ids.length} course(s) to "${status}".`);
  };

  // Open Quick Edit
  const handleOpenQuickEdit = (course: Course) => {
    setQuickEditCourse(course);
    setQuickPrice(course.price);
    setQuickOriginalPrice(course.originalPrice);
    setQuickMaxSeats(course.maxSeats || 40);
    setQuickStatus(course.status || 'published');
    setQuickCategory(course.category);
    setQuickCode(course.code || `AEC-${course.category.toUpperCase()}-0${Math.floor(Math.random() * 9 + 1)}`);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditCourse) return;
    const saved = await updateCourse(quickEditCourse.id, {
      price: Number(quickPrice),
      originalPrice: Number(quickOriginalPrice),
      maxSeats: Number(quickMaxSeats),
      status: quickStatus,
      category: quickCategory,
      code: quickCode
    });
    if (!saved) { showToast('Could not save course changes.'); return; }
    setQuickEditCourse(null);
    showToast(`Saved changes for "${quickEditCourse.title}".`);
  };

  // Content Hub (Lessons & Questions)
  const openContentHub = (course: Course, tab: 'videos' | 'questions' | 'settings' = 'videos') => {
    setActiveCourseForContent(course);
    setContentActiveTab(tab);
  };

  const currentCourseLessons = useMemo(() => {
    if (!activeCourseForContent) return [];
    return lessons.filter(l => l.courseId === activeCourseForContent.id);
  }, [lessons, activeCourseForContent]);

  const currentCourseExams = useMemo(() => {
    if (!activeCourseForContent) return [];
    return exams.filter(e => e.courseId === activeCourseForContent.id);
  }, [exams, activeCourseForContent]);

  // Open Add Lesson Form
  const handleOpenAddLesson = () => {
    setEditingLesson(null);
    setLessonFormModule('Module 1: Orientation & Diagnostic Framework');
    setLessonFormTitle('');
    setLessonFormTitleBn('');
    setLessonFormVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
    setLessonFormDuration(40);
    setLessonFormNotes('');
    setShowLessonForm(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonFormModule(lesson.moduleTitle);
    setLessonFormTitle(lesson.title);
    setLessonFormTitleBn(lesson.titleBn || '');
    setLessonFormVideoUrl(lesson.videoUrl);
    setLessonFormDuration(lesson.durationMinutes);
    setLessonFormNotes(lesson.notes || '');
    setShowLessonForm(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseForContent) return;

    if (editingLesson) {
      const saved = await updateLesson(editingLesson.id, {
        moduleTitle: lessonFormModule,
        title: lessonFormTitle,
        titleBn: lessonFormTitleBn || lessonFormTitle,
        videoUrl: lessonFormVideoUrl,
        durationMinutes: Number(lessonFormDuration),
        notes: lessonFormNotes
      });
      if (!saved) { showToast('Could not update the lesson. Check permissions and server connection.'); return; }
      showToast('Video lesson updated successfully!');
    } else {
      const saved = await addLesson({
        courseId: activeCourseForContent.id,
        moduleTitle: lessonFormModule,
        title: lessonFormTitle,
        titleBn: lessonFormTitleBn || lessonFormTitle,
        videoUrl: lessonFormVideoUrl,
        durationMinutes: Number(lessonFormDuration),
        notes: lessonFormNotes,
        isCompleted: false,
        resources: [
          { name: 'Lecture Notes & Vocabulary Sheet (PDF)', type: 'pdf', size: '1.2 MB', url: '#' }
        ]
      });
      showToast('New video lesson added to course syllabus!');
    }
    setShowLessonForm(false);
  };

  const handleDeleteLessonWithConfirm = async (lessonId: string, title: string) => {
    if (confirm(`Are you sure you want to delete lesson "${title}"? This cannot be undone.`)) {
      const deleted = await deleteLesson(lessonId);
      if (!deleted) { showToast('Could not delete lesson.'); return; }
      showToast('Lesson removed successfully.');
    }
  };

  // Open Add Question Form
  const handleOpenAddQuestion = (examId: string) => {
    setEditingQuestion(null);
    setTargetExamIdForQuestion(examId);
    setQuestionPrompt('');
    setQuestionPromptBn('');
    setQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setQuestionExplanation('');
    setQuestionMarks(4);
    setShowQuestionForm(true);
  };

  const handleOpenEditQuestion = (examId: string, q: ExamQuestion) => {
    setEditingQuestion({ examId, question: q });
    setTargetExamIdForQuestion(examId);
    setQuestionPrompt(q.question);
    setQuestionPromptBn(q.questionBn || '');
    setQuestionOptions([...q.options]);
    setCorrectOptionIndex(q.correctOptionIndex);
    setQuestionExplanation(q.explanation || '');
    setQuestionMarks(q.marks || 4);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExamIdForQuestion) return;

    if (editingQuestion) {
      const saved = await updateExamQuestion(editingQuestion.examId, editingQuestion.question.id, {
        question: questionPrompt,
        questionBn: questionPromptBn || questionPrompt,
        options: questionOptions,
        correctOptionIndex: Number(correctOptionIndex),
        explanation: questionExplanation,
        marks: Number(questionMarks)
      });
      if (!saved) { showToast('Could not update the question.'); return; }
      showToast('Question updated successfully!');
    } else {
      const saved = await addExamQuestion(targetExamIdForQuestion, {
        question: questionPrompt,
        questionBn: questionPromptBn || questionPrompt,
        options: questionOptions,
        correctOptionIndex: Number(correctOptionIndex),
        explanation: questionExplanation,
        marks: Number(questionMarks)
      });
      if (!saved) { showToast('Could not add the question.'); return; }
      showToast('New question added to course exam!');
    }
    setShowQuestionForm(false);
  };

  const handleDeleteQuestionWithConfirm = async (examId: string, qId: string) => {
    if (confirm('Are you sure you want to remove this question from the exam?')) {
      const deleted = await deleteExamQuestion(examId, qId);
      if (!deleted) { showToast('Could not remove question from exam.'); return; }
      showToast('Question removed from exam.');
    }
  };

  // Helper to create exam for course if none exists
  const handleCreateCourseExam = async () => {
    if (!activeCourseForContent) return;
    const newEx = await addExam({
      courseId: activeCourseForContent.id,
      courseTitle: activeCourseForContent.title,
      title: `${activeCourseForContent.title} - Mid-Term Diagnostic Assessment`,
      titleBn: `${activeCourseForContent.titleBn} - মূল্যায়ন পরীক্ষা`,
      durationMinutes: 15,
      totalMarks: 20,
      passMarks: 12,
      negativeMarkPerWrong: 0.25,
      status: 'active',
      questions: [
        {
          id: `q_${Date.now()}`,
          question: 'Sample Diagnostic Question: Identify the correct sentence structure.',
          options: ['Option A (Incorrect)', 'Option B (Correct Answer)', 'Option C (Incorrect)', 'Option D (Incorrect)'],
          correctOptionIndex: 1,
          explanation: 'Standard grammatical agreement requires subject and verb coordination.',
          marks: 4
        }
      ]
    });
    if (!newEx) { showToast('Could not create the exam. Check the server and exam permission.'); return; }
    showToast(`Created new assessment test "${newEx.title}"!`);
  };

  // Category Management Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatNameBn('');
    setCatSlug('');
    setCatDescription('');
    setCatColor('blue');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: CourseCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatNameBn(cat.nameBn || '');
    setCatSlug(cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'));
    setCatDescription(cat.description || '');
    setCatColor(cat.color || 'blue');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const slug = catSlug.trim() || catName.toLowerCase().replace(/\s+/g, '-');

    if (editingCategory) {
      const saved = await updateCategory(editingCategory.id, {
        name: catName.trim(),
        nameBn: catNameBn.trim() || catName.trim(),
        slug,
        description: catDescription.trim(),
        color: catColor
      });
      if (!saved) { showToast('Could not update category.'); return; }
      showToast(`Category "${catName}" updated successfully!`);
    } else {
      const saved = await addCategory({
        name: catName.trim(),
        nameBn: catNameBn.trim() || catName.trim(),
        slug,
        description: catDescription.trim(),
        color: catColor,
        orderIndex: categories.length + 1,
        isActive: true
      });
      if (!saved) { showToast('Could not create category.'); return; }
      showToast(`New category "${catName}" created successfully!`);
    }

    setEditingCategory(null);
    setCatName('');
    setCatNameBn('');
    setCatSlug('');
    setCatDescription('');
  };

  const handleDeleteCategoryWithConfirm = async (catId: string, name: string) => {
    const courseCount = courses.filter(c => c.category === name).length;
    if (courseCount > 0) {
      alert(`Cannot delete category "${name}" because it currently has ${courseCount} course(s) assigned. Please reassign those courses first.`);
      return;
    }
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      const deleted = await deleteCategory(catId);
      if (!deleted) { showToast('Could not delete category.'); return; }
      showToast(`Category "${name}" removed.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header & Catalog Overview Metrics Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                Product Catalog & Inventory
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-500">
                {isBn ? 'কোর্স ও কারিকুলাম ইনভেন্টরি ম্যানেজমেন্ট' : 'Commercial Course Listings & Seat Control'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              {currentUser.role === 'student' ? 'My Enrolled Courses' : 'Course Management & Curriculum Catalog'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage live course listings, pricing, seat inventory, video lectures, and exam questions
            </p>
          </div>

          {currentUser.role !== 'student' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleOpenAddCategory}
                className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-purple-200"
              >
                <Tag className="w-4 h-4 text-purple-600" />
                <span>{isBn ? 'ক্যাটাগরি তৈরি ও ব্যবস্থাপনা' : 'Manage Categories'}</span>
              </button>
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isBn ? 'নতুন কোর্স যুক্ত করুন' : 'Add New Course'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Catalog Items</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{catalogMetrics.total}</span>
              <span className="text-[10px] text-emerald-600 font-bold">({catalogMetrics.published} Published)</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 block">Draft / Unlisted</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-600">{catalogMetrics.draft}</span>
              <span className="text-[10px] text-slate-400">Pending Launch</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 block">Seat Capacity / Enrolled</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-blue-700">{catalogMetrics.totalEnrolled}</span>
              <span className="text-[10px] text-slate-500 font-medium">/ {catalogMetrics.totalSeats} Capacity</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 block">Catalog Inventory Value</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-900">৳{catalogMetrics.totalCatalogValue.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-medium">BDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter & Bulk Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isBn ? "কোর্সের নাম, কোড বা ইনস্ট্রাক্টর দিয়ে খুঁজুন..." : "Search by course title, SKU code (e.g. AEC-IELTS-01), or mentor..."}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all bg-slate-50/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & View Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name} ({cat.nameBn})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Stock / Seat Filter */}
            <select
              value={selectedStockFilter}
              onChange={e => setSelectedStockFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="all">All Seats</option>
              <option value="available">Available Seats</option>
              <option value="low">Low Seats (≤10)</option>
              <option value="sold_out">Sold Out (Full)</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="date">Default Order</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="students">Most Enrolled</option>
              <option value="rating">Highest Rated</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-100">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                title="Table Catalog View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                title="Grid Cards View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Bulk Action Bar (Visible when courses are checked) */}
        {selectedCourseIds.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-blue-900">
              {selectedCourseIds.length} course(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange('published')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
              >
                Bulk Publish
              </button>
              <button
                onClick={() => handleBulkStatusChange('draft')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs"
              >
                Move to Draft
              </button>
              <button
                onClick={() => {
                  selectedCourseIds.forEach(id => {
                    const c = courses.find(item => item.id === id);
                    if (c) onDeleteCourse(c);
                  });
                  setSelectedCourseIds([]);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs"
              >
                Move to Recycle Bin
              </button>
              <button
                onClick={() => setSelectedCourseIds([])}
                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Catalog View: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Course Item / SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price (BDT)</th>
                  <th className="py-3.5 px-4">Seat Inventory</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Content (Videos & Questions)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold">No courses found matching your search filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map(course => {
                    const status = course.status || 'published';
                    const maxSeats = course.maxSeats || 40;
                    const enrolled = course.totalStudents || 0;
                    const seatsLeft = Math.max(0, maxSeats - (enrolled % maxSeats));
                    const isLowSeat = seatsLeft <= 10 && seatsLeft > 0;
                    const isSoldOut = seatsLeft === 0;

                    const courseLessonsCount = lessons.filter(l => l.courseId === course.id).length;
                    const courseExamsList = exams.filter(e => e.courseId === course.id);
                    const courseQuestionsCount = courseExamsList.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0);
                    const discountPercent = course.originalPrice > course.price 
                      ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
                      : 0;

                    const isChecked = selectedCourseIds.includes(course.id);

                    return (
                      <tr 
                        key={course.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-blue-50/40' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectCourse(course.id)}
                            className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Title, Thumbnail, SKU */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {course.code || `AEC-${course.category.toUpperCase()}-01`}
                                </span>
                                {course.featured && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">
                                    Featured
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-sm mt-0.5">
                                {course.title}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                Mentor: <span className="text-slate-600 font-medium">{course.instructorName}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category & Level */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                              {course.category}
                            </span>
                            <div className="text-[10px] text-slate-400">{course.level}</div>
                          </div>
                        </td>

                        {/* Pricing */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-sm">
                              ৳{course.price.toLocaleString()}
                            </div>
                            {course.originalPrice > course.price && (
                              <div className="flex items-center gap-1.5">
                                <span className="line-through text-slate-400 text-[10px]">
                                  ৳{course.originalPrice.toLocaleString()}
                                </span>
                                <span className="text-emerald-600 font-bold text-[10px]">
                                  -{discountPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Seat Inventory & Limits */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 min-w-[110px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={`font-bold ${isSoldOut ? 'text-rose-600' : isLowSeat ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {isSoldOut ? 'Sold Out' : `${seatsLeft} Seats Left`}
                              </span>
                              <span className="text-slate-400 text-[10px]">Max {maxSeats}</span>
                            </div>
                            {/* Visual inventory progress bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isSoldOut ? 'bg-rose-500' : isLowSeat ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, Math.round(((maxSeats - seatsLeft) / maxSeats) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status (Clickable 1-click toggle) */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => {
                              const nextStatus = status === 'published' ? 'draft' : 'published';
                              void updateCourse(course.id, { status: nextStatus }).then(saved => {
                                showToast(saved ? `Changed "${course.title}" status to ${nextStatus}.` : 'Could not update course status.');
                              });
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title="Click to toggle status (Published / Draft)"
                          >
                            ● {status}
                          </button>
                        </td>

                        {/* Content Stats: Videos & Questions */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openContentHub(course, 'videos')}
                            className="group text-left p-1.5 -m-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Open Curriculum & Questions Hub"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 font-semibold text-slate-700 text-[11px] group-hover:text-blue-700">
                                <Video className="w-3.5 h-3.5 text-blue-600" />
                                {courseLessonsCount} Videos
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-1 font-semibold text-slate-700 text-[11px] group-hover:text-blue-700">
                                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                                {courseQuestionsCount} Questions
                              </span>
                            </div>
                            <span className="text-[10px] text-blue-600 font-bold group-hover:underline flex items-center gap-0.5 mt-0.5">
                              Manage Content <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openContentHub(course, 'videos')}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Curriculum & Questions Hub"
                            >
                              <Layers className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenQuickEdit(course)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Quick Edit (Price, Seats, Category)"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onStartCourse(course.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Launch Classroom Player"
                            >
                              <Play className="w-4 h-4 fill-emerald-600" />
                            </button>

                            {currentUser.role !== 'student' && (
                              <button
                                onClick={() => onDeleteCourse(course)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Move to Recycle Bin"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Catalog View: GRID CARDS VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const status = course.status || 'published';
            const maxSeats = course.maxSeats || 40;
            const enrolled = course.totalStudents || 0;
            const seatsLeft = Math.max(0, maxSeats - (enrolled % maxSeats));
            const isLowSeat = seatsLeft <= 10 && seatsLeft > 0;
            const isSoldOut = seatsLeft === 0;

            const courseLessonsCount = lessons.filter(l => l.courseId === course.id).length;
            const courseExamsList = exams.filter(e => e.courseId === course.id);
            const courseQuestionsCount = courseExamsList.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0);
            const discountPercent = course.originalPrice > course.price 
              ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
              : 0;

            return (
              <div 
                key={course.id} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Thumbnail & Badges */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
                    
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider">
                        {course.category}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                        {course.code || `AEC-01`}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-xs ${
                        status === 'published' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        {enrolled} Students
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSoldOut ? 'bg-rose-600 text-white' : isLowSeat ? 'bg-amber-500 text-slate-950 font-black' : 'bg-emerald-600 text-white'
                      }`}>
                        {isSoldOut ? 'Sold Out' : `${seatsLeft} Seats Left`}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {course.subtitle}
                      </p>
                    </div>

                    {/* Content Count Pills */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-600 font-semibold">
                        <Video className="w-3.5 h-3.5 text-blue-600" />
                        <span>{courseLessonsCount} Lessons</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 font-semibold">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                        <span>{courseQuestionsCount} Questions</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-lg font-black text-slate-900">৳{course.price.toLocaleString()}</span>
                        {course.originalPrice > course.price && (
                          <span className="line-through text-slate-400 text-xs ml-2">
                            ৳{course.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {discountPercent > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Save {discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 pt-0 border-t border-slate-100/60 mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <button
                      onClick={() => openContentHub(course, 'videos')}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Curriculum</span>
                    </button>
                    <button
                      onClick={() => onStartCourse(course.id)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Classroom</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <button 
                      onClick={() => handleOpenQuickEdit(course)}
                      className="hover:text-blue-600 flex items-center gap-1 font-semibold"
                    >
                      <Edit3 className="w-3 h-3" /> Quick Edit
                    </button>
                    {currentUser.role !== 'student' && (
                      <button 
                        onClick={() => onDeleteCourse(course)}
                        className="hover:text-rose-600 flex items-center gap-1 font-semibold text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" /> Move to Trash
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE COURSE CONTENT HUB MODAL (VIDEO LESSONS & EXAM QUESTIONS) */}
      {/* ========================================================================= */}
      {activeCourseForContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-4">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0d1f38] to-[#162a45] text-white p-5 sm:p-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                    {activeCourseForContent.code || 'AEC-COURSE'}
                  </span>
                  <span className="text-xs text-slate-300">
                    {activeCourseForContent.category} Program
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mt-1 text-white">
                  {activeCourseForContent.title}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Manage video lessons, syllabus lectures, and exam diagnostic questions
                </p>
              </div>

              <button
                onClick={() => setActiveCourseForContent(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-6 text-xs font-bold">
              <button
                onClick={() => setContentActiveTab('videos')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  contentActiveTab === 'videos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video Lessons ({currentCourseLessons.length})</span>
              </button>

              <button
                onClick={() => setContentActiveTab('questions')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  contentActiveTab === 'questions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>
                  Exam Questions ({currentCourseExams.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0)})
                </span>
              </button>

              <button
                onClick={() => setContentActiveTab('settings')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  contentActiveTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Catalog & Pricing Settings</span>
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* TAB 1: VIDEO LESSONS */}
              {contentActiveTab === 'videos' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Course Video Lectures & Syllabus</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Students access these video lectures with attached study notes and resources
                      </p>
                    </div>

                    <button
                      onClick={handleOpenAddLesson}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Video Lesson</span>
                    </button>
                  </div>

                  {currentCourseLessons.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                      <Video className="w-10 h-10 mx-auto text-slate-300" />
                      <h5 className="font-bold text-slate-700 text-sm">No Video Lessons Added Yet</h5>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Start building the curriculum for this course by adding your first video lecture.
                      </p>
                      <button
                        onClick={handleOpenAddLesson}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                      >
                        Add First Lesson
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentCourseLessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 text-[11px] bg-blue-50 px-2 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                {lesson.moduleTitle}
                              </span>
                            </div>

                            <h5 className="font-bold text-slate-900 text-sm">
                              {lesson.title}
                            </h5>
                            {lesson.titleBn && (
                              <p className="text-xs text-slate-500">{lesson.titleBn}</p>
                            )}

                            <div className="flex items-center gap-3 text-slate-400 text-[11px] pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {lesson.durationMinutes} mins
                              </span>
                              <span>·</span>
                              <span className="font-mono text-slate-500 truncate max-w-xs">
                                {lesson.videoUrl}
                              </span>
                              {lesson.resources && lesson.resources.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-blue-600 font-semibold">
                                    {lesson.resources.length} Resource(s)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <button
                              onClick={() => setPreviewVideoUrl(lesson.videoUrl)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Preview Video Player"
                            >
                              <Play className="w-3 h-3 fill-slate-700" />
                              <span>Preview</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditLesson(lesson)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Lesson"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteLessonWithConfirm(lesson.id, lesson.title)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Lesson"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXAM QUESTIONS */}
              {contentActiveTab === 'questions' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Course MCQ Exams & Diagnostic Questions</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Students take these timed questions in the Online Exam Simulator with instant score calculation
                      </p>
                    </div>

                    {currentCourseExams.length > 0 ? (
                      <button
                        onClick={() => handleOpenAddQuestion(currentCourseExams[0].id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add MCQ Question</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCreateCourseExam}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Initial Exam</span>
                      </button>
                    )}
                  </div>

                  {currentCourseExams.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                      <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
                      <h5 className="font-bold text-slate-700 text-sm">No Exam Linked to this Course</h5>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Create an assessment exam to add diagnostic multiple choice questions for student evaluation.
                      </p>
                      <button
                        onClick={handleCreateCourseExam}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs"
                      >
                        Create Course Exam
                      </button>
                    </div>
                  ) : (
                    currentCourseExams.map(exam => (
                      <div key={exam.id} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                              Online Exam ({exam.durationMinutes} mins · {exam.totalMarks} Marks)
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{exam.title}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAddQuestion(exam.id)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Question</span>
                            </button>
                          </div>
                        </div>

                        {/* Question Items */}
                        <div className="space-y-3 pt-2">
                          {exam.questions.map((q, qIdx) => (
                            <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 text-xs">Q{qIdx + 1}.</span>
                                    <span className="text-xs font-bold text-slate-900">{q.question}</span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                                      {q.marks || 4} Marks
                                    </span>
                                  </div>
                                  {q.questionBn && (
                                    <p className="text-xs text-slate-500 ml-6">{q.questionBn}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditQuestion(exam.id, q)}
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                                    title="Edit Question"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestionWithConfirm(exam.id, q.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                    title="Delete Question"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* 4 Options Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrect = optIdx === q.correctOptionIndex;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                        isCorrect
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                          : 'bg-slate-50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                          {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span>{opt}</span>
                                      </div>
                                      {isCorrect && (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation note */}
                              {q.explanation && (
                                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg ml-6 border border-slate-100">
                                  <strong className="text-slate-700">Explanation: </strong>
                                  {q.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: SETTINGS & INVENTORY */}
              {contentActiveTab === 'settings' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-sm">Course Catalog & Listing Specifications</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Adjust pricing, maximum seat capacity, catalog status, and marketing tags
                    </p>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const saved = await updateCourse(activeCourseForContent.id, {
                        price: Number(quickPrice || activeCourseForContent.price),
                        originalPrice: Number(quickOriginalPrice || activeCourseForContent.originalPrice),
                        maxSeats: Number(quickMaxSeats || activeCourseForContent.maxSeats || 40),
                        status: quickStatus || activeCourseForContent.status || 'published',
                        code: quickCode || activeCourseForContent.code
                      });
                      if (!saved) { showToast('Could not save course settings.'); return; }
                      showToast('Course settings saved successfully!');
                      setActiveCourseForContent(null);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Catalog SKU / Code</label>
                        <input
                          type="text"
                          defaultValue={activeCourseForContent.code || 'AEC-IELTS-01'}
                          onChange={e => setQuickCode(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Catalog Listing Status</label>
                        <select
                          defaultValue={activeCourseForContent.status || 'published'}
                          onChange={e => setQuickStatus(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="published">Published & Active</option>
                          <option value="draft">Draft (Hidden)</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Sale Price (BDT ৳)</label>
                        <input
                          type="number"
                          defaultValue={activeCourseForContent.price}
                          onChange={e => setQuickPrice(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Regular Price (BDT ৳)</label>
                        <input
                          type="number"
                          defaultValue={activeCourseForContent.originalPrice}
                          onChange={e => setQuickOriginalPrice(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Batch Max Seats</label>
                        <input
                          type="number"
                          defaultValue={activeCourseForContent.maxSeats || 40}
                          onChange={e => setQuickMaxSeats(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCourseForContent(null)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                      >
                        Save Settings
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADD / EDIT VIDEO LESSON MODAL */}
      {/* ========================================================================= */}
      {showLessonForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-[#0b1e36] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {editingLesson ? 'Edit Video Lesson' : 'Add New Video Lesson'}
                </h3>
              </div>
              <button onClick={() => setShowLessonForm(false)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Module / Section Name *</label>
                <input
                  type="text"
                  required
                  value={lessonFormModule}
                  onChange={e => setLessonFormModule(e.target.value)}
                  placeholder="e.g. Module 1: Diagnostic Assessment & Orientation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lesson Title (English) *</label>
                <input
                  type="text"
                  required
                  value={lessonFormTitle}
                  onChange={e => setLessonFormTitle(e.target.value)}
                  placeholder="e.g. Lesson 05: Academic Writing Task 2 Architecture"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">লেসনের শিরোনাম (বাংলা)</label>
                <input
                  type="text"
                  value={lessonFormTitleBn}
                  onChange={e => setLessonFormTitleBn(e.target.value)}
                  placeholder="যেমন: লেসন ০৫: রাইটিং টাস্ক ২ প্যারাগ্রাফিং"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Video Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={lessonFormDuration}
                    onChange={e => setLessonFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Video Stream URL *</label>
                  <input
                    type="url"
                    required
                    value={lessonFormVideoUrl}
                    onChange={e => setLessonFormVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lesson Notes & Key Highlights</label>
                <textarea
                  rows={3}
                  value={lessonFormNotes}
                  onChange={e => setLessonFormNotes(e.target.value)}
                  placeholder="Write essential guidelines, tips, or homework tasks for students..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLessonForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  {editingLesson ? 'Update Lesson' : 'Add Lesson to Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ADD / EDIT EXAM MCQ QUESTION MODAL */}
      {/* ========================================================================= */}
      {showQuestionForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-sm">
                  {editingQuestion ? 'Edit MCQ Question' : 'Add New MCQ Question'}
                </h3>
              </div>
              <button onClick={() => setShowQuestionForm(false)} className="text-purple-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Prompt (English) *</label>
                <input
                  type="text"
                  required
                  value={questionPrompt}
                  onChange={e => setQuestionPrompt(e.target.value)}
                  placeholder="e.g. Choose the correct synonym of the academic word 'Ubiquitous':"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">প্রশ্নের বিবরণ (বাংলা)</label>
                <input
                  type="text"
                  value={questionPromptBn}
                  onChange={e => setQuestionPromptBn(e.target.value)}
                  placeholder="বাংলা অনুবাদ বা ব্যাখ্যা..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">
                  Multiple Choice Options (Select Radio for Correct Answer) *
                </label>
                {questionOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctOptionIndex === idx}
                      onChange={() => setCorrectOptionIndex(idx)}
                      className="text-purple-600 focus:ring-0 cursor-pointer"
                      title="Mark as correct answer"
                    />
                    <span className="font-bold text-slate-500 w-4">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={e => {
                        const newOpts = [...questionOptions];
                        newOpts[idx] = e.target.value;
                        setQuestionOptions(newOpts);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      className={`flex-1 px-3 py-1.5 border rounded-lg text-xs ${
                        correctOptionIndex === idx ? 'border-emerald-400 bg-emerald-50/40 font-semibold' : 'border-slate-300'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marks Weight</label>
                  <input
                    type="number"
                    value={questionMarks}
                    onChange={e => setQuestionMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correct Answer</label>
                  <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs">
                    Option {String.fromCharCode(65 + correctOptionIndex)} is marked correct
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Answer Explanation / Feedback</label>
                <textarea
                  rows={2}
                  value={questionExplanation}
                  onChange={e => setQuestionExplanation(e.target.value)}
                  placeholder="Explain why this option is correct for student review..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. QUICK EDIT MODAL */}
      {/* ========================================================================= */}
      {quickEditCourse && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-300 uppercase">Quick Edit</span>
                <h4 className="font-bold text-sm truncate max-w-xs">{quickEditCourse.title}</h4>
              </div>
              <button onClick={() => setQuickEditCourse(null)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sale Price (৳)</label>
                  <input
                    type="number"
                    value={quickPrice}
                    onChange={e => setQuickPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Regular Price (৳)</label>
                  <input
                    type="number"
                    value={quickOriginalPrice}
                    onChange={e => setQuickOriginalPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catalog SKU / Code</label>
                  <input
                    type="text"
                    value={quickCode}
                    onChange={e => setQuickCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Batch Seats</label>
                  <input
                    type="number"
                    value={quickMaxSeats}
                    onChange={e => setQuickMaxSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={quickCategory}
                    onChange={e => setQuickCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name} ({cat.nameBn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catalog Status</label>
                  <select
                    value={quickStatus}
                    onChange={e => setQuickStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickEditCourse(null)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Update Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. CATEGORY MANAGEMENT & TAXONOMY MODAL */}
      {/* ========================================================================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {isBn ? 'কোর্স ক্যাটাগরি তৈরি ও ব্যবস্থাপনা' : 'Course Category Taxonomy & Management'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {isBn ? 'নতুন কোর্স ক্যাটাগরি যোগ করুন, নাম ও কোড এডিট করুন এবং ব্যাজ কালার সেট করুন' : 'Add new categories, customize English/Bengali names, slugs, and color badges'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split into Form (Left) & Categories List (Right) */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
              {/* Left Column: Create / Edit Form */}
              <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      {editingCategory ? (
                        <>
                          <Edit3 className="w-4 h-4 text-blue-600" />
                          <span>{isBn ? 'ক্যাটাগরি সম্পাদনা করুন' : 'Edit Category'}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-emerald-600" />
                          <span>{isBn ? 'নতুন ক্যাটাগরি যোগ করুন' : 'Add New Category'}</span>
                        </>
                      )}
                    </h4>
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={handleOpenAddCategory}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {isBn ? 'নতুন ফরম' : 'New Form'}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'ক্যাটাগরি নাম (English) *' : 'Category Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OET Medical English"
                      value={catName}
                      onChange={(e) => {
                        setCatName(e.target.value);
                        if (!editingCategory) {
                          setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'ক্যাটাগরি নাম (বাংলা) *' : 'Category Name (Bengali) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ওইটি মেডিকেল ইংলিশ"
                      value={catNameBn}
                      onChange={(e) => setCatNameBn(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'ক্যাটাগরি স্লাগ / কোড *' : 'Slug / Identifier *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. oet-medical-english"
                      value={catSlug}
                      onChange={(e) => setCatSlug(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'ব্যাজ কালার থিম' : 'Badge Color Theme'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'blue', label: 'Blue', bg: 'bg-blue-600', ring: 'ring-blue-500' },
                        { id: 'emerald', label: 'Green', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
                        { id: 'purple', label: 'Purple', bg: 'bg-purple-600', ring: 'ring-purple-500' },
                        { id: 'amber', label: 'Amber', bg: 'bg-amber-500', ring: 'ring-amber-500' },
                        { id: 'rose', label: 'Rose', bg: 'bg-rose-500', ring: 'ring-rose-500' },
                        { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-500' },
                        { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-600', ring: 'ring-cyan-500' },
                        { id: 'slate', label: 'Slate', bg: 'bg-slate-700', ring: 'ring-slate-500' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCatColor(c.id)}
                          className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white transition-all ${c.bg} ${
                            catColor === c.id ? `ring-3 ring-offset-1 ring-slate-900 shadow-sm font-black scale-105` : 'opacity-80 hover:opacity-100'
                          }`}
                        >
                          {catColor === c.id ? <Check className="w-3.5 h-3.5" /> : c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)' : 'Description (Optional)'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Description of this category..."
                      value={catDescription}
                      onChange={(e) => setCatDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-sm shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      {editingCategory ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isBn ? 'ক্যাটাগরি আপডেট করুন' : 'Update Category'}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{isBn ? 'নতুন ক্যাটাগরি সংরক্ষণ করুন' : 'Save New Category'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Existing Categories List */}
              <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {isBn ? 'বিদ্যমান ক্যাটাগরি তালিকা' : 'Active Course Categories'}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {isBn ? `সর্বমোট ${categories.length} টি ক্যাটাগরি বিদ্যমান` : `Total ${categories.length} categories registered`}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                    {categories.length} Categories
                  </span>
                </div>

                <div className="overflow-y-auto max-h-[380px] divide-y divide-slate-100 space-y-1">
                  {categories.map((cat) => {
                    const assignedCoursesCount = courses.filter(
                      c => c.category?.toLowerCase() === cat.name.toLowerCase() || c.category === cat.slug
                    ).length;

                    // Color mapping
                    const colorClasses: Record<string, string> = {
                      blue: 'bg-blue-50 text-blue-700 border-blue-200',
                      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      purple: 'bg-purple-50 text-purple-700 border-purple-200',
                      amber: 'bg-amber-50 text-amber-700 border-amber-200',
                      rose: 'bg-rose-50 text-rose-700 border-rose-200',
                      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                      slate: 'bg-slate-100 text-slate-700 border-slate-300',
                    };
                    const badgeClass = colorClasses[cat.color || 'blue'] || colorClasses.blue;

                    return (
                      <div
                        key={cat.id}
                        className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}`}>
                            {cat.name}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-xs">
                                {cat.nameBn}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                /{cat.slug}
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            title="Assigned Active Courses"
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-full flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            {assignedCoursesCount}
                          </span>

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              title="Edit Category"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategoryWithConfirm(cat.id, cat.name)}
                              title="Delete Category"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    💡 {isBn ? 'টিপস: ক্যাটাগরি তৈরি করলে এটি স্বয়ংক্রিয়ভাবে ড্রপডাউন এবং ফিল্টারে যুক্ত হবে।' : 'Tip: New categories appear immediately in course builders and catalog filters.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    {isBn ? 'বন্ধ করুন' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 11. VIDEO PREVIEW PLAYER POPUP */}
      {/* ========================================================================= */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-black w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-2">
                <Play className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                Lecture Video Stream Player
              </span>
              <button onClick={() => setPreviewVideoUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={previewVideoUrl}
                title="Lesson Video Stream"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

