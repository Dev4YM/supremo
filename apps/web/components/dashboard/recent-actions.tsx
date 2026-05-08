"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGuildModerationActions } from "@/lib/hooks/use-api"
import { Ban, AlertTriangle, VolumeX, Trash2, UserMinus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

const actionConfig = {
  ban: { icon: Ban, color: "text-red-600", bg: "bg-red-50" },
  warn: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  mute: { icon: VolumeX, color: "text-orange-600", bg: "bg-orange-50" },
  delete: { icon: Trash2, color: "text-blue-600", bg: "bg-blue-50" },
  kick: { icon: UserMinus, color: "text-violet-600", bg: "bg-violet-50" },
} as const

function mapTypeToVisual(type: string): keyof typeof actionConfig {
  switch (type) {
    case "BAN":
      return "ban"
    case "WARN":
      return "warn"
    case "TIMEOUT":
      return "mute"
    case "DELETE_MESSAGES":
      return "delete"
    case "KICK":
      return "kick"
    default:
      return "warn"
  }
}

export function RecentActions() {
  const { data: actions = [], isLoading, isError } = useGuildModerationActions({ limit: 25 })

  const rows = useMemo(() => {
    return [...actions]
      .filter((a: { executedAt?: string | null }) => a.executedAt)
      .sort((a: { executedAt: string }, b: { executedAt: string }) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
      )
      .slice(0, 6)
  }, [actions])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Loading recent actions…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        Could not load moderation actions.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-medium">Recent Actions</h3>
        <Link href="/dashboard/moderation" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No recorded actions yet for this server.</p>
        ) : (
          rows.map((action: {
            id: string
            type: string
            reason?: string | null
            executedBy?: string | null
            approvedBy?: string | null
            executedAt: string
            user?: { username?: string | null } | null
            targetUserId?: string
          }) => {
            const visual = mapTypeToVisual(action.type)
            const config = actionConfig[visual]
            const Icon = config.icon
            const targetName = action.user?.username || action.targetUserId?.slice(0, 8) || "Unknown user"
            const moderator = action.executedBy || action.approvedBy || "System"
            const when = formatDistanceToNow(new Date(action.executedAt), { addSuffix: true })

            return (
              <div key={action.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetName)}`} />
                      <AvatarFallback className="text-[10px]">{targetName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">{targetName}</span>
                    <span className={cn("shrink-0 text-xs font-medium capitalize", config.color)}>{visual}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{action.reason || "No reason provided"}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    by {moderator} — {when}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
