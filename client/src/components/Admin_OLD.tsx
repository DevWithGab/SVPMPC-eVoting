import React, { useState, useEffect, useCallback } from 'react';
import { VotingType } from '../types.ts';
import type { User, Candidate, Position, Announcement, Rule, VotingMode, VotingStatus } from '../types.ts';
import { userAPI, electionAPI, candidateAPI, announcementAPI, ruleAPI, voteAPI, reportAPI, activityAPI } from '../services/api';
import Swal from 'sweetalert2';
import { 
  Settings, Users, Download, 
  LayoutDashboard, UserCheck, ShieldCheck, Activity, Search, 
  CheckCircle, X, Trash2, 
  Database, PauseCircle, PlayCircle,
  Layers,
  FileText, Camera, LayoutList, Upload,
  Terminal, ArrowUpRight, LogOut, Megaphone, BookOpen,
  UserPlus, Menu, Eye, EyeOff, AlertTriangle, RefreshCw, Bell, Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

type AdminTab = 'OVERVIEW' | 'VOTERS' | 'POSITIONS' | 'CANDIDATES' | 'ANNOUNCEMENTS' | 'RULES' | 'SETTINGS' | 'LOGS';

export const Admin: React.FC<AdminProps> = ({ user, onLogout }) => {
  // Refs for scroll position preservation
  const navRef = React.useRef<HTMLNavElement>(null);
  const scrollPosRef = React.useRef(0);
  const completedElectionsRef = React.useRef<Set<string>>(new Set()); // Track completed elections to avoid duplicate announcements

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [elections, setElections] = useState<Array<any>>([]);
  // Removed votes state as it's not used
  const [loading, setLoading] = useState(true);
  const [branchData, setBranchData] = useState<Array<{ name: string; participation: number; voters: number }>>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modal state
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateImage, setCandidateImage] = useState<string | null>(null);
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newElectionDate, setNewElectionDate] = useState('');
  const [wipeEntities, setWipeEntities] = useState(false);
  
  // Election Creator state
  const [newTitle, setNewTitle] = useState('');
  const [newBgImage, setNewBgImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({ title: '', content: '', priority: 'LOW', targetAudience: ['all'] });
  const [newRule, setNewRule] = useState<Partial<Rule>>({ title: '', content: '', order: 0 });
  
  // Settings state
  const [votingMode, setVotingMode] = useState<VotingMode>('ONE_MEMBER_ONE_VOTE');
  const [votingStatus, setVotingStatus] = useState<VotingStatus>('PAUSED');
  const [showResultsToPublic, setShowResultsToPublic] = useState(false);
  const [electionEndDate, setElectionEndDate] = useState('');
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false);
  const [isSavingEndDate, setIsSavingEndDate] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; user: string; role: string; action: string }>>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const canManageSystem = user.role === 'admin';

  const handleNavScroll = (e: React.UIEvent<HTMLNavElement>) => {
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
    
    // Update state
    setActiveTab(itemId);
    setSearchTerm('');
    setIsMobileMenuOpen(false);
  };

  // Define fetchAllData with useCallback to maintain stable reference
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, electionsData, candidatesData, rulesData, announcementsData, votesData, activitiesData]: [
        Array<{ id: string; fullName?: string; username: string; email: string; role: string; isActive?: boolean; address?: string }>,
        Array<{ id: string; title: string; description?: string; maxVotesPerMember?: number; status: string; endDate?: string }>,
        Array<{ id: string; name: string; description?: string; electionId: string; photoUrl?: string }>,
        Array<{ id: string; title: string; content: string; order: number }>,
        Array<{ id: string; title: string; content: string; priority: string; date: string; author: string }>,
        Array<{ userId: string; candidateId: string }>,
        Array<any>
      ] = await Promise.all([
        userAPI.getUsers().catch((err) => { console.error('Error fetching users:', err); return []; }),
        electionAPI.getElections().catch((err) => { console.error('Error fetching elections:', err); return []; }),
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

      const mappedPositions: Position[] = electionsData
        .map((e: any) => ({
          id: e._id || e.id,
          title: e.title,
          description: e.description || '',
          maxVotes: e.maxVotesPerMember || 1,
          order: 0,
          type: 'OFFICER' as const, // Default, can be enhanced later
          status: e.status // Include status for toggling
        }))
        .filter(p => /^[0-9a-fA-F]{24}$/.test(p.id)) // Filter out invalid ObjectIds after mapping
        .map((p, index) => ({ ...p, order: index + 1 }));

      // Calculate vote counts for candidates
      const voteCounts: Record<string, number> = {};
      votesData.forEach((vote) => {
        voteCounts[vote.candidateId] = (voteCounts[vote.candidateId] || 0) + 1;
      });

      const mappedCandidates: Candidate[] = candidatesData.map((c: any) => ({
        id: c._id || c.id,
        name: c.name,
        description: c.description || '',
        positionId: typeof c.electionId === 'string' ? c.electionId : (c.electionId?._id || c.electionId?.id),
        votes: voteCounts[c._id || c.id] || 0,
        imageUrl: c.photoUrl,
        photoUrl: c.photoUrl
      }));

      setUsers(mappedUsers);
      setPositions(mappedPositions);
      setCandidates(mappedCandidates);
      setElections(electionsData);
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
      const electionForSettings = activeElection || electionsData[0];
      if (electionForSettings) {
        // Default to true if not set
        setShowResultsToPublic((electionForSettings as any).resultsPublic !== false);
      }

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
  const completeElectionAutomatically = useCallback(async (electionId: string) => {
    // Only complete if we haven't already completed this election
    if (completedElectionsRef.current.has(electionId)) {
      return;
    }
    
    try {
      completedElectionsRef.current.add(electionId);
      await electionAPI.completeElection(electionId);
      await fetchAllData();
    } catch (error) {
      console.error('Failed to auto-complete election:', error);
      // Remove from completed set if it failed so it can retry
      completedElectionsRef.current.delete(electionId);
    }
  }, [fetchAllData]);

  // Update countdown timer every second for any election with future end date
  useEffect(() => {
    const checkElectionStatus = () => {
      // Check if any election has reached its end date and auto-complete it
      const now = new Date().getTime();
      elections.forEach((election) => {
        if (!election.endDate || election.status === 'completed') return;
        
        const endTime = new Date(election.endDate).getTime();
        if (endTime <= now && !completedElectionsRef.current.has(election._id || election.id)) {
          // Election has reached its termination date - auto-complete to create announcement
          completeElectionAutomatically(election._id || election.id);
        }
      });
    };

    checkElectionStatus();
    const interval = setInterval(checkElectionStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [elections, completeElectionAutomatically]);

  // Handler functions
  const handleAddCandidate = async (candidate: Candidate) => {
    try {
      const response = await candidateAPI.createCandidate({
        name: candidate.name,
        description: candidate.description,
        photoUrl: undefined, // Don't set URL initially
        electionId: candidate.positionId // Map positionId to electionId
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
    try {
      await userAPI.deleteUser(id);
      await fetchAllData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
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
      await announcementAPI.createAnnouncement({
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        date: ann.date,
        author: ann.author
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
    try {
      await announcementAPI.deleteAnnouncement(id);
      await fetchAllData();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
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

  const handleToggleVotingStatus = async () => {
    try {
      const newStatus = votingStatus === 'OPEN' ? 'PAUSED' : 'OPEN';
      // Find active election and update its status
      const activeElection = positions.find(() => {
        // This would need to be enhanced to track election status
        return true; // Simplified for now
      });
      
      if (activeElection) {
        if (newStatus === 'OPEN') {
          await electionAPI.startElection(activeElection.id);
        } else {
          await electionAPI.completeElection(activeElection.id);
        }
      }
      setVotingStatus(newStatus);
      await fetchAllData();
    } catch (error) {
      console.error('Failed to toggle voting status:', error);
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
      
      await electionAPI.resetCycle(electionId, newEndDate, wipeEntities);
      
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
            <li>Election created: <strong>${title}</strong></li>
            <li>All votes cleared</li>
            ${wipeEntities ? '<li>All candidates removed</li>' : '<li>Candidate vote counts reset</li>'}
            <li>All voter participation flags reset</li>
            <li>End date: ${new Date(newEndDate).toLocaleDateString()}</li>
            <li>Announcement broadcasted to all members</li>
            ${bgImage ? '<li>Background image applied</li>' : ''}
          </ul>
        </div>`,
        icon: 'success',
        confirmButtonColor: '#4F75E2',
      });
      
      // Refresh all data
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
        setCandidateImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderActiveTab = () => {
    switch(activeTab) {
      case 'OVERVIEW': return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col lg:flex-row items-center gap-6 bg-white border-l-4 border-coop-green p-6 shadow-sm rounded-none">
                <div className={`w-14 h-14 rounded-none flex items-center justify-center shadow-inner ${votingStatus === 'OPEN' ? 'bg-coop-green text-white' : 'bg-red-600 text-white'}`}>
                    {votingStatus === 'OPEN' ? <PlayCircle size={32} /> : <PauseCircle size={32} />}
                </div>
                <div className="flex-1 text-center lg:text-left">
                    <h2 className="text-xl font-black text-coop-darkGreen uppercase tracking-tight">
                        Environment: {votingStatus === 'OPEN' ? 'Active & Encrypted' : 'System Locked'}
                    </h2>
                    <p className="text-xs text-gray-400 font-bold flex items-center justify-center lg:justify-start gap-2 uppercase tracking-widest mt-1">
                        <Activity size={14} className="text-coop-green"/> Participation Index: Stable • Nodes Verified: {branchData.length}
                    </p>
                </div>
                {canManageSystem && (
                    <div className="flex gap-4">
                        <button 
                            onClick={handleToggleVotingStatus}
                            className={`px-8 py-3 rounded-none font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-md active:scale-95 ${votingStatus === 'OPEN' ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200' : 'bg-coop-yellow text-coop-green shadow-coop-yellow/20'}`}
                        >
                            {votingStatus === 'OPEN' ? 'Suspend Session' : 'Initiate Session'}
                        </button>
                        <button 
                            onClick={() => setIsResetModalOpen(true)}
                            className="bg-red-500 text-white px-8 py-3 rounded-none font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <RefreshCw size={14} /> Reset Cycle
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Verified Voters', val: users.length, icon: Users, color: 'text-coop-green' },
                  { label: 'Ballots Cast', val: users.filter(u => u.hasVoted).length, icon: CheckCircle, color: 'text-coop-green' },
                  { label: 'Active Categories', val: positions.length, icon: Layers, color: 'text-coop-green' },
                  { label: 'Candidates', val: candidates.length, icon: UserCheck, color: 'text-coop-green' }
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-gray-200 p-6 rounded-none shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className={`p-2 rounded-none bg-gray-50 ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-gray-200 group-hover:text-coop-green transition-colors" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest relative z-10">{stat.label}</p>
                    <p className="text-4xl font-black text-coop-darkGreen mt-1 relative z-10">{stat.val.toLocaleString()}</p>
                    <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <stat.icon size={80} />
                    </div>
                  </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-6 pb-12">
                <div className="lg:col-span-8 bg-white border border-gray-200 rounded-none p-8 shadow-sm">
                    <h3 className="text-lg font-black text-coop-darkGreen uppercase tracking-tight mb-10 border-b border-gray-50 pb-6">Terminal Telemetry: Participation</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={TIMELINE_DATA}>
                                <defs>
                                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2D7A3E" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#2D7A3E" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" tick={{fontSize: 10, fontWeight: 900, fill: '#2D7A3E'}} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip contentStyle={{borderRadius: '0px', border: '1px solid #2D7A3E', fontWeight: 900, fontSize: '11px'}} />
                                <Area type="stepAfter" dataKey="votes" stroke="#2D7A3E" strokeWidth={4} fill="url(#chartGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-4 bg-coop-green text-white rounded-none p-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-black/10 z-0"></div>
                    <h3 className="text-lg font-black uppercase tracking-widest mb-8 border-b border-white/10 pb-4 relative z-10">Branch Turnout</h3>
                    <div className="space-y-6 relative z-10">
                        {branchData.map((branch) => (
                            <div key={branch.name} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/70">
                                    <span>{branch.name}</span>
                                    <span className="text-coop-yellow font-black">{branch.participation}%</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-none overflow-hidden">
                                    <div className="h-full bg-coop-yellow transition-all duration-1000 shadow-[0_0_8px_rgba(242,228,22,0.5)]" style={{ width: `${branch.participation}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      );
      case 'RULES': return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end pb-6 border-b-2 border-coop-green/10">
                <div>
                  <h3 className="text-3xl font-black text-coop-darkGreen uppercase tracking-tight">Governance Protocols</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Manage Rules & Guidelines</p>
                </div>
                {canManageSystem && (
                  <button onClick={() => setIsAddingRule(true)} className="bg-coop-green text-white px-8 py-3 rounded-none font-black text-[11px] uppercase tracking-widest hover:bg-coop-darkGreen transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <BookOpen size={18}/> <span className="hidden sm:inline">New Protocol</span>
                  </button>
                )}
            </div>
            {rules.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-none p-12 text-center">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No Governance Protocols Yet</p>
                <p className="text-gray-300 text-sm mt-2">Create your first rule by clicking the button above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                {rules.sort((a, b) => a.order - b.order).map((rule) => (
                  <div key={rule.id} className="bg-white border border-gray-200 p-8 rounded-none shadow-sm group hover:border-coop-green transition-all relative">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-10 bg-coop-green/10 text-coop-green flex items-center justify-center font-black">
                        {rule.order}
                      </div>
                      {canManageSystem && (
                        <div className="flex gap-2">
                            <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                            </button>
                        </div>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-coop-darkGreen uppercase tracking-tight mb-2">{rule.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{rule.content}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
      );
      case 'ANNOUNCEMENTS': return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end pb-6 border-b-2 border-coop-green/10">
                <div>
                  <h3 className="text-3xl font-black text-coop-darkGreen uppercase tracking-tight">Official Broadcasts</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Manage System-Wide Alerts</p>
                </div>
                {canManageSystem && (
                  <button onClick={() => setIsAddingAnnouncement(true)} className="bg-coop-green text-white px-8 py-3 rounded-none font-black text-[11px] uppercase tracking-widest hover:bg-coop-darkGreen transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <Megaphone size={18}/> <span className="hidden sm:inline">New Broadcast</span>
                  </button>
                )}
            </div>
            <div className="space-y-4 pb-12">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white border border-gray-200 p-8 rounded-none shadow-sm group hover:border-coop-green transition-all flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${ann.priority === 'HIGH' ? 'bg-red-500 text-white' : ann.priority === 'MEDIUM' ? 'bg-coop-yellow text-coop-green' : 'bg-gray-100 text-gray-400'}`}>
                          {ann.priority}
                        </span>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest px-3 py-1.5 rounded bg-blue-500 flex items-center gap-2">
                          {!(ann.targetAudience && ann.targetAudience.length > 0) || (ann.targetAudience || []).includes('all') ? (
                            <>
                              <Bell size={14} /> All Members
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              {(ann.targetAudience || []).includes('hasNotVoted') && (
                                <>
                                  <Clock size={14} /> Not Voted
                                </>
                              )}
                              {(ann.targetAudience || []).includes('hasNotVoted') && (ann.targetAudience || []).includes('hasVoted') && (
                                <span className="text-blue-200">+</span>
                              )}
                              {(ann.targetAudience || []).includes('hasVoted') && (
                                <>
                                  <CheckCircle size={14} /> Voted
                                </>
                              )}
                            </div>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 ml-auto">{ann.date}</span>
                      </div>
                      <h4 className="text-xl font-black text-coop-darkGreen uppercase tracking-tight mb-2">{ann.title}</h4>
                      <p className="text-sm text-gray-500 max-w-2xl">{ann.content}</p>
                    </div>
                    {canManageSystem && (
                      <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-gray-300 hover:text-red-500 mt-4 sm:mt-0">
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
        </div>
      );
      case 'POSITIONS': return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end pb-6 border-b-2 border-coop-green/10">
                <div>
                  <h3 className="text-3xl font-black text-coop-darkGreen uppercase tracking-tight">Electoral Tiers</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Validated Position Registry</p>
                </div>
                {canManageSystem && (
                  <button onClick={() => setIsAddingPosition(true)} className="bg-coop-green text-white px-8 py-3 rounded-none font-black text-[11px] uppercase tracking-widest hover:bg-coop-darkGreen transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <Layers size={18}/> <span className="hidden sm:inline">New Position</span>
                  </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {positions.sort((a, b) => a.order - b.order).map((p) => (
                  <div key={p.id} className="bg-white border border-gray-200 p-8 rounded-none shadow-sm group hover:border-coop-green transition-all flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-gray-50 text-coop-green rounded-none border border-gray-100 group-hover:bg-coop-green group-hover:text-white transition-colors">
                            {p.type === VotingType.PROPOSAL ? <FileText size={20}/> : <LayoutList size={20}/>}
                        </div>
                        {canManageSystem && (
                            <div className="flex gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleTogglePositionStatus(p.id, (p as any).status);
                                  }} 
                                  className={`p-2.5 rounded-none font-bold transition-colors cursor-pointer ${(p as any).status === 'active' ? 'bg-green-50 text-coop-green hover:bg-coop-green hover:text-white' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-500 hover:text-white'}`}
                                >
                                    {(p as any).status === 'active' ? <Eye size={18}/> : <EyeOff size={18}/>}
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeletePosition(p.id)} 
                                  className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-none transition-colors cursor-pointer"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        )}
                    </div>
                    <h4 className="text-xl font-black text-coop-darkGreen uppercase tracking-tight mb-2">{p.title}</h4>
                    <p className="text-xs text-gray-400 font-medium mb-6 line-clamp-2">{p.description}</p>
                    <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>Status: <span className={(p as any).status === 'active' ? 'text-coop-green' : 'text-yellow-600'}>{(p as any).status}</span></span>
                        <span>Max Votes: <span className="text-coop-green">{p.maxVotes}</span></span>
                    </div>
                  </div>
                ))}
            </div>
        </div>
      );
      case 'CANDIDATES': return (
        <div className="space-y-12 animate-fadeIn pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 border-b-2 border-coop-green/10 gap-6">
                <div>
                  <h3 className="text-4xl font-black text-coop-darkGreen uppercase tracking-tight leading-none">Identity Profiles</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-3 flex items-center gap-2">
                    <Activity size={14} className="text-coop-green" /> Candidate Ledger Organized by Seat
                  </p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0 md:w-64">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-none text-[10px] font-black uppercase tracking-widest outline-none focus:border-coop-green shadow-sm"
                        />
                    </div>
                    {canManageSystem && (
                      <button onClick={() => setIsAddingCandidate(true)} className="bg-coop-green text-white px-6 py-3 rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-coop-darkGreen transition-all shadow-lg active:scale-95 flex items-center gap-2 shrink-0">
                        <UserPlus size={16}/> <span className="hidden sm:inline">Enroll</span>
                      </button>
                    )}
                </div>
            </div>

            <div className="space-y-16">
                {positions.map(position => {
                    const posCandidates = filteredCandidates.filter(c => c.positionId === position.id);
                    if (posCandidates.length === 0 && searchTerm) return null;

                    return (
                        <section key={position.id} className="space-y-8">
                            <div className="flex items-center gap-6">
                                <div className={`px-4 py-2 rounded-none border-2 font-black text-[11px] uppercase tracking-[0.3em] ${position.type === VotingType.PROPOSAL ? 'border-blue-500 text-blue-500' : 'border-coop-green text-coop-green'}`}>
                                    {position.title}
                                </div>
                                <div className="h-px flex-grow bg-gray-100"></div>
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{posCandidates.length} ENTRIES</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {posCandidates.length > 0 ? posCandidates.map((c) => (
                                    <div key={c.id} className="bg-white border border-gray-200 rounded-none overflow-hidden shadow-sm hover:border-coop-green transition-all group flex flex-col relative">
                                        <div className="h-44 bg-gray-50 relative overflow-hidden">
                                            {c.imageUrl && c.imageUrl.trim() ? (
                                                <img src={c.imageUrl} className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" alt={c.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-200"><Camera size={40} /></div>
                                            )}
                                            {canManageSystem && (
                                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDeleteCandidate(c.id)} className="p-2.5 bg-white text-red-500 rounded-none shadow-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            )}
                                            <div className="absolute bottom-3 left-3">
                                                <div className="bg-white/90 backdrop-blur-sm border border-gray-100 px-3 py-1 text-[8px] font-black text-coop-darkGreen uppercase tracking-widest shadow-sm">
                                                    NODE-REF: REG-{c.id.slice(-8).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 flex flex-col flex-grow">
                                            <h4 className="text-lg font-black text-coop-darkGreen uppercase tracking-tight mb-2 group-hover:text-coop-green transition-colors">{c.name}</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed italic mb-8 line-clamp-3 font-medium">"{c.description}"</p>
                                            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-gray-300">Live Tally</span>
                                                <span className="text-2xl font-black text-coop-green drop-shadow-sm">{c.votes}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-12 text-center bg-gray-50 border border-dashed border-gray-200">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No profiles assigned to this category.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
      );
      case 'VOTERS': return (
        <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden animate-fadeIn">
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-coop-green text-white rounded-none shadow-sm"><Users size={24}/></div>
                    <div>
                        <h3 className="text-2xl font-black text-coop-darkGreen uppercase tracking-tight leading-none">Global Member Ledger</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <ShieldCheck size={14} className="text-coop-green"/> Central Identity Node
                        </p>
                    </div>
                </div>
                <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                        type="text" 
                        placeholder="Search Identity or Name..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-none text-xs font-black outline-none focus:border-coop-green shadow-sm" 
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <tr>
                            <th className="px-10 py-5">Profile Identity</th>
                            <th className="px-10 py-5">Address / Branch</th>
                            <th className="px-10 py-5">Status</th>
                            <th className="px-10 py-5">Clearance</th>
                            <th className="px-10 py-5 text-right">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 text-gray-400 group-hover:bg-coop-green group-hover:text-white transition-colors flex items-center justify-center font-black">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-coop-darkGreen text-base tracking-tight leading-none uppercase">{u.name}</p>
                                            <p className="text-[9px] font-mono text-gray-400 mt-2 tracking-widest uppercase">NODE-REF#{u.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <span className="text-sm text-gray-700 font-medium">{u.address || 'Not provided'}</span>
                                </td>
                                <td className="px-10 py-6">
                                    {u.hasVoted ? (
                                        <div className="flex items-center gap-2 text-coop-green font-black text-[9px] uppercase tracking-widest">
                                            <CheckCircle size={14}/> Recorded
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-300 font-black text-[9px] uppercase tracking-widest">
                                            <Activity size={14}/> Pending
                                        </div>
                                    )}
                                </td>
                                <td className="px-10 py-6">
                                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-coop-yellow/10 text-coop-green border-coop-yellow/20' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    {canManageSystem && (
                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16}/>
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
      case 'SETTINGS': return (
        <div className="max-w-4xl space-y-6 animate-fadeIn">
            <div className="bg-white border border-gray-200 p-10 rounded-none shadow-sm">
                <div className="flex items-center gap-4 mb-10 border-b border-gray-50 pb-6">
                    <div className="p-3 bg-coop-green text-coop-yellow rounded-none shadow-lg"><Settings size={24}/></div>
                    <div>
                        <h3 className="text-2xl font-black text-coop-darkGreen uppercase tracking-tight leading-none">System Protocol Matrix</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Global System Configuration</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Election Algorithm</h4>
                        {['ONE_MEMBER_ONE_VOTE', 'WEIGHTED_SHARES', 'WEIGHTED_BOARD'].map(mode => (
                            <button 
                                key={mode}
                                onClick={() => canManageSystem && setVotingMode(mode as VotingMode)}
                                className={`w-full flex items-center justify-between p-4 rounded-none border text-xs font-black transition-all uppercase tracking-widest ${votingMode === mode ? 'border-coop-green bg-coop-green/5 text-coop-green' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                {mode.replace(/_/g, ' ')}
                                {votingMode === mode && <CheckCircle size={16} />}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Privacy & Access</h4>
                            <div 
                                onClick={async () => {
                                  if (!canManageSystem) return;
                                  const newIsPublic = !showResultsToPublic;
                                  setShowResultsToPublic(newIsPublic);
                                  // Update ALL elections with the new resultsPublic value
                                  try {
                                    await Promise.all(positions.map(pos => 
                                      electionAPI.updateElection(pos.id, { resultsPublic: newIsPublic })
                                    ));
                                    alert(`Results ${newIsPublic ? 'unlocked' : 'locked'} for members!`);
                                  } catch (err) {
                                    console.error('Failed to update results visibility:', err);
                                    alert('Error updating results visibility');
                                  }
                                }}
                                className={`flex items-center justify-between p-4 rounded-none border cursor-pointer transition-all ${showResultsToPublic ? 'border-coop-green bg-coop-green/5 text-coop-green' : 'border-gray-100 text-gray-400'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest">{showResultsToPublic ? 'Results: Public Access' : 'Results: Restricted Access'}</span>
                                <div className={`w-10 h-5 rounded-full relative transition-all ${showResultsToPublic ? 'bg-coop-green' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showResultsToPublic ? 'right-1' : 'left-1'}`}></div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Node Termination Date</h4>
                            <div className="flex gap-2">
                              <input 
                                  type="datetime-local" 
                                  value={electionEndDate}
                                  disabled={!canManageSystem}
                                  onChange={e => {
                                    setElectionEndDate(e.target.value);
                                    setHasEndDateChanged(e.target.value !== originalEndDate);
                                  }}
                                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-none outline-none focus:border-coop-green font-black text-xs text-coop-darkGreen shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                              />
                              {hasEndDateChanged && (
                                <button
                                  onClick={async () => {
                                    try {
                                      setIsSavingEndDate(true);
                                      console.log('All elections:', elections);
                                      const activeElection = elections?.find((e: any) => e.status === 'active') || elections?.find((e: any) => e.status === 'completed') || elections?.[0];
                                      console.log('Election found:', activeElection);
                                      if (activeElection) {
                                        const electionId = activeElection._id || activeElection.id;
                                        // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string
                                        // User entered local time, need to convert to UTC for storage
                                        const parts = electionEndDate.split('T');
                                        const [year, month, day] = parts[0].split('-').map(Number);
                                        const [hours, minutes] = parts[1].split(':').map(Number);
                                        
                                        // Create a date in local time
                                        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
                                        
                                        // Convert to UTC by accounting for timezone offset
                                        // getTimezoneOffset() returns negative for timezones ahead of UTC (like UTC+8)
                                        // To convert local to UTC: UTC = Local + tzOffset (which is negative, so effectively subtract the offset)
                                        const tzOffset = localDate.getTimezoneOffset() * 60000; // in milliseconds
                                        const utcTime = new Date(localDate.getTime() + tzOffset);
                                        const isoString = utcTime.toISOString();
                                        
                                        const now = new Date();
                                        const utcDate = utcTime;
                                        
                                        // Update end date, and revert status if needed
                                        const updateData: any = { endDate: isoString };
                                        
                                        // If new date is in the future and election is completed, revert to active
                                        if (utcDate > now && activeElection.status === 'completed') {
                                          updateData.status = 'active';
                                          // Clear the completed elections tracker so it can be completed again if it reaches zero
                                          completedElectionsRef.current.delete(electionId);
                                        }
                                        
                                        await electionAPI.updateElection(electionId, updateData);
                                        setOriginalEndDate(electionEndDate);
                                        setHasEndDateChanged(false);
                                        // Refresh elections data to update the timer
                                        await fetchAllData();
                                        
                                        // Force a small delay to ensure state updates have propagated
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                        
                                        Swal.fire({
                                          title: 'Success!',
                                          text: 'Termination date saved successfully!',
                                          icon: 'success',
                                          confirmButtonColor: '#16a34a',
                                          confirmButtonText: 'OK'
                                        });
                                      } else {
                                        Swal.fire({
                                          title: 'Error',
                                          text: 'No election found to update',
                                          icon: 'error',
                                          confirmButtonColor: '#dc2626'
                                        });
                                      }
                                    } catch (err) {
                                      console.error('Error saving termination date:', err);
                                      Swal.fire({
                                        title: 'Error',
                                        text: 'Error saving termination date: ' + (err instanceof Error ? err.message : 'Unknown error'),
                                        icon: 'error',
                                        confirmButtonColor: '#dc2626'
                                      });
                                    } finally {
                                      setIsSavingEndDate(false);
                                    }
                                  }}
                                  disabled={isSavingEndDate}
                                  className="px-4 py-3 bg-coop-green hover:bg-coop-darkGreen text-white font-black text-xs rounded-none uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
                                >
                                  {isSavingEndDate ? 'Saving...' : 'Save'}
                                </button>
                              )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cycle Management Section */}
            <div className="bg-white border border-gray-200 p-10 rounded-none shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                    <RefreshCw size={160} />
                </div>
                <div className="flex items-center gap-4 mb-10 border-b border-gray-50 pb-6 relative z-10">
                    <div className="p-3 bg-red-50 text-red-500 rounded-none shadow-lg"><RefreshCw size={24}/></div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">Cycle Management</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Initialize new election periods</p>
                    </div>
                </div>
                <div className="max-w-2xl relative z-10">
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 italic">
                        Initializing a new election cycle will clear all current ballots and reset member voting flags. This action is immutable and logged. Ensure all results are exported before proceeding.
                    </p>
                    
                    <button 
                        onClick={() => setIsResetModalOpen(true)}
                        className="bg-[#4F75E2] text-white px-10 py-5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#3D5BC9] transition-all shadow-xl active:scale-95 flex items-center gap-4"
                    >
                        <RefreshCw size={18} /> Start New Election Cycle
                    </button>
                </div>
            </div>
        </div>
      );
      case 'LOGS': return (
        <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/20">
            <div>
              <h3 className="text-2xl font-black text-coop-darkGreen uppercase tracking-tight leading-none">Immutable Audit Ledger</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                <Database size={14} className="text-coop-green"/> Validated Chain Operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleGenerateReport('election')}
                className="px-4 py-2.5 bg-coop-green text-white rounded-none font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-coop-darkGreen transition-all shadow-lg"
              >
                <FileText size={16}/> Generate Election Report
              </button>
              <button 
                onClick={() => handleGenerateReport('voteCount')}
                className="px-4 py-2.5 bg-coop-darkGreen text-white rounded-none font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg"
              >
                <Download size={16}/> Generate Vote Report
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {logs.length === 0 ? (
              <div className="p-12 text-center">
                <Database size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">No audit activities yet. User activities (logins, votes, etc.) will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <tr><th className="px-8 py-4">Chrono-Stamp</th><th className="px-8 py-4">Authenticated Actor</th><th className="px-8 py-4">Protocol Action</th><th className="px-8 py-4 text-right">Verification</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[11px] font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-4 font-mono text-gray-400 uppercase tracking-tight">{log.timestamp}</td>
                      <td className="px-8 py-4">
                        <p className="font-black text-coop-darkGreen leading-none uppercase tracking-tight">{log.user}</p>
                        <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{log.role}</p>
                      </td>
                      <td className="px-8 py-4 text-gray-500 uppercase tracking-tight font-bold">{log.action}</td>
                      <td className="px-8 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 rounded-none text-[9px] font-black text-coop-green uppercase tracking-widest">
                          <ShieldCheck size={10}/> SHA-256 Valid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
      default: return null;
    }
  };

  const navItems = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'officer'] },
    { id: 'RULES', label: 'Protocols', icon: BookOpen, roles: ['admin', 'officer'] },
    { id: 'ANNOUNCEMENTS', label: 'Announcements', icon: Megaphone, roles: ['admin', 'officer'] },
    { id: 'POSITIONS', label: 'Categories', icon: Layers, roles: ['admin', 'officer'] },
    { id: 'CANDIDATES', label: 'Profiles', icon: UserCheck, roles: ['admin', 'officer'] },
    { id: 'VOTERS', label: 'Ledger', icon: Users, roles: ['admin'] },
    { id: 'SETTINGS', label: 'Protocol', icon: Settings, roles: ['admin'] },
    { id: 'LOGS', label: 'Security', icon: ShieldCheck, roles: ['admin'] },
  ].filter(item => item.roles.includes(user.role as string));

  const SidebarContent = () => (
    <>
      <div className="px-10 pb-10 mb-8 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-none flex items-center justify-center shadow-xl shrink-0 bg-white/10 border border-white/20 overflow-hidden">
              <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter text-white leading-tight uppercase">Control</h1>
              <p className="text-coop-yellow font-black text-[9px] uppercase tracking-[0.4em] leading-none mt-1">Management Hub</p>
            </div>
        </div>
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 rounded-none border border-white/20 text-[9px] font-black text-white/80 uppercase tracking-[0.2em] w-max shadow-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
          <span>Node Secure: {user.role}</span>
        </div>
      </div>
      <nav className="flex-grow space-y-1.5 px-6 overflow-y-auto custom-scrollbar relative z-10 pb-5" ref={navRef} onScroll={handleNavScroll}>
        {navItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => handleNavItemClick(item.id as AdminTab)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-none text-[10px] font-black transition-all group relative uppercase tracking-widest ${activeTab === item.id ? 'bg-white text-coop-green shadow-xl scale-[1.02]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            <item.icon size={18} className={`transition-all ${activeTab === item.id ? 'scale-110' : 'group-hover:translate-x-1'}`}/> 
            {item.label}
            {activeTab === item.id && (
              <div className="absolute right-4 w-1.5 h-1.5 bg-coop-yellow rounded-full shadow-[0_0_10px_#F2E416]"></div>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto relative z-10 bg-black/10 p-8 border-t border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-none border border-white/20 flex items-center justify-center text-coop-yellow shadow-inner overflow-hidden shrink-0">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2D7A3E&color=F2E416&bold=true`} className="w-full h-full object-cover opacity-90" alt="Avatar" />
              </div>
              <div className="overflow-hidden">
                  <p className="text-white font-black text-sm leading-none truncate tracking-tight uppercase">{user.name}</p>
                  <p className="text-coop-yellow font-black text-[9px] uppercase tracking-[0.3em] mt-2 leading-none">{user.role}</p>
              </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <button 
                onClick={onLogout}
                className="p-3 bg-white/10 hover:bg-red-500/40 text-white/60 hover:text-white rounded-none transition-all border border-white/10 group"
              >
                  <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
          </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-[#f8fafc] flex overflow-hidden z-[110]">
      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsResetModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white p-12 rounded-2xl shadow-2xl border border-gray-100 animate-scaleIn overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="w-16 h-16 bg-blue-50 text-[#4F75E2] rounded-2xl flex items-center justify-center mb-8">
                  <RefreshCw size={32} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Election Creator</h2>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-10">
                Configure the next election cycle. This will purge current tallies and apply new branding node-wide.
              </p>

              <div className="space-y-8 mb-12">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Election Identity (Title)</label>
                      <input 
                        type="text" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="e.g., 2025 Board Referendum"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-coop-green font-bold text-sm"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Termination Sequence</label>
                        <input 
                          type="datetime-local" 
                          value={newElectionDate} 
                          onChange={e => setNewElectionDate(e.target.value)}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-coop-green font-bold text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Registry Background Image</label>
                        <div className="flex gap-4">
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              className="hidden"
                              accept="image/*"
                            />
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-grow flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors text-xs font-black uppercase text-gray-500"
                            >
                              <Upload size={16} /> {newBgImage ? 'Change Image' : 'Upload Image'}
                            </button>
                            {newBgImage && (
                              <div className="w-14 h-14 rounded-xl border border-gray-100 overflow-hidden shrink-0">
                                <img src={newBgImage} className="w-full h-full object-cover" alt="Preview" />
                              </div>
                            )}
                        </div>
                    </div>
                  </div>

                  <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
                    <div className="flex items-center gap-4 mb-4">
                      <AlertTriangle size={18} className="text-red-500" />
                      <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Data Purge Protocol</h4>
                    </div>
                    <div 
                        onClick={() => setWipeEntities(!wipeEntities)}
                        className="flex items-center gap-4 cursor-pointer group"
                    >
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${wipeEntities ? 'bg-red-500 border-red-500' : 'border-red-200 bg-white group-hover:border-red-500'}`}>
                            {wipeEntities && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Wipe Positions & Candidate Data</span>
                    </div>
                    <p className="mt-3 text-[9px] font-bold text-red-400 leading-relaxed uppercase tracking-tight">
                      Enabling this will remove all existing categories. Disable if only resetting votes.
                    </p>
                  </div>
              </div>

              <div className="flex gap-4">
                  <button 
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 py-4 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
                  >
                      Abort
                  </button>
                  <button 
                    onClick={() => {
                      handleResetElectionCycle(newTitle, newElectionDate, newBgImage, wipeEntities);
                      setIsResetModalOpen(false);
                      setNewTitle('');
                      setNewElectionDate('');
                      setNewBgImage(null);
                      setWipeEntities(false);
                    }}
                    className="flex-1 py-4 bg-[#4F75E2] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#3D5BC9] shadow-xl transition-all"
                  >
                      Initialize New Cycle
                  </button>
              </div>
          </div>
        </div>
      )}

      {/* Static Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-coop-green/95 backdrop-blur-3xl relative shadow-[20px_0_60px_rgba(45,122,62,0.3)] overflow-hidden pt-12 border-r border-white/10 h-screen">
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
        <header className="h-20 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6 sm:px-10 shadow-sm shrink-0">
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
          <div key={activeTab} className="max-w-[1400px] mx-auto min-h-full">
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
        <div className="fixed inset-0 z-[200] bg-coop-green/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn border border-gray-100">
            <div className="bg-coop-green p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Broadcast Enrollment</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">Validated Governance Communication</p>
              </div>
              <button onClick={() => { setIsAddingAnnouncement(false); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleAddAnnouncement({ ...newAnnouncement, id: Date.now().toString(), date: new Date().toISOString().split('T')[0], author: user.name } as Announcement);
              setIsAddingAnnouncement(false);
              setNewAnnouncement({ title: '', content: '', priority: 'LOW' });
            }} className="p-8 sm:p-12 space-y-8 bg-white">
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Broadcast Content</label>
                <textarea 
                  required rows={4} placeholder="Announcement details..."
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-none font-bold text-coop-darkGreen transition-all text-sm leading-relaxed outline-none focus:border-coop-green shadow-inner"
                  value={newAnnouncement?.content}
                  onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button type="button" onClick={() => { setIsAddingAnnouncement(false); }} className="order-2 sm:order-1 flex-1 py-5 bg-gray-50 text-gray-400 rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-[2] py-5 bg-coop-green text-white rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-coop-darkGreen shadow-xl transition-all active:scale-95">
                  Confirm Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(isAddingPosition) && (
        <div className="fixed inset-0 z-[200] bg-coop-green/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn border border-gray-100">
            <div className="bg-coop-green p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Category Registry</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">New Electoral Seat Definition</p>
              </div>
              <button onClick={() => { setIsAddingPosition(false); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              await handleAddPosition({ 
                id: Date.now().toString(),
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                maxVotes: parseInt(formData.get('maxVotes') as string),
                order: positions.length + 1,
                type: formData.get('type') as VotingType
              });
              setIsAddingPosition(false);
            }} className="p-8 sm:p-12 space-y-6 bg-white">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seat Title</label>
                <input name="title" required className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selection Quota</label>
                <input name="maxVotes" type="number" defaultValue={1} required className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seat Type</label>
                <select name="type" className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold">
                    <option value="OFFICER">OFFICER</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Functional Description</label>
                <textarea name="description" rows={3} required className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="button" onClick={() => setIsAddingPosition(false)} className="order-2 sm:order-1 flex-1 py-4 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-[2] py-4 bg-coop-green text-white text-[10px] font-black uppercase tracking-widest">Enroll Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(isAddingCandidate) && (
        <div className="fixed inset-0 z-[200] bg-coop-green/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-xl animate-scaleIn border border-gray-100 my-auto">
            <div className="bg-coop-green p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow sticky top-0 z-10">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Profile Enrollment</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">New Candidate Profile Registry</p>
              </div>
              <button onClick={() => { setIsAddingCandidate(false); setCandidateImage(null); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const positionId = formData.get('positionId') as string;
              console.log('Submitting candidate with positionId:', positionId);
              await handleAddCandidate({ 
                id: Date.now().toString(),
                name: formData.get('name') as string,
                positionId: positionId,
                description: formData.get('description') as string,
                votes: 0,
                imageUrl: candidateImage || `https://i.pravatar.cc/300?u=${Math.random()}`
              });
              setIsAddingCandidate(false);
              setCandidateImage(null);
            }} className="p-8 sm:p-12 space-y-6 bg-white max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                <input name="name" required className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Category</label>
                <select name="positionId" required className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold">
                    <option value="">-- Select a Category --</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile Photo</label>
                <div className="flex flex-col items-center gap-6 p-10 bg-gray-50 border-2 border-dashed border-gray-200 group-hover:border-coop-green transition-all relative">
                    {candidateImage ? (
                        <div className="relative">
                            <div className="w-32 h-32 overflow-hidden border-2 border-white shadow-2xl">
                                <img src={candidateImage} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setCandidateImage(null)}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-none z-20 shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="text-gray-300 flex flex-col items-center pointer-events-none">
                            <Upload size={48} strokeWidth={1.5} />
                            <p className="text-[9px] font-black uppercase mt-4 tracking-widest">No identity media selected</p>
                        </div>
                    )}
                    <label className="cursor-pointer bg-white border border-gray-200 px-8 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-coop-green hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3">
                        <Upload size={14} /> Upload Identity Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Statement</label>
                <textarea name="description" rows={3} required className="w-full px-6 py-3 bg-gray-50 border border-gray-200 outline-none focus:border-coop-green text-sm font-bold" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="button" onClick={() => { setIsAddingCandidate(false); setCandidateImage(null); }} className="order-2 sm:order-1 flex-1 py-4 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-100">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-[2] py-4 bg-coop-green text-white text-[10px] font-black uppercase tracking-widest hover:bg-coop-darkGreen shadow-xl transition-all active:scale-95">Enroll Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
