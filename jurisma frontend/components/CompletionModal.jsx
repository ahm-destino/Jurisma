import React, { useEffect, useRef } from 'react';
import { Trophy, ArrowRight, Home, Zap, Award } from 'lucide-react';
import Button from './ui/Button.jsx';

// Pure-CSS confetti emitter — no npm package needed
function Confetti() {
  const COLORS = ['#fbbf24','#34d399','#60a5fa','#f87171','#a78bfa','#fb923c'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 720}deg`,
    duration: `${1.2 + Math.random() * 0.6}s`,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(var(--r)); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: '2px',
            '--r': p.rotate,
            animation: `fall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

export default function CompletionModal({ stats, onHome, onContinue }) {
  // Confetti is now pure-CSS, no setup needed

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
        {/* Header Section */}
        <div className="bg-jurisma-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-400/20 animate-bounce-subtle">
              <Trophy size={40} className="text-amber-900" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Lesson Complete!</h2>
            <p className="text-jurisma-200 text-sm font-bold uppercase tracking-widest mt-1">Great work, Scholar!</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
                <Zap size={18} className="fill-amber-500" />
                <span className="text-xs font-black uppercase tracking-widest">XP Earned</span>
              </div>
              <div className="text-3xl font-black text-jurisma-900">+{stats.xp || 20}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-blue-500 mb-1">
                <Award size={18} className="fill-blue-500" />
                <span className="text-xs font-black uppercase tracking-widest">Rank</span>
              </div>
              <div className="text-3xl font-black text-jurisma-900">#{stats.rank || 1}</div>
            </div>
          </div>

          {/* Progress Message */}
          <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-sm font-bold text-emerald-800 leading-relaxed">
              You're in the <span className="text-emerald-600 font-black">Promotion Zone</span> for the {stats.league || 'Wood'} League! Keep it up to advance on Sunday.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={onContinue}
              className="w-full h-14 rounded-2xl bg-jurisma-900 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-jurisma-900/20"
            >
              Continue Learning <ArrowRight size={20} />
            </Button>
            <Button 
              variant="ghost" 
              onClick={onHome}
              className="w-full h-12 rounded-2xl text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100"
            >
              <Home size={18} /> Back to Hub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
