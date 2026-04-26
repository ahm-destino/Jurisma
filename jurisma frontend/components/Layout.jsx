import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    PenTool,
    Search,
    Menu,
    X,
    LogOut,
    CheckCircle2,
    GraduationCap,
    Scale,
    Library,
    MessageSquare,
    Users,
    BookA,
    FolderOpen,
    Newspaper
} from 'lucide-react';
import { Button } from './ui/Button';
import { UserRole } from '../types';

export const Layout = ({ children, user, onLogout }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isPublic = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

    if (isPublic) {
        return <>{children}</>;
    }

    const lawyerLinks = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Document Vault', path: '/documents', icon: FolderOpen },
        { label: 'Legal Research', path: '/research', icon: Search },
        { label: 'AI Drafting', path: '/drafting', icon: PenTool },
        { label: 'Law Reports', path: '/reports', icon: Newspaper },
        { label: 'Ask-A-Senior', path: '/ask-senior', icon: MessageSquare },
        { label: 'Constitution', path: '/constitution', icon: Scale },
        { label: 'Legal Library', path: '/library', icon: Library },
        { label: 'Dictionary', path: '/dictionary', icon: BookA },
        { label: 'Social Hub', path: '/social', icon: Users },
    ];

    const studentLinks = [
        { label: 'Student Hub', path: '/student-hub', icon: GraduationCap },
        { label: 'Legal Research', path: '/research', icon: Search },
        { label: 'Constitution', path: '/constitution', icon: Scale },
        { label: 'Legal Library', path: '/library', icon: Library },
        { label: 'Dictionary', path: '/dictionary', icon: BookA },
        { label: 'Community', path: '/social', icon: Users },
    ];

    const navItems = user?.role === UserRole.LAWYER ? lawyerLinks : studentLinks;

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Glass Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 glass-sidebar h-screen sticky top-0 overflow-y-auto z-30">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-jurisma-900 to-jurisma-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-jurisma-500/30">J</div>
                    <span className="text-xl font-bold text-slate-900 font-display tracking-tight">Jurisma</span>
                </div>

                <nav className="flex-1 px-3 space-y-1 py-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-jurisma-900 text-white shadow-md shadow-jurisma-900/20'
                                    : 'text-slate-600 hover:bg-white/60 hover:text-jurisma-800'
                                    }`}
                            >
                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-20"></div>}
                                <item.icon size={18} className={isActive ? "text-neon-blue" : "group-hover:text-jurisma-600 transition-colors"} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/40 bg-white/30 backdrop-blur-sm">
                    <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/50 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jurisma-100 to-white flex items-center justify-center text-jurisma-800 font-bold border border-white">
                                {user?.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                                <div className="flex items-center gap-1">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{user?.role === 'LAWYER' ? 'Legal Practitioner' : 'Student'}</p>
                                </div>
                            </div>
                        </div>
                        {user?.isVerified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 text-xs rounded-full font-bold border border-green-500/20 w-full justify-center">
                                <CheckCircle2 size={12} fill="currentColor" className="text-green-500 text-white" /> Verified Pro
                            </span>
                        ) : (
                            <Button size="sm" variant="outline" className="w-full text-xs mt-2 bg-transparent">Get Verified</Button>
                        )}
                    </div>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 text-slate-500 hover:text-red-600 text-sm font-medium px-2 transition-colors w-full justify-center"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden glass-panel border-b border-white/40 p-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-white/70">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-jurisma-900 rounded-lg flex items-center justify-center text-white font-bold">J</div>
                    <span className="text-lg font-bold text-slate-900 font-display">Jurisma</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 bg-white/50 rounded-lg transition-transform active:scale-95"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <X size={24} className="text-jurisma-900" /> : <Menu size={24} className="text-jurisma-900" />}
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}>
                <div
                    className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className={`absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}>
                    <div className="p-6 flex justify-between items-center border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-jurisma-900 rounded-lg flex items-center justify-center text-white font-bold">J</div>
                            <span className="text-lg font-bold text-slate-900">Jurisma</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium transition-colors ${location.pathname === item.path
                                        ? 'bg-jurisma-900 text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <item.icon size={22} className={location.pathname === item.path ? "text-white" : "text-jurisma-600"} />
                                {item.label}
                            </Link>
                        ))}
                        <div className="pt-4 mt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3 px-4 py-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-jurisma-100 flex items-center justify-center text-jurisma-800 font-bold border border-white uppercase">
                                    {user?.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{user?.role === 'LAWYER' ? 'Legal Practitioner' : 'Student'}</p>
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-4 px-4 py-4 text-red-600 font-medium w-full rounded-xl hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={22} /> Sign Out
                            </button>
                        </div>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-auto w-full max-w-[1920px] mx-auto">
                {location.pathname.includes('dashboard') && (
                    <div className="mb-8 relative max-w-2xl mx-auto md:mx-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-jurisma-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search cases, laws, or ask a senior..."
                            className="w-full pl-12 pr-4 py-3.5 bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm focus:ring-2 focus:ring-jurisma-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                )}
                {children}
            </main>
        </div>
    );
};
