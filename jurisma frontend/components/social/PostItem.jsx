import React, { useState } from 'react';
import {
    MessageCircle, Heart, Share2, MoreHorizontal, Bookmark,
    Loader2, Send, Edit3, Trash2, Flag, X, HelpCircle
} from 'lucide-react';
import { Card, Badge, Textarea } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import CommentItem from './CommentItem.jsx';

const PostItem = ({
    post,
    currentUser,
    onLike,
    onDelete,
    onEdit,
    onReport,
    onShare,
    onBookmark,
    onViewProfile,
    onToggleComments,
    onPostComment,
    onLikeComment,
    onDeleteComment,
    comments = [],
    expandedPostId,
    loadingComments,
    submittingComment,
    getTimeAgo,
    likesTooltip,
    onShowLikes,
    onHideLikes,
    commentLikesTooltip,
    onShowCommentLikes,
    onHideCommentLikes,
    highlightedCommentId
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [localNewComment, setLocalNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);

    const [isLiking, setIsLiking] = useState(false);
    const [isBookmarking, setIsBookmarking] = useState(false);

    const isOwner = String(post.author_id) === String(currentUser?.id) || String(post.author?.id) === String(currentUser?.id);
    const isExpanded = String(expandedPostId) === String(post.id);

    const handleEdit = () => {
        onEdit(post.id, editContent);
        setIsEditing(false);
    };

    const handleReply = (postId, comment) => {
        setReplyingTo(comment);
        setLocalNewComment(`@${comment.author_name} `);
        const input = document.getElementById(`comment-input-${post.id}`);
        if (input) input.focus();
    };

    const handleLikeClick = async () => {
        setIsLiking(true);
        try {
            await onLike(post.id, post.is_liked);
        } finally {
            setIsLiking(false);
        }
    };

    const handleBookmarkClick = async () => {
        setIsBookmarking(true);
        try {
            await onBookmark(post.id, post.is_bookmarked);
        } finally {
            setIsBookmarking(false);
        }
    };

    const handleSubmitComment = () => {
        onPostComment(post.id, localNewComment, replyingTo?.id);
        setLocalNewComment("");
        setReplyingTo(null);
    };

    return (
        <Card id={`post-${post.id}`} className="p-0 overflow-hidden transition-shadow hover:shadow-md border-slate-200 mb-6">
            <div className="p-4 md:p-6">
                {/* Post Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3">
                        <div
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center font-bold text-slate-600 border border-slate-100 cursor-pointer hover:border-jurisma-500 transition-colors overflow-hidden"
                            onClick={() => post.author_id && onViewProfile(post.author_id)}
                        >
                            {post.author_avatar ? (
                                <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                (post.author_name || post.author || 'A').charAt(0)
                            )}
                        </div>
                        <div>
                            <h4
                                className="font-bold text-slate-900 text-sm md:text-base cursor-pointer hover:text-jurisma-700"
                                onClick={() => post.author_id && onViewProfile(post.author_id)}
                            >
                                {post.author_name || post.author}
                            </h4>
                            <div className="flex items-center text-[10px] md:text-xs text-slate-500 gap-2">
                                <span>{post.author_role || post.role || 'Legal Professional'}</span>
                                <span>•</span>
                                <span>{getTimeAgo(post.created_at || post.time)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-50 transition-colors"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <MoreHorizontal size={20} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[160px] z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                {isOwner ? (
                                    <>
                                        <button
                                            onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Edit3 size={14} /> Edit Post
                                        </button>
                                        <button
                                            onClick={() => onDelete(post.id)}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600 transition-colors"
                                        >
                                            <Trash2 size={14} /> Delete Post
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => onReport(post.id)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Flag size={14} /> Report Post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Post Content */}
                {isEditing ? (
                    <div className="space-y-3 mb-4">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="text-sm md:text-base"
                        />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleEdit}>Save Changes</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {post.category === 'question' ? (
                            <h3 className="text-slate-900 text-base md:text-lg font-bold leading-tight mb-4 hover:text-jurisma-900 cursor-pointer">{post.content}</h3>
                        ) : (
                            <p className="text-slate-700 text-sm md:text-base leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
                        )}

                        {post.images && post.images.length > 0 && (
                            <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                <img src={post.images[0]} alt="" className="w-full h-auto max-h-[500px] object-cover" />
                            </div>
                        )}
                    </>
                )}

                {/* Tags & Category */}
                <div className="flex gap-2 mb-4 overflow-hidden flex-wrap">
                    {post.tags?.map((tag, idx) => (
                        <Badge key={idx} variant="blue">#{tag}</Badge>
                    ))}
                    {post.category && <Badge variant="jurisma">{post.category.replace('-', ' ')}</Badge>}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex gap-2 min-[400px]:gap-4">
                        <div className="relative">
                            <button
                                onClick={handleLikeClick}
                                disabled={isLiking}
                                className={`flex items-center gap-1.5 text-[11px] md:text-sm font-medium transition-all ${post.is_liked ? 'text-red-600 bg-red-50 px-2 py-1 rounded-lg' : 'text-slate-500 hover:text-red-600'}`}
                            >
                                {isLiking ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Heart size={16} fill={post.is_liked ? "currentColor" : "none"} />
                                )}
                                <span>{post.category === 'question' ? 'Upvote' : 'Like'}</span>
                                <span
                                    onMouseEnter={(e) => onShowLikes(post.id, e)}
                                    onMouseLeave={onHideLikes}
                                    className="ml-1 cursor-help font-bold"
                                >
                                    {post.likes_count || 0}
                                </span>
                            </button>

                            {/* Likes Tooltip */}
                            {likesTooltip?.show && likesTooltip?.postId === post.id && (
                                <div className="absolute bottom-full left-0 mb-2 bg-slate-900 text-white rounded-lg shadow-xl p-2 min-w-[140px] z-50 animate-in fade-in slide-in-from-bottom-1 border border-white/10">
                                    <p className="text-[10px] font-bold opacity-60 mb-2 px-1">ENGAGEMENT</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                        {likesTooltip.users?.length > 0 ? (
                                            likesTooltip.users.slice(0, 5).map(u => (
                                                <div key={u.id} className="flex items-center gap-2 px-1 py-0.5">
                                                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black overflow-hidden">
                                                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                                                    </div>
                                                    <span className="text-[9px] font-medium truncate">{u.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[9px] text-center opacity-40 py-2">No likes yet</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => onToggleComments(post.id)}
                            className={`flex items-center gap-1.5 text-[11px] md:text-sm font-medium transition-colors ${isExpanded ? 'text-jurisma-600' : 'text-slate-500 hover:text-jurisma-600'}`}
                        >
                            <MessageCircle size={16} />
                            <span>{post.comments_count || 0}</span>
                        </button>

                        <button
                            onClick={() => onShare(post)}
                            className="text-slate-500 hover:text-jurisma-600 transition-colors"
                        >
                            <Share2 size={16} />
                        </button>
                    </div>

                    <button
                        onClick={handleBookmarkClick}
                        disabled={isBookmarking}
                        className={`p-2 rounded-lg transition-colors ${post.is_bookmarked ? 'text-jurisma-600 bg-jurisma-50' : 'text-slate-400 hover:bg-slate-50'}`}
                        title={post.is_bookmarked ? "Remove Bookmark" : "Bookmark Post"}
                    >
                        {isBookmarking ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Bookmark size={18} fill={post.is_bookmarked ? 'currentColor' : 'none'} />
                        )}
                    </button>
                </div>

                {/* Comments Section */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-50 animate-fade-in bg-slate-50 -mx-4 -mb-4 px-4 pb-4 md:-mx-6 md:-mb-6 md:px-6 md:pb-6 rounded-b-xl">
                        {loadingComments ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-jurisma-500" /></div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {comments.length === 0 ? (
                                        <p className="text-center text-xs text-slate-400 py-4">No comments yet. Start the conversation!</p>
                                    ) : (
                                        comments.map(comment => (
                                            <CommentItem
                                                key={comment.id}
                                                comment={comment}
                                                postId={post.id}
                                                currentUser={currentUser}
                                                postAuthorId={post.author_id}
                                                onLike={onLikeComment}
                                                onDelete={onDeleteComment}
                                                onReply={handleReply}
                                                onViewProfile={onViewProfile}
                                                getTimeAgo={getTimeAgo}
                                                likesTooltip={commentLikesTooltip}
                                                onShowLikes={onShowCommentLikes}
                                                onHideLikes={onHideCommentLikes}
                                                highlightedCommentId={highlightedCommentId}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Comment Input */}
                                <div className="flex gap-2 items-end pt-2">
                                    <div className="flex-1 relative">
                                        {replyingTo && (
                                            <div className="absolute -top-6 left-0 right-0 flex justify-between items-center text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-t">
                                                <span className="text-slate-500 italic">Replying to {replyingTo.author_name}</span>
                                                <button onClick={() => setReplyingTo(null)} className="text-red-500"><X size={10} /></button>
                                            </div>
                                        )}
                                        <textarea
                                            id={`comment-input-${post.id}`}
                                            value={localNewComment}
                                            onChange={(e) => setLocalNewComment(e.target.value)}
                                            placeholder="Write a comment..."
                                            className="w-full text-sm border-slate-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-jurisma-500 min-h-[44px] max-h-32 resize-none shadow-sm"
                                            rows={1}
                                            onInput={(e) => {
                                                e.target.style.height = 'inherit';
                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                            }}
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitComment}
                                        disabled={submittingComment || !localNewComment.trim()}
                                        className="h-11 w-11 p-0 rounded-xl shadow-lg shrink-0"
                                    >
                                        {submittingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default PostItem;
