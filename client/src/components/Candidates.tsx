import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, UserCheck, Layers, Fingerprint, Cpu, Zap, Terminal } from 'lucide-react';
import { candidateAPI, positionAPI } from '../services/api';
import type { PageView } from '../types';

interface CandidatesProps {
  electionId?: string;
  onNavigate: (page: PageView, electionId?: string) => void;
}

export const Candidates: React.FC<CandidatesProps> = ({ electionId, onNavigate }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveElection, setHasActiveElection] = useState(true);

  useEffect(() => {
    const id = electionId;
    
    // Check if we have a valid election ID
    if (!id || id.trim() === '') {
      console.log('No election ID provided');
      setHasActiveElection(false);
      setCandidates([]);
      setPositions([]);
      setLoading(false);
      return;
    }
    
    setHasActiveElection(true);
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [candidatesData, positionsData] = await Promise.all([
          candidateAPI.getCandidates(),
          positionAPI.getPositions()
        ]);

        console.log('Candidates fetched:', candidatesData.length);
        
        // Filter candidates by election ID
        const filtered = Array.isArray(candidatesData) 
          ? candidatesData.filter(candidate => {
              // Check if electionId matches (handle both object and string cases)
              const candElectionId = candidate.electionId?._id || candidate.electionId;
              return candElectionId === id;
            })
          : [];
        
        console.log('Filtered candidates:', filtered.length);
        
        setCandidates(filtered);
        setPositions(Array.isArray(positionsData) ? positionsData : []);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [electionId]);

  if (error && !loading) {
    return (
      <div className="min-h-screen pt-32 pb-32 px-4 bg-[#fcfcfd] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-coop-darkGreen font-black text-xl mb-4">Error Loading Candidates</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onNavigate('ELECTIONS')}
            className="px-6 py-3 bg-coop-green text-white font-black rounded hover:bg-coop-darkGreen transition-colors"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-32 px-4 bg-[#fcfcfd] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-coop-green/20 border-t-coop-green rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-coop-darkGreen font-black">Loading candidates...</p>
        </div>
      </div>
    );
  }

  // Group candidates by position
  const officerPositions = positions.filter(p => p.type === 'OFFICER');

  return (
    <div className="min-h-screen pt-32 pb-32 px-4 bg-[#fcfcfd]">
      <div className="container mx-auto max-w-7xl">
        
        {/* Header */}
        <header className="mb-20 animate-slideUp">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-8 bg-coop-yellow shadow-[0_0_15px_rgba(242,228,22,0.6)]"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">Official Registry</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-coop-darkGreen tracking-tighter leading-[0.85] uppercase mb-8">
                Candidate<br/>
                <span className="text-coop-green">Dossiers</span>
              </h1>
              <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-xl border-l-4 border-coop-green/10 pl-8">
                Review verified profiles and platforms of all official proponents for the current election cycle.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="bg-white border border-gray-100 p-4 shadow-sm flex items-center gap-4">
                  <UserCheck className="text-coop-green" size={20} />
                  <div>
                     <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Total Qualified</p>
                     <p className="text-xl font-black text-coop-darkGreen leading-none">
                       {candidates.filter(c => {
                         const posId = c.positionId?._id || c.positionId;
                         return positions.some(p => (p._id || p.id) === posId && p.type === 'OFFICER');
                       }).length}
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </header>

        {!hasActiveElection || candidates.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100">
            {!hasActiveElection ? (
              <>
                <p className="text-gray-500 font-medium text-lg">No active election</p>
                <p className="text-gray-500 font-medium text-lg">No candidate to show</p>
              </>
            ) : (
              <p className="text-gray-500 font-medium text-lg">No candidates found for this election.</p>
            )}
          </div>
        ) : (
          /* CANDIDATES DIRECTORY */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-coop-green/10 bg-white shadow-xl">
            {candidates.map((candidate, idx) => (
              <div key={candidate._id || candidate.id} className={`flex flex-col sm:flex-row border-b border-coop-green/10 ${idx % 2 === 0 ? 'lg:border-r' : ''} group overflow-hidden`}>
                <div className="sm:w-2/5 aspect-[4/5] bg-gray-50 relative overflow-hidden border-b sm:border-b-0 sm:border-r border-coop-green/10">
                  {candidate.photoUrl ? (
                    <img 
                      src={candidate.photoUrl} 
                      alt={candidate.name}
                      className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-50">
                      <svg className="w-20 h-20 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-coop-darkGreen/80 backdrop-blur-md px-3 py-1 text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                      OFFICIAL CANDIDATE
                    </div>
                  </div>
                </div>
                <div className="p-12 flex flex-col flex-grow relative">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                    <Fingerprint size={120} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h4 className="text-3xl font-black text-coop-darkGreen uppercase tracking-tighter group-hover:text-coop-green transition-colors">{candidate.name}</h4>
                      <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">Dossier: SV-REF-{(candidate._id || candidate.id || '').toString().substring(0, 8).toUpperCase()}</p>
                    </div>
                    <Cpu size={18} className="text-gray-200 group-hover:text-coop-yellow transition-colors" />
                  </div>
                  
                  <div className="border border-gray-100 p-6 mb-10 bg-gray-50/50">
                    <p className="text-gray-500 text-sm italic leading-relaxed font-medium">"{candidate.description || 'No description provided'}"</p>
                  </div>
                  
                  <div className="mt-auto pt-8 border-t border-gray-50">
                    <div className="flex items-center gap-2 opacity-70">
                      <Terminal size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Verified Entry</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-20 flex justify-center">
            <button 
                onClick={() => onNavigate('ELECTIONS')}
                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-coop-green transition-colors"
            >
                Return to Election Dashboard <ArrowRight size={14} />
            </button>
        </div>

      </div>
    </div>
  );
};

export default Candidates;
