# Jurisma Social Hub API Documentation (Frontend-Aligned)

Generated: 2026-02-23  
Frontend sources scanned: `pages/SocialHub.jsx`, `components/social/PostItem.jsx`, `components/social/CommentItem.jsx`, `components/social/UserProfile.jsx`, `services/api.js`

This document is backend-ready. It defines the routes, methods, request formats, response formats, and model shapes the current frontend expects.

## 1) Base Conventions

### Base URL
- `http://localhost:5000/api`

### Auth
- Protected routes require:
  - `Authorization: Bearer <access_token>`

### Content types
- JSON routes:
  - `Content-Type: application/json`
- File upload routes:
  - `multipart/form-data`

### Standard success envelope (recommended)
```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "total_pages": 6,
    "has_next": true,
    "has_prev": false
  }
}
```

### Standard error envelope (recommended)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "content", "message": "Content is required" }
  ]
}
```

### Common status codes
- `200` OK
- `201` Created
- `204` No Content
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `422` Validation Error
- `500` Server Error

## 2) Data Models (Expected Format)

### UserSummary
```json
{
  "id": "usr_123",
  "name": "Ada N.",
  "avatar": "https://cdn.example.com/avatar.jpg",
  "role": "lawyer",
  "headline": "Legal Professional"
}
```

### Post
```json
{
  "id": "post_123",
  "author_id": "usr_123",
  "author_name": "Ada N.",
  "author_avatar": "https://cdn.example.com/avatar.jpg",
  "author_role": "Lawyer",
  "content": "Post content...",
  "category": "discussion",
  "tags": ["contract", "litigation"],
  "images": ["https://cdn.example.com/post1.jpg"],
  "likes_count": 12,
  "comments_count": 4,
  "is_liked": false,
  "is_bookmarked": false,
  "is_edited": false,
  "created_at": "2026-02-23T11:10:00.000Z",
  "updated_at": "2026-02-23T11:10:00.000Z"
}
```

### Comment (flat shape expected from backend)
Frontend builds nested replies using `parent_comment_id`.
```json
{
  "id": "cmt_123",
  "post_id": "post_123",
  "parent_comment_id": null,
  "author_id": "usr_222",
  "author_name": "Musa K.",
  "author_avatar": "https://cdn.example.com/u2.jpg",
  "content": "My comment",
  "likes_count": 2,
  "is_liked": false,
  "created_at": "2026-02-23T11:20:00.000Z",
  "updated_at": "2026-02-23T11:20:00.000Z"
}
```

### Profile
```json
{
  "id": "usr_123",
  "name": "Ada N.",
  "email": "ada@example.com",
  "role": "lawyer",
  "credentials": "Attorney at Law",
  "avatar": "https://cdn.example.com/avatar.jpg",
  "cover_image": "https://cdn.example.com/cover.jpg",
  "bio": "Commercial and tech law.",
  "location": "Abuja, NG",
  "company": "Lex Partners",
  "position": "Associate",
  "experience": [
    { "company": "Lex Partners", "role": "Associate", "period": "2022-present" }
  ],
  "education": [
    { "school": "University of Lagos", "degree": "LLB", "year": "2020" }
  ],
  "followers_count": 80,
  "following_count": 42,
  "posts_count": 33,
  "is_following": false,
  "is_verified": false,
  "created_at": "2025-12-01T08:00:00.000Z"
}
```

### Notification
```json
{
  "id": "ntf_1",
  "type": "comment",
  "message": "Musa commented on your post",
  "is_read": false,
  "actor": { "id": "usr_222", "name": "Musa K.", "avatar": "" },
  "post_id": "post_123",
  "comment_id": "cmt_123",
  "created_at": "2026-02-23T10:00:00.000Z"
}
```

### ActivityItem
```json
{
  "id": "act_1",
  "type": "like",
  "actor": { "id": "usr_222", "name": "Musa K.", "avatar": "" },
  "post_id": "post_123",
  "comment_id": null,
  "created_at": "2026-02-23T10:00:00.000Z"
}
```

## 3) Endpoint Catalog (Method + Format)

## 3.1 Feed and Posts

### GET `/social/feed`
- Auth: Optional (if authed, can personalize)
- Query:
  - `page` number
  - `limit` number
  - `sort` enum: `recent | top`
- Response:
```json
{
  "success": true,
  "sort_by": "recent",
  "data": [Post],
  "pagination": Pagination
}
```

### GET `/social/posts`
- Auth: Optional
- Query:
  - `page`, `limit`
  - `category` enum used by frontend: `all | case-insight | legal-news | discussion`
- Response:
```json
{
  "success": true,
  "data": [Post],
  "pagination": Pagination
}
```

### GET `/social/posts/:postId`
- Auth: Optional
- Response:
```json
{
  "success": true,
  "data": Post
}
```

### POST `/social/posts`
- Auth: Required
- Body:
```json
{
  "content": "Post content",
  "category": "discussion",
  "tags": ["tag1", "tag2"],
  "images": ["https://cdn.example.com/image.jpg"]
}
```
- Response:
```json
{
  "success": true,
  "message": "Post created",
  "data": Post
}
```

### PUT `/social/posts/:postId`
- Auth: Required (owner)
- Body (accept partial safely because frontend can send only content):
```json
{
  "content": "Updated content",
  "category": "discussion",
  "tags": ["updated"]
}
```
- Response:
```json
{
  "success": true,
  "message": "Post updated",
  "data": Post
}
```

### PATCH `/social/posts/:postId` (recommended alias)
- Same behavior as PUT for partial updates.

### DELETE `/social/posts/:postId`
- Auth: Required (owner or privileged role)
- Response:
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

### POST `/social/posts/:postId/report`
- Auth: Required
- Body:
```json
{
  "reason": "spam",
  "description": "Optional details"
}
```
- `reason` enum used by frontend:
  - `spam`
  - `harassment`
  - `misinformation`
  - `inappropriate_content`
  - `other`
- Response:
```json
{
  "success": true,
  "message": "Report submitted"
}
```

### POST `/social/posts/upload-image`
- Auth: Required
- Content-Type: `multipart/form-data`
- Form field:
  - `image` file
- Response:
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/uploads/post_abc.jpg",
    "thumbnail_url": "https://cdn.example.com/uploads/post_abc_thumb.jpg"
  }
}
```

### POST `/social/posts/:postId/like`
- Auth: Required
- Response (frontend expects these keys):
```json
{
  "success": true,
  "data": {
    "is_liked": true,
    "likes_count": 13
  }
}
```

### DELETE `/social/posts/:postId/like`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_liked": false,
    "likes_count": 12
  }
}
```

### GET `/social/posts/:postId/likes`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [UserSummary],
  "pagination": Pagination
}
```

### POST `/social/posts/:postId/bookmark`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_bookmarked": true
  }
}
```

### DELETE `/social/posts/:postId/bookmark`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_bookmarked": false
  }
}
```

### GET `/social/profile/me/bookmarks`
- Auth: Required
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [Post],
  "pagination": Pagination
}
```

### Quora-style voting endpoints (present in API client)
- POST `/social/posts/:postId/upvote`
- DELETE `/social/posts/:postId/upvote`
- POST `/social/posts/:postId/downvote`
- DELETE `/social/posts/:postId/downvote`

Response format should mirror like endpoints:
```json
{
  "success": true,
  "data": {
    "upvotes_count": 10,
    "downvotes_count": 1,
    "user_vote": "upvote"
  }
}
```

## 3.2 Comments and Replies

### GET `/social/posts/:postId/comments`
- Auth: Optional
- Query: `page`, `limit`
- Important frontend requirement:
  - Return a flat list with `parent_comment_id`; frontend builds tree.
- Response:
```json
{
  "success": true,
  "data": [Comment],
  "pagination": Pagination
}
```

### POST `/social/posts/:postId/comments`
- Auth: Required
- Body:
```json
{
  "content": "Reply content",
  "parent_comment_id": "cmt_parent_1"
}
```
- For top-level comment:
  - `parent_comment_id: null`
- Response:
```json
{
  "success": true,
  "message": "Comment created",
  "data": Comment
}
```

### PUT `/social/comments/:commentId`
- Auth: Required (owner)
- Body:
```json
{
  "content": "Edited comment"
}
```
- Response:
```json
{
  "success": true,
  "message": "Comment updated",
  "data": Comment
}
```

### PATCH `/social/comments/:commentId` (recommended alias)
- Same behavior as PUT for partial updates.

### DELETE `/social/comments/:commentId`
- Auth: Required
- Allowed by frontend logic for:
  - comment owner
  - post owner
- Response:
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

### POST `/social/comments/:commentId/like`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_liked": true,
    "likes_count": 5
  }
}
```

### DELETE `/social/comments/:commentId/like`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_liked": false,
    "likes_count": 4
  }
}
```

### GET `/social/comments/:commentId/likes`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [UserSummary],
  "pagination": Pagination
}
```

## 3.3 Profiles and Connections

### GET `/social/users/:userId`
- Auth: Optional
- Response:
```json
{
  "success": true,
  "data": Profile
}
```

### GET `/social/profile/me`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": Profile
}
```

### PUT `/social/profile/me`
- Auth: Required
- Body:
```json
{
  "name": "Ada N.",
  "bio": "Commercial lawyer",
  "location": "Abuja, NG",
  "company": "Lex Partners",
  "position": "Associate",
  "credentials": "Attorney at Law",
  "experience": [
    { "company": "Lex Partners", "role": "Associate", "period": "2022-present" }
  ],
  "education": [
    { "school": "UNILAG", "degree": "LLB", "year": "2020" }
  ]
}
```
- Response:
```json
{
  "success": true,
  "message": "Profile updated",
  "data": Profile
}
```

### PATCH `/social/profile/me` (recommended alias)
- Same behavior as PUT for partial updates.

### POST `/social/profile/me/avatar`
- Auth: Required
- Content-Type: `multipart/form-data`
- Form field:
  - `avatar` file
- Response:
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/avatar_new.jpg"
  }
}
```

### POST `/social/profile/me/cover`
- Auth: Required
- Content-Type: `multipart/form-data`
- Form field:
  - `cover` file
- Response:
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/cover_new.jpg"
  }
}
```

### POST `/social/users/:userId/follow`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_following": true,
    "followers_count": 81
  }
}
```

### DELETE `/social/users/:userId/follow`
- Auth: Required
- Response:
```json
{
  "success": true,
  "data": {
    "is_following": false,
    "followers_count": 80
  }
}
```

### GET `/social/users/:userId/followers`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [UserSummary],
  "pagination": Pagination
}
```

### GET `/social/users/:userId/following`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [UserSummary],
  "pagination": Pagination
}
```

### GET `/social/users/suggestions` (required by current UI)
- Auth: Required
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [UserSummary],
  "pagination": Pagination
}
```

Note: Current frontend calls `api.getSuggestedConnections()` but method is missing in `services/api.js`. Add both backend route and frontend API client function.

## 3.4 Profile Content Tabs

### GET `/social/users/:userId/posts`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [Post],
  "pagination": Pagination
}
```

### GET `/social/users/:userId/answers`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [Post],
  "pagination": Pagination
}
```

### GET `/social/users/:userId/questions`
- Auth: Optional
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [Post],
  "pagination": Pagination
}
```

### GET `/social/users/:userId/activity`
- Auth: Optional
- Query:
  - `page`, `limit`
  - `type` enum: `all | posts | comments | likes`
- Response:
```json
{
  "success": true,
  "data": [ActivityItem],
  "pagination": Pagination
}
```

## 3.5 Notifications

### GET `/social/notifications`
- Auth: Required
- Query:
  - `page`, `limit`
  - `unread_only` boolean
- Response:
```json
{
  "success": true,
  "unread_count": 4,
  "data": [Notification],
  "pagination": Pagination
}
```

### PUT `/social/notifications/:notificationId/read`
- Auth: Required
- Response:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### PUT `/social/notifications/read-all`
- Auth: Required
- Response:
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

## 3.6 Search

### GET `/social/search/users`
- Auth: Optional
- Query:
  - `q` string
  - `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [UserSummary],
  "pagination": Pagination
}
```

### GET `/social/search/posts`
- Auth: Optional
- Query:
  - `q` string
  - `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [Post],
  "pagination": Pagination
}
```

## 3.7 Optional Messaging (UI button exists)

If you want the "Message" button in profile to work, add:

### POST `/social/messages/conversations`
- Body:
```json
{
  "participant_id": "usr_222"
}
```

### GET `/social/messages/conversations`
- Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "conv_1",
      "participants": [UserSummary],
      "last_message": "Hello",
      "updated_at": "2026-02-23T12:00:00.000Z"
    }
  ]
}
```

### GET `/social/messages/conversations/:conversationId/messages`
- Query: `page`, `limit`
- Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_1",
      "conversation_id": "conv_1",
      "sender_id": "usr_123",
      "content": "Hi",
      "created_at": "2026-02-23T12:01:00.000Z"
    }
  ],
  "pagination": Pagination
}
```

### POST `/social/messages/conversations/:conversationId/messages`
- Body:
```json
{
  "content": "Hello there"
}
```

## 4) UI-to-Endpoint Mapping (Current Clicks)

| UI Action | Endpoint(s) |
|---|---|
| Feed initial load | `GET /social/feed` |
| Feed category filter | `GET /social/posts` |
| Retry feed load | `GET /social/feed` or `GET /social/posts` |
| Create post | `POST /social/posts` |
| Upload post image | `POST /social/posts/upload-image` |
| Edit post | `PUT /social/posts/:postId` |
| Delete post | `DELETE /social/posts/:postId` |
| Report post | `POST /social/posts/:postId/report` |
| Like/unlike post | `POST/DELETE /social/posts/:postId/like` |
| Post likes tooltip | `GET /social/posts/:postId/likes` |
| Bookmark/unbookmark | `POST/DELETE /social/posts/:postId/bookmark` |
| Expand comments | `GET /social/posts/:postId/comments` |
| Add comment/reply | `POST /social/posts/:postId/comments` |
| Like/unlike comment | `POST/DELETE /social/comments/:commentId/like` |
| Delete comment | `DELETE /social/comments/:commentId` |
| Comment likes tooltip | `GET /social/comments/:commentId/likes` |
| Open user profile | `GET /social/users/:userId` |
| Profile posts tab | `GET /social/users/:userId/posts` |
| Follow/unfollow | `POST/DELETE /social/users/:userId/follow` |
| Edit profile | `PUT /social/profile/me` |
| Upload avatar | `POST /social/profile/me/avatar` |
| Suggested connections panel | `GET /social/users/suggestions` |

## 5) Backend Validation Rules (Recommended)

- Post content:
  - min length: 1 (unless image present)
  - max length: 5000
- Comment content:
  - min length: 1
  - max length: 2000
- Tags:
  - max 10 tags
  - each tag max 40 chars
- Uploads:
  - image mime: `image/jpeg`, `image/png`, `image/webp`
  - max size: 10MB
- Pagination:
  - `limit` default 20
  - `limit` max 100

## 6) Implementation Gaps You Should Close First

1. Add `GET /social/users/suggestions` and return `UserSummary[]`.
2. Add frontend API function `getSuggestedConnections()` in `services/api.js`.
3. Ensure `PUT /social/posts/:postId` accepts partial body because frontend may send only `content`.
4. Ensure comments endpoint returns flat list with `parent_comment_id`.
5. Add cover upload wiring in UI if `POST /social/profile/me/cover` is already built.

