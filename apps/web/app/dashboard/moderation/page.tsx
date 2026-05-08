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
  Shield,
  Ban,
  Clock,
  MessageSquare,
  AlertTriangle,
  UserX,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  Flag,
  CheckCircle2,
  XCircle,
  Gavel,
  FileText,
  Zap,
  Target,
  Activity,
  TrendingUp,
  Users,
  Hash,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table"

const actionTypes = [
  { id: 'timeout', name: 'Timeout', icon: Clock, color: 'text-amber-500', description: 'Temporarily restrict user' },
  { id: 'ban', name: 'Ban', icon: Ban, color: 'text-red-500', description: 'Permanently ban user' },
  { id: 'kick', name: 'Kick', icon: UserX, color: 'text-orange-500', description: 'Remove user from server' },
  { id: 'warn', name: 'Warning', icon: AlertTriangle, color: 'text-yellow-500', description: 'Issue formal warning' },
  { id: 'mute', name: 'Mute', icon: VolumeX, color: 'text-purple-500', description: 'Remove speaking permissions' },
  { id: 'delete', name: 'Delete Messages', icon: Trash2, color: 'text-red-400', description: 'Delete user messages' },
]

const quickActions = [
  {
    name: 'Mass Timeout',
    description: 'Timeout multiple users at once',
    icon: Clock,
    color: 'text-amber-500',
    action: () => toast.info('Mass timeout dialog opened')
  },
  {
    name: 'Purge Messages',
    description: 'Delete messages in bulk',
    icon: Trash2,
    color: 'text-red-500',
    action: () => toast.info('Message purge dialog opened')
  },
  {
    name: 'Role Management',
    description: 'Bulk role assignment/removal',
    icon: Shield,
    color: 'text-blue-500',
    action: () => toast.info('Role management dialog opened')
  },
  {
    name: 'Channel Lockdown',
    description: 'Lock channels for emergencies',
    icon: Eye,
    color: 'text-purple-500',
    action: () => toast.info('Channel lockdown activated')
  },
]

// Mock moderation data
const moderationActions = [
  {
    id: '1',
    type: 'timeout',
    targetUser: { id: '123', username: 'SpamUser123', avatar: null },
    moderator: { id: '456', username: 'ModeratorBot', avatar: null },
    reason: 'Excessive spam in #general',
    duration: '1 hour',
    createdAt: new Date().toISOString(),
    status: 'active',
    evidence: 'Message IDs: 789, 790, 791'
  },
  {
    id: '2',
    type: 'ban',
    targetUser: { id: '124', username: 'ToxicUser99', avatar: null },
    moderator: { id: '457', username: 'AdminUser', avatar: null },
    reason: 'Harassment and hate speech',
    duration: 'permanent',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    evidence: 'Screenshots attached'
  },
  {
    id: '3',
    type: 'warn',
    targetUser: { id: '125', username: 'NewUser456', avatar: null },
    moderator: { id: '456', username: 'ModeratorBot', avatar: null },
    reason: 'Off-topic discussion in #announcements',
    duration: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    evidence: 'Message ID: 792'
  },
]

export default function ModerationPage() {
  const [selectedAction, setSelectedAction] = useState<any>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showQuickActionModal, setShowQuickActionModal] = useState(false)
  const [selectedQuickAction, setSelectedQuickAction] = useState<any>(null)

  // Stats
  const stats = {
    totalActions: moderationActions.length,
    activeTimeouts: moderationActions.filter(a => a.type === 'timeout' && a.status === 'active').length,
    totalBans: moderationActions.filter(a => a.type === 'ban').length,
    warningsIssued: moderationActions.filter(a => a.type === 'warn').length,
  }

  // Prepare data for table
  const tableData = moderationActions.map((action) => {
    const actionType = actionTypes.find(t => t.id === action.type)
    return {
      ...action,
      actionType,
      typeLabel: actionType?.name,
      typeIcon: actionType?.icon,
      typeColor: actionType?.color,
    }
  })

  const columns = [
    {
      key: 'type',
      label: 'Action',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          {row.typeIcon && <row.typeIcon className={cn("w-4 h-4", row.typeColor)} />}
          <span className="font-medium">{row.typeLabel}</span>
        </div>
      ),
      width: '120px'
    },
    {
      key: 'targetUser',
      label: 'Target User',
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={value.avatar} />
            <AvatarFallback className="text-xs">
              {value.username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{value.username}</div>
            <div className="text-xs text-muted-foreground">ID: {value.id}</div>
          </div>
        </div>
      ),
      width: '200px'
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value: any) => (
        <div className="max-w-xs">
          <p className="text-sm line-clamp-2">{value}</p>
        </div>
      ),
      width: '250px'
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (value: any) => (
        <Badge variant="outline" className="text-xs">
          {value || 'Instant'}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'moderator',
      label: 'Moderator',
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={value.avatar} />
            <AvatarFallback className="text-xs">
              {value.username?.charAt(0)?.toUpperCase() || 'M'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{value.username}</span>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value: any) => (
        <Badge variant="outline" className={cn(
          "border-0 text-xs",
          value === 'active' ? "bg-green-500/10 text-green-500" :
          value === 'expired' ? "bg-muted text-muted-foreground" :
          "bg-blue-500/10 text-blue-500"
        )}>
          {value === 'active' ? 'Active' : value === 'expired' ? 'Expired' : 'Completed'}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (value: any) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString()}
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
        setSelectedAction(row)
        setShowActionModal(true)
      }
    },
    {
      label: 'Edit Action',
      icon: Edit,
      onClick: (row: any) => {
        toast.info(`Edit ${row.typeLabel} for ${row.targetUser.username}`)
      }
    },
    {
      label: 'Revoke Action',
      icon: XCircle,
      onClick: (row: any) => {
        toast.info(`Revoked ${row.typeLabel} for ${row.targetUser.username}`)
      },
      variant: 'destructive' as const
    }
  ]

  const bulkActions = [
    {
      label: 'Revoke Selected',
      icon: XCircle,
      onClick: (rows: any[]) => {
        toast.info(`Revoke ${rows.length} actions`)
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Actions", value: stats.totalActions.toString(), icon: Gavel, color: "text-blue-500" },
          { label: "Active Timeouts", value: stats.activeTimeouts.toString(), icon: Clock, color: "text-amber-500" },
          { label: "Total Bans", value: stats.totalBans.toString(), icon: Ban, color: "text-red-500" },
          { label: "Warnings Issued", value: stats.warningsIssued.toString(), icon: AlertTriangle, color: "text-orange-500" },
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

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Moderation Actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Perform common moderation tasks quickly
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => {
                  setSelectedQuickAction(action)
                  setShowQuickActionModal(true)
                }}
              >
                <action.icon className={cn("w-6 h-6 mr-3", action.color)} />
                <div className="text-left">
                  <div className="font-medium text-sm">{action.name}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Moderation Actions Table */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        title="Moderation Log"
        description={`View ${tableData.length} moderation actions`}
        searchable={true}
        filterable={true}
        selectable={true}
        exportable={true}
        pagination={true}
        pageSize={25}
        onRowClick={(row) => {
          setSelectedAction(row)
          setShowActionModal(true)
        }}
        actions={actions}
        bulkActions={bulkActions}
      />

      {/* Action Details Modal */}
      {selectedAction && (
        <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {selectedAction.typeIcon && (
                  <selectedAction.typeIcon className={cn("w-6 h-6", selectedAction.typeColor)} />
                )}
                <DialogTitle>{selectedAction.typeLabel} Action</DialogTitle>
                <Badge variant="outline" className={cn(
                  "border-0 text-xs ml-auto",
                  selectedAction.status === 'active' ? "bg-green-500/10 text-green-500" :
                  selectedAction.status === 'expired' ? "bg-muted text-muted-foreground" :
                  "bg-blue-500/10 text-blue-500"
                )}>
                  {selectedAction.status === 'active' ? 'Active' : 
                   selectedAction.status === 'expired' ? 'Expired' : 'Completed'}
                </Badge>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Target User</Label>
                  <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border bg-secondary/20">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedAction.targetUser.avatar} />
                      <AvatarFallback>
                        {selectedAction.targetUser.username?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedAction.targetUser.username}</div>
                      <div className="text-sm text-muted-foreground">ID: {selectedAction.targetUser.id}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Moderator</Label>
                  <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border bg-secondary/20">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedAction.moderator.avatar} />
                      <AvatarFallback>
                        {selectedAction.moderator.username?.charAt(0)?.toUpperCase() || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedAction.moderator.username}</div>
                      <div className="text-sm text-muted-foreground">ID: {selectedAction.moderator.id}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="mt-1 p-3 rounded-lg border bg-secondary/20">{selectedAction.reason}</p>
              </div>

              {selectedAction.evidence && (
                <div>
                  <Label className="text-xs text-muted-foreground">Evidence</Label>
                  <p className="mt-1 p-3 rounded-lg border bg-secondary/20 text-sm font-mono">{selectedAction.evidence}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <p className="mt-1">{selectedAction.duration || 'Instant'}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="mt-1">{new Date(selectedAction.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Action
                </Button>
                {selectedAction.status === 'active' && (
                  <Button variant="outline">
                    <XCircle className="w-4 h-4 mr-2" />
                    Revoke
                  </Button>
                )}
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View Logs
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Action Modal */}
      <Dialog open={showQuickActionModal} onOpenChange={setShowQuickActionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedQuickAction?.icon && (
                <selectedQuickAction.icon className={cn("w-6 h-6", selectedQuickAction.color)} />
              )}
              <DialogTitle>{selectedQuickAction?.name}</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">{selectedQuickAction?.description}</p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="targets">Target Users/Channels</Label>
                <Textarea
                  id="targets"
                  placeholder="Enter user IDs, usernames, or channel IDs (one per line)"
                  className="mt-1"
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  placeholder="Enter reason for this action"
                  className="mt-1"
                />
              </div>
              
              {selectedQuickAction?.name.includes('Timeout') && (
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5m">5 minutes</SelectItem>
                      <SelectItem value="10m">10 minutes</SelectItem>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={() => {
                selectedQuickAction?.action()
                setShowQuickActionModal(false)
              }}>
                <Zap className="w-4 h-4 mr-2" />
                Execute Action
              </Button>
              <Button variant="outline" onClick={() => setShowQuickActionModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Moderation Action</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Action Type</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        <div className="flex items-center gap-2">
                          <action.icon className={cn("w-4 h-4", action.color)} />
                          {action.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="target">Target User</Label>
                <Input
                  id="target"
                  placeholder="Username or User ID"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter detailed reason for this action"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button>
                <Gavel className="w-4 h-4 mr-2" />
                Execute Action
              </Button>
              <Button variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}