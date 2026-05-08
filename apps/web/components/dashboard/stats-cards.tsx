"use client"

import {
  Users,
  MessageSquare,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  ListChecks,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useDiscordMembers, useAnalyticsHealth, useApiGuildStats } from "@/lib/hooks/use-api"

function formatTrendPct(value: number | undefined): { label: string; up: boolean } | null {
  if (value === undefined || Number.isNaN(value)) return null
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) return { label: "0%", up: true }
  const up = rounded > 0
  return { label: `${up ? "+" : ""}${rounded}%`, up }
}

export function StatsCards() {
  const { data: members = [], isLoading: membersLoading } = useDiscordMembers()
  const { data: health, isLoading: healthLoading } = useAnalyticsHealth()
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useApiGuildStats()

  const loading = membersLoading || healthLoading || statsLoading

  const totalMembers = Array.isArray(members) ? members.length : 0
  const onlineMembers = Array.isArray(members)
    ? members.filter((m: any) => m?.status === "online" || m?.presence?.status === "online").length
    : 0

  const h = health as Record<string, number> | undefined
  const messagesToday = h?.messagesToday ?? 0
  const activeIncidents = h?.activeIncidents ?? 0
  const modActions = h?.modActions ?? 0
  const messageTrend = formatTrendPct(h?.messageTrend)
  const incidentTrend = formatTrendPct(h?.incidentTrend)
  const actionTrend = formatTrendPct(h?.actionTrend)

  const pending = statsError ? null : ((stats as any)?.pendingIncidents ?? 0)
  const totalIncidents = statsError ? null : ((stats as any)?.incidents ?? 0)
  const totalActions = statsError ? null : ((stats as any)?.actions ?? 0)

  const cards = [
    {
      title: "Discord members",
      value: loading ? "—" : totalMembers.toLocaleString(),
      subtitle: loading ? "…" : `${onlineMembers.toLocaleString()} online (live fetch)`,
      icon: Users,
      trend: null,
      trendCaption: "",
    },
    {
      title: "Messages today",
      value: loading ? "—" : messagesToday.toLocaleString(),
      subtitle: "This guild (tracked)",
      icon: MessageSquare,
      trend: messageTrend,
      trendCaption: "vs yesterday",
    },
    {
      title: "Active incidents",
      value: loading ? "—" : activeIncidents.toLocaleString(),
      subtitle: "Pending / reviewing",
      icon: AlertTriangle,
      trend: incidentTrend,
      trendCaption: "vs yesterday",
    },
    {
      title: "Pending (queue)",
      value: loading ? "—" : pending === null ? "—" : pending.toLocaleString(),
      subtitle:
        totalIncidents === null ? "Stats unavailable" : `${totalIncidents.toLocaleString()} total`,
      icon: Activity,
      trend: null,
      trendCaption: "",
    },
    {
      title: "Mod actions today",
      value: loading ? "—" : modActions.toLocaleString(),
      subtitle: "Executed today",
      icon: Shield,
      trend: actionTrend,
      trendCaption: "vs yesterday",
    },
    {
      title: "Actions (all time)",
      value: loading ? "—" : totalActions === null ? "—" : totalActions.toLocaleString(),
      subtitle: "Recorded in app",
      icon: ListChecks,
      trend: null,
      trendCaption: "",
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((stat) => (
        <div key={stat.title} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.title}</span>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-semibold tracking-tight">{stat.value}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {stat.trend ? (
              <div
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  stat.trend.up ? "text-emerald-600" : "text-red-600",
                )}
              >
                {stat.trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.trend.label}
              </div>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {stat.subtitle}
              {stat.trendCaption ? ` · ${stat.trendCaption}` : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ServerHealthCard() {
  const { data: health, isLoading } = useAnalyticsHealth()
  const { data: stats, isError: statsError } = useApiGuildStats()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-9 w-20" />
        <Skeleton className="mt-4 h-2 w-full" />
      </div>
    )
  }

  const h = health as Record<string, number> | undefined
  const activeIncidents = h?.activeIncidents ?? 0
  const pending = statsError ? 0 : ((stats as any)?.pendingIncidents ?? 0)
  /** Simple heuristic: fewer open incidents → higher score (0–100). */
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - activeIncidents * 12 - pending * 6)),
  )

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Server health (heuristic)</h3>
          <p className="mt-1 text-2xl font-semibold">{healthScore}%</p>
        </div>
        <div
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            healthScore >= 90
              ? "bg-emerald-50 text-emerald-700"
              : healthScore >= 70
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700",
          )}
        >
          {healthScore >= 90 ? "Excellent" : healthScore >= 70 ? "Good" : "Needs attention"}
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              healthScore >= 90 ? "bg-emerald-500" : healthScore >= 70 ? "bg-amber-500" : "bg-red-500",
            )}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Based on active incidents and pending queue. See analytics for full metrics.
      </p>
    </div>
  )
}
