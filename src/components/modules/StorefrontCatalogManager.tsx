import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Package, Plus, Save, X, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { HomepageEbookItem, HomepageProductItem } from '../../types/lms';
import { apiClient } from '../../services/apiClient';

const blankEbook = () => ({
  id: '', title: '', titleBn: '', category: 'General', author: '', pages: '0', price: '0',
  originalPrice: '', isFree: true, summary: '', summaryBn: '', topics: '', colorTheme: 'sky' as HomepageEbookItem['colorTheme'],
  coverImageUrl: '', pdfUrl: '', isActive: true,
});

const blankProduct = () => ({
  id: '', title: '', titleBn: '', category: 'Study Materials', description: '', descriptionBn: '',
  price: '0', originalPrice: '', inStock: false, imageUrl: '', isActive: true,
});

export const StorefrontCatalogManager: React.FC = () => {
  const { language, websiteSettings, updateWebsiteSettings } = useLms();
  const isBn = language === 'bn';
  const [tab, setTab] = useState<'ebooks' | 'products'>('ebooks');
  const [ebookDraft, setEbookDraft] = useState(blankEbook);
  const [productDraft, setProductDraft] = useState(blankProduct);
  const [editingEbookId, setEditingEbookId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [ebookPdfFile, setEbookPdfFile] = useState<File | null>(null);
  const [ebookFiles, setEbookFiles] = useState<Array<{ ebook_id: string; original_filename: string; size_bytes: number; uploaded_at: string }>>([]);
  const [error, setError] = useState('');

  const ebooks = websiteSettings.ebooks || [];
  const products = websiteSettings.products || [];
  const premiumBooksWithoutFile = useMemo(() => ebooks.filter(book => !book.isFree && !ebookFiles.some(file => file.ebook_id === book.id)).length, [ebooks, ebookFiles]);

  const refreshEbookFiles = async () => {
    const result = await apiClient.storefront.getEbookFiles();
    if (result.success && Array.isArray(result.data)) setEbookFiles(result.data);
  };

  useEffect(() => { void refreshEbookFiles(); }, []);

  const editEbook = (book: HomepageEbookItem) => {
    setEditingEbookId(book.id);
    setEbookDraft({
      id: book.id, title: book.title, titleBn: book.titleBn, category: book.category, author: book.author || '',
      pages: String(book.pages), price: String(book.price), originalPrice: book.originalPrice == null ? '' : String(book.originalPrice),
      isFree: book.isFree, summary: book.summary, summaryBn: book.summaryBn, topics: book.topics.join(', '),
      colorTheme: book.colorTheme, coverImageUrl: book.coverImageUrl || '', pdfUrl: book.pdfUrl || '', isActive: book.isActive !== false,
    });
    setError('');
    setMessage('');
    setEbookPdfFile(null);
  };

  const saveEbook = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = ebookDraft.title.trim();
    const price = Number(ebookDraft.price);
    if (!title || !Number.isFinite(price) || price < 0 || (!ebookDraft.isFree && price <= 0)) {
      setError('Enter a title and a valid price. Premium e-books must have a price above zero.');
      return;
    }
    const id = editingEbookId || ebookDraft.id.trim() || `ebook_${Date.now()}`;
    if (!editingEbookId && ebooks.some(book => book.id === id)) { setError('That e-book ID already exists.'); return; }
    const item: HomepageEbookItem = {
      id, title, titleBn: ebookDraft.titleBn.trim() || title, category: ebookDraft.category.trim() || 'General',
      author: ebookDraft.author.trim(), pages: Math.max(0, Number(ebookDraft.pages) || 0), price,
      originalPrice: ebookDraft.originalPrice.trim() ? Number(ebookDraft.originalPrice) : undefined,
      isFree: ebookDraft.isFree, summary: ebookDraft.summary.trim(), summaryBn: ebookDraft.summaryBn.trim(),
      topics: ebookDraft.topics.split(',').map(topic => topic.trim()).filter(Boolean),
      colorTheme: ebookDraft.colorTheme, coverImageUrl: ebookDraft.coverImageUrl.trim(), pdfUrl: ebookDraft.isFree ? ebookDraft.pdfUrl.trim() : undefined,
      isActive: ebookDraft.isActive,
    };
    setSaving(true); setError(''); setMessage('');
    try {
      const next = editingEbookId ? ebooks.map(book => book.id === id ? item : book) : [...ebooks, item];
      const saved = await updateWebsiteSettings({ ebooks: next });
      if (!saved) { setError('Could not save e-book catalog. Check CMS permission and connection.'); return; }
      if (ebookPdfFile) {
        const upload = await apiClient.storefront.uploadEbookFile(id, ebookPdfFile);
        if (!upload.success) {
          setError(upload.error || 'E-book details were saved, but the private PDF upload failed. You can retry the upload.');
          return;
        }
        await refreshEbookFiles();
      }
      setMessage(editingEbookId ? 'E-book updated.' : 'E-book added.');
      setEditingEbookId(null); setEbookDraft(blankEbook()); setEbookPdfFile(null);
    } catch {
      setError('Could not reach the server while saving the e-book catalog.');
    } finally { setSaving(false); }
  };

  const toggleEbookActive = async (id: string, isActive: boolean) => {
    if (isActive && !window.confirm('Archive this e-book? Students who already purchased it will still see it in My E-Books.')) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const next = ebooks.map(book => book.id === id ? { ...book, isActive: !isActive } : book);
      const saved = await updateWebsiteSettings({ ebooks: next });
      if (!saved) { setError('Could not update e-book visibility.'); return; }
      setMessage(isActive ? 'E-book archived; existing purchases remain visible.' : 'E-book restored to the public catalog.');
    } catch { setError('Could not reach the server while updating the e-book.'); }
    finally { setSaving(false); }
  };

  const editProduct = (product: HomepageProductItem) => {
    setEditingProductId(product.id);
    setProductDraft({
      id: product.id, title: product.title, titleBn: product.titleBn, category: product.category,
      description: product.description, descriptionBn: product.descriptionBn, price: String(product.price),
      originalPrice: product.originalPrice == null ? '' : String(product.originalPrice), inStock: product.inStock,
      imageUrl: product.imageUrl, isActive: product.isActive !== false,
    });
    setError(''); setMessage('');
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = productDraft.title.trim();
    const price = Number(productDraft.price);
    if (!title || !Number.isFinite(price) || price <= 0) { setError('Enter a product title and a valid price above zero.'); return; }
    const id = editingProductId || productDraft.id.trim() || `product_${Date.now()}`;
    if (!editingProductId && products.some(product => product.id === id)) { setError('That product ID already exists.'); return; }
    const item: HomepageProductItem = {
      id, title, titleBn: productDraft.titleBn.trim() || title, category: productDraft.category.trim() || 'Study Materials',
      description: productDraft.description.trim(), descriptionBn: productDraft.descriptionBn.trim(),
      price, originalPrice: productDraft.originalPrice.trim() ? Number(productDraft.originalPrice) : undefined,
      inStock: productDraft.inStock, imageUrl: productDraft.imageUrl.trim(), isActive: productDraft.isActive,
    };
    setSaving(true); setError(''); setMessage('');
    try {
      const next = editingProductId ? products.map(product => product.id === id ? item : product) : [...products, item];
      const saved = await updateWebsiteSettings({ products: next });
      if (!saved) { setError('Could not save product catalog. Check CMS permission and connection.'); return; }
      setMessage(editingProductId ? 'Product updated.' : 'Product added.');
      setEditingProductId(null); setProductDraft(blankProduct());
    } catch {
      setError('Could not reach the server while saving the product catalog.');
    } finally { setSaving(false); }
  };

  const toggleProductActive = async (id: string, isActive: boolean) => {
    if (isActive && !window.confirm('Archive this product? Existing order records will remain available for audit.')) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const next = products.map(product => product.id === id ? { ...product, isActive: !isActive } : product);
      const saved = await updateWebsiteSettings({ products: next });
      if (!saved) { setError('Could not update product visibility.'); return; }
      setMessage(isActive ? 'Product archived.' : 'Product restored to the public catalog.');
    } catch { setError('Could not reach the server while updating the product.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">{isBn ? 'স্টোরফ্রন্ট ক্যাটালগ' : 'Storefront Catalog'}</h2>
        <p className="text-xs text-slate-500 mt-1">{isBn ? 'পাবলিক ই-বুক ও প্রোডাক্ট পেজের কনটেন্ট, মূল্য এবং স্টক পরিচালনা করুন।' : 'Manage the public e-book and product pages, pricing and stock status.'}</p>
      </div>
      {premiumBooksWithoutFile > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{premiumBooksWithoutFile} premium e-book(s) do not have a private PDF uploaded yet. Upload each PDF here before accepting purchases; verified students can download it securely from My E-Books.</span>
        </div>
      )}
      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
      {message && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{message}</div>}
      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => { setTab('ebooks'); setError(''); setMessage(''); }} className={`px-4 py-3 text-xs font-bold border-b-2 ${tab === 'ebooks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}><BookOpen className="w-4 h-4 inline mr-1.5" /> E-Books ({ebooks.length})</button>
        <button type="button" onClick={() => { setTab('products'); setError(''); setMessage(''); }} className={`px-4 py-3 text-xs font-bold border-b-2 ${tab === 'products' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}><Package className="w-4 h-4 inline mr-1.5" /> Products ({products.length})</button>
      </div>

      {tab === 'ebooks' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="space-y-3">
            {ebooks.map(book => <article key={book.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
              {book.coverImageUrl ? <img src={book.coverImageUrl} alt="" className="w-14 h-16 object-cover rounded-lg" /> : <div className="w-14 h-16 rounded-lg bg-slate-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-slate-400" /></div>}
              <div className="min-w-0 flex-1"><div className="font-bold text-sm text-slate-900 truncate">{book.title}</div><div className="text-xs text-slate-500">{book.category} · {book.isFree ? 'Free' : `৳${book.price}`} · {book.isActive === false ? 'Archived' : 'Active'} · {ebookFiles.some(file => file.ebook_id === book.id) ? 'Private PDF uploaded' : (book.pdfUrl ? 'Free PDF URL set' : 'No PDF')}</div></div>
              <button type="button" onClick={() => editEbook(book)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">Edit</button>
              <button type="button" onClick={() => void toggleEbookActive(book.id, book.isActive !== false)} disabled={saving} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50" aria-label={book.isActive === false ? 'Restore e-book' : 'Archive e-book'}>{book.isActive === false ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}</button>
            </article>)}
            {ebooks.length === 0 && <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-sm text-slate-500">No e-books yet.</div>}
          </div>
          <form onSubmit={saveEbook} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-bold text-sm">{editingEbookId ? 'Edit e-book' : 'Add e-book'}</h3>{editingEbookId && <button type="button" onClick={() => { setEditingEbookId(null); setEbookDraft(blankEbook()); }}><X className="w-4 h-4" /></button>}</div>
            <input value={ebookDraft.id} disabled={!!editingEbookId} onChange={e => setEbookDraft(p => ({...p,id:e.target.value}))} placeholder="ID (optional; generated if blank)" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs disabled:bg-slate-50" />
            <input required value={ebookDraft.title} onChange={e => setEbookDraft(p => ({...p,title:e.target.value}))} placeholder="Title" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <input value={ebookDraft.titleBn} onChange={e => setEbookDraft(p => ({...p,titleBn:e.target.value}))} placeholder="Bangla title" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <div className="grid grid-cols-2 gap-2"><input value={ebookDraft.category} onChange={e => setEbookDraft(p => ({...p,category:e.target.value}))} placeholder="Category" className="p-2.5 rounded-lg border border-slate-200 text-xs" /><input type="number" min="0" value={ebookDraft.pages} onChange={e => setEbookDraft(p => ({...p,pages:e.target.value}))} placeholder="Pages" className="p-2.5 rounded-lg border border-slate-200 text-xs" /></div>
            <div className="grid grid-cols-2 gap-2"><input type="number" min="0" step="0.01" value={ebookDraft.price} onChange={e => setEbookDraft(p => ({...p,price:e.target.value}))} placeholder="Price (BDT)" className="p-2.5 rounded-lg border border-slate-200 text-xs" /><input type="number" min="0" step="0.01" value={ebookDraft.originalPrice} onChange={e => setEbookDraft(p => ({...p,originalPrice:e.target.value}))} placeholder="Original price" className="p-2.5 rounded-lg border border-slate-200 text-xs" /></div>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={ebookDraft.isFree} onChange={e => setEbookDraft(p => ({...p,isFree:e.target.checked,price:e.target.checked?'0':(Number(p.price)>0?p.price:'99')}))} /> Free e-book</label>
            <select value={ebookDraft.colorTheme} onChange={e => setEbookDraft(p => ({...p,colorTheme:e.target.value as HomepageEbookItem['colorTheme']}))} className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"><option value="sky">Sky</option><option value="emerald">Emerald</option><option value="purple">Purple</option><option value="indigo">Indigo</option></select>
            <input value={ebookDraft.author} onChange={e => setEbookDraft(p => ({...p,author:e.target.value}))} placeholder="Author" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <input value={ebookDraft.coverImageUrl} onChange={e => setEbookDraft(p => ({...p,coverImageUrl:e.target.value}))} placeholder="Cover image HTTPS URL" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            {ebookDraft.isFree && <input value={ebookDraft.pdfUrl} onChange={e => setEbookDraft(p => ({...p,pdfUrl:e.target.value}))} placeholder="Optional free PDF HTTPS URL" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />}
            <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Private PDF file (PDF only, maximum 20 MB)
                <input type="file" accept="application/pdf,.pdf" onChange={event => setEbookPdfFile(event.target.files?.[0] || null)} className="block w-full mt-2 text-xs" />
              </label>
              {ebookFiles.find(file => file.ebook_id === (editingEbookId || ebookDraft.id)) && <p className="text-[11px] text-emerald-700">Current private file: {ebookFiles.find(file => file.ebook_id === (editingEbookId || ebookDraft.id))?.original_filename}</p>}
              <p className="text-[11px] text-slate-500">Paid PDFs are stored outside the public web path and downloaded only after verified purchase.</p>
            </div>
            <textarea value={ebookDraft.summary} onChange={e => setEbookDraft(p => ({...p,summary:e.target.value}))} placeholder="Summary" rows={2} className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <textarea value={ebookDraft.summaryBn} onChange={e => setEbookDraft(p => ({...p,summaryBn:e.target.value}))} placeholder="Bangla summary" rows={2} className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <input value={ebookDraft.topics} onChange={e => setEbookDraft(p => ({...p,topics:e.target.value}))} placeholder="Topics (comma separated)" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <button disabled={saving} type="submit" className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"><Save className="w-4 h-4 inline mr-1.5" />{saving ? 'Saving…' : 'Save e-book'}</button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="space-y-3">
            {products.map(product => <article key={product.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
              {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-14 h-14 object-cover rounded-lg" /> : <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center"><Package className="w-5 h-5 text-slate-400" /></div>}
              <div className="min-w-0 flex-1"><div className="font-bold text-sm text-slate-900 truncate">{product.title}</div><div className="text-xs text-slate-500">৳{product.price} · {product.inStock ? 'In stock' : 'Unavailable'} · {product.isActive === false ? 'Archived' : 'Active'}</div></div>
              <button type="button" onClick={() => editProduct(product)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">Edit</button>
              <button type="button" onClick={() => void toggleProductActive(product.id, product.isActive !== false)} disabled={saving} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50" aria-label={product.isActive === false ? 'Restore product' : 'Archive product'}>{product.isActive === false ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}</button>
            </article>)}
            {products.length === 0 && <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-sm text-slate-500">No products yet.</div>}
          </div>
          <form onSubmit={saveProduct} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-bold text-sm">{editingProductId ? 'Edit product' : 'Add product'}</h3>{editingProductId && <button type="button" onClick={() => { setEditingProductId(null); setProductDraft(blankProduct()); }}><X className="w-4 h-4" /></button>}</div>
            <input value={productDraft.id} disabled={!!editingProductId} onChange={e => setProductDraft(p => ({...p,id:e.target.value}))} placeholder="ID (optional; generated if blank)" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs disabled:bg-slate-50" />
            <input required value={productDraft.title} onChange={e => setProductDraft(p => ({...p,title:e.target.value}))} placeholder="Title" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <input value={productDraft.titleBn} onChange={e => setProductDraft(p => ({...p,titleBn:e.target.value}))} placeholder="Bangla title" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <input value={productDraft.category} onChange={e => setProductDraft(p => ({...p,category:e.target.value}))} placeholder="Category" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <div className="grid grid-cols-2 gap-2"><input type="number" min="0.01" step="0.01" value={productDraft.price} onChange={e => setProductDraft(p => ({...p,price:e.target.value}))} placeholder="Price (BDT)" className="p-2.5 rounded-lg border border-slate-200 text-xs" /><input type="number" min="0" step="0.01" value={productDraft.originalPrice} onChange={e => setProductDraft(p => ({...p,originalPrice:e.target.value}))} placeholder="Original price" className="p-2.5 rounded-lg border border-slate-200 text-xs" /></div>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={productDraft.inStock} onChange={e => setProductDraft(p => ({...p,inStock:e.target.checked}))} /> Available for order</label>
            <input value={productDraft.imageUrl} onChange={e => setProductDraft(p => ({...p,imageUrl:e.target.value}))} placeholder="Product image HTTPS URL" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <textarea value={productDraft.description} onChange={e => setProductDraft(p => ({...p,description:e.target.value}))} placeholder="Description" rows={2} className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <textarea value={productDraft.descriptionBn} onChange={e => setProductDraft(p => ({...p,descriptionBn:e.target.value}))} placeholder="Bangla description" rows={2} className="w-full p-2.5 rounded-lg border border-slate-200 text-xs" />
            <button disabled={saving} type="submit" className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"><Save className="w-4 h-4 inline mr-1.5" />{saving ? 'Saving…' : 'Save product'}</button>
          </form>
        </div>
      )}
    </div>
  );
};
