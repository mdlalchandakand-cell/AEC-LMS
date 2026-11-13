import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  BookOpen, Bus, Home, Search, Plus, CheckCircle2, 
  MapPin, Phone, UserCheck, AlertCircle, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { LibraryBook, TransportRoute, HostelRoom } from '../../types/lms';

export const CampusFacilitiesManager: React.FC = () => {
  const { 
    libraryBooks, issueBook, returnBook, transportRoutes, 
    hostelRooms, language 
  } = useLms();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'library' | 'transport' | 'hostel'>('library');
  const [bookSearch, setBookSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleIssue = (book: LibraryBook) => {
    const success = issueBook(book.id);
    if (success) {
      showToast(`1 copy of "${book.title.substring(0, 25)}..." issued successfully!`);
    } else {
      showToast('No available copies currently left on shelf.');
    }
  };

  const handleReturn = (book: LibraryBook) => {
    returnBook(book.id);
    showToast(`1 copy of "${book.title.substring(0, 25)}..." returned to shelf.`);
  };

  const filteredBooks = libraryBooks.filter(b => 
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.category.toLowerCase().includes(bookSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              Campus Facilities & Logistics
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {isBn ? 'লাইব্রেরি, পরিবহন ও হোস্টেল ব্যবস্থাপনা' : 'Library, Transport & Hostel Operations'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'ক্যাম্পাস ফ্যাসিলিটি কন্ট্রোল হাব' : 'Campus Facilities & Student Services'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'ক্যামব্রিজ রেফারেন্স বুক ইস্যু, সেন্ট্রাল ক্যাম্পাস শাটল বাস ও রেসিডেনশিয়াল হোস্টেল নিয়ন্ত্রণ করুন' 
              : 'Administer academic book lending, inter-branch shuttle logistics, and executive residency accommodations'}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'library'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{isBn ? `১. লাইব্রেরি ক্যাটালগ (${libraryBooks.length})` : `1. Library Catalog (${libraryBooks.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('transport')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'transport'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>{isBn ? `২. ক্যাম্পাস শাটল বাস রুট (${transportRoutes.length})` : `2. Transport Fleet (${transportRoutes.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('hostel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'hostel'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{isBn ? `৩. এক্সিকিউটিভ হোস্টেল (${hostelRooms.length})` : `3. Executive Residency (${hostelRooms.length})`}</span>
        </button>
      </div>

      {/* ================= TAB 1: LIBRARY ================= */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Cambridge guides, grammar books, or ISBN..."
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total Catalog: {libraryBooks.reduce((acc, b) => acc + b.totalCopies, 0)} Books
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredBooks.map(book => (
              <div key={book.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                      {book.category}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {book.shelfLocation}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                    {book.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">Author: {book.author}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">ISBN: {book.isbn}</div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Available on Shelf:</span>
                      <strong className="text-sm text-slate-900 font-bold">{book.availableCopies} / {book.totalCopies}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">All-Time Issued:</span>
                      <strong className="text-xs text-blue-600">{book.borrowedCount} times</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleIssue(book)}
                    disabled={book.availableCopies === 0}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Issue to Student
                  </button>
                  <button
                    onClick={() => handleReturn(book)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    title="Return Book Copy"
                  >
                    Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: TRANSPORT ================= */}
      {activeTab === 'transport' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transportRoutes.map(route => (
            <div key={route.id} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase">
                  Daily Active Shuttle
                </span>
                <span className="font-bold text-sm text-slate-900">৳{route.monthlyFee.toLocaleString()}/mo</span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-snug">{route.routeName}</h3>
                <div className="text-[11px] font-mono text-blue-600 mt-0.5">Vehicle: {route.vehicleNo}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                <div className="font-semibold text-slate-700">Driver & Contact:</div>
                <div className="flex items-center justify-between">
                  <span>{route.driverName}</span>
                  <a href={`tel:${route.driverPhone}`} className="text-blue-600 font-mono font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{route.driverPhone}</span>
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-2">Designated Route Stops:</span>
                <div className="space-y-1.5">
                  {route.stops.map((stop, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                        {sIdx + 1}
                      </span>
                      <span>{stop}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Pass Capacity: <strong className="text-slate-800">{route.activePassengers} / {route.capacity}</strong></span>
                <button
                  onClick={() => showToast('Student Transport Pass registered')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl cursor-pointer"
                >
                  Book Seat Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 3: HOSTEL ================= */}
      {activeTab === 'hostel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hostelRooms.map(room => (
            <div key={room.id} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase">
                  {room.roomType}
                </span>
                <span className="font-bold text-sm text-slate-900">৳{room.monthlyRent.toLocaleString()}/mo</span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900">{room.buildingName}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{room.roomNumber}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-slate-700">Room Occupancy:</span>
                <div className="flex items-center justify-between">
                  <span>Occupied Beds:</span>
                  <strong className="text-slate-900">{room.occupied} / {room.capacity}</strong>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Residency Amenities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {room.facilities.map((fac, fIdx) => (
                    <span key={fIdx} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-semibold">
                      ✓ {fac}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Warden: <strong className="text-slate-800">{room.wardenContact}</strong></span>
                <button
                  onClick={() => showToast('Hostel room allocation requested')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Allocate Room
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
