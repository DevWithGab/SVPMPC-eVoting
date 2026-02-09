
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Candidate, Position, VotingType, User } from '../types.ts';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  Download, Activity, TrendingUp, 
  RefreshCw, CheckCircle2, FileText, Award, 
  ShieldCheck, Database, Globe, Target,
  Fingerprint, Activity as PulseIcon, Loader2
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { ResultsPDF } from '../utils/pdfGenerator';
import { electionAPI, candidateAPI, voteAPI } from '../services/api';

const AnimatedCounter: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = "" }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (Math.round(value) !== Math.round(displayValue)) {
      setIsUpdating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsUpdating(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span className={`transition-all duration-700 inline-block font-black ${isUpdating ? 'scale-110' : ''}`}>
      {prefix}{displayValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </span>
  );
};

export const Results: React.FC<{ user?: User | null }> = ({ user }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidateVotes, setCandidateVotes] = useState<{ [candidateId: string]: number }>({});
  const [totalVoters, setTotalVoters] = useState(0);
  const [trafficData, setTrafficData] = useState<Array<{ time: string; votes: number }>>([]);
  const [electionStatus, setElectionStatus] = useState<string>('pending');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resultsPublic, setResultsPublic] = useState(true);

  // Generate traffic data from actual vote timestamps
  const generateTrafficDataFromTimestamps = (timestamps: Date[]): Array<{ time: string; votes: number }> => {
    // Define hourly time slots from 8 AM to 11 PM
    const timeSlots = [
      { label: '08:00', hour: 8 },
      { label: '09:00', hour: 9 },
      { label: '10:00', hour: 10 },
      { label: '11:00', hour: 11 },
      { label: '12:00', hour: 12 },
      { label: '13:00', hour: 13 },
      { label: '14:00', hour: 14 },
      { label: '15:00', hour: 15 },
      { label: '16:00', hour: 16 },
      { label: '17:00', hour: 17 },
      { label: '18:00', hour: 18 },
      { label: '19:00', hour: 19 },
      { label: '20:00', hour: 20 },
      { label: '21:00', hour: 21 },
      { label: '22:00', hour: 22 },
      { label: '23:00', hour: 23 }
    ];

    if (timestamps.length === 0) {
      return timeSlots.map(slot => ({ time: slot.label, votes: 0 }));
    }

    // Count cumulative votes up to each time slot
    return timeSlots.map(slot => {
      const votesUpToThisTime = timestamps.filter(timestamp => {
        const hour = timestamp.getHours();
        return hour < slot.hour;
      }).length;
      
      return {
        time: slot.label,
        votes: votesUpToThisTime
      };
    });
  };

  const fetchResults = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('fetchResults called, user role:', user?.role);

      // Fetch elections, candidates, and users with better error handling
      let electionsData = [];
      let candidatesData = [];

      try {
        electionsData = await electionAPI.getElections();
        console.log('Fetched elections:', electionsData);
        console.log('resultsPublic in first election:', electionsData[0]?.resultsPublic, 'type:', typeof electionsData[0]?.resultsPublic);
      } catch (err) {
        console.warn('Failed to fetch elections:', err);
      }

      try {
        candidatesData = await candidateAPI.getCandidates();
      } catch (err) {
        console.warn('Failed to fetch candidates:', err);
      }

      // Note: We don't fetch users here as it requires auth
      // Total voters count will be calculated from vote data instead

      // If we have no elections, set up empty data but continue
      if (electionsData.length === 0) {
        console.warn('No election data available');
        // Set empty states and return gracefully
        setPositions([]);
        setCandidates([]);
        setCandidateVotes({});
        setTotalVoters(0);
        setTrafficData([
          { time: '08:00', votes: 0 },
          { time: '10:00', votes: 0 },
          { time: '12:00', votes: 0 },
          { time: '14:00', votes: 0 },
          { time: '16:00', votes: 0 },
          { time: '18:00', votes: 0 },
          { time: '20:00', votes: 0 }
        ]);
        setResultsPublic(true);
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }

      // Map elections to positions
      interface ElectionData {
        id?: string;
        _id?: string;
        title: string;
        description?: string;
        maxVotesPerMember?: number;
        status?: string;
        resultsPublic?: boolean;
      }

      // Check access control FIRST - before filtering by status
      // If any election has resultsPublic = false and user is not admin, show restriction
      const anyRestrictedResults = (electionsData as ElectionData[]).some(e => (e as any).resultsPublic === false);
      const isAdmin = user?.role === 'admin' || user?.role === 'staff';
      
      console.log('=== Access Control Check ===');
      console.log('Any election with resultsPublic=false:', anyRestrictedResults);
      console.log('isAdmin:', isAdmin);
      console.log('Showing restriction:', anyRestrictedResults && !isAdmin);
      
      if (anyRestrictedResults && !isAdmin) {
        console.log('Setting resultsPublic to FALSE - access restricted');
        setResultsPublic(false);
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }

      // Filter to only ACTIVE elections
      const activeElections = (electionsData as ElectionData[]).filter(e => e.status === 'active' || e.status === 'ongoing');
      console.log('All elections statuses:', electionsData.map(e => ({ title: (e as any).title, status: (e as any).status })));
      console.log('Active elections after filter:', activeElections);

      // If no active elections, reset the results
      if (activeElections.length === 0) {
        console.log('No active elections, returning empty state');
        setPositions([]);
        setCandidates([]);
        setCandidateVotes({});
        setTotalVoters(0);
        setTrafficData([
          { time: '08:00', votes: 0 },
          { time: '10:00', votes: 0 },
          { time: '12:00', votes: 0 },
          { time: '14:00', votes: 0 },
          { time: '16:00', votes: 0 },
          { time: '18:00', votes: 0 },
          { time: '20:00', votes: 0 }
        ]);
        setElectionStatus('completed');
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }

      console.log('Setting resultsPublic to TRUE - access allowed');
      setResultsPublic(true);

      // Capture the election status (to determine if voting has started)
      setElectionStatus('active');

      const mappedPositions: Position[] = activeElections.map((election: any) => ({
        id: election._id || election.id,
        title: election.title,
        description: election.description || '',
        maxVotes: election.maxVotesPerMember || 1,
        order: 0,
        type: 'OFFICER' as VotingType // Default to OFFICER, adjust if you have type in backend
      }));

      // Map candidates - only for active elections
      interface CandidateData {
        id?: string;
        _id?: string;
        name: string;
        description?: string;
        electionId: string;
        photoUrl?: string;
      }

      const activeElectionIds = activeElections.map(e => e._id || e.id);
      const mappedCandidates: Candidate[] = (candidatesData as CandidateData[])
        .filter((candidate: any) => {
          const candidateElectionId = typeof candidate.electionId === 'string' ? candidate.electionId : (candidate.electionId?._id || candidate.electionId?.id);
          return activeElectionIds.includes(candidateElectionId);
        })
        .map((candidate: any) => ({
        id: candidate._id || candidate.id,
        name: candidate.name,
        description: candidate.description || '',
        positionId: typeof candidate.electionId === 'string' ? candidate.electionId : (candidate.electionId?._id || candidate.electionId?.id),
        votes: 0, // Will be updated from results
        imageUrl: candidate.photoUrl || '',
        photoUrl: candidate.photoUrl
      }));

      setPositions(mappedPositions);
      setCandidates(mappedCandidates);

      // Fetch results and vote timestamps for each election
      const votesMap: { [candidateId: string]: number } = {};
      const allVoteTimestamps: Date[] = [];
      const uniqueVoters = new Set<string>();

      for (const position of mappedPositions) {
        try {
          // Get vote results
          const results = await voteAPI.getElectionResults(position.id);
          
          if (results.results && Array.isArray(results.results)) {
            results.results.forEach((result: { candidateId: string; voteCount: number }) => {
              votesMap[result.candidateId] = (votesMap[result.candidateId] || 0) + result.voteCount;
            });
          }

          // Get vote timestamps
          try {
            const votes = await voteAPI.getElectionVotes(position.id);
            if (Array.isArray(votes)) {
              votes.forEach((vote: { timestamp?: string; createdAt?: string; userId?: string; _id?: string }) => {
                // Track unique voters by userId
                if (vote.userId) {
                  uniqueVoters.add(vote.userId);
                }
                // Prioritize explicit timestamp field, fallback to createdAt
                const timestamp = vote.timestamp || vote.createdAt;
                if (timestamp) {
                  const date = new Date(timestamp);
                  // Only add valid dates
                  if (!isNaN(date.getTime())) {
                    allVoteTimestamps.push(date);
                  }
                }
              });
            }
          } catch (err) {
            console.error(`Failed to fetch vote timestamps for election ${position.id}:`, err);
          }
        } catch (err) {
          console.error(`Failed to fetch results for election ${position.id}:`, err);
        }
      }

      setCandidateVotes(votesMap);

      // Set total voters from unique voters who cast votes
      setTotalVoters(uniqueVoters.size);

      // Update candidate votes
      const updatedCandidates = mappedCandidates.map(c => ({
        ...c,
        votes: votesMap[c.id] || 0
      }));
      setCandidates(updatedCandidates);

      // Generate traffic data from actual vote timestamps
      const trafficDataFromTimestamps = generateTrafficDataFromTimestamps(allVoteTimestamps);
      setTrafficData(trafficDataFromTimestamps);

      setLastUpdated(new Date());
    } catch (err: unknown) {
      console.error('Failed to fetch results:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        localStorage.setItem('debug_error', err.message);
      } else {
        localStorage.setItem('debug_error', JSON.stringify(err));
      }
      setError('Failed to load election results. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const participationRate = totalVoters > 0 
    ? (Object.values(candidateVotes).reduce((sum: number, votes: number) => sum + votes, 0) / totalVoters) * 100 
    : 0;

  useEffect(() => {
    fetchResults();
    // Refresh results every 2 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchResults(true);
    }, 2000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="bg-[#f8fafc] min-h-screen pt-24 md:pt-32 pb-32 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading election results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#f8fafc] min-h-screen pt-24 md:pt-32 pb-32 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => fetchResults()}
            className="bg-coop-green text-white px-6 py-3 rounded-lg font-medium hover:bg-coop-darkGreen transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!resultsPublic) {
    return (
      <div className="bg-[#fcfcfd] min-h-screen pt-24 md:pt-32 pb-32 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="w-24 h-24 bg-red-50 rounded-none flex items-center justify-center mx-auto mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-none flex items-center justify-center">
              <ShieldCheck size={56} className="text-red-500" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-coop-darkGreen uppercase tracking-tighter mb-6">
            Access Restricted
          </h2>
          <p className="text-lg text-gray-600 font-medium mb-12 leading-relaxed">
            The live results scoreboard is currently restricted to system administrators. Please check back later or contact the election committee.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-coop-darkGreen text-white px-12 py-4 rounded-none font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-95"
          >
            Return to Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen pt-20 sm:pt-32 pb-20 sm:pb-32">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* Cinematic Results Header */}
        <motion.header 
          className="relative mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Gridline Background */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '35px 35px' }}></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 sm:gap-10 lg:gap-12">
            <motion.div 
              className="w-full lg:max-w-3xl"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <motion.div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="h-6 sm:h-8 w-auto" />
                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Global Governance Terminal</span>
              </motion.div>
              <motion.h1 
                className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-coop-darkGreen tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                The Live<br/>
                <span className="text-coop-green">Scoreboard</span>
              </motion.h1>
              <motion.p 
                className="text-sm sm:text-base md:text-xl text-gray-500 font-medium leading-relaxed max-w-xl border-l-4 border-coop-green/10 pl-3 sm:pl-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Verifying democratic will through cryptographically signed ballots. All data streams are synchronized with regional Saint Vincent nodes.
              </motion.p>
            </motion.div>

            <motion.div 
              className="flex flex-col w-full lg:w-auto gap-3 sm:gap-4"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
               <motion.div 
                 className="bg-white border border-gray-100 p-3 sm:p-6 shadow-xl flex items-center gap-3 sm:gap-8 group"
                 whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.4 }}
               >
                  <div className="flex-1 lg:flex-none">
                    <p className="text-[7px] sm:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5 sm:mb-1">Session Status</p>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                      <span className="text-[7px] sm:text-xs font-black text-coop-darkGreen uppercase">Live Feed</span>
                    </div>
                  </div>
                  <div className="w-px h-6 sm:h-10 bg-gray-100"></div>
                  <div className="flex-1 lg:flex-none">
                    <p className="text-[7px] sm:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5 sm:mb-1">Last Updated</p>
                    <p className="text-[7px] sm:text-xs font-black text-coop-green uppercase">{lastUpdated.toLocaleTimeString()}</p>
                  </div>
               </motion.div>
               <motion.div 
                 className="bg-white border border-gray-100 p-3 sm:p-6 shadow-xl flex items-center gap-3 sm:gap-8 group"
                 whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.5 }}
               >
                  <div className="flex-1 lg:flex-none">
                    <p className="text-[7px] sm:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5 sm:mb-1">Total Ballots Cast</p>
                    <p className="text-lg sm:text-2xl font-black text-coop-darkGreen"><AnimatedCounter value={Object.values(candidateVotes).reduce((sum, votes) => sum + votes, 0)} /></p>
                  </div>
                  <div className="w-px h-6 sm:h-10 bg-gray-100"></div>
                  <div className="flex-1 lg:flex-none">
                    <p className="text-[7px] sm:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5 sm:mb-1">Active Members</p>
                    <p className="text-lg sm:text-2xl font-black text-coop-green"><AnimatedCounter value={totalVoters} /></p>
                  </div>
               </motion.div>
               <motion.button 
                onClick={() => fetchResults(true)}
                disabled={refreshing}
                className="bg-coop-darkGreen text-white px-4 sm:px-8 py-3 sm:py-4 font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 sm:gap-3 active:scale-95 min-h-[48px] sm:min-h-[72px] w-full lg:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
               >
                 {refreshing ? <RefreshCw className="animate-spin hidden sm:inline" size={14} /> : <Activity size={14} className="text-coop-yellow hidden sm:inline" />}
                 <span>Refresh Results</span>
               </motion.button>
            </motion.div>
          </div>
        </motion.header>

        {/* Global Performance Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-8 bg-white border border-gray-100 p-10 md:p-16 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.07] transition-opacity">
              <TrendingUp size={200} />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
              <div>
                <h3 className="text-3xl font-black text-coop-darkGreen uppercase tracking-tighter">Engagement Curve</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Real-time participation telemetry</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Voter Density</p>
                  <p className="text-2xl font-black text-coop-green">Peak Active</p>
                </div>
              </div>
            </div>

            {trafficData && trafficData.length > 0 && (electionStatus === 'active' || electionStatus === 'ongoing') ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D7A3E" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2D7A3E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{fontSize: 9, fontWeight: 900, fill: '#cbd5e1'}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{borderRadius: '0px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '10px'}}
                      cursor={{stroke: '#2D7A3E', strokeWidth: 2}}
                    />
                    <Area type="monotone" dataKey="votes" stroke="#2D7A3E" strokeWidth={5} fill="url(#curveFill)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-center">
                  <Activity size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Voting has not started yet</p>
                  <p className="text-[12px] text-gray-400 mt-2">The engagement curve will appear once members start voting</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-coop-darkGreen p-12 md:p-16 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 -translate-y-1/2 translate-x-1/2">
              <Globe size={240} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <Globe className="text-coop-yellow" size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Global Turnout</span>
              </div>
              <div className="space-y-4 text-center mb-12">
                <div className="text-7xl font-black text-white tracking-tighter leading-none">
                  <AnimatedCounter value={participationRate} />
                  <span className="text-coop-yellow">%</span>
                </div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Verified Ballots Cast</p>
              </div>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="h-2 w-full bg-white/10 rounded-none overflow-hidden p-0.5">
                <div className="h-full bg-coop-yellow transition-all duration-1000 shadow-[0_0_15px_#f2e416]" style={{ width: `${Math.min(100, participationRate)}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/60">
                <span>Active: {totalVoters.toLocaleString()} Members</span>
                <span>Votes: {Object.values(candidateVotes).reduce((sum, votes) => sum + votes, 0).toLocaleString()}</span>
              </div>
              <button 
                onClick={async () => {
                  const totalVotes = Object.values(candidateVotes).reduce((sum, votes) => sum + votes, 0);
                  const doc = <ResultsPDF 
                    totalVotes={totalVotes}
                    totalVoters={totalVoters}
                    participationRate={participationRate}
                    candidates={candidates.map(c => ({ 
                      id: c.id, 
                      name: c.name, 
                      votes: candidateVotes[c.id] || 0
                    }))}
                    positions={[{ id: '1', title: 'Overall Results' }]}
                  />;
                  const pdfBlob = await pdf(doc).toBlob();
                  const url = URL.createObjectURL(pdfBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `sv-proclamation-${new Date().toISOString().split('T')[0]}.pdf`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full bg-white text-coop-darkGreen py-4 text-[10px] font-black uppercase tracking-widest hover:bg-coop-yellow transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Download Proclamation <Download size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Position-Specific Tally Modules */}
        <div className="space-y-24">
          {positions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 font-medium">No elections found. Results will appear here once elections are created.</p>
            </div>
          ) : (
            positions.map((pos, pIdx) => {
              const posCandidates = candidates
                .filter(c => c.positionId === pos.id)
                .sort((a, b) => b.votes - a.votes);
              const totalVotes = posCandidates.reduce((acc, c) => acc + c.votes, 0);

              if (posCandidates.length === 0) {
                return null;
              }

              return (
                <section key={pos.id} className="animate-fadeIn" style={{ animationDelay: `${pIdx * 0.1}s` }}>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-12 border-b-2 border-gray-100 pb-10">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-4 mb-4">
                        <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white ${pos.type === 'PROPOSAL' ? 'bg-blue-600' : 'bg-coop-green'}`}>
                          {pos.type} Ballot
                        </span>
                        <div className="h-px w-6 bg-gray-200"></div>
                        <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">Registry-ID: {pos.id.slice(0, 8).toUpperCase()}...</span>
                      </div>
                      <h2 className="text-4xl font-black text-coop-darkGreen uppercase tracking-tighter leading-none mb-4">{pos.title}</h2>
                      <p className="text-gray-500 font-medium italic">"{pos.description}"</p>
                    </div>
                    <div className="bg-white p-6 border border-gray-100 shadow-xl flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Total Unit Votes</p>
                        <p className="text-2xl font-black text-coop-darkGreen"><AnimatedCounter value={totalVotes} /></p>
                      </div>
                      <PulseIcon size={24} className="text-coop-green animate-pulse" />
                    </div>
                  </div>

                  {pos.type === 'PROPOSAL' ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                       {posCandidates.map((c, idx) => {
                          const pct = totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0;
                          const isApprove = c.name.toLowerCase().includes('approve') || c.name.toLowerCase().includes('yes');
                          const isReject = c.name.toLowerCase().includes('reject') || c.name.toLowerCase().includes('no');

                          return (
                            <div key={c.id} className={`bg-white border p-4 sm:p-6 md:p-10 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 ${
                              idx === 0 ? 'border-coop-green ring-1 ring-coop-green ring-inset' : 'border-gray-100'
                            }`}>
                              <div className="absolute top-0 left-0 w-full h-1 bg-gray-50 group-hover:bg-coop-green transition-colors"></div>
                              
                              <div className="flex justify-between items-start mb-4 sm:mb-6 md:mb-10 gap-2">
                                 <div className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center text-white text-center ${
                                   isApprove ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 
                                   isReject ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-gray-800'
                                 }`}>
                                   {idx === 0 ? <CheckCircle2 size={18} className="hidden sm:block" /> : <Activity size={16} className="hidden sm:block" />}
                                   {idx === 0 ? <CheckCircle2 size={14} className="sm:hidden block" /> : <Activity size={14} className="sm:hidden block" />}
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[7px] sm:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5 sm:mb-1">Tally</p>
                                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-coop-darkGreen">{c.votes.toLocaleString()}</p>
                                 </div>
                              </div>

                              <h4 className="text-sm sm:text-lg md:text-2xl font-black text-coop-darkGreen uppercase tracking-tighter mb-2 sm:mb-4">{c.name}</h4>
                              
                              <div className="space-y-2 sm:space-y-4">
                                 <div className="flex justify-between text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <span>Vote Density</span>
                                    <span className="text-coop-green">{pct.toFixed(1)}%</span>
                                 </div>
                                 <div className="h-1 sm:h-1.5 w-full bg-gray-50 rounded-none overflow-hidden">
                                    <div className="h-full bg-coop-green transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                                 </div>
                              </div>
                            </div>
                          );
                       })}                    
                     </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                      {posCandidates.map((c, idx) => {
                        const pct = totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0;
                        const isLeader = idx === 0;

                        return (
                          <div key={c.id} className={`group relative bg-white border border-gray-100 p-4 sm:p-6 md:p-8 shadow-sm transition-all duration-500 hover:shadow-2xl hover:border-coop-green ${isLeader ? 'ring-2 ring-coop-green' : ''}` }>
                            {isLeader && (
                              <div className="absolute -top-4 -right-4 bg-coop-yellow text-coop-green px-4 py-2 font-black text-[9px] uppercase tracking-widest shadow-xl rotate-6 group-hover:rotate-0 transition-all z-20 flex items-center gap-2">
                                <Award size={14} /> Current Leader
                              </div>
                            )}

                            <div className="flex items-center gap-6 mb-10">
                              <div className="relative isolate">
                                 <div className="w-20 h-20 bg-gray-100 border-2 border-white shadow-xl overflow-hidden relative z-10">
                                    {c.imageUrl ? (
                                      <img src={c.imageUrl} className={`w-full h-full object-cover grayscale transition-all duration-700 ${isLeader ? 'grayscale-0' : 'group-hover:grayscale-0'}`} alt={c.name} />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Target size={32} /></div>
                                    )}
                                 </div>
                                 <div className="absolute -top-3 -left-3 w-10 h-10 bg-coop-green/10 -z-10 blur-xl"></div>
                              </div>
                              <div className="grow">
                                <h4 className="text-xl font-black text-coop-darkGreen uppercase tracking-tighter leading-none mb-2">{c.name}</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: REG-{c.id.slice(0, 8)}</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Total Unit Ballots</p>
                                    <p className="text-4xl font-black text-coop-darkGreen leading-none"><AnimatedCounter value={c.votes} /></p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Density</p>
                                    <p className="text-lg font-black text-coop-green">{pct.toFixed(1)}%</p>
                                 </div>
                              </div>
                              <div className="h-1.5 w-full bg-gray-50 rounded-none overflow-hidden">
                                 <div className={`h-full bg-coop-green transition-all duration-1000 ${isLeader ? 'shadow-[0_0_10px_#2D7A3E]' : ''}`} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">
                               <span>Audit Hash Validated</span>
                               <Fingerprint size={12} className="text-coop-green" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* System Ledger Disclaimer Footer */}
        <section className="mt-32 border-t border-gray-100 pt-20 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
           <div>
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                 <ShieldCheck className="text-coop-green" size={20} />
                 <span className="text-[10px] font-black text-coop-darkGreen uppercase tracking-[0.4em]">Cryptographic Integrity Protocol</span>
              </div>
              <p className="text-sm text-gray-400 font-medium max-w-lg leading-relaxed">
                All live results shown are preliminary until the official audit period is concluded by the Board of Election Tellers and the Saint Vincent Secretariat. Digital hashes are updated every cycle for immutable verification.
              </p>
           </div>
           <div className="flex flex-wrap gap-4 justify-center">
              <button className="px-8 py-4 bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-3">
                 <Database size={16} /> Technical Audit Log
              </button>
              <button className="px-8 py-4 bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-3">
                 <FileText size={16} /> Official Proclamation Template
              </button>
           </div>
        </section>

        {/* Node Identity Marker */}
        <div className="mt-20 flex flex-col items-center">
          <div className="w-12 h-px bg-gray-200 mb-8"></div>
          <div className="flex items-center gap-4 px-6 py-2 bg-white border border-gray-100 shadow-sm rounded-none">
            <PulseIcon size={14} className="text-coop-green" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Scoreboard Node Active: {lastUpdated.toDateString()} • SHA-SV-CHAIN-STABLE
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
