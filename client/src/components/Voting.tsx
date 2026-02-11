
import React, { useState, useEffect, useCallback } from 'react';

import type { Candidate, Position, VotingStatus, PageView } from '../types.ts';
import { 
  Check, ArrowRight, ArrowLeft, Send, 
  CheckCircle2, 
  PauseCircle, ThumbsUp, ThumbsDown, HelpCircle,
  ShieldCheck, Fingerprint, Lock, AlertCircle,
  Hash, ClipboardCheck, ZapOff, Timer, Loader2
} from 'lucide-react';
import { electionAPI, candidateAPI, voteAPI } from '../services/api';
import Swal from 'sweetalert2';

export const Voting: React.FC<{ onNavigate?: (page: PageView) => void }> = ({ onNavigate }) => {
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
    <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
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
          <div className="bg-coop-darkGreen/5 border border-coop-darkGreen/10 w-10 h-10 flex items-center justify-center rounded-none shadow-sm">
            <span className="text-sm font-mono font-black text-coop-darkGreen">
              {unit.val.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[6px] font-black text-coop-darkGreen/40 mt-1 tracking-widest">{unit.label}</span>
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
      const candidatesData = await candidateAPI.getCandidates();
      const userVotes = await voteAPI.getUserVotes();

      // Map backend elections to frontend positions
      const mappedPositions: Position[] = electionsData
        .filter((election: any) => election.status === 'active' && election.isCategory !== false)
        .map((election: any) => ({
          id: election._id || election.id,
          title: election.title,
          description: election.description || '',
          maxVotes: election.maxVotesPerMember || 1,
          order: 0,
          type: 'OFFICER',
          createdAt: election.createdAt
        }))
        .sort((a: any, b: any) => {
          // Sort by creation date ascending (oldest first)
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });

      // Map backend candidates to frontend candidates
      const mappedCandidates: Candidate[] = candidatesData.map((candidate: any) => {
        // Extract positionId properly - it's populated so could be object with _id
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
      const activeElections = electionsData.filter((e: any) => e.status === 'active' && e.isCategory !== false);
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
      if (activeElections.length > 0) {
        setActiveElectionId(activeElections[0]._id || activeElections[0].id);
      }

      setPositions(mappedPositions);
      setCandidates(mappedCandidates);
    } catch (err) {
      console.error('Failed to fetch voting data:', err);
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
      }).catch(err => console.error('Failed to check election status:', err));
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [fetchData, alreadyVoted]);

  // Monitor state changes for debugging
  useEffect(() => {
    console.log('🔵 isSubmitted changed:', isSubmitted);
    console.log('🔵 alreadyVoted changed:', alreadyVoted);
    console.log('🔵 Should render ballot verified?', isSubmitted || alreadyVoted);
  }, [isSubmitted, alreadyVoted]);

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
    console.log('handleSubmit called', { votingStatus, isElectionOver, isSubmitted, alreadyVoted });
    console.log('Current selections:', selections);
    console.log('activeElectionId:', activeElectionId);
    
    if (votingStatus === 'PAUSED' || isElectionOver) {
      Swal.fire('Error', 'Voting session is unavailable.', 'error');
      return;
    }

    // Check if there are any selections
    const hasSelections = Object.values(selections).some((arr: any) => arr.length > 0);
    if (!hasSelections) {
      Swal.fire('Error', 'Please select at least one candidate before submitting.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('Starting vote submission...');

      // Refresh election data to ensure status is current
      const electionsData = await electionAPI.getElections();
      const activeElections = electionsData.filter((e: any) => e.status === 'active');
      
      if (activeElections.length === 0) {
        console.log('No active elections found');
        Swal.fire('Error', 'Voting period has ended. Election is no longer active.', 'error');
        setIsElectionOver(true);
        setVotingStatus('PAUSED');
        setSubmitting(false);
        return;
      }

      // Submit votes for each selected candidate
      const votePromises: Promise<unknown>[] = [];
      
      console.log('Submitting votes with electionId:', activeElectionId);
      console.log('All selections object:', selections);
      console.log('Object.entries(selections):', Object.entries(selections));
      
      let voteCount = 0;
      for (const [positionId, candidateIds] of Object.entries(selections)) {
        console.log(`Position ${positionId} has candidates:`, candidateIds);
        for (const candidateId of candidateIds as string[]) {
          console.log(`Casting vote ${++voteCount} - candidate: ${candidateId}, electionId: ${activeElectionId}`);
          votePromises.push(voteAPI.castVote(candidateId, activeElectionId));
        }
      }

      console.log(`Total votePromises.length before check: ${votePromises.length}`);
      if (votePromises.length === 0) {
        console.log('❌ No votes to submit - selections were empty!');
        console.log('Current positions:', positions);
        Swal.fire('Error', 'No candidates selected to vote for.', 'error');
        setSubmitting(false);
        return;
      }

      console.log(`Submitting ${votePromises.length} votes...`);
      const results = await Promise.all(votePromises);
      console.log('Votes submitted successfully:', results);
      
      // Generate a simple receipt hash (in production, this would come from backend)
      const receipt = `SV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      console.log('Generated receipt:', receipt);
      setReceiptHash(receipt);
      
      console.log('Setting isSubmitted to true...');
      setIsSubmitted(true);
      setAlreadyVoted(true);
      
      console.log('State updated - isSubmitted and alreadyVoted set to true');
      console.log('Render should show ballot verified screen now...');
      console.log('Current component render check:', { isSubmitted: true, alreadyVoted: true });
      
      // Scroll to top to show the ballot verified screen
      setTimeout(() => {
        console.log('Scrolling to top...');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('🔴 FAILED TO SUBMIT VOTES:', err);
      console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit votes. Please try again.';
      setError(errorMessage);
      console.error('Error message:', errorMessage);
      console.error('Full error object:', err);
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
      <div className="mb-10 bg-white border border-coop-darkGreen/10 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-coop-yellow"></div>
          <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-coop-darkGreen text-coop-yellow flex items-center justify-center">
                  <Timer size={24} />
              </div>
              <div>
                  <h4 className="text-[10px] font-black text-coop-darkGreen uppercase tracking-[0.4em] mb-1">Termination Sequence</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                      Registry closure programmed for: <span className="text-coop-darkGreen">{new Date(electionEndDate).toLocaleString()}</span>
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-6">
              <div className="h-10 w-px bg-gray-100 hidden md:block"></div>
              <CountdownTimer targetDate={electionEndDate} />
          </div>
      </div>
    );
  };

  const renderFlowProgress = () => {
    return (
      <div className="mb-16">
        <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Current Protocol Stage</span>
            <span className="text-[10px] font-black text-coop-green uppercase tracking-[0.4em]">{Math.round((currentStep / (positions.length + 1)) * 100)}% Complete</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
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
      <div className="min-h-screen pt-32 pb-32 px-4 bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading voting interface...</p>
        </div>
      </div>
    );
  }

  if (error && !positions.length) {
    return (
      <div className="min-h-screen pt-32 pb-32 px-4 bg-[#f8fafc] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-600 font-medium mb-4">{error}</p>
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
      <div className="max-w-4xl mx-auto py-20 px-4 text-center pt-24 md:pt-32">
        <div className="bg-white rounded-none shadow-2xl border border-red-100 p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ZapOff size={200} />
          </div>
          <div className="w-24 h-24 bg-red-50 rounded-none flex items-center justify-center mx-auto mb-8 text-red-600 border border-red-100">
            <Lock size={48} />
          </div>
          <h2 className="text-4xl font-black text-coop-darkGreen mb-4 tracking-tighter uppercase">Ballot Period Concluded</h2>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            The cryptographic window for the current election cycle has closed. No further ballots can be appended to the cooperative registry.
          </p>
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-100">
              <ShieldCheck size={16} className="text-coop-green" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Audit Phase: Initiated</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (votingStatus === 'PAUSED' && !alreadyVoted && !isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center pt-24 md:pt-32">
        <div className="bg-white rounded-xl shadow-2xl border border-red-100 p-12">
          <div className="w-24 h-24 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-8 text-red-600 animate-pulse border border-red-100">
            <PauseCircle size={48} />
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">System Lock Engaged</h2>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            The administrator has suspended the current terminal session. All local selections are preserved but submission is restricted.
          </p>
          <button onClick={() => window.location.reload()} className="bg-gray-100 text-gray-600 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all">
            Refresh Node Status
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted || alreadyVoted) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32 pb-32">
        {renderTerminationPanel()}
        {renderFlowProgress()}
        <div className="bg-white rounded-none shadow-2xl border border-gray-100 p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-coop-green"></div>
          <div className="w-20 h-20 bg-coop-green/10 rounded-none flex items-center justify-center mx-auto mb-8 text-coop-green">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase">Ballot Verified</h2>
          <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Transaction ID: {receiptHash || 'SV-TERMINAL-OFFLINE'}</p>
          
          <div className="bg-gray-50 p-6 rounded-none border border-gray-100 mb-10 text-left">
            <div className="flex items-center gap-3 mb-4 text-coop-green">
                <ShieldCheck size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Security confirmation</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
                Your selections have been cryptographically hashed and appended to the Saint Vincent Cooperative ledger. A physical copy of this receipt is being synced with your member profile.
            </p>
          </div>

          <button 
            onClick={(e) => {
              console.log('Exit button clicked!', { onNavigate, isSubmitted, alreadyVoted });
              e.preventDefault();
              if (onNavigate) {
                console.log('Calling onNavigate(ELECTIONS)');
                onNavigate('ELECTIONS');
              } else {
                console.log('No onNavigate, reloading');
                window.location.reload();
              }
            }} 
            className="w-full bg-coop-darkGreen text-white py-6 px-8 rounded-none font-black text-lg hover:bg-coop-green hover:scale-105 shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
            Exit & Secure Ballot
            <ArrowRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32">
        {renderTerminationPanel()}
        <div className="bg-white rounded-none shadow-2xl border border-gray-100 overflow-hidden">
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
          <div className="p-12">
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gray-50 p-6 rounded-none border border-gray-100">
                    <h4 className="font-black text-coop-darkGreen uppercase tracking-widest text-[10px] mb-3">Integrity Notice</h4>
                    <p className="text-gray-500 text-xs leading-relaxed font-medium">Votes are unique and tied to your member identity. Once committed, they cannot be retracted from the ledger.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-none border border-gray-100">
                    <h4 className="font-black text-coop-darkGreen uppercase tracking-widest text-[10px] mb-3">Quota System</h4>
                    <p className="text-gray-500 text-xs leading-relaxed font-medium">Each seat category has a maximum selection quota. You may abstain from any section by selecting zero candidates.</p>
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
      <div className="max-w-4xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32">
        {renderTerminationPanel()}
        {renderFlowProgress()}
        <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
                <ClipboardCheck className="text-coop-green" size={24} />
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Review Summary</h2>
            </div>
            <p className="text-gray-500 font-medium">Verify your final selections before committing to the secure ledger.</p>
        </header>

        <div className="space-y-6 mb-12">
          {positions.map(pos => {
            const selIds = selections[pos.id] || [];
            const posCandidatesForReview = candidates.filter(c => c.positionId === pos.id);
            const selCandidates = posCandidatesForReview.filter(c => selIds.includes(c.id));
            return (
              <div key={pos.id} className="bg-white rounded-none border border-gray-100 overflow-hidden shadow-sm hover:border-coop-green transition-colors">
                <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-black text-gray-500 uppercase tracking-widest text-[9px]">{pos.title}</h3>
                  <span className="text-[9px] font-black text-coop-green uppercase">{selCandidates.length} Selected</span>
                </div>
                <div className="p-8">
                  {selCandidates.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                      {selCandidates.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-white px-5 py-3 rounded-none border-2 border-coop-green/10 shadow-sm">
                          <div className="w-2 h-2 bg-coop-green rounded-full"></div>
                          <span className="font-black text-coop-darkGreen text-sm tracking-tight uppercase">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-300 italic">
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
           <button onClick={handleBack} className="flex-1 py-5 border border-gray-200 rounded-none font-black text-gray-400 uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all">Back to Ballot</button>
           <button 
             onClick={handleSubmit} 
             disabled={submitting}
             className="flex-1 py-5 bg-coop-green text-white rounded-none font-black text-xl hover:bg-coop-darkGreen shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="max-w-6xl mx-auto py-16 px-4 animate-fadeIn pt-24 md:pt-32">
      {renderTerminationPanel()}
      {renderFlowProgress()}
      
      <div className="mb-16 border-b border-gray-100 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest text-white shadow-md ${currentPosition.type === 'PROPOSAL' ? 'bg-blue-600' : 'bg-coop-green'}`}>
                        {currentPosition.type === 'PROPOSAL' ? 'Resolution Ballot' : 'Candidate Ballot'}
                    </span>
                    <div className="h-px w-8 bg-gray-200"></div>
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Terminal Section {currentStep} of {positions.length}</span>
                </div>
                <h2 className="text-5xl font-black text-coop-darkGreen tracking-tighter leading-none mb-4 uppercase">{currentPosition.title}</h2>
                <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed italic border-l-4 border-coop-yellow pl-6 py-1">
                    "{currentPosition.description}"
                </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Selection Status</span>
                <div className="bg-white border border-gray-100 px-6 py-3 rounded-none shadow-sm flex items-center gap-4">
                    <div className="flex gap-1.5">
                        {Array.from({ length: currentPosition.maxVotes }).map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${i < currentSelections.length ? 'bg-coop-green shadow-[0_0_8px_rgba(45,122,62,0.5)]' : 'bg-gray-100'}`}></div>
                        ))}
                    </div>
                    <span className="text-xs font-black text-coop-darkGreen">{currentSelections.length} / {currentPosition.maxVotes} Selected</span>
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
                    : 'bg-white border-gray-100 text-gray-900 hover:border-coop-green/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-none transition-colors ${isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-400 group-hover:bg-coop-green/10 group-hover:text-coop-green'}`}>
                        {isApprove ? <ThumbsUp size={32} /> : isReject ? <ThumbsDown size={32} /> : <HelpCircle size={32} />}
                    </div>
                    <div className="text-left">
                        <span className="text-3xl font-black uppercase tracking-tighter leading-none block mb-1">{c.name}</span>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>Select as primary preference</p>
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-none border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white text-gray-900 border-white' : 'border-gray-200 opacity-0 group-hover:opacity-100'}`}>
                    {isSelected ? <Check size={24} strokeWidth={4} /> : <div className="w-2 h-2 bg-gray-200 rounded-none"></div>}
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
                className={`group relative bg-white rounded-none border-2 cursor-pointer transition-all duration-500 flex flex-col overflow-hidden stagger-item ${
                    isSelected ? 'border-coop-green bg-green-50 shadow-2xl scale-[1.01]' : 'border-gray-100 shadow-sm hover:border-coop-green/30 hover:shadow-xl'
                }`}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-full h-1.5 transition-colors ${isSelected ? 'bg-coop-green' : 'bg-transparent'}`}></div>

                <div className="p-8 pb-0">
                    <div className="flex justify-between items-start mb-6">
                        <div className="relative isolate">
                            <div className="w-24 h-24 rounded-none overflow-hidden border-2 border-white shadow-xl relative z-10">
                                {c.imageUrl ? (
                                    <img 
                                        src={c.imageUrl} 
                                        className={`w-full h-full object-cover transition-all duration-1000 ${isSelected ? 'grayscale-0' : 'grayscale group-hover:grayscale-0 group-hover:scale-110'}`} 
                                        alt={c.name}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs font-bold">No Image</span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -top-3 -left-3 w-10 h-10 bg-coop-yellow/20 rounded-none -z-10 blur-xl"></div>
                        </div>
                        <div className={`w-12 h-12 rounded-none border-2 flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-coop-green border-coop-green text-white shadow-green-500/30' : 'bg-gray-50 border-gray-100 text-gray-200 group-hover:border-coop-green group-hover:text-coop-green'}`}>
                            {isSelected ? <Check size={24} strokeWidth={4} /> : <div className="w-2 h-2 bg-gray-300 rounded-full"></div>}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className={`text-2xl font-black tracking-tighter leading-none mb-1 transition-colors uppercase ${isSelected ? 'text-coop-green' : 'text-gray-900'}`}>{c.name}</h3>
                        <div className="flex items-center gap-2">
                            <Hash size={10} className="text-gray-300" />
                            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">SV24-REG-{c.id}</span>
                        </div>
                    </div>
                    
                    <p className={`text-xs leading-relaxed italic mb-8 font-medium transition-colors ${isSelected ? 'text-coop-green/70' : 'text-gray-500'}`}>
                        "{c.description}"
                    </p>
                </div>

                <div className={`mt-auto p-4 flex items-center justify-center border-t transition-colors ${isSelected ? 'bg-coop-green/10 border-coop-green/10' : 'bg-gray-50 border-gray-100 group-hover:bg-gray-100'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isSelected ? 'text-coop-green' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {isSelected ? 'CANDIDATE SELECTED' : 'TAP TO SELECT'}
                    </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal Footer Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button onClick={handleBack} className="flex items-center gap-3 px-6 py-3 font-black text-gray-400 hover:text-coop-darkGreen transition-colors text-xs uppercase tracking-[0.2em]">
                <ArrowLeft size={20}/> Back
            </button>
            <div className="flex items-center gap-8">
                <div className="hidden lg:flex items-center gap-3 bg-gray-50 px-5 py-2.5 rounded-none border border-gray-100">
                    <AlertCircle size={14} className="text-coop-yellow" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                        {currentPosition.maxVotes > 1 ? `Quota: Choose up to ${currentPosition.maxVotes}` : 'Quota: Select Exactly 1 Preference'}
                    </span>
                </div>
                <button 
                    onClick={handleNext} 
                    className="bg-coop-yellow text-coop-green px-12 py-5 rounded-none font-black text-lg hover:scale-[1.02] shadow-xl flex items-center gap-4 transition-all active:scale-95 group border border-coop-yellow/50"
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
