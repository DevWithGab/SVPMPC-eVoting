import React, { useState, useEffect } from 'react';
import { ChevronDown, Activity, Briefcase, Vote, ArrowRight, Timer, Check, RefreshCw, Users } from 'lucide-react';
import { electionAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';
import type { PageView } from '../types';

interface ElectionsProps {
  onNavigate: (page: PageView, electionId?: string) => void;
}

export const Elections: React.FC<ElectionsProps> = ({ onNavigate }) => {
  const { isDarkMode } = useDarkMode();
  const [elections, setElections] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchElections = async () => {
    try {
      setRefreshing(true);
      const data = await electionAPI.getElections();
      
      const processedElections = (data || []).map((election: any) => ({
        id: election._id || election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        timeline: election.timeline,
        startDate: election.startDate,
        endDate: election.endDate,
        candidateCount: election.candidateCount || 0,
        positionCount: election.positionCount || 0,
        partylistCount: election.partylistCount || 0,
        backgroundImage: election.backgroundImage ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${election.backgroundImage}` : null,
      }));
      
      setElections(processedElections);
      // Auto-expand completed elections
      const completedElections = processedElections.filter((e: any) => e.status?.toUpperCase() === 'COMPLETED');
      if (completedElections.length > 0) {
        setExpanded(completedElections[0].id);
      }
    } catch (error) {
      setElections([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
    
    // Auto-refresh elections every 30 seconds to catch status changes
    const interval = setInterval(() => {
      fetchElections();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-32 px-4 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#fcfcfd]'}`}>
        <div className="text-center">
          <Activity size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className={`font-black ${isDarkMode ? 'text-slate-100' : 'text-coop-darkGreen'}`}>Loading elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-32 pb-32 px-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#fcfcfd]'}`}>
      <div className="container mx-auto max-w-7xl">
        {/* Architectural Header */}
        <header className="mb-12 sm:mb-20 animate-slideUp relative">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `linear-gradient(0deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px)`, backgroundSize: '35px 35px' }}></div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-12">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-1 sm:w-1.5 h-6 sm:h-8 bg-coop-yellow shadow-[0_0_15px_rgba(242,228,22,0.6)]"></div>
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] ${isDarkMode ? 'text-coop-yellow' : 'text-gray-400'}`}>Active Registry Cycles</span>
              </div>
              <h1 className={`text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                Election<br/>
                <span className="text-coop-green">Dashboard</span>
              </h1>
              <p className={`text-sm sm:text-2xl font-medium leading-relaxed max-w-2xl border-l-4 pl-4 sm:pl-8 ${isDarkMode ? 'text-slate-300 border-coop-yellow/30' : 'text-gray-500 border-coop-green/10'}`}>
                Monitor upcoming and active democratic processes. Review timelines, candidate rosters, and partylist affiliations.
              </p>
            </div>
            <button
              onClick={fetchElections}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-coop-green text-white font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-coop-darkGreen transition-all disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RefreshCw size={16} className={`flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </header>

        {elections.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-medium text-lg">No elections available at this time.</p>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12 animate-fadeIn">
            {elections.map((election, index) => (
              <div
                key={election.id}
                className="group"
              >
                {/* === CARD HEADER (Directory Style: Green Overlay) === */}
                <div 
                  className="relative h-[450px] cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => setExpanded(expanded === election.id ? null : election.id)}
                >
                  {/* Image Layer */}
                  <div className="absolute inset-0 bg-gray-900">
                    {election.backgroundImage && (
                      <img 
                        src={election.backgroundImage} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
                        alt={election.title}
                        onError={(e) => {
                          console.log('Image failed to load:', election.backgroundImage);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', election.backgroundImage);
                        }}
                      />
                    )}
                  </div>

                  {/* Green Overlays (Matches Landing.tsx Directory Cards) */}
                  <div className="absolute inset-0 bg-coop-darkGreen/90 mix-blend-multiply transition-all duration-700 group-hover:bg-coop-darkGreen/80"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-coop-darkGreen via-transparent to-transparent opacity-90"></div>

                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-10 md:p-14 flex flex-col justify-between">
                    
                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                      <span className="text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors font-mono tracking-tighter">
                        0{index + 1}
                      </span>

                      <div className={`w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-coop-yellow group-hover:text-coop-darkGreen group-hover:border-coop-yellow transition-all duration-500 ${expanded === election.id ? 'bg-coop-yellow text-coop-darkGreen border-coop-yellow rotate-180' : ''}`}>
                        {expanded === election.id ? <ChevronDown size={28} /> : <Activity size={28} />}
                      </div>
                    </div>

                    {/* Bottom Row: Title & Meta */}
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-lg ${
                          election.status?.toUpperCase() === 'ACTIVE' ? 'bg-coop-yellow text-coop-darkGreen' : 'bg-white/10 text-white'
                        }`}>
                          {election.status?.toUpperCase()} Phase
                        </span>
                        <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
                          Ref: {election.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-4 drop-shadow-md">
                        {election.title}
                      </h3>
                      <p className="text-white/70 font-medium text-sm md:text-base max-w-2xl leading-relaxed border-l-2 border-coop-yellow/50 pl-6 group-hover:border-coop-yellow transition-colors">
                        {election.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* === EXPANDED CONTENT (DETAILS) === */}
                <div className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                  expanded === election.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                } ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className={`p-8 md:p-14 grid lg:grid-cols-12 gap-12 md:gap-20 border-t transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                    
                    {/* Left Column: Timeline */}
                    <div className="lg:col-span-8">
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-10 flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        <Timer size={14} /> Execution Timeline
                      </h4>
                      <div className="relative pl-4">
                        <div className={`absolute left-[21px] top-2 bottom-6 w-0.5 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                        <div className="space-y-8">
                          {(() => {
                            let timeline = election.timeline || [];
                            
                            if (timeline.length > 0 && !timeline.some((e: any) => e.title?.toUpperCase().includes('PRE'))) {
                              const startDateObj = new Date(election.startDate);
                              const preElectionPhase = {
                                title: 'PRE-ELECTION PHASE',
                                start: new Date().toLocaleDateString('en-US'),
                                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                end: startDateObj.toLocaleDateString('en-US'),
                                endTime: startDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                status: 'upcoming',
                              };
                              timeline = [preElectionPhase, ...timeline];
                            }
                            
                            const preElectionPhase = timeline.find((e: any) => e.title?.toUpperCase().includes('PRE'));
                            const votingPhase = timeline.find((e: any) => e.title?.toUpperCase().includes('VOTING'));
                            const appealPhase = timeline.find((e: any) => e.title?.toUpperCase().includes('APPEAL'));
                            const phases = [preElectionPhase, votingPhase, appealPhase].filter(Boolean);
                            
                            return phases.length > 0 ? (
                              phases.map((event: any, i: number) => {
                                let isCompleted = false;
                                let isEventActive = false;
                                
                                if (i === 0) {
                                  isEventActive = election.status?.toUpperCase() === 'UPCOMING';
                                  isCompleted = election.status?.toUpperCase() === 'ACTIVE' || election.status?.toUpperCase() === 'COMPLETED';
                                } else if (i === 1) {
                                  isEventActive = election.status?.toUpperCase() === 'ACTIVE';
                                  isCompleted = election.status?.toUpperCase() === 'COMPLETED';
                                } else if (i === 2) {
                                  isEventActive = election.status?.toUpperCase() === 'COMPLETED';
                                  isCompleted = false;
                                }
                                
                                return (
                                  <div key={i} className="relative flex items-center gap-8 group/timeline">
                                    <div className={`relative z-10 w-11 h-11 rounded-full border-[3px] flex items-center justify-center shrink-0 transition-all shadow-sm ${
                                      isEventActive ? isDarkMode ? 'bg-slate-700 border-coop-yellow text-coop-yellow scale-110 shadow-yellow-500/20' : 'bg-white border-coop-green text-coop-green scale-110 shadow-coop-green/20' : 
                                      isCompleted ? 'bg-coop-green border-coop-green text-white' : isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-300'
                                    }`}>
                                      {isCompleted ? <Check size={20} strokeWidth={3} /> : <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${isEventActive ? isDarkMode ? 'bg-coop-yellow animate-pulse' : 'bg-coop-green animate-pulse' : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />}
                                    </div>
                                    <div className={`transition-opacity duration-300 ${isEventActive ? 'opacity-100' : 'opacity-60 group-hover/timeline:opacity-100'}`}>
                                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors duration-300 ${isEventActive ? isDarkMode ? 'text-coop-yellow' : 'text-coop-green' : isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                        {event.title}
                                      </p>
                                      <p className={`text-base font-bold transition-colors duration-300 ${isEventActive ? isDarkMode ? 'text-slate-100' : 'text-gray-900' : isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                        {event.start} - {event.end}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className={`p-4 md:p-8 rounded-none border text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-100'}`}>
                                <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No timeline events available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Actions Sidebar */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                      <div className={`p-6 rounded-2xl border mb-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-gray-400'}`}>
                          <Briefcase size={14} /> Operations
                        </h4>
                        <p className={`text-sm leading-relaxed mb-6 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          Review the official list of candidates, partylists, and positions before entering the voting booth.
                        </p>
                        
                        <button 
                          onClick={() => onNavigate('POSITIONS', election.id)}
                          className={`w-full p-4 rounded-xl flex items-center justify-between hover:shadow-lg hover:-translate-y-0.5 transition-all group/btn text-left mb-3 border ${isDarkMode ? 'bg-slate-800 border-slate-600 hover:border-coop-yellow/50' : 'bg-white border-gray-200 hover:border-coop-green/50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Users size={18} className={`transition-colors duration-300 ${isDarkMode ? 'text-slate-500 group-hover/btn:text-coop-yellow' : 'text-gray-400 group-hover/btn:text-coop-green'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-300 group-hover/btn:text-coop-yellow' : 'text-gray-700 group-hover/btn:text-coop-green'}`}>View Candidates</span>
                          </div>
                          <ArrowRight size={14} className={`transition-colors duration-300 ${isDarkMode ? 'text-slate-600 group-hover/btn:text-coop-yellow' : 'text-gray-300 group-hover/btn:text-coop-green'}`} />
                        </button>

                        <button 
                          onClick={() => onNavigate('POSITIONS', election.id)}
                          className={`w-full p-4 rounded-xl flex items-center justify-between hover:shadow-lg hover:-translate-y-0.5 transition-all group/btn text-left border ${isDarkMode ? 'bg-slate-800 border-slate-600 hover:border-coop-yellow/50' : 'bg-white border-gray-200 hover:border-coop-green/50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Briefcase size={18} className={`transition-colors duration-300 ${isDarkMode ? 'text-slate-500 group-hover/btn:text-coop-yellow' : 'text-gray-400 group-hover/btn:text-coop-green'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-300 group-hover/btn:text-coop-yellow' : 'text-gray-700 group-hover/btn:text-coop-green'}`}>Positions</span>
                          </div>
                          <ArrowRight size={14} className={`transition-colors duration-300 ${isDarkMode ? 'text-slate-600 group-hover/btn:text-coop-yellow' : 'text-gray-300 group-hover/btn:text-coop-green'}`} />
                        </button>
                      </div>

                      {election.status?.toUpperCase() === 'ACTIVE' ? (
                        <button 
                          onClick={() => onNavigate('VOTING')}
                          className={`w-full p-5 rounded-2xl flex items-center justify-between shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group/vote mt-auto overflow-hidden relative ${isDarkMode ? 'bg-coop-yellow text-slate-900 shadow-yellow-500/20 hover:bg-coop-yellow/90' : 'bg-coop-green text-white shadow-coop-green/20 hover:bg-coop-darkGreen'}`}
                        >
                          <div className="relative z-10">
                            <p className="text-lg font-black uppercase tracking-tight">Vote Now</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-slate-700/70' : 'text-white/70'}`}>Secure Ballot Access</p>
                          </div>
                          <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-900/20 text-slate-900 group-hover/vote:bg-slate-900 group-hover/vote:text-coop-yellow' : 'bg-white/10 text-white group-hover/vote:bg-coop-yellow group-hover/vote:text-coop-green'}`}>
                            <Vote size={24} />
                          </div>
                        </button>
                      ) : (
                        <div className={`mt-auto p-5 rounded-2xl border text-center opacity-70 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-200'}`}>
                          <Activity size={24} className={`mx-auto mb-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                          <p className={`text-xs font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Ballot Access {election.status?.toUpperCase() === 'UPCOMING' ? 'Not Started' : 'Closed'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
