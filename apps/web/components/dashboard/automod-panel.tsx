"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings2, Zap, ChevronRight, Shield, AlertTriangle } from "lucide-react"
import { autoModRules } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function AutoModPanel() {
  const [rules, setRules] = useState(autoModRules)

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
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
              <CardTitle className="text-base font-semibold text-foreground">
                AutoMod Rules
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {rules.filter(r => r.enabled).length} of {rules.length} active
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-border/50 bg-transparent">
            <Settings2 className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "group flex items-center justify-between rounded-xl border p-4 transition-all",
                rule.enabled 
                  ? "border-primary/20 bg-primary/5" 
                  : "border-border/50 bg-secondary/30 opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule.id)}
                  className="data-[state=checked]:bg-primary"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/80">
                  {rule.name.includes("Spam") ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {rule.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-border/50 bg-background/50 text-[10px] font-medium text-muted-foreground"
                    >
                      {rule.action}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rule.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {rule.triggers.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">triggers total</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
