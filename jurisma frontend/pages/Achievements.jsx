import React from 'react';
import BadgeSection from '../components/social/BadgeSection.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ArrowLeft, Award } from 'lucide-react';

export default function Achievements({ onBack }) {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <header className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-jurisma-900 shadow-sm transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 font-serif flex items-center gap-2">
                        <Award className="text-jurisma-600" /> Achievements
                    </h1>
                    <p className="text-slate-500 font-medium">Claim badges and track your progress through Jurisma.</p>
                </div>
            </header>

            <BadgeSection userId={user?.id} isOwnProfile={true} />
        </div>
    );
}
