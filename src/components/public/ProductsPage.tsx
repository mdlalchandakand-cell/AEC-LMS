import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { ShoppingBag, ArrowRight, CheckCircle2, X, Truck, Phone, MapPin } from 'lucide-react';
import { HomepageProductItem } from '../../types/lms';
import { apiClient } from '../../services/apiClient';
import productIeltsBooksImg from '../../assets/images/product_ielts_books_kit_1794553908137.jpg';

export const ProductsPage: React.FC = () => {
  const { language, websiteSettings, setActiveView, isAuthenticated, currentUser } = useLms();
  const isBn = language === 'bn';

  const productsSection = websiteSettings.productsSection || {
    eyebrowEn: 'SHOP',
    eyebrowBn: 'স্টাডি শপ',
    titleEn: 'Products',
    titleBn: 'স্টাডি ম্যাটেরিয়াল ও প্রোডাক্টস',
    subtitleEn:
      'Physical study kits, printed books, and academy essentials for your prep—order with delivery details after you sign in.',
    subtitleBn:
      'আপনার IELTS ও ইংরেজি প্রস্তুতির জন্য প্রিন্টেড বই, ফ্ল্যাশকার্ড এবং একাডেমি স্টাডি কিট সরাসরি অর্ডার করুন।'
  };

  const products = (websiteSettings.products || []).filter(product => product.isActive !== false);
  const [selectedProduct, setSelectedProduct] = useState<HomepageProductItem | null>(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState(isAuthenticated ? currentUser.name : '');
  const [customerPhone, setCustomerPhone] = useState(isAuthenticated ? currentUser.phone : '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderReference, setOrderReference] = useState<number | null>(null);
  const [orderError, setOrderError] = useState('');

  const handleOpenOrder = (product: HomepageProductItem) => {
    setSelectedProduct(product);
    setOrderSubmitted(false);
    setOrderError('');
    setOrderReference(null);
    setCustomerName(isAuthenticated ? currentUser.name : '');
    setCustomerPhone(isAuthenticated ? currentUser.phone : '');
  };

  const handleSubmitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct || !selectedProduct.inStock || !isAuthenticated || submittingOrder) return;
    setSubmittingOrder(true);
    setOrderError('');
    try {
      const result = await apiClient.storefront.submitProductOrder({
        product_id: selectedProduct.id, quantity: 1, customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(), delivery_address: deliveryAddress.trim(),
      });
      if (!result.success || !result.data) {
        setOrderError(result.error || (isBn ? 'অর্ডার জমা হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।' : 'Order could not be submitted. Please check the details and try again.'));
        return;
      }
      setOrderReference(result.data.id);
      setOrderSubmitted(true);
    } catch {
      setOrderError(isBn ? 'সার্ভারের সঙ্গে যোগাযোগ করা যায়নি। আবার চেষ্টা করুন।' : 'Could not reach the server. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const theme = websiteSettings.themeSettings;
  const lightCanvasBg = `linear-gradient(135deg, ${theme?.lightCanvasStart || '#EAE9FF'} 0%, ${theme?.lightCanvasMid || '#F2F3FF'} 45%, ${theme?.lightCanvasEnd || '#E5F4FE'} 100%)`;

  return (
    <main
      className="flex-1 py-10 sm:py-14 px-4 sm:px-6 w-full"
      style={{ background: lightCanvasBg }}
    >
      <div className="max-w-[1160px] mx-auto space-y-10">
        {/* Top Breadcrumb + Header Matching Reference Design */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              {isBn ? 'হোম' : 'Home'}
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-slate-800">
              {isBn ? 'প্রোডাক্টস' : 'Products'}
            </span>
          </nav>

          <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shadow-2xs">
            <ShoppingBag className="w-5 h-5" />
          </div>

          <div className="space-y-2 max-w-xl">
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">
              {isBn ? productsSection.eyebrowBn : productsSection.eyebrowEn}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {isBn ? productsSection.titleBn : productsSection.titleEn}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isBn ? productsSection.subtitleBn : productsSection.subtitleEn}
            </p>
            <div className="pt-1">
              <div className="w-8 h-1 rounded-full bg-[#0284C7]" />
            </div>
          </div>
        </div>

        {/* 3-Column Product Cards Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2 shadow-xs">
            <ShoppingBag className="w-8 h-8 text-[#0284C7] mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {isBn ? 'কোনো প্রোডাক্ট এখনো যোগ করা হয়নি।' : 'No shop items are currently listed.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => {
              const saveAmount = Math.max(0, (product.originalPrice || 0) - product.price);
              return (
                <article
                  key={product.id}
                  onClick={() => handleOpenOrder(product)}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-150 p-4 flex flex-col justify-between space-y-4 cursor-pointer group"
                >
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={product.imageUrl || productIeltsBooksImg}
                        alt={isBn ? product.titleBn : product.title}
                        referrerPolicy="no-referrer"
                        onError={e => {
                          e.currentTarget.src = productIeltsBooksImg;
                        }}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />

                      {saveAmount > 0 && (
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-[#0F172A] text-[10px] font-bold shadow-xs font-mono">
                          SAVE ৳{saveAmount}
                        </span>
                      )}

                      <span
                        className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-xs ${
                          product.inStock
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#0F172A] text-white'
                        }`}
                      >
                        {product.inStock
                          ? (isBn ? 'IN STOCK' : 'IN STOCK')
                          : (isBn ? 'STOCK OUT' : 'STOCK OUT')}
                      </span>
                    </div>

                    <div className="space-y-1 px-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {isBn ? product.titleBn : product.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {isBn ? product.descriptionBn : product.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 px-1 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold font-mono tabular-nums text-[#0284C7]">
                        ৳{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-xs font-mono tabular-nums text-slate-400 line-through">
                          ৳{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <span className="w-8 h-8 rounded-full border border-slate-200 group-hover:border-[#0284C7] group-hover:bg-[#0284C7] text-slate-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail & Delivery Request Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#032D42] text-white flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-sky-300">{selectedProduct.category}</div>
                <h3 className="text-base font-bold leading-snug">
                  {isBn ? selectedProduct.titleBn : selectedProduct.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-sm text-slate-600">{isBn ? 'অর্ডার দিতে আগে আপনার অ্যাকাউন্টে সাইন ইন করুন।' : 'Please sign in before placing an order.'}</p>
                <button type="button" onClick={() => setActiveView('login')} className="px-5 py-2.5 rounded-lg bg-[#0284C7] text-white text-xs font-bold">{isBn ? 'সাইন ইন করুন' : 'Sign in to order'}</button>
              </div>
            ) : orderSubmitted ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base">
                    {isBn ? 'অর্ডার অনুরোধ সফলভাবে জমা হয়েছে!' : 'Order Request Submitted!'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isBn
                      ? `অর্ডার #${orderReference} সংরক্ষিত হয়েছে। ডেলিভারি নিশ্চিত করতে আমাদের টিম ${customerPhone} নম্বরে যোগাযোগ করবে।`
                      : `Order #${orderReference} is saved. Our fulfillment team will contact you on ${customerPhone} to confirm delivery.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-5 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
                >
                  {isBn ? 'বন্ধ করুন' : 'Done'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="p-6 space-y-4 text-xs">
                <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <img
                    src={selectedProduct.imageUrl || productIeltsBooksImg}
                    alt={selectedProduct.title}
                    className="w-20 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                  />
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm font-mono">
                      ৳{selectedProduct.price.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {isBn ? selectedProduct.descriptionBn : selectedProduct.description}
                    </p>
                  </div>
                </div>

                {orderError && <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{orderError}</div>}
                {!selectedProduct.inStock ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center space-y-2">
                    <div className="font-bold">
                      {isBn ? 'বর্তমানে স্টক শেষ — প্রি-বুকিং এর জন্য হটলাইনে কল করুন' : 'Currently Out of Stock'}
                    </div>
                    <div className="font-mono text-[11px]">
                      {websiteSettings.hotline?.trim() ? `Hotline: ${websiteSettings.hotline}` : (isBn ? 'স্টক নিশ্চিত করতে সাপোর্ট টিমের সঙ্গে যোগাযোগ করুন।' : 'Please contact support to confirm availability.')}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {isBn ? 'আপনার নাম *' : 'Recipient Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0284C7]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          <Phone className="w-3 h-3 inline mr-1 text-[#0284C7]" />
                          {isBn ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0284C7]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        <MapPin className="w-3 h-3 inline mr-1 text-[#0284C7]" />
                        {isBn ? 'সম্পূর্ণ ডেলিভারি ঠিকানা *' : 'Delivery Address *'}
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        placeholder={isBn ? 'বাড়ি/রোড, এলাকা, জেলা...' : 'House/Road, Area, District...'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0284C7]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isBn ? 'সারা বাংলাদেশে কুরিয়ার ডেলিভারি' : 'Nationwide Cash-on-Delivery'}</span>
                      </span>
                      <button
                        type="submit"
                        disabled={submittingOrder}
                        className="px-5 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold cursor-pointer"
                      >
                        {submittingOrder ? (isBn ? 'জমা হচ্ছে...' : 'Submitting...') : (isBn ? 'অর্ডার জমা দিন' : 'Place Order')}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
