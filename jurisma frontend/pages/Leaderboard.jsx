import React, { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Users, ChevronRight, Clock, ShieldAlert, ArrowUpCircle, Loader2 } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import api from '../services/api.js';

const LEAGUES = [
  { name: 'Wood', color: 'text-orange-900', bg: 'bg-orange-100' },
  { name: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-50' },
  { name: 'Silver', color: 'text-slate-400', bg: 'bg-slate-100' },
  { name: 'Gold', color: 'text-amber-500', bg: 'bg-amber-100' },
  { name: 'Diamond', color: 'text-blue-400', bg: 'bg-blue-100' }
];

export default function Leaderboard({ data: initialData = [], onNavigate }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData.length === 0) {
      fetchLeaderboard();
    } else {
      setData(initialData);
    }
  }, [initialData]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.getLeaderboard();
      setData(res || []);
    } catch (err) {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const currentLeague = data[0]?.league || 'Wood';
  const leagueIndex = LEAGUES.findIndex(l => l.name === currentLeague);

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center">
      <Loader2 className="animate-spin text-jurisma-600 mb-4" size={40} />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Rankings...</p>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* League Progression Map */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 overflow-x-auto">
         <div className="flex items-center gap-2 min-w-[600px] justify-between px-2">
            {LEAGUES.map((league, idx) => (
               <div key={league.name} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                     idx === leagueIndex ? 'bg-jurisma-600 scale-110 shadow-lg' : 
                     idx < leagueIndex ? 'bg-emerald-100' : 'bg-slate-50'
                  }`}>
                     <Trophy size={16} className={
                        idx === leagueIndex ? 'text-white' : 
                        idx < leagueIndex ? 'text-emerald-600' : 'text-slate-300'
                     } />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${
                     idx === leagueIndex ? 'text-jurisma-900' : 'text-slate-400'
                  }`}>{league.name}</span>
               </div>
            ))}
         </div>
      </div>

      <Card className="border-slate-200 overflow-hidden bg-white shadow-xl">
        <div className="bg-jurisma-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Trophy className="text-amber-400" size={32} />
              <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-amber-400/10 uppercase tracking-widest text-[10px] font-black">Season 1</Badge>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 ml-auto">
                 <Clock size={12} className="text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Ends in 2d 14h</span>
              </div>
            </div>
            <h3 className="font-serif text-3xl md:text-4xl font-bold">
              {currentLeague} League Standings
            </h3>
            <p className="text-jurisma-200 text-sm mt-3 max-w-lg leading-relaxed font-medium">
              Top 10 scholars in this league will be promoted to the next tier on Sunday night!
            </p>
          </div>
        </div>

        <div className="p-2 md:p-6">
          {data.length > 0 ? (
            <div className="space-y-1">
              {data.map((student, idx) => {
                const isPromotion = idx < 10;
                const isDemotion = idx >= data.length - 5 && data.length > 15;
                
                return (
                  <React.Fragment key={student.id}>
                    {idx === 0 && (
                       <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 flex items-center gap-2">
                          <ArrowUpCircle size={14} /> PROMOTION ZONE
                       </div>
                    )}
                    {idx === 10 && (
                       <div className="border-t-2 border-dashed border-slate-100 my-4 flex justify-center">
                          <span className="bg-white px-4 -mt-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">Safe Zone</span>
                       </div>
                    )}
                    {idx === data.length - 5 && data.length > 15 && (
                       <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-2 mt-4">
                          <ShieldAlert size={14} /> DEMOTION ZONE
                       </div>
                    )}

                    <div 
                      className={`p-3 md:p-5 flex items-center justify-between rounded-2xl transition-all border group ${
                        idx === 0 ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 
                        isPromotion ? 'bg-emerald-50/30 border-emerald-100' :
                        isDemotion ? 'bg-rose-50/30 border-rose-100' :
                        'bg-white border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-5">
                        <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-xl font-black shadow-inner ${
                          idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 
                          idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white' :
                          idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                          isPromotion ? 'bg-emerald-100 text-emerald-600' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white border-2 border-slate-100 shadow-sm overflow-hidden flex-shrink-0">
                            {student.avatar ? (
                              <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs md:text-lg font-black text-jurisma-600">
                                {student.name ? student.name.charAt(0) : 'S'}
                              </div>
                            )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm md:text-xl font-bold text-slate-900 truncate group-hover:text-jurisma-600">{student.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{student.league || 'Wood'} Scholar</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base md:text-2xl font-black text-jurisma-900 flex items-center justify-end gap-1">
                          {student.points.toLocaleString()}
                          <Star size={16} className="text-amber-500 fill-amber-500" />
                        </div>
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-60">Points</div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="p-24 text-center space-y-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl text-slate-200">
                 <Trophy size={48} className="animate-pulse" />
              </div>
              <div className="max-w-xs mx-auto">
                <h4 className="font-bold text-slate-900 text-lg">Empty League</h4>
                <p className="text-slate-400 text-sm mt-2 font-medium">Be the first to claim the #1 spot in the {currentLeague} League!</p>
              </div>
              <Button onClick={() => onNavigate && onNavigate('study')} className="rounded-full px-8 h-12 shadow-lg shadow-jurisma-900/20 font-bold">Start Learning</Button>
            </div>
          )}
        </div>
        
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col items-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Rankings refresh every 24 hours</p>
            <Button variant="ghost" className="text-jurisma-600 hover:text-jurisma-800 font-black uppercase tracking-wider text-xs">View Full Season Rewards</Button>
        </div>
      </Card>
    </div>
  );
}
