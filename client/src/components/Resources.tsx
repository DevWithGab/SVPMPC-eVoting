
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Rule, PageView } from '../types.ts';
import { 
  ChevronDown, FileText, Phone, HelpCircle, PlayCircle, 
  ShieldCheck, LifeBuoy, 
  ArrowUpRight, MessageSquare,
  Activity, Info, Loader2, Map as MapIcon, MapPin
} from 'lucide-react';
import { ruleAPI } from '../services/api';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls } from './ui/map';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

interface ResourcesProps {
  onNavigate?: (page: PageView) => void;
}

export const Resources: React.FC<ResourcesProps> = ({ onNavigate }) => {
  const { isDarkMode } = useDarkMode();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingLocations, setVotingLocations] = useState([
    { id: 1, name: 'Main Hall', lng: -73.98, lat: 40.75 },
    { id: 2, name: 'East Wing', lng: -73.95, lat: 40.77 },
    { id: 3, name: 'West Campus', lng: -74.01, lat: 40.73 },
  ]);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const rulesData = await ruleAPI.getRules();
      setRules(rulesData);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
      setError('Failed to load election guidelines. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpDeskClick = async () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      // User not logged in - show alert first
      const result = await Swal.fire({
        icon: 'info',
        title: 'Login Required',
        text: 'Please login as a member to access the support request feature.',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#2D7A3E',
        backdrop: true,
        allowOutsideClick: false,
        allowEscapeKey: false
      });
      
      if (result.isConfirmed) {
        if (onNavigate) {
          onNavigate('LOGIN');
        }
      }
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // Check if user is a member
      if (user.role !== 'member') {
        await Swal.fire({
          icon: 'warning',
          title: 'Member Access Only',
          text: 'Only members can submit support requests. Please login with your member account.',
          confirmButtonColor: '#2D7A3E',
          allowOutsideClick: false,
          allowEscapeKey: false
        });
        return;
      }

      // Navigate to member profile support section
      if (onNavigate) {
        onNavigate('PROFILE');
      }
      
      // Dispatch event to switch to support tab
      const event = new CustomEvent('navigate-to-support');
      window.dispatchEvent(event);
      
    } catch (err) {
      console.error('Error parsing user data:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to process your request. Please try again.',
        confirmButtonColor: '#2D7A3E',
        allowOutsideClick: false,
        allowEscapeKey: false
      });
    }
  };

  const faqs = [
    {
        question: "How do I reset my password?",
        answer: "Please visit the cooperative office with your valid ID, or contact the secretariat. For security reasons, password resets cannot be done purely online without verification."
    },
    {
        question: "Can I change my vote after submitting?",
        answer: "No. To ensure the integrity of the election, once a vote is confirmed and submitted, it is final and recorded in the audit trail."
    },
    {
        question: "Is the online voting system secure?",
        answer: "Yes. We use industry-standard encryption and verify every member's identity. The system is also audited by an independent committee."
    },
    {
        question: "What if I lose internet connection while voting?",
        answer: "The system saves your selection locally. Once you reconnect, you can continue where you left off. However, the vote is only counted once the 'Submit' button is successfully pressed."
    }
  ];

  const tutorialSteps = [
    { title: "Identity Verification", desc: "Log in with your email and password." },
    { title: "Authentication", desc: "Verify your identity through secure authentication." },
    { title: "Ballot Selection", desc: "Browse candidates and tap to make selections." },
    { title: "Audit & Submit", desc: "Review your summary and cast your final ballot." }
  ];

  return (
    <div className={`min-h-screen pt-20 sm:pt-32 pb-20 sm:pb-32 px-3 sm:px-6 lg:px-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
      <div className="container mx-auto max-w-7xl">
        
        {/* Architectural Header */}
        <header className="relative mb-16 sm:mb-24 animate-slideUp">
          {/* Gridline Background */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '35px 35px' }}></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-10 lg:gap-12">
            <div className="w-full lg:max-w-3xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="h-6 sm:h-8 w-auto" />
                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Member Support Node</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-coop-darkGreen tracking-tighter leading-[0.85] uppercase mb-4 sm:mb-8">
                Knowledge<br/>
                <span className="text-coop-green">Base</span>
              </h1>
              <p className="text-sm sm:text-base md:text-xl text-gray-500 font-medium leading-relaxed max-w-xl border-l-4 border-coop-green/10 pl-3 sm:pl-8">
                Access the official Saint Vincent cooperative documentation, technical guides, and support protocols to ensure a smooth democratic experience.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
              <div onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHelpDeskClick();
              }} className={`p-3 sm:p-6 rounded-none border shadow-xl flex items-center gap-2 sm:gap-4 group cursor-pointer hover:border-coop-green transition-all w-full lg:w-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-8 sm:w-12 h-8 sm:h-12 text-coop-green flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-coop-green/20' : 'bg-coop-green/10'}`}>
                  <LifeBuoy size={16} className="sm:block hidden" />
                  <LifeBuoy size={14} className="sm:hidden block" />
                </div>
                <div className="flex-1 lg:flex-none">
                  <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>Status</p>
                  <p className={`text-[8px] sm:text-sm font-black uppercase ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Help Desk Online</p>
                </div>
                <ArrowUpRight size={14} className={`transition-all flex-shrink-0 hidden sm:block ${isDarkMode ? 'text-slate-400 group-hover:text-coop-green' : 'text-gray-200 group-hover:text-coop-green'}`} />
              </div>
            </div>
          </div>
        </header>

        {/* Intelligence Modules (Quick Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-16 sm:mb-24">
          <div className={`group relative border p-6 sm:p-8 md:p-12 rounded-none shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(45,122,62,0.15)] hover:border-coop-green transition-all duration-700 overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="absolute top-0 right-0 p-4 sm:p-6 md:p-8 opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.06] transition-opacity">
              <FileText size={100} className="hidden sm:block" />
              <FileText size={80} className="sm:hidden block" />
            </div>
            <div className={`w-12 sm:w-16 h-12 sm:h-16 text-gray-400 group-hover:bg-coop-green group-hover:text-white flex items-center justify-center transition-all mb-6 sm:mb-10 shadow-inner ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <FileText size={20} className="hidden sm:block" />
              <FileText size={16} className="sm:hidden block" />
            </div>
            <h3 className={`text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-3 sm:mb-4 group-hover:text-coop-green transition-colors ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
              Election Guidelines
            </h3>
            <p className={`text-xs sm:text-base md:text-lg font-medium leading-relaxed mb-6 sm:mb-12 max-w-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
              The formal digital packet regarding candidate eligibility, voting schedules, and regulations.
            </p>
            {loading ? (
              <div className="mt-auto w-max flex items-center gap-2 sm:gap-4 bg-gray-100 text-gray-400 px-4 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                <Loader2 size={12} className="sm:block hidden animate-spin" />
                <Loader2 size={10} className="sm:hidden block animate-spin" />
                <span>Loading Guidelines...</span>
              </div>
            ) : error ? (
              <div className="mt-auto w-max flex items-center gap-2 sm:gap-4 bg-red-50 text-red-600 px-4 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                {error}
              </div>
            ) : rules.length > 0 ? (
              <div className="mt-auto space-y-2">
                <p className={`text-[7px] sm:text-xs font-medium mb-3 sm:mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                  {rules.length} guideline{rules.length !== 1 ? 's' : ''} available
                </p>
                <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-2">
                  {rules.slice(0, 5).map((rule) => (
                    <div key={rule.id} className={`p-2 sm:p-3 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`text-[7px] sm:text-xs font-bold mb-0.5 sm:mb-1 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{rule.title}</p>
                      <p className={`text-[6px] sm:text-[10px] line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{rule.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-auto w-max flex items-center gap-2 sm:gap-4 bg-gray-100 text-gray-400 px-4 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                No Guidelines Available
              </div>
            )}
          </div>

          <div className={`group relative text-white p-6 sm:p-8 md:p-12 rounded-none shadow-2xl hover:shadow-coop-green/20 transition-all duration-700 overflow-hidden flex flex-col ${isDarkMode ? 'bg-coop-darkGreen' : 'bg-coop-darkGreen'}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="absolute top-0 right-0 p-4 sm:p-6 md:p-8 opacity-5 -translate-y-1/2 translate-x-1/2">
              <Phone size={160} className="hidden sm:block" />
              <Phone size={120} className="sm:hidden block" />
            </div>
            <div className={`w-12 sm:w-16 h-12 sm:h-16 text-coop-yellow flex items-center justify-center transition-all mb-6 sm:mb-10 shadow-inner border border-white/10 backdrop-blur-md ${isDarkMode ? 'bg-white/10' : 'bg-white/10'}`}>
              <Phone size={20} className="hidden sm:block" />
              <Phone size={16} className="sm:hidden block" />
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3 sm:mb-4 group-hover:text-coop-yellow transition-colors">
              Support Hotline
            </h3>
            <p className="text-xs sm:text-base md:text-lg text-white/60 font-medium leading-relaxed mb-6 sm:mb-12 max-w-sm">
              Connect directly with our technical secretariat for live assistance with member identity verification.
            </p>
            <button className="mt-auto w-max flex items-center gap-2 sm:gap-4 bg-white text-coop-darkGreen px-4 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-coop-yellow transition-all shadow-xl active:scale-95">
              <span>Initiate Voice Comms</span>
              <ArrowUpRight size={14} className="hidden sm:block" />
              <ArrowUpRight size={12} className="sm:hidden block" />
            </button>
          </div>
        </div>

        {/* Cinematic Visualizer Section */}
        <section className="mb-16 sm:mb-24 animate-fadeIn">
          <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-10">
            <PlayCircle size={14} className="sm:block hidden text-coop-green" />
            <PlayCircle size={12} className="sm:hidden block text-coop-green" />
            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Integrated Visual Tutorial</span>
          </div>
          
          <div className={`border rounded-none shadow-2xl overflow-hidden grid lg:grid-cols-12 min-h-[300px] sm:min-h-[400px] md:min-h-[500px] transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="lg:col-span-7 relative group overflow-hidden bg-black order-2 lg:order-1">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/OAPgqUCA4gE"
                title="Tutorial Walkthrough"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              ></iframe>
              
              <div className="absolute bottom-4 sm:bottom-10 left-4 sm:left-10 flex items-center gap-2 sm:gap-4 bg-white/10 backdrop-blur-xl p-2 sm:p-4 border border-white/20 pointer-events-none">
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-coop-yellow rounded-full animate-pulse shadow-[0_0_10px_#f2e416]"></div>
                <span className="text-[7px] sm:text-[10px] font-black text-white uppercase tracking-widest">Protocol-v4 Walkthrough</span>
              </div>
            </div>
            
            <div className={`lg:col-span-5 p-4 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-l order-1 lg:order-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
              <h3 className={`text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight mb-4 sm:mb-8 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                System Interface Guide
              </h3>
              <div className="space-y-4 sm:space-y-8">
                {tutorialSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 sm:gap-6 group">
                    <div className={`text-base sm:text-2xl font-black group-hover:text-coop-green transition-colors font-mono flex-shrink-0 ${isDarkMode ? 'text-coop-green/40' : 'text-coop-green/20'}`}>
                      0{i + 1}
                    </div>
                    <div>
                      <h4 className={`text-[7px] sm:text-sm font-black uppercase tracking-tight mb-1 sm:mb-2 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{step.title}</h4>
                      <p className={`text-[6px] sm:text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-8 sm:mt-12 pt-4 sm:pt-8 border-t flex items-center gap-2 sm:gap-3 transition-colors duration-300 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                <ShieldCheck size={16} className="hidden sm:block text-coop-green" />
                <ShieldCheck size={12} className="sm:hidden block text-coop-green" />
                <span className={`text-[7px] sm:text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Digital Audit Integrity Verified</span>
              </div>
            </div>
          </div>
        </section>

        {/* Voting Locations Map */}
        <section className="mb-16 sm:mb-24 animate-fadeIn">
          <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-10">
            <MapIcon size={14} className="sm:block hidden text-coop-green" />
            <MapIcon size={12} className="sm:hidden block text-coop-green" />
            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Location Navigator</span>
          </div>
          
          <div className={`border rounded-none shadow-2xl overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-4 sm:p-8 md:p-12 border-b transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2 sm:mb-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>
                Voting Locations
              </h3>
              <p className={`text-xs sm:text-base font-medium mb-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                Find your nearest polling station and access location-based resources
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {votingLocations.map((location) => (
                  <div key={location.id} className={`p-3 sm:p-4 border hover:border-coop-green transition-all group cursor-pointer transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                    <p className={`text-[7px] sm:text-xs font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Location {location.id}</p>
                    <p className={`text-sm sm:text-base font-black group-hover:text-coop-green transition-colors ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{location.name}</p>
                    <p className={`text-[10px] sm:text-xs mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="h-[400px] sm:h-[500px] md:h-[600px] w-full relative">
              <Map
                center={[-73.98, 40.75]}
                zoom={13}
                dragPan={false}
                scrollZoom={false}
                boxZoom={false}
                doubleClickZoom={false}
                dragRotate={false}
                touchZoomRotate={false}
                keyboard={false}
              >
                <MapControls showZoom={true} position="bottom-right" />
                {votingLocations.map((location) => (
                  <MapMarker
                    key={location.id}
                    longitude={location.lng}
                    latitude={location.lat}
                    draggable={false}
                  >
                    <MarkerContent>
                      <div className="pointer-events-auto">
                        <MapPin
                          className="fill-coop-green stroke-white dark:fill-coop-green"
                          size={28}
                        />
                      </div>
                    </MarkerContent>
                    <MarkerPopup>
                      <div className="space-y-1">
                        <p className="font-black text-coop-darkGreen">{location.name}</p>
                        <p className="text-xs text-gray-600">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                ))}
              </Map>
            </div>
          </div>
        </section>

        {/* FAQ Protocol Matrix */}
        <section className={`border p-6 sm:p-10 md:p-12 lg:p-20 rounded-none shadow-sm animate-fadeIn transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-8 md:gap-10 mb-8 sm:mb-12 md:mb-16">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <HelpCircle className="text-coop-yellow hidden sm:block" size={16} />
                <HelpCircle className="text-coop-yellow sm:hidden block" size={14} />
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Query Terminal</span>
              </div>
              <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Frequently Asked</h3>
            </div>
            <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-1.5 sm:py-2 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <Activity size={12} className="sm:block hidden text-coop-green" />
              <Activity size={10} className="sm:hidden block text-coop-green" />
              <span className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Real-time Node Telemetry</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-1 gap-4 max-w-4xl">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`transition-all duration-500 border-b ${
                  openFaq === index ? 'pb-10 pt-4' : 'py-4'
                } ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex justify-between items-start gap-3 sm:items-center text-left group py-3 sm:py-4"
                >
                  <span className={`text-sm sm:text-lg md:text-xl font-black tracking-tight transition-all uppercase ${
                    openFaq === index ? 'text-coop-green' : isDarkMode ? 'text-coop-yellow group-hover:text-coop-green' : 'text-coop-darkGreen group-hover:text-coop-green'
                  }`}>
                    {faq.question}
                  </span>
                  <div className={`transition-transform duration-500 flex-shrink-0 ${openFaq === index ? 'rotate-180 text-coop-green' : isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>
                    <ChevronDown size={18} className="hidden sm:block" />
                    <ChevronDown size={16} className="sm:hidden block" />
                  </div>
                </button>
                {openFaq === index && (
                  <div className="mt-4 sm:mt-6 md:mt-8 animate-fadeIn">
                    <div className="flex gap-3 sm:gap-6 items-start">
                      <div className="w-0.5 sm:w-1 h-16 sm:h-20 bg-coop-yellow"></div>
                      <p className={`text-xs sm:text-base md:text-lg font-medium leading-relaxed max-w-3xl ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`mt-12 sm:mt-16 md:mt-20 p-6 sm:p-10 md:p-12 text-white rounded-none relative overflow-hidden group transition-colors duration-300 ${isDarkMode ? 'bg-coop-darkGreen' : 'bg-coop-darkGreen'}`}>
            <div className="absolute top-0 right-0 p-6 sm:p-8 md:p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000 hidden sm:block">
              <MessageSquare size={120} className="hidden md:block" />
              <MessageSquare size={80} className="md:hidden block" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 md:gap-10">
              <div className="text-center md:text-left">
                <h4 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tighter mb-1 sm:mb-2">Unresolved Protocols?</h4>
                <p className="text-xs sm:text-sm md:text-base text-white/60 font-medium">Our support agents are available for direct secure messaging.</p>
              </div>
              <button className="px-6 sm:px-10 md:px-12 py-2.5 sm:py-4 md:py-5 bg-coop-yellow text-coop-green font-black text-[8px] sm:text-[10px] md:text-[12px] uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-2xl hover:bg-white transition-all active:scale-95 flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
                <span>Open Secure Message Hub</span>
                <MessageSquare size={14} className="hidden sm:block" />
                <MessageSquare size={12} className="sm:hidden block" />
              </button>
            </div>
          </div>
        </section>

        {/* System Disclaimer Footer */}
        <div className="mt-16 sm:mt-20 md:mt-24 flex flex-col items-center">
          <div className={`w-8 sm:w-10 md:w-12 h-px mb-4 sm:mb-6 md:mb-8 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-1.5 sm:py-2 border shadow-sm rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <Info size={12} className="sm:block hidden text-coop-green" />
            <Info size={10} className="sm:hidden block text-coop-green" />
            <p className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest leading-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              Documentation Node v4.2.1 • Registry Ref: K-NODE-SV-2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
