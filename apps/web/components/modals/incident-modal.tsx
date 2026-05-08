"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  User,
  Clock,
  MessageSquare,
  Shield,
  Ban,
  Eye,
  FileText,
  Calendar,
  Tag,
  Flag,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Download,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateIncident, useApproveIncident, useRejectIncident } from '@/lib/hooks/use-api'
import { toast } from 'sonner'

interface IncidentModalProps {
  incident: any
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
  mode?: 'view' | 'edit' | 'create'
}

const severityConfig = {
  LOW: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  CRITICAL: { color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
}

const statusConfig = {
  PENDING: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending" },
  OPEN: { color: "text-red-500", bg: "bg-red-500/10", label: "Open" },
  IN_PROGRESS: { color: "text-blue-500", bg: "bg-blue-500/10", label: "In Progress" },
  RESOLVED: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Resolved" },
  CLOSED: { color: "text-muted-foreground", bg: "bg-muted", label: "Closed" },
}

const typeConfig = {
  SPAM: { icon: MessageSquare, color: "text-blue-500", label: "Spam" },
  HARASSMENT: { icon: AlertTriangle, color: "text-red-500", label: "Harassment" },
  NSFW: { icon: Eye, color: "text-purple-500", label: "NSFW" },
  RAID: { icon: Shield, color: "text-orange-500", label: "Raid" },
  SCAM: { icon: Ban, color: "text-amber-500", label: "Scam" },
  OTHER: { icon: Flag, color: "text-muted-foreground", label: "Other" },
}

export function IncidentModal({ incident, isOpen, onClose, onUpdate, mode = 'view' }: IncidentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    severity: '',
    status: '',
    evidence: '',
    notes: '',
  })
  
  const [activeTab, setActiveTab] = useState('details')
  const updateIncidentMutation = useUpdateIncident()
  const approveIncidentMutation = useApproveIncident()
  const rejectIncidentMutation = useRejectIncident()

  useEffect(() => {
    if (incident) {
      setFormData({
        title: incident.title || '',
        description: incident.description || '',
        type: incident.type || '',
        severity: incident.severity || '',
        status: incident.status || '',
        evidence: incident.evidence || '',
        notes: incident.notes || '',
      })
    }
  }, [incident])

  const handleSave = async () => {
    try {
      await updateIncidentMutation.mutateAsync({
        id: incident.id,
        data: formData
      })
      toast.success('Incident updated successfully')
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to update incident')
    }
  }

  const handleApprove = async () => {
    try {
      await approveIncidentMutation.mutateAsync(incident.id)
      toast.success('Incident approved')
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to approve incident')
    }
  }

  const handleReject = async () => {
    try {
      await rejectIncidentMutation.mutateAsync(incident.id)
      toast.success('Incident rejected')
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to reject incident')
    }
  }

  if (!incident) return null

  const severity = severityConfig[incident.severity as keyof typeof severityConfig]
  const status = statusConfig[incident.status as keyof typeof statusConfig]
  const type = typeConfig[incident.type as keyof typeof typeConfig]
  const TypeIcon = type?.icon || Flag

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", severity?.bg)}>
                <TypeIcon className={cn("h-5 w-5", type?.color)} />
              </div>
              <div>
                <DialogTitle className="text-xl">{incident.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("border-0 text-xs", severity?.bg, severity?.color)}>
                    {severity?.label}
                  </Badge>
                  <Badge variant="outline" className={cn("border-0 text-xs", status?.bg, status?.color)}>
                    {status?.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-secondary">
                    {type?.label}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {mode === 'view' && (
                <>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {incident.status === 'PENDING' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleApprove}
                        disabled={approveIncidentMutation.isPending}
                        className="text-emerald-600 hover:text-emerald-600"
                      >
                        {approveIncidentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleReject}
                        disabled={rejectIncidentMutation.isPending}
                        className="text-red-600 hover:text-red-600"
                      >
                        {rejectIncidentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </>
                  )}
                </>
              )}
              
              {mode === 'edit' && (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={updateIncidentMutation.isPending}
                    size="sm"
                  >
                    {updateIncidentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button variant="outline" onClick={onClose} size="sm">
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="details" className="space-y-6">
              {/* User Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  User Information
                </h3>
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-secondary/20">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={incident.targetUser?.avatar} />
                    <AvatarFallback>
                      {incident.targetUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{incident.targetUser?.username || 'Unknown User'}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {incident.targetUserId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Joined: {incident.targetUser?.joinedAt ? new Date(incident.targetUser.joinedAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Incident Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Incident Details
                </h3>
                
                {mode === 'edit' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 min-h-24"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
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
                        <Label>Severity</Label>
                        <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(severityConfig).map(([key, config]) => (
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
                      
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="mt-1">{incident.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-xs text-muted-foreground">Reported By</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{incident.reportedBy?.username || 'System'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Created</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(incident.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Evidence & Attachments
                </h3>
                
                {mode === 'edit' ? (
                  <div>
                    <Label htmlFor="evidence">Evidence</Label>
                    <Textarea
                      id="evidence"
                      value={formData.evidence}
                      onChange={(e) => setFormData(prev => ({ ...prev, evidence: e.target.value }))}
                      className="mt-1 min-h-32"
                      placeholder="Message IDs, screenshot descriptions, links, or other evidence..."
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incident.evidence ? (
                      <div className="p-4 rounded-lg border bg-secondary/20">
                        <pre className="whitespace-pre-wrap text-sm">{incident.evidence}</pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No evidence provided</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Quick Actions</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Message Link
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Evidence
                    </Button>
                    <Button variant="outline" size="sm">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Add Screenshot
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Activity Timeline
                </h3>
                
                <div className="space-y-3">
                  {[
                    { time: incident.createdAt, action: 'Incident reported', user: incident.reportedBy?.username || 'System', type: 'create' },
                    { time: incident.updatedAt, action: 'Status updated', user: 'Moderator', type: 'update' },
                  ].map((event, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-secondary/20">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                        event.type === 'create' && "bg-blue-500/10 text-blue-500",
                        event.type === 'update' && "bg-amber-500/10 text-amber-500"
                      )}>
                        {event.type === 'create' && <Plus className="w-4 h-4" />}
                        {event.type === 'update' && <Edit className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{event.action}</div>
                        <div className="text-xs text-muted-foreground">
                          by {event.user} • {new Date(event.time).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Available Actions
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto p-4 justify-start">
                    <Ban className="w-5 h-5 mr-3 text-red-500" />
                    <div className="text-left">
                      <div className="font-medium">Timeout User</div>
                      <div className="text-xs text-muted-foreground">Temporarily restrict user</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 justify-start">
                    <Trash2 className="w-5 h-5 mr-3 text-red-500" />
                    <div className="text-left">
                      <div className="font-medium">Delete Messages</div>
                      <div className="text-xs text-muted-foreground">Remove offending content</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 justify-start">
                    <Shield className="w-5 h-5 mr-3 text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium">Add Role</div>
                      <div className="text-xs text-muted-foreground">Assign moderation role</div>
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
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}