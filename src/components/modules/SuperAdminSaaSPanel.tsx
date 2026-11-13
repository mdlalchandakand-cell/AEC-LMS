import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Building2, ShieldCheck, CreditCard, Server, Users, DollarSign, 
  Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, Globe, Key, 
  Mail, MessageSquare, Download, Search, Filter, RefreshCw, 
  ArrowUpRight, HardDrive, Cpu, Activity, ExternalLink, X
} from 'lucide-react';
import { Tenant, SaaSPlan } from '../../types/lms';

export const SuperAdminSaaSPanel: React.FC = () => {
  const { 
    tenants, activeTenantId, setActiveTenantId, addTenant, updateTenant, deleteTenant,
    saasPlans, saasSubscriptions, addSaaSSubscription, language 
  } = useLms();
  const isBn = language === 'bn';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tenants' | 'plans' | 'billing' | 'gateways' | 'security'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Tenant Form State
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantSubdomain, setNewTenantSubdomain] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantCity, setNewTenantCity] = useState('Dhaka');
  const [newTenantPlan, setNewTenantPlan] = useState<'free' | 'basic' | 'standard' | 'professional' | 'enterprise'>('professional');

  // Gateway Settings State
  const [smtpHost, setSmtpHost] = useState('mail.alomsenglishcenter.com');
  const [smtpUser, setSmtpUser] = useState('noreply@alomsenglishcenter.com');
  const [smsGatewayApi, setSmsGatewayApi] = useState('AEC_SMS_KEY_882991024_LIVE');
  const [bkashMerchant, setBkashMerchant] = useState('01712345678');
  const [nagadMerchant, setNagadMerchant] = useState('01812345678');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSubdomain) return;

    addTenant({
      name: newTenantName,
      slug: newTenantSlug || newTenantSubdomain,
      subdomain: newTenantSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=120&q=80',
      contactEmail: newTenantEmail || 'admin@' + newTenantSubdomain + '.alomsenglish.com',
      phone: newTenantPhone || '+880 1712 000000',
      status: 'active',
      planId: newTenantPlan,
      maxStudents: newTenantPlan === 'enterprise' ? 10000 : newTenantPlan === 'professional' ? 2500 : 1000,
      maxTeachers: 30,
      maxStorageGb: 200,
      billingCycle: 'monthly',
      monthlyFee: newTenantPlan === 'enterprise' ? 19999 : newTenantPlan === 'professional' ? 9999 : 5999,
      subscriptionExpiresAt: '2026-12-31',
      city: newTenantCity,
      address: `${newTenantCity} Regional Campus`,
    });

    setShowAddTenantModal(false);
    setNewTenantName('');
    setNewTenantSubdomain('');
    showToast(isBn ? 'নতুন প্রতিষ্ঠান সফলভাবে যুক্ত হয়েছে!' : 'New Tenant Institution Provisioned Successfully!');
  };

  const handleToggleTenantStatus = (tenant: Tenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    updateTenant(tenant.id, { status: nextStatus });
    showToast(isBn ? `প্রতিষ্ঠানের স্ট্যাটাস পরিবর্তন করা হয়েছে: ${nextStatus}` : `Tenant status updated to: ${nextStatus}`);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMrr = tenants.reduce((acc, t) => acc + (t.status === 'active' ? t.monthlyFee : 0), 0);
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Super Admin Top Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">
              SaaS Super Admin Control Center
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Platform Online (PHP 8.3 & MariaDB)
            </span>
          </div>
          <h2 className="text-xl font-extrabold mt-1 tracking-tight">
            {isBn ? 'সুপার অ্যাডমিন প্ল্যাটফর্ম ও মাল্টি-টেন্যান্ট কন্ট্রোল' : 'SaaS Master Platform & Tenant Governance'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isBn 
              ? 'সকল ক্যাম্পাস, ফ্র্যাঞ্চাইজ প্রতিষ্ঠান, সাবস্ক্রিপশন প্ল্যান ও গ্লোবাল গেটওয়ে কনফিগারেশন পরিচালনা করুন' 
              : 'Orchestrate multi-tenant institutions, subscription lifecycle, revenue billing, and master system security'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddTenantModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'নতুন প্রতিষ্ঠান যোগ করুন' : 'Provision New Tenant'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">{isBn ? 'সক্রিয় প্রতিষ্ঠান' : 'Active Tenants'}</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{activeTenantsCount} / {tenants.length}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">100% Data Isolation Active</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">{isBn ? 'মাসিক পুনরাবৃত্তিমূলক আয় (MRR)' : 'Monthly Recurring (MRR)'}</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">৳{totalMrr.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">+18.5% SaaS Subscription Growth</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">{isBn ? 'মোট শিক্ষার্থী ক্যাপাসিটি' : 'Total Student Capacity'}</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">8,000+</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Across 3 regional hubs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">{isBn ? 'সার্ভার ও ডাটাবেজ স্বাস্থ্য' : 'Server & DB Health'}</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">99.98%</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">PHP 8.3 · MariaDB 10.4</div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        {[
          { id: 'overview', title: isBn ? '১. ওভারভিউ ও আর্কিটেকচার' : '1. Overview & Health', icon: Server },
          { id: 'tenants', title: isBn ? `২. প্রতিষ্ঠান তালিকা (${tenants.length})` : `2. Tenants Directory (${tenants.length})`, icon: Building2 },
          { id: 'plans', title: isBn ? '৩. সাবস্ক্রিপশন প্ল্যান' : '3. SaaS Pricing Tiers', icon: CreditCard },
          { id: 'billing', title: isBn ? '৪. বিলিং ও ইনভয়েস' : '4. Invoicing & Billing', icon: DollarSign },
          { id: 'gateways', title: isBn ? '৫. গেটওয়ে ও কনফিগ' : '5. Master Gateways & SMTP', icon: Key },
          { id: 'security', title: isBn ? '৬. অডিট ও সিকিউরিটি' : '6. Security & Audit Trail', icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.title}</span>
          </button>
        ))}
      </div>

      {/* ================= TAB 1: OVERVIEW & SERVER HEALTH ================= */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
              <span>{isBn ? 'সিস্টেম স্ট্যাটাস ও আর্কিটেকচার মেট্রিক্স' : 'System Architecture & Multi-Tenant Specs'}</span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Microservices Operating
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Database Engine</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">MySQL 8.0 / MariaDB</span>
                </div>
                <div className="text-xs text-slate-600">30+ Normalized Tables with Foreign Key Constraints & Tenant Isolation</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[24%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Pool: 24 active / 100 max</span>
                  <span>Latency: 1.2ms</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">PHP 8.3 Runtime</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">OPcache Enabled</span>
                </div>
                <div className="text-xs text-slate-600">Memory Limit: 256M · Execution Time: 300s · Upload Max: 64M</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[18%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Memory Usage: 46MB / 256MB</span>
                  <span>PHP Worker Health: 100%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Storage & File System</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">SSD NVMe</span>
                </div>
                <div className="text-xs text-slate-600">Encrypted student uploads, ID cards & course lesson assets</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full w-[31%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Used: 15.4 GB / 500 GB</span>
                  <span>Auto-backup Daily</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Payment Gateway Routing</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">bKash · Nagad · SSL</span>
                </div>
                <div className="text-xs text-slate-600">Dual server-side TrxID validation with automated reconciliation</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[99%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Success Rate: 99.4%</span>
                  <span>Zero Double-Charge</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Multi-Tenant Architecture Guarantee</span>
              </div>
              <p>
                Each institution in the system operates under its isolated subdomain context (`tenant_id`), ensuring student grades, fee records, attendance logs, and exam questions cannot cross boundaries between partner academies or campus branches.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              {isBn ? 'সক্রিয় প্রতিষ্ঠান নির্বাচন (Context Switcher)' : 'Active Tenant Viewport'}
            </h4>
            <div className="space-y-2.5">
              {tenants.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setActiveTenantId(t.id); showToast(`Active Context Switched to ${t.name}`); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeTenantId === t.id
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{t.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>{t.city} Campus</span>
                    <span className="font-mono text-blue-600">{t.subdomain}.alomsenglish.com</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAddTenantModal(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isBn ? 'নতুন ক্যাম্পাস প্রোভিশন করুন' : 'Provision New Campus Hub'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TENANTS DIRECTORY ================= */}
      {activeSubTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={isBn ? 'প্রতিষ্ঠান, শহর বা সাব-ডোমেইন খুঁজুন...' : 'Search tenants by name, city, or subdomain...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <button
              onClick={() => setShowAddTenantModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন প্রতিষ্ঠান যোগ' : 'Add New Institution'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3.5">Institution / Campus</th>
                    <th className="px-4 py-3.5">Subdomain & URL</th>
                    <th className="px-4 py-3.5">Plan</th>
                    <th className="px-4 py-3.5">Capacity</th>
                    <th className="px-4 py-3.5">MRR</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-xs">{tenant.name}</div>
                        <div className="text-[11px] text-slate-500">{tenant.address}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-[11px] text-blue-600">
                        <div>{tenant.subdomain}.alomsenglishcenter.com</div>
                        {tenant.customDomain && (
                          <div className="text-[10px] text-slate-400">Custom: {tenant.customDomain}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                          {tenant.planId}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {tenant.maxStudents.toLocaleString()} students · {tenant.maxStorageGb}GB
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        ৳{tenant.monthlyFee.toLocaleString()}/mo
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase cursor-pointer transition-colors ${
                            tenant.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {tenant.status}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setActiveTenantId(tenant.id); showToast(`Logged into ${tenant.name} context`); }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Enter Tenant Context"
                          >
                            Enter
                          </button>
                          <button
                            onClick={() => deleteTenant(tenant.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Tenant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SAAS PRICING TIERS ================= */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Commercial SaaS Subscription Plans</h3>
            <p className="text-xs text-slate-500">
              Tiered commercial licensing with student capacity enforcement, storage limits, and gateway integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {saasPlans.map(plan => (
              <div 
                key={plan.id} 
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-2xs relative ${
                  plan.isPopular ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <div>
                  <div className="text-sm font-extrabold text-slate-900">{plan.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">৳{plan.priceMonthly.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">/mo</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Yearly: ৳{plan.priceYearly.toLocaleString()}/yr</div>

                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-800">
                      Up to {plan.maxStudents.toLocaleString()} Students
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {plan.maxBranches} Campus Branches · {plan.maxStorageGb}GB Storage
                    </div>

                    <div className="space-y-1.5 pt-2">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => showToast(`Configured ${plan.name} Plan`)}
                    className="w-full py-2 rounded-xl text-xs font-bold transition-all bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 cursor-pointer"
                  >
                    Edit Tier Specs
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: BILLING & INVOICING ================= */}
      {activeSubTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">SaaS Platform Subscription Invoices</h3>
              <p className="text-xs text-slate-500">Official license fee payments received from partner institutions</p>
            </div>
            <button
              onClick={() => showToast('Financial Report Exported as CSV')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Tenant Name</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method & TrxID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Next Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saasSubscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{sub.invoiceNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{sub.tenantName}</td>
                    <td className="px-4 py-3">{sub.planName}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">৳{sub.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {sub.paymentMethod} · {sub.trxId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{sub.nextBillingDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: GATEWAYS & CONFIG ================= */}
      {activeSubTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Global SMTP & Email Dispatcher</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SMTP Host Server</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SMTP Username / Email</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
              <button
                onClick={() => showToast('SMTP connection verified')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Test SMTP Connection
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Bangladesh SMS Gateway API (BulkSMS BD)</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SMS API Secret Key</label>
                <input
                  type="password"
                  value={smsGatewayApi}
                  onChange={e => setSmsGatewayApi(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">bKash Merchant Account Number</label>
                <input
                  type="text"
                  value={bkashMerchant}
                  onChange={e => setBkashMerchant(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nagad Merchant Account Number</label>
                <input
                  type="text"
                  value={nagadMerchant}
                  onChange={e => setNagadMerchant(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>
              <button
                onClick={() => showToast('Payment & SMS Gateways saved globally')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
              >
                Save Master Gateway Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: SECURITY & AUDIT TRAIL ================= */}
      {activeSubTab === 'security' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">SaaS Platform Security Audit & Session Monitor</h3>
              <p className="text-xs text-slate-500">Real-time surveillance of login attempts, privilege escalation, and token expirations</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Breaches Detected</span>
            </span>
          </div>

          <div className="space-y-3">
            {[
              { time: '2 mins ago', action: 'Tenant Authentication', actor: 'alom.director@alomsenglish.com', ip: '103.114.12.89 (Dhaka, BD)', status: 'Authorized' },
              { time: '14 mins ago', action: 'bKash IPN Webhook Verification', actor: 'Automated Gateway', ip: '103.205.180.2 (bKash Dhaka Node)', status: 'Success' },
              { time: '1 hour ago', action: 'Super Admin Password Hash Verification', actor: 'super_admin', ip: '119.30.38.102 (Mirpur, BD)', status: 'Bcrypt Validated' },
              { time: '3 hours ago', action: 'Automated MariaDB Nightly Snapshot', actor: 'Cron Engine', ip: 'localhost / unix_socket', status: 'Completed (14.2 MB)' }
            ].map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-800">{log.action}</div>
                  <div className="text-[11px] text-slate-500">{log.actor} · IP: {log.ip}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                    {log.status}
                  </span>
                  <span className="text-slate-400 text-[10px]">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provision New Tenant Modal */}
      {showAddTenantModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{isBn ? 'নতুন শিক্ষা প্রতিষ্ঠান / ক্যাম্পাস প্রোভিশন' : 'Provision New Tenant Academy'}</span>
              </h3>
              <button 
                onClick={() => setShowAddTenantModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Institution Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alom's English Center (Sylhet Campus)"
                  value={newTenantName}
                  onChange={e => setNewTenantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subdomain *</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="sylhet"
                      value={newTenantSubdomain}
                      onChange={e => setNewTenantSubdomain(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={newTenantCity}
                    onChange={e => setNewTenantCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    placeholder="admin@branch.com"
                    value={newTenantEmail}
                    onChange={e => setNewTenantEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Hotline</label>
                  <input
                    type="text"
                    placeholder="+880 1712 000000"
                    value={newTenantPhone}
                    onChange={e => setNewTenantPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">SaaS Subscription Tier</label>
                <select
                  value={newTenantPlan}
                  onChange={e => setNewTenantPlan(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-blue-900 bg-blue-50/50"
                >
                  <option value="basic">Basic Academy (৳2,999/mo · 300 Students)</option>
                  <option value="standard">Standard Institute (৳5,999/mo · 1,000 Students)</option>
                  <option value="professional">Professional Commercial (৳9,999/mo · 2,500 Students)</option>
                  <option value="enterprise">Enterprise Franchise (৳19,999/mo · 10,000 Students)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTenantModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Create & Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
