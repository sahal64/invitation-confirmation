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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f2f8f4] via-[#f7faf8] to-[#edf6f2] text-slate-900 selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Background Decorative Celebration Theme Accents */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
        {/* Subtle Micro-Pattern Grid Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#059669_0.75px,transparent_0.75px)] [background-size:26px_26px] opacity-[0.035]" />

        {/* Soft Ambient Celebration Glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 sm:w-[520px] sm:h-[520px] rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute top-[380px] -left-36 w-80 h-80 sm:w-[460px] sm:h-[460px] rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full bg-emerald-100/35 blur-3xl" />

        {/* Subtle Geometric Celebration Emblem - Top Left (Desktop) */}
        <svg
          className="hidden lg:block absolute top-24 left-6 xl:left-14 w-44 h-44 text-emerald-800/[0.045]"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        >
          <circle cx="50" cy="50" r="46" strokeDasharray="2 3" />
          <polygon points="50,6 63,37 94,50 63,63 50,94 37,63 6,50 37,37" />
          <polygon points="50,16 59,41 84,50 59,59 50,84 41,59 16,50 41,41" />
          <circle cx="50" cy="50" r="14" />
          <circle cx="50" cy="50" r="3.5" fill="currentColor" />
        </svg>

        {/* Subtle Geometric Celebration Emblem - Top Right (Desktop) */}
        <svg
          className="hidden lg:block absolute top-32 right-6 xl:right-14 w-40 h-40 text-emerald-800/[0.04]"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        >
          <circle cx="50" cy="50" r="45" strokeDasharray="3 3" />
          <rect x="25" y="25" width="50" height="50" rx="3" transform="rotate(45 50 50)" />
          <rect x="25" y="25" width="50" height="50" rx="3" />
          <circle cx="50" cy="50" r="10" />
          <circle cx="50" cy="50" r="3" fill="currentColor" />
        </svg>

        {/* Subtle Starburst Celebration Sparkles */}
        <svg
          className="hidden md:block absolute top-52 right-1/4 w-7 h-7 text-emerald-600/[0.06]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
        <svg
          className="hidden md:block absolute top-[580px] left-[18%] w-6 h-6 text-teal-600/[0.05]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>

        {/* Delicate Concentric Geometry - Bottom Left (Medium/Large screens) */}
        <svg
          className="hidden md:block absolute -bottom-10 -left-12 w-64 h-64 text-emerald-800/[0.035]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
        >
          <circle cx="100" cy="100" r="85" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="65" />
          <circle cx="100" cy="100" r="45" strokeDasharray="2 2" />
        </svg>
      </div>

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
