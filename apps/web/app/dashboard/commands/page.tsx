"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Terminal,
  Zap,
  Shield,
  Users,
  Settings,
  Plus,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  Code,
  Hash,
  Clock,
  BarChart3,
  Copy,
  ExternalLink,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { useCommands } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table"
import { toast } from "sonner"

const typeConfig = {
  SLASH: { icon: Hash, color: "text-blue-500", label: "Slash Command" },
  PREFIX: { icon: Terminal, color: "text-green-500", label: "Prefix Command" },
  CONTEXT: { icon: Settings, color: "text-purple-500", label: "Context Menu" },
  BUTTON: { icon: Play, color: "text-orange-500", label: "Button" },
}

const categoryConfig = {
  MODERATION: { icon: Shield, color: "text-red-500", label: "Moderation" },
  UTILITY: { icon: Settings, color: "text-blue-500", label: "Utility" },
  FUN: { icon: Zap, color: "text-purple-500", label: "Fun" },
  MUSIC: { icon: Play, color: "text-green-500", label: "Music" },
  ADMIN: { icon: Users, color: "text-orange-500", label: "Admin" },
  INFO: { icon: BarChart3, color: "text-indigo-500", label: "Information" },
}

function CommandsPageContent() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<any>(null)
  const [showCommandModal, setShowCommandModal] = useState(false)
  const [newCommand, setNewCommand] = useState({
    name: '',
    description: '',
    type: 'SLASH',
    category: 'UTILITY',
    enabled: true,
    permissions: [],
    cooldown: 0,
    code: ''
  })
  
  const { data: commands = [], isLoading, refetch } = useCommands()

  // Calculate stats
  const stats = {
    total: commands.length,
    enabled: commands.filter((c: any) => c.enabled).length,
    slash: commands.filter((c: any) => c.type === 'SLASH').length,
    usage: commands.reduce((sum: number, c: any) => sum + (c.usageCount || 0), 0),
  }

  const handleCreateCommand = async () => {
    try {
      // await createCommandMutation.mutateAsync(newCommand)
      toast.success('Command created successfully')
      setShowCreateModal(false)
      setNewCommand({
        name: '',
        description: '',
        type: 'SLASH',
        category: 'UTILITY',
        enabled: true,
        permissions: [],
        cooldown: 0,
        code: ''
      })
      refetch()
    } catch (error) {
      toast.error('Failed to create command')
    }
  }

  // Prepare data for table
  const tableData = commands.map((command: any) => ({
    ...command,
    typeConfig: typeConfig[command.type as keyof typeof typeConfig],
    categoryConfig: categoryConfig[command.category as keyof typeof categoryConfig],
  }))

  const columns = [
    {
      key: 'name',
      label: 'Command',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", row.typeConfig?.color.replace('text-', 'bg-') + '/10')}>
            {row.typeConfig?.icon && <row.typeConfig.icon className={cn("h-4 w-4", row.typeConfig.color)} />}
          </div>
          <div>
            <div className="font-medium font-mono">/{value}</div>
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
      width: '120px'
    },
    {
      key: 'category',
      label: 'Category',
      filterable: true,
      render: (value: any, row: any) => {
        const config = row.categoryConfig
        return (
          <Badge variant="outline" className={cn("border-0 text-xs", config?.color.replace('text-', 'bg-') + '/10', config?.color)}>
            {config?.icon && <config.icon className="w-3 h-3 mr-1" />}
            {config?.label}
          </Badge>
        )
      },
      width: '120px'
    },
    {
      key: 'enabled',
      label: 'Status',
      filterable: true,
      render: (value: any) => (
        <Badge variant="outline" className={cn(
          "border-0 text-xs",
          value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
        )}>
          {value ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'usageCount',
      label: 'Usage',
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{value?.toLocaleString() || 0}</span>
        </div>
      ),
      width: '100px'
    },
    {
      key: 'cooldown',
      label: 'Cooldown',
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{value || 0}s</span>
        </div>
      ),
      width: '100px'
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (value: any) => (
        <div className="flex flex-wrap gap-1">
          {value?.length > 0 ? (
            value.slice(0, 2).map((perm: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs border-0 bg-amber-500/10 text-amber-500">
                {perm}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs border-0 bg-muted text-muted-foreground">
              Everyone
            </Badge>
          )}
          {value?.length > 2 && (
            <Badge variant="outline" className="text-xs border-0 bg-muted text-muted-foreground">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      ),
      width: '150px'
    }
  ]

  const actions = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (row: any) => {
        setSelectedCommand(row)
        setShowCommandModal(true)
      }
    },
    {
      label: 'Edit Command',
      icon: Edit,
      onClick: (row: any) => {
        toast.info(`Edit command /${row.name}`)
      }
    },
    {
      label: 'Test Command',
      icon: Play,
      onClick: (row: any) => {
        toast.info(`Testing command /${row.name}`)
      }
    },
    {
      label: 'Toggle Status',
      icon: row => row.enabled ? Pause : Play,
      onClick: (row: any) => {
        toast.info(`${row.enabled ? 'Disabled' : 'Enabled'} command /${row.name}`)
      }
    },
    {
      label: 'Delete Command',
      icon: Trash2,
      onClick: (row: any) => {
        toast.info(`Delete command /${row.name}`)
      },
      variant: 'destructive' as const
    }
  ]

  const bulkActions = [
    {
      label: 'Enable Selected',
      icon: Play,
      onClick: (rows: any[]) => {
        toast.info(`Enable ${rows.length} commands`)
      }
    },
    {
      label: 'Disable Selected',
      icon: Pause,
      onClick: (rows: any[]) => {
        toast.info(`Disable ${rows.length} commands`)
      }
    },
    {
      label: 'Delete Selected',
      icon: Trash2,
      onClick: (rows: any[]) => {
        toast.info(`Delete ${rows.length} commands`)
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Commands", value: stats.total.toString(), icon: Terminal, color: "text-blue-500" },
          { label: "Enabled", value: stats.enabled.toString(), icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Slash Commands", value: stats.slash.toString(), icon: Hash, color: "text-purple-500" },
          { label: "Total Usage", value: stats.usage.toLocaleString(), icon: BarChart3, color: "text-orange-500" },
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

      {/* Commands Table */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        title="Bot Commands"
        description={`Manage ${tableData.length} bot commands`}
        loading={isLoading}
        searchable={true}
        filterable={true}
        selectable={true}
        exportable={true}
        pagination={true}
        pageSize={25}
        onRowClick={(row) => {
          setSelectedCommand(row)
          setShowCommandModal(true)
        }}
        onRefresh={refetch}
        actions={actions}
        bulkActions={bulkActions}
      />

      {/* Create Command Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create New Command</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>

            <div className="mt-4 h-[60vh] overflow-y-auto">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Command Name</Label>
                    <Input
                      id="name"
                      value={newCommand.name}
                      onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="mycommand"
                      className="mt-1 font-mono"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cooldown">Cooldown (seconds)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      min="0"
                      value={newCommand.cooldown}
                      onChange={(e) => setNewCommand(prev => ({ ...prev, cooldown: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCommand.description}
                    onChange={(e) => setNewCommand(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this command do?"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Command Type</Label>
                    <Select value={newCommand.type} onValueChange={(value) => setNewCommand(prev => ({ ...prev, type: value }))}>
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
                    <Label>Category</Label>
                    <Select value={newCommand.category} onValueChange={(value) => setNewCommand(prev => ({ ...prev, category: value }))}>
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
                    <Label>Status</Label>
                    <div className="flex items-center space-x-2 mt-3">
                      <Switch
                        checked={newCommand.enabled}
                        onCheckedChange={(checked) => setNewCommand(prev => ({ ...prev, enabled: checked }))}
                      />
                      <Label className="text-sm">
                        {newCommand.enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Permission management coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="code" className="space-y-4">
                <div>
                  <Label htmlFor="code">Command Code</Label>
                  <Textarea
                    id="code"
                    value={newCommand.code}
                    onChange={(e) => setNewCommand(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="// Write your command code here..."
                    className="mt-1 min-h-96 font-mono text-sm"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleCreateCommand}
              disabled={!newCommand.name || !newCommand.description}
            >
              <Save className="w-4 h-4 mr-2" />
              Create Command
            </Button>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Command Details Modal */}
      {selectedCommand && (
        <Dialog open={showCommandModal} onOpenChange={setShowCommandModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", selectedCommand.typeConfig?.color.replace('text-', 'bg-') + '/10')}>
                  {selectedCommand.typeConfig?.icon && <selectedCommand.typeConfig.icon className={cn("h-5 w-5", selectedCommand.typeConfig.color)} />}
                </div>
                <div>
                  <DialogTitle className="font-mono">/{selectedCommand.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedCommand.description}</p>
                </div>
                <div className="flex gap-2 ml-auto">
                  <Badge variant="outline" className={cn("border-0 text-xs", selectedCommand.categoryConfig?.color.replace('text-', 'bg-') + '/10', selectedCommand.categoryConfig?.color)}>
                    {selectedCommand.categoryConfig?.label}
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "border-0 text-xs",
                    selectedCommand.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                  )}>
                    {selectedCommand.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="usage">Usage Stats</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
              </TabsList>

              <div className="mt-4 h-[60vh] overflow-y-auto">
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-xs text-muted-foreground">Command Details</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Type</span>
                          <Badge variant="outline" className={cn("border-0 text-xs", selectedCommand.typeConfig?.color.replace('text-', 'bg-') + '/10', selectedCommand.typeConfig?.color)}>
                            {selectedCommand.typeConfig?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Category</span>
                          <Badge variant="outline" className={cn("border-0 text-xs", selectedCommand.categoryConfig?.color.replace('text-', 'bg-') + '/10', selectedCommand.categoryConfig?.color)}>
                            {selectedCommand.categoryConfig?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Cooldown</span>
                          <span className="text-sm font-medium">{selectedCommand.cooldown || 0}s</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Usage Statistics</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Uses</span>
                          <span className="text-sm font-medium">{selectedCommand.usageCount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Success Rate</span>
                          <span className="text-sm font-medium">{selectedCommand.successRate || 100}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Last Used</span>
                          <span className="text-sm font-medium">
                            {selectedCommand.lastUsed ? new Date(selectedCommand.lastUsed).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Permissions</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCommand.permissions?.length > 0 ? (
                        selectedCommand.permissions.map((perm: string, index: number) => (
                          <Badge key={index} variant="outline" className="border-0 bg-amber-500/10 text-amber-500">
                            {perm}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="border-0 bg-muted text-muted-foreground">
                          Everyone can use this command
                        </Badge>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="usage" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Usage analytics coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="permissions" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Permission management coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Command Source Code</Label>
                    <div className="mt-2 p-4 rounded-lg border bg-secondary/20">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {selectedCommand.code || '// No code available'}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Command
              </Button>
              <Button variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Test Command
              </Button>
              <Button variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Logs
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function CommandsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CommandsPageContent />
    </Suspense>
  )
}