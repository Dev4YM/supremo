"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { useGuilds } from '@/lib/hooks/use-api';

interface GuildContextType {
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string) => void;
  guilds: any[];
  isLoading: boolean;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const { data: guilds = [], isLoading } = useGuilds();

  // Load selected guild from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedGuildId');
      if (stored) {
        setSelectedGuildIdState(stored);
      }
    }
  }, []);

  // Auto-select first guild if none selected and guilds are available
  useEffect(() => {
    if (!selectedGuildId && guilds.length > 0 && !isLoading) {
      const firstGuild = guilds[0];
      const guildId = firstGuild.id || firstGuild.discordGuildId;
      if (guildId) {
        setSelectedGuildId(guildId);
      }
    }
  }, [selectedGuildId, guilds, isLoading]);

  const setSelectedGuildId = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedGuildId', guildId);
    }
  };

  return (
    <GuildContext.Provider value={{
      selectedGuildId,
      setSelectedGuildId,
      guilds,
      isLoading
    }}>
      {children}
    </GuildContext.Provider>
  );
}

export function useGuildContext() {
  const context = useContext(GuildContext);
  if (context === undefined) {
    throw new Error('useGuildContext must be used within a GuildProvider');
  }
  return context;
}