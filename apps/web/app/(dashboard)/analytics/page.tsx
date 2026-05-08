"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { moderationActivity, memberGrowth, warningLevels } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const COLORS = ["hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)", "hsl(280, 65%, 60%)"]

const analyticsStats = [
  { label: "Total Actions", value: "12,456", change: "+12%", up: true, icon: BarChart3 },
  { label: "Active Users", value: "8,432", change: "+8%", up: true, icon: Users },
  { label: "Messages/Day", value: "45.2K", change: "-3%", up: false, icon: MessageSquare },
  { label: "Avg Response", value: "2.3m", change: "-15%", up: true, icon: TrendingUp },
]

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
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
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
              <p className="text-xs text-muted-foreground">Actions over the past week</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-border/50 bg-transparent">
              <Calendar className="h-4 w-4" />
              This Week
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moderationActivity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              +699 this week
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memberGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="members" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Warning Distribution */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Warning Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">By severity level</p>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={warningLevels}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {warningLevels.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {warningLevels.map((level, index) => (
                <div key={level.level} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-xs text-muted-foreground">Level {level.level}</span>
                  <span className="ml-auto text-xs font-medium text-foreground">{level.count}</span>
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
              <p className="text-xs text-muted-foreground">When moderation is most needed</p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 border-border/50 bg-transparent">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }, (_, i) => {
                const intensity = Math.random()
                return (
                  <div key={i} className="text-center">
                    <div
                      className="mx-auto h-16 w-full rounded"
                      style={{
                        backgroundColor: `hsl(217, 91%, ${60 + (1 - intensity) * 30}%)`,
                        opacity: 0.3 + intensity * 0.7,
                      }}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
