"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Shield,
  Crown,
  Star,
  Trophy,
  MoreHorizontal,
  TrendingUp,
  MessageSquare,
  Clock,
  UserPlus,
  Settings,
  Eye,
  UserMinus,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDiscordMembers, useGuildModerationActions } from "@/lib/hooks/use-api"

const MOD_PERMS = new Set([
  "Administrator",
  "ModerateMembers",
  "KickMembers",
  "BanMembers",
  "ManageMessages",
  "ManageGuild",
])

const statusConfig = {
  online: { color: "bg-emerald-500", label: "Online" },
  idle: { color: "bg-amber-500", label: "Idle" },
  offline: { color: "bg-muted-foreground/50", label: "Offline" },
}

const roleConfig: Record<string, { color: string; bg: string; icon: typeof Crown }> = {
  Administrator: { color: "text-red-500", bg: "bg-red-500/10", icon: Crown },
  "Senior Moderator": { color: "text-primary", bg: "bg-primary/10", icon: Star },
  Moderator: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Shield },
  "Trial Moderator": { color: "text-amber-500", bg: "bg-amber-500/10", icon: Shield },
}

type DiscordMember = {
  discordId: string
  displayName?: string
  username: string
  joinedAt?: string
  roles?: Array<{ name: string }>
  permissions?: string[]
  avatar?: string | null
}

export default function ModeratorsPage() {
  const { data: members = [], isLoading: membersLoading } = useDiscordMembers()
  const { data: actions = [], isLoading: actionsLoading } = useGuildModerationActions({ limit: 400 })

  const modMembers = useMemo(() => {
    return (members as DiscordMember[]).filter(
      (m) => Array.isArray(m.permissions) && m.permissions.some((p) => MOD_PERMS.has(p)),
    )
  }, [members])

  const leaderboard = useMemo(() => {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const dayMs = 24 * 60 * 60 * 1000
    const now = Date.now()
    const weekAgo = now - weekMs
    const dayAgo = now - dayMs

    const weekCounts = new Map<string, number>()
    const todayCounts = new Map<string, number>()

    for (const a of actions as Array<{ executedBy?: string | null; approvedBy?: string | null; executedAt?: string | null }>) {
      const actor = a.executedBy || a.approvedBy
      if (!actor || !a.executedAt) continue
      const t = new Date(a.executedAt).getTime()
      if (t >= weekAgo) {
        weekCounts.set(actor, (weekCounts.get(actor) ?? 0) + 1)
      }
      if (t >= dayAgo) {
        todayCounts.set(actor, (todayCounts.get(actor) ?? 0) + 1)
      }
    }

    const fromActions = [...weekCounts.entries()]
      .map(([actor, actionsThisWeek]) => ({
        id: actor,
        name: actor.length > 28 ? `${actor.slice(0, 12)}…` : actor,
        actionsThisWeek,
        actionsToday: todayCounts.get(actor) ?? 0,
        status: "offline" as keyof typeof statusConfig,
        role: "Moderator",
        joinedAt: "—",
        avatarUrl: null as string | null,
      }))
      .sort((a, b) => b.actionsThisWeek - a.actionsThisWeek)

    if (fromActions.length > 0) {
      return fromActions.slice(0, 12)
    }

    return modMembers.slice(0, 12).map((m) => {
      const roles = m.roles ?? []
      const admin = roles.find((r) => r.name === "Administrator" || r.name.includes("Admin"))
      const mod = roles.find((r) => r.name.toLowerCase().includes("mod"))
      const roleLabel = admin?.name || mod?.name || "Staff"

      return {
        id: m.discordId,
        name: m.displayName || m.username,
        actionsThisWeek: 0,
        actionsToday: 0,
        status: "offline" as const,
        role: roleLabel,
        joinedAt: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—",
        avatarUrl: m.avatar ?? null,
      }
    })
  }, [actions, modMembers])

  const maxActions = leaderboard.length ? Math.max(...leaderboard.map((m) => m.actionsThisWeek), 1) : 1

  const modStats = useMemo(() => {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const weekAgo = Date.now() - weekMs
    const weekActionCount = (actions as Array<{ executedAt?: string | null }>).filter(
      (a) => a.executedAt && new Date(a.executedAt).getTime() >= weekAgo,
    ).length
    const actors = new Set<string>()
    for (const a of actions as Array<{ executedBy?: string | null; approvedBy?: string | null; executedAt?: string | null }>) {
      const actor = a.executedBy || a.approvedBy
      if (actor && a.executedAt && new Date(a.executedAt).getTime() >= weekAgo) {
        actors.add(actor)
      }
    }

    return [
      { label: "Staff (mod tools)", value: String(modMembers.length), icon: Shield, color: "text-primary" },
      { label: "Actions (7d)", value: String(weekActionCount), icon: TrendingUp, color: "text-amber-500" },
      { label: "Active actors (7d)", value: String(actors.size), icon: MessageSquare, color: "text-blue-500" },
      { label: "Presence", value: "N/A", icon: Clock, color: "text-muted-foreground" },
    ]
  }, [actions, modMembers.length])

  const loading = membersLoading || actionsLoading

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading moderators…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Weekly Leaderboard</CardTitle>
                <p className="text-xs text-muted-foreground">From guild action log (or staff list if no actions yet)</p>
              </div>
            </div>
            <Button size="sm" className="h-9 gap-2" type="button" disabled>
              <UserPlus className="h-4 w-4" />
              Add Moderator
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {leaderboard.map((mod, index) => {
              const status = statusConfig[mod.status]
              const role = roleConfig[mod.role as keyof typeof roleConfig]
              const RoleIcon = role?.icon || Shield
              const progressPercent = (mod.actionsThisWeek / maxActions) * 100

              return (
                <div
                  key={mod.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-lg",
                    index === 0
                      ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent"
                      : index === 1
                        ? "border-zinc-400/30 bg-gradient-to-r from-zinc-500/10 to-transparent"
                        : index === 2
                          ? "border-orange-600/30 bg-gradient-to-r from-orange-600/10 to-transparent"
                          : "border-border/50 bg-secondary/20",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold",
                        index === 0
                          ? "bg-amber-500 text-amber-950"
                          : index === 1
                            ? "bg-zinc-400 text-zinc-950"
                            : index === 2
                              ? "bg-orange-600 text-orange-950"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </div>

                    <div className="relative">
                      <Avatar
                        className="h-12 w-12 ring-2 ring-offset-2 ring-offset-background"
                        style={{
                          ["--tw-ring-color" as string]:
                            index < 3
                              ? index === 0
                                ? "rgb(245 158 11)"
                                : index === 1
                                  ? "rgb(161 161 170)"
                                  : "rgb(234 88 12)"
                              : "transparent",
                        }}
                      >
                        <AvatarImage
                          src={
                            mod.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mod.name)}`
                          }
                        />
                        <AvatarFallback className={cn("font-semibold", role?.bg, role?.color)}>
                          {mod.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background", status.color)} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{mod.name}</span>
                        {index === 0 && <Trophy className="h-4 w-4 shrink-0 text-amber-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <RoleIcon className={cn("h-3 w-3 shrink-0", role?.color)} />
                        <span className={cn("text-xs font-medium truncate", role?.color)}>{mod.role}</span>
                        <span className="text-xs text-muted-foreground shrink-0">| Joined {mod.joinedAt}</span>
                      </div>
                    </div>

                    <div className="hidden text-center sm:block">
                      <p className="text-2xl font-bold tabular-nums text-foreground">{mod.actionsToday}</p>
                      <p className="text-[10px] text-muted-foreground">24h</p>
                    </div>

                    <div className="hidden w-40 sm:block">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">This week</span>
                        <span className="font-semibold text-foreground">{mod.actionsThisWeek}</span>
                      </div>
                      <Progress value={progressPercent} className="mt-1 h-2" />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Settings className="h-4 w-4" />
                          Edit Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                          <UserMinus className="h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Role Permissions</CardTitle>
                <p className="text-xs text-muted-foreground">Illustrative roles — configure in Discord and RBAC</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2 border-border/50 bg-transparent" type="button" disabled>
              <Settings className="h-4 w-4" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(roleConfig).map(([name, config]) => {
              const RoleIcon = config.icon
              return (
                <div key={name} className={cn("rounded-xl border p-4", config.bg, "border-transparent")}>
                  <div className="flex items-center gap-2">
                    <RoleIcon className={cn("h-5 w-5", config.color)} />
                    <span className={cn("font-semibold", config.color)}>{name}</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {[name === "Administrator" ? "Full Access" : null, "Ban Users", "Mute Users", "Delete Messages", name !== "Trial Moderator" ? "Kick Users" : null]
                      .filter(Boolean)
                      .map((perm) => (
                        <Badge key={perm as string} variant="outline" className="mr-1 border-0 bg-background/50 text-[10px]">
                          {perm as string}
                        </Badge>
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
