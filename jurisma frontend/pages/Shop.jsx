import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Diamond, ShoppingBag, Zap, ShieldCheck } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import api from '../services/api.js';

export default function Shop({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [items, setItems] = useState([]);
    const [gems, setGems] = useState(0);

    useEffect(() => {
        fetchShopData();
    }, []);

    const fetchShopData = async () => {
        setLoading(true);
        try {
            const shopRes = await api.apiRequest('/gamification/shop');
            setItems(shopRes.data || []);

            const profileRes = await api.getGamificationProfile();
            if (profileRes?.user?.gems !== undefined) {
                setGems(profileRes.user.gems);
            }
        } catch (err) {
            console.error("Error fetching shop data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyItem = async (itemId, cost) => {
        if (gems < cost) {
            alert("Not enough gems!");
            return;
        }

        setBuyingItemId(itemId);
        try {
            const res = await api.apiRequest('/gamification/shop/buy', {
                method: 'POST',
                body: JSON.stringify({ item_id: itemId })
            });

            if (res.data) {
                setGems(res.data.new_balance);
                alert(res.data.message || "Purchase successful!");
            }
        } catch (err) {
            console.error("Purchase error:", err);
            alert(err.message || "Failed to purchase item.");
        } finally {
            setBuyingItemId(null);
        }
    };

    const groupedItems = items.reduce((acc, item) => {
        const category = item.category || 'power-up';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Top Navigation */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
                <button 
                    onClick={onBack} 
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-1.5 border border-slate-200 shadow-inner">
                    <Diamond className="text-cyan-400 fill-cyan-400" size={18} />
                    <span className="font-black text-slate-800">{gems.toLocaleString()}</span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                {/* Store Header */}
                <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-gradient-to-tr from-jurisma-400 to-indigo-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg transform -rotate-3">
                        <ShoppingBag size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 font-serif">Jurisma Store</h1>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">
                        Spend your hard-earned gems on streak protections, boosts, and premium cosmetics!
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-jurisma-500" />
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Power-Ups */}
                        {groupedItems['power-up'] && (
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-blue-500" /> Protections
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedItems['power-up'].map(item => (
                                        <Card key={item.id} className="p-5 flex gap-4 items-center hover:border-jurisma-300 transition-colors shadow-sm">
                                            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">{item.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1 leading-snug">{item.description}</p>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-center">
                                                <Button 
                                                    variant={gems >= item.cost ? 'primary' : 'outline'}
                                                    className={`rounded-xl px-4 py-2 font-bold ${gems < item.cost ? 'opacity-50 grayscale' : ''}`}
                                                    onClick={() => handleBuyItem(item.id, item.cost)}
                                                    disabled={gems < item.cost || buyingItemId === item.id}
                                                >
                                                    {buyingItemId === item.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <Diamond size={14} className={gems >= item.cost ? "text-cyan-200 fill-cyan-200" : "text-slate-400"} />
                                                            <span>{item.cost}</span>
                                                        </div>
                                                    )}
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Boosts */}
                        {groupedItems['boost'] && (
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Zap className="text-amber-500" fill="currentColor" /> Boosts
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedItems['boost'].map(item => (
                                        <Card key={item.id} className="p-5 flex gap-4 items-center hover:border-jurisma-300 transition-colors shadow-sm border-amber-100">
                                            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">{item.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1 leading-snug">{item.description}</p>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-center">
                                                <Button 
                                                    className={`rounded-xl px-4 py-2 font-bold bg-amber-500 hover:bg-amber-600 text-white border-none ${gems < item.cost ? 'opacity-50 grayscale' : ''}`}
                                                    onClick={() => handleBuyItem(item.id, item.cost)}
                                                    disabled={gems < item.cost || buyingItemId === item.id}
                                                >
                                                    {buyingItemId === item.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <Diamond size={14} className="text-white fill-white" />
                                                            <span>{item.cost}</span>
                                                        </div>
                                                    )}
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Cosmetics */}
                        {groupedItems['cosmetic'] && (
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    ✨ Premium Themes
                                </h2>
                                <div className="grid grid-cols-1 gap-4">
                                    {groupedItems['cosmetic'].map(item => (
                                        <Card key={item.id} className="p-5 flex gap-4 items-center hover:border-jurisma-300 transition-colors shadow-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none">
                                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0 shadow-inner border border-white/20">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white">{item.name}</h4>
                                                <p className="text-xs text-slate-300 mt-1 leading-snug">{item.description}</p>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-center">
                                                <Button 
                                                    className={`rounded-xl px-6 py-2 font-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-900 border-none shadow-lg ${gems < item.cost ? 'opacity-50 grayscale' : ''}`}
                                                    onClick={() => handleBuyItem(item.id, item.cost)}
                                                    disabled={gems < item.cost || buyingItemId === item.id}
                                                >
                                                    {buyingItemId === item.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <Diamond size={14} className="text-amber-100 fill-amber-100" />
                                                            <span>{item.cost}</span>
                                                        </div>
                                                    )}
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
