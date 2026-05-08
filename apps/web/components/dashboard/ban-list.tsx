"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, UserX, Filter, Download, Plus, Eye, Undo2, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuildModerationActions } from "@/lib/hooks/use-api"
import { format } from "date-fns"

const appealStyles = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500" },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
  denied: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
  none: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
}

export function BanList() {
  const [q, setQ] = useState("")
  const { data: actions = [], isLoading, isError } = useGuildModerationActions({ limit: 100 })

  const bannedRows = useMemo(() => {
    const bans = (actions as Array<{
      id: string
      type: string
      reason?: string | null
      executedBy?: string | null
      approvedBy?: string | null
      executedAt?: string | null
      user?: { username?: string | null; discordId?: string | null } | null
      targetUserId?: string
    }>).filter((a) => a.type === "BAN" && a.executedAt)

    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? bans.filter((a) => {
          const name = (a.user?.username || "").toLowerCase()
          const id = (a.targetUserId || "").toLowerCase()
          const reason = (a.reason || "").toLowerCase()
          return name.includes(needle) || id.includes(needle) || reason.includes(needle)
        })
      : bans

    return filtered.slice(0, 50)
  }, [actions, q])

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <UserX className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Banned Users</CardTitle>
              <p className="text-xs text-muted-foreground">
                {bannedRows.length} recent ban actions (guild log)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search users..."
                className="h-9 w-full border-border/50 bg-secondary/50 pl-9 text-sm sm:w-[200px]"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-border/50 bg-transparent" type="button" disabled>
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-border/50 bg-transparent" type="button" disabled>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-9 shrink-0 gap-2" type="button" disabled>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Ban</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-xs">Loading bans…</p>
          </div>
        ) : isError ? (
          <p className="py-8 text-sm text-muted-foreground">Could not load ban actions.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground">User</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Reason</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Banned By</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Appeal</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bannedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No ban actions in the recent guild log.
                    </TableCell>
                  </TableRow>
                ) : (
                  bannedRows.map((row) => {
                    const name = row.user?.username || row.targetUserId?.slice(0, 8) || "Unknown"
                    const discordId = row.user?.discordId || row.targetUserId || ""
                    const appeal = appealStyles.none

                    return (
                      <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-2 ring-red-500/20">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`} />
                              <AvatarFallback className="bg-red-500/10 text-red-500 text-xs font-semibold">
                                {name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {discordId ? `${discordId.slice(0, 10)}…` : "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm text-muted-foreground">{row.reason || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-sm text-muted-foreground">{row.executedBy || row.approvedBy || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {row.executedAt ? format(new Date(row.executedAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border-0 gap-1.5 text-[10px] font-semibold", appeal.bg, appeal.text)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", appeal.dot)} />
                            Not tracked
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="gap-2">
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" disabled>
                                <Undo2 className="h-4 w-4" />
                                Unban User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" disabled>
                                <Trash2 className="h-4 w-4" />
                                Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
