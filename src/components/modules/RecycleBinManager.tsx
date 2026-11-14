import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Trash2, RotateCcw, AlertTriangle, ShieldCheck, Clock, 
  Search, CheckCircle2, XCircle, FileText, Layers, Users, BookOpen 
} from 'lucide-react';
import { RecycleBinItem } from '../../types/lms';

export const RecycleBinManager: React.FC = () => {
  const { 
    recycleBin, restoreFromRecycleBin, permanentDeleteFromRecycleBin, 
    emptyRecycleBin, language 
  } = useLms();
  const isBn = language === 'bn';

  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemToDelete, setSelectedItemToDelete] = useState<RecycleBinItem | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const filteredItems = recycleBin.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.deletedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.itemType === filterType;
    return matchesSearch && matchesType;
  });

  const handleRestore = async (item: RecycleBinItem) => {
    const success = await restoreFromRecycleBin(item.id);
    if (success) {
      setSuccessBanner(isBn ? `"${item.title}" সফলভাবে রিস্টোর করা হয়েছে!` : `"${item.title}" successfully restored!`);
      setErrorBanner(null);
      setTimeout(() => setSuccessBanner(null), 3000);
      return;
    }

    setErrorBanner(isBn ? 'রিস্টোর ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Restore failed. Please try again.');
    setSuccessBanner(null);
    setTimeout(() => setErrorBanner(null), 3000);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!selectedItemToDelete) return;

    const success = await permanentDeleteFromRecycleBin(selectedItemToDelete.id);
    if (success) {
      setSuccessBanner(isBn ? 'রেকর্ডটি স্থায়ীভাবে মুছে ফেলা হয়েছে।' : 'Item permanently erased.');
      setErrorBanner(null);
      setSelectedItemToDelete(null);
      setTimeout(() => setSuccessBanner(null), 3000);
      return;
    }

    setErrorBanner(isBn ? 'স্থায়ীভাবে মুছে ফেলা সম্ভব হয়নি।' : 'Permanent purge failed.');
    setSuccessBanner(null);
    setTimeout(() => setErrorBanner(null), 3000);
  };

  const handleEmptyAll = () => {
    if (window.confirm(isBn ? 'আপনি কি সম্পূর্ণ রিসাইকেল বিন খালি করতে নিশ্চিত?' : 'Are you sure you want to permanently empty the recycle bin?')) {
      emptyRecycleBin();
      setSuccessBanner(isBn ? 'রিসাইকেল বিন সম্পূর্ণ খালি করা হয়েছে।' : 'Recycle Bin emptied.');
      setErrorBanner(null);
      setTimeout(() => setSuccessBanner(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
              {isBn ? 'সফ্ট ডিলিট ও রিস্টোরেশন' : 'Soft Delete & Safe Recovery'}
            </span>
            <span className="text-xs text-slate-400">30-Day Auto Retention</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'রিসাইকেল বিন ও ট্র্যাশ ম্যানেজমেন্ট' : 'Recycle Bin & Safe Trash Center'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'ভুলবশত মুছে ফেলা কোর্স, ব্যাচ ও সার্কুলার ৩০ দিনের মধ্যে যেকোনো সময় রিস্টোর করা যায়।'
              : 'Safeguard against accidental deletions. Restore removed courses, cohorts, and exams with 1-click.'}
          </p>
        </div>

        {recycleBin.length > 0 && (
          <button
            onClick={handleEmptyAll}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer self-start"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>{isBn ? 'সম্পূর্ণ ট্র্যাশ খালি করুন' : 'Empty Trash'}</span>
          </button>
        )}
      </div>

      {/* Success / Error Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isBn ? 'ডিলিট করা আইটেম খুঁজুন...' : 'Search deleted records...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-rose-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: isBn ? 'সকল আইটেম' : 'All Items' },
            { id: 'course', label: isBn ? 'কোর্স' : 'Courses' },
            { id: 'batch', label: isBn ? 'ব্যাচ' : 'Batches' },
            { id: 'notice', label: isBn ? 'নোটিশ' : 'Notices' },
            { id: 'exam', label: isBn ? 'পরীক্ষা' : 'Exams' }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === type.id
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recycle Bin Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-slate-700">
              {isBn ? 'রিসাইকেল বিন বর্তমানে খালি' : 'Recycle Bin is Empty'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isBn 
                ? 'কোনো মুছে ফেলা আইটেম নেই। আপনার ডাটাবেজের সকল তথ্য সক্রিয় ও সুরক্ষিত।'
                : 'No soft-deleted records found. System data is healthy and secure.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4">Deleted Date</th>
                  <th className="py-3 px-4">Retention</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {item.originalId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {item.itemType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.deletedBy}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {item.deletedAt}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.retentionDaysLeft} days left</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleRestore(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors cursor-pointer"
                          title="Restore to active system"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          onClick={() => setSelectedItemToDelete(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer"
                          title="Permanently remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Purge</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {selectedItemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">
                {isBn ? 'স্থায়ীভাবে মুছে ফেলার নিশ্চিতকরণ' : 'Permanent Purge Confirmation'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isBn 
                  ? `আপনি কি নিশ্চিতভাবে "${selectedItemToDelete.title}" স্থায়ীভাবে মুছে ফেলতে চান? এটি ডাটা恢复 করা সম্ভব নয়।`
                  : `Are you sure you want to permanently erase "${selectedItemToDelete.title}"? This cannot be restored.`}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmPermanentDelete()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Yes, Purge Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

