import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  KeyRound, Shield, Check, X, Users, Lock, 
  CheckCircle2, AlertCircle, Laptop, Clock, Save 
} from 'lucide-react';
import { UserRole } from '../../types/lms';

export const AuthPermissionManager: React.FC = () => {
  const { rolePermissions, updateRolePermission, language, t } = useLms();
  const [saveNotification, setSaveNotification] = useState(false);

  // Password hashing simulator state
  const [testPassword, setTestPassword] = useState('Admin@2025#Alom');
  const [hashedOutput, setHashedOutput] = useState('$2y$12$eImiTXuWVxfM37uY4JANjOL.oUkvwpndGfj9p18B8u9L9W1W/vFmS');

  // Simulated session audit log
  const loginAuditLogs = [
    { user: 'Engr. Mahbubul Alom', role: 'super_admin', ip: '103.230.106.12 (Dhaka)', time: 'Today 10:14 AM', device: 'Chrome / macOS Sonoma', status: 'Success' },
    { user: 'Shamim Reza', role: 'admin', ip: '103.230.106.15 (Mirpur)', time: 'Today 09:30 AM', device: 'Chrome / Windows 11', status: 'Success' },
    { user: 'Tanvir Ahmed', role: 'teacher', ip: '182.160.118.4 (Dhanmondi)', time: 'Today 08:45 AM', device: 'Firefox / iPad OS', status: 'Success' },
    { user: 'Rafiq Hasan', role: 'student', ip: '103.145.132.8 (Dhaka)', time: 'Today 08:12 AM', device: 'Mobile Safari / iOS 18', status: 'Success' }
  ];

  const handleToggle = (role: UserRole, key: any, currentVal: boolean) => {
    updateRolePermission(role, key, !currentVal);
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 2000);
  };

  const handleRehash = () => {
    // Generate simulated bcrypt hash string
    const salt = Math.random().toString(36).substring(2, 12);
    setHashedOutput(`$2y$12$${salt}oUkvwpndGfj9p18B8u9L9W1W/vFmS`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
            Roadmap Step 2 · অথেনটিকেশন ও রোল পারমিশন
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Role-Based Access Control (RBAC) & Security Policy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage granular capabilities across 8 operational roles and audit authentication sessions
          </p>
        </div>

        {saveNotification && (
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            Permission Policy Updated! ✓
          </span>
        )}
      </div>

      {/* Role Permission Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Access Control Matrix (8 Operational Roles)
          </h3>
          <span className="text-xs text-slate-400">
            Click any toggle to customize capability
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold">
                <th className="py-3 px-4">Role Title</th>
                <th className="py-3 px-3 text-center">Manage Users</th>
                <th className="py-3 px-3 text-center">Courses</th>
                <th className="py-3 px-3 text-center">Fee Collections</th>
                <th className="py-3 px-3 text-center">Attendance</th>
                <th className="py-3 px-3 text-center">Exams</th>
                <th className="py-3 px-3 text-center">Grading</th>
                <th className="py-3 px-3 text-center">Certificates</th>
                <th className="py-3 px-3 text-center">CMS Editor</th>
                <th className="py-3 px-3 text-center">DB Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rolePermissions.map((rp) => (
                <tr key={rp.role} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 capitalize">
                    {rp.title}
                  </td>

                  {[
                    { key: 'canManageUsers', val: rp.canManageUsers },
                    { key: 'canManageCourses', val: rp.canManageCourses },
                    { key: 'canManagePayments', val: rp.canManagePayments },
                    { key: 'canMarkAttendance', val: rp.canMarkAttendance },
                    { key: 'canCreateExams', val: rp.canCreateExams },
                    { key: 'canGradeAssignments', val: rp.canGradeAssignments },
                    { key: 'canIssueCertificates', val: rp.canIssueCertificates },
                    { key: 'canEditCMS', val: rp.canEditCMS },
                    { key: 'canExportDatabase', val: rp.canExportDatabase }
                  ].map((perm, idx) => (
                    <td key={idx} className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggle(rp.role, perm.key, perm.val)}
                        className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-colors ${
                          perm.val
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={perm.val ? 'Permitted' : 'Restricted'}
                      >
                        {perm.val ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Hashing & Login Audit Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Password Hashing Security Box */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">PHP 8.3 password_hash() Validator</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Passwords are encrypted using <strong>PASSWORD_BCRYPT</strong> with cost 12. Plaintext passwords are never saved into database tables.
          </p>

          <div className="space-y-2 text-xs">
            <label className="block font-semibold text-slate-700">Sample Plaintext Password:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPassword}
                onChange={e => setTestPassword(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-hidden"
              />
              <button
                onClick={handleRehash}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Hash
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg text-slate-200 font-mono text-[11px] break-all space-y-1">
              <span className="text-slate-400 block">// Generated BCrypt Hash:</span>
              <span className="text-emerald-400">{hashedOutput}</span>
            </div>
          </div>
        </div>

        {/* Live Session & Login Activity Logs */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Recent Login Session Audit Logs</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Live Auth Trail</span>
          </div>

          <div className="space-y-2.5">
            {loginAuditLogs.map((log, i) => (
              <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{log.user} ({log.role})</div>
                  <div className="text-[11px] text-slate-500">IP: {log.ip} · {log.device}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {log.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
