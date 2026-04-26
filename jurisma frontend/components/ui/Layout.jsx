import React, { useState, useEffect } from "react";
import { Scale, Menu, X, Briefcase, User, Search, Users, Sun, Moon, Bell } from "lucide-react";
import Button from "./Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationsPanel from "./NotificationsPanel.jsx";
import api from "../../services/api.js";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      // Default to dark when no preference is saved.
      return true;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full text-jurisma-500 hover:text-jurisma-900 dark:text-jurisma-50 dark:hover:text-jurisma-accent transition-colors bg-jurisma-100 dark:bg-jurisma-800 border border-transparent dark:border-jurisma-500/30"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export const Header = ({ onLogin, isLoggedIn, onViewChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let interval;
    if (isLoggedIn && user) {
      // Initial fetch
      const fetchUnread = async () => {
        try {
          const data = await api.getNotifications(1, 1, true);
          setUnreadCount(data.unread_count || 0);
        } catch (err) {
          console.error('Failed to fetch unread count:', err);
        }
      };
      fetchUnread();
      
      // Poll every 30 seconds
      interval = setInterval(fetchUnread, 30000);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn, user]);

  return (
    <header className="sticky top-0 z-50 w-full bg-jurisma-50/90 dark:bg-jurisma-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-jurisma-500/30 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center cursor-pointer group" onClick={() => onViewChange('landing')}>
            <div className="w-10 h-10 rounded-xl bg-jurisma-900 dark:bg-jurisma-accent flex items-center justify-center text-white dark:text-jurisma-900 transition-colors">
              <Scale className="h-5 w-5" />
            </div>
            <span className="ml-3 text-xl font-sans font-bold text-jurisma-900 dark:text-jurisma-50 tracking-tight group-hover:text-jurisma-accent transition-colors">JURISMA</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <button onClick={() => onViewChange('lawyers')} className="text-sm font-medium text-jurisma-500 hover:text-jurisma-900 dark:text-jurisma-100/70 dark:hover:text-jurisma-50 transition-colors">
              Directory
            </button>
            <button onClick={() => onViewChange('community')} className="text-sm font-medium text-jurisma-500 hover:text-jurisma-900 dark:text-jurisma-100/70 dark:hover:text-jurisma-50 transition-colors">
              Community
            </button>
            <button onClick={() => onViewChange('library')} className="text-sm font-medium text-jurisma-500 hover:text-jurisma-900 dark:text-jurisma-100/70 dark:hover:text-jurisma-50 transition-colors">
              Resources
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-jurisma-500/30 mx-2"></div>

            <ThemeToggle />

            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-jurisma-500 hover:text-jurisma-900 dark:text-jurisma-100/70 dark:hover:text-jurisma-50 transition-colors relative"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-jurisma-900"></span>
                    )}
                  </button>
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-jurisma-500/30"></div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden lg:block mr-2">
                    <div className="text-xs font-bold text-jurisma-900 dark:text-jurisma-50">{user?.name}</div>
                    <div className="text-[10px] text-jurisma-500 dark:text-jurisma-100/60 capitalize tracking-wide">{user?.role}</div>
                  </div>
                  <Button onClick={() => onViewChange('dashboard')} variant="primary" icon={Briefcase} className="text-sm">
                    Workspace
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button onClick={onLogin} className="text-sm font-medium text-jurisma-900 dark:text-jurisma-50 hover:text-jurisma-accent transition-colors">
                  Sign In
                </button>
                <Button variant="secondary" onClick={onLogin} className="text-sm shadow-lg shadow-jurisma-accent/20">
                  Initialize
                </Button>
              </div>
            )}
          </nav>

          <button className="md:hidden p-2 text-jurisma-900 dark:text-jurisma-50" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onViewChange={onViewChange}
      />

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-jurisma-900 border-t border-gray-200 dark:border-jurisma-500/30 absolute w-full px-4 py-6 space-y-4 shadow-xl">
          <button onClick={() => { onViewChange('lawyers'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-jurisma-500 dark:text-jurisma-100 font-medium py-2">Find Lawyers</button>
          <button onClick={() => { onViewChange('community'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-jurisma-500 dark:text-jurisma-100 font-medium py-2">Community</button>
          <div className="py-2 flex justify-between items-center border-t border-gray-200 dark:border-jurisma-500/30 mt-2">
            <span className="text-sm text-jurisma-500 dark:text-jurisma-100">Theme</span>
            <ThemeToggle />
          </div>
          <div className="pt-4 flex flex-col space-y-3">
            {isLoggedIn ? (
              <Button variant="primary" onClick={() => { onViewChange('dashboard'); setIsMobileMenuOpen(false); }} className="w-full">Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={onLogin} className="w-full justify-center">Sign In</Button>
                <Button variant="primary" onClick={onLogin} className="w-full justify-center">Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
