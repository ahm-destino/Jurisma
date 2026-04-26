export const UserRole = {
    LAWYER: 'LAWYER',
    STUDENT: 'STUDENT',
    GENERAL: 'GENERAL',
    ADMIN: 'ADMIN'
};

export const UserType = {
    STUDENT: 'student',
    LAWYER: 'lawyer',
    GENERAL: 'general'
};

export const ProPlan = {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly'
};

export const MentorTier = {
    VERIFIED: 'verified_mentor',
    ACTIVE: 'active_mentor',
    DISTINGUISHED: 'distinguished_mentor',
    LEGACY: 'legacy_contributor'
};

export const QuestionStatus = {
    PENDING: 'pending',
    ANSWERED: 'answered',
    EXPIRED: 'expired',
    REFUNDED: 'refunded',
    DECLINED: 'declined'
};

export const SessionStatus = {
    PENDING: 'pending',
    RATE_CARD_SENT: 'rate_card_sent',
    FREE_OFFERED: 'free_session_offered',
    BOOKED: 'booked',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DECLINED: 'declined'
};

export const SessionType = {
    FREE: 'free',
    PAID: 'paid'
};

export const PracticeAreas = [
    'Corporate Law',
    'Litigation',
    'Criminal Law',
    'Intellectual Property',
    'Family Law',
    'Real Estate/Property',
    'Tax Law',
    'Labor & Employment',
    'Constitutional Law',
    'Human Rights',
    'Banking & Finance',
    'Oil & Gas',
    'Maritime Law',
    'Technology & Privacy',
    'Entertainment Law'
];

export const RecognitionBadges = {
    [MentorTier.LEGACY]: { label: 'Legacy Contributor', icon: '👑' }
};

export const NotificationType = {
    NEW_QUESTION: 'new_question',
    QUESTION_ANSWERED: 'question_answered',
    SESSION_REQUEST: 'session_request',
    RATE_CARD_RECEIVED: 'rate_card_received',
    SESSION_BOOKED: 'session_booked',
    FREE_SESSION_OFFERED: 'free_session_offered'
};

export const PaymentStatus = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    REFUNDED: 'refunded',
    FAILED: 'failed'
};

export const CoolingReason = {
    DECLINED_QUESTION: 'declined_question',
    TAG_LIMIT: 'tag_limit'
};

export const VerificationStatus = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
};

export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
};
