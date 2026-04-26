import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, Heart, MessageCircle, UserPlus, HelpCircle, FileText, AtSign, ChevronRight, Loader2 } from "lucide-react";
import Button from "./Button.jsx";
import api from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

const normalizeNotificationType = (rawType) => {
  const type = String(rawType || '').toLowerCase();
  if (['post_like', 'comment_like', 'reply_like'].includes(type)) return 'like';
  if (['post_comment'].includes(type)) return 'comment';
  if (['comment_reply'].includes(type)) return 'reply';
  if (['new_follower'].includes(type)) return 'follow';
  return type;
};

const getNotificationPayload = (notification) => {
  const raw = notification?.data;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
  return {};
};

const getNotificationActionText = (notification, actorName) => {
  const payload = getNotificationPayload(notification);
  const type = normalizeNotificationType(notification?.type);
  const hasComment = !!(payload?.comment_id || notification?.comment_id || notification?.commentId);

  if (type === 'reply') return 'replied to your comment';
  if (type === 'comment') return 'commented on your post';
  if (type === 'like') return hasComment ? 'liked your comment' : 'liked your post';
  if (type === 'follow') return 'followed you';
  if (type === 'mention') return 'mentioned you';
  if (type === 'case_update') return 'updated a case';
  if (type === 'document_shared') return 'shared a document with you';
  if (type === 'question_answer') return 'answered your question';

  const fallback = (notification?.title || notification?.message || '').trim();
  if (fallback) {
    const normalizedActor = String(actorName || '').trim().toLowerCase();
    const normalizedFallback = fallback.toLowerCase();
    if (normalizedActor && normalizedFallback.startsWith(normalizedActor)) {
      return fallback.slice(actorName.length).trim() || 'sent you a notification';
    }
    return fallback;
  }

  return 'sent you a notification';
};

const NotificationIcon = ({ type }) => {
  const iconProps = { size: 16, className: "text-white" };
  const normalizedType = normalizeNotificationType(type);
  switch (normalizedType) {
    case 'like':
      return <div className="p-2 bg-pink-500 rounded-full"><Heart {...iconProps} fill="white" /></div>;
    case 'comment':
    case 'reply':
      return <div className="p-2 bg-blue-500 rounded-full"><MessageCircle {...iconProps} /></div>;
    case 'follow':
      return <div className="p-2 bg-jurisma-500 rounded-full"><UserPlus {...iconProps} /></div>;
    case 'question_answer':
      return <div className="p-2 bg-amber-500 rounded-full"><HelpCircle {...iconProps} /></div>;
    case 'case_update':
    case 'document_shared':
      return <div className="p-2 bg-emerald-500 rounded-full"><FileText {...iconProps} /></div>;
    case 'mention':
      return <div className="p-2 bg-purple-500 rounded-full"><AtSign {...iconProps} /></div>;
    default:
      return <div className="p-2 bg-slate-500 rounded-full"><Bell {...iconProps} /></div>;
  }
};

const getTimeAgo = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
};

export const NotificationsPanel = ({ isOpen, onClose, onViewChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { user } = useAuth();
  const panelRef = useRef(null);
  const currentPage = pagination?.page ?? pagination?.current_page;
  const totalPages = pagination?.total_pages ?? pagination?.totalPages;
  const totalCount = pagination?.total_count ?? pagination?.totalCount;
  const hasMore = !!(currentPage && totalPages && currentPage < totalPages);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(1, 20);
      const sorted = (data.notifications || []).slice().sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
      setNotifications(sorted);
      setUnreadCount(data.unread_count || 0);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAllRead) return;
    setMarkingAllRead(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read immediately in UI
    if (!notification.is_read) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      try {
        await api.markNotificationRead(notification.id);
      } catch (err) {
        console.error('Failed to mark read on server:', err);
      }
    }

    onClose();

    const payload = getNotificationPayload(notification);
    const postId = payload.post_id || notification.post_id || notification.postId || notification.target_id;
    const commentId = payload.comment_id || notification.comment_id || notification.commentId;
    const caseId = payload.case_id || notification.case_id || notification.caseId;
    const documentId = payload.document_id || notification.document_id || notification.documentId;
    const questionId = payload.question_id || notification.question_id || notification.questionId;
    const sessionId = payload.session_id || notification.session_id || notification.sessionId;
    const actorId = notification.actor?.id || payload.actor_id || payload.actorId;

    // Deep linking routing logic (deterministic)
    if (commentId) {
      onViewChange?.('community', { postId, commentId });
      return;
    }
    if (postId) {
      onViewChange?.('community', { postId });
      return;
    }
    if (caseId) {
      onViewChange?.('dashboard', { tab: 'cases', caseId });
      return;
    }
    if (documentId) {
      onViewChange?.('dashboard', { tab: 'documents', documentId });
      return;
    }
    if (questionId) {
      onViewChange?.('dashboard', { tab: 'counsel', questionId });
      return;
    }
    if (sessionId) {
      onViewChange?.('dashboard', { tab: 'counsel', sessionId, view: 'sessions' });
      return;
    }
    if (actorId) {
      onViewChange?.('community', { userId: actorId });
      return;
    }

    const fallback = notification.title || notification.message;
    if (fallback) {
      alert(fallback);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[49] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        ref={panelRef}
        className="fixed md:absolute top-[80px] md:top-16 left-4 right-4 md:left-auto md:right-0 md:w-96 bg-white dark:bg-jurisma-900 border border-slate-200 dark:border-jurisma-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] md:max-h-[85vh] origin-top md:origin-top-right animate-in fade-in zoom-in duration-200"
      >
      <div className="p-4 border-b border-slate-100 dark:border-jurisma-800 flex justify-between items-center bg-slate-50/50 dark:bg-jurisma-900/50">
        <h3 className="font-bold text-slate-900 dark:text-jurisma-50 flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="bg-jurisma-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {unreadCount} new
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="text-xs text-jurisma-600 dark:text-jurisma-400 font-medium hover:text-jurisma-800 transition-colors flex items-center gap-1"
          >
            {markingAllRead ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 overscroll-contain">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-jurisma-400 mb-2" />
            <p className="text-sm text-slate-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-jurisma-800 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-900 dark:text-jurisma-100 mb-1">You're all caught up!</p>
            <p className="text-sm text-slate-500 dark:text-jurisma-400">No new notifications to display right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-jurisma-800">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-slate-50 dark:hover:bg-jurisma-800/50 transition-colors cursor-pointer flex gap-3 ${!notification.is_read ? 'bg-jurisma-50/30 dark:bg-jurisma-900/80' : ''}`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-jurisma-800 overflow-hidden flex-shrink-0">
                    {notification.actor?.avatar ? (
                      <img src={notification.actor.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                        {(notification.actor?.name || 'Someone').charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 shadow-sm rounded-full border-2 border-white dark:border-jurisma-900">
                    <NotificationIcon type={notification.type} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-jurisma-100 leading-snug">
                    <span className="font-bold text-slate-900 dark:text-white">{notification.actor?.name || 'Someone'}</span>
                    <span className="text-slate-600 dark:text-jurisma-300 ml-1">
                      {(() => {
                        const actorName = notification.actor?.name || 'Someone';
                        return getNotificationActionText(notification, actorName);
                      })()}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <Clock size={10} />
                    {getTimeAgo(notification.created_at)}
                  </p>
                </div>
                
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-jurisma-500 rounded-full mt-2 flex-shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-3 border-t border-slate-100 dark:border-jurisma-800 bg-slate-50/50 dark:bg-jurisma-900/50 text-center space-y-1">
          {(totalCount || totalPages) && (
            <p className="text-[10px] text-slate-400">
              {typeof totalCount === 'number' ? `Showing ${notifications.length} of ${totalCount}` : `Page ${currentPage || 1} of ${totalPages || 1}`}
            </p>
          )}
          <button
            onClick={() => {
              onViewChange?.('notifications');
              onClose();
            }}
            className="text-xs font-extra-bold text-jurisma-600 dark:text-jurisma-400 hover:text-jurisma-800 transition-colors py-1 px-4 rounded-lg hover:bg-jurisma-50 dark:hover:bg-jurisma-800"
          >
            View All Activity Center
          </button>
        </div>
      )}
    </div>
    </>
  );
};

export default NotificationsPanel;
