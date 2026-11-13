import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Download, FileCode, Server, Database, CheckCircle, 
  Copy, Check, ShieldCheck, Terminal, FolderTree, BookOpen 
} from 'lucide-react';
import { getCPanelPackageFiles, generateCPanelZipBlob, CPanelFile } from '../../services/cpanelPackageGenerator';

export const CPanelPackageExporter: React.FC = () => {
  const { language, t } = useLms();
  const files = getCPanelPackageFiles();
  const [selectedFile, setSelectedFile] = useState<CPanelFile>(files[0]);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const blob = await generateCPanelZipBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aloms-english-center-lms-cpanel.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setDownloadError('Could not package ZIP. Please ensure browser memory is sufficient.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Download CTA */}
      <div className="bg-gradient-to-r from-[#0b1e36] to-[#0f3460] text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span>PHP 8.3 & MySQL / MariaDB Shared cPanel Ready</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            cPanel Production Deployment Package
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Full source code bundle ready to upload to any cPanel hosting (e.g. Hostinger, Bluehost, Namecheap, ExonHost). Includes automated 3-step web installer (/install), complete MySQL database schema, .htaccess, and bilingual documentation.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="px-6 py-3.5 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Download className="w-5 h-5 text-slate-950" />
          <span>{isDownloading ? 'Packaging ZIP...' : 'Download cPanel Package (ZIP)'}</span>
        </button>
      </div>

      {/* cPanel 3-Step Setup Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            1
          </div>
          <h3 className="font-bold text-xs text-slate-900">Upload to public_html</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Upload the downloaded ZIP to your cPanel File Manager in <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">public_html</code> and extract all files.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            2
          </div>
          <h3 className="font-bold text-xs text-slate-900">Create MySQL Database</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            In cPanel "MySQL Database Wizard", create a database and user with ALL PRIVILEGES.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            3
          </div>
          <h3 className="font-bold text-xs text-slate-900">Run /install Wizard</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Visit <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">yourdomain.com/install</code> in your browser to run the auto schema importer and set the Super Admin password.
          </p>
        </div>
      </div>

      {/* File Explorer & Code Viewer */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        {/* Left: File Tree */}
        <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="font-bold text-xs text-slate-500 uppercase tracking-wider px-2">
            Package File Contents ({files.length} Files)
          </div>

          <div className="space-y-1">
            {files.map(f => {
              const isSelected = f.path === selectedFile.path;
              return (
                <button
                  key={f.path}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">{f.path}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-slate-950 text-slate-200">
          {/* Header of code viewer */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-blue-400">{selectedFile.path}</span>
              <p className="text-[11px] text-slate-400">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Syntax Code Content */}
          <div className="p-4 flex-1 overflow-auto max-h-[500px]">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre font-normal">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
