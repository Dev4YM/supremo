"use client"

import { Button } from "@/components/ui/button"
import { UserMinus, AlertTriangle, Volume2, MessageSquareOff, Lock, Shield } from "lucide-react"

const actions = [
  { label: "Ban User", icon: UserMinus, variant: "destructive" as const },
  { label: "Warn User", icon: AlertTriangle, variant: "outline" as const },
  { label: "Mute User", icon: Volume2, variant: "outline" as const },
  { label: "Clear Messages", icon: MessageSquareOff, variant: "outline" as const },
  { label: "Lock Channel", icon: Lock, variant: "outline" as const },
  { label: "Lockdown", icon: Shield, variant: "secondary" as const },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <Button key={action.label} variant={action.variant} size="sm" className="h-8 gap-1.5">
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  )
}
