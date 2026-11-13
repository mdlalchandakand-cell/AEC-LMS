import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ClipboardList, ExternalLink } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

type ApplicationStatus = 'pending' | 'contacted' | 'rejected';
interface AdmissionApplication {
  id: number;
  reference_code: string;
  applicant_name: string;
  email: string;
  phone: string;
  course_title: string;
  branch_label: string | null;
  preferred_contact: 'phone' | 'email';
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  review_notes: string | null;
}

export const AdmissionApplicationsManager: React.FC = () => {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await apiClient.admissions.getAll(filter === 'all' ? '' : filter);
    if (!result.success || !Array.isArray(result.data)) {
      setApplications([]);
      setError(result.error || 'Could not load admission applications.');
      setLoading(false);
      return;
    }
    setApplications(result.data as unknown as AdmissionApplication[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const updateStatus = async (application: AdmissionApplication, status: ApplicationStatus) => {
    if (savingId !== null || application.status === status) return;
    setSavingId(application.id);
    setError('');
    setNotice('');
    const result = await apiClient.admissions.update(application.id, status, application.review_notes || '');
    setSavingId(null);
    if (!result.success) {
      setError(result.error || 'Application status could not be updated.');
      return;
    }
    setApplications(current => current.map(item => item.id === application.id ? { ...item, status } : item));
    setNotice('Application ' + application.reference_code + ' updated.');
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Admission Applications</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">Review public inquiries. An application is not an account, enrollment or payment confirmation.</p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={event => setFilter(event.target.value as 'all' | ApplicationStatus)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="rejected">Rejected</option>
            <option value="all">All applications</option>
          </select>
          <button type="button" onClick={() => void loadApplications()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Applicant</th>
              <th className="px-3 py-3">Course / Campus</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Submitted</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading applications…</td></tr>
            ) : applications.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No applications found for this filter.</td></tr>
            ) : applications.map(application => (
              <tr key={application.id} className="align-top hover:bg-slate-50/70">
                <td className="px-3 py-3">
                  <p className="font-bold text-slate-900">{application.applicant_name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-blue-700">{application.reference_code}</p>
                  {application.message && <p className="mt-2 max-w-xs whitespace-pre-wrap text-[11px] leading-5 text-slate-500">{application.message}</p>}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-800">{application.course_title}</p>
                  <p className="mt-0.5 text-slate-500">{application.branch_label || 'No campus preference'}</p>
                </td>
                <td className="px-3 py-3">
                  <a href={`mailto:${application.email}`} className="block text-blue-700 hover:underline">{application.email}</a>
                  <a href={`tel:${application.phone}`} className="mt-0.5 block text-slate-700 hover:underline">{application.phone}</a>
                  <span className="mt-1 block text-[10px] text-slate-400">Prefers {application.preferred_contact}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-500">{application.created_at}</td>
                <td className="px-3 py-3">
                  <select
                    value={application.status}
                    disabled={savingId !== null}
                    onChange={event => void updateStatus(application, event.target.value as ApplicationStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                    aria-label={`Update status for ${application.reference_code}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  {savingId === application.id && <span className="mt-1 block text-[10px] text-slate-400">Saving…</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
