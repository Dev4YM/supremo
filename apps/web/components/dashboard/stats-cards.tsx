"use client"

import { serverStats } from "@/lib/mock-data"
import {
  Users,
  UserPlus,
  MessageSquareOff,
  AlertTriangle,
  Ban,
  Shield,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

const stats = [
  {
    title: "Total Members",
    value: serverStats.totalMembers.toLocaleString(),
    subtitle: `${serverStats.onlineMembers.toLocaleString()} online`,
    icon: Users,
    trend: "+12%",
    trendUp: true,
  },
  {
    title: "New Members",
    value: serverStats.newMembersToday.toLocaleString(),
    subtitle: "Today",
    icon: UserPlus,
    trend: "+8%",
    trendUp: true,
  },
  {
    title: "Messages Deleted",
    value: serverStats.messagesDeleted.toLocaleString(),
    subtitle: "Past 24h",
    icon: MessageSquareOff,
    trend: "-5%",
    trendUp: false,
  },
  {
    title: "Warnings Issued",
    value: serverStats.warningsIssued.toLocaleString(),
    subtitle: "Today",
    icon: AlertTriangle,
    trend: "+3%",
    trendUp: true,
  },
  {
    title: "Bans",
    value: serverStats.bansToday.toLocaleString(),
    subtitle: "Today",
    icon: Ban,
    trend: "-15%",
    trendUp: false,
  },
  {
    title: "Active Mods",
    value: serverStats.activeModerators.toLocaleString(),
    subtitle: "Online now",
    icon: Shield,
    trend: "+2",
    trendUp: true,
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.title}</span>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-semibold tracking-tight">{stat.value}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              stat.trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              {stat.trendUp ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {stat.trend}
            </div>
            <span className="text-xs text-muted-foreground">{stat.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ServerHealthCard() {
  const health = serverStats.serverHealth

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Server Health</h3>
          <p className="mt-1 text-2xl font-semibold">{health}%</p>
        </div>
        <div className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          health >= 90 ? "bg-emerald-50 text-emerald-700" : 
          health >= 70 ? "bg-amber-50 text-amber-700" : 
          "bg-red-50 text-red-700"
        )}>
          {health >= 90 ? "Excellent" : health >= 70 ? "Good" : "Needs Attention"}
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              health >= 90 ? "bg-emerald-500" : health >= 70 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Your server is running smoothly with minimal issues.
      </p>
    </div>
  )
}
