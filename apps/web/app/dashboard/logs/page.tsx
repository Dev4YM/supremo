"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Ban,
  AlertTriangle,
  VolumeX,
  Trash2,
  UserMinus,
  ScrollText,
  Calendar,
  MoreHorizontal,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useGuildModerationActions } from "@/lib/hooks/use-api"

const actionConfig = {
  ban: { icon: Ban, color: "text-red-500", bg: "bg-red-500/10" },
  warn: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  mute: { icon: VolumeX, color: "text-orange-500", bg: "bg-orange-500/10" },
  delete: { icon: Trash2, color: "text-blue-500", bg: "bg-blue-500/10" },
  kick: { icon: UserMinus, color: "text-purple-500", bg: "bg-purple-500/10" },
}

type LogFilter = "all" | "ban" | "warn" | "mute" | "kick" | "delete"

function mapApiActionToLogFilterType(action: Record<string, unknown>): LogFilter {
  const t = String(action.type || "").toUpperCase()
  if (t.includes("BAN")) return "ban"
  if (t.includes("KICK")) return "kick"
  if (t.includes("TIMEOUT") || t.includes("MUTE")) return "mute"
  if (t.includes("DELETE") || t === "LOG_ONLY") return "delete"
  if (t.includes("WARN")) return "warn"
  return "warn"
}

function mapApiActionToLogRow(action: Record<string, unknown>) {
  const user = action.user as { username?: string; discordId?: string } | undefined
  const params =
    action.parameters && typeof action.parameters === "object"
      ? (action.parameters as Record<string, unknown>)
      : {}
  const reason = (params.reason as string) || String(action.type || "—")
  const executedAt = action.executedAt as string | undefined

  return {
    id: String(action.id),
    type: mapApiActionToLogFilterType(action),
    user: {
      name: user?.username || "Unknown member",
      avatar: (user?.username || "?").slice(0, 2).toUpperCase(),
    },
    moderator: {
      name: String(action.executedBy || action.approvedBy || "Moderator"),
    },
    reason,
    timestamp: executedAt ? new Date(executedAt).toLocaleString() : "—",
  }
}

const Loading = () => (
  <div className="flex items-center justify-center p-12 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
)

function LogsPageContent() {
  const [filterType, setFilterType] = useState<LogFilter>("all")
  const searchParams = useSearchParams()
  void searchParams

  const { data: actions = [], isLoading } = useGuildModerationActions({ limit: 100, offset: 0 })

  const logs = useMemo(
    () => (Array.isArray(actions) ? actions : []).map((a) => mapApiActionToLogRow(a as Record<string, unknown>)),
    [actions],
  )

  const filteredLogs = filterType === "all" ? logs : logs.filter((log) => log.type === filterType)

  const stats = useMemo(() => {
    const total = logs.length
    const count = (t: LogFilter) => logs.filter((l) => l.type === t).length
    return {
      total,
      warnings: count("warn"),
      bans: count("ban"),
      mutes: count("mute"),
    }
  }, [logs])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Logs", value: stats.total.toString(), change: "From API" },
          { label: "Warnings", value: stats.warnings.toString(), change: "WARN / note" },
          { label: "Bans", value: stats.bans.toString(), change: "BAN" },
          { label: "Mutes", value: stats.mutes.toString(), change: "TIMEOUT" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Moderation Logs</CardTitle>
                <p className="text-xs text-muted-foreground">{filteredLogs.length} entries (guild actions)</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="h-9 w-full border-border/50 bg-secondary/50 pl-9 sm:w-[200px]"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as LogFilter)}>
                <SelectTrigger className="h-9 w-[130px] border-border/50 bg-secondary/50">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ban">Bans</SelectItem>
                  <SelectItem value="warn">Warnings</SelectItem>
                  <SelectItem value="mute">Mutes</SelectItem>
                  <SelectItem value="kick">Kicks</SelectItem>
                  <SelectItem value="delete">Deletions</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-border/50 bg-transparent">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Date Range</span>
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 border-border/50 bg-transparent">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No moderation actions for this guild yet.</p>
            ) : (
              filteredLogs.map((log) => {
                const config = actionConfig[log.type]
                const Icon = config.icon
                return (
                  <div
                    key={log.id}
                    className="group flex items-center gap-4 rounded-xl border border-border/50 bg-secondary/20 p-4 transition-all hover:bg-secondary/40"
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex flex-1 items-center gap-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(log.user.name)}`} />
                        <AvatarFallback className="text-xs">{log.user.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{log.user.name}</span>
                          <Badge variant="outline" className={cn("border-0 text-[10px] font-semibold uppercase", config.bg, config.color)}>
                            {log.type}
                          </Badge>
                        </div>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{log.reason}</p>
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm text-muted-foreground">by {log.moderator.name}</p>
                      <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredLogs.length === 0 ? 0 : 1}-{filteredLogs.length} of {filteredLogs.length} entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 bg-primary text-primary-foreground">
                1
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LogsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LogsPageContent />
    </Suspense>
  )
}
