"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  Calendar,
  Timer,
  Zap,
  Database,
  Mail,
  Bot,
  Shield,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react"
import { useJobs } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table"
import { toast } from "sonner"

const statusConfig = {
  PENDING: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending", icon: Clock },
  RUNNING: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Running", icon: Loader2 },
  COMPLETED: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Completed", icon: CheckCircle2 },
  FAILED: { color: "text-red-500", bg: "bg-red-500/10", label: "Failed", icon: XCircle },
  CANCELLED: { color: "text-muted-foreground", bg: "bg-muted", label: "Cancelled", icon: XCircle },
  RETRYING: { color: "text-orange-500", bg: "bg-orange-500/10", label: "Retrying", icon: RotateCcw },
}

const typeConfig = {
  SCHEDULED: { icon: Calendar, color: "text-blue-500", label: "Scheduled Task" },
  AUTOMATION: { icon: Bot, color: "text-purple-500", label: "Automation" },
  MODERATION: { icon: Shield, color: "text-red-500", label: "Moderation" },
  SYNC: { icon: Database, color: "text-green-500", label: "Data Sync" },
  NOTIFICATION: { icon: Mail, color: "text-indigo-500", label: "Notification" },
  BACKUP: { icon: Database, color: "text-orange-500", label: "Backup" },
  CLEANUP: { icon: Trash2, color: "text-gray-500", label: "Cleanup" },
  ANALYTICS: { icon: BarChart3, color: "text-cyan-500", label: "Analytics" },
}

const priorityConfig = {
  LOW: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  CRITICAL: { color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
}

function JobsPageContent() {
  const { data: jobs = [], isLoading, refetch } = useJobs()

  // Calculate stats
  const stats = {
    total: jobs.length,
    running: jobs.filter((j: any) => j.status === 'RUNNING').length,
    completed: jobs.filter((j: any) => j.status === 'COMPLETED').length,
    failed: jobs.filter((j: any) => j.status === 'FAILED').length,
  }

  // Prepare data for table
  const tableData = jobs.map((job: any) => ({
    ...job,
    statusConfig: statusConfig[job.status as keyof typeof statusConfig],
    typeConfig: typeConfig[job.type as keyof typeof typeConfig],
    priorityConfig: priorityConfig[job.priority as keyof typeof priorityConfig],
  }))

  const columns = [
    {
      key: 'name',
      label: 'Job',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", row.typeConfig?.color.replace('text-', 'bg-') + '/10')}>
            {row.typeConfig?.icon && <row.typeConfig.icon className={cn("h-4 w-4", row.typeConfig.color)} />}
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-xs text-muted-foreground line-clamp-1">
              {row.description}
            </div>
          </div>
        </div>
      ),
      width: '300px'
    },
    {
      key: 'type',
      label: 'Type',
      filterable: true,
      render: (value: any, row: any) => {
        const config = row.typeConfig
        return (
          <Badge variant="outline" className={cn("border-0 text-xs", config?.color.replace('text-', 'bg-') + '/10', config?.color)}>
            {config?.label}
          </Badge>
        )
      },
      width: '140px'
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value: any, row: any) => {
        const config = row.statusConfig
        const StatusIcon = config?.icon
        return (
          <Badge variant="outline" className={cn("border-0 text-xs", config?.bg, config?.color)}>
            {StatusIcon && <StatusIcon className={cn("w-3 h-3 mr-1", value === 'RUNNING' && "animate-spin")} />}
            {config?.label}
          </Badge>
        )
      },
      width: '120px'
    },
    {
      key: 'priority',
      label: 'Priority',
      filterable: true,
      sortable: true,
      render: (value: any, row: any) => {
        const config = row.priorityConfig
        return (
          <Badge variant="outline" className={cn("border-0 text-xs", config?.bg, config?.color)}>
            {config?.label}
          </Badge>
        )
      },
      width: '100px'
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (value: any, row: any) => (
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {row.status === 'COMPLETED' ? '100%' : 
               row.status === 'FAILED' ? 'Failed' :
               row.status === 'PENDING' ? 'Queued' : `${value || 0}%`}
            </span>
          </div>
          <Progress 
            value={row.status === 'COMPLETED' ? 100 : 
                   row.status === 'FAILED' ? 0 : 
                   row.status === 'PENDING' ? 0 : value || 0} 
            className="h-2"
          />
        </div>
      ),
      width: '120px'
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (value: any, row: any) => {
        const duration = value || (row.startedAt && row.completedAt ? 
          new Date(row.completedAt).getTime() - new Date(row.startedAt).getTime() : null)
        
        return (
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {duration ? `${Math.round(duration / 1000)}s` : '-'}
            </span>
          </div>
        )
      },
      width: '100px'
    },
    {
      key: 'scheduledAt',
      label: 'Scheduled',
      sortable: true,
      render: (value: any) => (
        <span className="text-sm text-muted-foreground">
          {value ? new Date(value).toLocaleString() : '-'}
        </span>
      ),
      width: '140px'
    },
    {
      key: 'attempts',
      label: 'Attempts',
      render: (value: any, row: any) => (
        <div className="text-center">
          <span className="text-sm font-medium">{value || 1}</span>
          {row.maxAttempts && (
            <span className="text-xs text-muted-foreground">/{row.maxAttempts}</span>
          )}
        </div>
      ),
      width: '80px'
    }
  ]

  const actions = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (row: any) => {
        toast.info(`View job details: ${row.name}`)
      }
    },
    {
      label: 'Retry Job',
      icon: RotateCcw,
      onClick: (row: any) => {
        toast.info(`Retrying job: ${row.name}`)
      }
    },
    {
      label: 'Cancel Job',
      icon: Pause,
      onClick: (row: any) => {
        toast.info(`Cancelled job: ${row.name}`)
      },
      variant: 'destructive' as const
    },
    {
      label: 'Delete Job',
      icon: Trash2,
      onClick: (row: any) => {
        toast.info(`Deleted job: ${row.name}`)
      },
      variant: 'destructive' as const
    }
  ]

  const bulkActions = [
    {
      label: 'Retry Selected',
      icon: RotateCcw,
      onClick: (rows: any[]) => {
        toast.info(`Retry ${rows.length} jobs`)
      }
    },
    {
      label: 'Cancel Selected',
      icon: Pause,
      onClick: (rows: any[]) => {
        toast.info(`Cancel ${rows.length} jobs`)
      },
      variant: 'destructive' as const
    },
    {
      label: 'Delete Selected',
      icon: Trash2,
      onClick: (rows: any[]) => {
        toast.info(`Delete ${rows.length} jobs`)
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Jobs", value: stats.total.toString(), icon: Settings, color: "text-blue-500" },
          { label: "Running", value: stats.running.toString(), icon: Loader2, color: "text-blue-500" },
          { label: "Completed", value: stats.completed.toString(), icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Failed", value: stats.failed.toString(), icon: XCircle, color: "text-red-500" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                  <stat.icon className={cn("h-5 w-5", stat.label === "Running" && stats.running > 0 && "animate-spin")} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Job Queue Management</CardTitle>
              <p className="text-xs text-muted-foreground">Monitor and manage background jobs</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause Queue
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Failed
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Jobs Table */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        title="Background Jobs"
        description={`Monitor ${tableData.length} background jobs and tasks`}
        loading={isLoading}
        searchable={true}
        filterable={true}
        selectable={true}
        exportable={true}
        pagination={true}
        pageSize={25}
        onRefresh={refetch}
        actions={actions}
        bulkActions={bulkActions}
      />
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobsPageContent />
    </Suspense>
  )
}