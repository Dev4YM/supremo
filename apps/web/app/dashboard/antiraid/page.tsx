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
  Shield,
  AlertTriangle,
  Users,
  Clock,
  Lock,
  Unlock,
  Eye,
  Settings,
  TrendingUp,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Activity,
} from "lucide-react"
import { useAntiRaidConfig } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

// Mock data for demonstration
const mockJoinData = [
  { time: "14:30", joins: 15, suspicious: 2 },
  { time: "14:31", joins: 8, suspicious: 0 },
  { time: "14:32", joins: 23, suspicious: 8 },
  { time: "14:33", joins: 45, suspicious: 32 },
  { time: "14:34", joins: 12, suspicious: 1 },
  { time: "14:35", joins: 6, suspicious: 0 },
]

const mockRecentJoins = [
  { id: "1", username: "NewUser123", joinTime: "2026-01-23T14:33:45Z", suspicious: true, reason: "Account age < 24h" },
  { id: "2", username: "RegularUser", joinTime: "2026-01-23T14:33:42Z", suspicious: false, reason: null },
  { id: "3", username: "SuspiciousBot", joinTime: "2026-01-23T14:33:40Z", suspicious: true, reason: "No avatar, similar name pattern" },
  { id: "4", username: "TrustedMember", joinTime: "2026-01-23T14:33:38Z", suspicious: false, reason: null },
  { id: "5", username: "RaidBot001", joinTime: "2026-01-23T14:33:35Z", suspicious: true, reason: "Mass join pattern detected" },
]

const Loading = () => null;

export default function AntiRaidPage() {
  const searchParams = useSearchParams()
  
  // Fetch real data from backend
  const { data: config, isLoading: configLoading } = useAntiRaidConfig();

  // Mock configuration data
  const mockConfig = {
    enabled: true,
    joinRateLimit: 10,
    timeWindow: 60,
    lockdownThreshold: 20,
    autoLockdown: true,
    verificationEnabled: true,
    accountAgeMinimum: 24,
    isLocked: false,
  };

  const displayConfig = config || mockConfig;
  const recentJoins = mockRecentJoins;
  const joinData = mockJoinData;

  // Calculate stats
  const totalJoinsLast24h = 156;
  const suspiciousJoins = recentJoins.filter(j => j.suspicious).length;
  const currentJoinRate = 8; // joins per minute
  const raidRisk = currentJoinRate > displayConfig.joinRateLimit ? "High" : currentJoinRate > 5 ? "Medium" : "Low";

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Anti-Raid Protection</h1>
            <p className="text-muted-foreground">
              Monitor and prevent coordinated server raids
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configure Protection
            </Button>
            <Button 
              variant={displayConfig.isLocked ? "destructive" : "default"}
              className="gap-2"
            >
              {displayConfig.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {displayConfig.isLocked ? "Unlock Server" : "Emergency Lockdown"}
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              label: "Protection Status", 
              value: displayConfig.enabled ? "Active" : "Disabled", 
              icon: Shield, 
              color: displayConfig.enabled ? "text-emerald-500" : "text-red-500", 
              loading: configLoading 
            },
            { 
              label: "Joins (24h)", 
              value: totalJoinsLast24h.toString(), 
              icon: Users, 
              color: "text-blue-500", 
              loading: false 
            },
            { 
              label: "Suspicious Joins", 
              value: suspiciousJoins.toString(), 
              icon: AlertTriangle, 
              color: suspiciousJoins > 5 ? "text-red-500" : "text-amber-500", 
              loading: false 
            },
            { 
              label: "Raid Risk", 
              value: raidRisk, 
              icon: Activity, 
              color: raidRisk === "High" ? "text-red-500" : raidRisk === "Medium" ? "text-amber-500" : "text-emerald-500", 
              loading: false 
            },
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

        {/* Lockdown Alert */}
        {displayConfig.isLocked && (
          <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-700 dark:text-red-400">Server Lockdown Active</h3>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    The server is currently locked down. New members cannot join until lockdown is lifted.
                  </p>
                </div>
                <Button variant="outline" className="ml-auto">
                  <Unlock className="h-4 w-4 mr-2" />
                  Lift Lockdown
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Join Rate Monitor */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Join Rate Monitor</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Real-time monitoring of member joins
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "border-0 text-[10px]",
                      currentJoinRate > displayConfig.joinRateLimit ? "bg-red-500/10 text-red-500" :
                      currentJoinRate > 5 ? "bg-amber-500/10 text-amber-500" :
                      "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {currentJoinRate}/min
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Join Rate Chart */}
                  <div className="grid grid-cols-6 gap-2">
                    {joinData.map((data, index) => (
                      <div key={index} className="text-center">
                        <div className="relative h-24 flex items-end justify-center">
                          <div 
                            className={cn(
                              "w-full rounded-t transition-all",
                              data.suspicious > 5 ? "bg-red-500" :
                              data.suspicious > 0 ? "bg-amber-500" :
                              "bg-emerald-500"
                            )}
                            style={{ height: `${Math.max((data.joins / 50) * 100, 10)}%` }}
                            title={`${data.joins} joins, ${data.suspicious} suspicious`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{data.time}</p>
                        <p className="text-xs font-medium">{data.joins}</p>
                      </div>
                    ))}
                  </div>

                  {/* Configuration Summary */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rate Limit</span>
                        <span className="text-sm font-medium">{displayConfig.joinRateLimit}/min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Time Window</span>
                        <span className="text-sm font-medium">{displayConfig.timeWindow}s</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Auto Lockdown</span>
                        <Switch checked={displayConfig.autoLockdown} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Verification</span>
                        <Switch checked={displayConfig.verificationEnabled} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Joins */}
          <div>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Recent Joins</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Latest member joins with risk assessment
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentJoins.map((join) => (
                    <div
                      key={join.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        join.suspicious 
                          ? "border-red-500/30 bg-red-500/5" 
                          : "border-border/50 bg-secondary/20"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        join.suspicious ? "bg-red-500/10" : "bg-emerald-500/10"
                      )}>
                        {join.suspicious ? (
                          <UserX className="h-4 w-4 text-red-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{join.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(join.joinTime).toLocaleTimeString()}
                        </p>
                        {join.reason && (
                          <p className="text-xs text-red-500 mt-1">{join.reason}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Recent Joins
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Protection Settings */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Protection Settings</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure anti-raid protection parameters
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Anti-Raid Protection</p>
                    <p className="text-xs text-muted-foreground">Enable automated raid detection</p>
                  </div>
                  <Switch checked={displayConfig.enabled} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto Lockdown</p>
                    <p className="text-xs text-muted-foreground">Automatically lock server during raids</p>
                  </div>
                  <Switch checked={displayConfig.autoLockdown} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Member Verification</p>
                    <p className="text-xs text-muted-foreground">Require verification for new members</p>
                  </div>
                  <Switch checked={displayConfig.verificationEnabled} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Join Rate Limit</label>
                  <p className="text-xs text-muted-foreground mb-2">Maximum joins per minute</p>
                  <Input 
                    type="number" 
                    value={displayConfig.joinRateLimit} 
                    className="border-border/50 bg-secondary/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Account Age Minimum (hours)</label>
                  <p className="text-xs text-muted-foreground mb-2">Minimum account age for new members</p>
                  <Input 
                    type="number" 
                    value={displayConfig.accountAgeMinimum} 
                    className="border-border/50 bg-secondary/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}