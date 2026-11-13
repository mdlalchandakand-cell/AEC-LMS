import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  title?: string;
  titleBn?: string;
  itemName?: string;
  message?: string;
  messageBn?: string;
  confirmText?: string;
  confirmTextBn?: string;
  cancelText?: string;
  cancelTextBn?: string;
  requireTyping?: boolean; // if true, requires typing 'DELETE' or item name to confirm
  language?: 'en' | 'bn';
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  titleBn = 'মুছে ফেলার নিশ্চিতকরণ',
  itemName,
  message = 'Are you sure you want to permanently delete this item? This operation cannot be undone and will erase all linked records.',
  messageBn = 'আপনি কি নিশ্চিতভাবে এই আইটেমটি স্থায়ীভাবে মুছে ফেলতে চান? এই কাজটি আর ফেরানো যাবে না এবং সংশ্লিষ্ট সকল তথ্য মুছে যাবে।',
  confirmText = 'Yes, Delete Permanently',
  confirmTextBn = 'হ্যাঁ, স্থায়ীভাবে মুছে ফেলুন',
  cancelText = 'Cancel',
  cancelTextBn = 'বাতিল করুন',
  requireTyping = false,
  language = 'en'
}) => {
  const [typedVerification, setTypedVerification] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedVerification('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmedAllowed = !requireTyping || typedVerification.trim().toUpperCase() === 'DELETE';

  const handleConfirmAction = async () => {
    if (!isConfirmedAllowed || isDeleting) return;
    setIsDeleting(true);
    try {
      const result = await onConfirm();
      if (result === false) {
        setIsDeleting(false);
        return;
      }
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isBn = language === 'bn';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Danger Header Ribbon */}
        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isBn ? titleBn : title}
              </h3>
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                {isBn ? 'সতর্কতা: অপরিবর্তনীয় পদক্ষেপ' : 'Warning: Irreversible Action'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-rose-100/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {itemName && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <div className="text-xs font-semibold text-slate-800 break-words">
                <span className="text-slate-500 font-normal mr-1.5">
                  {isBn ? 'নির্বাচিত আইটেম:' : 'Target item:'}
                </span>
                "{itemName}"
              </div>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isBn ? messageBn : message}
          </p>

          {requireTyping && (
            <div className="pt-2 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {isBn ? (
                  <>নিশ্চিত করতে নিচে <span className="font-mono text-rose-600 font-bold">DELETE</span> লিখুন:</>
                ) : (
                  <>Please type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm:</>
                )}
              </label>
              <input
                type="text"
                value={typedVerification}
                onChange={e => setTypedVerification(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              {isBn 
                ? 'অনাকাঙ্ক্ষিত মুছে ফেলা প্রতিরোধে অ্যাডমিন নিশ্চিতকরণ আবশ্যক।' 
                : 'Double-confirmation active to safeguard against accidental data loss.'}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            {isBn ? cancelTextBn : cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirmAction}
            disabled={!isConfirmedAllowed || isDeleting}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              !isConfirmedAllowed || isDeleting
                ? 'bg-rose-300 cursor-not-allowed shadow-none'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 active:scale-95'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? (isBn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...') : (isBn ? confirmTextBn : confirmText)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
