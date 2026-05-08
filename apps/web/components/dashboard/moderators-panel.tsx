"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { moderators } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const statusColors = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  offline: "bg-gray-300",
}

export function ModeratorsPanel() {
  const sortedModerators = [...moderators].sort((a, b) => b.actionsToday - a.actionsToday)
  const onlineCount = moderators.filter((m) => m.status === "online").length

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-medium">Mod Team</h3>
          <p className="text-xs text-muted-foreground">{onlineCount} online</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {sortedModerators.map((mod, index) => (
          <div key={mod.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mod.name}`} />
                  <AvatarFallback className="text-xs">{mod.avatar}</AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                  statusColors[mod.status as keyof typeof statusColors]
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">{mod.name}</p>
                <p className="text-xs text-muted-foreground">{mod.role}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{mod.actionsToday}</p>
              <p className="text-[11px] text-muted-foreground">today</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
