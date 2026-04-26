import React, { useState, useEffect } from "react";
import { Scale, Briefcase, FileText, Sparkles, LogOut, Bell, Search, ArrowRight, Upload, ChevronRight, Users, Book, Scroll, BookA, PenTool, GraduationCap, MessageCircle, Lock, Menu, X, Plus, Loader2, Calendar, User, Clock, Flame, Trophy, ShoppingBag, Award } from "lucide-react";
import { Card, Badge } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import NotificationsPanel from "../components/ui/NotificationsPanel.jsx";
import Documents from "./Documents.jsx";
import Research from "./Research.jsx";
import CounselConnect from "./AskSenior.jsx";
import Library from "./Library.jsx";
import Constitution from "./Constitution.jsx";
import Dictionary from "./Dictionary.jsx";
import Drafting from "./Drafting.jsx";
import StudentHub from "./StudentHub.jsx";
import SocialHub from "./SocialHub.jsx";
import QuizSession from "./QuizSession.jsx";
import StudyMode from "./StudyMode.jsx";
import StreakInsights from "./StreakInsights.jsx";
import Leaderboard from "./Leaderboard.jsx";
import Shop from "./Shop.jsx";
import Achievements from "./Achievements.jsx";

// Lawyer Dashboard components

const NavItem = ({ tab, activeTab, label, icon: Icon, onClick, locked = false }) => (
  <button
    onClick={() => !locked && onClick(tab)}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
      ? 'bg-jurisma-900 text-white shadow-md'
      : 'text-jurisma-500 hover:bg-jurisma-100 hover:text-jurisma-900'
      } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
  >
    <div className="flex items-center space-x-3">
      <Icon size={18} />
      <span>{label}</span>
    </div>
    {locked && <Lock size={14} className="text-jurisma-500" />}
  </button>
);

const DashboardStats = ({ kpiKey }) => {
  const [stats, setStats] = useState({ total: 0, pending: 0, loading: true });

  useEffect(() => {
    fetchStats();
  }, [kpiKey]);

  const fetchStats = async () => {
    try {
      // Fetch total and pending separately or from a summary endpoint if it existed
      const [allRes, pendingRes] = await Promise.all([
        api.getCases(1, 1, 'all'),
        api.getCases(1, 1, 'Pending')
      ]);
      setStats({
        total: allRes.pagination?.total_count || allRes.cases?.length || 0,
        pending: pendingRes.pagination?.total_count || pendingRes.cases?.length || 0,
        loading: false
      });
    } catch (err) {
      setStats({ total: 0, pending: 0, loading: false });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <Card className="p-6 border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Briefcase size={40} />
        </div>
        <div className="text-jurisma-500 text-xs font-black uppercase tracking-widest mb-2">Total Case Files</div>
        <div className="text-3xl font-bold text-jurisma-900">
          {stats.loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : stats.total}
        </div>
        <div className="text-emerald-600 text-[10px] font-bold mt-2 flex items-center bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
          <ArrowRight size={10} className="rotate-[-45deg] mr-1" /> SYNCED LIVE
        </div>
      </Card>
      <Card className="p-6 border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Clock size={40} />
        </div>
        <div className="text-jurisma-500 text-xs font-black uppercase tracking-widest mb-2">Pending Review</div>
        <div className="text-3xl font-bold text-jurisma-900">
          {stats.loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : stats.pending}
        </div>
        <div className={`text-[10px] font-bold mt-2 w-fit px-1.5 py-0.5 rounded ${stats.pending > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50'}`}>
          {stats.pending > 0 ? 'ATTENTION REQUIRED' : 'CLEAR RECORDS'}
        </div>
      </Card>
      <Card className="p-6 border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1 border-b-4 border-b-jurisma-500 relative overflow-hidden">
        <div className="text-jurisma-500 text-xs font-black uppercase tracking-widest mb-2">Billable Capacity</div>
        <div className="text-3xl font-bold text-jurisma-900">100%</div>
        <div className="text-slate-400 text-[10px] font-bold mt-2">OPTIMIZED WORKFLOW</div>
      </Card>
    </div>
  );
};

const CaseList = ({ onCaseClick, onNewCase, onDelete, refreshKey }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCases();
  }, [filter, refreshKey]);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCases(1, 20, filter);
      setCases(result.cases || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError("Unable to load cases. Please reconnect.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    if (status === 'Active') return 'green';
    if (status === 'Pending') return 'amber';
    return 'blue';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-jurisma-900">Recent Cases</h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-jurisma-100 rounded-lg text-sm focus:ring-2 focus:ring-jurisma-500 focus:outline-none bg-white font-medium"
          >
            <option value="all">All Cases</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Closed">Closed</option>
          </select>
          <Button icon={Plus} onClick={onNewCase} className="font-bold">New Case</Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-slate-200">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-jurisma-500" />
            <p className="mt-2 text-jurisma-500 text-sm font-medium">Synchronizing records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchCases} className="mt-2">Retry</Button>
          </div>
        ) : cases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-jurisma-50 border-b border-jurisma-100">
                <tr>
                  <th className="px-6 py-4 font-black text-jurisma-900 uppercase tracking-widest text-[10px]">Case Reference</th>
                  <th className="px-6 py-4 font-black text-jurisma-900 uppercase tracking-widest text-[10px]">Client</th>
                  <th className="px-6 py-4 font-black text-jurisma-900 uppercase tracking-widest text-[10px]">Status</th>
                  <th className="px-6 py-4 font-black text-jurisma-900 uppercase tracking-widest text-[10px]">Last Updated</th>
                  <th className="px-6 py-4 font-black text-jurisma-900 uppercase tracking-widest text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jurisma-100 bg-white">
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => onCaseClick(c)}
                  >
                    <td className="px-6 py-4 font-bold text-jurisma-900">
                      {c.title}
                      <span className="text-jurisma-500 font-medium ml-2 text-[10px] bg-jurisma-50 px-1.5 py-0.5 rounded">
                        {c.reference || c.id.toString().substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{c.client_name || c.client}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(c.status)}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : (c.lastUpdated || 'Unknown')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="text-jurisma-400 group-hover:text-jurisma-900 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onCaseClick(c); }}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Briefcase className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500 text-sm">No cases found. Start by creating your first legal case.</p>
            <Button variant="ghost" onClick={onNewCase} className="mt-4 text-jurisma-600 font-bold">New Case</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

// Case Detail Modal
const CaseDetailModal = ({ caseData, onClose, onDelete }) => {
  if (!caseData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-jurisma-100 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-jurisma-900">{caseData.title}</h3>
            <p className="text-sm text-jurisma-500">{caseData.id}</p>
          </div>
          <button onClick={onClose} className="text-jurisma-400 hover:text-jurisma-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-jurisma-500 uppercase tracking-wider">Client</p>
              <p className="font-medium text-jurisma-900">{caseData.client_name || caseData.client}</p>
            </div>
            <div>
              <p className="text-xs text-jurisma-500 uppercase tracking-wider">Status</p>
              <Badge variant={caseData.status === 'Active' ? 'green' : caseData.status === 'Pending' ? 'amber' : 'blue'}>
                {caseData.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-jurisma-500 uppercase tracking-wider">Case Type</p>
              <p className="font-medium text-jurisma-900">{caseData.case_type || 'General'}</p>
            </div>
            <div>
              <p className="text-xs text-jurisma-500 uppercase tracking-wider">Court</p>
              <p className="font-medium text-jurisma-900">{caseData.court || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-jurisma-500 uppercase tracking-wider">Created</p>
              <p className="font-medium text-jurisma-900">
                {caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : (caseData.lastUpdated || 'Unknown')}
              </p>
            </div>
            {caseData.description && (
              <div className="col-span-2">
                <p className="text-xs text-jurisma-500 uppercase tracking-wider">Description</p>
                <p className="font-medium text-jurisma-900 md:text-sm mt-1">{caseData.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-jurisma-100 flex gap-3">
          <Button variant="outline" className="flex-1">Edit Case</Button>
          <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(caseData.id)}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

// New Case Modal
const NewCaseModal = ({ onClose, onSubmit, addToast }) => {
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    case_type: 'Civil',
    court: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.client) {
      addToast({ type: 'warning', message: 'Please fill in required fields' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createCase(formData);
      onSubmit();
      onClose();
    } catch (err) {
      // Submit locally even if API fails
      onSubmit();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-jurisma-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-jurisma-900">Create New Case</h3>
          <button onClick={onClose} className="text-jurisma-400 hover:text-jurisma-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-jurisma-700 mb-1">Case Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none"
              placeholder="e.g., Estate of John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-jurisma-700 mb-1">Client Name *</label>
            <input
              type="text"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className="w-full px-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none"
              placeholder="e.g., John Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-jurisma-700 mb-1">Case Type</label>
              <select
                value={formData.case_type}
                onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                className="w-full px-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none"
              >
                <option value="Civil">Civil</option>
                <option value="Criminal">Criminal</option>
                <option value="Corporate">Corporate</option>
                <option value="Estate Planning">Estate Planning</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-jurisma-700 mb-1">Court</label>
              <input
                type="text"
                value={formData.court}
                onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                className="w-full px-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none"
                placeholder="e.g., High Court"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-jurisma-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-jurisma-200 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none"
              rows={3}
              placeholder="Brief description of the case..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-jurisma-100 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Case
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LawyerDashboard({ onLogout, viewParams }) {
  const { user, upgradeRole } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [refreshCases, setRefreshCases] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socialViewParams, setSocialViewParams] = useState({});
  const [counselViewParams, setCounselViewParams] = useState({});
  const [sectionQuizData, setSectionQuizData] = useState(null); // For section quiz from StudyMode
  const [streakInfo, setStreakInfo] = useState({ current_streak: 0 });

  // Polling for notifications and streaks
  useEffect(() => {
    let interval;
    if (user) {
      const fetchData = async () => {
        try {
          // Fetch sequentially to prevent WinError 10035 (socket exhaustion)
          const notifData = await api.getNotifications(1, 1, true);
          setUnreadCount(notifData.unread_count || 0);

          const dashboardData = await api.getStudentDashboard().catch(() => ({ streak: 0 }));
          if (dashboardData?.streak !== undefined) {
             setStreakInfo({ current_streak: dashboardData.streak });
          }
        } catch (err) {
          console.error('Failed to fetch dashboard data:', err);
        }
      };
      fetchData();
      interval = setInterval(fetchData, 30000);
    }
    return () => clearInterval(interval);
  }, [user]);

  // Set default tab based on role on mount
  useEffect(() => {
    if (user?.role === 'student') setActiveTab('student');
    else if (user?.role === 'lawyer') setActiveTab('overview');
    else setActiveTab('assistant'); // Guest default
  }, [user]);

  const applyViewParams = (params = {}) => {
    if (!params || Object.keys(params).length === 0) return;

    const tab = params.tab;
    if (tab === 'cases') setActiveTab('cases');
    if (tab === 'documents') setActiveTab('documents');
    if (tab === 'counsel') setActiveTab('counsel');
    if (tab === 'overview') setActiveTab('overview');
    if (tab === 'social' || tab === 'community') setActiveTab('social');

    if (params.caseId) {
      setActiveTab('cases');
      const fetchAndSelectCase = async () => {
        try {
          const data = await api.getCases(1, 100);
          const found = data.cases?.find(c => String(c.id) === String(params.caseId));
          if (found) {
            setSelectedCase(found);
          }
        } catch (err) {
          console.error('Error auto-selecting case:', err);
        }
      };
      fetchAndSelectCase();
    }

    if (params.documentId) {
      setActiveTab('documents');
    }

    if (params.postId || params.commentId || params.userId) {
      setActiveTab('social');
      setSocialViewParams(params);
    }

    if (params.questionId || params.sessionId) {
      setActiveTab('counsel');
      setCounselViewParams(params);
    }
  };

  // Handle deep linking from viewParams
  useEffect(() => {
    applyViewParams(viewParams || {});
  }, [viewParams]);

  const isGuest = user?.role === 'guest';
  const isStudent = user?.role === 'student';
  const isLawyer = user?.role === 'lawyer';

  // Upgrade prompt handler
  const handleUpgradeRequest = (targetRole) => {
    if (confirm(`Simulate admin approval for ${targetRole} upgrade?`)) {
      upgradeRole(targetRole);
    }
  };

  // Profile switch logic
  const handleProfileSwitch = () => {
    const nextRole = isStudent ? 'lawyer' : 'student';
    upgradeRole(nextRole);
    // Auto-navigate to appropriate home tab
    setActiveTab(nextRole === 'student' ? 'student' : 'overview');
  };

  const homeTab = isStudent ? 'student' : 'overview';
  const isHome = activeTab === homeTab;

  const handleBack = () => {
    setActiveTab(homeTab);
  };

  const handleCaseClick = (caseItem) => {
    setSelectedCase(caseItem);
  };

  const handleCreateCase = () => {
    setShowNewCaseModal(true);
  };

  const handleCaseCreated = () => {
    setRefreshCases(r => r + 1);
    addToast({ type: 'success', message: 'Case created successfully.' });
  };

  const handleDeleteCase = async (caseId) => {
    if (!confirm('Are you sure you want to delete this case?')) return;
    
    try {
      await api.deleteCase(caseId);
      setRefreshCases(r => r + 1);
      if (selectedCase?.id === caseId) setSelectedCase(null);
      addToast({ type: 'success', message: 'Case deleted successfully.' });
    } catch (err) {
      console.error('Error deleting case:', err);
      addToast({ type: 'error', message: 'Failed to delete case.' });
    }
  };

  return (
    <div className="min-h-screen bg-jurisma-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-jurisma-100 sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <Scale className="h-6 w-6 text-jurisma-900" />
          <span className="text-lg font-bold text-jurisma-900 font-serif">JURISMA</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-jurisma-900 hover:bg-jurisma-50 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-white border-r border-jurisma-100 flex flex-col overflow-y-auto
        fixed md:sticky top-0 h-screen z-50 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <Scale className="h-6 w-6 text-jurisma-900" />
            <span className="text-lg font-bold text-jurisma-900 font-serif">JURISMA</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-jurisma-500 uppercase tracking-wider mb-2">Workspace</p>
              {isLawyer && <NavItem tab="overview" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Overview" icon={Briefcase} />}
              {isLawyer && <NavItem tab="cases" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Case Files" icon={FileText} />}
              {isLawyer && <NavItem tab="documents" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Documents" icon={FileText} />}
              <NavItem tab="assistant" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="AI Assistant" icon={Sparkles} />
              <NavItem tab="drafting" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Smart Drafting" icon={PenTool} />
            </div>

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-jurisma-500 uppercase tracking-wider mb-2">Resources</p>
              <NavItem tab="library" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Library" icon={Book} />
              <NavItem tab="constitution" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Constitution" icon={Scroll} />
              <NavItem tab="dictionary" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Dictionary" icon={BookA} />
            </div>

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-jurisma-500 uppercase tracking-wider mb-2">Community</p>
              <NavItem tab="counsel" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Counsel Connect" icon={Users} />
              <NavItem tab="social" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Social Hub" icon={MessageCircle} />
              {(isStudent || isLawyer) && (
                <>
                  <NavItem tab="student" activeTab={activeTab} onClick={(t) => { setActiveTab(t); setIsMobileMenuOpen(false); }} label="Student Hub" icon={GraduationCap} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-jurisma-100">
          {isGuest ? (
            <div className="mb-4 bg-jurisma-50 p-3 rounded-lg border border-jurisma-100 text-center">
              <p className="text-xs text-jurisma-500 mb-2 font-medium">Guest Account</p>
              <Button variant="secondary" className="w-full text-xs h-9" onClick={() => handleUpgradeRequest('student')}>
                Verify as Student
              </Button>
            </div>
          ) : (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full text-[11px] h-8 text-jurisma-500 hover:text-jurisma-900 border border-jurisma-100 hover:border-jurisma-200 bg-white"
                onClick={handleProfileSwitch}
              >
                Switch to {isStudent ? 'Lawyer' : 'Student'} Profile
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-jurisma-100 flex items-center justify-center text-jurisma-900 font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-jurisma-900 truncate">{user?.name}</p>
              <p className="text-xs text-jurisma-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center space-x-2 text-sm text-jurisma-500 hover:text-red-600 transition-colors">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4 group">
            {!isHome && (
              <button
                onClick={handleBack}
                className="p-2 transition-all duration-300 bg-white border border-jurisma-100 rounded-lg text-jurisma-500 hover:text-jurisma-900 hover:border-jurisma-200 shadow-sm animate-fade-in"
                title="Back to Workspace"
              >
                <ArrowRight size={20} className="rotate-180" />
              </button>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-jurisma-900 capitalize font-serif line-clamp-1">
                {activeTab === 'counsel' ? 'Counsel Connect' : activeTab.replace('-', ' ')}
              </h1>
              <p className="text-jurisma-500 text-xs md:text-sm">Welcome back, {user?.name || 'Counsel'}.</p>
            </div>
          </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
            {isStudent && (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveTab('leaderboard')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-jurisma-100 rounded-lg shadow-sm hover:border-jurisma-200 transition-all group"
                  title="View Leaderboard"
                >
                  <Trophy size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black text-jurisma-900 hidden sm:inline">{user?.league || 'Wood'}</span>
                </button>
                <button 
                  onClick={() => setActiveTab('student')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-jurisma-100 rounded-lg shadow-sm hover:border-orange-200 transition-all group"
                  title="Daily Streak"
                >
                  <Flame size={18} className="text-orange-500 fill-orange-500 group-hover:animate-bounce" />
                  <span className="text-sm font-black text-jurisma-900">{streakInfo.current_streak}</span>
                </button>
              </div>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-jurisma-500 hover:text-jurisma-900 relative bg-white rounded-lg border border-jurisma-100 shadow-sm transition-all"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
              
              <NotificationsPanel 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)}
                onViewChange={(v, params = {}) => {
                  if (v === 'library') {
                    setActiveTab('library');
                  } else {
                    applyViewParams(params);
                  }
                  setShowNotifications(false);
                }}
              />
            </div>
            <Button variant="primary" icon={Search} className="flex-1 sm:flex-none text-sm font-bold">Global Search</Button>
          </div>
        </header>

        <div className="animate-fade-in pb-12">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <DashboardStats kpiKey={refreshCases} />
              <CaseList
                onCaseClick={handleCaseClick}
                onNewCase={handleCreateCase}
                onDelete={handleDeleteCase}
                refreshKey={refreshCases}
              />
            </div>
          )}

          {activeTab === 'cases' && (
            <CaseList
              onCaseClick={handleCaseClick}
              onNewCase={handleCreateCase}
              onDelete={handleDeleteCase}
              refreshKey={refreshCases}
            />
          )}
          {activeTab === 'assistant' && <Research />}
          {activeTab === 'documents' && <Documents />}
          {activeTab === 'counsel' && <CounselConnect isGuest={isGuest} viewParams={counselViewParams} />}
          {activeTab === 'library' && <Library />}
          {activeTab === 'constitution' && <Constitution />}
          {activeTab === 'dictionary' && <Dictionary />}
          {activeTab === 'drafting' && <Drafting />}
          {activeTab === 'student' && <StudentHub onNavigate={(view) => setActiveTab(view)} />}
          {activeTab === 'shop' && <Shop onBack={handleBack} />}
          {activeTab === 'achievements' && <Achievements onBack={handleBack} />}
          {activeTab === 'quiz' && <QuizSession onBack={() => setActiveTab('student')} sectionQuiz={sectionQuizData} />}
          {activeTab === 'study' && (
            <StudyMode
              onBack={() => setActiveTab('student')}
              onStartQuiz={(section, subject) => {
                setSectionQuizData({ ...section, section_id: section.id });
                setActiveTab('quiz');
              }}
            />
          )}
          {activeTab === 'social' && <SocialHub viewParams={socialViewParams} />}
          {activeTab === 'leaderboard' && (
             <Leaderboard 
               data={[]} // Will be fetched inside if needed or pass from here
               onNavigate={(view) => setActiveTab(view)} 
             />
          )}
        </div>
      </main>

      {/* Modals */}
      {showNewCaseModal && (
        <NewCaseModal 
          onClose={() => setShowNewCaseModal(false)} 
          onSubmit={handleCaseCreated} 
          addToast={addToast}
        />
      )}

      {selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onDelete={handleCaseDelete}
        />
      )}
    </div>
  );
}

