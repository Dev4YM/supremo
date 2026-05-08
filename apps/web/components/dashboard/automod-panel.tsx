"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings2, Zap, ChevronRight, Shield, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAutoModRules, useAutoModScans, useUpdateAutoModRule } from "@/lib/hooks/use-api"
import Link from "next/link"

export function AutoModPanel() {
  const { data: rules = [], isLoading, isError } = useAutoModRules()
  const { data: scans = [] } = useAutoModScans()
  const updateRule = useUpdateAutoModRule()

  const triggerCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of scans as Array<{ ruleId?: string }>) {
      if (!s.ruleId) continue
      m.set(s.ruleId, (m.get(s.ruleId) ?? 0) + 1)
    }
    return m
  }, [scans])

  const toggleRule = (rule: { id: string; enabled: boolean }) => {
    updateRule.mutate({ ruleId: rule.id, data: { enabled: !rule.enabled } })
  }

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Loading auto-mod rules…</p>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 text-sm text-muted-foreground">Could not load auto-mod rules.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">AutoMod Rules</CardTitle>
              <p className="text-xs text-muted-foreground">
                {rules.filter((r: { enabled?: boolean }) => r.enabled).length} of {rules.length} active
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-border/50 bg-transparent" asChild>
            <Link href="/dashboard/automod">
              <Settings2 className="h-4 w-4" />
              Configure
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {rules.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No rules yet. Create one in Auto-mod settings.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule: { id: string; name: string; enabled: boolean; type?: string; action?: string; description?: string | null }) => {
              const triggers = triggerCounts.get(rule.id) ?? 0

              return (
                <div
                  key={rule.id}
                  className={cn(
                    "group flex items-center justify-between rounded-xl border p-4 transition-all",
                    rule.enabled ? "border-primary/20 bg-primary/5" : "border-border/50 bg-secondary/30 opacity-60",
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Switch
                      checked={!!rule.enabled}
                      disabled={updateRule.isPending}
                      onCheckedChange={() => toggleRule(rule)}
                      className="data-[state=checked]:bg-primary shrink-0"
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80">
                      {rule.type === "spam" ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Shield className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{rule.name}</span>
                        <Badge
                          variant="outline"
                          className="border-border/50 bg-background/50 text-[10px] font-medium text-muted-foreground shrink-0"
                        >
                          {rule.action || "warn"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {rule.description || `${rule.type ?? "rule"} · threshold-driven`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{triggers.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">flagged scans</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" asChild>
                      <Link href="/dashboard/automod" aria-label="Open auto-mod">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
