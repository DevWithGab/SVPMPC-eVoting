
import React, { useState, useEffect } from 'react';
import { X, Menu, LogOut, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PageView, User } from '../types.ts';
import { announcementAPI } from '../services/api';

interface HeaderProps {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  onLogout?: () => void;
  language?: 'EN' | 'PH';
  setLanguage?: (lang: 'EN' | 'PH') => void;
  user?: User | null;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentPage, 
  setCurrentPage, 
  onLogout,
  language: propLanguage,
  setLanguage: propSetLanguage,
  user: propUser,
}) => {
  const { i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcementCount, setAnnouncementCount] = useState(0);
  // Use user from props instead of maintaining separate state
  const user = propUser;

  // Fetch announcement count
  useEffect(() => {
    const fetchAnnouncementCount = async () => {
      try {
        // Fetch announcements and count them
        const announcements = await announcementAPI.getAnnouncements();
        const count = Array.isArray(announcements) ? announcements.length : 0;
        console.log('Announcements:', announcements, 'Count:', count);
        setAnnouncementCount(count);
      } catch (error: any) {
        console.error('Failed to fetch announcements:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
        setAnnouncementCount(0);
      }
    };
    
    fetchAnnouncementCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchAnnouncementCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onLogout) {
      onLogout();
    } else {
      setCurrentPage('LANDING');
    }
  };

  const handleLanguageChange = (lang: 'EN' | 'PH') => {
    const langCode = lang === 'EN' ? 'en' : 'ph';
    i18n.changeLanguage(langCode);
    if (propSetLanguage) {
      propSetLanguage(lang);
    }
  };

  // Sync language prop if provided
  useEffect(() => {
    if (propLanguage !== undefined) {
      const langCode = propLanguage === 'EN' ? 'en' : 'ph';
      i18n.changeLanguage(langCode);
    }
  }, [propLanguage, i18n]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { t } = useTranslation();

  const navItems: { label: string; value: PageView; code: string }[] = [
    { label: t('common.homeButton'), value: 'LANDING', code: 'HOME' },
    { label: 'Elections', value: 'ELECTIONS', code: 'ELEC' },
    { label: t('common.rulesButton'), value: 'RULES', code: 'RULES' },
    { label: t('common.announcementsButton'), value: 'ANNOUNCEMENTS', code: 'ANON' },
    { label: t('common.resourcesButton'), value: 'RESOURCES', code: 'RES' },
    { label: t('common.resultsButton'), value: 'RESULTS', code: 'RESULTS' },
  ];

  // Check if user is admin or officer (MODERATOR/AUDITOR both map to 'officer' in backend)
  if (user && user.role !== 'member') {
    navItems.push({ label: t('common.adminButton'), value: 'ADMIN', code: 'ADM' });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* STATUS ROW - Technical Line */}
      <div className="bg-coop-darkGreen h-6 sm:h-8 px-3 sm:px-6 flex items-center justify-between text-[7px] sm:text-[9px] font-mono text-white/50 border-b border-white/5 uppercase tracking-widest">
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="hidden sm:inline">NODE: BAGUMBAYAN</span>
            <span className="sm:hidden">NODE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <ShieldCheck size={10} className="text-coop-yellow" />
            <span>ENCRYPTION: AES-256-GCM</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:inline">LATENCY: 24MS</span>
          <span className="text-coop-yellow">v4.2.1</span>
        </div>
      </div>

      {/* NAVIGATION ROW - The Control Bar */}
      <div className={`relative h-14 sm:h-16 px-3 sm:px-6 bg-white/50 backdrop-blur-md border-b border-coop-green/10 flex items-center justify-between transition-all ${scrolled ? 'shadow-sm' : ''}`}>
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-between w-full h-full">
        
        {/* Brand Terminal */}
        <div 
          className="flex items-center gap-2 sm:gap-4 cursor-pointer group" 
          onClick={() => setCurrentPage('LANDING')}
        >
          <div className="relative">
            <img src="/SVMPC_LOGO-NOBG.png" alt="SVMPC Logo" className="h-8 sm:h-10 w-auto transition-all hover:scale-110 active:scale-95" />
          </div>
          <div className="hidden md:block">
            <h1 className="font-black text-[10px] sm:text-[12px] text-coop-darkGreen uppercase tracking-tighter leading-none">Saint Vincent</h1>
            <p className="mono-label text-coop-green mt-0.5 sm:mt-1 text-[7px] sm:text-[8px] font-bold">Registry Authority</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="hidden lg:flex items-center h-full">
          {navItems.map((item) => (
            <button
              key={item.value}
              onClick={() => setCurrentPage(item.value)}
              className={`h-full px-6 flex flex-col justify-center transition-all relative group border-r border-coop-green/5 ${
                currentPage === item.value ? 'bg-coop-green/5' : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-[11px] font-black uppercase tracking-widest mt-0.5 ${
                currentPage === item.value ? 'text-coop-green' : 'text-gray-500 group-hover:text-coop-darkGreen'
              }`}>
                {item.label}
              </span>
              {/* Announcement badge notification */}
              {item.value === 'ANNOUNCEMENTS' && announcementCount > 0 && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">
                  {announcementCount > 9 ? '9+' : announcementCount}
                </div>
              )}
              {currentPage === item.value && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-coop-yellow"></div>
              )}
            </button>
          ))}
          
          <button 
            onClick={() => handleLanguageChange(i18n.language === 'en' ? 'PH' : 'EN')} 
            className="h-full px-6 mono-label text-gray-400 hover:text-coop-green transition-all border-r border-coop-green/5 text-[9px]"
          >
            LOC: {i18n.language === 'en' ? 'EN' : 'PH'}
          </button>
        </nav>

        {/* User Hub */}
        <div className="flex items-center gap-0 h-full">
          {user ? (
            <div className="flex items-center h-full">
              <button 
                onClick={() => setCurrentPage('PROFILE')} 
                className={`h-full px-2 sm:px-6 flex items-center gap-1 sm:gap-3 border-x border-coop-green/5 transition-all ${currentPage === 'PROFILE' ? 'bg-coop-green/5' : 'hover:bg-gray-50'}`}
              >
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-coop-yellow text-coop-green flex items-center justify-center font-black text-[10px] sm:text-xs border border-coop-green/10">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="mono-label text-coop-darkGreen leading-none text-[9px] font-bold">{user.name.split(' ')[0]}</p>
                  <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Sm:{user.role}</p>
                </div>
              </button>
              <button 
                onClick={handleLogout} 
                className="w-12 sm:w-16 h-full flex items-center justify-center text-red-800 hover:text-red-500 hover:bg-red-50 transition-all border-r border-coop-green/5"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setCurrentPage('LOGIN')} 
              className="h-full px-3 sm:px-8 bg-coop-yellow text-coop-green font-black text-[9px] sm:text-[11px] uppercase tracking-widest transition-all hover:bg-coop-darkGreen hover:text-white"
            >
              <span className="hidden sm:inline">Initialize Identity</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}

          <button 
            className="lg:hidden w-12 sm:w-16 h-full flex items-center justify-center border-l border-coop-green/10" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[90] bg-white bg-opacity-50 backdrop-blur-md flex flex-col pt-20 sm:pt-32 animate-fadeIn overflow-y-auto">
          <div className="space-y-0 px-3 sm:px-8 pb-12">
            {navItems.map((item) => (
              <button 
                key={item.value} 
                onClick={() => { setCurrentPage(item.value); setIsMenuOpen(false); }} 
                className={`w-full text-xl sm:text-3xl md:text-5xl font-black text-left tracking-tighter uppercase transition-all py-4 sm:py-5 px-3 sm:px-4 border-b border-gray-100 hover:bg-gray-50 relative ${
                  currentPage === item.value ? 'text-coop-green bg-coop-green/5' : 'text-gray-700'
                }`}
              >
                <span className="text-[10px] sm:text-[11px] font-black text-coop-green/60 uppercase tracking-[0.3em] block mb-1">{item.code}</span>
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {/* Announcement badge notification for mobile */}
                  {item.value === 'ANNOUNCEMENTS' && announcementCount > 0 && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-[11px] font-black">
                      {announcementCount > 9 ? '9+' : announcementCount}
                    </div>
                  )}
                </div>
              </button>
            ))}
            <button 
              onClick={() => { handleLanguageChange(i18n.language === 'en' ? 'PH' : 'EN'); setIsMenuOpen(false); }} 
              className="w-full text-base sm:text-2xl font-black text-left tracking-tighter uppercase transition-all py-4 sm:py-5 px-3 sm:px-4 text-gray-700 hover:bg-gray-50 border-t border-gray-200 mt-2 hover:text-coop-green"
            >
              <span className="text-[10px] sm:text-[11px] font-black text-coop-green/60 uppercase tracking-[0.3em] block mb-1">LOCALIZATION</span>
              {i18n.language === 'en' ? 'English' : 'Pilipino'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
