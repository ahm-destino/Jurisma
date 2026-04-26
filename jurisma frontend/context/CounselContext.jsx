import React, { createContext, useContext, useState, useEffect } from 'react';

const CounselContext = createContext();

// Mock Data for Production Simulation
const MOCK_SENIORS = [
  {
    id: 's1',
    name: 'Chidi Eze, SAN',
    role: 'senior',
    photo: null,
    practiceAreas: ['Commercial Law', 'Arbitration'],
    location: 'Lagos',
    verified: true,
    tier: 'distinguished_mentor', // verified, active, distinguished, legacy
    stats: { responseTime: '24h', rating: 4.9, responseCount: 312, monthlyLimit: 10, answeredThisMonth: 9 },
    bio: 'Senior Advocate of Nigeria with 25 years in commercial dispute resolution.'
  },
  {
    id: 's2',
    name: 'Amara Nwosu',
    role: 'senior',
    photo: null,
    practiceAreas: ['Litigation', 'Civil Procedure'],
    location: 'Abuja',
    verified: true,
    tier: 'active_mentor',
    stats: { responseTime: '24h', rating: 4.8, responseCount: 134, monthlyLimit: 5, answeredThisMonth: 4 },
    bio: 'Specializing in appellate practice and high-stakes civil litigation.'
  },
  {
    id: 's3',
    name: 'David Okafor',
    role: 'senior',
    photo: null,
    practiceAreas: ['Corporate Law', 'M&A'],
    location: 'Lagos',
    verified: true,
    tier: 'verified_mentor',
    stats: { responseTime: '48h', rating: 4.2, responseCount: 8, monthlyLimit: 5, answeredThisMonth: 1 },
    bio: 'Partner at Templars. Focused on energy and infrastructure finance.'
  }
];

export const CounselProvider = ({ children }) => {
  // State for the "Current User" simulation
  const [currentUser, setCurrentUser] = useState({
    id: 'j1',
    name: 'Junior Associate',
    role: 'junior', // 'junior' or 'senior'
    isPro: false,
    credits: { total: 5, used: 0 },
    verificationStatus: 'unverified'
  });

  const [questions, setQuestions] = useState([]);
  const [seniors] = useState(MOCK_SENIORS);

  // Actions
  const upgradeToPro = (plan) => {
    setCurrentUser(prev => ({ ...prev, isPro: true, verificationStatus: 'verified' }));
    return true;
  };

  const switchRole = (role) => {
    // Debug helper to test both sides
    setCurrentUser(prev => ({
      ...prev,
      id: role === 'senior' ? 's1' : 'j1',
      role: role,
      name: role === 'senior' ? 'Chidi Eze, SAN' : 'Junior Associate',
      isPro: role === 'senior' ? true : prev.isPro
    }));
  };

  const submitQuestion = (questionData) => {
    if (currentUser.credits.used >= currentUser.credits.total) {
      throw new Error("Monthly question limit reached.");
    }
    
    const newQuestion = {
      id: `q-${Date.now()}`,
      juniorId: currentUser.id,
      juniorName: currentUser.name,
      ...questionData,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    setQuestions(prev => [newQuestion, ...prev]);
    setCurrentUser(prev => ({
      ...prev,
      credits: { ...prev.credits, used: prev.credits.used + 1 }
    }));
    return newQuestion;
  };

  const answerQuestion = (questionId, answerContent) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, status: 'answered', answer: answerContent, answeredBy: currentUser.id, answeredAt: new Date() }
        : q
    ));
  };

  const canTagSenior = (seniorId) => {
    const senior = seniors.find(s => s.id === seniorId);
    if (!senior) return { allowed: false, reason: "Senior not found" };
    if (senior.stats.answeredThisMonth >= senior.stats.monthlyLimit) {
      return { allowed: false, reason: "Monthly limit reached" };
    }
    // Cooling period check would go here
    return { allowed: true };
  };

  return (
    <CounselContext.Provider value={{
      currentUser,
      upgradeToPro,
      switchRole,
      seniors,
      questions,
      submitQuestion,
      answerQuestion,
      canTagSenior
    }}>
      {children}
    </CounselContext.Provider>
  );
};

export const useCounsel = () => useContext(CounselContext);
