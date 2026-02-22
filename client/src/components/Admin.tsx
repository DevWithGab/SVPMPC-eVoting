import React, { useState, useEffect, useCallback } from 'react';
import { VotingType } from '../types.ts';
import type { User, Candidate, Position, Announcement, Rule, VotingMode, VotingStatus } from '../types.ts';
import { userAPI, electionAPI, positionAPI, candidateAPI, announcementAPI, ruleAPI, voteAPI, reportAPI, activityAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import { BulkImportUpload } from './BulkImportUpload';
import { ImportHistoryView } from './ImportHistoryView';
import { ImportDetailView } from './ImportDetailView';
import { MemberStatusDashboard } from './MemberStatusDashboard';
import {
  Settings, Users, Download,
  LayoutDashboard, UserCheck, ShieldCheck, Activity, Search,
  CheckCircle, X, Trash2,
  Database, Lock, PlusCircle, ShieldAlert,
  Layers,
  FileText, Camera, Upload,
  Terminal, LogOut, Megaphone, BookOpen,
  UserPlus, Menu, Clock,
  Briefcase, Edit3, ListOrdered, FilePlus, ChevronRight, Calendar,
  MapPin, TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';


interface AdminProps {
  user: User;
  onLogout: () => void;
}

type AdminTab = 'OVERVIEW' | 'VOTERS' | 'ELECTION' | 'ANNOUNCEMENTS' | 'RULES' | 'SETTINGS' | 'LOGS' | 'BULK_IMPORT' | 'MEMBER_STATUS';

export const Admin: React.FC<AdminProps> = ({ user, onLogout }) => {
  const { isDarkMode } = useDarkMode();
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
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  // Modal state
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isAddElectionOpen, setIsAddElectionOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [candidateModal, setCandidateModal] = useState<{ isOpen: boolean; positionId: string | null }>({ isOpen: false, positionId: null });

  // Election state
  const [newElection, setNewElection] = useState<Partial<any>>({ title: '', description: '', startDate: '', endDate: '', backgroundImage: null });
  const [electionBackgroundImage, setElectionBackgroundImage] = useState<File | null>(null);
  const [electionBackgroundPreview, setElectionBackgroundPreview] = useState<string>('');
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
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; user: string; role: string; action: string }>>([]);

  const canManageSystem = user.role === 'admin' || user.role === 'officer';

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
      setSelectedImportId(null);
      // End transition after new content loads
      setIsTransitioning(false);
    }, 150);
  };

  const handleImportNavigation = (view: string, importId?: string) => {
    if (view === 'import-history') {
      setSelectedImportId(null);
    } else if (view === 'import-detail' && importId) {
      setSelectedImportId(importId);
    }
  };

  // Define fetchAllData with useCallback to maintain stable reference
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, electionsData, positionsData, candidatesData, rulesData, announcementsData, votesData, activitiesData] = await Promise.all([
        userAPI.getUsers().catch((err) => { console.error('[fetchAllData] getUsers failed:', err?.response?.status, err?.message); return []; }),
        electionAPI.getElections().catch(() => []),
        positionAPI.getPositions().catch(() => []),
        candidateAPI.getCandidates().catch(() => []),
        ruleAPI.getRules().catch(() => []),
        announcementAPI.getAnnouncements().catch(() => []),
        voteAPI.getAllVotes().catch(() => []),
        activityAPI.getActivities().catch(() => [])
      ]);

      // Helper: resolve a MongoDB document ID that may be a nested object or a plain string.
      // IMPORTANT: Use || not ?? because Mongoose populated objects can have _id = '' (empty string).
      // Mongoose exposes a virtual .id (string) on populated subdocs, not ._id.
      const resolveId = (ref: any): string | undefined =>
        ref?.id || ref?._id || (typeof ref === 'string' ? ref : undefined);

      // Helper: check if a specific user has cast a vote in a specific election
      const userHasVotedInElection = (userId: string, electionId: string): boolean =>
        votesData.some((v: any) =>
          resolveId(v.userId) === userId && resolveId(v.electionId) === electionId
        );

      // Get the current election to check votes against (active, paused, or most-recent completed)
      const activeElection =
        electionsData.find((e: any) => e.status === 'active') ??
        electionsData.find((e: any) => e.status === 'paused') ??
        electionsData.find((e: any) => e.status === 'completed');
      const activeElectionId = resolveId(activeElection);

      const mappedUsers: User[] = usersData.map((u: any) => {
        const userId = resolveId(u) ?? '';
        const hasVoted = activeElectionId
          ? userHasVotedInElection(userId, activeElectionId)
          : false;

        return {
          id: userId,
          name: u.fullName || u.username,
          email: u.email,
          role: u.role,
          hasVoted,
          username: u.username,
          fullName: u.fullName,
          isActive: u.isActive,
          address: u.address
        };
      });

      const byAscendingOrder = (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0);

      const mappedPositions: Position[] = positionsData
        .sort(byAscendingOrder)
        .map((p: any) => ({
          id: resolveId(p) ?? '',
          electionId: resolveId(p.electionId),
          title: p.title,
          description: p.description ?? '',
          maxVotes: 1,
          order: p.order ?? 0,
          type: 'OFFICER' as const,
          status: 'active'
        }));

      // Tally how many votes each candidate received
      const voteCountByCandidateId = votesData.reduce(
        (tally: Record<string, number>, vote: any) => {
          tally[vote.candidateId] = (tally[vote.candidateId] ?? 0) + 1;
          return tally;
        },
        {} as Record<string, number>
      );

      const mappedCandidates: Candidate[] = candidatesData.map((c: any) => {
        const candidateId = resolveId(c) ?? '';
        return {
          id: candidateId,
          name: c.name,
          description: c.description ?? '',
          positionId: resolveId(c.positionId),
          votes: voteCountByCandidateId[candidateId] ?? 0,
          imageUrl: c.photoUrl,
          photoUrl: c.photoUrl
        };
      });

      setUsers(mappedUsers);
      console.log('[fetchAllData] usersData.length:', usersData.length, '| mappedUsers.length:', mappedUsers.length);
      setPositions(mappedPositions);
      setCandidates(mappedCandidates);
      setVotes(votesData);
      // Exclude sub-elections (those linked to a parent) and deduplicate by ID
      const topLevelElections = electionsData.filter((e: any) => !e.parentElectionId);
      const electionById = new Map(topLevelElections.map((e: any) => [resolveId(e), e]));

      const resolveElectionDate = (e: any): number =>
        new Date(e.createdAt ?? e.startDate ?? 0).getTime();

      const byOldestFirst = (a: any, b: any) => resolveElectionDate(a) - resolveElectionDate(b);

      const uniqueElections = Array.from(electionById.values()).sort(byOldestFirst);

      setElections(uniqueElections);

      setRules(rulesData.map((r: any) => ({
        id: resolveId(r) ?? '',
        title: r.title,
        content: r.content,
        order: r.order
      })));

      setAnnouncements(announcementsData.map((ann: any) => ({
        id: resolveId(ann) ?? '',
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        date: ann.date,
        author: ann.author
      })));


      // Set voting status based on active elections
      // 'paused' elections should show as PAUSED on the admin dashboard
      const hasOpenElection = electionsData.some((e: any) => e.status === 'active');
      setVotingStatus(hasOpenElection ? 'OPEN' : 'PAUSED');

      // Step 1: Count total voters and voted voters per branch
      const branchStats: Record<string, { totalVoters: number; votedCount: number }> = {};

      for (const user of mappedUsers) {
        const branch = user.address || 'Not Provided';

        // Initialize branch entry if it doesn't exist yet
        if (!branchStats[branch]) {
          branchStats[branch] = { totalVoters: 0, votedCount: 0 };
        }

        branchStats[branch].totalVoters++;

        if (user.hasVoted) {
          branchStats[branch].votedCount++;
        }
      }

      // Step 2: Convert branch stats into the format the chart expects
      const branchChartData = Object.entries(branchStats).map(([branchName, stats]) => {
        const participationRate =
          stats.totalVoters > 0
            ? Math.round((stats.votedCount / stats.totalVoters) * 100)
            : 0;

        return {
          name: branchName,
          voters: stats.totalVoters,
          participation: participationRate
        };
      });

      // Step 3: Sort by participation rate, highest first
      branchChartData.sort((a, b) => b.participation - a.participation);

      setBranchData(branchChartData);



      // Converts a UTC date string into the "YYYY-MM-DDTHH:mm" format
      // that the datetime-local input field requires
      const formatToDatetimeLocal = (utcDateString: string): string => {
        const utcDate = new Date(utcDateString);
        const tzOffsetMs = utcDate.getTimezoneOffset() * 60000;
        const localDate = new Date(utcDate.getTime() - tzOffsetMs);

        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const hours = String(localDate.getHours()).padStart(2, '0');
        const minutes = String(localDate.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      if (activeElection) {
        if (activeElection.endDate) {
          const endDateForInput = formatToDatetimeLocal(activeElection.endDate);
          setElectionEndDate(endDateForInput);
          setOriginalEndDate(endDateForInput);
        }
        setHasEndDateChanged(false);
      }

      const mappedLogs = activitiesData.map((activity: any) => {
        const activityUser = activity.userId;
        const displayName = activityUser?.fullName || activityUser?.username || 'Unknown User';
        const userRole = activityUser?.role || 'member';

        const timestamp = new Date(activity.createdAt).toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        return {
          id: resolveId(activity) ?? '',
          timestamp,
          user: displayName,
          role: userRole,
          action: activity.description || activity.action
        };
      });

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

  // Check every 5 seconds if any upcoming election has passed its start date,
  // and auto-activate it if so
  useEffect(() => {
    const activateElectionsWhoseStartDateHasPassed = () => {
      const now = new Date().getTime();

      for (const election of elections) {
        const electionId = election._id || election.id;

        // Skip elections that are already running, done, or admin-paused
        const skipStatuses = ['active', 'completed', 'paused', 'cancelled'];
        if (!election.startDate || skipStatuses.includes(election.status)) continue;

        // Skip if we already triggered activation for this election
        const alreadyActivated = completedElectionsRef.current.has(electionId);
        if (alreadyActivated) continue;

        const startTime = new Date(election.startDate).getTime();
        const hasStartTimePassed = startTime <= now;

        if (hasStartTimePassed) {
          activateElectionAutomatically(electionId);
        }
      }
    };

    activateElectionsWhoseStartDateHasPassed();
    const interval = setInterval(activateElectionsWhoseStartDateHasPassed, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [elections, activateElectionAutomatically]);

  // Auto-complete election when end date is reached
  useEffect(() => {
    const checkElectionCompletion = async () => {
      const now = new Date().getTime();
      for (const election of elections) {
        const electionId = election._id || election.id;
        // Skip elections that are completed, cancelled, or admin-paused
        const skipStatuses = ['completed', 'cancelled', 'paused'];
        if (!election.endDate || skipStatuses.includes(election.status)) continue;

        const endTime = new Date(election.endDate).getTime();
        if (endTime <= now && !completedElectionsRef.current.has(electionId)) {
          // Election has reached its end date - auto-complete
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


  const handleAddAnnouncement = async (ann: Announcement) => {
    try {

      await announcementAPI.createAnnouncement({
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        date: ann.date,
        author: ann.author,
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
    // Target the most recent active/paused/completed election — not always elections[0]
    const newestFirst = [...elections].reverse();
    const targetElection =
      newestFirst.find((e: any) => e.status === 'active') ??
      newestFirst.find((e: any) => e.status === 'paused') ??
      newestFirst.find((e: any) => e.status === 'completed') ??
      newestFirst[0];

    if (!targetElection) {
      Swal.fire('Error', 'No election found', 'error');
      return;
    }

    // Declare electionId outside try/catch so the catch block can reference it
    const electionId = (targetElection as any)._id || (targetElection as any).id;

    try {
      // Update UI immediately — update only the targeted election
      const updatedElections = elections.map((el: any) =>
        (el._id || el.id) === electionId ? { ...el, resultsPublic: newValue } : el
      );
      setElections(updatedElections);

      await electionAPI.updateElection(electionId, { resultsPublic: newValue });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: newValue ? 'Results are now publicly visible' : 'Results are now hidden from public',
        confirmButtonColor: '#2D7A3E',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      // Revert UI on error
      const revertedElections = elections.map((el: any) =>
        (el._id || el.id) === electionId ? { ...el, resultsPublic: !newValue } : el
      );
      setElections(revertedElections);

      Swal.fire('Error', error.response?.data?.message || 'Failed to update results visibility', 'error');
    }
  };

  const handlePauseElection = async () => {
    try {
      // Find election that is either active or paused (admin-suspended)
      const currentElection = elections.find((e: any) =>
        e.status === 'active' || e.status === 'paused'
      );

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
      // Use a dedicated 'paused' status — this is the key fix.
      // Previously we used 'upcoming', which caused the backend auto-activator
      // to silently flip the election back to 'active' on every GET /elections call.
      const newStatus = isCurrentlyActive ? 'paused' : 'active';

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


  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm)
  );


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setNewCandidate({ ...newCandidate, imageUrl: imageData });
        setCandidateImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleElectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setElectionBackgroundImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setElectionBackgroundPreview(imageData);
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
        backgroundImage: electionBackgroundImage || undefined,
      });

      await fetchAllData();
      setIsAddElectionOpen(false);
      setNewElection({ title: '', description: '', startDate: '', endDate: '', backgroundImage: null });
      setElectionBackgroundImage(null);
      setElectionBackgroundPreview('');

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
    switch (activeTab) {
      case 'OVERVIEW': return (
        <div className="space-y-12 animate-fadeIn">
          <div className={`border p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 flex items-center justify-center transition-colors duration-300 ${votingStatus === 'OPEN' ? isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-green text-white' : 'bg-red-500 text-white'}`}>
                {votingStatus === 'OPEN' ? <Activity size={24} /> : <Lock size={24} />}
              </div>
              <div>
                <h2 className={`text-xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
                  System Registry Status: {votingStatus === 'OPEN' ? 'Operational' : 'Secured'}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Node: BAT-001</span>
                  <span className={`w-1 h-1 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></span>
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>Uplink Stable</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              {(() => {
                // Show button for active or admin-paused elections
                const currentElection = elections.find((e: any) => e.status === 'active' || e.status === 'paused');
                const isActive = currentElection?.status === 'active';
                return currentElection ? (
                  <button
                    onClick={handlePauseElection}
                    className={`px-6 py-3 font-semibold text-sm transition-all ${isActive
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : isDarkMode ? 'bg-coop-yellow hover:bg-coop-yellow/80 text-slate-900' : 'bg-coop-green hover:bg-coop-green/80 text-white'
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
              // Search newest-first: active election → paused → most-recent completed.
              // This way stat cards persist the last election's numbers after it ends,
              // and naturally reset to the new election when a fresh active one starts.
              const newestFirst = [...elections].reverse();
              const currentElection =
                newestFirst.find((e: any) => e.status === 'active') ??
                newestFirst.find((e: any) => e.status === 'paused') ??
                newestFirst.find((e: any) => e.status === 'completed');

              const currentElectionId = currentElection?._id || currentElection?.id;
              const currentStatus = currentElection?.status;

              // Candidates for the current election (active or most-recent completed)
              const currentCandidatesCount = currentElection
                ? candidates.filter((c: any) => {
                  const candElectionId = typeof c.electionId === 'string'
                    ? c.electionId
                    : (c.electionId?._id || c.electionId?.id || c.positionId);
                  return candElectionId === currentElectionId;
                }).length
                : 0;

              // Ballots cast in the current election (persists after election ends)
              const committedBallots = currentElection
                ? (votes?.filter((v: any) => {
                  const voteElectionId = typeof v.electionId === 'string'
                    ? v.electionId
                    : (v.electionId?._id || v.electionId?.id);
                  return voteElectionId === currentElectionId;
                }).length || 0)
                : 0;

              // Status badge label & colour for the "Election Status" card
              const statusLabel =
                currentStatus === 'active' ? 'Live' :
                  currentStatus === 'paused' ? 'Paused' :
                    currentStatus === 'completed' ? 'Final' : 'None';
              const statusColor =
                currentStatus === 'active' ? 'text-green-500' :
                  currentStatus === 'paused' ? (isDarkMode ? 'text-coop-yellow' : 'text-amber-500') :
                    currentStatus === 'completed' ? (isDarkMode ? 'text-slate-400' : 'text-gray-400') :
                      (isDarkMode ? 'text-slate-600' : 'text-gray-300');

              const stats = [
                { label: 'Authorized Voters', val: users.length, icon: Users, badge: null },
                { label: 'Committed Ballots', val: committedBallots, icon: CheckCircle, badge: null },
                { label: 'Election Status', val: currentElection ? 1 : 0, icon: Layers, badge: { label: statusLabel, color: statusColor } },
                { label: 'Candidates Running', val: currentCandidatesCount, icon: UserCheck, badge: null },
              ];

              return stats.map((stat) => (
                <div key={stat.label} className={`border p-8 hover:border-coop-green transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <stat.icon size={18} className={`transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                    {stat.badge ? (
                      <span className={`text-[9px] font-black uppercase tracking-widest ${stat.badge.color} flex items-center gap-1`}>
                        {stat.badge.label === 'Live' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        )}
                        {stat.badge.label}
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>0.0{stat.val % 9}</span>
                    )}
                  </div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{stat.label}</p>
                  <p className={`text-4xl font-black tracking-tighter transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>{stat.val.toLocaleString()}</p>
                </div>
              ));
            })()}
          </div>

          {/* New Card-Based Charts Section */}
          <div className="space-y-6">
            {/* Voter Turnout Trend & Overall Participation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className={`lg:col-span-2 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Voter Turnout Trend</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {(() => {
                          const newestFirst = [...elections].reverse();
                          const activeElection =
                            newestFirst.find((e: any) => e.status === 'active') ??
                            newestFirst.find((e: any) => e.status === 'paused') ??
                            newestFirst.find((e: any) => e.status === 'completed');
                          return activeElection?.title || 'No active election';
                        })()}
                      </CardDescription>
                    </div>
                    {(() => {
                      const newestFirst = [...elections].reverse();
                      const activeElection =
                        newestFirst.find((e: any) => e.status === 'active') ??
                        newestFirst.find((e: any) => e.status === 'paused') ??
                        newestFirst.find((e: any) => e.status === 'completed');
                      return activeElection?.status === 'active' ? (
                        <Badge variant="outline" className="font-mono text-xs">LIVE</Badge>
                      ) : null;
                    })()}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-4">
                    {(() => {
                      const newestFirst = [...elections].reverse();
                      const activeElection =
                        newestFirst.find((e: any) => e.status === 'active') ??
                        newestFirst.find((e: any) => e.status === 'paused') ??
                        newestFirst.find((e: any) => e.status === 'completed');
                      const activeElectionId = activeElection?._id || activeElection?.id;
                      const electionVotes = (votes?.filter((v: any) => {
                        const vid = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
                        return vid === activeElectionId;
                      }) || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      const buckets: { name: string; votes: number }[] = [];
                      if (electionVotes.length > 0) {
                        const seen = new Set<string>();
                        const byHour: Record<string, number> = {};
                        electionVotes.forEach((v: any) => {
                          const userId: string = v.userId?.id || v.userId?._id || v.userId;
                          if (!seen.has(userId)) {
                            seen.add(userId);
                            const d = new Date(v.createdAt);
                            const key = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
                            byHour[key] = (byHour[key] || 0) + 1;
                          }
                        });
                        let cum = 0;
                        Object.entries(byHour).forEach(([time, count]) => {
                          cum += count;
                          buckets.push({ name: time, votes: cum });
                        });
                      }

                      const voterTurnoutData = buckets.length > 0 ? buckets : [{ name: 'Start', votes: 0 }];

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={voterTurnoutData}>
                            <defs>
                              <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid hsl(var(--border))',
                                backgroundColor: 'hsl(var(--card))',
                                boxShadow: 'var(--shadow-lg)'
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="votes" 
                              stroke="hsl(var(--chart-1))" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorVotes)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Overall Participation</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">Total progress toward goal</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-4">
                  {(() => {
                    const newestFirst = [...elections].reverse();
                    const activeElection =
                      newestFirst.find((e: any) => e.status === 'active') ??
                      newestFirst.find((e: any) => e.status === 'paused') ??
                      newestFirst.find((e: any) => e.status === 'completed');
                    const activeElectionId = activeElection?._id || activeElection?.id;
                    const electionVotes = votes?.filter((v: any) => {
                      const vid = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
                      return vid === activeElectionId;
                    }) || [];
                    const uniqueVoters = new Set(
                      electionVotes.map((v: any) => v.userId?.id || v.userId?._id || v.userId)
                    ).size;
                    const totalMembers = users.length;
                    const pct = totalMembers > 0 ? Math.min(Math.round((uniqueVoters / totalMembers) * 100), 100) : 0;
                    const remaining = totalMembers - uniqueVoters;

                    const COLORS = ['hsl(var(--chart-1))', '#E5E7EB'];
                    const participationData = [
                      { name: 'Voted', value: uniqueVoters },
                      { name: 'Remaining', value: remaining }
                    ];

                    return (
                      <>
                        <div className="h-[220px] w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={participationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={6}
                              >
                                {participationData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  borderRadius: '12px', 
                                  border: '1px solid hsl(var(--border))',
                                  backgroundColor: 'hsl(var(--card))' 
                                }} 
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
                            <span className="text-4xl font-bold" style={{ color: 'hsl(var(--chart-1))' }}>{pct}%</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Turnout</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-6">
                          <div className="flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: 'hsl(var(--chart-1) / 0.1)' }}>
                            <span className="text-2xl font-bold" style={{ color: 'hsl(var(--chart-1))' }}>{uniqueVoters}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Voted</span>
                          </div>
                          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
                            <span className="text-2xl font-bold">{remaining}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Remaining</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Branch Distribution & Hourly Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={`shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" style={{ color: 'hsl(var(--chart-1))' }} />
                    <div>
                      <CardTitle className="text-lg font-semibold">Branch Distribution</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">Vote distribution by cooperative branch</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {(() => {
                      const branchChartData = branchData.map((branch: any, index: number) => {
                        const colors = [
                          'hsl(var(--chart-1))',
                          'hsl(var(--chart-2))',
                          'hsl(var(--chart-3))',
                          'hsl(var(--chart-4))',
                          'hsl(var(--chart-5))'
                        ];
                        return {
                          name: branch.name,
                          value: Math.round(branch.voters * branch.participation / 100),
                          color: colors[index % colors.length]
                        };
                      });

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={branchChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              axisLine={false} 
                              tickLine={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              width={80}
                            />
                            <Tooltip 
                              cursor={{ fill: 'transparent' }}
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid hsl(var(--border))',
                                backgroundColor: 'hsl(var(--card))' 
                              }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                              {branchChartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: 'hsl(var(--chart-1))' }} />
                    <div>
                      <CardTitle className="text-lg font-semibold">Hourly Activity</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">Voting intensity throughout the day</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {(() => {
                      const newestFirst = [...elections].reverse();
                      const activeElection =
                        newestFirst.find((e: any) => e.status === 'active') ??
                        newestFirst.find((e: any) => e.status === 'paused') ??
                        newestFirst.find((e: any) => e.status === 'completed');
                      const activeElectionId = activeElection?._id || activeElection?.id;
                      const electionVotes = (votes?.filter((v: any) => {
                        const vid = typeof v.electionId === 'string' ? v.electionId : (v.electionId?._id || v.electionId?.id);
                        return vid === activeElectionId;
                      }) || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      const hourlyData: { time: string; count: number }[] = [];
                      if (electionVotes.length > 0) {
                        const byHour: Record<string, number> = {};
                        electionVotes.forEach((v: any) => {
                          const d = new Date(v.createdAt);
                          const key = `${d.getHours()}:00`;
                          byHour[key] = (byHour[key] || 0) + 1;
                        });
                        Object.entries(byHour).forEach(([time, count]) => {
                          hourlyData.push({ time, count });
                        });
                      }

                      const chartData = hourlyData.length > 0 ? hourlyData : [{ time: '0:00', count: 0 }];

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="time" 
                              axisLine={false} 
                              tickLine={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid hsl(var(--border))',
                                backgroundColor: 'hsl(var(--card))' 
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="count" 
                              stroke="hsl(var(--chart-1))" 
                              strokeWidth={3}
                              dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Official Documents Section */}
          <div className={`border p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`mb-6 border-b pb-6 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <h3 className={`text-xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Official Document Templates</h3>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Professional cooperative documents</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={async () => {
                  try {
                    const { ProclamationTemplate } = await import('../utils/proclamationTemplate');
                    const { pdf } = await import('@react-pdf/renderer');
                    const doc = React.createElement(ProclamationTemplate, { isTemplate: true });
                    const pdfBlob = await pdf(doc).toBlob();
                    const url = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `SVMPC-Official-Proclamation-Template-${new Date().toISOString().split('T')[0]}.pdf`;
                    link.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Error downloading proclamation template:', error);
                    Swal.fire('Error', 'Failed to download proclamation template', 'error');
                  }
                }}
                className={`p-6 border-2 border-dashed text-left transition-all hover:scale-105 group ${isDarkMode ? 'border-slate-600 hover:border-coop-yellow bg-slate-700/50' : 'border-gray-200 hover:border-coop-green bg-gray-50/50'}`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 flex items-center justify-center transition-colors ${isDarkMode ? 'bg-coop-yellow text-slate-900 group-hover:bg-coop-yellow/80' : 'bg-coop-green text-white group-hover:bg-coop-darkGreen'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow group-hover:text-white' : 'text-gray-900'}`}>Proclamation Template</h4>
                    <p className={`text-[10px] font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Official cooperative proclamation document</p>
                  </div>
                </div>
                <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isDarkMode ? 'text-slate-400 group-hover:text-coop-yellow' : 'text-gray-400 group-hover:text-coop-green'}`}>
                  <Download size={12} />
                  Download PDF Template
                </div>
              </button>
              
              {/* Placeholder for future templates */}
              <div className={`p-6 border-2 border-dashed opacity-50 ${isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/30'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 flex items-center justify-center ${isDarkMode ? 'bg-slate-600 text-slate-400' : 'bg-gray-200 text-gray-400'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Certificate Template</h4>
                    <p className={`text-[10px] font-medium mt-1 ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>Coming soon</p>
                  </div>
                </div>
              </div>
              
              <div className={`p-6 border-2 border-dashed opacity-50 ${isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/30'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 flex items-center justify-center ${isDarkMode ? 'bg-slate-600 text-slate-400' : 'bg-gray-200 text-gray-400'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Resolution Template</h4>
                    <p className={`text-[10px] font-medium mt-1 ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>Coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      case 'VOTERS': return (
        <div className={`border animate-fadeIn transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-10 border-b flex flex-col md:flex-row justify-between items-center gap-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-coop-darkGreen text-white flex items-center justify-center font-black">L</div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Member Ledger</h3>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Authorized Profile Registry</p>
              </div>
            </div>
            <div className="relative w-full md:w-80">
              <Search size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`} />
              <input
                type="text" placeholder="Filter by ID or Name" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none transition-all border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-coop-green'}`}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`border-b text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50/50 border-gray-100 text-gray-400'}`}>
                <tr>
                  <th className="px-10 py-5">Identity Profile</th>
                  <th className="px-10 py-5">System Status</th>
                  <th className="px-10 py-5">Clearance</th>
                  <th className="px-10 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-slate-700' : 'divide-gray-50'}`}>
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`transition-colors group ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/30'}`}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 flex items-center justify-center font-black text-[10px] transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-400'}`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-black uppercase tracking-tight leading-none text-sm transition-colors duration-300 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{u.name}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className={`inline-flex items-center gap-2 font-black text-[9px] uppercase tracking-widest transition-colors duration-300 ${u.hasVoted ? isDarkMode ? 'text-coop-yellow' : 'text-coop-green' : isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${u.hasVoted ? isDarkMode ? 'bg-coop-yellow shadow-[0_0_8px_#fbbf24]' : 'bg-coop-green shadow-[0_0_8px_#2D7A3E]' : isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
                        {u.hasVoted ? 'Committed' : 'Awaiting'}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      {canManageSystem && (
                        <button onClick={() => handleDeleteUser(u.id)} className={`p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
                          <Trash2 size={14} />
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
        <div className={`animate-fadeIn h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-8 pb-10 transition-colors duration-300 ${isDarkMode ? '' : ''}`}>
          {/* LEFT COLUMN: ELECTION LIST */}
          <div className={`w-full md:w-80 border shadow-sm flex flex-col shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-6 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50/50 border-gray-100'}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-gray-900'}`}>
                <Briefcase size={14} /> Registry
              </h3>
              <button
                onClick={() => setIsAddElectionOpen(true)}
                className={`transition-all p-2 rounded ${isDarkMode ? 'text-coop-yellow hover:bg-coop-yellow/10' : 'text-coop-green hover:bg-coop-green/10'}`}
              >
                <PlusCircle size={16} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-2">
              {[...elections].sort((a, b) => {
                // Sort descending by creation time using createdAt or MongoDB ObjectId
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : parseInt((a._id || a.id).slice(0, 8), 16) * 1000;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : parseInt((b._id || b.id).slice(0, 8), 16) * 1000;
                return bTime - aTime;
              }).map(election => (
                <div
                  key={election._id || election.id}
                  onClick={() => setSelectedElectionId(election._id || election.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all group ${selectedElectionId === (election._id || election.id)
                    ? isDarkMode ? 'bg-coop-yellow/10 border-coop-yellow shadow-sm' : 'bg-coop-green/5 border-coop-green shadow-sm'
                    : isDarkMode ? 'bg-slate-700 border-slate-600 hover:border-slate-500' : 'bg-white border-gray-100 hover:border-gray-300'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${election.status === 'active' ? 'bg-green-100 text-green-700' :
                      election.status === 'completed' ? isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500' :
                        isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-yellow-50 text-yellow-600'
                      }`}>
                      {election.status}
                    </span>
                    <span className={`text-[9px] font-mono transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>ID-{(election._id || election.id).slice(-4)}</span>
                  </div>
                  <h4 className={`text-xs font-bold uppercase tracking-tight mb-1 transition-colors duration-300 ${selectedElectionId === (election._id || election.id) ? isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen' : isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {election.title}
                  </h4>
                  <p className={`text-[9px] truncate transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{election.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAIL & POSITIONS */}
          <div className={`flex-grow border shadow-sm flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            {selectedElection ? (
              <>
                {/* Detail Header */}
                <div className={`p-8 border-b flex justify-between items-start transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50/30 border-gray-100'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className={`text-2xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>{selectedElection.title}</h2>
                      <button className={`transition-colors ${isDarkMode ? 'text-slate-400 hover:text-coop-yellow' : 'text-gray-300 hover:text-coop-green'}`}><Edit3 size={14} /></button>
                    </div>
                    <p className={`text-xs font-medium mb-4 max-w-2xl transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{selectedElection.description}</p>
                    <div className={`flex items-center gap-6 text-[10px] font-mono font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
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
                <div className={`flex-grow overflow-y-auto custom-scrollbar p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50/10'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
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
                      className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${selectedElection?.status === 'completed'
                        ? isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-500 cursor-not-allowed' : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                        : isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:text-coop-yellow hover:border-coop-yellow' : 'bg-white border border-gray-200 text-gray-600 hover:text-coop-green hover:border-coop-green'
                        }`}
                      title={selectedElection?.status === 'completed' ? 'Cannot add positions to completed elections' : 'Add a new position'}
                    >
                      <PlusCircle size={12} /> Add Position
                    </button>
                  </div>

                  <div className="space-y-6">
                    {currentPositions.sort((a, b) => (a.order || 0) - (b.order || 0)).map((pos) => (
                      <div key={pos.id} className={`rounded-lg shadow-sm overflow-hidden group transition-all duration-300 border ${isDarkMode ? 'bg-slate-700 border-slate-600 hover:border-coop-yellow' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                        <div className={`p-5 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-600 border-slate-500' : 'bg-gray-50/50 border-gray-50'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 border flex items-center justify-center font-black text-xs transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-white border-gray-200 text-gray-400'}`}>
                              {candidates.filter(c => c.positionId === pos.id).length}
                            </div>
                            <div>
                              <h4 className={`text-sm font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{pos.title}</h4>
                              <span className={`text-[9px] font-mono transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{pos.maxVotes} Selection(s) • {pos.type}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCandidateModal({ isOpen: true, positionId: pos.id })}
                              disabled={elections.some((e: any) => e.status === 'active') || selectedElection?.status === 'completed'}
                              className={`p-2 transition-colors ${elections.some((e: any) => e.status === 'active') || selectedElection?.status === 'completed'
                                ? isDarkMode ? 'text-slate-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                                : isDarkMode ? 'text-slate-400 hover:text-coop-yellow' : 'text-gray-300 hover:text-[#4F75E2]'
                                }`}
                              title={
                                selectedElection?.status === 'completed'
                                  ? 'Cannot add candidates to completed elections'
                                  : elections.some((e: any) => e.status === 'active')
                                    ? 'Cannot add candidates while election is active'
                                    : 'Add candidate'
                              }
                            >
                              <UserPlus size={16} />
                            </button>
                            <button onClick={() => onDeletePosition(pos.id)} disabled={selectedElection?.status === 'completed'} className={`p-2 transition-colors ${selectedElection?.status === 'completed' ? isDarkMode ? 'text-slate-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed' : isDarkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-300 hover:text-red-500'}`}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className={`p-5 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {candidates.filter(c => c.positionId === pos.id).length > 0 ? (
                              candidates.filter(c => c.positionId === pos.id).map(cand => (
                                <div key={cand.id} className={`flex items-center gap-3 p-3 border rounded transition-colors group/cand ${isDarkMode ? 'bg-slate-600 border-slate-500 hover:bg-slate-500' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                                  <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ${isDarkMode ? 'bg-slate-500' : 'bg-gray-200'}`}>
                                    {cand.imageUrl ? <img src={cand.imageUrl} className="w-full h-full object-cover" /> : <UserCheck size={14} className="m-auto mt-2 text-gray-400" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-xs font-bold truncate transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{cand.name}</p>
                                  </div>
                                  <button onClick={() => onDeleteCandidate(cand.id)} className={`ml-auto transition-opacity opacity-0 group-hover/cand:opacity-100 ${isDarkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-300 hover:text-red-500'}`}>
                                    <X size={14} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className={`col-span-full text-center py-4 border border-dashed text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'border-slate-600 text-slate-500' : 'border-gray-100 text-gray-300'}`}>
                                No candidates registered
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {currentPositions.length === 0 && (
                      <div className="py-20 text-center opacity-30">
                        <Layers size={48} className={`mx-auto mb-4 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                        <p className={`text-sm font-bold uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No positions configured for this election cycle</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={`flex-grow flex flex-col items-center justify-center opacity-30 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <Briefcase size={64} className={`mb-6 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`} />
                <p className={`text-sm font-bold uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Select an election from the registry to manage</p>
              </div>
            )}
          </div>

          {/* Add Election Modal - Enhanced */}
          {isAddElectionOpen && (
            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn ${isDarkMode ? 'bg-slate-900/80' : 'bg-gray-900/80'}`}>
              <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border animate-scaleIn ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                {/* Modal Header */}
                <div className={`p-8 border-b flex justify-between items-start transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-darkGreen'}`}>
                      <FilePlus size={28} />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-black uppercase tracking-tighter transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Initialize Registry Cycle</h3>
                      <p className={`text-xs font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure parameters for a new voting event.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddElectionOpen(false)}
                    className={`transition-colors p-2 ${isDarkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Form */}
                <div className={`p-8 space-y-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="space-y-3">
                    <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      <Terminal size={14} className={isDarkMode ? 'text-coop-yellow' : 'text-coop-green'} /> Election Identity
                    </label>
                    <input
                      className={`w-full px-5 py-4 border rounded-xl text-sm font-bold outline-none focus:ring-4 transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-300 focus:border-coop-green focus:bg-white focus:ring-coop-green/5'}`}
                      placeholder="e.g. 2025 Annual General Assembly Election"
                      value={newElection.title || ''}
                      onChange={e => setNewElection({ ...newElection, title: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-3">
                    <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      <FileText size={14} className={isDarkMode ? 'text-coop-yellow' : 'text-coop-green'} /> Briefing Directive
                    </label>
                    <textarea
                      className={`w-full px-5 py-4 border rounded-xl text-sm font-medium outline-none focus:ring-4 transition-all resize-none min-h-[100px] ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-300 focus:border-coop-green focus:bg-white focus:ring-coop-green/5'}`}
                      placeholder="Define the scope and purpose of this election cycle..."
                      value={newElection.description || ''}
                      onChange={e => setNewElection({ ...newElection, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      <Camera size={14} className={isDarkMode ? 'text-coop-yellow' : 'text-coop-green'} /> Background Image
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="electionImageInput"
                        onChange={handleElectionImageChange}
                      />
                      <label
                        htmlFor="electionImageInput"
                        className={`block w-full px-5 py-4 border-2 border-dashed rounded-xl text-sm font-bold cursor-pointer transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-coop-yellow hover:bg-coop-yellow/5' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-coop-green hover:bg-coop-green/5'}`}
                      >
                        {electionBackgroundPreview ? (
                          <div className="flex items-center gap-3">
                            <img src={electionBackgroundPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                            <span>Image selected. Click to change</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Upload size={16} />
                            <span>Click to upload or drag & drop</span>
                          </div>
                        )}
                      </label>
                    </div>
                    <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>PNG, JPG, GIF up to 5MB</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        <Clock size={14} className={isDarkMode ? 'text-coop-yellow' : 'text-coop-green'} /> Activation Sequence
                      </label>
                      <input
                        type="datetime-local"
                        className={`w-full px-5 py-4 border rounded-xl text-xs font-bold outline-none focus:ring-4 transition-all uppercase tracking-wide ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-coop-green focus:ring-coop-green/5'}`}
                        value={newElection.startDate || ''}
                        onChange={e => setNewElection({ ...newElection, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-400'}`}>
                        <Lock size={14} /> Termination Sequence
                      </label>
                      <input
                        type="datetime-local"
                        className={`w-full px-5 py-4 border rounded-xl text-xs font-bold outline-none focus:ring-4 transition-all uppercase tracking-wide ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-red-400 focus:ring-red-400/20' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-red-400 focus:ring-red-400/5'}`}
                        value={newElection.endDate || ''}
                        onChange={e => setNewElection({ ...newElection, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={`p-8 border-t flex gap-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                  <button
                    onClick={() => setIsAddElectionOpen(false)}
                    className={`flex-1 py-4 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
                  >
                    Abort Protocol
                  </button>
                  <button
                    onClick={submitNewElection}
                    className={`flex-[2] py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 hover:shadow-2xl hover:-translate-y-0.5' : 'bg-coop-darkGreen hover:bg-black hover:shadow-2xl hover:-translate-y-0.5'}`}
                  >
                    Initialize Election Cycle <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Position Modal (Reused) */}
          {isAddPositionOpen && (
            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn ${isDarkMode ? 'bg-slate-900/50' : 'bg-gray-900/50'}`}>
              <div className={`rounded-xl shadow-2xl w-full max-w-md p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                <h3 className={`text-xl font-black uppercase mb-6 transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Create Position</h3>
                <div className="space-y-4">
                  <input
                    className={`w-full p-3 border rounded-lg text-sm font-bold outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:border-coop-green focus:ring-coop-green/20'}`}
                    placeholder="Position Title (e.g. Treasurer)"
                    value={newPosition.title || ''}
                    onChange={e => setNewPosition({ ...newPosition, title: e.target.value })}
                  />
                  <textarea
                    className={`w-full p-3 border rounded-lg text-sm font-medium outline-none focus:ring-2 transition-all resize-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:border-coop-green focus:ring-coop-green/20'}`}
                    placeholder="Description of duties..."
                    rows={3}
                    value={newPosition.description || ''}
                    onChange={e => setNewPosition({ ...newPosition, description: e.target.value })}
                  />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className={`text-[9px] font-black uppercase block mb-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Max Votes</label>
                      <input
                        type="number"
                        min="1"
                        className={`w-full p-3 border rounded-lg text-sm font-bold outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-coop-green focus:ring-coop-green/20'}`}
                        value={newPosition.maxVotes || 1}
                        onChange={e => setNewPosition({ ...newPosition, maxVotes: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`text-[9px] font-black uppercase block mb-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Category</label>
                      <select
                        className={`w-full p-3 border rounded-lg text-sm font-bold outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-coop-green focus:ring-coop-green/20'}`}
                        value={newPosition.type || 'OFFICER'}
                        onChange={e => setNewPosition({ ...newPosition, type: e.target.value as VotingType })}
                      >
                        <option value="OFFICER">Officer</option>
                        <option value="PROPOSAL">Proposal</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setIsAddPositionOpen(false)} disabled={isCreatingPosition} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg disabled:opacity-50 transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-50'}`}>Cancel</button>
                    <button onClick={submitNewPosition} disabled={isCreatingPosition} className={`flex-1 py-3 text-white text-xs font-black uppercase rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80' : 'bg-coop-green hover:bg-coop-darkGreen'}`}>{isCreatingPosition ? 'Creating...' : 'Create'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Candidate Modal (Reused) */}
          {candidateModal.isOpen && (
            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn ${isDarkMode ? 'bg-slate-900/80' : 'bg-gray-900/80'}`}>
              <div className={`rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border animate-scaleIn transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 text-white rounded-lg flex items-center justify-center shadow-md transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-green'}`}>
                      <UserPlus size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black uppercase tracking-tighter transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Candidate Dossier</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Create New Profile Entry</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCandidateModal({ isOpen: false, positionId: null })}
                    className={`transition-colors p-2 ${isDarkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className={`p-8 flex flex-col md:flex-row gap-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  {/* Left Col: Photo Upload */}
                  <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      <Camera size={12} /> Profile Biometrics
                    </label>
                    <div
                      className={`aspect-[3/4] border-2 border-dashed rounded-xl relative overflow-hidden group cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-700 border-slate-600 hover:border-coop-yellow' : 'bg-gray-50 border-gray-200 hover:border-coop-green'}`}
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
                        <div className={`flex flex-col items-center justify-center h-full transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-300'}`}>
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
                        className={`text-[9px] font-black uppercase tracking-widest text-center transition-colors ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}`}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {/* Right Col: Details */}
                  <div className="w-full md:w-2/3 space-y-6">
                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        <Terminal size={12} /> Full Legal Name
                      </label>
                      <input
                        className={`w-full px-5 py-4 border rounded-xl text-sm font-bold outline-none focus:ring-4 transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:border-coop-green focus:bg-white focus:ring-coop-green/5'}`}
                        placeholder="e.g. Juan Dela Cruz"
                        value={newCandidate.name || ''}
                        onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 h-full">
                      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        <FileText size={12} /> Platform / Manifesto
                      </label>
                      <textarea
                        className={`w-full h-40 px-5 py-4 border rounded-xl text-sm font-medium outline-none focus:ring-4 transition-all resize-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:border-coop-green focus:ring-coop-green/5'}`}
                        placeholder="Describe the candidate's goals and qualifications..."
                        value={newCandidate.description || ''}
                        onChange={e => setNewCandidate({ ...newCandidate, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t flex justify-end gap-3 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                  <button
                    onClick={() => setCandidateModal({ isOpen: false, positionId: null })}
                    className={`px-6 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitNewCandidate}
                    className={`px-8 py-3 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80' : 'bg-coop-green hover:bg-coop-darkGreen'}`}
                  >
                    <UserPlus size={14} /> Register Candidate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
      case 'BULK_IMPORT': return (
        <div className="animate-fadeIn">
          {selectedImportId ? (
            <ImportDetailView
              importId={selectedImportId}
              onNavigate={handleImportNavigation}
            />
          ) : (
            <div className="space-y-6">
              <BulkImportUpload />
              <ImportHistoryView
                onNavigate={handleImportNavigation}
              />
            </div>
          )}
        </div>
      );
      case 'MEMBER_STATUS': return (
        <div className="animate-fadeIn">
          <MemberStatusDashboard />
        </div>
      );
      case 'ANNOUNCEMENTS': return (
        <div className={`border animate-fadeIn transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-10 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 text-white flex items-center justify-center font-black transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-darkGreen'}`}>B</div>
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Broadcast Ledger</h3>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Official Member Communications</p>
              </div>
            </div>
            {canManageSystem && (
              <button onClick={() => setIsAddingAnnouncement(true)} className={`text-white px-8 py-3 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80' : 'bg-coop-darkGreen hover:bg-black'}`}>
                <PlusCircle size={16} /> New Broadcast
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`border-b text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-gray-50/50 border-gray-100 text-gray-400'}`}>
                <tr>
                  <th className="px-10 py-5">Broadcast Header</th>
                  <th className="px-10 py-5">Priority</th>
                  <th className="px-10 py-5">Authorized Author</th>
                  <th className="px-10 py-5">Timestamp</th>
                  <th className="px-10 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-slate-700' : 'divide-gray-50'}`}>
                {announcements.map(ann => (
                  <tr key={ann.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/30'}`}>
                    <td className="px-10 py-6">
                      <p className={`font-black uppercase tracking-tight leading-none text-sm transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{ann.title}</p>
                      <p className={`text-[10px] mt-1 line-clamp-1 italic transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{ann.content}</p>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 ${ann.priority === 'HIGH' ? 'bg-red-500 text-white' : ann.priority === 'MEDIUM' ? isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-yellow text-coop-green' : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-400'}`}>
                        {ann.priority}
                      </span>
                    </td>
                    <td className={`px-10 py-6 text-xs font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{ann.author || 'System'}</td>
                    <td className={`px-10 py-6 text-[10px] font-mono transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{ann.date}</td>
                    <td className="px-10 py-6 text-right">
                      {canManageSystem && (
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className={`p-2 transition-all ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                          <Trash2 size={14} />
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
        <div className={`border animate-fadeIn transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-10 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 text-white flex items-center justify-center font-black transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-darkGreen'}`}>P</div>
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>System Protocols</h3>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Immutable Governance Rules</p>
              </div>
            </div>
            {canManageSystem && (
              <button onClick={() => setIsAddingRule(true)} className={`text-white px-8 py-3 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80' : 'bg-coop-darkGreen hover:bg-black'}`}>
                <PlusCircle size={16} /> New Protocol
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`border-b text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-gray-50/50 border-gray-100 text-gray-400'}`}>
                <tr>
                  <th className="px-10 py-5 w-16">Ord</th>
                  <th className="px-10 py-5">Protocol Identity</th>
                  <th className="px-10 py-5">Compliance Reference</th>
                  <th className="px-10 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-slate-700' : 'divide-gray-50'}`}>
                {rules.sort((a, b) => a.order - b.order).map(rule => (
                  <tr key={rule.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/30'}`}>
                    <td className={`px-10 py-6 font-black transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>0{rule.order}</td>
                    <td className="px-10 py-6">
                      <p className={`font-black uppercase tracking-tight leading-none text-sm transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{rule.title}</p>
                      <p className={`text-[11px] mt-2 leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{rule.content}</p>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`text-[9px] font-mono font-bold px-2 py-1 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                        SHA-REF-{rule.id.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      {canManageSystem && (
                        <button onClick={() => handleDeleteRule(rule.id)} className={`p-2 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-300 hover:text-red-500'}`}>
                          <Trash2 size={14} />
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
        <div className={`border animate-fadeIn overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-10 border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50/30 border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShieldAlert size={24} className={isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'} />
                <div>
                  <h3 className={`text-xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>System Audit Trail</h3>
                  <p className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Immutable Interaction History</p>
                </div>
              </div>
              <div className={`flex items-center gap-4 px-4 py-2 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-100'}`}>
                <Database size={14} className={isDarkMode ? 'text-coop-yellow' : 'text-coop-green'} />
                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Ledger: BAT-CENTRAL-LOG</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`border-b text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-white border-gray-100 text-gray-400'}`}>
                <tr>
                  <th className="px-10 py-5">Timestamp</th>
                  <th className="px-10 py-5">Operator</th>
                  <th className="px-10 py-5">Action Protocol</th>
                  <th className="px-10 py-5">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-slate-700' : 'divide-gray-50'}`}>
                {logs.map(log => (
                  <tr key={log.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/10'}`}>
                    <td className={`px-10 py-4 text-[10px] font-mono whitespace-nowrap transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{log.timestamp}</td>
                    <td className="px-10 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{log.user}</span>
                        <span className={`text-[8px] font-mono px-1 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>{log.role}</span>
                      </div>
                    </td>
                    <td className={`px-10 py-4 text-[11px] font-bold font-mono tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{log.action}</td>
                    <td className="px-10 py-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-coop-yellow shadow-[0_0_8px_#fbbf24]' : 'bg-coop-green shadow-[0_0_8px_#2D7A3E]'}`}></div>
                        SUCCESS
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
        <div className={`max-w-4xl space-y-12 animate-fadeIn transition-colors duration-300 ${isDarkMode ? '' : ''}`}>
          {/* System Configuration */}
          <div className={`border p-12 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`mb-12 border-b pb-8 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-50'}`}>
              <h3 className={`text-2xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>System Matrix</h3>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Core protocol configuration</p>
            </div>
            <div className="grid md:grid-cols-2 gap-16">
              <div className="space-y-6">
                <label className={`text-[9px] font-black uppercase tracking-widest mb-6 block transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Algorithm Tier</label>
                {['ONE_MEMBER_ONE_VOTE', 'WEIGHTED_SHARES', 'WEIGHTED_BOARD'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => canManageSystem && setVotingMode(mode as VotingMode)}
                    className={`w-full flex items-center justify-between p-4 border text-[10px] font-black uppercase tracking-widest transition-all ${votingMode === mode ? isDarkMode ? 'border-coop-yellow bg-coop-yellow/10 text-coop-yellow' : 'border-coop-green bg-coop-green/5 text-coop-green' : isDarkMode ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                  >
                    {mode.replace(/_/g, ' ')}
                    {votingMode === mode && <CheckCircle size={14} />}
                  </button>
                ))}
              </div>
              <div className="space-y-12">
                <div>
                  <label className={`text-[9px] font-black uppercase tracking-widest mb-6 block transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Access Protocol</label>
                  {(() => {
                    // Read resultsPublic from the most recent active/completed election
                    const newestFirstSetting = [...elections].reverse();
                    const settingElection =
                      newestFirstSetting.find((e: any) => e.status === 'active') ??
                      newestFirstSetting.find((e: any) => e.status === 'paused') ??
                      newestFirstSetting.find((e: any) => e.status === 'completed') ??
                      newestFirstSetting[0];
                    const currentResultsPublic = settingElection ? Boolean((settingElection as any).resultsPublic) : false;
                    return (
                      <div
                        onClick={() => canManageSystem && handleToggleResultsVisibility(!currentResultsPublic)}
                        className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${currentResultsPublic ? isDarkMode ? 'border-coop-yellow bg-coop-yellow/10 text-coop-yellow' : 'border-coop-green bg-coop-green/5 text-coop-green' : isDarkMode ? 'border-slate-600 text-slate-400' : 'border-gray-100 text-gray-400'}`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">{currentResultsPublic ? 'Public Ledger' : 'Private Ledger'}</span>
                        <div className={`w-8 h-4 rounded-full relative transition-all ${currentResultsPublic ? isDarkMode ? 'bg-coop-yellow' : 'bg-coop-green' : isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${currentResultsPublic ? 'right-0.5' : 'left-0.5'}`}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className={`text-[9px] font-black uppercase tracking-widest mb-6 block transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Node Termination Date</label>
                  <input
                    type="datetime-local"
                    value={electionEndDate}
                    onChange={e => canManageSystem && setElectionEndDate(e.target.value)}
                    className={`w-full px-4 py-3 border outline-none focus:ring-2 transition-all font-mono text-xs font-bold ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-coop-green focus:ring-coop-green/20'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cycle Management / Reset Section */}
          <div className={`border p-12 relative overflow-hidden group transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}>
              <Briefcase size={160} />
            </div>
            <div className={`mb-10 border-b pb-8 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-50'}`}>
              <h3 className={`text-2xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>Election Management</h3>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Manage election cycles and registry</p>
            </div>
            <div className="max-w-2xl">
              <p className={`text-sm font-medium leading-relaxed mb-10 italic transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Access the Elections menu to create, edit, and manage election cycles. Configure positions, candidates, and election parameters from the dedicated Elections interface.
              </p>

              <button
                onClick={() => handleNavItemClick('ELECTION')}
                className={`px-10 py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-4 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 hover:shadow-2xl hover:-translate-y-0.5' : 'bg-coop-darkGreen text-white hover:bg-black hover:shadow-2xl hover:-translate-y-0.5'}`}
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
    { id: 'BULK_IMPORT', label: 'Member Import', icon: Upload, roles: ['admin'] },
    { id: 'MEMBER_STATUS', label: 'Member Status', icon: UserCheck, roles: ['admin'] },
    { id: 'RULES', label: 'Protocols', icon: BookOpen, roles: ['admin', 'officer'] },
    { id: 'ANNOUNCEMENTS', label: 'Announcements', icon: Megaphone, roles: ['admin', 'officer'] },
    { id: 'VOTERS', label: 'Ledger', icon: Users, roles: ['admin'] },
    { id: 'SETTINGS', label: 'Protocol', icon: Settings, roles: ['admin'] },
    { id: 'LOGS', label: 'Security', icon: ShieldCheck, roles: ['admin'] },
  ].filter(item => item.roles.includes(user.role as string));

  const SidebarContent = () => (
    <>
      <div className={`px-8 pb-8 mb-8 border-b relative z-10 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-12 h-12 rounded-none flex items-center justify-center shadow-sm shrink-0 overflow-hidden border transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow/10 border-coop-yellow/20' : 'bg-coop-green/10 border-coop-green/20'}`}>
            <img src="/SVMPC_LOGO.png" alt="SVMPC Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <h1 className={`font-black text-lg tracking-tight leading-tight uppercase transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>Control Hub</h1>
            <p className={`font-black text-[8px] uppercase tracking-[0.3em] leading-none mt-1 transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>System Admin</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-none border text-[8px] font-black uppercase tracking-[0.2em] w-max shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-coop-yellow/20 text-coop-yellow' : 'bg-green-50 border-coop-green/20 text-coop-green'}`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow' : 'bg-coop-green'}`}></div>
          <span>Active: {user.role}</span>
        </div>
      </div>
      <nav className={`flex-grow space-y-1 px-4 overflow-y-auto custom-scrollbar relative z-10 pb-4 transition-colors duration-300 ${isDarkMode ? '' : ''}`} ref={navRef} onScroll={handleNavScroll}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavItemClick(item.id as AdminTab)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-[9px] font-black transition-all group relative uppercase tracking-widest ${activeTab === item.id ? isDarkMode ? 'bg-coop-yellow text-slate-900 shadow-md' : 'bg-coop-green text-white shadow-md' : isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-coop-yellow' : 'text-gray-600 hover:bg-gray-100 hover:text-coop-darkGreen'}`}
          >
            <item.icon size={16} className={`transition-all ${activeTab === item.id ? 'scale-105' : 'group-hover:translate-x-0.5'}`} />
            {item.label}
            {activeTab === item.id && (
              <div className={`absolute right-3 w-1 h-6 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-coop-yellow'}`}></div>
            )}
          </button>
        ))}
      </nav>
      <div className={`mt-auto relative z-10 p-6 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-none border flex items-center justify-center font-black text-xs overflow-hidden shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900 border-coop-yellow/20' : 'bg-coop-green text-white border-coop-green/20'}`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className={`font-black text-sm leading-none truncate tracking-tight uppercase transition-colors duration-300 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{user.name}</p>
            <p className={`font-black text-[8px] uppercase tracking-[0.2em] mt-1.5 leading-none transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className={`w-full p-3 rounded-none transition-all border font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 ${isDarkMode ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border-red-900/30' : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-100'}`}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className={`fixed inset-0 flex overflow-hidden z-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
      {/* Static Sidebar (Desktop) */}
      <aside className={`hidden md:flex flex-col w-72 relative shadow-sm overflow-hidden pt-10 border-r h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className={`absolute top-0 left-0 bottom-0 w-80 backdrop-blur-3xl flex flex-col pt-12 border-r shadow-2xl animate-fadeIn overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/95 border-slate-700' : 'bg-coop-green/95 border-white/10'}`}>
            <SidebarContent />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`absolute top-4 right-4 p-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-white/40 hover:text-white'}`}
            >
              <X size={24} />
            </button>
          </aside>
        </div>
      )}

      <div className={`flex-grow flex flex-col h-full relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#fcfcfd]'}`}>
        <header className={`h-20 border-b z-10 flex items-center justify-between px-6 sm:px-10 shadow-sm shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] overflow-hidden transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
            <button
              className={`md:hidden p-2 -ml-2 rounded-none transition-colors ${isDarkMode ? 'text-coop-yellow hover:bg-slate-700' : 'text-coop-green hover:bg-gray-100'}`}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Terminal size={14} className={`shrink-0 hidden sm:block transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
            <span className="hidden sm:block">Terminal</span>
            <div className={`h-3 w-px mx-2 hidden sm:block transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
            <span className={`truncate transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-darkGreen'}`}>{activeTab} Interface</span>
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <div className={`w-8 h-8 rounded-none flex items-center justify-center font-black text-xs shadow-md transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-yellow text-coop-green'}`}>SV</div>
          </div>
        </header>

        <main className={`flex-grow p-6 sm:p-10 overflow-y-auto z-10 custom-scrollbar scroll-smooth transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : ''}`}>
          <div key={activeTab} className={`max-w-[1400px] mx-auto min-h-full transition-all duration-300 ${isTransitioning ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className={`font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>Loading...</div>
              </div>
            ) : (
              renderActiveTab()
            )}
          </div>
        </main>
      </div>

      {/* Modal overlays... */}
      {(isAddingRule) && (
        <div className={`fixed inset-0 z-[200] backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/60' : 'bg-coop-green/60'}`}>
          <div className={`rounded-none shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-coop-green'}`}>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Protocol Enrollment</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">Formal Governance Record</p>
              </div>
              <button onClick={() => { setIsAddingRule(false); }} className={`p-2.5 rounded-none transition-colors ${isDarkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-white/10 hover:bg-white/20'}`}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleAddRule({ ...newRule, id: Date.now().toString(), order: rules.length + 1 } as Rule);
              setIsAddingRule(false);
              setNewRule({ title: '', content: '', order: 0 });
            }} className={`p-8 sm:p-12 space-y-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Protocol Title</label>
                <input
                  type="text" required placeholder="e.g., Eligibility Standards"
                  className={`w-full px-6 py-3.5 rounded-none font-bold text-sm transition-all outline-none focus:border-coop-green shadow-inner border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-200 text-coop-darkGreen focus:border-coop-green'}`}
                  value={newRule?.title}
                  onChange={e => setNewRule({ ...newRule, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Protocol Content</label>
                <textarea
                  required rows={4} placeholder="Full legal text of the protocol..."
                  className={`w-full px-6 py-4 rounded-none font-bold text-sm leading-relaxed transition-all outline-none focus:border-coop-green shadow-inner border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-200 text-coop-darkGreen focus:border-coop-green'}`}
                  value={newRule?.content}
                  onChange={e => setNewRule({ ...newRule, content: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button type="button" onClick={() => { setIsAddingRule(false); }} className={`order-2 sm:order-1 flex-1 py-5 rounded-none font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Cancel</button>
                <button type="submit" className={`order-1 sm:order-2 flex-[2] py-5 rounded-none font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/90' : 'bg-coop-green text-white hover:bg-coop-darkGreen'}`}>
                  Confirm Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(isAddingAnnouncement) && (
        <div className={`fixed inset-0 z-[200] backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/60' : 'bg-coop-green/60'}`}>
          <div className={`rounded-none shadow-2xl w-full max-w-xl animate-scaleIn border my-auto flex flex-col max-h-[90vh] transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-10 text-white flex justify-between items-center relative border-b-4 border-coop-yellow flex-shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-coop-green'}`}>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Broadcast Enrollment</h3>
                <p className="text-[10px] text-coop-yellow font-black uppercase tracking-[0.4em] mt-2">Validated Governance Communication</p>
              </div>
              <button onClick={() => { setIsAddingAnnouncement(false); }} className={`p-2.5 rounded-none transition-colors flex-shrink-0 ${isDarkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-white/10 hover:bg-white/20'}`}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleAddAnnouncement({ ...newAnnouncement, id: Date.now().toString(), date: new Date().toISOString().split('T')[0], author: user.name } as Announcement);
              setIsAddingAnnouncement(false);
              setNewAnnouncement({ title: '', content: '', priority: 'LOW', expiresAt: '' });
            }} className={`p-8 sm:p-12 space-y-8 overflow-y-auto flex-1 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Broadcast Title</label>
                <input
                  type="text" required placeholder="Announcement Title..."
                  className={`w-full px-6 py-3.5 rounded-none font-bold text-sm transition-all outline-none focus:border-coop-green shadow-inner border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-200 text-coop-darkGreen focus:border-coop-green'}`}
                  value={newAnnouncement?.title}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Priority Tier</label>
                <select
                  className={`w-full px-6 py-3.5 rounded-none font-bold text-sm transition-all appearance-none outline-none focus:border-coop-green shadow-inner border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-100 text-coop-darkGreen focus:border-coop-green'}`}
                  value={newAnnouncement?.priority}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-widest block transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Target Audience</label>
                <div className={`space-y-2.5 p-4 border rounded-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'}`}>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={(newAnnouncement?.targetAudience || []).includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAnnouncement({ ...newAnnouncement, targetAudience: ['all'] });
                        } else {
                          setNewAnnouncement({ ...newAnnouncement, targetAudience: ['all'] });
                        }
                      }}
                      className="w-4 h-4 accent-coop-green cursor-pointer"
                    />
                    <span className={`text-sm font-bold transition-colors duration-300 group-hover:text-coop-green ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>All Members</span>
                  </label>

                  {(newAnnouncement?.targetAudience || []).includes('all') ? (
                    <p className={`text-[9px] italic mt-2 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Broadcasting to all members (overrides specific targeting)</p>
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
                            setNewAnnouncement({ ...newAnnouncement, targetAudience: updated.length === 0 ? ['all'] : updated as any });
                          }}
                          className="w-4 h-4 accent-coop-green cursor-pointer"
                        />
                        <span className={`text-sm font-bold transition-colors duration-300 group-hover:text-coop-green ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Haven't Voted Yet</span>
                        <span className={`text-[9px] ml-auto transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>(Reminders, calls to action)</span>
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
                            setNewAnnouncement({ ...newAnnouncement, targetAudience: updated.length === 0 ? ['all'] : updated as any });
                          }}
                          className="w-4 h-4 accent-coop-green cursor-pointer"
                        />
                        <span className={`text-sm font-bold transition-colors duration-300 group-hover:text-coop-green ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Already Voted</span>
                        <span className={`text-[9px] ml-auto transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>(Thank you, results updates)</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Expiry Date (Optional)</label>
                <p className={`text-[9px] italic transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Leave empty for no expiry. Once the date/time passes, announcement will be hidden from all members.</p>
                <input
                  type="datetime-local"
                  className={`w-full px-6 py-3.5 border rounded-none font-bold text-sm transition-all outline-none focus:border-coop-green shadow-inner ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-200 text-coop-darkGreen focus:border-coop-green'}`}
                  value={newAnnouncement?.expiresAt || ''}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Broadcast Content</label>
                <textarea
                  required rows={4} placeholder="Announcement details..."
                  className={`w-full px-6 py-4 border rounded-none font-bold text-sm leading-relaxed transition-all outline-none focus:border-coop-green shadow-inner ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-coop-yellow' : 'bg-gray-50 border-gray-200 text-coop-darkGreen focus:border-coop-green'}`}
                  value={newAnnouncement?.content}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                />
              </div>
              <div className={`flex flex-col sm:flex-row gap-4 pt-6 sticky bottom-0 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <button type="button" onClick={() => { setIsAddingAnnouncement(false); }} className={`order-2 sm:order-1 flex-1 py-5 rounded-none font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Cancel</button>
                <button type="submit" className={`order-1 sm:order-2 flex-[2] py-5 rounded-none font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/90' : 'bg-coop-green text-white hover:bg-coop-darkGreen'}`}>
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
