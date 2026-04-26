# Jurisma Social Hub API Endpoints

This document outlines all API endpoints required for the Jurisma Social Hub feature, including profile management, posts, likes, comments, follows, and image uploads.

## Base URL
```
http://localhost:5000/api
```

## Authentication Headers
All endpoints (except public endpoints marked as `Public`) require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 1. USER PROFILE ENDPOINTS

### 1.1 Get User Profile (Public)
```
GET /social/users/:userId
```
**Description:** Get a user's public profile information

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "lawyer",
    "avatar": "https://cdn.jurisma.com/avatars/user_123.jpg",
    "cover_image": "https://cdn.jurisma.com/covers/user_123.jpg",
    "bio": "Senior Associate at XYZ & Co.",
    "location": "Lagos, Nigeria",
    "phone": "+2348012345678",
    "website": "https://johndoe.com",
    "company": "XYZ & Co.",
    " position": "Senior Associate",
    "education": [
      {
        "institution": "University of Lagos",
        "degree": "LL.B",
        "year": 2015
      }
    ],
    "experience": [
      {
        "company": "ABC Law Firm",
        "position": "Associate",
        "start_date": "2018-01-01",
        "end_date": "2021-12-31",
        "description": "Corporate law practice"
      }
    ],
    "skills": ["Corporate Law", "Litigation", "Contract Law"],
    "followers_count": 1250,
    "following_count": 345,
    "posts_count": 89,
    "is_following": false,
    "is_followed_by": false,
    "created_at": "2023-01-15T10:00:00Z"
  }
}
```

### 1.2 Get Current User Profile (Authenticated)
```
GET /social/profile/me
```
**Description:** Get the authenticated user's own profile with full details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "lawyer",
    "avatar": "https://cdn.jurisma.com/avatars/user_123.jpg",
    "cover_image": "https://cdn.jurisma.com/covers/user_123.jpg",
    "bio": "Senior Associate at XYZ & Co.",
    "location": "Lagos, Nigeria",
    "phone": "+2348012345678",
    "website": "https://johndoe.com",
    "company": "XYZ & Co.",
    "position": "Senior Associate",
    "education": [...],
    "experience": [...],
    "skills": ["Corporate Law", "Litigation"],
    "followers_count": 1250,
    "following_count": 345,
    "posts_count": 89,
    "is_following": false,
    "is_followed_by": false,
    "created_at": "2023-01-15T10:00:00Z"
  }
}
```

### 1.3 Update Current User Profile (Authenticated)
```
PUT /social/profile/me
```
**Description:** Update the authenticated user's profile

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Updated bio",
  "location": "Abuja, Nigeria",
  "phone": "+2348012345678",
  "website": "https://johndoe.com",
  "company": "XYZ & Co.",
  "position": "Senior Associate",
  "education": [
    {
      "institution": "University of Lagos",
      "degree": "LL.B",
      "year": 2015
    }
  ],
  "experience": [...],
  "skills": ["Corporate Law", "Litigation", "Contract Law"]
}
```

### 1.4 Upload Profile Picture (Authenticated)
```
POST /social/profile/me/avatar
```
**Description:** Upload a new profile picture

**Content-Type:** multipart/form-data

**Request Body:**
```
- avatar: (file) Image file (max 5MB, jpg/png/webp)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "avatar_url": "https://cdn.jurisma.com/avatars/user_123_new.jpg"
  }
}
```

### 1.5 Upload Cover Image (Authenticated)
```
POST /social/profile/me/cover
```
**Description:** Upload a new cover image

**Content-Type:** multipart/form-data

**Request Body:**
```
- cover: (file) Image file (max 10MB, jpg/png/webp)
```

---

## 2. FOLLOW ENDPOINTS

### 2.1 Follow User
```
POST /social/users/:userId/follow
```
**Description:** Follow a user

**Response:**
```json
{
  "success": true,
  "data": {
    "is_following": true,
    "followers_count": 1251
  }
}
```

### 2.2 Unfollow User
```
DELETE /social/users/:userId/follow
```
**Description:** Unfollow a user

**Response:**
```json
{
  "success": true,
  "data": {
    "is_following": false,
    "followers_count": 1249
  }
}
```

### 2.3 Get Followers
```
GET /social/users/:userId/followers
```
**Description:** Get list of users following this user

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_456",
      "name": "Jane Smith",
      "avatar": "https://cdn.jurisma.com/avatars/user_456.jpg",
      "role": "lawyer",
      "company": "Law Firm ABC",
      "is_following": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "pages": 63
  }
}
```

### 2.4 Get Following
```
GET /social/users/:userId/following
```
**Description:** Get list of users this user is following

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

---

## 3. POST ENDPOINTS

### 3.1 Get Feed Posts (Public)
```
GET /social/posts
```
**Description:** Get all posts in the feed

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `category`: Filter by category (all, case-insight, legal-news, discussion, networking)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post_123",
      "content": "Post content here...",
      "author": {
        "id": "user_123",
        "name": "John Doe",
        "avatar": "https://cdn.jurisma.com/avatars/user_123.jpg",
        "role": "lawyer",
        "company": "XYZ & Co."
      },
      "images": [
        "https://cdn.jurisma.com/posts/post_123_1.jpg"
      ],
      "category": "discussion",
      "tags": ["#LegalTech", "#SupremeCourt"],
      "likes_count": 45,
      "comments_count": 12,
      "shares_count": 3,
      "is_liked": false,
      "is_bookmarked": false,
      "created_at": "2024-01-15T10:30:00Z",
      "edited_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

### 3.2 Create Post (Authenticated)
```
POST /social/posts
```
**Description:** Create a new post

**Request Body:**
```json
{
  "content": "Post content here...",
  "category": "discussion",
  "tags": ["#LegalTech", "#SupremeCourt"],
  "images": [
    "https://cdn.jurisma.com/uploads/image_abc.jpg"
  ]
}
```

**Note:** For image upload, use endpoint 3.8 first to get image URLs, then include them in the images array.

### 3.3 Get Single Post
```
GET /social/posts/:postId
```
**Description:** Get a single post with full details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "post_123",
    "content": "Post content here...",
    "author": {
      "id": "user_123",
      "name": "John Doe",
      "avatar": "https://cdn.jurisma.com/avatars/user_123.jpg",
      "role": "lawyer",
      "company": "XYZ & Co."
    },
    "images": [...],
    "category": "discussion",
    "tags": ["#LegalTech"],
    "likes_count": 45,
    "comments_count": 12,
    "shares_count": 3,
    "is_liked": false,
    "is_bookmarked": false,
    "is_edited": true,
    "created_at": "2024-01-15T10:30:00Z",
    "edited_at": "2024-01-15T11:00:00Z"
  }
}
```

### 3.4 Update Post (Authenticated - Owner Only)
```
PUT /social/posts/:postId
```
**Description:** Update own post

**Request Body:**
```json
{
  "content": "Updated content...",
  "category": "case-insight",
  "tags": ["#UpdatedTag"]
}
```

### 3.5 Delete Post (Authenticated - Owner Only)
```
DELETE /social/posts/:postId
```
**Description:** Delete own post

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

### 3.6 Report Post (Authenticated)
```
POST /social/posts/:postId/report
```
**Description:** Report a post for violation

**Request Body:**
```json
{
  "reason": "spam",
  "description": "This post contains misleading information"
}
```

**Reason options:** spam, harassment, misinformation, inappropriate_content, other

### 3.7 Get User Posts
```
GET /social/users/:userId/posts
```
**Description:** Get all posts by a specific user

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### 3.8 Upload Post Image (Authenticated)
```
POST /social/posts/upload-image
```
**Description:** Upload image for post

**Content-Type:** multipart/form-data

**Request Body:**
```
- image: (file) Image file (max 10MB, jpg/png/webp)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.jurisma.com/uploads/post_images/abc123.jpg",
    "thumbnail_url": "https://cdn.jurisma.com/uploads/post_images/abc123_thumb.jpg"
  }
}
```

---

## 4. LIKE ENDPOINTS

### 4.1 Like Post
```
POST /social/posts/:postId/like
```
**Description:** Like a post

**Response:**
```json
{
  "success": true,
  "data": {
    "is_liked": true,
    "likes_count": 46
  }
}
```

### 4.2 Unlike Post
```
DELETE /social/posts/:postId/like
```
**Description:** Remove like from a post

**Response:**
```json
{
  "success": true,
  "data": {
    "is_liked": false,
    "likes_count": 44
  }
}
```

### 4.3 Get Users Who Liked Post
```
GET /social/posts/:postId/likes
```
**Description:** Get list of users who liked a post (for hover tooltip)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_456",
      "name": "Jane Smith",
      "avatar": "https://cdn.jurisma.com/avatars/user_456.jpg",
      "role": "lawyer",
      "liked_at": "2024-01-15T10:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 46,
    "pages": 3
  }
}
```

---

## 5. COMMENT ENDPOINTS

### 5.1 Get Comments
```
GET /social/posts/:postId/comments
```
**Description:** Get all comments for a post

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "comment_123",
      "content": "Great insight!",
      "author": {
        "id": "user_456",
        "name": "Jane Smith",
        "avatar": "https://cdn.jurisma.com/avatars/user_456.jpg"
      },
      "replies_count": 3,
      "likes_count": 5,
      "is_liked": false,
      "created_at": "2024-01-15T11:00:00Z",
      "edited_at": null,
      "replies": [
        {
          "id": "reply_123",
          "content": "Thank you!",
          "author": {...},
          "likes_count": 2,
          "is_liked": false,
          "created_at": "2024-01-15T11:05:00Z"
        }
      ]
    }
  ],
  "pagination": {...}
}
```

### 5.2 Add Comment
```
POST /social/posts/:postId/comments
```
**Description:** Add a comment to a post

**Request Body:**
```json
{
  "content": "Great insight!",
  "parent_comment_id": null  // null for top-level comment, provide ID for reply
}
```

### 5.3 Like Comment
```
POST /social/comments/:commentId/like
```
**Description:** Like a comment

**Response:**
```json
{
  "success": true,
  "data": {
    "is_liked": true,
    "likes_count": 6
  }
}
```

### 5.4 Unlike Comment
```
DELETE /social/comments/:commentId/like
```
**Description:** Remove like from comment

### 5.5 Get Users Who Liked Comment
```
GET /social/comments/:commentId/likes
```
**Description:** Get list of users who liked a comment (for hover tooltip)

### 5.6 Update Comment (Owner Only)
```
PUT /social/comments/:commentId
```
**Description:** Update own comment

**Request Body:**
```json
{
  "content": "Updated comment content..."
}
```

### 5.7 Delete Comment
```
DELETE /social/comments/:commentId
```
**Description:** Delete a comment. Can be done by:
- Post author
- Comment author

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

## 6. BOOKMARK ENDPOINTS

### 6.1 Bookmark Post
```
POST /social/posts/:postId/bookmark
```
**Description:** Bookmark a post

**Response:**
```json
{
  "success": true,
  "data": {
    "is_bookmarked": true
  }
}
```

### 6.2 Remove Bookmark
```
DELETE /social/posts/:postId/bookmark
```
**Description:** Remove bookmark from post

### 6.3 Get Bookmarked Posts
```
GET /social/profile/me/bookmarks
```
**Description:** Get all posts bookmarked by current user

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

---

## 7. NOTIFICATION ENDPOINTS

### 7.1 Get Notifications
```
GET /social/notifications
```
**Description:** Get user's notifications

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `unread_only`: Boolean (default: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "like",
      "message": "Jane Smith liked your post",
      "from_user": {
        "id": "user_456",
        "name": "Jane Smith",
        "avatar": "https://cdn.jurisma.com/avatars/user_456.jpg"
      },
      "post_id": "post_123",
      "is_read": false,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ],
  "unread_count": 5,
  "pagination": {...}
}
```

**Notification types:**
- like: Someone liked your post/comment
- comment: Someone commented on your post
- reply: Someone replied to your comment
- follow: Someone started following you
- mention: Someone mentioned you in a post/comment

### 7.2 Mark Notification as Read
```
PUT /social/notifications/:notificationId/read
```
**Description:** Mark a single notification as read

### 7.3 Mark All Notifications as Read
```
PUT /social/notifications/read-all
```
**Description:** Mark all notifications as read

---

## 8. SEARCH ENDPOINTS

### 8.1 Search Users
```
GET /social/search/users
```
**Description:** Search for users

**Query Parameters:**
- `q`: Search query
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "name": "John Doe",
      "avatar": "https://cdn.jurisma.com/avatars/user_123.jpg",
      "role": "lawyer",
      "company": "XYZ & Co.",
      "is_following": false
    }
  ],
  "pagination": {...}
}
```

### 8.2 Search Posts
```
GET /social/search/posts
```
**Description:** Search for posts

**Query Parameters:**
- `q`: Search query
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

---

## 9. ACTIVITY/ENGAGEMENT ENDPOINTS

### 9.1 Get User Activity
```
GET /social/users/:userId/activity
```
**Description:** Get user's recent activity (likes, comments, posts)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by type (all, posts, comments, likes)

---

## 10. ERROR RESPONSES

All endpoints may return these error responses:

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Invalid request parameters"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "An internal server error occurred"
}
```

---

## SUMMARY: REQUIRED ENDPOINTS FOR SOCIAL HUB

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/social/users/:userId` | GET | Get user profile |
| 2 | `/social/profile/me` | GET | Get current user profile |
| 3 | `/social/profile/me` | PUT | Update current user profile |
| 4 | `/social/profile/me/avatar` | POST | Upload profile picture |
| 5 | `/social/profile/me/cover` | POST | Upload cover image |
| 6 | `/social/users/:userId/follow` | POST | Follow user |
| 7 | `/social/users/:userId/follow` | DELETE | Unfollow user |
| 8 | `/social/users/:userId/followers` | GET | Get followers list |
| 9 | `/social/users/:userId/following` | GET | Get following list |
| 10 | `/social/posts` | GET | Get feed posts |
| 11 | `/social/posts` | POST | Create new post |
| 12 | `/social/posts/:postId` | GET | Get single post |
| 13 | `/social/posts/:postId` | PUT | Update post (owner) |
| 14 | `/social/posts/:postId` | DELETE | Delete post (owner) |
| 15 | `/social/posts/:postId/report` | POST | Report post |
| 16 | `/social/users/:userId/posts` | GET | Get user posts |
| 17 | `/social/posts/upload-image` | POST | Upload post image |
| 18 | `/social/posts/:postId/like` | POST | Like post |
| 19 | `/social/posts/:postId/like` | DELETE | Unlike post |
| 20 | `/social/posts/:postId/likes` | GET | Get users who liked post |
| 21 | `/social/posts/:postId/comments` | GET | Get post comments |
| 22 | `/social/posts/:postId/comments` | POST | Add comment |
| 23 | `/social/comments/:commentId/like` | POST | Like comment |
| 24 | `/social/comments/:commentId/like` | DELETE | Unlike comment |
| 25 | `/social/comments/:commentId/likes` | GET | Get users who liked comment |
| 26 | `/social/comments/:commentId` | PUT | Update comment |
| 27 | `/social/comments/:commentId` | DELETE | Delete comment |
| 28 | `/social/posts/:postId/bookmark` | POST | Bookmark post |
| 29 | `/social/posts/:postId/bookmark` | DELETE | Remove bookmark |
| 30 | `/social/profile/me/bookmarks` | GET | Get bookmarked posts |
| 31 | `/social/notifications` | GET | Get notifications |
| 32 | `/social/notifications/:id/read` | PUT | Mark notification read |
| 33 | `/social/notifications/read-all` | PUT | Mark all as read |
| 34 | `/social/search/users` | GET | Search users |
| 35 | `/social/search/posts` | GET | Search posts |
| 36 | `/social/users/:userId/activity` | GET | Get user activity |
