import React, { useEffect, useState } from 'react';
import { X, Search, Award, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient, CertificateVerification } from '../../services/apiClient';
import { useLms } from '../../context/LmsContext';

interface CertificateVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const CertificateVerifyModal: React.FC<CertificateVerifyModalProps> = ({ isOpen, onClose, initialCode = '' }) => {
  const { language, t } = useLms();
  const [certCode, setCertCode] = useState(initialCode);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchedCert, setMatchedCert] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCertCode(initialCode);
      setSearched(false);
      setMatchedCert(null);
      setError('');
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSearched(false);
    setError('');
    setMatchedCert(null);
    const result = await apiClient.certificates.verify(certCode);
    setLoading(false);
    setSearched(true);
    if (result.success && result.data) setMatchedCert(result.data);
    else setError(result.error || 'No certificate record was found.');
  };

  const isValid = matchedCert?.valid === true;

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="bg-[#0b1e36] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><Award className="w-5 h-5 text-amber-400" /><h3 className="font-bold">{language === 'bn' ? 'অনলাইন সনদপত্র যাচাইকরণ' : 'Official Certificate Verification'}</h3></div>
        <button onClick={onClose} className="p-1 text-slate-300 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 space-y-5">
        <p className="text-xs text-slate-600">{language === 'bn' ? 'সনদপত্রে থাকা ইউনিক নম্বর লিখে কেন্দ্রীয় রেজিস্ট্রি থেকে যাচাই করুন।' : 'Enter the certificate number printed on the credential. Verification checks the live certificate registry.'}</p>
        <form onSubmit={handleVerify} className="flex gap-2">
          <input required maxLength={40} value={certCode} onChange={event => setCertCode(event.target.value.toUpperCase())} placeholder="AEC-CERT-2026-XXXXXXXXXXXX" className="min-w-0 flex-1 px-3.5 py-2.5 text-xs font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <button disabled={loading} type="submit" className="px-4 py-2.5 bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"><Search className="w-4 h-4" />{loading ? 'Checking…' : language === 'bn' ? 'যাচাই' : 'Verify'}</button>
        </form>
        {loading && <div className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking official registry…</div>}
        {searched && matchedCert && <div className={isValid ? 'p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3' : 'p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3'}>
          <div className={isValid ? 'flex items-center gap-2 text-emerald-800 font-bold text-sm' : 'flex items-center gap-2 text-rose-800 font-bold text-sm'}>
            {isValid ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {isValid ? 'Valid official certificate' : 'Certificate revoked — not valid'}
          </div>
          <div className="bg-white p-3.5 rounded-lg border space-y-2 text-xs">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Certificate No.</span><strong className="font-mono">{matchedCert.certificateNumber}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Student</span><strong>{matchedCert.studentName}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Course</span><strong>{matchedCert.courseTitle}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Completion</span><span>{matchedCert.completionDate}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Grade</span><strong>{matchedCert.grade}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Issued</span><span>{matchedCert.issueDate}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Authorized by</span><span>{matchedCert.authorizedBy}</span></div>
            {!isValid && matchedCert.revokedAt && <div className="text-rose-700 border-t pt-2">Revoked: {matchedCert.revokedAt}</div>}
          </div>
        </div>}
        {searched && !matchedCert && <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-3"><AlertCircle className="w-5 h-5 shrink-0" /><div><strong className="block">No record found</strong>{error}</div></div>}
        <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold">{t.close}</button></div>
      </div>
    </div>
  </div>;
};
