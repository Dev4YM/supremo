"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { WorkflowBuilder } from "@/components/automation/workflow-builder"
import {
  useAutomation,
  useAutomationRuns,
  useUpdateAutomation,
  useWorkflowAnalytics,
} from "@/lib/hooks/use-api"
import { parseAutomationToBuilder, transformWorkflowToApiPayload } from "@/lib/workflow-transform"
import { toast } from "sonner"
import { Loader2, BarChart3, History, Pencil } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function WorkflowRunsPanel({ automationId }: { automationId: string }) {
  const { data: runs = [], isLoading } = useAutomationRuns(automationId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading runs…
      </div>
    )
  }

  if (!runs.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No workflow runs recorded yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Runs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {runs.map((run: {
          id: string
          status: string
          startedAt: string
          completedAt?: string | null
          duration?: number | null
          error?: string | null
        }) => (
          <div key={run.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}
                >
                  {run.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(run.startedAt).toLocaleString()}
                </span>
              </div>
              {run.error && (
                <p className="text-xs text-destructive mt-1">{run.error}</p>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {run.duration != null ? `${run.duration}ms` : '—'}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function WorkflowAnalyticsPanel({ automationId }: { automationId: string }) {
  const { data: analytics, isLoading } = useWorkflowAnalytics(automationId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading analytics…
      </div>
    )
  }

  if (!analytics || analytics.totalRuns === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Not enough run data for analytics yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total runs</p>
            <p className="text-2xl font-bold">{analytics.totalRuns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Success rate</p>
            <p className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg duration</p>
            <p className="text-2xl font-bold">{Math.round(analytics.avgDuration)}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Median duration</p>
            <p className="text-2xl font-bold">{Math.round(analytics.medianDuration)}ms</p>
          </CardContent>
        </Card>
      </div>

      {analytics.failureReasons?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Failure Reasons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.failureReasons.map((item: { reason: string; count: number }) => (
              <div key={item.reason} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate pr-4">{item.reason}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analytics.executionTimeline?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.executionTimeline.map((day: { date: string; runs: number; successRate: number }) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span>{day.date}</span>
                <span className="text-muted-foreground">
                  {day.runs} runs · {day.successRate.toFixed(0)}% success
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function EditWorkflowPage() {
  const params = useParams()
  const router = useRouter()
  const automationId = String(params.id)
  const [activeTab, setActiveTab] = useState('editor')
  const { data: automation, isLoading, isError } = useAutomation(automationId)
  const updateAutomation = useUpdateAutomation()

  const handleSave = async (workflow: any) => {
    try {
      const payload = transformWorkflowToApiPayload(workflow)
      await updateAutomation.mutateAsync({
        id: automationId,
        data: payload,
      })
      toast.success('Automation updated')
      router.push('/dashboard/automation')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update automation')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading workflow…
      </div>
    )
  }

  if (isError || !automation) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Could not load automation.
      </div>
    )
  }

  const initialWorkflow = parseAutomationToBuilder(automation as {
    name: string
    description?: string | null
    triggerType: string
    triggerConfig?: string | null
    workflow?: string | null
  })

  return (
    <div className={cn("flex flex-col", activeTab === 'editor' ? 'h-screen' : 'min-h-screen')}>
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background">
        <div>
          <h1 className="text-xl font-semibold">{automation.name}</h1>
          <p className="text-sm text-muted-foreground">Workflow management</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/automation')}>
          Back to list
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="editor" className="gap-2">
              <Pencil className="w-4 h-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2">
              <History className="w-4 h-4" />
              Runs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="flex-1 mt-0">
          <WorkflowBuilder
            initialWorkflow={initialWorkflow}
            onSave={handleSave}
            onCancel={() => router.push('/dashboard/automation')}
          />
        </TabsContent>

        <TabsContent value="runs" className="p-6">
          <WorkflowRunsPanel automationId={automationId} />
        </TabsContent>

        <TabsContent value="analytics" className="p-6">
          <WorkflowAnalyticsPanel automationId={automationId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
