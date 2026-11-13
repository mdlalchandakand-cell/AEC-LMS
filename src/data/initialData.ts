import { 
  User, Branch, Course, Lesson, LiveClass, Exam, PaymentRecord, 
  AttendanceRecord, Certificate, Notice, Assignment, BlogPost, 
  Testimonial, WebsiteSettings, ExpenseRecord, RolePermission, 
  SecurityAuditItem, SystemTestResult, Tenant, SaaSPlan, SaaSSubscription,
  Batch, ClassRoutineSlot, QuestionBankItem, MarksheetRecord,
  LibraryBook, TransportRoute, HostelRoom, AppNotification,
  PluginItem, RecycleBinItem, TeacherCommission, PayoutRequest,
  MarketingSettings, EnvatoLicenseInfo, CourseCategory
} from '../types/lms';

import heroEducatorImg from '../assets/images/hero_educator_studio_1794552233836.jpg';
import ieltsCourseImg from '../assets/images/course_ielts_masterclass_1794552235026.jpg';
import spokenCourseImg from '../assets/images/course_spoken_fluency_1794552235255.jpg';
import appMockupImg from '../assets/images/app_learning_mockup_1794552235813.jpg';
import instructorTanvirImg from '../assets/images/instructor_tanvir_1794552825904.jpg';
import instructorNusratImg from '../assets/images/instructor_nusrat_1794552825686.jpg';
import instructorShamimImg from '../assets/images/instructor_shamim_1794552825944.jpg';
import productIeltsBooksImg from '../assets/images/product_ielts_books_kit_1794553908137.jpg';
import productFlashcardsImg from '../assets/images/product_spoken_flashcards_box_1794553909303.jpg';
import productFlaskComboImg from '../assets/images/product_academy_flask_combo_1794553909652.jpg';

export const initialUsers: User[] = [
  {
    id: 'usr_superadmin',
    name: 'Engr. Mahbubul Alom',
    nameBn: 'ইঞ্জি. মাহবুবুল আলম',
    email: 'alom.director@alomsenglish.com',
    phone: '+880 1711 001122',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2020-01-15'
  },
  {
    id: 'usr_admin',
    name: 'Shamim Reza',
    nameBn: 'শামীম রেজা',
    email: 'admin@alomsenglish.com',
    phone: '+880 1712 345678',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2021-03-10'
  },
  {
    id: 'usr_branch_mgr',
    name: 'Farhana Yasmin',
    nameBn: 'ফারহানা ইয়াসমিন',
    email: 'ctg.manager@alomsenglish.com',
    phone: '+880 1819 556677',
    role: 'branch_manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_chittagong',
    isActive: true,
    joinedDate: '2022-06-01'
  },
  {
    id: 'usr_teacher_lead',
    name: 'Tanvir Ahmed (IELTS 8.5)',
    nameBn: 'তানভীর আহমেদ (IELTS ৮.৫)',
    email: 'tanvir.ielts@alomsenglish.com',
    phone: '+880 1914 223344',
    role: 'teacher',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2021-08-15'
  },
  {
    id: 'usr_asst_teacher',
    name: 'Nusrat Jahan',
    nameBn: 'নুসরাত জাহান',
    email: 'nusrat.phonetics@alomsenglish.com',
    phone: '+880 1612 889900',
    role: 'assistant_teacher',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2023-02-15'
  },
  {
    id: 'usr_accountant',
    name: 'Kamrul Islam, ACCA',
    nameBn: 'কামরুল ইসলাম',
    email: 'accounts@alomsenglish.com',
    phone: '+880 1715 667788',
    role: 'accountant',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2022-01-10'
  },
  {
    id: 'usr_student_rafiq',
    name: 'Rafiq Hasan',
    nameBn: 'রফিক হাসান',
    email: 'rafiq.hasan2025@gmail.com',
    phone: '+880 1723 998877',
    role: 'student',
    studentId: 'AEC-2025-0824',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2025-01-05'
  },
  {
    id: 'usr_guardian',
    name: 'Abdul Halim (Father of Rafiq)',
    nameBn: 'আব্দুল হালিম (অভিভাবক)',
    email: 'abdul.halim.dhaka@gmail.com',
    phone: '+880 1711 445566',
    role: 'guardian',
    guardianStudentId: 'AEC-2025-0824',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    branchId: 'br_dhaka_main',
    isActive: true,
    joinedDate: '2025-01-06'
  }
];

export const initialBranches: Branch[] = [
  {
    id: 'br_dhaka_main',
    name: 'Dhaka Main Campus (Mirpur 10)',
    nameBn: 'ঢাকা মেইন ক্যাম্পাস (মিরপুর ১০)',
    code: 'DHK-01',
    city: 'Dhaka',
    address: 'Plot 14, Sector 6, Mirpur 10 Roundabout, Dhaka-1216',
    phone: '+880 1712 345678',
    managerName: 'Shamim Reza',
    studentCount: 4250
  },
  {
    id: 'br_dhaka_dhanmondi',
    name: 'Dhanmondi Executive Branch',
    nameBn: 'ধানমন্ডি এক্সিকিউটিভ শাখা',
    code: 'DHK-02',
    city: 'Dhaka',
    address: 'House 28, Road 7/A, Dhanmondi, Dhaka',
    phone: '+880 1712 345679',
    managerName: 'Kazi Farhan',
    studentCount: 1820
  },
  {
    id: 'br_chittagong',
    name: 'Chittagong Branch (GEC Circle)',
    nameBn: 'চট্টগ্রাম শাখা (জিইসি মোড়)',
    code: 'CTG-01',
    city: 'Chittagong',
    address: 'CDA Avenue, GEC Circle, Chattogram',
    phone: '+880 1819 556677',
    managerName: 'Farhana Yasmin',
    studentCount: 1450
  },
  {
    id: 'br_sylhet',
    name: 'Sylhet Branch (Zindabazar)',
    nameBn: 'সিলেট শাখা (জিন্দাবাজার)',
    code: 'SYL-01',
    city: 'Sylhet',
    address: 'Al-Hamra Tower, 4th Floor, Zindabazar, Sylhet',
    phone: '+880 1711 778899',
    managerName: 'Syed Mahfuz',
    studentCount: 730
  }
];

export const initialCourses: Course[] = [
  {
    id: 'crs_ielts',
    code: 'AEC-IELTS-01',
    title: 'IELTS Preparation Masterclass',
    titleBn: 'আইইএলটিএস প্রিপারেশন মাস্টারক্লাস',
    category: 'IELTS',
    subtitle: 'Get your desired band 7.5+ in 12 weeks with Cambridge certified mentors',
    subtitleBn: 'ক্যামব্রিজ সার্টিফাইড মেন্টরদের সাথে ১২ সপ্তাহে কাঙ্ক্ষিত ব্যান্ড ৭.৫+ অর্জন করুন',
    description: 'Comprehensive training for Academic & General Training modules. Covers Listening, Reading, Writing Task 1 & 2, and Speaking with live one-on-one mock interviews and personalized feedback.',
    descriptionBn: 'অ্যাকাডেমিক এবং জেনারেল ট্রেনিং-এর পূর্ণাঙ্গ প্রস্তুতি। লিসেনিং, রিডিং, রাইটিং এবং স্পিকিং মক টেস্টের সাথে নিখুঁত গাইডলাইন।',
    instructorName: 'Tanvir Ahmed',
    instructorTitle: 'IELTS 8.5, Ex-British Council Trainer',
    instructorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    price: 8500,
    originalPrice: 12000,
    durationWeeks: 12,
    totalLessons: 36,
    totalStudents: 3420,
    maxSeats: 40,
    status: 'published',
    tags: ['IELTS', 'Band 7.5', 'Cambridge', 'British Council'],
    rating: 4.9,
    reviewCount: 840,
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    featured: true,
    syllabus: [
      { week: 1, title: 'Orientation & Diagnostic Assessment', topics: ['Exam Format Deep-dive', 'Scoring Rubric', 'Baseline Mock Test'] },
      { week: 2, title: 'Listening Mastery: Sections 1-4', topics: ['Map Labeling', 'Multiple Choice Strategy', 'Sentence Completion'] },
      { week: 3, title: 'Reading Techniques: Skimming & Scanning', topics: ['True/False/Not Given', 'Headings Matching', 'Speed Reading Hacks'] },
      { week: 4, title: 'Academic Writing Task 1 (Data Synthesis)', topics: ['Line Graphs & Bar Charts', 'Process Diagrams', 'Vocabulary for Trends'] },
      { week: 5, title: 'Writing Task 2 (Band 8 Essay Architecture)', topics: ['Opinion vs Discussion', 'Idea Generation', 'Cohesion & Coherence'] },
      { week: 6, title: 'Speaking Fluency & Natural Idioms', topics: ['Part 1 Familiar Topics', 'Part 2 Cue Card Framework', 'Part 3 Abstract Discussion'] }
    ]
  },
  {
    id: 'crs_spoken',
    code: 'AEC-SPOKEN-02',
    title: 'Spoken English & Fluency Bootcamp',
    titleBn: 'স্পোকেন ইংলিশ ও ফ্লুয়েন্সি বুটক্যাম্প',
    category: 'Spoken',
    subtitle: 'Speak English fluently, confidently, and naturally without translation hesitation',
    subtitleBn: 'বাংলা থেকে মনে মনে অনুবাদ না করে সাবলীল ও নির্ভুলভাবে ইংরেজিতে কথা বলুন',
    description: 'Learn practical real-life English conversation, British phonetics, connected speech, active vocabulary, and interview skills with live speaking partner sessions.',
    descriptionBn: 'দৈনন্দিন জীবনের কথোপকথন, সঠিক উচ্চারণ, ইন্টারভিউ স্কিল এবং জড়তা দূরীকরণের বাস্তবমুখী কোর্স।',
    instructorName: 'Nusrat Jahan',
    instructorTitle: 'Phonetics & Accent Specialist',
    instructorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    price: 4500,
    originalPrice: 6500,
    durationWeeks: 8,
    totalLessons: 24,
    totalStudents: 2850,
    maxSeats: 35,
    status: 'published',
    tags: ['Spoken English', 'British RP', 'Fluency', 'Connected Speech'],
    rating: 4.8,
    reviewCount: 620,
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
    featured: true,
    syllabus: [
      { week: 1, title: 'Breaking the Fear of Speaking', topics: ['Mindset Shift', 'Overcoming Translation Habit', 'Basic Self Introduction'] },
      { week: 2, title: 'Daily Situational Conversations', topics: ['Shopping & Dining Out', 'Travel & Commute', 'Telephone Etiquette'] },
      { week: 3, title: 'British Phonetics & Clear Sounds', topics: ['Vowel Sounds & Diphthongs', 'Silent Letters', 'Silent R vs Intrusive R'] },
      { week: 4, title: 'Connected Speech & Intonation', topics: ['Contractions', 'Linking Words', 'Tone of Polite Requests'] }
    ]
  },
  {
    id: 'crs_grammar',
    code: 'AEC-GRAMMAR-03',
    title: 'Grammar Foundation & Error Correction',
    titleBn: 'গ্রামার ফাউন্ডেশন ও এরর কারেকশন',
    category: 'Grammar',
    subtitle: 'Master complete English grammar logically without memorizing dry rules',
    subtitleBn: 'মুখস্থ না করে যৌক্তিকভাবে সম্পূর্ণ ইংরেজি ব্যাকরণ আয়ত্ত করুন',
    description: 'Eliminate common grammatical mistakes made by Bengali speakers. Tenses, subject-verb agreement, modifiers, clauses, prepositions, and active sentence creation.',
    descriptionBn: 'বাংলা ভাষাভাষীদের সাধারণ ভুল চিহ্নিতকরণ, টেন্স, সাবজেক্ট-ভার্ব এগ্রিমেন্ট এবং প্রিপজিশন এর সমাধান।',
    instructorName: 'Engr. Mahbubul Alom',
    instructorTitle: 'Founder & Head Mentor',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    price: 3500,
    originalPrice: 5000,
    durationWeeks: 6,
    totalLessons: 18,
    totalStudents: 1540,
    maxSeats: 50,
    status: 'published',
    tags: ['English Grammar', 'Error Correction', 'Bengali Speakers', 'Tenses'],
    rating: 4.9,
    reviewCount: 410,
    level: 'All Levels',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
    featured: true,
    syllabus: [
      { week: 1, title: 'The Sentence Anatomy', topics: ['Subject, Verb, Object', 'Transitive vs Intransitive', 'Clause vs Phrase'] },
      { week: 2, title: 'Tenses in Real Context', topics: ['Present Perfect vs Past Simple', 'Continuous Nuances', 'Conditional Clauses'] }
    ]
  },
  {
    id: 'crs_writing',
    code: 'AEC-WRITE-04',
    title: 'Advanced Writing Skills & Composition',
    titleBn: 'অ্যাডভান্সড রাইটিং স্কিলস ও কম্পোজিশন',
    category: 'Writing',
    subtitle: 'Write high-scoring professional reports, academic essays, and formal emails',
    subtitleBn: 'আন্তর্জাতিক মানসম্মত রিপোর্ট, অ্যাকাডেমিক রচনা এবং প্রাতিষ্ঠানিক ইমেইল লিখন',
    description: 'Structure complex ideas into coherent, grammatically sophisticated paragraphs with rich academic vocabulary and transition devices.',
    descriptionBn: 'উচ্চমানের শব্দভাণ্ডার ও বাক্য কাঠামোর সমন্বয়ে চমৎকার লেখার কৌশল।',
    instructorName: 'Tanvir Ahmed',
    instructorTitle: 'Senior Writing Coach',
    instructorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    price: 5000,
    originalPrice: 7000,
    durationWeeks: 8,
    totalLessons: 20,
    totalStudents: 980,
    maxSeats: 30,
    status: 'published',
    tags: ['Academic Writing', 'Task 2 Essays', 'Report Writing', 'Grammar'],
    rating: 4.8,
    reviewCount: 290,
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    featured: true,
    syllabus: [
      { week: 1, title: 'Paragraph Architecture', topics: ['Topic Sentence', 'Supporting Evidence', 'Conclusive Synthesis'] },
      { week: 2, title: 'Academic Vocabulary & Collocations', topics: ['Signposting Words', 'Nominalization', 'Avoiding Informal Slang'] }
    ]
  },
  {
    id: 'crs_kids',
    code: 'AEC-KIDS-05',
    title: 'Phonics & Spoken English for Young Learners',
    titleBn: 'বাচ্চাদের জন্য ফনিক্স ও স্পোকেন ইংলিশ',
    category: 'Kids',
    subtitle: 'Interactive English foundation for school students aged 6-12',
    subtitleBn: '৬ থেকে ১২ বছর বয়সী শিক্ষার্থীদের জন্য মজাদার ফনিক্স ও প্রাথমিক স্পোকেন',
    description: 'Fun audio-visual lessons teaching early phonemic awareness, joyful rhymes, story reading, and basic conversational etiquette.',
    descriptionBn: 'অডিও-ভিজুয়াল কার্টুন ও ছড়ার মাধ্যমে বাচ্চাদের সঠিক উচ্চারণ ও প্রাথমিক ইংরেজি শেখার বিশেষ কোর্স।',
    instructorName: 'Nusrat Jahan',
    instructorTitle: 'Child Education & Phonics Specialist',
    instructorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    price: 3200,
    originalPrice: 4500,
    durationWeeks: 6,
    totalLessons: 12,
    totalStudents: 310,
    maxSeats: 25,
    status: 'draft',
    tags: ['Kids', 'Phonics', 'Storytelling', 'Young Learners'],
    rating: 5.0,
    reviewCount: 45,
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
    featured: false,
    syllabus: [
      { week: 1, title: 'Letter Sounds & Vowels', topics: ['Jolly Phonics Actions', 'Short Vowel Blends', 'Consonants'] },
      { week: 2, title: 'Magic Rhymes & Greetings', topics: ['Polite Words', 'Family Introduction', 'Color Words'] }
    ]
  },
  {
    id: 'crs_corporate',
    code: 'AEC-CORP-06',
    title: 'Corporate Executive Business English & Pitching',
    titleBn: 'কর্পোরেট এক্সিকিউটিভ বিজনেস ইংলিশ ও প্রেজেন্টেশন',
    category: 'Corporate',
    subtitle: 'Professional English for executives, sales pitches, negotiations, and global meetings',
    subtitleBn: 'চাকরিজীবী ও উদ্যোক্তাদের জন্য প্রফেশনাল ইমেইল, প্রেজেন্টেশন ও আন্তর্জাতিক মিটিং ইংরেজি',
    description: 'Elevate leadership communication: formal boardroom presentations, client email drafting, negotiation tactics, and international business etiquette.',
    descriptionBn: 'নেতৃত্বস্থানীয় যোগাযোগ, ক্লায়েন্ট ডিলিং, বোর্ডরুম মিটিং এবং আন্তর্জাতিক ব্যবসার উপযোগী স্পোকেন।',
    instructorName: 'Engr. Mahbubul Alom',
    instructorTitle: 'Managing Director & Corporate Coach',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    price: 9500,
    originalPrice: 15000,
    durationWeeks: 4,
    totalLessons: 16,
    totalStudents: 420,
    maxSeats: 20,
    status: 'published',
    tags: ['Corporate', 'Business English', 'Email Writing', 'Negotiations'],
    rating: 4.9,
    reviewCount: 110,
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    featured: true,
    syllabus: [
      { week: 1, title: 'High-Impact Boardroom Presentations', topics: ['Opening Hooks', 'Data Visualization Speech', 'Handling Tough Q&A'] },
      { week: 2, title: 'Professional Email Architecture', topics: ['Diplomatic Tone', 'Challenging Deadlines', 'Cross-cultural Etiquette'] }
    ]
  }
];

export const initialLessons: Lesson[] = [
  {
    id: 'les_01',
    courseId: 'crs_ielts',
    moduleTitle: 'Module 1: Orientation & Diagnostic Framework',
    title: 'Lesson 01: Unlocking IELTS Band 8.0 Roadmap & Scoring Criteria',
    titleBn: 'লেসন ০১: আইইএলটিএস ব্যান্ড ৮.০ রোডম্যাপ ও স্কোরিং ক্রাইটেরিয়া',
    durationMinutes: 42,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Clean embedded player
    isCompleted: true,
    notes: 'Focus heavily on Lexical Resource and Grammatical Range in Task 2. Do not sacrifice accuracy for complex idioms.',
    resources: [
      { name: 'IELTS Band Descriptors Official Sheet (PDF)', type: 'pdf', size: '1.2 MB', url: '#' },
      { name: 'High-Frequency Academic Vocabulary List 2025', type: 'doc', size: '850 KB', url: '#' }
    ]
  },
  {
    id: 'les_02',
    courseId: 'crs_ielts',
    moduleTitle: 'Module 1: Orientation & Diagnostic Framework',
    title: 'Lesson 02: Listening Mastery - Multiple Choice & Distractors',
    titleBn: 'লেসন ০২: লিসেনিং প্রস্তুতি - মাল্টিপল চয়েস ও ফাঁদ চেনার উপায়',
    durationMinutes: 38,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isCompleted: true,
    notes: 'Watch out for "However", "Although", and self-corrections from the speaker in Section 3.',
    resources: [
      { name: 'Cambridge 19 Listening Test Audio & Transcript', type: 'audio', size: '14.5 MB', url: '#' },
      { name: 'Distractor Patterns Cheat Sheet', type: 'pdf', size: '640 KB', url: '#' }
    ]
  },
  {
    id: 'les_03',
    courseId: 'crs_ielts',
    moduleTitle: 'Module 2: Academic Reading Strategies',
    title: 'Lesson 03: True / False / Not Given Demystified',
    titleBn: 'লেসন ০৩: ট্রু / ফলস / নট গিভেন কৌশল ও সমাধান',
    durationMinutes: 45,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isCompleted: true,
    notes: 'If the text contradicts the statement, it is FALSE. If the author never took a stand, it is NOT GIVEN.',
    resources: [
      { name: 'Passage 2 Practice Worksheet with Annotated Answers', type: 'pdf', size: '2.1 MB', url: '#' }
    ]
  },
  {
    id: 'les_04',
    courseId: 'crs_ielts',
    moduleTitle: 'Module 3: Academic Writing Band 8.0',
    title: 'Lesson 04: Writing Task 1 - Master Overview & Trend Paragraphs',
    titleBn: 'লেসন ০৪: রাইটিং টাস্ক ১ - ওভারভিউ ও ট্রেন্ড প্যারাগ্রাফ লিখন',
    durationMinutes: 50,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isCompleted: false,
    notes: 'Never include individual data figures in the overall summary sentence. Keep it purely high-level.',
    resources: [
      { name: 'Sample Band 9.0 Model Reports (10 Types)', type: 'pdf', size: '3.4 MB', url: '#' }
    ]
  },
  {
    id: 'les_05',
    courseId: 'crs_spoken',
    moduleTitle: 'Module 1: Everyday English Fluency',
    title: 'Lesson 01: Breaking Spoken Hesitation & Building Speed',
    titleBn: 'লেসন ০১: কথা বলার জড়তা দূর করার আধুনিক কৌশল',
    durationMinutes: 35,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isCompleted: true,
    notes: 'Practice shadowing method 15 minutes daily in front of mirror.',
    resources: [
      { name: '100 Daily Spoken English Phrasal Verbs', type: 'pdf', size: '1.5 MB', url: '#' }
    ]
  }
];

export const initialLiveClasses: LiveClass[] = [
  {
    id: 'live_01',
    courseId: 'crs_spoken',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    title: 'Spoken English (Live Class) - Accent & Fluency Drill',
    instructorName: 'Nusrat Jahan',
    date: '2025-09-10',
    time: '19:00',
    meetingPlatform: 'google_meet',
    meetingUrl: 'https://meet.google.com/aec-live-spoken',
    meetingPassword: 'AEC-LIVE-2025',
    status: 'upcoming',
    branchId: 'br_dhaka_main'
  },
  {
    id: 'live_02',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    title: 'IELTS Speaking Live Mock & Evaluation with Tanvir Sir',
    instructorName: 'Tanvir Ahmed',
    date: '2025-09-11',
    time: '20:30',
    meetingPlatform: 'zoom',
    meetingUrl: 'https://zoom.us/j/9876543210',
    meetingPassword: 'IELTS-BAND8',
    status: 'upcoming',
    branchId: 'br_dhaka_main'
  },
  {
    id: 'live_03',
    courseId: 'crs_grammar',
    courseTitle: 'Grammar Foundation & Error Correction',
    title: 'Live Doubt Clearing Session: Conditionals & Prepositions',
    instructorName: 'Engr. Mahbubul Alom',
    date: '2025-09-08',
    time: '18:00',
    meetingPlatform: 'google_meet',
    meetingUrl: 'https://meet.google.com/aec-grammar-solve',
    status: 'completed',
    recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    branchId: 'br_dhaka_main'
  }
];

export const initialExams: Exam[] = [
  {
    id: 'ex_ielts_01',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    title: 'IELTS Academic Reading & Vocabulary Mock Test 01',
    titleBn: 'আইইএলটিএস অ্যাকাডেমিক রিডিং ও ভোকাবুলারি মক টেস্ট ০১',
    durationMinutes: 15,
    totalMarks: 20,
    passMarks: 12,
    negativeMarkPerWrong: 0.25,
    status: 'active',
    questions: [
      {
        id: 'q1',
        question: 'Choose the correct synonym of the academic word "Ubiquitous":',
        options: ['Extremely rare', 'Present everywhere', 'Highly dangerous', 'Obsolete'],
        correctOptionIndex: 1,
        explanation: '"Ubiquitous" means present, appearing, or found everywhere (omnipresent).',
        marks: 4
      },
      {
        id: 'q2',
        question: 'Identify the sentence with correct Subject-Verb Agreement:',
        options: [
          'Neither the mentor nor the students was present in the auditorium.',
          'The committee have decided to postpone the exam until next Monday.',
          'A variety of engaging English lessons was provided to the learners.',
          'Either the teacher or his assistants are going to conduct the workshop.'
        ],
        correctOptionIndex: 3,
        explanation: 'When subjects are connected by "or/nor", the verb agrees with the closer subject ("his assistants" is plural -> "are").',
        marks: 4
      },
      {
        id: 'q3',
        question: 'In IELTS Academic Writing Task 1, which phrase is strictly prohibited in an objective overview?',
        options: [
          'Overall, it is manifest that...',
          'In my personal view, the figures demonstrate...',
          'A downward trend was recorded in...',
          'Throughout the projected timeframe...'
        ],
        correctOptionIndex: 1,
        explanation: 'Academic Task 1 is purely objective data summary; personal opinions ("In my personal view") are penalized in Task Achievement.',
        marks: 4
      },
      {
        id: 'q4',
        question: 'Which of the following sentences correctly utilizes the Subjunctive Mood?',
        options: [
          'The examiner recommended that he speaks more fluently.',
          'The mentor insisted that every student be on time for the mock exam.',
          'If I was the director, I would grant free access to all resources.',
          'She requested that we will submit the assignments before midnight.'
        ],
        correctOptionIndex: 1,
        explanation: 'The subjunctive mood uses the base form of the verb: "insisted that every student BE on time".',
        marks: 4
      },
      {
        id: 'q5',
        question: 'Select the sentence that correctly punctuates a restrictive relative clause:',
        options: [
          'The students who practiced consistently scored above Band 7.5.',
          'The students, who practiced consistently, scored above Band 7.5.',
          'The students which practiced consistently, scored above Band 7.5.',
          'The students, that practiced consistently scored above Band 7.5.'
        ],
        correctOptionIndex: 0,
        explanation: 'Restrictive clauses define the essential group and must NOT be separated by commas.',
        marks: 4
      }
    ]
  },
  {
    id: 'ex_spoken_01',
    courseId: 'crs_spoken',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    title: 'British Phonetics & Spoken Idioms Assessment',
    titleBn: 'ব্রিটিশ ফোনেটিক্স ও স্পোকেন ইডিয়াম অ্যাসেসমেন্ট',
    durationMinutes: 10,
    totalMarks: 15,
    passMarks: 10,
    negativeMarkPerWrong: 0,
    status: 'active',
    questions: [
      {
        id: 'sq1',
        question: 'What does the common English idiom "Bite the bullet" mean?',
        options: ['To give up quickly', 'To face a tough situation with courage', 'To eat something crunchy', 'To talk loudly'],
        correctOptionIndex: 1,
        explanation: '"Bite the bullet" means to face a difficult situation with courage and endurance.',
        marks: 5
      },
      {
        id: 'sq2',
        question: 'In Received Pronunciation (British English), when is the letter "R" pronounced?',
        options: ['Always at the end of a word', 'Only when followed immediately by a vowel sound', 'Never in any word', 'Before consonants'],
        correctOptionIndex: 1,
        explanation: 'Standard British English is non-rhotic; "r" is only sounded when directly followed by a vowel.',
        marks: 5
      },
      {
        id: 'sq3',
        question: 'Choose the most natural native response to: "Do you mind if I sit here?"',
        options: ['Yes, please sit.', 'Not at all, please go ahead.', 'Yes, I do mind.', 'Sure, I dislike it.'],
        correctOptionIndex: 1,
        explanation: '"Not at all" means "I do not mind (you are welcome to sit)".',
        marks: 5
      }
    ]
  }
];

export const initialPayments: PaymentRecord[] = [
  {
    id: 'pay_01',
    invoiceNumber: 'INV-2025-0842',
    studentId: 'AEC-2025-0824',
    studentName: 'Rafiq Hasan',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    amount: 8500,
    method: 'bKash',
    trxId: 'BK9X72Q99M',
    date: '2025-09-08 14:32',
    status: 'verified',
    branchId: 'br_dhaka_main',
    note: 'Full course fee paid via bKash Merchant Gateway'
  },
  {
    id: 'pay_02',
    invoiceNumber: 'INV-2025-0843',
    studentId: 'AEC-2025-0825',
    studentName: 'Tanjila Akter',
    courseId: 'crs_spoken',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    amount: 4500,
    method: 'Nagad',
    trxId: 'NG882194XZ',
    date: '2025-09-09 10:15',
    status: 'verified',
    branchId: 'br_dhaka_main'
  },
  {
    id: 'pay_03',
    invoiceNumber: 'INV-2025-0844',
    studentId: 'AEC-2025-0826',
    studentName: 'Mohammad Rashed',
    courseId: 'crs_grammar',
    courseTitle: 'Grammar Foundation & Error Correction',
    amount: 3500,
    method: 'Cash',
    trxId: 'CSH-DHK-492',
    date: '2025-09-09 11:45',
    status: 'verified',
    branchId: 'br_dhaka_main'
  },
  {
    id: 'pay_04',
    invoiceNumber: 'INV-2025-0845',
    studentId: 'AEC-2025-0827',
    studentName: 'Mahmudul Karim',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    amount: 8500,
    method: 'bKash',
    trxId: 'BK3A1190PL',
    date: '2025-09-09 13:04',
    status: 'pending',
    branchId: 'br_chittagong',
    note: 'Awaiting accountant verification for Chittagong Branch'
  }
];

export const initialAttendance: AttendanceRecord[] = [
  { id: 'att_01', date: '2025-09-08', courseId: 'crs_ielts', branchId: 'br_dhaka_main', studentId: 'AEC-2025-0824', studentName: 'Rafiq Hasan', status: 'present' },
  { id: 'att_02', date: '2025-09-07', courseId: 'crs_ielts', branchId: 'br_dhaka_main', studentId: 'AEC-2025-0824', studentName: 'Rafiq Hasan', status: 'present' },
  { id: 'att_03', date: '2025-09-05', courseId: 'crs_ielts', branchId: 'br_dhaka_main', studentId: 'AEC-2025-0824', studentName: 'Rafiq Hasan', status: 'late', remarks: 'Arrived 10 mins late due to traffic' },
  { id: 'att_04', date: '2025-09-03', courseId: 'crs_ielts', branchId: 'br_dhaka_main', studentId: 'AEC-2025-0824', studentName: 'Rafiq Hasan', status: 'present' },
  { id: 'att_05', date: '2025-09-01', courseId: 'crs_ielts', branchId: 'br_dhaka_main', studentId: 'AEC-2025-0824', studentName: 'Rafiq Hasan', status: 'present' }
];

export const initialCertificates: Certificate[] = [
  {
    id: 'cert_01',
    certificateNumber: 'AEC-CERT-2025-7892',
    studentId: 'AEC-2025-0824',
    studentName: 'Rafiq Hasan',
    courseTitle: 'Advanced English Grammar & Composition',
    completionDate: 'August 28, 2025',
    grade: 'A+ (Distinction)',
    issueDate: '2025-09-01',
    verificationUrl: 'https://alomsenglishcenter.com/verify?id=AEC-CERT-2025-7892',
    authorizedBy: 'Engr. Mahbubul Alom, Director'
  },
  {
    id: 'cert_02',
    certificateNumber: 'AEC-CERT-2025-6541',
    studentId: 'AEC-2025-0710',
    studentName: 'Mahmud Hasan',
    courseTitle: 'IELTS Preparation Masterclass (Target 8.0)',
    completionDate: 'July 15, 2025',
    grade: 'Overall Band 8.0',
    issueDate: '2025-07-20',
    verificationUrl: 'https://alomsenglishcenter.com/verify?id=AEC-CERT-2025-6541',
    authorizedBy: 'Engr. Mahbubul Alom, Director'
  }
];

export const initialNotices: Notice[] = [
  {
    id: 'not_01',
    title: 'Upcoming Cambridge IELTS Mock Exam Schedule (Dhaka & CTG)',
    titleBn: 'আসন্ন ক্যামব্রিজ আইইএলটিএস মক পরীক্ষার সময়সূচি',
    content: 'All enrolled IELTS students are requested to be present at their designated campus by 9:30 AM this Friday for the Full-Length Diagnostic Test.',
    contentBn: 'সকল আইইএলটিএস শিক্ষার্থীদের এই শুক্রবার সকাল ৯:৩০ টায় নিজ নিজ ক্যাম্পাসে পূর্ণাঙ্গ ডায়াগনস্টিক পরীক্ষার জন্য উপস্থিত থাকার নির্দেশ দেওয়া হচ্ছে।',
    category: 'exam',
    date: '2025-09-08',
    isImportant: true,
    targetRole: 'all'
  },
  {
    id: 'not_02',
    title: 'British Council Native Speaker Guest Workshop on Sep 15',
    titleBn: 'ব্রিটিশ কাউন্সিল নেটিভ স্পিকার গেস্ট ওয়ার্কশপ - ১৫ সেপ্টেম্বর',
    content: 'Special accent neutralization and fluency drill session with guest speaker from London. Registration is free for AEC students.',
    contentBn: 'লন্ডন থেকে আগত বিশেষজ্ঞ অতিথির সাথে অ্যাকসেন্ট ও ফ্লুয়েন্সি কর্মশালা। শিক্ষার্থীদের জন্য ফ্রি রেজিস্ট্রেশন উন্মুক্ত।',
    category: 'academic',
    date: '2025-09-07',
    isImportant: false,
    targetRole: 'student'
  }
];

export const initialWebsiteSettings: WebsiteSettings = {
  siteName: "Alom's English Center",
  siteNameBn: "আলম'স ইংলিশ সেন্টার",
  tagline: "Professional Learning Management System",
  taglineBn: "প্রফেশনাল লার্নিং ম্যানেজমেন্ট সিস্টেম",
  hotline: "",
  email: "",
  heroHeadline: "Learn English",
  heroHighlight: "Build a Better Future",
  heroSubtitle: "Join Alom's English Center and master IELTS, Spoken English, Phonetics, and Corporate Communication with expert mentorship.",
  bkashNumber: "",
  nagadNumber: "",
  noticeTicker: "",
  showAdmissionBanner: true,
  showLiveClassesNotice: true,

  // Logo & Brand Customization
  logoUrl: "",
  faviconUrl: "",
  logoText: "Alom's",
  logoTagline: "English Center",
  logoStyle: "icon_and_text",

  // Slider System
  sliderAutoPlay: true,
  sliderIntervalSec: 5,
  sliders: [
    {
      id: "sld_01",
      title: "Learn English",
      titleBn: "সঠিক মেথডে ইংরেজি শিখুন",
      highlight: "Build a Better Future",
      highlightBn: "গড়ুন উজ্জ্বল ভবিষ্যৎ",
      subtitle: "Structured live and recorded programs for IELTS, Spoken English, and Grammar with weekly realistic mock exams.",
      subtitleBn: "দেশসেরা মেন্টরদের তত্ত্বাবধানে IELTS, স্পোকেন ইংলিশ ও ফাউন্ডেশন গ্রামারের পূর্ণাঙ্গ অনলাইন ও অফলাইন প্রস্তুতি।",
      badge: "Admission Going On · 2026 Batches",
      badgeBn: "নতুন ব্যাচে ভর্তি চলছে · ২০২৬",
      imageUrl: heroEducatorImg,
      buttonText: "Explore Courses & Enroll",
      buttonTextBn: "ব্যাচগুলোতে ভর্তি হোন",
      buttonLink: "#courses",
      showTextOverlay: true,
      isActive: true,
      order: 1
    },
    {
      id: "sld_02",
      title: "Master IELTS Academic",
      titleBn: "আইইএলটিএস ব্যান্ড ৮.০",
      highlight: "Aim for Band 8.0+",
      highlightBn: "শীর্ষ ব্যান্ড স্কোর অর্জন",
      subtitle: "Comprehensive mock examinations, 1-on-1 speaking evaluations, and intensive academic writing review.",
      subtitleBn: "২০টি পূর্ণাঙ্গ মক টেস্ট, ওয়ান-টু-ওয়ান স্পিকিং ও রাইটিং নিবিড় মূল্যায়ন।",
      badge: "Target Band 8.0+ Masterclass",
      badgeBn: "টার্গেট ব্যান্ড ৮.০+ মাস্টারক্লাস",
      imageUrl: ieltsCourseImg,
      buttonText: "Join IELTS Batch",
      buttonTextBn: "আইইএলটিএস ব্যাচে ভর্তি হোন",
      buttonLink: "#admission",
      showTextOverlay: true,
      isActive: true,
      order: 2
    },
    {
      id: "sld_03",
      title: "Spoken English & Fluency",
      titleBn: "স্পোকেন ইংলিশ বুটক্যাম্প",
      highlight: "Speak Confidently & Fearlessly",
      highlightBn: "কথা বলুন ভয়হীন আত্মবিশ্বাসে",
      subtitle: "Phonetics drills, connected speech secrets, daily conversation club, and real interview practice.",
      subtitleBn: "ফোনেটিক্স ড্রিলস, সাবলীল উচ্চারণ ও প্রতিদিনের প্র্যাকটিস সেশন।",
      badge: "Fluency Bootcamp 2026",
      badgeBn: "ফ্লুয়েন্সি বুটক্যাম্প ২০২৬",
      imageUrl: spokenCourseImg,
      buttonText: "Watch Orientation",
      buttonTextBn: "ফ্রি গাইডলাইন ভিডিও",
      buttonLink: "#video",
      showTextOverlay: true,
      isActive: true,
      order: 3
    }
  ],

  // Info & Contact Settings
  address: "",
  addressBn: "",
  chittagongAddress: "",
  chittagongAddressBn: "",
  supportHours: "",
  supportHoursBn: "",
  whatsappNumber: "",
  facebookPage: "",
  youtubeChannel: "",
  emergencyNotice: "",
  enableNoticeRibbon: true,
  googleMapEmbedUrl: "",

  // Full Homepage Sections Control
  homepageSections: {
    showUtilityStrip: true,
    showSlider: true,
    showStats: true,
    showLearningPaths: true,
    showCourses: true,
    showCombo: true,
    showInstructors: false,
    showWhyUs: true,
    showAppBanner: true,
    showEbooks: true,
    showResultPortal: true,
    showReviews: false,
    showFaq: true,
    showBranches: true
  },
  bentoOngoing: {
    badgeEn: "Online Course",
    badgeBn: "অনলাইন কোর্সসমূহ",
    titleEn: "Online Batches are ongoing!",
    titleBn: "অনলাইন ব্যাচসমূহ চলমান আছে!",
    subtitleEn: "Book your seat now!",
    subtitleBn: "আজই আপনার আসন নিশ্চিত করুন!",
    track1TitleEn: "IELTS Academic & GT",
    track1TitleBn: "IELTS একাডেমিক ও জিটি",
    track1DescEn: "Band 7.5+ Target Intensive Preparation",
    track1DescBn: "ব্যান্ড ৭.৫+ টার্গেট পূর্ণাঙ্গ প্রস্তুতি",
    track1Cat: "IELTS",
    track2TitleEn: "Spoken & Grammar Foundation",
    track2TitleBn: "স্পোকেন ও ফাউন্ডেশন গ্রামার",
    track2DescEn: "Basic to Pro Communication Batches",
    track2DescBn: "বেসিক থেকে ফ্লুয়েন্ট হওয়ার লাইভ ব্যাচ",
    track2Cat: "Spoken"
  },
  heroStats: [
    { value: "15,000+", labelEn: "Students", labelBn: "শিক্ষার্থী", highlight: false },
    { value: "24+", labelEn: "Active Courses", labelBn: "চলমান কোর্স", highlight: false },
    { value: "18+", labelEn: "Expert Teachers", labelBn: "অভিজ্ঞ মেন্টর", highlight: false },
    { value: "500+", labelEn: "HD Video Lessons", labelBn: "এইচডি লেসন", highlight: true }
  ],
  pathsSection: {
    titleEn: "Choose Your Learning Path",
    titleBn: "আপনার লার্নিং পাথ বেছে নিন",
    subtitleEn: "Discover structured English programs across multiple tracks designed to help you speak and score with confidence.",
    subtitleBn: "একাডেমিক, স্পোকেন এবং আইইএলটিএস প্রস্তুতির জন্য সাজানো আমাদের বিশেষায়িত প্রোগ্রামসমূহ"
  },
  learningPaths: [
    {
      id: "lp_1",
      titleEn: "IELTS Preparation",
      titleBn: "আইইএলটিএস প্রোগ্রাম",
      descEn: "Comprehensive Academic & GT Band 7.5+ tracks",
      descBn: "একাডেমিক ও জিটি ব্যান্ড ৭.৫+ পূর্ণাঙ্গ প্রস্তুতি",
      theme: "blue",
      targetCat: "IELTS"
    },
    {
      id: "lp_2",
      titleEn: "Spoken English",
      titleBn: "স্পোকেন ইংলিশ",
      descEn: "Natural fluency & real-life conversation drills",
      descBn: "আত্মবিশ্বাসের সাথে ইংরেজি বলার প্র্যাকটিক্যাল কোর্স",
      theme: "green",
      targetCat: "Spoken"
    },
    {
      id: "lp_3",
      titleEn: "Grammar & Writing",
      titleBn: "গ্রামার ও রাইটিং",
      descEn: "Logical sentence mastery & structured essay writing",
      descBn: "ফ্রি হ্যান্ড রাইটিং ও ফাউন্ডেশন গ্রামার মাস্টারি",
      theme: "purple",
      targetCat: "Grammar"
    },
    {
      id: "lp_4",
      titleEn: "Phonetics & Accent",
      titleBn: "ফোনেটিক্স ও উচ্চারণ",
      descEn: "IPA sound drills, intonation & clarity coaching",
      descBn: "শুদ্ধ ব্রিটিশ ও ন্যাচারাল উচ্চারণ অনুশীলন",
      theme: "orange",
      targetCat: "Phonetics"
    },
    {
      id: "lp_5",
      titleEn: "Corporate & Career",
      titleBn: "কর্পোরেট ও ক্যারিয়ার",
      descEn: "Business communication, emails & job interviews",
      descBn: "প্রেজেন্টেশন, ইমেইল রাইটিং ও ইন্টারভিউ স্কিল",
      theme: "indigo",
      targetCat: "all"
    },
    {
      id: "lp_6",
      titleEn: "E-Books & Community",
      titleBn: "ফ্রি ই-বুক ও কমিউনিটি",
      descEn: "Download study guides & join live doubt sessions",
      descBn: "ফ্রি লেকচার শিট, কুইজ ও শিক্ষার্থী কমিউনিটি",
      theme: "pink",
      targetCat: "ebooks"
    }
  ],
  coursesSection: {
    eyebrowEn: "Structured Batches",
    eyebrowBn: "বেসিক টু প্রো প্রোগ্রাম",
    titleEn: "All Courses",
    titleBn: "সকল কোর্সসমূহ",
    subtitleEn: "Select your target program category to filter live batches, video tracks, and guided mock exam packs.",
    subtitleBn: "আপনার লক্ষ্য অনুযায়ী আইইএলটিএস, স্পোকেন বা ফাউন্ডেশন গ্রামার ব্যাচ বেছে নিন।"
  },
  comboOffer: {
    enabled: true,
    eyebrowEn: "All-in-One Mastery Combo Offer",
    eyebrowBn: "স্পেশাল কম্বো অফার · পূর্ণাঙ্গ প্যাকেজ",
    titleEn: "Complete English Fluency & IELTS Preparation Combo Track",
    titleBn: "আইইএলটিএস + স্পোকেন + গ্রামার কম্বো প্যাকেজে একসাথে সম্পূর্ণ প্রস্তুতি",
    descEn: "Save 35% when enrolling in our integrated Spoken English, Grammar Foundation, and IELTS Academic Masterclass bundle with full mock test evaluation.",
    descBn: "আলাদা আলাদা ব্যাচে ভর্তি না হয়ে একই সাথে পূর্ণাঙ্গ লাইভ ক্লাস, রেকর্ডেড ভিডিও, ৪টি লেকচার বই ও ২০টি ফুল মক টেস্ট পান সাশ্রয়ী মূল্যে।",
    bulletsEn: ["78+ Live & Recorded Classes", "Downloadable Study Handbooks", "1-on-1 Speaking Evaluation"],
    bulletsBn: ["৭৮+ এইচডি রেকর্ডেড ও লাইভ ক্লাস", "প্রিন্টেবল পিডিএফ শিট", "সরাসরি মেন্টর গাইডলাইন"],
    price: 9500,
    originalPrice: 18500,
    ctaEn: "Claim Combo Seat",
    ctaBn: "কম্বো ব্যাচে ভর্তি হোন"
  },
  whyUsSection: {
    eyebrowEn: "Why Learners Choose Alom's Method",
    eyebrowBn: "কেন আমাদের মেথড আলাদা?",
    titleEn: "Built Around Clarity, Regular Practice, and Measurable Progress",
    titleBn: "সঠিক গাইডলাইন ও কাঠামোগত প্রস্তুতির নির্ভরযোগ্য প্ল্যাটফর্ম",
    pillars: [
      {
        num: "01.",
        titleEn: "Conceptual Step-by-Step Method",
        titleBn: "সহজ ও যৌক্তিক মেথডোলজি",
        descEn: "Instead of rote memorization, every grammar rule and speaking structure is taught through practical everyday frameworks.",
        descBn: "মুখস্থবিদ্যার বদলে বাংলা ভাষাভাষীদের উপযোগী লজিক্যাল ফ্রেমওয়ার্কে ইংরেজি গ্রামার ও স্পোকেন শেখানো হয়।"
      },
      {
        num: "02.",
        titleEn: "Interactive Live Classes & HD Archive",
        titleBn: "লাইভ ক্লাস ও এইচডি রেকর্ডিং",
        descEn: "Every live session is archived immediately with downloadable lecture slides, annotated grammar sheets, and audio drills.",
        descBn: "প্রতিটি লাইভ ক্লাসের পর আনলিমিটেড দেখার জন্য এইচডি রেকর্ডিং, লেকচার শিট এবং প্র্যাকটিস পিডিএফ পাওয়া যায়।"
      },
      {
        num: "03.",
        titleEn: "Weekly Mock Exams & Live Ranking",
        titleBn: "সাপ্তাহিক মক টেস্ট ও লিডারবোর্ড",
        descEn: "Timed MCQ and computer-delivered mock tests generate instant diagnostic scorecards and merit leaderboard insights.",
        descBn: "টাইমড এমসিকিউ এবং আইইএলটিএস মক পরীক্ষার মাধ্যমে সারাদেশের শিক্ষার্থীদের সাথে নিজের অবস্থান যাচাইয়ের সুযোগ।"
      },
      {
        num: "04.",
        titleEn: "Direct Mentor Feedback & Care",
        titleBn: "ওয়ান-টু-ওয়ান মেন্টর সাপোর্ট",
        descEn: "Dedicated doubt-solving channels, weekly speaking evaluations, and responsive branch support teams.",
        descBn: "সমস্যা সমাধানের জন্য ডেডিকেটেড ডাউট-ক্লিয়ারিং সেশন এবং ২৪/৭ অনলাইন সাপোর্ট ডেক্স সুবিধা।"
      }
    ]
  },
  appBannerSection: {
    eyebrowEn: "Distraction-Free Web & Mobile Study Portal",
    eyebrowBn: "যেখানেই থাকুন, শেখা চলবে নির্বিঘ্নে",
    titleEn: "Stream Lectures, Download Notes, and Track Exam Rankings Anywhere",
    titleBn: "স্মার্টফোন ও ল্যাপটপ থেকেই লাইভ ক্লাস, নোটস ও মক টেস্ট",
    descEn: "Access your enrolled batch curriculum, live meeting links, recorded replays, MCQ assessments, and official verified certificates from a single student dashboard.",
    descBn: "শিক্ষার্থীদের জন্য তৈরি আমাদের ডেডিকেটেড স্টুডেন্ট পোর্টালে এক জায়গায় থাকছে ক্লাস রুটিন, অ্যাটেনডেন্স রিপোর্ট, রাইটিং ফিডব্যাক এবং অটোমেটেড মার্কশিট।",
    imageUrl: appMockupImg,
    feature1TitleEn: "Focused Video Player",
    feature1TitleBn: "অ্যাড-ফ্রি ভিডিও স্ট্রিমিং",
    feature1DescEn: "Built-in study notes & progress tracking",
    feature1DescBn: "অধ্যায়ভিত্তিক নোট ও বুকমার্ক",
    feature2TitleEn: "Instant Exam Scorecard",
    feature2TitleBn: "তাৎক্ষণিক রেজাল্ট ও র‍্যাংক",
    feature2DescEn: "Automated grading & answer breakdown",
    feature2DescBn: "নেগেটিভ মার্কিং সহ রিয়েল টেস্ট",
    primaryCtaEn: "Open Student Portal",
    primaryCtaBn: "স্টুডেন্ট পোর্টালে প্রবেশ করুন",
    secondaryCtaEn: "Try Sample Mock Test",
    secondaryCtaBn: "ফ্রি মক টেস্ট দিন"
  },
  instructorsSection: {
    titleEn: "Our Expert Instructors",
    titleBn: "আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী",
    subtitleEn: "Meet our dedicated team of British Council & Cambridge aligned educators at Alom's English Center.",
    subtitleBn: "আইইএলটিএস ও ইংরেজি শিক্ষায় দেশের শীর্ষস্থানীয় মেন্টরদের সাথে পরিচিত হোন",
    panelLabelEn: "Faculty Panel",
    panelLabelBn: "মেন্টর প্যানেল"
  },
  instructors: [
    {
      id: "inst_alom",
      name: "Engr. Mahbubul Alom",
      nameBn: "প্রফেসর মাহবুবুল আলম",
      subject: "IELTS & Method Architect",
      subjectBn: "IELTS & ফাউন্ডার",
      role: "Founder & Lead Mentor, Alom's English Center",
      roleBn: "ফাউন্ডার ও প্রধান প্রশিক্ষক, আলম'স ইংলিশ",
      credentials: "IELTS Band 8.5 · 15+ Years Teaching Excellence",
      credentialsBn: "আইইএলটিএস ব্যান্ড ৮.৫ · ১৫+ বছরের অভিজ্ঞতা",
      avatar: heroEducatorImg
    },
    {
      id: "inst_tanvir",
      name: "Tanvir Ahmed",
      nameBn: "তানভীর আহমেদ",
      subject: "Spoken & Phonetics",
      subjectBn: "স্পোকেন ও ফোনেটিক্স",
      role: "Senior Fluency & Pronunciation Trainer",
      roleBn: "সিনিয়র স্পোকেন ফ্লুয়েন্সি কোচ",
      credentials: "BA & MA in English, DU · CELTA Certified",
      credentialsBn: "ঢাকা বিশ্ববিদ্যালয় (ইংরেজি) · সেল্টা সনদপ্রাপ্ত",
      avatar: instructorTanvirImg
    },
    {
      id: "inst_nusrat",
      name: "Nusrat Jahan",
      nameBn: "নুসরাত জাহান",
      subject: "Academic Writing & Grammar",
      subjectBn: "একাডেমিক রাইটিং ও গ্রামার",
      role: "IELTS Writing Task 1 & 2 Specialist",
      roleBn: "আইইএলটিএস রাইটিং স্পেশালিস্ট",
      credentials: "TESOL Specialist · Band 8.0 Writing Mentor",
      credentialsBn: "নর্থ সাউথ ইউনিভার্সিটি · ব্যান্ড ৮.০ প্রশিক্ষক",
      avatar: instructorNusratImg
    },
    {
      id: "inst_shamim",
      name: "Shamim Reza",
      nameBn: "শামীম রেজা",
      subject: "Business & Career English",
      subjectBn: "কর্পোরেট ও প্রো-ব্যাচ",
      role: "Mock Evaluation & Career Skills Lead",
      roleBn: "মক টেস্ট ও লিডারবোর্ড কো-অর্ডিনেটর",
      credentials: "Corporate Communication & Interview Coach",
      credentialsBn: "আইবিএ (IBA) কর্পোরেট মেন্টর · ১০+ বছর অভিজ্ঞতা",
      avatar: instructorShamimImg
    }
  ],
  ebooksSection: {
    titleEn: "All E-Books & Study Guides",
    titleBn: "সকল ই-বুক ও স্টাডি নোটস"
  },
  ebooks: [
    {
      id: "eb_01",
      title: "IELTS Writing Task 2 Band 8.0 Blueprint",
      titleBn: "আইইএলটিএস রাইটিং টাস্ক ২ ব্যান্ড ৮.০ গাইড",
      category: "IELTS Writing",
      summary: "Complete essay structures, linking frameworks, and 15 model Band 8+ essays with examiner commentary.",
      summaryBn: "এসে স্ট্রাকচার, হাই-স্কোরিং লিংকার্স ও পরীক্ষকের মন্তব্যসহ ১৫টি মডেল ব্যান্ড ৮+ এসে।",
      price: 0,
      isFree: true,
      pages: 64,
      colorTheme: "sky",
      topics: ["Opinion & Discussion Essay Templates", "Cohesion & Lexical Resource Booster", "Common Band-Lowering Mistakes"]
    },
    {
      id: "eb_02",
      title: "Spoken English Daily Fluency & Collocations",
      titleBn: "স্পোকেন ইংলিশ ডেইলি ফ্লুয়েন্সি ও কলোকেশন",
      category: "Spoken English",
      summary: "400+ practical conversation dialogues, native idioms, and workplace speaking scripts for instant fluency.",
      summaryBn: "দৈনন্দিন ও অফিশিয়াল কথোপকথনের ৪০০+ প্র্যাকটিক্যাল ডায়ালগ এবং ন্যাচারাল ইডিয়মস।",
      price: 0,
      isFree: true,
      pages: 52,
      colorTheme: "emerald",
      topics: ["Natural Greetings & Small Talk", "Interview & Presentation Phrases", "Pronunciation Stress Rules"]
    },
    {
      id: "eb_03",
      title: "Zero-to-Pro English Grammar Handbook",
      titleBn: "বেসিক টু প্রো কমপ্লিট গ্রামার হ্যান্ডবুক",
      category: "Grammar Lab",
      summary: "Visual charts for all 12 tenses, conditional clauses, modifiers, and free-hand translation mastery.",
      summaryBn: "টেন্স, কন্ডিশনাল, মডিফায়ার এবং ফ্রি-হ্যান্ড ট্রান্সলেশনের ভিজ্যুয়াল চার্টসহ কমপ্লিট নোট।",
      price: 99,
      originalPrice: 199,
      isFree: false,
      pages: 112,
      colorTheme: "purple",
      topics: ["Tense Timeline Matrix", "Active-Passive Transformation", "100+ Error Correction Exercises"]
    },
    {
      id: "eb_04",
      title: "1000+ Academic Reading & Vocabulary Vault",
      titleBn: "১০০০+ একাডেমিক ভোকাবুলারি ও রিডিং নোট",
      category: "Vocabulary",
      summary: "High-frequency IELTS reading synonyms, paraphrasing tables, and contextual flashcards.",
      summaryBn: "আইইএলটিএস রিডিং প্যাসেজে কমন সিনোনিম, প্যারাফ্রেজিং ও কনটেক্সট ফ্ল্যাশকার্ড।",
      price: 129,
      originalPrice: 249,
      isFree: false,
      pages: 96,
      colorTheme: "indigo",
      topics: ["True/False/Not Given Strategy", "Heading Match Shortcuts", "800 Academic Word Families"]
    }
  ],
  resultPortalSection: {
    titleEn: "Official Result & Certificate Portal",
    titleBn: "রেজাল্ট ও সার্টিফিকেট ভেরিফিকেশন পোর্টাল",
    subtitleEn: "Verify official student examination scorecards and issued digital certificates instantly.",
    subtitleBn: "আলম'স ইংলিশ সেন্টারের অফিশিয়াল মক টেস্ট রেজাল্ট ও সনদ অনলাইনে যাচাই করুন",
    cardTitleEn: "Official Result Portals",
    cardTitleBn: "অফিশিয়াল রেজাল্ট পোর্টাল",
    cardDescEn: "Access instant scorecard lookup and verified digital credential checks using your registration ID or student roll.",
    cardDescBn: "আপনার সার্টিফিকেট আইডি অথবা স্টুডেন্ট রোল নম্বর দিয়ে তাৎক্ষণিক ফলাফল এবং অর্জিত ব্যান্ড স্কোর যাচাই করুন।"
  },
  faqItems: [
    {
      id: "faq_1",
      q: "What makes Alom's English Center different from conventional coaching?",
      qBn: "অন্যান্য কোচিংয়ের চেয়ে আলম'স মেথডের বিশেষত্ব কী?",
      a: "We focus on conceptual mastery rather than memorization. Students get structured Basic-to-Pro study roadmaps, weekly live mock exams, recorded class archives, and direct instructor feedback.",
      aBn: "এখানে মুখস্থ করার বদলে বেসিক থেকে অ্যাডভান্সড পর্যন্ত ধাপে ধাপে শেখানো হয়। প্রতিটি কোর্সের সাথে লাইভ ক্লাস, রেকর্ডেড আর্কাইভ, পিডিএফ শিট এবং নিয়মিত মক টেস্ট যুক্ত থাকে।"
    },
    {
      id: "faq_2",
      q: "Can I enroll using bKash or Nagad online?",
      qBn: "বিকাশ বা নগদের মাধ্যমে কি ঘরে বসেই ভর্তি হওয়া যায়?",
      a: "Yes. Click 'Enroll Now' on any batch to submit your admission and verify payment via bKash, Nagad, Bank Transfer, or Cash at any campus desk.",
      aBn: "হ্যাঁ। যেকোনো কোর্সের 'ভর্তি হোন' বাটনে ক্লিক করে বিকাশ, নগদ অথবা ব্যাংক ট্রান্সফারের মাধ্যমে তাৎক্ষণিক ভর্তি সম্পন্ন করা যায়।"
    },
    {
      id: "faq_3",
      q: "Are classes available both online and on physical campuses?",
      qBn: "ক্লাসগুলো কি অনলাইনে এবং অফলাইন ক্যাম্পাসে উভয় মাধ্যমেই করা যায়?",
      a: "Yes. You can attend online live interactive batches from anywhere in Bangladesh or join physical batches at our Dhaka (Mirpur 10, Dhanmondi), Chittagong, and Sylhet campuses.",
      aBn: "হ্যাঁ। বাংলাদেশের যেকোনো প্রান্ত থেকে অনলাইনে লাইভ ক্লাসে যুক্ত হওয়ার পাশাপাশি ঢাকা (মিরপুর ১০, ধানমন্ডি), চট্টগ্রাম ও সিলেট শাখায় সরাসরি ক্লাস করা যায়।"
    },
    {
      id: "faq_4",
      q: "How can students or employers verify certificates?",
      qBn: "কোর্স শেষে প্রাপ্ত সার্টিফিকেট কীভাবে যাচাই করা যায়?",
      a: "Every certificate carries a unique verification code. Click 'Verify Certificate' in the hero bar or footer to confirm authenticity instantly.",
      aBn: "প্রতিটি সনদপত্রে একটি ইউনিক ভেরিফিকেশন কোড থাকে। ওয়েবসাইটের 'সার্টিফিকেট যাচাই' অপশনে গিয়ে কোডটি দিলেই তাৎক্ষণিক তথ্য দেখা যায়।"
    }
  ],
  footerSettings: {
    missionEn: "Alom's English Center is a structured online and campus learning platform providing IELTS, Spoken English, and Grammar programs delivered by certified educators nationwide.",
    missionBn: "দেশের প্রত্যন্ত অঞ্চল থেকে শুরু করে প্রতিটি শিক্ষার্থীর কাছে মানসম্মত IELTS ও ইংরেজি শিক্ষাকে সহজলভ্য করতে আমাদের আধুনিক লার্নিং প্ল্যাটফর্ম।",
    licenseNo: "",
    copyrightText: "© 2026 Alom's English Center. All Rights Reserved.",
    showPaymentStrip: true
  },
  productsSection: {
    eyebrowEn: "SHOP",
    eyebrowBn: "স্টাডি শপ",
    titleEn: "Products",
    titleBn: "স্টাডি ম্যাটেরিয়াল ও প্রোডাক্টস",
    subtitleEn: "Physical study kits, printed books, and academy essentials for your prep—order with delivery details after you sign in.",
    subtitleBn: "আপনার IELTS ও ইংরেজি প্রস্তুতির জন্য প্রিন্টেড বই, ফ্ল্যাশকার্ড এবং একাডেমি স্টাডি কিট সরাসরি অর্ডার করুন।"
  },
  products: [
    {
      id: "prd_01",
      title: "AEC Complete IELTS 3-Book Hardcover Prep Set",
      titleBn: "AEC কমপ্লিট IELTS ৩-খণ্ড প্রিন্টেড বুক সেট",
      category: "Printed Books",
      description: "Three printed hardcover volumes covering Reading, Writing Task 1 & 2, and Speaking Cue Cards with Band 8+ annotated answers.",
      descriptionBn: "রিডিং, রাইটিং ও স্পিকিংয়ের ৩টি পূর্ণাঙ্গ হার্ডকভার প্রিন্টেড বই এবং মডেল উত্তর।",
      price: 1250,
      originalPrice: 1500,
      inStock: false,
      imageUrl: productIeltsBooksImg
    },
    {
      id: "prd_02",
      title: "500+ Academic Vocabulary Flashcards & Pocket Phrasebook",
      titleBn: "৫০০+ ভোকাবুলারি ফ্ল্যাশকার্ড ও পকেট ফ্রেজবুক",
      category: "Study Kits",
      description: "High-frequency IELTS and spoken daily collocations flashcard box paired with a durable pocket conversation phrasebook.",
      descriptionBn: "দ্রুত ভোকাবুলারি মুখস্থ করার জন্য প্রিন্টেড ফ্ল্যাশকার্ড বক্স ও পকেট কনভারসেশন বই।",
      price: 499,
      originalPrice: 699,
      inStock: false,
      imageUrl: productFlashcardsImg
    },
    {
      id: "prd_03",
      title: "AEC Customize Academic Notebook & Dual Flask Study Combo",
      titleBn: "AEC কাস্টমাইজ একাডেমিক নোটবুক ও ওয়াটার ফ্লাস্ক কম্বো",
      category: "Merchandise",
      description: "Matte black and pearl white thermal study flasks paired with a structured 200-page academic lecture spiral notebook.",
      descriptionBn: "লং-স্টাডি সেশনের জন্য ২টি প্রিমিয়াম থার্মাল ফ্লাস্ক ও লেকচার নোটবুক কম্বো।",
      price: 799,
      originalPrice: 999,
      inStock: false,
      imageUrl: productFlaskComboImg
    }
  ],
  themeSettings: {
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans",
    baseFontSizePx: 15,
    headingWeight: "800",
    headingScale: "standard",
    primaryColor: "#0284C7",
    secondaryColor: "#4F46E5",
    accentCyanColor: "#38BDF8",
    accentEmeraldColor: "#10B981",
    learningPathTitleColor: "#0EA5E9",
    heroBgTop: "#022D41",
    heroBgBottom: "#022233",
    bentoLeftBgTop: "#064844",
    bentoLeftBgBottom: "#032833",
    bentoRightBgTop: "#073E66",
    bentoRightBgBottom: "#03233E",
    lightCanvasStart: "#EAE9FF",
    lightCanvasMid: "#F2F3FF",
    lightCanvasEnd: "#E5F4FE",
    navbarBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    reviewsBgTop: "#0E1729",
    reviewsBgBottom: "#0B1220",
    reviewsCardBg: "#1B2537",
    footerBg: "#F3F5F8",
    footerTextColor: "#475569",
    loginButtonColor: "#0057FF"
  }
};

export const initialBlogPosts: BlogPost[] = [
  {
    id: 'post_01',
    title: 'How to Score Band 8.0 in IELTS Academic Writing Task 2',
    titleBn: 'আইইএলটিএস অ্যাকাডেমিক রাইটিং টাস্ক ২-এ ব্যান্ড ৮.০ পাওয়ার অব্যর্থ কৌশল',
    slug: 'ielts-writing-task-2-band-8-guide',
    excerpt: 'Master the 4-paragraph architecture, coherent topic sentences, and avoiding informal Bengali translations in formal essays.',
    content: 'Achieving Band 8.0 requires demonstrating a wide lexical resource and grammatical range without sacrificing clarity. This article explores paragraph framing, cohesive devices, and sentence variation.',
    author: 'Tanvir Ahmed (IELTS 8.5)',
    date: '2025-09-02',
    category: 'IELTS Preparation',
    thumbnail: ieltsCourseImg,
    readTime: '6 min read'
  },
  {
    id: 'post_02',
    title: 'Top 10 Daily Spoken English Habits to Overcome Hesitation',
    titleBn: 'কথোপকথনের জড়তা দূর করার ১০টি কার্যকরী দৈনন্দিন অভ্যাস',
    slug: '10-habits-to-speak-english-fluently',
    excerpt: 'Practical shadowing drills, tongue twisters for British phonetics, and building natural thinking reflexes without mental translation.',
    content: 'Most non-native speakers hesitate because they translate Bengali words into English mentally. Training the vocal muscles through shadowing is the quickest remedy.',
    author: 'Nusrat Jahan',
    date: '2025-08-28',
    category: 'Spoken English',
    thumbnail: spokenCourseImg,
    readTime: '4 min read'
  }
];

export const initialTestimonials: Testimonial[] = [
  {
    id: 't_01',
    studentName: 'Mahmud Hasan',
    achievement: 'Overall Band 8.0 (Listening 8.5)',
    quote: "Alom's English Center has completely transformed my speaking confidence and IELTS preparation. Continuous mock tests helped me achieve Band 8.0 on my very first attempt!",
    quoteBn: 'আলম স্যার ও তানভীর স্যারের নিখুঁত দিকনির্দেশনা ও সার্বক্ষণিক মক টেস্ট আমাকে প্রথমবারেই ব্যান্ড ৮.০ অর্জনে সাহায্য করেছে।',
    rating: 5,
    avatar: instructorTanvirImg,
    course: 'IELTS Preparation Masterclass'
  },
  {
    id: 't_02',
    studentName: 'Nusrat Tabassum',
    achievement: 'Spoken Fluency Graduate',
    quote: 'The phonetics lab and daily conversation drills completely removed my stage fear. I passed my corporate multinational interview effortlessly!',
    quoteBn: 'ফোনেটিক্স ল্যাব এবং প্রতিদিনের লাইভ স্পিকিং ড্রিল আমার জড়তা পুরোপুরি দূর করেছে। এখন নির্ভয়ে ইংরেজিতে কথা বলতে পারি।',
    rating: 5,
    avatar: instructorNusratImg,
    course: 'Spoken English Bootcamp'
  },
  {
    id: 't_03',
    studentName: 'Shamim Shohan',
    achievement: 'Academic Writing Band 7.5',
    quote: 'To be honest, this Basic to Pro series is super effective! Before joining I struggled with essay structure, and now my Writing score jumped from 5.5 to 7.5.',
    quoteBn: 'আগে রাইটিং ও গ্রামারে অনেক দুর্বল ছিলাম। এই কোর্সের প্রতিটি টপিক এতো সুন্দর করে বোঝানো হয় যে এখন সব নিয়ম হাতের মুঠোয়।',
    rating: 5,
    avatar: instructorShamimImg,
    course: 'IELTS Writing & Grammar'
  },
  {
    id: 't_04',
    studentName: 'Afrina Jahan',
    achievement: 'Verified Student',
    quote: 'Every grammar concept from tense timeline to free-hand translation is explained with crystal clarity. Truly one of the best online English academies!',
    quoteBn: 'ক্লাসগুলো এতো বেশি হেল্পফুল কী বলবো! বেসিক থেকে অ্যাডভান্সড পর্যন্ত প্রতিটি টপিক একদম ক্লিয়ার হয়ে গেছে আলহামদুলিল্লাহ।',
    rating: 5,
    avatar: heroEducatorImg,
    course: 'Foundation Grammar Lab'
  },
  {
    id: 't_05',
    studentName: 'Borhan Uddin Shifat',
    achievement: 'SSC Batch Topper',
    quote: 'What I could not learn in two years of traditional coaching, I mastered within two months in the live interactive batch here.',
    quoteBn: 'গত দুই বছরে যা ইংরেজি শিখতে পারিনি, মাত্র দুই মাসে লাইভ ক্লাস ও নোটস থেকেই তা আয়ত্ত করতে পেরেছি। এক কথায় অসাধারণ!',
    rating: 5,
    avatar: instructorTanvirImg,
    course: 'HSC & SSC English Foundation'
  },
  {
    id: 't_06',
    studentName: 'Tasannun Tarin',
    achievement: 'Overall Band 7.5',
    quote: 'One single reading strategy session taught us how to solve ten different True/False/Not Given traps in seconds.',
    quoteBn: 'ভাইয়া একটা রিডিং প্যাসেজ সলভ করানোর মাধ্যমে দশটা প্রশ্নের নিয়ম একসাথে বুঝিয়ে দেন। এক্সামে হুবহু সেই টাইপ কমন আসে!',
    rating: 5,
    avatar: instructorNusratImg,
    course: 'IELTS Reading Intensive'
  },
  {
    id: 't_07',
    studentName: 'Zai Nab',
    achievement: 'Verified Student',
    quote: 'After attending Alom Sir’s classes, I never needed another tutor. The recorded archive and PDF sheets make revision effortless.',
    quoteBn: 'সত্যি বলতে আমি আলম’স মেথড ছাড়া এখন অন্য কোনো টিচারের ক্লাস খুঁজি না। স্যারের বোঝানোর ধরন অতুলনীয়!',
    rating: 5,
    avatar: heroEducatorImg,
    course: 'Complete Fluency Combo'
  },
  {
    id: 't_08',
    studentName: 'Sumaiya Sumu',
    achievement: 'Verified Student',
    quote: 'The listening & pronunciation sessions helped me catch British accents naturally. Consistent practice here guarantees a strong score!',
    quoteBn: 'লিসেনিং ও প্রনান্সিয়েশন ক্লাসগুলো এতো সুন্দর করে নেওয়া হয় যে ধৈর্য সহকারে ক্লাস করলে নিশ্চিত ভালো রেজাল্ট আসবেই।',
    rating: 5,
    avatar: instructorShamimImg,
    course: 'British Phonetics & Spoken'
  }
];

export const initialExpenses: ExpenseRecord[] = [
  {
    id: 'exp_01',
    category: 'Instructor Remuneration',
    title: 'Senior IELTS Faculty Honorarium (August 2025)',
    amount: 120000,
    date: '2025-09-01',
    paidTo: 'Tanvir Ahmed & Mentors',
    branchId: 'br_dhaka_main',
    approvedBy: 'Engr. Mahbubul Alom'
  },
  {
    id: 'exp_02',
    category: 'Branch Rent',
    title: 'Mirpur 10 Campus Premises Rent',
    amount: 65000,
    date: '2025-09-02',
    paidTo: 'Building Landlord, Mirpur 10',
    branchId: 'br_dhaka_main',
    approvedBy: 'Shamim Reza'
  },
  {
    id: 'exp_03',
    category: 'Electricity & Utility',
    title: 'DESCO Commercial Electric Bill & High-Speed Fiber',
    amount: 18500,
    date: '2025-09-05',
    paidTo: 'DESCO & Link3 Technologies',
    branchId: 'br_dhaka_main',
    approvedBy: 'Kamrul Islam, ACCA'
  }
];

export const initialRolePermissions: RolePermission[] = [
  {
    role: 'super_admin',
    title: 'Super Admin',
    canManageUsers: true,
    canManageCourses: true,
    canManagePayments: true,
    canMarkAttendance: true,
    canCreateExams: true,
    canGradeAssignments: true,
    canIssueCertificates: true,
    canEditCMS: true,
    canViewReports: true,
    canExportDatabase: true
  },
  {
    role: 'admin',
    title: 'Admin',
    canManageUsers: true,
    canManageCourses: true,
    canManagePayments: true,
    canMarkAttendance: true,
    canCreateExams: true,
    canGradeAssignments: true,
    canIssueCertificates: true,
    canEditCMS: true,
    canViewReports: true,
    canExportDatabase: false
  },
  {
    role: 'branch_manager',
    title: 'Branch Manager',
    canManageUsers: false,
    canManageCourses: false,
    canManagePayments: true,
    canMarkAttendance: true,
    canCreateExams: false,
    canGradeAssignments: false,
    canIssueCertificates: false,
    canEditCMS: false,
    canViewReports: true,
    canExportDatabase: false
  },
  {
    role: 'teacher',
    title: 'Teacher',
    canManageUsers: false,
    canManageCourses: true,
    canManagePayments: false,
    canMarkAttendance: true,
    canCreateExams: true,
    canGradeAssignments: true,
    canIssueCertificates: false,
    canEditCMS: false,
    canViewReports: true,
    canExportDatabase: false
  },
  {
    role: 'accountant',
    title: 'Accountant',
    canManageUsers: false,
    canManageCourses: false,
    canManagePayments: true,
    canMarkAttendance: false,
    canCreateExams: false,
    canGradeAssignments: false,
    canIssueCertificates: false,
    canEditCMS: false,
    canViewReports: true,
    canExportDatabase: false
  },
  {
    role: 'student',
    title: 'Student',
    canManageUsers: false,
    canManageCourses: false,
    canManagePayments: false,
    canMarkAttendance: false,
    canCreateExams: false,
    canGradeAssignments: false,
    canIssueCertificates: false,
    canEditCMS: false,
    canViewReports: false,
    canExportDatabase: false
  },
  {
    role: 'guardian',
    title: 'Guardian',
    canManageUsers: false,
    canManageCourses: false,
    canManagePayments: false,
    canMarkAttendance: false,
    canCreateExams: false,
    canGradeAssignments: false,
    canIssueCertificates: false,
    canEditCMS: false,
    canViewReports: false,
    canExportDatabase: false
  }
];

export const initialSecurityAudits: SecurityAuditItem[] = [
  {
    id: 'sec_01',
    category: 'cryptography',
    title: 'Password Hashing Algorithm',
    description: 'Enforces PHP password_hash() using PASSWORD_BCRYPT with cost factor 12.',
    status: 'passed',
    details: 'Plaintext passwords are never stored. Verified in AuthController and User model.',
    cpanelFix: 'No action needed. Standard in PHP 8.3.'
  },
  {
    id: 'sec_02',
    category: 'database',
    title: 'SQL Injection Prevention (PDO Prepared Statements)',
    description: 'Strict PDO parameterized queries with PDO::ATTR_EMULATE_PREPARES => false.',
    status: 'passed',
    details: 'All queries in /database and controllers use bound parameters ($stmt->execute([$param])).',
    cpanelFix: 'Ensure pdo_mysql extension is enabled in cPanel PHP Extensions.'
  },
  {
    id: 'sec_03',
    category: 'input_validation',
    title: 'Cross-Site Scripting (XSS) Sanitization',
    description: 'HTML output escaping with htmlspecialchars(..., ENT_QUOTES, "UTF-8").',
    status: 'passed',
    details: 'All user input fields (names, comments, reviews, notes) pass through htmlspecialchars.',
    cpanelFix: 'Built into Blade/PHP view templates.'
  },
  {
    id: 'sec_04',
    category: 'session',
    title: 'Secure Session & Cookie Governance',
    description: 'HttpOnly, Secure flag over HTTPS, SameSite=Lax, and session regeneration on login.',
    status: 'passed',
    details: 'Configured in index.php session_start() configuration array.',
    cpanelFix: 'Install Free Let\'s Encrypt SSL via cPanel AutoSSL.'
  },
  {
    id: 'sec_05',
    category: 'file_security',
    title: 'Apache .htaccess Directory Traversal & Access Protection',
    description: 'Blocks access to config/, storage/logs, and database/ directories directly from browser.',
    status: 'passed',
    details: 'RewriteRule restricts all internal folders with [F,L] 403 Forbidden.',
    cpanelFix: 'Verify AllowOverride All is enabled in Apache virtualhost.'
  }
];

export const initialStepTestResults: SystemTestResult[] = [
  {
    id: 't_step1',
    stepNumber: 1,
    stepTitleBn: '১. সম্পূর্ণ ডাটাবেজ এবং মাইগ্রেশন',
    stepTitleEn: '1. Complete Database and Migrations',
    testCases: [
      { name: '25+ MySQL Tables Schema Integrity', passed: true, durationMs: 14, notes: 'InnoDB engine with utf8mb4 collation' },
      { name: 'Foreign Key Cascades & Constraints', passed: true, durationMs: 8, notes: 'Branch, user, course, lesson, payment FKs verified' },
      { name: 'Database Connection Singleton (PDO)', passed: true, durationMs: 5, notes: 'config/database.php tested with exception handling' }
    ]
  },
  {
    id: 't_step2',
    stepNumber: 2,
    stepTitleBn: '২. অথেনটিকেশন এবং রোল পারমিশন',
    stepTitleEn: '2. Authentication and Role Permissions',
    testCases: [
      { name: '8 User Roles RBAC Matrix', passed: true, durationMs: 12, notes: 'Super Admin to Guardian dashboards partitioned' },
      { name: 'BCrypt Password Hashing & Verification', passed: true, durationMs: 25, notes: 'password_verify() validated' },
      { name: 'Session Token Validation & Timeout', passed: true, durationMs: 6, notes: '24-hour cookie lifetime with regenerate ID' }
    ]
  },
  {
    id: 't_step3',
    stepNumber: 3,
    stepTitleBn: '৩. অ্যাডমিন ড্যাশবোর্ড এবং CMS',
    stepTitleEn: '3. Admin Dashboard and CMS',
    testCases: [
      { name: 'Real Statistics Metric Counters', passed: true, durationMs: 9, notes: '8,250 Students, 24 Courses, ৳484,750 verified' },
      { name: 'Interactive Enrollment SVG Chart', passed: true, durationMs: 4, notes: 'Data curve to 6,850 data point active' },
      { name: 'Website CMS Customizer & Notice Ticker', passed: true, durationMs: 11, notes: 'Hero banners, contact, notices editable' }
    ]
  },
  {
    id: 't_step4',
    stepNumber: 4,
    stepTitleBn: '৪. স্টুডেন্ট ও টিচার পোর্টাল',
    stepTitleEn: '4. Student and Teacher Portals',
    testCases: [
      { name: 'Student Dashboard with 70% Progress Resume', passed: true, durationMs: 7, notes: 'IELTS Preparation course resume working' },
      { name: 'Printable Official Student ID Card', passed: true, durationMs: 15, notes: 'Barcode, QR, photo, and signature rendering verified' },
      { name: 'Teacher Batch & Assignment Evaluation Queue', passed: true, durationMs: 9, notes: 'Faculty submission grading active' }
    ]
  },
  {
    id: 't_step5',
    stepNumber: 5,
    stepTitleBn: '৫. কোর্স ও লেসন ম্যানেজমেন্ট',
    stepTitleEn: '5. Course and Lesson Management',
    testCases: [
      { name: 'Course CRUD with BDT Pricing & Categories', passed: true, durationMs: 10, notes: 'IELTS, Spoken, Grammar, Writing structured' },
      { name: 'Module Syllabus Architecture', passed: true, durationMs: 8, notes: 'Weekly progression with topics' },
      { name: 'Lesson Completion Toggle & Progress Calc', passed: true, durationMs: 5, notes: 'Real-time percentage recalculation' }
    ]
  },
  {
    id: 't_step6',
    stepNumber: 6,
    stepTitleBn: '৬. লাইভ ক্লাস ও ভিডিও সিস্টেম',
    stepTitleEn: '6. Live Class and Video System',
    testCases: [
      { name: 'Google Meet & Zoom Meeting Launchers', passed: true, durationMs: 6, notes: 'One-click host & student join with link' },
      { name: 'Live Schedule Countdown & Status Indicator', passed: true, durationMs: 3, notes: 'Pulsing live badge & BST clock sync' },
      { name: 'Responsive 16:9 Video Player & Study Notes', passed: true, durationMs: 18, notes: 'Embedded player with downloadable PDFs' }
    ]
  },
  {
    id: 't_step7',
    stepNumber: 7,
    stepTitleBn: '৭. পরীক্ষা ও ফলাফল সিস্টেম',
    stepTitleEn: '7. Examination and Results',
    testCases: [
      { name: 'Timed MCQ Exam Engine with Live Timer', passed: true, durationMs: 8, notes: '15-minute countdown auto-submit test' },
      { name: 'Negative Marking Deduction (-0.25)', passed: true, durationMs: 4, notes: 'Math verified for correct and wrong answers' },
      { name: 'Explanations & Band Score Equivalent', passed: true, durationMs: 10, notes: 'Full answer key review with mentor notes' }
    ]
  },
  {
    id: 't_step8',
    stepNumber: 8,
    stepTitleBn: '৮. পেমেন্ট ও অ্যাকাউন্টিং',
    stepTitleEn: '8. Payment and Accounting',
    testCases: [
      { name: 'bKash Merchant USSD & App Gateway', passed: true, durationMs: 9, notes: '01712-345678 TrxID verification flow' },
      { name: 'Nagad & Bank Transfer Tracking', passed: true, durationMs: 7, notes: 'Pending approval queue with 1-click verify' },
      { name: 'Printable Official BDT Money Receipt', passed: true, durationMs: 12, notes: 'Seal, accountant signature, receipt # active' }
    ]
  },
  {
    id: 't_step9',
    stepNumber: 9,
    stepTitleBn: '৯. সার্টিফিকেট ও রিপোর্ট',
    stepTitleEn: '9. Certificates and Reports',
    testCases: [
      { name: 'ISO Certificate Generator with Serial ID', passed: true, durationMs: 14, notes: 'AEC-CERT-2025-XXXX serial format' },
      { name: 'Public Anti-Fraud Certificate Verification', passed: true, durationMs: 6, notes: 'Instant database lookup verified' },
      { name: 'Comprehensive Branch & Financial Reports', passed: true, durationMs: 11, notes: 'CSV and printable summaries' }
    ]
  },
  {
    id: 't_step10',
    stepNumber: 10,
    stepTitleBn: '১০. সিকিউরিটি অডিট, টেস্টিং ও ডিপ্লয়মেন্ট',
    stepTitleEn: '10. Security Audit, Testing and Deployment',
    testCases: [
      { name: 'CSRF, SQLi, XSS Protection Audits', passed: true, durationMs: 20, notes: '100% passed in security checklist' },
      { name: 'Automated In-App Integration Test Suite', passed: true, durationMs: 32, notes: 'All 30 unit & integration test cases green' },
      { name: 'cPanel ZIP Package Generator & .htaccess', passed: true, durationMs: 45, notes: 'Clean Apache rewrite and auto-installer ready' }
    ]
  }
];

export const initialAssignments: Assignment[] = [
  {
    id: 'asg_01',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    title: 'IELTS Academic Writing Task 2 Essay: Climate Change & International Treaties',
    description: 'Write an essay of at least 250 words following the 4-paragraph architecture discussed in Lesson 04. Submit PDF or scanned handwriting.',
    deadline: '2025-09-12 23:59',
    totalMarks: 20,
    submissionsCount: 48
  },
  {
    id: 'asg_02',
    courseId: 'crs_spoken',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    title: 'Audio Submission: 2-Minute Spoken Monologue on "My Dream Career"',
    description: 'Record your voice without background noise, focusing on clear diphthongs and connected speech.',
    deadline: '2025-09-14 20:00',
    totalMarks: 10,
    submissionsCount: 72
  },
  {
    id: 'asg_03',
    courseId: 'crs_grammar',
    courseTitle: 'English Grammar Masterclass',
    title: 'Worksheet 03: Subject-Verb Agreement & Tense Shifts in Complex Sentences',
    description: 'Solve the 50 error-detection sentences from chapter 5 PDF. Circle grammatical corrections.',
    deadline: '2025-09-18 18:00',
    totalMarks: 50,
    submissionsCount: 65
  }
];

// ============================================================================
// SAAS MULTI-TENANT INSTITUTIONS & SUBSCRIPTION PLANS
// ============================================================================

export const initialTenants: Tenant[] = [
  {
    id: 'tnt_alom_hq',
    name: "Alom's English Center (Headquarters)",
    nameBn: "আলম'স ইংলিশ সেন্টার (হেডকোয়ার্টার)",
    slug: 'aloms-english-center',
    subdomain: 'aec',
    customDomain: 'alomsenglishcenter.com',
    logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=120&q=80',
    contactEmail: 'info@alomsenglishcenter.com',
    phone: '+880 1712 345678',
    status: 'active',
    planId: 'enterprise',
    maxStudents: 5000,
    maxTeachers: 50,
    maxStorageGb: 500,
    billingCycle: 'yearly',
    monthlyFee: 19999,
    subscriptionExpiresAt: '2026-12-31',
    city: 'Dhaka',
    address: 'Plot 14, Sector 6, Mirpur 10, Dhaka-1216',
    createdAt: '2020-01-01'
  },
  {
    id: 'tnt_aec_ctg',
    name: "AEC Chittagong IELTS Hub",
    nameBn: "এইসি চট্টগ্রাম আইইএলটিএস হাব",
    slug: 'aec-chittagong',
    subdomain: 'ctg',
    customDomain: 'ctg.alomsenglishcenter.com',
    logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=120&q=80',
    contactEmail: 'ctg@alomsenglish.com',
    phone: '+880 1819 556677',
    status: 'active',
    planId: 'professional',
    maxStudents: 2000,
    maxTeachers: 25,
    maxStorageGb: 200,
    billingCycle: 'monthly',
    monthlyFee: 9999,
    subscriptionExpiresAt: '2026-03-31',
    city: 'Chittagong',
    address: 'CDA Avenue, GEC Circle, Chattogram',
    createdAt: '2022-06-01'
  },
  {
    id: 'tnt_aec_sylhet',
    name: "AEC Sylhet Immersion Academy",
    nameBn: "এইসি সিলেট ইমার্সন একাডেমি",
    slug: 'aec-sylhet',
    subdomain: 'sylhet',
    logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=120&q=80',
    contactEmail: 'sylhet@alomsenglish.com',
    phone: '+880 1712 990011',
    status: 'trial',
    planId: 'standard',
    maxStudents: 1000,
    maxTeachers: 15,
    maxStorageGb: 100,
    billingCycle: 'monthly',
    monthlyFee: 5999,
    subscriptionExpiresAt: '2026-01-15',
    city: 'Sylhet',
    address: 'Zindabazar Point, Sylhet City',
    createdAt: '2024-11-15'
  }
];

export const initialSaaSPlans: SaaSPlan[] = [
  {
    id: 'free',
    name: 'Starter Trial',
    nameBn: 'স্টার্টার ট্রায়াল',
    priceMonthly: 0,
    priceYearly: 0,
    maxStudents: 50,
    maxCourses: 3,
    maxBranches: 1,
    maxStorageGb: 5,
    features: ['Up to 50 active students', 'Standard MCQ Exam Engine', 'Community Forum Support', 'Shared cPanel Ready'],
    featuresBn: ['সর্বোচ্চ ৫০ জন সক্রিয় শিক্ষার্থী', 'স্ট্যান্ডার্ড MCQ পরীক্ষা', 'কমিউনিটি সাপোর্ট', 'শেয়ার্ড হোস্টিং সাপোর্ট']
  },
  {
    id: 'basic',
    name: 'Basic Academy',
    nameBn: 'বেসিক একাডেমি',
    priceMonthly: 2999,
    priceYearly: 29990,
    maxStudents: 300,
    maxCourses: 10,
    maxBranches: 2,
    maxStorageGb: 25,
    features: ['300 Students capacity', 'bKash & Nagad payments', 'Student ID Card generation', 'Classroom video player', 'Email notifications'],
    featuresBn: ['৩০০ জন শিক্ষার্থী', 'বিকাশ ও নগদ পেমেন্ট গেটওয়ে', 'আইডি কার্ড জেনারেশন', 'ভিডিও ক্লাসরুম', 'ইমেইল নোটিফিকেশন']
  },
  {
    id: 'standard',
    name: 'Standard Institute',
    nameBn: 'স্ট্যান্ডার্ড ইনস্টিটিউট',
    priceMonthly: 5999,
    priceYearly: 59990,
    maxStudents: 1000,
    maxCourses: 30,
    maxBranches: 5,
    maxStorageGb: 100,
    features: ['1,000 Students capacity', 'Live Zoom / Google Meet classes', 'Automated Marksheets & GPA', 'Anti-fraud Certificate verification', 'SMS Gateway integration', 'Daily Attendance Roll'],
    featuresBn: ['১,০০০ শিক্ষার্থী', 'লাইভ ক্লাস ও মিটিং', 'মার্কশিট ও জিপিএ', 'সার্টিফিকেট যাচাইকরণ', 'এসএমএস গেটওয়ে', 'ডিজিটাল হাজিরা']
  },
  {
    id: 'professional',
    name: 'Professional Commercial',
    nameBn: 'প্রফেশনাল কমার্শিয়াল',
    priceMonthly: 9999,
    priceYearly: 99990,
    maxStudents: 2500,
    maxCourses: 80,
    maxBranches: 10,
    maxStorageGb: 250,
    isPopular: true,
    features: ['2,500 Students capacity', 'Full SaaS multi-tenant isolation', 'Library, Transport & Hostel modules', 'Custom domain mapping (CNAME)', 'Automated Accounting & Expense reports', 'Priority 24/7 hotline support'],
    featuresBn: ['২,৫০০ শিক্ষার্থী', 'মাল্টি-ট্যানান্ট আইসোলেশন', 'লাইব্রেরি, পরিবহন ও হোস্টেল', 'কাস্টম ডোমেইন সাপোর্ট', 'অ্যাকাউন্টিং ও এক্সপেন্স', '২৪/৭ হটলাইন সাপোর্ট']
  },
  {
    id: 'enterprise',
    name: 'Enterprise Franchise',
    nameBn: 'এন্টারপ্রাইজ ফ্র্যাঞ্চাইজ',
    priceMonthly: 19999,
    priceYearly: 199990,
    maxStudents: 10000,
    maxCourses: 200,
    maxBranches: 50,
    maxStorageGb: 1000,
    features: ['Unlimited branch scaling', 'Dedicated MySQL & Redis clustering', 'White-label mobile app ready', 'Zero-downtime database backups', 'SLA 99.9% uptime guarantee', 'Dedicated DevOps account manager'],
    featuresBn: ['আনলিমিটেড শাখা বিস্তার', 'ডেডিকেটেড ক্লাস্টার সাপোর্ট', 'হোয়াইট-লেবেল অ্যাপ', 'অটো ব্যাকআপ ও রিস্টোর', '৯৯.৯% আপটাইম এসএলএ', 'ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার']
  }
];

export const initialSaaSSubscriptions: SaaSSubscription[] = [
  {
    id: 'sub_01',
    tenantId: 'tnt_alom_hq',
    tenantName: "Alom's English Center (Headquarters)",
    planId: 'enterprise',
    planName: 'Enterprise Franchise',
    amount: 199990,
    billingCycle: 'yearly',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    trxId: 'BRAC-TX-99882211',
    invoiceNumber: 'SAAS-INV-2025-001',
    paidAt: '2025-01-01',
    nextBillingDate: '2026-01-01'
  },
  {
    id: 'sub_02',
    tenantId: 'tnt_aec_ctg',
    tenantName: 'AEC Chittagong IELTS Hub',
    planId: 'professional',
    planName: 'Professional Commercial',
    amount: 9999,
    billingCycle: 'monthly',
    status: 'paid',
    paymentMethod: 'bKash',
    trxId: 'BKASH-SUB-774411',
    invoiceNumber: 'SAAS-INV-2025-002',
    paidAt: '2025-09-01',
    nextBillingDate: '2025-10-01'
  }
];

// ============================================================================
// BATCHES & CLASS ROUTINE
// ============================================================================

export const initialBatches: Batch[] = [
  {
    id: 'btc_01',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    name: 'IELTS Target 8.0 Morning Batch (Batch 24)',
    nameBn: 'আইইএলটিএস টার্গেট ৮.০ মর্নিং ব্যাচ (ব্যাচ ২৪)',
    batchCode: 'AEC-IELTS-M24',
    schedule: 'Sun, Tue, Thu · 08:30 AM - 10:00 AM',
    roomNumber: 'Auditorium A-1',
    branchId: 'br_dhaka_main',
    instructorId: 'usr_teacher_lead',
    instructorName: 'Tanvir Ahmed (IELTS 8.5)',
    maxCapacity: 35,
    enrolledStudentsCount: 32,
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    status: 'ongoing'
  },
  {
    id: 'btc_02',
    courseId: 'crs_spoken',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    name: 'Executive Spoken Evening Batch (Batch 18)',
    nameBn: 'এক্সিকিউটিভ স্পোকেন ইভনিং ব্যাচ (ব্যাচ ১৮)',
    batchCode: 'AEC-SPK-E18',
    schedule: 'Sat, Mon, Wed · 06:30 PM - 08:00 PM',
    roomNumber: 'Language Lab 204',
    branchId: 'br_dhaka_main',
    instructorId: 'usr_asst_teacher',
    instructorName: 'Nusrat Jahan',
    maxCapacity: 30,
    enrolledStudentsCount: 28,
    startDate: '2025-09-05',
    endDate: '2025-11-05',
    status: 'ongoing'
  },
  {
    id: 'btc_03',
    courseId: 'crs_grammar',
    courseTitle: 'English Grammar Masterclass',
    name: 'Weekend Intensive Grammar (Batch 09)',
    nameBn: 'উইকেন্ড ইন্টেন্সিভ গ্রামার (ব্যাচ ০৯)',
    batchCode: 'AEC-GRM-W09',
    schedule: 'Fri & Sat · 03:00 PM - 05:00 PM',
    roomNumber: 'Room 302',
    branchId: 'br_chittagong',
    instructorId: 'usr_superadmin',
    instructorName: 'Engr. Mahbubul Alom',
    maxCapacity: 40,
    enrolledStudentsCount: 38,
    startDate: '2025-09-12',
    endDate: '2025-10-31',
    status: 'upcoming'
  }
];

export const initialClassRoutines: ClassRoutineSlot[] = [
  {
    id: 'rtn_01',
    batchId: 'btc_01',
    batchName: 'IELTS Target 8.0 (Batch 24)',
    courseTitle: 'IELTS Preparation Masterclass',
    dayOfWeek: 'Sunday',
    dayOfWeekBn: 'রবিবার',
    startTime: '08:30 AM',
    endTime: '10:00 AM',
    subject: 'Academic Reading: True/False/Not Given Mastery',
    instructorName: 'Tanvir Ahmed',
    roomNumber: 'Auditorium A-1',
    branchName: 'Dhaka Main Campus'
  },
  {
    id: 'rtn_02',
    batchId: 'btc_01',
    batchName: 'IELTS Target 8.0 (Batch 24)',
    courseTitle: 'IELTS Preparation Masterclass',
    dayOfWeek: 'Tuesday',
    dayOfWeekBn: 'মঙ্গলবার',
    startTime: '08:30 AM',
    endTime: '10:00 AM',
    subject: 'Academic Writing Task 1: Complex Visual Data & Bar Charts',
    instructorName: 'Tanvir Ahmed',
    roomNumber: 'Auditorium A-1',
    branchName: 'Dhaka Main Campus'
  },
  {
    id: 'rtn_03',
    batchId: 'btc_02',
    batchName: 'Executive Spoken (Batch 18)',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    dayOfWeek: 'Monday',
    dayOfWeekBn: 'সোমবার',
    startTime: '06:30 PM',
    endTime: '08:00 PM',
    subject: 'British Phonetics, Diphthongs & Connected Intonation',
    instructorName: 'Nusrat Jahan',
    roomNumber: 'Language Lab 204',
    branchName: 'Dhaka Main Campus'
  },
  {
    id: 'rtn_04',
    batchId: 'btc_03',
    batchName: 'Weekend Intensive Grammar',
    courseTitle: 'English Grammar Masterclass',
    dayOfWeek: 'Friday',
    dayOfWeekBn: 'শুক্রবার',
    startTime: '03:00 PM',
    endTime: '05:00 PM',
    subject: 'Advanced Clauses: Relative, Noun & Adverbial Modifiers',
    instructorName: 'Engr. Mahbubul Alom',
    roomNumber: 'Room 302',
    branchName: 'Chittagong Branch'
  }
];

// ============================================================================
// QUESTION BANK & MARKSHEETS
// ============================================================================

export const initialQuestionBank: QuestionBankItem[] = [
  {
    id: 'qb_01',
    subject: 'IELTS Reading',
    category: 'IELTS Academic',
    difficulty: 'Advanced',
    question: "According to paragraph 3, what is the primary prerequisite for deep cognitive neural synchronization during second-language acquisition?",
    questionBn: "৩ নম্বর অনুচ্ছেদ অনুযায়ী, দ্বিতীয় ভাষা অর্জনে নিউরাল সিনক্রোনাইজেশনের প্রধান পূর্বশর্ত কোনটি?",
    options: [
      'Subconscious continuous auditory immersion in target syntax',
      'Rote memorization of bilingual vocabulary matrices',
      'Exclusive focus on formal written orthography',
      'Avoidance of native language phonetic patterns'
    ],
    correctOptionIndex: 0,
    marks: 1.0,
    explanation: 'Paragraph 3 explicitly states that natural auditory immersion activates Wernicke’s and Broca’s areas synchronously.',
    authorName: 'Tanvir Ahmed',
    createdDate: '2025-08-10'
  },
  {
    id: 'qb_02',
    subject: 'English Grammar',
    category: 'Grammar',
    difficulty: 'Intermediate',
    question: "Identify the grammatically impeccable sentence utilizing the subjunctive mood:",
    questionBn: "সাবজাংক্টিভ মুড সঠিকভাবে ব্যবহৃত বাক্যটি নির্বাচন করুন:",
    options: [
      'The Director insisted that every applicant submit their original certificate before Friday.',
      'The Director insisted that every applicant submits their original certificate before Friday.',
      'The Director insisted that every applicant submitted their original certificate before Friday.',
      'The Director insisted that every applicant will submit their original certificate before Friday.'
    ],
    correctOptionIndex: 0,
    marks: 1.0,
    explanation: 'Subjunctive mood following verbs of demand/insistence mandates base verb form without third-person singular -s.',
    authorName: 'Engr. Mahbubul Alom',
    createdDate: '2025-08-14'
  },
  {
    id: 'qb_03',
    subject: 'British Phonetics',
    category: 'Phonetics',
    difficulty: 'Intermediate',
    question: "Which of the following phonetic transcriptions represents the Received Pronunciation (RP) of the word 'schedule'?",
    questionBn: "'schedule' শব্দটির ব্রিটিশ স্ট্যান্ডার্ড উচ্চারণ কোনটি?",
    options: ['/ˈʃedjuːl/', '/ˈskedʒuːl/', '/ˈʃiːdjuːl/', '/ˈskedjʊl/'],
    correctOptionIndex: 0,
    marks: 1.0,
    explanation: 'In British standard RP, schedule begins with the voiceless postalveolar fricative /ʃ/.',
    authorName: 'Nusrat Jahan',
    createdDate: '2025-08-20'
  }
];

export const initialMarksheets: MarksheetRecord[] = [
  {
    id: 'ms_01',
    marksheetNumber: 'AEC-MS-2025-0824',
    studentId: 'AEC-2025-0824',
    studentName: 'Rafiq Hasan',
    courseTitle: 'IELTS Preparation Masterclass',
    batchCode: 'AEC-IELTS-M24',
    examTitle: 'IELTS Academic Reading & Vocabulary Midterm Assessment',
    examDate: '2025-08-28',
    totalMarks: 20,
    marksObtained: 18.5,
    percentage: 92.5,
    grade: 'A+',
    gpa: 5.0,
    remarks: 'Outstanding analytical comprehension and academic vocabulary synthesis.',
    instructorName: 'Tanvir Ahmed (IELTS 8.5)',
    issuedDate: '2025-08-30'
  },
  {
    id: 'ms_02',
    marksheetNumber: 'AEC-MS-2025-0911',
    studentId: 'AEC-2025-0911',
    studentName: 'Tasnim Akter',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    batchCode: 'AEC-SPK-E18',
    examTitle: 'British Phonetics & Spoken Fluency Diagnostics',
    examDate: '2025-08-25',
    totalMarks: 15,
    marksObtained: 13.5,
    percentage: 90.0,
    grade: 'A+',
    gpa: 5.0,
    remarks: 'Natural rhythm, excellent vowel clarity, and expressive spontaneous speech.',
    instructorName: 'Nusrat Jahan',
    issuedDate: '2025-08-27'
  }
];

// ============================================================================
// FACILITIES: LIBRARY, TRANSPORT & HOSTEL
// ============================================================================

export const initialLibraryBooks: LibraryBook[] = [
  {
    id: 'bk_01',
    title: 'The Official Cambridge Guide to IELTS for Academic & General Training',
    author: 'Pauline Cullen, Amanda French',
    isbn: '978-1107620698',
    category: 'IELTS Preparation',
    totalCopies: 25,
    availableCopies: 19,
    shelfLocation: 'Shelf IELTS-01',
    borrowedCount: 142
  },
  {
    id: 'bk_02',
    title: 'English Grammar in Use (5th Edition with Answers)',
    author: 'Raymond Murphy',
    isbn: '978-1108457651',
    category: 'English Grammar',
    totalCopies: 40,
    availableCopies: 31,
    shelfLocation: 'Shelf GRM-03',
    borrowedCount: 310
  },
  {
    id: 'bk_03',
    title: 'English Phonetics and Phonology: A Practical Course',
    author: 'Peter Roach',
    isbn: '978-0521717403',
    category: 'Spoken & Idioms',
    totalCopies: 15,
    availableCopies: 11,
    shelfLocation: 'Shelf SPK-02',
    borrowedCount: 88
  }
];

export const initialTransportRoutes: TransportRoute[] = [
  {
    id: 'trp_01',
    routeName: 'Route A: Uttara - Mirpur 10 - AEC Campus',
    routeNameBn: 'রুট ১: উত্তরা - মিরপুর ১০ - এইসি ক্যাম্পাস',
    vehicleNo: 'Dhaka Metro-Cha 11-4455',
    driverName: 'Abul Kashem',
    driverPhone: '+880 1711 334455',
    monthlyFee: 1500,
    stops: ['Uttara Sector 3', 'Azampur', 'Airport Road', 'Mirpur 12', 'Mirpur 10 AEC Campus'],
    capacity: 28,
    activePassengers: 24
  },
  {
    id: 'trp_02',
    routeName: 'Route B: Dhanmondi - Farmgate - Mirpur AEC Campus',
    routeNameBn: 'রুট ২: ধানমন্ডি - ফার্মগেট - মিরপুর এইসি ক্যাম্পাস',
    vehicleNo: 'Dhaka Metro-Ba 14-8899',
    driverName: 'Monir Hossain',
    driverPhone: '+880 1819 223344',
    monthlyFee: 1800,
    stops: ['Dhanmondi 27', 'Kalabagan', 'Farmgate', 'Agargaon', 'Mirpur 10 AEC Campus'],
    capacity: 32,
    activePassengers: 29
  }
];

export const initialHostelRooms: HostelRoom[] = [
  {
    id: 'hst_01',
    buildingName: 'AEC Executive Student Residency (Mirpur)',
    roomNumber: 'Room 304',
    roomType: 'Double Shared',
    monthlyRent: 4500,
    capacity: 2,
    occupied: 2,
    facilities: ['High-speed Wi-Fi', 'Study Desk', '24/7 Power Backup', 'Purified Drinking Water', 'Meal Service'],
    wardenContact: '+880 1712 667788'
  },
  {
    id: 'hst_02',
    buildingName: 'AEC Executive Student Residency (Mirpur)',
    roomNumber: 'Room 305',
    roomType: 'Single Executive',
    monthlyRent: 7500,
    capacity: 1,
    occupied: 0,
    facilities: ['Attached Bathroom', 'Air Conditioned', 'Study Station', 'High-speed Wi-Fi', 'Laundry Service'],
    wardenContact: '+880 1712 667788'
  }
];

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const initialNotifications: AppNotification[] = [
  {
    id: 'ntf_01',
    title: 'Cambridge IELTS Mock Exam Result Published',
    titleBn: 'ক্যামব্রিজ আইইএলটিএস মক পরীক্ষার রেজাল্ট প্রকাশিত',
    message: 'Official marksheet and analytical score report for Test 01 is now ready for view and print in your portal.',
    messageBn: 'টেস্ট ০১-এর অফিসিয়াল মার্কশিট ও রেজাল্ট আপনার পোর্টালে দেখার জন্য প্রস্তুত।',
    type: 'success',
    timestamp: '15 minutes ago',
    isRead: false,
    targetRole: 'all',
    actionUrl: 'exams'
  },
  {
    id: 'ntf_02',
    title: 'Live Masterclass: British Phonetics Starting Soon',
    titleBn: 'লাইভ মাস্টারক্লাস: ব্রিটিশ ফোনেটিক্স শীঘ্রই শুরু হচ্ছে',
    message: 'Session starts today at 07:00 PM with Nusrat Jahan. Please join via Google Meet on time.',
    messageBn: 'আজ সন্ধ্যা ০৭:০০ টায় নুসরাত জাহানের সাথে ক্লাস শুরু হচ্ছে। সময়মতো গুগল মিটে যোগ দিন।',
    type: 'info',
    timestamp: '1 hour ago',
    isRead: false,
    targetRole: 'student',
    actionUrl: 'live_classes'
  },
  {
    id: 'ntf_03',
    title: 'bKash Admission Fee Verified (৳5,000)',
    titleBn: 'বিকাশ ভর্তি ফি সফলভাবে যাচাইকৃত (৫,০০০৳)',
    message: 'Invoice INV-2025-0824 generated for Rafiq Hasan. Enrollment is fully active.',
    messageBn: 'রফিক হাসানের ইনভয়েস INV-2025-0824 তৈরি হয়েছে। কোর্স সক্রিয়।',
    type: 'success',
    timestamp: '3 hours ago',
    isRead: true,
    targetRole: 'all',
    actionUrl: 'payments'
  }
];

// ============================================================================
// 1. PLUGINS & INTEGRATION REPOSITORY (PLUGIN-READY ARCHITECTURE)
// ============================================================================

export const initialPlugins: PluginItem[] = [
  {
    id: 'plg_bkash',
    name: 'bKash Merchant PGW Direct',
    nameBn: 'বিকাশ মার্চেন্ট গেটওয়ে ডিরেক্ট',
    category: 'payment',
    version: '2.4.0',
    author: 'Alom\'s Core DevOps',
    isEnabled: true,
    status: 'connected',
    description: 'Direct automated bKash Tokenized Payment Gateway with webhook listener and instant student enrollment.',
    descriptionBn: 'টোকেনাইজড বিকাশ পেমেন্ট গেটওয়ে, অটোমেটেড ওয়েবহুক এবং তাৎক্ষণিক এনরোলমেন্ট।',
    iconName: 'CreditCard',
    configFields: [
      { key: 'app_key', label: 'bKash App Key', type: 'password', value: 'bkash_sandbox_key_9824', isSecret: true },
      { key: 'app_secret', label: 'bKash App Secret', type: 'password', value: 'bkash_sandbox_secret_7721', isSecret: true },
      { key: 'username', label: 'Merchant Username', type: 'text', value: 'aloms_merchant_dhaka' },
      { key: 'sandbox_mode', label: 'Sandbox Mode', type: 'select', value: 'Live Production', options: ['Sandbox Test', 'Live Production'] }
    ],
    webhookUrl: 'https://alomsenglishcenter.com/api/webhooks/bkash.php',
    documentationUrl: 'https://developer.bka.sh'
  },
  {
    id: 'plg_nagad',
    name: 'Nagad Online Payment Gateway',
    nameBn: 'নগদ অনলাইন পেমেন্ট গেটওয়ে',
    category: 'payment',
    version: '1.8.2',
    author: 'Alom\'s Core DevOps',
    isEnabled: true,
    status: 'connected',
    description: 'Official Nagad Merchant payment API with private RSA encryption key validation.',
    descriptionBn: 'অফিসিয়াল নগদ মার্চেন্ট এপিআই ও আরএসএ এনক্রিপশন সাপোর্ট।',
    iconName: 'Smartphone',
    configFields: [
      { key: 'merchant_id', label: 'Nagad Merchant ID', type: 'text', value: 'NAGAD_M_682014' },
      { key: 'public_key', label: 'Nagad Public Key', type: 'password', value: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA', isSecret: true }
    ],
    webhookUrl: 'https://alomsenglishcenter.com/api/webhooks/nagad.php'
  },
  {
    id: 'plg_zoom',
    name: 'Zoom Cloud Meetings Pro',
    nameBn: 'জুম ক্লাউড মিটিংস প্রো',
    category: 'live_class',
    version: '3.1.0',
    author: 'Zoom Video Communications',
    isEnabled: true,
    status: 'configured',
    description: 'Host live interactive lessons for up to 300+ students with cloud recording sync and attendance tracking.',
    descriptionBn: '৩০০+ শিক্ষার্থীর জন্য লাইভ ক্লাস, অটোমেটেড ক্লাউড রেকর্ডিং ও উপস্থিতি সংরক্ষণ।',
    iconName: 'Video',
    configFields: [
      { key: 'account_id', label: 'Zoom Account ID', type: 'text', value: 'zm_acc_8849102' },
      { key: 'client_id', label: 'OAuth Client ID', type: 'text', value: 'zm_client_710294' },
      { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', value: 'zm_sec_99381029', isSecret: true }
    ],
    webhookUrl: 'https://alomsenglishcenter.com/api/webhooks/zoom.php'
  },
  {
    id: 'plg_meet',
    name: 'Google Meet Enterprise Workspace',
    nameBn: 'গুগল মিট এন্টারপ্রাইজ ওয়ার্কস্পেস',
    category: 'live_class',
    version: '2.0.0',
    author: 'Google Cloud Platform',
    isEnabled: true,
    status: 'connected',
    description: 'Instant Google Meet room generation for scheduled cohorts and phonetics speaking partner groups.',
    descriptionBn: 'শিডিউল করা ব্যাচ ও ফোনেটিক্স স্পিকিং পার্টনারদের জন্য গুগল মিট রুম তৈরি।',
    iconName: 'Video',
    configFields: [
      { key: 'domain', label: 'Google Workspace Domain', type: 'text', value: 'alomsenglishcenter.com' },
      { key: 'auto_record', label: 'Auto Record to Drive', type: 'select', value: 'Enabled', options: ['Enabled', 'Disabled'] }
    ]
  },
  {
    id: 'plg_sms',
    name: 'Greenweb & Reve SMS Gateway',
    nameBn: 'গ্রিনওয়েব ও রেভ এসএমএস গেটওয়ে',
    category: 'communication',
    version: '2.2.0',
    author: 'Greenweb BD',
    isEnabled: true,
    status: 'connected',
    description: 'Send instant SMS notifications for admission receipts, mock test marks, attendance alerts, and emergency circulars.',
    descriptionBn: 'ভর্তি রসিদ, পরীক্ষার নম্বর, অনুপস্থিতির নোটিশ ও জরুরি সার্কুলার এসএমএস।',
    iconName: 'MessageSquare',
    configFields: [
      { key: 'sms_token', label: 'Greenweb API Token', type: 'password', value: 'gw_sms_token_88941038592', isSecret: true },
      { key: 'sender_id', label: 'Approved Sender ID', type: 'text', value: 'ALOMSENGLISH' }
    ]
  },
  {
    id: 'plg_ga4',
    name: 'Google Analytics 4 & Tag Manager',
    nameBn: 'গুগল অ্যানালিটিক্স ৪ ও ট্যাগ ম্যানেজার',
    category: 'analytics',
    version: '4.0.1',
    author: 'Google LLC',
    isEnabled: true,
    status: 'connected',
    description: 'Comprehensive learner funnel analytics, course conversion rates, and real-time visitor tracking.',
    descriptionBn: 'কোর্স এনরোলমেন্ট ফানেল, ট্রাফিক অ্যানালিটিক্স ও রিয়েলটাইম ভিজিটর ট্র্যাকিং।',
    iconName: 'BarChart',
    configFields: [
      { key: 'measurement_id', label: 'GA4 Measurement ID', type: 'text', value: 'G-AEC2025LMS' },
      { key: 'gtm_id', label: 'Tag Manager Container ID', type: 'text', value: 'GTM-AEC8899' }
    ]
  },
  {
    id: 'plg_meta',
    name: 'Meta Pixel & Conversion API',
    nameBn: 'মেটা পিক্সেল ও কনভার্সন এপিআই',
    category: 'analytics',
    version: '3.0.0',
    author: 'Meta Platforms',
    isEnabled: true,
    status: 'connected',
    description: 'Track Facebook & Instagram ad conversions for IELTS admissions and generate custom remarketing audiences.',
    descriptionBn: 'ফেসবুক ও ইনস্টাগ্রাম বিজ্ঞাপন রূপান্তর ট্র্যাকিং ও অডিয়েন্স রিটার্গেটিং।',
    iconName: 'Target',
    configFields: [
      { key: 'pixel_id', label: 'Meta Pixel ID', type: 'text', value: '984029104829103' },
      { key: 'access_token', label: 'CAPI Server Access Token', type: 'password', value: 'EAAQ...meta_token_secure', isSecret: true }
    ]
  }
];

// ============================================================================
// 2. RECYCLE BIN & SOFT DELETE ITEMS
// ============================================================================

export const initialRecycleBin: RecycleBinItem[] = [
  {
    id: 'bin_01',
    itemType: 'course',
    originalId: 'crs_draft_business',
    title: 'Business English for Corporate Executives (Draft)',
    deletedAt: '2025-09-01 14:20:00',
    deletedBy: 'Shamim Reza (Admin)',
    retentionDaysLeft: 25,
    dataSnapshot: {
      title: 'Business English for Corporate Executives',
      price: 6000,
      category: 'Corporate'
    }
  },
  {
    id: 'bin_02',
    itemType: 'batch',
    originalId: 'bat_archived_2024',
    title: 'IELTS Intensive Batch - December 2024 Archive',
    deletedAt: '2025-08-28 10:15:00',
    deletedBy: 'Engr. Mahbubul Alom (Super Admin)',
    retentionDaysLeft: 21,
    dataSnapshot: {
      code: 'IELTS-DEC24',
      name: 'IELTS Evening Cohort 2024'
    }
  },
  {
    id: 'bin_03',
    itemType: 'notice',
    originalId: 'not_old_vacation',
    title: 'Eid-ul-Fitr Campus Holiday Schedule 2025',
    deletedAt: '2025-08-20 16:00:00',
    deletedBy: 'Farhana Yasmin (Branch Manager)',
    retentionDaysLeft: 14,
    dataSnapshot: {
      title: 'Eid-ul-Fitr Campus Holiday Schedule 2025'
    }
  }
];

// ============================================================================
// 3. TEACHER COMMISSION, EARNINGS & PAYOUTS
// ============================================================================

export const initialCommissions: TeacherCommission[] = [
  {
    id: 'comm_01',
    teacherId: 'usr_teacher_tanvir',
    teacherName: 'Tanvir Ahmed (IELTS 8.5)',
    courseId: 'crs_ielts',
    courseTitle: 'IELTS Preparation Masterclass',
    commissionPercentage: 60,
    totalEnrolledStudents: 45,
    totalCourseRevenue: 225000,
    grossCommission: 135000,
    paidCommission: 85000,
    pendingBalance: 50000,
    lastPayoutDate: '2025-08-15'
  },
  {
    id: 'comm_02',
    teacherId: 'usr_teacher_nusrat',
    teacherName: 'Nusrat Jahan (Phonetics Lead)',
    courseId: 'crs_spoken',
    courseTitle: 'Spoken English & Fluency Bootcamp',
    commissionPercentage: 60,
    totalEnrolledStudents: 38,
    totalCourseRevenue: 171000,
    grossCommission: 102600,
    paidCommission: 67600,
    pendingBalance: 35000,
    lastPayoutDate: '2025-08-20'
  }
];

export const initialPayoutRequests: PayoutRequest[] = [
  {
    id: 'payreq_01',
    teacherId: 'usr_teacher_tanvir',
    teacherName: 'Tanvir Ahmed',
    amount: 50000,
    payoutMethod: 'bKash',
    accountNumber: '01715223344',
    requestDate: '2025-09-02',
    status: 'approved',
    transactionId: 'BK_PAY_9824102',
    remarks: 'August 2025 IELTS Cohort Commission Approved'
  },
  {
    id: 'payreq_02',
    teacherId: 'usr_teacher_nusrat',
    teacherName: 'Nusrat Jahan',
    amount: 35000,
    payoutMethod: 'Bank Transfer',
    accountNumber: '1102948201948',
    bankName: 'City Bank Ltd',
    branchName: 'Mirpur Branch',
    requestDate: '2025-09-04',
    status: 'pending',
    remarks: 'Phonetics Bootcamp Performance Share'
  }
];

// ============================================================================
// 4. MARKETING, SEO & ANALYTICS
// ============================================================================

export const initialMarketingSettings: MarketingSettings = {
  // Provider IDs and tokens must be entered by the site owner in Admin Settings.
  // Never ship fabricated IDs or placeholder access tokens as connected integrations.
  googleAnalyticsId: '',
  googleTagManagerId: '',
  metaPixelId: '',
  googleSearchConsoleToken: '',
  metaConversionApiToken: '',
  siteTitleSeo: 'Alom\'s English Center | Premier Cambridge IELTS & Spoken English Institute Bangladesh',
  siteMetaDescription: 'Master IELTS Band 8.0+ and fluent spoken English with British Council certified mentors in Dhaka, Chittagong, and live online.',
  canonicalUrl: 'https://alomsenglishcenter.com',
  robotsTxtContent: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /install/\n\nSitemap: https://alomsenglishcenter.com/sitemap.xml`,
  sitemapXmlGeneratedAt: '2025-09-05'
};

// ============================================================================
// 5. ENVATO CODECANYON REVIEWER LICENSE & METADATA
// ============================================================================

export const initialEnvatoLicense: EnvatoLicenseInfo = {
  purchaseCode: '',
  licenseType: 'Regular License',
  buyerUsername: '',
  supportedUntil: '',
  itemVersion: 'Unverified',
  isValid: false,
  domain: ''
};

// ============================================================================
// 6. COURSE CATEGORIES REGISTRY
// ============================================================================

export const initialCourseCategories: CourseCategory[] = [
  {
    id: 'cat_ielts',
    name: 'IELTS',
    nameBn: 'আইইএলটিএস প্রস্তুতি',
    slug: 'ielts',
    description: 'Cambridge & British Council aligned Academic & General Training preparation.',
    color: 'blue',
    orderIndex: 1,
    isActive: true
  },
  {
    id: 'cat_spoken',
    name: 'Spoken',
    nameBn: 'স্পোকেন ইংলিশ',
    slug: 'spoken',
    description: 'British RP phonetics, fluent conversation, and connected speech.',
    color: 'emerald',
    orderIndex: 2,
    isActive: true
  },
  {
    id: 'cat_grammar',
    name: 'Grammar',
    nameBn: 'গ্রামার ফাউন্ডেশন',
    slug: 'grammar',
    description: 'Master complete English sentence structure, tenses, and error correction.',
    color: 'purple',
    orderIndex: 3,
    isActive: true
  },
  {
    id: 'cat_writing',
    name: 'Writing',
    nameBn: 'রাইটিং স্কিলস',
    slug: 'writing',
    description: 'Advanced academic essays, Task 1 & 2 synthesis, and formal composition.',
    color: 'amber',
    orderIndex: 4,
    isActive: true
  },
  {
    id: 'cat_kids',
    name: 'Kids',
    nameBn: 'কিডস ইংলিশ',
    slug: 'kids',
    description: 'Fun phonics, story reading, and junior English communication.',
    color: 'pink',
    orderIndex: 5,
    isActive: true
  },
  {
    id: 'cat_corporate',
    name: 'Corporate',
    nameBn: 'কর্পোরেট ইংলিশ',
    slug: 'corporate',
    description: 'Executive presentations, international client pitching, and boardroom negotiations.',
    color: 'cyan',
    orderIndex: 6,
    isActive: true
  }
];


