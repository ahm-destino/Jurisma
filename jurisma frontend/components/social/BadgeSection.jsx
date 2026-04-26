import React, { useState, useEffect } from 'react';
import { Award, Lock, EyeOff, Eye, Loader2, CheckCircle } from 'lucide-react';
import { Card, Badge } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

const BadgeSection = ({ userId, isOwnProfile }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [gamificationData, setGamificationData] = useState(null);

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await api.getGamificationProfile(userId);
            setGamificationData(data);
        } catch (err) {
            console.error("Error fetching gamification data:", err);
            setError("Failed to load badges.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisibility = async (badgeDbId, currentVisibility) => {
        // Optimistic UI update
        setGamificationData(prev => ({
            ...prev,
            badges: prev.badges.map(b => 
                b.db_id === badgeDbId ? { ...b, is_public: !currentVisibility } : b
            )
        }));

        try {
            await api.toggleBadgeVisibility(badgeDbId, !currentVisibility);
        } catch (err) {
            console.error("Error toggling badge visibility:", err);
            // Revert on error
            setGamificationData(prev => ({
                ...prev,
                badges: prev.badges.map(b => 
                    b.db_id === badgeDbId ? { ...b, is_public: currentVisibility } : b
                )
            }));
            alert("Failed to update badge visibility.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-jurisma-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">{error}</p>
                <Button onClick={fetchData} variant="outline" className="mt-4">Try Again</Button>
            </div>
        );
    }

    const { badges, user } = gamificationData;
    const earnedBadges = badges.filter(b => b.is_earned);
    const lockedBadges = badges.filter(b => !b.is_earned);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Stats Header */}
            <Card className="p-6 bg-gradient-to-br from-jurisma-900 to-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Award size={120} />
                </div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                    <Award className="text-jurisma-300" /> 
                    {isOwnProfile ? "Your Achievements" : `${user.name}'s Achievements`}
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <p className="text-jurisma-200 text-xs font-bold uppercase tracking-wider mb-1">Badges Earned</p>
                        <p className="text-3xl font-black">{earnedBadges.length}</p>
                    </div>
                    {/* Add more stats here later if needed */}
                </div>
            </Card>

            {/* Earned Badges Grid */}
            <div>
                <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    Unlocked Badges <Badge variant="green" className="ml-2">{earnedBadges.length}</Badge>
                </h4>
                
                {earnedBadges.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
                        <Award className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No badges earned yet.</p>
                        {isOwnProfile && <p className="text-sm text-slate-400 mt-1">Keep studying to unlock your first achievement!</p>}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {earnedBadges.map(badge => (
                            <Card key={badge.id} className={`p-5 flex gap-4 items-start ${!badge.is_public && !isOwnProfile ? 'hidden' : ''} ${!badge.is_public ? 'opacity-70 bg-slate-50' : ''}`}>
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-3xl shrink-0">
                                    {badge.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h5 className="font-bold text-slate-900 text-sm leading-tight">{badge.name}</h5>
                                        {isOwnProfile && (
                                            <button 
                                                onClick={() => handleToggleVisibility(badge.db_id, badge.is_public)}
                                                className={`p-1.5 rounded-full transition-colors ${badge.is_public ? 'text-slate-400 hover:bg-slate-100' : 'text-amber-500 bg-amber-50'}`}
                                                title={badge.is_public ? "Make Private" : "Make Public"}
                                            >
                                                {badge.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug">{badge.description}</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-3 flex items-center gap-1">
                                        <CheckCircle size={10} className="text-emerald-500" />
                                        Earned {new Date(badge.earned_at).toLocaleDateString()}
                                    </p>
                                    {isOwnProfile && !badge.is_public && (
                                        <p className="text-[10px] text-amber-600 mt-1 font-bold">Hidden from public profile</p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Locked Badges Grid (Only show to owner or if we want to tease features) */}
            {isOwnProfile && lockedBadges.length > 0 && (
                <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                        Locked Badges <Badge variant="slate" className="ml-2">{lockedBadges.length}</Badge>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                        {lockedBadges.map(badge => (
                            <Card key={badge.id} className="p-5 flex gap-4 items-start bg-slate-50 border-slate-200 grayscale-[0.8]">
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-3xl shrink-0">
                                    <Lock size={20} className="text-slate-300" />
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-700 text-sm leading-tight">{badge.name}</h5>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug">{badge.description}</p>
                                    <div className="mt-3 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-slate-300 h-full w-[0%]"></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 text-right">0%</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BadgeSection;
