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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Header Bar with the single authoritative Language Switcher */}
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        view={view}
        onViewChange={handleViewChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {view === 'form' ? (
          <PublicForm currentLang={currentLang} />
        ) : (
          <AdminDashboard currentLang={currentLang} />
        )}
      </main>

      {/* Clean Footer (without duplicate language switchers, admin links, or setup buttons) */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 no-print">
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
