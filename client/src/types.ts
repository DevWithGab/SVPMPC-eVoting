export const UserRole = {
  ADMIN: 'admin',
  MODERATOR: 'officer',
  AUDITOR: 'officer', // Backend uses 'officer' for both moderator and auditor
  MEMBER: 'member'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const VotingType = {
  OFFICER: 'OFFICER',
  PROPOSAL: 'PROPOSAL'
} as const;

export type VotingType = typeof VotingType[keyof typeof VotingType];

export type VotingMode = 'ONE_MEMBER_ONE_VOTE' | 'WEIGHTED_SHARES' | 'WEIGHTED_BOARD';
export type VotingStatus = 'OPEN' | 'PAUSED';
export type PageView = 'LANDING' | 'LOGIN' | 'PROFILE' | 'VOTING' | 'RESULTS' | 'RULES' | 'ANNOUNCEMENTS' | 'RESOURCES' | 'ADMIN' | 'STAFF' | 'ELECTIONS' | 'CANDIDATES' | 'POSITIONS';

export interface Election {
  id: string;
  title: string;
  description?: string;
  maxVotesPerMember?: number;
  status: string;
  endDate?: string;
  resultsPublic?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasVoted: boolean;
  username?: string;
  fullName?: string;
  isActive?: boolean;
  profilePicture?: string;
  address?: string;
  needsPasswordChange?: boolean;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  maxVotes: number;
  order: number;
  type: VotingType;
  status?: string;
  electionId?: string;
}

export interface Candidate {
  id: string;
  name: string;
  description: string;
  positionId: string;
  votes: number;
  imageUrl?: string;
  photoUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  date: string;
  author: string;
  targetAudience?: ('all' | 'hasNotVoted' | 'hasVoted')[];
  expiresAt?: string | null;
}

export interface Rule {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Log {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
}
export interface SupportTicket {
  _id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
  category?: string;
  priority?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}