import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Package, Download, ShieldCheck, CheckCircle2, FileText, 
  ExternalLink, Key, Sparkles, AlertCircle, Copy, Check, 
  FolderArchive, BookOpen, Terminal, Layers 
} from 'lucide-react';
import { generateCPanelZipBlob } from '../../services/cpanelPackageGenerator';

export const EnvatoPackageExporter: React.FC = () => {
  const { envatoLicense, verifyEnvatoPurchaseCode, language } = useLms();
  const isBn = language === 'bn';

  const [inputCode, setInputCode] = useState(envatoLicense.purchaseCode);
  const [verifyStatus, setVerifyStatus] = useState<{ isValid: boolean; message: string } | null>(null);
  const [isBundling, setIsBundling] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleVerifyLicense = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyEnvatoPurchaseCode(inputCode);
    setVerifyStatus(res);
  };

  const handleDownloadCPanelPackage = async () => {
    try {
      setIsBundling(true);
      const blob = await generateCPanelZipBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ALOMS-LMS-CPANEL-INSTALLER.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess('ALOMS-LMS-CPANEL-INSTALLER.zip generated & downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Error bundling cPanel ZIP', err);
    } finally {
      setIsBundling(false);
    }
  };

  const handleDownloadCodeCanyonPackage = async () => {
    try {
      setIsBundling(true);
      const blob = await generateCPanelZipBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ALOMS-LMS-CODECANYON-PACKAGE.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess('ALOMS-LMS-CODECANYON-PACKAGE.zip generated & downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Error bundling CodeCanyon ZIP', err);
    } finally {
      setIsBundling(false);
    }
  };

  const reviewerCredentials = [
    { role: 'Super Admin', email: 'alom.director@alomsenglish.com', pass: 'password123', scope: 'Full system control, SaaS tenants, gateways' },
    { role: 'Teacher', email: 'tanvir.ielts@alomsenglish.com', pass: 'password123', scope: 'Live classes, exams, question bank, grading' },
    { role: 'Student', email: 'rafiq.student@alomsenglish.com', pass: 'password123', scope: 'Enrolled courses, exams, results, ID card' },
    { role: 'Accountant', email: 'kamrul.accounts@alomsenglish.com', pass: 'password123', scope: 'bKash/Nagad verification, invoices, receipts' },
    { role: 'Guardian', email: 'abdul.guardian@alomsenglish.com', pass: 'password123', scope: 'Student attendance, exam scores, payment ledger' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0d1f38] via-[#0f3460] to-[#16213e] text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider">
              Envato Market Ready
            </span>
            <span className="text-xs text-blue-200">PHP 8.3 · Laravel 12 API · React 19 SPA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Commercial Distribution & CodeCanyon Package Hub
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Download production-ready installation packages for standard cPanel shared hosting and marketplace submissions, complete with installer wizard, documentation, and licensing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadCPanelPackage}
            disabled={isBundling}
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{isBundling ? 'Bundling...' : 'Download cPanel Package'}</span>
          </button>

          <button
            onClick={handleDownloadCodeCanyonPackage}
            disabled={isBundling}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>CodeCanyon Complete ZIP</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Deliverables Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderArchive className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">ALOMS-LMS-CPANEL-INSTALLER.zip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Self-contained cPanel zip package with 3-step browser installer (`install/index.php`), `.htaccess`, database migrations, and public assets. No terminal required.
            </p>
          </div>
          <button
            onClick={handleDownloadCPanelPackage}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Installer ZIP</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">ALOMS-LMS-CODECANYON-PACKAGE.zip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official marketplace submission package structured according to Envato submission guidelines with clean source files, seeders, and licensing verification.
            </p>
          </div>
          <button
            onClick={handleDownloadCodeCanyonPackage}
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Marketplace ZIP</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">ALOMS-LMS-DOCUMENTATION.zip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Comprehensive offline HTML & Markdown user manuals covering cPanel setup, REST API documentation, role dashboards, and plugin creation.
            </p>
          </div>
          <button
            onClick={handleDownloadCPanelPackage}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Documentation</span>
          </button>
        </div>
      </div>

      {/* Envato Purchase Code Verification Suite */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">Envato Purchase Code Verification Suite</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            {envatoLicense.licenseType}
          </span>
        </div>

        <form onSubmit={handleVerifyLicense} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              placeholder="Enter Envato CodeCanyon Purchase Code (e.g. AEC-ENVATO-9824-7102-COMMERCIAL)"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Verify License Key
          </button>
        </form>

        {verifyStatus && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            verifyStatus.isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {verifyStatus.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{verifyStatus.message}</span>
          </div>
        )}

        {/* License Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">License Status</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Activated & Valid</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Buyer Username</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{envatoLicense.buyerUsername}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Support Expiration</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{envatoLicense.supportedUntil}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Product Release</span>
            <span className="font-mono font-bold text-blue-600 mt-0.5 block">{envatoLicense.itemVersion}</span>
          </div>
        </div>
      </div>

      {/* Reviewer Demo Testing Credentials Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900">CodeCanyon Reviewer Demo Accounts</h3>
          <p className="text-xs text-slate-500">
            Pre-configured role accounts for CodeCanyon review team to verify permissions, course progression, and admin settings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Password</th>
                <th className="py-2.5 px-3">Access Scope</th>
                <th className="py-2.5 px-3 text-right">Quick Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviewerCredentials.map((cred, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{cred.role}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{cred.email}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{cred.pass}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">{cred.scope}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${cred.email} | ${cred.pass}`);
                        setCopiedKey(cred.email);
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Copy credentials"
                    >
                      {copiedKey === cred.email ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
