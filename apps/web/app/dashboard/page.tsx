"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  Bot,
  BarChart3,
  Zap,
  MessageSquare,
  UserCheck,
  ArrowRight,
} from "lucide-react"
import { 
  useServerInfo, 
  useDiscordGuild, 
  useIncidents, 
  useAutomations,
  useActivity,
  useMemberGrowth,
  useAnalyticsHealth,
  useDiscordMembers,
} from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { SimpleBarChart, SimpleLineChart } from "@/components/ui/chart"

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  loading = false,
  color = "text-primary"
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  trend?: { value: number; label: string };
  loading?: boolean;
  color?: string;
}) {
  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center pt-1">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-500">+{trend.value}% {trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  // Fetch real data from backend
  const { data: serverInfo, isLoading: serverLoading } = useServerInfo();
  const { data: discordGuild, isLoading: guildLoading } = useDiscordGuild();
  const { data: incidents, isLoading: incidentsLoading } = useIncidents({ limit: 5 });
  const { data: automations, isLoading: automationsLoading } = useAutomations({ enabled: true });
  const { data: activity, isLoading: activityLoading } = useActivity(7);
  const { data: memberGrowth, isLoading: memberGrowthLoading } = useMemberGrowth(30);
  const { data: analyticsHealth, isLoading: healthLoading } = useAnalyticsHealth();
  const { data: discordMembers, isLoading: membersLoading } = useDiscordMembers();

  const isLoading = serverLoading || guildLoading || incidentsLoading || automationsLoading;

  // Calculate stats from real data
  const totalMembers = discordMembers?.length || 0;
  const onlineMembers = discordMembers?.filter((m: any) => m.status === 'online')?.length || 0;
  const activeIncidents = incidents?.filter((i: any) => i.status === 'open' || i.status === 'pending')?.length || 0;
  const activeAutomations = automations?.filter((a: any) => a.enabled)?.length || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with {discordGuild?.name || 'your Discord server'} today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="w-3 h-3 mr-1" />
            {analyticsHealth?.status || 'Online'}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value={totalMembers.toLocaleString()}
          description="Active server members"
          icon={Users}
          loading={membersLoading}
          color="text-blue-500"
          trend={memberGrowth?.growth ? { value: memberGrowth.growth, label: 'from last month' } : undefined}
        />
        <StatsCard
          title="Online Members"
          value={onlineMembers}
          description="Currently online"
          icon={UserCheck}
          loading={membersLoading}
          color="text-emerald-500"
        />
        <StatsCard
          title="Active Incidents"
          value={activeIncidents}
          description="Requiring attention"
          icon={AlertTriangle}
          loading={incidentsLoading}
          color="text-red-500"
        />
        <StatsCard
          title="Active Automations"
          value={activeAutomations}
          description="Workflows running"
          icon={Bot}
          loading={automationsLoading}
          color="text-purple-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Incidents */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Incidents
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest incidents requiring attention
              </p>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : incidents && incidents.length > 0 ? (
                <div className="space-y-4">
                  {incidents.slice(0, 3).map((incident: any) => (
                    <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg border-border/50 bg-secondary/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          incident.severity === 'critical' ? 'bg-red-500' :
                          incident.severity === 'high' ? 'bg-orange-500' :
                          incident.severity === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium">{incident.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {incident.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        incident.status === 'open' ? 'destructive' :
                        incident.status === 'resolved' ? 'default' :
                        'secondary'
                      }>
                        {incident.status}
                      </Badge>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/dashboard/incidents">
                        View All Incidents
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active incidents</h3>
                  <p className="text-muted-foreground mb-4">
                    Everything looks good! No incidents require attention.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Automations */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                Active Automations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Currently running workflows
              </p>
            </CardHeader>
            <CardContent>
              {automationsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : automations?.filter((a: any) => a.enabled).length > 0 ? (
                <div className="space-y-3">
                  {automations.filter((a: any) => a.enabled).slice(0, 4).map((automation: any) => (
                    <div key={automation.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                        <Bot className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{automation.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {automation.executionCount || 0} executions
                        </p>
                      </div>
                      <Badge variant="outline" className="border-0 bg-emerald-500/10 text-emerald-500 text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                  {automations.filter((a: any) => a.enabled).length > 4 && (
                    <Link href="/dashboard/automation">
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        View All ({automations.filter((a: any) => a.enabled).length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">No active automations</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create workflows to automate moderation tasks.
                  </p>
                  <Link href="/dashboard/automation/new">
                    <Button size="sm" className="gap-2">
                      <Bot className="h-4 w-4" />
                      Create Automation
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Server Status */}
        <div className="space-y-6">
          {/* Member Growth Chart */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Member Growth (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberGrowthLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <SimpleLineChart 
                  data={memberGrowth?.daily?.slice(-7).map((day: any, index: number) => ({
                    name: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { weekday: 'short' }),
                    value: day.joins || 0
                  })) || Array.from({ length: 7 }, (_, i) => ({
                    name: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { weekday: 'short' }),
                    value: Math.floor(Math.random() * 10)
                  }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Incident Types */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Incident Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <SimpleBarChart 
                  data={[
                    { name: 'Spam', value: incidents?.filter((i: any) => i.type === 'SPAM').length || 0, color: 'bg-blue-500' },
                    { name: 'Harassment', value: incidents?.filter((i: any) => i.type === 'HARASSMENT').length || 0, color: 'bg-red-500' },
                    { name: 'NSFW', value: incidents?.filter((i: any) => i.type === 'NSFW').length || 0, color: 'bg-purple-500' },
                    { name: 'Other', value: incidents?.filter((i: any) => !['SPAM', 'HARASSMENT', 'NSFW'].includes(i.type)).length || 0, color: 'bg-gray-500' },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Common moderation tasks
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/incidents/new">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report Incident
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/automation/new">
                  <Bot className="mr-2 h-4 w-4" />
                  Create Workflow
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/users">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Server Status */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Server Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bot Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-600">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AutoMod</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analytics</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${analyticsHealth?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className={`text-sm ${analyticsHealth?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {analyticsHealth?.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Automations</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-600">{activeAutomations} Active</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}