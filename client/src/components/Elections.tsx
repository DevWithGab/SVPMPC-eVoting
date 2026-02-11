import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Activity, Calendar, User, Users, Briefcase, Vote, ArrowRight, Timer, Check, RefreshCw } from 'lucide-react';
import { electionAPI } from '../services/api';
import type { PageView } from '../types';

interface ElectionsProps {
  onNavigate: (page: PageView, electionId?: string) => void;
  onCandidatesClick?: (electionId: string) => void;
}

export const Elections: React.FC<ElectionsProps> = ({ onNavigate, onCandidatesClick }) => {
  const [elections, setElections] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchElections = async () => {
    try {
      setRefreshing(true);
      const data = await electionAPI.getElections();
      
      // Use data directly from backend - no unnecessary transformation
      const processedElections = (Array.isArray(data) ? data : []).map((election: any) => ({
        id: election._id || election.id,
        title: election.title,
        description: election.description,
        status: election.status?.toUpperCase(),
        timeline: election.timeline,
        startDate: election.startDate,
        endDate: election.endDate,
        candidateCount: election.candidateCount || 0,
        positionCount: election.positionCount || 0,
        partylistCount: election.partylistCount || 0,
        backgroundImage: election.backgroundImage || null,
      }));
      
      
      setElections(processedElections);
      // Auto-expand completed elections
      const completedElections = processedElections.filter((e: any) => e.status === 'COMPLETED');
      if (completedElections.length > 0) {
        setExpanded(completedElections[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch elections:', error);
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
      <div className="min-h-screen pt-32 pb-32 px-4 bg-[#fcfcfd] flex items-center justify-center">
        <div className="text-center">
          <Activity size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className="text-coop-darkGreen font-black">Loading elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-32 px-4 bg-[#fcfcfd]">
      <div className="container mx-auto max-w-7xl">
        {/* Architectural Header */}
        <header className="mb-12 sm:mb-20 animate-slideUp">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '35px 35px' }}></div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-12">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-1 sm:w-1.5 h-6 sm:h-8 bg-coop-yellow shadow-[0_0_15px_rgba(242,228,22,0.6)]"></div>
                <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Active Registry Cycles</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-coop-darkGreen tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8">
                Election<br/>
                <span className="text-coop-green">Dashboard</span>
              </h1>
              <p className="text-sm sm:text-2xl text-gray-500 font-medium leading-relaxed max-w-2xl border-l-4 border-coop-green/10 pl-4 sm:pl-8">
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
                    <img 
                      src={election.backgroundImage || 'https://via.placeholder.com/1200x450/333/666?text=Election'} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
                      alt={election.title}
                    />
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
                        {expanded === election.id ? <ChevronDown size={28} /> : (election.status === 'ACTIVE' ? <Activity size={28} /> : <Activity size={28} />)}
                      </div>
                    </div>

                    {/* Bottom Row: Title & Meta */}
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-lg ${
                          election.status === 'ACTIVE' ? 'bg-coop-yellow text-coop-darkGreen' : 'bg-white/10 text-white'
                        }`}>
                          {election.status} Phase
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
                <div className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white overflow-hidden ${
                  expanded === election.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-8 md:p-14 grid lg:grid-cols-12 gap-12 md:gap-20 border-t border-gray-100">
                    
                    {/* Left Column: Timeline */}
                    <div className="lg:col-span-8">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                        <Timer size={14} /> Execution Timeline
                      </h4>
                      <div className="relative pl-4">
                        <div className="absolute left-[21px] top-2 bottom-6 w-0.5 bg-gray-100"></div>
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
                                      isEventActive ? 'bg-white border-coop-green text-coop-green scale-110 shadow-coop-green/20' : 
                                      isCompleted ? 'bg-coop-green border-coop-green text-white' : 'bg-gray-50 border-gray-200 text-gray-300'
                                    }`}>
                                      {isCompleted ? <Check size={20} strokeWidth={3} /> : <div className={`w-2.5 h-2.5 rounded-full ${isEventActive ? 'bg-coop-green animate-pulse' : 'bg-gray-300'}`} />}
                                    </div>
                                    <div className={`transition-opacity duration-300 ${isEventActive ? 'opacity-100' : 'opacity-60 group-hover/timeline:opacity-100'}`}>
                                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isEventActive ? 'text-coop-green' : 'text-gray-400'}`}>
                                        {event.title}
                                      </p>
                                      <p className={`text-base font-bold ${isEventActive ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {event.start} - {event.end}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-4 md:p-8 bg-white border border-gray-100 text-center">
                                <p className="text-gray-500 font-medium">No timeline events available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Actions Sidebar */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Briefcase size={14} /> Operations
                        </h4>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                          Review the official list of candidates, partylists, and positions before entering the voting booth.
                        </p>
                        
                        <button 
                          onClick={() => onNavigate('CANDIDATES', election.id)}
                          className="w-full bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between hover:border-coop-green/50 hover:shadow-lg hover:-translate-y-0.5 transition-all group/btn text-left mb-3"
                        >
                          <div className="flex items-center gap-3">
                            <Users size={18} className="text-gray-400 group-hover/btn:text-coop-green" />
                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest group-hover/btn:text-coop-green">View Candidates</span>
                          </div>
                          <ArrowRight size={14} className="text-gray-300 group-hover/btn:text-coop-green" />
                        </button>

                        <button 
                          className="w-full bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between hover:border-coop-green/50 hover:shadow-lg hover:-translate-y-0.5 transition-all group/btn text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Briefcase size={18} className="text-gray-400 group-hover/btn:text-coop-green" />
                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest group-hover/btn:text-coop-green">Positions</span>
                          </div>
                          <ArrowRight size={14} className="text-gray-300 group-hover/btn:text-coop-green" />
                        </button>
                      </div>

                      {election.status === 'ACTIVE' ? (
                        <button 
                          onClick={() => onNavigate('VOTING')}
                          className="w-full bg-coop-green text-white p-5 rounded-2xl flex items-center justify-between shadow-xl shadow-coop-green/20 hover:bg-coop-darkGreen hover:shadow-2xl hover:-translate-y-1 transition-all group/vote mt-auto overflow-hidden relative"
                        >
                          <div className="relative z-10">
                            <p className="text-lg font-black uppercase tracking-tight">Vote Now</p>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Secure Ballot Access</p>
                          </div>
                          <div className="relative z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover/vote:bg-coop-yellow group-hover/vote:text-coop-green transition-all">
                            <Vote size={24} />
                          </div>
                        </button>
                      ) : (
                        <div className="mt-auto p-5 bg-gray-100 rounded-2xl border border-gray-200 text-center opacity-70">
                          <Activity size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Ballot Access {election.status === 'UPCOMING' ? 'Not Started' : 'Closed'}</p>
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
