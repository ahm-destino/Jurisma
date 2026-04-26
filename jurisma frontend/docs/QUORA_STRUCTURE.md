# Quora-Style Profile & Feed Structure

This document outlines the Quora-inspired profile and feed structure to implement while keeping your original UI design.

---

## PART 1: PROFILE PAGE STRUCTURE

### Quora-Style Profile Sections:

1. **Header/Banner Area**
   - Full-width cover image (optional)
   - Profile photo overlapping the banner

2. **Profile Info Section**
   - User name (large, bold)
   - Credentials/Bio line
   - Location (if provided)
   - Join date
   - Stats row: Answers | Questions | Posts | Followers | Following

3. **Action Buttons**
   - **Owner view**: "Edit Profile" + "Share" buttons
   - **Visitor view**: "Follow"/"Following" + "Message" buttons

4. **Content Tabs**
   - Answers (default)
   - Questions
   - Posts
   - Followers
   - Following
   - Spaces (optional)

5. **Content Display**
   - Filtered by active tab
   - Each tab shows relevant content

### Two Views:

#### A. Owner View (Your Profile)
- Can edit profile
- Can see private stats
- Has "Edit Profile" button
- Can view all tabs

#### B. Visitor View (Other Users)
- Can follow/unfollow
- Can message
- Can see public content only
- Different action buttons

---

## PART 2: FEED PAGE STRUCTURE

### Quora-Style Feed Layout:

1. **Feed Header**
   - "Recent" / "Top Stories" toggle
   - Filter dropdown

2. **Post Composer** (at top when logged in)
   - "What do you want to ask or share?" placeholder
   - Options: Ask, Answer, Post

3. **Post Cards**
   - **Author Section**:
     - User photo
     - Name + credential/bio
     - Timestamp
     - Follows button (if not following)
   - **Content**:
     - Post text
     - Optional images
   - **Actions**:
     - Upvote (with count) - main action
     - Comment (with count)
     - Share
     - More options
   - **Upvote shows**: Arrow up icon + count + "Upvote"

4. **Post Interactions**
   - Upvote: Changes color, increases count
   - Comment: Expands comment section
   - Share: Opens share options

---

## PART 3: REQUIRED API ENDPOINTS

### Profile Endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/social/profile/me` | GET | Get current user profile |
| `/social/profile/me` | PUT | Update current user profile |
| `/social/users/:userId` | GET | Get public user profile |
| `/social/users/:userId/follow` | POST | Follow user |
| `/social/users/:userId/follow` | DELETE | Unfollow user |
| `/social/users/:userId/followers` | GET | Get followers list |
| `/social/users/:userId/following` | GET | Get following list |
| `/social/users/:userId/answers` | GET | Get user's answers |
| `/social/users/:userId/questions` | GET | Get user's questions |
| `/social/profile/me/avatar` | POST | Upload profile photo |
| `/social/profile/me/cover` | POST | Upload cover photo |

### Feed Endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/social/feed` | GET | Get feed posts |
| `/social/feed/recent` | GET | Get recent posts |
| `/social/feed/top` | GET | Get top stories |
| `/social/posts` | GET | Get posts (with filters) |
| `/social/posts` | POST | Create new post |
| `/social/posts/:postId` | GET | Get single post |
| `/social/posts/:postId` | PUT | Update post |
| `/social/posts/:postId` | DELETE | Delete post |
| `/social/posts/:postId/upvote` | POST | Upvote post |
| `/social/posts/:postId/upvote` | DELETE | Remove upvote |
| `/social/posts/:postId/downvote` | POST | Downvote post |
| `/social/posts/:postId/downvote` | DELETE | Remove downvote |
| `/social/posts/:postId/comments` | GET | Get comments |
| `/social/posts/:postId/comments` | POST | Add comment |
| `/social/comments/:commentId` | PUT | Update comment |
| `/social/comments/:commentId` | DELETE | Delete comment |
| `/social/comments/:commentId/upvote` | POST | Upvote comment |
| `/social/comments/:commentId/upvote` | DELETE | Remove upvote |

### Additional Endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/social/notifications` | GET | Get notifications |
| `/social/notifications/read` | PUT | Mark as read |
| `/social/search` | GET | Search content |
| `/social/spaces` | GET | Get spaces |

---

## PART 4: DATA STRUCTURES

### Profile Response:
```json
{
  "id": "user_123",
  "name": "John Doe",
  "avatar": "url",
  "cover_image": "url",
  "bio": "Lawyer at XYZ",
  "credentials": "What you do",
  "location": "Lagos, Nigeria",
  "joined_date": "2023-01",
  "stats": {
    "answers": 45,
    "questions": 12,
    "posts": 23,
    "followers": 1250,
    "following": 340
  },
  "is_following": false,
  "is_owner": false
}
```

### Post Response (Quora-style):
```json
{
  "id": "post_123",
  "content": "Post content here...",
  "author": {
    "id": "user_123",
    "name": "John Doe",
    "avatar": "url",
    "credentials": "Lawyer at XYZ"
  },
  "upvote_count": 45,
  "comment_count": 12,
  "share_count": 3,
  "is_upvoted": false,
  "is_downvoted": false,
  "is_bookmarked": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Feed Response:
```json
{
  "posts": [...],
  "sort_by": "recent|top",
  "pagination": {...}
}
```

---

## PART 5: IMPLEMENTATION NOTES

### Profile Page:
1. Show stats in horizontal row: Answers | Questions | Posts | Followers | Following
2. Tab navigation for different content types
3. Owner sees "Edit Profile", Visitors see "Follow/Message"
4. Cover image at top, avatar overlapping

### Feed Page:
1. Sort toggle: Recent / Top Stories
2. Post composer at top
3. Posts show: Author info → Content → Actions (Upvote/Comment/Share)
4. Upvote is the primary action (like Quora)
5. Show credentials under author name

### Key Differences from Current:
1. **Upvote vs Like**: Replace Heart with Upvote arrow
2. **Credentials**: Add credential line under name
3. **Tabs**: Add tab navigation to profile
4. **Stats row**: Show Answers/Questions/Posts counts
5. **Sort options**: Add Recent/Top toggle to feed
