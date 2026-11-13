import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShoppingBag, BookOpen, XCircle, Clock3 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

type EbookOrder = Record<string, unknown> & { id: number; status: string };
type ProductOrder = Record<string, unknown> & { id: number; status: string };

const PRODUCT_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const StorefrontOrdersManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ebooks' | 'products'>('ebooks');
  const [ebookOrders, setEbookOrders] = useState<EbookOrder[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ebooks, products] = await Promise.all([
        apiClient.storefront.getEbookOrders(),
        apiClient.storefront.getProductOrders(),
      ]);
      if (!ebooks.success) setError(ebooks.error || 'Could not load e-book payment requests.');
      if (!products.success) setError(previous => previous ? previous + ' ' + (products.error || '') : (products.error || 'Could not load product orders.'));
      if (ebooks.success && Array.isArray(ebooks.data)) setEbookOrders(ebooks.data as EbookOrder[]);
      if (products.success && Array.isArray(products.data)) setProductOrders(products.data as ProductOrder[]);
    } catch {
      setError('Could not reach the server while loading storefront orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const reviewEbook = async (id: number, action: 'ebook_verify' | 'ebook_reject') => {
    const reason = action === 'ebook_reject' ? window.prompt('Enter the reason for rejecting this payment reference:') : '';
    if (action === 'ebook_reject' && !reason?.trim()) return;
    const result = await apiClient.storefront.reviewEbookOrder(id, action, reason || '');
    if (!result.success) { setError(result.error || 'Could not review e-book payment.'); return; }
    setNotice(action === 'ebook_verify' ? 'E-book payment verified; access has been granted.' : 'E-book payment request rejected.');
    await refresh();
  };

  const updateProduct = async (id: number, status: string) => {
    const result = await apiClient.storefront.updateProductOrder(id, status);
    if (!result.success) { setError(result.error || 'Could not update product order.'); return; }
    setNotice(`Product order #${id} updated to ${status}.`);
    await refresh();
  };

  const pendingEbooks = ebookOrders.filter(order => order.status === 'pending').length;
  const pendingProducts = productOrders.filter(order => order.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Storefront Orders</h2>
          <p className="text-xs text-slate-500 mt-1">Review premium e-book payment references and fulfil cash-on-delivery orders.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><XCircle className="w-4 h-4" /></button></div>}

      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setActiveTab('ebooks')} className={`px-4 py-3 text-xs font-bold border-b-2 ${activeTab === 'ebooks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
          <BookOpen className="w-4 h-4 inline mr-1.5" /> E-book Payments ({pendingEbooks} pending)
        </button>
        <button type="button" onClick={() => setActiveTab('products')} className={`px-4 py-3 text-xs font-bold border-b-2 ${activeTab === 'products' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
          <ShoppingBag className="w-4 h-4 inline mr-1.5" /> Product Orders ({pendingProducts} pending)
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">Loading orders…</div>
      ) : activeTab === 'ebooks' ? (
        <div className="space-y-3">
          {ebookOrders.length === 0 ? <div className="p-10 text-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">No e-book payment requests found.</div> : ebookOrders.map(order => (
            <article key={order.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="font-bold text-sm text-slate-900">{String(order.ebook_title || 'E-book')}</div>
                <div className="text-xs text-slate-600">{String(order.customer_name || order.email || 'Student')} · {String(order.payment_method)} · ৳{String(order.amount)}</div>
                <div className="text-xs font-mono text-slate-700">TrxID: {String(order.trx_id)} · {String(order.sender_phone)}</div>
                <div className="text-[11px] text-slate-400">Order #{order.id} · {String(order.created_at || '')}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${order.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : order.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span>
                {order.status === 'pending' && <>
                  <button type="button" onClick={() => void reviewEbook(order.id, 'ebook_verify')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Verify</button>
                  <button type="button" onClick={() => void reviewEbook(order.id, 'ebook_reject')} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">Reject</button>
                </>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {productOrders.length === 0 ? <div className="p-10 text-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">No product orders found.</div> : productOrders.map(order => (
            <article key={order.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">{String(order.product_title || 'Product')} × {String(order.quantity)}</div>
                  <div className="text-xs text-slate-600">{String(order.customer_name)} · {String(order.customer_phone)} · ৳{String(order.total_amount)}</div>
                  <div className="text-xs text-slate-600">{String(order.delivery_address)}</div>
                  <div className="text-[11px] text-slate-400">Order #{order.id} · {String(order.created_at || '')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-700">{String(order.status)}</span>
                  <select aria-label={`Update order #${order.id} status`} value={String(order.status)} onChange={event => void updateProduct(order.id, event.target.value)} disabled={(PRODUCT_ORDER_TRANSITIONS[String(order.status)] || []).length === 0} className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:opacity-50">
                    <option value={String(order.status)}>{String(order.status)} (current)</option>
                    {(PRODUCT_ORDER_TRANSITIONS[String(order.status)] || []).map(nextStatus => <option key={nextStatus} value={nextStatus}>{nextStatus}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-[11px] text-slate-400"><Clock3 className="w-3 h-3 inline mr-1" /> Cash on delivery · {String(order.account_name || '')}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
