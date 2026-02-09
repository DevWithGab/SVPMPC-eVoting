import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { VotingType } from '../types.ts';
import type { User, Candidate, Position, Announcement, Rule, VotingMode, VotingStatus } from '../types.ts';
import { userAPI, electionAPI, positionAPI, candidateAPI, announcementAPI, ruleAPI, voteAPI, reportAPI, activityAPI } from '../services/api';
import Swal from 'sweetalert2';
import { 
  Settings, Users, Download, 
  LayoutDashboard, UserCheck, ShieldCheck, Activity, Search, 
  CheckCircle, X, Trash2, 
  Database, PauseCircle, PlayCircle, Lock, PlusCircle, ShieldAlert,
  Layers,
  FileText, Camera, LayoutList, Upload,
  Terminal, ArrowUpRight, LogOut, Megaphone, BookOpen,
  UserPlus, Menu, Eye, EyeOff, AlertTriangle, RefreshCw, Bell, Clock,
  Briefcase, Edit3, ListOrdered, Globe, FilePlus, ChevronRight, Calendar
} from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const TIMELINE_DATA = [
  { time: '08:00', votes: 10 }, 
  { time: '10:00', votes: 45 }, 
  { time: '12:00', votes: 120 }, 
  { time: '14:00', votes: 85 }, 
  { time: '16:00', votes: 150 }, 
  { time: '18:00', votes: 110 }, 
  { time: '20:00', votes: 60 }
];

interface AdminProps {
  user: User;
  onLogout: () => void;
}

type AdminTab = 'OVERVIEW' | 'VOTERS' | 'ELECTION' | 'ANNOUNCEMENTS' | 'RULES' | 'SETTINGS' | 'LOGS';

export const Admin: React.FC<AdminProps> = ({ user, onLogout }) => {
  // Refs for scroll position preservation
  const navRef = React.useRef<HTMLDivElement>(null);
  const scrollPosRef = React.useRef(0);
  const completedElectionsRef = React.useRef<Set<string>>(new Set()); // Track completed elections to avoid duplicate announcements
  const pausedElectionsRef = React.useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('pausedElections') || '[]'))); // Track manually paused elections with localStorage persistence
  const fileInputRef = React.useRef<HTMLInputElement>(null); // For candidate photo upload

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [elections, setElections] = useState<Array<any>>([]);
  const [votes, setVotes] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [branchData, setBranchData] = useState<Array<{ name: string; participation: number; voters: number }>>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modal state
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isAddElectionOpen, setIsAddElectionOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [candidateModal, setCandidateModal] = useState<{ isOpen: boolean; positionId: string | null }>({ isOpen: false, positionId: null });
  
  // Election state
  const [newElection, setNewElection] = useState<Partial<any>>({ title: '', description: '', startDate: '', endDate: '' });
  const [newPosition, setNewPosition] = useState<Partial<Position>>({ title: '', description: '', maxVotes: 1, type: 'OFFICER', order: 0 });
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({ name: '', description: '', imageUrl: '' });
  const [candidateImage, setCandidateImage] = useState<string>('');

  // Form state
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({ title: '', content: '', priority: 'LOW', targetAudience: ['all'], expiresAt: '' });
  const [newRule, setNewRule] = useState<Partial<Rule>>({ title: '', content: '', order: 0 });
  
  // Settings state
  const [votingMode, setVotingMode] = useState<VotingMode>('ONE_MEMBER_ONE_VOTE');
  const [votingStatus, setVotingStatus] = useState<VotingStatus>('PAUSED');
  const [electionEndDate, setElectionEndDate] = useState('');
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false);
  const [isSavingEndDate, setIsSavingEndDate] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; user: string; role: string; action: string }>>([]);

  const canManageSystem = user.role === 'admin';

  const handleNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollPosRef.current = e.currentTarget.scrollTop;
  };

  // Preserve scroll position after every render
  React.useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = scrollPosRef.current;
    }
  });

  const handleNavItemClick = (itemId: AdminTab) => {
    // Save current scroll position before state update
    if (navRef.current) {
      scrollPosRef.current = navRef.current.scrollTop;
    }
    
    // Start fade out animation
    setIsTransitioning(true);
    
    // Change tab after brief delay for smooth animation
    setTimeout(() => {
      setActiveTab(itemId);
      setSearchTerm('');
      setIsMobileMenuOpen(false);
      // End transition after new content loads
      setIsTransitioning(false);
    }, 150);
  };

  // Define fetchAllData with useCallback to maintain stable reference
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, electionsData, positionsData, candidatesData, rulesData, announcementsData, votesData, activitiesData]: [
        Array<{ id: string; fullName?: string; username: string; email: string; role: string; isActive?: boolean; address?: string }>,
        Array<{ id: string; title: string; description?: string; maxVotesPerMember?: number; status: string; endDate?: string }>,
        Array<{ id: string; title: string; description?: string; electionId: string; order?: number }>,
        Array<{ id: string; name: string; description?: string; electionId: string; positionId: string; photoUrl?: string }>,
        Array<{ id: string; title: string; content: string; order: number }>,
        Array<{ id: string; title: string; content: string; priority: string; date: string; author: string }>,
        Array<{ userId: string; candidateId: string }>,
        Array<any>
      ] = await Promise.all([
        userAPI.getUsers().catch((err) => { console.error('Error fetching users:', err); return []; }),
        electionAPI.getElections().catch((err) => { console.error('Error fetching elections:', err); return []; }),
        positionAPI.getPositions().catch((err) => { console.error('Error fetching positions:', err); return []; }),
        candidateAPI.getCandidates().catch((err) => { console.error('Error fetching candidates:', err); return []; }),
        ruleAPI.getRules().catch((err) => { console.error('Error fetching rules:', err); return []; }),
        announcementAPI.getAnnouncements().catch((err) => { console.error('Error fetching announcements:', err); return []; }),
        voteAPI.getAllVotes().catch((err) => { console.error('Error fetching votes:', err); return []; }),
        activityAPI.getActivities().catch((err) => { console.error('Error fetching activities:', err); return []; })
      ]);

      // Map backend data to frontend types
      // Get the active election to check votes for current election only
      const activeElection = electionsData.find((e: any) => e.status === 'active') || electionsData.find((e: any) => e.status === 'completed');
      const activeElectionId = activeElection?._id || activeElection?.id;

      const mappedUsers: User[] = usersData.map((u: any) => {
        const userId = u._id || u.id;
        // Only count votes for the current/active election
        // If no active election exists, no one has voted in current election
        const hasVoted = activeElectionId ? votesData.some((v: any) => {
          const voteUserId = typeof v.userId === 'string' ? v.userId : (v.userId?._id || v.userId?.id);
          const voteElectionId = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
          return voteUserId === userId && voteElectionId === activeElectionId;
        }) : false;
        
        return {
          id: userId,
          name: u.fullName || u.username,
          email: u.email,
          role: u.role as any,
          hasVoted,
          username: u.username,
          fullName: u.fullName,
          isActive: u.isActive,
          address: u.address
        };
      });

      const mappedPositions: Position[] = positionsData
        .sort((a: any, b: any) => {
          return (a.order || 0) - (b.order || 0);
        })
        .map((p: any) => ({
          id: p._id || p.id,
          electionId: typeof p.electionId === 'string' ? p.electionId : (p.electionId?._id || p.electionId?.id),
          title: p.title,
          description: p.description || '',
          maxVotes: 1,
          order: p.order || 0,
          type: 'OFFICER' as const,
          status: 'active'
        }));

      // Calculate vote counts for candidates
      const voteCounts: Record<string, number> = {};
      votesData.forEach((vote) => {
        voteCounts[vote.candidateId] = (voteCounts[vote.candidateId] || 0) + 1;
      });

      const mappedCandidates: Candidate[] = candidatesData.map((c: any) => ({
        id: c._id || c.id,
        name: c.name,
        description: c.description || '',
        positionId: typeof c.positionId === 'string' ? c.positionId : (c.positionId?._id || c.positionId?.id),
        votes: voteCounts[c._id || c.id] || 0,
        imageUrl: c.photoUrl,
        photoUrl: c.photoUrl
      }));

      setUsers(mappedUsers);
      setPositions(mappedPositions);
      setCandidates(mappedCandidates);
      setVotes(votesData);
      // Filter out old position elections (those with parentElectionId) and deduplicate by ID
      const mainElections = electionsData.filter((e: any) => !e.parentElectionId);
      const uniqueElections = Array.from(
        new Map(mainElections.map(e => [(e._id || e.id), e])).values()
      ).sort((a: any, b: any) => {
        // Sort by creation date (oldest first, newest last)
        const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
        return dateA - dateB;
      });
      setElections(uniqueElections);
      setRules(rulesData.map((r: any) => ({
        id: r._id || r.id,
        title: r.title,
        content: r.content,
        order: r.order
      })));
      // Cast announcements priority to correct type
      setAnnouncements(announcementsData.map((ann: any) => ({
        id: ann._id || ann.id,
        title: ann.title,
        content: ann.content,
        priority: ann.priority as 'LOW' | 'MEDIUM' | 'HIGH',
        date: ann.date,
        author: ann.author
      })));
      
      // Set voting status based on active elections (reuse activeElection from above)
      setVotingStatus(activeElection ? 'OPEN' : 'PAUSED');
      
      // Calculate branch turnout from voter data
      const branchStats: Record<string, { voters: number; participated: number }> = {};
      mappedUsers.forEach((u) => {
        const branch = u.address || 'Not Provided';
        if (!branchStats[branch]) {
          branchStats[branch] = { voters: 0, participated: 0 };
        }
        branchStats[branch].voters++;
        if (u.hasVoted) {
          branchStats[branch].participated++;
        }
      });
      
      const calculatedBranchData = Object.entries(branchStats)
        .map(([name, stats]) => ({
          name,
          voters: stats.voters,
          participation: stats.voters > 0 ? Math.round((stats.participated / stats.voters) * 100) : 0
        }))
        .sort((a, b) => b.participation - a.participation);
      
      setBranchData(calculatedBranchData);
      
      if (activeElection) {
        // Format date to datetime-local format (YYYY-MM-DDTHH:mm)
        if (activeElection.endDate) {
          // Parse UTC ISO string and convert to local time
          const utcDate = new Date(activeElection.endDate);
          // To convert UTC to local: Local = UTC - tzOffset (which is negative, so effectively add)
          const tzOffset = utcDate.getTimezoneOffset() * 60000;
          const localDate = new Date(utcDate.getTime() - tzOffset);
          
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          const hours = String(localDate.getHours()).padStart(2, '0');
          const minutes = String(localDate.getMinutes()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
          setElectionEndDate(dateStr);
          setOriginalEndDate(dateStr);
        }
        setHasEndDateChanged(false);
      }
      
      // Initialize resultsPublic state from first election (or active election)
      // NOTE: Now reading directly from elections data in the toggle render, no need to set state

      // Map activities to audit logs format
      const mappedLogs = activitiesData.map((activity: any) => ({
        id: activity._id || activity.id,
        timestamp: new Date(activity.createdAt).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
        user: activity.userId?.fullName || activity.userId?.username || 'Unknown User',
        role: activity.userId?.role || 'member',
        action: activity.description || activity.action
      }));
      
      setLogs(mappedLogs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-complete election when timer reaches zero
  const activateElectionAutomatically = useCallback(async (electionId: string) => {
    // Only activate if we haven't already activated this election
    if (completedElectionsRef.current.has(electionId)) {
      return;
    }
    
    try {
      completedElectionsRef.current.add(electionId);
      await electionAPI.updateElection(electionId, { status: 'active' });
      
      // Create automatic announcement when election becomes active
      const election = elections.find(e => (e._id || e.id) === electionId);
      if (election) {
        await announcementAPI.createAnnouncement({
          title: `URGENT: ${election.title} is now ACTIVE`,
          content: `The Saint Vincent Registry Authority has officially initialized the ${election.title}. All authorized members are now cleared to cast their ballots. ${election.endDate ? `The registry window is scheduled to close on ${new Date(election.endDate).toLocaleString()}.` : ''} Please ensure your identity profiles are verified before proceeding.`,
          priority: 'HIGH',
          author: user.name,
          targetAudience: ['hasNotVoted']
        });
      }
      
      await fetchAllData();
    } catch (error) {
      console.error('Failed to auto-activate election:', error);
      // Remove from completed set if it failed so it can retry
      completedElectionsRef.current.delete(electionId);
    }
  }, [fetchAllData, elections, user.name]);

  // Update countdown timer every second for any election with future start date
  useEffect(() => {
    const checkElectionStatus = () => {
      // Check if any election has reached its start date and auto-activate it
      const now = new Date().getTime();
      elections.forEach((election) => {
        const electionId = election._id || election.id;
        if (!election.startDate || election.status === 'active' || election.status === 'completed') return;
        // Skip if this election was manually paused (status = 'upcoming' but marked as paused)
        if (pausedElectionsRef.current.has(electionId)) return;
        
        const startTime = new Date(election.startDate).getTime();
        if (startTime <= now && !completedElectionsRef.current.has(electionId)) {
          // Election has reached its start date - auto-activate
          activateElectionAutomatically(electionId);
        }
      });
    };

    checkElectionStatus();
    const interval = setInterval(checkElectionStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [elections, activateElectionAutomatically]);

  // Auto-complete election when end date is reached
  useEffect(() => {
    const checkElectionCompletion = async () => {
      const now = new Date().getTime();
      for (const election of elections) {
        const electionId = election._id || election.id;
        if (!election.endDate || election.status === 'completed') continue;
        
        const endTime = new Date(election.endDate).getTime();
        if (endTime <= now && !completedElectionsRef.current.has(electionId)) {
          // Election has reached its end date - auto-complete
          console.log(`Auto-completing election ${electionId}`);
          try {
            await electionAPI.updateElection(electionId, { status: 'completed' });
            completedElectionsRef.current.add(electionId);
            setVotingStatus('PAUSED');
            await fetchAllData(); // Wait for data to refresh
          } catch (error) {
            console.error('Failed to auto-complete election:', error);
          }
        }
      }
    };

    checkElectionCompletion();
    const interval = setInterval(checkElectionCompletion, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [elections]);

  // Handler functions
  const handleAddCandidate = async (candidate: Candidate) => {
    try {
      const response = await candidateAPI.createCandidate({
        name: candidate.name,
        description: candidate.description,
        photoUrl: candidate.photoUrl,
        electionId: selectedElectionId || '',
        positionId: candidate.id
      });
    
      
      const createdCandidate = response.candidate;
      
      // If we have a candidate image, upload it using multer
      if (candidateImage && (createdCandidate?._id || createdCandidate?.id)) {
        try {
          // Convert data URL to blob
          const response2 = await fetch(candidateImage);
          const blob = await response2.blob();
          const file = new File([blob], 'candidate-photo.jpg', { type: 'image/jpeg' });
          
          const candidateIdToUse = createdCandidate._id || createdCandidate.id;
          // Upload photo using multer
          await candidateAPI.uploadCandidatePhoto(candidateIdToUse, file);
        } catch (photoError) {
          console.warn('Failed to upload candidate photo:', photoError);
          // Continue even if photo upload fails
        }
      }
      
      await fetchAllData();
      
      Swal.fire({
        title: 'Success!',
        text: 'Candidate created successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || JSON.stringify(error);
      Swal.fire({
        title: 'Error',
        text: 'Error creating candidate: ' + errorMsg,
        icon: 'error',
        confirmButtonColor: '#2D7A3E'
      });
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    Swal.fire({
      title: 'Delete Candidate?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await candidateAPI.deleteCandidate(id);
          await fetchAllData();
          Swal.fire(
            'Deleted!',
            'Candidate has been deleted.',
            'success'
          );
        } catch (error) {
          console.error('Failed to delete candidate:', error);
          Swal.fire('Error', 'Failed to delete candidate', 'error');
        }
      }
    });
  };

  const handleAddPosition = async (position: Position) => {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() + 60 * 1000); // 1 minute from now
      await electionAPI.createElection({
        title: position.title,
        description: position.description,
        startDate: startDate.toISOString(),
        endDate: electionEndDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxVotesPerMember: position.maxVotes
      });
      await fetchAllData();
      
      Swal.fire({
        title: 'Success!',
        text: 'Position/Category created successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error: any) {
      console.error('Failed to add position:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
      Swal.fire({
        title: 'Error',
        text: 'Error creating position: ' + errorMsg,
        icon: 'error',
        confirmButtonColor: '#2D7A3E'
      });
    }
  };

  const handleDeletePosition = async (id: string) => {
    Swal.fire({
      title: 'Delete Category?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await electionAPI.deleteElection(id);
          // Add a small delay to ensure backend cascade delete completes
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchAllData();
          Swal.fire(
            'Deleted!',
            'Category has been deleted.',
            'success'
          );
        } catch (error) {
          console.error('Failed to delete position:', error);
          Swal.fire('Error', 'Failed to delete position', 'error');
        }
      }
    });
  };

  const handleTogglePositionStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'upcoming' : 'active';
      await electionAPI.updateElection(id, { status: newStatus });
      await fetchAllData();
      
      Swal.fire({
        title: 'Status Updated!',
        text: `Category status changed to ${newStatus}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error: any) {
      console.error('Failed to update position status:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error: ' + (error.response?.data?.message || error.message || 'Unknown error'),
        icon: 'error',
        confirmButtonColor: '#2D7A3E'
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    Swal.fire({
      title: 'Delete User?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await userAPI.deleteUser(id);
          await fetchAllData();
          Swal.fire(
            'Deleted!',
            'User has been deleted.',
            'success'
          );
        } catch (error) {
          console.error('Failed to delete user:', error);
          Swal.fire('Error', 'Failed to delete user', 'error');
        }
      }
    });
  };

  const handleGenerateReport = async (type: 'election' | 'voteCount') => {
    try {
      const activeElection = positions[0]?.id;
      if (!activeElection) {
        alert('No elections available to generate reports for');
        return;
      }

      console.log('Generating', type, 'report for election:', activeElection);
      
      if (type === 'election') {
        await reportAPI.generateElectionReport(activeElection);
      } else {
        await reportAPI.generateVoteCountReport(activeElection);
      }

      alert(`${type === 'election' ? 'Election Summary' : 'Vote Count'} report generated successfully!`);
      await fetchAllData(); // Refresh logs
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
      console.error('Failed to generate report:', error);
      alert('Error generating report: ' + errorMsg);
    }
  };

  const handleAddAnnouncement = async (ann: Announcement) => {
    try {
      // Convert datetime-local string to ISO string for the backend
      let expiresAt = null;
      if (ann.expiresAt && typeof ann.expiresAt === 'string' && ann.expiresAt.trim() !== '') {
        expiresAt = new Date(ann.expiresAt).toISOString();
      }

      await announcementAPI.createAnnouncement({
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        date: ann.date,
        author: ann.author,
        expiresAt: expiresAt,
        targetAudience: ann.targetAudience
      });
      await fetchAllData();
      
      Swal.fire({
        title: 'Success!',
        text: 'Announcement created successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error) {
      console.error('Failed to add announcement:', error);
      Swal.fire('Error', 'Failed to create announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    Swal.fire({
      title: 'Delete Announcement?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await announcementAPI.deleteAnnouncement(id);
          await fetchAllData();
          Swal.fire(
            'Deleted!',
            'Announcement has been deleted.',
            'success'
          );
        } catch (error) {
          console.error('Failed to delete announcement:', error);
          Swal.fire('Error', 'Failed to delete announcement', 'error');
        }
      }
    });
  };

  const handleAddRule = async (rule: Rule) => {
    try {
      await ruleAPI.createRule({
        title: rule.title,
        content: rule.content,
        order: rule.order
      });
      await fetchAllData();
      
      Swal.fire({
        title: 'Success!',
        text: 'Rule created successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error) {
      console.error('Failed to add rule:', error);
      Swal.fire('Error', 'Failed to create rule', 'error');
    }
  };

  const handleDeleteRule = async (id: string) => {
    Swal.fire({
      title: 'Delete Rule?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await ruleAPI.deleteRule(id);
          await fetchAllData();
          Swal.fire(
            'Deleted!',
            'Rule has been deleted.',
            'success'
          );
        } catch (error) {
          console.error('Failed to delete rule:', error);
          Swal.fire('Error', 'Failed to delete rule', 'error');
        }
      }
    });
  };

  const handleToggleResultsVisibility = async (newValue: boolean) => {
    try {
      // Get the first/active election to update
      if (!elections || elections.length === 0) {
        Swal.fire('Error', 'No election found', 'error');
        return;
      }

      const electionId = elections[0]._id || elections[0].id;
      
      // Update UI immediately for instant feedback
      const updatedElections = elections.map((el, idx) => 
        idx === 0 ? { ...el, resultsPublic: newValue } : el
      );
      setElections(updatedElections);
      
      const updateResponse = await electionAPI.updateElection(electionId, { resultsPublic: newValue });
      
      // Refetch elections to get updated data and sync with server
      const electionsResponse = await electionAPI.getElections();
      
      if (electionsResponse && electionsResponse.length > 0) {
        setElections(electionsResponse);
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: newValue ? 'Results are now publicly visible' : 'Results are now hidden from public',
        confirmButtonColor: '#2D7A3E',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Failed to toggle results visibility:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update results visibility', 'error');
    }
  };

  const handlePauseElection = async () => {
    try {
      // Find election that is either active or upcoming (paused)
      const currentElection = elections.find((e: any) => e.status === 'active' || e.status === 'upcoming');
      
      if (!currentElection) {
        Swal.fire({
          icon: 'warning',
          title: 'No Election',
          text: 'There is no active or paused election',
          confirmButtonColor: '#2D7A3E'
        });
        return;
      }

      const electionId = currentElection.id || currentElection._id;
      const isCurrentlyActive = currentElection.status === 'active';
      const newStatus = isCurrentlyActive ? 'upcoming' : 'active';
      
      console.log(`Toggling election ${electionId} from ${currentElection.status} to ${newStatus}`);
      
      // Mark as paused if pausing, remove if resuming
      if (isCurrentlyActive) {
        pausedElectionsRef.current.add(electionId);
      } else {
        pausedElectionsRef.current.delete(electionId);
      }
      
      // Persist paused elections to localStorage
      localStorage.setItem('pausedElections', JSON.stringify(Array.from(pausedElectionsRef.current)));
      
      await electionAPI.updateElection(electionId, { status: newStatus });
      setVotingStatus(isCurrentlyActive ? 'PAUSED' : 'OPEN');
      
      // Fetch fresh data
      await fetchAllData();
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: isCurrentlyActive ? 'Election paused. Members cannot vote.' : 'Election resumed. Members can vote.',
        confirmButtonColor: '#2D7A3E',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Failed to toggle voting status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to toggle voting status',
        confirmButtonColor: '#2D7A3E'
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBgImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetElectionCycle = async (title: string, newEndDate: string, bgImage: string | null, wipeEntities: boolean) => {
    try {
      if (!title || !newEndDate) {
        Swal.fire('Error', 'Please provide an election title and termination date', 'error');
        return;
      }

      // Find any election to pass (not needed for deep wipe, but API expects it)
      const targetElection = elections.find((e: any) => e.status !== 'cancelled') || elections[0];
      
      // For deep wipe, we don't need an election - just wipe everything
      if (!targetElection && !wipeEntities) {
        Swal.fire('Error', 'No election found to reset', 'error');
        return;
      }

      const electionId = targetElection?._id || targetElection?.id || 'null';
      
      await electionAPI.resetCycle(electionId, newEndDate, wipeEntities, wipeEntities ? undefined : title);
      
      // 7. Auto-Announcement (New Requirement)
      const announcementData = {
        title: `URGENT: ${title} is now ACTIVE`,
        content: `The Saint Vincent Registry Authority has officially initialized the ${title}. All authorized members are now cleared to cast their ballots. The registry window is scheduled to close on ${new Date(newEndDate).toLocaleString()}. Please ensure your identity profiles are verified before proceeding.`,
        priority: 'HIGH' as const,
        author: user.name,
        targetAudience: ['hasNotVoted'] as ('all' | 'hasNotVoted' | 'hasVoted')[]
      };
      
      await announcementAPI.createAnnouncement(announcementData);
      
      Swal.fire({
        title: 'Election Cycle Created',
        html: `<div class="text-left">
          <p class="mb-2"><strong>Actions Completed:</strong></p>
          <ul class="list-disc list-inside text-sm space-y-1">
            ${!wipeEntities ? `<li>Election created: <strong>${title}</strong></li>` : ''}
            <li>All votes cleared</li>
            ${wipeEntities ? '<li>All categories/positions removed</li>' : '<li>Candidate vote counts reset</li>'}
            ${wipeEntities ? '<li>All candidates removed</li>' : ''}
            <li>All voter participation flags reset</li>
            <li>End date: ${new Date(newEndDate).toLocaleDateString()}</li>
            <li>Announcement broadcasted to all members</li>
            ${bgImage ? '<li>Background image applied</li>' : ''}
          </ul>
        </div>`,
        icon: 'success',
        confirmButtonColor: '#4F75E2',
      });
      
      // Refresh all data with a delay to ensure backend cascade delete completes
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchAllData();
    } catch (error: any) {
      console.error('Failed to create election cycle:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to create election cycle', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm)
  );

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setNewCandidate({...newCandidate, imageUrl: imageData});
        setCandidateImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // ELECTION Tab Handlers
  const submitNewElection = async () => {
    try {
      if (!newElection.title || !newElection.startDate || !newElection.endDate) {
        Swal.fire('Error', 'Please fill in all required fields', 'error');
        return;
      }

      await electionAPI.createElection({
        title: newElection.title,
        description: newElection.description,
        startDate: newElection.startDate,
        endDate: newElection.endDate,
      });

      await fetchAllData();
      setIsAddElectionOpen(false);
      setNewElection({ title: '', description: '', startDate: '', endDate: '' });
      
      Swal.fire('Success!', 'Election created successfully', 'success');
    } catch (error: any) {
      console.error('Failed to create election:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to create election', 'error');
    }
  };

  const submitNewPosition = async () => {
    try {
      if (!newPosition.title || !selectedElectionId) {
        Swal.fire('Error', 'Please fill in all required fields and select an election', 'error');
        return;
      }

      setIsCreatingPosition(true);
      console.log('Creating position:', { newPosition, selectedElectionId });

      // Create position linked to the selected election
      const response = await positionAPI.createPosition({
        title: newPosition.title,
        description: newPosition.description,
        electionId: selectedElectionId,
        order: newPosition.order || 0,
        type: newPosition.type,
      });

      console.log('Position created:', response);

      if (response.position && (response.position._id || response.position.id)) {
        await fetchAllData();
        
        Swal.fire({
          title: 'Success!',
          text: `Position "${newPosition.title}" created successfully`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        
        setIsAddPositionOpen(false);
        setNewPosition({ title: '', description: '', maxVotes: 1, type: 'OFFICER', order: 0 });
      }
    } catch (error: any) {
      console.error('Failed to create position:', error);
      Swal.fire(
        'Error',
        error?.response?.data?.message || error.message || 'Failed to create position',
        'error'
      );
    } finally {
      setIsCreatingPosition(false);
    }
  };

  const submitNewCandidate = async () => {
    try {
      if (!newCandidate.name || !candidateModal.positionId) {
        Swal.fire('Error', 'Please fill in all required fields', 'error');
        return;
      }

      await candidateAPI.createCandidate({
        name: newCandidate.name,
        description: newCandidate.description,
        photoUrl: newCandidate.imageUrl,
        electionId: selectedElectionId || '',
        positionId: candidateModal.positionId
      });

      await fetchAllData();
      setCandidateModal({ isOpen: false, positionId: null });
      setNewCandidate({ name: '', description: '', imageUrl: '' });
      
      Swal.fire('Success!', 'Candidate added successfully', 'success');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to add candidate';
      console.error('Failed to add candidate:', error.response?.data || error.message);
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const onDeleteElection = async (electionId: string) => {
    Swal.fire({
      title: 'Delete Election?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await electionAPI.deleteElection(electionId);
          await fetchAllData();
          setSelectedElectionId(null);
          Swal.fire('Deleted!', 'Election has been deleted.', 'success');
        } catch (error) {
          console.error('Failed to delete election:', error);
          Swal.fire('Error', 'Failed to delete election', 'error');
        }
      }
    });
  };

  const onUpdateElection = async (updatedElection: any) => {
    try {
      const electionId = updatedElection.id || updatedElection._id;
      await electionAPI.updateElection(electionId, {
        status: updatedElection.status
      });
      await fetchAllData();
      Swal.fire('Success!', 'Election updated', 'success');
    } catch (error: any) {
      console.error('Failed to update election:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to update election', 'error');
    }
  };

  const onDeletePosition = async (positionId: string) => {
    Swal.fire({
      title: 'Delete Position?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Delete position via API
          await positionAPI.deletePosition(positionId);
          
          Swal.fire({
            title: 'Deleted!',
            text: 'Position has been deleted successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          
          await fetchAllData();
        } catch (error: any) {
          console.error('Failed to delete position:', error);
          Swal.fire('Error', error?.response?.data?.message || 'Failed to delete position', 'error');
        }
      }
    });
  };

  const onDeleteCandidate = async (candidateId: string) => {
    try {
      await candidateAPI.deleteCandidate(candidateId);
      await fetchAllData();
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      Swal.fire('Error', 'Failed to delete candidate', 'error');
    }
  };

  // Get current election positions
  const currentPositions = selectedElectionId 
    ? positions.filter(p => p.electionId === selectedElectionId)
    : [];

  const selectedElection = elections.find(e => e._id === selectedElectionId || e.id === selectedElectionId);

  const renderActiveTab = () => {
    switch(activeTab) {
      case 'OVERVIEW': return (
        <div className="space-y-12 animate-fadeIn">
            <div className="bg-white border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 flex items-center justify-center ${votingStatus === 'OPEN' ? 'bg-coop-green text-white' : 'bg-red-500 text-white'}`}>
                        {votingStatus === 'OPEN' ? <Activity size={24} /> : <Lock size={24} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                            System Registry Status: {votingStatus === 'OPEN' ? 'Operational' : 'Secured'}
                        </h2>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-widest">Node: BAT-001</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-[9px] font-black text-coop-green uppercase tracking-widest">Uplink Stable</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    {(() => {
                        // Show button for active or paused (upcoming) elections
                        const currentElection = elections.find((e: any) => e.status === 'active' || e.status === 'upcoming');
                        const isActive = currentElection?.status === 'active';
                        return currentElection ? (
                            <button
                                onClick={handlePauseElection}
                                className={`px-6 py-3 font-semibold text-sm transition-all ${
                                    isActive
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-coop-green hover:bg-coop-green/80 text-white'
                                }`}
                            >
                                {isActive ? 'Pause Election' : 'Resume Election'}
                            </button>
                        ) : null;
                    })()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(() => {
                  const activeElection = elections.find((e: any) => e.status === 'active');
                  const activeCandidatesCount = activeElection 
                    ? candidates.filter(c => {
                        const candElectionId = typeof c.electionId === 'string' ? c.electionId : (c.electionId?._id || c.electionId?.id || c.positionId);
                        const activeElectionId = activeElection._id || activeElection.id;
                        return candElectionId === activeElectionId;
                      }).length 
                    : 0;
                  
                  // Count committed ballots only for active election
                  const committedBallots = activeElection 
                    ? (votes?.filter(v => {
                        const voteElectionId = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
                        const activeElectionId = activeElection._id || activeElection.id;
                        return voteElectionId === activeElectionId;
                      }).length || 0)
                    : 0;
                  
                  return [
                    { label: 'Authorized Voters', val: users.length, icon: Users },
                    { label: 'Committed Ballots', val: committedBallots, icon: CheckCircle },
                    { label: 'Active Election', val: activeElection ? 1 : 0, icon: Layers },
                    { label: 'Candidates Running', val: activeCandidatesCount, icon: UserCheck }
                  ];
                })().map((stat) => (
                  <div key={stat.label} className="bg-white border border-gray-100 p-8 hover:border-coop-green transition-colors">
                    <div className="flex justify-between items-start mb-6">
                        <stat.icon size={18} className="text-gray-400" />
                        <span className="text-[10px] font-mono text-gray-300">0.0{stat.val % 9}</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{stat.val.toLocaleString()}</p>
                  </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-8 pb-12">
                <div className="lg:col-span-8 bg-white border border-gray-100 p-10">
                    <div className="flex justify-between items-center mb-12">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Position Vote Distribution</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-coop-green rounded-full"></div>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Votes</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(() => {
                                const activeElection = elections.find((e: any) => e.status === 'active' || e.status === 'completed');
                                const chartData = positions
                                    .filter(p => activeElection && p.electionId === (activeElection.id || activeElection._id))
                                    .map(pos => {
                                        const positionCandidates = candidates.filter(c => c.positionId === pos.id);
                                        const totalVotes = positionCandidates.reduce((sum, c) => {
                                            console.log(`Candidate ${c.name}: ${c.votes} votes`);
                                            return sum + (c.votes || 0);
                                        }, 0);
                                        console.log(`Position ${pos.title}: ${totalVotes} total votes`);
                                        return {
                                            name: pos.title.substring(0, 12),
                                            votes: totalVotes
                                        };
                                    });
                                console.log('Chart data:', chartData);
                                return chartData;
                            })()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af', fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{borderRadius: '0px', border: '1px solid #e5e7eb', fontWeight: 900, fontSize: '10px'}} />
                                <Bar dataKey="votes" fill="#2D7A3E" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-12 pt-12 border-t border-gray-100">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Participation Status</h3>
                        {(() => {
                            const activeElection = elections.find((e: any) => e.status === 'active');
                            const votersInActiveElection = activeElection ? new Set(votes?.filter((v: any) => {
                              const voteElectionId = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
                              const activeElectionId = activeElection._id || activeElection.id;
                              return voteElectionId === activeElectionId;
                            }).map((v: any) => v.userId) || []).size : 0;
                            const nonVotersInActiveElection = activeElection ? users.length - votersInActiveElection : users.length;
                            return (
                            <>
                        <div className="flex items-center justify-center h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Voted', value: votersInActiveElection, fill: '#2D7A3E' },
                                            { name: 'Not Yet Voted', value: nonVotersInActiveElection, fill: '#e5e7eb' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        <Cell fill="#2D7A3E" />
                                        <Cell fill="#e5e7eb" />
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '0px', border: '1px solid #e5e7eb', fontWeight: 900, fontSize: '10px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex gap-8 justify-center mt-6">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Voted</p>
                                <p className="text-2xl font-black text-coop-green mt-2">{votersInActiveElection}</p>
                            </div>
                            <div className="w-px bg-gray-100"></div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Not Yet Voted</p>
                                <p className="text-2xl font-black text-gray-300 mt-2">{nonVotersInActiveElection}</p>
                            </div>
                        </div>
                        </>
                        );
                        })()}
                    </div>
                </div>
                <div className="lg:col-span-4 bg-white border border-gray-100 p-10 flex flex-col gap-10">
                    <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Branch Turnout Analysis</h3>
                        <div className="space-y-6">
                            {(() => {
                                const activeElection = elections.find((e: any) => e.status === 'active');
                                return Object.entries(
                                users.reduce((acc: Record<string, { total: number; voted: number }>, u: User) => {
                                    const branch = u.address?.split(',')[0] || 'Unknown';
                                    if (!acc[branch]) acc[branch] = { total: 0, voted: 0 };
                                    acc[branch].total += 1;
                                    // Only count votes for active election
                                    if (activeElection) {
                                        const userVotedInActiveElection = votes?.some((v: any) => {
                                            const voteElectionId = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
                                            const activeElectionId = activeElection._id || activeElection.id;
                                            return v.userId === u._id && voteElectionId === activeElectionId;
                                        });
                                        if (userVotedInActiveElection) acc[branch].voted += 1;
                                    }
                                    return acc;
                                }, {})
                            ).map(([branch, data]) => {
                                const percentage = data.total > 0 ? (data.voted / data.total) * 100 : 0;
                                return (
                                    <div key={branch}>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{branch}</p>
                                            <p className="text-[9px] font-black text-coop-green">{percentage.toFixed(0)}%</p>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-coop-green h-full transition-all" style={{width: `${percentage}%`}}></div>
                                        </div>
                                    </div>
                                );
                            });
                            })()}
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">System Integrity Logs</h3>
                        <div className="space-y-4">
                            {logs.slice(0, 3).map((log, i) => (
                                <div key={i} className="flex gap-3 group">
                                    <div className="text-[9px] font-mono text-gray-300 shrink-0">{log.timestamp.split(',')[1]}</div>
                                    <div className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-tight group-hover:text-coop-green transition-colors">
                                        {log.action}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
      case 'VOTERS': return (
        <div className="bg-white border border-gray-100 animate-fadeIn">
            <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-coop-darkGreen text-white flex items-center justify-center font-black">L</div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Member Ledger</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Authorized Profile Registry</p>
                    </div>
                </div>
                <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                        type="text" placeholder="Filter by ID or Name" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest outline-none focus:border-coop-green" 
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-10 py-5">Identity Profile</th>
                            <th className="px-10 py-5">System Status</th>
                            <th className="px-10 py-5">Clearance</th>
                            <th className="px-10 py-5 text-right">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-gray-100 text-gray-400 flex items-center justify-center font-black text-[10px]">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 uppercase tracking-tight leading-none text-sm">{u.name}</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-[9px] mt-1.5">ID: {u.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <div className={`inline-flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${u.hasVoted ? 'text-coop-green' : 'text-gray-300'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${u.hasVoted ? 'bg-coop-green shadow-[0_0_8px_#2D7A3E]' : 'bg-gray-200'}`}></div>
                                        {u.hasVoted ? 'Committed' : 'Awaiting'}
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1">
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    {canManageSystem && (
                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14}/>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
      case 'ELECTION': return (
        <div className="animate-fadeIn h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-8 pb-10">
            {/* LEFT COLUMN: ELECTION LIST */}
            <div className="w-full md:w-80 bg-white border border-gray-100 shadow-sm flex flex-col shrink-0">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Briefcase size={14} /> Registry
                    </h3>
                    <button 
                        onClick={() => setIsAddElectionOpen(true)}
                        className="text-coop-green hover:bg-coop-green/10 p-2 rounded transition-all"
                    >
                        <PlusCircle size={16} />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {elections.map(election => (
                        <div 
                            key={election._id || election.id}
                            onClick={() => setSelectedElectionId(election._id || election.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all group ${
                                selectedElectionId === (election._id || election.id) 
                                ? 'bg-coop-green/5 border-coop-green shadow-sm' 
                                : 'bg-white border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                    election.status === 'active' ? 'bg-green-100 text-green-700' :
                                    election.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                                    'bg-yellow-50 text-yellow-600'
                                }`}>
                                    {election.status}
                                </span>
                                <span className="text-[9px] font-mono text-gray-300">ID-{(election._id || election.id).slice(-4)}</span>
                            </div>
                            <h4 className={`text-xs font-bold uppercase tracking-tight mb-1 ${selectedElectionId === (election._id || election.id) ? 'text-coop-darkGreen' : 'text-gray-600'}`}>
                                {election.title}
                            </h4>
                            <p className="text-[9px] text-gray-400 truncate">{election.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN: DETAIL & POSITIONS */}
            <div className="flex-grow bg-white border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                {selectedElection ? (
                    <>
                        {/* Detail Header */}
                        <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{selectedElection.title}</h2>
                                    <button className="text-gray-300 hover:text-coop-green transition-colors"><Edit3 size={14} /></button>
                                </div>
                                <p className="text-xs text-gray-500 font-medium mb-4 max-w-2xl">{selectedElection.description}</p>
                                <div className="flex items-center gap-6 text-[10px] font-mono font-bold text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12} /> {new Date(selectedElection.startDate).toLocaleDateString()} - {new Date(selectedElection.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <button 
                                    onClick={() => onDeleteElection(selectedElection.id || selectedElection._id)}
                                    className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors text-red-400 hover:text-red-600"
                                    title="Delete this election"
                                >
                                    <Trash2 size={12} /> Delete Entry
                                </button>
                            </div>
                        </div>

                        {/* Nested Position Management */}
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 bg-gray-50/10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <ListOrdered size={16} /> Ballot Positions
                                </h3>
                                <button 
                                    onClick={() => {
                                      if (!selectedElectionId) {
                                        Swal.fire('Error', 'Please select an election first', 'error');
                                        return;
                                      }
                                      setIsAddPositionOpen(true);
                                    }}
                                    disabled={selectedElection?.status === 'completed'}
                                    className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${
                                        selectedElection?.status === 'completed'
                                            ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:text-coop-green hover:border-coop-green'
                                    }`}
                                    title={selectedElection?.status === 'completed' ? 'Cannot add positions to completed elections' : 'Add a new position'}
                                >
                                    <PlusCircle size={12} /> Add Position
                                </button>
                            </div>

                            <div className="space-y-6">
                                {currentPositions.sort((a,b) => (a.order || 0) - (b.order || 0)).map((pos) => (
                                    <div key={pos.id} className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden group hover:border-gray-300 transition-all">
                                        <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 bg-white border border-gray-200 flex items-center justify-center font-black text-xs text-gray-400">
                                                    {candidates.filter(c => c.positionId === pos.id).length}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{pos.title}</h4>
                                                    <span className="text-[9px] font-mono text-gray-400">{pos.maxVotes} Selection(s) • {pos.type}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setCandidateModal({ isOpen: true, positionId: pos.id })} 
                                                    disabled={elections.some((e: any) => e.status === 'active') || selectedElection?.status === 'completed'}
                                                    className={`p-2 transition-colors ${
                                                        elections.some((e: any) => e.status === 'active') || selectedElection?.status === 'completed'
                                                            ? 'text-gray-400 cursor-not-allowed' 
                                                            : 'text-gray-300 hover:text-[#4F75E2]'
                                                    }`}
                                                    title={
                                                        selectedElection?.status === 'completed'
                                                            ? 'Cannot add candidates to completed elections'
                                                            : elections.some((e: any) => e.status === 'active')
                                                            ? 'Cannot add candidates while election is active'
                                                            : 'Add candidate'
                                                    }
                                                >
                                                    <UserPlus size={16}/>
                                                </button>
                                                <button onClick={() => onDeletePosition(pos.id)} disabled={selectedElection?.status === 'completed'} className={`p-2 transition-colors ${selectedElection?.status === 'completed' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-300 hover:text-red-500'}`}><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <div className="p-5 bg-white">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {candidates.filter(c => c.positionId === pos.id).length > 0 ? (
                                                    candidates.filter(c => c.positionId === pos.id).map(cand => (
                                                        <div key={cand.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded hover:bg-gray-50 transition-colors group/cand">
                                                            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                                                {cand.imageUrl ? <img src={cand.imageUrl} className="w-full h-full object-cover" /> : <UserCheck size={14} className="m-auto mt-2 text-gray-400" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-gray-900 truncate">{cand.name}</p>
                                                            </div>
                                                            <button onClick={() => onDeleteCandidate(cand.id)} className="ml-auto text-gray-300 hover:text-red-500 opacity-0 group-hover/cand:opacity-100 transition-opacity">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full text-center py-4 border border-dashed border-gray-100 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                                        No candidates registered
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {currentPositions.length === 0 && (
                                    <div className="py-20 text-center opacity-30">
                                        <Layers size={48} className="mx-auto mb-4 text-gray-400" />
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No positions configured for this election cycle</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center opacity-30">
                        <Briefcase size={64} className="mb-6 text-gray-300" />
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Select an election from the registry to manage</p>
                    </div>
                )}
            </div>

            {/* Add Election Modal - Enhanced */}
            {isAddElectionOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-scaleIn">
                        {/* Modal Header */}
                        <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-start">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-coop-darkGreen text-white rounded-xl flex items-center justify-center shadow-lg shadow-coop-green/20">
                                    <FilePlus size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Initialize Registry Cycle</h3>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Configure parameters for a new voting event.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAddElectionOpen(false)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Modal Form */}
                        <div className="p-8 space-y-8">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <Terminal size={14} className="text-coop-green" /> Election Identity
                                </label>
                                <input 
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-coop-green focus:bg-white focus:ring-4 focus:ring-coop-green/5 transition-all placeholder:text-gray-300"
                                    placeholder="e.g. 2025 Annual General Assembly Election"
                                    value={newElection.title || ''}
                                    onChange={e => setNewElection({...newElection, title: e.target.value})}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <FileText size={14} className="text-coop-green" /> Briefing Directive
                                </label>
                                <textarea 
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-coop-green focus:bg-white focus:ring-4 focus:ring-coop-green/5 transition-all resize-none placeholder:text-gray-300 min-h-[100px]"
                                    placeholder="Define the scope and purpose of this election cycle..."
                                    value={newElection.description || ''}
                                    onChange={e => setNewElection({...newElection, description: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <Clock size={14} className="text-coop-green" /> Activation Sequence
                                    </label>
                                    <input 
                                        type="datetime-local"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-coop-green focus:bg-white transition-all uppercase tracking-wide"
                                        value={newElection.startDate || ''}
                                        onChange={e => setNewElection({...newElection, startDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <Lock size={14} className="text-red-400" /> Termination Sequence
                                    </label>
                                    <input 
                                        type="datetime-local"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-red-400 focus:bg-white transition-all uppercase tracking-wide"
                                        value={newElection.endDate || ''}
                                        onChange={e => setNewElection({...newElection, endDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                            <button 
                                onClick={() => setIsAddElectionOpen(false)} 
                                className="flex-1 py-4 border border-gray-200 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:border-gray-300 rounded-xl transition-all"
                            >
                                Abort Protocol
                            </button>
                            <button 
                                onClick={submitNewElection} 
                                className="flex-[2] py-4 bg-coop-darkGreen text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                            >
                                Initialize Election Cycle <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Position Modal (Reused) */}
            {isAddPositionOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
                        <h3 className="text-xl font-black text-gray-900 uppercase mb-6">Create Position</h3>
                        <div className="space-y-4">
                            <input 
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold outline-none focus:border-coop-green"
                                placeholder="Position Title (e.g. Treasurer)"
                                value={newPosition.title || ''}
                                onChange={e => setNewPosition({...newPosition, title: e.target.value})}
                            />
                            <textarea 
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium outline-none focus:border-coop-green resize-none"
                                placeholder="Description of duties..."
                                rows={3}
                                value={newPosition.description || ''}
                                onChange={e => setNewPosition({...newPosition, description: e.target.value})}
                            />
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Max Votes</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold"
                                        value={newPosition.maxVotes || 1}
                                        onChange={e => setNewPosition({...newPosition, maxVotes: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Category</label>
                                    <select 
                                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold"
                                        value={newPosition.type || 'OFFICER'}
                                        onChange={e => setNewPosition({...newPosition, type: e.target.value as VotingType})}
                                    >
                                        <option value="OFFICER">Officer</option>
                                        <option value="PROPOSAL">Proposal</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setIsAddPositionOpen(false)} disabled={isCreatingPosition} className="flex-1 py-3 text-xs font-black uppercase text-gray-400 hover:bg-gray-50 rounded-lg disabled:opacity-50">Cancel</button>
                                <button onClick={submitNewPosition} disabled={isCreatingPosition} className="flex-1 py-3 bg-coop-green text-white text-xs font-black uppercase rounded-lg shadow-lg hover:bg-coop-darkGreen disabled:opacity-50 disabled:cursor-not-allowed">{isCreatingPosition ? 'Creating...' : 'Create'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Modal (Reused) */}
            {candidateModal.isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 animate-scaleIn">
                        {/* Header */}
                        <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-coop-green text-white rounded-lg flex items-center justify-center shadow-md">
                                    <UserPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Candidate Dossier</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Create New Profile Entry</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setCandidateModal({ isOpen: false, positionId: null })}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-8 flex flex-col md:flex-row gap-8">
                            {/* Left Col: Photo Upload */}
                            <div className="w-full md:w-1/3 flex flex-col gap-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Camera size={12} /> Profile Biometrics
                                </label>
                                <div 
                                    className="aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl relative overflow-hidden group cursor-pointer hover:border-coop-green transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {newCandidate.imageUrl ? (
                                        <>
                                            <img src={newCandidate.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                                                <FileText size={24} className="mb-2" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Change Photo</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                            <Upload size={32} className="mb-4" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Upload Candidate Photo</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                {newCandidate.imageUrl && (
                                    <button 
                                        onClick={() => setNewCandidate({ ...newCandidate, imageUrl: '' })}
                                        className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 text-center"
                                    >
                                        Remove Photo
                                    </button>
                                )}
                            </div>

                            {/* Right Col: Details */}
                            <div className="w-full md:w-2/3 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Terminal size={12} /> Full Legal Name
                                    </label>
                                    <input 
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-coop-green focus:bg-white transition-all placeholder:text-gray-300"
                                        placeholder="e.g. Juan Dela Cruz"
                                        value={newCandidate.name || ''}
                                        onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2 h-full">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={12} /> Platform / Manifesto
                                    </label>
                                    <textarea 
                                        className="w-full h-40 px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-coop-green focus:bg-white transition-all resize-none placeholder:text-gray-300"
                                        placeholder="Describe the candidate's goals and qualifications..."
                                        value={newCandidate.description || ''}
                                        onChange={e => setNewCandidate({...newCandidate, description: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setCandidateModal({ isOpen: false, positionId: null })}
                                className="px-6 py-3 border border-gray-200 bg-white text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitNewCandidate}
                                className="px-8 py-3 bg-coop-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-coop-darkGreen transition-all shadow-lg flex items-center gap-2"
                            >
                                <UserPlus size={14} /> Register Candidate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
      case 'ANNOUNCEMENTS': return (
        <div className="bg-white border border-gray-100 animate-fadeIn">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-coop-darkGreen text-white flex items-center justify-center font-black">B</div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Broadcast Ledger</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Official Member Communications</p>
                    </div>
                </div>
                {canManageSystem && (
                    <button onClick={() => setIsAddingAnnouncement(true)} className="bg-coop-darkGreen text-white px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                        <PlusCircle size={16}/> New Broadcast
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-10 py-5">Broadcast Header</th>
                            <th className="px-10 py-5">Priority</th>
                            <th className="px-10 py-5">Authorized Author</th>
                            <th className="px-10 py-5">Timestamp</th>
                            <th className="px-10 py-5 text-right">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {announcements.map(ann => (
                            <tr key={ann.id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                    <p className="font-black text-gray-900 uppercase tracking-tight leading-none text-sm">{ann.title}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">{ann.content}</p>
                                </td>
                                <td className="px-10 py-6">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 ${ann.priority === 'HIGH' ? 'bg-red-500 text-white' : ann.priority === 'MEDIUM' ? 'bg-coop-yellow text-coop-green' : 'bg-gray-100 text-gray-400'}`}>
                                        {ann.priority}
                                    </span>
                                </td>
                                <td className="px-10 py-6 text-xs font-bold text-gray-600">{ann.author || 'System'}</td>
                                <td className="px-10 py-6 text-[10px] font-mono text-gray-400">{ann.date}</td>
                                <td className="px-10 py-6 text-right">
                                    {canManageSystem && (
                                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14}/>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
      case 'RULES': return (
        <div className="bg-white border border-gray-100 animate-fadeIn">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-coop-darkGreen text-white flex items-center justify-center font-black">P</div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">System Protocols</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Immutable Governance Rules</p>
                    </div>
                </div>
                {canManageSystem && (
                    <button onClick={() => setIsAddingRule(true)} className="bg-coop-darkGreen text-white px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                        <PlusCircle size={16}/> New Protocol
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-10 py-5 w-16">Ord</th>
                            <th className="px-10 py-5">Protocol Identity</th>
                            <th className="px-10 py-5">Compliance Reference</th>
                            <th className="px-10 py-5 text-right">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rules.sort((a,b) => a.order - b.order).map(rule => (
                            <tr key={rule.id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-10 py-6 text-coop-green font-black">0{rule.order}</td>
                                <td className="px-10 py-6">
                                    <p className="font-black text-gray-900 uppercase tracking-tight leading-none text-sm">{rule.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{rule.content}</p>
                                </td>
                                <td className="px-10 py-6">
                                    <span className="text-[9px] font-mono font-bold text-gray-300 bg-gray-50 px-2 py-1 border border-gray-100">
                                        SHA-REF-{rule.id.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    {canManageSystem && (
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14}/>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
      case 'LOGS': return (
        <div className="bg-white border border-gray-100 animate-fadeIn overflow-hidden">
            <div className="p-10 border-b border-gray-100 bg-gray-50/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <ShieldAlert size={24} className="text-coop-darkGreen" />
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">System Audit Trail</h3>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Immutable Interaction History</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white border border-gray-100 px-4 py-2">
                        <Database size={14} className="text-coop-green" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ledger: BAT-CENTRAL-LOG</span>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-10 py-5">Timestamp</th>
                            <th className="px-10 py-5">Operator</th>
                            <th className="px-10 py-5">Action Protocol</th>
                            <th className="px-10 py-5">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50/10 transition-colors">
                                <td className="px-10 py-4 text-[10px] font-mono text-gray-400 whitespace-nowrap">{log.timestamp}</td>
                                <td className="px-10 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{log.user}</span>
                                        <span className="text-[8px] font-mono text-gray-300 bg-gray-100 px-1">{log.role}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-4 text-[11px] font-bold text-gray-600 font-mono tracking-tight">{log.action}</td>
                                <td className="px-10 py-4">
                                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${log.status === 'SUCCESS' ? 'text-coop-green' : 'text-red-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'SUCCESS' ? 'bg-coop-green shadow-[0_0_8px_#2D7A3E]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                                        {log.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
      case 'SETTINGS': return (
        <div className="max-w-4xl space-y-12 animate-fadeIn">
            {/* System Configuration */}
            <div className="bg-white border border-gray-100 p-12">
                <div className="mb-12 border-b border-gray-50 pb-8">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">System Matrix</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Core protocol configuration</p>
                </div>
                <div className="grid md:grid-cols-2 gap-16">
                    <div className="space-y-6">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6 block">Algorithm Tier</label>
                        {['ONE_MEMBER_ONE_VOTE', 'WEIGHTED_SHARES', 'WEIGHTED_BOARD'].map(mode => (
                            <button 
                                key={mode}
                                onClick={() => canManageSystem && setVotingMode(mode as VotingMode)}
                                className={`w-full flex items-center justify-between p-4 border text-[10px] font-black uppercase tracking-widest transition-all ${votingMode === mode ? 'border-coop-green bg-coop-green/5 text-coop-green' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                {mode.replace(/_/g, ' ')}
                                {votingMode === mode && <CheckCircle size={14} />}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-12">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6 block">Access Protocol</label>
                            {(() => {
                              const currentResultsPublic = elections.length > 0 ? Boolean((elections[0] as any).resultsPublic) : false;
                              return (
                            <div 
                                onClick={() => canManageSystem && handleToggleResultsVisibility(!currentResultsPublic)}
                                className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${currentResultsPublic ? 'border-coop-green bg-coop-green/5 text-coop-green' : 'border-gray-100 text-gray-400'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">{currentResultsPublic ? 'Public Ledger' : 'Private Ledger'}</span>
                                <div className={`w-8 h-4 rounded-full relative transition-all ${currentResultsPublic ? 'bg-coop-green' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${currentResultsPublic ? 'right-0.5' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                              );
                            })()}
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6 block">Node Termination Date</label>
                            <input 
                                type="datetime-local" 
                                value={electionEndDate} 
                                onChange={e => canManageSystem && setElectionEndDate(e.target.value)} 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-coop-green font-mono text-xs font-bold text-gray-900" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cycle Management / Reset Section */}
            <div className="bg-white border border-gray-100 p-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                    <Briefcase size={160} />
                </div>
                <div className="mb-10 border-b border-gray-50 pb-8">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Election Management</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Manage election cycles and registry</p>
                </div>
                <div className="max-w-2xl">
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10 italic">
                        Access the Elections menu to create, edit, and manage election cycles. Configure positions, candidates, and election parameters from the dedicated Elections interface.
                    </p>
                    
                    <button 
                        onClick={() => handleNavItemClick('ELECTION')}
                        className="bg-coop-darkGreen text-white px-10 py-5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-4"
                    >
                        <Briefcase size={18} /> Go to Elections
                    </button>
                </div>
            </div>
        </div>
      );
      default: return (
        <div className="py-40 text-center opacity-30">
          <Terminal size={48} className="mx-auto mb-4" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Interface under construction</p>
        </div>
      );
    }
  };

  const navItems = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'officer'] },
    { id: 'ELECTION', label: 'Elections', icon: Briefcase, roles: ['admin', 'officer'] },
    { id: 'RULES', label: 'Protocols', icon: BookOpen, roles: ['admin', 'officer'] },
    { id: 'ANNOUNCEMENTS', label: 'Announcements', icon: Megaphone, roles: ['admin', 'officer'] },
    { id: 'VOTERS', label: 'Ledger', icon: Users, roles: ['admin'] },
    { id: 'SETTINGS', label: 'Protocol', icon: Settings, roles: ['admin'] },
    { id: 'LOGS', label: 'Security', icon: ShieldCheck, roles: ['admin'] },
  ].filter(item => item.roles.includes(user.role as string));

  const SidebarContent = () => (
    <>
      <div className="px-8 pb-8 mb-8 border-b border-gray-200 relative z-10">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-none flex items-center justify-center shadow-sm shrink-0 bg-coop-green/10 border border-coop-green/20 overflow-hidden">
              <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight text-coop-darkGreen leading-tight uppercase">Control Hub</h1>
              <p className="text-coop-green font-black text-[8px] uppercase tracking-[0.3em] leading-none mt-1">System Admin</p>
            </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 rounded-none border border-coop-green/20 text-[8px] font-black text-coop-green uppercase tracking-[0.2em] w-max shadow-sm">
          <div className="w-1.5 h-1.5 bg-coop-green rounded-full animate-pulse"></div>
          <span>Active: {user.role}</span>
        </div>
      </div>
      <nav className="flex-grow space-y-1 px-4 overflow-y-auto custom-scrollbar relative z-10 pb-4" ref={navRef} onScroll={handleNavScroll}>
        {navItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => handleNavItemClick(item.id as AdminTab)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-[9px] font-black transition-all group relative uppercase tracking-widest ${activeTab === item.id ? 'bg-coop-green text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-coop-darkGreen'}`}
          >
            <item.icon size={16} className={`transition-all ${activeTab === item.id ? 'scale-105' : 'group-hover:translate-x-0.5'}`}/> 
            {item.label}
            {activeTab === item.id && (
              <div className="absolute right-3 w-1 h-6 bg-coop-yellow rounded-full"></div>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto relative z-10 bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-coop-green text-white rounded-none border border-coop-green/20 flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                  {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                  <p className="text-gray-800 font-black text-sm leading-none truncate tracking-tight uppercase">{user.name}</p>
                  <p className="text-coop-green font-black text-[8px] uppercase tracking-[0.2em] mt-1.5 leading-none">{user.role}</p>
              </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-none transition-all border border-red-100 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
          >
              <LogOut size={14} /> Logout
          </button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-[#f8fafc] flex overflow-hidden z-0">
      {/* Static Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-white relative shadow-sm overflow-hidden pt-10 border-r border-gray-200 h-screen">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="absolute top-0 left-0 bottom-0 w-80 bg-coop-green/95 backdrop-blur-3xl flex flex-col pt-12 border-r border-white/10 shadow-2xl animate-fadeIn overflow-y-auto">
            <SidebarContent />
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white"
            >
              <X size={24} />
            </button>
          </aside>
        </div>
      )}

      <div className="flex-grow flex flex-col h-full relative overflow-hidden bg-[#fcfcfd]">
        <header className="h-20 bg-white border-b border-gray-200 z-10 flex items-center justify-between px-6 sm:px-10 shadow-sm shrink-0">
            <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] overflow-hidden">
                <button 
                  className="md:hidden p-2 -ml-2 text-coop-green hover:bg-gray-100 rounded-none transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu size={20} />
                </button>
                <Terminal size={14} className="text-coop-green shrink-0 hidden sm:block"/>
                <span className="hidden sm:block">Terminal</span>
                <div className="h-3 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                <span className="text-coop-darkGreen truncate">{activeTab} Interface</span>
            </div>

            <div className="flex items-center gap-4 md:hidden">
              <div className="w-8 h-8 bg-coop-yellow text-coop-green rounded-none flex items-center justify-center font-black text-xs shadow-md">SV</div>
            </div>
        </header>
        
        <main className="flex-grow p-6 sm:p-10 overflow-y-auto z-10 custom-scrollbar scroll-smooth">
          <div key={activeTab} className={`max-w-[1400px] mx-auto min-h-full transition-all duration-300 ${isTransitioning ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-coop-green font-black uppercase tracking-widest">Loading...</div>
              </div>
            ) : (
              renderActiveTab()
            )}
          </div>
        </main>
      </div>

      {/* Modal overlays... */}
      {(isAddingRule) && (
        <div className="fixed inset-0 z-[200] bg-coop-green/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn border border-gray-100">
            <div className="bg-coop-green p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Protocol Enrollment</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">Formal Governance Record</p>
              </div>
              <button onClick={() => { setIsAddingRule(false); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleAddRule({ ...newRule, id: Date.now().toString(), order: rules.length + 1 } as Rule);
              setIsAddingRule(false);
              setNewRule({ title: '', content: '', order: 0 });
            }} className="p-8 sm:p-12 space-y-8 bg-white">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Title</label>
                <input 
                  type="text" required placeholder="e.g., Eligibility Standards"
                  className="w-full px-6 py-3.5 bg-gray-50 border border-gray-200 rounded-none font-bold text-coop-darkGreen transition-all text-sm outline-none focus:border-coop-green shadow-inner"
                  value={newRule?.title}
                  onChange={e => setNewRule({...newRule, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Content</label>
                <textarea 
                  required rows={4} placeholder="Full legal text of the protocol..."
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-none font-bold text-coop-darkGreen transition-all text-sm leading-relaxed outline-none focus:border-coop-green shadow-inner"
                  value={newRule?.content}
                  onChange={e => setNewRule({...newRule, content: e.target.value})}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button type="button" onClick={() => { setIsAddingRule(false); }} className="order-2 sm:order-1 flex-1 py-5 bg-gray-50 text-gray-400 rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-[2] py-5 bg-coop-green text-white rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-coop-darkGreen shadow-xl transition-all active:scale-95">
                  Confirm Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(isAddingAnnouncement) && (
        <div className="fixed inset-0 z-[200] bg-coop-green/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-xl animate-scaleIn border border-gray-100 my-auto flex flex-col max-h-[90vh]">
            <div className="bg-coop-green p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow flex-shrink-0">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Broadcast Enrollment</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">Validated Governance Communication</p>
              </div>
              <button onClick={() => { setIsAddingAnnouncement(false); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors flex-shrink-0"><X size={24}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleAddAnnouncement({ ...newAnnouncement, id: Date.now().toString(), date: new Date().toISOString().split('T')[0], author: user.name } as Announcement);
              setIsAddingAnnouncement(false);
              setNewAnnouncement({ title: '', content: '', priority: 'LOW', expiresAt: '' });
            }} className="p-8 sm:p-12 space-y-8 bg-white overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Broadcast Title</label>
                <input 
                  type="text" required placeholder="Announcement Title..."
                  className="w-full px-6 py-3.5 bg-gray-50 border border-gray-200 rounded-none font-bold text-coop-darkGreen transition-all text-sm outline-none focus:border-coop-green shadow-inner"
                  value={newAnnouncement?.title}
                  onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority Tier</label>
                <select 
                  className="w-full px-6 py-3.5 bg-gray-50 border border-gray-100 rounded-none font-bold text-coop-darkGreen transition-all text-sm appearance-none outline-none focus:border-coop-green shadow-inner"
                  value={newAnnouncement?.priority}
                  onChange={e => setNewAnnouncement({...newAnnouncement, priority: e.target.value as any})}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Audience</label>
                <div className="space-y-2.5 bg-gray-50 p-4 border border-gray-100 rounded-none">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(newAnnouncement?.targetAudience || []).includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAnnouncement({...newAnnouncement, targetAudience: ['all']});
                        } else {
                          setNewAnnouncement({...newAnnouncement, targetAudience: ['all']});
                        }
                      }}
                      className="w-4 h-4 accent-coop-green cursor-pointer"
                    />
                    <span className="text-sm font-bold text-gray-600 group-hover:text-coop-green transition-colors">All Members</span>
                  </label>
                  
                  {(newAnnouncement?.targetAudience || []).includes('all') ? (
                    <p className="text-[9px] text-gray-400 italic mt-2">Broadcasting to all members (overrides specific targeting)</p>
                  ) : (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={(newAnnouncement?.targetAudience || []).includes('hasNotVoted')}
                          onChange={(e) => {
                            const current = newAnnouncement?.targetAudience || [];
                            const updated = e.target.checked 
                              ? [...current, 'hasNotVoted']
                              : current.filter(a => a !== 'hasNotVoted');
                            setNewAnnouncement({...newAnnouncement, targetAudience: updated.length === 0 ? ['all'] : updated as any});
                          }}
                          className="w-4 h-4 accent-coop-green cursor-pointer"
                        />
                        <span className="text-sm font-bold text-gray-600 group-hover:text-coop-green transition-colors">Haven't Voted Yet</span>
                        <span className="text-[9px] text-gray-400 ml-auto">(Reminders, calls to action)</span>
                      </label>
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={(newAnnouncement?.targetAudience || []).includes('hasVoted')}
                          onChange={(e) => {
                            const current = newAnnouncement?.targetAudience || [];
                            const updated = e.target.checked 
                              ? [...current, 'hasVoted']
                              : current.filter(a => a !== 'hasVoted');
                            setNewAnnouncement({...newAnnouncement, targetAudience: updated.length === 0 ? ['all'] : updated as any});
                          }}
                          className="w-4 h-4 accent-coop-green cursor-pointer"
                        />
                        <span className="text-sm font-bold text-gray-600 group-hover:text-coop-green transition-colors">Already Voted</span>
                        <span className="text-[9px] text-gray-400 ml-auto">(Thank you, results updates)</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry Date (Optional)</label>
                <p className="text-[9px] text-gray-500 italic">Leave empty for no expiry. Once the date/time passes, announcement will be hidden from all members.</p>
                <input 
                  type="datetime-local" 
                  className="w-full px-6 py-3.5 bg-gray-50 border border-gray-200 rounded-none font-bold text-coop-darkGreen transition-all text-sm outline-none focus:border-coop-green shadow-inner"
                  value={newAnnouncement?.expiresAt || ''}
                  onChange={e => setNewAnnouncement({...newAnnouncement, expiresAt: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Broadcast Content</label>
                <textarea 
                  required rows={4} placeholder="Announcement details..."
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-none font-bold text-coop-darkGreen transition-all text-sm leading-relaxed outline-none focus:border-coop-green shadow-inner"
                  value={newAnnouncement?.content}
                  onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6 sticky bottom-0 bg-white border-t border-gray-100">
                <button type="button" onClick={() => { setIsAddingAnnouncement(false); }} className="order-2 sm:order-1 flex-1 py-5 bg-gray-50 text-gray-400 rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-[2] py-5 bg-coop-green text-white rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-coop-darkGreen shadow-xl transition-all active:scale-95">
                  Confirm Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
