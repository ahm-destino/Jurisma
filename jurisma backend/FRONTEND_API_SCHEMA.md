# Jurisma Backend API Schema Documentation

## Base URL
```
Base URL: http://localhost:5000/api
```

## Authentication
All endpoints (except `/auth/login` and `/auth/register`) require:
- Header: `Authorization: Bearer <access_token>`

---

## 1. AUTH ENDPOINTS

### Login
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "student"
    }
  }
}
```

### Get Profile
```
GET /auth/profile
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "status": "active",
    "avatar": "https://...",
    "bio": "Law student",
    "location": "Lagos, Nigeria",
    "created_at": "2024-01-15T10:30:00Z",
    "profile": {
      "user_id": "user-uuid",
      "university": "University of Lagos",
      "level": "400",
      // ... other profile fields
    }
  }
}
```

---

## 2. SOCIAL HUB ENDPOINTS

### Get All Posts
```
GET /social/posts?page=1&limit=10&category=all
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "post-uuid",
      "content": "Just finished reading about contract law!",
      "category": "discussion",
      "tags": ["law", "contracts"],
      "author_id": "author-uuid",
      "author_name": "Jane Doe",
      "author_avatar": "https://...",
      "likes_count": 5,
      "comments_count": 2,
      "is_liked": false,
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

### Create Post
```
POST /social/posts
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "content": "My thoughts on the new legislation...",
  "category": "discussion",
  "tags": ["legislation", "analysis"],
  "attachments": [] // optional array of attachment URLs
}

Response (201):
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "post_id": "new-post-uuid"
  }
}
```

### Like/Unlike Post
```
POST /social/posts/<post_id>/like
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Post liked" // or "Post unliked"
}
```

### Get Comments
```
GET /social/posts/<post_id>/comments
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "comment-uuid",
      "post_id": "post-uuid",
      "content": "Great insight!",
      "author_id": "author-uuid",
      "author_name": "Jane Doe",
      "author_avatar": "https://...",
      "parent_comment_id": null,
      "created_at": "2024-01-20T15:00:00Z"
    }
  ]
}
```

### Add Comment
```
POST /social/posts/<post_id>/comments
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "content": "I agree with this point!",
  "parent_comment_id": null // optional, for nested replies
}

Response (201):
{
  "success": true,
  "data": {
    "comment_id": "new-comment-uuid"
  }
}
```

### Get User Posts (for profile)
```
GET /social/users/<user_id>/posts?page=1&limit=10
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "post-uuid",
      "content": "Post content here...",
      "category": "discussion",
      "author_id": "user-uuid",
      "author_name": "John Doe",
      "author_avatar": "https://...",
      "likes_count": 10,
      "comments_count": 3,
      "is_liked": false,
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

---

## 3. CONSTITUTION ENDPOINTS

### Get All Chapters
```
GET /legal/constitution/chapters
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "chapter-uuid",
      "chapter_number": 1,
      "title": "THE FEDERAL REPUBLIC OF NIGERIA",
      "content": "Chapter content...",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "chapter-uuid-2",
      "chapter_number": 2,
      "title": "THE STATE",
      "content": "Chapter content...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Chapter with Sections
```
GET /legal/constitution/chapters/<chapter_number>
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "id": "chapter-uuid",
    "chapter_number": 1,
    "title": "THE FEDERAL REPUBLIC OF NIGERIA",
    "content": "Chapter content...",
    "sections": [
      {
        "id": "section-uuid",
        "section_number": 1,
        "title": "Establishment of the Federal Republic",
        "content": "Section content...",
        "chapter_id": "chapter-uuid"
      },
      {
        "id": "section-uuid-2",
        "section_number": 2,
        "title": "Powers of the President",
        "content": "Section content...",
        "chapter_id": "chapter-uuid"
      }
    ]
  }
}
```

---

## 4. DICTIONARY ENDPOINTS

### Search Dictionary
```
GET /legal/dictionary?search=abandonment
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "term-uuid",
      "term": "Abandonment",
      "definition": "In marine insurance, when there is a constructive total loss, the insured may abandon the property to the insurer and claim as for a total loss.",
      "category": "substantive",
      "etymology": null,
      "usage_examples": [],
      "legal_references": ["(1894)"],
      "related_terms": []
    },
    {
      "id": "term-uuid-2",
      "term": "Abandonment of Action",
      "definition": "This is effected by serving before trial a notice of discontinuance under Order 26 of the High Court of Justice (Civil Procedure) Rules.",
      "category": "procedural",
      "etymology": null,
      "usage_examples": [],
      "legal_references": [],
      "related_terms": []
    }
  ]
}
```

### Get All Dictionary Terms
```
GET /legal/dictionary
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    // Array of all dictionary terms
  ]
}
```

---

## 5. LEGAL CASES AND DOCUMENTS

### Get All Cases
```
GET /legal/cases?page=1&limit=10&status=all
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "case-uuid",
      "reference": "REF-12345678",
      "title": "Case Title",
      "client_name": "Client Name",
      "case_type": "Civil",
      "court": "High Court",
      "status": "active",
      "created_at": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 10 }
}
```

### Create Case
```
POST /legal/cases
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Case Title",
  "client": "Client Name",
  "case_type": "Civil",
  "court": "High Court",
  "description": "Case description..."
}

Response (201):
{
  "success": true,
  "data": {
    "id": "case-uuid",
    "reference": "REF-...",
    ...
  }
}
```

### Get All Documents
```
GET /legal/documents?page=1&limit=20&folder=all
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "doc-uuid",
      "name": "Document Name.pdf",
      "folder": "general",
      "file_url": "https://...",
      "starred": false,
      "created_at": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20 }
}
```

### Upload Document
```
POST /legal/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request:
- file: (Binary file)
- folder: "case-files" (optional)
- name: "My Document" (optional)

Response (201):
{
  "success": true,
  "data": {
    "id": "doc-uuid",
    "url": "https://..."
  }
}
```

---

## 6. FRONTEND IMPLEMENTATION EXAMPLES

### React - Fetch Constitution Chapters
```javascript
const fetchChapters = async (token) => {
  try {
    const response = await fetch('http://localhost:5000/api/legal/constitution/chapters', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
};
```

### React - Search Dictionary
```javascript
const searchDictionary = async (token, searchTerm) => {
  try {
    const url = searchTerm 
      ? `http://localhost:5000/api/legal/dictionary?search=${searchTerm}`
      : 'http://localhost:5000/api/legal/dictionary';
      
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error searching dictionary:', error);
    return [];
  }
};
```

### React - Create Social Post
```javascript
const createPost = async (token, postData) => {
  try {
    const response = await fetch('http://localhost:5000/api/social/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: postData.content,
        category: postData.category || 'discussion',
        tags: postData.tags || [],
        attachments: postData.attachments || []
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};
```

### React - Get User Profile Posts
```javascript
const fetchUserPosts = async (token, userId, page = 1) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/social/users/${userId}/posts?page=${page}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await response.json();
    return {
      posts: data.data,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return { posts: [], pagination: {} };
  }
};
```

### React - Like/Comment on Post
```javascript
const likePost = async (token, postId) => {
  const response = await fetch(
    `http://localhost:5000/api/social/posts/${postId}/like`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return await response.json();
};

const addComment = async (token, postId, content) => {
  const response = await fetch(
    `http://localhost:5000/api/social/posts/${postId}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    }
  );
  return await response.json();
};
```

---

## ERROR RESPONSES

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
