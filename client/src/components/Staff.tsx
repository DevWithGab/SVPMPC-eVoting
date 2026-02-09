import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, UserCheck, MessageSquare, Briefcase, LogOut, Terminal, Clock,
  LayoutDashboard, FileText, Search, X, BarChart, Users, Printer, Download
} from 'lucide-react';
import type { User, Position, Candidate, Announcement } from '../types.ts';
import Swal from 'sweetalert2';

type StaffTab = 'OPERATIONS' | 'VERIFICATION' | 'HELPDESK' | 'REPORTS';

interface VerificationRequest {
  _id: string;
  userId: string;
  userName: string;
  documentUrl: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  documentType?: string;
}

interface SupportTicket {
  _id: string;
  userId: string | { _id: string; fullName: string; email: string; username: string };
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  category?: string;
  priority?: string;
}

interface StaffProps {
  user: User;
  users: User[];
  candidates: Candidate[];
  positions: Position[];
  announcements: Announcement[];
  onLogout: () => void;
}

export const Staff: React.FC<StaffProps> = ({ 
  user, users, candidates, positions, announcements, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<StaffTab>('OPERATIONS');
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch verifications and support tickets on mount
  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [verificationsRes, ticketsRes, usersRes] = await Promise.all([
        fetch('/api/verification', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        fetch('/api/support', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      if (verificationsRes?.ok) {
        const verifications = await verificationsRes.json();
        const validVerifications = Array.isArray(verifications) ? verifications : [];
        setVerificationRequests(validVerifications);
      }

      if (ticketsRes?.ok) {
        const tickets = await ticketsRes.json();
        const validTickets = Array.isArray(tickets) ? tickets : [];
        setSupportTickets(validTickets);
      }

      if (usersRes?.ok) {
        const usersData = await usersRes.json();
        const validUsers = Array.isArray(usersData) ? usersData.filter(u => u && typeof u === 'object' && u._id) : [];
        setStaffUsers(validUsers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/verification/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: status === 'VERIFIED' ? 'Member Verified' : 'Application Rejected',
          timer: 2000
        });
        fetchData();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update verification status'
      });
    }
  };

  const handleResolveTicket = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'RESOLVED',
          resolution: 'Resolved by staff'
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Ticket Resolved',
          timer: 2000
        });
        fetchData();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to resolve ticket'
      });
    }
  };

  const turnoutCount = (staffUsers || []).filter(u => u && u.hasVoted).length;
  const turnoutPercent = (staffUsers && staffUsers.length > 0) ? (turnoutCount / staffUsers.length) * 100 : 0;

  const pendingVerifications = verificationRequests.filter(r => r.status === 'PENDING');
  const openTickets = supportTickets.filter(t => t.status === 'OPEN');

  const renderActiveTab = () => {
    switch(activeTab) {
      case 'OPERATIONS': return (
        <div className="space-y-12 animate-fadeIn">
          {/* Operations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                  <Activity size={18} className="text-[#4F75E2]" />
                  <span className="mono-label text-gray-300">RT-01</span>
              </div>
              <p className="mono-label text-gray-400 mb-2">Live Turnout</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{turnoutPercent.toFixed(1)}%</p>
              <div className="mt-4 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-[#4F75E2]" style={{ width: `${turnoutPercent}%` }}></div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                  <UserCheck size={18} className="text-orange-500" />
                  <span className="mono-label text-gray-300">PQ-02</span>
              </div>
              <p className="mono-label text-gray-400 mb-2">Pending ID Audit</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{pendingVerifications.length}</p>
            </div>

            <div className="bg-white border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                  <MessageSquare size={18} className="text-coop-green" />
                  <span className="mono-label text-gray-300">TK-03</span>
              </div>
              <p className="mono-label text-gray-400 mb-2">Support Tickets</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{openTickets.length}</p>
            </div>

            <div className="bg-white border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                  <Briefcase size={18} className="text-purple-500" />
                  <span className="mono-label text-gray-300">ND-04</span>
              </div>
              <p className="mono-label text-gray-400 mb-2">Registry Load</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">Normal</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 pb-12">
            {/* Quick Support Queue */}
            <div className="lg:col-span-7 bg-white border border-gray-100 p-10">
              <h3 className="mono-label text-gray-400 mb-8">Priority Verification Queue</h3>
              <div className="space-y-4">
                {pendingVerifications.slice(0, 3).map(req => (
                  <div key={req._id} className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border border-gray-100 flex items-center justify-center font-black">
                        {req.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{req.userName}</p>
                        <p className="mono-label text-gray-400 text-[9px] mt-1">ID: {req.userId}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleVerify(req._id, 'REJECTED')} className="p-3 text-red-500 hover:bg-white transition-all"><X size={16}/></button>
                      <button onClick={() => handleVerify(req._id, 'VERIFIED')} className="px-6 py-2 bg-coop-darkGreen text-white text-[10px] font-black uppercase tracking-widest shadow-md">Verify</button>
                    </div>
                  </div>
                ))}
                {pendingVerifications.length === 0 && (
                   <p className="text-center py-10 text-gray-300 mono-label">Queue Cleared</p>
                )}
              </div>
            </div>

            {/* Helpdesk Quick Actions */}
            <div className="lg:col-span-5 bg-[#1E293B] text-white p-10">
              <h3 className="mono-label text-gray-400 mb-10">Active Support Directives</h3>
              <div className="space-y-6">
                {openTickets.slice(0, 3).map(tk => (
                  <div key={tk._id} className="p-4 border-l-4 border-[#4F75E2] bg-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-xs uppercase tracking-widest">{tk.subject}</p>
                      <span className="mono-label text-gray-500 text-[8px]">{new Date(tk.createdAt).toLocaleTimeString().split(' ')[0]}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 italic mb-4">"{tk.message}"</p>
                    <button onClick={() => handleResolveTicket(tk._id)} className="text-[9px] font-black text-[#4F75E2] uppercase tracking-widest hover:text-white transition-colors">Resolve Ticket &rarr;</button>
                  </div>
                ))}
                {openTickets.length === 0 && (
                   <p className="text-center py-10 text-white/20 mono-label">No active tickets</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
      case 'VERIFICATION': return (
        <div className="bg-white border border-gray-100 animate-fadeIn">
            <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#4F75E2] text-white flex items-center justify-center font-black">V</div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Identity Verification Center</h3>
                        <p className="mono-label text-gray-400 mt-1">Pending Member Onboarding Registry</p>
                    </div>
                </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {verificationRequests.map(req => (
                  <div key={req._id} className={`bg-white border p-8 flex flex-col group transition-all ${req.status === 'VERIFIED' ? 'border-coop-green/30 opacity-50' : 'border-gray-100 hover:border-[#4F75E2] shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-8">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 ${req.status === 'VERIFIED' ? 'bg-coop-green/10 text-coop-green' : 'bg-orange-50 text-orange-500'}`}>
                          {req.status}
                        </span>
                        <span className="mono-label text-gray-300 text-[8px]">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="aspect-video bg-gray-50 mb-8 overflow-hidden relative border border-gray-100">
                        <img src={req.documentUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Doc" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                           <button className="bg-white text-gray-900 p-3"><Search size={16}/></button>
                        </div>
                      </div>

                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">{req.userName}</h4>
                      <p className="mono-label text-gray-400 text-[9px] mb-8">Ref: {req._id.substring(0, 8).toUpperCase()}</p>

                      {req.status === 'PENDING' && (
                        <div className="mt-auto grid grid-cols-2 gap-4">
                            <button onClick={() => handleVerify(req._id, 'REJECTED')} className="py-3 border border-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">Reject</button>
                            <button onClick={() => handleVerify(req._id, 'VERIFIED')} className="py-3 bg-coop-darkGreen text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Verify</button>
                        </div>
                      )}
                  </div>
                ))}
            </div>
        </div>
      );
      case 'HELPDESK': return (
        <div className="bg-white border border-gray-100 animate-fadeIn min-h-[600px] flex flex-col">
            <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <MessageSquare size={24} className="text-[#4F75E2]" />
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Support Operations Hub</h3>
                </div>
            </div>
            
            <div className="flex-grow flex flex-col">
                {openTickets.map(tk => (
                  <div key={tk._id} className="p-10 border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <div className="max-w-4xl flex justify-between gap-10">
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <span className="bg-[#4F75E2]/10 text-[#4F75E2] px-3 py-1 text-[9px] font-black uppercase tracking-widest">OPEN TICKET</span>
                          <span className="mono-label text-gray-300">USER: {typeof tk.userId === 'string' ? tk.userId : tk.userId?.username || 'Unknown'}</span>
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">{tk.subject}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium mb-8">"{tk.message}"</p>
                        
                        <div className="flex items-center gap-6">
                            <button onClick={() => handleResolveTicket(tk._id)} className="px-8 py-3 bg-coop-darkGreen text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Close & Resolve</button>
                            <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#4F75E2]">Transfer To Level 01</button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="mono-label text-gray-300 mb-1">Incoming</p>
                         <p className="text-xs font-bold text-gray-900">{new Date(tk.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {openTickets.length === 0 && (
                   <div className="flex-grow flex flex-col items-center justify-center py-40 opacity-20">
                      <MessageSquare size={48} />
                      <p className="mono-label mt-4">All inquiries addressed</p>
                   </div>
                )}
            </div>
        </div>
      );
      case 'REPORTS': return (
        <div className="max-w-4xl space-y-12 animate-fadeIn">
            <div className="bg-white border border-gray-100 p-12">
                <div className="mb-12 border-b border-gray-50 pb-8 flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Operational Ledger</h3>
                    <p className="mono-label text-gray-400 mt-2">Export data for Board Review</p>
                  </div>
                  <BarChart size={32} className="text-gray-100" />
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                   {[
                     { title: 'Member Attendance', desc: 'Full list of members who have verified session access.', icon: Users },
                     { title: 'Ballot Quorum Tracking', desc: 'Real-time turnout percentages per Batangas node.', icon: Activity },
                     { title: 'Registry Summary', desc: 'Consolidated onboarding and verification stats.', icon: UserCheck },
                     { title: 'Support Log', desc: 'Full history of resolved and escalated tickets.', icon: MessageSquare }
                   ].map(rep => (
                     <div key={rep.title} className="p-8 bg-gray-50 border border-gray-100 hover:border-[#4F75E2] transition-colors group cursor-pointer">
                        <div className="flex justify-between items-start mb-6">
                          <rep.icon size={20} className="text-gray-300 group-hover:text-[#4F75E2] transition-colors" />
                          <button className="text-gray-300 hover:text-gray-900 transition-colors"><Printer size={16}/></button>
                        </div>
                        <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-2">{rep.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium mb-8">{rep.desc}</p>
                        <button className="flex items-center gap-3 text-[9px] font-black text-[#4F75E2] uppercase tracking-[0.3em]">
                          Export as PDF <Download size={14} />
                        </button>
                     </div>
                   ))}
                </div>
            </div>
        </div>
      );
      default: return <div>Under construction</div>;
    }
  };

  const staffNav = [
    { id: 'OPERATIONS', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'VERIFICATION', label: 'Verify', icon: UserCheck },
    { id: 'HELPDESK', label: 'Support', icon: MessageSquare },
    { id: 'REPORTS', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-[#F9FAFB] flex overflow-hidden z-[110]">
      {/* Sidebar for Staff */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 pt-12 shadow-sm">
        <div className="px-10 pb-10 mb-8 border-b border-gray-50">
          <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-[#4F75E2] text-white flex items-center justify-center font-black text-xl">SV</div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-gray-900 uppercase">Ops Hub</h1>
                <p className="mono-label text-gray-300 tracking-[0.4em] mt-1">Institutional Node</p>
              </div>
          </div>
          <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase text-[#4F75E2] bg-[#4F75E2]/5 px-3 py-1.5 border border-[#4F75E2]/10">
            <div className="w-1.5 h-1.5 bg-[#4F75E2] rounded-full animate-pulse"></div>
            <span>Staff: Level 02</span>
          </div>
        </div>
        <nav className="flex-grow px-6 space-y-1">
          {staffNav.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as StaffTab)} 
              className={`w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#4F75E2]/5 text-[#4F75E2] border-r-4 border-[#4F75E2]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'}`}
            >
              <item.icon size={16} /> 
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-8 border-t border-gray-50 bg-gray-50/50">
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all font-black text-[9px] uppercase tracking-widest"
            >
                <LogOut size={14} /> Terminate
            </button>
        </div>
      </aside>

      <div className="flex-grow flex flex-col h-full bg-[#fcfcfd]">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 shadow-sm shrink-0">
            <div className="flex items-center gap-4 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <Terminal size={14} className="text-[#4F75E2]"/>
                <span>Operational v4.2</span>
                <span className="text-gray-200 px-2">/</span>
                <span className="text-gray-900">{activeTab}</span>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-300">
                    <Clock size={14} />
                    <span className="mono-label">{new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        </header>
        
        <main className="flex-grow p-10 overflow-y-auto custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto min-h-full">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
};
