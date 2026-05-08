"use client"

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
import { Search, MoreHorizontal, UserX, Filter, Download, Plus, Eye, Undo2, Trash2 } from "lucide-react"
import { bannedUsers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const appealStyles = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500" },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
  denied: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
  none: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
}

export function BanList() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <UserX className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Banned Users
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {bannedUsers.length} total bans | {bannedUsers.filter(u => u.appealStatus === "pending").length} pending appeals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="h-9 w-full border-border/50 bg-secondary/50 pl-9 text-sm sm:w-[200px]"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-border/50 bg-transparent">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-border/50 bg-transparent">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-9 shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Ban</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
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
              {bannedUsers.map((user) => {
                const appeal = appealStyles[user.appealStatus as keyof typeof appealStyles]
                return (
                  <TableRow key={user.id} className="border-border/50 hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-red-500/20">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                          <AvatarFallback className="bg-red-500/10 text-red-500 text-xs font-semibold">
                            {user.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {user.name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {user.odId.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm text-muted-foreground">
                        {user.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-sm text-muted-foreground">{user.bannedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {user.bannedAt.split(" - ")[0]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 gap-1.5 text-[10px] font-semibold", appeal.bg, appeal.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", appeal.dot)} />
                        {user.appealStatus === "none" ? "No Appeal" : user.appealStatus.charAt(0).toUpperCase() + user.appealStatus.slice(1)}
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
                          <DropdownMenuItem className="gap-2">
                            <Undo2 className="h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
