"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
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
  Shield,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Eye,
  Settings,
  UserCheck,
  UserX,
  Flag,
} from "lucide-react"
import { useTrustReputationConfig } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"

const trustLevelConfig = {
  very_low: { color: "text-red-500", bg: "bg-red-500/10", label: "Very Low", min: 0, max: 20 },
  low: { color: "text-orange-500", bg: "bg-orange-500/10", label: "Low", min: 21, max: 40 },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium", min: 41, max: 60 },
  high: { color: "text-blue-500", bg: "bg-blue-500/10", label: "High", min: 61, max: 80 },
  very_high: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Very High", min: 81, max: 100 },
}

const getTrustLevel = (score: number) => {
  for (const [key, config] of Object.entries(trustLevelConfig)) {
    if (score >= config.min && score <= config.max) {
      return { key, ...config };
    }
  }
  return { key: 'medium', ...trustLevelConfig.medium };
}

// Mock data for demonstration
const mockUsers = [
  { id: "1", username: "TrustedMember", discordId: "123456789", trustScore: 85, trend: "up", flags: [], joinDate: "2024-01-15", messageCount: 1456 },
  { id: "2", username: "NewUser", discordId: "987654321", trustScore: 45, trend: "neutral", flags: [], joinDate: "2026-01-20", messageCount: 23 },
  { id: "3", username: "SuspiciousUser", discordId: "456789123", trustScore: 25, trend: "down", flags: ["spam", "toxicity"], joinDate: "2025-12-01", messageCount: 89 },
  { id: "4", username: "RegularMember", discordId: "789123456", trustScore: 72, trend: "up", flags: [], joinDate: "2024-06-10", messageCount: 892 },
  { id: "5", username: "ProblematicUser", discordId: "321654987", trustScore: 15, trend: "down", flags: ["harassment", "raid"], joinDate: "2025-11-15", messageCount: 234 },
]

const Loading = () => null;

export default function TrustReputationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [trustFilter, setTrustFilter] = useState("all")
  const [flagFilter, setFlagFilter] = useState("all")
  const searchParams = useSearchParams()
  
  // Fetch real data from backend
  const { data: config, isLoading: configLoading } = useTrustReputationConfig();

  // For now, use mock data since we don't have user trust data hooks yet
  const users = mockUsers;
  const isLoading = false;

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const trustLevel = getTrustLevel(user.trustScore);
    const matchesTrust = trustFilter === "all" || trustLevel.key === trustFilter;
    const matchesFlag = flagFilter === "all" || 
                       (flagFilter === "flagged" && user.flags.length > 0) ||
                       (flagFilter === "clean" && user.flags.length === 0);
    return matchesSearch && matchesTrust && matchesFlag;
  });

  // Calculate stats
  const totalUsers = users.length;
  const highTrustUsers = users.filter((u: any) => u.trustScore >= 61).length;
  const flaggedUsers = users.filter((u: any) => u.flags.length > 0).length;
  const avgTrustScore = Math.round(users.reduce((sum: number, u: any) => sum + u.trustScore, 0) / users.length);

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trust & Reputation</h1>
            <p className="text-muted-foreground">
              Monitor user trust scores and reputation metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configure System
            </Button>
            <Button className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Recalculate All
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: totalUsers.toString(), icon: Users, color: "text-blue-500", loading: isLoading },
            { label: "High Trust", value: highTrustUsers.toString(), icon: CheckCircle2, color: "text-emerald-500", loading: isLoading },
            { label: "Flagged Users", value: flaggedUsers.toString(), icon: AlertTriangle, color: "text-red-500", loading: isLoading },
            { label: "Avg Trust Score", value: avgTrustScore.toString(), icon: TrendingUp, color: "text-purple-500", loading: isLoading },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                {stat.loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Distribution */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Trust Score Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">
              Overview of trust levels across all users
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(trustLevelConfig).map(([key, level]) => {
                const count = users.filter(u => {
                  const userLevel = getTrustLevel(u.trustScore);
                  return userLevel.key === key;
                }).length;
                const percentage = Math.round((count / totalUsers) * 100);

                return (
                  <div key={key} className={cn("rounded-lg border p-4", level.bg, "border-border/50")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-sm font-medium", level.color)}>{level.label}</span>
                      <span className="text-xs text-muted-foreground">{count} users</span>
                    </div>
                    <Progress value={percentage} className="h-2 mb-2" />
                    <div className="text-xs text-muted-foreground">
                      {level.min}-{level.max} points ({percentage}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">User Trust Scores</CardTitle>
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
                <Select value={trustFilter} onValueChange={setTrustFilter}>
                  <SelectTrigger className="h-9 w-[130px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Trust Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="very_low">Very Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={flagFilter} onValueChange={setFlagFilter}>
                  <SelectTrigger className="h-9 w-[130px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Flags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="clean">Clean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {filteredUsers.map((user: any) => {
                const trustLevel = getTrustLevel(user.trustScore);
                const hasFlags = user.flags.length > 0;
                
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-lg",
                      hasFlags ? "border-red-500/30 bg-red-500/5" :
                      trustLevel.key === "very_high" ? "border-emerald-500/30 bg-emerald-500/5" :
                      "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                    )}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex flex-1 items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{user.username}</span>
                          <Badge variant="outline" className={cn("border-0 text-[10px]", trustLevel.bg, trustLevel.color)}>
                            {trustLevel.label}
                          </Badge>
                          {hasFlags && (
                            <Badge variant="outline" className="border-0 text-[10px] bg-red-500/10 text-red-500">
                              {user.flags.length} Flag{user.flags.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Trust Score:</span>
                            <div className="flex items-center gap-2">
                              <Progress value={user.trustScore} className="w-24 h-2" />
                              <span className={cn("text-sm font-medium", trustLevel.color)}>{user.trustScore}/100</span>
                            </div>
                          </div>
                          {user.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                          {user.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{user.messageCount} messages</span>
                          {hasFlags && (
                            <>
                              <span>•</span>
                              <span className="text-red-500">Flags: {user.flags.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2" asChild>
                          <Link href={`/dashboard/trust/${user.id}`}>
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Recalculate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2">
                          <Flag className="h-4 w-4" />
                          Add Flag
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <UserCheck className="h-4 w-4" />
                          Whitelist
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                          <UserX className="h-4 w-4" />
                          Blacklist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || trustFilter !== "all" || flagFilter !== "all"
                      ? "No users match your current filters."
                      : "No user trust data available."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}