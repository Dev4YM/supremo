"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { moderationActivity } from "@/lib/mock-data"

const chartColors = {
  warnings: "#f59e0b",
  bans: "#ef4444",
  mutes: "#3b82f6",
  deletions: "#10b981",
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) {
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

export function ActivityChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Moderation Activity</h3>
        <div className="flex items-center gap-4">
          {Object.entries(chartColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs capitalize text-muted-foreground">{key}</span>
            </div>
          ))}
        </div>
      </div>
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
