import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Database, Play, Download, Copy, Check, Terminal, 
  Table, Key, ArrowRight, ShieldCheck, RefreshCw 
} from 'lucide-react';

export const DatabaseMigrationManager: React.FC = () => {
  const { language, courses, users, payments, branches } = useLms();

  const [activeTab, setActiveTab] = useState<'migrations' | 'query_runner' | 'schema_tables'>('migrations');
  const [selectedMigrationFile, setSelectedMigrationFile] = useState(0);
  const [copied, setCopied] = useState(false);

  // SQL Query console simulator
  const [sqlQuery, setSqlQuery] = useState("SELECT id, name, code, city, student_count FROM branches;");
  const [queryResult, setQueryResult] = useState<any[]>(branches);
  const [queryExecuted, setQueryExecuted] = useState(true);

  const migrations = [
    {
      file: '001_create_branches_and_users.sql',
      tables: ['branches', 'users', 'roles', 'permissions'],
      content: `-- Migration 001: Core Architecture & RBAC
CREATE TABLE \`branches\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(150) NOT NULL,
  \`name_bn\` VARCHAR(150) NOT NULL,
  \`code\` VARCHAR(20) UNIQUE NOT NULL,
  \`city\` VARCHAR(100) NOT NULL,
  \`address\` TEXT NOT NULL,
  \`phone\` VARCHAR(30) NOT NULL,
  \`manager_name\` VARCHAR(100) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`branch_id\` INT DEFAULT 1,
  \`student_id\` VARCHAR(50) UNIQUE DEFAULT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`name_bn\` VARCHAR(150) DEFAULT NULL,
  \`email\` VARCHAR(150) UNIQUE NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(30) NOT NULL,
  \`role\` ENUM('super_admin','admin','branch_manager','teacher','assistant_teacher','accountant','student','guardian') NOT NULL,
  \`avatar\` VARCHAR(255) DEFAULT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      file: '002_create_courses_modules_lessons.sql',
      tables: ['courses', 'course_categories', 'modules', 'lessons', 'enrollments'],
      content: `-- Migration 002: Learning Management & Lessons
CREATE TABLE \`courses\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`title\` VARCHAR(200) NOT NULL,
  \`title_bn\` VARCHAR(200) NOT NULL,
  \`slug\` VARCHAR(200) UNIQUE NOT NULL,
  \`category\` VARCHAR(50) NOT NULL,
  \`subtitle\` TEXT,
  \`description\` LONGTEXT,
  \`instructor_id\` INT,
  \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`original_price\` DECIMAL(10,2) DEFAULT 0.00,
  \`duration_weeks\` INT DEFAULT 8,
  \`level\` ENUM('Beginner','Intermediate','Advanced','All Levels') DEFAULT 'Intermediate',
  \`thumbnail\` VARCHAR(255),
  \`is_featured\` TINYINT(1) DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`instructor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`lessons\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`course_id\` INT NOT NULL,
  \`module_title\` VARCHAR(200) NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`duration_minutes\` INT DEFAULT 30,
  \`video_url\` VARCHAR(255) NOT NULL,
  \`order_index\` INT DEFAULT 1,
  \`notes\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      file: '003_create_live_classes_and_attendance.sql',
      tables: ['live_classes', 'attendance', 'attendance_audit_logs'],
      content: `-- Migration 003: Live Virtual Sessions & Daily Attendance
CREATE TABLE \`live_classes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`course_id\` INT NOT NULL,
  \`teacher_id\` INT NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`class_date\` DATE NOT NULL,
  \`class_time\` TIME NOT NULL,
  \`platform\` ENUM('google_meet','zoom','teams') DEFAULT 'google_meet',
  \`meeting_url\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('upcoming','live','completed','cancelled') DEFAULT 'upcoming',
  \`recording_url\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`attendance\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`course_id\` INT NOT NULL,
  \`student_id\` INT NOT NULL,
  \`attendance_date\` DATE NOT NULL,
  \`status\` ENUM('present','absent','late') NOT NULL DEFAULT 'present',
  \`remarks\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`unique_attendance\` (\`course_id\`, \`student_id\`, \`attendance_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      file: '004_create_exams_questions_results.sql',
      tables: ['exams', 'questions', 'options', 'exam_submissions', 'student_answers'],
      content: `-- Migration 004: Timed MCQ & Diagnostic Examinations
CREATE TABLE \`exams\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`course_id\` INT NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`duration_minutes\` INT NOT NULL DEFAULT 15,
  \`total_marks\` DECIMAL(6,2) NOT NULL DEFAULT 20.00,
  \`pass_marks\` DECIMAL(6,2) NOT NULL DEFAULT 12.00,
  \`negative_mark\` DECIMAL(4,2) DEFAULT 0.25,
  \`status\` ENUM('active','upcoming','expired') DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      file: '005_create_payments_invoices_expenses.sql',
      tables: ['payments', 'invoices', 'expenses', 'financial_ledgers'],
      content: `-- Migration 005: Financial Management (bKash, Nagad, Bank, Cash)
CREATE TABLE \`payments\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`invoice_number\` VARCHAR(50) UNIQUE NOT NULL,
  \`student_id\` INT NOT NULL,
  \`course_id\` INT NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`method\` ENUM('bKash','Nagad','Bank Transfer','Cash') NOT NULL,
  \`trx_id\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('verified','pending','rejected') DEFAULT 'pending',
  \`branch_id\` INT DEFAULT 1,
  \`note\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      file: '006_create_certificates_and_notices.sql',
      tables: ['certificates', 'notices', 'announcements'],
      content: `-- Migration 006: ISO Verifiable Credentials & Notices
CREATE TABLE \`certificates\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`certificate_number\` VARCHAR(50) UNIQUE NOT NULL,
  \`student_id\` INT NOT NULL,
  \`course_id\` INT NOT NULL,
  \`issue_date\` DATE NOT NULL,
  \`grade\` VARCHAR(50) NOT NULL,
  \`authorized_by\` VARCHAR(100) NOT NULL,
  \`verification_hash\` VARCHAR(64) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      file: '007_create_website_cms_and_audit_logs.sql',
      tables: ['website_settings', 'blog_posts', 'testimonials', 'audit_logs'],
      content: `-- Migration 007: Public Website CMS & Cyber Security Audit Trail
CREATE TABLE \`website_settings\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`key_name\` VARCHAR(100) UNIQUE NOT NULL,
  \`key_value\` LONGTEXT,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`audit_logs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT,
  \`action\` VARCHAR(100) NOT NULL,
  \`ip_address\` VARCHAR(45) NOT NULL,
  \`user_agent\` TEXT,
  \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(migrations[selectedMigrationFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunQuery = () => {
    const q = sqlQuery.trim().toLowerCase();
    if (q.includes('course')) {
      setQueryResult(courses.map(c => ({ id: c.id, title: c.title, category: c.category, price: `৳${c.price}`, duration: `${c.durationWeeks}w` })));
    } else if (q.includes('payment') || q.includes('revenue')) {
      setQueryResult(payments.map(p => ({ invoice: p.invoiceNumber, student: p.studentName, method: p.method, amount: `৳${p.amount}`, status: p.status })));
    } else if (q.includes('user') || q.includes('student')) {
      setQueryResult(users.map(u => ({ id: u.studentId || u.id, name: u.name, role: u.role, phone: u.phone, active: u.isActive ? '1' : '0' })));
    } else {
      setQueryResult(branches);
    }
    setQueryExecuted(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
            Roadmap Step 1 · ডাটাবেজ ও মাইগ্রেশন
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            MySQL 8.0 / MariaDB Database Migrations Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            25+ Normalized tables, foreign keys, UTF8MB4 collation, and automated cPanel installer scripts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const fullSql = migrations.map(m => m.content).join('\n\n');
              const blob = new Blob([fullSql], { type: 'text/sql' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'aloms_lms_all_migrations.sql';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All .SQL Migrations</span>
          </button>
        </div>
      </div>

      {/* Tabs: Migrations / SQL Console / Schema Explorer */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('migrations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'migrations'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Migration Files (7)
        </button>
        <button
          onClick={() => setActiveTab('query_runner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'query_runner'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Live SQL Query Console
        </button>
      </div>

      {activeTab === 'migrations' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* File selector */}
          <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50 p-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Ordered Migration Sequence
            </span>

            {migrations.map((m, idx) => (
              <button
                key={m.file}
                onClick={() => setSelectedMigrationFile(idx)}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-colors flex flex-col gap-1 ${
                  selectedMigrationFile === idx
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <div className="truncate">{m.file}</div>
                <div className={`text-[10px] truncate ${selectedMigrationFile === idx ? 'text-blue-100' : 'text-slate-400'}`}>
                  Tables: {m.tables.join(', ')}
                </div>
              </button>
            ))}
          </div>

          {/* Migration SQL viewer */}
          <div className="lg:col-span-8 flex flex-col bg-slate-950 text-slate-200">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-400">
                {migrations[selectedMigrationFile].file}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto max-h-[480px]">
              <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre font-normal">
                {migrations[selectedMigrationFile].content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'query_runner' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Interactive MySQL Simulator</h3>
              <p className="text-xs text-slate-500">Run queries against the live in-memory Alom's English Center dataset</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSqlQuery("SELECT * FROM courses;")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700"
              >
                courses
              </button>
              <button
                onClick={() => setSqlQuery("SELECT * FROM payments;")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700"
              >
                payments
              </button>
              <button
                onClick={() => setSqlQuery("SELECT * FROM users;")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700"
              >
                users
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden bg-slate-950 text-emerald-400"
            />
            <button
              onClick={handleRunQuery}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Execute</span>
            </button>
          </div>

          {queryExecuted && (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px]">
                  <tr>
                    {queryResult[0] && Object.keys(queryResult[0]).map(key => (
                      <th key={key} className="py-2 px-3">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queryResult.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="py-2 px-3 truncate max-w-xs">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
