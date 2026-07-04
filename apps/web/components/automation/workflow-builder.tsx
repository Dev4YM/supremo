"use client"

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Trash2,
  Settings,
  Play,
  Pause,
  ArrowRight,
  ArrowDown,
  Zap,
  MessageSquare,
  UserPlus,
  Shield,
  AlertTriangle,
  Clock,
  Hash,
  Users,
  Bot,
  GitBranch,
  Filter,
  Target,
  Code,
  Webhook,
  Database,
  Mail,
  Bell,
  Eye,
  Lock,
  Unlock,
  RotateCcw,
  Save,
  Copy,
  Edit3,
  ChevronRight,
  ChevronDown,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'condition' | 'action' | 'delay'
  subtype?: string
  name: string
  description?: string
  config: Record<string, any>
  position: { x: number; y: number }
  connections: string[]
}

interface WorkflowBuilderProps {
  initialWorkflow?: {
    name: string
    description: string
    nodes: WorkflowNode[]
  }
  onSave: (workflow: any) => void
  onCancel: () => void
}

const triggerTypes = [
  { 
    id: 'member_join', 
    name: 'Member Join', 
    icon: UserPlus, 
    color: 'text-emerald-500',
    description: 'Triggered when a new member joins the server',
    config: {
      channel: { type: 'channel', label: 'Welcome Channel', required: false },
      role_filter: { type: 'multiselect', label: 'Required Roles', options: [], required: false }
    }
  },
  { 
    id: 'message_sent', 
    name: 'Message Sent', 
    icon: MessageSquare, 
    color: 'text-blue-500',
    description: 'Triggered when a message is sent in specified channels',
    config: {
      channels: { type: 'multiselect', label: 'Channels', required: true },
      content_filter: { type: 'text', label: 'Content Filter (regex)', required: false },
      user_filter: { type: 'multiselect', label: 'User Filter', required: false }
    }
  },
  { 
    id: 'reaction_add', 
    name: 'Reaction Added', 
    icon: Plus, 
    color: 'text-purple-500',
    description: 'Triggered when a reaction is added to a message',
    config: {
      emoji: { type: 'text', label: 'Emoji', required: true },
      channel: { type: 'channel', label: 'Channel', required: false },
      message_id: { type: 'text', label: 'Specific Message ID', required: false }
    }
  },
  { 
    id: 'scheduled', 
    name: 'Scheduled', 
    icon: Clock, 
    color: 'text-amber-500',
    description: 'Triggered at specific times or intervals',
    config: {
      schedule_type: { type: 'select', label: 'Schedule Type', options: ['interval', 'cron', 'once'], required: true },
      schedule_value: { type: 'text', label: 'Schedule Value', required: true },
      timezone: { type: 'select', label: 'Timezone', options: ['UTC', 'America/New_York', 'Europe/London'], required: true }
    }
  },
  { 
    id: 'button_click', 
    name: 'Button Clicked', 
    icon: Target, 
    color: 'text-orange-500',
    description: 'Triggered when a button is clicked',
    config: {
      button_id: { type: 'text', label: 'Button ID', required: true },
      message_id: { type: 'text', label: 'Message ID', required: false }
    }
  },
]

const actionTypes = [
  {
    id: 'send_message',
    name: 'Send Message',
    icon: MessageSquare,
    color: 'text-blue-500',
    description: 'Send a message to a channel',
    config: {
      channel: { type: 'channel', label: 'Channel', required: true },
      content: { type: 'textarea', label: 'Message Content', required: true },
      embed: { type: 'json', label: 'Embed JSON', required: false },
      reply_to_trigger: { type: 'boolean', label: 'Reply to Trigger Message', required: false }
    }
  },
  {
    id: 'add_role',
    name: 'Add Role',
    icon: UserPlus,
    color: 'text-emerald-500',
    description: 'Add a role to the user',
    config: {
      role: { type: 'role', label: 'Role', required: true },
      target: { type: 'select', label: 'Target', options: ['trigger_user', 'mentioned_user', 'specific_user'], required: true },
      reason: { type: 'text', label: 'Reason', required: false }
    }
  },
  {
    id: 'remove_role',
    name: 'Remove Role',
    icon: UserPlus,
    color: 'text-red-500',
    description: 'Remove a role from the user',
    config: {
      role: { type: 'role', label: 'Role', required: true },
      target: { type: 'select', label: 'Target', options: ['trigger_user', 'mentioned_user', 'specific_user'], required: true },
      reason: { type: 'text', label: 'Reason', required: false }
    }
  },
  {
    id: 'timeout_user',
    name: 'Timeout User',
    icon: AlertTriangle,
    color: 'text-amber-500',
    description: 'Timeout a user for specified duration',
    config: {
      target: { type: 'select', label: 'Target', options: ['trigger_user', 'mentioned_user'], required: true },
      duration: { type: 'number', label: 'Duration (minutes)', required: true },
      reason: { type: 'text', label: 'Reason', required: false }
    }
  },
  {
    id: 'delete_message',
    name: 'Delete Message',
    icon: Trash2,
    color: 'text-red-500',
    description: 'Delete the trigger message or specified message',
    config: {
      target: { type: 'select', label: 'Target', options: ['trigger_message', 'specific_message'], required: true },
      message_id: { type: 'text', label: 'Message ID', required: false }
    }
  },
  {
    id: 'create_channel',
    name: 'Create Channel',
    icon: Hash,
    color: 'text-purple-500',
    description: 'Create a new channel',
    config: {
      name: { type: 'text', label: 'Channel Name', required: true },
      type: { type: 'select', label: 'Channel Type', options: ['text', 'voice', 'category'], required: true },
      category: { type: 'category', label: 'Parent Category', required: false },
      permissions: { type: 'json', label: 'Permissions JSON', required: false }
    }
  },
  {
    id: 'wait',
    name: 'Delay',
    icon: Clock,
    color: 'text-gray-500',
    description: 'Wait for specified duration before continuing',
    config: {
      duration: { type: 'number', label: 'Duration (seconds)', required: true },
      unit: { type: 'select', label: 'Unit', options: ['seconds', 'minutes', 'hours'], required: true }
    }
  }
]

const conditionTypes = [
  {
    id: 'user_has_role',
    name: 'User Has Role',
    icon: Shield,
    color: 'text-blue-500',
    description: 'Check if user has specific role',
    config: {
      role: { type: 'role', label: 'Role', required: true },
      target: { type: 'select', label: 'Target', options: ['trigger_user', 'mentioned_user'], required: true }
    }
  },
  {
    id: 'message_contains',
    name: 'Message Contains',
    icon: MessageSquare,
    color: 'text-green-500',
    description: 'Check if message contains specific text',
    config: {
      text: { type: 'text', label: 'Text to Match', required: true },
      case_sensitive: { type: 'boolean', label: 'Case Sensitive', required: false }
    }
  },
  {
    id: 'user_joined_recently',
    name: 'User Joined Recently',
    icon: Clock,
    color: 'text-purple-500',
    description: 'Check if user joined within timeframe',
    config: {
      timeframe: { type: 'number', label: 'Timeframe (days)', required: true },
      target: { type: 'select', label: 'Target', options: ['trigger_user', 'mentioned_user'], required: true }
    }
  }
]

export function WorkflowBuilder({ initialWorkflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState({
    name: initialWorkflow?.name || '',
    description: initialWorkflow?.description || '',
    nodes: initialWorkflow?.nodes || []
  })
  
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [showNodeConfig, setShowNodeConfig] = useState(false)

  const addNode = useCallback((type: 'trigger' | 'condition' | 'action' | 'delay', nodeType: any) => {
    const newNode: WorkflowNode = {
      id: `${nodeType.id}_${Date.now()}`,
      type,
      subtype: nodeType.id,
      name: nodeType.name,
      description: nodeType.description,
      config: {},
      position: { x: 0, y: workflow.nodes.length * 120 },
      connections: []
    }
    
    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }))
  }, [workflow.nodes.length])

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }))
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId)
    }))
  }, [])

  const NodeConfigForm = ({ node, nodeType }: { node: WorkflowNode, nodeType: any }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-name">Node Name</Label>
        <Input
          id="node-name"
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
          className="mt-1"
        />
      </div>
      
      {nodeType.config && Object.entries(nodeType.config).map(([key, config]: [string, any]) => (
        <div key={key}>
          <Label htmlFor={`config-${key}`}>
            {config.label}
            {config.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          
          {config.type === 'text' && (
            <Input
              id={`config-${key}`}
              value={node.config[key] || ''}
              onChange={(e) => updateNode(node.id, { 
                config: { ...node.config, [key]: e.target.value }
              })}
              className="mt-1"
              placeholder={config.placeholder}
            />
          )}
          
          {config.type === 'textarea' && (
            <Textarea
              id={`config-${key}`}
              value={node.config[key] || ''}
              onChange={(e) => updateNode(node.id, { 
                config: { ...node.config, [key]: e.target.value }
              })}
              className="mt-1"
              placeholder={config.placeholder}
            />
          )}
          
          {config.type === 'number' && (
            <Input
              id={`config-${key}`}
              type="number"
              value={node.config[key] || ''}
              onChange={(e) => updateNode(node.id, { 
                config: { ...node.config, [key]: parseInt(e.target.value) }
              })}
              className="mt-1"
            />
          )}
          
          {config.type === 'select' && (
            <Select
              value={node.config[key] || ''}
              onValueChange={(value) => updateNode(node.id, { 
                config: { ...node.config, [key]: value }
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={`Select ${config.label}`} />
              </SelectTrigger>
              <SelectContent>
                {config.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {config.type === 'boolean' && (
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="checkbox"
                id={`config-${key}`}
                checked={node.config[key] || false}
                onChange={(e) => updateNode(node.id, { 
                  config: { ...node.config, [key]: e.target.checked }
                })}
                className="rounded"
              />
              <Label htmlFor={`config-${key}`} className="text-sm">
                {config.label}
              </Label>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold">Workflow Builder</h2>
          <p className="text-muted-foreground">Design your automation workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(workflow)}>
            <Save className="w-4 h-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/20">
          <Tabs defaultValue="nodes" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="nodes" className="h-full p-4 space-y-4">
              <ScrollArea className="h-full">
                {/* Triggers */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Triggers
                  </h3>
                  {triggerTypes.map((trigger) => (
                    <Button
                      key={trigger.id}
                      variant="outline"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => addNode('trigger', trigger)}
                    >
                      <trigger.icon className={cn("w-4 h-4 mr-3", trigger.color)} />
                      <div className="text-left">
                        <div className="font-medium">{trigger.name}</div>
                        <div className="text-xs text-muted-foreground">{trigger.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Conditions */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Conditions
                  </h3>
                  {conditionTypes.map((condition) => (
                    <Button
                      key={condition.id}
                      variant="outline"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => addNode('condition', condition)}
                    >
                      <condition.icon className={cn("w-4 h-4 mr-3", condition.color)} />
                      <div className="text-left">
                        <div className="font-medium">{condition.name}</div>
                        <div className="text-xs text-muted-foreground">{condition.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Actions */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Actions
                  </h3>
                  {actionTypes.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => addNode('action', action)}
                    >
                      <action.icon className={cn("w-4 h-4 mr-3", action.color)} />
                      <div className="text-left">
                        <div className="font-medium">{action.name}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="settings" className="p-4 space-y-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={workflow.name}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                  placeholder="Enter workflow name"
                />
              </div>
              
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflow.description}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  placeholder="Describe what this workflow does"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-grid-pattern">
          <div className="absolute inset-0 p-6">
            {workflow.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
                  <p className="text-muted-foreground mb-4">
                    Add triggers, conditions, and actions from the sidebar to create your automation
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Drag and drop nodes to get started
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {workflow.nodes.map((node, index) => {
                  const nodeType = [...triggerTypes, ...conditionTypes, ...actionTypes].find(
                    t => t.id === node.subtype || t.name === node.name
                  )
                  
                  return (
                    <div key={node.id} className="flex items-center gap-4">
                      <Card 
                        className={cn(
                          "w-80 cursor-pointer transition-all hover:shadow-lg",
                          selectedNode?.id === node.id && "ring-2 ring-primary"
                        )}
                        onClick={() => {
                          setSelectedNode(node)
                          setShowNodeConfig(true)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              node.type === 'trigger' && "bg-emerald-500/10",
                              node.type === 'condition' && "bg-blue-500/10", 
                              node.type === 'action' && "bg-purple-500/10"
                            )}>
                              {nodeType?.icon && (
                                <nodeType.icon className={cn("w-5 h-5", nodeType.color)} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{node.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {node.description || `${node.type} node`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedNode(node)
                                  setShowNodeConfig(true)
                                }}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNode(node.id)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {index < workflow.nodes.length - 1 && (
                        <ArrowDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={showNodeConfig} onOpenChange={setShowNodeConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {selectedNode?.name}</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <NodeConfigForm 
              node={selectedNode} 
              nodeType={[...triggerTypes, ...conditionTypes, ...actionTypes].find(
                t => t.name === selectedNode.name
              )}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}