import React, { useState, useEffect, useMemo } from 'react';
import { Submission, Language, FilterState } from '../types';
import { translations } from '../i18n/translations';
import {
  adminLogin,
  adminLogout,
  getAdminSession,
  fetchSubmissions,
  isSupabaseConfigured,
  clearSampleSubmissions,
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
  XCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
  KeyRound,
  AlertCircle,
  Trash2,
  Calendar,
  Briefcase,
  Mail,
  Building2,
  Plus,
  RotateCcw,
  Check,
  X,
  UserCheck,
  Sparkles,
  Pencil,
} from 'lucide-react';

interface AdminDashboardProps {
  currentLang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const hasSupabase = isSupabaseConfigured();

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
    if (window.confirm(currentLang === 'ru' ? 'Удалить все тестовые ответы?' : 'Remove all sample preview records?')) {
      clearSampleSubmissions();
      loadData();
    }
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
        String(sub.guest_count || '').includes(searchLower);

      // Join Filter
      let matchesJoin = true;
      if (filters.joinFilter === 'YES') {
        matchesJoin = sub.join.includes('YES');
      } else if (filters.joinFilter === 'No') {
        matchesJoin = sub.join.includes('No');
      }

      // Locale Filter
      let matchesLocale = true;
      if (filters.localeFilter !== 'ALL') {
        matchesLocale = sub.locale === filters.localeFilter;
      }

      return matchesSearch && matchesJoin && matchesLocale;
    });
  }, [submissions, filters.search, filters.joinFilter, filters.localeFilter]);

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
      .filter((s) => s.join.includes('YES') && (s.has_guest || (s.guest_count || 0) > 0))
      .reduce((sum, s) => sum + (Number(s.guest_count) || 0), 0);

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
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200 overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-slate-900 via-emerald-800 to-slate-900" />
          <div className="p-8">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800 mb-6 ring-4 ring-slate-50">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t.adminLoginTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 mb-6">
              {t.adminLoginSubtitle}
            </p>

            {loginError && (
              <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.adminEmailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.adminPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {loginLoading ? (
                  <span>{t.adminLoggingIn}</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-emerald-400" />
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
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>National Day 2026</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t.adminTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">{t.adminSubtitle}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[200px]">
                  {adminEmail || t.administrator}
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-none">Online &bull; Admin</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-all shadow-sm"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.adminLogoutButton}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'submissions'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>{t.tabSubmissions}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'submissions'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {submissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('organisations')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'organisations'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>{t.tabOrganisations}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'organisations'
                  ? 'bg-emerald-100 text-emerald-800'
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-600 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          title="Refresh Data"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {activeTab === 'organisations' ? (
        /* ========================================================================= */
        /* DYNAMIC ORGANISATIONS MANAGEMENT VIEW                                    */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Add Organisation Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>{t.manageOrganisations}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organisations added here dynamically update the public confirmation form dropdown.
                </p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                {t.organisationsCount(organisations.length)}
              </span>
            </div>

            <form onSubmit={handleAddOrg} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder={t.addOrganisationPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!newOrgName.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex-shrink-0"
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

          {/* Compact Organisations Directory Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Search and Reset Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder={t.searchOrganisationsPlaceholder}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-white"
                />
                {orgSearch && (
                  <button
                    onClick={() => setOrgSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 justify-between sm:justify-end">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredOrganisations.length} of {organisations.length}
                </span>
                <button
                  type="button"
                  onClick={handleResetDemoOrgs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold shadow-sm transition-colors"
                  title="Reset to 20 default demo organisations"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.resetDemoOrganisations}</span>
                </button>
              </div>
            </div>

            {/* Compact Grid Layout - eliminates excessive vertical scrolling */}
            {filteredOrganisations.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="text-slate-500 text-sm font-semibold">{t.noOrganisationsFound}</div>
                {orgSearch && (
                  <button
                    onClick={() => setOrgSearch('')}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {filteredOrganisations.map((org, index) => {
                    const isEditing = editingOrg === org;
                    return (
                      <div
                        key={org}
                        className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all bg-white shadow-xs ${
                          isEditing
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 border border-emerald-200">
                              {String(index + 1).padStart(2, '0')}
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
                              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-emerald-300 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditOrg(org)}
                              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex-shrink-0"
                              title="Save changes (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditOrg}
                              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0"
                              title="Cancel (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 border border-emerald-100">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={org}>
                                {org}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditOrg(org)}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors opacity-80 group-hover:opacity-100"
                                title={`Edit "${org}"`}
                                aria-label={`Edit ${org}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOrg(org)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100"
                                title={`Delete "${org}"`}
                                aria-label={`Delete ${org}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SUBMISSIONS MANAGEMENT VIEW                                               */
        /* ========================================================================= */
        <>
          {/* Developer Diagnostic Alert (DEV MODE ONLY) */}
          {import.meta.env.DEV && !hasSupabase && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Developer Mode:</strong> Supabase environment variables not configured. Submissions are stored in local storage for local testing. Set <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> to connect live database.
                </span>
              </div>
            </div>
          )}

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

          {/* Modern 4-Card Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Total Submissions */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {t.totalSubmissions}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {stats.total}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Total RSVPs received
                </div>
              </div>
            </div>

            {/* Confirmed Attending */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                  {t.attendingCount}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    {stats.attending}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {stats.total > 0 ? Math.round((stats.attending / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-[11px] text-emerald-600/80 font-medium mt-0.5">
                  Confirmed primary guests
                </div>
              </div>
            </div>

            {/* Total Headcount (Attending + Accompanied Guests) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-teal-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                  Total Headcount
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-teal-800 tracking-tight">
                  {stats.attending + stats.totalGuests}
                </div>
                <div className="text-[11px] text-teal-600 font-medium mt-0.5">
                  {stats.attending} primary + {stats.totalGuests} guests
                </div>
              </div>
            </div>

            {/* Declined Invitations */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                  {t.notAttendingCount}
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                  {stats.declined}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Declined invitations
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Data Center */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Unified Command & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3.5 bg-slate-50/40">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-10 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-white"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters({ ...filters, search: '', page: 1 })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Export Buttons and Data Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                  {hasSampleData && (
                    <button
                      onClick={handleClearSampleData}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors"
                      title="Remove mock/sample submissions"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>{t.removeSampleData}</span>
                    </button>
                  )}

                  <button
                    onClick={() => exportToCSV(sortedSubmissions, currentLang)}
                    disabled={sortedSubmissions.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                    title={t.exportCsv}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t.exportCsv}</span>
                  </button>

                  <button
                    onClick={() => exportToExcel(sortedSubmissions, currentLang)}
                    disabled={sortedSubmissions.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
                    title={t.exportExcel}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                    <span>{t.exportExcel}</span>
                  </button>
                </div>
              </div>

              {/* Filter Pills & Counters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-400 font-medium">{t.filterJoin}:</span>
                    <select
                      value={filters.joinFilter}
                      onChange={(e) => setFilters({ ...filters, joinFilter: e.target.value as any, page: 1 })}
                      className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">{t.filterAll}</option>
                      <option value="YES">YES (Attending)</option>
                      <option value="No">No (Declined)</option>
                    </select>
                  </div>

                  {/* Language Dropdown */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-400 font-medium">{t.filterLanguage}:</span>
                    <select
                      value={filters.localeFilter}
                      onChange={(e) => setFilters({ ...filters, localeFilter: e.target.value as any, page: 1 })}
                      className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Languages</option>
                      <option value="en">English (EN)</option>
                      <option value="ru">Russian (RU)</option>
                    </select>
                  </div>

                  {/* Clear Filter Shortcut */}
                  {(filters.search || filters.joinFilter !== 'ALL' || filters.localeFilter !== 'ALL') && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          search: '',
                          joinFilter: 'ALL',
                          localeFilter: 'ALL',
                          page: 1,
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>

                {/* Record Counter */}
                <div className="text-slate-500 font-medium text-xs">
                  {t.showingRecords(
                    totalRecords === 0 ? 0 : startIndex + 1,
                    Math.min(startIndex + filters.pageSize, totalRecords),
                    totalRecords
                  )}
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
                    <div key={sub.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(sub.created_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {isAttending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>YES</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>No</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                        {sub.email && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-mono mt-0.5">
                            <Mail className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span className="break-all">{sub.email}</span>
                          </div>
                        )}
                        {sub.organisation && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium mt-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{sub.organisation}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{sub.job_title}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          {guestCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Users className="w-3 h-3 text-emerald-600" />
                              <span>+{guestCount} guests</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No guests</span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            {sub.locale}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.viewDetails}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (≥ 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th
                      onClick={() => toggleSort('created_at')}
                      className="py-3 px-4 cursor-pointer hover:text-emerald-700 transition-colors select-none min-w-[140px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colDate}</span>
                        {filters.sortBy === 'created_at' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('name')}
                      className="py-3 px-4 cursor-pointer hover:text-emerald-700 transition-colors select-none min-w-[160px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colName}</span>
                        {filters.sortBy === 'name' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('organisation')}
                      className="py-3 px-4 cursor-pointer hover:text-emerald-700 transition-colors select-none min-w-[160px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colOrganisation}</span>
                        {filters.sortBy === 'organisation' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('job_title')}
                      className="py-3 px-4 cursor-pointer hover:text-emerald-700 transition-colors select-none min-w-[150px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colJobTitle}</span>
                        {filters.sortBy === 'job_title' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4 min-w-[110px]">{t.colJoin}</th>

                    <th
                      onClick={() => toggleSort('guest_count')}
                      className="py-3 px-4 cursor-pointer hover:text-emerald-700 transition-colors select-none min-w-[100px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.colGuest}</span>
                        {filters.sortBy === 'guest_count' ? (
                          filters.sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4 min-w-[70px]">{t.colLanguage}</th>
                    <th className="py-3 px-4 text-right min-w-[110px]">{t.colActions}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {loadingData ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading submissions...
                      </td>
                    </tr>
                  ) : paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
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
                          className="hover:bg-emerald-50/40 transition-colors group"
                        >
                          {/* Date Column */}
                          <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {new Date(sub.created_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(sub.created_at).toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          {/* Attendee Name & Email */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{sub.name}</span>
                              {sub.is_sample && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  {t.sampleBadge}
                                </span>
                              )}
                            </div>
                            {sub.email && (
                              <div className="text-xs text-slate-500 font-mono truncate max-w-[180px]">
                                {sub.email}
                              </div>
                            )}
                          </td>

                          {/* Organisation */}
                          <td className="py-3.5 px-4 text-slate-800 font-semibold max-w-[180px] truncate" title={sub.organisation || 'None'}>
                            {sub.organisation ? (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{sub.organisation}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-normal">&mdash;</span>
                            )}
                          </td>

                          {/* Job Title / Role */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={sub.job_title}>
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{sub.job_title}</span>
                            </div>
                          </td>

                          {/* Attendance Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isAttending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>YES</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>No</span>
                              </span>
                            )}
                          </td>

                          {/* Guest Count */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {guestCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Users className="w-3 h-3 text-emerald-600" />
                                <span>+{guestCount}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-medium">0</span>
                            )}
                          </td>

                          {/* Locale */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {sub.locale}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-all shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t.viewDetails}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-800">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={currentPage <= 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
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
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
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
