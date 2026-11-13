import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Package, Download, ShieldCheck, CheckCircle2, FileText, 
  ExternalLink, Key, Sparkles, AlertCircle, 
  FolderArchive, BookOpen, Terminal, Layers 
} from 'lucide-react';

export const EnvatoPackageExporter: React.FC = () => {
  const { envatoLicense, verifyEnvatoPurchaseCode, language } = useLms();
  const isBn = language === 'bn';

  const [inputCode, setInputCode] = useState(envatoLicense.purchaseCode);
  const [verifyStatus, setVerifyStatus] = useState<{ isValid: boolean; message: string } | null>(null);

  const handleVerifyLicense = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyEnvatoPurchaseCode(inputCode);
    setVerifyStatus(res);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0d1f38] via-[#0f3460] to-[#16213e] text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider">
              Pre-release build
            </span>
            <span className="text-xs text-blue-200">Custom PHP 8.3 API · React 19 · Vite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Release Preparation & Packaging Status
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Package downloads are blocked until the current API, migrations, security checks, and clean cPanel deployment are validated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            disabled title="Temporarily unavailable until production release validation is complete"
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Blocked — release validation pending</span>
          </button>

          <button
            disabled title="Temporarily unavailable until marketplace release validation is complete"
            className="w-full sm:w-auto px-6 py-3.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Blocked — marketplace validation pending</span>
          </button>
        </div>
      </div>

      {/* Deliverables Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderArchive className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">ALOMS-LMS-CPANEL-INSTALLER.zip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              A cPanel package will be enabled only after the current PHP API, additive migrations, and browser installer are packaged and rehearsed together.
            </p>
          </div>
          <button
            disabled title="Package is not release-ready yet"
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Not available yet</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">ALOMS-LMS-CODECANYON-PACKAGE.zip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Marketplace packaging is not available yet. A real release ZIP, reviewer accounts, licensing workflow, and Envato submission checks must be prepared first.
            </p>
          </div>
          <button
            disabled title="Package is not release-ready yet"
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Not available yet</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">ALOMS-LMS-DOCUMENTATION.zip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Release documentation will be generated from the validated package and its actual API routes.
            </p>
          </div>
          <button
            disabled title="Package is not release-ready yet"
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Not available yet</span>
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
            {envatoLicense.isValid ? envatoLicense.licenseType : 'Unverified'}
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
            <span className={`font-bold ${envatoLicense.isValid ? 'text-emerald-600' : 'text-amber-700'} flex items-center gap-1 mt-0.5`}>
              <span className={`w-2 h-2 rounded-full ${envatoLicense.isValid ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{envatoLicense.isValid ? 'Verified' : 'Not verified'}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Buyer Username</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{envatoLicense.buyerUsername || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Support Expiration</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{envatoLicense.supportedUntil || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Product Release</span>
            <span className="font-mono font-bold text-blue-600 mt-0.5 block">{envatoLicense.itemVersion || '—'}</span>
          </div>
        </div>
      </div>


    </div>
  );
};
