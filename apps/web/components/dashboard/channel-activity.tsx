"use client"

import { useMemo } from "react"
import { Hash, Loader2 } from "lucide-react"
import { useDiscordChannels, useEngagement } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"

const riskColors = {
  low: { text: "text-emerald-600", bg: "bg-emerald-500" },
  medium: { text: "text-amber-600", bg: "bg-amber-500" },
  high: { text: "text-red-600", bg: "bg-red-500" },
}

export function ChannelActivity() {
  const { data: heatmap = [], isLoading: heatLoading, isError: heatError } = useEngagement(7)
  const { data: channels = [], isLoading: chLoading, isError: chError } = useDiscordChannels()

  const rows = useMemo(() => {
    const byChannel = new Map<string, number>()
    for (const row of heatmap as Array<{ channelId?: string | null; messageCount?: number }>) {
      if (!row.channelId) continue
      byChannel.set(row.channelId, (byChannel.get(row.channelId) ?? 0) + (row.messageCount ?? 0))
    }

    const list = [...byChannel.entries()]
      .map(([channelId, messages]) => {
        const ch = (channels as Array<{ id: string; name?: string }>).find((c) => c.id === channelId)
        const name = ch?.name ? `#${ch.name}` : `Channel ${channelId.slice(0, 6)}…`
        return { channelId, name, messages }
      })
      .filter((r) => r.messages > 0)
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 8)

    const counts = list.map((r) => r.messages)
    const sorted = [...counts].sort((a, b) => a - b)
    const p75 = sorted.length ? sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1]! : 0

    return list.map((r) => {
      let risk: keyof typeof riskColors = "low"
      if (r.messages >= p75 * 1.5 && r.messages > 5) risk = "high"
      else if (r.messages >= p75 && r.messages > 2) risk = "medium"
      return { ...r, risk }
    })
  }, [heatmap, channels])

  const maxMessages = rows.length ? Math.max(...rows.map((c) => c.messages), 1) : 1

  if (heatLoading || chLoading) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Loading channel activity…</p>
      </div>
    )
  }

  if (heatError || chError) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        Could not load channel activity.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-medium">Channel Activity</h3>
        <span className="text-xs text-muted-foreground">Last 7d (heatmap)</span>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            No per-channel message counts yet. Analytics records engagement as the bot collects metrics.
          </p>
        ) : (
          rows.map((channel) => {
            const risk = riskColors[channel.risk]
            const percentage = (channel.messages / maxMessages) * 100
            return (
              <div key={channel.channelId} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{channel.name.replace(/^#/, "")}</span>
                  </div>
                  <span className={cn("text-xs font-medium capitalize shrink-0", risk.text)}>{channel.risk}</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", risk.bg)} style={{ width: `${percentage}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{channel.messages.toLocaleString()} messages (est.)</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
