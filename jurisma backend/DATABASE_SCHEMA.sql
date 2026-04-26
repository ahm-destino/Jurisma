-- ============================================================================
-- JURISMA PRODUCTION-READY DATABASE SCHEMA  
-- PostgreSQL 14+ Compatible
-- Generated: 2024-02-12
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- ============================================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('guest', 'student', 'lawyer', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

-- Main users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'guest' NOT NULL,
    status user_status DEFAULT 'active' NOT NULL,
    phone VARCHAR(20),
    avatar TEXT,
    bio TEXT,
    location VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student specific profile
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    matric_number VARCHAR(50),
    level VARCHAR(10), -- e.g. '300L', '400L'
    department VARCHAR(100),
    graduation_year INTEGER,
    verification_document TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending',
    daily_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lawyer specific profile
CREATE TABLE lawyer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm VARCHAR(255),
    firm_url TEXT,
    job_title VARCHAR(100),
    call_to_bar_year INTEGER,
    call_to_bar_certificate TEXT,
    years_of_experience INTEGER,
    tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    sc_number VARCHAR(50), -- Supreme Court enrollment number
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified BOOLEAN DEFAULT FALSE,
    is_san BOOLEAN DEFAULT FALSE, -- Senior Advocate of Nigeria
    rating DECIMAL(3,2) DEFAULT 0.00,
    reviews_count INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    sessions_held INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0.00,
    average_response_time_hours DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (rating >= 0 AND rating <= 5),
    CHECK (response_rate >= 0 AND response_rate <= 100)
);

-- Social Hub User Profile
CREATE TABLE social_user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline TEXT,
    credentials TEXT,
    cover_image TEXT,
    company TEXT,
    position TEXT,
    experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Practice areas for lawyers
CREATE TABLE practice_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lawyer_practice_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    practice_area_id UUID NOT NULL REFERENCES practice_areas(id) ON DELETE CASCADE,
    years_experience INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lawyer_id, practice_area_id)
);

-- Refresh tokens for authentication
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

-- Role upgrade requests
CREATE TABLE role_upgrade_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_user_role user_role NOT NULL,
    target_role user_role NOT NULL,
    verification_documents JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. SOCIAL HUB
-- ============================================================================

-- Post categories
CREATE TYPE post_category AS ENUM ('all', 'discussion', 'case-insights', 'legal-news', 'networking');
CREATE TYPE post_status AS ENUM ('active', 'deleted', 'flagged');

-- Social posts
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 10000),
    category post_category DEFAULT 'all',
    status post_status DEFAULT 'active',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    attachments JSONB, -- Array of attachment URLs
    tags TEXT[], -- Array of tags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post likes
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 5000),
    likes_count INTEGER DEFAULT 0,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comment likes
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);

-- Post shares
CREATE TABLE post_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post bookmarks
CREATE TABLE post_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Trending topics
CREATE TABLE trending_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(100) UNIQUE NOT NULL,
    posts_count INTEGER DEFAULT 0,
    growth_rate DECIMAL(5,2),
    trending_score DECIMAL(10,2),
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User follows
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- ============================================================================
-- 3. STUDENT HUB
-- ============================================================================

-- Lecture notes
CREATE TABLE lecture_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    level VARCHAR(10), -- e.g. '300L'
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    thumbnail_url TEXT,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255),
    institution VARCHAR(255),
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    ratings_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (rating >= 0 AND rating <= 5)
);

-- Quizzes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20), -- easy, medium, hard
    description TEXT,
    duration_minutes INTEGER,
    passing_score INTEGER DEFAULT 70,
    questions_count INTEGER DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (passing_score >= 0 AND passing_score <= 100)
);

-- Quiz questions
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options [A, B, C, D]
    correct_option VARCHAR(1) NOT NULL,
    explanation TEXT,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, order_number)
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_spent_seconds INTEGER,
    answers JSONB, -- Store user answers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Study groups
CREATE TABLE study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    members_count INTEGER DEFAULT 1,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Study group members
CREATE TABLE study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- admin, moderator, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Study group messages
CREATE TABLE study_group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student progress tracking
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    total_lessons INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subject),
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Completed lessons tracking
CREATE TABLE completed_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- note, video, quiz
    resource_id UUID NOT NULL,
    title VARCHAR(500),
    subject VARCHAR(100),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_type, resource_id)
);

-- ============================================================================
-- 4. LEGAL RESOURCES
-- ============================================================================

-- Library resources (Statutes, Acts, Judicial Precedents, Journals)
CREATE TABLE library_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL, -- statutes, rules, journals
    type VARCHAR(100), -- Act, Rules, Journal Article, etc.
    year INTEGER,
    description TEXT,
    file_url TEXT,
    content TEXT, -- Full text content
    sections_count INTEGER,
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Library resource sections (for detailed navigation)
CREATE TABLE library_resource_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
    section_number INTEGER NOT NULL,
    title VARCHAR(500),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, section_number)
);

-- Constitution chapters and sections
CREATE TABLE constitution_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_number INTEGER NOT NULL UNIQUE,
    title VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE constitution_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES constitution_chapters(id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL,
    title VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, part_number)
);

CREATE TABLE constitution_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES constitution_chapters(id) ON DELETE CASCADE,
    part_id UUID REFERENCES constitution_parts(id) ON DELETE SET NULL,
    section_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, section_number)
);

-- Related cases for constitution sections
CREATE TABLE constitution_related_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES constitution_sections(id) ON DELETE CASCADE,
    case_title VARCHAR(500) NOT NULL,
    citation VARCHAR(255),
    summary TEXT,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Legal dictionary terms
CREATE TABLE dictionary_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(255) UNIQUE NOT NULL,
    definition TEXT NOT NULL,
    etymology TEXT,
    category VARCHAR(50), -- procedural, substantive, etc.
    usage_examples TEXT[],
    related_terms TEXT[],
    legal_references TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. COUNSEL CONNECT
-- ============================================================================

-- Mentorship questions
CREATE TABLE counsel_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) >= 50),
    practice_area VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, answered, closed
    is_urgent BOOLEAN DEFAULT FALSE,
    answers_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tagged lawyers for questions
CREATE TABLE question_tagged_lawyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES counsel_questions(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, lawyer_id)
);

-- Answers to questions
CREATE TABLE counsel_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES counsel_questions(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes_count INTEGER DEFAULT 0,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Answer upvotes
CREATE TABLE answer_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID NOT NULL REFERENCES counsel_answers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(answer_id, user_id)
);

-- Mentorship sessions
CREATE TABLE counsel_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50),-- 1-on-1, consultation, workshop
    product       VARCHAR(50),
    topic VARCHAR(500),
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_link TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    feedback_rating DECIMAL(3,2),
    feedback_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (feedback_rating IS NULL OR (feedback_rating >= 0 AND feedback_rating <= 5))
);

-- Lawyer reviews
CREATE TABLE lawyer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES counsel_sessions(id) ON DELETE SET NULL,
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, lawyer_id, session_id)
);

-- ============================================================================
-- 6. WORKSPACE MANAGEMENT
-- ============================================================================

-- Cases
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(20),
    category VARCHAR(100), -- probate, commercial, criminal, etc.
    description TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, pending, closed
    outcome VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Case assigned lawyers
CREATE TABLE case_lawyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'associate', -- lead, associate
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, lawyer_id)
);

-- Case timeline events
CREATE TABLE case_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Case notes
CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    folder VARCHAR(50), -- case-files, contracts, evidence, admin
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'draft', -- draft, review, final
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starred BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document access log
CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- view, download, edit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drafting templates
CREATE TABLE drafting_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- business, property, employment
    description TEXT,
    fields_required JSONB, -- Array of required field names
    template_content TEXT NOT NULL,
    preview_url TEXT,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generated documents
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES drafting_templates(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    docx_url TEXT,
    fields_data JSONB,
    customizations JSONB,
    ai_optimizations TEXT[],
    is_custom BOOLEAN DEFAULT FALSE, -- True if AI generated from prompt
    custom_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. AI SERVICES
-- ============================================================================

-- AI Conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    messages_count INTEGER DEFAULT 0,
    context JSONB, -- Store jurisdiction, practice area, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Messages
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    sources JSONB, -- Citations and references
    related_cases JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document analysis results
CREATE TABLE document_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    analysis_type VARCHAR(50) NOT NULL, -- summary, risks, clause-review, full
    summary TEXT,
    key_points TEXT[],
    risks JSONB, -- Array of risk objects
    recommendations TEXT[],
    compliance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. NOTIFICATIONS
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
    'question_answer',
    'post_like',
    'post_comment',
    'session_confirmed',
    'session_reminder',
    'case_update',
    'document_shared',
    'new_follower',
    'mention'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional contextual data
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Social posts indexes
CREATE INDEX idx_social_posts_author ON social_posts(author_id);
CREATE INDEX idx_social_posts_category ON social_posts(category);
CREATE INDEX idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_content_trgm ON social_posts USING gin(content gin_trgm_ops);

-- Post interactions indexes
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id);
CREATE INDEX idx_post_bookmarks_user ON post_bookmarks(user_id);

-- Student hub indexes
CREATE INDEX idx_lecture_notes_subject ON lecture_notes(subject);
CREATE INDEX idx_lecture_notes_level ON lecture_notes(level);
CREATE INDEX idx_lecture_notes_created_at ON lecture_notes(created_at DESC);
CREATE INDEX idx_quizzes_subject ON quizzes(subject);
CREATE INDEX idx_study_groups_subject ON study_groups(subject);
CREATE INDEX idx_study_group_members_user ON study_group_members(user_id);

-- Legal resources indexes
CREATE INDEX idx_library_resources_category ON library_resources(category);
CREATE INDEX idx_library_resources_title_trgm ON library_resources USING gin(title gin_trgm_ops);
CREATE INDEX idx_dictionary_terms_term_trgm ON dictionary_terms USING gin(term gin_trgm_ops);

-- Counsel connect indexes
CREATE INDEX idx_counsel_questions_author ON counsel_questions(author_id);
CREATE INDEX idx_counsel_questions_status ON counsel_questions(status);
CREATE INDEX idx_counsel_questions_practice_area ON counsel_questions(practice_area);
CREATE INDEX idx_counsel_answers_question ON counsel_answers(question_id);
CREATE INDEX idx_counsel_sessions_lawyer ON counsel_sessions(lawyer_id);
CREATE INDEX idx_counsel_sessions_student ON counsel_sessions(student_id);
CREATE INDEX idx_counsel_sessions_scheduled ON counsel_sessions(scheduled_at);

-- Workspace indexes
CREATE INDEX idx_cases_reference ON cases(reference);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_folder ON documents(folder);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- Lawyers indexes
CREATE INDEX idx_lawyer_profiles_tier ON lawyer_profiles(tier);
CREATE INDEX idx_lawyer_profiles_rating ON lawyer_profiles(rating DESC);
CREATE INDEX idx_lawyer_profiles_verified ON lawyer_profiles(verified);
CREATE INDEX idx_lawyer_practice_areas_lawyer ON lawyer_practice_areas(lawyer_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lawyer_profiles_updated_at BEFORE UPDATE ON lawyer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER FOR AUTO-INCREMENT COUNTERS
-- ============================================================================

-- Update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE social_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE social_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_comments_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Update post shares count
CREATE OR REPLACE FUNCTION update_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_shares_count_trigger
AFTER INSERT ON post_shares
FOR EACH ROW EXECUTE FUNCTION update_post_shares_count();

-- Update study group members count
CREATE OR REPLACE FUNCTION update_group_members_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE study_groups SET members_count = members_count + 1 WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE study_groups SET members_count = members_count - 1 WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_members_count_trigger
AFTER INSERT OR DELETE ON study_group_members
FOR EACH ROW EXECUTE FUNCTION update_group_members_count();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for lawyer profiles with complete information
CREATE OR REPLACE VIEW v_lawyer_full_profiles AS
SELECT 
    u.id                 AS user_id,
    u.name               AS name,
    u.email              AS email,
    u.avatar             AS avatar,
    u.location           AS location,
    u.bio                AS bio,
    lp.id                AS lawyer_profile_id,
    lp.user_id           AS lawyer_user_id,
    lp.firm              AS firm,
    lp.firm_url          AS firm_url,
    lp.job_title         AS job_title,
    lp.call_to_bar_year  AS call_to_bar_year,
    lp.years_of_experience AS years_of_experience,
    lp.tier              AS tier,
    lp.sc_number         AS sc_number,
    lp.verified          AS verified,
    lp.rating            AS rating,
    lp.reviews_count     AS reviews_count,
    lp.questions_answered AS questions_answered,
    lp.sessions_held     AS sessions_held,
    lp.response_rate     AS response_rate,
    lp.average_response_time_hours AS average_response_time_hours,
    lp.created_at        AS profile_created_at,
    lp.updated_at        AS profile_updated_at,
    ARRAY_AGG(DISTINCT pa.name) AS practice_areas_list
FROM users u
JOIN lawyer_profiles lp ON u.id = lp.user_id
LEFT JOIN lawyer_practice_areas lpa ON lp.id = lpa.lawyer_id
LEFT JOIN practice_areas pa ON lpa.practice_area_id = pa.id
WHERE u.role = 'lawyer' AND u.status = 'active'
GROUP BY
    u.id,
    u.name,
    u.email,
    u.avatar,
    u.location,
    u.bio,
    lp.id,
    lp.user_id,
    lp.firm,
    lp.firm_url,
    lp.job_title,
    lp.call_to_bar_year,
    lp.years_of_experience,
    lp.tier,
    lp.sc_number,
    lp.verified,
    lp.rating,
    lp.reviews_count,
    lp.questions_answered,
    lp.sessions_held,
    lp.response_rate,
    lp.average_response_time_hours,
    lp.created_at,
    lp.updated_at;

-- View for social posts with author information
CREATE OR REPLACE VIEW v_social_posts_with_authors AS
SELECT
  sp.*,
  u.id                                  AS author_user_id,
  u.name                                AS author_name,
  u.avatar                              AS author_avatar,
  CASE
    WHEN lp.id IS NOT NULL THEN lp.firm
    ELSE ssp.institution
  END                                    AS author_organization,
  CASE
    WHEN lp.id IS NOT NULL THEN lp.job_title
    ELSE NULL
  END                                    AS author_title,
  CASE
    WHEN lp.id IS NOT NULL THEN 'lawyer'
    WHEN ssp.id IS NOT NULL THEN 'student'
    ELSE u.role
  END                                    AS author_role
FROM social_posts sp
JOIN users u ON sp.author_id = u.id
LEFT JOIN lawyer_profiles lp ON u.id = lp.user_id
LEFT JOIN student_profiles ssp ON u.id = ssp.user_id
WHERE sp.status = 'active';

-- ============================================================================
-- SEED DATA FOR PRACTICE AREAS
-- ============================================================================

INSERT INTO practice_areas (name, description) VALUES
('Corporate Law', 'Business formations, M&A, corporate governance'),
('Litigation', 'Court representation and dispute resolution'),
('Intellectual Property', 'Patents, trademarks, copyrights'),
('Commercial Law', 'Trade, contracts, and commercial transactions'),
('Real Estate Law', 'Property transactions and land law'),
('Family Law', 'Divorce, custody, and family matters'),
('Criminal Law', 'Criminal defense and prosecution'),
('Tax Law', 'Tax planning and compliance'),
('Employment Law', 'Labor relations and employment matters'),
('Banking & Finance', 'Financial regulations and banking law');

-- ============================================================================
-- SEED DATA FOR CONSTITUTION CHAPTERS (Sample)
-- ============================================================================

INSERT INTO constitution_chapters (chapter_number, title, description) VALUES
(1, 'Chapter I: General Provisions', 'Fundamental provisions about the constitution'),
(2, 'Chapter II: Fundamental Objectives and Directive Principles of State Policy', 'Goals and guidelines for government'),
(4, 'Chapter IV: Fundamental Rights', 'Basic rights of Nigerian citizens');

-- ============================================================================
-- SEED DATA FOR DICTIONARY TERMS (Sample)
-- ============================================================================

INSERT INTO dictionary_terms (term, definition, category) VALUES
('Ab Initio', 'From the beginning.', 'latin'),
('Actus Reus', 'The guilty act; the physical element of a crime.', 'criminal'),
('Affidavit', 'A written statement confirmed by oath or affirmation, for use as evidence in court.', 'procedural'),
('Mens Rea', 'The intention or knowledge of wrongdoing that constitutes part of a crime.', 'criminal'),
('Habeas Corpus', 'A writ requiring a person under arrest to be brought before a judge or into court.', 'procedural'),
('Prima Facie', 'Based on the first impression; accepted as correct until proved otherwise.', 'procedural'),
('Stare Decisis', 'The legal principle of determining points in litigation according to precedent.', 'procedural');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate unique case reference
CREATE OR REPLACE FUNCTION generate_case_reference()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    seq_num INTEGER;
    ref TEXT;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'C-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM cases
    WHERE reference LIKE 'C-' || year_part || '-%';
    
    ref := 'C-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATABASE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Core users table storing all user accounts';
COMMENT ON TABLE lawyer_profiles IS 'Extended profile information for lawyers';
COMMENT ON TABLE student_profiles IS 'Extended profile information for students';
COMMENT ON TABLE social_posts IS 'User-generated posts in the social hub';
COMMENT ON TABLE counsel_questions IS 'Mentorship questions from students to lawyers';
COMMENT ON TABLE cases IS 'Legal cases managed in the workspace';
COMMENT ON TABLE documents IS 'Document storage and management';
COMMENT ON TABLE ai_conversations IS 'AI assistant conversation history';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- =========================================================================
-- NIGERIAN LAWS SCRAPER SCHEMA
-- =========================================================================

CREATE TABLE law_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE laws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    citation VARCHAR(255),
    enactment_year INTEGER,
    category_id UUID REFERENCES law_categories(id) ON DELETE SET NULL,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- For grouping sections, e.g., "Part 1 - Preliminary"
CREATE TABLE law_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    law_id UUID REFERENCES laws(id) ON DELETE CASCADE,
    part_number VARCHAR(50),
    title VARCHAR(500),
    order_index INTEGER
);

CREATE TABLE law_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    law_id UUID REFERENCES laws(id) ON DELETE CASCADE,
    part_id UUID REFERENCES law_parts(id) ON DELETE SET NULL,
    section_number VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    order_index INTEGER
);

CREATE TABLE law_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    citation VARCHAR(255),
    court VARCHAR(255),
    date_decided DATE,
    summary TEXT,
    ratio_decidendi TEXT,
    full_judgment TEXT,
    category_id UUID REFERENCES law_categories(id) ON DELETE SET NULL,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE legal_journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    journal_name VARCHAR(255),
    publication_date DATE,
    content TEXT NOT NULL,
    category_id UUID REFERENCES law_categories(id) ON DELETE SET NULL,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
