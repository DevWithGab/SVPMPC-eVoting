import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation slightly before unmounting
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1500);

    // Complete the splash screen lifecycle
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#FDFDFD] flex flex-col items-center justify-center transition-opacity duration-700 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center animate-fadeIn">
        {/* Main Logo Block */}
        <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center relative z-10 overflow-hidden">
              <img src="/SVMPC_LOGO.png" alt="SVMPC Official Logo" className="w-full h-full object-contain p-2" />
            </div>
        </div>

        {/* Text Branding */}
        <div className="mt-8 text-center space-y-2">
            <h1 className="text-2xl font-black text-coop-darkGreen uppercase tracking-tighter leading-none">
                Saint Vincent
            </h1>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.4em]">
                Registry Authority
            </p>
        </div>

        {/* Loading Indicator */}
        <div className="mt-12 flex flex-col items-center gap-3">
            <div className="w-32 h-0.5 bg-gray-100 overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-coop-green w-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-mono text-gray-300 uppercase tracking-widest">
                <ShieldCheck size={10} className="text-coop-green" />
                <span>Secure Connection...</span>
            </div>
        </div>
      </div>

      {/* Background Grid Pattern (Subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
            backgroundImage: 'linear-gradient(to right, #2D7A3E 1px, transparent 1px), linear-gradient(to bottom, #2D7A3E 1px, transparent 1px)', 
            backgroundSize: '60px 60px' 
        }}
      ></div>
    </div>
  );
};
