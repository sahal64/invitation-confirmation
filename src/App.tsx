import React, { useState, useEffect } from 'react';
import { Language } from './types';
import { Header } from './components/Header';
import { PublicForm } from './components/PublicForm';
import { AdminDashboard } from './components/AdminDashboard';
import { translations } from './i18n/translations';

const getInitialView = (): 'form' | 'admin' => {
  if (typeof window !== 'undefined') {
    if (window.location.hash === '#admin' || window.location.search.includes('admin')) {
      return 'admin';
    }
  }
  return 'form';
};

export const App: React.FC = () => {
  // Read stored language or default to 'en'
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem('form_locale');
    return saved === 'ru' ? 'ru' : 'en';
  });

  const [view, setView] = useState<'form' | 'admin'>(getInitialView);

  // Sync hash routing for private admin access
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.hash === '#admin' || window.location.search.includes('admin')) {
        setView('admin');
      } else {
        setView('form');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('form_locale', currentLang);
    document.title = translations[currentLang].formTitle;
  }, [currentLang]);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
  };

  const handleViewChange = (newView: 'form' | 'admin') => {
    setView(newView);
    if (newView === 'admin') {
      window.location.hash = 'admin';
    } else {
      if (window.location.hash === '#admin') {
        history.pushState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col text-slate-900 selection:bg-[#9E7B9E] selection:text-white relative overflow-x-hidden ${
        view === 'form'
          ? 'bg-[#7A4565]'
          : 'bg-gradient-to-b from-[#f2f8f4] via-[#f7faf8] to-[#edf6f2]'
      }`}
    >
      {/* Background Decorative Theme Layers */}
      {view === 'form' ? (
        /* Full-page National Day 2026 Background (Public Form Page Only) */
        <div
          className="fixed inset-0 pointer-events-none select-none z-0 form-page-bg"
          aria-hidden="true"
        />
      ) : (
        /* Admin Background Accents */
        <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(#059669_0.75px,transparent_0.75px)] [background-size:26px_26px] opacity-[0.035]" />
          <div className="absolute -top-32 -right-32 w-96 h-96 sm:w-[520px] sm:h-[520px] rounded-full bg-emerald-200/25 blur-3xl" />
          <div className="absolute top-[380px] -left-36 w-80 h-80 sm:w-[460px] sm:h-[460px] rounded-full bg-teal-200/15 blur-3xl" />
          <div className="absolute -bottom-24 right-1/4 w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full bg-emerald-100/35 blur-3xl" />
        </div>
      )}

      {/* Header Bar with the single authoritative Language Switcher */}
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        view={view}
        onViewChange={handleViewChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 relative z-10">
        {view === 'form' ? (
          <PublicForm currentLang={currentLang} />
        ) : (
          <AdminDashboard currentLang={currentLang} />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm py-6 text-center text-xs text-slate-500 no-print relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            &copy; {new Date().getFullYear()} National Day Celebration &bull; Official Event Confirmation Portal
          </p>
          <p className="text-slate-400">
            25-11-2026 &bull; 6:00 PM – 10:00 PM
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
