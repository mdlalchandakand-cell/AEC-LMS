import React from 'react';
import { User } from '../../types/lms';
import { X, Printer, BookOpen, ShieldCheck, QrCode } from 'lucide-react';

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User | null;
}

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({ 
  isOpen, 
  onClose, 
  student 
}) => {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col no-print">
        
        {/* Modal Controls Top Bar */}
        <div className="px-5 py-3 bg-[#0b1e36] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">Official Student Identity Card</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Card Canvas */}
        <div className="p-8 flex justify-center bg-slate-100">
          
          {/* Printable ID Card Container */}
          <div 
            id="printable-student-card"
            className="w-[340px] bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-slate-300 text-slate-800 relative flex flex-col justify-between"
            style={{ minHeight: '520px' }}
          >
            {/* Top Navy Header */}
            <div className="bg-[#0b1e36] text-white p-4 text-center border-b-4 border-amber-400 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-1 shadow-md">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight">ALOM'S ENGLISH CENTER</h2>
              <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                Authorized Student Identity Card
              </p>
            </div>

            {/* Photo & Basic Details */}
            <div className="p-5 text-center flex-1 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-600 shadow-md mb-3">
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                {student.name}
              </h3>
              {student.nameBn && (
                <p className="text-xs text-slate-600 font-medium">{student.nameBn}</p>
              )}

              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-xs tracking-wider">
                ID: {student.studentId || 'AEC-2025-0824'}
              </div>

              {/* Dossier Fields */}
              <div className="w-full mt-4 space-y-1.5 text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Course:</span>
                  <span className="font-bold text-slate-900">IELTS Masterclass</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Campus:</span>
                  <span className="font-semibold text-slate-800">Dhaka Main (Mirpur)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Blood Group:</span>
                  <span className="font-bold text-rose-600">B+ (Positive)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Valid Thru:</span>
                  <span className="font-mono text-slate-700">December 2026</span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="mt-4 w-full flex flex-col items-center justify-center">
                <div className="h-8 w-44 bg-repeating-linear-gradient flex items-center justify-center text-[10px] font-mono tracking-widest text-slate-700 border-t border-b border-slate-300">
                  || | ||| || |||| | ||| ||
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                  *{student.studentId || 'AEC-2025-0824'}*
                </span>
              </div>
            </div>

            {/* Bottom Footer with Director Signature */}
            <div className="bg-slate-100 p-3 px-5 border-t border-slate-200 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-500 block">Helpline:</span>
                <span className="font-mono font-bold text-slate-800">+880 1712 345678</span>
              </div>

              <div className="text-right">
                <div className="font-serif italic font-bold text-slate-900 text-xs">
                  M. Alom
                </div>
                <span className="text-slate-500 block border-t border-slate-300 pt-0.5 text-[9px]">
                  Director's Signature
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
