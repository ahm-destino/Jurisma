import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Heart, Share2, MoreHorizontal, Image, Users, TrendingUp, Bookmark, Loader2, Send, Edit3, Trash2, Flag, Eye, X, HelpCircle, PenTool, UserPlus, UserCheck, UserMinus } from "lucide-react";
import { Card, Badge, Textarea } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import { buildCommentTree } from '../services/utils';
import UserProfile from "../components/social/UserProfile.jsx";
import PostItem from "../components/social/PostItem.jsx";

// FILTERS configuration for the feed
const FILTERS = ['All Posts', 'Legal Questions', 'Legal News', 'Networking'];

export default function SocialHub({ viewParams }) {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(0);
  const [newPostContent, setNewPostContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [postCategory, setPostCategory] = useState("discussion");
  const [posting, setPosting] = useState(false);
  const [likingPostId, setLikingPostId] = useState(null);
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' or 'top'

  // New State for Profile and Comments
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [deepLinkNotice, setDeepLinkNotice] = useState(null);
  const noticeTimeoutRef = useRef(null);
  const pinnedPostIdRef = useRef(null);

  // Enhanced features state
  const [showPostMenu, setShowPostMenu] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [likesTooltip, setLikesTooltip] = useState({ show: false, users: [], x: 0, y: 0 });
  const [commentLikesTooltip, setCommentLikesTooltip] = useState({ show: false, users: [], x: 0, y: 0 });
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [userStats, setUserStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
    connections: null,
    role: ''
  });
  const [suggestedConnections, setSuggestedConnections] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const canPost = user?.role === 'student' || user?.role === 'lawyer';

  const resolveRelationship = (record) => {
    if (!record) return 'none';
    if (record.relationship) return record.relationship;
    const followsViewer = !!(record.follows_viewer ?? record.is_followed_by);
    const isFollowing = !!record.is_following;
    if (record.is_connected || (isFollowing && followsViewer)) return 'connected';
    if (isFollowing) return 'following';
    if (followsViewer) return 'follower';
    return 'none';
  };

  const showNotice = (message) => {
    if (!message) return;
    setDeepLinkNotice(message);
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = setTimeout(() => {
      setDeepLinkNotice(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchPosts();
    if (isAuthenticated && user?.id) {
      fetchUserStats();
      fetchSuggestedConnections();
    }
  }, [activeFilter, isAuthenticated, sortOrder]);

  const scrollToPost = (postId) => {
    if (!postId) return;
    const element = document.getElementById(`post-${postId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToComment = (commentId) => {
    if (!commentId) return;
    const element = document.getElementById(`comment-${commentId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const flattenCommentTree = (nodes = []) => {
    const flat = [];
    const stack = [...nodes];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;
      flat.push(node);
      if (node.replies && node.replies.length > 0) {
        stack.push(...node.replies);
      }
    }
    return flat;
  };

  const mergeCommentsForPost = (postId, extraComments = []) => {
    if (!postId || extraComments.length === 0) return;
    setComments(prev => {
      const existingFlat = flattenCommentTree(prev[postId] || []);
      const merged = new Map();

      existingFlat.forEach(comment => {
        if (comment?.id) merged.set(String(comment.id), comment);
      });

      extraComments.forEach(comment => {
        if (comment?.id) merged.set(String(comment.id), comment);
      });

      const mergedFlat = Array.from(merged.values());
      const mergedTree = buildCommentTree(mergedFlat);
      return { ...prev, [postId]: mergedTree };
    });
  };

  const ensurePostLoaded = async (postId) => {
    if (!postId) return null;
    const existing = posts.find(post => String(post.id) === String(postId));
    if (existing) return existing;

    try {
      const post = await api.getPost(postId);
      if (post) {
        setPosts(prev => [post, ...prev.filter(p => String(p.id) !== String(postId))]);
      }
      return post || null;
    } catch (err) {
      showNotice('That post is no longer available.');
      return null;
    }
  };

  const ensureCommentsLoaded = async (postId) => {
    if (!postId) return [];
    if (comments[postId]) return comments[postId];

    try {
      const postComments = await api.getComments(postId);
      const nestedComments = buildCommentTree(postComments);
      setComments(prev => ({ ...prev, [postId]: nestedComments || [] }));
      return nestedComments || [];
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  };

  // Deep linking for post/comment
  useEffect(() => {
    const targetCommentId = viewParams?.commentId;
    const targetPostId = viewParams?.postId;
    if (!targetCommentId && !targetPostId) return;

    let cancelled = false;

    const runDeepLink = async () => {
      if (targetCommentId) {
        try {
          const comment = await api.getCommentById(targetCommentId);
          if (cancelled) return;

          const resolvedPostId = comment?.post_id || targetPostId;
          if (!resolvedPostId) {
            showNotice('That reply is no longer available.');
            return;
          }

          pinnedPostIdRef.current = String(resolvedPostId);
          const post = await ensurePostLoaded(resolvedPostId);
          if (!post || cancelled) return;

          const baseComments = await ensureCommentsLoaded(resolvedPostId);

          const extraComments = [comment];
          let parentId = comment.parent_comment_id;
          let guard = 0;
          while (parentId && guard < 5) {
            const existingFlat = flattenCommentTree(baseComments || []);
            const hasParent = existingFlat.some(c => String(c.id) === String(parentId));
            if (hasParent) break;

            try {
              const parent = await api.getCommentById(parentId);
              if (!parent) break;
              extraComments.push(parent);
              parentId = parent.parent_comment_id;
            } catch (err) {
              break;
            }
            guard += 1;
          }

          if (!cancelled) {
            mergeCommentsForPost(resolvedPostId, extraComments);
            setExpandedPostId(String(resolvedPostId));
            setHighlightedCommentId(String(targetCommentId));

            setTimeout(() => {
              if (!cancelled) scrollToComment(targetCommentId);
            }, 350);

            setTimeout(() => {
              if (!cancelled) setHighlightedCommentId(null);
            }, 4500);
          }
        } catch (err) {
          if (!cancelled) {
            showNotice('That reply is no longer available.');
            if (targetPostId) {
              pinnedPostIdRef.current = String(targetPostId);
              await ensurePostLoaded(targetPostId);
              setExpandedPostId(String(targetPostId));
              setTimeout(() => scrollToPost(targetPostId), 350);
            }
          }
        }
        return;
      }

      if (targetPostId) {
        pinnedPostIdRef.current = String(targetPostId);
        await ensurePostLoaded(targetPostId);
        if (cancelled) return;
        setExpandedPostId(String(targetPostId));
        setTimeout(() => scrollToPost(targetPostId), 350);
      }
    };

    runDeepLink();

    return () => {
      cancelled = true;
    };
  }, [viewParams?.commentId, viewParams?.postId]);

  // Deep linking for user profile
  useEffect(() => {
    if (viewParams?.userId) {
      setViewingProfileId(viewParams.userId);
    }
  }, [viewParams?.userId]);

  const fetchUserStats = async () => {
    if (!user?.id) return;
    setLoadingStats(true);
    try {
      const profile = await api.getCurrentUserProfile();
      if (profile) {
        const hasConnectionsCount = Object.prototype.hasOwnProperty.call(profile || {}, 'connections_count');
        const conns = hasConnectionsCount ? (profile.connections_count ?? 0) : null;
        setUserStats({
          posts: profile.posts_count || 0,
          followers: profile.followers_count || 0,
          following: profile.following_count || 0,
          connections: conns,
          role: profile.credentials || profile.role || user.role
        });
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchSuggestedConnections = async () => {
    try {
      const data = await api.getSuggestedConnections();
      setSuggestedConnections(data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const handleFollowUser = async (userToFollow) => {
    if (!isAuthenticated) {
      addToast({ type: 'warning', message: "Please sign in to follow users." });
      return;
    }

    try {
      const currentRelationship = resolveRelationship(userToFollow);
      const currentlyFollowing = currentRelationship === 'following' || currentRelationship === 'connected';
      
      if (currentlyFollowing) {
        await api.unfollowUser(userToFollow.id);
        const isMutual = currentRelationship === 'connected';
        addToast({ 
          type: 'success', 
          message: isMutual ? `Disconnected from ${userToFollow.name}` : `Unfollowed ${userToFollow.name}` 
        });
      } else {
        await api.followUser(userToFollow.id);
        const willBeMutual = currentRelationship === 'follower';
        addToast({ 
          type: 'success', 
          message: willBeMutual ? `Connected with ${userToFollow.name}` : `Now following ${userToFollow.name}` 
        });
      }
      
      // Refresh to get updated counts and relationship states
      fetchSuggestedConnections();
      fetchUserStats();
    } catch (err) {
      console.error('Error following user:', err);
      addToast({ type: 'error', message: "Action failed. Please try again." });
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    const categoryMap = ['all', 'case-insight', 'legal-news', 'discussion'];
    const category = categoryMap[activeFilter];

    try {
      const result = activeFilter === 0
        ? await api.getFeed(1, 20, sortOrder)
        : await api.getPosts(1, 20, category);

      if (result && result.posts) {
        let nextPosts = result.posts;
        const pinnedPostId = pinnedPostIdRef.current;
        if (pinnedPostId && !nextPosts.some(post => String(post.id) === String(pinnedPostId))) {
          try {
            const pinnedPost = await api.getPost(pinnedPostId);
            if (pinnedPost) {
              nextPosts = [pinnedPost, ...nextPosts];
            }
          } catch (err) {
            // Ignore if pinned post no longer exists
          }
        }
        setPosts(nextPosts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setPosts([]);
      setError("Unable to load latest posts. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && postImages.length === 0) return;

    setPosting(true);
    try {
      await api.createPost(newPostContent, postCategory, [], postImages);
      setNewPostContent("");
      setPostImages([]);
      setShowImageUpload(false);
      await fetchPosts();
      addToast({ type: 'success', message: "Post published successfully!" });
    } catch (err) {
      console.error('Error creating post:', err);
      addToast({ type: 'error', message: "Failed to create post. Please try again." });
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.deletePost(postId);
      setPosts(posts.filter(post => String(post.id) !== String(postId)));
      addToast({ type: 'success', message: "Post deleted successfully" });
    } catch (err) {
      console.error('Error deleting post:', err);
      addToast({ type: 'error', message: "Failed to delete post" });
    }
  };

  const handleEditPost = async (postId, newContent) => {
    try {
      const updatedPost = await api.updatePost(postId, newContent);
      setPosts(posts.map(post => {
        if (String(post.id) === String(postId)) {
          return { ...post, content: updatedPost.content };
        }
        return post;
      }));
      setEditingPost(null);
      setEditContent('');
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  const handleLike = async (postId, isLiked) => {
    if (!isAuthenticated) {
      addToast({ type: 'warning', message: "Please sign in to like posts." });
      return;
    }

    setLikingPostId(postId);
    try {
      const result = isLiked ? await api.unlikePost(postId) : await api.likePost(postId);

      if (result) {
        setPosts(currentPosts => currentPosts.map(post => {
          if (String(post.id) === String(postId)) {
            return {
              ...post,
              is_liked: result.is_liked ?? !isLiked,
              likes_count: result.likes_count ?? (isLiked ? post.likes_count - 1 : post.likes_count + 1)
            };
          }
          return post;
        }));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      setLikingPostId(null);
    }
  };

  const handleBookmark = async (postId, isBookmarked) => {
    try {
      if (isBookmarked) {
        await api.removeBookmark(postId);
      } else {
        await api.bookmarkPost(postId);
      }

      setPosts(posts.map(post => {
        if (String(post.id) === String(postId)) {
          return { ...post, is_bookmarked: !isBookmarked };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handleShare = (postId) => {
    const shareUrl = `${window.location.origin}/social?postId=${postId}`;
    navigator.clipboard.writeText(shareUrl);
    addToast({ type: 'success', message: "Link copied to clipboard!" });
  };

  const handleReportPost = async (postId) => {
    if (!reportReason) return;
    setIsReporting(true);
    try {
      await api.reportPost(postId, reportReason, reportDescription);
      addToast({ type: 'success', message: "Thank you for your report. Our moderators will review it." });
      setShowReportModal(null);
      setReportReason('spam');
      setReportDescription('');
    } catch (err) {
      console.error('Error reporting post:', err);
      addToast({ type: 'error', message: "Failed to submit report. Please try again." });
    } finally {
      setIsReporting(false);
    }
  };

  const toggleComments = async (postId) => {
    if (String(expandedPostId) === String(postId)) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(String(postId));
    if (!comments[postId]) {
      setLoadingComments(true);
      try {
        const postComments = await api.getComments(postId);
        const nestedComments = buildCommentTree(postComments);
        setComments(prev => ({ ...prev, [postId]: nestedComments }));
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handlePostComment = async (postId, content, parentId = null) => {
    if (!content.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await api.createComment(postId, content, parentId);
      setComments(prev => {
        const postComments = prev[postId] || [];
        if (!parentId) {
          return { ...prev, [postId]: [comment, ...postComments] };
        } else {
          // Recursive function to add reply to the correct parent
          const addReplyToTree = (nodes) => {
            return nodes.map(node => {
              if (String(node.id) === String(parentId)) {
                return { ...node, replies: [comment, ...(node.replies || [])] };
              } else if (node.replies) {
                return { ...node, replies: addReplyToTree(node.replies) };
              }
              return node;
            });
          };
          return { ...prev, [postId]: addReplyToTree(postComments) };
        }
      });
      addToast({ type: 'success', message: "Comment posted!" });
      return true;
    } catch (err) {
      console.error('Error posting comment:', err);
      addToast({ type: 'error', message: "Failed to post comment" });
      return false;
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (postId, commentId, isLiked) => {
    try {
      const result = isLiked ? await api.unlikeComment(commentId) : await api.likeComment(commentId);
      setComments(prev => {
        const updateLikes = (nodes) => {
          return nodes.map(node => {
            if (String(node.id) === String(commentId)) {
              return {
                ...node,
                is_liked: result.is_liked,
                likes_count: result.likes_count
              };
            } else if (node.replies) {
              return { ...node, replies: updateLikes(node.replies) };
            }
            return node;
          });
        };
        return { ...prev, [postId]: updateLikes(prev[postId]) };
      });
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      await api.deleteComment(commentId);
      setComments(prev => {
        const removeNode = (nodes) => {
          return nodes
            .filter(node => String(node.id) !== String(commentId))
            .map(node => (node.replies ? { ...node, replies: removeNode(node.replies) } : node));
        };
        return { ...prev, [postId]: removeNode(prev[postId]) };
      });
      addToast({ type: 'success', message: "Comment deleted" });
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await api.uploadPostImage(file);
      setPostImages([...postImages, result.url]);
    } catch (err) {
      console.error('Error uploading image:', err);
      addToast({ type: 'error', message: "Failed to upload image" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleShowLikes = async (postId, event) => {
    const rect = event.target.getBoundingClientRect();
    setLikesTooltip({ show: true, users: [], x: rect.left, y: rect.top, loading: true });

    try {
      const users = await api.getPostLikes(postId);
      setLikesTooltip(prev => ({ ...prev, users: users || [], loading: false }));
    } catch (err) {
      setLikesTooltip(prev => ({ ...prev, show: false }));
    }
  };

  const handleShowCommentLikes = async (commentId, event) => {
    const rect = event.target.getBoundingClientRect();
    setCommentLikesTooltip({ show: true, users: [], x: rect.left, y: rect.top, loading: true });

    try {
      const users = await api.getCommentLikes(commentId);
      setCommentLikesTooltip(prev => ({ ...prev, users: users || [], loading: false }));
    } catch (err) {
      setCommentLikesTooltip(prev => ({ ...prev, show: false }));
    }
  };

  // Add a wrap for likes tooltip show/hide
  const onShowLikes = (postId, event) => handleShowLikes(postId, event);
  const onHideLikes = () => setLikesTooltip(prev => ({ ...prev, show: false }));

  const onShowCommentLikes = (commentId, event) => handleShowCommentLikes(commentId, event);
  const onHideCommentLikes = () => setCommentLikesTooltip(prev => ({ ...prev, show: false }));

  // Profile View
  if (viewingProfileId) {
    return (
      <UserProfile
        userId={viewingProfileId}
        currentUser={user}
        onBack={() => setViewingProfileId(null)}
        onViewProfile={setViewingProfileId}
        onViewerProfileRefresh={fetchUserStats}
        onAnswer={() => {
          setViewingProfileId(null);
          setActiveFilter(1); // Legal Questions
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
      {/* Feed Section */}
      <div className="flex-1 space-y-6">
        {deepLinkNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
            {deepLinkNotice}
          </div>
        )}
        {/* Create Post Area - Quora Style */}
        <Card className="p-0 overflow-hidden mb-6 border-slate-200">
          <div className="p-4 flex gap-3 items-start">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-jurisma-100 flex-shrink-0 flex items-center justify-center text-jurisma-900 font-bold overflow-hidden border border-slate-100">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : (user?.name?.charAt(0) || 'G')}
            </div>
            <button
              onClick={() => {
                setIsExpanded(true);
                setPostCategory('discussion');
              }}
              className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-left text-slate-500 text-sm transition-colors cursor-text"
            >
              What do you want to ask or share?
            </button>
          </div>

          <div className="flex border-t border-slate-100">
            <button
              onClick={() => {
                setPostCategory('question');
                setIsExpanded(true);
              }}
              className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 font-medium text-xs md:text-sm transition-colors border-r border-slate-100"
            >
              <HelpCircle size={18} className="text-slate-400" />
              <span>Ask</span>
            </button>
            <button
              onClick={() => {
                setActiveFilter(1); // Set to index 1 (Legal Questions)
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 font-medium text-xs md:text-sm transition-colors border-r border-slate-100"
            >
              <Edit3 size={18} className="text-slate-400" />
              <span>Answer</span>
            </button>
            <button
              className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 font-medium text-xs md:text-sm transition-colors"
              onClick={() => {
                setPostCategory('discussion');
                setIsExpanded(true);
              }}
            >
              <PenTool size={18} className="text-slate-400" />
              <span>Post</span>
            </button>
          </div>

          {/* Expanded Composer (Conditional) */}
          {isExpanded && (
            <div className="p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
              <Textarea
                placeholder={postCategory === 'question' ? "What is your question?" : "Post your legal insights..."}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={4}
                autoFocus
                className="bg-white border focus:border-jurisma-500 rounded-xl text-sm md:text-base transition-all resize-none mb-4"
              />

              {/* Image Previews */}
              {postImages.length > 0 && (
                <div className="mb-4 flex gap-2 flex-wrap bg-slate-50 p-2 rounded-lg">
                  {postImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm" />
                      <button
                        onClick={() => setPostImages(postImages.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {uploadingImage && (
                    <div className="w-20 h-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-white shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-jurisma-400" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => document.getElementById('social-image-upload').click()}
                    className="p-2 text-slate-500 hover:text-jurisma-600 hover:bg-jurisma-50 rounded-full transition-all"
                    title="Add Image"
                  >
                    <Image size={20} />
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Category:</span>
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="text-[10px] font-bold text-jurisma-700 bg-jurisma-50 border-none rounded px-2 py-1 outline-none cursor-pointer"
                    >
                      <option value="discussion">Discussion</option>
                      <option value="question">Question</option>
                      <option value="news">Legal News</option>
                      <option value="networking">Networking</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewPostContent('');
                      setPostImages([]);
                      setIsExpanded(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleCreatePost();
                      setIsExpanded(false);
                    }}
                    disabled={!newPostContent.trim() || posting}
                    size="sm"
                    className="bg-jurisma-600 hover:bg-jurisma-700 font-bold px-6"
                  >
                    {posting ? <Loader2 className="animate-spin h-4 w-4" /> : (postCategory === 'question' ? 'Ask Question' : 'Add Post')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            id="social-image-upload"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </Card>

        {/* Filter Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 flex-1">
              {FILTERS.map((filter, i) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(i)}
                  className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border ${activeFilter === i ? 'bg-jurisma-600 text-white border-jurisma-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-jurisma-300 hover:text-jurisma-600'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-amber-700">{error}</p>
            <button onClick={fetchPosts} className="text-xs text-amber-700 font-bold hover:underline">Retry</button>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-6">
          {loading ? (
            <Card className="p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-jurisma-500 mb-2" />
              <p>Curating your legal feed...</p>
            </Card>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-200">
              <p className="text-slate-500">No posts in this category yet.</p>
            </Card>
          ) : (
            posts.map(post => (
              <PostItem
                key={post.id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onDelete={handleDeletePost}
                onEdit={handleEditPost}
                onReport={(id) => setShowReportModal(id)}
                onShare={handleShare}
                onBookmark={handleBookmark}
                onViewProfile={setViewingProfileId}
                onToggleComments={toggleComments}
                onPostComment={handlePostComment}
                onLikeComment={handleLikeComment}
                onDeleteComment={handleDeleteComment}
                comments={comments[post.id] || []}
                expandedPostId={expandedPostId}
                loadingComments={loadingComments}
                submittingComment={submittingComment}
                getTimeAgo={getTimeAgo}
                likesTooltip={likesTooltip}
                onShowLikes={onShowLikes}
                onHideLikes={onHideLikes}
                commentLikesTooltip={commentLikesTooltip}
                onShowCommentLikes={onShowCommentLikes}
                onHideCommentLikes={onHideCommentLikes}
                highlightedCommentId={highlightedCommentId}
              />
            ))
          )}
        </div>
      </div>

      {/* Sidebar Section */}
      <div className="lg:w-80 space-y-6">
        {/* User Stats Card (Only shows if logged in) */}
        {isAuthenticated && (
          <Card className="p-0 overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-jurisma-600 to-jurisma-800"></div>
            <div className="px-5 pb-5 -mt-8">
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-full bg-white p-1 shadow-md mb-2 cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setViewingProfileId(user.id)}
                >
                  <div className="w-full h-full rounded-full bg-jurisma-100 flex items-center justify-center text-jurisma-900 font-bold text-2xl overflow-hidden border border-slate-100">
                    {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : (user?.name?.charAt(0) || 'U')}
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-0.5 hover:underline cursor-pointer" onClick={() => setViewingProfileId(user.id)}>{user?.name}</h3>
                <p className="text-xs text-slate-500 capitalize mb-4">{userStats.role || user?.role}</p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => user?.id && setViewingProfileId(user.id)}>
                  <span className="text-xs text-slate-500 font-medium group-hover:text-jurisma-600">Posts</span>
                  <span className="text-xs font-bold text-jurisma-700">{userStats.posts || 0}</span>
                </div>
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => user?.id && setViewingProfileId(user.id)}>
                  <span className="text-xs text-slate-500 font-medium group-hover:text-jurisma-600">Followers</span>
                  <span className="text-xs font-bold text-jurisma-700">{userStats.followers || 0}</span>
                </div>
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => user?.id && setViewingProfileId(user.id)}>
                  <span className="text-xs text-slate-500 font-medium group-hover:text-jurisma-600">Following</span>
                  <span className="text-xs font-bold text-jurisma-700">{userStats.following || 0}</span>
                </div>
                {userStats.connections !== null && userStats.connections !== undefined && (
                  <div className="flex justify-between items-center group cursor-pointer" onClick={() => user?.id && setViewingProfileId(user.id)}>
                    <span className="text-xs text-slate-500 font-medium group-hover:text-jurisma-600">Connections</span>
                    <span className="text-xs font-bold text-jurisma-700">{userStats.connections}</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 text-xs font-bold h-9 border-slate-200"
                onClick={() => setViewingProfileId(user.id)}
              >
                View My Profile
              </Button>
            </div>
          </Card>
        )}

        {/* Suggested Connections (LinkedIn Style) */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span className="text-sm">People you may know</span>
            <Users size={16} className="text-jurisma-500" />
          </h3>
          <div className="space-y-4">
            {suggestedConnections.length > 0 ? (
              suggestedConnections.map(person => {
                const relationship = resolveRelationship(person);
                return (
                  <div key={person.id} className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-600 font-medium border border-slate-100 overflow-hidden">
                      {person.avatar ? <img src={person.avatar} alt="" className="w-full h-full object-cover" /> : person.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate hover:underline cursor-pointer" onClick={() => setViewingProfileId(person.id)}>{person.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{person.role || person.headline || 'Legal Professional'}</p>
                    </div>
                    <button 
                      onClick={() => handleFollowUser(person)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all text-xs font-bold group/btn ${
                        relationship === 'connected' ? 'bg-jurisma-100 text-jurisma-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent' :
                        relationship === 'following' ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent' :
                        relationship === 'follower' ? 'bg-jurisma-600 text-white hover:bg-jurisma-700' :
                        'bg-slate-50 text-slate-400 hover:bg-jurisma-50 hover:text-jurisma-600'
                      }`}
                    >
                      <span className="group-hover/btn:hidden flex items-center gap-1">
                        {relationship === 'connected' ? <><UserCheck size={14} /> Connected</> :
                         relationship === 'following' ? <><UserCheck size={14} /> Following</> :
                         relationship === 'follower' ? <><UserPlus size={14} /> Follow Back</> :
                         <><UserPlus size={14} /> Follow</>}
                      </span>
                      <span className="hidden group-hover/btn:flex items-center gap-1">
                        {(relationship === 'connected' || relationship === 'following') ? <><UserMinus size={14} /> Unfollow</> :
                         (relationship === 'follower' ? 'Follow Back' : 'Follow')}
                      </span>
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-400 text-center py-2">No suggestions at the moment.</p>
            )}
          </div>
          <Button variant="ghost" className="w-full mt-4 text-[10px] font-bold text-slate-500 h-8 hover:bg-slate-50">See All Suggestions</Button>
        </Card>
      </div>

      {
        showReportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Report Content</h3>
                <button onClick={() => setShowReportModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-6 font-medium">Why are you reporting this post? Your feedback helps us keep the community safe.</p>

              <div className="space-y-3 mb-6">
                {['spam', 'harassment', 'misinformation', 'inappropriate_content', 'other'].map(reason => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${reportReason === reason ? 'border-jurisma-500 bg-jurisma-50/50' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-4 h-4 text-jurisma-600 focus:ring-jurisma-500"
                    />
                    <span className="text-sm font-bold text-slate-700 capitalize">{reason.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>

              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Provide additional context to help our moderators..."
                className="w-full border border-slate-200 rounded-xl p-4 text-sm mb-6 focus:ring-2 focus:ring-jurisma-500 outline-none transition-all placeholder:text-slate-300 min-h-[100px]"
                rows={3}
              />

              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-xl" onClick={() => setShowReportModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 md:flex-none h-12 px-8 rounded-xl shadow-lg shadow-jurisma-200"
                  onClick={() => handleReportPost(showReportModal)}
                  disabled={!reportReason || isReporting}
                >
                  {isReporting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  Submit Report
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
