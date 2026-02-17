import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { User, PageView, SupportTicket } from '../types';
import { 
  User as UserIcon, Shield, Clock, Award, History, 
  LogOut, MessageSquare, Send, CheckCircle2, 
  ChevronRight, Hash, Terminal, Lock
} from 'lucide-react';
import Swal from 'sweetalert2';
import { PasswordChangeForm } from './PasswordChangeForm';

interface ProfileProps {
  user: User;
  onNavigate: (page: PageView) => void;
  onLogout: () => void;
  receiptHash?: string;
  initialTab?: 'OVERVIEW' | 'SUPPORT' | 'PASSWORD';
}

export const Profile: React.FC<ProfileProps> = ({ 
  user, onNavigate, onLogout, receiptHash, initialTab = 'OVERVIEW'
}) => {
  const [ticketSubject, setTicketSubject] = useState('PIN Access Issue');
  const [ticketMessage, setTicketMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUPPORT' | 'PASSWORD'>(initialTab);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch voting history on mount
  useEffect(() => {
    fetchHistory();
  }, [user.id]);

  // Synchronize internal state with prop if it changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch support tickets on mount and when support tab is active
  useEffect(() => {
    if (activeTab === 'SUPPORT') {
      fetchTickets();
    }
  }, [activeTab]);

  // Listen for navigate-to-support event from Resources component
  useEffect(() => {
    const handleNavigateToSupport = () => {
      setActiveTab('SUPPORT');
    };

    window.addEventListener('navigate-to-support', handleNavigateToSupport);
    return () => window.removeEventListener('navigate-to-support', handleNavigateToSupport);
  }, []);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      } else {
        console.error('Tickets API error:', response.status, response.statusText);
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/votes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const votes = await response.json();
        const mappedHistory = (Array.isArray(votes) ? votes : []).map((vote: any) => ({
          id: vote._id || vote.id,
          election: vote.electionId?.title || 'Unknown Election',
          date: vote.createdAt ? new Date(vote.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : 'Unknown Date',
          status: 'Voted',
          candidateName: vote.candidateId?.name
        }));
        setHistory(mappedHistory);
      } else {
        console.error('Votes API error:', response.status, response.statusText);
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching voting history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: ticketSubject,
          message: ticketMessage,
          category: 'GENERAL_INQUIRY'
        })
      });

      if (response.ok) {
        setTicketMessage('');
        setTicketSubject('PIN Access Issue');
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Your support ticket has been created successfully.',
          timer: 2000,
          showConfirmButton: false
        });
        fetchTickets(); // Refresh ticket list
      } else {
        const errorData = await response.json().catch(() => ({}));
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.message || 'Failed to create support ticket'
        });
      }
    } catch (error) {
      console.error('Ticket submission error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit ticket'
      });
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl pt-24 md:pt-32 pb-48">
      <div className="flex items-center gap-2 text-gray-400 mb-8 cursor-pointer hover:text-coop-green transition-colors font-black text-[10px] uppercase tracking-widest" onClick={() => onNavigate('LANDING')}>
        <span>&larr; Return to Node Mainframe</span>
      </div>

      <div className="bg-white shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row">
        
        {/* Profile Sidebar */}
        <aside className="w-full md:w-80 bg-gray-50 border-r border-gray-100 p-10">
          <div className="flex flex-col items-center mb-12">
             <div className="w-24 h-24 bg-white border border-gray-200 p-2 shadow-inner mb-6">
                <div className="w-full h-full bg-coop-darkGreen/5 text-coop-darkGreen flex items-center justify-center">
                  <UserIcon size={40} strokeWidth={1.5} />
                </div>
             </div>
             <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight text-center">{user.name}</h2>
             <p className="mono-label text-gray-400 mt-2 text-[10px]">Registry ID: {user.id}</p>
             <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-coop-green/10 text-coop-green text-[9px] font-black uppercase tracking-widest border border-coop-green/10">
                <Shield size={10} /> Verified Session
             </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'OVERVIEW', label: 'Membership Overview', icon: History },
              { id: 'PASSWORD', label: 'Change Password', icon: Lock },
              { id: 'SUPPORT', label: 'Support Terminal', icon: MessageSquare }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#4F75E2] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-white'}`}
              >
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-20 pt-10 border-t border-gray-200">
             <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-3 py-4 border border-red-100 text-red-500 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-widest"
              >
                  <LogOut size={16} /> Terminate
              </button>
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <main className="flex-grow p-10 md:p-16 animate-fadeIn">
          {activeTab === 'OVERVIEW' ? (
            <div className="space-y-16">
              <div>
                <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Member Ledger</h3>
                    <p className="mono-label text-gray-400 mt-2">Personal Governance Summary</p>
                  </div>
                  <Terminal size={32} className="text-gray-100" />
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-8 bg-gray-50 border border-gray-100">
                    <p className="mono-label text-gray-400 mb-2">Member Since</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">2019</p>
                    <div className="mt-4 flex items-center gap-2 text-coop-green">
                       <CheckCircle2 size={12} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Good Standing</span>
                    </div>
                  </div>
                  <div className="p-8 bg-gray-50 border border-gray-100">
                    <p className="mono-label text-gray-400 mb-2">Role Status</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter capitalize">{user.role}</p>
                    <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-gray-300">Active Member</p>
                  </div>
                  <div className="p-8 bg-[#163A1E] text-white">
                    <p className="mono-label text-white/40 mb-2">Ballot Status</p>
                    <p className="text-3xl font-black tracking-tighter">{user.hasVoted ? 'COMMITTED' : 'PENDING'}</p>
                    <div className="mt-4 flex items-center gap-2 text-coop-yellow">
                       {user.hasVoted ? <Shield size={12} /> : <Clock size={12} />}
                       <span className="text-[9px] font-black uppercase tracking-widest">{user.hasVoted ? 'Audited' : 'Awaiting Input'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mono-label text-gray-400 mb-8 flex items-center gap-3">
                  <History size={16} className="text-coop-green" /> Voting Interaction History
                </h4>
                <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="py-20 flex flex-col items-center justify-center opacity-50">
                        <History size={48} className="animate-spin" />
                        <p className="mono-label mt-4">Loading voting history...</p>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center opacity-20">
                        <History size={48} />
                        <p className="mono-label mt-4">No voting history available</p>
                      </div>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-gray-100 group hover:border-coop-green transition-all">
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 flex items-center justify-center border ${h.status === 'Voted' ? 'border-coop-green/20 text-coop-green' : 'border-gray-100 text-gray-300'}`}>
                                    {h.status === 'Voted' ? <Award size={20} /> : <Clock size={20} />}
                                </div>
                                <div>
                                    <p className="text-lg font-black text-gray-900 uppercase tracking-tight">{h.election}</p>
                                    <p className="mono-label text-gray-300 text-[9px]">{h.date}</p>
                                </div>
                            </div>
                            <div className="mt-4 sm:mt-0 flex items-center gap-8">
                                <span className={`text-[9px] font-black px-4 py-1.5 uppercase tracking-widest ${h.status === 'Voted' ? 'text-coop-green bg-coop-green/5' : 'text-gray-400 bg-gray-50'}`}>
                                    {h.status}
                                </span>
                                {h.status === 'Voted' && (
                                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Hash size={12} className="text-gray-200" />
                                       <span className="mono-data text-[9px] text-gray-300">SV-TX-00{h.id}</span>
                                   </div>
                                )}
                            </div>
                        </div>
                      ))
                    )}
                </div>
              </div>

              {receiptHash && user.hasVoted && (
                <div className="p-8 bg-coop-green/5 border-l-4 border-coop-green flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                      <Shield size={32} className="text-coop-green opacity-20" />
                      <div>
                         <p className="mono-label text-coop-green mb-1">Active Cryptographic Receipt</p>
                         <p className="mono-data text-sm font-black text-coop-darkGreen break-all uppercase tracking-widest">{receiptHash}</p>
                      </div>
                   </div>
                   <button className="flex items-center gap-2 text-[10px] font-black uppercase text-coop-green hover:underline">
                      Download Proof <ChevronRight size={14} />
                   </button>
                </div>
              )}
            </div>
          ) : activeTab === 'PASSWORD' ? (
            <PasswordChangeForm 
              onSuccess={() => {
                // Optionally navigate back to overview after successful password change
                setTimeout(() => setActiveTab('OVERVIEW'), 2000);
              }}
              onCancel={() => setActiveTab('OVERVIEW')}
            />
          ) : (
            <div className="space-y-16 animate-fadeIn">
              <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Support Terminal</h3>
                  <p className="mono-label text-gray-400 mt-2">Incident Reporting & Technical Assistance</p>
                </div>
                <MessageSquare size={32} className="text-[#4F75E2]" />
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Submit Ticket Form */}
                <div className="space-y-10">
                  <h4 className="mono-label text-gray-400 mb-8">New Inquiry Protocol</h4>
                  <form onSubmit={handleTicketSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inquiry Category</label>
                      <select 
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 text-sm font-bold outline-none focus:border-[#4F75E2] appearance-none"
                      >
                        <option>PIN Access Issue</option>
                        <option>Identity Verification</option>
                        <option>Technical Bug / Error</option>
                        <option>Membership Query</option>
                        <option>Other / General</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Directive Details</label>
                      <textarea 
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="Describe your issue or question..."
                        rows={5}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 text-sm font-medium outline-none focus:border-[#4F75E2] resize-none"
                        required
                      ></textarea>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#4F75E2] text-white py-5 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
                    >
                      Initialize Support Request <Send size={16} />
                    </button>

                    {showSuccess && (
                      <div className="p-4 bg-green-50 border border-green-100 flex items-center gap-3 animate-fadeIn">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Protocol Uploaded Successfully</span>
                      </div>
                    )}
                  </form>
                </div>

                {/* Ticket History Status */}
                <div>
                   <h4 className="mono-label text-gray-400 mb-8 flex items-center justify-between">
                      Active Inquiries
                      <span className="text-[9px] bg-gray-100 px-2 py-1 text-gray-400">{tickets.length} RECORDS</span>
                   </h4>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                      {tickets.map(tk => (
                        <div key={tk._id} className="p-6 bg-white border border-gray-100 flex flex-col gap-4">
                           <div className="flex justify-between items-start">
                              <div>
                                 <span className={`text-[8px] font-black px-2 py-0.5 uppercase tracking-widest border ${tk.status === 'OPEN' ? 'bg-[#4F75E2]/5 text-[#4F75E2] border-[#4F75E2]/10' : 'bg-coop-green/5 text-coop-green border-coop-green/10'}`}>
                                    {tk.status}
                                 </span>
                                 <p className="font-black text-gray-900 uppercase tracking-tight text-sm mt-3">{tk.subject}</p>
                              </div>
                              <span className="mono-label text-gray-200 text-[8px]">{new Date(tk.createdAt).toLocaleDateString()}</span>
                           </div>
                           <p className="text-xs text-gray-400 leading-relaxed font-medium italic line-clamp-2">"{tk.message}"</p>
                           <div className="flex items-center gap-2 mt-2 pt-4 border-t border-gray-50">
                              <Hash size={10} className="text-gray-200" />
                              <span className="mono-data text-[9px] text-gray-300 uppercase">{tk._id}</span>
                           </div>
                        </div>
                      ))}
                      {tickets.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-10">
                           <MessageSquare size={48} />
                           <p className="mono-label mt-4">Zero active incidents</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
