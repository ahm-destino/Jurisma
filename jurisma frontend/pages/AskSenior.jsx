import React, { useState, useEffect } from "react";
import {
  Users, CheckCircle, AlertCircle, Shield,
  Search, Filter, Sparkles, MessageSquare,
  Calendar, CreditCard, ChevronRight, Lock, MapPin, X, Briefcase
} from "lucide-react";
import { Card, Badge, Input } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { RecognitionBadge, SeniorProfileCard, QuestionCard } from "../components/counsel/Components.jsx";
import { useCounsel } from "../context/CounselContext.jsx";
import { vetQuestionAI, improveQuestionAI } from "../services/geminiService.js";

// --- Sub-View: Landing / Dashboard ---
const CounselDashboard = ({ setView, isGuest, highlightQuestionId }) => {
  const { currentUser, questions } = useCounsel();

  const myQuestions = questions.filter(q => q.juniorId === currentUser.id);
  const highlightedQuestion = highlightQuestionId
    ? myQuestions.find(q => String(q.id) === String(highlightQuestionId))
    : null;
  const orderedQuestions = highlightedQuestion
    ? [highlightedQuestion, ...myQuestions.filter(q => String(q.id) !== String(highlightQuestionId))]
    : myQuestions;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-jurisma-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2">Counsel Connect</h1>
            <p className="text-jurisma-100 max-w-xl text-sm md:text-base">
              Connect with verified senior lawyers for career guidance, methodology, and professional growth.
            </p>
          </div>
        </div>
        {/* Abstract Background Element */}
        <div className="absolute -right-20 -bottom-40 w-80 h-80 bg-jurisma-accent opacity-20 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="p-5 md:p-6 cursor-pointer hover:border-jurisma-accent transition-colors" onClick={() => setView('browse')}>
          <Users className="w-7 h-7 md:w-8 md:h-8 text-jurisma-accent mb-4" />
          <h3 className="font-bold text-base md:text-lg mb-2 text-jurisma-900">Find a lawyer</h3>
          <p className="text-xs md:text-sm text-jurisma-500">Find seniors by practice area and expertise.</p>
        </Card>

        <Card className={`p-5 md:p-6 transition-colors ${isGuest ? 'opacity-70' : 'cursor-pointer hover:border-jurisma-accent'}`} onClick={() => !isGuest && setView('ask')}>
          <div className="flex justify-between">
            <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-jurisma-accent mb-4" />
            {isGuest && <Lock size={16} className="text-jurisma-500" />}
          </div>
          <h3 className="font-bold text-base md:text-lg mb-2 text-jurisma-900">Ask a Question</h3>
          <p className="text-xs md:text-sm text-jurisma-500">Draft a question with AI assistance.</p>
        </Card>

      </div>

      {isGuest && (
        <div className="text-center py-8 bg-jurisma-50 rounded-xl border border-dashed border-jurisma-500/30">
          <h3 className="text-lg font-bold text-jurisma-900">Guest Access Limited</h3>
          <p className="text-jurisma-500 mb-4 text-sm">Upgrade to Student or Lawyer to ask questions.</p>
        </div>
      )}

      {/* Recent Activity */}
      {!isGuest && highlightQuestionId && !highlightedQuestion && (
        <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
          That question is no longer available.
        </div>
      )}

      {!isGuest && myQuestions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-jurisma-900 mb-4">My Questions</h2>
          <div className="space-y-4">
            {orderedQuestions.map(q => (
              <div
                key={q.id}
                id={`question-${q.id}`}
                className={String(q.id) === String(highlightQuestionId) ? 'ring-2 ring-jurisma-200 bg-jurisma-50/50 rounded-2xl p-2' : ''}
              >
                <QuestionCard question={q} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-View: Ask Question Flow ---
const AskQuestionFlow = ({ setView }) => {
  const { seniors, submitQuestion, canTagSenior } = useCounsel();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({ content: "", practiceArea: "Corporate Law", taggedSeniors: [] });
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isVetting, setIsVetting] = useState(false);

  const handleImprove = async () => {
    setIsVetting(true);
    const result = await improveQuestionAI(draft.content, draft.practiceArea);
    setAiFeedback(result);
    setIsVetting(false);
  };

  const handleTagSenior = (senior) => {
    if (draft.taggedSeniors.find(s => s.id === senior.id)) {
      setDraft(prev => ({ ...prev, taggedSeniors: prev.taggedSeniors.filter(s => s.id !== senior.id) }));
    } else {
      if (draft.taggedSeniors.length >= 3) return;
      setDraft(prev => ({ ...prev, taggedSeniors: [...prev.taggedSeniors, senior] }));
    }
  };

  const handleSubmit = async () => {
    setIsVetting(true);
    const vetResult = await vetQuestionAI(draft.content, draft.practiceArea);

    if (vetResult.approved) {
      submitQuestion(draft);
      setView('dashboard');
    } else {
      setAiFeedback({
        suggestions: [vetResult.reason, ...(vetResult.suggestions ? [vetResult.suggestions] : [])],
        error: true
      });
    }
    setIsVetting(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center text-sm text-jurisma-500">
        <span onClick={() => setView('dashboard')} className="cursor-pointer hover:text-jurisma-900">Dashboard</span>
        <ChevronRight size={16} />
        <span className="font-medium text-jurisma-900">Ask a Question</span>
      </div>

      <div className="space-y-6">
        {/* Step 1: Draft */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-jurisma-900">1. Draft Your Question</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-jurisma-500 mb-1">Practice Area</label>
              <select
                className="w-full p-2 border border-jurisma-100 rounded-lg bg-jurisma-50"
                value={draft.practiceArea}
                onChange={e => setDraft({ ...draft, practiceArea: e.target.value })}
              >
                <option>Corporate Law</option>
                <option>Litigation</option>
                <option>Intellectual Property</option>
                <option>Commercial Law</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-jurisma-500 mb-1">Your Question (Min 50 chars)</label>
              <textarea
                className="w-full h-32 p-3 border border-jurisma-100 rounded-lg focus:ring-2 focus:ring-jurisma-500"
                placeholder="Ask about methodology, career path, or general approach..."
                value={draft.content}
                onChange={e => setDraft({ ...draft, content: e.target.value })}
              />
              <div className="flex justify-between mt-2">
                <span className={`text-xs ${draft.content.length < 50 ? 'text-red-500' : 'text-jurisma-500'}`}>
                  {draft.content.length} / 1000 chars
                </span>
                <button
                  onClick={handleImprove}
                  disabled={draft.content.length < 20 || isVetting}
                  className="text-sm text-jurisma-accent font-medium flex items-center hover:underline disabled:opacity-50"
                >
                  <Sparkles size={14} className="mr-1" />
                  {isVetting ? "Analyzing..." : "Improve with AI"}
                </button>
              </div>
            </div>

            {aiFeedback && (
              <div className={`p-4 rounded-lg mb-4 ${aiFeedback.error ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                <h4 className="font-bold text-sm mb-2 flex items-center">
                  {aiFeedback.error ? <AlertCircle size={16} className="mr-2 text-red-600" /> : <Sparkles size={16} className="mr-2 text-amber-600" />}
                  AI Feedback
                </h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-jurisma-900">
                  {aiFeedback.suggestions?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                {aiFeedback.improved_version && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="text-xs font-bold text-jurisma-500 mb-1">SUGGESTED REWRITE:</p>
                    <p className="text-sm italic text-jurisma-900">"{aiFeedback.improved_version}"</p>
                    <button
                      onClick={() => setDraft({ ...draft, content: aiFeedback.improved_version })}
                      className="text-xs text-blue-600 font-medium mt-2 hover:underline"
                    >
                      Use this version
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={draft.content.length < 50}>Next: Select Mentors</Button>
            </div>
          </Card>
        )}

        {/* Step 2: Select Seniors */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-jurisma-900">2. Tag Mentors (Max 3)</h2>
            <div className="space-y-4 mb-6">
              {seniors.filter(s => s.practiceAreas.includes(draft.practiceArea)).map(senior => {
                const status = canTagSenior(senior.id);
                return (
                  <SeniorProfileCard
                    key={senior.id}
                    senior={senior}
                    isSelected={!!draft.taggedSeniors.find(s => s.id === senior.id)}
                    onSelect={handleTagSenior}
                    isDisabled={!status.allowed}
                    disabledReason={status.reason}
                  />
                );
              })}
            </div>
            <div className="flex justify-between pt-4 border-t border-jurisma-100">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit} disabled={draft.taggedSeniors.length === 0 || isVetting}>
                {isVetting ? "Vetting..." : "Send Question"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// --- Profile Modal ---
const LawyerProfileModal = ({ senior, onClose }) => {
  if (!senior) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] relative scrollbar-hide">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white md:text-slate-400 md:hover:text-slate-900 z-10 transition-colors">
          <X size={20} />
        </button>

        <div className="h-24 md:h-32 bg-jurisma-900 relative">
          <div className="absolute -bottom-10 md:-bottom-12 left-6 md:left-8 p-1 bg-white rounded-full">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-2xl md:text-3xl">
              {senior.name.charAt(0)}
            </div>
          </div>
        </div>

        <div className="pt-14 md:pt-16 px-5 md:px-8 pb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-jurisma-900">{senior.name}</h2>
              <p className="text-jurisma-500 font-medium">{senior.role === 'senior' ? 'Senior Advocate of Nigeria' : 'Associate'}</p>
            </div>
            <RecognitionBadge tier={senior.tier} />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {senior.practiceAreas.map(area => (
              <Badge key={area} variant="blue">{area}</Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center space-x-3">
              <MapPin className="text-jurisma-accent flex-shrink-0" size={18} />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Location</div>
                <div className="text-sm font-medium truncate">{senior.location}, Nigeria</div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex items-center space-x-3">
              <Briefcase className="text-jurisma-accent flex-shrink-0" size={18} />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Experience</div>
                <div className="text-sm font-medium truncate">15+ Years</div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-jurisma-900 mb-2">About</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              {senior.bio} An experienced practitioner with a demonstrated history of working in the legal services industry.
              Skilled in Negotiation, Arbitration, and Dispute Resolution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="w-full">Contact / Book Session</Button>
            <Button variant="outline" className="w-full">View Case History</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-View: Browse Mentors (Public/Private) ---
const BrowseMentors = ({ setView, isPublicView, onSignInRequest }) => {
  const { seniors } = useCounsel();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [selectedProfile, setSelectedProfile] = useState(null);

  const filteredSeniors = seniors.filter(senior => {
    const matchesSearch = senior.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      senior.practiceAreas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = locationFilter === "All" || senior.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const uniqueLocations = ["All", ...new Set(seniors.map(s => s.location))];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        {!isPublicView && (
          <button onClick={() => setView('dashboard')} className="mr-4 text-jurisma-400 hover:text-jurisma-900">
            <ChevronRight className="rotate-180" />
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold font-serif text-jurisma-900">Find a Lawyer</h2>
          <p className="text-jurisma-500">Verified seniors ready to guide your career.</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4 mb-6 bg-white sticky top-24 z-10 shadow-sm border-jurisma-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-jurisma-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or practice area..."
              className="w-full pl-10 pr-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-accent focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48 relative">
            <MapPin className="absolute left-3 top-2.5 text-jurisma-400" size={20} />
            <select
              className="w-full pl-10 pr-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-accent focus:outline-none appearance-none bg-white"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc === "All" ? "Any Location" : loc}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredSeniors.length > 0 ? (
          filteredSeniors.map(senior => (
            <div key={senior.id} className="bg-white p-6 rounded-xl border border-jurisma-100 shadow-sm flex flex-col md:flex-row justify-between items-center md:items-start hover:shadow-md transition-all">
              <div className="flex space-x-4 mb-4 md:mb-0 w-full md:w-auto">
                <div className="w-16 h-16 rounded-full bg-jurisma-100 flex items-center justify-center text-jurisma-900 font-bold text-xl flex-shrink-0">
                  {senior.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-jurisma-900">{senior.name}</h3>
                  <p className="text-jurisma-500 text-sm mb-2">{senior.role === 'senior' ? 'Senior Advocate' : 'Associate'} • {senior.location}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {senior.practiceAreas.map(area => (
                      <Badge key={area} variant="blue">{area}</Badge>
                    ))}
                  </div>
                  <RecognitionBadge tier={senior.tier} />
                </div>
              </div>

              <div className="text-center md:text-right flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                <Button variant="outline" className="text-xs h-9 flex-1 md:flex-none" onClick={() => setSelectedProfile(senior)}>
                  View Profile
                </Button>
                <Button onClick={isPublicView ? onSignInRequest : () => { }} disabled={!isPublicView} className="text-xs h-9 flex-1 md:flex-none">
                  {isPublicView ? "Sign In" : "Connect"}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-jurisma-500">
            No lawyers found matching your criteria.
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedProfile && (
        <LawyerProfileModal senior={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function CounselConnect({ isPublicView, onSignInRequest, isGuest, viewParams }) {
  const { currentUser } = useCounsel();
  const [view, setView] = useState('dashboard'); // dashboard, ask, sessions, browse

  if (isPublicView) {
    return <BrowseMentors isPublicView={true} onSignInRequest={onSignInRequest} />;
  }

  useEffect(() => {
    if (viewParams?.sessionId) {
      setView('sessions');
      return;
    }
    if (viewParams?.questionId) {
      setView('dashboard');
    }
  }, [viewParams?.sessionId, viewParams?.questionId]);

  return (
    <div className="min-h-screen bg-jurisma-50">
      {currentUser.role === 'senior' ? (
        <div className="p-6">Senior Dashboard Placeholder</div> // Reusing logic from previous file if needed
      ) : (
        <>
          {view === 'dashboard' && <CounselDashboard setView={setView} isGuest={isGuest} highlightQuestionId={viewParams?.questionId} />}
          {view === 'ask' && <AskQuestionFlow setView={setView} />}
          {view === 'browse' && <BrowseMentors setView={setView} />}
          {view === 'sessions' && (
            <div className="p-8 text-center text-jurisma-500 space-y-3">
              {viewParams?.sessionId && (
                <div className="mx-auto max-w-xl p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
                  Session details are not available yet. Showing your sessions list instead.
                </div>
              )}
              <div>Sessions module coming soon.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
