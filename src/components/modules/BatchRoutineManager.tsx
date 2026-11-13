import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Calendar, Clock, Users, Plus, Trash2, BookOpen, MapPin, 
  CheckCircle2, Printer, Filter, Search, Award, Sparkles, X 
} from 'lucide-react';
import { Batch, ClassRoutineSlot } from '../../types/lms';

export const BatchRoutineManager: React.FC = () => {
  const { 
    batches, addBatch, deleteBatch, classRoutines, addRoutineSlot, 
    deleteRoutineSlot, courses, users, language 
  } = useLms();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'batches' | 'routine' | 'print'>('batches');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Batch Form State
  const [batchName, setBatchName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [batchCourseId, setBatchCourseId] = useState(courses[0]?.id || '');
  const [batchSchedule, setBatchSchedule] = useState('Sun, Tue, Thu · 10:00 AM - 11:30 AM');
  const [batchRoom, setBatchRoom] = useState('Room 201');
  const [batchCapacity, setBatchCapacity] = useState(35);
  const [batchStartDate, setBatchStartDate] = useState('2025-10-01');
  const [batchEndDate, setBatchEndDate] = useState('2025-12-31');

  // New Routine Slot Form State
  const [routineBatchId, setRoutineBatchId] = useState(batches[0]?.id || '');
  const [routineDay, setRoutineDay] = useState<ClassRoutineSlot['dayOfWeek']>('Sunday');
  const [routineStartTime, setRoutineStartTime] = useState('10:00 AM');
  const [routineEndTime, setRoutineEndTime] = useState('11:30 AM');
  const [routineSubject, setRoutineSubject] = useState('');
  const [routineTeacher, setRoutineTeacher] = useState('Tanvir Ahmed');
  const [routineRoom, setRoutineRoom] = useState('Auditorium A-1');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find(c => c.id === batchCourseId);
    if (!batchName || !batchCode) return;

    addBatch({
      courseId: batchCourseId,
      courseTitle: course ? course.title : 'English Course',
      name: batchName,
      batchCode: batchCode.toUpperCase(),
      schedule: batchSchedule,
      roomNumber: batchRoom,
      branchId: 'br_dhaka_main',
      instructorId: 'usr_teacher_lead',
      instructorName: 'Tanvir Ahmed (IELTS 8.5)',
      maxCapacity: Number(batchCapacity),
      startDate: batchStartDate,
      endDate: batchEndDate,
      status: 'ongoing'
    });

    setShowAddBatchModal(false);
    setBatchName('');
    setBatchCode('');
    showToast(isBn ? 'নতুন ব্যাচ সফলভাবে খোলা হয়েছে!' : 'New Batch Created Successfully!');
  };

  const handleCreateRoutineSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batches.find(b => b.id === routineBatchId);
    if (!routineSubject) return;

    const dayBnMap: Record<string, string> = {
      Sunday: 'রবিবার', Monday: 'সোমবার', Tuesday: 'মঙ্গলবার',
      Wednesday: 'বুধবার', Thursday: 'বৃহস্পতিবার', Friday: 'শুক্রবার', Saturday: 'শনিবার'
    };

    addRoutineSlot({
      batchId: routineBatchId,
      batchName: batch ? batch.name : 'Target Batch',
      courseTitle: batch ? batch.courseTitle : 'English Program',
      dayOfWeek: routineDay,
      dayOfWeekBn: dayBnMap[routineDay] || routineDay,
      startTime: routineStartTime,
      endTime: routineEndTime,
      subject: routineSubject,
      instructorName: routineTeacher,
      roomNumber: routineRoom,
      branchName: 'Dhaka Main Campus'
    });

    setShowAddRoutineModal(false);
    setRoutineSubject('');
    showToast(isBn ? 'রুটিনে নতুন ক্লাস যুক্ত হয়েছে!' : 'Class Routine Slot Added Successfully!');
  };

  const days: ClassRoutineSlot['dayOfWeek'][] = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const filteredRoutines = selectedDayFilter === 'All' 
    ? classRoutines 
    : classRoutines.filter(r => r.dayOfWeek === selectedDayFilter);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              Academic Operations
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {isBn ? 'ব্যাচ ও সাপ্তাহিক ক্লাস রুটিন টাইমটেবিল' : 'Batch & Weekly Class Timetable Engine'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {isBn ? 'ব্যাচ ব্যবস্থাপনা ও ক্লাস শিডিউলার' : 'Batch Governance & Timetable Scheduler'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'আইইএলটিএস, স্পোকেন ও গ্রামার কোর্সের মর্নিং, ইভনিং ও উইকেন্ড ব্যাচ এবং সাপ্তাহিক রুটিন নিয়ন্ত্রণ করুন' 
              : 'Organize academic cohorts, morning/evening slots, room allocations, and weekly master class timetables'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddBatchModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'নতুন ব্যাচ তৈরি' : 'Create New Batch'}</span>
          </button>
          <button
            onClick={() => setShowAddRoutineModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'রুটিনে স্লট যোগ' : 'Add Routine Slot'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isBn ? `সক্রিয় ব্যাচসমূহ (${batches.length})` : `Active Cohort Batches (${batches.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('routine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'routine'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isBn ? `সাপ্তাহিক রুটিন গ্রিড (${classRoutines.length})` : `Weekly Routine Grid (${classRoutines.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('print')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'print'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>{isBn ? 'প্রিন্টেবল রুটিন শিট' : 'Printable Timetable Sheet'}</span>
        </button>
      </div>

      {/* ================= TAB 1: BATCHES ================= */}
      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {batches.map(batch => {
            const fillPercentage = Math.round((batch.enrolledStudentsCount / batch.maxCapacity) * 100);
            return (
              <div key={batch.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                      {batch.batchCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {batch.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                    {batch.name}
                  </h3>
                  <div className="text-[11px] text-blue-600 font-medium">{batch.courseTitle}</div>

                  <div className="pt-3 border-t border-slate-100 mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{batch.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{batch.roomNumber} · Dhaka Campus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Faculty: <strong className="text-slate-800">{batch.instructorName}</strong></span>
                    </div>
                  </div>

                  {/* Enrollment Capacity Bar */}
                  <div className="pt-3 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Seat Capacity</span>
                      <span className="font-bold">{batch.enrolledStudentsCount} / {batch.maxCapacity} ({fillPercentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${fillPercentage > 90 ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{batch.startDate} to {batch.endDate}</span>
                  <button
                    onClick={() => { deleteBatch(batch.id); showToast('Batch deleted'); }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="Delete Cohort"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TAB 2: INTERACTIVE ROUTINE GRID ================= */}
      {activeTab === 'routine' && (
        <div className="space-y-4">
          {/* Day Filter Bar */}
          <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 pl-2 shrink-0">Filter Day:</span>
            {['All', ...days].map(day => (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                  selectedDayFilter === day
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Timetable Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoutines.map(slot => (
              <div key={slot.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                      {slot.dayOfWeek} ({slot.dayOfWeekBn})
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-900 mt-2 leading-tight">
                    {slot.subject}
                  </h4>
                  <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                    {slot.batchName}
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div>Faculty: <strong className="text-slate-800">{slot.instructorName}</strong></div>
                    <div className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{slot.roomNumber}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => { deleteRoutineSlot(slot.id); showToast('Routine slot removed'); }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRINTABLE TIMETABLE ================= */}
      {activeTab === 'print' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-8 max-w-4xl mx-auto space-y-6">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-xl font-black text-slate-900">ALOM'S ENGLISH CENTER</h2>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">
              Official Master Weekly Class Timetable
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Mirpur 10 & Chittagong Main Campuses · Academic Session 2025-2026</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 border-r border-slate-200">Day</th>
                  <th className="p-3 border-r border-slate-200">Time Slot</th>
                  <th className="p-3 border-r border-slate-200">Batch & Course</th>
                  <th className="p-3 border-r border-slate-200">Subject / Module</th>
                  <th className="p-3 border-r border-slate-200">Instructor</th>
                  <th className="p-3">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classRoutines.map(r => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold border-r border-slate-200 bg-slate-50/50">{r.dayOfWeek}</td>
                    <td className="p-3 font-mono border-r border-slate-200">{r.startTime} - {r.endTime}</td>
                    <td className="p-3 border-r border-slate-200">{r.batchName}</td>
                    <td className="p-3 font-semibold border-r border-slate-200">{r.subject}</td>
                    <td className="p-3 border-r border-slate-200">{r.instructorName}</td>
                    <td className="p-3 font-mono">{r.roomNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-200 text-xs">
            <span className="text-slate-500">Issued by Office of the Academic Registrar</span>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Routine</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Batch */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Create New Academic Batch</h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IELTS 8.0 Executive Weekend Batch"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="AEC-IELTS-W25"
                    value={batchCode}
                    onChange={e => setBatchCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={batchCapacity}
                    onChange={e => setBatchCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Associated Course</label>
                <select
                  value={batchCourseId}
                  onChange={e => setBatchCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Weekly Schedule Timing</label>
                <input
                  type="text"
                  value={batchSchedule}
                  onChange={e => setBatchSchedule(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Routine Slot */}
      {showAddRoutineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Add Slot to Class Routine</h3>
              <button onClick={() => setShowAddRoutineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoutineSlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch</label>
                <select
                  value={routineBatchId}
                  onChange={e => setRoutineBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.batchCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Day of Week</label>
                  <select
                    value={routineDay}
                    onChange={e => setRoutineDay(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room</label>
                  <input
                    type="text"
                    value={routineRoom}
                    onChange={e => setRoutineRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={routineStartTime}
                    onChange={e => setRoutineStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={routineEndTime}
                    onChange={e => setRoutineEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject / Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IELTS Reading: Heading Matching Strategy"
                  value={routineSubject}
                  onChange={e => setRoutineSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructor Faculty</label>
                <input
                  type="text"
                  value={routineTeacher}
                  onChange={e => setRoutineTeacher(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoutineModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Save to Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
