import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Puzzle, CheckCircle2, AlertCircle, Settings2, Power, 
  ExternalLink, Key, RefreshCw, Zap, Shield, Search, 
  Plus, Upload, HelpCircle, X, Save 
} from 'lucide-react';
import { PluginItem } from '../../types/lms';

export const PluginManager: React.FC = () => {
  const { plugins, togglePlugin, updatePluginConfig, testPluginConnection, language } = useLms();
  const isBn = language === 'bn';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePluginForConfig, setActivePluginForConfig] = useState<PluginItem | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filter plugins
  const filteredPlugins = plugins.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTestConnection = (pluginId: string) => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      const result = testPluginConnection(pluginId);
      setTestResult({ id: pluginId, ...result });
      setIsTesting(false);
    }, 600);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActivePluginForConfig(null);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
              {isBn ? 'মডুলার প্লাগইন আর্কিটেকচার' : 'Plugin-Ready Architecture'}
            </span>
            <span className="text-xs text-slate-400">CodeCanyon / Envato Ready</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'প্লাগইন ও এপিআই ইন্টিগ্রেশন ম্যানেজার' : 'Modular Integrations & Plugin Center'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'কোড পরিবর্তন ছাড়াই জুম, গুগল মিট, বিকাশ, নগদ, এসএমএস ও অ্যানালিটিক্স প্লাগইন সক্রিয় বা কনফিগার করুন।'
              : 'Enable, configure, test, and manage third-party API modules without modifying application source code.'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>{isBn ? 'নতুন প্লাগইন আপলোড' : 'Install Plugin (.zip)'}</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isBn ? 'প্লাগইন খুঁজুন (যেমন বিকাশ, জুম)...' : 'Search integrations (e.g. bKash, Zoom, SMS)...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: isBn ? 'সকল প্লাগইন' : 'All Plugins' },
            { id: 'payment', label: isBn ? 'পেমেন্ট গেটওয়ে' : 'Payment PGW' },
            { id: 'live_class', label: isBn ? 'লাইভ ক্লাস' : 'Live Class' },
            { id: 'communication', label: isBn ? 'এসএমএস / নোটিফিকেশন' : 'Communication' },
            { id: 'analytics', label: isBn ? 'মার্কেটিং ও অ্যানালিটিক্স' : 'Analytics' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Connection Test Toast */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in ${
          testResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins.map(plugin => (
          <div 
            key={plugin.id} 
            className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs flex flex-col justify-between p-6 ${
              plugin.isEnabled ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200/60 opacity-80 bg-slate-50/50'
            }`}
          >
            <div className="space-y-4">
              {/* Header with Icon, Name & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                    plugin.isEnabled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Puzzle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {isBn ? plugin.nameBn : plugin.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        v{plugin.version}
                      </span>
                      <span className="text-[10px] text-slate-400">by {plugin.author}</span>
                    </div>
                  </div>
                </div>

                {/* Enable/Disable Toggle Switch */}
                <button
                  onClick={() => togglePlugin(plugin.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    plugin.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  title={plugin.isEnabled ? 'Disable Plugin' : 'Enable Plugin'}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    plugin.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                {isBn ? plugin.descriptionBn : plugin.description}
              </p>

              {/* Status Badge */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-slate-400">Connection Status:</span>
                {plugin.status === 'connected' && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Connected</span>
                  </span>
                )}
                {plugin.status === 'configured' && (
                  <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Configured</span>
                  </span>
                )}
                {plugin.status === 'disabled' && (
                  <span className="text-slate-400 font-medium">Inactive</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleTestConnection(plugin.id)}
                disabled={!plugin.isEnabled || isTesting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                title="Verify endpoint communication"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                onClick={() => setActivePluginForConfig(plugin)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Configure Keys</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plugin Configuration Modal */}
      {activePluginForConfig && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{activePluginForConfig.name}</h3>
                  <p className="text-[11px] text-slate-500">API Credentials & Webhook Gateway Configuration</p>
                </div>
              </div>
              <button onClick={() => setActivePluginForConfig(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Non-secret settings are saved in this browser. Secret credentials are not stored or sent to a server.</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {activePluginForConfig.configFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">{field.label}</label>
                    {field.isSecret && (
                      <span className="text-[10px] text-amber-700 font-mono">Secret · not stored</span>
                    )}
                  </div>
                  {field.type === 'select' ? (
                    <select
                      value={field.value}
                      onChange={e => updatePluginConfig(activePluginForConfig.id, field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                    >
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={e => updatePluginConfig(activePluginForConfig.id, field.key, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                    />
                  )}
                </div>
              ))}

              {activePluginForConfig.webhookUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-slate-700 block">Automated Webhook Endpoint URL:</span>
                  <div className="font-mono text-[11px] text-blue-700 bg-white p-2 rounded border border-slate-200 select-all truncate">
                    {activePluginForConfig.webhookUrl}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Paste this URL into your provider dashboard to receive instant automated transaction triggers.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestConnection(activePluginForConfig.id)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Verify Credentials</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePluginForConfig(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & Apply</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Install Custom Plugin Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Upload & Install Plugin Package</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50">
              <Upload className="w-10 h-10 text-indigo-500 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-800">Drag & Drop plugin .ZIP file here</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Compatible with Alom's LMS Modular Plugin Manifest v2.5</p>
              </div>
              <input type="file" accept=".zip" className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700" />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Third-party integration modules are verified for PHP 8.3/Laravel compatibility and sanitized against unauthorized code execution.
            </p>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
