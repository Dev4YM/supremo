"use client"

import { Hash } from "lucide-react"
import { channelActivity } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const riskColors = {
  low: { text: "text-emerald-600", bg: "bg-emerald-500" },
  medium: { text: "text-amber-600", bg: "bg-amber-500" },
  high: { text: "text-red-600", bg: "bg-red-500" },
}

export function ChannelActivity() {
  const maxMessages = Math.max(...channelActivity.map((c) => c.messages))

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-medium">Channel Activity</h3>
        <span className="text-xs text-muted-foreground">Last 24h</span>
      </div>
      <div className="divide-y divide-border">
        {channelActivity.map((channel) => {
          const risk = riskColors[channel.risk as keyof typeof riskColors]
          const percentage = (channel.messages / maxMessages) * 100
          return (
            <div key={channel.name} className="px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{channel.name.replace("#", "")}</span>
                </div>
                <span className={cn("text-xs font-medium capitalize", risk.text)}>{channel.risk}</span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", risk.bg)} style={{ width: `${percentage}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{channel.messages.toLocaleString()} messages</span>
                <span>{channel.modActions} actions</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
