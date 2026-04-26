import React, { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, UserPlus, HelpCircle, FileText, AtSign, ArrowLeft, Loader2, CheckCircle2, Inbox } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

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
  const iconProps = { size: 18, className: "text-white" };
  const normalizedType = normalizeNotificationType(type);
  switch (normalizedType) {
    case 'like':
      return <div className="p-2.5 bg-pink-500 rounded-full shadow-sm shadow-pink-200"><Heart {...iconProps} fill="white" /></div>;
    case 'comment':
    case 'reply':
      return <div className="p-2.5 bg-blue-500 rounded-full shadow-sm shadow-blue-200"><MessageCircle {...iconProps} /></div>;
    case 'follow':
      return <div className="p-2.5 bg-jurisma-500 rounded-full shadow-sm shadow-jurisma-200"><UserPlus {...iconProps} /></div>;
    case 'question_answer':
      return <div className="p-2.5 bg-amber-500 rounded-full shadow-sm shadow-amber-200"><HelpCircle {...iconProps} /></div>;
    case 'case_update':
    case 'document_shared':
      return <div className="p-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"><FileText {...iconProps} /></div>;
    case 'mention':
      return <div className="p-2.5 bg-purple-500 rounded-full shadow-sm shadow-purple-200"><AtSign {...iconProps} /></div>;
    default:
      return <div className="p-2.5 bg-slate-500 rounded-full shadow-sm shadow-slate-200"><Bell {...iconProps} /></div>;
  }
};

const getTimeAgo = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
};

export default function NotificationsPage({ onBack, onViewChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 });
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications(1);
    }
  }, [user]);

  const fetchNotifications = async (page = 1, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await api.getNotifications(page, 20);
      if (append) {
        setNotifications(prev => [...prev, ...(data.notifications || [])]);
      } else {
        setNotifications(data.notifications || []);
      }
      setPagination(data.pagination || { page: 1, total_pages: 1 });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      addToast({ type: 'error', message: 'Failed to load notifications.' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.total_pages && !loadingMore) {
      fetchNotifications(pagination.page + 1, append = true);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      addToast({ type: 'success', message: 'All notifications marked as read.' });
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      
      try {
        await api.markNotificationRead(notification.id);
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }

    const payload = getNotificationPayload(notification);
    const postId = payload.post_id || notification.post_id || notification.postId || notification.target_id;
    const commentId = payload.comment_id || notification.comment_id || notification.commentId;
    const caseId = payload.case_id || notification.case_id || notification.caseId;
    const documentId = payload.document_id || notification.document_id || notification.documentId;
    const questionId = payload.question_id || notification.question_id || notification.questionId;
    const sessionId = payload.session_id || notification.session_id || notification.sessionId;
    const actorId = notification.actor?.id || payload.actor_id || payload.actorId;

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
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">Activity Center</h1>
            <p className="text-sm text-slate-500">Keep track of your legal community activity and updates.</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          icon={CheckCircle2} 
          onClick={handleMarkAllRead}
          disabled={markingAllRead || notifications.filter(n => !n.is_read).length === 0}
        >
          {markingAllRead ? 'Marking...' : 'Mark all as read'}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-jurisma-600 mb-4" />
          <p className="text-slate-500 font-medium">Loading your activity...</p>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-16 text-center border-dashed flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Inbox size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No activity yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            When you interact with the community or have case updates, they'll appear here.
          </p>
          <Button variant="primary" className="mt-8" onClick={() => onViewChange?.('community')}>
            Explore Community
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const actorName = notification.actor?.name || 'Someone';
            const actionText = getNotificationActionText(notification, actorName);
            
            return (
              <Card 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 transition-all cursor-pointer border-slate-200 hover:shadow-md ${!notification.is_read ? 'bg-jurisma-50/30 border-l-4 border-l-jurisma-600' : 'bg-white'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                      {notification.actor?.avatar ? (
                        <img src={notification.actor.avatar} alt={actorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{actorName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <NotificationIcon type={notification.type} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 leading-snug">
                      <span className="font-bold text-slate-900">{actorName}</span>{' '}
                      <span className="text-slate-600">{actionText}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {getTimeAgo(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-jurisma-600 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {pagination.page < pagination.total_pages && (
            <div className="pt-4 flex justify-center">
              <Button 
                variant="ghost" 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                className="font-bold text-jurisma-600 hover:bg-jurisma-50"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load More activity
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
