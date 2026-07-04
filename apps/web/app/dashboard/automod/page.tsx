"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  MessageSquare,
  Ban,
  VolumeX,
  Flag,
  Settings,
} from "lucide-react"
import { useAutoModRules, useAutoModOffenders } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"

const ruleTypeConfig = {
  spam: { icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", label: "Spam Detection" },
  toxicity: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", label: "Toxicity Filter" },
  profanity: { icon: Ban, color: "text-orange-500", bg: "bg-orange-500/10", label: "Profanity Filter" },
  links: { icon: Flag, color: "text-purple-500", bg: "bg-purple-500/10", label: "Link Filter" },
  caps: { icon: VolumeX, color: "text-amber-500", bg: "bg-amber-500/10", label: "Caps Lock" },
  mentions: { icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Mass Mentions" },
}

const actionConfig = {
  warn: { color: "text-amber-500", label: "Warn" },
  mute: { color: "text-orange-500", label: "Mute" },
  kick: { color: "text-red-500", label: "Kick" },
  ban: { color: "text-red-600", label: "Ban" },
  delete: { color: "text-blue-500", label: "Delete Message" },
}

// Fallback display when API returns empty rules (no mock fake data)
const emptyRules: never[] = []

const Loading = () => null;

export default function AutoModPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const searchParams = useSearchParams()
  
  const { data: rules, isLoading } = useAutoModRules();
  const { data: offenders = [], isLoading: offendersLoading } = useAutoModOffenders();

  const displayRules = rules ?? emptyRules;
  
  const filteredRules = displayRules.filter((rule: any) => {
    const matchesSearch = rule.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || rule.type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "enabled" && rule.enabled) ||
                         (statusFilter === "disabled" && !rule.enabled);
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const totalRules = displayRules.length;
  const activeRules = displayRules.filter((r: any) => r.enabled).length;
  const totalTriggers = displayRules.reduce((sum: number, r: any) => sum + (r.triggers || 0), 0);
  const avgAccuracy = displayRules.length > 0
    ? Math.round(displayRules.reduce((sum: number, r: any) => {
        const accuracy = r.triggers > 0 ? ((r.triggers - (r.falsePositives || 0)) / r.triggers) * 100 : 100;
        return sum + accuracy;
      }, 0) / displayRules.length)
    : 100;

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Auto-Moderation</h1>
            <p className="text-muted-foreground">
              Automated content filtering and moderation rules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Global Settings
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Rules", value: totalRules.toString(), icon: Shield, color: "text-blue-500", loading: isLoading },
            { label: "Active Rules", value: activeRules.toString(), icon: Zap, color: "text-emerald-500", loading: isLoading },
            { label: "Total Triggers", value: totalTriggers.toLocaleString(), icon: BarChart3, color: "text-purple-500", loading: isLoading },
            { label: "Avg Accuracy", value: `${avgAccuracy}%`, icon: CheckCircle2, color: "text-amber-500", loading: isLoading },
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

        {/* Rules and Offenders Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Auto-Mod Rules */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Shield className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Auto-Mod Rules</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {filteredRules.length} rules found
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search rules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 w-full border-border/50 bg-secondary/50 pl-9 sm:w-[200px]"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 w-[100px] border-border/50 bg-secondary/50">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="toxicity">Toxicity</SelectItem>
                        <SelectItem value="profanity">Profanity</SelectItem>
                        <SelectItem value="links">Links</SelectItem>
                        <SelectItem value="caps">Caps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {filteredRules.map((rule: any) => {
                    const type = ruleTypeConfig[rule.type as keyof typeof ruleTypeConfig] || ruleTypeConfig.spam;
                    const action = actionConfig[rule.action as keyof typeof actionConfig] || actionConfig.warn;
                    const TypeIcon = type.icon;
                    const accuracy = rule.triggers > 0 ? ((rule.triggers - (rule.falsePositives || 0)) / rule.triggers) * 100 : 100;
                    
                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "group flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-lg",
                          !rule.enabled ? "opacity-60" : "",
                          "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                        )}
                      >
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", type.bg)}>
                          <TypeIcon className={cn("h-5 w-5", type.color)} />
                        </div>
                        
                        <div className="flex flex-1 items-center gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{rule.name}</span>
                              <Badge variant="outline" className={cn("border-0 text-[10px]", type.bg, type.color)}>
                                {type.label}
                              </Badge>
                              <Badge variant="outline" className={cn("border-0 text-[10px] bg-secondary", action.color)}>
                                {action.label}
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Sensitivity:</span>
                                <Progress value={rule.sensitivity} className="w-16 h-1" />
                                <span className="text-xs text-muted-foreground">{rule.sensitivity}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Accuracy:</span>
                                <span className={cn("text-xs font-medium", accuracy >= 90 ? "text-emerald-500" : accuracy >= 70 ? "text-amber-500" : "text-red-500")}>
                                  {Math.round(accuracy)}%
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{rule.triggers || 0} triggers</span>
                              <span>•</span>
                              <span>{rule.falsePositives || 0} false positives</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={rule.enabled} 
                            // onCheckedChange would trigger API call to toggle rule
                          />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="gap-2" asChild>
                                <Link href={`/dashboard/automod/${rule.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Edit className="h-4 w-4" />
                                Edit Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <BarChart3 className="h-4 w-4" />
                                View Stats
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete Rule
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}

                  {filteredRules.length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No rules found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || typeFilter !== "all"
                          ? "No rules match your current filters."
                          : "No auto-moderation rules have been created yet."}
                      </p>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create First Rule
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Offenders */}
          <div>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Recent Offenders</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Users with recent auto-mod violations
                </p>
              </CardHeader>
              <CardContent>
                {offendersLoading ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Loading offenders…</div>
                ) : (offenders as Array<{
                  id: string;
                  discordUserId: string;
                  violationCount: number;
                  lastViolationAt: string;
                  rule?: { type?: string; name?: string };
                }>).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No escalated offenders yet.</p>
                ) : (
                <div className="space-y-3">
                  {(offenders as Array<{
                    id: string;
                    discordUserId: string;
                    violationCount: number;
                    lastViolationAt: string;
                    rule?: { type?: string; name?: string };
                  }>).map((offender) => {
                    const ruleKey = offender.rule?.type || 'spam';
                    const ruleType = ruleTypeConfig[ruleKey as keyof typeof ruleTypeConfig] || ruleTypeConfig.spam;
                    
                    return (
                      <div
                        key={offender.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20"
                      >
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ruleType.bg)}>
                          <ruleType.icon className={cn("h-4 w-4", ruleType.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {offender.rule?.name || `User ${offender.discordUserId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {offender.violationCount} violations
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last: {new Date(offender.lastViolationAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/dashboard/automod/offenders">
                    View All Offenders
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Suspense>
  )
}