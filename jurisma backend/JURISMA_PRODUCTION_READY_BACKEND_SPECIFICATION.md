# Jurisma - Complete Production-Ready Backend Specification

**Base URL:** `http://localhost:5000/api`

## Table of Contents
1. [Authentication & User Management](#1-authentication--user-management)
2. [Social Hub](#2-social-hub)
3. [Student Hub](#3-student-hub)
4. [Legal Resources](#4-legal-resources)
5. [Counsel Connect](#5-counsel-connect)
6. [Workspace Management](#6-workspace-management)
7. [AI Services](#7-ai-services)
8. [Database Schema](#8-database-schema)
9. [SQL Implementation](#9-sql-implementation)

---

## 1. Authentication & User Management

### Endpoints

#### User Registration & Authentication
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "guest" | "student" | "lawyer",
  "phone": "+234xxxxxxxxxx",
  "institution": "University of Lagos" (if student),
  "callToBarYear": 2020 (if lawyer),
  "practiceAreas": ["Corporate Law", "Litigation"] (if lawyer),
  "location": "Lagos"
}

Response 201:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "guest",
      "createdAt": "2024-02-12T08:33:33Z"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

```http
POST /auth/logout
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### User Profile Management
```http
GET /users/profile
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "avatar": "url_to_avatar",
    "institution": "University of Lagos",
    "level": "300L",
    "createdAt": "2024-02-12T08:33:33Z",
    "updatedAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
PATCH /users/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatar": "url_to_new_avatar",
  "institution": "University of Ibadan"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    ...
  }
}
```

```http
POST /users/role-upgrade
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "targetRole": "student" | "lawyer",
  "verificationDocument": "url_to_document",
  "institution": "University of Lagos" (if student),
  "matricNumber": "180807002" (if student),
  "callToBarCertificate": "url" (if lawyer),
  "practiceAreas": ["Corporate Law"]
}

Response 200:
{
  "success": true,
  "message": "Upgrade request submitted successfully",
  "data": {
    "requestId": "uuid",
    "status": "pending"
  }
}
```

---

## 2. Social Hub

### Posts Management

```http
GET /social/posts
Authorization: Bearer {accessToken}
Query params: ?page=1&limit=20&filter=all|case-insights|legal-news|networking

Response 200:
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "author": {
          "id": "uuid",
          "name": "Ngozi Adeleke",
          "role": "lawyer",
          "avatar": "url",
          "firm": "Aluko & Oyebode",
          "jobTitle": "Senior Associate"
        },
        "content": "Interesting development in the Supreme Court...",
        "category": "case-insights",
        "likes": 45,
        "comments": 12,
        "shares": 5,
        "hasLiked": true,
        "hasBookmarked": false,
        "createdAt": "2024-02-12T06:33:33Z",
        "updatedAt": "2024-02-12T06:33:33Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

```http
POST /social/posts
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "Sharing insights on the new Finance Act...",
  "category": "legal-news",
  "tags": ["finance", "tax"],
  "attachments": ["url1", "url2"]
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "author": {...},
    "content": "...",
    "category": "legal-news",
    "likes": 0,
    "comments": 0,
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
DELETE /social/posts/:postId
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Post deleted successfully"
}
```

### Likes & Reactions

```http
POST /social/posts/:postId/like
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 46
  }
}
```

```http
DELETE /social/posts/:postId/like
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "liked": false,
    "likesCount": 45
  }
}
```

### Comments

```http
GET /social/posts/:postId/comments
Query params: ?page=1&limit=10

Response 200:
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "uuid",
        "author": {
          "id": "uuid",
          "name": "John Doe",
          "avatar": "url"
        },
        "content": "Great insight!",
        "likes": 5,
        "createdAt": "2024-02-12T07:00:00Z",
        "updatedAt": "2024-02-12T07:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
POST /social/posts/:postId/comments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "Excellent analysis of the case."
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "author": {...},
    "content": "Excellent analysis of the case.",
    "likes": 0,
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
DELETE /social/posts/:postId/comments/:commentId
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

### Sharing & Bookmarks

```http
POST /social/posts/:postId/share
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "sharesCount": 6,
    "shareUrl": "https://jurisma.com/posts/uuid"
  }
}
```

```http
POST /social/posts/:postId/bookmark
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "bookmarked": true
  }
}
```

```http
GET /social/bookmarks
Authorization: Bearer {accessToken}
Query params: ?page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "posts": [...],
    "pagination": {...}
  }
}
```

### Trending Topics

```http
GET /social/trending
Query params: ?limit=10

Response 200:
{
  "success": true,
  "data": {
    "trends": [
      {
        "id": "uuid",
        "tag": "#LegalTech",
        "postsCount": 1200,
        "growth": "+15%"
      }
    ]
  }
}
```

### User Profile on Social Hub

```http
GET /social/users/:userId
Query params: ?include=posts,stats

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Ngozi Adeleke",
      "role": "lawyer",
      "bio": "Senior Associate at Aluko & Oyebode",
      "avatar": "url",
      "firm": "Aluko & Oyebode",
      "location": "Lagos"
    },
    "stats": {
      "posts": 45,
      "followers": 1250,
      "following": 320
    },
    "posts": [...]
  }
}
```

---

## 3. Student Hub

### Lecture Notes

```http
GET /student/notes
Authorization: Bearer {accessToken}
Query params: ?subject=Contract Law&level=300L&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "uuid",
        "title": "Law of Contract: Offer & Acceptance",
        "subject": "Contract Law",
        "level": "300L",
        "author": {
          "name": "Dr. Adebayo",
          "institution": "University of Lagos"
        },
        "views": 1200,
        "downloads": 450,
        "rating": 4.5,
        "fileUrl": "url_to_pdf",
        "thumbnail": "url",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
POST /student/notes
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

{
  "title": "Constitutional Law: Fundamental Rights",
  "subject": "Constitutional Law",
  "level": "400L",
  "description": "Comprehensive notes on Chapter IV",
  "file": <file_upload>
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Constitutional Law: Fundamental Rights",
    "fileUrl": "url",
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
GET /student/notes/:noteId
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Law of Contract: Offer & Acceptance",
    "content": "...",
    "fileUrl": "url",
    "subject": "Contract Law",
    "author": {...},
    "views": 1201,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Quizzes

```http
GET /student/quizzes
Authorization: Bearer {accessToken}
Query params: ?subject=Criminal Law&difficulty=medium&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "quizzes": [
      {
        "id": "uuid",
        "title": "Criminal Law: Homicide vs Manslaughter",
        "subject": "Criminal Law",
        "difficulty": "medium",
        "questionsCount": 20,
        "duration": 30,
        "attempts": 850,
        "averageScore": 75,
        "createdAt": "2024-01-20T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
GET /student/quizzes/:quizId
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Criminal Law: Homicide vs Manslaughter",
    "subject": "Criminal Law",
    "difficulty": "medium",
    "duration": 30,
    "questions": [
      {
        "id": "uuid",
        "question": "What is the definition of murder under Nigerian law?",
        "options": [
          "A", "B", "C", "D"
        ],
        "order": 1
      }
    ]
  }
}
```

```http
POST /student/quizzes/:quizId/submit
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "answers": [
    {"questionId": "uuid", "selectedOption": "A"},
    {"questionId": "uuid2", "selectedOption": "C"}
  ],
  "timeSpent": 1200
}

Response 200:
{
  "success": true,
  "data": {
    "score": 85,
    "correctAnswers": 17,
    "totalQuestions": 20,
    "passed": true,
    "answers": [
      {
        "questionId": "uuid",
        "selectedOption": "A",
        "correctOption": "A",
        "isCorrect": true,
        "explanation": "..."
      }
    ]
  }
}
```

### Study Groups

```http
GET /student/groups
Authorization: Bearer {accessToken}
Query params: ?subject=Tort Law&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "uuid",
        "name": "Tort Law Study Circle",
        "subject": "Tort Law",
        "members": 240,
        "description": "Discussing cases and concepts",
        "avatar": "url",
        "isPrivate": false,
        "lastActivity": "2024-02-12T07:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
POST /student/groups
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Land Law Discussion",
  "subject": "Land Law",
  "description": "Exploring Nigerian Land Use Act",
  "isPrivate": false
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Land Law Discussion",
    "members": 1,
    ...
  }
}
```

```http
POST /student/groups/:groupId/join
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Joined group successfully"
}
```

```http
GET /student/groups/:groupId/messages
Authorization: Bearer {accessToken}
Query params: ?page=1&limit=50

Response 200:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "author": {...},
        "content": "Can someone explain the doctrine of merger?",
        "createdAt": "2024-02-12T08:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
POST /student/groups/:groupId/messages
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "The doctrine of merger states that..."
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "The doctrine of merger states that...",
    "author": {...},
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

### Student Progress

```http
GET /student/progress
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "streak": 12,
    "subjectMastery": [
      {
        "subject": "Contract Law",
        "progress": 45,
        "lessonsCompleted": 12,
        "totalLessons": 27
      }
    ],
    "completedLessons": [
      {
        "id": "uuid",
        "title": "Offer and Acceptance",
        "subject": "Contract Law",
        "completedAt": "2024-02-10T15:00:00Z"
      }
    ],
    "quizzesTaken": 45,
    "averageScore": 78
  }
}
```

```http
POST /student/progress/mark-complete
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "resourceType": "note" | "video" | "quiz",
  "resourceId": "uuid"
}

Response 200:
{
  "success": true,
  "data": {
    "streak": 13,
    "progress": {...}
  }
}
```

---

## 4. Legal Resources

### Library (Statutes & Acts)

```http
GET /resources/library
Query params: ?category=statutes|rules|journals&search=CAMA&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "resources": [
      {
        "id": "uuid",
        "title": "Companies and Allied Matters Act 2020",
        "category": "statutes",
        "type": "Act",
        "year": 2020,
        "description": "Comprehensive company law in Nigeria",
        "fileUrl": "url_to_pdf",
        "sections": 870,
        "views": 5420,
        "createdAt": "2020-08-07T00:00:00Z"
      }
    ],
    "pagination": {...},
    "categories": {
      "statutes": 450,
      "rules": 120,
      "journals": 85
    }
  }
}
```

```http
GET /resources/library/:resourceId
Query params: ?includeContent=true

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Companies and Allied Matters Act 2020",
    "category": "statutes",
    "content": "Full text content...",
    "fileUrl": "url",
    "sections": [
      {
        "number": 1,
        "title": "Interpretation",
        "content": "..."
      }
    ],
    "relatedResources": [...]
  }
}
```

### Constitution

```http
GET /resources/constitution
Query params: ?chapter=4&search=right to life

Response 200:
{
  "success": true,
  "data": {
    "chapters": [
      {
        "id": 1,
        "title": "Chapter I: General Provisions",
        "sections": [
          {
            "number": 1,
            "title": "Supremacy of Constitution",
            "content": "This Constitution is supreme..."
          }
        ]
      },
      {
        "id": 4,
        "title": "Chapter IV: Fundamental Rights",
        "sections": [
          {
            "number": 33,
            "title": "Right to Life",
            "content": "Every person has a right to life..."
          }
        ]
      }
    ]
  }
}
```

```http
GET /resources/constitution/sections/:sectionNumber

Response 200:
{
  "success": true,
  "data": {
    "number": 33,
    "chapter": 4,
    "title": "Right to Life",
    "content": "Every person has a right to life...",
    "relatedCases": [
      {
        "title": "Bakare v. Lekan",
        "citation": "(2015) LPELR-24556(SC)",
        "summary": "..."
      }
    ]
  }
}
```

### Dictionary

```http
GET /resources/dictionary
Query params: ?letter=A&search=affidavit&page=1&limit=50

Response 200:
{
  "success": true,
  "data": {
    "terms": [
      {
        "id": "uuid",
        "term": "Affidavit",
        "definition": "A written statement confirmed by oath...",
        "category": "procedural",
        "examples": ["..."],
        "relatedTerms": ["Oath", "Evidence"]
      }
    ],
    "pagination": {...}
  }
}
```

```http
GET /resources/dictionary/:termId

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "term": "Habeas Corpus",
    "definition": "A writ requiring a person under arrest...",
    "etymology": "Latin: 'you have the body'",
    "usageExamples": [...],
    "relatedTerms": [...],
    "legalReferences": [...]
  }
}
```

---

## 5. Counsel Connect

### Lawyer Directory

```http
GET /counsel/lawyers
Query params: ?practiceArea=Corporate Law&location=Lagos&tier=gold&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "lawyers": [
      {
        "id": "uuid",
        "name": "Adebayo Ogunlesi",
        "role": "Senior Advocate of Nigeria",
        "tier": "gold",
        "practiceAreas": ["Corporate Law", "M&A"],
        "location": "Lagos",
        "firm": "Templars",
        "yearsOfExperience": 15,
        "avatar": "url",
        "bio": "Experienced practitioner...",
        "rating": 4.8,
        "reviewsCount": 124,
        "connectionsCount": 450,
        "verified": true
      }
    ],
    "pagination": {...},
    "filters": {
      "locations": ["Lagos", "Abuja", "Port Harcourt"],
      "practiceAreas": ["Corporate Law", "Litigation", ...],
      "tiers": ["bronze", "silver", "gold", "platinum"]
    }
  }
}
```

```http
GET /counsel/lawyers/:lawyerId
Query params: ?include=stats,reviews

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Adebayo Ogunlesi",
    "role": "Senior Advocate of Nigeria",
    "tier": "gold",
    "practiceAreas": [...],
    "location": "Lagos",
    "firm": "Templars",
    "yearsOfExperience": 15,
    "avatar": "url",
    "bio": "Experienced practitioner with demonstrated history...",
    "education": [...],
    "callToBarYear": 2008,
    "stats": {
      "questionsAnswered": 245,
      "sessionsHeld": 89,
      "rating": 4.8,
      "responseRate": "95%",
      "averageResponseTime": "2 hours"
    },
    "reviews": [...],
    "availability": {
      "nextAvailable": "2024-02-15T10:00:00Z",
      "schedule": {...}
    }
  }
}
```

### Questions & Mentorship

```http
POST /counsel/questions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "How should I approach research for corporate M&A transactions?",
  "practiceArea": "Corporate Law",
  "taggedLawyers": ["uuid1", "uuid2"],
  "isUrgent": false
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "author": {...},
    "content": "How should I approach...",
    "practiceArea": "Corporate Law",
    "taggedLawyers": [...],
    "status": "pending",
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
GET /counsel/questions
Authorization: Bearer {accessToken}
Query params: ?status=pending|answered&practiceArea=Corporate Law&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "uuid",
        "author": {...},
        "content": "...",
        "practiceArea": "Corporate Law",
        "taggedLawyers": [...],
        "status": "answered",
        "answersCount": 3,
        "createdAt": "2024-02-10T08:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
GET /counsel/questions/:questionId

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "author": {...},
    "content": "...",
    "practiceArea": "Corporate Law",
    "taggedLawyers": [...],
    "answers": [
      {
        "id": "uuid",
        "lawyer": {...},
        "content": "Based on my experience...",
        "upvotes": 12,
        "isAccepted": true,
        "createdAt": "2024-02-10T10:00:00Z"
      }
    ],
    "status": "answered",
    "createdAt": "2024-02-10T08:00:00Z"
  }
}
```

```http
POST /counsel/questions/:questionId/answers
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "Here's my perspective on this..."
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "lawyer": {...},
    "content": "Here's my perspective...",
    "upvotes": 0,
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
POST /counsel/questions/:questionId/answers/:answerId/accept
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Answer accepted successfully"
}
```

### Sessions & Bookings

```http
POST /counsel/sessions/book
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "lawyerId": "uuid",
  "sessionType": "1-on-1" | "consultation",
  "preferredDate": "2024-02-15T10:00:00Z",
  "duration": 60,
  "topic": "Career guidance in corporate law",
  "description": "..."
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "lawyer": {...},
    "student": {...},
    "sessionType": "1-on-1",
    "scheduledAt": "2024-02-15T10:00:00Z",
    "duration": 60,
    "status": "pending",
    "meetingLink": "https://meet.jurisma.com/session-uuid",
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
GET /counsel/sessions
Authorization: Bearer {accessToken}
Query params: ?status=pending|confirmed|completed&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "sessions": [...],
    "pagination": {...}
  }
}
```

```http
PATCH /counsel/sessions/:sessionId
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "confirmed" | "cancelled",
  "rescheduleTo": "2024-02-16T10:00:00Z" (optional)
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    ...
  }
}
```

### Lawyer Tier Management

```http
GET /counsel/tiers
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "currentTier": "bronze",
    "questionsAnswered": 15,
    "sessionsHeld": 3,
    "rating": 4.2,
    "nextTier": {
      "name": "silver",
      "requirements": {
        "questionsAnswered": 50,
        "sessionsHeld": 10,
        "minRating": 4.0
      }
    }
  }
}
```

---

## 6. Workspace Management

### Cases

```http
GET /workspace/cases
Authorization: Bearer {accessToken}
Query params: ?status=active|pending|closed&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "uuid",
        "reference": "C-2024-001",
        "title": "Estate of H. Whimple",
        "client": {
          "id": "uuid",
          "name": "Sarah Connor",
          "email": "sarah@example.com"
        },
        "status": "active",
        "category": "probate",
        "assignedLawyers": [...],
        "lastUpdated": "2024-02-12T06:00:00Z",
        "createdAt": "2024-01-15T00:00:00Z"
      }
    ],
    "pagination": {...},
    "stats": {
      "active": 24,
      "pending": 8,
      "closed": 92
    }
  }
}
```

```http
POST /workspace/cases
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "TechCorp vs DataInc",
  "clientName": "TechCorp Inc.",
  "clientEmail": "legal@techcorp.com",
  "category": "commercial",
  "description": "IP infringement dispute"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "reference": "C-2024-042",
    "title": "TechCorp vs DataInc",
    "status": "active",
    ...
  }
}
```

```http
GET /workspace/cases/:caseId

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "reference": "C-2024-001",
    "title": "Estate of H. Whimple",
    "client": {...},
    "status": "active",
    "category": "probate",
    "description": "...",
    "assignedLawyers": [...],
    "documents": [...],
    "timeline": [
      {
        "id": "uuid",
        "event": "Case filed",
        "description": "Initial filing",
        "date": "2024-01-15T00:00:00Z"
      }
    ],
    "notes": [...],
    "createdAt": "2024-01-15T00:00:00Z",
    "updatedAt": "2024-02-12T06:00:00Z"
  }
}
```

```http
PATCH /workspace/cases/:caseId
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "closed",
  "outcome": "settled",
  "notes": "Case settled out of court"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "closed",
    ...
  }
}
```

### Documents

```http
GET /workspace/documents
Authorization: Bearer {accessToken}
Query params: ?folder=case-files|contracts|evidence|admin&search=estate&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "name": "Estate_Will_Final_v2.pdf",
        "folder": "case-files",
        "size": 2457600,
        "type": "PDF",
        "status": "final",
        "caseId": "uuid",
        "uploadedBy": {...},
        "starred": true,
        "url": "signed_url",
        "createdAt": "2024-02-12T06:00:00Z",
        "modifiedAt": "2024-02-12T06:00:00Z"
      }
    ],
    "pagination": {...},
    "folders": {
      "case-files": 24,
      "contracts": 18,
      "evidence": 156,
      "admin": 8
    }
  }
}
```

```http
POST /workspace/documents
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

{
  "file": <file_upload>,
  "name": "Contract_Amendment.pdf",
  "folder": "contracts",
  "caseId": "uuid" (optional),
  "status": "draft" | "review" | "final"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Contract_Amendment.pdf",
    "folder": "contracts",
    "size": 845000,
    "type": "PDF",
    "url": "signed_url",
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
DELETE /workspace/documents/:documentId
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Document deleted successfully"
}
```

```http
POST /workspace/documents/:documentId/star
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "starred": true
  }
}
```

```http
GET /workspace/documents/:documentId/download
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "downloadUrl": "signed_url_with_expiry"
  }
}
```

### Smart Drafting

```http
GET /workspace/drafting/templates
Authorization: Bearer {accessToken}
Query params: ?category=business|property|employment

Response 200:
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Non-Disclosure Agreement",
        "category": "business",
        "description": "Protect your trade secrets...",
        "fieldsRequired": [
          "partyAName",
          "partyBName",
          "effectiveDate",
          "jurisdiction"
        ],
        "preview": "url_to_preview",
        "usageCount": 1250
      }
    ]
  }
}
```

```http
POST /workspace/drafting/generate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "templateId": "uuid",
  "fields": {
    "partyAName": "Acme Corp",
    "partyBName": "John Doe",
    "effectiveDate": "2024-02-15",
    "jurisdiction": "Lagos State"
  },
  "customizations": {
    "includeArbitrationClause": true,
    "disputeResolution": "mediation"
  }
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "documentUrl": "url_to_generated_pdf",
    "docxUrl": "url_to_docx",
    "preview": "...",
    "aiOptimizations": [
      "Added dispute resolution clause",
      "Optimized for Lagos State law"
    ],
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
POST /workspace/drafting/custom
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "prompt": "A co-founder agreement for a tech startup in Lagos with 50/50 split and 4 year vesting",
  "additionalDetails": {
    "parties": 2,
    "includeIPAssignment": true,
    "vestingSchedule": "4 years with 1 year cliff"
  }
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "documentUrl": "url",
    "preview": "...",
    "suggestions": [
      "Consider adding non-compete clause",
      "Define dispute resolution mechanism"
    ],
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

---

## 7. AI Services

### Legal Assistant Chat

```http
POST /ai/chat
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "message": "What are the elements of a valid contract in Nigerian law?",
  "conversationId": "uuid" (optional, for continuing conversation),
  "context": {
    "jurisdiction": "Nigeria",
    "practiceArea": "Contract Law"
  }
}

Response 200:
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "response": "Under Nigerian law, a valid contract requires...",
    "sources": [
      {
        "type": "statute",
        "title": "Nigerian Contract Act",
        "citation": "Section 2"
      }
    ],
    "relatedCases": [...],
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

```http
GET /ai/conversations
Authorization: Bearer {accessToken}
Query params: ?page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Contract Law Elements",
        "lastMessage": "...",
        "messagesCount": 8,
        "createdAt": "2024-02-10T10:00:00Z",
        "updatedAt": "2024-02-12T08:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

```http
GET /ai/conversations/:conversationId

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Contract Law Elements",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "What are the elements...",
        "timestamp": "2024-02-10T10:00:00Z"
      },
      {
        "id": "uuid2",
        "role": "assistant",
        "content": "Under Nigerian law...",
        "sources": [...],
        "timestamp": "2024-02-10T10:00:05Z"
      }
    ],
    "createdAt": "2024-02-10T10:00:00Z"
  }
}
```

### Document Analysis

```http
POST /ai/analyze
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

{
  "document": <file_upload>,
  "analysisType": "summary" | "risks" | "clause-review" | "full"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "summary": "This is a commercial lease agreement...",
    "keyPoints": [...],
    "risks": [
      {
        "severity": "high",
        "clause": "Section 4.2",
        "issue": "Unusual termination clause",
        "recommendation": "Consider renegotiating..."
      }
    ],
    "recommendations": [...],
    "compliance": {
      "jurisdiction": "Lagos State",
      "compliant": true,
      "issues": []
    },
    "createdAt": "2024-02-12T08:33:33Z"
  }
}
```

### Question Vetting

```http
POST /ai/vet-question
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "How do i start litigation",
  "practiceArea": "Litigation"
}

Response 200:
{
  "success": true,
  "data": {
    "approved": false,
    "reason": "Question is too vague",
    "suggestions": [
      "Be more specific about the type of litigation",
      "Include relevant facts",
      "Specify the jurisdiction"
    ],
    "improvedVersion": "What are the procedural steps to initiate civil litigation in Lagos State High Court?"
  }
}
```

### Content Improvement

```http
POST /ai/improve
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "need help with contract review",
  "type": "question" | "post" | "comment",
  "context": "counsel-connect"
}

Response 200:
{
  "success": true,
  "data": {
    "improvedVersion": "I need guidance on the key elements to review when analyzing commercial contracts. What should I look out for?",
    "suggestions": [
      "Added specific focus area",
      "Improved clarity",
      "Made it more professional"
    ]
  }
}
```

---

## Notifications

```http
GET /notifications
Authorization: Bearer {accessToken}
Query params: ?unreadOnly=true&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "question_answer" | "post_like" | "comment" | "session_confirmed",
        "title": "New answer to your question",
        "message": "Adebayo Ogunlesi answered your question",
        "data": {
          "questionId": "uuid",
          "answerId": "uuid"
        },
        "read": false,
        "createdAt": "2024-02-12T08:00:00Z"
      }
    ],
    "pagination": {...},
    "unreadCount": 5
  }
}
```

```http
PATCH /notifications/:notificationId/read
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Notification marked as read"
}
```

```http
PATCH /notifications/read-all
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

