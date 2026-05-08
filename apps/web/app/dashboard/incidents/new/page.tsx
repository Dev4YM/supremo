"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  AlertTriangle, 
  User, 
  FileText, 
  Send,
  ArrowLeft,
  Shield,
  Ban,
  MessageSquare,
  Eye,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useCreateIncident } from "@/lib/hooks/use-api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const incidentTypes = [
  { value: "SPAM", label: "Spam", icon: MessageSquare, color: "text-blue-500" },
  { value: "HARASSMENT", label: "Harassment", icon: AlertTriangle, color: "text-red-500" },
  { value: "NSFW", label: "NSFW Content", icon: Eye, color: "text-purple-500" },
  { value: "RAID", label: "Raid Attempt", icon: Shield, color: "text-orange-500" },
  { value: "SCAM", label: "Scam/Phishing", icon: Ban, color: "text-amber-500" },
  { value: "OTHER", label: "Other", icon: AlertTriangle, color: "text-muted-foreground" },
]

const severityLevels = [
  { value: "LOW", label: "Low", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "HIGH", label: "High", color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "CRITICAL", label: "Critical", color: "text-red-500", bg: "bg-red-500/10" },
]

export default function NewIncidentPage() {
  const router = useRouter()
  const createIncidentMutation = useCreateIncident()
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    severity: "",
    targetUserId: "",
    evidence: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createIncidentMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        severity: formData.severity,
        targetUserId: formData.targetUserId,
        evidence: formData.evidence || undefined,
      })
      
      toast.success('Incident reported successfully')
      router.push('/dashboard/incidents')
    } catch (error) {
      toast.error('Failed to create incident report')
    }
  }

  const selectedType = incidentTypes.find(type => type.value === formData.type)
  const selectedSeverity = severityLevels.find(level => level.value === formData.severity)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="border-border/50 bg-transparent">
          <Link href="/dashboard/incidents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Report New Incident</h1>
          <p className="text-muted-foreground">
            Create a detailed report for moderation review
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Incident Details</CardTitle>
                  <p className="text-xs text-muted-foreground">Provide comprehensive information about the incident</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Incident Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the incident"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="border-border/50 bg-secondary/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetUserId">Target User ID *</Label>
                    <Input
                      id="targetUserId"
                      placeholder="Discord User ID"
                      value={formData.targetUserId}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetUserId: e.target.value }))}
                      className="border-border/50 bg-secondary/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Incident Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="border-border/50 bg-secondary/50">
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={cn("h-4 w-4", type.color)} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity Level *</Label>
                    <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
                      <SelectTrigger className="border-border/50 bg-secondary/50">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {severityLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("h-2 w-2 rounded-full", level.bg)} />
                              {level.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide a detailed description of what happened, including context and any relevant information..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-32 border-border/50 bg-secondary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence">Evidence (Optional)</Label>
                  <Textarea
                    id="evidence"
                    placeholder="Message IDs, screenshots descriptions, or other evidence..."
                    value={formData.evidence}
                    onChange={(e) => setFormData(prev => ({ ...prev, evidence: e.target.value }))}
                    className="min-h-24 border-border/50 bg-secondary/50"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="gap-2" 
                    disabled={createIncidentMutation.isPending}
                  >
                    {createIncidentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Report
                  </Button>
                  <Button type="button" variant="outline" asChild className="border-border/50 bg-transparent">
                    <Link href="/dashboard/incidents">
                      Cancel
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Report Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="text-sm font-medium">{formData.title || "No title provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target User</p>
                  <p className="text-sm font-medium">{formData.targetUserId || "No user specified"}</p>
                </div>
                <div className="flex gap-2">
                  {selectedType && (
                    <Badge variant="outline" className={cn("border-0 text-[10px]", "bg-secondary")}>
                      {selectedType.label}
                    </Badge>
                  )}
                  {selectedSeverity && (
                    <Badge variant="outline" className={cn("border-0 text-[10px]", selectedSeverity.bg, selectedSeverity.color)}>
                      {selectedSeverity.label}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Reporting Guidelines</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Be Specific</p>
                  <p>Provide clear details about what happened and when.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Include Evidence</p>
                  <p>Message IDs, screenshots, or other proof help moderators.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Choose Correct Severity</p>
                  <p>Critical: Immediate danger, High: Serious violations, Medium: Rule breaking, Low: Minor issues.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}