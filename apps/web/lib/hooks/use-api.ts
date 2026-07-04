import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  authAPI, 
  guildAPI, 
  userAPI, 
  incidentAPI, 
  analyticsAPI, 
  automationAPI,
  automationTemplatesAPI,
  configAPI,
  casesAPI,
  autoModAPI,
  antiRaidAPI,
  trustReputationAPI,
  ticketsAPI,
  commandsAPI,
  jobsAPI,
  serverAPI,
  actionsAPI,
  messagesAPI,
  discordAPI,
  apiHealthAPI,
  auditAPI,
} from '../api';
import { User, Incident, GuildConfig } from '@supremo/shared-types';
import { toast } from 'sonner';

// Helper function to safely extract data from API responses
const extractResponseData = (response: any, fallback: any = null) => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  } else if (response?.data?.user !== undefined) {
    return response.data.user;
  } else if (response?.data?.guilds !== undefined) {
    return response.data.guilds;
  } else if (response?.data !== undefined) {
    return response.data;
  } else {
    return fallback;
  }
};

// Query Keys - Updated to match backend structure
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  guilds: {
    all: ['guilds'] as const,
    branding: ['guilds', 'branding'] as const,
  },
  users: {
    all: (params?: any) => ['users', params] as const,
    discord: ['users', 'discord'] as const,
    profile: (discordId: string) => ['users', 'discord', discordId, 'profile'] as const,
  },
  incidents: {
    all: (params?: any) => ['incidents', params] as const,
    detail: (incidentId: string) => ['incidents', incidentId] as const,
  },
  cases: {
    all: (params?: any) => ['cases', params] as const,
    detail: (caseId: string) => ['cases', caseId] as const,
  },
  analytics: {
    memberGrowth: (days: number) => ['analytics', 'member-growth', days] as const,
    activity: (days: number) => ['analytics', 'activity', days] as const,
    engagement: (days: number) => ['analytics', 'engagement', days] as const,
    modWorkload: (days: number) => ['analytics', 'mod-workload', days] as const,
    automation: (days: number) => ['analytics', 'automation', days] as const,
    anomalies: (days: number) => ['analytics', 'anomalies', days] as const,
    health: ['analytics', 'health'] as const,
  },
  automation: {
    all: (params?: any) => ['automations', params] as const,
    templates: (params?: { category?: string }) => ['automations', 'templates', params] as const,
    detail: (id: string) => ['automations', id] as const,
    placeholders: (actionType?: string) => ['automations', 'placeholders', actionType] as const,
    actionDefinitions: ['automations', 'action-definitions'] as const,
    runs: (id: string) => ['automations', id, 'runs'] as const,
    analytics: (id: string) => ['automations', id, 'analytics'] as const,
  },
  autoMod: {
    rules: ['auto-mod', 'rules'] as const,
    offenders: ['auto-mod', 'offenders'] as const,
    scans: ['auto-mod', 'scans'] as const,
  },
  antiRaid: {
    config: ['anti-raid', 'config'] as const,
    joinRate: ['anti-raid', 'join-rate'] as const,
    verification: ['anti-raid', 'verification'] as const,
    lockdown: ['anti-raid', 'lockdown'] as const,
    roleAlerts: ['anti-raid', 'role-alerts'] as const,
    auditWatches: ['anti-raid', 'audit-watches'] as const,
  },
  trustReputation: {
    config: ['trust-reputation', 'config'] as const,
    user: (userId: string) => ['trust-reputation', 'users', userId] as const,
    channelRules: (channelId: string) => ['trust-reputation', 'channels', channelId, 'rules'] as const,
    riskAssessments: ['trust-reputation', 'risk-assessments'] as const,
    probations: ['trust-reputation', 'probations'] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    detail: (ticketId: string) => ['tickets', ticketId] as const,
    categories: ['tickets', 'categories'] as const,
    slaViolations: ['tickets', 'sla-violations'] as const,
  },
  commands: {
    all: ['commands'] as const,
    detail: (commandId: string) => ['commands', commandId] as const,
    stats: (commandId: string) => ['commands', commandId, 'stats'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    detail: (jobId: string) => ['jobs', jobId] as const,
    runs: (jobId: string) => ['jobs', jobId, 'runs'] as const,
  },
  audit: {
    guildLogs: (params?: { limit?: number; offset?: number }) => ['audit', 'guild-logs', params] as const,
  },
  server: {
    info: ['server', 'info'] as const,
    roles: ['server', 'roles'] as const,
    channels: ['server', 'channels'] as const,
    auditLogs: ['server', 'audit-logs'] as const,
    invites: ['server', 'invites'] as const,
  },
  discord: {
    channels: ['discord', 'channels'] as const,
    guild: ['discord', 'guild'] as const,
    members: ['discord', 'members'] as const,
    member: (memberId: string) => ['discord', 'members', memberId] as const,
  },
  config: {
    all: ['configuration', 'configs'] as const,
    detail: (key: string) => ['configuration', 'configs', key] as const,
    messages: ['configuration', 'messages'] as const,
    message: (key: string) => ['configuration', 'messages', key] as const,
  },
  actions: {
    all: ['actions'] as const,
    list: (params?: { limit?: number; offset?: number }) => ['actions', 'list', params] as const,
  },
  messages: {
    sent: ['messages', 'sent'] as const,
  },
  apiHealth: {
    health: ['api', 'health'] as const,
    stats: ['api', 'stats'] as const,
  },
};

// Auth Hooks
export const useAuth = () => {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const response = await authAPI.me();
      const d = response.data as unknown as Record<string, unknown>;
      if (d && typeof d === 'object' && 'data' in d && d.data) return d.data as User;
      if (d && typeof d === 'object' && 'user' in d && d.user) return d.user as User;
      if (d && typeof d === 'object' && 'id' in d) return d as unknown as User;
      throw new Error('Invalid response structure');
    },
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 401 (unauthorized)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSession = () => {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      try {
        const response = await authAPI.session();
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 401 (unauthorized)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedGuildId');
      queryClient.clear();
      toast.success('Successfully logged out!');
    },
  });
};

export const useUserSessions = () => {
  return useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: async () => {
      const response = await authAPI.getSessions();
      return extractResponseData(response, { sessions: [] }).sessions;
    },
    staleTime: 30 * 1000,
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authAPI.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
      toast.success('Session revoked');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke session');
    },
  });
};

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authAPI.revokeOtherSessions(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
      const count = extractResponseData(response, { revokedCount: 0 }).revokedCount;
      toast.success(count > 0 ? `Revoked ${count} other session(s)` : 'No other sessions to revoke');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke sessions');
    },
  });
};

// Guild Hooks - Updated to match backend API
export const useGuilds = () => {
  return useQuery({
    queryKey: queryKeys.guilds.all,
    queryFn: async () => {
      try {
        const response = await guildAPI.getGuilds();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useConnectGuild = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (discordGuildId: string) => guildAPI.connectGuild(discordGuildId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guilds.all });
      toast.success('Guild connected successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to connect guild');
    },
  });
};

export const useBranding = () => {
  return useQuery({
    queryKey: queryKeys.guilds.branding,
    queryFn: async () => {
      try {
        const response = await guildAPI.getBranding();
        return extractResponseData(response, { primaryColor: '#5865F2', logoUrl: null });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateBranding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => guildAPI.updateBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guilds.branding });
      toast.success('Branding updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update branding');
    },
  });
};

// User Hooks - Updated to match backend API
export const useUsers = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.users.all(params),
    queryFn: async () => {
      try {
        const response = await userAPI.getUsers(params);
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useDiscordMembers = () => {
  return useQuery({
    queryKey: queryKeys.users.discord,
    queryFn: async () => {
      try {
        const response = await userAPI.getDiscordMembers();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSyncUsers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => userAPI.syncUsers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.discord });
      toast.success('Users synced successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync users');
    },
  });
};

export const useUserByDiscordId = (discordId: string) => {
  return useQuery({
    queryKey: queryKeys.users.profile(discordId),
    queryFn: async () => {
      try {
        const response = await userAPI.getUserByDiscordId(discordId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!discordId,
  });
};

export const useUserProfile = (discordId: string) => {
  return useQuery({
    queryKey: queryKeys.users.profile(discordId),
    queryFn: async () => {
      try {
        const response = await userAPI.getUserProfile(discordId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!discordId,
  });
};

// Incident Hooks - Updated to match backend API
export const useIncidents = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.incidents.all(params),
    queryFn: async () => {
      try {
        const response = await incidentAPI.getIncidents(params);
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useIncident = (incidentId: string) => {
  return useQuery({
    queryKey: queryKeys.incidents.detail(incidentId),
    queryFn: async () => {
      try {
        const response = await incidentAPI.getIncident(incidentId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!incidentId,
  });
};

export const useCreateIncident = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => incidentAPI.createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      toast.success('Incident created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create incident');
    },
  });
};

export const useUpdateIncident = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: any }) =>
      incidentAPI.updateIncident(incidentId, data),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.detail(incidentId) });
      toast.success('Incident updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update incident');
    },
  });
};

export const useApproveIncident = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: any }) =>
      incidentAPI.approveIncident(incidentId, data),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.detail(incidentId) });
      toast.success('Incident approved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve incident');
    },
  });
};

export const useRejectIncident = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: any }) =>
      incidentAPI.rejectIncident(incidentId, data),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.detail(incidentId) });
      toast.success('Incident rejected successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject incident');
    },
  });
};

// Analytics Hooks - Updated to match backend API
export const useMemberGrowth = (days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.analytics.memberGrowth(days),
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getMemberGrowth(days);
        return extractResponseData(response, { daily: [], total: 0 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useActivity = (days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.analytics.activity(days),
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getActivity(days);
        return extractResponseData(response, { messages: 0, reactions: 0, voiceMinutes: 0 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useEngagement = (days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.analytics.engagement(days),
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getEngagement(days);
        return extractResponseData(response, { activeUsers: 0, engagementRate: 0 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useModWorkload = (days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.analytics.modWorkload(days),
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getModWorkload(days);
        return extractResponseData(response, { actions: 0, avgResponseTime: 0 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAutomationAnalytics = (days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.analytics.automation(days),
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getAutomation(days);
        return extractResponseData(response, { executions: 0, successRate: 0 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAnomalies = (days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.analytics.anomalies(days),
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getAnomalies(days);
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAnalyticsHealth = () => {
  return useQuery({
    queryKey: queryKeys.analytics.health,
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getHealth();
        return extractResponseData(response, { status: 'unknown' });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000,
  });
};

/** Guild aggregate counts from `GET /api/stats` (requires guild + ANALYTICS_VIEW). */
export const useApiGuildStats = () => {
  return useQuery({
    queryKey: queryKeys.apiHealth.stats,
    queryFn: async () => {
      const response = await apiHealthAPI.getStats();
      return extractResponseData(response, {
        users: 0,
        incidents: 0,
        actions: 0,
        pendingIncidents: 0,
      });
    },
    staleTime: 60 * 1000,
  });
};

// Automation Hooks - Updated to match backend API
export const useAutomations = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.automation.all(params),
    queryFn: async () => {
      try {
        const response = await automationAPI.getAutomations(params);
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000,
  });
};

export const useAutomationTemplates = (params?: { category?: string }) => {
  return useQuery({
    queryKey: queryKeys.automation.templates(params),
    queryFn: async () => {
      const response = await automationTemplatesAPI.list(params);
      return extractResponseData(response, []);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useInstantiateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data?: Record<string, unknown> }) =>
      automationTemplatesAPI.instantiate(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.all() });
      toast.success('Template instantiated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to instantiate template');
    },
  });
};

export const useAutomation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.automation.detail(id),
    queryFn: async () => {
      try {
        const response = await automationAPI.getAutomation(id);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!id,
  });
};

export const useAutomationPlaceholders = (actionType?: string) => {
  return useQuery({
    queryKey: queryKeys.automation.placeholders(actionType),
    queryFn: async () => {
      try {
        const response = await automationAPI.getPlaceholders(actionType);
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useActionsList = () => {
  return useQuery({
    queryKey: queryKeys.automation.actionDefinitions,
    queryFn: async () => {
      try {
        const response = await automationAPI.getActionsList();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useGuildModerationActions = (params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: queryKeys.actions.list(params),
    queryFn: async () => {
      const response = await actionsAPI.getActions(params);
      return extractResponseData(response, []);
    },
    staleTime: 30 * 1000,
  });
};

export const useGuildPrismaAuditLogs = (
  params?: { limit?: number; offset?: number },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.audit.guildLogs(params),
    queryFn: async () => {
      const response = await auditAPI.getGuildAuditLogs(params);
      return extractResponseData(response, []);
    },
    staleTime: 30 * 1000,
    enabled: options?.enabled !== false,
  });
};

export const useCreateAutomation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => automationAPI.createAutomation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.all() });
      toast.success('Automation created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create automation');
    },
  });
};

export const useUpdateAutomation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      automationAPI.updateAutomation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.detail(id) });
      toast.success('Automation updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update automation');
    },
  });
};

export const useDeleteAutomation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => automationAPI.deleteAutomation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.all() });
      toast.success('Automation deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete automation');
    },
  });
};

export const useAutomationRuns = (automationId: string, params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.automation.runs(automationId), params],
    queryFn: async () => {
      const response = await automationAPI.getAutomationRuns(automationId);
      return extractResponseData(response, []);
    },
    enabled: !!automationId,
    staleTime: 30 * 1000,
  });
};

export const useWorkflowAnalytics = (automationId: string, limit = 100) => {
  return useQuery({
    queryKey: [...queryKeys.automation.analytics(automationId), limit],
    queryFn: async () => {
      const response = await automationAPI.getAutomationAnalytics(automationId);
      return extractResponseData(response, {
        totalRuns: 0,
        successRate: 0,
        avgDuration: 0,
        medianDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        slowestBlocks: [],
        failureReasons: [],
        executionTimeline: [],
      });
    },
    enabled: !!automationId,
    staleTime: 60 * 1000,
  });
};

export const useExecuteAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => automationAPI.executeAutomation(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.all() });
      toast.success('Automation executed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to execute automation');
    },
  });
};

// Additional mutation hooks for Cases
export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => casesAPI.createCase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      toast.success('Case created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create case');
    },
  });
};

// Additional mutation hooks for Tickets
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => ticketsAPI.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      toast.success('Ticket created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    },
  });
};

// Additional mutation hooks for Commands
export const useCreateCommand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => commandsAPI.createCommand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.success('Command created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create command');
    },
  });
};

// Cases Hooks
export const useCases = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.cases.all(params),
    queryFn: async () => {
      try {
        const response = await casesAPI.getCases(params);
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 30 * 1000,
  });
};

export const useCase = (caseId: string) => {
  return useQuery({
    queryKey: queryKeys.cases.detail(caseId),
    queryFn: async () => {
      try {
        const response = await casesAPI.getCase(caseId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!caseId,
  });
};

// Auto-Mod Hooks
export const useAutoModRules = () => {
  return useQuery({
    queryKey: queryKeys.autoMod.rules,
    queryFn: async () => {
      try {
        const response = await autoModAPI.getRules();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useAutoModScans = () => {
  return useQuery({
    queryKey: queryKeys.autoMod.scans,
    queryFn: async () => {
      const response = await autoModAPI.getScans();
      return extractResponseData(response, []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateAutoModRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => autoModAPI.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoMod.rules });
      toast.success('Auto-mod rule created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create auto-mod rule');
    },
  });
};

export const useUpdateAutoModRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: Record<string, unknown> }) =>
      autoModAPI.updateRule(ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoMod.rules });
      queryClient.invalidateQueries({ queryKey: queryKeys.autoMod.scans });
      toast.success('Rule updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update rule');
    },
  });
};

export const useAutoModOffenders = () => {
  return useQuery({
    queryKey: queryKeys.autoMod.offenders,
    queryFn: async () => {
      const response = await autoModAPI.getOffenders();
      return extractResponseData(response, []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Anti-Raid Hooks
export const useAntiRaidConfig = () => {
  return useQuery({
    queryKey: queryKeys.antiRaid.config,
    queryFn: async () => {
      try {
        const response = await antiRaidAPI.getConfig();
        return extractResponseData(response, { enabled: false, joinThreshold: 5 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateAntiRaidConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => antiRaidAPI.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.antiRaid.config });
      toast.success('Anti-raid configuration updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update anti-raid configuration');
    },
  });
};

export const useAntiRaidJoinRate = () => {
  return useQuery({
    queryKey: queryKeys.antiRaid.joinRate,
    queryFn: async () => {
      const response = await antiRaidAPI.getJoinRate();
      return extractResponseData(response, { config: {}, recent: [] });
    },
    staleTime: 30 * 1000,
  });
};

export const useAntiRaidLockdown = () => {
  return useQuery({
    queryKey: queryKeys.antiRaid.lockdown,
    queryFn: async () => {
      const response = await antiRaidAPI.getLockdown();
      return extractResponseData(response, null);
    },
    staleTime: 30 * 1000,
  });
};

export const useSetAntiRaidLockdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { enabled: boolean; reason: string }) =>
      antiRaidAPI.setLockdown(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.antiRaid.lockdown });
      queryClient.invalidateQueries({ queryKey: queryKeys.antiRaid.config });
      toast.success('Lockdown state updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update lockdown');
    },
  });
};

// Trust & Reputation Hooks
export const useTrustReputationConfig = () => {
  return useQuery({
    queryKey: queryKeys.trustReputation.config,
    queryFn: async () => {
      try {
        const response = await trustReputationAPI.getConfig();
        return extractResponseData(response, { enabled: false, defaultTrust: 50 });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useUserTrust = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.trustReputation.user(userId),
    queryFn: async () => {
      try {
        const response = await trustReputationAPI.getUserTrust(userId);
        return extractResponseData(response, { trustScore: 50, flags: [] });
      } catch (error) {
        throw error;
      }
    },
    enabled: !!userId,
  });
};

export const useTrustProbations = () => {
  return useQuery({
    queryKey: queryKeys.trustReputation.probations,
    queryFn: async () => {
      const response = await trustReputationAPI.getProbations();
      return extractResponseData(response, []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateModerationAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      actionType: 'warn' | 'timeout' | 'note' | 'ban' | 'kick';
      executor: string;
      reason?: string;
      duration?: number;
    }) => actionsAPI.createAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.list() });
      toast.success('Moderation action executed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to execute action');
    },
  });
};

// Tickets Hooks
export const useTickets = () => {
  return useQuery({
    queryKey: queryKeys.tickets.all,
    queryFn: async () => {
      try {
        const response = await ticketsAPI.getTickets();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 30 * 1000,
  });
};

export const useTicket = (ticketId: string) => {
  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: async () => {
      try {
        const response = await ticketsAPI.getTicket(ticketId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!ticketId,
  });
};

// Commands Hooks
export const useCommands = () => {
  return useQuery({
    queryKey: queryKeys.commands.all,
    queryFn: async () => {
      try {
        const response = await commandsAPI.getCommands();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useCommand = (commandId: string) => {
  return useQuery({
    queryKey: queryKeys.commands.detail(commandId),
    queryFn: async () => {
      try {
        const response = await commandsAPI.getCommand(commandId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!commandId,
  });
};

// Jobs Hooks
export const useJobs = () => {
  return useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: async () => {
      try {
        const response = await jobsAPI.getJobs();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 30 * 1000,
  });
};

export const useJob = (jobId: string) => {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: async () => {
      try {
        const response = await jobsAPI.getJob(jobId);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!jobId,
  });
};

// Server Hooks
export const useServerInfo = () => {
  return useQuery({
    queryKey: queryKeys.server.info,
    queryFn: async () => {
      try {
        const response = await serverAPI.getServerInfo();
        return extractResponseData(response, { 
          name: 'Unknown Server', 
          memberCount: 0, 
          onlineCount: 0, 
          channels: 0, 
          roles: 0 
        });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useServerRoles = () => {
  return useQuery({
    queryKey: queryKeys.server.roles,
    queryFn: async () => {
      try {
        const response = await serverAPI.getRoles();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useServerChannels = () => {
  return useQuery({
    queryKey: queryKeys.server.channels,
    queryFn: async () => {
      try {
        const response = await serverAPI.getChannels();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Discord Hooks
export const useDiscordChannels = () => {
  return useQuery({
    queryKey: queryKeys.discord.channels,
    queryFn: async () => {
      try {
        const response = await discordAPI.getChannels();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000,
  });
};

export const useDiscordGuild = () => {
  return useQuery({
    queryKey: queryKeys.discord.guild,
    queryFn: async () => {
      try {
        const response = await discordAPI.getGuild();
        return extractResponseData(response, { 
          id: '', 
          name: 'Unknown Guild', 
          icon: null, 
          memberCount: 0, 
          description: null 
        });
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Configuration Hooks - Updated to match backend API
export const useConfigs = () => {
  return useQuery({
    queryKey: queryKeys.config.all,
    queryFn: async () => {
      try {
        const response = await configAPI.getConfigs();
        return extractResponseData(response, []);
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useConfig = (key: string) => {
  return useQuery({
    queryKey: queryKeys.config.detail(key),
    queryFn: async () => {
      try {
        const response = await configAPI.getConfig(key);
        return extractResponseData(response, null);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!key,
  });
};

export const useCreateConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => configAPI.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.all });
      toast.success('Configuration created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create configuration');
    },
  });
};