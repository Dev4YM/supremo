"use client"

import { useMemo, useState } from "react"
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
import {
  useIncidents,
  useUpdateIncident,
  useApproveIncident,
  useRejectIncident,
  useAuth,
} from "@/lib/hooks/use-api"
import { toast } from "sonner"
import Link from "next/link"
import { IncidentModal } from "@/components/modals/incident-modal"
import {
  incidentDisplayDescription,
  incidentDisplayTitle,
} from "@/lib/incident-display"

const severityConfig = {
  low: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  critical: { color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
}

const statusConfig: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pending: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending" },
  reviewing: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Reviewing" },
  approved: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Approved" },
  rejected: { color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
  resolved: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Resolved" },
}

const typeConfig: Record<string, { icon: typeof MessageSquare; color: string }> = {
  message_spam: { icon: MessageSquare, color: "text-blue-500" },
  join_spam: { icon: MessageSquare, color: "text-blue-500" },
  mention_spam: { icon: MessageSquare, color: "text-blue-500" },
  suspicious_link: { icon: AlertTriangle, color: "text-amber-500" },
  new_account: { icon: User, color: "text-muted-foreground" },
  toxic_content: { icon: AlertTriangle, color: "text-red-500" },
  raid_detected: { icon: Shield, color: "text-orange-500" },
  custom_rule: { icon: AlertTriangle, color: "text-muted-foreground" },
}

const Loading = () => null

export default function IncidentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedIncident, setSelectedIncident] = useState<Record<string, unknown> | null>(null)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const searchParams = useSearchParams()
  void searchParams

  const { data: authUser } = useAuth()

  const incidentQueryParams = useMemo(() => {
    const base: { limit: number; status?: string } = { limit: 100 }
    if (statusFilter !== "all") base.status = statusFilter
    return base
  }, [statusFilter])

  const { data: incidents = [], isLoading, error, refetch } = useIncidents(incidentQueryParams)
  const updateIncidentMutation = useUpdateIncident()
  const approveIncidentMutation = useApproveIncident()
  const rejectIncidentMutation = useRejectIncident()

  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (Array.isArray(incidents) ? incidents : []).filter((incident: Record<string, unknown>) => {
      const title = incidentDisplayTitle(incident).toLowerCase()
      const desc = incidentDisplayDescription(incident).toLowerCase()
      const rule = String(incident.ruleTriggered || "").toLowerCase()
      const id = String(incident.id || "").toLowerCase()
      const typ = String(incident.type || "").toLowerCase()
      const matchesSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        rule.includes(q) ||
        typ.includes(q) ||
        id.includes(q)
      const matchesType = typeFilter === "all" || String(incident.type) === typeFilter
      return matchesSearch && matchesType
    })
  }, [incidents, searchQuery, typeFilter])

  const stats = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : []
    return {
      total: list.length,
      open: list.filter(
        (i: Record<string, unknown>) => i.status === "PENDING" || i.status === "REVIEWING",
      ).length,
      resolved: list.filter(
        (i: Record<string, unknown>) =>
          i.status === "RESOLVED" || i.status === "APPROVED" || i.status === "REJECTED",
      ).length,
      critical: list.filter((i: Record<string, unknown>) => i.severity === "CRITICAL").length,
    }
  }, [incidents])

  const moderatorId = (authUser as { id?: string } | null | undefined)?.id

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await updateIncidentMutation.mutateAsync({
        incidentId,
        data: { status: "resolved" },
      })
      toast.success("Incident resolved successfully")
      refetch()
    } catch {
      toast.error("Failed to resolve incident")
    }
  }

  const handleApproveIncident = async (incidentId: string) => {
    if (!moderatorId) {
      toast.error("You must be signed in to approve incidents")
      return
    }
    try {
      await approveIncidentMutation.mutateAsync({
        incidentId,
        data: { moderatorId, notes: "" },
      })
      toast.success("Incident approved successfully")
      refetch()
    } catch {
      toast.error("Failed to approve incident")
    }
  }

  const handleRejectIncident = async (incidentId: string) => {
    if (!moderatorId) {
      toast.error("You must be signed in to reject incidents")
      return
    }
    try {
      await rejectIncidentMutation.mutateAsync({
        incidentId,
        data: { moderatorId, notes: "" },
      })
      toast.success("Incident rejected successfully")
      refetch()
    } catch {
      toast.error("Failed to reject incident")
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Incidents", value: stats.total.toString(), icon: AlertTriangle, color: "text-red-500" },
            { label: "Awaiting review", value: stats.open.toString(), icon: Clock, color: "text-amber-500" },
            { label: "Closed out", value: stats.resolved.toString(), icon: CheckCircle2, color: "text-emerald-500" },
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

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Incident Reports</CardTitle>
                  <p className="text-xs text-muted-foreground">{filteredIncidents.length} incidents found</p>
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
                  <SelectTrigger className="h-9 w-[150px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="REVIEWING">Reviewing</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[170px] border-border/50 bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="MESSAGE_SPAM">Message spam</SelectItem>
                    <SelectItem value="JOIN_SPAM">Join spam</SelectItem>
                    <SelectItem value="MENTION_SPAM">Mention spam</SelectItem>
                    <SelectItem value="SUSPICIOUS_LINK">Suspicious link</SelectItem>
                    <SelectItem value="NEW_ACCOUNT">New account</SelectItem>
                    <SelectItem value="TOXIC_CONTENT">Toxic content</SelectItem>
                    <SelectItem value="RAID_DETECTED">Raid detected</SelectItem>
                    <SelectItem value="CUSTOM_RULE">Custom rule</SelectItem>
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
              <div className="py-8 text-center">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h3 className="mb-2 text-lg font-semibold">Failed to load incidents</h3>
                <p className="mb-4 text-muted-foreground">There was an error loading incidents. Please try again.</p>
                <Button onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredIncidents.map((incident: Record<string, unknown>) => {
                  const sevKey = String(incident.severity || "MEDIUM").toLowerCase() as keyof typeof severityConfig
                  const severity = severityConfig[sevKey] || severityConfig.medium
                  const stKey = String(incident.status || "PENDING").toLowerCase()
                  const status = statusConfig[stKey] || statusConfig.pending
                  const typKey = String(incident.type || "custom_rule").toLowerCase()
                  const type = typeConfig[typKey] || typeConfig.custom_rule
                  const TypeIcon = type.icon
                  const user = incident.user as { username?: string; discordId?: string } | undefined
                  const seed = user?.discordId || user?.username || incident.id

                  return (
                    <div
                      key={String(incident.id)}
                      className={cn(
                        "group flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-lg",
                        incident.severity === "CRITICAL"
                          ? "border-red-500/30 bg-red-500/5"
                          : incident.severity === "HIGH"
                            ? "border-orange-500/30 bg-orange-500/5"
                            : "border-border/50 bg-secondary/20 hover:bg-secondary/40",
                      )}
                    >
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", severity.bg)}>
                        <TypeIcon className={cn("h-5 w-5", type.color)} />
                      </div>

                      <div className="flex flex-1 items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{incidentDisplayTitle(incident)}</span>
                            <Badge variant="outline" className={cn("border-0 text-[10px] font-semibold", severity.bg, severity.color)}>
                              {severity.label}
                            </Badge>
                            <Badge variant="outline" className={cn("border-0 text-[10px]", status.bg, status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="line-clamp-1 text-sm text-muted-foreground">{incidentDisplayDescription(incident)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Source: AutoMod</span>
                            <span>•</span>
                            <span>User: {user?.username || "Unknown"}</span>
                            <span>•</span>
                            <span>
                              {incident.createdAt ? new Date(incident.createdAt as string).toLocaleString() : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed))}`}
                          />
                          <AvatarFallback className="text-xs">{(user?.username || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
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
                            <DropdownMenuSeparator />
                            {(incident.status === "PENDING" || incident.status === "REVIEWING") && (
                              <>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleResolveIncident(String(incident.id))}
                                  disabled={updateIncidentMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Mark Resolved
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-emerald-600"
                                  onClick={() => handleApproveIncident(String(incident.id))}
                                  disabled={approveIncidentMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                              </>
                            )}
                            {(incident.status === "PENDING" || incident.status === "REVIEWING") && (
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onClick={() => handleRejectIncident(String(incident.id))}
                                disabled={rejectIncidentMutation.isPending}
                              >
                                <Ban className="h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}

                {filteredIncidents.length === 0 && (
                  <div className="py-8 text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No incidents found</h3>
                    <p className="mb-4 text-muted-foreground">
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
