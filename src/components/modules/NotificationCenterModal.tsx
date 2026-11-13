import React, { useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { 
  Bell, CheckCircle2, AlertTriangle, Info, Send, 
  Trash2, Check, X, Filter, Sparkles, MessageSquare 
} from 'lucide-react';
import { AppNotification, UserRole } from '../../types/lms';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen, onClose, onNavigateTab
}) => {
  const { 
    notifications, unreadNotificationsCount, markNotificationRead, 
    broadcastNotification, clearAllNotifications, deleteNotification, refreshNotifications, currentUser, language 
  } = useLms();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'broadcast'>('all');
  const [bTitle, setBTitle] = useState('');
  const [bMessage, setBMessage] = useState('');
  const [bType, setBType] = useState<AppNotification['type']>('info');
  const [bTargetRole, setBTargetRole] = useState<UserRole | 'all'>('all');
  const [broadcastSentToast, setBroadcastSentToast] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');

  useEffect(() => {
    if (isOpen) void refreshNotifications();
  }, [isOpen, refreshNotifications]);

  if (!isOpen) return null;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bMessage.trim()) return;
    setBroadcastError('');
    const success = await broadcastNotification({
      title: bTitle.trim(),
      message: bMessage.trim(),
      type: bType,
      targetRole: bTargetRole
    });
    if (!success) {
      setBroadcastError(isBn ? 'ঘোষণাটি পাঠানো যায়নি। অনুমতি ও সার্ভার সংযোগ যাচাই করুন।' : 'Broadcast could not be saved. Check your permission and server connection.');
      return;
    }
    setBTitle('');
    setBMessage('');
    setBroadcastSentToast(true);
    setTimeout(() => {
      setBroadcastSentToast(false);
      setActiveTab('all');
    }, 1500);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) void markNotificationRead(notif.id);
    if (notif.actionUrl && onNavigateTab) {
      onNavigateTab(notif.actionUrl);
      onClose();
    }
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const canBroadcast = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isBn ? 'নোটিফিকেশন ও ঘোষণা কেন্দ্র' : 'Notification & Broadcast Center'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {unreadNotificationsCount} unread announcements and exam alerts
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                activeTab === 'unread' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread ({unreadNotificationsCount})
            </button>
            {canBroadcast && (
              <button
                onClick={() => setActiveTab('broadcast')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  activeTab === 'broadcast' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                + Broadcast
              </button>
            )}
          </div>

          {notifications.length > 0 && activeTab !== 'broadcast' && (
            <button
              onClick={() => { void clearAllNotifications(); }}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {activeTab !== 'broadcast' && (
          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60" />
                <span>No notifications in this folder. You are all caught up!</span>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notif); }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    notif.isRead 
                      ? 'border-slate-100 bg-white hover:bg-slate-50/80 text-slate-700' 
                      : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                    notif.type === 'alert' ? 'bg-rose-100 text-rose-700' :
                    notif.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {notif.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {notif.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                    {notif.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {notif.type === 'info' && <Info className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs truncate">{isBn && notif.titleBn ? notif.titleBn : notif.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{notif.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {isBn && notif.messageBn ? notif.messageBn : notif.message}
                    </p>
                    {notif.actionUrl && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-blue-600 hover:underline">
                        Open details →
                      </span>
                    )}
                  </div>

                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                  <button
                    type="button"
                    aria-label={isBn ? 'বিজ্ঞপ্তি মুছুন' : 'Delete notification'}
                    title={isBn ? 'মুছুন' : 'Delete'}
                    onClick={e => { e.stopPropagation(); void deleteNotification(notif.id); }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Broadcast Announcement Form */}
        {activeTab === 'broadcast' && (
          <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
            {broadcastError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{broadcastError}</div>}
            {broadcastSentToast && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isBn ? 'নির্বাচিত ব্যবহারকারীদের ইনবক্সে ঘোষণা সংরক্ষিত হয়েছে।' : 'Broadcast saved to the selected users’ inboxes.'}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Announcement Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cambridge IELTS Mock Exam Schedule Released"
                value={bTitle}
                onChange={e => setBTitle(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alert Category</label>
                <select
                  value={bType}
                  onChange={e => setBType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success / Results (Green)</option>
                  <option value="warning">Notice / Reminder (Amber)</option>
                  <option value="alert">Urgent Action (Red)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={bTargetRole}
                  onChange={e => setBTargetRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="all">Everyone (All Students & Faculty)</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers & Instructors</option>
                  <option value="guardian">Guardians & Parents</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Announcement Message *</label>
              <textarea
                required
                rows={3}
                placeholder="Type the message to be pushed to user dashboards..."
                value={bMessage}
                onChange={e => setBMessage(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast Now</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
