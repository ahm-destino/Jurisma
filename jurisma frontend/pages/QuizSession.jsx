import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";
import { Badge } from "../components/ui/Card.jsx";
import {
  ArrowLeft, CheckCircle2, XCircle, ChevronRight,
  BookOpen, Clock, Trophy, Target, AlertCircle, Zap, Loader2, Flame, Heart
} from "lucide-react";

// --- Sub-components ---
const DifficultyBadge = ({ level }) => {
  const colors = {
    EASY: "bg-emerald-100 text-emerald-700 border-emerald-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    HARD: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${colors[level] || colors.MEDIUM}`}>
      {level}
    </span>
  );
};

const Timer = ({ seconds, isActive }) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const isLow = seconds <= 15;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-sm font-bold transition-all ${isLow ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
      <Clock size={14} />
      {mins}:{secs}
    </div>
  );
};

const COUNT_OPTIONS = [5, 10, 15, 20];

const QuestionCountSelector = ({ value, onChange }) => (
  <div className="flex gap-2">
    {COUNT_OPTIONS.map(n => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
          value === n
            ? "bg-jurisma-900 border-jurisma-900 text-white shadow-md scale-105"
            : "bg-white border-slate-200 text-slate-500 hover:border-jurisma-300 hover:text-jurisma-700"
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);

// --- Subject Selection Screen ---
const SubjectSelect = ({ onSelect, onBack, sectionQuiz = null, currentHearts }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(10);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await api.getQuizzes();
        setQuizzes(data || []);
      } catch(err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  return (
  <div className="min-h-screen bg-jurisma-50 flex flex-col">
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full flex-1">
      <div className="flex justify-between items-start mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-jurisma-900 text-sm font-medium transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Hub
        </button>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
           <Heart size={14} className={currentHearts > 0 ? "text-rose-500 fill-rose-500" : "text-slate-300"} />
           <span className="text-xs font-black">{currentHearts}/5 Hearts</span>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-jurisma-900 font-serif mb-2 flex items-center gap-3">
          <Target className="text-jurisma-600" size={28} />
          {sectionQuiz ? "Section Quiz" : "Choose Your Subject"}
        </h1>
        <p className="text-slate-500 text-sm">Scenario-based questions modelled on Nigerian law and case authorities.</p>
      </div>

      {currentHearts === 0 && (
         <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-rose-800">
            <AlertCircle className="shrink-0" />
            <div className="text-xs">
               <p className="font-bold">No Hearts Remaining!</p>
               <p className="opacity-80">Wait for your hearts to refill or revise previous sections to earn more.</p>
            </div>
         </div>
      )}

      {/* Question Count Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <BookOpen size={13} /> Number of Questions
        </p>
        <QuestionCountSelector value={questionCount} onChange={setQuestionCount} />
      </div>

      <div className="grid gap-4">
        {loading ? (
            <div className="text-center p-8 text-slate-500">Loading quizzes...</div>
        ) : (
          quizzes.map((subject) => (
          <button
            key={subject.id}
            disabled={currentHearts === 0}
            onClick={() => onSelect({ ...subject, questionCount })}
            className={`group w-full text-left bg-white border border-slate-200 rounded-2xl p-5 transition-all duration-200 flex items-center gap-5 ${currentHearts === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-jurisma-400 hover:shadow-lg'}`}
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-jurisma-900 to-slate-800 flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>
              📜
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-jurisma-900 text-base md:text-lg">{subject.title}</p>
              <p className="text-slate-500 text-[10px] md:text-xs mt-0.5">{subject.description}</p>
              <div className="flex items-center gap-3 mt-2">
                 <p className="text-jurisma-600 text-[10px] font-black uppercase">{subject.questions_count || 0} Questions</p>
                 <Badge variant="blue" className="text-[8px] h-3 px-1.5">+20 XP</Badge>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-jurisma-600 group-hover:translate-x-1 transition-all flex-shrink-0" size={20} />
          </button>
        )))}
      </div>
    </div>
  </div>
  );
};

// --- Results Screen ---
const ResultsScreen = ({ score, total, subject, answers, questions, onRetry, onBack, isPerfect }) => {
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 70 ? { label: "Distinction", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" }
    : pct >= 50 ? { label: "Pass", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" }
    : { label: "Refer", color: "text-red-600", bg: "bg-red-50 border-red-200" };

  return (
    <div className="min-h-screen bg-jurisma-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-br from-jurisma-900 to-slate-800 p-8 text-center text-white relative`}>
            {isPerfect && (
               <div className="absolute top-0 right-0 p-4 animate-bounce">
                  <Badge className="bg-amber-400 text-jurisma-900 border-none font-black text-[10px]">PERFECT BONUS!</Badge>
               </div>
            )}
            <Trophy className={`mx-auto mb-3 ${isPerfect ? "text-amber-400" : "opacity-90"}`} size={48} />
            <h2 className="text-2xl font-bold font-serif mb-1">{isPerfect ? "Senior Advocate Grade" : "Quiz Complete"}</h2>
            <p className="text-white/70 text-sm">{subject.title}</p>
          </div>

          {/* Score */}
          <div className="p-8 text-center border-b border-slate-100">
            <div className="text-6xl font-black text-jurisma-900 mb-1">{pct}%</div>
            <div className={`inline-block px-4 py-1 rounded-full border text-sm font-bold ${grade.bg} ${grade.color} mb-3`}>
              {grade.label}
            </div>
            <p className="text-slate-500 text-sm">{score} correct out of {total} questions</p>
            {isPerfect && <p className="text-amber-600 text-xs font-black mt-2 uppercase tracking-widest">+25 Pts Mastery Bonus</p>}
          </div>

          {/* Review */}
          <div className="p-6 space-y-3 max-h-72 overflow-y-auto">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Review</p>
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correctIndex;
              return (
                <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                  {isCorrect
                    ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`font-bold text-xs mb-0.5 ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                      Q{i + 1}: {q.principle}
                    </p>
                    <p className="text-slate-500 text-[10px]">{isCorrect ? "Correct" : `Correct: ${q.options[q.correctIndex]}`}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
              Hub
            </button>
            <button onClick={onRetry} className="flex-1 py-3 rounded-xl bg-jurisma-900 text-white font-bold text-sm hover:bg-jurisma-800 transition-colors">
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Quiz Session ---
export default function QuizSession({ onBack, sectionQuiz = null }) {
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [screen, setScreen] = useState("select");
  const [subject, setSubject] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [hearts, setHearts] = useState(5);

  const currentQ = questions[currentIndex];
  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  // Fetch initial hearts from dashboard
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await api.getStudentDashboard();
        setHearts(stats.hearts ?? 5);
      } catch(e) { console.error("Stats fetch failed", e); }
    };
    fetchStats();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!timerActive || isSubmitted) return;
    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timerActive, secondsLeft, isSubmitted]);

  const handleSubmit = useCallback(async (timedOut = false) => {
    setTimerActive(false);
    setIsSubmitted(true);
    const ans = timedOut ? -1 : selectedOption;
    setAnswers((prev) => [...prev, ans]);

    // Gamification Logic: Heart Deduction
    if (ans !== currentQ?.correctIndex) {
       try {
          const res = await api.deductHeart();
          setHearts(res.hearts ?? 0);
       } catch(e) { console.error("Heart deduction failed", e); }
    }
  }, [selectedOption, currentQ]);

  const startSubject = async (sub) => {
    if (hearts <= 0) return;
    setLoadingQuiz(true);
    setSubject(sub);
    setScreen("quiz");
    
    try {
        const count = sub.questionCount || 10;
        let fullQuiz;
        if (sub.section_id) {
          fullQuiz = await api.getSectionQuiz(sub.section_id, count);
        } else {
          fullQuiz = await api.getQuiz(sub.id);
        }
        const allQuestions = fullQuiz.questions || [];
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, count);
        const mappedQuestions = shuffled.map(q => ({
            id: q.id,
            difficulty: q.difficulty || "MEDIUM",
            scenario: q.question,
            options: q.options || [],
            correctIndex: q.correct_option ? q.correct_option.toUpperCase().charCodeAt(0) - 65 : 0,
            principle: (q.explanation && q.explanation.includes(" (Principle: ")) ? q.explanation.split(" (Principle: ")[1].replace(")", "") : "Legal Principle",
            explanation: (q.explanation && q.explanation.includes(" (Principle: ")) ? q.explanation.split(" (Principle: ")[0] : q.explanation
        }));
        setQuestions(mappedQuestions);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsSubmitted(false);
        setAnswers([]);
        setSecondsLeft(60);
        setTimerActive(true);
    } catch (e) {
        console.error(e);
        setScreen("select");
    } finally {
        setLoadingQuiz(false);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Finalize Session
      const backendAnswers = answers.map((ans, i) => ({
          question_id: questions[i]?.id,
          selected_option: ans !== -1 && ans !== undefined && ans !== null ? String.fromCharCode(65 + ans) : "-1"
      }));
      api.submitQuizAttempt(subject.id, backendAnswers).catch(e => console.error("Attempt submit failed", e));
      
      // Points + Multiplier Logic
      const isPerfect = score === questions.length;
      api.logActivity('quiz_completion', 20, isPerfect).catch(err => console.error("Streak log failed:", err));
      
      setScreen("results");
    } else {
      // Move to next question if hearts left
      if (hearts <= 0) {
         setScreen("results"); // Force end if hearts run out
         return;
      }
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
      setIsSubmitted(false);
      setSecondsLeft(60);
      setTimerActive(true);
    }
  };

  if (loadingQuiz) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-jurisma-600" size={32} />
        <p className="text-slate-500 font-medium font-serif">Preparing Legal Challenge...</p>
      </div>
    </div>
  );

  const isCorrect = isSubmitted && selectedOption === currentQ?.correctIndex;

  if (screen === "select") {
    return <SubjectSelect onSelect={startSubject} onBack={onBack} sectionQuiz={sectionQuiz} currentHearts={hearts} />;
  }

  if (screen === "results") {
    return (
      <ResultsScreen
        score={score}
        total={questions.length}
        subject={subject}
        answers={answers}
        questions={questions}
        onRetry={() => startSubject(subject)}
        onBack={() => setScreen("select")}
        isPerfect={score === questions.length}
      />
    );
  }

  return (
    <div className="min-h-screen bg-jurisma-50 flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-200">
        <div
          className="h-full bg-jurisma-600 transition-all duration-500 shadow-[0_0_8px_rgba(30,58,138,0.3)]"
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => setScreen("select")} className="flex items-center gap-1.5 text-slate-500 hover:text-jurisma-900 text-xs font-bold transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline uppercase tracking-widest">Quit</span>
        </button>

        <div className="flex items-center gap-6">
           <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Heart size={14} className={hearts > 0 ? "text-rose-500 fill-rose-500" : "text-slate-300"} />
              <span className="text-[10px] font-black">{hearts}</span>
           </div>
           <div className="hidden sm:flex items-center gap-3">
             <Zap size={16} className="text-jurisma-500" />
             <span className="text-sm font-black text-slate-600">
               Q.{currentIndex + 1}<span className="text-slate-300">/{questions.length}</span>
             </span>
           </div>
        </div>

        <Timer seconds={secondsLeft} isActive={timerActive} />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-5 mt-2">
          {currentQ && <DifficultyBadge level={currentQ.difficulty} />}
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{subject?.title}</span>
        </div>

        {/* Scenario Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 md:p-8 mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <BookOpen size={100} />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-jurisma-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-jurisma-600">Legal Scenario</p>
          </div>
          <p className="text-slate-900 text-base md:text-lg leading-relaxed font-serif italic">
            "{currentQ?.scenario}"
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {currentQ?.options.map((opt, i) => {
            let style = "border-slate-200 bg-white hover:border-jurisma-400 hover:shadow-md";
            if (isSubmitted) {
              if (i === currentQ.correctIndex) style = "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-inner";
              else if (i === selectedOption) style = "border-red-400 bg-red-50 text-red-900 shadow-inner";
              else style = "border-slate-100 bg-slate-50 opacity-50";
            } else if (selectedOption === i) {
              style = "border-jurisma-600 bg-jurisma-50 shadow-lg ring-4 ring-jurisma-500/10";
            }

            return (
              <button
                key={i}
                disabled={isSubmitted || (hearts <= 0 && !isSubmitted)}
                onClick={() => !isSubmitted && setSelectedOption(i)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${style}`}
              >
                <span className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 text-xs font-black transition-all ${selectedOption === i && !isSubmitted ? "border-jurisma-600 bg-jurisma-600 text-white" : isSubmitted && i === currentQ.correctIndex ? "border-emerald-500 bg-emerald-500 text-white" : isSubmitted && i === selectedOption ? "border-red-400 bg-red-400 text-white" : "border-slate-200 text-slate-400"}`}>
                  {isSubmitted && i === currentQ.correctIndex ? <CheckCircle2 size={16} /> : isSubmitted && i === selectedOption ? <XCircle size={16} /> : String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm md:text-base font-bold">{opt}</span>
              </button>
            );
          })}
        </div>

        {isSubmitted && (
          <div className={`rounded-3xl border p-6 mb-8 animate-fade-in shadow-sm ${isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 {isCorrect ? <CheckCircle2 className="text-emerald-600" size={20} /> : <AlertCircle className="text-red-500" size={20} />}
                 <p className={`font-black text-base uppercase tracking-widest ${isCorrect ? "text-emerald-800" : "text-red-800"}`}>
                   {isCorrect ? "Exemplary!" : "Needs Review"}
                 </p>
              </div>
              <Badge className="bg-white/60 text-slate-600 border-slate-200 text-[9px] px-2 py-0.5">
                {currentQ.principle}
              </Badge>
            </div>
            <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-5 md:p-8 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto">
          {!isSubmitted ? (
            <button
              disabled={selectedOption === null || (hearts <= 0)}
              onClick={() => handleSubmit(false)}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 bg-jurisma-900 text-white hover:bg-jurisma-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-jurisma-900/20 active:scale-[0.98]"
            >
              Confirm Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] bg-jurisma-600 text-white hover:bg-jurisma-700 transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-jurisma-600/20"
            >
              {currentIndex + 1 >= questions.length ? (
                <><Trophy size={18} /> Review Standings</>
              ) : (
                <>Next Case <ChevronRight size={18} /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
