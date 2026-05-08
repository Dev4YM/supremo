"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Key, 
  Save,
  Webhook,
  MessageSquare,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    bans: true,
    warnings: true,
    mutes: false,
    automod: true,
    appeals: true,
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Settings */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">General Settings</CardTitle>
                  <CardDescription>Configure your moderation preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Command Prefix</Label>
                  <Input id="prefix" defaultValue="!" className="border-border/50 bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="border-border/50 bg-secondary/50">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-delete invites</p>
                    <p className="text-sm text-muted-foreground">Automatically remove Discord invite links</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Log all actions</p>
                    <p className="text-sm text-muted-foreground">Keep detailed logs of moderation actions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">DM users on action</p>
                    <p className="text-sm text-muted-foreground">Send DM to users when moderated</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Bell className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Notifications</CardTitle>
                  <CardDescription>Choose what alerts you want to receive</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "bans", label: "Ban notifications", desc: "Get notified when users are banned", icon: AlertTriangle },
                { key: "warnings", label: "Warning notifications", desc: "Get notified when warnings are issued", icon: AlertTriangle },
                { key: "mutes", label: "Mute notifications", desc: "Get notified when users are muted", icon: MessageSquare },
                { key: "automod", label: "AutoMod alerts", desc: "Get notified on AutoMod triggers", icon: Shield },
                { key: "appeals", label: "Appeal notifications", desc: "Get notified on new ban appeals", icon: MessageSquare },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [item.key]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Webhook Settings */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Webhook className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Webhooks</CardTitle>
                  <CardDescription>Configure Discord webhooks for logging</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mod-log">Moderation Log Webhook</Label>
                <Input 
                  id="mod-log" 
                  placeholder="https://discord.com/api/webhooks/..." 
                  className="border-border/50 bg-secondary/50 font-mono text-sm" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-log">Member Log Webhook</Label>
                <Input 
                  id="member-log" 
                  placeholder="https://discord.com/api/webhooks/..." 
                  className="border-border/50 bg-secondary/50 font-mono text-sm" 
                />
              </div>
              <Button variant="outline" className="w-full border-border/50 bg-transparent">
                Test Webhooks
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Bot Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm font-medium">14d 6h 32m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">v2.4.1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Latency</span>
                <span className="text-sm font-medium">42ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Appearance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select defaultValue="dark">
                  <SelectTrigger className="border-border/50 bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-purple-500"].map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all hover:scale-110",
                        color,
                        color === "bg-blue-500" && "ring-2 ring-offset-2 ring-offset-background ring-blue-500"
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">API Keys</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Production Key</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px]">Active</Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">sk_live_***************</p>
              </div>
              <Button variant="outline" size="sm" className="w-full border-border/50 bg-transparent">
                Regenerate Keys
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <CardTitle className="text-base font-semibold text-red-500">Danger Zone</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 bg-transparent">
                Reset All Settings
              </Button>
              <Button variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 bg-transparent">
                Delete All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
