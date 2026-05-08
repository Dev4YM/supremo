import { Incident, User } from '@supremo/shared-types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9691';

// Create axios instance with session cookie support
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Enable session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for guild context
apiClient.interceptors.request.use(
  (config) => {
    // Add guild context if available (backend expects x-guild-id header)
    const guildId = typeof window !== 'undefined' ? localStorage.getItem('selectedGuildId') : null;
    if (guildId) {
      config.headers['x-guild-id'] = guildId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    if (error.response?.status === 401) {
      // Handle unauthorized - clear any cached data and redirect to login
      if (typeof window !== 'undefined') {
        // Clear any old localStorage data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedGuildId');
        
        // Only redirect if we're not already on an auth page
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/auth') && currentPath !== '/') {
          window.location.href = '/auth/login';
        }
      }
    } else if (error.response?.status === 403) {
      // Handle forbidden - user doesn't have permission
      console.warn('Access forbidden:', error.response?.data?.message || 'Insufficient permissions');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response?.data?.message || 'Internal server error');
    }
    
    return Promise.reject(error);
  }
);

// API Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth API
export const authAPI = {
  // Exchange session token for cookie-based session
  exchangeToken: (token: string) =>
    apiClient.post<ApiResponse<{ user: User }>>('/api/auth/exchange-token', { token }),

  /** One-time code from Discord OAuth redirect (`?success=true&code=...`). */
  oauthExchange: (code: string) =>
    apiClient.post<ApiResponse<{ user: User }>>('/api/auth/oauth-exchange', { code }),
  
  me: () =>
    apiClient.get<ApiResponse<User>>('/api/auth/me'),
  
  session: () =>
    apiClient.get<ApiResponse<any>>('/api/auth/session'),
  
  logout: () =>
    apiClient.post<ApiResponse>('/api/auth/logout'),
};

// Guild API - matches backend /api/guilds endpoints
export const guildAPI = {
  getGuilds: () =>
    apiClient.get<ApiResponse<any[]>>('/api/guilds'),
  
  connectGuild: (discordGuildId: string) =>
    apiClient.post<ApiResponse<any>>(`/api/guilds/${discordGuildId}/connect`),
  
  inviteUser: (guildId: string, data: { botUserId: string; roleKey?: string }) =>
    apiClient.post<ApiResponse<any>>(`/api/guilds/${guildId}/invite`, data),
  
  getBranding: () =>
    apiClient.get<ApiResponse<any>>('/api/guilds/branding'),
  
  updateBranding: (data: any) =>
    apiClient.put<ApiResponse<any>>('/api/guilds/branding', data),
  
  deleteBranding: () =>
    apiClient.delete<ApiResponse>('/api/guilds/branding'),
};

// User API - matches backend /api/users endpoints
export const userAPI = {
  getUsers: (params?: { sync?: boolean; limit?: number; offset?: number }) =>
    apiClient.get<ApiResponse<User[]>>('/api/users', { params }),
  
  getDiscordMembers: () =>
    apiClient.get<ApiResponse<any[]>>('/api/users/discord'),
  
  syncUsers: () =>
    apiClient.post<ApiResponse<any>>('/api/users/sync'),
  
  getUserByDiscordId: (discordId: string) =>
    apiClient.get<ApiResponse<User>>(`/api/users/discord/${discordId}`),
  
  getUserProfile: (discordId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/users/discord/${discordId}/profile`),
};

// Incident API - matches backend /api/incidents endpoints
export const incidentAPI = {
  getIncidents: (params?: { 
    limit?: number; 
    offset?: number; 
    status?: string;
    userId?: string;
  }) =>
    apiClient.get<ApiResponse<Incident[]>>('/api/incidents', { params }),
  
  getIncident: (incidentId: string) =>
    apiClient.get<ApiResponse<Incident>>(`/api/incidents/${incidentId}`),
  
  createIncident: (data: any) =>
    apiClient.post<ApiResponse<Incident>>('/api/incidents', data),
  
  updateIncident: (incidentId: string, data: any) =>
    apiClient.put<ApiResponse<Incident>>(`/api/incidents/${incidentId}`, data),
  
  approveIncident: (incidentId: string, data: any) =>
    apiClient.post<ApiResponse<Incident>>(`/api/incidents/${incidentId}/approve`, data),
  
  rejectIncident: (incidentId: string, data: any) =>
    apiClient.post<ApiResponse<Incident>>(`/api/incidents/${incidentId}/reject`, data),
};


// Automation API - matches backend /api/automations endpoints
export const automationAPI = {
  getAutomations: (params?: { enabled?: boolean; type?: string; triggerType?: string }) =>
    apiClient.get<ApiResponse<any[]>>('/api/automations', { params }),
  
  getPlaceholders: (actionType?: string) =>
    apiClient.get<ApiResponse<any>>('/api/automations/placeholders', { params: { actionType } }),
  
  getActionsList: () =>
    apiClient.get<ApiResponse<any[]>>('/api/automations/actions/list'),
  
  getActionSchema: (type: string) =>
    apiClient.get<ApiResponse<any>>(`/api/automations/actions/${type}`),
  
  validateAutomation: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/automations/validate', data),
  
  getAutomation: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/api/automations/${id}`),
  
  createAutomation: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/automations', data),
  
  updateAutomation: (id: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/automations/${id}`, data),
  
  deleteAutomation: (id: string) =>
    apiClient.delete<ApiResponse>(`/api/automations/${id}`),
  
  executeAutomation: (id: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/automations/${id}/execute`, data),
  
  testAutomation: (id: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/automations/${id}/test`, data),
  
  getAutomationRuns: (id: string) =>
    apiClient.get<ApiResponse<any[]>>(`/api/automations/${id}/runs`),
  
  getAutomationAnalytics: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/api/automations/${id}/analytics`),
};

// Automation templates — `apps/server` TemplateController @ `GET /api/templates`
export const automationTemplatesAPI = {
  list: (params?: { category?: string }) =>
    apiClient.get<ApiResponse<any[]>>('/api/templates', { params }),
};

// Cases API - matches backend /api/cases endpoints
export const casesAPI = {
  getCases: (params?: { status?: string; type?: string; assignedTo?: string; userId?: string }) =>
    apiClient.get<ApiResponse<any[]>>('/api/cases', { params }),
  
  getCase: (caseId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/cases/${caseId}`),
  
  createCase: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/cases', data),
  
  updateCase: (caseId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/cases/${caseId}`, data),
  
  assignCase: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/assign`, data),
  
  resolveCase: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/resolve`, data),
  
  closeCase: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/close`, data),
  
  reopenCase: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/reopen`, data),
  
  addEvidence: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/evidence`, data),
  
  addNote: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/notes`, data),
  
  createAppeal: (caseId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/cases/${caseId}/appeals`, data),
  
  updateAppeal: (caseId: string, appealId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/cases/${caseId}/appeals/${appealId}`, data),
  
  exportCase: (caseId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/cases/${caseId}/export`),
  
  deleteExpiredCases: () =>
    apiClient.delete<ApiResponse>('/api/cases/expired'),
};

// Auto-Mod API - matches backend /api/auto-mod endpoints
export const autoModAPI = {
  getRules: () =>
    apiClient.get<ApiResponse<any[]>>('/api/auto-mod/rules'),
  
  createRule: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/auto-mod/rules', data),
  
  updateRule: (ruleId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/auto-mod/rules/${ruleId}`, data),
  
  deleteRule: (ruleId: string) =>
    apiClient.delete<ApiResponse>(`/api/auto-mod/rules/${ruleId}`),
  
  getOffenders: () =>
    apiClient.get<ApiResponse<any[]>>('/api/auto-mod/offenders'),
  
  getScans: () =>
    apiClient.get<ApiResponse<any[]>>('/api/auto-mod/scans'),
};

// Anti-Raid API - matches backend /api/anti-raid endpoints
export const antiRaidAPI = {
  getConfig: () =>
    apiClient.get<ApiResponse<any>>('/api/anti-raid/config'),
  
  updateConfig: (data: any) =>
    apiClient.put<ApiResponse<any>>('/api/anti-raid/config', data),
  
  getJoinRate: () =>
    apiClient.get<ApiResponse<any>>('/api/anti-raid/join-rate'),
  
  getVerification: () =>
    apiClient.get<ApiResponse<any>>('/api/anti-raid/verification'),
  
  completeVerification: (token: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/anti-raid/verification/${token}/complete`, data),
  
  getLockdown: () =>
    apiClient.get<ApiResponse<any>>('/api/anti-raid/lockdown'),
  
  setLockdown: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/anti-raid/lockdown', data),
  
  getRoleAlerts: () =>
    apiClient.get<ApiResponse<any[]>>('/api/anti-raid/role-alerts'),
  
  getAuditWatches: () =>
    apiClient.get<ApiResponse<any[]>>('/api/anti-raid/audit-watches'),
  
  createAuditWatch: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/anti-raid/audit-watches', data),
};

// Trust & Reputation API - matches backend /api/trust-reputation endpoints
export const trustReputationAPI = {
  getConfig: () =>
    apiClient.get<ApiResponse<any>>('/api/trust-reputation/config'),
  
  updateConfig: (data: any) =>
    apiClient.put<ApiResponse<any>>('/api/trust-reputation/config', data),
  
  getUserTrust: (userId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/trust-reputation/users/${userId}`),
  
  calculateUserTrust: (userId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/trust-reputation/users/${userId}/calculate`, data),
  
  assessRisk: (userId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/trust-reputation/users/${userId}/assess-risk`, data),
  
  setProbation: (userId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/trust-reputation/users/${userId}/probation`, data),
  
  removeProbation: (userId: string) =>
    apiClient.delete<ApiResponse>(`/api/trust-reputation/users/${userId}/probation`),
  
  getChannelRules: (channelId: string) =>
    apiClient.get<ApiResponse<any[]>>(`/api/trust-reputation/channels/${channelId}/rules`),
  
  createChannelRule: (channelId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/trust-reputation/channels/${channelId}/rules`, data),
  
  createExemption: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/trust-reputation/exemptions', data),
  
  getRiskAssessments: () =>
    apiClient.get<ApiResponse<any[]>>('/api/trust-reputation/risk-assessments'),
  
  getProbations: () =>
    apiClient.get<ApiResponse<any[]>>('/api/trust-reputation/probations'),
};

// Tickets API - matches backend /api/tickets endpoints
export const ticketsAPI = {
  getTickets: () =>
    apiClient.get<ApiResponse<any[]>>('/api/tickets'),
  
  getCategories: () =>
    apiClient.get<ApiResponse<any[]>>('/api/tickets/categories'),
  
  getSLAViolations: () =>
    apiClient.get<ApiResponse<any[]>>('/api/tickets/sla-violations'),
  
  getTicket: (ticketId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/tickets/${ticketId}`),
  
  createTicket: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/tickets', data),
  
  addMessage: (ticketId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/tickets/${ticketId}/messages`, data),
  
  updateStatus: (ticketId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/tickets/${ticketId}/status`, data),
  
  assignTicket: (ticketId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/tickets/${ticketId}/assign`, data),
  
  createTranscript: (ticketId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/tickets/${ticketId}/transcript`, data),
  
  createCategory: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/tickets/categories', data),
  
  createSLA: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/tickets/slas', data),
};

// Commands API - matches backend /api/commands endpoints
export const commandsAPI = {
  getCommands: () =>
    apiClient.get<ApiResponse<any[]>>('/api/commands'),
  
  getCommand: (commandId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/commands/${commandId}`),
  
  getCommandStats: (commandId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/commands/${commandId}/stats`),
  
  createCommand: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/commands', data),
  
  updateCommand: (commandId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/commands/${commandId}`, data),
  
  deleteCommand: (commandId: string) =>
    apiClient.delete<ApiResponse>(`/api/commands/${commandId}`),
  
  setPermissions: (commandId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/commands/${commandId}/permissions`, data),
  
  updateRolePermission: (commandId: string, roleId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/commands/${commandId}/permissions/${roleId}`, data),
  
  deleteRolePermission: (commandId: string, roleId: string) =>
    apiClient.delete<ApiResponse>(`/api/commands/${commandId}/permissions/${roleId}`),
};

// Jobs API - matches backend /api/jobs endpoints
export const jobsAPI = {
  getJobs: () =>
    apiClient.get<ApiResponse<any[]>>('/api/jobs'),
  
  getJob: (jobId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/jobs/${jobId}`),
  
  createJob: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/jobs', data),
  
  updateJob: (jobId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/jobs/${jobId}`, data),
  
  deleteJob: (jobId: string) =>
    apiClient.delete<ApiResponse>(`/api/jobs/${jobId}`),
  
  triggerJob: (jobId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/jobs/${jobId}/trigger`, data),
  
  getJobRuns: (jobId: string) =>
    apiClient.get<ApiResponse<any[]>>(`/api/jobs/${jobId}/runs`),
};

// Server API - matches backend /api/server endpoints
export const serverAPI = {
  getServerInfo: () =>
    apiClient.get<ApiResponse<any>>('/api/server/info'),
  
  getRoles: () =>
    apiClient.get<ApiResponse<any[]>>('/api/server/roles'),
  
  createRole: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/server/roles', data),
  
  updateRole: (roleId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/server/roles/${roleId}`, data),
  
  deleteRole: (roleId: string) =>
    apiClient.delete<ApiResponse>(`/api/server/roles/${roleId}`),
  
  getChannels: () =>
    apiClient.get<ApiResponse<any[]>>('/api/server/channels'),
  
  createChannel: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/server/channels', data),
  
  updateChannel: (channelId: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/server/channels/${channelId}`, data),
  
  deleteChannel: (channelId: string) =>
    apiClient.delete<ApiResponse>(`/api/server/channels/${channelId}`),
  
  getAuditLogs: () =>
    apiClient.get<ApiResponse<any[]>>('/api/server/audit-logs'),
  
  getInvites: () =>
    apiClient.get<ApiResponse<any[]>>('/api/server/invites'),
  
  createInvite: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/server/invites', data),
};

// Analytics API - matches backend /api/analytics endpoints  
export const analyticsAPI = {
  getMemberGrowth: (days: number = 30) =>
    apiClient.get<ApiResponse<any>>('/api/analytics/member-growth', { params: { days } }),
  
  getActivity: (days: number = 30) =>
    apiClient.get<ApiResponse<any>>('/api/analytics/activity', { params: { days } }),
  
  getEngagement: (days: number = 30) =>
    apiClient.get<ApiResponse<any>>('/api/analytics/engagement', { params: { days } }),
  
  getModWorkload: (days: number = 30) =>
    apiClient.get<ApiResponse<any>>('/api/analytics/mod-workload', { params: { days } }),
  
  getAutomation: (days: number = 30) =>
    apiClient.get<ApiResponse<any>>('/api/analytics/automation', { params: { days } }),
  
  getAnomalies: (days: number = 30) =>
    apiClient.get<ApiResponse<any>>('/api/analytics/anomalies', { params: { days } }),
  
  createSnapshot: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/analytics/snapshot', data),
  
  detectAnomalies: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/analytics/detect-anomalies', data),
  
  getHealth: () =>
    apiClient.get<ApiResponse<any>>('/api/analytics/health'),
};

// Configuration API - matches backend /api/configuration endpoints
export const configAPI = {
  getConfigs: () =>
    apiClient.get<ApiResponse<any[]>>('/api/configuration/configs'),
  
  getConfig: (key: string) =>
    apiClient.get<ApiResponse<any>>(`/api/configuration/configs/${key}`),
  
  createConfig: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/configuration/configs', data),
  
  getMessages: () =>
    apiClient.get<ApiResponse<any[]>>('/api/configuration/messages'),
  
  getMessage: (key: string) =>
    apiClient.get<ApiResponse<any>>(`/api/configuration/messages/${key}`),
  
  createMessage: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/configuration/messages', data),
  
  toggleMessage: (key: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/configuration/messages/${key}/toggle`, data),
};

// Actions API - matches backend /api/actions endpoints
export const actionsAPI = {
  createAction: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/actions', data),
  
  getActions: (params?: { limit?: number; offset?: number }) =>
    apiClient.get<ApiResponse<any[]>>('/api/actions', { params }),
};

// Messages API - matches backend /api/messages endpoints  
export const messagesAPI = {
  getSentMessages: () =>
    apiClient.get<ApiResponse<any[]>>('/api/messages/sent'),
  
  sendStaticMessage: (key: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/messages/static/${key}/send`, data),
  
  updateStaticMessage: (key: string, data: any) =>
    apiClient.put<ApiResponse<any>>(`/api/messages/static/${key}/update`, data),
  
  deleteSentMessage: (messageId: string) =>
    apiClient.delete<ApiResponse>(`/api/messages/sent/${messageId}`),
};

// Discord API - matches backend /api/discord endpoints
export const discordAPI = {
  getChannels: () =>
    apiClient.get<ApiResponse<any[]>>('/api/discord/channels'),
  
  sendMessage: (channelId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/api/discord/channels/${channelId}/send`, data),
  
  getGuild: () =>
    apiClient.get<ApiResponse<any>>('/api/discord/guild'),
  
  getMembers: () =>
    apiClient.get<ApiResponse<any[]>>('/api/discord/members'),
  
  getMember: (memberId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/discord/members/${memberId}`),
};

// API Health & Stats - matches backend /api endpoints
export const apiHealthAPI = {
  getHealth: () =>
    apiClient.get<ApiResponse<any>>('/api/health'),
  
  getStats: () =>
    apiClient.get<ApiResponse<any>>('/api/stats'),
  
  getRulesAnalytics: () =>
    apiClient.get<ApiResponse<any>>('/api/analytics/rules'),
  
  getAutomationsAnalytics: () =>
    apiClient.get<ApiResponse<any>>('/api/analytics/automations'),
  
  getAutomationsPerformance: () =>
    apiClient.get<ApiResponse<any>>('/api/analytics/automations/performance'),
};

// Export the configured client for custom requests
export default apiClient;