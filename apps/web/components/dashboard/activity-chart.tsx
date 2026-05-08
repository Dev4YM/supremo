"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { useGuildModerationActions } from "@/lib/hooks/use-api"
import { Loader2 } from "lucide-react"

const chartColors = {
  warnings: "#f59e0b",
  bans: "#ef4444",
  mutes: "#3b82f6",
  deletions: "#10b981",
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="mb-1.5 text-xs font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs capitalize text-muted-foreground">{entry.dataKey}</span>
            </div>
            <span className="text-xs font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildChartData(actions: Array<{ type: string; executedAt?: string | null }>, days: number) {
  const keys: string[] = []
  const display: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    keys.push(d.toISOString().slice(0, 10))
    display.push(
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    )
  }

  const rows = keys.map((iso, idx) => ({
    key: iso,
    date: display[idx]!,
    warnings: 0,
    bans: 0,
    mutes: 0,
    deletions: 0,
  }))
  const byKey = new Map(rows.map((r) => [r.key, r]))

  for (const action of actions) {
    if (!action.executedAt) continue
    const dayKey = new Date(action.executedAt).toISOString().slice(0, 10)
    const row = byKey.get(dayKey)
    if (!row) continue
    switch (action.type) {
      case "WARN":
        row.warnings++
        break
      case "BAN":
        row.bans++
        break
      case "TIMEOUT":
      case "KICK":
        row.mutes++
        break
      case "DELETE_MESSAGES":
        row.deletions++
        break
      default:
        break
    }
  }

  return rows.map(({ date, warnings, bans, mutes, deletions }) => ({
    date,
    warnings,
    bans,
    mutes,
    deletions,
  }))
}

export function ActivityChart() {
  const { data: actions = [], isLoading, isError } = useGuildModerationActions({ limit: 500 })
  const moderationActivity = useMemo(() => buildChartData(actions, 14), [actions])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Loading activity…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Could not load moderation activity.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Moderation Activity</h3>
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(chartColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs capitalize text-muted-foreground">{key}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Last 14 days from guild action log. Mutes include timeouts and kicks; deletions are message purges.
      </p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={moderationActivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              {Object.entries(chartColors).map(([key, color]) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dy={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="deletions" stroke={chartColors.deletions} fill={`url(#fill-deletions)`} strokeWidth={1.5} />
            <Area type="monotone" dataKey="warnings" stroke={chartColors.warnings} fill={`url(#fill-warnings)`} strokeWidth={1.5} />
            <Area type="monotone" dataKey="mutes" stroke={chartColors.mutes} fill={`url(#fill-mutes)`} strokeWidth={1.5} />
            <Area type="monotone" dataKey="bans" stroke={chartColors.bans} fill={`url(#fill-bans)`} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
