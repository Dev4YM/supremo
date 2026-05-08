"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Zap, 
  Bot, 
  Play, 
  Pause,
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
import {
  useAutomations,
  useAutomationTemplates,
  useUpdateAutomation,
  useDeleteAutomation,
  useExecuteAutomation,
} from "@/lib/hooks/use-api"
import { toast } from "sonner"
import Link from "next/link"

export default function AutomationPage() {
  const { data: automations = [], isLoading, error, refetch } = useAutomations();
  const { data: templates = [], isLoading: templatesLoading } = useAutomationTemplates();
  const updateAutomationMutation = useUpdateAutomation();
  const deleteAutomationMutation = useDeleteAutomation();
  const executeAutomationMutation = useExecuteAutomation();

  const avgSuccessNum =
    automations.length > 0
      ? automations.reduce((sum: number, a: any) => sum + (Number(a.successRate) || 0), 0) /
        automations.length
      : 0;

  const stats = {
    active: automations.filter((a: any) => a.enabled).length,
    total: automations.length,
    executions: automations.reduce((sum: number, a: any) => sum + (Number(a.executionCount) || 0), 0),
    successRate: avgSuccessNum.toFixed(1),
  };

  const approxErrorRate = Math.max(0, 100 - Number(stats.successRate)).toFixed(1);

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
              {templatesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates are configured for this workspace yet. Use{" "}
                  <span className="font-medium text-foreground">Create</span> to build an automation from scratch.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template: any) => (
                    <div
                      key={template.id ?? template.key}
                      className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-transparent p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.description || "No description"}
                        </p>
                      </div>
                      {template.category ? (
                        <Badge variant="outline" className="shrink-0 border-0 bg-muted text-[10px] text-muted-foreground">
                          {template.category}
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
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
                    <span className="text-muted-foreground">Avg. success rate (automations)</span>
                    <span className="font-medium">{stats.total ? `${stats.successRate}%` : "—"}</span>
                  </div>
                  <Progress
                    value={stats.total ? Math.min(100, Number(stats.successRate)) : 0}
                    className="mt-2 h-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Approx. failure share</span>
                    <span className="font-medium">{stats.total ? `${approxErrorRate}%` : "—"}</span>
                  </div>
                  <Progress
                    value={stats.total ? Math.min(100, Number(approxErrorRate)) : 0}
                    className="mt-2 h-2"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Metrics are derived from stored automation records. For richer charts, use analytics.
                </p>
                <Button variant="outline" className="w-full border-border/50 bg-transparent" asChild>
                  <Link href="/dashboard/analytics">View analytics</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}