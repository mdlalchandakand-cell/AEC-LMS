import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  CreditCard, Search, Filter, Plus, Printer, CheckCircle2, 
  Clock, XCircle, ArrowUpRight, ShieldCheck, Building2, BookOpen, X 
} from 'lucide-react';
import { PaymentRecord } from '../../types/lms';

export const PaymentManager: React.FC = () => {
  const { payments, verifyPayment, addPayment, courses, branches, language, t } = useLms();

  const [searchTrx, setSearchTrx] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);

  // New payment modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newAmount, setNewAmount] = useState(courses[0]?.price || 5000);
  const [newMethod, setNewMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer' | 'Cash'>('bKash');
  const [newTrxId, setNewTrxId] = useState('');

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.invoiceNumber.toLowerCase().includes(searchTrx.toLowerCase()) ||
      p.trxId.toLowerCase().includes(searchTrx.toLowerCase()) ||
      p.studentName.toLowerCase().includes(searchTrx.toLowerCase()) ||
      p.studentId.toLowerCase().includes(searchTrx.toLowerCase());

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalCollected = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find(c => c.id === newCourseId);
    addPayment({
      studentId: newStudentId || `AEC-2025-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: newStudentName || 'Walk-in Student',
      courseId: newCourseId,
      courseTitle: course ? course.title : 'English Course Fee',
      amount: Number(newAmount),
      method: newMethod,
      trxId: newTrxId || `OFFLINE-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'verified',
      branchId: 'br_dhaka_main',
      note: 'Accountant desk manual entry'
    });
    setShowAddModal(false);
    setNewStudentName('');
    setNewTrxId('');
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Verified Collections
          </div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono tabular-nums">
            {t.currency} {totalCollected.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across all Bangladesh branches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Gateway Approvals
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1 font-mono tabular-nums">
            {t.currency} {pendingAmount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">Awaiting TrxID bank confirmation</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Accountant Actions
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Manual Cash / Trx</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTrx}
            onChange={e => setSearchTrx(e.target.value)}
            placeholder="Search by TrxID, invoice no, student name or roll..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Payment Channels</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash at Counter</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Payment Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Channel & TrxID</th>
                <th className="py-3 px-4 text-right">Amount (৳)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map(payment => (
                <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">{payment.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400">{payment.date}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{payment.studentName}</div>
                    <div className="font-mono text-[11px] text-blue-600">{payment.studentId}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {payment.courseTitle}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        payment.method === 'bKash' ? 'bg-pink-100 text-pink-700' :
                        payment.method === 'Nagad' ? 'bg-orange-100 text-orange-700' :
                        payment.method === 'Cash' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {payment.method}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                      {payment.trxId}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                    {t.currency} {payment.amount.toLocaleString()}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      payment.status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : payment.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {payment.status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {payment.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                      {payment.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    {payment.status === 'pending' && (
                      <button
                        onClick={() => verifyPayment(payment.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedReceiptPayment(payment)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                      title="Print Official Money Receipt"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Official Money Receipt Modal */}
      {selectedReceiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col no-print">
            <div className="bg-[#0b1e36] text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Official Money Receipt Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button onClick={() => setSelectedReceiptPayment(null)} className="p-1 text-slate-300 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Printable Card */}
            <div className="p-6 bg-slate-50 flex justify-center">
              <div className="w-full bg-white p-6 rounded-xl border-2 border-slate-300 shadow-md space-y-4 text-xs text-slate-800">
                
                {/* Header */}
                <div className="text-center border-b-2 border-slate-800 pb-3">
                  <h2 className="text-lg font-black tracking-tight text-blue-900">ALOM'S ENGLISH CENTER</h2>
                  <p className="text-[10px] text-slate-500">Plot 14, Sector 6, Mirpur 10 Roundabout, Dhaka-1216 | +880 1712 345678</p>
                  <div className="inline-block px-3 py-0.5 rounded bg-blue-100 text-blue-900 font-bold uppercase text-[10px] mt-1">
                    Official Money Receipt
                  </div>
                </div>

                {/* Receipt Metadata */}
                <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-slate-100">
                  <div>
                    <span className="text-slate-500">Receipt No: </span>
                    <span className="font-mono font-bold">{selectedReceiptPayment.invoiceNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Date: </span>
                    <span className="font-mono">{selectedReceiptPayment.date}</span>
                  </div>
                </div>

                {/* Student info */}
                <div className="space-y-1.5 py-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Received From:</span>
                    <span className="font-bold text-slate-900">{selectedReceiptPayment.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student ID:</span>
                    <span className="font-mono font-semibold">{selectedReceiptPayment.studentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Course / Particular:</span>
                    <span className="font-medium text-slate-900">{selectedReceiptPayment.courseTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Channel:</span>
                    <span className="font-semibold text-slate-900">{selectedReceiptPayment.method} (Trx: {selectedReceiptPayment.trxId})</span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="font-bold text-blue-900">Total Paid Amount:</span>
                  <span className="text-base font-extrabold text-blue-900 font-mono">
                    ৳ {selectedReceiptPayment.amount.toLocaleString()} BDT
                  </span>
                </div>

                {/* Signatures */}
                <div className="pt-6 flex items-end justify-between text-[10px]">
                  <div className="text-center">
                    <div className="w-20 border-b border-slate-400 mx-auto" />
                    <span className="text-slate-500 mt-1 block">Depositor Signature</span>
                  </div>
                  <div className="text-center">
                    <div className="w-24 border-b border-slate-400 mx-auto font-serif italic text-blue-900 font-bold">
                      Kamrul Islam, ACCA
                    </div>
                    <span className="text-slate-500 mt-1 block">Authorized Accountant</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Manual Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#0b1e36] text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Record Payment at Counter</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="e.g. Tanzim Ahmed"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Roll / ID</label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  placeholder="e.g. AEC-2025-0824"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course</label>
                <select
                  value={newCourseId}
                  onChange={e => {
                    setNewCourseId(e.target.value);
                    const c = courses.find(crs => crs.id === e.target.value);
                    if (c) setNewAmount(c.price);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} (৳{c.price})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (৳)</label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={e => setNewAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Channel</label>
                  <select
                    value={newMethod}
                    onChange={e => setNewMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">TrxID or Cash Memo #</label>
                <input
                  type="text"
                  value={newTrxId}
                  onChange={e => setNewTrxId(e.target.value)}
                  placeholder="e.g. BK9X72Q99M or CSH-041"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Save & Issue Receipt
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
