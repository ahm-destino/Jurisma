import React, { useState, useEffect, useCallback } from "react";
import { GraduationCap, BookOpen, Users, Video, Flame, CheckCircle2, Loader2, RefreshCw, Trophy, Star, ChevronRight, Activity, Heart } from "lucide-react";
import StreakInsights from "./StreakInsights.jsx";
import Leaderboard from "./Leaderboard.jsx";
import { Card, Badge } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../services/api.js";

export default function StudentHub({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState({ streak: 0 });
  const [trendingMaterials, setTrendingMaterials] = useState([]);
  const [masteryProgress, setMasteryProgress] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | streak | leaderboard

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sequentially to avoid overwhelming the local Flask dev server (WinError 10035)
      const dashboard = await api.getStudentDashboard();
      const materials = await api.getTrendingMaterials();
      const mastery = await api.getSubjectMastery();
      const leadRes = await api.getLeaderboard();

      setDashboardData(dashboard || { streak: 0 });
      setTrendingMaterials(materials || []);
      setMasteryProgress(mastery || []);
      setLeaderboard(leadRes || []);
    } catch (err) {
      console.error('Error fetching student hub data:', err);
      setError("Failed to load your study dashboard. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleLessonCompletion = async (lessonId) => {
    setActionLoading(lessonId);
    try {
      await api.completeLesson(lessonId);
      // Update local state or re-fetch mastery
      if (completedLessons.includes(lessonId)) {
        setCompletedLessons(completedLessons.filter(id => id !== lessonId));
      } else {
        setCompletedLessons([...completedLessons, lessonId]);
      }
      // Refresh mastery to show updated percentage
      const newMastery = await api.getSubjectMastery();
      setMasteryProgress(newMastery);
    } catch (err) {
      console.error('Error completing lesson:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-jurisma-600" />
        <p className="text-slate-500 font-medium">Loading your legal studies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="bg-gradient-to-r from-jurisma-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl border border-white/10">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2 flex items-center truncate">
            <GraduationCap className="mr-3 text-jurisma-400 size-8 md:size-10 flex-shrink-0" />
            Student Hub
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
             {/* Sleek League Indicator (Mimo Style) */}
             <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-full pl-1 pr-4 py-1 border border-white/20 shadow-inner">
                <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                   <Trophy size={14} className="text-amber-900" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white">{dashboardData.league || 'Wood'} League</span>
             </div>

             {/* Minimalist Hearts Indicator (Mimo Style) */}
             <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-full px-3 py-1.5 border border-white/20 shadow-inner">
                <Heart size={16} className="text-rose-500 fill-rose-500 animate-pulse-subtle" />
                <span className="text-sm font-black text-rose-50">{dashboardData.hearts ?? 5}</span>
             </div>
             {/* Gems Indicator (Mimo Style) - Navigates to Shop */}
             <div 
                onClick={() => onNavigate && onNavigate('shop')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-full px-3 py-1.5 border border-white/20 shadow-inner"
             >
                <div className="text-cyan-300">💎</div>
                <span className="text-sm font-black text-cyan-50">{dashboardData.gems || 0}</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[140px]">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-[9px] font-black text-jurisma-300 uppercase tracking-tighter">Daily Goal</span>
                   <span className="text-[10px] font-bold text-white">{dashboardData.current_daily_xp || 0} / {dashboardData.daily_goal || 50} XP</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                   <div 
                      className="bg-emerald-400 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                      style={{ width: `${Math.min(100, ((dashboardData.current_daily_xp || 0) / (dashboardData.daily_goal || 50)) * 100)}%` }} 
                   />
                </div>
            </div>

            <div 
              onClick={() => setActiveTab('streak')}
              className="bg-white/10 p-4 rounded-2xl backdrop-blur-xl border border-white/20 shadow-xl relative overflow-hidden group cursor-pointer hover:bg-white/20 transition-all min-w-[100px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Flame className="text-amber-400 fill-amber-400 animate-bounce" size={20} />
                  <div className="text-2xl font-black">{dashboardData.streak || 0}</div>
                </div>
                <div className="text-[9px] text-jurisma-200 uppercase tracking-widest font-black">Streak</div>
              </div>
            </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-jurisma-900 shadow-sm' : 'text-slate-500 hover:text-jurisma-600'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('streak')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'streak' ? 'bg-white text-jurisma-900 shadow-sm' : 'text-slate-500 hover:text-jurisma-600'}`}
        >
          Streak History
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'leaderboard' ? 'bg-white text-jurisma-900 shadow-sm' : 'text-slate-500 hover:text-jurisma-600'}`}
        >
          Leaderboard
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('achievements')}
          className="px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-jurisma-600"
        >
          Achievements
        </button>
      </div>

      {activeTab === 'streak' ? (
        <div className="animate-fade-in">
           <StreakInsights onBack={() => setActiveTab('overview')} onOpenShop={() => onNavigate && onNavigate('shop')} />
        </div>
      ) : activeTab === 'leaderboard' ? (
        <Leaderboard data={leaderboard} onNavigate={(view) => {
           if (view === 'overview') setActiveTab('overview');
           else onNavigate(view);
        }} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card className="p-5 md:p-6 border-t-4 border-t-jurisma-500 hover:shadow-lg transition-all transform hover:-translate-y-1 group cursor-pointer" onClick={() => onNavigate && onNavigate('study')}>
              <BookOpen className="w-8 h-8 text-jurisma-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg mb-2">Study Mode</h3>
              <p className="text-slate-500 text-sm mb-4">Full LLB curriculum with 3 explanation tones — from foundation to exam-ready.</p>
              <Button variant="outline" className="w-full text-xs font-bold border-slate-200" onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('study'); }}>Start Studying</Button>
            </Card>
            <Card className="p-5 md:p-6 border-t-4 border-t-pink-500 hover:shadow-lg transition-all transform hover:-translate-y-1 group cursor-pointer" onClick={() => onNavigate && onNavigate('quiz')}>
              <Video className="w-8 h-8 text-pink-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg mb-2">Quiz</h3>
              <p className="text-slate-500 text-sm mb-4">Test your knowledge with scenario-based Nigerian Law questions.</p>
              <Button variant="outline" className="w-full text-xs font-bold border-slate-200" onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('quiz'); }}>Start Quiz</Button>
            </Card>
            <Card className="p-5 md:p-6 border-t-4 border-t-emerald-500 hover:shadow-lg transition-all transform hover:-translate-y-1 group cursor-pointer" onClick={() => onNavigate && onNavigate('social')}>
              <Users className="w-8 h-8 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg mb-2">Study Groups</h3>
              <p className="text-slate-500 text-sm mb-4">Join 240+ students discussing Tort Law.</p>
              <Button variant="outline" className="w-full text-xs font-bold border-slate-200" onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('social'); }}>Find Group</Button>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">
              {/* Compact Subject Mastery */}
              <div>
                <div className="flex items-center justify-between mb-6 px-1">
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="text-jurisma-600" size={20} />
                    Current Progress
                  </h2>
                  <button onClick={() => onNavigate('study')} className="text-xs font-bold text-jurisma-600 hover:text-jurisma-800 flex items-center gap-1 group">
                    Full Curriculum
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {masteryProgress.length > 0 ? (
                    masteryProgress.slice(0, 4).map((item) => (
                      <div key={item.subject_id || item.subject} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer border-b-4 border-b-slate-100 hover:border-b-jurisma-500">
                        <div className="flex justify-between items-start mb-3">
                           <div className="text-sm font-bold text-slate-800 truncate group-hover:text-jurisma-600">{item.subject}</div>
                           <Badge variant="outline" className="text-[9px] h-4 bg-slate-50 border-slate-200 text-slate-500">{item.progress_percentage || 0}%</Badge>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-jurisma-500 h-full transition-all duration-1000"
                            style={{ width: `${item.progress_percentage || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          <span>{item.completed_slides || 0} Slides Finished</span>
                          <span>{item.total_slides || 0} Total</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 text-sm font-medium">No active subjects. Start a lesson to track your mastery!</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-6 px-1 flex items-center gap-2">
                  Trending Materials
                  <Badge variant="jurisma" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">Live Updates</Badge>
                </h2>
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {trendingMaterials.length > 0 ? trendingMaterials.map((item, i) => (
                    <div key={item.id || i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer min-w-0">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 text-xs border border-slate-200 shadow-sm">
                          {item.type ? item.type[0].toUpperCase() : 'M'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm md:text-base pr-2">{item.title}</h4>
                          <p className="text-[11px] text-slate-500">By {item.author || 'Anonymous'} • {item.views || 0} students enrolled</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 shrink-0">
                        <Badge variant="blue" className="hidden sm:inline-block text-[10px] uppercase font-black tracking-widest">{item.type || 'Material'}</Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLessonCompletion(item.id);
                          }}
                          disabled={actionLoading === item.id}
                          className={`p-2.5 rounded-xl transition-all ${completedLessons.includes(item.id) || item.is_completed
                            ? 'bg-emerald-100 text-emerald-600 shadow-inner'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                            }`}
                        >
                          {actionLoading === item.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={18} fill={(completedLessons.includes(item.id) || item.is_completed) ? "currentColor" : "none"} />
                          )}
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="p-16 text-center text-slate-400 text-sm italic font-medium">
                      Searching for the latest materials...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Compact Leaderboard Snippet */}
              <Card className="border-slate-200 overflow-hidden bg-white shadow-lg rounded-2xl">
                <div className="bg-jurisma-900 p-5 text-white flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Trophy className="text-amber-400" size={18} />
                      Top Scholars
                    </h3>
                  </div>
                  <button onClick={() => setActiveTab('leaderboard')} className="text-[10px] font-black uppercase text-jurisma-400 hover:text-white transition-colors">See Standings</button>
                </div>
                <div className="p-1">
                  {leaderboard.length > 0 ? (
                    <div className="space-y-1">
                      {leaderboard.slice(0, 3).map((student, idx) => (
                        <div key={student.id} className="p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                              idx === 0 ? 'bg-amber-100 text-amber-600' : 
                              idx === 1 ? 'bg-slate-100 text-slate-500' :
                              'bg-orange-100 text-orange-600'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-jurisma-50 border border-jurisma-100 flex-shrink-0 overflow-hidden">
                                {student.avatar ? (
                                  <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-jurisma-600">
                                    {student.name ? student.name.charAt(0) : 'S'}
                                  </div>
                                )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 truncate max-w-[80px]">{student.name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-black text-jurisma-900">{student.points.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-[10px] italic">
                      Standings updating...
                    </div>
                  )}
                </div>
              </Card>

              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:rotate-12 transition-transform">
                    <Star size={60} />
                 </div>
                 <h4 className="font-bold text-sm mb-4 flex items-center gap-2 relative z-10">
                    <Star size={16} className="text-amber-300 fill-amber-300" />
                    Next Rank
                 </h4>
                 <div className="space-y-4 relative z-10">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                       <span className="text-blue-100">Senior Advocate</span>
                       <span>2,450 / 5,000 Pts</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden shadow-inner">
                       <div className="bg-amber-400 h-full w-[49%] shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                    </div>
                    <p className="text-[10px] text-blue-100 leading-relaxed italic opacity-80">"Justice is a constant and perpetual will to render to every man his due."</p>
                 </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
