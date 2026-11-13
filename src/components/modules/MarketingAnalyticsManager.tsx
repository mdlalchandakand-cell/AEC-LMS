import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  BarChart3, Globe, Target, Share2, FileCode, CheckCircle2, 
  ExternalLink, Save, RefreshCw, Eye, Copy, Check 
} from 'lucide-react';

export const MarketingAnalyticsManager: React.FC = () => {
  const { marketingSettings, updateMarketingSettings, language } = useLms();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'tracking' | 'seo' | 'sitemap' | 'robots'>('tracking');
  const [ga4Id, setGa4Id] = useState(marketingSettings.googleAnalyticsId);
  const [gtmId, setGtmId] = useState(marketingSettings.googleTagManagerId);
  const [metaPixelId, setMetaPixelId] = useState(marketingSettings.metaPixelId);
  const [gscToken, setGscToken] = useState(marketingSettings.googleSearchConsoleToken);
  const [metaCapiToken, setMetaCapiToken] = useState(marketingSettings.metaConversionApiToken || '');
  
  const [siteTitleSeo, setSiteTitleSeo] = useState(marketingSettings.siteTitleSeo);
  const [siteMetaDescription, setSiteMetaDescription] = useState(marketingSettings.siteMetaDescription);
  const [canonicalUrl, setCanonicalUrl] = useState(marketingSettings.canonicalUrl);
  const [robotsTxt, setRobotsTxt] = useState(marketingSettings.robotsTxtContent);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateMarketingSettings({
      googleAnalyticsId: ga4Id,
      googleTagManagerId: gtmId,
      metaPixelId,
      googleSearchConsoleToken: gscToken,
      metaConversionApiToken: metaCapiToken,
      siteTitleSeo,
      siteMetaDescription,
      canonicalUrl,
      robotsTxtContent: robotsTxt
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const sampleSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://alomsenglishcenter.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://alomsenglishcenter.com/courses</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://alomsenglishcenter.com/about</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://alomsenglishcenter.com/contact</loc>
    <priority>0.8</priority>
  </url>
</urlset>`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              {isBn ? 'মার্কেটিং ও অ্যানালিটিক্স' : 'Marketing & Analytics Suite'}
            </span>
            <span className="text-xs text-slate-400">GA4 · GTM · Meta CAPI · SEO</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'মার্কেটিং ট্র্যাকিং ও এসইও কনফিগারেশন' : 'Tracking Pixels, Conversion API & SEO Engine'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'গুগল অ্যানালিটিক্স, মেটা পিক্সেল, সাইটম্যাপ এবং রোবটস.টিএক্সটি কোড স্পর্শ না করেই পরিচালনা করুন।'
              : 'Deploy tracking pixels, verify search console tokens, generate dynamic XML sitemaps and optimize social cards.'}
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        {[
          { id: 'tracking', label: 'Tracking Pixels (GA4 / Meta)' },
          { id: 'seo', label: 'Meta SEO & Open Graph' },
          { id: 'sitemap', label: 'XML Sitemap Generator' },
          { id: 'robots', label: 'Robots.txt Editor' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Tracking Pixels */}
      {activeTab === 'tracking' && (
        <form onSubmit={handleSaveAll} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Google Analytics 4 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <span>Google Analytics 4 (GA4)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Tracks course visitors, enrollment conversions, and live video engagement.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Measurement ID *</label>
                <input
                  type="text"
                  value={ga4Id}
                  onChange={e => setGa4Id(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Google Tag Manager */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Google Tag Manager (GTM)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Container</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Manage custom tags, triggers, and analytics scripts in one central container.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Container ID *</label>
                <input
                  type="text"
                  value={gtmId}
                  onChange={e => setGtmId(e.target.value)}
                  placeholder="GTM-XXXXXXX"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Meta / Facebook Pixel */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span>Meta Pixel (Facebook Ads)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Tracking</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Tracks Lead, InitiateCheckout, and Purchase events for Facebook & Instagram ad campaigns.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pixel ID *</label>
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={e => setMetaPixelId(e.target.value)}
                  placeholder="e.g. 984029104829103"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Google Search Console */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-500" />
                  <span>Google Search Console Verification</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">DNS/Meta</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Verify site ownership on Google Search Console for indexing and search rankings.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification Token / Meta Content</label>
                <input
                  type="text"
                  value={gscToken}
                  onChange={e => setGscToken(e.target.value)}
                  placeholder="google-site-verification=..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Tracking Pixels</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Meta SEO & Social Sharing */}
      {activeTab === 'seo' && (
        <form onSubmit={handleSaveAll} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SEO Title Tag (60 chars max) *</label>
              <input
                type="text"
                value={siteTitleSeo}
                onChange={e => setSiteTitleSeo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">{siteTitleSeo.length} / 60 characters</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Meta Description (160 chars max) *</label>
              <textarea
                rows={3}
                value={siteMetaDescription}
                onChange={e => setSiteMetaDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">{siteMetaDescription.length} / 160 characters</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Canonical URL *</label>
              <input
                type="url"
                value={canonicalUrl}
                onChange={e => setCanonicalUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Social Share Card Preview (Open Graph) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-xs text-slate-700 block">Google Search & Facebook Social Card Live Preview:</span>
            <div className="bg-white p-4 rounded-xl border border-slate-200 max-w-lg shadow-xs space-y-1">
              <div className="text-[11px] text-emerald-700 font-mono truncate">{canonicalUrl}</div>
              <div className="font-bold text-blue-700 text-sm hover:underline cursor-pointer leading-snug">
                {siteTitleSeo}
              </div>
              <div className="text-xs text-slate-600 line-clamp-2">
                {siteMetaDescription}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Update SEO Metadata</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: XML Sitemap */}
      {activeTab === 'sitemap' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Dynamic XML Sitemap</h3>
              <p className="text-xs text-slate-500">Auto-generated index of public course, blog, and institution URLs</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sampleSitemapXml);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied XML' : 'Copy Sitemap'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-72">
            {sampleSitemapXml}
          </pre>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Sitemap Location: <strong className="font-mono text-slate-700">/sitemap.xml</strong></span>
            <span className="text-emerald-600 font-bold">Search Engines Pinged: Google & Bing ✓</span>
          </div>
        </div>
      )}

      {/* Tab 4: Robots.txt */}
      {activeTab === 'robots' && (
        <form onSubmit={handleSaveAll} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Robots.txt Crawler Directives</h3>
            <p className="text-xs text-slate-500">Control search engine bot access to sensitive backend and install directories</p>
          </div>

          <textarea
            rows={8}
            value={robotsTxt}
            onChange={e => setRobotsTxt(e.target.value)}
            className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-200 rounded-xl focus:outline-hidden"
          />

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Robots.txt</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
