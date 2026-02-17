import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { User, UserRole } from '../types.ts';
import { 
  Smartphone, 
  MessageSquare, ShieldCheck, Fingerprint, 
  Key, Globe, ChevronRight, Loader2,
  ShieldAlert, Mail, Eye, EyeOff, Shield, Briefcase, Users, Scale, Building2,
  UserCheck as UserIcon, Lock, ArrowLeft, Activity, Database,
  Vote
} from 'lucide-react';
import { authAPI, voteAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import Logo from '../assets/SVMPC_LOGO-NOBG.png';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'ROLE_SELECTION' | 'CREDENTIALS' | '2FA'>('ROLE_SELECTION');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [memberId, setMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTemporaryPassword, setHasTemporaryPassword] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const { isDarkMode } = useDarkMode();

  // Add autofill styling override
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px ${isDarkMode ? '#1e293b' : '#ffffff'} inset !important;
        box-shadow: 0 0 0 30px ${isDarkMode ? '#1e293b' : '#ffffff'} inset !important;
      }
      input:-webkit-autofill {
        -webkit-text-fill-color: ${isDarkMode ? '#e2e8f0' : '#111827'} !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [isDarkMode]);

  const portals = [
    { id: 'admin', title: 'Administrator', code: 'LVL-01', icon: Shield, desc: 'System & Governance' },
    { id: 'staff', title: 'Staff / Employee', code: 'LVL-02', icon: Briefcase, desc: 'Operational Management' },
    { id: 'member', title: 'Cooperative Member', code: 'LVL-03', icon: Users, desc: 'Member Services & Voting' },
    { id: 'auditor', title: 'External Auditor', code: 'LVL-04', icon: Scale, desc: 'Compliance & Audit' },
    { id: 'admission', title: 'Public Admission', code: 'LVL-05', icon: Building2, desc: 'Inquiry & Membership' }
  ];

  const handlePortalSelect = (portalId: string) => {
    setSelectedRole(portalId);
    setStep('CREDENTIALS');
    setError('');
    setEmail('');
    setPassword('');
    setMemberId('');
    setShowPassword(false);
    setHasTemporaryPassword(false);
    setShowResendOption(false);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setShowResendOption(false);
    
    try {
      let response;
      
      // Support both email-based and member_id-based login
      if (selectedRole === 'member' && memberId) {
        // Member login with member_id and password (temporary or permanent)
        response = await authAPI.login(undefined, password, memberId);
      } else {
        // Traditional email-based login
        response = await authAPI.login(email, password);
      }
      
      if (!response || !response.user || !response.token) {
        setError('Invalid credentials. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      // Validate that selected role matches user's actual role
      const userRole = response.user.role;
      const roleMap: Record<string, string> = {
        'admin': 'admin',
        'staff': 'officer',
        'member': 'member',
        'auditor': 'auditor',
        'admission': 'member'
      };

      if (roleMap[selectedRole] !== userRole) {
        setError(`Access Denied. This portal is for ${selectedRole}s only. Your account is a ${userRole}.`);
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem('token', response.token);

      // Check if user logged in with temporary password
      const usedTemporaryPassword = response.user.has_temporary_password || false;
      setHasTemporaryPassword(usedTemporaryPassword);

      let hasVoted = false;
      try {
        const votes = await voteAPI.getUserVotes();
        hasVoted = votes.length > 0;
      } catch {
        hasVoted = false;
      }

      const mappedUser: User = {
        id: response.user.id,
        name: response.user.fullName || response.user.username,
        email: response.user.email,
        role: response.user.role as UserRole,
        hasVoted,
        username: response.user.username,
        fullName: response.user.fullName,
        isActive: true
      };

      setTempUser(mappedUser);
      setStep('2FA');
      setIsLoading(false);
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data;
      const errorMessage = errorData?.message;
      const errorCode = errorData?.code;

      // Handle expired temporary password
      if (errorCode === 'TEMP_PASSWORD_EXPIRED') {
        setError('Your temporary password has expired. Request a new one.');
        setShowResendOption(true);
      } else {
        setError(errorMessage || 'Verification Failed. Check your credentials.');
      }
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (otp === '123456') {
        if (tempUser) {
          // If user logged in with temporary password, show password change prompt
          if (hasTemporaryPassword) {
            Swal.fire({
              title: 'Set Your Password',
              text: 'You logged in with a temporary password. Would you like to set a permanent password now?',
              icon: 'info',
              showCancelButton: true,
              confirmButtonText: 'Yes, Change Password',
              cancelButtonText: 'Skip for Now',
              confirmButtonColor: '#2d7a3e',
              cancelButtonColor: '#6b7280',
            }).then((result) => {
              if (result.isConfirmed) {
                // User wants to change password - pass flag to parent
                onLogin({ ...tempUser, needsPasswordChange: true });
              } else {
                // User skips password change
                Swal.fire({
                  title: 'Welcome!',
                  text: `Login successful, ${tempUser.name}!`,
                  icon: 'success',
                  timer: 2000,
                  showConfirmButton: false,
                  position: 'top-end',
                  toast: true
                });
                onLogin(tempUser);
              }
            });
          } else {
            // Regular login without temporary password
            Swal.fire({
              title: 'Welcome!',
              text: `Login successful, ${tempUser.name}!`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              position: 'top-end',
              toast: true
            });
            onLogin(tempUser);
          }
        }
      } else {
        setError('Invalid Verification Key.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className={`min-h-screen w-full flex relative overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-coop-green p-12 flex-col justify-between relative overflow-hidden" style={{ backgroundImage: 'url(/hero-pattern.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-coop-green/95 via-coop-green/90 to-coop-darkGreen/95" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-coop-yellow/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-coop-yellow/10 rounded-full blur-2xl" />
        </div>

        <motion.div 
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="space-y-4">
            <h2 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              Your Voice<br />
              <span className="text-coop-yellow">Matters</span>
            </h2>
            <p className="text-xl text-white/80 max-w-lg leading-relaxed">
              Secure, transparent, and accessible electronic voting for all cooperative members. 
              Exercise your right to vote and shape our community's future.
            </p>
          </div>
          
          {/* Features */}
          <motion.div 
            className="grid grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {[
              { icon: Lock, label: 'Secure' },
              { icon: Vote, label: 'Transparent' },
              { icon: Fingerprint, label: 'Verified' },
            ].map((feature) => (
              <motion.div 
                key={feature.label} 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-coop-yellow/30 transition-all"
                whileHover={{ y: -4, borderColor: 'rgba(245, 194, 72, 0.3)' }}
              >
                <feature.icon className="h-6 w-6 text-coop-yellow mb-2" />
                <span className="text-white font-semibold text-sm">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Community image card */}
          <motion.div 
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <img 
              src="/hands-raise.jpeg" 
              alt="Community members voting" 
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-semibold">Active Community Participation</p>
              <p className="text-white/70 text-sm">Join 248+ members in shaping our cooperative</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-white/50 text-sm">
            © 2024 Saint Vincent Multipurpose Cooperative. All rights reserved.
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden pt-16 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Subtle Architectural Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none master-grid"></div>

        <div className="relative z-10 w-full max-w-xl flex flex-col items-center pb-24 px-6">
        
        {step === 'ROLE_SELECTION' ? (
          <motion.div 
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Professional Logo Branding */}
            <motion.div 
              className="mb-12 flex flex-col items-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <motion.div 
                className="w-24 h-24 bg-white rounded-2xl border border-gray-100 shadow-2xl flex items-center justify-center mb-6 relative group transition-all hover:scale-105"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-coop-darkGreen/5 to-transparent rounded-2xl"></div>
                <img src={Logo} alt="Saint Vincent Cooperative" className="w-20 h-20 object-contain" />
              </motion.div>
              <div className="text-center">
                <motion.h1 
                  className={`text-2xl font-black tracking-tight uppercase leading-none ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Saint Vincent Cooperative
                </motion.h1>
                <motion.p 
                  className="text-[10px] font-mono font-bold text-gray-400 mt-2 uppercase tracking-[0.3em]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  Registry Authority • Central Portal
                </motion.p>
              </div>
            </motion.div>

            {/* Aesthetic Button Stack */}
            <motion.div 
              className="w-full space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {portals.map((portal, idx) => (
                <motion.button
                  key={portal.id}
                  onClick={() => handlePortalSelect(portal.id)}
                  className={`w-full group relative flex items-center gap-6 p-1 border rounded-xl shadow-sm hover:border-coop-green hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + (idx * 0.08) }}
                  whileHover={{ 
                    y: -4,
                    boxShadow: "0 20px 30px rgba(45, 122, 62, 0.15)"
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-16 h-14 flex items-center justify-center group-hover:bg-coop-green group-hover:text-white transition-colors duration-300 rounded-lg ml-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <portal.icon size={22} strokeWidth={1.5} />
                  </div>
                  
                  <div className="flex-grow text-left">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black uppercase tracking-tight group-hover:text-coop-green transition-colors ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                        {portal.title}
                      </span>
                    </div>
                    <p className={`text-[10px] font-medium uppercase tracking-widest mt-0.5 group-hover:text-gray-500 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      {portal.desc}
                    </p>
                  </div>

                  <div className="pr-6 flex items-center gap-4">
                    <span className={`text-[9px] font-mono font-bold transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-coop-green/30' : 'text-gray-200 group-hover:text-coop-green/30'}`}>
                      {portal.code}
                    </span>
                    <ChevronRight size={16} className="text-gray-200 group-hover:text-coop-green group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Subtle Interaction Glow */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-coop-green group-hover:w-full transition-all duration-500"></div>
                </motion.button>
              ))}
            </motion.div>

            {/* Info Footer */}
            <motion.div 
              className="mt-16 flex items-center gap-8 opacity-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} className="text-coop-green" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-coop-green" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Audit</span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Professional Form Layout */}
            <motion.button 
              onClick={() => {
                setStep('ROLE_SELECTION');
                setEmail('');
                setPassword('');
                setMemberId('');
                setShowPassword(false);
                setError('');
                setHasTemporaryPassword(false);
                setShowResendOption(false);
              }}
              className={`mb-10 flex items-center gap-2 hover:text-coop-darkGreen transition-colors font-black text-[9px] uppercase tracking-[0.2em] group ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}
              whileHover={{ x: -4 }}
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
              Switch Access Portal
            </motion.button>

            <motion.div 
              className="mb-10 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.div 
                className="w-20 h-20 bg-coop-darkGreen/5 text-coop-darkGreen flex items-center justify-center mx-auto mb-6 rounded-2xl border border-coop-darkGreen/10"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {step === 'CREDENTIALS' ? <Fingerprint size={36} strokeWidth={1.5} /> : <Key size={36} strokeWidth={1.5} />}
              </motion.div>
              <motion.h2 
                className={`text-2xl font-black tracking-tight uppercase ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {step === 'CREDENTIALS' ? 'Authorize Identity' : 'Verify Session'}
              </motion.h2>
              <motion.p 
                className={`text-[10px] font-mono font-bold uppercase tracking-widest mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Security Protocol: {selectedRole?.toUpperCase()}
              </motion.p>
            </motion.div>

            {error && (
              <motion.div 
                className={`mb-8 border p-4 rounded-xl flex items-center gap-3 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ShieldAlert size={16} className="text-red-500" />
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{error}</p>
              </motion.div>
            )}

            {step === 'CREDENTIALS' ? (
              <motion.form 
                onSubmit={handleCredentialsSubmit} 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {selectedRole === 'member' ? (
                  <>
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <div className="relative group">
                        <div className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>
                          <UserIcon size={16} />
                        </div>
                        <input
                          type="text"
                          value={memberId}
                          onChange={(e) => setMemberId(e.target.value)}
                          className={`w-full pl-12 pr-6 py-4 rounded-xl outline-none focus:border-coop-green focus:ring-4 font-bold text-sm transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-coop-yellow/20' : 'bg-white border border-gray-100 text-gray-900 placeholder:text-gray-300 focus:ring-coop-green/5'}`}
                          placeholder="Member ID"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <div className="relative group">
                      <div className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-12 pr-6 py-4 rounded-xl outline-none focus:border-coop-green focus:ring-4 font-bold text-sm transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-coop-yellow/20' : 'bg-white border border-gray-100 text-gray-900 placeholder:text-gray-300 focus:ring-coop-green/5'}`}
                        placeholder="Enter Email"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-12 pr-12 py-4 rounded-xl outline-none focus:border-coop-green focus:ring-4 font-bold text-sm transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-coop-yellow/20' : 'bg-white border border-gray-100 text-gray-900 placeholder:text-gray-300 focus:ring-coop-green/5'}`}
                      placeholder={selectedRole === 'member' ? 'Temporary or Permanent Password' : 'Password'}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-0 pr-5 flex items-center hover:text-coop-green transition-colors cursor-pointer ${isDarkMode ? 'text-slate-500 hover:text-coop-yellow' : 'text-gray-300'}`}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </motion.div>

                {showResendOption && (
                  <motion.div 
                    className={`p-4 rounded-xl border flex items-start gap-3 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MessageSquare size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Temporary Password Expired</p>
                      <button
                        type="button"
                        onClick={() => {
                          Swal.fire({
                            title: 'Resend SMS?',
                            text: 'We will send a new temporary password to your registered phone number.',
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, Resend SMS',
                            cancelButtonText: 'Cancel',
                            confirmButtonColor: '#2d7a3e',
                          }).then((result) => {
                            if (result.isConfirmed) {
                              Swal.fire({
                                title: 'SMS Sent!',
                                text: 'A new temporary password has been sent to your phone.',
                                icon: 'success',
                                timer: 3000,
                                showConfirmButton: false,
                              });
                              setShowResendOption(false);
                              setError('');
                              setPassword('');
                            }
                          });
                        }}
                        className="text-blue-600 hover:text-blue-700 font-bold text-[10px] uppercase tracking-widest underline"
                        disabled={isLoading}
                      >
                        Request New SMS
                      </button>
                    </div>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 bg-coop-darkGreen text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 flex justify-center items-center gap-3"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>Verify and Authenticate <ChevronRight size={18} /></>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form 
                onSubmit={handleOtpSubmit} 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <motion.div 
                  className={`p-10 text-center rounded-2xl border shadow-xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>6-Digit Access Token</p>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`w-full bg-transparent text-center text-4xl tracking-[0.4em] font-black outline-none ${isDarkMode ? 'text-coop-yellow placeholder:text-slate-600' : 'text-coop-darkGreen placeholder:text-gray-100'}`}
                    placeholder="000000"
                    required
                    maxLength={6}
                    disabled={isLoading}
                    autoFocus
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-coop-yellow text-coop-darkGreen py-5 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-coop-darkGreen hover:text-white transition-all active:scale-95 flex justify-center items-center gap-3"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>Initialize Terminal Session <ShieldCheck size={20} /></>
                  )}
                </motion.button>
              </motion.form>
            )}
          </motion.div>
        )}
        </div>

        {/* Terminal Footer Info */}
        <div className="mt-auto pb-12 w-full flex flex-col items-center">
          <div className={`flex items-center gap-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>
            <Database size={14} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Saint Vincent Registry Authority Database</span>
          </div>
          <div className="mt-4 flex items-center gap-2 opacity-30">
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span className="text-[8px] font-mono text-gray-400">Poblacion Main Branch Node • SAN-99-X</span>
          </div>
        </div>
      </div>
    </div>
  );
};
