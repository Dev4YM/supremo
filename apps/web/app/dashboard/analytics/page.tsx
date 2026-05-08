"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Shield,
  Clock,
} from "lucide-react"
import { 
  useMemberGrowth, 
  useActivity, 
  useEngagement, 
  useModWorkload, 
  useAutomationAnalytics,
  useAnomalies,
  useAnalyticsHealth 
} from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"

const COLORS = ["hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)", "hsl(280, 65%, 60%)"]

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">{entry.name}</span>
          <span className="text-xs font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState(30);
  
  // Fetch real analytics data
  const { data: memberGrowthData, isLoading: memberGrowthLoading } = useMemberGrowth(timeRange);
  const { data: activityData, isLoading: activityLoading } = useActivity(timeRange);
  const { data: engagementData, isLoading: engagementLoading } = useEngagement(timeRange);
  const { data: modWorkloadData, isLoading: modWorkloadLoading } = useModWorkload(timeRange);
  const { data: automationData, isLoading: automationLoading } = useAutomationAnalytics(timeRange);
  const { data: anomaliesData, isLoading: anomaliesLoading } = useAnomalies(timeRange);
  const { data: healthData, isLoading: healthLoading } = useAnalyticsHealth();

  const isLoading = memberGrowthLoading || activityLoading || engagementLoading || modWorkloadLoading;

  // Calculate dynamic stats from real data
  const analyticsStats = [
    { 
      label: "Total Actions", 
      value: modWorkloadData?.totalActions?.toLocaleString() || "0", 
      change: modWorkloadData?.change || "+0%", 
      up: (modWorkloadData?.change || "").includes('+'), 
      icon: BarChart3 
    },
    { 
      label: "Active Users", 
      value: activityData?.activeUsers?.toLocaleString() || "0", 
      change: activityData?.change || "+0%", 
      up: (activityData?.change || "").includes('+'), 
      icon: Users 
    },
    { 
      label: "Messages/Day", 
      value: activityData?.messagesPerDay || "0", 
      change: activityData?.messageChange || "+0%", 
      up: (activityData?.messageChange || "").includes('+'), 
      icon: MessageSquare 
    },
    { 
      label: "Avg Response", 
      value: modWorkloadData?.avgResponseTime || "0s", 
      change: modWorkloadData?.responseChange || "+0%", 
      up: (modWorkloadData?.responseChange || "").includes('-'), // Negative is good for response time
      icon: Clock 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your server's performance
          </p>
        </div>
        <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
          <SelectTrigger className="w-40 border-border/50 bg-secondary/50">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {stat.up ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={cn("text-xs font-medium", stat.up ? "text-emerald-500" : "text-red-500")}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Moderation Activity */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Moderation Activity</CardTitle>
              <p className="text-xs text-muted-foreground">Actions over the past {timeRange} days</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-border/50 bg-transparent">
              <Shield className="h-4 w-4" />
              Moderation
            </Button>
          </CardHeader>
          <CardContent>
            {modWorkloadLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="space-y-4 w-full">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modWorkloadData?.dailyActivity || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="warnings" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bans" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mutes" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Growth */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Member Growth</CardTitle>
              <p className="text-xs text-muted-foreground">New members over time</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              {memberGrowthData?.totalGrowth ? `+${memberGrowthData.totalGrowth}` : '+0'} this period
            </Badge>
          </CardHeader>
          <CardContent>
            {memberGrowthLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="space-y-4 w-full">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memberGrowthData?.dailyGrowth || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={["dataMin - 10", "dataMax + 10"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="members" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Engagement Metrics */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">User Engagement</CardTitle>
            <p className="text-xs text-muted-foreground">Activity distribution</p>
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={engagementData?.distribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(engagementData?.distribution || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 gap-2">
              {(engagementData?.distribution || []).map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="ml-auto text-xs font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Peak Activity Hours</CardTitle>
              <p className="text-xs text-muted-foreground">When activity is highest</p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 border-border/50 bg-transparent">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-16 w-full rounded" />
                    <Skeleton className="mt-1 h-3 w-4" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hourData = activityData?.hourlyActivity?.find((h: any) => h.hour === i);
                    const intensity = hourData ? Math.min(hourData.activity / (activityData?.maxHourlyActivity || 1), 1) : 0;
                    return (
                      <div key={i} className="text-center">
                        <div
                          className="mx-auto h-16 w-full rounded transition-all hover:scale-105"
                          style={{
                            backgroundColor: `hsl(217, 91%, ${60 + (1 - intensity) * 30}%)`,
                            opacity: 0.3 + intensity * 0.7,
                          }}
                          title={`${i}:00 - ${hourData?.activity || 0} activities`}
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">{i}h</p>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Low activity</span>
                  <div className="flex items-center gap-1">
                    {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                      <div key={opacity} className="h-3 w-6 rounded" style={{ backgroundColor: `hsl(217, 91%, 60%)`, opacity }} />
                    ))}
                  </div>
                  <span>High activity</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Anomalies & Health */}
      {anomaliesData && anomaliesData.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Detected Anomalies
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Unusual patterns detected in the last {timeRange} days
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomaliesData.slice(0, 3).map((anomaly: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{anomaly.type}</p>
                    <p className="text-xs text-muted-foreground">{anomaly.description}</p>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">
                    {anomaly.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}