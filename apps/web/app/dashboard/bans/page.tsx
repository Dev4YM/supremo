"use client"

import { useMemo } from "react"
import { BanList } from "@/components/dashboard/ban-list"
import { Card, CardContent } from "@/components/ui/card"
import { UserX, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuildModerationActions } from "@/lib/hooks/use-api"

export default function BansPage() {
  const { data: actions = [], isLoading } = useGuildModerationActions({ limit: 500 })

  const banStats = useMemo(() => {
    const bans = (actions as Array<{ type: string }>).filter((a) => a.type === "BAN")
    return [
      { label: "Total Bans", value: bans.length.toString(), icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
      { label: "Recent (30d)", value: bans.length.toString(), icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
      { label: "Active Records", value: bans.length.toString(), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
      { label: "Appeals Tracked", value: "0", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
    ]
  }, [actions])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {banStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.bg, stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <BanList />
    </div>
  )
}
