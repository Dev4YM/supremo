import { BanList } from "@/components/dashboard/ban-list"
import { Card, CardContent } from "@/components/ui/card"
import { UserX, Clock, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const banStats = [
  { label: "Total Bans", value: "892", icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
  { label: "Pending Appeals", value: "23", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Approved Appeals", value: "45", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Denied Appeals", value: "156", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
]

export default function BansPage() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {banStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.bg, stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ban List */}
      <BanList />
    </div>
  )
}
