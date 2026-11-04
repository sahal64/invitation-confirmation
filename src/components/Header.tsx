import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { Calendar, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  view: 'form' | 'admin';
  onViewChange: (view: 'form' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  view,
  onViewChange,
}) => {
  const t = translations[currentLang];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 no-print transition-all shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Event Indicator */}
        <div 
          onClick={() => onViewChange('form')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm sm:text-base tracking-tight">
                National Day 2026
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Official
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              25-11-2026 &bull; 6:00 PM – 10:00 PM
            </p>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {/* If inside Admin view, allow administrator to return to the public form */}
          {view === 'admin' && (
            <button
              onClick={() => onViewChange('form')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backToForm}</span>
            </button>
          )}

          {/* The Single Master English / Russian Language Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onLanguageChange('en')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                currentLang === 'en'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch language to English"
            >
              <span>EN</span>
            </button>
            <button
              onClick={() => onLanguageChange('ru')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                currentLang === 'ru'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Переключить язык на русский"
            >
              <span>RU</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
