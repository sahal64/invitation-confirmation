import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { Calendar, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  view: 'form' | 'admin';
  onViewChange: (view: 'form' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang = 'en',
  view,
  onViewChange,
}) => {
  const t = translations[currentLang] || translations.en;

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md no-print transition-all shadow-xs ${
        view === 'form'
          ? 'bg-[#FFFDF9]/90 border-b border-[#F0DFCD]'
          : 'bg-white/95 border-b border-slate-200'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Event Indicator */}
        <div 
          onClick={() => onViewChange('form')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B44B1E] via-[#C85D26] to-[#DB7332] flex items-center justify-center text-white shadow-md shadow-[#C85D26]/25 group-hover:scale-105 transition-transform flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2C1A0E] text-sm sm:text-base tracking-tight">
                National Day 2026
              </span>
              <span className="hidden sm:inline-block text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FCE8D3] text-[#A14718] border border-[#F3CCA5]">
                Official
              </span>
            </div>
            <p className="text-xs text-[#8C6D54] font-medium">
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
        </div>
      </div>
    </header>
  );
};
