# Jurisma: Comprehensive Production API Specification v1.1

This document specifies the professional-grade API requirements for the Jurisma platform. It covers Social Hub, Legal Knowledge Base, Case Management, and Student Hub.

## 1. Authentication
All endpoints (except where noted) require a Bearer token in the `Authorization` header.
`Authorization: Bearer <access_token>`

## 2. Social Hub (Feed & Posts)

### 2.1 Get Feed Posts
`GET /social/posts`
- **Query Params:** `page`, `limit`, `category` (e.g., 'case-insight', 'legal-news', 'discussion', 'networking')

### 2.2 Get Personalized Feed
`GET /social/feed`
- **Query Params:** `page`, `limit`, `sort` ('recent' or 'top')

### 2.3 Create Post
`POST /social/posts`
- **Request Body:** `{ "content": "...", "category": "...", "tags": [], "images": [] }`

### 2.4 User Interactivity
- `POST /social/posts/:postId/like` - Toggle like.
- `POST /social/posts/:postId/upvote` - Quora-style upvote.
- `POST /social/posts/:postId/bookmark` - Save post.

## 3. Comments & Nested Replies

### 3.1 Get Comments
`GET /social/posts/:postId/comments`
- Returns a flat list or tree. Frontend uses `buildCommentTree`.

### 3.2 Add Comment / Reply
`POST /social/posts/:postId/comments`
- **Request Body:** `{ "content": "...", "parent_comment_id": "optional_id" }`

## 4. Legal Knowledge Base

### 4.1 Constitution
- `GET /legal/constitution/chapters` - List all chapters.
- `GET /legal/constitution/chapters/:chapterNumber` - Get chapter sections and content.

### 4.2 Legal Dictionary
- `GET /legal/dictionary` - List all legal terms.
- `GET /legal/dictionary?search=term` - Search for specific terms.

### 4.3 Law Reports
- `GET /legal/law-reports` - List reports with filters.
- `GET /legal/law-reports/:reportId` - Get full report content.

## 5. Case & Document Management

### 5.1 Cases
- `GET /legal/cases` - List user cases.
- `POST /legal/cases` - Create case.
- `PUT /legal/cases/:caseId` - Update case.

### 5.2 Documents
- `GET /legal/documents` - List documents.
- `POST /legal/documents/upload` - Upload file (multipart/form-data).
- `DELETE /legal/documents/:documentId` - Remove document.

## 6. Student Hub

### 6.1 Dashboard
- `GET /student/dashboard` - Get streak, goals, and overview.

### 6.2 Learning Progress
- `GET /student/mastery` - Get subject mastery levels.
- `POST /student/lessons/:id/complete` - Mark lesson as finished.

## 7. Profiles & Social
- `GET /social/users/:userId` - Public profile.
- `GET /social/profile/me` - Current user private profile.
- `POST /social/users/:userId/follow` - Follow/Unfollow user.

## 8. Notifications
- `GET /social/notifications` - Get user alerts.
- `PUT /social/notifications/:id/read` - Mark as read.

## 9. Error Handling
Consistent error structure for all response codes:
```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "SPECIFIC_ERROR_CODE"
}
```
