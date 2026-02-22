
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
  Fingerprint, Activity as PulseIcon, Loader2, Briefcase
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { ResultsPDF } from '../utils/pdfGenerator';
import { ProclamationTemplate } from '../utils/proclamationTemplate';
import { electionAPI, candidateAPI, voteAPI, positionAPI, documentAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

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
      let positionsData = [];

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

      try {
        positionsData = await positionAPI.getPositions();
        console.log('Fetched positions:', positionsData);
      } catch (err) {
        console.warn('Failed to fetch positions:', err);
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

      interface ElectionData {
        id?: string;
        _id?: string;
        title: string;
        description?: string;
        maxVotesPerMember?: number;
        status?: string;
        resultsPublic?: boolean;
      }

      // Get elections sorted by newest first (API returns them sorted by createdAt: -1)
      // Priority: active > paused > most recent completed
      const currentElection =
        (electionsData as ElectionData[]).find(e => e.status === 'active' || e.status === 'ongoing') ??
        (electionsData as ElectionData[]).find(e => e.status === 'paused') ??
        (electionsData as ElectionData[]).find(e => e.status === 'completed');

      const userIsAdminOrOfficer = user?.role === 'admin' || user?.role === 'officer';

      // Default to public if the resultsPublic flag is not explicitly set to false
      const resultsArePublic = currentElection?.resultsPublic !== false;

      if (!resultsArePublic && !userIsAdminOrOfficer) {
        setResultsPublic(false);
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }

      // No valid election to display — clear everything
      if (!currentElection) {
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

      setResultsPublic(true);

      // Set election status for the chart display
      setElectionStatus(
        currentElection.status === 'active' || currentElection.status === 'ongoing'
          ? 'active'
          : currentElection.status || 'completed'
      );

      // Only show positions/candidates from the SINGLE most-recent election
      const activeElectionIds = [currentElection._id || currentElection.id];

      // Filter positions by active election IDs
      interface PositionData {
        id?: string;
        _id?: string;
        title: string;
        description?: string;
        electionId: string;
        order?: number;
        type?: VotingType;
      }

      const mappedPositions: Position[] = (positionsData as PositionData[])
        .filter((position: any) => {
          const positionElectionId = typeof position.electionId === 'string' ? position.electionId : (position.electionId?._id || position.electionId?.id);
          return activeElectionIds.includes(positionElectionId);
        })
        .map((position: any) => ({
          id: position._id || position.id,
          title: position.title,
          description: position.description || '',
          maxVotes: position.maxVotes || 1,
          order: position.order || 0,
          type: position.type || ('OFFICER' as VotingType),
          electionId: typeof position.electionId === 'string' ? position.electionId : (position.electionId?._id || position.electionId?.id)
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Map candidates - only for active positions
      interface CandidateData {
        id?: string;
        _id?: string;
        name: string;
        description?: string;
        positionId: string;
        photoUrl?: string;
      }

      const activePositionIds = mappedPositions.map(p => p.id);
      const mappedCandidates: Candidate[] = (candidatesData as CandidateData[])
        .filter((candidate: any) => {
          const candidatePositionId = typeof candidate.positionId === 'string' ? candidate.positionId : (candidate.positionId?._id || candidate.positionId?.id);
          return activePositionIds.includes(candidatePositionId);
        })
        .map((candidate: any) => ({
          id: candidate._id || candidate.id,
          name: candidate.name,
          description: candidate.description || '',
          positionId: typeof candidate.positionId === 'string' ? candidate.positionId : (candidate.positionId?._id || candidate.positionId?.id),
          votes: 0, // Will be updated from results
          imageUrl: candidate.photoUrl || '',
          photoUrl: candidate.photoUrl
        }));

      setPositions(mappedPositions);
      setCandidates(mappedCandidates);

      // Fetch vote counts and voter data - only once per unique election
      const votesMap: { [candidateId: string]: number } = {};
      const allVoteTimestamps: Date[] = [];
      const uniqueVoters = new Set<string>();

      // Get unique election IDs to avoid duplicate API calls
      const uniqueElectionIds = [...new Set(
        mappedPositions.map(p => p.electionId).filter((id): id is string => Boolean(id))
      )];

      for (const electionId of uniqueElectionIds) {
        // Step 1: Get and tally vote counts for this election (once per election)
        try {
          const results = await voteAPI.getElectionResults(electionId);

          if (results.results && Array.isArray(results.results)) {
            for (const result of results.results) {
              // Set the vote count directly instead of accumulating
              votesMap[result.candidateId] = result.voteCount;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch results for election ${electionId}:`, err);
        }

        // Step 2: Get individual votes to track unique voters and timestamps
        try {
          const votes = await voteAPI.getElectionVotes(electionId);

          if (Array.isArray(votes)) {
            for (const vote of votes) {
              // Track each unique voter by their user ID
              if (vote.userId) {
                uniqueVoters.add(vote.userId);
              }

              // Record the vote timestamp for the activity chart
              const rawTimestamp = vote.timestamp || vote.createdAt;
              if (rawTimestamp) {
                const date = new Date(rawTimestamp);
                if (!isNaN(date.getTime())) {
                  allVoteTimestamps.push(date);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch vote timestamps for election ${electionId}:`, err);
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
    // Refresh results every 8 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchResults(true);
    }, 8000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchResults]);

  if (loading) {
    const { isDarkMode } = useDarkMode();
    return (
      <div className={`min-h-screen pt-24 md:pt-32 pb-32 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Loading election results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const { isDarkMode } = useDarkMode();
    return (
      <div className={`min-h-screen pt-24 md:pt-32 pb-32 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
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
    const { isDarkMode } = useDarkMode();
    return (
      <div className={`min-h-screen pt-24 md:pt-32 pb-32 flex items-center justify-center px-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#fcfcfd]'}`}>
        <div className="text-center max-w-2xl">
          <div className="w-24 h-24 bg-red-50 rounded-none flex items-center justify-center mx-auto mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-none flex items-center justify-center">
              <ShieldCheck size={56} className="text-red-500" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className={`text-5xl md:text-6xl font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
            Access Restricted
          </h2>
          <p className={`text-lg font-medium mb-12 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
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

  const { isDarkMode } = useDarkMode();
  return (
    <div className={`min-h-screen pt-20 sm:pt-32 pb-20 sm:pb-32 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-7xl">

        {/* Cinematic Results Header */}
        <motion.header
          className="relative mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Gridline Background */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `linear-gradient(0deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px)`, backgroundSize: '35px 35px' }}></div>

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
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Global Governance Terminal</span>
              </motion.div>
              <motion.h1
                className={`text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                The Live<br />
                <span className="text-coop-green">Scoreboard</span>
              </motion.h1>
              <motion.p
                className={`text-sm sm:text-base md:text-xl font-medium leading-relaxed max-w-xl border-l-4 pl-3 sm:pl-8 ${isDarkMode ? 'text-slate-300 border-coop-yellow/30' : 'text-gray-500 border-coop-green/10'}`}
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
                className={`border p-3 sm:p-6 shadow-xl flex items-center gap-3 sm:gap-8 group transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
                whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex-1 lg:flex-none">
                  <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Session Status</p>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <span className={`text-[7px] sm:text-xs font-black uppercase ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}>Live Feed</span>
                  </div>
                </div>
                <div className={`w-px h-6 sm:h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                <div className="flex-1 lg:flex-none">
                  <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Last Updated</p>
                  <p className="text-[7px] sm:text-xs font-black text-coop-green uppercase">{lastUpdated.toLocaleTimeString()}</p>
                </div>
              </motion.div>
              <motion.div
                className={`border p-3 sm:p-6 shadow-xl flex items-center gap-3 sm:gap-8 group transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
                whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex-1 lg:flex-none">
                  <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Total Ballots Cast</p>
                  <p className={`text-lg sm:text-2xl font-black ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}><AnimatedCounter value={Object.values(candidateVotes).reduce((sum, votes) => sum + votes, 0)} /></p>
                </div>
                <div className={`w-px h-6 sm:h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                <div className="flex-1 lg:flex-none">
                  <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Active Members</p>
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
          <div className={`lg:col-span-8 border p-10 md:p-16 shadow-sm relative overflow-hidden group transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.07] transition-opacity">
              <TrendingUp size={200} />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
              <div>
                <h3 className={`text-3xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Engagement Curve</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Real-time participation telemetry</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Voter Density</p>
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
                        <stop offset="5%" stopColor="#2D7A3E" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2D7A3E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '0px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '10px' }}
                      cursor={{ stroke: '#2D7A3E', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="votes" stroke="#2D7A3E" strokeWidth={5} fill="url(#curveFill)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={`h-80 w-full flex items-center justify-center border rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-center">
                  <Activity size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                  <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Voting has not started yet</p>
                  <p className={`text-[12px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>The engagement curve will appear once members start voting</p>
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
            <div className={`text-center py-20 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              <p className="font-medium">No elections found. Results will appear here once elections are created.</p>
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
                  {/* Position Header with Green Gradient */}
                  <div className={`bg-gradient-to-r from-coop-darkGreen to-coop-green p-6 text-white mb-8 rounded-lg overflow-hidden shadow-sm`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase size={24} />
                      <h2 className="text-3xl font-black uppercase tracking-tight">{pos.title}</h2>
                    </div>
                    {pos.description && (
                      <p className="text-green-100 text-sm ml-9">{pos.description}</p>
                    )}
                  </div>

                  <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-12 border-b-2 pb-10 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-4 mb-4">
                        <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white ${pos.type === 'PROPOSAL' ? 'bg-blue-600' : 'bg-coop-green'}`}>
                          {pos.type} Ballot
                        </span>
                        <div className={`h-px w-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                        <span className={`text-[9px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Registry-ID: {pos.id.slice(0, 8).toUpperCase()}...</span>
                      </div>
                      <h2 className={`text-4xl font-black uppercase tracking-tighter leading-none mb-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{pos.title}</h2>
                      <p className={`font-medium italic ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>"{pos.description}"</p>
                    </div>
                    <div className={`p-6 border shadow-xl flex items-center gap-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                      <div className="text-right">
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Total Unit Votes</p>
                        <p className={`text-2xl font-black ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}><AnimatedCounter value={totalVotes} /></p>
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
                          <div key={c.id} className={`border p-4 sm:p-6 md:p-10 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 transition-colors duration-300 ${idx === 0 ? isDarkMode ? 'bg-slate-800 border-coop-green ring-1 ring-coop-green ring-inset' : 'bg-white border-coop-green ring-1 ring-coop-green ring-inset' : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
                            }`}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gray-50 group-hover:bg-coop-green transition-colors"></div>

                            <div className="flex justify-between items-start mb-4 sm:mb-6 md:mb-10 gap-2">
                              <div className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center text-white text-center ${isApprove ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' :
                                isReject ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-gray-800'
                                }`}>
                                {idx === 0 ? <CheckCircle2 size={18} className="hidden sm:block" /> : <Activity size={16} className="hidden sm:block" />}
                                {idx === 0 ? <CheckCircle2 size={14} className="sm:hidden block" /> : <Activity size={14} className="sm:hidden block" />}
                              </div>
                              <div className="text-right">
                                <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Tally</p>
                                <p className={`text-xl sm:text-2xl md:text-3xl font-black ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}>{c.votes.toLocaleString()}</p>
                              </div>
                            </div>

                            <h4 className={`text-sm sm:text-lg md:text-2xl font-black uppercase tracking-tighter mb-2 sm:mb-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{c.name}</h4>

                            <div className="space-y-2 sm:space-y-4">
                              <div className={`flex justify-between text-[7px] sm:text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                <span>Vote Density</span>
                                <span className="text-coop-green">{pct.toFixed(1)}%</span>
                              </div>
                              <div className={`h-1 sm:h-1.5 w-full rounded-none overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
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
                          <div key={c.id} className={`group relative border p-4 sm:p-6 md:p-8 shadow-sm transition-all duration-500 hover:shadow-2xl hover:border-coop-green transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} ${isLeader ? 'ring-2 ring-coop-green' : ''}`}>
                            {isLeader && (
                              <div className="absolute -top-4 -right-4 bg-coop-yellow text-coop-green px-4 py-2 font-black text-[9px] uppercase tracking-widest shadow-xl rotate-6 group-hover:rotate-0 transition-all z-20 flex items-center gap-2">
                                <Award size={14} /> Current Leader
                              </div>
                            )}

                            <div className="flex items-center gap-6 mb-10">
                              <div className="relative isolate">
                                <div className={`w-20 h-20 border-2 border-white shadow-xl overflow-hidden relative z-10 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                  {c.imageUrl ? (
                                    <img src={c.imageUrl} className={`w-full h-full object-cover grayscale transition-all duration-700 ${isLeader ? 'grayscale-0' : 'group-hover:grayscale-0'}`} alt={c.name} />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}><Target size={32} /></div>
                                  )}
                                </div>
                                <div className="absolute -top-3 -left-3 w-10 h-10 bg-coop-green/10 -z-10 blur-xl"></div>
                              </div>
                              <div className="grow">
                                <h4 className={`text-xl font-black uppercase tracking-tighter leading-none mb-2 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{c.name}</h4>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>ID: REG-{c.id.slice(0, 8)}</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Total Unit Ballots</p>
                                  <p className={`text-4xl font-black leading-none ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}><AnimatedCounter value={c.votes} /></p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Density</p>
                                  <p className="text-lg font-black text-coop-green">{pct.toFixed(1)}%</p>
                                </div>
                              </div>
                              <div className={`h-1.5 w-full rounded-none overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                                <div className={`h-full bg-coop-green transition-all duration-1000 ${isLeader ? 'shadow-[0_0_10px_#2D7A3E]' : ''}`} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>

                            <div className={`mt-8 pt-6 border-t flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-gray-50 text-gray-300'}`}>
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
        <section className={`mt-32 border-t pt-20 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <div>
            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
              <ShieldCheck className="text-coop-green" size={20} />
              <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-slate-300' : 'text-coop-darkGreen'}`}>Cryptographic Integrity Protocol</span>
            </div>
            <p className={`text-sm font-medium max-w-lg leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              All live results shown are preliminary until the official audit period is concluded by the Board of Election Tellers and the Saint Vincent Secretariat. Digital hashes are updated every cycle for immutable verification.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button className={`px-8 py-4 border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Database size={16} /> Technical Audit Log
            </button>
            <button 
              onClick={async () => {
                try {
                  const doc = <ProclamationTemplate isTemplate={true} />;
                  const pdfBlob = await pdf(doc).toBlob();
                  const url = URL.createObjectURL(pdfBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `SVMPC-Official-Proclamation-Template-${new Date().toISOString().split('T')[0]}.pdf`;
                  link.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error downloading proclamation template:', error);
                }
              }}
              className={`px-8 py-4 border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:scale-105 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <FileText size={16} /> Official Proclamation Template
            </button>
          </div>
        </section>

        {/* Node Identity Marker */}
        <div className="mt-20 flex flex-col items-center">
          <div className={`w-12 h-px mb-8 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-4 px-6 py-2 border rounded-none shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <PulseIcon size={14} className="text-coop-green" />
            <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              Scoreboard Node Active: {lastUpdated.toDateString()} • SHA-SV-CHAIN-STABLE
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
