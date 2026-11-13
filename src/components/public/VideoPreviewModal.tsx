import React from 'react';
import { useLms } from '../../context/LmsContext';
import { X, PlayCircle, BookOpen } from 'lucide-react';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLms();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">
              {language === 'bn' ? 'কোর্স ওরিয়েন্টেশন ও ডেমো লেকচার' : 'Orientation & Course Demo Lecture'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            title="Alom's English Center Orientation"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/90 text-xs text-slate-300 flex items-center justify-between">
          <div>
            <span className="font-semibold text-white block">Engr. Mahbubul Alom & Tanvir Ahmed</span>
            <span className="text-slate-400">Mastering British Phonetics & IELTS Band 8.0 Techniques</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
