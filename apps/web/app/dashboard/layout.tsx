"use client"

import React from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AuthGuard } from '@/components/auth/auth-guard';
import { GuildProvider, useGuildContext } from '@/components/providers/guild-provider';
import { GuildSetup } from '@/components/dashboard/guild-setup';
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <GuildProvider>
          <GuildSetupWrapper>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <DashboardHeader />
                <main className="flex-1 overflow-auto">
                  <div className="container max-w-[1800px] space-y-6 p-6">
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </div>
                </main>
              </SidebarInset>
            </SidebarProvider>
          </GuildSetupWrapper>
        </GuildProvider>
      </AuthGuard>
    </ErrorBoundary>
  )
}

function GuildSetupWrapper({ children }: { children: React.ReactNode }) {
  const { selectedGuildId, guilds, isLoading } = useGuildContext();

  // Show guild setup if no guild is selected or available
  if (!isLoading && (!selectedGuildId || guilds.length === 0)) {
    return <GuildSetup />;
  }

  return <>{children}</>;
}