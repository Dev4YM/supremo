"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Zap, 
  Bot, 
  Play, 
  Pause,
  Settings,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Edit,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAutomations, useUpdateAutomation, useDeleteAutomation, useExecuteAutomation } from "@/lib/hooks/use-api"
import { toast } from "sonner"
import Link from "next/link"

const automationStats = [
  { label: "Active Workflows", value: "12", change: "+3 this week", icon: Bot, color: "text-primary" },
  { label: "Executions Today", value: "1,247", change: "+18%", icon: Zap, color: "text-emerald-500" },
  { label: "Success Rate", value: "98.5%", change: "+0.2%", icon: CheckCircle2, color: "text-green-500" },
  { label: "Avg Runtime", value: "1.2s", change: "-0.3s", icon: Clock, color: "text-blue-500" },
]

const workflows = [
  {
    id: "1",
    name: "Welcome New Members",
    description: "Send welcome message and assign roles to new members",
    status: "active",
    executions: 156,
    successRate: 100,
    lastRun: "2 minutes ago",
    triggers: ["member_join"],
    actions: ["send_message", "add_role"],
  },
  {
    id: "2", 
    name: "Auto-Moderation",
    description: "Detect and handle spam, profanity, and inappropriate content",
    status: "active",
    executions: 892,
    successRate: 97.8,
    lastRun: "5 minutes ago",
    triggers: ["message_create"],
    actions: ["delete_message", "warn_user", "timeout"],
  },
  {
    id: "3",
    name: "Reaction Roles",
    description: "Assign roles based on message reactions",
    status: "active", 
    executions: 234,
    successRate: 99.1,
    lastRun: "12 minutes ago",
    triggers: ["reaction_add"],
    actions: ["add_role"],
  },
  {
    id: "4",
    name: "Ticket System",
    description: "Create support tickets and manage user requests",
    status: "paused",
    executions: 67,
    successRate: 95.5,
    lastRun: "2 hours ago",
    triggers: ["button_click"],
    actions: ["create_channel", "send_message"],
  },
  {
    id: "5",
    name: "Level Up Notifications",
    description: "Notify users when they reach new experience levels",
    status: "active",
    executions: 45,
    successRate: 100,
    lastRun: "1 hour ago",
    triggers: ["level_up"],
    actions: ["send_message", "add_role"],
  },
]

const statusConfig = {
  active: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Active" },
  paused: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Paused" },
  error: { color: "text-red-500", bg: "bg-red-500/10", label: "Error" },
}

const templates = [
  { name: "Welcome Bot", description: "Greet new members and assign roles", icon: Bot, uses: 1247 },
  { name: "Auto Moderator", description: "Detect and handle rule violations", icon: AlertTriangle, uses: 892 },
  { name: "Reaction Roles", description: "Role assignment via reactions", icon: Zap, uses: 567 },
  { name: "Ticket System", description: "Support ticket management", icon: Settings, uses: 234 },
]

export default function AutomationPage() {
  const { data: automations = [], isLoading, error, refetch } = useAutomations();
  const updateAutomationMutation = useUpdateAutomation();
  const deleteAutomationMutation = useDeleteAutomation();
  const executeAutomationMutation = useExecuteAutomation();

  // Calculate real stats
  const stats = {
    active: automations.filter((a: any) => a.enabled).length,
    total: automations.length,
    executions: automations.reduce((sum: number, a: any) => sum + (a.executionCount || 0), 0),
    successRate: automations.length > 0 ? 
      (automations.reduce((sum: number, a: any) => sum + (a.successRate || 0), 0) / automations.length).toFixed(1) : 0,
  }

  const handleToggleAutomation = async (id: string, enabled: boolean) => {
    try {
      await updateAutomationMutation.mutateAsync({
        id,
        data: { enabled: !enabled }
      });
      toast.success(`Automation ${!enabled ? 'enabled' : 'disabled'} successfully`);
      refetch();
    } catch (error) {
      toast.error('Failed to update automation');
    }
  }

  const handleDeleteAutomation = async (id: string) => {
    try {
      await deleteAutomationMutation.mutateAsync(id);
      toast.success('Automation deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete automation');
    }
  }

  const handleExecuteAutomation = async (id: string) => {
    try {
      await executeAutomationMutation.mutateAsync(id);
      toast.success('Automation executed successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to execute automation');
    }
  }

  return (
    <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active Workflows", value: stats.active.toString(), change: `${stats.total} total`, icon: Bot, color: "text-primary" },
            { label: "Total Executions", value: stats.executions.toString(), change: "All time", icon: Zap, color: "text-emerald-500" },
            { label: "Success Rate", value: `${stats.successRate}%`, change: "Average", icon: CheckCircle2, color: "text-green-500" },
            { label: "Total Workflows", value: stats.total.toString(), change: `${stats.active} active`, icon: Clock, color: "text-blue-500" },
          ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workflows */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Automations</CardTitle>
                    <p className="text-xs text-muted-foreground">{stats.active} active, {stats.total} total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => refetch()} 
                    disabled={isLoading}
                    className="h-9 gap-2"
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Link href="/dashboard/automation/new">
                    <Button size="sm" className="h-9 gap-2">
                      <Plus className="h-4 w-4" />
                      Create
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-xl border border-border/50 p-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-3 w-full max-w-md" />
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Failed to load automations</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading automations. Please try again.
                  </p>
                  <Button onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : (
              <div className="space-y-3">
                {automations.map((automation: any) => {
                  const status = automation.enabled ? 
                    { bg: "bg-emerald-500/10", color: "text-emerald-500", label: "Active" } :
                    { bg: "bg-muted", color: "text-muted-foreground", label: "Inactive" }
                  
                  return (
                    <div
                      key={automation.id}
                      className="group flex items-center gap-4 rounded-xl border border-border/50 bg-secondary/20 p-4 transition-all hover:bg-secondary/40"
                    >
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", status.bg)}>
                        <Bot className={cn("h-5 w-5", status.color)} />
                      </div>
                      
                      <div className="flex flex-1 items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{automation.name}</span>
                            <Badge variant="outline" className={cn("border-0 text-[10px]", status.bg, status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{automation.description || 'No description'}</p>
                          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{automation.executionCount || 0} runs</span>
                            <span>•</span>
                            <span>{automation.successRate || 0}% success</span>
                            <span>•</span>
                            <span>Last: {automation.lastExecutedAt ? new Date(automation.lastExecutedAt).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{automation.executionCount || 0}</p>
                          <p className="text-[10px] text-muted-foreground">executions</p>
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => handleExecuteAutomation(automation.id)}
                              disabled={executeAutomationMutation.isPending}
                            >
                              <Play className="h-4 w-4" />
                              Execute Now
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => handleToggleAutomation(automation.id, automation.enabled)}
                              disabled={updateAutomationMutation.isPending}
                            >
                              {automation.enabled ? (
                                <>
                                  <Pause className="h-4 w-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => handleDeleteAutomation(automation.id)}
                              disabled={deleteAutomationMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}

                {automations.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No automations found</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first automation to get started.
                    </p>
                    <Link href="/dashboard/automation/new">
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Automation
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Templates & Quick Actions */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Zap className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Templates</CardTitle>
                  <p className="text-xs text-muted-foreground">Popular workflow templates</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {templates.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    className="h-auto w-full justify-start p-3 border-border/50 bg-transparent hover:bg-secondary/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mr-3">
                      <template.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Badge variant="outline" className="ml-2 text-[10px] border-0 bg-muted text-muted-foreground">
                      {template.uses}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">98.5%</span>
                  </div>
                  <Progress value={98.5} className="mt-2 h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg Response Time</span>
                    <span className="font-medium">1.2s</span>
                  </div>
                  <Progress value={75} className="mt-2 h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Error Rate</span>
                    <span className="font-medium">1.5%</span>
                  </div>
                  <Progress value={1.5} className="mt-2 h-2" />
                </div>
                <Button variant="outline" className="w-full border-border/50 bg-transparent">
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}