"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { recentActions } from "@/lib/mock-data"
import { Ban, AlertTriangle, VolumeX, Trash2, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"

const actionConfig = {
  ban: { icon: Ban, color: "text-red-600", bg: "bg-red-50" },
  warn: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  mute: { icon: VolumeX, color: "text-orange-600", bg: "bg-orange-50" },
  delete: { icon: Trash2, color: "text-blue-600", bg: "bg-blue-50" },
  kick: { icon: UserMinus, color: "text-violet-600", bg: "bg-violet-50" },
}

export function RecentActions() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-medium">Recent Actions</h3>
        <button className="text-xs text-muted-foreground hover:text-foreground">View all</button>
      </div>
      <div className="divide-y divide-border">
        {recentActions.slice(0, 6).map((action) => {
          const config = actionConfig[action.type as keyof typeof actionConfig]
          const Icon = config.icon
          return (
            <div key={action.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${action.user.name}`} />
                    <AvatarFallback className="text-[10px]">{action.user.avatar}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{action.user.name}</span>
                  <span className={cn("shrink-0 text-xs font-medium capitalize", config.color)}>{action.type}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{action.reason}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  by {action.moderator.name} in {action.channel} - {action.timestamp}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
