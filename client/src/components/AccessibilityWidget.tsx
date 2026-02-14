import React, { useState, useEffect } from 'react';
import { Accessibility, Type, Sun, Moon, X, Palette } from 'lucide-react';
import { userAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

interface AccessibilityWidgetProps {
  highContrast?: boolean;
  toggleHighContrast?: () => void;
  fontSize?: 'normal' | 'large';
  setFontSize?: (size: 'normal' | 'large') => void;
}

export const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({ 
  highContrast: propHighContrast, 
  toggleHighContrast: propToggleHighContrast, 
  fontSize: propFontSize, 
  setFontSize: propSetFontSize 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [loading, setLoading] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Use props if provided (for backward compatibility), otherwise use context
  const useProps = propHighContrast !== undefined && propToggleHighContrast !== undefined;
  const currentDarkMode = useProps ? propHighContrast : isDarkMode;
  const currentFontSize = useProps ? (propFontSize || 'normal') : fontSize;

  // Fetch user preferences from backend on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // User not logged in, use defaults
          return;
        }

        const profile = await userAPI.getProfile();
        if (profile.fontSize) {
          setFontSize(profile.fontSize);
        }
      } catch (error) {
        console.error('Failed to fetch accessibility preferences:', error);
      }
    };

    fetchPreferences();
  }, []);

  // Save preferences to backend
  const savePreferences = async (newDarkMode: boolean, newFontSize: 'normal' | 'large') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // User not logged in, just update local state
        return;
      }

      setLoading(true);
      await userAPI.updateAccessibilityPreferences({
        highContrast: newDarkMode,
        fontSize: newFontSize
      });
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDarkMode = async () => {
    const newDarkMode = !currentDarkMode;
    
    if (useProps && propToggleHighContrast) {
      propToggleHighContrast();
    } else {
      toggleDarkMode();
    }
    
    await savePreferences(newDarkMode, currentFontSize);
  };

  const handleSetFontSize = async (size: 'normal' | 'large') => {
    if (useProps && propSetFontSize) {
      propSetFontSize(size);
    } else {
      setFontSize(size);
    }
    
    await savePreferences(currentDarkMode, size);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[250] flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-slate-800 mb-2 animate-fadeIn w-72">
           <div className="flex justify-between items-center mb-6 border-b dark:border-slate-800 pb-3">
             <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-3 text-sm uppercase tracking-widest">
               <Accessibility size={20} className="text-coop-green" /> Terminal View
             </h3>
             <button 
               onClick={() => setIsOpen(false)} 
               className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
               aria-label="Close accessibility menu"
             >
               <X size={18} />
             </button>
           </div>
           
           <div className="space-y-6">
             {/* Text Size Control */}
             <div>
               <label className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 block">Legibility Scaling</label>
               <div className="flex bg-gray-50 dark:bg-slate-800/50 rounded-xl p-1.5 border border-gray-100 dark:border-slate-800">
                 <button 
                   onClick={() => handleSetFontSize('normal')}
                   disabled={loading}
                   className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-black transition-all ${currentFontSize === 'normal' ? 'bg-white dark:bg-slate-700 shadow-md text-coop-darkGreen dark:text-white' : 'text-gray-400 hover:text-gray-600'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                   <Type size={14} /> STD
                 </button>
                 <button 
                   onClick={() => handleSetFontSize('large')}
                   disabled={loading}
                   className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-black transition-all ${currentFontSize === 'large' ? 'bg-white dark:bg-slate-700 shadow-md text-coop-darkGreen dark:text-white' : 'text-gray-400 hover:text-gray-600'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                   <Type size={18} /> LRG
                 </button>
               </div>
             </div>

             {/* Dark Mode Control */}
             <div>
               <label className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 block">Appearance Mode</label>
               <button 
                 onClick={handleToggleDarkMode}
                 disabled={loading}
                 className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 text-xs font-black border transition-all ${
                   currentDarkMode 
                     ? 'bg-coop-gold text-coop-darkGreen border-coop-gold shadow-lg shadow-coop-gold/20' 
                     : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                 } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {currentDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                 {currentDarkMode ? 'Switch to Light Node' : 'Initialize Dark Node'}
               </button>
             </div>
           </div>

           <div className="mt-6 pt-4 border-t dark:border-slate-800 flex items-center justify-center gap-3 opacity-30">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Accessible Profile Active</span>
           </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-coop-green/30 relative group overflow-hidden ${currentDarkMode ? 'bg-coop-gold text-coop-darkGreen' : 'bg-coop-green text-white'}`}
        aria-label="Open visual preferences"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <div className="relative z-10">
          <Palette size={28} />
        </div>
      </button>
    </div>
  );
};
