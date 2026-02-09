import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Activity, Calendar, User, Users, Briefcase, Vote, ArrowRight, Timer, CheckCircle2, RefreshCw } from 'lucide-react';
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
            {elections.map((election) => (
              <div 
                key={election.id} 
                className={`group bg-white border border-gray-100 shadow-sm transition-all duration-500 overflow-hidden rounded-none ${expanded === election.id ? 'shadow-2xl border-coop-green/30 scale-[1.01]' : 'hover:border-gray-300 hover:shadow-lg'}`}
              >
                {/* Card Header / Summary */}
                <div 
                  className="p-6 md:p-12 lg:p-16 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-6 md:gap-12 relative"
                  onClick={() => setExpanded(expanded === election.id ? null : election.id)}
                >
                  {/* Active Indicator Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 md:w-2 transition-colors ${
                    election.status === 'ACTIVE' ? 'bg-coop-green' : 
                    election.status === 'UPCOMING' ? 'bg-yellow-400' : 
                    'bg-gray-200'
                  }`}></div>

                  <div className="flex items-start gap-4 md:gap-12 w-full">
                    <div className={`w-16 h-16 md:w-32 md:h-32 shrink-0 flex items-center justify-center border-2 transition-colors rounded-none ${
                      election.status === 'ACTIVE' ? 'bg-coop-green/5 border-coop-green/20 text-coop-green' :
                      election.status === 'UPCOMING' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                      'bg-gray-50 border-gray-100 text-gray-300'
                    }`}>
                      {election.status === 'ACTIVE' ? <Activity size={24} className="md:hidden animate-pulse" /> : <Calendar size={24} className="md:hidden" />}
                      {election.status === 'ACTIVE' ? <Activity size={48} className="hidden md:block animate-pulse" /> : <Calendar size={48} className="hidden md:block" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <h3 className="text-xl sm:text-2xl md:text-5xl font-black text-coop-darkGreen uppercase tracking-tight leading-none truncate">{election.title}</h3>
                        {election.status === 'ACTIVE' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-100">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> LIVE
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-sm ${election.status === 'DRAFT' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                          {election.status}
                        </span>
                      </div>
                      <p className="text-sm md:text-xl text-gray-500 font-medium max-w-3xl leading-relaxed line-clamp-2 md:line-clamp-none">{election.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto mt-4 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center transition-all duration-500 ${expanded === election.id ? 'bg-coop-darkGreen text-white rotate-180' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                      <ChevronDown size={20} className="md:hidden" />
                      <ChevronDown size={28} className="hidden md:block" />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expanded === election.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="border-t border-gray-100 bg-gray-50/30 p-6 md:p-12 lg:p-16">
                    
                    <div className="grid lg:grid-cols-12 gap-10 md:gap-16">
                        {/* Left Column: Timeline */}
                        <div className="lg:col-span-8">
                            <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2 md:gap-3">
                                <Timer size={14} className="md:hidden" />
                                <Timer size={16} className="hidden md:block" /> Execution Timeline
                            </h4>
                            <div className="relative pl-0 md:pl-2">
                                {/* Vertical connecting line */}
                                <div className="absolute top-6 bottom-6 left-[21px] md:left-[27px] w-0.5 bg-gray-200"></div>

                                <div className="space-y-6 md:space-y-10">
                                    {(() => {
                                      // Extract all phases from timeline, or generate them if missing
                                      let timeline = election.timeline || [];
                                      
                                      // If timeline doesn't have pre-election phase, add it
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
                                          // Determine if phase is completed, active, or upcoming
                                          let isCompleted = false;
                                          let isActive = false;
                                          
                                          if (i === 0) { // Pre-election phase
                                            isActive = election.status?.toUpperCase() === 'UPCOMING';
                                            isCompleted = election.status?.toUpperCase() === 'ACTIVE' || election.status?.toUpperCase() === 'COMPLETED';
                                          } else if (i === 1) { // Voting phase
                                            isActive = election.status?.toUpperCase() === 'ACTIVE';
                                            isCompleted = election.status?.toUpperCase() === 'COMPLETED';
                                          } else if (i === 2) { // Appeal phase
                                            isActive = election.status?.toUpperCase() === 'COMPLETED';
                                            isCompleted = false; // Appeal period never really completes in this context
                                          }
                                          
                                          return (
                                            <div key={i} className="relative flex items-start gap-4 md:gap-8 group">
                                              {/* Node */}
                                              <div className={`relative z-10 w-11 h-11 md:w-14 md:h-14 rounded-full border-4 flex items-center justify-center shrink-0 transition-all ${
                                                isActive ? 'bg-white border-coop-green shadow-[0_0_0_4px_rgba(45,122,62,0.1)]' : 
                                                isCompleted ? 'bg-coop-darkGreen border-coop-darkGreen' : 'bg-gray-100 border-white'
                                              }`}>
                                                {isCompleted && <CheckCircle2 size={16} className="md:hidden text-white" />}
                                                {isCompleted && <CheckCircle2 size={24} className="hidden md:block text-white" />}
                                                {isActive && <div className="w-2.5 h-2.5 md:w-4 md:h-4 bg-coop-green rounded-full animate-pulse"></div>}
                                              </div>

                                              <div className={`flex-grow p-4 md:p-8 bg-white border transition-all ${isActive ? 'border-coop-green shadow-lg scale-[1.01] md:scale-[1.02]' : 'border-gray-100 shadow-sm'}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 mb-2 md:mb-4">
                                                  <h5 className={`text-[10px] md:text-sm font-black uppercase tracking-widest ${isActive ? 'text-coop-darkGreen' : 'text-gray-500'}`}>
                                                    {event.title}
                                                  </h5>
                                                  {isActive && (
                                                    <span className="w-fit px-2 py-1 bg-coop-green/10 text-coop-green text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-sm border border-coop-green/10">
                                                      Current Phase
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                                                  <div>
                                                    <p className="text-[8px] md:text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Start Protocol</p>
                                                    <p className="text-xs md:text-sm lg:text-lg font-bold text-gray-900">{event.start}</p>
                                                    <p className="text-[8px] md:text-[9px] text-gray-500">{event.time}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-[8px] md:text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">End Protocol</p>
                                                    <p className="text-xs md:text-sm lg:text-lg font-bold text-gray-900">{event.end}</p>
                                                    <p className="text-[8px] md:text-[9px] text-gray-500">{event.endTime}</p>
                                                  </div>
                                                </div>
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

                        {/* Right Column: Stats & Actions */}
                        <div className="lg:col-span-4 space-y-6 md:space-y-8">
                            <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2 md:gap-3">
                                <Activity size={14} className="md:hidden" />
                                <Activity size={16} className="hidden md:block" /> Registry Data
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
                                <div 
                                  onClick={() => onNavigate('CANDIDATES', election.id)}
                                  className="bg-white p-6 md:p-8 border border-gray-100 flex items-center justify-between shadow-sm cursor-pointer group hover:border-coop-green hover:shadow-lg transition-all relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-4 md:gap-6 group-hover:opacity-20 transition-opacity">
                                        <div className="p-3 md:p-4 bg-gray-50 text-gray-400"><User size={20} className="md:hidden" /><User size={24} className="hidden md:block" /></div>
                                        <div>
                                            <p className="text-xl md:text-3xl font-black text-gray-900 leading-none">{election.candidateCount || 0}</p>
                                            <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest">Qualified Candidates</p>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-coop-green/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-2 md:gap-3 text-coop-darkGreen font-black text-[10px] md:text-sm uppercase tracking-widest">
                                            View <ArrowRight size={14} className="md:hidden" /><ArrowRight size={18} className="hidden md:block" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 md:p-8 border border-gray-100 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="p-3 md:p-4 bg-gray-50 text-gray-400"><Users size={20} className="md:hidden" /><Users size={24} className="hidden md:block" /></div>
                                        <div>
                                            <p className="text-xl md:text-3xl font-black text-gray-900 leading-none">{election.partylistCount || 0}</p>
                                            <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest">Registered Parties</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 md:p-8 border border-gray-100 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="p-3 md:p-4 bg-gray-50 text-gray-400"><Briefcase size={20} className="md:hidden" /><Briefcase size={24} className="hidden md:block" /></div>
                                        <div>
                                            <p className="text-xl md:text-3xl font-black text-gray-900 leading-none">{election.positionCount || 0}</p>
                                            <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest">Open Seats</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {election.status === 'ACTIVE' && (
                                <button 
                                    onClick={() => onNavigate('VOTING')}
                                    className="w-full mt-6 md:mt-10 py-5 md:py-6 bg-coop-darkGreen text-white text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.25em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 md:gap-4 group"
                                >
                                    Proceed to Ballot <Vote size={16} className="md:hidden group-hover:rotate-12 transition-transform" /><Vote size={18} className="hidden md:block group-hover:rotate-12 transition-transform" />
                                </button>
                            )}
                        </div>
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
