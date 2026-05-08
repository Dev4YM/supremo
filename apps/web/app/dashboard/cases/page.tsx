"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Eye,
  Edit,
  Archive,
  UserCheck,
  Ban,
  Shield,
  Calendar,
  Flag,
  Loader2,
  Save,
} from "lucide-react"
import { useCases, useCreateCase } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table"
import { toast } from "sonner"

const statusConfig = {
  OPEN: { color: "text-red-500", bg: "bg-red-500/10", label: "Open" },
  ASSIGNED: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Assigned" },
  IN_PROGRESS: { color: "text-blue-500", bg: "bg-blue-500/10", label: "In Progress" },
  RESOLVED: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Resolved" },
  CLOSED: { color: "text-muted-foreground", bg: "bg-muted", label: "Closed" },
}

const priorityConfig = {
  LOW: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  CRITICAL: { color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
}

const typeConfig = {
  MODERATION: { icon: Shield, color: "text-blue-500", label: "Moderation" },
  APPEAL: { icon: UserCheck, color: "text-green-500", label: "Appeal" },
  REPORT: { icon: Flag, color: "text-red-500", label: "Report" },
  TECHNICAL: { icon: AlertTriangle, color: "text-purple-500", label: "Technical" },
  OTHER: { icon: FileText, color: "text-muted-foreground", label: "Other" },
}

function CasesPageContent() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    type: 'MODERATION',
    priority: 'MEDIUM'
  })
  
  const { data: cases = [], isLoading, refetch } = useCases({})
  const createCaseMutation = useCreateCase()

  // Calculate stats
  const stats = {
    total: cases.length,
    open: cases.filter((c: any) => c.status === 'OPEN').length,
    inProgress: cases.filter((c: any) => c.status === 'IN_PROGRESS').length,
    resolved: cases.filter((c: any) => c.status === 'RESOLVED').length,
  }

  const handleCreateCase = async () => {
    try {
      await createCaseMutation.mutateAsync(newCase)
      toast.success('Case created successfully')
      setShowCreateModal(false)
      setNewCase({ title: '', description: '', type: 'MODERATION', priority: 'MEDIUM' })
      refetch()
    } catch (error) {
      toast.error('Failed to create case')
    }
  }

  // Prepare data for table
  const tableData = cases.map((caseItem: any) => ({
    ...caseItem,
    statusConfig: statusConfig[caseItem.status as keyof typeof statusConfig],
    priorityConfig: priorityConfig[caseItem.priority as keyof typeof priorityConfig],
    typeConfig: typeConfig[caseItem.type as keyof typeof typeConfig],
  }))

  const columns = [
    {
      key: 'id',
      label: 'Case ID',
      render: (value: any) => (
        <Badge variant="outline" className="font-mono text-xs">
          #{value}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value: any, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {row.description}
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
          <Badge variant="outline" className={cn("border-0 text-xs", config?.bg, config?.color)}>
            {config?.icon && <config.icon className="w-3 h-3 mr-1" />}
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
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value: any, row: any) => {
        const config = row.statusConfig
        return (
          <Badge variant="outline" className={cn("border-0 text-xs", config?.bg, config?.color)}>
            {config?.label}
          </Badge>
        )
      },
      width: '100px'
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (value: any) => (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={value.avatar} />
                <AvatarFallback className="text-xs">
                  {value.username?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{value.username}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
      ),
      width: '150px'
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: any) => (
        <span className="text-sm text-muted-foreground">
          {value ? new Date(value).toLocaleDateString() : 'Unknown'}
        </span>
      ),
      width: '100px'
    }
  ]

  const actions = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (row: any) => {
        setSelectedCase(row)
        setShowCaseModal(true)
      }
    },
    {
      label: 'Edit Case',
      icon: Edit,
      onClick: (row: any) => {
        toast.info(`Edit case #${row.id}`)
      }
    },
    {
      label: 'Assign to Me',
      icon: UserCheck,
      onClick: (row: any) => {
        toast.info(`Assigned case #${row.id} to you`)
      }
    },
    {
      label: 'Close Case',
      icon: Archive,
      onClick: (row: any) => {
        toast.info(`Closed case #${row.id}`)
      },
      variant: 'destructive' as const
    }
  ]

  const bulkActions = [
    {
      label: 'Assign Selected',
      icon: UserCheck,
      onClick: (rows: any[]) => {
        toast.info(`Assign ${rows.length} cases`)
      }
    },
    {
      label: 'Close Selected',
      icon: Archive,
      onClick: (rows: any[]) => {
        toast.info(`Close ${rows.length} cases`)
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Cases", value: stats.total.toString(), icon: FileText, color: "text-blue-500" },
          { label: "Open Cases", value: stats.open.toString(), icon: AlertTriangle, color: "text-red-500" },
          { label: "In Progress", value: stats.inProgress.toString(), icon: Clock, color: "text-amber-500" },
          { label: "Resolved", value: stats.resolved.toString(), icon: CheckCircle2, color: "text-emerald-500" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cases Table */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        title="Case Management"
        description={`Manage ${tableData.length} support cases`}
        loading={isLoading}
        searchable={true}
        filterable={true}
        selectable={true}
        exportable={true}
        pagination={true}
        pageSize={20}
        onRowClick={(row) => {
          setSelectedCase(row)
          setShowCaseModal(true)
        }}
        onRefresh={refetch}
        actions={actions}
        bulkActions={bulkActions}
      />

      {/* Create Case Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Case Title</Label>
              <Input
                id="title"
                value={newCase.title}
                onChange={(e) => setNewCase(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter case title..."
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCase.description}
                onChange={(e) => setNewCase(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the case details..."
                className="mt-1 min-h-24"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={newCase.type} onValueChange={(value) => setNewCase(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={cn("w-4 h-4", config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Priority</Label>
                <Select value={newCase.priority} onValueChange={(value) => setNewCase(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", config.bg)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleCreateCase}
                disabled={createCaseMutation.isPending || !newCase.title || !newCase.description}
              >
                {createCaseMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Create Case
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Case Details Modal */}
      {selectedCase && (
        <Dialog open={showCaseModal} onOpenChange={setShowCaseModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  #{selectedCase.id}
                </Badge>
                <DialogTitle>{selectedCase.title}</DialogTitle>
                <div className="flex gap-2 ml-auto">
                  <Badge variant="outline" className={cn("border-0 text-xs", selectedCase.priorityConfig?.bg, selectedCase.priorityConfig?.color)}>
                    {selectedCase.priorityConfig?.label}
                  </Badge>
                  <Badge variant="outline" className={cn("border-0 text-xs", selectedCase.statusConfig?.bg, selectedCase.statusConfig?.color)}>
                    {selectedCase.statusConfig?.label}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="mt-1">{selectedCase.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(selectedCase.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedCase.assignedTo ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedCase.assignedTo.avatar} />
                          <AvatarFallback className="text-xs">
                            {selectedCase.assignedTo.username?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{selectedCase.assignedTo.username}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Case
                </Button>
                <Button variant="outline">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign to Me
                </Button>
                <Button variant="outline">
                  <Archive className="w-4 h-4 mr-2" />
                  Close Case
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CasesPageContent />
    </Suspense>
  )
}