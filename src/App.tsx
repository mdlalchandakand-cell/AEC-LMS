import React, { useState } from 'react';
import { LmsProvider, useLms } from './context/LmsContext';
import { PublicNavbar } from './components/layout/PublicNavbar';
import { DashboardSidebar } from './components/layout/DashboardSidebar';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { PublicFooter } from './components/layout/PublicFooter';
import { HeroSection } from './components/public/HeroSection';
import { ExamsPage } from './components/public/ExamsPage';
import { LearnPage } from './components/public/LearnPage';
import { InstructorsPage } from './components/public/InstructorsPage';
import { ProductsPage } from './components/public/ProductsPage';
import { EbooksPage } from './components/public/EbooksPage';
import { CourseCatalogManager } from './components/modules/CourseCatalogManager';
import { StorefrontOrdersManager } from './components/modules/StorefrontOrdersManager';
import { StorefrontCatalogManager } from './components/modules/StorefrontCatalogManager';
import { AdmissionModal } from './components/public/AdmissionModal';
import { CertificateVerifyModal } from './components/public/CertificateVerifyModal';
import { VideoPreviewModal } from './components/public/VideoPreviewModal';
import { AdminOverview } from './components/dashboard/AdminOverview';
import { StudentOverview } from './components/dashboard/StudentOverview';
import { TeacherOverview } from './components/dashboard/TeacherOverview';
import { AccountantOverview } from './components/dashboard/AccountantOverview';
import { GuardianOverview } from './components/dashboard/GuardianOverview';
import { StudentManagement } from './components/modules/StudentManagement';
import { StudentIdCardModal } from './components/modules/StudentIdCardModal';
import { ClassroomViewer } from './components/modules/ClassroomViewer';
import { ExamSimulator } from './components/modules/ExamSimulator';
import { ExamManagement } from './components/modules/ExamManagement';
import { ExamPortal } from './components/modules/ExamPortal';
import { PaymentApiPanel } from './components/modules/PaymentApiPanel';
import { LoginPage } from './components/public/LoginPage';
import { LiveClassManager } from './components/modules/LiveClassManager';
import { AttendanceManager } from './components/modules/AttendanceManager';
import { CertificateManager } from './components/modules/CertificateManager';
import { StudentCertificates } from './components/modules/StudentCertificates';
import { ProfileSettings } from './components/modules/ProfileSettings';
import { CPanelPackageExporter } from './components/modules/CPanelPackageExporter';
import { RoadmapTracker } from './components/modules/RoadmapTracker';
import { DatabaseMigrationManager } from './components/modules/DatabaseMigrationManager';
import { AuthPermissionManager } from './components/modules/AuthPermissionManager';
import { UserManagement } from './components/modules/UserManagement';
import { EnrollmentManagement } from './components/modules/EnrollmentManagement';
import { CmsManager } from './components/modules/CmsManager';
import { SecurityAuditConsole } from './components/modules/SecurityAuditConsole';
import { CourseBuilderModal } from './components/modules/CourseBuilderModal';
import { ContentLibraryManager } from './components/modules/ContentLibraryManager';
import { SiteSettingsManager } from './components/modules/SiteSettingsManager';
import { SuperAdminSaaSPanel } from './components/modules/SuperAdminSaaSPanel';
import { BatchRoutineManager } from './components/modules/BatchRoutineManager';
import { QuestionBankMarksheetManager } from './components/modules/QuestionBankMarksheetManager';
import { CampusFacilitiesManager } from './components/modules/CampusFacilitiesManager';
import { NotificationCenterModal } from './components/modules/NotificationCenterModal';
import { ConfirmDeleteModal } from './components/common/ConfirmDeleteModal';
import { PluginManager } from './components/modules/PluginManager';
import { RecycleBinManager } from './components/modules/RecycleBinManager';
import { TeacherCommissionManager } from './components/modules/TeacherCommissionManager';
import { ExpenseManager } from './components/modules/ExpenseManager';
import { MarketingAnalyticsManager } from './components/modules/MarketingAnalyticsManager';
import { EnvatoPackageExporter } from './components/modules/EnvatoPackageExporter';
import { BranchManagement } from './components/modules/BranchManagement';
import { Course, User } from './types/lms';
import { 
  BookOpen, Star, ArrowRight, Play, CheckCircle2, 
  MapPin, Phone, Mail, Award, Users, ShieldCheck, Download, Plus, Trash2 
} from 'lucide-react';

function LmsApp() {
  const { 
    currentUser, activeView, setActiveView, language, t, isAuthenticated, authLoading, 
    courses, activeExamId, setActiveExamId, activeClassroomId, setActiveClassroomId,
    activeIdCardStudent, setActiveIdCardStudent, deleteCourse, softDeleteCourse 
  } = useLms();

  const [currentDashboardTab, setCurrentDashboardTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [selectedCourseForAdmission, setSelectedCourseForAdmission] = useState<Course | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCourseBuilder, setShowCourseBuilder] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const handleOpenAdmission = (course?: Course) => {
    setSelectedCourseForAdmission(course || null);
    setShowAdmissionModal(true);
  };

  const handleStartCourse = (courseId: string) => {
    setActiveClassroomId(courseId);
    setActiveView('classroom');
  };

  const handleLaunchExam = (examId?: string) => {
    setActiveExamId(examId || 'ex_ielts_01');
    setActiveView('take_exam');
  };

  const handlePrintIdCard = (student: User) => {
    setActiveIdCardStudent(student);
  };

  // Render Dashboard main contents based on active tab
  const renderDashboardContent = () => {
    switch (currentDashboardTab) {
      case 'overview':
        if (currentUser.role === 'student') {
          return (
            <StudentOverview
              onNavigateTab={setCurrentDashboardTab}
              onContinueCourse={handleStartCourse}
              onTakeExam={handleLaunchExam}
            />
          );
        } else if (currentUser.role === 'teacher' || currentUser.role === 'assistant_teacher') {
          return <TeacherOverview onNavigateTab={setCurrentDashboardTab} />;
        } else if (currentUser.role === 'accountant') {
          return <AccountantOverview onNavigateTab={setCurrentDashboardTab} />;
        } else if (currentUser.role === 'guardian') {
          return <GuardianOverview onNavigateTab={setCurrentDashboardTab} />;
        } else if (currentUser.role === 'branch_manager') {
          return <BranchManagement />;
        } else {
          return <AdminOverview onNavigateTab={setCurrentDashboardTab} />;
        }

      case 'profile':
        return <ProfileSettings />;

      case 'roadmap':
        return <RoadmapTracker onSelectStepTab={setCurrentDashboardTab} />;

      case 'migrations':
        return <DatabaseMigrationManager />;

      case 'permissions':
        return <AuthPermissionManager />;

      case 'users_admin':
        return <UserManagement />;

      case 'branch_management':
      case 'branch_info':
        return <BranchManagement />;

      case 'enrollments_admin':
        return <EnrollmentManagement />;

      case 'cms':
        return currentUser.role === 'admin' || currentUser.role === 'super_admin'
          ? <CmsManager />
          : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">CMS management permission is required.</div>;

      case 'site_settings':
        return currentUser.role === 'admin' || currentUser.role === 'super_admin'
          ? <SiteSettingsManager />
          : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Website settings permission is required.</div>;

      case 'security':
        return <SecurityAuditConsole />;

      case 'students':
        return (
          <StudentManagement
            onPrintIdCard={handlePrintIdCard}
            onOpenAdmission={() => handleOpenAdmission()}
          />
        );

      case 'courses':
        if (currentUser.role !== 'student') {
          return (
            <CourseCatalogManager
              onStartCourse={handleStartCourse}
              onLaunchExam={handleLaunchExam}
              onOpenCreateModal={() => setShowCourseBuilder(true)}
              onDeleteCourse={setCourseToDelete}
            />
          );
        }
      case 'my_courses':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {currentUser.role === 'student' ? 'My Enrolled Courses' : 'Course Management & Curriculum'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cambridge & British Council aligned syllabus with video lectures and resources
                </p>
              </div>

              {currentUser.role !== 'student' && (
                <button
                  onClick={() => setShowCourseBuilder(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Course</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div className="relative h-48 bg-slate-900">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs uppercase tracking-wider">
                      {course.category}
                    </span>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{course.subtitle}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Instructor: <strong className="text-slate-800">{course.instructorName}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentUser.role !== 'student' && (
                          <button
                            onClick={() => setCourseToDelete(course)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Delete Course (With Confirmation)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleStartCourse(course.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Launch Classroom</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && <ContentLibraryManager />}
          </div>
        );

      case 'online_exam':
      case 'exams':
        return currentUser.role === 'admin' || currentUser.role === 'super_admin'
          ? <ExamManagement />
          : <ExamPortal onStartExam={handleLaunchExam} />;

      case 'my_results':
        return <ExamPortal onStartExam={handleLaunchExam} showResults />;

      case 'live_classes':
        return <LiveClassManager />;

      case 'expenses':
        return <ExpenseManager />;

      case 'payments':
      case 'my_payments':
        return <PaymentApiPanel />;

      case 'attendance':
      case 'ward_attendance':
        return <AttendanceManager />;

      case 'certificates':
        return currentUser.role === 'student' ? <StudentCertificates /> : <CertificateManager />;

      case 'enrollments':
        return <EnrollmentManagement />;

      case 'saas_superadmin':
        return <SuperAdminSaaSPanel />;

      case 'batches_routine':
        return <BatchRoutineManager />;

      case 'question_bank_marksheets':
        return <QuestionBankMarksheetManager />;

      case 'facilities':
        return <CampusFacilitiesManager />;

      case 'reports':
      case 'reports_analytics':
        return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Reporting is temporarily unavailable until the complete API-backed, branch-scoped reporting module and its integration tests are delivered. No local demo figures are presented as live financial data.</div>;

      case 'cpanel_export':
        return <CPanelPackageExporter />;

      case 'plugins':
        return <PluginManager />;

      case 'recycle_bin':
        return <RecycleBinManager />;

      case 'teacher_commissions':
        return <TeacherCommissionManager />;

      case 'marketing_analytics':
        return <MarketingAnalyticsManager />;

      case 'envato_packages':
        return <EnvatoPackageExporter />;

      case 'id_card':
        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Student Identity Card</h3>
            <p className="text-xs text-slate-500">Official student identity card for Rafiq Hasan</p>
            <button
              onClick={() => handlePrintIdCard(currentUser)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
            >
              Open Printable ID Card
            </button>
          </div>
        );

      default:
        return <AdminOverview onNavigateTab={setCurrentDashboardTab} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* 1. PUBLIC WEBSITE VIEWS */}
      {activeView === 'home' && (
        <>
          <PublicNavbar
            onOpenAdmission={() => handleOpenAdmission()}
            onOpenVerifyModal={() => setShowVerifyModal(true)}
            onOpenVideoPreview={() => setShowVideoModal(true)}
          />
          <main className="flex-1">
            <HeroSection
              onOpenAdmission={handleOpenAdmission}
              onOpenVideoPreview={() => setShowVideoModal(true)}
              onSelectCourse={handleOpenAdmission}
            />
          </main>
          <PublicFooter />
        </>
      )}

      {/* 2. PUBLIC COURSES PAGE */}
      {activeView === 'courses' && (
        <>
          <PublicNavbar
            onOpenAdmission={() => handleOpenAdmission()}
            onOpenVerifyModal={() => setShowVerifyModal(true)}
            onOpenVideoPreview={() => setShowVideoModal(true)}
          />
          <main className="flex-1 py-12 px-4 sm:px-8 max-w-7xl mx-auto space-y-10 w-full">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                All English Language & IELTS Courses
              </h1>
              <p className="text-sm text-slate-500">
                Explore our accredited programs taught by British Council and IDP certified mentors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-shadow flex flex-col">
                  <div className="relative h-56 bg-slate-900">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    <span className="absolute top-4 left-4 px-3 py-1 rounded bg-blue-600 text-white font-bold text-xs uppercase tracking-wider">
                      {course.category}
                    </span>
                    <span className="absolute bottom-4 right-4 px-3 py-1 rounded bg-slate-950/80 text-amber-300 font-bold text-xs">
                      {course.durationWeeks} Weeks Intensive
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-xl text-slate-900">{course.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>
                    </div>

                    {/* Syllabus summary */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <span className="font-bold text-slate-900 block">Curriculum Highlights:</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        {course.syllabus.slice(0, 3).map((s, i) => (
                          <li key={i}><strong>Week {s.week}:</strong> {s.title}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xl font-extrabold text-blue-700">
                          {t.currency} {course.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400 line-through">
                          {t.currency} {course.originalPrice.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartCourse(course.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                        >
                          View Curriculum
                        </button>
                        <button
                          onClick={() => handleOpenAdmission(course)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                        >
                          Enroll Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
          <PublicFooter />
        </>
      )}

      {/* 3. PUBLIC ABOUT PAGE */}
      {activeView === 'exams' && (
        <>
          <PublicNavbar onOpenAdmission={() => handleOpenAdmission()} onOpenVerifyModal={() => setShowVerifyModal(true)} />
          <ExamsPage onLaunchExam={handleLaunchExam} />
          <PublicFooter />
        </>
      )}

      {activeView === 'learn' && (
        <>
          <PublicNavbar onOpenAdmission={() => handleOpenAdmission()} onOpenVerifyModal={() => setShowVerifyModal(true)} />
          <LearnPage />
          <PublicFooter />
        </>
      )}

      {activeView === 'instructors' && (
        <>
          <PublicNavbar onOpenAdmission={() => handleOpenAdmission()} onOpenVerifyModal={() => setShowVerifyModal(true)} />
          <InstructorsPage />
          <PublicFooter />
        </>
      )}

      {activeView === 'products' && (
        <>
          <PublicNavbar onOpenAdmission={() => handleOpenAdmission()} onOpenVerifyModal={() => setShowVerifyModal(true)} />
          <ProductsPage />
          <PublicFooter />
        </>
      )}

      {activeView === 'ebooks' && (
        <>
          <PublicNavbar onOpenAdmission={() => handleOpenAdmission()} onOpenVerifyModal={() => setShowVerifyModal(true)} />
          <EbooksPage />
          <PublicFooter />
        </>
      )}

      {activeView === 'about' && (
        <>
          <PublicNavbar
            onOpenAdmission={() => handleOpenAdmission()}
            onOpenVerifyModal={() => setShowVerifyModal(true)}
            onOpenVideoPreview={() => setShowVideoModal(true)}
          />
          <main className="flex-1 py-16 px-4 sm:px-8 max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                About Alom's English Center
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Empowering Bangladesh with Confident English Fluency
              </h1>
              <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Founded by Engr. Mahbubul Alom, Alom's English Center has grown into one of Bangladesh's most trusted institutes for Cambridge IELTS, spoken confidence, and career-defining English communication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80"
                alt="Alom's English Center Classroom"
                className="rounded-xl w-full h-72 object-cover"
              />
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Why Students Choose Alom Sir</h3>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>100% Practical Speaking:</strong> No translation memory, active speaking drills from Day 1.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Cambridge & IDP Certified Mentors:</strong> All lead trainers have achieved IELTS Band 8.5+.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Multi-Campus & Online:</strong> Mirpur 10, Dhanmondi, Chittagong, Sylhet, and live global Zoom/Meet.</span>
                  </li>
                </ul>
              </div>
            </div>
          </main>
          <PublicFooter />
        </>
      )}

      {/* 4. PUBLIC CONTACT PAGE */}
      {activeView === 'contact' && (
        <>
          <PublicNavbar
            onOpenAdmission={() => handleOpenAdmission()}
            onOpenVerifyModal={() => setShowVerifyModal(true)}
            onOpenVideoPreview={() => setShowVideoModal(true)}
          />
          <main className="flex-1 py-16 px-4 sm:px-8 max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Contact & Campus Helplines
              </h1>
              <p className="text-sm text-slate-500">
                Visit our campuses or reach our 24/7 admission desk via call / WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span>Dhaka Main Campus (Mirpur 10)</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Plot 14, Sector 6, Mirpur 10 Roundabout (Opposite to Fire Service), Dhaka-1216.
                </p>
                <div className="space-y-1 text-xs text-slate-600 font-mono">
                  <div>Hotline: +880 1712 345678</div>
                  <div>WhatsApp: +880 1711 001122</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span>Chittagong Branch (GEC Circle)</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  CDA Avenue, GEC Circle (Adjacent to Sanmar Ocean City), Chattogram.
                </p>
                <div className="space-y-1 text-xs text-slate-600 font-mono">
                  <div>Hotline: +880 1819 556677</div>
                </div>
              </div>
            </div>
          </main>
          <PublicFooter />
        </>
      )}

      {/* 5. INTERACTIVE CLASSROOM VIEW */}
      {activeView === 'classroom' && isAuthenticated && (
        <div className="min-h-screen bg-slate-100 flex flex-col">
          <DashboardHeader title="Interactive Virtual Classroom" />
          <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
            <ClassroomViewer
              courseId={activeClassroomId || 'crs_ielts'}
              onBack={() => setActiveView('dashboard')}
            />
          </div>
        </div>
      )}

      {/* 6. ONLINE EXAM SIMULATOR VIEW */}
      {activeView === 'take_exam' && isAuthenticated && (
        <div className="min-h-screen bg-slate-100 flex flex-col">
          <DashboardHeader title="Online Examination Engine" />
          <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
            <ExamSimulator
              examId={activeExamId || 'ex_ielts_01'}
              onExit={() => setActiveView('dashboard')}
            />
          </div>
        </div>
      )}

      {['dashboard', 'classroom', 'take_exam'].includes(activeView) && !isAuthenticated && !authLoading && <LoginPage />}
      {authLoading && ['dashboard', 'classroom', 'take_exam'].includes(activeView) && <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking secure session…</div>}

      {/* 7. FULL LMS ROLE-BASED DASHBOARD */}
      {activeView === 'login' && <LoginPage />}

      {activeView === 'dashboard' && isAuthenticated && (
        <div className="flex min-h-screen bg-slate-100">
          {/* Sidebar */}
          <DashboardSidebar
            currentTab={currentDashboardTab}
            setCurrentTab={setCurrentDashboardTab}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader
              onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onOpenNotifications={() => setShowNotificationModal(true)}
            />

            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto">
                {renderDashboardContent()}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* GLOBAL MODALS */}
      <NotificationCenterModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onNavigateTab={(tab) => {
          setCurrentDashboardTab(tab);
          setShowNotificationModal(false);
        }}
      />

      <AdmissionModal
        isOpen={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
        preSelectedCourse={selectedCourseForAdmission}
      />

      <CertificateVerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
      />

      <VideoPreviewModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
      />

      <StudentIdCardModal
        isOpen={Boolean(activeIdCardStudent)}
        onClose={() => setActiveIdCardStudent(null)}
        student={activeIdCardStudent}
      />

      <CourseBuilderModal
        isOpen={showCourseBuilder}
        onClose={() => setShowCourseBuilder(false)}
      />

      {/* Confirmation Modal to Prevent Accidental Course Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(courseToDelete)}
        onClose={() => setCourseToDelete(null)}
        onConfirm={async () => {
          if (!courseToDelete) return false;
          const archived = await softDeleteCourse(courseToDelete.id);
          if (archived) setCourseToDelete(null);
          return archived;
        }}
        title="Confirm Course Archival"
        titleBn="কোর্স মুছে ফেলার নিশ্চিতকরণ"
        itemName={courseToDelete ? `${courseToDelete.title} (${courseToDelete.category})` : ''}
        message="Are you sure you want to move this course to the Recycle Bin? It will be safely retained in the Recycle Bin for 30 days, where you can restore it anytime with complete syllabus, lessons, and progress intact."
        messageBn="আপনি কি নিশ্চিতভাবে এই কোর্সটি রিসাইকেল বিনে সরাতে চান? এটি পরবর্তী ৩০ দিন রিসাইকেল বিনে সুরক্ষিত থাকবে এবং যেকোনো সময় সম্পূর্ণ সিলেবাস ও লেসনসহ পুনরুদ্ধার করা যাবে।"
        confirmText="Yes, Move to Recycle Bin"
        confirmTextBn="হ্যাঁ, রিসাইকেল বিনে সরান"
        requireTyping={false}
        language={language}
      />

    </div>
  );
}

export default function App() {
  return (
    <LmsProvider>
      <LmsApp />
    </LmsProvider>
  );
}
