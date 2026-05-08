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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Plus,
  Eye,
  MessageSquare,
  Archive,
  UserCheck,
  Settings,
  Calendar,
  Hash,
  Flag,
  Loader2,
  Save,
  Send,
  Paperclip,
  X,
  Edit,
} from "lucide-react"
import { useTickets, useCreateTicket } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table"
import { toast } from "sonner"

const statusConfig = {
  OPEN: { color: "text-red-500", bg: "bg-red-500/10", label: "Open" },
  PENDING: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending" },
  IN_PROGRESS: { color: "text-blue-500", bg: "bg-blue-500/10", label: "In Progress" },
  RESOLVED: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Resolved" },
  CLOSED: { color: "text-muted-foreground", bg: "bg-muted", label: "Closed" },
}

const priorityConfig = {
  LOW: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  URGENT: { color: "text-red-500", bg: "bg-red-500/10", label: "Urgent" },
}

const categoryConfig = {
  GENERAL: { icon: MessageSquare, color: "text-blue-500", label: "General Support" },
  TECHNICAL: { icon: Settings, color: "text-purple-500", label: "Technical Issue" },
  BILLING: { icon: AlertCircle, color: "text-green-500", label: "Billing" },
  MODERATION: { icon: Flag, color: "text-red-500", label: "Moderation" },
  FEATURE: { icon: Plus, color: "text-indigo-500", label: "Feature Request" },
  OTHER: { icon: Ticket, color: "text-muted-foreground", label: "Other" },
}

function TicketsPageContent() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM'
  })
  const [newMessage, setNewMessage] = useState('')
  
  const { data: tickets = [], isLoading, refetch } = useTickets()
  const createTicketMutation = useCreateTicket()

  // Calculate stats
  const stats = {
    total: tickets.length,
    open: tickets.filter((t: any) => t.status === 'OPEN').length,
    pending: tickets.filter((t: any) => t.status === 'PENDING').length,
    resolved: tickets.filter((t: any) => t.status === 'RESOLVED').length,
  }

  const handleCreateTicket = async () => {
    try {
      await createTicketMutation.mutateAsync(newTicket)
      toast.success('Ticket created successfully')
      setShowCreateModal(false)
      setNewTicket({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' })
      refetch()
    } catch (error) {
      toast.error('Failed to create ticket')
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    toast.success('Message sent')
    setNewMessage('')
  }

  // Prepare data for table
  const tableData = tickets.map((ticket: any) => ({
    ...ticket,
    statusConfig: statusConfig[ticket.status as keyof typeof statusConfig],
    priorityConfig: priorityConfig[ticket.priority as keyof typeof priorityConfig],
    categoryConfig: categoryConfig[ticket.category as keyof typeof categoryConfig],
  }))

  const columns = [
    {
      key: 'id',
      label: 'Ticket ID',
      render: (value: any) => (
        <Badge variant="outline" className="font-mono text-xs">
          #{value}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'title',
      label: 'Subject',
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
      key: 'user',
      label: 'User',
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={value?.avatar} />
            <AvatarFallback className="text-xs">
              {value?.username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{value?.username || 'Unknown'}</div>
            <div className="text-xs text-muted-foreground">ID: {value?.id}</div>
          </div>
        </div>
      ),
      width: '200px'
    },
    {
      key: 'category',
      label: 'Category',
      filterable: true,
      render: (value: any, row: any) => {
        const config = row.categoryConfig
        return (
          <Badge variant="outline" className={cn("border-0 text-xs", config?.bg, config?.color)}>
            {config?.icon && <config.icon className="w-3 h-3 mr-1" />}
            {config?.label}
          </Badge>
        )
      },
      width: '150px'
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
      label: 'View Ticket',
      icon: Eye,
      onClick: (row: any) => {
        setSelectedTicket(row)
        setShowTicketModal(true)
      }
    },
    {
      label: 'Reply',
      icon: MessageSquare,
      onClick: (row: any) => {
        setSelectedTicket(row)
        setShowTicketModal(true)
      }
    },
    {
      label: 'Assign to Me',
      icon: UserCheck,
      onClick: (row: any) => {
        toast.info(`Assigned ticket #${row.id} to you`)
      }
    },
    {
      label: 'Close Ticket',
      icon: Archive,
      onClick: (row: any) => {
        toast.info(`Closed ticket #${row.id}`)
      },
      variant: 'destructive' as const
    }
  ]

  const bulkActions = [
    {
      label: 'Assign Selected',
      icon: UserCheck,
      onClick: (rows: any[]) => {
        toast.info(`Assign ${rows.length} tickets`)
      }
    },
    {
      label: 'Close Selected',
      icon: Archive,
      onClick: (rows: any[]) => {
        toast.info(`Close ${rows.length} tickets`)
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tickets", value: stats.total.toString(), icon: Ticket, color: "text-blue-500" },
          { label: "Open Tickets", value: stats.open.toString(), icon: AlertCircle, color: "text-red-500" },
          { label: "Pending", value: stats.pending.toString(), icon: Clock, color: "text-amber-500" },
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

      {/* Tickets Table */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        title="Support Tickets"
        description={`Manage ${tableData.length} support tickets`}
        loading={isLoading}
        searchable={true}
        filterable={true}
        selectable={true}
        exportable={true}
        pagination={true}
        pageSize={20}
        onRowClick={(row) => {
          setSelectedTicket(row)
          setShowTicketModal(true)
        }}
        onRefresh={refetch}
        actions={actions}
        bulkActions={bulkActions}
      />

      {/* Create Ticket Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Subject</Label>
              <Input
                id="title"
                value={newTicket.title}
                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter ticket subject..."
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the issue or request..."
                className="mt-1 min-h-24"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newTicket.category} onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
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
                <Select value={newTicket.priority} onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}>
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
                onClick={handleCreateTicket}
                disabled={createTicketMutation.isPending || !newTicket.title || !newTicket.description}
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Create Ticket
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  #{selectedTicket.id}
                </Badge>
                <DialogTitle>{selectedTicket.title}</DialogTitle>
                <div className="flex gap-2 ml-auto">
                  <Badge variant="outline" className={cn("border-0 text-xs", selectedTicket.priorityConfig?.bg, selectedTicket.priorityConfig?.color)}>
                    {selectedTicket.priorityConfig?.label}
                  </Badge>
                  <Badge variant="outline" className={cn("border-0 text-xs", selectedTicket.statusConfig?.bg, selectedTicket.statusConfig?.color)}>
                    {selectedTicket.statusConfig?.label}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="conversation" className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <div className="mt-4 h-[60vh] overflow-y-auto">
                <TabsContent value="conversation" className="space-y-4">
                  {/* Original Message */}
                  <div className="p-4 rounded-lg border bg-secondary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedTicket.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {selectedTicket.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{selectedTicket.user?.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(selectedTicket.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm">{selectedTicket.description}</p>
                  </div>

                  {/* Reply Form */}
                  <div className="p-4 rounded-lg border bg-card">
                    <Label htmlFor="reply" className="text-sm font-medium">Reply to ticket</Label>
                    <Textarea
                      id="reply"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="mt-2 min-h-24"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach File
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Save Draft
                        </Button>
                        <Button size="sm" onClick={handleSendMessage}>
                          <Send className="w-4 h-4 mr-2" />
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-xs text-muted-foreground">User Information</Label>
                      <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border bg-secondary/20">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedTicket.user?.avatar} />
                          <AvatarFallback>
                            {selectedTicket.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{selectedTicket.user?.username}</div>
                          <div className="text-sm text-muted-foreground">ID: {selectedTicket.user?.id}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Assignment</Label>
                      <div className="mt-2 p-3 rounded-lg border bg-secondary/20">
                        {selectedTicket.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={selectedTicket.assignedTo.avatar} />
                              <AvatarFallback className="text-xs">
                                {selectedTicket.assignedTo.username?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{selectedTicket.assignedTo.username}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={cn("border-0", selectedTicket.categoryConfig?.bg, selectedTicket.categoryConfig?.color)}>
                          {selectedTicket.categoryConfig?.icon && <selectedTicket.categoryConfig.icon className="w-3 h-3 mr-1" />}
                          {selectedTicket.categoryConfig?.label}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={cn("border-0", selectedTicket.priorityConfig?.bg, selectedTicket.priorityConfig?.color)}>
                          {selectedTicket.priorityConfig?.label}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={cn("border-0", selectedTicket.statusConfig?.bg, selectedTicket.statusConfig?.color)}>
                          {selectedTicket.statusConfig?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Ticket history coming soon</p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Ticket
              </Button>
              <Button variant="outline">
                <UserCheck className="w-4 h-4 mr-2" />
                Assign to Me
              </Button>
              <Button variant="outline">
                <Archive className="w-4 h-4 mr-2" />
                Close Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketsPageContent />
    </Suspense>
  )
}