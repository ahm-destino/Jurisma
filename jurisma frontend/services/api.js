// Base URL for the API
const BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://jurisma-backend-server.vercel.app/api'
    : 'http://localhost:5000/api';

// Get token from localStorage or context
const getAuthToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) console.warn('[API] No access_token found in localStorage');
    return token;
};

// Helper function for making API requests
export const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
        if (response.status === 422) {
            console.error('[API] 422 Error details from server:', JSON.stringify(data, null, 2));
            throw new Error(`Validation Error: ${JSON.stringify(data)}`);
        }
        throw new Error(data.message || 'An error occurred');
    }

    return data;
};

// ==================== AUTH ENDPOINTS ====================

// Register new user
export const register = async (name, email, password, role = 'student') => {
    const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
    });

    // Store tokens if registration successful
    if (data.data?.accessToken) {
        localStorage.setItem('access_token', data.data.accessToken);
        localStorage.setItem('refresh_token', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data;
};

// Login user
// Login user
export const login = async (email, password) => {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    // Store tokens
    if (data.data?.accessToken) {
        console.log('[API] Login successful, saving token:', data.data.accessToken.substring(0, 10) + '...');
        localStorage.setItem('access_token', data.data.accessToken);
        localStorage.setItem('refresh_token', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
    } else {
        console.error('[API] Login response missing accessToken:', data);
    }

    return data;
};

// Get user profile
export const getProfile = async () => {
    const data = await apiRequest('/auth/profile');
    return data.data;
};

// Logout user
export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
};

// Get stored user
export const getStoredUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

// Check if user is authenticated
export const isAuthenticated = () => {
    return !!getAuthToken();
};

// ==================== SOCIAL HUB ENDPOINTS ====================

// Get all posts (legacy - for backwards compatibility)
export const getPosts = async (page = 1, limit = 10, category = 'all') => {
    const data = await apiRequest(`/social/posts?page=${page}&limit=${limit}&category=${category}`);
    return {
        posts: data.data,
        pagination: data.pagination
    };
};

// Get feed (Quora-style with sort options)
export const getFeed = async (page = 1, limit = 10, sort = 'recent') => {
    const data = await apiRequest(`/social/feed?page=${page}&limit=${limit}&sort=${sort}`);
    return {
        posts: data.data,
        sort_by: data.sort_by,
        pagination: data.pagination
    };
};

// Get recent posts
export const getRecentPosts = async (page = 1, limit = 10) => {
    return getFeed(page, limit, 'recent');
};

// Get top stories
export const getTopStories = async (page = 1, limit = 10) => {
    return getFeed(page, limit, 'top');
};

// Create a new post
export const createPost = async (content, category = 'discussion', tags = [], images = []) => {
    const data = await apiRequest('/social/posts', {
        method: 'POST',
        body: JSON.stringify({ content, category, tags, images })
    });
    return data;
};

// Get single post
export const getPost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}`);
    return data.data;
};

// Update a post (owner only)
export const updatePost = async (postId, content, category, tags) => {
    const data = await apiRequest(`/social/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ content, category, tags })
    });
    return data;
};

// Delete a post (owner only)
export const deletePost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}`, {
        method: 'DELETE'
    });
    return data;
};

// Report a post
export const reportPost = async (postId, reason, description = '') => {
    const data = await apiRequest(`/social/posts/${postId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason, description })
    });
    return data;
};

// Upload post image
export const uploadPostImage = async (imageFile) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${BASE_URL}/social/posts/upload-image`, {
        method: 'POST',
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Image upload failed');
    }
    return data.data;
};

// Like/unlike a post (legacy - for backwards compatibility)
export const likePost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/like`, {
        method: 'POST'
    });
    return data.data || data;
};

// Upvote a post (Quora-style)
export const upvotePost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/upvote`, {
        method: 'POST'
    });
    return data.data || data;
};

// Remove upvote
export const removeUpvote = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/upvote`, {
        method: 'DELETE'
    });
    return data.data || data;
};

// Downvote a post (Quora-style)
export const downvotePost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/downvote`, {
        method: 'POST'
    });
    return data.data || data;
};

// Remove downvote
export const removeDownvote = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/downvote`, {
        method: 'DELETE'
    });
    return data.data || data;
};

// Unlike a post
export const unlikePost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/like`, {
        method: 'DELETE'
    });
    return data.data || data;
};

// Get users who liked a post
export const getPostLikes = async (postId, page = 1, limit = 20) => {
    const data = await apiRequest(`/social/posts/${postId}/likes?page=${page}&limit=${limit}`);
    return {
        users: data.data,
        pagination: data.pagination
    };
};

// Get comments for a post
export const getComments = async (postId, page = 1, limit = 20) => {
    const data = await apiRequest(`/social/posts/${postId}/comments?page=${page}&limit=${limit}`);
    // Return the comments array directly for backwards compatibility
    return data.data || [];
};

// Get a single comment by ID (for deep linking)
export const getCommentById = async (commentId) => {
    const data = await apiRequest(`/social/comments/${commentId}`);
    return data.data;
};

// Add a comment to a post
export const addComment = async (postId, content, parentCommentId = null) => {
    const data = await apiRequest(`/social/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_comment_id: parentCommentId })
    });
    return data;
};

// Like a comment
export const likeComment = async (commentId) => {
    const data = await apiRequest(`/social/comments/${commentId}/like`, {
        method: 'POST'
    });
    return data.data || data;
};

// Unlike a comment
export const unlikeComment = async (commentId) => {
    const data = await apiRequest(`/social/comments/${commentId}/like`, {
        method: 'DELETE'
    });
    return data.data || data;
};

// Get users who liked a comment
export const getCommentLikes = async (commentId, page = 1, limit = 20) => {
    const data = await apiRequest(`/social/comments/${commentId}/likes?page=${page}&limit=${limit}`);
    return {
        users: data.data,
        pagination: data.pagination
    };
};

// Update a comment
export const updateComment = async (commentId, content) => {
    const data = await apiRequest(`/social/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
    });
    return data;
};

// Delete a comment (owner or post author)
export const deleteComment = async (commentId) => {
    const data = await apiRequest(`/social/comments/${commentId}`, {
        method: 'DELETE'
    });
    return data;
};

// Bookmark a post
export const bookmarkPost = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/bookmark`, {
        method: 'POST'
    });
    return data.data || data;
};

// Remove bookmark
export const removeBookmark = async (postId) => {
    const data = await apiRequest(`/social/posts/${postId}/bookmark`, {
        method: 'DELETE'
    });
    return data.data || data;
};

// Get bookmarked posts
export const getBookmarks = async (page = 1, limit = 10) => {
    const data = await apiRequest(`/social/profile/me/bookmarks?page=${page}&limit=${limit}`);
    return {
        posts: data.data,
        pagination: data.pagination
    };
};

// Get user posts (for profile)
export const getUserPosts = async (userId, page = 1, limit = 10) => {
    const data = await apiRequest(`/social/users/${userId}/posts?page=${page}&limit=${limit}`);
    return {
        posts: data.data,
        pagination: data.pagination
    };
};

// Get user's answers
export const getUserAnswers = async (userId, page = 1, limit = 10) => {
    const data = await apiRequest(`/social/users/${userId}/answers?page=${page}&limit=${limit}`);
    return {
        answers: data.data,
        pagination: data.pagination
    };
};

// Get user's questions
export const getUserQuestions = async (userId, page = 1, limit = 10) => {
    const data = await apiRequest(`/social/users/${userId}/questions?page=${page}&limit=${limit}`);
    return {
        questions: data.data,
        pagination: data.pagination
    };
};

// ==================== USER PROFILE ENDPOINTS ====================

// Get user profile by ID
export const getUserProfile = async (userId) => {
    const data = await apiRequest(`/social/users/${userId}`);
    return data.data;
};

// Get current user profile
export const getCurrentUserProfile = async () => {
    const data = await apiRequest('/social/profile/me');
    return data.data;
};

// Update current user profile
export const updateCurrentUserProfile = async (profileData) => {
    const data = await apiRequest('/social/profile/me', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
    return data;
};

// Upload profile picture
export const uploadProfilePicture = async (imageFile) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('avatar', imageFile);

    const response = await fetch(`${BASE_URL}/social/profile/me/avatar`, {
        method: 'POST',
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
    }
    return data.data;
};

// Upload cover image
export const uploadCoverImage = async (imageFile) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('cover', imageFile);

    const response = await fetch(`${BASE_URL}/social/profile/me/cover`, {
        method: 'POST',
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
    }
    return data.data;
};

// ==================== FOLLOW ENDPOINTS ====================

// Follow a user
export const followUser = async (userId) => {
    const data = await apiRequest(`/social/users/${userId}/follow`, {
        method: 'POST'
    });
    return data.data;
};

// Unfollow a user
export const unfollowUser = async (userId) => {
    const data = await apiRequest(`/social/users/${userId}/follow`, {
        method: 'DELETE'
    });
    return data.data;
};

// Get followers
export const getFollowers = async (userId, page = 1, limit = 20) => {
    const data = await apiRequest(`/social/users/${userId}/followers?page=${page}&limit=${limit}`);
    return {
        users: data.data || [],
        pagination: data.pagination
    };
};

// Get following (one-way outgoing, not reciprocated)
export const getFollowing = async (userId, page = 1, limit = 20) => {
    const data = await apiRequest(`/social/users/${userId}/following?page=${page}&limit=${limit}`);
    return {
        users: data.data || [],
        pagination: data.pagination
    };
};

// Get suggested connections
export const getSuggestedConnections = async () => {
    const data = await apiRequest('/social/users/suggestions');
    return data.data || [];
};

// ==================== NOTIFICATION ENDPOINTS ====================

// Get notifications
export const getNotifications = async (page = 1, limit = 20, unreadOnly = false) => {
    const data = await apiRequest(`/social/notifications?page=${page}&limit=${limit}&unread_only=${unreadOnly}`);
    return {
        notifications: data.data,
        unread_count: data.unread_count,
        pagination: data.pagination
    };
};

// Mark notification as read
export const markNotificationRead = async (notificationId) => {
    const data = await apiRequest(`/social/notifications/${notificationId}/read`, {
        method: 'PUT'
    });
    return data;
};

// Mark all notifications as read
export const markAllNotificationsRead = async () => {
    const data = await apiRequest('/social/notifications/read-all', {
        method: 'PUT'
    });
    return data;
};

// ==================== SEARCH ENDPOINTS ====================

// Search users
export const searchUsers = async (query, page = 1, limit = 20) => {
    const data = await apiRequest(`/social/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return {
        users: data.data,
        pagination: data.pagination
    };
};

// Search posts
export const searchPosts = async (query, page = 1, limit = 10) => {
    const data = await apiRequest(`/social/search/posts?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return {
        posts: data.data,
        pagination: data.pagination
    };
};

// ==================== ACTIVITY ENDPOINTS ====================

// Get user activity
export const getUserActivity = async (userId, page = 1, limit = 20, type = 'all') => {
    const data = await apiRequest(`/social/users/${userId}/activity?page=${page}&limit=${limit}&type=${type}`);
    return {
        activities: data.data,
        pagination: data.pagination
    };
};

// ==================== CONSTITUTION ENDPOINTS ====================

// Get all chapters
export const getChapters = async () => {
    const data = await apiRequest('/legal/constitution/chapters');
    return data.data;
};

// Get chapter with sections
export const getChapter = async (chapterNumber) => {
    const data = await apiRequest(`/legal/constitution/chapters/${chapterNumber}`);
    return data.data;
};

// ==================== LAW REPORTS ENDPOINTS ====================

// Get all law reports
export const getLawReports = async (page = 1, limit = 10, court = 'all', search = '') => {
    const queryParams = new URLSearchParams({ page, limit, court, search });
    const data = await apiRequest(`/legal/law-reports?${queryParams.toString()}`);
    return {
        reports: data.data,
        pagination: data.pagination
    };
};

// Get single law report
export const getLawReport = async (reportId) => {
    const data = await apiRequest(`/legal/law-reports/${reportId}`);
    return data.data;
};

// ==================== LIBRARY ENDPOINTS ====================

// Get library items
export const getLibraryItems = async (category = 'all', search = '') => {
    const queryParams = new URLSearchParams({ category, search });
    const data = await apiRequest(`/legal/library?${queryParams.toString()}`);
    return data.data;
};

// ==================== DICTIONARY ENDPOINTS ====================

// Search dictionary
export const searchDictionary = async (searchTerm) => {
    const url = searchTerm
        ? `/legal/dictionary?search=${encodeURIComponent(searchTerm)}`
        : '/legal/dictionary';
    const data = await apiRequest(url);
    return data.data;
};

// Get all dictionary terms
export const getAllDictionaryTerms = async () => {
    const data = await apiRequest('/legal/dictionary');
    return data.data;
};

// ==================== CASES ENDPOINTS ====================

// Get all cases
export const getCases = async (page = 1, limit = 10, status = 'all') => {
    const data = await apiRequest(`/legal/cases?page=${page}&limit=${limit}&status=${status}`);
    return {
        cases: data.data,
        pagination: data.pagination
    };
};

// Get single case
export const getCase = async (caseId) => {
    const data = await apiRequest(`/legal/cases/${caseId}`);
    return data.data;
};

// Create new case
export const createCase = async (caseData) => {
    const data = await apiRequest('/legal/cases', {
        method: 'POST',
        body: JSON.stringify(caseData)
    });
    return data;
};

// Update case
export const updateCase = async (caseId, caseData) => {
    const data = await apiRequest(`/legal/cases/${caseId}`, {
        method: 'PUT',
        body: JSON.stringify(caseData)
    });
    return data;
};

// Delete case
export const deleteCase = async (caseId) => {
    const data = await apiRequest(`/legal/cases/${caseId}`, {
        method: 'DELETE'
    });
    return data;
};

// ==================== STUDENT HUB ENDPOINTS ====================

// Get student dashboard stats (streak, etc)
export const getStudentDashboard = async () => {
    const data = await apiRequest('/student/dashboard');
    return data.data;
};

// Deduct heart on mistake
export const deductHeart = async () => {
    const data = await apiRequest('/student/hearts/deduct', {
        method: 'POST'
    });
    return data.data;
};

// Get streak insights
export const getStreakInsights = async () => {
    const data = await apiRequest('/student/streak-insights');
    return data.data;
};


// Get all quizzes
export const getQuizzes = async (subject = '', difficulty = '') => {
    let url = '/student/quizzes';
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (difficulty) params.append('difficulty', difficulty);
    if (params.toString()) url += '?' + params.toString();
    const data = await apiRequest(url);
    return data.data;
};

// Get single quiz with questions
export const getQuiz = async (quizId) => {
    const data = await apiRequest('/student/quizzes/' + quizId);
    return data.data;
};

// Submit quiz attempt
export const submitQuizAttempt = async (quizId, answers) => {
    const data = await apiRequest('/student/quizzes/' + quizId + '/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
    });
    return data.data;
};

// Get trending materials
export const getTrendingMaterials = async (limit = 10) => {
    const data = await apiRequest(`/student/materials/trending?limit=${limit}`);
    return data.data;
};

// Get subject mastery progress (Real data from curriculum)
export const getSubjectMastery = async () => {
    const data = await apiRequest('/curriculum/progress');
    return data.data;
};

// Get leaderboard standings
export const getLeaderboard = async () => {
    const data = await apiRequest('/student/leaderboard');
    return data.data;
};

// Mark lesson as complete
export const completeLesson = async (lessonId) => {
    const data = await apiRequest(`/student/lessons/${lessonId}/complete`, {
        method: 'POST'
    });
    return data.data;
};

// ==================== DOCUMENTS ENDPOINTS ====================

// Get all documents
export const getDocuments = async (page = 1, limit = 20, folder = 'all') => {
    const data = await apiRequest(`/legal/documents?page=${page}&limit=${limit}&folder=${folder}`);
    return {
        documents: data.data,
        pagination: data.pagination
    };
};

// Get single document
export const getDocument = async (documentId) => {
    const data = await apiRequest(`/legal/documents/${documentId}`);
    return data.data;
};

// Upload document
const uploadDocument = async (formData) => {
    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/legal/documents/upload`, {
        method: 'POST',
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
    }
    return data;
};

// Delete document
export const deleteDocument = async (documentId) => {
    const data = await apiRequest(`/legal/documents/${documentId}`, {
        method: 'DELETE'
    });
    return data;
};

// Toggle document starred
export const toggleDocumentStar = async (documentId) => {
    const data = await apiRequest(`/legal/documents/${documentId}/star`, {
        method: 'POST'
    });
    return data;
};

// Get folders
export const getFolders = async () => {
    const data = await apiRequest('/legal/documents/folders');
    return data.data;
};

// Create folder
export const createFolder = async (folderName) => {
    const data = await apiRequest('/legal/documents/folders', {
        method: 'POST',
        body: JSON.stringify({ name: folderName })
    });
    return data;
};

// ==================== CURRICULUM ENDPOINTS ====================

export const getCurriculumSubjects = async (level = '') => {
    const url = level ? `/curriculum/subjects?level=${level}` : '/curriculum/subjects';
    const data = await apiRequest(url);
    return data.data;
};

export const getCurriculumSubject = async (slug) => {
    const data = await apiRequest(`/curriculum/subjects/${slug}`);
    return data.data;
};

export const getSectionSlides = async (sectionId) => {
    const data = await apiRequest(`/curriculum/sections/${sectionId}/slides`);
    return data.data;
};

export const completeSlide = async (slideId) => {
    const data = await apiRequest(`/curriculum/slides/${slideId}/complete`, { method: 'POST' });
    return data.data;
};

export const getCurriculumProgress = async () => {
    const data = await apiRequest('/curriculum/progress');
    return data.data;
};

export const getSectionQuiz = async (sectionId, count = 10) => {
    const data = await apiRequest(`/curriculum/sections/${sectionId}/quiz?count=${count}`);
    return data.data;
};

export const getTonePreference = async () => {
    const data = await apiRequest('/curriculum/preferences/tone');
    return data.data?.tone || 'academic';
};

export const updateTonePreference = async (tone) => {
    const data = await apiRequest('/curriculum/preferences/tone', {
        method: 'PUT',
        body: JSON.stringify({ tone })
    });
    return data.data;
};

export const logActivity = async (activityType, points = 10, isPerfect = false) => {
    return await apiRequest('/student/log-activity', { 
        method: 'POST',
        body: JSON.stringify({ activity_type: activityType, points, is_perfect: isPerfect })
    });
};

// ==================== GAMIFICATION API ====================

export const getGamificationProfile = async (userId = null) => {
    const url = userId ? `/gamification/profile?user_id=${userId}` : '/gamification/profile';
    const data = await apiRequest(url);
    return data.data;
};

export const toggleBadgeVisibility = async (badgeDbId, isPublic) => {
    const data = await apiRequest('/gamification/badges/visibility', {
        method: 'POST',
        body: JSON.stringify({ badge_db_id: badgeDbId, is_public: isPublic })
    });
    return data.data;
};

// ==================== EXPORT DEFAULT API OBJECT ====================

export default {
    // Auth
    register,
    login,
    logout,
    getProfile,
    getStoredUser,
    isAuthenticated,

    // Social Hub - Posts
    getPosts,
    getFeed,
    getRecentPosts,
    getTopStories,
    createPost,
    getPost,
    updatePost,
    deletePost,
    reportPost,
    uploadPostImage,
    likePost,
    unlikePost,
    upvotePost,
    removeUpvote,
    downvotePost,
    removeDownvote,
    getPostLikes,
    getComments,
    getCommentById,
    addComment,
    likeComment,
    unlikeComment,
    getCommentLikes,
    updateComment,
    deleteComment,
    bookmarkPost,
    removeBookmark,
    getBookmarks,
    getUserPosts,
    getUserAnswers,
    getUserQuestions,

    // Social Hub - User Profile
    getUserProfile,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    uploadProfilePicture,
    uploadCoverImage,

    // Social Hub - Follow
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getSuggestedConnections,

    // Social Hub - Notifications
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,

    // Social Hub - Search
    searchUsers,
    searchPosts,

    // Social Hub - Activity
    getUserActivity,

    // Constitution
    getChapters,
    getChapter,

    // Law Reports
    getLawReports,
    getLawReport,

    // Library
    getLibraryItems,

    // Student Hub
    getStudentDashboard,
    getTrendingMaterials,
    getSubjectMastery,
    getLeaderboard,
    completeLesson,
    getQuizzes,
    getQuiz,
    submitQuizAttempt,

    // Dictionary
    searchDictionary,
    getAllDictionaryTerms,

    // Cases
    getCases,
    getCase,
    createCase,
    updateCase,
    deleteCase,

    // Documents
    getDocuments,
    getDocument,
    uploadDocument,
    deleteDocument,
    toggleDocumentStar,
    getFolders,
    createFolder,

    // Curriculum (Study Mode)
    getCurriculumSubjects,
    getCurriculumSubject,
    getSectionSlides,
    completeSlide,
    getCurriculumProgress,
    getSectionQuiz,
    getTonePreference,
    updateTonePreference,
    getStreakInsights,
    deductHeart,
    logActivity,
    
    // Gamification
    getGamificationProfile,
    toggleBadgeVisibility,
    
    // Core
    apiRequest
};
