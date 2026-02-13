
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PageView } from '../types.ts';
import {
  Vote, BarChart2, ShieldCheck,
  LockKeyhole, Network, Activity, Megaphone, ExternalLink, Users, Briefcase, ArrowRight, FileText,
  CheckSquare, BarChart3, ArrowUpRight, MapPin
} from 'lucide-react';
import { electionAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

interface LandingProps {
  onNavigate: (page: PageView) => void;
  isLoggedIn: boolean;
  language: 'EN' | 'PH';
}

export const Landing: React.FC<LandingProps> = ({ onNavigate, isLoggedIn, language }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
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
    <div className={`flex flex-col min-h-screen selection:bg-coop-yellow selection:text-coop-green transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      
      {/* HERO SECTION - Redesigned for Impact */}
      <section className="relative w-full h-svh sm:h-[100vh] flex items-center justify-center overflow-hidden bg-coop-darkGreen py-20 sm:py-0">
        
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
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-[0.85] sm:leading-[0.9] mb-4 sm:mb-6 drop-shadow-2xl animate-slideUp px-2">
                Your vote.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coop-yellow via-white to-coop-yellow">Your Cooperative.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base md:text-lg text-gray-200 font-medium max-w-3xl mx-auto mb-6 sm:mb-10 leading-relaxed animate-slideUp pl-4 sm:pl-6 text-left md:text-center border-l-4 md:border-l-0 border-coop-yellow/50 md:pl-0 drop-shadow-md px-2" style={{animationDelay: '0.1s'}}>
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

            {/* Live Data Ticker - Stats Bar */}
            <div className="w-full mt-8 sm:mt-10 lg:mt-16 xl:mt-20 animate-fadeIn" style={{animationDelay: '0.3s'}}>
              <div className="w-full bg-coop-darkGreen border-t border-white/10">
                <div className="w-full">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
                    {[
                      { label: 'Active Members', value: '18,442', icon: Users, highlight: false },
                      { label: 'Voter Turnout', value: '68.4%', icon: Activity, highlight: true },
                      { label: 'Positions Open', value: positionCount.toString(), icon: Briefcase, highlight: false },
                      { label: 'Security Node', value: 'Stable', icon: ShieldCheck, highlight: false }
                    ].map((stat, index) => (
                      <div
                        key={stat.label}
                        className={`py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-12 xl:px-20 flex flex-col items-start ${
                          index < 3 ? 'border-r border-white/10' : ''
                        }`}
                      >
                        <div className={`text-lg sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 ${
                          stat.highlight ? 'text-coop-yellow' : 'text-white'
                        }`}>
                          {stat.value}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-coop-yellow/70" />
                          <span className="text-[10px] sm:text-xs text-white/50 font-medium tracking-wider uppercase">
                            {stat.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>


      {/* 3.5. REDESIGNED CTA SECTION: "Your Voice Matters" - FULL WIDTH */}
      <section className={`relative w-full py-24 border-b transition-colors duration-300 overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-coop-darkGreen via-coop-yellow to-coop-darkGreen"></div>
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#1B4332 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-coop-yellow/5 rounded-full blur-[100px]"></div>
          
          <div className="container mx-auto px-6 max-w-7xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-16">
              
              {/* Left Visual: Voting Action */}
              <div className="hidden md:block w-80 h-80 relative shrink-0">
                  <div className="absolute inset-0 bg-coop-yellow/20 rounded-full blur-3xl transform -translate-x-6 translate-y-6"></div>
                  <img 
                      src={'/vote-illustration-left_LE_upscale.jpg'}
                      className="relative z-10 w-full h-full object-cover rounded-2xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700 border-4 border-white"
                      alt="Casting Vote"
                  />
                  <div className="absolute -bottom-4 -left-4 bg-coop-darkGreen text-white p-3 rounded-xl shadow-lg z-20">
                      <Vote size={24} />
                  </div>
              </div>

              {/* Center Content */}
              <div className="flex-1 text-center max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 mb-6">
                      <Megaphone size={20} className={`animate-pulse ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`} />
                      <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-coop-yellow' : 'text-gray-400'}`}>{t('landing.voiceMatters')}</span>
                  </div>
                  
                  <h2 className={`text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                      {t('landing.voiceMatters')}!<br/>
                  </h2>
                  
                  <p className={`text-xl font-medium leading-relaxed mb-10 ${isDarkMode ? 'text-slate-200' : 'text-gray-500'}`}>
                      {t('landing.voiceDescription')}
                  </p>

                  <p className={`text-xs font-bold uppercase tracking-widest mb-10 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen/80'}`}>
                      Remember: Your Vote, Your Voice, Your Future!
                  </p>

                  <button 
                      onClick={() => {
                        if (isLoggedIn) {
                          onNavigate('VOTING');
                        } else {
                          localStorage.setItem('redirectAfterLogin', 'VOTING');
                          onNavigate('LOGIN');
                        }
                      }}
                      className={`px-14 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:shadow-2xl hover:-translate-y-1 transition-all ${isDarkMode ? 'bg-coop-yellow text-coop-darkGreen' : 'bg-coop-darkGreen text-white hover:bg-coop-yellow hover:text-coop-darkGreen'}`}
                  >
                      {t('landing.voteNow')}
                  </button>
              </div>

              {/* Right Visual: Empowered Member */}
              <div className="hidden md:block w-80 h-80 relative shrink-0">
                  <div className="absolute inset-0 bg-coop-darkGreen/10 rounded-full blur-3xl transform translate-x-6 -translate-y-6"></div>
                  <img 
                      src={'/vote-illustration-right_LE_upscale.jpg'}
                      className="relative z-10 w-full h-full object-cover rounded-2xl shadow-2xl -rotate-3 hover:rotate-0 transition-transform duration-700 border-4 border-white"
                      alt="Empowered Member"
                  />
                  <div className="absolute -top-4 -right-4 bg-coop-yellow text-coop-darkGreen p-3 rounded-xl shadow-lg z-20">
                      <CheckSquare size={24} />
                  </div>
              </div>

          </div>
      </section>

      {/* 3.6. EMS / ADMIN CARD SECTION */}
      <section className={`py-24 relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="container mx-auto px-6 max-w-7xl relative z-10">
               <div className={`rounded-[32px] p-8 md:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border flex flex-col md:flex-row items-center gap-16 relative overflow-hidden group transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                    
                    {/* Background Accents */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-coop-darkGreen/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    {/* Left: Illustration / Image */}
                    <div className="w-full md:w-1/2 flex justify-center md:justify-start">
                        <div className="relative w-full aspect-16/10 bg-gray-50 rounded-2xl overflow-hidden shadow-xl border border-gray-100 group-hover:shadow-2xl transition-all duration-500">
                             {/* Placeholder for vector/illustration from prompt */}
                             <img 
                                src={'/admin-illustration_LE_upscale.jpg'}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                alt="Cooperative Management Dashboard"
                             />
                             <div className="absolute inset-0 bg-coop-darkGreen/10 mix-blend-multiply"></div>
                             
                             {/* Floating UI Widget Simulation */}
                             <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-coop-green/10 rounded-lg text-coop-green">
                                          <BarChart3 size={20} />
                                      </div>
                                      <div>
                                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t('landing.adminTitle')}</p>
                                          <p className="text-xs font-black text-gray-900">EMS Console Active</p>
                                      </div>
                                  </div>
                                  <div className="flex -space-x-2">
                                      {[1,2,3].map(i => (
                                          <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"></div>
                                      ))}
                                  </div>
                             </div>
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div className="w-full md:w-1/2 text-center md:text-left">
                        <h2 className={`text-3xl md:text-4xl font-black mb-6 leading-tight ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                            {t('landing.adminTitle')}<br/>
                        </h2>
                        <p className={`text-lg font-medium leading-relaxed mb-10 max-w-lg mx-auto md:mx-0 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                            This is your hub for overseeing and managing the cooperative elections. Remember, a well-managed election is the foundation of a successful cooperative governance.
                        </p>
                        <button 
                            onClick={() => onNavigate('LOGIN')}
                            className="inline-flex items-center gap-3 px-10 py-5 bg-coop-darkGreen text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-coop-yellow hover:text-coop-darkGreen transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                        >
                            {t('landing.goToEMS')} <ArrowUpRight size={18} />
                        </button>
                    </div>

               </div>
          </div>
      </section>

       {/* Directory Section */}
      <section className={`py-24 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="container mx-auto px-6 max-w-7xl">
              <div className="flex items-end justify-between mb-16">
                  <div>
                      <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{t('landing.directory')}</h2>
                      <p className={`mt-4 font-medium text-lg max-w-md ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Quick access to cooperative registries, operational units, and leadership profiles.</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                      <div className="w-3 h-3 bg-coop-yellow rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold uppercase tracking-widest text-coop-darkGreen">System Online</span>
                  </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                  {/* CARD 1: CANDIDATES */}
                  <div 
                    onClick={() => {
                      onNavigate('CANDIDATES', activeElectionId || '');
                    }}
                    className="group relative h-[600px] rounded-[2rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-700 border border-gray-100"
                  >
                      {/* Image Layer */}
                      <div className="absolute inset-0 bg-gray-900">
                          <img 
                            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1200" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
                            alt="Candidates"
                          />
                      </div>
                      
                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-coop-darkGreen/90 mix-blend-multiply transition-all duration-700 group-hover:bg-coop-darkGreen/80"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-coop-darkGreen via-transparent to-transparent opacity-90"></div>

                      {/* Content */}
                      <div className="absolute inset-0 p-10 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                              <span className="text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors font-mono tracking-tighter">01</span>
                              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-coop-yellow group-hover:text-coop-darkGreen group-hover:border-coop-yellow transition-all duration-500">
                                  <Users size={28} />
                              </div>
                          </div>

                          <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                              <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Candidates</h3>
                              <p className="text-white/70 font-medium text-sm leading-relaxed mb-8 max-w-[80%] border-l-2 border-coop-yellow/50 pl-4 group-hover:border-coop-yellow transition-colors">
                                  Access verified profiles of members running for office in the upcoming election cycle.
                              </p>
                              
                              <div className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white group-hover:text-coop-yellow transition-colors">
                                  <span className="border-b border-transparent group-hover:border-coop-yellow pb-0.5">View Registry</span>
                                  <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* CARD 2: POSITIONS */}
                  <div 
                    onClick={() => onNavigate('ELECTIONS')}
                    className="group relative h-[600px] rounded-[2rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-700 border border-gray-100 mt-0 md:mt-12"
                  >
                       {/* Image Layer */}
                       <div className="absolute inset-0 bg-gray-900">
                          <img 
                            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
                            alt="Positions"
                          />
                      </div>

                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-coop-darkGreen/90 mix-blend-multiply transition-all duration-700 group-hover:bg-coop-darkGreen/80"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-coop-darkGreen via-transparent to-transparent opacity-90"></div>

                      {/* Content */}
                      <div className="absolute inset-0 p-10 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                              <span className="text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors font-mono tracking-tighter">02</span>
                              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-coop-yellow group-hover:text-coop-darkGreen group-hover:border-coop-yellow transition-all duration-500">
                                  <CheckSquare size={28} />
                              </div>
                          </div>

                          <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                              <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Positions</h3>
                              <p className="text-white/70 font-medium text-sm leading-relaxed mb-8 max-w-[80%] border-l-2 border-coop-yellow/50 pl-4 group-hover:border-coop-yellow transition-colors">
                                  Review open leadership seats, roles, and governance responsibilities available.
                              </p>
                              
                              <div className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white group-hover:text-coop-yellow transition-colors">
                                  <span className="border-b border-transparent group-hover:border-coop-yellow pb-0.5">Check Openings</span>
                                  <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* CARD 3: BRANCHES */}
                  <div 
                    onClick={() => onNavigate('RESOURCES')}
                    className="group relative h-[600px] rounded-[2rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-700 border border-gray-100"
                  >
                       {/* Image Layer */}
                       <div className="absolute inset-0 bg-gray-900">
                          <img 
                            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
                            alt="Branches"
                          />
                      </div>

                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-coop-darkGreen/90 mix-blend-multiply transition-all duration-700 group-hover:bg-coop-darkGreen/80"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-coop-darkGreen via-transparent to-transparent opacity-90"></div>

                      {/* Content */}
                      <div className="absolute inset-0 p-10 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                              <span className="text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors font-mono tracking-tighter">03</span>
                              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-coop-yellow group-hover:text-coop-darkGreen group-hover:border-coop-yellow transition-all duration-500">
                                  <MapPin size={28} />
                              </div>
                          </div>

                          <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                              <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Branches</h3>
                              <p className="text-white/70 font-medium text-sm leading-relaxed mb-8 max-w-[80%] border-l-2 border-coop-yellow/50 pl-4 group-hover:border-coop-yellow transition-colors">
                                  Locate regional cooperative units, satellite offices, and member service centers.
                              </p>
                              
                              <div className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white group-hover:text-coop-yellow transition-colors">
                                  <span className="border-b border-transparent group-hover:border-coop-yellow pb-0.5">Find Locations</span>
                                  <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

    </div>
  );
};
