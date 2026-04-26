import React, { useState } from 'react';
import { Heart, Trash2, Reply, Loader2 } from 'lucide-react';

const CommentItem = ({
    comment,
    postId,
    currentUser,
    postAuthorId,
    onLike,
    onDelete,
    onReply,
    onViewProfile,
    getTimeAgo,
    depth = 0,
    likesTooltip,
    onShowLikes,
    onHideLikes,
    highlightedCommentId
}) => {
    const [isLiking, setIsLiking] = useState(false);

    const isOwner = String(comment.author_id) === String(currentUser?.id);
    const isPostAuthor = String(postAuthorId) === String(currentUser?.id);
    const canDelete = isOwner || isPostAuthor;
    const isAuthenticated = !!currentUser;
    const isHighlighted = String(comment.id) === String(highlightedCommentId);

    // Facebook-style nesting logic
    const isNested = depth > 0;
    const maxDepth = 3;

    return (
        <div id={`comment-${comment.id}`} className={`group animate-fade-in ${isNested ? 'mt-2' : 'mb-5'}`}>
            <div className="flex gap-2.5 items-start relative">
                {/* Avatar */}
                <div
                    className={`${isNested ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center font-bold text-slate-600 overflow-hidden cursor-pointer hover:ring-2 hover:ring-jurisma-100 transition-all z-10 shadow-sm`}
                    onClick={() => comment.author_id && onViewProfile(comment.author_id)}
                >
                    {comment.author?.avatar || comment.author_avatar ? (
                        <img src={comment.author?.avatar || comment.author_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                        (comment.author_name || 'U').charAt(0)
                    )}
                </div>

                {/* Content Box */}
                <div className="flex-1 min-w-0">
                    <div className={`p-3 rounded-2xl rounded-tl-none border shadow-sm group-hover:shadow-md transition-shadow ${isHighlighted ? 'bg-jurisma-50/70 border-jurisma-300 ring-2 ring-jurisma-200/70' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-0.5">
                            <span
                                className="font-bold text-[12px] text-slate-900 hover:text-jurisma-700 cursor-pointer"
                                onClick={() => comment.author_id && onViewProfile(comment.author_id)}
                            >
                                {comment.author_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{getTimeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-normal break-words">{comment.content}</p>
                    </div>

                    {/* Action Bar - Facebook Style */}
                    <div className="flex items-center gap-4 mt-1 ml-2">
                        <div className="relative">
                            <button
                                onClick={async () => {
                                    setIsLiking(true);
                                    try {
                                        await onLike(postId, comment.id, !!comment.is_liked);
                                    } finally {
                                        setIsLiking(false);
                                    }
                                }}
                                disabled={isLiking}
                                className={`flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-md transition-all active:scale-95 ${comment.is_liked ? 'text-red-600 bg-red-50/50' : 'text-slate-500 hover:text-red-500 hover:bg-slate-50'}`}
                            >
                                {isLiking ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Heart size={12} className={comment.is_liked ? 'fill-red-600' : ''} />
                                )}
                                <span className="text-[11px] font-bold leading-none">{comment.is_liked ? 'Liked' : 'Like'}</span>
                                {Number(comment.likes_count) > 0 && (
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${comment.is_liked ? 'bg-white text-red-600 border-red-100' : 'bg-white text-slate-500 border-slate-100'}`}
                                        onMouseEnter={(e) => onShowLikes(comment.id, e)}
                                        onMouseLeave={onHideLikes}
                                    >
                                        {comment.likes_count}
                                    </span>
                                )}
                            </button>

                            {/* Comment Likes Tooltip */}
                            {likesTooltip?.show && likesTooltip?.commentId === comment.id && (
                                <div className="absolute bottom-full left-0 mb-2 bg-slate-900 text-white rounded-lg shadow-xl p-2 min-w-[120px] z-50 animate-in fade-in slide-in-from-bottom-1 border border-white/10">
                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {likesTooltip.users?.length > 0 ? (
                                            likesTooltip.users.slice(0, 5).map(u => (
                                                <div key={u.id} className="flex items-center gap-2 px-1 py-0.5">
                                                    <div className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[6px] overflow-hidden">
                                                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                                                    </div>
                                                    <span className="text-[8px] truncate">{u.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[8px] text-center opacity-40 py-1">Loading...</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAuthenticated && (
                            <button
                                onClick={() => onReply(postId, comment)}
                                className="text-[11px] font-bold text-slate-500 hover:text-jurisma-600 transition-colors flex items-center gap-1"
                            >
                                <Reply size={12} />
                                <span>Reply</span>
                            </button>
                        )}

                        {canDelete && (
                            <button
                                onClick={() => onDelete(postId, comment.id)}
                                className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
                            >
                                <Trash2 size={12} />
                                <span>Delete</span>
                            </button>
                        )}
                    </div>

                    {/* Recursive replies with compact Facebook-like indentation */}
                    {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
                        <div className="mt-2 ml-2.5 pl-3 border-l-2 border-slate-100/90 space-y-2">
                            {comment.replies.map(reply => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    postId={postId}
                                    currentUser={currentUser}
                                    postAuthorId={postAuthorId}
                                    onLike={onLike}
                                    onDelete={onDelete}
                                    onReply={onReply}
                                    onViewProfile={onViewProfile}
                                    getTimeAgo={getTimeAgo}
                                    depth={depth + 1}
                                    likesTooltip={likesTooltip}
                                    onShowLikes={onShowLikes}
                                    onHideLikes={onHideLikes}
                                    highlightedCommentId={highlightedCommentId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;
