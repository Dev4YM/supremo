"use client"

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
} from "lucide-react"
import { moderators } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

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

const modStats = [
  { label: "Total Moderators", value: "12", icon: Shield, color: "text-primary" },
  { label: "Online Now", value: "8", icon: Clock, color: "text-emerald-500" },
  { label: "Actions Today", value: "120", icon: TrendingUp, color: "text-amber-500" },
  { label: "Avg Response", value: "2.3m", icon: MessageSquare, color: "text-blue-500" },
]

export default function ModeratorsPage() {
  const sortedMods = [...moderators].sort((a, b) => b.actionsThisWeek - a.actionsThisWeek)
  const maxActions = Math.max(...sortedMods.map(m => m.actionsThisWeek))

  return (
    <div className="space-y-6">
      {/* Stats */}
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

      {/* Leaderboard */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Weekly Leaderboard</CardTitle>
                <p className="text-xs text-muted-foreground">Top performers this week</p>
              </div>
            </div>
            <Button size="sm" className="h-9 gap-2">
              <UserPlus className="h-4 w-4" />
              Add Moderator
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {sortedMods.map((mod, index) => {
              const status = statusConfig[mod.status as keyof typeof statusConfig]
              const role = roleConfig[mod.role as keyof typeof roleConfig]
              const RoleIcon = role?.icon || Shield
              const progressPercent = (mod.actionsThisWeek / maxActions) * 100

              return (
                <div
                  key={mod.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-lg",
                    index === 0 ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent" :
                    index === 1 ? "border-zinc-400/30 bg-gradient-to-r from-zinc-500/10 to-transparent" :
                    index === 2 ? "border-orange-600/30 bg-gradient-to-r from-orange-600/10 to-transparent" :
                    "border-border/50 bg-secondary/20"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold",
                      index === 0 ? "bg-amber-500 text-amber-950" :
                      index === 1 ? "bg-zinc-400 text-zinc-950" :
                      index === 2 ? "bg-orange-600 text-orange-950" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-offset-background" style={{ 
                        ['--tw-ring-color' as string]: index < 3 ? 
                          index === 0 ? 'rgb(245 158 11)' : 
                          index === 1 ? 'rgb(161 161 170)' : 
                          'rgb(234 88 12)' : 'transparent' 
                      }}>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mod.name}`} />
                        <AvatarFallback className={cn("font-semibold", role?.bg, role?.color)}>
                          {mod.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background", status.color)} />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{mod.name}</span>
                        {index === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <RoleIcon className={cn("h-3 w-3", role?.color)} />
                        <span className={cn("text-xs font-medium", role?.color)}>{mod.role}</span>
                        <span className="text-xs text-muted-foreground">| Joined {mod.joinedAt}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden text-center sm:block">
                      <p className="text-2xl font-bold tabular-nums text-foreground">{mod.actionsToday}</p>
                      <p className="text-[10px] text-muted-foreground">Today</p>
                    </div>

                    <div className="hidden w-40 sm:block">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">This week</span>
                        <span className="font-semibold text-foreground">{mod.actionsThisWeek}</span>
                      </div>
                      <Progress value={progressPercent} className="mt-1 h-2" />
                    </div>

                    {/* Actions */}
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

      {/* Role Permissions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Role Permissions</CardTitle>
                <p className="text-xs text-muted-foreground">Configure moderator access levels</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2 border-border/50 bg-transparent">
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
                    {[
                      name === "Administrator" ? "Full Access" : null,
                      "Ban Users",
                      "Mute Users", 
                      "Delete Messages",
                      name !== "Trial Moderator" ? "Kick Users" : null,
                    ].filter(Boolean).map((perm) => (
                      <Badge key={perm} variant="outline" className="mr-1 border-0 bg-background/50 text-[10px]">
                        {perm}
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