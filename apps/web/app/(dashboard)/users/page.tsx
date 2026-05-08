"use client"

import { useState } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  Users,
  MoreHorizontal,
  AlertTriangle,
  Ban,
  VolumeX,
  MessageSquare,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

// Mock user data
const mockUsers = [
  { id: "1", name: "GamerPro2024", avatar: "G", status: "online", role: "Member", joinDate: "Jan 15, 2024", messages: 1456, warnings: 0, mutes: 0 },
  { id: "2", name: "CoolKid99", avatar: "C", status: "online", role: "Member", joinDate: "Mar 22, 2024", messages: 892, warnings: 2, mutes: 1 },
  { id: "3", name: "ModHelper", avatar: "M", status: "idle", role: "Helper", joinDate: "Dec 5, 2023", messages: 3421, warnings: 0, mutes: 0 },
  { id: "4", name: "NewUser123", avatar: "N", status: "offline", role: "New", joinDate: "Jan 20, 2026", messages: 12, warnings: 0, mutes: 0 },
  { id: "5", name: "TroubleMaker", avatar: "T", status: "online", role: "Member", joinDate: "Aug 10, 2024", messages: 567, warnings: 4, mutes: 3 },
  { id: "6", name: "ArtistSoul", avatar: "A", status: "online", role: "Booster", joinDate: "Feb 28, 2024", messages: 2341, warnings: 0, mutes: 0 },
  { id: "7", name: "MusicLover", avatar: "M", status: "idle", role: "Member", joinDate: "Jun 15, 2024", messages: 1089, warnings: 1, mutes: 0 },
  { id: "8", name: "TechWizard", avatar: "T", status: "offline", role: "VIP", joinDate: "Jan 1, 2024", messages: 4562, warnings: 0, mutes: 0 },
]

const statusConfig = {
  online: { color: "bg-emerald-500", label: "Online" },
  idle: { color: "bg-amber-500", label: "Idle" },
  offline: { color: "bg-muted-foreground/50", label: "Offline" },
}

const roleConfig: Record<string, string> = {
  Member: "bg-muted text-muted-foreground",
  Helper: "bg-blue-500/10 text-blue-500",
  Booster: "bg-pink-500/10 text-pink-500",
  VIP: "bg-amber-500/10 text-amber-500",
  New: "bg-emerald-500/10 text-emerald-500",
}

const Loading = () => null;

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const searchParams = useSearchParams()

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: "24,589", icon: Users, color: "text-blue-500" },
            { label: "Online Now", value: "8,432", icon: UserCheck, color: "text-emerald-500" },
            { label: "New Today", value: "156", icon: Clock, color: "text-amber-500" },
            { label: "Flagged", value: "23", icon: AlertTriangle, color: "text-red-500" },
          ].map((stat) => (
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

        {/* Users List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">User Management</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {filteredUsers.length} users found
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full border-border/50 bg-secondary/50 pl-9 sm:w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[130px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredUsers.map((user) => {
                const status = statusConfig[user.status as keyof typeof statusConfig]
                const roleStyle = roleConfig[user.role] || roleConfig.Member
                const hasIssues = user.warnings > 0 || user.mutes > 0
                
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "group relative rounded-xl border p-4 transition-all hover:shadow-lg",
                      hasIssues ? "border-amber-500/30 bg-amber-500/5" : "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {user.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card", status.color)} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <Badge variant="outline" className={cn("mt-1 border-0 text-[10px]", roleStyle)}>
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Warn
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <VolumeX className="h-4 w-4" />
                            Mute
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Shield className="h-4 w-4" />
                            Kick
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                            <Ban className="h-4 w-4" />
                            Ban
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-background/50 p-2">
                        <p className="text-sm font-bold text-foreground">{user.messages.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Messages</p>
                      </div>
                      <div className={cn("rounded-lg p-2", user.warnings > 0 ? "bg-amber-500/10" : "bg-background/50")}>
                        <p className={cn("text-sm font-bold", user.warnings > 0 ? "text-amber-500" : "text-foreground")}>{user.warnings}</p>
                        <p className="text-[10px] text-muted-foreground">Warnings</p>
                      </div>
                      <div className={cn("rounded-lg p-2", user.mutes > 0 ? "bg-orange-500/10" : "bg-background/50")}>
                        <p className={cn("text-sm font-bold", user.mutes > 0 ? "text-orange-500" : "text-foreground")}>{user.mutes}</p>
                        <p className="text-[10px] text-muted-foreground">Mutes</p>
                      </div>
                    </div>

                    <p className="mt-3 text-center text-[10px] text-muted-foreground">
                      Joined {user.joinDate}
                    </p>

                    {hasIssues && (
                      <div className="absolute -right-1 -top-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
