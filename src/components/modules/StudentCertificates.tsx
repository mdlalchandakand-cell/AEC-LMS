import React, { useCallback, useEffect, useState } from 'react';
import { Award, Printer, RefreshCw, X } from 'lucide-react';
import { apiClient, CertificateApiRecord } from '../../services/apiClient';

export const StudentCertificates: React.FC = () => {
  const [items, setItems] = useState<CertificateApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CertificateApiRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await apiClient.certificates.getMine();
    if (result.success && result.data) setItems(result.data);
    else setError(result.error || 'Could not load your certificates.');
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white rounded-xl border p-5">
        <div>
          <h2 className="font-bold text-lg">My Certificates</h2>
          <p className="text-xs text-slate-500 mt-1">Certificates issued to your student account.</p>
        </div>
        <button onClick={() => void refresh()} className="p-2 text-slate-500 hover:text-blue-600" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading your certificates…</p> :
        items.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <Award className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold mt-3">No certificates issued yet</p>
            <p className="text-xs text-slate-500 mt-1">After you complete a course and the center issues your certificate, it will appear here.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map(item => (
              <article key={item.id} className="bg-white border rounded-xl p-5 space-y-3">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700">{item.certificateNumber}</span>
                  <span className={item.status === 'issued' ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'}>
                    {item.status === 'issued' ? 'Valid' : 'Revoked'}
                  </span>
                </div>
                <h3 className="font-bold">{item.courseTitle}</h3>
                <p className="text-xs text-slate-500">Issued {new Date(item.issueDate).toLocaleDateString()} · Result: {item.grade}</p>
                {item.status === 'issued' && (
                  <button onClick={() => setSelected(item)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs flex items-center gap-2">
                    <Printer className="w-4 h-4" /> View / Print certificate
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="certificate-print bg-white w-full max-w-3xl rounded-xl p-8 text-center border-[10px] border-amber-500/40">
            <div className="no-print flex justify-end gap-2 mb-4">
              <button onClick={() => window.print()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={() => setSelected(null)} className="px-3 py-2 bg-slate-100 rounded-lg text-xs flex items-center gap-1">
                <X className="w-4 h-4" /> Close
              </button>
            </div>
            <Award className="w-12 h-12 text-amber-600 mx-auto" />
            <h1 className="text-2xl font-black mt-3">ALOM'S ENGLISH CENTER</h1>
            <p className="text-xs tracking-widest text-amber-700 mt-1">CERTIFICATE OF COMPLETION</p>
            <p className="text-sm text-slate-500 mt-8">This certifies that</p>
            <h2 className="text-3xl font-serif font-bold my-3">{selected.studentName}</h2>
            <p className="text-sm text-slate-600">has successfully completed</p>
            <h3 className="text-xl font-bold text-blue-900 my-2">{selected.courseTitle}</h3>
            <p className="text-sm mt-4">Result: <strong>{selected.grade}</strong></p>
            <p className="text-xs text-slate-500 mt-2">Completion date: {selected.completionDate}</p>
            <div className="border-t mt-8 pt-4 flex justify-between gap-3 text-left text-xs">
              <div><strong>{selected.certificateNumber}</strong><p>Issued: {new Date(selected.issueDate).toLocaleDateString()}</p></div>
              <div className="text-right"><strong>{selected.authorizedBy}</strong><p>Authorized by</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
