"use client"

import { useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGuildModerationActions } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const statusColors = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  offline: "bg-gray-300",
}

export function ModeratorsPanel() {
  const { data: actions = [], isLoading, isError } = useGuildModerationActions({ limit: 120 })

  const sortedModerators = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000
    const counts = new Map<string, number>()
    const today = new Map<string, number>()

    for (const a of actions as Array<{ executedBy?: string | null; approvedBy?: string | null; executedAt?: string | null }>) {
      const actor = a.executedBy || a.approvedBy
      if (!actor) continue
      counts.set(actor, (counts.get(actor) ?? 0) + 1)
      if (a.executedAt && new Date(a.executedAt).getTime() >= since) {
        today.set(actor, (today.get(actor) ?? 0) + 1)
      }
    }

    return [...counts.entries()]
      .map(([id, actionsCount]) => ({
        id,
        name: id.length > 24 ? `${id.slice(0, 10)}…` : id,
        actionsToday: today.get(id) ?? 0,
        actionsTotal: actionsCount,
        status: "offline" as keyof typeof statusColors,
      }))
      .sort((a, b) => b.actionsTotal - a.actionsTotal)
      .slice(0, 8)
  }, [actions])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Loading mod activity…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        Could not load moderator activity.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-medium">Mod Team</h3>
          <p className="text-xs text-muted-foreground">Top actors by recent guild actions (Discord presence not wired)</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {sortedModerators.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No moderation actions recorded yet.</p>
        ) : (
          sortedModerators.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mod.name)}`} />
                    <AvatarFallback className="text-xs">{mod.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      statusColors[mod.status],
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{mod.name}</p>
                  <p className="text-xs text-muted-foreground truncate">Executor / approver ID</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <p className="text-sm font-semibold tabular-nums">{mod.actionsToday}</p>
                <p className="text-[11px] text-muted-foreground">24h</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
