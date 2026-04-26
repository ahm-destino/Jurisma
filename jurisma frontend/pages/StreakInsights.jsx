import React, { useState, useEffect } from 'react';
import { Flame, Calendar, Trophy, Zap, Info, ArrowLeft, Snowflake, Star, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import api from '../services/api.js';

const StreakInsights = ({ onBack, onOpenShop }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchStreakData();
  }, []);

  const fetchStreakData = async () => {
    try {
      const data = await api.getStreakInsights();
      setData(data);
    } catch (err) {
      console.error('Error fetching streak data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jurisma-900"></div>
      </div>
    );
  }

  const { stats, history } = data || { stats: {}, history: [] };

  const generateMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasActivity = history.some(h => h.activity_date.split('T')[0] === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      
      days.push({ day: d, dateStr, active: hasActivity, isToday });
    }
    return days;
  };

  const calendarDays = generateMonthCalendar();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-jurisma-900 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Large Animated Flame */}
          <div className="relative group">
            <div className="absolute inset-0 bg-orange-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden">
              <Flame size={stats.current_streak > 0 ? 80 : 60} className={`${stats.current_streak > 0 ? 'text-orange-500 fill-orange-500 animate-bounce' : 'text-slate-400 opacity-50'}`} />
              <div className="mt-2 text-4xl md:text-6xl font-black">{stats.current_streak || 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Day Streak</div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-3">Consistency Command Center</h2>
            <p className="text-slate-300 text-sm md:text-base max-w-lg mb-6">
              {stats.current_streak > 0 
                ? "You're on fire, Counselor! Your dedication to the law is building an unbreakable foundation."
                : "Every great lawyer starts with Day 1. Complete a lesson today to ignite your streak!"}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                <Trophy size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Best: {stats.longest_streak || 0} Days</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                <Snowflake size={16} className="text-blue-300" />
                <span className="text-xs font-bold uppercase tracking-wider">{stats.streak_freeze_count || 0} Freezes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mimo Style Calendar Section */}
        <Card className="lg:col-span-2 p-6 md:p-8 border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Calendar className="text-jurisma-600" size={20} />
              Streak Map
            </h3>
            
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="text-slate-400 hover:text-jurisma-600 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-sm font-black text-slate-700 min-w-[100px] text-center uppercase tracking-widest">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="text-slate-400 hover:text-jurisma-600 transition-colors"
                disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
              >
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {calendarDays.map((dayObj, idx) => (
              <div key={idx} className="flex justify-center">
                {dayObj ? (
                  <div 
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 relative ${
                      dayObj.active 
                        ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] ring-2 ring-orange-200' 
                        : dayObj.isToday
                        ? 'bg-jurisma-50 text-jurisma-600 border-2 border-jurisma-400'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                    title={dayObj.dateStr}
                  >
                    {dayObj.active ? <Flame size={18} className="fill-white animate-pulse-subtle" /> : dayObj.day}
                    
                    {/* Tiny today dot */}
                    {dayObj.isToday && !dayObj.active && (
                      <div className="absolute -bottom-1 w-1.5 h-1.5 bg-jurisma-600 rounded-full"></div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
                   <Flame size={14} className="text-white fill-white" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                   <span className="text-xs text-slate-300 font-black">X</span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Idle</span>
              </div>
          </div>
        </Card>

        {/* Stats & Actions */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <Card className="p-6 border-slate-200 bg-white">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-jurisma-500" />
              Efficiency
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Consistency Score</span>
                <span className="text-sm font-bold text-jurisma-900">{stats.consistency_score || 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-jurisma-500 h-full" style={{ width: `${stats.consistency_score || 0}%` }} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-500">Total Lessons</span>
                <span className="text-sm font-bold text-jurisma-900">{history.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Points Earned</span>
                <span className="text-sm font-bold text-jurisma-900">
                  {history.reduce((sum, h) => sum + h.points_earned, 0)}
                </span>
              </div>
            </div>
          </Card>

          {/* Achievement Card */}
          <Card className="p-6 border-jurisma-100 bg-jurisma-50/30 border-dashed relative group cursor-pointer hover:bg-jurisma-50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm">
                <Award size={24} className="text-amber-500" />
              </div>
              <div>
                <h4 className="font-bold text-jurisma-900 text-sm">Next Milestone</h4>
                <p className="text-xs text-slate-500 mt-1">Reach a 14-day streak to unlock the "Advocate's Resolve" badge.</p>
              </div>
            </div>
          </Card>

          {/* Streak Freeze Banner */}
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100">
            <div className="flex items-center justify-between mb-4">
               <Snowflake size={24} />
               <Badge className="bg-white/20 text-white border-none">Active</Badge>
            </div>
            <h4 className="font-bold mb-1">Streak Freeze</h4>
            <p className="text-[11px] text-blue-100 mb-4 leading-relaxed">Protect your progress! You have {stats.streak_freeze_count || 0} freezes available.</p>
            <Button 
                onClick={onOpenShop}
                className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none font-bold text-xs h-10"
            >
              Get More Freezes
            </Button>
          </div>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Star size={24} fill="currentColor" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">You're in the top 5%</h4>
            <p className="text-xs text-slate-500">Your consistency is higher than most students in 300L.</p>
          </div>
        </div>
        <Button onClick={onBack} variant="secondary" icon={ArrowLeft}>
          Back to Hub
        </Button>
      </div>
    </div>
  );
};

export default StreakInsights;
