import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Public endpoints that shouldn't trigger redirect on 401
    // These endpoints may require auth for some operations but should fail gracefully
    const publicEndpoints = ['/auth/login', '/elections', '/candidates', '/votes', '/announcements', '/rules', '/users'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => url.includes(endpoint));
    
    // Only redirect for protected endpoints, not public ones
    if (error.response?.status === 401 && !isPublicEndpoint) {
      console.warn('401 on protected endpoint, redirecting to login:', url);
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 401) {
      console.warn('401 on public endpoint, not redirecting:', url);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    address?: string;
    role?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getUserById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  updateUser: async (userId: string, data: {
    username?: string;
    email?: string;
    fullName?: string;
    address?: string;
    highContrast?: boolean;
    fontSize?: 'normal' | 'large';
  }) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },
  
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  
  updateAccessibilityPreferences: async (preferences: {
    highContrast: boolean;
    fontSize: 'normal' | 'large';
  }) => {
    const response = await api.put('/users/preferences/accessibility', preferences);
    return response.data;
  },
  
  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const response = await api.post('/users/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const electionAPI = {
  getElections: async () => {
    const response = await api.get('/elections');
    return response.data;
  },
  
  getElectionById: async (id: string) => {
    const response = await api.get(`/elections/${id}`);
    return response.data;
  },
  
  createElection: async (data: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    maxVotesPerMember?: number;
    backgroundImage?: File;
  }) => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('startDate', data.startDate);
    formData.append('endDate', data.endDate);
    if (data.maxVotesPerMember) formData.append('maxVotesPerMember', data.maxVotesPerMember.toString());
    if (data.backgroundImage) formData.append('backgroundImage', data.backgroundImage);
    
    const response = await api.post('/elections', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  updateElection: async (id: string, data: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    maxVotesPerMember?: number;
    status?: string;
    resultsPublic?: boolean;
  }) => {
    const response = await api.put(`/elections/${id}`, data);
    return response.data;
  },
  
  deleteElection: async (id: string) => {
    const response = await api.delete(`/elections/${id}`);
    return response.data;
  },
  
  startElection: async (id: string) => {
    const response = await api.post(`/elections/${id}/start`);
    return response.data;
  },
  
  completeElection: async (id: string) => {
    const response = await api.post(`/elections/${id}/complete`);
    return response.data;
  },

  resetCycle: async (electionId: string, newEndDate: string, wipeEntities: boolean, title?: string) => {
    const response = await api.post('/elections/reset/cycle', {
      electionId,
      newEndDate,
      wipeEntities,
      title,
    });
    return response.data;
  },
};

export const positionAPI = {
  getPositions: async (electionId?: string) => {
    const params = electionId ? { electionId } : {};
    const response = await api.get('/positions', { params });
    return response.data;
  },
  
  getPositionById: async (id: string) => {
    const response = await api.get(`/positions/${id}`);
    return response.data;
  },
  
  createPosition: async (data: {
    title: string;
    description?: string;
    electionId: string;
    order?: number;
  }) => {
    const response = await api.post('/positions', data);
    return response.data;
  },
  
  updatePosition: async (id: string, data: {
    title?: string;
    description?: string;
    order?: number;
  }) => {
    const response = await api.put(`/positions/${id}`, data);
    return response.data;
  },
  
  deletePosition: async (id: string) => {
    const response = await api.delete(`/positions/${id}`);
    return response.data;
  },
};

export const candidateAPI = {
  getCandidates: async (electionId?: string) => {
    const params = electionId ? { electionId } : {};
    const response = await api.get('/candidates', { params });
    return response.data;
  },
  
  getCandidateById: async (id: string) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },
  
  createCandidate: async (data: {
    name: string;
    description?: string;
    photoUrl?: string;
    electionId: string;
    positionId: string;
  }) => {
    const response = await api.post('/candidates', data);
    return response.data;
  },
  
  updateCandidate: async (id: string, data: {
    name?: string;
    description?: string;
    photoUrl?: string;
  }) => {
    const response = await api.put(`/candidates/${id}`, data);
    return response.data;
  },
  
  deleteCandidate: async (id: string) => {
    const response = await api.delete(`/candidates/${id}`);
    return response.data;
  },
  
  uploadCandidatePhoto: async (candidateId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('candidateId', candidateId);
    const response = await api.post('/candidates/photo/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const announcementAPI = {
  getAnnouncements: async () => {
    const response = await api.get('/announcements');
    return response.data;
  },
  
  getAnnouncementById: async (id: string) => {
    const response = await api.get(`/announcements/${id}`);
    return response.data;
  },
  
  getAnnouncementCount: async () => {
    const response = await api.get('/announcements/count');
    return response.data;
  },
  
  createAnnouncement: async (data: {
    title: string;
    content: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    date?: string;
    author?: string;
    targetAudience?: ('all' | 'hasNotVoted' | 'hasVoted')[];
  }) => {
    const response = await api.post('/announcements', data);
    return response.data;
  },
  
  updateAnnouncement: async (id: string, data: {
    title?: string;
    content?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => {
    const response = await api.put(`/announcements/${id}`, data);
    return response.data;
  },
  
  deleteAnnouncement: async (id: string) => {
    const response = await api.delete(`/announcements/${id}`);
    return response.data;
  },
};

export const ruleAPI = {
  getRules: async () => {
    const response = await api.get('/rules');
    return response.data;
  },
  
  getRuleById: async (id: string) => {
    const response = await api.get(`/rules/${id}`);
    return response.data;
  },
  
  createRule: async (data: {
    title: string;
    content: string;
    order?: number;
  }) => {
    const response = await api.post('/rules', data);
    return response.data;
  },
  
  updateRule: async (id: string, data: {
    title?: string;
    content?: string;
    order?: number;
  }) => {
    const response = await api.put(`/rules/${id}`, data);
    return response.data;
  },
  
  deleteRule: async (id: string) => {
    const response = await api.delete(`/rules/${id}`);
    return response.data;
  },
};

export const voteAPI = {
  castVote: async (candidateId: string, electionId: string) => {
    const response = await api.post('/votes', { candidateId, electionId });
    return response.data;
  },
  
  castAbstainVote: async (electionId: string, positionId: string) => {
    const response = await api.post('/votes/abstain', { electionId, positionId });
    return response.data;
  },
  
  getElectionResults: async (electionId: string) => {
    const response = await api.get(`/votes/election/${electionId}/results`);
    return response.data;
  },
  
  getElectionVotes: async (electionId: string) => {
    const response = await api.get(`/votes/election/${electionId}`);
    return response.data;
  },
  
  getUserVotes: async () => {
    const response = await api.get('/votes/user');
    return response.data;
  },
  
  getAllVotes: async () => {
    const response = await api.get('/votes');
    return response.data;
  },
};

export const reportAPI = {
  getReports: async () => {
    const response = await api.get('/reports');
    return response.data;
  },
  
  getReportById: async (id: string) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
  
  generateElectionReport: async (electionId: string) => {
    const response = await api.post('/reports/election-summary', { electionId });
    return response.data;
  },
  
  generateVoteCountReport: async (electionId: string) => {
    const response = await api.post('/reports/vote-count', { electionId });
    return response.data;
  },
  
  deleteReport: async (id: string) => {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },
};

export const activityAPI = {
  getActivities: async () => {
    const response = await api.get('/activities');
    return response.data;
  },
  
  getUserActivities: async (userId: string) => {
    const response = await api.get(`/activities/user/${userId}`);
    return response.data;
  },
  
  getActivitiesByAction: async (action: string) => {
    const response = await api.get('/activities/by-action', { params: { action } });
    return response.data;
  },
};

export default api;
