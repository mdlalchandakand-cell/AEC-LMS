import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

type GuardianRequest = Record<string, unknown>;

export const GuardianLinkRequests: React.FC<{ language: 'bn' | 'en' }> = ({ language }) => {
  const isBn = language === 'bn';
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const result = await apiClient.guardians.getIncoming();
    if (result.success && Array.isArray(result.data)) setRequests(result.data);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const respond = async (id: number, decision: 'accept' | 'reject') => {
    setBusyId(id); setMessage('');
    const result = await apiClient.guardians.respond(id, decision);
    if (result.success) {
      setMessage(decision === 'accept'
        ? (isBn ? 'অভিভাবক সংযোগ অনুমোদন করা হয়েছে।' : 'Guardian link approved.')
        : (isBn ? 'অনুরোধ প্রত্যাখ্যান করা হয়েছে।' : 'Request rejected.'));
      await refresh();
    } else setMessage(result.error || 'Could not update request.');
    setBusyId(null);
  };

  if (requests.length === 0 && !message) return null;

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-3">
      <div className="flex items-center gap-2 text-blue-900"><ShieldCheck className="w-5 h-5" /><h3 className="font-bold text-sm">{isBn ? 'অভিভাবক সংযোগের অনুরোধ' : 'Guardian access requests'}</h3></div>
      <p className="text-xs text-slate-600">{isBn ? 'অনুমোদন করলে নির্বাচিত অভিভাবক আপনার কোর্স, উপস্থিতি, পরীক্ষার ফল ও পেমেন্টের সারাংশ দেখতে পারবেন।' : 'Approving gives this guardian read-only access to your course, attendance, exam, certificate, and payment summaries. You can revoke access later.'}</p>
      {message && <p role="status" className="text-xs font-semibold text-blue-800">{message}</p>}
      {requests.map(request => {
        const id = Number(request.id);
        return (
          <div key={id} className="bg-white rounded-xl border border-blue-100 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><div className="font-bold text-sm text-slate-900">{String(request.guardian_name || 'Guardian')}</div><div className="text-xs text-slate-500">{String(request.guardian_email || '')} · {String(request.relationship || 'Guardian')}</div></div>
            <div className="flex gap-2">
              <button disabled={busyId === id} onClick={() => void respond(id, 'accept')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{isBn ? 'অনুমোদন' : 'Approve'}</button>
              <button disabled={busyId === id} onClick={() => void respond(id, 'reject')} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold disabled:opacity-50 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{isBn ? 'প্রত্যাখ্যান' : 'Reject'}</button>
            </div>
          </div>
        );
      })}
    </section>
  );
};
