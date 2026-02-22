
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Rule } from '../types.ts';
import { 
  ShieldCheck, Scale, Info, 
  Globe, Database, Lock, Activity, Layers, 
  FileText, ArrowUpRight, Loader2, X
} from 'lucide-react';
import { ruleAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

export const Rules: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      setLoading(true);
      setError(null);
      
      const rulesData = await ruleAPI.getRules();
      const normalizedRules = normalizeRules(rulesData);
      
      setRules(normalizedRules);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
      setError('Failed to load governance rules. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  function normalizeRules(rulesData: any[]): Rule[] {
    if (!rulesData) return [];
    
    return rulesData.map((rule: any) => ({
      id: rule.id || rule._id,
      title: rule.title,
      content: rule.content,
      order: rule.order || 0
    }));
  }

  const closeRuleModal = () => setSelectedRule(null);
  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-32 px-4 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-coop-green mx-auto mb-4" />
          <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Loading governance rules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen pt-32 pb-32 px-4 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchRules}
            className="bg-coop-green text-white px-6 py-3 rounded-lg font-medium hover:bg-coop-darkGreen transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-20 sm:pt-32 pb-20 sm:pb-32 px-3 sm:px-6 lg:px-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
      <div className="container mx-auto max-w-7xl">
        {/* Architectural Header Module */}
        <header className="relative mb-16 sm:mb-24 animate-slideUp">
          {/* Gridline Background */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `linear-gradient(0deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px)`, backgroundSize: '35px 35px' }}></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-10">
            <div className="w-full lg:max-w-3xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="h-6 sm:h-8 w-auto" />
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Governance Protocol Matrix</span>
              </div>
              <h1 className={`text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                The Rules of<br/>
                <span className="text-coop-green">Cooperation</span>
              </h1>
              <p className={`text-sm sm:text-base md:text-xl font-medium leading-relaxed max-w-2xl border-l-4 pl-3 sm:pl-8 ${isDarkMode ? 'text-slate-300 border-coop-yellow/30' : 'text-gray-500 border-coop-green/10'}`}>
                Establishing the digital and legal framework for a transparent, member-led cooperative ecosystem. Every protocol is cryptographically enforced and assembly-verified.
              </p>
            </div>

            <div className="flex lg:flex-col items-center lg:items-end gap-3 sm:gap-6 w-full lg:w-auto">
              <div className={`p-4 sm:p-6 rounded-none border shadow-xl flex items-center gap-3 sm:gap-6 w-full lg:w-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className="text-left lg:text-right">
                  <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Active Protocols</p>
                  <p className="text-2xl sm:text-3xl font-black text-coop-green leading-none">{rules.length}</p>
                </div>
                <div className={`w-px h-8 sm:h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                <div className="text-left lg:text-right">
                  <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Status</p>
                  <div className="flex items-center gap-1 sm:gap-2 lg:justify-end">
                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <span className={`text-[7px] sm:text-xs font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-coop-darkGreen'}`}>Synchronized</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Governance Matrix Visualization */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-16 sm:mb-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {rules.length === 0 ? (
            <motion.div 
              className="col-span-full py-20 sm:py-40 text-center bg-white border border-dashed border-gray-200 rounded-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Layers size={48} className="sm:block hidden mx-auto text-gray-200 mb-6" />
              <Layers size={32} className="sm:hidden block mx-auto text-gray-200 mb-4" />
              <p className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-[0.2em] sm:tracking-[0.3em]">No Governance Protocols Recorded</p>
            </motion.div>
          ) : (
            rules.sort((a, b) => a.order - b.order).map((rule, idx) => (
              <motion.div 
                key={rule.id} 
                className={`group relative border p-4 sm:p-6 md:p-10 rounded-none shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(45,122,62,0.15)] hover:border-coop-green hover:-translate-y-2 transition-all duration-700 overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + (idx * 0.1) }}
                whileHover={{ y: -8, boxShadow: "0 40px 80px -20px rgba(45,122,62,0.15)" }}
              >
                {/* Background Index Shadow */}
                <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                  <span className="text-6xl sm:text-8xl md:text-[12rem] font-black leading-none tracking-tighter">0{idx + 1}</span>
                </div>

                {/* Status Bar */}
                <div className={`absolute top-0 left-0 w-full h-1 transition-colors ${isDarkMode ? 'bg-slate-700 group-hover:bg-coop-green' : 'bg-gray-50 group-hover:bg-coop-green'}`}></div>

                <div className="relative z-10 grow">
                  <div className="flex justify-between items-start mb-6 sm:mb-8 md:mb-12 gap-2">
                    <div className={`w-10 sm:w-12 h-10 sm:h-12 text-gray-400 group-hover:bg-coop-green group-hover:text-white flex items-center justify-center font-black text-base sm:text-lg transition-all shadow-inner flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Lock size={10} className="sm:block hidden text-coop-yellow" />
                      <Lock size={9} className="sm:hidden block text-coop-yellow" />
                      <span className={`text-[7px] sm:text-[8px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Hash: P-{(rule.id || '0000').slice(-4).toUpperCase()}</span>
                    </div>
                  </div>

                  <motion.h3 
                    className={`text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight mb-3 sm:mb-4 md:mb-6 group-hover:text-coop-green transition-colors ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
                  >
                    {rule.title}
                  </motion.h3>
                  
                  <p className={`text-xs sm:text-sm font-medium leading-relaxed mb-6 sm:mb-8 md:mb-10 line-clamp-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                    {rule.content}
                  </p>
                </div>

                <div className={`relative z-10 mt-auto pt-4 sm:pt-6 md:pt-8 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 transition-colors ${isDarkMode ? 'border-slate-700' : 'border-gray-50'}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Activity size={12} className="sm:block hidden text-coop-green" />
                    <Activity size={10} className="sm:hidden block text-coop-green" />
                    <span className={`text-[7px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Enforced via SV-Node</span>
                  </div>
                  <button onClick={() => setSelectedRule(rule)} className="text-[7px] sm:text-[9px] font-black text-coop-green uppercase tracking-widest flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                    Full <span className="hidden sm:inline">Text</span> <ArrowUpRight size={12} className="hidden sm:block" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Global Registry Footer Information */}
        <section className={`text-white p-6 sm:p-12 md:p-16 lg:p-24 relative overflow-hidden shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-coop-darkGreen' : 'bg-coop-darkGreen'}`}>
          {/* Background Textures */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="absolute top-0 right-0 p-6 sm:p-8 md:p-12 opacity-10 hidden sm:block">
            <Scale size={240} className="hidden md:block" />
            <Scale size={160} className="md:hidden block" />
          </div>

          <div className="relative z-10 grid md:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
                <Globe className="text-coop-yellow hidden sm:block" size={16} />
                <Globe className="text-coop-yellow sm:hidden block" size={14} />
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-white/50">Universal Compliance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none mb-4 sm:mb-8">
                Digital Integrity<br/>
                <span className="text-coop-yellow">& Legal Safety</span>
              </h2>
              <p className="text-xs sm:text-base md:text-lg text-white/70 font-medium leading-relaxed mb-6 sm:mb-12">
                All cooperative actions, including voting and share management, are strictly governed by these assembly-approved articles. For further legal clarification, members may request a physical copy of the bylaws at any regional branch office.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                <button className="px-4 sm:px-8 py-2.5 sm:py-4 bg-white text-coop-green rounded-none font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:bg-coop-yellow transition-all flex items-center justify-center sm:justify-start gap-2 sm:gap-3 shadow-xl">
                  <Database size={14} className="hidden sm:block" />
                  <Database size={12} className="sm:hidden block" />
                  <span>Archive Registry</span>
                </button>
                <button className="px-4 sm:px-8 py-2.5 sm:py-4 bg-white/10 border border-white/20 text-white rounded-none font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                  <FileText size={14} className="hidden sm:block" />
                  <FileText size={12} className="sm:hidden block" />
                  <span>Download Articles</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {[
                { label: 'Security Level', val: 'Tier 1 Encryption', icon: ShieldCheck },
                { label: 'Audit Trail', val: 'Immutable Chain', icon: Activity },
                { label: 'Compliance', val: 'Philippine RA-9520', icon: Scale },
                { label: 'Registry', val: 'Decentralized Nodes', icon: Database }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-3 sm:p-4 md:p-6 rounded-none hover:bg-white/10 transition-colors">
                  <item.icon className="text-coop-yellow mb-2 sm:mb-4 hidden sm:block" size={18} />
                  <item.icon className="text-coop-yellow mb-2 sm:hidden block" size={14} />
                  <p className="text-[7px] sm:text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5 sm:mb-1">{item.label}</p>
                  <p className="text-[7px] sm:text-xs font-bold text-white uppercase">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dynamic Disclaimer Section */}
        <div className="mt-24 flex flex-col items-center">
          <div className={`w-12 h-px mb-8 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-4 px-6 py-2 rounded-none border shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <Info size={14} className="text-coop-green" />
            <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              Governance data synchronized: {new Date().toLocaleDateString()} • System v4.2.1-Registry
            </p>
          </div>
        </div>

        {/* Protocol Detail Modal */}
        {selectedRule && (
          <div className="fixed top-20 sm:top-24 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-6 animate-fadeIn pointer-events-auto">
            <div className={`absolute inset-0 backdrop-blur-2xl pointer-events-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80' : 'bg-coop-darkGreen/80'}`} onClick={closeRuleModal}></div>
            
            <div className={`relative z-[10000] w-full max-w-2xl rounded-none shadow-[0_80px_150px_-30px_rgba(0,0,0,0.5)] border animate-scaleIn overflow-hidden flex flex-col max-h-[80vh] pointer-events-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white/20'}`}>
              
              <div className="h-2 w-full bg-coop-yellow"></div>

              <div className="p-10 md:p-16 flex-grow overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-12 h-12 bg-coop-green text-white flex items-center justify-center font-black text-xl">
                    {selectedRule.order}
                  </div>
                  <div className={`h-px w-8 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Protocol-Ref#{selectedRule.id.toUpperCase()}</span>
                  <button 
                    onClick={closeRuleModal}
                    className={`ml-auto p-4 transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100' : 'bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-coop-darkGreen'}`}
                  >
                    <X size={24} />
                  </button>
                </div>

                <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-10 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                  {selectedRule.title}
                </h2>

                <div className="prose prose-lg max-w-none">
                  <p className={`text-xl leading-relaxed font-medium whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {selectedRule.content}
                  </p>
                </div>

                <div className={`mt-20 p-10 border-l-4 border-coop-green flex items-start gap-6 transition-colors duration-300 ${isDarkMode ? 'bg-coop-green/10' : 'bg-coop-green/5'}`}>
                  <ShieldCheck size={24} className="text-coop-green shrink-0 mt-1" />
                  <p className={`text-sm font-semibold leading-relaxed italic ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}>
                    This governance protocol is officially recorded in the Saint Vincent Cooperative Bylaws. Compliance is mandatory for all active registry participants.
                  </p>
                </div>
              </div>

              <div className={`p-10 border-t flex justify-end transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                <button 
                  onClick={closeRuleModal}
                  className="px-12 py-4 bg-coop-darkGreen text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  Close Protocol View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
