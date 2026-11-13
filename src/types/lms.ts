export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'branch_manager'
  | 'teacher'
  | 'assistant_teacher'
  | 'accountant'
  | 'student'
  | 'guardian'
  | 'support_staff';

export type Language = 'en' | 'bn';

export interface User {
  id: string;
  name: string;
  nameBn?: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  branchId: string;
  isActive: boolean;
  studentId?: string; // e.g. AEC-2025-0824
  guardianStudentId?: string; // For guardian role to track ward
  joinedDate: string;
}

export interface Branch {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  managerName: string;
  studentCount: number;
  isActive?: boolean;
}

export interface Course {
  id: string;
  code?: string;
  branchId?: string;
  status?: 'draft' | 'published' | 'archived';
  maxSeats?: number;
  tags?: string[];
  title: string;
  titleBn: string;
  category: 'IELTS' | 'Spoken' | 'Grammar' | 'Writing' | 'Kids' | 'Corporate';
  subtitle: string;
  subtitleBn: string;
  description: string;
  descriptionBn: string;
  instructorName: string;
  instructorTitle: string;
  instructorAvatar: string;
  price: number; // In BDT
  originalPrice: number;
  durationWeeks: number;
  totalLessons: number;
  totalStudents: number;
  rating: number;
  reviewCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  thumbnail: string;
  featured: boolean;
  syllabus: {
    week: number;
    title: string;
    topics: string[];
  }[];
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleTitle: string;
  title: string;
  titleBn: string;
  durationMinutes: number;
  videoUrl: string; // YouTube or direct MP4
  isCompleted?: boolean;
  notes?: string;
  resources: {
    name: string;
    type: 'pdf' | 'doc' | 'audio' | 'zip';
    size: string;
    url: string;
  }[];
}

export interface LiveClass {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  instructorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  meetingPlatform: 'google_meet' | 'zoom' | 'teams';
  meetingUrl: string;
  meetingPassword?: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  recordingUrl?: string;
  branchId?: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  questionBn?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  marks: number;
}

export interface Exam {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  titleBn: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  negativeMarkPerWrong: number;
  questions: ExamQuestion[];
  status: 'active' | 'upcoming' | 'expired';
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, number>; // questionId -> selectedIndex
}

export interface PaymentRecord {
  id: string;
  invoiceNumber: string; // e.g. INV-2025-00412
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  amount: number; // in BDT (৳)
  method: 'bKash' | 'Nagad' | 'Bank Transfer' | 'Cash';
  trxId: string;
  date: string;
  status: 'verified' | 'pending' | 'rejected';
  branchId: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  courseId: string;
  branchId: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string; // AEC-CERT-2025-XXXX
  studentId: string;
  studentName: string;
  courseTitle: string;
  completionDate: string;
  grade: string;
  issueDate: string;
  verificationUrl: string;
  authorizedBy: string;
  status?: 'issued' | 'revoked';
  studentUserId?: number;
  courseId?: number;
  revokedAt?: string | null;
  revokeReason?: string | null;
}

export interface Notice {
  id: string;
  title: string;
  titleBn: string;
  content: string;
  contentBn: string;
  category: 'academic' | 'exam' | 'holiday' | 'event';
  date: string;
  isImportant: boolean;
  targetRole?: UserRole | 'all';
}

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  deadline: string;
  totalMarks: number;
  submissionsCount: number;
}

export interface BlogPost {
  id: string;
  title: string;
  titleBn: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  thumbnail: string;
  readTime: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface Testimonial {
  id: string;
  studentName: string;
  achievement: string;
  quote: string;
  quoteBn?: string;
  rating: number;
  avatar: string;
  course: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface SliderItem {
  id: string;
  title: string;
  titleBn: string;
  highlight: string;
  highlightBn: string;
  subtitle: string;
  subtitleBn: string;
  badge: string;
  badgeBn: string;
  imageUrl: string;
  buttonText: string;
  buttonTextBn: string;
  buttonLink: string;
  showTextOverlay?: boolean;
  isActive: boolean;
  order: number;
}

export interface CourseCategory {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  color: string;
  orderIndex: number;
  isActive: boolean;
  branchId?: string | null;
}

export interface HomepageThemeSettings {
  headingFont?: string;
  bodyFont?: string;
  baseFontSizePx?: number;
  headingWeight?: string;
  headingScale?: 'compact' | 'standard' | 'large';
  primaryColor?: string;
  secondaryColor?: string;
  accentCyanColor?: string;
  accentEmeraldColor?: string;
  learningPathTitleColor?: string;
  heroBgTop?: string;
  heroBgBottom?: string;
  bentoLeftBgTop?: string;
  bentoLeftBgBottom?: string;
  bentoRightBgTop?: string;
  bentoRightBgBottom?: string;
  lightCanvasStart?: string;
  lightCanvasMid?: string;
  lightCanvasEnd?: string;
  navbarBg?: string;
  cardBg?: string;
  reviewsBgTop?: string;
  reviewsBgBottom?: string;
  reviewsCardBg?: string;
  footerBg?: string;
  footerTextColor?: string;
  loginButtonColor?: string;
}

export interface HomepageSectionVisibility {
  showUtilityStrip?: boolean;
  showSlider?: boolean;
  showStats?: boolean;
  showLearningPaths?: boolean;
  showCourses?: boolean;
  showCombo?: boolean;
  showInstructors?: boolean;
  showWhyUs?: boolean;
  showAppBanner?: boolean;
  showEbooks?: boolean;
  showResultPortal?: boolean;
  showReviews?: boolean;
  showFaq?: boolean;
  showBranches?: boolean;
}

export interface HomepageStat {
  value: string;
  labelEn: string;
  labelBn: string;
  highlight?: boolean;
}

export interface HomepageLearningPathItem {
  id: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  theme: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink';
  targetCat: string;
}

export interface HomepageEbookItem {
  id: string;
  title: string;
  titleBn: string;
  category: string;
  summary: string;
  summaryBn: string;
  price: number;
  originalPrice?: number;
  isFree: boolean;
  pages: number;
  colorTheme: 'sky' | 'emerald' | 'purple' | 'indigo';
  topics: string[];
  author?: string;
  pdfUrl?: string;
  coverImageUrl?: string;
  isActive?: boolean;
}

export interface HomepageProductItem {
  id: string;
  title: string;
  titleBn: string;
  category: string;
  description: string;
  descriptionBn: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  imageUrl: string;
  isActive?: boolean;
}

export interface HomepageInstructorItem {
  id: string;
  name: string;
  nameBn: string;
  subject: string;
  subjectBn: string;
  role: string;
  roleBn: string;
  credentials: string;
  credentialsBn: string;
  avatar: string;
  youtubeUrl?: string;
  facebookUrl?: string;
}

export interface HomepageFaqItem {
  id: string;
  q: string;
  qBn: string;
  a: string;
  aBn: string;
}

export interface HomepageFooterSettings {
  missionEn: string;
  missionBn: string;
  licenseNo: string;
  copyrightText: string;
  showPaymentStrip: boolean;
}

export interface HomepageBentoSettings {
  badgeEn: string; badgeBn: string;
  titleEn: string; titleBn: string;
  subtitleEn: string; subtitleBn: string;
  track1TitleEn: string; track1TitleBn: string; track1DescEn: string; track1DescBn: string; track1Cat: string;
  track2TitleEn: string; track2TitleBn: string; track2DescEn: string; track2DescBn: string; track2Cat: string;
}

export interface HomepageComboOffer {
  enabled: boolean;
  courseId?: string | number;
  eyebrowEn: string; eyebrowBn: string;
  titleEn: string; titleBn: string;
  descEn: string; descBn: string;
  bulletsEn: string[]; bulletsBn: string[];
  price: number; originalPrice: number;
  ctaEn: string; ctaBn: string;
}

export interface HomepageWhyUsPillar {
  num: string;
  titleEn: string; titleBn: string;
  descEn: string; descBn: string;
}

export interface HomepageWhyUsSection {
  eyebrowEn: string; eyebrowBn: string;
  titleEn: string; titleBn: string;
  pillars: HomepageWhyUsPillar[];
}

export interface HomepageAppBannerSection {
  eyebrowEn: string; eyebrowBn: string;
  titleEn: string; titleBn: string;
  descEn: string; descBn: string;
  imageUrl: string;
  feature1TitleEn: string; feature1TitleBn: string;
  feature1DescEn: string; feature1DescBn: string;
  feature2TitleEn: string; feature2TitleBn: string;
  feature2DescEn: string; feature2DescBn: string;
  primaryCtaEn: string; primaryCtaBn: string;
  secondaryCtaEn: string; secondaryCtaBn: string;
}

export interface HomepageInstructorsSection {
  titleEn: string; titleBn: string;
  subtitleEn: string; subtitleBn: string;
  panelLabelEn: string; panelLabelBn: string;
}

export interface HomepageEbooksSection { titleEn: string; titleBn: string; }
export interface HomepageProductsSection {
  eyebrowEn: string; eyebrowBn: string;
  titleEn: string; titleBn: string;
  subtitleEn: string; subtitleBn: string;
}
export interface HomepageResultPortalSection {
  titleEn: string; titleBn: string;
  subtitleEn: string; subtitleBn: string;
  cardTitleEn: string; cardTitleBn: string;
  cardDescEn: string; cardDescBn: string;
}
export interface HomepagePathsSection {
  titleEn: string; titleBn: string;
  subtitleEn: string; subtitleBn: string;
}
export interface HomepageCoursesSection {
  eyebrowEn: string; eyebrowBn: string;
  titleEn: string; titleBn: string;
  subtitleEn: string; subtitleBn: string;
}

export interface WebsiteSettings {
  siteName: string;
  siteNameBn: string;
  tagline: string;
  taglineBn: string;
  hotline: string;
  email: string;
  heroHeadline: string;
  heroHighlight: string;
  heroSubtitle: string;
  bkashNumber: string;
  nagadNumber: string;
  noticeTicker: string;
  showAdmissionBanner: boolean;
  showLiveClassesNotice: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  logoText?: string;
  logoTagline?: string;
  logoStyle?: 'icon_and_text' | 'image_only' | 'text_only';
  sliders: SliderItem[];
  sliderAutoPlay: boolean;
  sliderIntervalSec: number;
  address: string;
  addressBn: string;
  chittagongAddress?: string;
  chittagongAddressBn?: string;
  supportHours: string;
  supportHoursBn: string;
  whatsappNumber: string;
  facebookPage: string;
  youtubeChannel: string;
  emergencyNotice?: string;
  enableNoticeRibbon?: boolean;
  googleMapEmbedUrl?: string;
  homepageSections?: HomepageSectionVisibility;
  bentoOngoing?: HomepageBentoSettings;
  heroStats?: HomepageStat[];
  pathsSection?: HomepagePathsSection;
  learningPaths?: HomepageLearningPathItem[];
  coursesSection?: HomepageCoursesSection;
  comboOffer?: HomepageComboOffer;
  instructorsSection?: HomepageInstructorsSection;
  instructors?: HomepageInstructorItem[];
  whyUsSection?: HomepageWhyUsSection;
  appBannerSection?: HomepageAppBannerSection;
  ebooksSection?: HomepageEbooksSection;
  ebooks?: HomepageEbookItem[];
  resultPortalSection?: HomepageResultPortalSection;
  faqItems?: HomepageFaqItem[];
  footerSettings?: HomepageFooterSettings;
  productsSection?: HomepageProductsSection;
  products?: HomepageProductItem[];
  themeSettings?: HomepageThemeSettings;
}

export interface ExpenseRecord {
  id: string;
  category: 'Instructor Remuneration' | 'Branch Rent' | 'Electricity & Utility' | 'Marketing & Ads' | 'Software & Hosting' | 'Stationery';
  title: string;
  amount: number;
  date: string;
  paidTo: string;
  branchId: string;
  approvedBy: string;
}

export interface RolePermission {
  role: UserRole;
  title: string;
  canManageUsers: boolean;
  canManageCourses: boolean;
  canManagePayments: boolean;
  canMarkAttendance: boolean;
  canCreateExams: boolean;
  canGradeAssignments: boolean;
  canIssueCertificates: boolean;
  canEditCMS: boolean;
  canViewReports: boolean;
  canExportDatabase: boolean;
}

export interface SecurityAuditItem {
  id: string;
  category: 'authentication' | 'database' | 'input_validation' | 'session' | 'file_security' | 'cryptography';
  title: string;
  description: string;
  status: 'passed' | 'warning' | 'critical';
  details: string;
  cpanelFix: string;
}

export interface SystemTestResult {
  id: string;
  stepNumber: number;
  stepTitleBn: string;
  stepTitleEn: string;
  testCases: {
    name: string;
    passed: boolean;
    durationMs: number;
    notes: string;
  }[];
}

// ============================================================================
// SAAS MULTI-TENANCY & INSTITUTION MANAGEMENT
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  nameBn?: string;
  slug: string;
  subdomain: string;
  customDomain?: string;
  logo: string;
  contactEmail: string;
  phone: string;
  status: 'active' | 'suspended' | 'trial';
  planId: 'free' | 'basic' | 'standard' | 'professional' | 'enterprise';
  maxStudents: number;
  maxTeachers: number;
  maxStorageGb: number;
  billingCycle: 'monthly' | 'yearly';
  monthlyFee: number;
  subscriptionExpiresAt: string;
  city: string;
  address: string;
  createdAt: string;
}

export interface SaaSPlan {
  id: 'free' | 'basic' | 'standard' | 'professional' | 'enterprise';
  name: string;
  nameBn: string;
  priceMonthly: number;
  priceYearly: number;
  maxStudents: number;
  maxCourses: number;
  maxBranches: number;
  maxStorageGb: number;
  features: string[];
  featuresBn: string[];
  isPopular?: boolean;
}

export interface SaaSSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: 'bKash' | 'Nagad' | 'SSLCommerz' | 'Stripe' | 'Bank Transfer';
  trxId: string;
  invoiceNumber: string;
  paidAt: string;
  nextBillingDate: string;
}

// ============================================================================
// ADVANCED ACADEMIC & BATCH MANAGEMENT
// ============================================================================

export interface Batch {
  id: string;
  courseId: string;
  courseTitle: string;
  name: string;
  nameBn?: string;
  batchCode: string; // e.g. AEC-IELTS-B24
  schedule: string; // e.g. Sun, Tue, Thu · 06:00 PM - 07:30 PM
  roomNumber: string;
  branchId: string;
  instructorId: string;
  instructorName: string;
  maxCapacity: number;
  enrolledStudentsCount: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface ClassRoutineSlot {
  id: string;
  batchId: string;
  batchName: string;
  courseTitle: string;
  dayOfWeek: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  dayOfWeekBn: string;
  startTime: string; // e.g. 10:00 AM
  endTime: string;   // e.g. 11:30 AM
  subject: string;   // e.g. IELTS Reading & Vocabulary
  instructorName: string;
  roomNumber: string;
  branchName: string;
}

export interface QuestionBankItem {
  id: string;
  subject: string;
  category: 'IELTS Academic' | 'IELTS General' | 'Spoken English' | 'Grammar' | 'Phonetics' | 'Vocabulary';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  question: string;
  questionBn?: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  explanation: string;
  authorName: string;
  createdDate: string;
}

export interface MarksheetRecord {
  id: string;
  marksheetNumber: string; // e.g. AEC-MS-2025-0102
  studentId: string;
  studentName: string;
  courseTitle: string;
  batchCode: string;
  examTitle: string;
  examDate: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  grade: 'A+' | 'A' | 'A-' | 'B' | 'C' | 'F';
  gpa: number; // e.g. 5.00
  remarks: string;
  instructorName: string;
  issuedDate: string;
}

// ============================================================================
// CAMPUS FACILITIES: LIBRARY, TRANSPORT & HOSTEL
// ============================================================================

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: 'IELTS Preparation' | 'English Grammar' | 'British Literature' | 'Spoken & Idioms' | 'Vocabulary';
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string; // e.g. Shelf A-3
  borrowedCount: number;
}

export interface TransportRoute {
  id: string;
  routeName: string;
  routeNameBn: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  monthlyFee: number;
  stops: string[];
  capacity: number;
  activePassengers: number;
}

export interface HostelRoom {
  id: string;
  buildingName: string;
  roomNumber: string;
  roomType: 'Single Executive' | 'Double Shared' | 'Four Bed Dormitory';
  monthlyRent: number;
  capacity: number;
  occupied: number;
  facilities: string[];
  wardenContact: string;
}

// ============================================================================
// NOTIFICATION & BROADCAST CENTER
// ============================================================================

export interface AppNotification {
  id: string;
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  type: 'info' | 'alert' | 'success' | 'warning';
  timestamp: string;
  isRead: boolean;
  targetRole: UserRole | 'all';
  actionUrl?: string;
}

// ============================================================================
// 1. PLUGIN-READY MODULAR INTEGRATION ARCHITECTURE
// ============================================================================

export interface PluginItem {
  id: string;
  name: string;
  nameBn: string;
  category: 'payment' | 'live_class' | 'communication' | 'analytics' | 'security';
  version: string;
  author: string;
  isEnabled: boolean;
  status: 'connected' | 'configured' | 'pending_keys' | 'disabled';
  description: string;
  descriptionBn: string;
  iconName: string;
  configFields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'boolean';
    value: string;
    placeholder?: string;
    isSecret?: boolean;
    options?: string[];
  }[];
  webhookUrl?: string;
  documentationUrl?: string;
}

// ============================================================================
// 2. RECYCLE BIN & SOFT DELETE ARCHITECTURE
// ============================================================================

export interface RecycleBinItem {
  id: string;
  itemType: 'course' | 'batch' | 'exam' | 'user' | 'payment' | 'notice';
  originalId: string;
  title: string;
  deletedAt: string;
  deletedBy: string;
  retentionDaysLeft: number;
  dataSnapshot: any;
}

// ============================================================================
// 3. TEACHER COMMISSION, EARNINGS & PAYOUT ARCHITECTURE
// ============================================================================

export interface TeacherCommission {
  id: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseTitle: string;
  commissionPercentage: number; // e.g. 60%
  totalEnrolledStudents: number;
  totalCourseRevenue: number;
  grossCommission: number;
  paidCommission: number;
  pendingBalance: number;
  lastPayoutDate?: string;
}

export interface PayoutRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  payoutMethod: 'bKash' | 'Nagad' | 'Bank Transfer';
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  transactionId?: string;
  remarks?: string;
}

// ============================================================================
// 4. MARKETING, SEO & ANALYTICS ARCHITECTURE
// ============================================================================

export interface MarketingSettings {
  googleAnalyticsId: string; // G-XXXXXXXXXX
  googleTagManagerId: string; // GTM-XXXXXXX
  metaPixelId: string; // 1234567890
  googleSearchConsoleToken: string;
  metaConversionApiToken?: string;
  siteTitleSeo: string;
  siteMetaDescription: string;
  canonicalUrl: string;
  robotsTxtContent: string;
  sitemapXmlGeneratedAt: string;
}

// ============================================================================
// 5. ENVATO CODECANYON & CPANEL RELEASE PACKAGES
// ============================================================================

export interface EnvatoLicenseInfo {
  purchaseCode: string;
  licenseType: 'Regular License' | 'Extended License';
  buyerUsername: string;
  supportedUntil: string;
  itemVersion: string;
  isValid: boolean;
  domain: string;
}

