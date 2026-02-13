
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
    setShowPassword(false);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await authAPI.login(email, password);
      
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
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(errorMessage || 'Verification Failed. Check your credentials.');
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
      } else {
        setError('Invalid Verification Key.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex relative overflow-hidden font-sans">

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
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden pt-16">
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
                  className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none"
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
                  className="w-full group relative flex items-center gap-6 p-1 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-coop-green hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + (idx * 0.08) }}
                  whileHover={{ 
                    y: -4,
                    boxShadow: "0 20px 30px rgba(45, 122, 62, 0.15)"
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-16 h-14 bg-gray-50 flex items-center justify-center group-hover:bg-coop-green group-hover:text-white transition-colors duration-300 rounded-lg ml-1">
                    <portal.icon size={22} strokeWidth={1.5} />
                  </div>
                  
                  <div className="flex-grow text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-coop-green transition-colors">
                        {portal.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5 group-hover:text-gray-500 transition-colors">
                      {portal.desc}
                    </p>
                  </div>

                  <div className="pr-6 flex items-center gap-4">
                    <span className="text-[9px] font-mono font-bold text-gray-200 group-hover:text-coop-green/30 transition-colors">
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
                setShowPassword(false);
                setError('');
              }}
              className="mb-10 flex items-center gap-2 text-gray-400 hover:text-coop-darkGreen transition-colors font-black text-[9px] uppercase tracking-[0.2em] group"
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
                className="text-2xl font-black text-gray-900 tracking-tight uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {step === 'CREDENTIALS' ? 'Authorize Identity' : 'Verify Session'}
              </motion.h2>
              <motion.p 
                className="text-gray-400 text-[10px] font-mono font-bold uppercase tracking-widest mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Security Protocol: {selectedRole?.toUpperCase()}
              </motion.p>
            </motion.div>

            {error && (
              <motion.div 
                className="mb-8 bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3"
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
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-coop-green focus:ring-4 focus:ring-coop-green/5 font-bold text-sm text-gray-900 transition-all placeholder:text-gray-300 shadow-sm"
                      placeholder="Enter Email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-coop-green focus:ring-4 focus:ring-coop-green/5 font-bold text-sm text-gray-900 transition-all placeholder:text-gray-300 shadow-sm"
                      placeholder="Password"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-300 hover:text-coop-green transition-colors cursor-pointer"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </motion.div>

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
                  className="p-10 text-center bg-white rounded-2xl border border-gray-100 shadow-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mb-6">6-Digit Access Token</p>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-transparent text-center text-4xl tracking-[0.4em] font-black text-coop-darkGreen outline-none placeholder:text-gray-100"
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
          <div className="flex items-center gap-4 text-gray-300">
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
