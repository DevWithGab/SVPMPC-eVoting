import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { candidateAPI, electionAPI } from '../services/api';
import type { PageView } from '../types';

interface CandidatesDirectoryProps {
  onNavigate: (page: PageView, electionId?: string) => void;
}

export const CandidatesDirectory: React.FC<CandidatesDirectoryProps> = ({ onNavigate }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveElection, setHasActiveElection] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const electionsData = await electionAPI.getElections();
        const activeElection = electionsData.find((e: any) => e.status === 'active');
        
        if (!activeElection) {
          setHasActiveElection(false);
          setCandidates([]);
          setLoading(false);
          return;
        }
        
        setHasActiveElection(true);
        
        const candidatesData = await candidateAPI.getCandidates();
        
        const filteredCandidates = Array.isArray(candidatesData)
          ? candidatesData.filter(candidate => {
              const candElectionId = candidate.electionId?._id || candidate.electionId;
              return candElectionId === (activeElection._id || activeElection.id);
            })
          : [];
        
        setCandidates(filteredCandidates);
      } catch (err: any) {
        setError(err?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  return (
    <div className="min-h-screen pt-32 pb-32 px-4 bg-[#fcfcfd]">
      <div className="container mx-auto max-w-7xl">
        
        {/* Header */}
        <header className="mb-20 animate-slideUp">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="max-w-3xl">
              <h1 className="text-6xl md:text-8xl font-black text-coop-darkGreen tracking-tighter leading-[0.85] uppercase mb-8">
                <span className="text-coop-green">Candidates</span>
              </h1>
              <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-xl border-l-4 border-coop-green/10 pl-8">
                Review all nominees running in the current election cycle.
              </p>
            </div>
          </div>
        </header>

        {!hasActiveElection || candidates.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100">
            {!hasActiveElection ? (
              <>
                <p className="text-gray-500 font-medium text-lg">No active election</p>
                <p className="text-gray-500 font-medium text-lg">No candidates to show</p>
              </>
            ) : (
              <p className="text-gray-500 font-medium text-lg">No candidates found for this election.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <div key={candidate._id || candidate.id} className="border border-gray-100 rounded-lg overflow-hidden hover:border-coop-green transition-colors group">
                {/* Candidate Photo */}
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {candidate.photoUrl ? (
                    <img 
                      src={candidate.photoUrl} 
                      alt={candidate.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
                      <Users size={48} className="text-gray-300" />
                    </div>
                  )}
                </div>
                
                {/* Candidate Info */}
                <div className="p-4">
                  <h3 className="font-black text-coop-darkGreen text-lg mb-2 uppercase tracking-tight">{candidate.name}</h3>
                  {candidate.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">{candidate.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
