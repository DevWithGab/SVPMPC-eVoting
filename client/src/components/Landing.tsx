
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PageView } from '../types.ts';
import {
  Vote, BarChart2, ShieldCheck,
  LockKeyhole, Network, Activity, Megaphone, ExternalLink, Users, Briefcase, ArrowRight, FileText
} from 'lucide-react';
import { electionAPI } from '../services/api';

interface LandingProps {
  onNavigate: (page: PageView) => void;
  isLoggedIn: boolean;
  language: 'EN' | 'PH';
}

export const Landing: React.FC<LandingProps> = ({ onNavigate, isLoggedIn, language }) => {
  const { t } = useTranslation();
  const [positionCount, setPositionCount] = useState<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeElectionId, setActiveElectionId] = useState<string | null>(null);

  const directoryItems = [
    {
      title: t('landing.candidates'),
      description: t('landing.candidatesDesc'),
      link: 'CANDIDATES',
      image: '/directory-img/candidates-dir.jpg'
    },
    {
      title: t('landing.positions'),
      description: t('landing.positionsDesc'),
      link: 'ELECTIONS',
      image: '/directory-img/positions-dir.jpg'
    },
    {
      title: t('landing.branches'),
      description: t('landing.branchesDesc'),
      link: 'LANDING',
      image: '/directory-img/branches-directory.jpeg'
    }
  ];

  const fetchData = async () => {
    try {
      const electionsData = await electionAPI.getElections().catch(() => []);
      setPositionCount(electionsData.length);
      
      // Check for active elections
      const activeElections = Array.isArray(electionsData)
        ? electionsData.filter(election => election.status === 'active')
        : [];
      
      if (activeElections.length > 0) {
        setActiveElectionId(activeElections[0]._id || activeElections[0].id);
      } else {
        // No active elections - clear localStorage immediately
        localStorage.removeItem('selectedElectionId');
        localStorage.removeItem('selectedElection');
        setActiveElectionId(null);
        console.log('No active elections found - cleared localStorage');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    fetchData();
    
    // Re-fetch when user comes back to this page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Landing page is visible again - refreshing data');
        fetchData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (activeElectionId === null) {
      localStorage.removeItem('selectedElectionId');
    }
  }, [activeElectionId]);

  return (
    <div className="flex flex-col min-h-screen bg-white selection:bg-coop-yellow selection:text-coop-green">
      
      {/* HERO SECTION - Redesigned for Impact */}
      <section className="relative w-full min-h-svh sm:min-h-[90vh] flex items-center justify-center overflow-hidden bg-coop-darkGreen py-20 sm:py-0">
        
        {/* 1. Background Image Layer */}
        <div className="absolute inset-0 z-0">
            <img 
               src={'/main-bg-cropped.jpg'}
               className="w-full h-full object-cover object-center opacity-50 sm:opacity-60 contrast-110" 
               alt="Community Background"
            />
            {/* Gradient Overlay for Text Readability & Brand Tint */}
            <div className="absolute inset-0 bg-linear-to-t from-coop-darkGreen via-coop-darkGreen/70 sm:via-coop-darkGreen/60 to-transparent"></div>
            
            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-soft-light"></div>
        </div>

        {/* 2. Abstract Geometric "Flag/Ray" Shapes - Reduced Opacity for cleaner look */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Left Ray */}
            <div className="absolute -bottom-40 -left-20 w-[400px] sm:w-[800px] h-[500px] sm:h-[1000px] bg-coop-green/10 transform -skew-x-12 rotate-12 blur-[60px] sm:blur-[100px]"></div>
            {/* Right Ray */}
            <div className="absolute -top-40 -right-20 w-[400px] sm:w-[800px] h-[500px] sm:h-[1000px] bg-coop-yellow/5 transform skew-x-12 -rotate-12 blur-[60px] sm:blur-[100px]"></div>
        </div>

        {/* 3. Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-16 sm:pt-24 text-center">
            
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-black/20 border border-white/10 backdrop-blur-md px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-6 sm:mb-10 animate-fadeIn shadow-lg">
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-coop-yellow rounded-full animate-pulse shadow-[0_0_10px_#F2E416]"></div>
                <span className="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em]">Secure & Transparent Voting Platform</span>
            </div>

            {/* Main Headline - Resized */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-[0.85] sm:leading-[0.9] mb-6 sm:mb-8 drop-shadow-2xl animate-slideUp px-2">
                Your vote.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coop-yellow via-white to-coop-yellow">Your Cooperative.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-gray-200 font-medium max-w-3xl mx-auto mb-10 sm:mb-14 leading-relaxed animate-slideUp pl-4 sm:pl-6 text-left md:text-center border-l-4 md:border-l-0 border-coop-yellow/50 md:pl-0 drop-shadow-md px-2" style={{animationDelay: '0.1s'}}>
                {t('landing.heroSubtitle')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 sm:gap-6 animate-slideUp px-2 max-w-2xl mx-auto" style={{animationDelay: '0.2s'}}>
                <button 
                    onClick={() => {
                      if (isLoggedIn) {
                        onNavigate('VOTING');
                      } else {
                        localStorage.setItem('redirectAfterLogin', 'VOTING');
                        onNavigate('LOGIN');
                      }
                    }}
                    className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-coop-yellow text-coop-darkGreen font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(242,228,22,0.2)] flex items-center justify-center gap-2 sm:gap-3 group rounded-sm"
                >
                    <Vote size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="truncate">{isLoggedIn ? t('landing.voteButtonLoggedIn') : t('landing.authorizeVoting')}</span>
                    <ArrowRight size={14} className="sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </button>
                
                <button 
                    onClick={() => onNavigate('RESOURCES')}
                    className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-black/30 backdrop-blur-sm border border-white/20 text-white font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-white/10 hover:border-white/40 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 rounded-sm"
                >
                    <FileText size={14} className="sm:w-4 sm:h-4 flex-shrink-0" /> 
                    <span>{t('landing.readGuidelines')}</span>
                </button>
            </div>

            {/* Live Data Ticker */}
            <div className="mt-12 sm:mt-24 pt-6 sm:pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-left max-w-5xl mx-auto animate-fadeIn backdrop-blur-md bg-black/20 p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl shadow-2xl" style={{animationDelay: '0.3s'}}>
                 {[
                    { label: 'Active Members', val: '18,442', icon: Users },
                    { label: 'Voter Turnout', val: '68.4%', icon: Activity },
                    { label: 'Positions Open', val: positionCount.toString(), icon: Briefcase },
                    { label: 'Security Node', val: 'Stable', icon: ShieldCheck }
                 ].map((stat, i) => (
                    <div key={i} className="flex flex-col group pb-6">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                            <stat.icon size={10} className="sm:w-3 sm:h-3 text-coop-yellow flex-shrink-0" />
                            <span className="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-wide sm:tracking-widest leading-tight">{stat.label}</span>
                        </div>
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm">{stat.val}</span>
                    </div>
                 ))}
            </div>
        </div>
      </section>


      {/* Vote Now CTA */}
      <section id="elections" className="pt-32 pb-32 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="bg-white border-0 rounded-lg shadow-md overflow-hidden">
            <div className="p-0">
              <div className="flex flex-col lg:flex-row items-center">
                <div className="hidden lg:block w-48 p-8">
                  <img src={'/vote-illustration-left.png'} alt="Vote illustration" className="w-full h-auto" />
                </div>
                
                <div className="flex-1 p-8 lg:p-12 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Megaphone className="h-6 w-6 text-coop-green" />
                    <h2 className="text-2xl md:text-3xl font-bold text-coop-darkGreen">
                      {t('landing.voiceMatters')}
                    </h2>
                  </div>
                  
                  <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
                    {t('landing.voiceDescription')}
                  </p>
                  
                  <p className="text-sm text-gray-600 mb-6">
                    Remember: <span className="font-semibold text-coop-green">{t('landing.voteYourVoice')}</span>
                  </p>
                  
                  <button 
                    className="w-full max-w-md bg-coop-green text-white px-8 py-3 rounded-full font-bold hover:bg-coop-darkGreen transition-all active:scale-95"
                    onClick={() => {
                      if (isLoggedIn) {
                        onNavigate('VOTING');
                      } else {
                        localStorage.setItem('redirectAfterLogin', 'ELECTIONS');
                        onNavigate('LOGIN');
                      }
                    }}
                  >
                    {t('landing.voteNow')}
                  </button>
                </div>
                
                <div className="hidden lg:block w-48 p-8">
                  <img src={'/vote-illustration-right.png'} alt="Vote illustration" className="w-full h-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

     
      {/* Administer Elections Section */}
      <section className="pb-32 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="bg-white border-0 rounded-lg shadow-md overflow-hidden">
            <div className="p-0">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="lg:w-1/2 p-8 flex justify-center">
                  <img 
                    src={'/admin-illustration.png'} 
                    alt="Admin illustration" 
                    className="max-w-md w-full h-auto"
                  />
                </div>
                
                <div className="lg:w-1/2 p-8 lg:pr-16">
                  <h2 className="text-2xl md:text-3xl font-bold text-coop-darkGreen mb-4">
                    {t('landing.adminTitle')}
                  </h2>
                  
                  <p className="text-gray-600 mb-6">
                    {t('landing.adminDescription')}
                  </p>
                  
                  <button 
                    className="w-full bg-coop-green text-white px-8 py-3 rounded-full font-bold hover:bg-coop-darkGreen transition-all active:scale-95 flex items-center justify-center gap-2"
                    onClick={() => onNavigate('LOGIN')}
                  >
                    {t('landing.goToEMS')}
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

       {/* Directory Section */}
      <section id="directory" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">{t('landing.directory')}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {directoryItems.map((item, index) => (
              <div 
                key={item.title}
                className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => {
                  if (item.link === 'CANDIDATES') {
                    // Pass activeElectionId (null if no active election)
                    onNavigate(item.link as PageView, activeElectionId || '');
                  } else {
                    onNavigate(item.link as PageView);
                  }
                }}
              >
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {/* Green overlay */}
                <div className="absolute inset-0 bg-coop-green/70 group-hover:bg-coop-green/50 transition-colors duration-300" />
                
                {/* Title */}
                <div className="absolute inset-0 flex items-end p-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/80">{item.description}</p>
                  </div>
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <button className="px-4 py-2 bg-white text-coop-green font-bold rounded hover:bg-gray-100 pointer-events-auto">
                    {t('landing.viewDirectory')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
