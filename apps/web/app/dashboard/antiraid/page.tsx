"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Shield,
  AlertTriangle,
  Users,
  Lock,
  Unlock,
  Eye,
  Settings,
  UserCheck,
  UserX,
  Activity,
  Loader2,
} from "lucide-react"
import {
  useAntiRaidConfig,
  useAntiRaidJoinRate,
  useAntiRaidLockdown,
  useSetAntiRaidLockdown,
  useUpdateAntiRaidConfig,
  useUsers,
} from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

const Loading = () => null;

function AntiRaidContent() {
  const { data: config, isLoading: configLoading } = useAntiRaidConfig();
  const { data: joinRateData, isLoading: joinRateLoading } = useAntiRaidJoinRate();
  const { data: lockdown, isLoading: lockdownLoading } = useAntiRaidLockdown();
  const { data: users = [] } = useUsers({ limit: 50 });
  const updateConfig = useUpdateAntiRaidConfig();
  const setLockdown = useSetAntiRaidLockdown();

  const [joinRateLimit, setJoinRateLimit] = useState<number | null>(null);
  const [accountAgeMinimum, setAccountAgeMinimum] = useState<number | null>(null);

  const isLocked = Boolean(lockdown?.enabled);
  const joinRateLimitValue = joinRateLimit ?? config?.joinRateLimit ?? 10;
  const accountAgeValue = accountAgeMinimum ?? (config?.minAccountAge ? Math.round(config.minAccountAge / 3600) : 0);

  const joinData = useMemo(() => {
    const recent = (joinRateData?.recent ?? []) as Array<{
      windowStart: string;
      joinCount: number;
      triggered: boolean;
    }>;
    return recent.slice(0, 6).map((entry) => ({
      time: new Date(entry.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      joins: entry.joinCount,
      suspicious: entry.triggered ? entry.joinCount : 0,
    }));
  }, [joinRateData]);

  const recentJoins = useMemo(() => {
    return (users as Array<{
      id: string;
      username: string;
      discordId: string;
      joinedAt: string;
      trustScore: number;
    }>)
      .slice()
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(0, 5)
      .map((user) => {
        const accountAgeMs = Date.now() - (Number((BigInt(user.discordId) >> 22n) + 1420070400000n));
        const accountAgeHours = accountAgeMs / (1000 * 60 * 60);
        const suspicious = accountAgeHours < 24 || user.trustScore < 30;
        return {
          id: user.id,
          username: user.username,
          joinTime: user.joinedAt,
          suspicious,
          reason: suspicious
            ? accountAgeHours < 24
              ? "Account age < 24h"
              : "Low trust score"
            : null,
        };
      });
  }, [users]);

  const totalJoinsLast24h = useMemo(() => {
    const recent = (joinRateData?.recent ?? []) as Array<{ joinCount: number }>;
    return recent.reduce((sum, entry) => sum + entry.joinCount, 0);
  }, [joinRateData]);

  const suspiciousJoins = recentJoins.filter((j) => j.suspicious).length;
  const currentJoinRate = joinData.length > 0 ? joinData[joinData.length - 1].joins : 0;
  const raidRisk = currentJoinRate > joinRateLimitValue ? "High" : currentJoinRate > 5 ? "Medium" : "Low";

  const handleSaveSettings = () => {
    updateConfig.mutate({
      enabled: config?.enabled,
      joinRateLimit: joinRateLimitValue,
      joinRateWindow: config?.joinRateWindow ?? 60,
      verificationEnabled: config?.verificationEnabled,
      accountAgeGateEnabled: accountAgeValue > 0,
      minAccountAge: accountAgeValue * 3600,
    });
  };

  const handleToggleLockdown = () => {
    setLockdown.mutate({
      enabled: !isLocked,
      reason: isLocked ? "Manual unlock from dashboard" : "Emergency lockdown from dashboard",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Anti-Raid Protection</h1>
          <p className="text-muted-foreground">
            Monitor and prevent coordinated server raids
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSaveSettings} disabled={updateConfig.isPending}>
            <Settings className="h-4 w-4" />
            Save Settings
          </Button>
          <Button
            variant={isLocked ? "destructive" : "default"}
            className="gap-2"
            onClick={handleToggleLockdown}
            disabled={setLockdown.isPending || lockdownLoading}
          >
            {setLockdown.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLocked ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isLocked ? "Unlock Server" : "Emergency Lockdown"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Protection Status",
            value: config?.enabled ? "Active" : "Disabled",
            icon: Shield,
            color: config?.enabled ? "text-emerald-500" : "text-red-500",
            loading: configLoading,
          },
          {
            label: "Joins (recent windows)",
            value: totalJoinsLast24h.toString(),
            icon: Users,
            color: "text-blue-500",
            loading: joinRateLoading,
          },
          {
            label: "Suspicious Joins",
            value: suspiciousJoins.toString(),
            icon: AlertTriangle,
            color: suspiciousJoins > 5 ? "text-red-500" : "text-amber-500",
            loading: false,
          },
          {
            label: "Raid Risk",
            value: raidRisk,
            icon: Activity,
            color: raidRisk === "High" ? "text-red-500" : raidRisk === "Medium" ? "text-amber-500" : "text-emerald-500",
            loading: false,
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              {stat.loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLocked && (
        <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-400">Server Lockdown Active</h3>
                <p className="text-sm text-red-600 dark:text-red-300">
                  The server is currently locked down. New members cannot join until lockdown is lifted.
                </p>
              </div>
              <Button variant="outline" className="ml-auto" onClick={handleToggleLockdown} disabled={setLockdown.isPending}>
                <Unlock className="h-4 w-4 mr-2" />
                Lift Lockdown
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Join Rate Monitor</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Recent join rate windows from the server
                  </p>
                </div>
                <Badge variant="outline" className={cn(
                  "border-0 text-[10px]",
                  currentJoinRate > joinRateLimitValue ? "bg-red-500/10 text-red-500" :
                  currentJoinRate > 5 ? "bg-amber-500/10 text-amber-500" :
                  "bg-emerald-500/10 text-emerald-500"
                )}>
                  {currentJoinRate}/window
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {joinRateLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : joinData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No join rate data yet. Data appears as members join the server.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-2">
                    {joinData.map((data, index) => (
                      <div key={index} className="text-center">
                        <div className="relative h-24 flex items-end justify-center">
                          <div
                            className={cn(
                              "w-full rounded-t transition-all",
                              data.suspicious > 5 ? "bg-red-500" :
                              data.suspicious > 0 ? "bg-amber-500" :
                              "bg-emerald-500"
                            )}
                            style={{ height: `${Math.max((data.joins / Math.max(joinRateLimitValue, 1)) * 100, 10)}%` }}
                            title={`${data.joins} joins, ${data.suspicious} suspicious`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{data.time}</p>
                        <p className="text-xs font-medium">{data.joins}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rate Limit</span>
                        <span className="text-sm font-medium">{joinRateLimitValue}/window</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Time Window</span>
                        <span className="text-sm font-medium">{config?.joinRateWindow ?? 60}s</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Verification</span>
                        <Switch
                          checked={Boolean(config?.verificationEnabled)}
                          onCheckedChange={(checked) => updateConfig.mutate({ verificationEnabled: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Protection</span>
                        <Switch
                          checked={Boolean(config?.enabled)}
                          onCheckedChange={(checked) => updateConfig.mutate({ enabled: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Joins</CardTitle>
              <p className="text-xs text-muted-foreground">
                Latest members synced to the guild
              </p>
            </CardHeader>
            <CardContent>
              {recentJoins.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No member data yet. Sync users from the Users page.</p>
              ) : (
                <div className="space-y-3">
                  {recentJoins.map((join) => (
                    <div
                      key={join.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        join.suspicious
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-border/50 bg-secondary/20"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        join.suspicious ? "bg-red-500/10" : "bg-emerald-500/10"
                      )}>
                        {join.suspicious ? (
                          <UserX className="h-4 w-4 text-red-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{join.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(join.joinTime).toLocaleString()}
                        </p>
                        {join.reason && (
                          <p className="text-xs text-red-500 mt-1">{join.reason}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Protection Settings</CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure anti-raid protection parameters
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Anti-Raid Protection</p>
                  <p className="text-xs text-muted-foreground">Enable automated raid detection</p>
                </div>
                <Switch
                  checked={Boolean(config?.enabled)}
                  onCheckedChange={(checked) => updateConfig.mutate({ enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Member Verification</p>
                  <p className="text-xs text-muted-foreground">Require verification for new members</p>
                </div>
                <Switch
                  checked={Boolean(config?.verificationEnabled)}
                  onCheckedChange={(checked) => updateConfig.mutate({ verificationEnabled: checked })}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Join Rate Limit</label>
                <p className="text-xs text-muted-foreground mb-2">Maximum joins per window</p>
                <Input
                  type="number"
                  value={joinRateLimitValue}
                  onChange={(e) => setJoinRateLimit(Number(e.target.value))}
                  className="border-border/50 bg-secondary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account Age Minimum (hours)</label>
                <p className="text-xs text-muted-foreground mb-2">Minimum account age for new members</p>
                <Input
                  type="number"
                  value={accountAgeValue}
                  onChange={(e) => setAccountAgeMinimum(Number(e.target.value))}
                  className="border-border/50 bg-secondary/50"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setJoinRateLimit(10);
                setAccountAgeMinimum(0);
                updateConfig.mutate({
                  joinRateLimit: 10,
                  minAccountAge: 0,
                  accountAgeGateEnabled: false,
                });
              }}
            >
              Reset to Defaults
            </Button>
            <Button onClick={handleSaveSettings} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AntiRaidPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AntiRaidContent />
    </Suspense>
  );
}
