import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx"; // Added ToastProvider import
import { CounselProvider } from "./context/CounselContext.jsx";
import { Header } from "./components/ui/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import LawyerDashboard from "./pages/LawyerDashboard.jsx";
import CounselConnect from "./pages/AskSenior.jsx";
import SocialHub from "./pages/SocialHub.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";

const AppContent = () => {
  const [view, setView] = useState('landing');
  const [viewParams, setViewParams] = useState({});
  const { user, logout } = useAuth();

  const handleViewChange = (newView, params = {}) => {
    setView(newView);
    setViewParams(params);
  };

  // Handle initial URL parsing for deep linking (e.g., /profile/:id)
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      const userId = path.split('/')[2];
      if (userId) {
        handleViewChange('community', { userId });
      }
    }
    
    // Also handle query params for posts if needed
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('postId');
    const commentId = params.get('commentId');
    if (postId || commentId) {
      handleViewChange('community', { postId, commentId });
    }
  }, []);

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleLogout = () => {
    logout();
    setView('landing');
  };

  // Public Routes (No User)
  if (view === 'login') {
    return <Auth onCancel={() => setView('landing')} onSuccess={handleLoginSuccess} />;
  }

  // --- Authenticated Layout Handling ---
  // If user is logged in, we generally want to show the LawyerDashboard shell
  // as it contains the sidebar and the main app navigation.
  if (user) {
    return <LawyerDashboard onLogout={handleLogout} viewParams={{ ...viewParams, tab: view === 'community' ? 'social' : view }} />;
  }

  // --- Public Unauthenticated Layouts ---
  
  // Public Lawyer Directory View
  if (view === 'lawyers') {
     return (
       <>
         <Header isLoggedIn={false} onLogin={() => setView('login')} onViewChange={handleViewChange} />
         <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <CounselConnect isPublicView={true} onSignInRequest={() => setView('login')} />
         </div>
       </>
     );
  }

  // Public Community View (Unauthenticated)
  if (view === 'community') {
    return (
      <>
        <Header isLoggedIn={false} onLogin={() => setView('login')} onViewChange={handleViewChange} />
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
           <SocialHub viewParams={viewParams} />
        </div>
      </>
    );
  }

  // Default Landing for Guests
  return (
    <>
      <Header 
        isLoggedIn={false} 
        onLogin={() => setView('login')} 
        onViewChange={handleViewChange}
      />
      <Landing onCta={() => setView('login')} onViewChange={handleViewChange} />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider> {/* Added ToastProvider */}
        <CounselProvider>
          <AppContent />
        </CounselProvider>
      </ToastProvider> {/* Closed ToastProvider */}
    </AuthProvider>
  );
}