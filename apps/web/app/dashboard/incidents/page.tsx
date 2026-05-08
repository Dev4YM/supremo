"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  AlertTriangle,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Shield,
  Ban,
  MessageSquare,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useIncidents, useUpdateIncident, useApproveIncident, useRejectIncident } from "@/lib/hooks/use-api"
import { toast } from "sonner"
import Link from "next/link"
import { IncidentModal } from "@/components/modals/incident-modal"

// Mock incident data
const mockIncidents = [
  { 
    id: "1", 
    title: "Spam in #general", 
    description: "User posting repeated promotional content",
    type: "spam", 
    severity: "medium", 
    status: "open", 
    reporter: "ModHelper", 
    reportedUser: "SpamBot123",
    createdAt: "2 hours ago",
    avatar: "S"
  },
  { 
    id: "2", 
    title: "Harassment Report", 
    description: "Targeted harassment towards multiple members",
    type: "harassment", 
    severity: "high", 
    status: "in_progress", 
    reporter: "SafetyFirst", 
    reportedUser: "ToxicUser99",
    createdAt: "4 hours ago",
    avatar: "H"
  },
  { 
    id: "3", 
    title: "NSFW Content Shared", 
    description: "Inappropriate images shared in public channel",
    type: "nsfw", 
    severity: "high", 
    status: "resolved", 
    reporter: "QuickMod", 
    reportedUser: "BadActor456",
    createdAt: "1 day ago",
    avatar: "N"
  },
  { 
    id: "4", 
    title: "Raid Attempt", 
    description: "Coordinated spam attack by multiple new accounts",
    type: "raid", 
    severity: "critical", 
    status: "resolved", 
    reporter: "AlertMod", 
    reportedUser: "Multiple Users",
    createdAt: "2 days ago",
    avatar: "R"
  },
  { 
    id: "5", 
    title: "Scam Link Detected", 
    description: "Phishing link disguised as Discord Nitro giveaway",
    type: "scam", 
    severity: "medium", 
    status: "closed", 
    reporter: "ScamHunter", 
    reportedUser: "FakeGiveaway",
    createdAt: "3 days ago",
    avatar: "S"
  },
]

const severityConfig = {
  low: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  critical: { color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
}

const statusConfig = {
  open: { color: "text-red-500", bg: "bg-red-500/10", label: "Open" },
  in_progress: { color: "text-amber-500", bg: "bg-amber-500/10", label: "In Progress" },
  resolved: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Resolved" },
  closed: { color: "text-muted-foreground", bg: "bg-muted", label: "Closed" },
}

const typeConfig = {
  spam: { icon: MessageSquare, color: "text-blue-500" },
  harassment: { icon: AlertTriangle, color: "text-red-500" },
  nsfw: { icon: Eye, color: "text-purple-500" },
  raid: { icon: Shield, color: "text-orange-500" },
  scam: { icon: Ban, color: "text-amber-500" },
  other: { icon: AlertTriangle, color: "text-muted-foreground" },
}

const Loading = () => null;

export default function IncidentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const searchParams = useSearchParams()

  // Fetch incidents from backend
  const { data: incidents = [], isLoading, error, refetch } = useIncidents();
  const updateIncidentMutation = useUpdateIncident();
  const approveIncidentMutation = useApproveIncident();
  const rejectIncidentMutation = useRejectIncident();

  const filteredIncidents = incidents.filter((incident: any) => {
    const matchesSearch = incident.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter
    const matchesType = typeFilter === "all" || incident.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Calculate stats from real data
  const stats = {
    total: incidents.length,
    open: incidents.filter((i: any) => i.status === 'PENDING' || i.status === 'OPEN').length,
    resolved: incidents.filter((i: any) => i.status === 'RESOLVED').length,
    critical: incidents.filter((i: any) => i.severity === 'CRITICAL').length,
  }

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await updateIncidentMutation.mutateAsync({
        id: incidentId,
        data: { status: 'RESOLVED' }
      });
      toast.success('Incident resolved successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to resolve incident');
    }
  }

  const handleApproveIncident = async (incidentId: string) => {
    try {
      await approveIncidentMutation.mutateAsync(incidentId);
      toast.success('Incident approved successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to approve incident');
    }
  }

  const handleRejectIncident = async (incidentId: string) => {
    try {
      await rejectIncidentMutation.mutateAsync(incidentId);
      toast.success('Incident rejected successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to reject incident');
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Incidents", value: stats.total.toString(), icon: AlertTriangle, color: "text-red-500" },
            { label: "Open Cases", value: stats.open.toString(), icon: Clock, color: "text-amber-500" },
            { label: "Resolved", value: stats.resolved.toString(), icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Critical", value: stats.critical.toString(), icon: Shield, color: "text-red-500" },
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

        {/* Incidents List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Incident Reports</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {filteredIncidents.length} incidents found
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search incidents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full border-border/50 bg-secondary/50 pl-9 sm:w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[130px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[130px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="SPAM">Spam</SelectItem>
                    <SelectItem value="HARASSMENT">Harassment</SelectItem>
                    <SelectItem value="NSFW">NSFW</SelectItem>
                    <SelectItem value="RAID">Raid</SelectItem>
                    <SelectItem value="SCAM">Scam</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => refetch()} 
                  disabled={isLoading}
                  className="h-9 gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  Refresh
                </Button>
                <Link href="/dashboard/incidents/new">
                  <Button size="sm" className="h-9 gap-2">
                    <Plus className="h-4 w-4" />
                    Report
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-border/50 p-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-full max-w-md" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load incidents</h3>
                <p className="text-muted-foreground mb-4">
                  There was an error loading incidents. Please try again.
                </p>
                <Button onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
            <div className="space-y-2">
              {filteredIncidents.map((incident: any) => {
                const severity = severityConfig[incident.severity?.toLowerCase() as keyof typeof severityConfig] || severityConfig.medium
                const status = statusConfig[incident.status?.toLowerCase() as keyof typeof statusConfig] || statusConfig.open
                const type = typeConfig[incident.type?.toLowerCase() as keyof typeof typeConfig] || typeConfig.other
                const TypeIcon = type.icon
                
                return (
                  <div
                    key={incident.id}
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-lg",
                      incident.severity === "critical" ? "border-red-500/30 bg-red-500/5" :
                      incident.severity === "high" ? "border-orange-500/30 bg-orange-500/5" :
                      "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                    )}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", severity.bg)}>
                      <TypeIcon className={cn("h-5 w-5", type.color)} />
                    </div>
                    
                    <div className="flex flex-1 items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{incident.title}</span>
                          <Badge variant="outline" className={cn("border-0 text-[10px] font-semibold", severity.bg, severity.color)}>
                            {severity.label}
                          </Badge>
                          <Badge variant="outline" className={cn("border-0 text-[10px]", status.bg, status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{incident.description}</p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Reported by {incident.reportedBy?.username || 'System'}</span>
                          <span>•</span>
                          <span>Target: {incident.targetUser?.username || incident.targetUserId || 'Unknown'}</span>
                          <span>•</span>
                          <span>{incident.createdAt ? new Date(incident.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={incident.targetUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${incident.targetUserId}`} />
                        <AvatarFallback className="text-xs">
                          {incident.targetUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => {
                              setSelectedIncident(incident)
                              setShowIncidentModal(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <User className="h-4 w-4" />
                            View User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(incident.status === "PENDING" || incident.status === "OPEN") && (
                            <>
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => handleResolveIncident(incident.id)}
                                disabled={updateIncidentMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2 text-emerald-600"
                                onClick={() => handleApproveIncident(incident.id)}
                                disabled={approveIncidentMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => handleRejectIncident(incident.id)}
                            disabled={rejectIncidentMutation.isPending}
                          >
                            <Ban className="h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}

              {filteredIncidents.length === 0 && (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No incidents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                      ? "No incidents match your current filters."
                      : "No incidents have been reported yet."}
                  </p>
                  <Link href="/dashboard/incidents/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Report Incident
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Incident Modal */}
      <IncidentModal
        incident={selectedIncident}
        isOpen={showIncidentModal}
        onClose={() => {
          setShowIncidentModal(false)
          setSelectedIncident(null)
        }}
        onUpdate={() => refetch()}
      />
    </Suspense>
  )
}