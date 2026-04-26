import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft, MapPin, Briefcase, Calendar, Mail, Loader2, MessageCircle,
    Heart, Share2, MoreHorizontal, Bookmark, Image, Edit2, Trash2, Flag,
    UserPlus, UserCheck, UserMinus, Eye, Edit3, Send, X, HelpCircle, PenTool
} from 'lucide-react';
import { Card, Badge, Textarea } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';
import { buildCommentTree } from '../../services/utils.js';
import PostItem from './PostItem.jsx';
import ConnectionsList from './ConnectionsList.jsx';
import BadgeSection from './BadgeSection.jsx';

const UserProfile = ({ userId, onBack, currentUser, onPostClick, onAnswer, onViewProfile, onViewerProfileRefresh }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState(null);

    // New state for enhanced features
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [connectionsCount, setConnectionsCount] = useState(null);
    const [postsCount, setPostsCount] = useState(0);
    const [relationship, setRelationship] = useState('none'); // 'none', 'following', 'follower', 'connected'
    const [followLoading, setFollowLoading] = useState(false);
    const [viewAsVisitor, setViewAsVisitor] = useState(false);

    // Post actions
    const [likingPostId, setLikingPostId] = useState(null);
    const [showPostMenu, setShowPostMenu] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    const [editContent, setEditContent] = useState('');

    // Comments
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [comments, setComments] = useState({});
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [localNewComment, setLocalNewComment] = useState("");
    const [replyingToCommentId, setReplyingToCommentId] = useState(null);

    // Reporting state
    const [showReportModal, setShowReportModal] = useState(null);
    const [reportReason, setReportReason] = useState("spam");
    const [reportDescription, setReportDescription] = useState("");
    const [isReporting, setIsReporting] = useState(false);

    // Like/Comment hover tooltips
    const [likesTooltip, setLikesTooltip] = useState({ show: false, users: [], x: 0, y: 0 });
    const [commentLikesTooltip, setCommentLikesTooltip] = useState({ show: false, users: [], x: 0, y: 0 });

    // Image upload
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [postImages, setPostImages] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [creatingPost, setCreatingPost] = useState(false);
    const [postCategory, setPostCategory] = useState("discussion");
    const [isExpanded, setIsExpanded] = useState(false);

    const [activeTab, setActiveTab] = useState('posts'); // 'answers', 'posts', 'connections', 'activity'

    // Profile Editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        bio: '',
        location: '',
        company: '',
        position: '',
        credentials: '',
        experience: [],
        education: []
    });
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        fetchUserProfile();
        fetchUserPosts();
    }, [userId]);

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

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showPostMenu && !e.target.closest('.post-menu-container')) {
                setShowPostMenu(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showPostMenu]);

    const showConnectionsTab = connectionsCount !== null && connectionsCount !== undefined;
    const profileTabs = [
        'Answers',
        'Posts',
        'Badges',
        'Followers',
        'Following',
        ...(showConnectionsTab ? ['Connections'] : []),
        'Activity'
    ];

    useEffect(() => {
        if (!showConnectionsTab && activeTab === 'connections') {
            setActiveTab('posts');
        }
    }, [showConnectionsTab, activeTab]);

    const fetchUserProfile = async () => {
        try {
            // Check if this is own profile
            const isOwn = currentUser && currentUser.id === userId;
            setIsOwnProfile(isOwn);
            setViewAsVisitor(false); // Default to owner's view if it's own profile

            // Fetch user profile data
            const profile = await api.getUserProfile(userId);
            setProfileData(profile);

            const resolvedRelationship = resolveRelationship(profile);
            const hasConnectionsCount = Object.prototype.hasOwnProperty.call(profile || {}, 'connections_count');
            const conns = hasConnectionsCount ? (profile.connections_count ?? 0) : null;
            setFollowersCount(profile.followers_count || 0);
            setFollowingCount(profile.following_count || 0);
            setConnectionsCount(conns);
            setPostsCount(profile.posts_count || 0);
            setRelationship(resolvedRelationship);

        } catch (err) {
            console.error('Error fetching user profile:', err);
            // Fallback to basic data from currentUser
            if (currentUser && currentUser.id === userId) {
                setProfileData(currentUser);
                setIsOwnProfile(true);
            } else {
                setProfileData({ name: 'User', role: 'Member', id: userId });
            }
        }
    };

    const fetchUserPosts = async () => {
        setLoading(true);
        try {
            // Fetch posts specifically for the profile feed
            const result = await api.getUserPosts(userId, 1, 20);
            setPosts(result.posts || []);
            setPostsCount(result.pagination?.total || result.posts?.length || 0);
        } catch (err) {
            console.error('Error fetching user posts:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProfileClick = () => {
        setEditForm({
            name: profileData?.name || '',
            bio: profileData?.bio || '',
            location: profileData?.location || '',
            company: profileData?.company || '',
            position: profileData?.position || '',
            credentials: profileData?.credentials || '',
            experience: profileData?.experience || [],
            education: profileData?.education || []
        });
        setIsEditingProfile(true);
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const updatedProfile = await api.updateCurrentUserProfile(editForm);
            setProfileData(updatedProfile);
            setIsEditingProfile(false);
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setSavingProfile(false);
        }
    };

    const addExperience = () => {
        setEditForm(prev => ({
            ...prev,
            experience: [...prev.experience, { company: '', role: '', period: '' }]
        }));
    };

    const addEducation = () => {
        setEditForm(prev => ({
            ...prev,
            education: [...prev.education, { school: '', degree: '', year: '' }]
        }));
    };

    const refreshViewerProfile = async () => {
        if (onViewerProfileRefresh) {
            await onViewerProfileRefresh();
            return;
        }
        try {
            await api.getCurrentUserProfile();
        } catch (err) {
        }
    };

    const handleFollow = async () => {
        if (!currentUser || isOwnProfile) return;

        setFollowLoading(true);
        try {
            const currentRelationship = relationship || 'none';
            const currentlyFollowing = currentRelationship === 'connected' || currentRelationship === 'following';

            if (currentlyFollowing) {
                // Unfollow Action
                const result = await api.unfollowUser(userId);
                const nextRelationship = currentRelationship === 'connected' ? 'follower' : 'none';
                setRelationship(nextRelationship);

                if (typeof result?.followers_count === 'number') {
                    setFollowersCount(result.followers_count);
                } else {
                    setFollowersCount(prev => Math.max(0, prev - 1));
                }
                if (typeof result?.connections_count === 'number') {
                    setConnectionsCount(result.connections_count);
                }
            } else {
                // Follow Action
                const result = await api.followUser(userId);
                const nextRelationship = currentRelationship === 'follower' ? 'connected' : 'following';
                setRelationship(nextRelationship);

                if (typeof result?.followers_count === 'number') {
                    setFollowersCount(result.followers_count);
                } else {
                    setFollowersCount(prev => prev + 1);
                }
                if (typeof result?.connections_count === 'number') {
                    setConnectionsCount(result.connections_count);
                }
            }
            await refreshViewerProfile();
        } catch (err) {
            console.error('Error toggling follow status:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await api.deletePost(postId);
            setPosts(posts.filter(post => post.id !== postId));
            setShowPostMenu(null);
            setPostsCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error deleting post:', err);
        }
    };

    const handleEditPost = async (postId) => {
        try {
            await api.updatePost(postId, editContent);
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return { ...post, content: editContent, is_edited: true };
                }
                return post;
            }));
            setEditingPost(null);
            setEditContent('');
        } catch (err) {
            console.error('Error updating post:', err);
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
                return String(post.id) === String(postId) ? { ...post, is_bookmarked: !isBookmarked } : post;
            }));
        } catch (err) {
            console.error('Error toggling bookmark:', err);
        }
    };

    const handleShowComments = async (postId) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null);
            return;
        }

        setExpandedPostId(postId);
        if (!comments[postId]) {
            setLoadingComments(true);
            try {
                const postComments = await api.getComments(postId);
                const nestedComments = buildCommentTree(postComments);
                setComments(prev => ({ ...prev, [postId]: nestedComments || [] }));
            } catch (err) {
                console.error('Error fetching comments:', err);
            } finally {
                setLoadingComments(false);
            }
        }
    };

    const handleAddComment = async (postId, content, parentCommentId = null) => {
        if (!content?.trim()) return;
        setSubmittingComment(true);
        try {
            await api.addComment(postId, content, parentCommentId);
            // Refresh comments
            const postComments = await api.getComments(postId);
            const nestedComments = buildCommentTree(postComments);
            setComments(prev => ({ ...prev, [postId]: nestedComments || [] }));
            // Update counts locally
            setPosts(posts.map(p => String(p.id) === String(postId) ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleLikeComment = async (postId, commentId, isLiked) => {
        try {
            const result = isLiked ? await api.unlikeComment(commentId) : await api.likeComment(commentId);
            if (result) {
                // Update nested tree
                const updateCommentInTree = (nodes) => {
                    return nodes.map(node => {
                        if (String(node.id) === String(commentId)) {
                            const currentCount = Number(node.likes_count || 0);
                            return {
                                ...node,
                                is_liked: result.is_liked ?? !isLiked,
                                likes_count: result.likes_count ?? (isLiked ? Math.max(0, currentCount - 1) : currentCount + 1)
                            };
                        }
                        if (node.replies && node.replies.length > 0) {
                            return { ...node, replies: updateCommentInTree(node.replies) };
                        }
                        return node;
                    });
                };

                setComments(prev => ({
                    ...prev,
                    [postId]: updateCommentInTree(prev[postId] || [])
                }));
            }
        } catch (err) {
            console.error('Error liking comment:', err);
        }
    };

    const handleDeleteComment = async (postId, commentId) => {
        try {
            await api.deleteComment(commentId);
            const postComments = await api.getComments(postId);
            const nestedComments = buildCommentTree(postComments);
            setComments(prev => ({ ...prev, [postId]: nestedComments || [] }));
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p));
        } catch (err) {
            console.error('Error deleting comment:', err);
        }
    };

    const handleReportPost = async (postId) => {
        if (!reportReason) return alert("Please select a reason for reporting.");

        setIsReporting(true);
        try {
            await api.reportPost(postId, reportReason, reportDescription);
            alert("Thank you for your report. We will review it shortly.");
            setShowReportModal(null);
            setReportReason("spam"); // Reset to default
            setReportDescription("");
        } catch (err) {
            console.error('Error reporting post:', err);
            alert("Failed to submit report. Please try again.");
        } finally {
            setIsReporting(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && postImages.length === 0) return;
        setCreatingPost(true);
        try {
            await api.createPost(newPostContent, 'discussion', [], postImages);
            setNewPostContent('');
            setPostImages([]);
            setShowImageUpload(false);
            fetchUserPosts();
        } catch (err) {
            console.error('Error creating post:', err);
        } finally {
            setCreatingPost(false);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const result = await api.uploadPostImage(file);
            setPostImages(prev => [...prev, result.url]);
        } catch (err) {
            console.error('Error uploading image:', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleShowLikes = async (postId, event) => {
        const rect = event.target.getBoundingClientRect();
        setLikesTooltip({ show: true, postId, users: [], x: rect.left, y: rect.bottom + 5, loading: true });
        try {
            const result = await api.getPostLikes(postId, 1, 10);
            setLikesTooltip(prev => ({ ...prev, users: result.users || [], loading: false }));
        } catch (err) {
            console.error('Error fetching likes:', err);
            setLikesTooltip(prev => ({ ...prev, loading: false }));
        }
    };

    const handleShowCommentLikes = async (commentId, event) => {
        const rect = event.target.getBoundingClientRect();
        setCommentLikesTooltip({ show: true, commentId, users: [], x: rect.left, y: rect.bottom + 5, loading: true });
        try {
            const result = await api.getCommentLikes(commentId, 1, 10);
            setCommentLikesTooltip(prev => ({ ...prev, users: result.users || [], loading: false }));
        } catch (err) {
            console.error('Error fetching comment likes:', err);
            setCommentLikesTooltip(prev => ({ ...prev, loading: false }));
        }
    };

    const getTimeAgo = (dateString) => {
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
            return dateString;
        }
    };

    const handleLike = async (postId, isLiked) => {
        setLikingPostId(postId);
        try {
            const result = isLiked ? await api.unlikePost(postId) : await api.likePost(postId);

            if (result) {
                // Update local state
                setPosts(prevPosts => prevPosts.map(post => {
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
            console.error('Error toggling like:', err);
        } finally {
            setLikingPostId(null);
        }
    };

    const handleShare = (post) => {
        const url = `${window.location.origin}/post/${post.id}`;
        navigator.clipboard.writeText(url);
        alert('Post link copied to clipboard!');
    };

    const handleViewProfile = (userId) => {
        if (userId === profileData?.id) return;
        if (onViewProfile) {
            onViewProfile(userId);
        } else {
            // Fallback if prop not provided, but we should prioritize onViewProfile
            window.location.href = `/profile/${userId}`;
        }
    };

    // Tooltip wrappers
    const onShowLikes = (postId, event) => handleShowLikes(postId, event);
    const onHideLikes = () => setLikesTooltip(prev => ({ ...prev, show: false }));

    const onShowCommentLikes = (commentId, event) => handleShowCommentLikes(commentId, event);
    const onHideCommentLikes = () => setCommentLikesTooltip(prev => ({ ...prev, show: false }));

    const displayData = profileData;
    const effectiveIsOwnProfile = isOwnProfile && !viewAsVisitor;

    const calculateReadiness = () => {
        if (!profileData) return 0;
        let score = 0;
        if (profileData.avatar) score += 20;
        if (profileData.bio) score += 20;
        if (profileData.company) score += 20;
        if (profileData.location) score += 20;
        if (posts.length > 0) score += 20;
        return score;
    };

    const readiness = calculateReadiness();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-jurisma-500 mb-4" />
                <p className="text-slate-500">Loading profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={onBack} variant="outline">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Back Button */}
            <button
                onClick={onBack}
                className="flex items-center text-slate-500 hover:text-jurisma-900 transition-colors mb-4"
            >
                <ArrowLeft size={20} className="mr-2" />
                Back to Feed
            </button>

            {/* LinkedIn-Style Profile Header */}
            <Card className="p-0 overflow-hidden">
                {/* Cover Image */}
                <div className="h-32 md:h-48 bg-gradient-to-r from-jurisma-500 to-jurisma-700 relative">
                    {profileData?.cover_image && (
                        <img
                            src={profileData.cover_image}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <div className="px-4 md:px-8 pb-6">
                    <div className="relative flex flex-col md:flex-row gap-6 items-start -mt-12 md:-mt-16">
                        {/* Avatar */}
                        <div className="group relative">
                            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-jurisma-100 flex items-center justify-center text-3xl md:text-5xl font-bold text-jurisma-900 border-4 border-white shadow-xl overflow-hidden">
                                {profileData?.avatar ? (
                                    <img src={profileData.avatar} alt={profileData.name} className="w-full h-full object-cover" />
                                ) : (
                                    (profileData?.name || 'U').charAt(0)
                                )}
                            </div>
                            {effectiveIsOwnProfile && (
                                <label className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200">
                                    <Edit2 size={16} className="text-slate-600" />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) api.uploadProfilePicture(file).then(res => setProfileData(p => ({ ...p, avatar: res.url })));
                                    }} />
                                </label>
                            )}
                        </div>

                        {/* Name and Role */}
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-bold text-slate-900">{profileData?.name}</h1>
                                {profileData?.is_verified && <Badge variant="blue" className="rounded-full">Verified</Badge>}
                            </div>

                            <p className="text-lg text-slate-700 font-medium leading-tight">
                                {profileData?.credentials || profileData?.role || 'Legal Professional'}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                                {profileData?.company && (
                                    <p className="flex items-center gap-1">
                                        <Briefcase size={16} className="text-slate-400" />
                                        {profileData.position && `${profileData.position} at `}{profileData.company}
                                    </p>
                                )}
                                {profileData?.location && (
                                    <div className="flex items-center gap-1">
                                        <MapPin size={16} className="text-slate-400" />
                                        <span>{profileData.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span>Joined {new Date(profileData?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                            {isOwnProfile ? (
                                <div className="flex flex-col gap-2">
                                    {!viewAsVisitor ? (
                                        <>
                                            <Button variant="primary" className="w-full shadow-md" onClick={handleEditProfileClick}>
                                                <Edit2 size={16} className="mr-2" /> Edit Profile
                                            </Button>
                                            <Button variant="outline" className="w-full" onClick={() => setViewAsVisitor(true)}>
                                                <Eye size={16} className="mr-2" /> View as Visitor
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                            <p className="text-xs text-amber-800 mb-2 font-medium">Viewing as visitor</p>
                                            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setViewAsVisitor(false)}>
                                                Exit Preview
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant={relationship === 'none' || relationship === 'follower' ? 'primary' : 'outline'}
                                        className={`w-full group/followbtn transition-all duration-200 ${
                                            (relationship === 'connected' || relationship === 'following') 
                                                ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                                : ''
                                        }`}
                                        onClick={handleFollow}
                                        disabled={followLoading}
                                    >
                                        {followLoading ? (
                                            <Loader2 size={16} className="animate-spin mr-2" />
                                        ) : (
                                            <>
                                                <span className="flex items-center group-hover/followbtn:hidden">
                                                    {relationship === 'connected' ? (
                                                        <><UserCheck size={16} className="mr-2" /> Connected</>
                                                    ) : relationship === 'following' ? (
                                                        <><UserMinus size={16} className="mr-2" /> Following</>
                                                    ) : relationship === 'follower' ? (
                                                        <><UserPlus size={16} className="mr-2" /> Follow Back</>
                                                    ) : (
                                                        <><UserPlus size={16} className="mr-2" /> Follow</>
                                                    )}
                                                </span>
                                                <span className="hidden group-hover/followbtn:flex items-center">
                                                    {(relationship === 'connected' || relationship === 'following') ? (
                                                        <><UserMinus size={16} className="mr-2" /> Unfollow</>
                                                    ) : relationship === 'follower' ? (
                                                        <><UserPlus size={16} className="mr-2" /> Follow Back</>
                                                    ) : (
                                                        <><UserPlus size={16} className="mr-2" /> Follow</>
                                                    )}
                                                </span>
                                            </>
                                        )}
                                    </Button>
                                    <Button variant="outline" className="w-full">
                                        <MessageCircle size={16} className="mr-2" /> Message
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quora-Style Stats Bar */}
                    <div className="flex flex-wrap gap-8 mt-8 py-4 border-y border-slate-100">
                        <div className="flex flex-col cursor-pointer group" onClick={() => setActiveTab('posts')}>
                            <span className="text-lg font-bold text-slate-900 group-hover:text-jurisma-600 transition-colors">{postsCount}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold group-hover:text-jurisma-600 transition-colors">Posts</span>
                        </div>
                        <div className="flex flex-col cursor-pointer group" onClick={() => setActiveTab('followers')}>
                            <span className="text-lg font-bold text-slate-900 group-hover:text-jurisma-600 transition-colors">{followersCount}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold group-hover:text-jurisma-600 transition-colors">Followers</span>
                        </div>
                        <div className="flex flex-col cursor-pointer group" onClick={() => setActiveTab('following')}>
                            <span className="text-lg font-bold text-slate-900 group-hover:text-jurisma-600 transition-colors">{followingCount}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold group-hover:text-jurisma-600 transition-colors">Following</span>
                        </div>
                        {showConnectionsTab && (
                            <div className="flex flex-col cursor-pointer group" onClick={() => setActiveTab('connections')}>
                                <span className="text-lg font-bold text-slate-900 group-hover:text-jurisma-600 transition-colors">{connectionsCount}</span>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold group-hover:text-jurisma-600 transition-colors">Connections</span>
                            </div>
                        )}
                    </div>

                    {/* About / Bio Preview */}
                    {profileData?.bio && (
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">About</h3>
                            <p className="text-slate-700 leading-relaxed max-w-3xl">{profileData.bio}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Profile Readiness Flow (LinkedIn Style) */}
            {effectiveIsOwnProfile && profileData && readiness < 100 && (
                <Card className="p-5 border-l-4 border-l-jurisma-500 bg-jurisma-50/30">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-slate-900">Profile Readiness</h3>
                            <p className="text-sm text-slate-500">Complete your profile to increase visibility.</p>
                        </div>
                        <Badge variant="jurisma">{readiness}%</Badge>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 mb-4 border border-slate-100">
                        <div
                            className="bg-jurisma-600 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${readiness}%` }}
                        ></div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {!profileData?.avatar && (
                            <Button size="sm" variant="outline" className="whitespace-nowrap bg-white text-xs" onClick={handleEditProfileClick}>Add photo</Button>
                        )}
                        {!profileData?.bio && (
                            <Button size="sm" variant="outline" className="whitespace-nowrap bg-white text-xs" onClick={handleEditProfileClick}>Add bio</Button>
                        )}
                        {!profileData?.company && (
                            <Button size="sm" variant="outline" className="whitespace-nowrap bg-white text-xs" onClick={handleEditProfileClick}>Add experience</Button>
                        )}
                        {posts.length === 0 && (
                            <Button size="sm" variant="outline" className="whitespace-nowrap bg-white text-xs" onClick={() => setActiveTab('posts')}>Share first post</Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Quora-Style Tab Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0">
                {profileTabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.toLowerCase()
                            ? 'border-jurisma-600 text-jurisma-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Create Post Section (Own Profile Only) - Only show on Posts tab */}
            {effectiveIsOwnProfile && activeTab === 'posts' && (
                <Card className="p-0 overflow-hidden mb-6 border-slate-200">
                    <div className="p-4 flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-full bg-jurisma-100 flex items-center justify-center font-bold text-jurisma-900 flex-shrink-0 overflow-hidden border border-slate-100">
                            {currentUser?.avatar ? <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" /> : (currentUser?.name?.charAt(0) || 'U')}
                        </div>
                        <div className="flex-1">
                            <button
                                onClick={() => {
                                    setIsExpanded(true);
                                    setPostCategory('discussion');
                                }}
                                className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-slate-500 text-sm transition-colors cursor-text"
                            >
                                What do you want to ask or share?
                            </button>
                        </div>
                    </div>

                    <div className="flex border-t border-slate-100">
                        <button
                            onClick={() => {
                                setPostCategory('question');
                                setIsExpanded(true);
                            }}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 font-medium text-xs md:text-sm transition-colors border-r border-slate-100"
                        >
                            <HelpCircle size={18} className="text-slate-400" />
                            <span>Ask</span>
                        </button>
                        <button
                            onClick={() => {
                                if (onAnswer) {
                                    onAnswer();
                                } else {
                                    alert("Browse questions in the Feed to provide answers.");
                                }
                            }}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 font-medium text-xs md:text-sm transition-colors border-r border-slate-100"
                        >
                            <Edit3 size={18} className="text-slate-400" />
                            <span>Answer</span>
                        </button>
                        <button
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-600 font-medium text-xs md:text-sm transition-colors"
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

                            {/* Image Preview */}
                            {postImages.length > 0 && (
                                <div className="mt-3 flex gap-2 flex-wrap">
                                    {postImages.map((img, idx) => (
                                        <div key={idx} className="relative">
                                            <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                                            <button
                                                onClick={() => setPostImages(postImages.filter((_, i) => i !== idx))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-3">
                                <label className="flex items-center gap-2 text-jurisma-600 cursor-pointer hover:text-jurisma-700">
                                    {uploadingImage ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Image size={20} />
                                    )}
                                    <span className="text-sm">Add Photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                </label>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => {
                                        setIsExpanded(false);
                                        setNewPostContent('');
                                        setPostImages([]);
                                        setPostCategory('discussion');
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleCreatePost}
                                        disabled={creatingPost || (!newPostContent.trim() && postImages.length === 0)}
                                    >
                                        {creatingPost ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Conditional Content Rendering */}
            {activeTab === 'followers' || activeTab === 'following' || (activeTab === 'connections' && showConnectionsTab) ? (
                <div className="pt-6">
                    <ConnectionsList 
                        userId={userId} 
                        type={activeTab} 
                        onBack={() => setActiveTab('posts')}
                        onViewProfile={handleViewProfile}
                        onViewerProfileRefresh={onViewerProfileRefresh}
                        showHeader={false}
                    />
                </div>
            ) : (
                <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-jurisma-500" />
                    </div>
                ) : posts.length === 0 ? (
                    <Card className="p-12 text-center text-slate-500 border-dashed bg-slate-50/30">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <MessageCircle size={32} />
                            </div>
                            <p>No {activeTab} yet. {isOwnProfile && "Share your first legal insight!"}</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {posts.map(post => (
                            <PostItem
                                key={post.id}
                                post={post}
                                currentUser={currentUser}
                                onLike={handleLike}
                                onDelete={handleDeletePost}
                                onEdit={handleEditPost}
                                onReport={(id) => setShowReportModal(id)}
                                onShare={handleShare}
                                onBookmark={handleBookmark}
                                onViewProfile={handleViewProfile}
                                onToggleComments={handleShowComments}
                                onPostComment={handleAddComment}
                                onLikeComment={handleLikeComment}
                                onDeleteComment={handleDeleteComment}
                                comments={comments[post.id] || []}
                                expandedPostId={expandedPostId}
                                loadingComments={loadingComments}
                                submittingComment={submittingComment}
                                getTimeAgo={getTimeAgo}
                                onAnswer={onAnswer}
                                likesTooltip={likesTooltip}
                                onShowLikes={onShowLikes}
                                onHideLikes={onHideLikes}
                                commentLikesTooltip={commentLikesTooltip}
                                onShowCommentLikes={onShowCommentLikes}
                                onHideCommentLikes={onHideCommentLikes}
                            />
                        ))}
                    </div>
                )}
            </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
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
                                <label key={reason} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${reportReason === reason ? 'border-jurisma-500 bg-jurisma-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
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
                            className="w-full border border-slate-200 rounded-xl p-4 text-sm mb-6 focus:ring-2 focus:ring-jurisma-500 outline-none transition-all min-h-[100px]"
                            rows={3}
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-xl" onClick={() => setShowReportModal(null)}>Cancel</Button>
                            <Button
                                variant="primary"
                                className="flex-1 md:flex-none h-12 px-8 rounded-xl shadow-lg"
                                onClick={() => handleReportPost(showReportModal)}
                                disabled={!reportReason || isReporting}
                            >
                                {isReporting && <Loader2 className="animate-spin mr-2" size={18} />}
                                Submit Report
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Edit Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Profile</h2>
                            <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-jurisma-500 focus:ring-1 focus:ring-jurisma-500 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Credentials</label>
                                <input
                                    type="text"
                                    value={editForm.credentials}
                                    onChange={(e) => setEditForm({ ...editForm, credentials: e.target.value })}
                                    placeholder="e.g. Attorney at Law, LLM"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-jurisma-500 focus:ring-1 focus:ring-jurisma-500 transition-all outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Bio</label>
                                <Textarea
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    rows={3}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Location</label>
                                <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-jurisma-500 focus:ring-1 focus:ring-jurisma-500 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Current Company</label>
                                <input
                                    type="text"
                                    value={editForm.company}
                                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-jurisma-500 focus:ring-1 focus:ring-jurisma-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Experience Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Experience</h3>
                                <Button size="sm" variant="outline" onClick={addExperience}>
                                    <Edit3 size={14} className="mr-1" /> Add
                                </Button>
                            </div>
                            {editForm.experience.map((exp, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3 relative group">
                                    <button
                                        onClick={() => setEditForm(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== idx) }))}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="Company"
                                            value={exp.company}
                                            onChange={(e) => {
                                                const newExp = [...editForm.experience];
                                                newExp[idx].company = e.target.value;
                                                setEditForm({ ...editForm, experience: newExp });
                                            }}
                                            className="px-3 py-1.5 rounded border border-slate-200 text-sm"
                                        />
                                        <input
                                            placeholder="Role"
                                            value={exp.role}
                                            onChange={(e) => {
                                                const newExp = [...editForm.experience];
                                                newExp[idx].role = e.target.value;
                                                setEditForm({ ...editForm, experience: newExp });
                                            }}
                                            className="px-3 py-1.5 rounded border border-slate-200 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Education Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Education</h3>
                                <Button size="sm" variant="outline" onClick={addEducation}>
                                    <Edit3 size={14} className="mr-1" /> Add
                                </Button>
                            </div>
                            {editForm.education.map((edu, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3 relative group">
                                    <button
                                        onClick={() => setEditForm(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) }))}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="School"
                                            value={edu.school}
                                            onChange={(e) => {
                                                const newEdu = [...editForm.education];
                                                newEdu[idx].school = e.target.value;
                                                setEditForm({ ...editForm, education: newEdu });
                                            }}
                                            className="px-3 py-1.5 rounded border border-slate-200 text-sm"
                                        />
                                        <input
                                            placeholder="Degree"
                                            value={edu.degree}
                                            onChange={(e) => {
                                                const newEdu = [...editForm.education];
                                                newEdu[idx].degree = e.target.value;
                                                setEditForm({ ...editForm, education: newEdu });
                                            }}
                                            className="px-3 py-1.5 rounded border border-slate-200 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 justify-end pt-6 border-t border-slate-100">
                            <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
                                {savingProfile ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserProfile;


