"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  Users,
  UserPlus,
  Shield,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Edit,
  MessageSquare,
  Settings,
  UserCheck,
  UserX,
  Crown,
  Activity,
  Calendar,
  Hash,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  Flag,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Loader2,
  Save,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  useDiscordMembers, 
  useUsers, 
  useSyncUsers,
} from "@/lib/hooks/use-api"
import { toast } from "sonner"
import { Suspense } from "react"
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table"

const statusConfig = {
  online: { color: "bg-emerald-500", label: "Online", textColor: "text-emerald-500" },
  idle: { color: "bg-amber-500", label: "Idle", textColor: "text-amber-500" },
  dnd: { color: "bg-red-500", label: "Do Not Disturb", textColor: "text-red-500" },
  offline: { color: "bg-muted-foreground/50", label: "Offline", textColor: "text-muted-foreground" },
}

function UsersPageContent() {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  
  // Fetch data
  const { data: discordMembers = [], isLoading: membersLoading, refetch: refetchMembers } = useDiscordMembers()
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers()
  const syncUsersMutation = useSyncUsers()

  // Calculate stats
  const stats = {
    total: discordMembers.length,
    online: discordMembers.filter((m: any) => m.presence?.status === 'online').length,
    newToday: discordMembers.filter((m: any) => {
      const joinedDate = new Date(m.joinedAt)
      const today = new Date()
      return joinedDate.toDateString() === today.toDateString()
    }).length,
    flagged: users.filter((u: any) => u.flags?.length > 0).length,
  }

  const handleSyncUsers = async () => {
    try {
      await syncUsersMutation.mutateAsync()
      toast.success('Users synced successfully')
      refetchMembers()
      refetchUsers()
    } catch (error) {
      toast.error('Failed to sync users')
    }
  }

  const handleRefresh = () => {
    refetchMembers()
    refetchUsers()
  }

  // Prepare data for table
  const tableData = discordMembers.map((member: any) => {
    const user = users.find((u: any) => u.discordId === member.user?.id)
    const status = statusConfig[member.presence?.status as keyof typeof statusConfig] || statusConfig.offline
    
    return {
      id: member.user?.id || member.id,
      avatar: member.user?.displayAvatarURL || member.user?.avatar,
      username: member.user?.username || member.displayName || 'Unknown',
      displayName: member.displayName || member.user?.username,
      discriminator: member.user?.discriminator,
      status: member.presence?.status || 'offline',
      statusLabel: status.label,
      roles: member.roles || [],
      joinedAt: member.joinedAt,
      flags: user?.flags || [],
      trustScore: user?.trustScore || 50,
      messageCount: user?.messageCount || 0,
      lastActive: user?.lastActive,
      notes: user?.notes || '',
      warnings: user?.warnings || 0,
      member,
      user,
    }
  })

  const columns = [
    {
      key: 'avatar',
      label: 'User',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={row.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {row.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", statusConfig[row.status as keyof typeof statusConfig]?.color)} />
          </div>
          <div>
            <div className="font-medium">{row.displayName}</div>
            <div className="text-sm text-muted-foreground">@{row.username}</div>
          </div>
        </div>
      ),
      width: '250px'
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value: any, row: any) => (
        <Badge variant="outline" className={cn("border-0 text-xs", statusConfig[value as keyof typeof statusConfig]?.color.replace('bg-', 'bg-') + '/10', statusConfig[value as keyof typeof statusConfig]?.textColor)}>
          {row.statusLabel}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (value: any) => (
        <div className="flex flex-wrap gap-1">
          {value?.length > 0 ? (
            value.slice(0, 2).map((role: any, index: number) => (
              <Badge key={index} variant="outline" className="text-xs border-0 bg-primary/10 text-primary">
                {role.name || `Role ${index + 1}`}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs border-0 bg-muted text-muted-foreground">
              Member
            </Badge>
          )}
          {value?.length > 2 && (
            <Badge variant="outline" className="text-xs border-0 bg-muted text-muted-foreground">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      ),
      width: '200px'
    },
    {
      key: 'trustScore',
      label: 'Trust',
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            value >= 75 ? "bg-emerald-500" :
            value >= 50 ? "bg-amber-500" :
            value >= 25 ? "bg-orange-500" : "bg-red-500"
          )} />
          <span className="text-sm font-medium">{value}</span>
        </div>
      ),
      width: '80px'
    },
    {
      key: 'messageCount',
      label: 'Messages',
      sortable: true,
      render: (value: any) => (
        <span className="text-sm">{value.toLocaleString()}</span>
      ),
      width: '100px'
    },
    {
      key: 'joinedAt',
      label: 'Joined',
      sortable: true,
      render: (value: any) => (
        <span className="text-sm text-muted-foreground">
          {value ? new Date(value).toLocaleDateString() : 'Unknown'}
        </span>
      ),
      width: '120px'
    },
    {
      key: 'flags',
      label: 'Flags',
      render: (value: any) => (
        <div className="flex gap-1">
          {value?.length > 0 ? (
            value.map((flag: string, index: number) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {flag}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      ),
      width: '120px'
    }
  ]

  const actions = [
    {
      label: 'View Profile',
      icon: Eye,
      onClick: (row: any) => {
        setSelectedUser(row)
        setShowUserModal(true)
      }
    },
    {
      label: 'Send Message',
      icon: MessageSquare,
      onClick: (row: any) => {
        toast.info(`Send message to ${row.username}`)
      }
    },
    {
      label: 'Timeout',
      icon: Clock,
      onClick: (row: any) => {
        toast.info(`Timeout ${row.username}`)
      },
      variant: 'destructive' as const
    },
    {
      label: 'Ban User',
      icon: Ban,
      onClick: (row: any) => {
        toast.info(`Ban ${row.username}`)
      },
      variant: 'destructive' as const
    }
  ]

  const bulkActions = [
    {
      label: 'Add Role',
      icon: UserPlus,
      onClick: (rows: any[]) => {
        toast.info(`Add role to ${rows.length} users`)
      }
    },
    {
      label: 'Remove Role',
      icon: UserX,
      onClick: (rows: any[]) => {
        toast.info(`Remove role from ${rows.length} users`)
      }
    },
    {
      label: 'Timeout Selected',
      icon: Clock,
      onClick: (rows: any[]) => {
        toast.info(`Timeout ${rows.length} users`)
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Members", value: stats.total.toString(), icon: Users, color: "text-blue-500" },
          { label: "Online Now", value: stats.online.toString(), icon: Activity, color: "text-emerald-500" },
          { label: "Joined Today", value: stats.newToday.toString(), icon: UserPlus, color: "text-purple-500" },
          { label: "Flagged Users", value: stats.flagged.toString(), icon: Flag, color: "text-red-500" },
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              <p className="text-xs text-muted-foreground">Manage your Discord members</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSyncUsers}
                disabled={syncUsersMutation.isPending}
              >
                {syncUsersMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Users
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        title="Server Members"
        description={`Manage ${tableData.length} Discord members`}
        loading={membersLoading || usersLoading}
        searchable={true}
        filterable={true}
        selectable={true}
        exportable={true}
        pagination={true}
        pageSize={25}
        onRowClick={(row) => {
          setSelectedUser(row)
          setShowUserModal(true)
        }}
        onRowSelect={setSelectedUsers}
        onRefresh={handleRefresh}
        actions={actions}
        bulkActions={bulkActions}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false)
          setSelectedUser(null)
        }}
        onUpdate={() => {
          refetchUsers()
          refetchMembers()
        }}
      />
    </div>
  )
}

function UserProfileModal({ user, isOpen, onClose, onUpdate }: {
  user: any
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState('profile')

  if (!user) return null

  const status = statusConfig[user.status as keyof typeof statusConfig] || statusConfig.offline

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className={cn("absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-card", status.color)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{user.displayName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">@{user.username}</span>
                <Badge variant="outline" className={cn("border-0 text-xs", status.color.replace('bg-', 'bg-') + '/10', status.textColor)}>
                  {status.label}
                </Badge>
                {user.roles?.length > 0 && (
                  <Badge variant="outline" className="text-xs border-0 bg-primary/10 text-primary">
                    {user.roles.length} roles
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <div className="mt-4 h-[60vh] overflow-y-auto">
            <TabsContent value="profile" className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                    Discord Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">ID: {user.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Joined: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Active: {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                    Server Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Trust Score</span>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          user.trustScore >= 75 ? "bg-emerald-500" :
                          user.trustScore >= 50 ? "bg-amber-500" :
                          user.trustScore >= 25 ? "bg-orange-500" : "bg-red-500"
                        )} />
                        <span className="text-sm font-medium">{user.trustScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Messages Sent</span>
                      <span className="text-sm font-medium">{user.messageCount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Warnings</span>
                      <span className="text-sm font-medium">{user.warnings || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Roles */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                  Roles ({user.roles?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.roles?.length > 0 ? (
                    user.roles.map((role: any, index: number) => (
                      <Badge key={index} variant="outline" className="border-0 bg-primary/10 text-primary">
                        <Crown className="w-3 h-3 mr-1" />
                        {role.name || `Role ${index + 1}`}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Flags */}
              {user.flags?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                      Flags & Warnings
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {user.flags.map((flag: string, index: number) => (
                        <Badge key={index} variant="destructive">
                          <Flag className="w-3 h-3 mr-1" />
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Activity tracking coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="moderation" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <Clock className="w-5 h-5 mr-3 text-amber-500" />
                  <div className="text-left">
                    <div className="font-medium">Timeout User</div>
                    <div className="text-xs text-muted-foreground">Temporarily restrict user</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <Ban className="w-5 h-5 mr-3 text-red-500" />
                  <div className="text-left">
                    <div className="font-medium">Ban User</div>
                    <div className="text-xs text-muted-foreground">Permanently ban from server</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <UserPlus className="w-5 h-5 mr-3 text-blue-500" />
                  <div className="text-left">
                    <div className="font-medium">Add Role</div>
                    <div className="text-xs text-muted-foreground">Assign server role</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <MessageSquare className="w-5 h-5 mr-3 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium">Send Warning</div>
                    <div className="text-xs text-muted-foreground">Direct message user</div>
                  </div>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Moderator Notes</Label>
                  <Textarea
                    id="notes"
                    value={user.notes || ''}
                    placeholder="Add notes about this user..."
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="trust-score">Trust Score</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="trust-score"
                      type="number"
                      min="0"
                      max="100"
                      value={user.trustScore || 50}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UsersPageContent />
    </Suspense>
  )
}