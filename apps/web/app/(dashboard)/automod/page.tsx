import { AutoModPanel } from "@/components/dashboard/automod-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, Shield, AlertTriangle, Trash2, Plus, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const automodStats = [
  { label: "Total Triggers", value: "6,448", change: "+234 today", icon: Zap, color: "text-primary" },
  { label: "Spam Blocked", value: "1,245", change: "+45 today", icon: Shield, color: "text-emerald-500" },
  { label: "Links Removed", value: "892", change: "+12 today", icon: Trash2, color: "text-blue-500" },
  { label: "Profanity Filtered", value: "3,421", change: "+89 today", icon: AlertTriangle, color: "text-amber-500" },
]

const customFilters = [
  { name: "Discord Nitro Scam", pattern: "free nitro|nitro gift", triggers: 234, active: true },
  { name: "Phishing Links", pattern: "dlscord|d1scord|disc0rd", triggers: 89, active: true },
  { name: "Crypto Spam", pattern: "crypto|bitcoin|eth giveaway", triggers: 156, active: true },
  { name: "Self-Promotion", pattern: "sub to|follow my|check out my", triggers: 78, active: false },
]

export default function AutoModPage() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {automodStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AutoMod Rules */}
        <AutoModPanel />

        {/* Custom Filters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Custom Filters
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {customFilters.filter(f => f.active).length} active filters
                  </p>
                </div>
              </div>
              <Button size="sm" className="h-8 gap-2">
                <Plus className="h-4 w-4" />
                Add Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {customFilters.map((filter) => (
                <div
                  key={filter.name}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 transition-all",
                    filter.active 
                      ? "border-amber-500/20 bg-amber-500/5" 
                      : "border-border/50 bg-secondary/30 opacity-60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{filter.name}</span>
                      <Badge variant={filter.active ? "default" : "secondary"} className="text-[10px]">
                        {filter.active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      /{filter.pattern}/
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{filter.triggers}</p>
                      <p className="text-[10px] text-muted-foreground">triggers</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Word Blacklist */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Word Blacklist
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  156 words/phrases blocked
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-border/50 bg-transparent">
              <Plus className="h-4 w-4" />
              Add Words
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {["slur1", "offensive", "banned_word", "hate_speech", "spam_term", "abuse", "toxic", "harassment", "threat", "scam", "phishing", "malware"].map((word) => (
              <Badge key={word} variant="outline" className="border-red-500/20 bg-red-500/5 text-red-500">
                {word}
              </Badge>
            ))}
            <Badge variant="outline" className="border-border/50 text-muted-foreground">
              +144 more
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
