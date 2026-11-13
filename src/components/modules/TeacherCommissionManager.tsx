import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  DollarSign, CheckCircle2, Clock, Send, FileText, 
  CreditCard, Building, ArrowUpRight, Plus, Download, Printer, X 
} from 'lucide-react';
import { TeacherCommission, PayoutRequest } from '../../types/lms';

export const TeacherCommissionManager: React.FC = () => {
  const { 
    currentUser, teacherCommissions, payoutRequests, submitPayoutRequest, 
    approvePayoutRequest, language, t 
  } = useLms();
  const isBn = language === 'bn';

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState<number>(20000);
  const [payoutMethod, setPayoutMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer'>('bKash');
  const [accountNumber, setAccountNumber] = useState('01715223344');
  const [bankName, setBankName] = useState('City Bank Ltd');
  const [branchName, setBranchName] = useState('Mirpur Branch');
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'ledger'>('overview');
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Totals
  const totalGross = teacherCommissions.reduce((acc, c) => acc + c.grossCommission, 0);
  const totalPaid = teacherCommissions.reduce((acc, c) => acc + c.paidCommission, 0);
  const totalPending = teacherCommissions.reduce((acc, c) => acc + c.pendingBalance, 0);

  const handleRequestPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestAmount <= 0) return;
    submitPayoutRequest({
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      amount: requestAmount,
      payoutMethod,
      accountNumber,
      bankName: payoutMethod === 'Bank Transfer' ? bankName : undefined,
      branchName: payoutMethod === 'Bank Transfer' ? branchName : undefined,
      remarks: 'Course Commission Payout Request'
    });
    setShowRequestModal(false);
    setPayoutSuccessMsg(isBn ? 'পে-আউট রিকোয়েস্ট সফলভাবে সাবমিট করা হয়েছে।' : 'Payout request submitted for administration approval.');
    setTimeout(() => setPayoutSuccessMsg(null), 3000);
  };

  const handleApprove = (reqId: string) => {
    const trx = `TRX_COMM_${Math.floor(100000 + Math.random() * 900000)}`;
    approvePayoutRequest(reqId, trx);
    setPayoutSuccessMsg(`Payout approved with Trx ID: ${trx}`);
    setTimeout(() => setPayoutSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              {isBn ? 'ইনস্ট্রাক্টর আর্নিংস ও রয়্যালটি' : 'Instructor Revenue Share & Payouts'}
            </span>
            <span className="text-xs text-slate-400">Automated 60/40 Split</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'শিক্ষক কমিশন ও পে-আউট ম্যানেজমেন্ট' : 'Teacher Commission & Earnings Hub'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'কোর্স বিক্রয় অনুযায়ী স্বয়ংক্রিয় কমিশন হিসাব, বিকাশ/ব্যাংক পে-আউট রিকোয়েস্ট ও অনুমোদন।'
              : 'Calculate revenue commissions automatically, request payouts via bKash/Bank, and track disbursement receipts.'}
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          <span>{isBn ? 'পে-আউট রিকোয়েস্ট করুন' : 'Request Payout'}</span>
        </button>
      </div>

      {payoutSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{payoutSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Gross Commission</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">৳</div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-3">
            ৳ {totalGross.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cumulative instructor commission</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Disbursed (Paid)</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">✓</div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-3">
            ৳ {totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Transferred via bKash / Bank</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payout Balance</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">⏳</div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono mt-3">
            ৳ {totalPending.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Available for withdrawal</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Course Commission Roster
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'payouts' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Payout Requests & Approvals ({payoutRequests.length})
        </button>
      </div>

      {/* Tab 1: Course Commission Breakdown */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Instructor Name</th>
                  <th className="py-3 px-4">Assigned Course</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4">Gross Earned</th>
                  <th className="py-3 px-4">Paid Out</th>
                  <th className="py-3 px-4 text-right">Pending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherCommissions.map(comm => (
                  <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{comm.teacherName}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{comm.courseTitle}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">{comm.totalEnrolledStudents}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                        {comm.commissionPercentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">৳ {comm.grossCommission.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">৳ {comm.paidCommission.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-600">
                      ৳ {comm.pendingBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payout Requests */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Teacher Name</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payout Method</th>
                  <th className="py-3 px-4">Account / Phone</th>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-blue-600">{req.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{req.teacherName}</td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">৳ {req.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {req.payoutMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {req.accountNumber} {req.bankName ? `(${req.bankName})` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{req.requestDate}</td>
                    <td className="py-3.5 px-4">
                      {req.status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          Approved & Sent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'pending' && currentUser.role !== 'student' && (
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Approve Payout
                        </button>
                      )}
                      {req.status === 'approved' && req.transactionId && (
                        <span className="text-[10px] font-mono text-slate-400">Trx: {req.transactionId}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Request Commission Payout</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Withdrawal Amount (BDT ৳) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  max={totalPending || 100000}
                  value={requestAmount}
                  onChange={e => setRequestAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold text-base"
                />
                <span className="text-[10px] text-slate-400">Available Balance: ৳ {totalPending.toLocaleString()}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payout Channel *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bKash', 'Nagad', 'Bank Transfer'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setPayoutMethod(ch)}
                      className={`p-2 rounded-lg border font-bold text-center transition-colors cursor-pointer ${
                        payoutMethod === ch ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account / Phone Number *</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              {payoutMethod === 'Bank Transfer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Submit Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
