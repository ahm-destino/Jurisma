import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, BookOpen, ChevronRight, CheckCircle2, Circle,
  Loader2, Award, Target, Filter, GraduationCap, ChevronLeft,
  Layers, Tag, Gavel, ScrollText, Clock, Zap, BarChart3
} from "lucide-react";
import api from "../services/api.js";
import CompletionModal from "../components/CompletionModal.jsx";

// ─── Tone Selector ────────────────────────────────────────────────────────────
const TONES = [
  {
    id: "simple",
    label: "Foundational",
    icon: "🌱",
    desc: "Plain English with everyday analogies",
    color: "from-emerald-500 to-teal-500",
    border: "border-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  {
    id: "academic",
    label: "Academic",
    icon: "🎓",
    desc: "University-level legal language",
    color: "from-jurisma-600 to-slate-700",
    border: "border-jurisma-500",
    bg: "bg-jurisma-50",
    text: "text-jurisma-700",
  },
  {
    id: "exam",
    label: "Exam-Ready",
    icon: "🏆",
    desc: "Concise definitions & key points",
    color: "from-amber-500 to-orange-500",
    border: "border-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
];

const LEVEL_COLORS = {
  "100L": { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  "200L": { bg: "bg-jurisma-100", text: "text-jurisma-700", border: "border-jurisma-200" },
  "300L": { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  "400L": { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  "500L": { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
};

const LevelBadge = ({ level }) => {
  const c = LEVEL_COLORS[level] || LEVEL_COLORS["200L"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${c.bg} ${c.text} ${c.border}`}>
      {level}
    </span>
  );
};

// ─── Screen 1: Subject Browser ────────────────────────────────────────────────
const SubjectBrowser = ({ onSelectSubject, onBack }) => {
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState("ALL");
  const levels = ["ALL", "100L", "200L", "300L", "400L", "500L"];

  useEffect(() => {
    const load = async () => {
      try {
        const [subj, prog] = await Promise.all([
          api.getCurriculumSubjects(),
          api.getCurriculumProgress(),
        ]);
        setSubjects(subj || []);
        const map = {};
        (prog || []).forEach(p => { map[p.subject_id] = p; });
        setProgress(map);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activeLevel === "ALL" ? subjects : subjects.filter(s => s.level === activeLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-jurisma-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-jurisma-900 text-sm font-medium transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-jurisma-900 font-serif flex items-center gap-3">
              <GraduationCap className="text-jurisma-600" size={28} />
              Study Mode
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Nigerian LLB Curriculum · {subjects.length} subjects available</p>
          </div>
        </div>

        {/* Level Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {levels.map(l => (
            <button
              key={l}
              onClick={() => setActiveLevel(l)}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeLevel === l
                  ? "bg-jurisma-900 text-white border-jurisma-900 shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:border-jurisma-300"
              }`}
            >
              {l === "ALL" ? "All Levels" : l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-jurisma-600" size={32} />
            <p className="text-slate-500 text-sm">Loading curriculum...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No subjects found for {activeLevel}.</p>
            <p className="text-slate-400 text-sm">Run the scraper and pipeline scripts to populate content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(subject => {
              const prog = progress[subject.id];
              const pct = prog?.progress_percentage || 0;
              const completed = prog?.completed_slides || 0;
              const total = prog?.total_slides || subject.total_slides || 0;
              const completedSections = prog?.completed_sections || 0;
              const totalSections = prog?.total_sections || subject.total_sections || 0;
              return (
                <button
                  key={subject.id}
                  onClick={() => onSelectSubject(subject)}
                  className="group text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-br ${subject.color || "from-jurisma-900 to-slate-800"} p-5 text-white relative`}>
                    {pct === 100 && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-white rounded-full p-1 shadow-md animate-pulse-subtle" title="Course Completed">
                        <CheckCircle2 size={18} className="fill-emerald-600 text-white" />
                      </div>
                    )}
                    <div className="text-3xl mb-2">{subject.icon || "📜"}</div>
                    <LevelBadge level={subject.level} />
                    <h3 className="text-base font-bold mt-2 leading-tight pr-8">{subject.name}</h3>
                    <p className="text-white/60 text-xs mt-1">{subject.total_sections || 0} sections · {total} slides</p>
                  </div>

                  {/* Progress */}
                  <div className="p-4">
                    {/* Section completion indicator */}
                    {totalSections > 0 && (
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: totalSections }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                i < completedSections
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                              style={{ width: `${Math.max(8, 80 / totalSections)}px` }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-slate-500">
                          {completedSections}/{totalSections} <span className="font-medium">sections</span>
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">{completed}/{total} slides</span>
                      <span className="font-black text-jurisma-600">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-jurisma-500 to-jurisma-600 rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-400">{pct === 0 ? "Not started" : pct === 100 ? "Completed ✓" : "In progress"}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-jurisma-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen 2: Section Browser ────────────────────────────────────────────────
const SectionBrowser = ({ subject, onSelectSection, onBack, onStartQuiz }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCurriculumSubject(subject.slug);
        setSections(data.sections || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subject.slug]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-jurisma-50">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-jurisma-900 text-sm font-medium mb-6 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          All Subjects
        </button>

        <div className={`bg-gradient-to-br ${subject.color || "from-jurisma-900 to-slate-800"} rounded-2xl p-6 text-white mb-6`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl mb-2">{subject.icon || "📜"}</div>
              <LevelBadge level={subject.level} />
              <h1 className="text-xl font-bold mt-2 font-serif">{subject.name}</h1>
              <p className="text-white/60 text-sm mt-1">{subject.description}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black">{sections.length}</p>
              <p className="text-white/60 text-xs uppercase tracking-widest">Sections</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-jurisma-600" size={28} /></div>
        ) : (
          <div className="space-y-3">
            {sections.map((sec, idx) => {
              const completedSlides = sec.completed_slides || 0;
              const totalSlides = sec.total_slides || 0;
              const pct = totalSlides > 0 ? Math.round((completedSlides / totalSlides) * 100) : 0;
              const isDone = sec.is_completed;
              const inProgress = completedSlides > 0 && !isDone;

              return (
                <button
                  key={sec.id}
                  onClick={() => onSelectSection(sec)}
                  className={`group w-full text-left bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 ${
                    isDone
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : inProgress
                      ? 'border-jurisma-200 hover:border-jurisma-300'
                      : 'border-slate-100 hover:border-jurisma-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Number/Check circle */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm border-2 transition-all ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : inProgress
                        ? 'bg-jurisma-50 text-jurisma-700 border-jurisma-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {isDone ? <CheckCircle2 size={18} className="text-emerald-600" /> : idx + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-jurisma-900 text-sm truncate">{sec.title}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isDone && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Done</span>
                          )}
                          {inProgress && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-jurisma-600 bg-jurisma-50 border border-jurisma-200 px-2 py-0.5 rounded-full">In Progress</span>
                          )}
                          {sec.has_quiz && (
                            <button
                              onClick={e => { e.stopPropagation(); onStartQuiz(sec); }}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-100 transition-colors"
                            >
                              Quiz
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slide progress bar */}
                      {totalSlides > 0 && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>{completedSlides} of {totalSlides} slides completed</span>
                            <span className={`font-black ${
                              isDone ? 'text-emerald-600' : inProgress ? 'text-jurisma-500' : 'text-slate-400'
                            }`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isDone
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                  : 'bg-gradient-to-r from-jurisma-400 to-jurisma-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-slate-300 group-hover:text-jurisma-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen 3: Slide Reader ───────────────────────────────────────────────────
const SlideReader = ({ section, subject, onBack, onFinish }) => {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [tone, setTone] = useState("academic");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => {
    const savedTone = localStorage.getItem("jurisma_tone") || "academic";
    setTone(savedTone);
    const load = async () => {
      try {
        const data = await api.getSectionSlides(section.id);
        setSlides(data || []);
        const done = new Set(data.filter(s => s.is_completed).map(s => s.id));
        setCompleted(done);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [section.id]);

  const changeTone = (t) => {
    setTone(t);
    localStorage.setItem("jurisma_tone", t);
    api.updateTonePreference(t).catch(() => {});
  };

  const markComplete = async () => {
    const slide = slides[current];
    if (!slide || completed.has(slide.id) || completing) return;
    setCompleting(true);
    try {
      await api.completeSlide(slide.id);
      setCompleted(prev => new Set([...prev, slide.id]));
      // Log activity for the streak system
      api.logActivity('slide_completion', 15).catch(err => console.error("Streak log failed:", err));
    } catch (e) { console.error(e); }
    finally { setCompleting(false); }
  };

  const goNext = () => {
    markComplete();
    if (current < slides.length - 1) setCurrent(c => c + 1);
    else onFinish(section);
  };

  const goPrev = () => {
    if (current > 0) setCurrent(c => c - 1);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-jurisma-600" size={32} />
    </div>
  );

  const slide = slides[current];
  const activeTone = TONES.find(t => t.id === tone) || TONES[1];
  const contentKey = `content_${tone}`;
  const content = slide?.[contentKey] || slide?.content_academic || "";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-jurisma-500 transition-all duration-500"
          style={{ width: `${((current + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/5 px-4 md:px-8 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-medium transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">{section.title}</span>
        </button>
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-jurisma-400" />
          <span className="text-sm font-bold text-slate-300">
            P.{current + 1}<span className="text-slate-600">/{slides.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Clock size={13} />
          <span>{slide?.estimated_read_minutes || 3} min</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">

        {/* Subject + Level */}
        <div className="flex items-center gap-3 mb-4">
          <LevelBadge level={subject.level} />
          <span className="text-xs text-slate-500 font-medium">{subject.name}</span>
        </div>

        {/* Slide Title */}
        <h2 className="text-xl md:text-2xl font-bold text-white font-serif mb-5 leading-tight">
          {slide?.title}
        </h2>

        {/* Tone Selector */}
        <div className="flex gap-2 mb-5 p-1 bg-slate-800/60 rounded-xl border border-white/5">
          {TONES.map(t => (
            <button
              key={t.id}
              onClick={() => changeTone(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tone === t.id
                  ? `bg-gradient-to-r ${t.color} text-white shadow-md`
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title={t.desc}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Slide Content */}
        <div className={`bg-slate-900 rounded-2xl border ${activeTone.border}/30 p-5 md:p-7 flex-1 mb-5 transition-all duration-300`}>
          <div className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${activeTone.text} mb-4 px-2.5 py-1 ${activeTone.bg} rounded-full`}>
            <span>{activeTone.icon}</span> {activeTone.label} Mode
          </div>
          <p className="text-slate-100 leading-relaxed text-sm md:text-base font-medium whitespace-pre-line">
            {content || "Content is being processed. Please check back soon."}
          </p>
        </div>

        {/* Key Concepts */}
        {slide?.key_concepts?.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={13} className="text-jurisma-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Key Concepts</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {slide.key_concepts.map((c, i) => (
                <span key={i} className="px-2.5 py-1 bg-jurisma-500/30 border border-jurisma-500/50 text-white text-xs rounded-full font-bold shadow-sm shadow-jurisma-900/20">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Case References */}
        {slide?.case_references?.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Gavel size={13} className="text-amber-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Case Law</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {slide.case_references.map((c, i) => (
                <span key={i} className="px-2.5 py-1 bg-amber-500/30 border border-amber-500/50 text-white text-xs rounded-lg font-bold italic shadow-sm shadow-amber-900/20">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Statute References */}
        {slide?.statute_references?.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText size={13} className="text-violet-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Statutes</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {slide.statute_references.map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-violet-500/30 border border-violet-500/50 text-white text-xs rounded-lg font-bold shadow-sm shadow-violet-900/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? "w-5 h-2 bg-jurisma-400"
                  : completed.has(s.id)
                  ? "w-2 h-2 bg-emerald-500"
                  : "w-2 h-2 bg-slate-700 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="px-5 py-3.5 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            onClick={goNext}
            className="flex-1 py-3.5 rounded-xl font-black text-sm tracking-wide transition-all bg-jurisma-600 text-white hover:bg-jurisma-500 shadow-lg shadow-jurisma-900/50 flex items-center justify-center gap-2"
          >
            {current + 1 >= slides.length ? (
              <><Award size={18} /> Complete Section</>
            ) : (
              <>Next <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main StudyMode Component ─────────────────────────────────────────────────
export default function StudyMode({ onBack, onStartQuiz }) {
  const [screen, setScreen] = useState("subjects");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [completionData, setCompletionData] = useState(null);
  const [userRankData, setUserRankData] = useState({ xp: 15, rank: '-', league: 'Wood' });

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setScreen("sections");
  };

  const handleSelectSection = (section) => {
    setSelectedSection(section);
    setScreen("slides");
  };

  const handleStartQuiz = (section) => {
    if (onStartQuiz) onStartQuiz(section, selectedSubject);
  };

  const handleFinishSection = async (section) => {
    // Show completion modal immediately with placeholder rank
    setCompletionData({ section });
    
    // Fetch real rank async in background
    try {
      const leaderData = await api.getLeaderboard();
      const myRank = leaderData.find(u => u.is_me);
      if (myRank) {
        setUserRankData({ xp: 15, rank: myRank.rank, league: myRank.league });
      }
    } catch(e) {
      console.error("Failed to fetch rank", e);
    }
  };

  return (
    <>
      {screen === "slides" && selectedSection && selectedSubject ? (
        <SlideReader
          section={selectedSection}
          subject={selectedSubject}
          onBack={() => setScreen("sections")}
          onFinish={handleFinishSection}
        />
      ) : screen === "sections" && selectedSubject ? (
        <SectionBrowser
          subject={selectedSubject}
          onSelectSection={handleSelectSection}
          onBack={() => setScreen("subjects")}
          onStartQuiz={handleStartQuiz}
        />
      ) : (
        <SubjectBrowser onSelectSubject={handleSelectSubject} onBack={onBack} />
      )}

      {completionData && (
        <CompletionModal 
          stats={userRankData}
          onHome={() => {
            setCompletionData(null);
            setScreen("sections");
          }}
          onContinue={() => {
            const section = completionData.section;
            setCompletionData(null);
            if (section.has_quiz) {
              handleStartQuiz(section);
            } else {
              setScreen("sections");
            }
          }}
        />
      )}
    </>
  );
}
