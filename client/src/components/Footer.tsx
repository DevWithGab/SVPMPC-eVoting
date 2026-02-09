
import React from 'react';
import { SDGS, SdgIcon } from '../constants.tsx';
import { Mail, MapPin, Terminal, ArrowUpRight, Globe, Github, Twitter, Facebook, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gradient-to-br from-coop-green/10 to-coop-green/5 pt-12 sm:pt-24 pb-8 sm:pb-12 overflow-hidden border-t border-coop-green/20">
      {/* Structural Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #2D7A3E 1px, transparent 1px), linear-gradient(to bottom, #2D7A3E 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-coop-yellow"></div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-0 border border-coop-green/10 bg-white/50 shadow-sm">
          
          {/* Brand Identity Module */}
          <div className="sm:col-span-2 lg:col-span-4 p-6 sm:p-8 lg:p-12 border-b sm:border-b-0 lg:border-b-0 lg:border-r border-coop-green/10 flex flex-col justify-between">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="h-10 sm:h-12 w-auto" />
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-coop-darkGreen tracking-tighter uppercase leading-none">Saint Vincent</h3>
                  <p className="mono-label text-coop-green mt-1 sm:mt-2 text-[10px] sm:text-xs">Registry Authority</p>
                </div>
              </div>
              <p className="text-gray-500 text-[11px] sm:text-sm leading-relaxed max-w-sm font-medium italic">
                Architecting the future of democratic participation through secure digital governance and community-led infrastructure.
              </p>
            </div>
            <div className="flex gap-3 sm:gap-4 mt-8 sm:mt-12">
              {[Facebook, Twitter, Github].map((Icon, i) => (
                <a key={i} href="#" className="w-9 sm:w-10 h-9 sm:h-10 border border-coop-green/10 flex items-center justify-center text-gray-400 hover:text-coop-green hover:border-coop-green hover:bg-coop-green/5 transition-all">
                  <Icon size={14} className="sm:w-4 sm:h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="sm:col-span-1 lg:col-span-2 p-6 sm:p-8 lg:p-12 border-b sm:border-b-0 sm:border-r border-coop-green/10">
            <h4 className="mono-label text-gray-400 mb-6 sm:mb-8 text-[10px] sm:text-xs">Network</h4>
            <ul className="space-y-3 sm:space-y-4">
              {['Election Hub', 'Member Ledger', 'Public Audit', 'Bylaws'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-[9px] sm:text-[10px] font-black text-gray-500 hover:text-coop-green transition-colors flex items-center gap-1.5 sm:gap-2 group uppercase tracking-widest">
                    {link} <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:col-span-1 lg:col-span-2 p-6 sm:p-8 lg:p-12 border-b sm:border-b-0 border-coop-green/10 sm:border-r">
            <h4 className="mono-label text-gray-400 mb-6 sm:mb-8 text-[10px] sm:text-xs">Compliance</h4>
            <ul className="space-y-3 sm:space-y-4">
              {['Data Privacy', 'Terms of Use', 'Security Disclosure', 'Compliance'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-[9px] sm:text-[10px] font-black text-gray-500 hover:text-coop-green transition-colors flex items-center gap-1.5 sm:gap-2 group uppercase tracking-widest">
                    {link} <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Module */}
          <div className="sm:col-span-2 lg:col-span-4 p-6 sm:p-8 lg:p-12 bg-gray-50 flex flex-col justify-between">
            <div className="space-y-6 sm:space-y-8">
              <h4 className="mono-label text-coop-green text-[10px] sm:text-xs">Node Support</h4>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <MapPin className="text-coop-green/30 shrink-0 w-4 sm:w-[18px] h-4 sm:h-[18px]" />
                  <div>
                    <p className="mono-label text-gray-400 mb-0.5 sm:mb-1 text-[9px] sm:text-[10px]">Central Registry</p>
                    <p className="text-[10px] sm:text-xs font-bold text-coop-darkGreen uppercase">Brgy.Bagumbayan, Dupax del Sur, Nueva Vizcaya</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <Mail className="text-coop-green/30 shrink-0 w-4 sm:w-[18px] h-4 sm:h-[18px]" />
                  <div>
                    <p className="mono-label text-gray-400 mb-0.5 sm:mb-1 text-[9px] sm:text-[10px]">Audit Inquiries</p>
                    <p className="text-[10px] sm:text-xs font-bold text-coop-darkGreen lowercase">secretariat@saintvincentcoop.ph</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 sm:mt-8 flex items-center gap-2">
              <Terminal size={12} className="text-coop-green w-3 sm:w-3" />
              <span className="mono-label text-gray-300 text-[8px] sm:text-[10px]">Auth Code: SV-7702-X</span>
            </div>
          </div>
        </div>

        {/* SDG Impact & Sustainability - Structured Ledger Grid */}
        <div className="mt-16 sm:mt-24 border-t border-coop-green/10 pt-12 sm:pt-16">
          <div className="flex flex-col gap-6 sm:gap-8 mb-10 sm:mb-12">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-8">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Globe size={14} className="sm:w-4 sm:h-4 text-coop-yellow animate-pulse" />
                  <span className="mono-label text-coop-green text-[9px] sm:text-[10px]">Sustainability Framework</span>
                </div>
                <h4 className="text-xl sm:text-3xl font-black text-coop-darkGreen tracking-tighter uppercase leading-none">Global Governance Impact</h4>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 bg-white border border-coop-green/10 px-4 sm:px-6 py-2 sm:py-3">
                <Activity size={12} className="sm:w-3.5 sm:h-3.5 text-coop-green" />
                <span className="mono-label text-gray-400 text-[8px] sm:text-[10px]">UN Protocol Aligned</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-coop-green/10 bg-coop-green/5">
            {SDGS.map((sdg) => (
              <div key={sdg.id} className="group p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-coop-green/10 bg-white hover:bg-gray-50 transition-all duration-300">
                <div className="flex items-start justify-between mb-6 sm:mb-8">
                  <div className={`w-8 sm:w-10 h-8 sm:h-10 border border-coop-green/20 flex items-center justify-center text-coop-green group-hover:bg-coop-green group-hover:text-white transition-all`}>
                    <SdgIcon name={sdg.iconName} className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <span className="text-lg sm:text-2xl font-black text-gray-100 group-hover:text-coop-yellow/30 transition-colors font-mono tracking-tighter">0{sdg.id}</span>
                </div>
                <h5 className="text-[10px] sm:text-[11px] font-black text-coop-darkGreen mb-2 sm:mb-3 uppercase tracking-widest">{sdg.title}</h5>
                <p className="text-[9px] sm:text-[10px] text-gray-400 leading-relaxed font-medium uppercase tracking-tight">
                  {sdg.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Terminal Sub-Footer Signature */}
        <div className="mt-16 sm:mt-20 pt-8 sm:pt-12 border-t border-coop-green/10 flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 opacity-40">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="mono-label text-gray-400 text-[8px] sm:text-[10px]">System Trace</span>
            <div className="h-px w-8 sm:w-12 bg-coop-green/20"></div>
            <span className="mono-label text-coop-darkGreen text-[8px] sm:text-[10px]">SV-CHAIN-STABLE-v4.2.1</span>
          </div>
          
          <p className="mono-label text-gray-400 text-[8px] sm:text-[10px]">
            © {new Date().getFullYear()} Saint Vincent Cooperative. Registry Verified.
          </p>
          
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2">
              <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-green-500 rounded-full"></div>
              <span className="mono-label text-[8px] sm:text-[10px]">LIVE NODE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-coop-yellow rounded-full shadow-[0_0_8px_#f2e416]"></div>
              <span className="mono-label text-[8px] sm:text-[10px]">AUDIT SYNC</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
