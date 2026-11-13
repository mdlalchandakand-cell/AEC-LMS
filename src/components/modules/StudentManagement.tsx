import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { 
  Users, Search, Filter, Download, Plus, IdCard, 
  Phone, Mail, Trash2, RefreshCw
} from 'lucide-react';
import { User } from '../../types/lms';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { AdmissionApplicationsManager } from './AdmissionApplicationsManager';

interface StudentManagementProps {
  onPrintIdCard: (student: User) => void;
  onOpenAdmission: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ 
  onPrintIdCard,
  onOpenAdmission 
}) => {
  const { branches, language, t, currentUser } = useLms();
  const isBranchManager = currentUser.role === 'branch_manager';
  const canReviewAdmissions = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await apiClient.users.getAll(searchQuery, 100);
    if (!result.success || !Array.isArray(result.data)) {
      setError(result.error || 'Could not load students from the server.');
      setStudents([]);
      setLoading(false);
      return;
    }
    const mapped: User[] = (result.data as Array<Record<string, unknown>>)
      .filter(row => row.role === 'student')
      .map(row => {
        const id = String(row.id ?? '');
        const createdAt = String(row.created_at || '');
        return {
          id,
          name: String(row.name || ''),
          email: String(row.email || ''),
          phone: String(row.phone || ''),
          role: 'student',
          avatar: '',
          branchId: row.branch_id == null ? '' : String(row.branch_id),
          isActive: Boolean(Number(row.is_active)),
          studentId: id,
          joinedDate: createdAt ? createdAt.slice(0, 10) : '—',
        };
      });
    setStudents(mapped);
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const handleDeactivate = async () => {
    if (!studentToDelete) return false;
    setError('');
    const result = await apiClient.users.deactivate(Number(studentToDelete.id));
    if (!result.success) {
      setError(result.error || 'Student account could not be deactivated.');
      return false;
    }
    setNotice(studentToDelete.name + "'s account has been deactivated. Their academic records are retained.");
    await loadStudents();
    setStudentToDelete(null);
    return true;
  };

  const filteredStudents = useMemo(() => students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.phone.includes(searchQuery) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = selectedBranch === 'all' || s.branchId === selectedBranch;
    const matchesStatus = selectedStatus === 'all' || (selectedStatus === 'active' ? s.isActive : !s.isActive);

    return matchesSearch && matchesBranch && matchesStatus;
  }), [students, searchQuery, selectedBranch, selectedStatus]);

  const handleExportCsv = () => {
    const headers = ['Student ID', 'Full Name', 'Phone', 'Email', 'Branch', 'Joined Date', 'Status'];
    const rows = filteredStudents.map(s => [
      s.studentId || 'N/A',
      s.name,
      s.phone,
      s.email,
      branches.find(b => b.id === s.branchId)?.name || 'Dhaka',
      s.joinedDate,
      s.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aloms_students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            {t.studentsMenu} Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {students.length} Registered Students across Bangladesh campuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadStudents()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCsv}</span>
          </button>

          {canReviewAdmissions && <button
            onClick={onOpenAdmission}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Admission</span>
          </button>}
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by student name, account ID, mobile number..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          {!isBranchManager && <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden text-slate-700"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>}

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Account ID</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading students from the server…</td></tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  const branch = branches.find(b => b.id === student.branchId);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-blue-50 text-xs font-bold text-blue-700">{student.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                          <div>
                            <div className="font-bold text-slate-900">{student.name}</div>
                            {student.nameBn && (
                              <div className="text-[11px] text-slate-500">{student.nameBn}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        #{student.id}
                      </td>

                      <td className="py-3 px-4 space-y-0.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{student.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{student.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {branch ? branch.city : student.branchId ? 'Branch #' + student.branchId : 'Unassigned'}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {branch?.code || (student.branchId ? 'ID ' + student.branchId : 'No branch assigned')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {student.joinedDate}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          student.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${student.isActive ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onPrintIdCard(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                            title="Generate & Print Student ID Card"
                          >
                            <IdCard className="w-3.5 h-3.5" />
                            <span>Print ID</span>
                          </button>

                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Delete Student Record (With Confirmation)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No students found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canReviewAdmissions && <AdmissionApplicationsManager />}

      {/* Confirmation Modal for Student Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleDeactivate}
        title="Confirm Student Account Deactivation"
        titleBn="শিক্ষার্থী অ্যাকাউন্ট নিষ্ক্রিয় করার নিশ্চিতকরণ"
        itemName={studentToDelete ? `${studentToDelete.name} (${studentToDelete.studentId || 'ID: AEC-2025'})` : ''}
        message="Are you sure you want to deactivate this student account? The student will no longer be able to sign in. Academic, payment, attendance and exam records will be retained."
        messageBn="আপনি কি এই শিক্ষার্থীর অ্যাকাউন্ট নিষ্ক্রিয় করতে চান? শিক্ষার্থী আর লগইন করতে পারবে না, তবে একাডেমিক, পেমেন্ট, উপস্থিতি ও পরীক্ষার রেকর্ড সংরক্ষিত থাকবে।"
        confirmText="Yes, Deactivate Account"
        confirmTextBn="হ্যাঁ, অ্যাকাউন্ট নিষ্ক্রিয় করুন"
        requireTyping={false}
        language={language}
      />
    </div>
  );
};
