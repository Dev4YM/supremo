import { User } from '@supremo/shared-types';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedGuildId: string | null;
}

export const getAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      selectedGuildId: null,
    };
  }

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const selectedGuildId = localStorage.getItem('selectedGuildId');

  let user: User | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      localStorage.removeItem('user');
    }
  }

  return {
    user,
    token,
    isAuthenticated: !!(token && user),
    selectedGuildId,
  };
};

export const setAuthState = (token: string, user: User) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('selectedGuildId');
};

export const setSelectedGuild = (guildId: string) => {
  localStorage.setItem('selectedGuildId', guildId);
};

export const getDiscordOAuthUrl = async (): Promise<string> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9691';
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/discord/url`);
    if (!response.ok) {
      throw new Error('Failed to get Discord OAuth URL');
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting Discord OAuth URL:', error);
    throw new Error('Discord OAuth URL not available');
  }
};