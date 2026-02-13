
import React, { useState, useEffect, useCallback } from 'react';

import type { Candidate, Position, VotingStatus, PageView } from '../types.ts';
import { 
  Check, ArrowRight, ArrowLeft, Send, 
  CheckCircle2, 
  PauseCircle, ThumbsUp, ThumbsDown, HelpCircle,
  ShieldCheck, Fingerprint, Lock, AlertCircle,
  Hash, ClipboardCheck, ZapOff, Timer, Loader2
} from 'lucide-react';
import { electionAPI, candidateAPI, voteAPI, positionAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

export const Voting: React.FC<{ onNavigate?: (page: PageView) => void }> = ({ onNavigate }) => {
  const { isDarkMode } = useDarkMode();
  const [selections, setSelections] = useState<{ [key: string]: string[] }>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeElectionId, setActiveElectionId] = useState<string>('');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [votingStatus, setVotingStatus] = useState<VotingStatus>('PAUSED');
  const [receiptHash, setReceiptHash] = useState<string | undefined>();
  const [isElectionOver, setIsElectionOver] = useState(false);
  const [electionEndDate, setElectionEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const { isDarkMode } = useDarkMode();
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return (
    <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
      <ZapOff size={16} /> Session Concluded
    </div>
  );

  return (
    <div className="flex gap-3">
      {[
        { val: timeLeft.d, label: 'D' },
        { val: timeLeft.h, label: 'H' },
        { val: timeLeft.m, label: 'M' },
        { val: timeLeft.s, label: 'S' }
      ].map((unit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className={`w-10 h-10 flex items-center justify-center rounded-none shadow-sm border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-coop-darkGreen/5 border-coop-darkGreen/10'}`}>
            <span className={`text-sm font-mono font-black transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
              {unit.val.toString().padStart(2, '0')}
            </span>
          </div>
          <span className={`text-[6px] font-black mt-1 tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-coop-darkGreen/40'}`}>{unit.label}</span>
        </div>
      ))}
    </div>
  );
};

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch elections (positions) and candidates
      const electionsData = await electionAPI.getElections();
      const positionsData = await positionAPI.getPositions();
      const candidatesData = await candidateAPI.getCandidates();
      const userVotes = await voteAPI.getUserVotes();

      // Get active election
      const activeElections = electionsData.filter((e: any) => e.status === 'active');
      const activeElectionId = activeElections.length > 0 ? (activeElections[0]._id || activeElections[0].id) : '';

      // Map backend positions to frontend positions (filtered by active election)
      const mappedPositions: Position[] = positionsData
        .filter((position: any) => {
          const posElectionId = position.electionId?._id || position.electionId;
          return posElectionId === activeElectionId;
        })
        .map((position: any) => ({
          id: position._id || position.id,
          title: position.title,
          description: position.description || '',
          maxVotes: 1,
          order: position.order || 0,
          type: 'OFFICER',
          electionId: activeElectionId
        }))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      // Map backend candidates to frontend candidates (filtered by active election)
      const mappedCandidates: Candidate[] = candidatesData
        .filter((candidate: any) => {
          const candElectionId = candidate.electionId?._id || candidate.electionId;
          return candElectionId === activeElectionId;
        })
        .map((candidate: any) => {
          let candidatePositionId = '';
          if (typeof candidate.positionId === 'string') {
            candidatePositionId = candidate.positionId;
          } else if (candidate.positionId?._id) {
            candidatePositionId = candidate.positionId._id;
          } else if (candidate.positionId?.id) {
            candidatePositionId = candidate.positionId.id;
          }
          
          return {
            id: candidate._id || candidate.id,
            name: candidate.name,
            description: candidate.description || '',
            positionId: candidatePositionId,
            votes: 0,
            imageUrl: candidate.photoUrl || ''
          };
        });

      // Determine voting status and election end date
      if (activeElections.length > 0) {
        interface ElectionWithDate {
          endDate: string;
        }
        const latestElection = activeElections.reduce((latest: ElectionWithDate, current: ElectionWithDate) => {
          return new Date(current.endDate) > new Date(latest.endDate) ? current : latest;
        });
        setElectionEndDate(latestElection.endDate);
        setVotingStatus('OPEN');
        setIsElectionOver(new Date(latestElection.endDate) < new Date());
      } else {
        setIsElectionOver(true);
        setVotingStatus('PAUSED');
      }

      // Check if user has already voted in any ACTIVE election
      const activeElectionIds = activeElections.map((e: any) => e._id || e.id);
      const userHasVotedInActiveElection = userVotes && userVotes.some((vote: any) => 
        activeElectionIds.includes(vote.electionId?._id || vote.electionId)
      );
      setAlreadyVoted(userHasVotedInActiveElection);
      setIsSubmitted(userHasVotedInActiveElection);

      // Store the active election ID for vote submission
      setActiveElectionId(activeElectionId);

      setPositions(mappedPositions);
      setCandidates(mappedCandidates);
    } catch (err) {
      setError('Failed to load voting data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Check election status every 10 seconds to catch when it's completed
    const intervalId = setInterval(() => {
      electionAPI.getElections().then((electionsData) => {
        const activeElections = electionsData.filter((e: any) => e.status === 'active');
        
        if (activeElections.length === 0 && !alreadyVoted) {
          setIsElectionOver(true);
          setVotingStatus('PAUSED');
        }
      }).catch(err => {});
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [fetchData, alreadyVoted]);



  const handleToggleCandidate = (positionId: string, candidateId: string, maxVotes: number) => {
    if (votingStatus === 'PAUSED' || isElectionOver) return;
    setSelections(prev => {
      const currentSelections = prev[positionId] || [];
      const isSelected = currentSelections.includes(candidateId);

      if (isSelected) {
        return { ...prev, [positionId]: currentSelections.filter(id => id !== candidateId) };
      } else {
        if (currentSelections.length < maxVotes) {
          return { ...prev, [positionId]: [...currentSelections, candidateId] };
        } else {
          if (maxVotes === 1) return { ...prev, [positionId]: [candidateId] };
          return prev;
        }
      }
    });
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, positions.length + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (votingStatus === 'PAUSED' || isElectionOver) {
      Swal.fire('Error', 'Voting session is unavailable.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Refresh election data to ensure status is current
      const electionsData = await electionAPI.getElections();
      const activeElections = electionsData.filter((e: any) => e.status === 'active');
      
      if (activeElections.length === 0) {
        Swal.fire('Error', 'Voting period has ended. Election is no longer active.', 'error');
        setIsElectionOver(true);
        setVotingStatus('PAUSED');
        setSubmitting(false);
        return;
      }

      // Submit votes for each position (including abstentions)
      const votePromises: Promise<unknown>[] = [];
      
      for (const position of positions) {
        const candidateIds = selections[position.id] || [];
        
        if (candidateIds.length > 0) {
          // Submit votes for selected candidates
          for (const candidateId of candidateIds) {
            votePromises.push(voteAPI.castVote(candidateId, activeElectionId));
          }
        } else {
          // Submit abstain vote for this position
          votePromises.push(voteAPI.castAbstainVote(activeElectionId, position.id));
        }
      }

      const results = await Promise.all(votePromises);
      
      // Generate a simple receipt hash (in production, this would come from backend)
      const receipt = `SV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setReceiptHash(receipt);
      
      setIsSubmitted(true);
      setAlreadyVoted(true);
      
      // Scroll to top to show the ballot verified screen
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit votes. Please try again.';
      setError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Vote Submission Failed',
        text: errorMessage,
        confirmButtonColor: '#2D7A3E'
      });
      setSubmitting(false);
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const renderTerminationPanel = () => {
    if (!electionEndDate) return null;
    
    return (
      <div className={`mb-10 border p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-coop-darkGreen/10'}`}>
          <div className="absolute top-0 left-0 w-1 h-full bg-coop-yellow"></div>
          <div className="flex items-center gap-5">
              <div className={`w-12 h-12 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 text-coop-yellow' : 'bg-coop-darkGreen text-coop-yellow'}`}>
                  <Timer size={24} />
              </div>
              <div>
                  <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Termination Sequence</h4>
                  <p className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      Registry closure programmed for: <span className={`transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{new Date(electionEndDate).toLocaleString()}</span>
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-6">
              <div className={`h-10 w-px hidden md:block transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
              <CountdownTimer targetDate={electionEndDate} />
          </div>
      </div>
    );
  };

  const renderFlowProgress = () => {
    return (
      <div className="mb-16">
        <div className="flex justify-between items-center mb-4 px-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Current Protocol Stage</span>
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>{Math.round((currentStep / (positions.length + 1)) * 100)}% Complete</span>
        </div>
        <div className={`h-1.5 w-full rounded-full overflow-hidden flex gap-1 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <div 
                className="h-full bg-coop-green transition-all duration-700 ease-out rounded-full" 
                style={{ width: `${(currentStep / (positions.length + 1)) * 100}%` }}
            ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-32 px-4 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Loading voting interface...</p>
        </div>
      </div>
    );
  }

  if (error && !positions.length) {
    return (
      <div className={`min-h-screen pt-32 pb-32 px-4 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
        <div className={`border rounded-2xl p-8 text-center max-w-md transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-red-900/30' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-medium mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          <button
            onClick={fetchData}
            className="bg-coop-green text-white px-6 py-3 rounded-lg font-medium hover:bg-coop-darkGreen transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isElectionOver && !alreadyVoted && !isSubmitted) {
    return (
      <div className={`max-w-4xl mx-auto py-20 px-4 text-center pt-24 md:pt-32 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : ''}`}>
        <div className={`rounded-none shadow-2xl border p-12 relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-red-900/30' : 'bg-white border-red-100'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ZapOff size={200} />
          </div>
          <div className={`w-24 h-24 rounded-none flex items-center justify-center mx-auto mb-8 border transition-colors duration-300 ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900/30' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <Lock size={48} />
          </div>
          <h2 className={`text-4xl font-black mb-4 tracking-tighter uppercase ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Ballot Period Concluded</h2>
          <p className={`text-lg mb-8 max-w-xl mx-auto leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
            The cryptographic window for the current election cycle has closed. No further ballots can be appended to the cooperative registry.
          </p>
          <div className="flex justify-center gap-6">
            <div className={`flex items-center gap-3 px-6 py-3 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
              <ShieldCheck size={16} className="text-coop-green" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Audit Phase: Initiated</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (votingStatus === 'PAUSED' && !alreadyVoted && !isSubmitted) {
    return (
      <div className={`max-w-4xl mx-auto py-20 px-4 text-center pt-24 md:pt-32 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : ''}`}>
        <div className={`rounded-xl shadow-2xl border p-12 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-red-900/30' : 'bg-white border-red-100'}`}>
          <div className={`w-24 h-24 rounded-xl flex items-center justify-center mx-auto mb-8 animate-pulse border transition-colors duration-300 ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900/30' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <PauseCircle size={48} />
          </div>
          <h2 className={`text-4xl font-black mb-4 tracking-tighter ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>System Lock Engaged</h2>
          <p className={`text-lg mb-8 max-w-xl mx-auto leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
            The administrator has suspended the current terminal session. All local selections are preserved but submission is restricted.
          </p>
          <button onClick={() => window.location.reload()} className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Refresh Node Status
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted || alreadyVoted) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 py-16 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
        <div className="max-w-2xl w-full">
          <div className={`rounded-none shadow-2xl border p-12 relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-coop-green"></div>
            <div className={`w-20 h-20 rounded-none flex items-center justify-center mx-auto mb-8 text-coop-green transition-colors duration-300 ${isDarkMode ? 'bg-coop-green/20' : 'bg-coop-green/10'}`}>
              <CheckCircle2 size={48} />
            </div>
            <h2 className={`text-4xl font-black mb-2 tracking-tighter uppercase text-center ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Ballot Verified</h2>
            <p className={`font-black uppercase tracking-[0.3em] text-[10px] mb-8 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Transaction ID: {receiptHash || 'SV-TERMINAL-OFFLINE'}</p>
            
            <div className={`p-6 rounded-none border mb-10 text-left transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-3 mb-4 text-coop-green">
                  <ShieldCheck size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Security confirmation</span>
              </div>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Your selections have been cryptographically hashed and appended to the Saint Vincent Cooperative ledger. A physical copy of this receipt is being synced with your member profile.
              </p>
            </div>

            <button 
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) {
                  onNavigate('ELECTIONS');
                } else {
                  window.location.reload();
                }
              }} 
              className="w-full bg-coop-darkGreen text-white py-6 px-8 rounded-none font-black text-lg hover:bg-coop-green hover:scale-105 shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
              Exit & Secure Ballot
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 0) {
    return (
      <div className={`max-w-4xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : ''}`}>
        {renderTerminationPanel()}
        <div className={`rounded-none shadow-2xl border overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="bg-coop-darkGreen p-12 text-white relative isolate">
            <div className="absolute top-0 right-0 p-12 opacity-10">
                <Fingerprint size={120} />
            </div>
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-none border border-white/20 mb-6">
                    <Lock size={14} className="text-coop-yellow" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Authenticated User Terminal</span>
                </div>
                <h2 className="text-5xl font-black tracking-tighter mb-4 leading-none uppercase">Electronic<br/>Voting Module</h2>
                <p className="text-green-100/60 max-w-md font-medium">Please review the terminal instructions carefully before initiating the digital ballot sequence.</p>
            </div>
          </div>
          <div className={`p-12 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className={`p-6 rounded-none border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                    <h4 className={`font-black uppercase tracking-widest text-[10px] mb-3 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Integrity Notice</h4>
                    <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Votes are unique and tied to your member identity. Once committed, they cannot be retracted from the ledger.</p>
                </div>
                <div className={`p-6 rounded-none border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                    <h4 className={`font-black uppercase tracking-widest text-[10px] mb-3 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Quota System</h4>
                    <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Each seat category has a maximum selection quota. You may abstain from any section by selecting zero candidates.</p>
                </div>
            </div>
            <button onClick={handleNext} className="w-full bg-coop-yellow text-coop-green px-12 py-6 rounded-none font-black text-xl hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-4 active:scale-95">
              Initialize Ballot <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === positions.length + 1) {
    return (
      <div className={`max-w-4xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : ''}`}>
        {renderTerminationPanel()}
        {renderFlowProgress()}
        <header className={`mb-12 transition-colors duration-300 ${isDarkMode ? '' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
                <ClipboardCheck className="text-coop-green" size={24} />
                <h2 className={`text-4xl font-black tracking-tighter uppercase transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Review Summary</h2>
            </div>
            <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Verify your final selections before committing to the secure ledger.</p>
        </header>

        <div className="space-y-6 mb-12">
          {positions.map(pos => {
            const selIds = selections[pos.id] || [];
            const posCandidatesForReview = candidates.filter(c => c.positionId === pos.id);
            const selCandidates = posCandidatesForReview.filter(c => selIds.includes(c.id));
            return (
              <div key={pos.id} className={`rounded-none border overflow-hidden shadow-sm hover:border-coop-green transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`px-8 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                  <h3 className={`font-black uppercase tracking-widest text-[9px] transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>{pos.title}</h3>
                  <span className={`text-[9px] font-black uppercase transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>{selCandidates.length} Selected</span>
                </div>
                <div className={`p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : ''}`}>
                  {selCandidates.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                      {selCandidates.map(c => (
                        <div key={c.id} className={`flex items-center gap-3 px-5 py-3 rounded-none border-2 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-coop-yellow/30' : 'bg-white border-coop-green/10'}`}>
                          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow' : 'bg-coop-green'}`}></div>
                          <span className={`font-black text-sm tracking-tight uppercase transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 italic transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>
                        <AlertCircle size={16} />
                        <span className="text-sm font-medium">Abstained from this category</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
           <button onClick={handleBack} className={`flex-1 py-5 rounded-none font-black uppercase tracking-widest text-[10px] transition-all duration-300 ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600' : 'border border-gray-200 text-gray-400 hover:bg-gray-50'}`}>Back to Ballot</button>
           <button 
             onClick={handleSubmit} 
             disabled={submitting}
             className={`flex-1 py-5 rounded-none font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/90 shadow-lg' : 'bg-coop-green text-white hover:bg-coop-darkGreen shadow-2xl'}`}
           >
             {submitting ? (
               <>
                 <Loader2 size={20} className="animate-spin" />
                 Submitting Votes...
               </>
             ) : (
               <>
                 Confirm & Cast Vote <Send size={20} className="group-hover:translate-x-1 transition-transform" />
               </>
             )}
           </button>
        </div>
      </div>
    );
  }

  const posIndex = currentStep - 1;
  const currentPosition = positions[posIndex];
  const posCandidates = candidates.filter(c => c.positionId === currentPosition.id);
  const currentSelections = selections[currentPosition.id] || [];

  return (
    <div className={`max-w-6xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : ''}`}>
      {renderTerminationPanel()}
      {renderFlowProgress()}
      
      <div className={`mb-16 pb-12 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'} border-b`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest text-white shadow-md transition-colors duration-300 ${currentPosition.type === 'PROPOSAL' ? 'bg-blue-600' : 'bg-coop-green'}`}>
                        {currentPosition.type === 'PROPOSAL' ? 'Resolution Ballot' : 'Candidate Ballot'}
                    </span>
                    <div className={`h-px w-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Terminal Section {currentStep} of {positions.length}</span>
                </div>
                <h2 className={`text-5xl font-black tracking-tighter leading-none mb-4 uppercase transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{currentPosition.title}</h2>
                <p className={`text-lg font-medium max-w-2xl leading-relaxed italic py-1 pl-6 border-l-4 border-coop-yellow transition-colors duration-300 ${isDarkMode ? 'text-slate-300 border-coop-yellow' : 'text-gray-500 border-coop-yellow'}`}>
                    "{currentPosition.description}"
                </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Selection Status</span>
                <div className={`px-6 py-3 rounded-none shadow-sm flex items-center gap-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex gap-1.5">
                        {Array.from({ length: currentPosition.maxVotes }).map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${i < currentSelections.length ? 'bg-coop-green shadow-[0_0_8px_rgba(45,122,62,0.5)]' : isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                        ))}
                    </div>
                    <span className={`text-xs font-black transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{currentSelections.length} / {currentPosition.maxVotes} Selected</span>
                </div>
            </div>
        </div>
      </div>

      {currentPosition.type === 'PROPOSAL' ? (
        <div className="max-w-4xl mx-auto space-y-6">
          {posCandidates.map((c) => {
            const isSelected = currentSelections.includes(c.id);
            const isApprove = c.name.toLowerCase().includes('approve') || c.name.toLowerCase().includes('yes');
            const isReject = c.name.toLowerCase().includes('reject') || c.name.toLowerCase().includes('no');
            
            return (
              <button 
                key={c.id}
                onClick={() => handleToggleCandidate(currentPosition.id, c.id, 1)}
                className={`w-full group relative overflow-hidden flex items-center justify-between p-8 rounded-none border-2 transition-all duration-300 shadow-sm ${
                    isSelected 
                    ? (isApprove ? 'bg-green-600 border-green-600 text-white shadow-green-200 shadow-xl scale-[1.02]' : isReject ? 'bg-red-600 border-red-600 text-white shadow-red-200 shadow-xl scale-[1.02]' : 'bg-gray-800 border-gray-800 text-white shadow-xl scale-[1.02]')
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:border-coop-yellow/30 hover:bg-slate-700' : 'bg-white border-gray-100 text-gray-900 hover:border-coop-green/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-none transition-colors duration-300 ${isSelected ? 'bg-white/20' : isDarkMode ? 'bg-slate-700 text-slate-400 group-hover:bg-coop-yellow/10 group-hover:text-coop-yellow' : 'bg-gray-100 text-gray-400 group-hover:bg-coop-green/10 group-hover:text-coop-green'}`}>
                        {isApprove ? <ThumbsUp size={32} /> : isReject ? <ThumbsDown size={32} /> : <HelpCircle size={32} />}
                    </div>
                    <div className="text-left">
                        <span className="text-3xl font-black uppercase tracking-tighter leading-none block mb-1">{c.name}</span>
                        <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isSelected ? 'text-white/60' : isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Select as primary preference</p>
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-none border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-white text-gray-900 border-white' : isDarkMode ? 'border-slate-600 opacity-0 group-hover:opacity-100' : 'border-gray-200 opacity-0 group-hover:opacity-100'}`}>
                    {isSelected ? <Check size={24} strokeWidth={4} /> : <div className={`w-2 h-2 rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-20">
          {posCandidates.map((c) => {
            const isSelected = currentSelections.includes(c.id);
            return (
              <div 
                key={c.id}
                onClick={() => handleToggleCandidate(currentPosition.id, c.id, currentPosition.maxVotes)}
                className={`group relative rounded-none border-2 cursor-pointer transition-all duration-500 flex flex-col overflow-hidden stagger-item ${
                    isSelected 
                    ? isDarkMode ? 'border-coop-yellow bg-slate-700 shadow-2xl scale-[1.01]' : 'border-coop-green bg-green-50 shadow-2xl scale-[1.01]'
                    : isDarkMode ? 'bg-slate-800 border-slate-700 shadow-sm hover:border-coop-yellow/30 hover:shadow-xl' : 'bg-white border-gray-100 shadow-sm hover:border-coop-green/30 hover:shadow-xl'
                }`}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-full h-1.5 transition-colors duration-300 ${isSelected ? isDarkMode ? 'bg-coop-yellow' : 'bg-coop-green' : 'bg-transparent'}`}></div>

                <div className="p-8 pb-0">
                    <div className="flex justify-between items-start mb-6">
                        <div className="relative isolate">
                            <div className={`w-24 h-24 rounded-none overflow-hidden border-2 shadow-xl relative z-10 transition-colors duration-300 ${isDarkMode ? 'border-slate-600' : 'border-white'}`}>
                                {c.imageUrl ? (
                                    <img 
                                        src={c.imageUrl} 
                                        className={`w-full h-full object-cover transition-all duration-1000 ${isSelected ? 'grayscale-0' : 'grayscale group-hover:grayscale-0 group-hover:scale-110'}`} 
                                        alt={c.name}
                                    />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                        <span className={`text-xs font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No Image</span>
                                    </div>
                                )}
                            </div>
                            <div className={`absolute -top-3 -left-3 w-10 h-10 rounded-none -z-10 blur-xl transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow/10' : 'bg-coop-yellow/20'}`}></div>
                        </div>
                        <div className={`w-12 h-12 rounded-none border-2 flex items-center justify-center transition-all shadow-sm duration-300 ${isSelected ? isDarkMode ? 'bg-coop-yellow border-coop-yellow text-slate-900 shadow-yellow-500/30' : 'bg-coop-green border-coop-green text-white shadow-green-500/30' : isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400 group-hover:border-coop-yellow group-hover:text-coop-yellow' : 'bg-gray-50 border-gray-100 text-gray-200 group-hover:border-coop-green group-hover:text-coop-green'}`}>
                            {isSelected ? <Check size={24} strokeWidth={4} /> : <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></div>}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className={`text-2xl font-black tracking-tighter leading-none mb-1 transition-colors uppercase duration-300 ${isSelected ? isDarkMode ? 'text-coop-yellow' : 'text-coop-green' : isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{c.name}</h3>
                        <div className="flex items-center gap-2">
                            <Hash size={10} className={`transition-colors duration-300 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>SV24-REG-{c.id}</span>
                        </div>
                    </div>
                    
                    <p className={`text-xs leading-relaxed italic mb-8 font-medium transition-colors duration-300 ${isSelected ? isDarkMode ? 'text-coop-yellow/70' : 'text-coop-green/70' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        "{c.description}"
                    </p>
                </div>

                <div className={`mt-auto p-4 flex items-center justify-center border-t transition-colors duration-300 ${isSelected ? isDarkMode ? 'bg-coop-yellow/10 border-coop-yellow/10' : 'bg-coop-green/10 border-coop-green/10' : isDarkMode ? 'bg-slate-700 border-slate-600 group-hover:bg-slate-600' : 'bg-gray-50 border-gray-100 group-hover:bg-gray-100'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-300 ${isSelected ? isDarkMode ? 'text-coop-yellow' : 'text-coop-green' : isDarkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {isSelected ? 'CANDIDATE SELECTED' : 'TAP TO SELECT'}
                    </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal Footer Controls */}
      <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t p-6 z-40 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-100'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button onClick={handleBack} className={`flex items-center gap-3 px-6 py-3 font-black text-xs uppercase tracking-[0.2em] transition-colors duration-300 ${isDarkMode ? 'text-slate-400 hover:text-coop-yellow' : 'text-gray-400 hover:text-coop-darkGreen'}`}>
                <ArrowLeft size={20}/> Back
            </button>
            <div className="flex items-center gap-8">
                <div className={`hidden lg:flex items-center gap-3 px-5 py-2.5 rounded-none border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                    <AlertCircle size={14} className="text-coop-yellow" />
                    <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        {currentPosition.maxVotes > 1 ? `Quota: Choose up to ${currentPosition.maxVotes}` : 'Quota: Select Exactly 1 Preference'}
                    </span>
                </div>
                <button 
                    onClick={handleNext} 
                    className={`px-12 py-5 rounded-none font-black text-lg flex items-center gap-4 transition-all active:scale-95 group border shadow-xl ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:scale-[1.02] border-coop-yellow/50' : 'bg-coop-yellow text-coop-green hover:scale-[1.02] border-coop-yellow/50'}`}
                >
                    {currentStep === positions.length ? 'Final Summary' : 'Next Protocol'} 
                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </div>
      <div className="h-32"></div>
    </div>
  );
};
