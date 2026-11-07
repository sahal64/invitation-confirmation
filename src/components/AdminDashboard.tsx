import React, { useState, useEffect, useMemo } from 'react';
import { Submission, Language, FilterState } from '../types';
import { translations } from '../i18n/translations';
import {
  adminLogin,
  adminLogout,
  getAdminSession,
  fetchSubmissions,
  clearSampleSubmissions,
  deleteSubmission,
} from '../services/supabase';
import { exportToCSV, exportToExcel } from '../utils/export';
import { PrintRecordModal } from './PrintRecordModal';
import {
  getOrganisations,
  addOrganisation,
  updateOrganisation,
  deleteOrganisation,
  resetDemoOrganisations,
} from '../services/organisations';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  LogOut,
  Users,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
  KeyRound,
  AlertCircle,
  Trash2,
  Building2,
  Plus,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  currentLang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Active Tab: Submissions or Dynamic Organisation Management
  const [activeTab, setActiveTab] = useState<'submissions' | 'organisations'>('submissions');

  // Organisations Management State
  const [organisations, setOrganisations] = useState<string[]>(() => getOrganisations());
  const [newOrgName, setNewOrgName] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [orgFeedback, setOrgFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync organisations if updated elsewhere
  useEffect(() => {
    const handleUpdate = () => {
      setOrganisations(getOrganisations());
    };
    window.addEventListener('organisations-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('organisations-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleAddOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const res = addOrganisation(newOrgName);
    if (res.success) {
      setOrganisations(res.list);
      setNewOrgName('');
      setOrgFeedback({ type: 'success', message: `Added "${newOrgName.trim()}" successfully!` });
      setTimeout(() => setOrgFeedback(null), 3000);
    } else {
      setOrgFeedback({ type: 'error', message: res.error || 'Failed to add organisation.' });
      setTimeout(() => setOrgFeedback(null), 4000);
    }
  };

  // Inline Organisation Editing
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editingOrgValue, setEditingOrgValue] = useState('');

  const handleStartEditOrg = (org: string) => {
    setEditingOrg(org);
    setEditingOrgValue(org);
  };

  const handleCancelEditOrg = () => {
    setEditingOrg(null);
    setEditingOrgValue('');
  };

  const handleSaveEditOrg = (oldName: string) => {
    const trimmed = editingOrgValue.trim();
    if (!trimmed) {
      setOrgFeedback({ type: 'error', message: 'Organisation name cannot be empty.' });
      return;
    }
    const res = updateOrganisation(oldName, trimmed);
    if (res.success) {
      setOrganisations(res.list);
      setEditingOrg(null);
      setEditingOrgValue('');
      setOrgFeedback({ type: 'success', message: `Updated to "${trimmed}" successfully!` });
      setTimeout(() => setOrgFeedback(null), 3000);
    } else {
      setOrgFeedback({ type: 'error', message: res.error || 'Failed to update organisation.' });
      setTimeout(() => setOrgFeedback(null), 4000);
    }
  };

  const handleDeleteOrg = (org: string) => {
    if (window.confirm(`${t.deleteOrganisationConfirm}\n"${org}"`)) {
      if (editingOrg === org) {
        setEditingOrg(null);
        setEditingOrgValue('');
      }
      const updated = deleteOrganisation(org);
      setOrganisations(updated);
    }
  };

  const handleResetDemoOrgs = () => {
    if (window.confirm('Reset the list to the default 20 demo organisations?')) {
      const updated = resetDemoOrganisations();
      setOrganisations(updated);
      setOrgFeedback({ type: 'success', message: 'Reset to 20 demo organisations successfully!' });
      setTimeout(() => setOrgFeedback(null), 3000);
    }
  };

  const filteredOrganisations = useMemo(() => {
    if (!orgSearch.trim()) return organisations;
    const q = orgSearch.toLowerCase().trim();
    return organisations.filter((org) => org.toLowerCase().includes(q));
  }, [organisations, orgSearch]);

  // Filters, Search, Sort & Pagination
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    joinFilter: 'ALL',
    localeFilter: 'ALL',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    pageSize: 8,
  });

  // Check existing session on mount
  useEffect(() => {
    async function checkAuth() {
      const session = await getAdminSession();
      if (session.isAuthenticated) {
        setIsAuthenticated(true);
        setAdminEmail(session.email || '');
        loadData();
      } else {
        setIsAuthenticated(false);
        setLoadingData(false);
      }
    }
    checkAuth();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    setDataError('');
    const res = await fetchSubmissions();
    if (res.error) {
      setDataError(res.error);
    }
    setSubmissions(res.data);
    setLoadingData(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const res = await adminLogin(loginEmail, loginPassword);
    if (res.success) {
      setIsAuthenticated(true);
      setAdminEmail(res.user?.email || loginEmail.trim());
      await loadData();
    } else {
      setLoginError(res.error || 'Failed to authenticate');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setAdminEmail('');
    setLoginPassword('');
  };

  const handleClearSampleData = () => {
    if (window.confirm('Remove all sample preview records?')) {
      clearSampleSubmissions();
      loadData();
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSubmission = async (sub: Submission) => {
    const confirmMsg = `Are you sure you want to delete the submission for "${sub.name}"? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(sub.id);
    const res = await deleteSubmission(sub.id);
    if (res.success) {
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    } else {
      alert(`Failed to delete submission: ${res.error || 'Unknown error'}`);
    }
    setDeletingId(null);
  };

  // Has sample data?
  const hasSampleData = useMemo(() => {
    return submissions.some((s) => s.is_sample);
  }, [submissions]);

  // Filter, Search, and Sort Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Search
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        !filters.search ||
        sub.name.toLowerCase().includes(searchLower) ||
        (sub.organisation || '').toLowerCase().includes(searchLower) ||
        (sub.email || '').toLowerCase().includes(searchLower) ||
        sub.job_title.toLowerCase().includes(searchLower) ||
        String(sub.guest_count || '').includes(searchLower) ||
        (sub.guests || []).some(
          (g) =>
            g.name.toLowerCase().includes(searchLower) ||
            (g.organisation || '').toLowerCase().includes(searchLower) ||
            g.job_title.toLowerCase().includes(searchLower)
        );

      // Join Filter
      let matchesJoin = true;
      if (filters.joinFilter === 'YES') {
        matchesJoin = sub.join.includes('YES');
      } else if (filters.joinFilter === 'No') {
        matchesJoin = sub.join.includes('No');
      }

      return matchesSearch && matchesJoin;
    });
  }, [submissions, filters.search, filters.joinFilter]);

  const sortedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'created_at') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (filters.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filters.sortBy === 'organisation') {
        comparison = (a.organisation || '').localeCompare(b.organisation || '');
      } else if (filters.sortBy === 'job_title') {
        comparison = a.job_title.localeCompare(b.job_title);
      } else if (filters.sortBy === 'guest_count') {
        comparison = (a.guest_count || 0) - (b.guest_count || 0);
      }
      return filters.sortOrder === 'desc' ? comparison : -comparison;
    });
  }, [filteredSubmissions, filters.sortBy, filters.sortOrder]);

  // Pagination
  const totalRecords = sortedSubmissions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / filters.pageSize));
  const currentPage = Math.min(filters.page, totalPages);
  const startIndex = (currentPage - 1) * filters.pageSize;
  const paginatedSubmissions = sortedSubmissions.slice(startIndex, startIndex + filters.pageSize);

  // Statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const attending = submissions.filter((s) => s.join.includes('YES')).length;
    const declined = submissions.filter((s) => s.join.includes('No')).length;
    const totalGuests = submissions
      .filter((s) => s.join.includes('YES') && (s.has_guest || (s.guest_count || 0) > 0 || (s.guests && s.guests.length > 0)))
      .reduce((sum, s) => sum + Math.max(Number(s.guest_count) || 0, s.guests?.length || 0), 0);

    return { total, attending, declined, totalGuests };
  }, [submissions]);

  // Handle Sort Toggle
  const toggleSort = (field: 'created_at' | 'name' | 'organisation' | 'job_title' | 'guest_count') => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  // ---------------------------------------------------------------------------
  // AUTHENTICATION VIEW (IF NOT SIGNED IN)
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-6 shadow-xs">
              <Lock className="w-5 h-5 text-white" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.adminLoginTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
              {t.adminLoginSubtitle}
            </p>

            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.adminEmailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.adminPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm transition-all bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                {loginLoading ? (
                  <span>{t.adminLoggingIn}</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-slate-300" />
                    <span>{t.adminLoginButton}</span>
                  </>
                )}
              </button>
            </form>

            {/* Dev helper only visible in local development */}
            {import.meta.env.DEV && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@event.local');
                    setLoginPassword('admin123');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs transition-colors"
                >
                  Quick Fill Test Credentials (admin@event.local / admin123)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.adminTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.adminSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0">
              {adminEmail ? adminEmail[0].toUpperCase() : 'A'}
            </div>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {adminEmail || t.administrator}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors shadow-xs active:scale-95"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.adminLogoutButton}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'submissions'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>{t.tabSubmissions}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'submissions'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {submissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('organisations')}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'organisations'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>{t.tabOrganisations}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'organisations'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {organisations.length}
            </span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loadingData}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 active:scale-95 flex-shrink-0"
          title="Refresh Data"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-slate-700' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {activeTab === 'organisations' ? (
        /* ========================================================================= */
        /* ORGANISATIONS MANAGEMENT VIEW                                             */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Add Organisation Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {t.manageOrganisations}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organisations added here dynamically update the public confirmation form dropdown.
                </p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                {t.organisationsCount(organisations.length)}
              </span>
            </div>

            <form onSubmit={handleAddOrg} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder={t.addOrganisationPlaceholder}
                className="flex-1 h-11 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!newOrgName.trim()}
                className="h-11 inline-flex items-center justify-center gap-1.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex-shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addOrganisationButton}</span>
              </button>
            </form>

            {orgFeedback && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  orgFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {orgFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{orgFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Clean Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-full sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder={t.searchOrganisationsPlaceholder}
                  className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs sm:text-sm bg-white"
                />
                {orgSearch && (
                  <button
                    onClick={() => setOrgSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredOrganisations.length} of {organisations.length}
                </span>
                <button
                  type="button"
                  onClick={handleResetDemoOrgs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors active:scale-95"
                  title="Reset to 20 default demo organisations"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.resetDemoOrganisations}</span>
                </button>
              </div>
            </div>

            {/* Structured Table */}
            {filteredOrganisations.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="text-slate-500 text-sm font-semibold">{t.noOrganisationsFound}</div>
                {orgSearch && (
                  <button
                    onClick={() => setOrgSearch('')}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrganisations.map((org, index) => {
                  const isEditing = editingOrg === org;
                  return (
                    <div
                      key={org}
                      className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xs font-mono font-bold text-slate-400 w-6 flex-shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={editingOrgValue}
                            onChange={(e) => setEditingOrgValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEditOrg(org);
                              } else if (e.key === 'Escape') {
                                handleCancelEditOrg();
                              }
                            }}
                            autoFocus
                            className="flex-1 h-9 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditOrg(org)}
                            className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                            title="Save changes (Enter)"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditOrg}
                            className="h-9 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                            title="Cancel (Esc)"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-xs font-mono font-bold text-slate-400 w-6 flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 truncate" title={org}>
                              {org}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditOrg(org)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
                              title={`Edit "${org}"`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrg(org)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-medium transition-colors"
                              title={`Delete "${org}"`}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SUBMISSIONS MANAGEMENT VIEW                                               */
        /* ========================================================================= */
        <>
          {/* Database Error Banner */}
          {dataError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>Database Notice:</strong> {dataError}
                </span>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Executive 4-Card Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Submissions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t.totalSubmissions}
              </span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stats.total}
                </span>
                <span className="text-xs font-medium text-slate-400">Total RSVPs</span>
              </div>
            </div>

            {/* Confirmed Attending */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t.attendingCount}
              </span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
                  {stats.attending}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {stats.total > 0 ? Math.round((stats.attending / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Total Headcount */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Headcount
              </span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stats.attending + stats.totalGuests}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {stats.attending} primary + {stats.totalGuests} guests
                </span>
              </div>
            </div>

            {/* Declined Invitations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t.notAttendingCount}
              </span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-700 tracking-tight">
                  {stats.declined}
                </span>
                <span className="text-xs font-medium text-slate-400">Declined</span>
              </div>
            </div>
          </div>

          {/* Submissions Data Center */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Unified Command & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 bg-slate-50/40">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 w-full lg:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                    placeholder={t.searchPlaceholder}
                    className="w-full h-10 pl-10 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs sm:text-sm bg-white"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters({ ...filters, search: '', page: 1 })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  {hasSampleData && (
                    <button
                      onClick={handleClearSampleData}
                      className="col-span-2 sm:col-span-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors active:scale-95"
                      title="Remove mock/sample submissions"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>{t.removeSampleData}</span>
                    </button>
                  )}

                  <button
                    onClick={() => exportToCSV(sortedSubmissions, currentLang)}
                    disabled={sortedSubmissions.length === 0}
                    className="h-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors active:scale-95"
                    title={t.exportCsv}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t.exportCsv}</span>
                  </button>

                  <button
                    onClick={() => exportToExcel(sortedSubmissions, currentLang)}
                    disabled={sortedSubmissions.length === 0}
                    className="h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
                    title={t.exportExcel}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                    <span>{t.exportExcel}</span>
                  </button>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 text-xs">
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs w-full sm:w-auto">
                    <span className="text-slate-400 font-medium text-xs">{t.filterJoin}:</span>
                    <select
                      value={filters.joinFilter}
                      onChange={(e) => setFilters({ ...filters, joinFilter: e.target.value as any, page: 1 })}
                      className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs w-full sm:w-auto"
                    >
                      <option value="ALL">{t.filterAll}</option>
                      <option value="YES">YES (Attending)</option>
                      <option value="No">No (Declined)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  {(filters.search || filters.joinFilter !== 'ALL') && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          search: '',
                          joinFilter: 'ALL',
                          page: 1,
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}

                  <div className="text-slate-500 font-medium text-xs ml-auto">
                    {t.showingRecords(
                      totalRecords === 0 ? 0 : startIndex + 1,
                      Math.min(startIndex + filters.pageSize, totalRecords),
                      totalRecords
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Responsive Submissions List (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loadingData ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading submissions...
                </div>
              ) : paginatedSubmissions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {t.noSubmissionsFound}
                </div>
              ) : (
                paginatedSubmissions.map((sub) => {
                  const isAttending = sub.join.includes('YES');
                  const guestCount = Number(sub.guest_count) || 0;
                  return (
                    <div key={sub.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          {new Date(sub.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>

                        {isAttending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>YES</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>No</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{sub.name}</span>
                          {sub.is_sample && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              {t.sampleBadge}
                            </span>
                          )}
                        </div>
                        {sub.organisation && (
                          <div className="text-xs text-slate-700 font-medium mt-1">
                            {sub.organisation}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sub.job_title}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
                        <div>
                          {guestCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                              +{guestCount} guests
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">0 guests</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs transition-colors shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t.viewDetails}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(sub)}
                            disabled={deletingId === sub.id}
                            className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                            title="Delete submission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (≥ 768px) - Clean, Uncluttered */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th
                      onClick={() => toggleSort('created_at')}
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none min-w-[140px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colDate}</span>
                        {filters.sortBy === 'created_at' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('name')}
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none min-w-[160px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colName}</span>
                        {filters.sortBy === 'name' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('organisation')}
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none min-w-[160px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colOrganisation}</span>
                        {filters.sortBy === 'organisation' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('job_title')}
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none min-w-[150px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colJobTitle}</span>
                        {filters.sortBy === 'job_title' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4 min-w-[110px]">{t.colJoin}</th>

                    <th
                      onClick={() => toggleSort('guest_count')}
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none min-w-[100px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colGuest}</span>
                        {filters.sortBy === 'guest_count' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4 text-right min-w-[110px]">{t.colActions}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading submissions...
                      </td>
                    </tr>
                  ) : paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {t.noSubmissionsFound}
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map((sub) => {
                      const isAttending = sub.join.includes('YES');
                      const guestCount = Number(sub.guest_count) || 0;
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          {/* Date Column */}
                          <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {new Date(sub.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(sub.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          {/* Attendee Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{sub.name}</span>
                              {sub.is_sample && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  {t.sampleBadge}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Organisation - Clean Plain Text */}
                          <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px] truncate" title={sub.organisation || 'None'}>
                            {sub.organisation ? (
                              <span className="truncate">{sub.organisation}</span>
                            ) : (
                              <span className="text-slate-300">&mdash;</span>
                            )}
                          </td>

                          {/* Job Title - Clean Plain Text */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={sub.job_title}>
                            <span className="truncate">{sub.job_title}</span>
                          </td>

                          {/* Attendance Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isAttending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>YES</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <span>No</span>
                              </span>
                            )}
                          </td>

                          {/* Guest Count */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {guestCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                                +{guestCount} guests
                              </span>
                            ) : (
                              <span className="text-slate-300 font-medium">&mdash;</span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSubmission(sub)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors shadow-xs"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{t.viewDetails}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSubmission(sub)}
                                disabled={deletingId === sub.id}
                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
                                title="Delete submission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium text-center">
                Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-800">{totalPages}</span>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={currentPage <= 1}
                  className={`inline-flex items-center justify-center gap-1 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    currentPage <= 1
                      ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t.prevPage}</span>
                </button>

                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                  disabled={currentPage >= totalPages}
                  className={`inline-flex items-center justify-center gap-1 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    currentPage >= totalPages
                      ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'
                  }`}
                >
                  <span>{t.nextPage}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Printable / Detail Modal */}
      <PrintRecordModal
        submission={selectedSubmission}
        currentLang={currentLang}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
};
