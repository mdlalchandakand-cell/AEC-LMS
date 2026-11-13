import React from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  CreditCard, CheckCircle2, Clock, AlertCircle, ArrowUpRight, 
  ArrowRight, Printer, Plus, Building2 
} from 'lucide-react';

interface AccountantOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const AccountantOverview: React.FC<AccountantOverviewProps> = ({ onNavigateTab }) => {
  const { payments, verifyPayment, t } = useLms();

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const verifiedPayments = payments.filter(p => p.status === 'verified');

  const totalCollected = verifiedPayments.reduce((acc, p) => acc + p.amount, 0);
  const pendingTotal = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Total Verified Revenue</div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono">
            {t.currency} {totalCollected.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+15% from last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Pending Gateway Approvals</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">
            {t.currency} {pendingTotal.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">{pendingPayments.length} transactions waiting</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">bKash Merchant Volume</div>
          <div className="text-2xl font-extrabold text-pink-700 mt-1 font-mono">
            {t.currency} {(totalCollected * 0.65).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">65% of total admissions</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Nagad & Bank Volume</div>
          <div className="text-2xl font-extrabold text-orange-600 mt-1 font-mono">
            {t.currency} {(totalCollected * 0.35).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">35% of total admissions</div>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Pending Gateway Payment Approvals</h3>
            <p className="text-xs text-slate-500">Verify TrxID with bKash / Nagad merchant portal and confirm admission</p>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingPayments.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingPayments.map(p => (
              <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900">{p.studentName} ({p.studentId})</div>
                  <div className="text-slate-500">{p.courseTitle} · {p.method} TrxID: <strong className="font-mono text-slate-800">{p.trxId}</strong></div>
                  <div className="text-[10px] text-slate-400">{p.date} · {p.note || 'Online checkout'}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    ৳ {p.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => verifyPayment(p.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs"
                  >
                    Confirm & Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No pending payments. All transactions are up-to-date!
          </div>
        )}
      </div>
    </div>
  );
};
