import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Announcement } from '../types.ts';
import { announcementAPI } from '../services/api';
import { 
  Megaphone, Calendar, User, ArrowUpRight, X, 
  ShieldCheck, Share2, Info, 
  Newspaper, Activity, Zap
} from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';

export const Announcements: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Fetch announcements from backend
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await announcementAPI.getAnnouncements();
      const mappedAnnouncements: Announcement[] = data.map((ann: any) => ({
        id: ann._id || ann.id,
        title: ann.title || '',
        content: ann.content || '',
        priority: ann.priority || 'LOW',
        date: ann.date ? new Date(ann.date).toISOString().split('T')[0] : (ann.createdAt ? new Date(ann.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        author: ann.author || 'Unknown'
      }));
      // Sort by date (newest first)
      mappedAnnouncements.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setAnnouncements(mappedAnnouncements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const closeDetailedView = () => setSelectedAnnouncement(null);

  const filteredAnnouncements = announcements.filter(ann => 
    filterPriority === 'ALL' ? true : ann.priority === filterPriority
  );

  const latestAnnouncement = filteredAnnouncements.length > 0 ? filteredAnnouncements[0] : null;
  const previousAnnouncements = filteredAnnouncements.length > 1 ? filteredAnnouncements.slice(1) : [];

  return (
    <div className={`min-h-screen pt-20 sm:pt-32 pb-20 sm:pb-32 px-3 sm:px-6 lg:px-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#fcfcfd]'}`}>
      <div className="container mx-auto max-w-7xl">
        
        {/* Modern Broadcast Header */}
        <header className="relative mb-12 sm:mb-20 animate-slideUp">
          {/* Gridline Background */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `linear-gradient(0deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#94a3b8' : '#000'} 1px, transparent 1px)`, backgroundSize: '35px 35px' }}></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-12">
            <div className="w-full lg:max-w-3xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="h-6 sm:h-8 w-auto" />
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Central Communication Node</span>
              </div>
              <h1 className={`text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                Broadcast<br/>
                <span className="text-coop-green">Archives</span>
              </h1>
              <p className={`text-sm sm:text-base md:text-xl font-medium leading-relaxed max-w-xl border-l-4 pl-3 sm:pl-8 ${isDarkMode ? 'text-slate-300 border-coop-yellow/30' : 'text-gray-500 border-coop-green/10'}`}>
                Official cooperative intelligence and community alerts. All broadcasts are signed and validated by the Saint Vincent Secretariat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
              <div className={`border p-1 sm:p-1.5 shadow-sm rounded-none w-full lg:w-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 sm:px-6 py-1.5 sm:py-2.5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex-1 sm:flex-none ${
                      filterPriority === p 
                        ? 'bg-coop-green text-white shadow-lg' 
                        : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-coop-darkGreen'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <motion.div 
            className={`py-40 text-center border rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center gap-4">
              <Activity size={48} className="text-coop-green animate-spin" />
              <p className={`text-sm font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Loading Broadcasts...</p>
            </div>
          </motion.div>
        ) : filteredAnnouncements.length === 0 ? (
          <motion.div 
            className={`py-40 text-center border border-dashed rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Megaphone size={64} className={`mx-auto mb-6 ${isDarkMode ? 'text-slate-700' : 'text-gray-200'}`} />
            <p className={`text-sm font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>No Broadcasts Synchronized</p>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            
            {/* Featured Broadcast Card */}
            {latestAnnouncement && filterPriority === 'ALL' && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="flex items-center gap-4 mb-8">
                  <Zap size={16} className="text-coop-yellow fill-coop-yellow" />
                  <span className="text-[10px] font-black text-coop-green uppercase tracking-[0.3em]">Most Recent Transmission</span>
                </div>
                
                <motion.div 
                  onClick={() => setSelectedAnnouncement(latestAnnouncement)}
                  className="group relative bg-coop-darkGreen text-white p-4 sm:p-8 md:p-16 overflow-hidden cursor-pointer shadow-[0_50px_100px_-20px_rgba(22,58,30,0.3)] transition-all active:scale-95"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                  <motion.div 
                    className="absolute top-0 right-0 p-6 sm:p-10 md:p-16 opacity-5 -translate-y-1/2 translate-x-1/2"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Newspaper size={300} className="hidden sm:block" />
                    <Newspaper size={200} className="sm:hidden block" />
                  </motion.div>

                  <div className="relative z-10 grid lg:grid-cols-12 gap-4 sm:gap-8 md:gap-12 items-center">
                    <div className="lg:col-span-8">
                      <motion.div 
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 mb-6 sm:mb-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <span className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[7px] sm:text-[9px] font-black uppercase tracking-widest ${
                          latestAnnouncement.priority === 'HIGH' ? 'bg-red-500' : 
                          latestAnnouncement.priority === 'MEDIUM' ? 'bg-coop-yellow text-coop-green' : 'bg-white/20'
                        }`}>
                          {latestAnnouncement.priority} Priority
                        </span>
                        <div className="h-px w-6 sm:w-10 bg-white/20"></div>
                        <motion.div 
                          className="flex items-center gap-1 sm:gap-2 text-white/50 font-bold text-[7px] sm:text-[9px] uppercase tracking-widest"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        >
                          <Calendar size={12} className="sm:block hidden" />
                          <Calendar size={10} className="sm:hidden block" />
                          <span className="text-coop-yellow">{latestAnnouncement.date}</span>
                        </motion.div>
                      </motion.div>

                      <h3 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-4 sm:mb-8 group-hover:text-coop-yellow transition-colors">
                        {latestAnnouncement.title}
                      </h3>
                      <p className="text-sm sm:text-base md:text-xl text-white/70 leading-relaxed font-medium mb-6 sm:mb-12 max-w-3xl line-clamp-3">
                        {latestAnnouncement.content}
                      </p>

                      <div className="flex flex-col items-start gap-3 sm:gap-10">
                        <div className="flex items-center gap-2 sm:gap-3 w-full">
                          <div className="w-8 sm:w-10 h-8 sm:h-10 bg-white/10 flex items-center justify-center text-coop-yellow flex-shrink-0">
                            <User size={14} className="sm:block hidden" />
                            <User size={12} className="sm:hidden block" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase tracking-widest">Authorized Author</p>
                            <p className="text-xs sm:text-sm font-bold truncate">{latestAnnouncement.author}</p>
                          </div>
                        </div>
                        <button className="flex items-center justify-center gap-1.5 sm:gap-3 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] bg-white text-coop-darkGreen px-3 sm:px-8 py-2.5 sm:py-4 hover:bg-coop-yellow transition-all shadow-xl w-full sm:w-auto active:scale-95">
                          <span>Read Full Dispatch</span> <ArrowUpRight size={12} className="hidden sm:block flex-shrink-0" />
                          <ArrowUpRight size={10} className="sm:hidden block flex-shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.section>
            )}

            {/* Broadcast Grid History */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-12 sm:mt-16 md:mt-20 scroll-mt-40">
              {(filterPriority === 'ALL' ? previousAnnouncements : filteredAnnouncements).map((ann, idx) => (
                <div 
                  key={ann.id} 
                  onClick={() => setSelectedAnnouncement(ann)}
                  className={`group relative border p-4 sm:p-6 md:p-10 rounded-none shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:border-coop-green transition-all duration-500 flex flex-col cursor-pointer overflow-hidden animate-slideUp z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.06] transition-opacity">
                    <span className="text-5xl sm:text-7xl md:text-[8rem] font-black leading-none tracking-tighter">0{idx + 1}</span>
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4 sm:mb-6 md:mb-10 gap-2">
                      <div className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[7px] sm:text-[8px] font-black uppercase tracking-widest border transition-colors duration-300 ${
                        ann.priority === 'HIGH' ? 'bg-red-50 text-red-500 border-red-500/20' : 
                        ann.priority === 'MEDIUM' ? 'bg-coop-yellow/10 text-coop-green border-coop-yellow/20' : isDarkMode ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}>
                        {ann.priority}
                      </div>
                      <span className={`text-[7px] sm:text-[8px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>ID-{ann.id.slice(-4).toUpperCase()}</span>
                    </div>

                    <h3 className={`text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight mb-2 sm:mb-4 group-hover:text-coop-green transition-colors line-clamp-2 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                      {ann.title}
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed font-medium mb-4 sm:mb-6 md:mb-10 line-clamp-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      {ann.content}
                    </p>

                    <div className={`mt-auto pt-3 sm:pt-4 md:pt-8 border-t flex items-center justify-between transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-50'}`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Calendar size={10} className="sm:block hidden text-coop-yellow" />
                        <Calendar size={9} className="sm:hidden block text-coop-yellow" />
                        <span className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{ann.date}</span>
                      </div>
                      <ArrowUpRight size={12} className="sm:block hidden text-coop-green opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </motion.div>
        )}
      </div>

      {/* Modern Detailed View Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 animate-fadeIn pt-20 sm:pt-32 pb-6 sm:pb-0">
          <div className={`absolute inset-0 backdrop-blur-2xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80' : 'bg-coop-darkGreen/80'}`} onClick={closeDetailedView}></div>
          
          <div className={`relative w-full max-w-3xl rounded-none shadow-[0_80px_150px_-30px_rgba(0,0,0,0.5)] border animate-scaleIn overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white/20'}`}>
            
            {/* Modal Navigation Accent */}
            <div className={`h-2 w-full ${
              selectedAnnouncement.priority === 'HIGH' ? 'bg-red-500' : 
              selectedAnnouncement.priority === 'MEDIUM' ? 'bg-coop-yellow' : 'bg-coop-green'
            }`}></div>

            <div className="p-4 sm:p-10 md:p-16 flex-grow overflow-y-auto custom-scrollbar">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-8 sm:mb-12">
                <span className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[7px] sm:text-[9px] font-black uppercase tracking-widest ${
                  selectedAnnouncement.priority === 'HIGH' ? 'bg-red-500 text-white' : 
                  selectedAnnouncement.priority === 'MEDIUM' ? 'bg-coop-yellow text-coop-green' : 'bg-gray-100 text-gray-400'
                }`}>
                  {selectedAnnouncement.priority} Priority
                </span>
                <div className={`h-px w-6 sm:w-8 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                <span className={`text-[7px] sm:text-[10px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Broadcast-Ref#{selectedAnnouncement.id.toUpperCase()}</span>
                <button 
                  onClick={closeDetailedView}
                  className={`ml-auto p-2 sm:p-4 transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100' : 'bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-coop-darkGreen'}`}
                  aria-label="Close announcement details"
                >
                  <X size={18} className="sm:block hidden" />
                  <X size={16} className="sm:hidden block" />
                </button>
              </div>

              <h2 className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6 sm:mb-10 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                {selectedAnnouncement.title}
              </h2>

            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-16 pb-8 sm:pb-12 border-b transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`p-2 sm:p-3 text-coop-yellow rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <Calendar size={14} className="hidden sm:block" />
                    <Calendar size={12} className="sm:hidden block" />
                  </div>
                  <div>
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Date Sent</p>
                    <p className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}>{selectedAnnouncement.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`p-2 sm:p-3 text-coop-yellow rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <User size={14} className="hidden sm:block" />
                    <User size={12} className="sm:hidden block" />
                  </div>
                  <div>
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Authorized Author</p>
                    <p className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}>{selectedAnnouncement.author}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`p-2 sm:p-3 text-coop-yellow rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <ShieldCheck size={14} className="hidden sm:block" />
                    <ShieldCheck size={12} className="sm:hidden block" />
                  </div>
                  <div>
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Integrity</p>
                    <p className="text-xs sm:text-sm font-bold text-coop-green">SHA-256 Valid</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className={`text-sm sm:text-lg md:text-xl leading-relaxed font-medium whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  {selectedAnnouncement.content}
                </p>
              </div>

              <div className={`mt-12 sm:mt-20 p-4 sm:p-10 border-l-4 border-coop-green flex gap-3 sm:gap-6 transition-colors duration-300 ${isDarkMode ? 'bg-coop-green/10' : 'bg-coop-green/5'}`}>
                <Info size={18} className="sm:block hidden text-coop-green shrink-0 mt-1" />
                <Info size={14} className="sm:hidden block text-coop-green shrink-0 mt-1" />
                <p className={`text-xs sm:text-sm font-semibold leading-relaxed italic ${isDarkMode ? 'text-slate-200' : 'text-coop-darkGreen'}`}>
                  This communication is part of the official Saint Vincent Cooperative digital audit trail. For legal inquiries, please reference the Broadcast-Ref provided above at your local regional node.
                </p>
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className={`p-4 sm:p-10 border-t flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
                <Activity size={14} className="sm:block hidden text-coop-green" />
                <Activity size={12} className="sm:hidden block text-coop-green" />
                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Status: Registry Synchronized</span>
              </div>
              <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                <button className={`flex-1 sm:flex-none px-10 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-600' : 'border border-gray-200 text-gray-600 hover:bg-white'}`}>
                  <Share2 size={14} /> Share Packet
                </button>
                <button 
                  onClick={closeDetailedView}
                  className="flex-1 sm:flex-none px-12 py-4 bg-coop-darkGreen text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  Close Terminal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
