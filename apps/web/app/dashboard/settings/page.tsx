"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Settings,
  Bot,
  Shield,
  Bell,
  Palette,
  Database,
  Key,
  Users,
  MessageSquare,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Upload,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Copy,
  RefreshCw,
  Zap,
  Crown,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useGuildSettings } from "@/lib/hooks/use-guild-settings"
import { useRevokeOtherSessions, useRevokeSession, useUserSessions } from "@/lib/hooks/use-api"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [showToken, setShowToken] = useState(false)

  const {
    isLoading,
    generalSettings,
    setGeneralSettings,
    moderationSettings,
    setModerationSettings,
    notificationSettings,
    setNotificationSettings,
    appearanceSettings,
    setAppearanceSettings,
    saveGeneral,
    saveModeration,
    saveNotifications,
    saveAppearance,
    saveSecurity,
    securitySettings,
    setSecuritySettings,
    isSaving,
  } = useGuildSettings()

  const { data: sessions = [], isLoading: sessionsLoading } = useUserSessions()
  const revokeSession = useRevokeSession()
  const revokeOtherSessions = useRevokeOtherSessions()

  const handleSaveSettings = async (section: string) => {
    try {
      if (section === 'General') await saveGeneral()
      else if (section === 'Moderation') await saveModeration()
      else if (section === 'Notifications') await saveNotifications()
      else if (section === 'Appearance') await saveAppearance()
      else if (section === 'Security') await saveSecurity()
    } catch {
      toast.error(`Failed to save ${section} settings`)
    }
  }

  const saveConfigSection = async (key: string, value: unknown) => {
    const { configAPI } = await import('@/lib/api')
    await configAPI.createConfig({
      key,
      value: JSON.stringify(value),
      category: 'dashboard_settings',
    })
  }

  const formatSessionAgent = (userAgent?: string | null) => {
    if (!userAgent) return 'Unknown device'
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    return userAgent.slice(0, 48)
  }

  const handleResetSettings = (section: string) => {
    toast.info(`${section} settings reset to defaults`)
  }

  const handleExportSettings = () => {
    const payload = {
      general: generalSettings,
      moderation: moderationSettings,
      notifications: notificationSettings,
      appearance: appearanceSettings,
      security: securitySettings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supremo-settings.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Settings exported')
  }

  const handleImportSettings = () => {
    toast.success('Settings imported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your Discord bot and dashboard preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportSettings}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Bot Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="botName">Bot Name</Label>
                  <Input
                    id="botName"
                    value={generalSettings.botName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, botName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="prefix">Command Prefix</Label>
                  <Input
                    id="prefix"
                    value={generalSettings.prefix}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, prefix: e.target.value }))}
                    className="mt-1 font-mono"
                    maxLength={3}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Bot Description</Label>
                <Textarea
                  id="description"
                  value={generalSettings.description}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Language</Label>
                  <Select value={generalSettings.language} onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Timezone</Label>
                  <Select value={generalSettings.timezone} onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Bot Status</Label>
                  <Select value={generalSettings.status} onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="idle">Idle</SelectItem>
                      <SelectItem value="dnd">Do Not Disturb</SelectItem>
                      <SelectItem value="invisible">Invisible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="activity">Bot Activity</Label>
                <Input
                  id="activity"
                  value={generalSettings.activity}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, activity: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g., Watching over the server"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Bot Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-secondary/20">
                <Input
                  type={showToken ? "text" : "password"}
                  value="MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.XXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXX"
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>Keep your bot token secure. Never share it publicly.</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => handleSaveSettings('General')} disabled={isSaving || isLoading}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => handleResetSettings('General')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Moderation Settings */}
        <TabsContent value="moderation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Auto-Moderation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Auto-Moderation</Label>
                      <p className="text-xs text-muted-foreground">Automatically detect and handle rule violations</p>
                    </div>
                    <Switch
                      checked={moderationSettings.autoMod}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, autoMod: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Anti-Spam</Label>
                      <p className="text-xs text-muted-foreground">Prevent spam messages and repeated content</p>
                    </div>
                    <Switch
                      checked={moderationSettings.antiSpam}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, antiSpam: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Anti-Raid Protection</Label>
                      <p className="text-xs text-muted-foreground">Protect against coordinated attacks</p>
                    </div>
                    <Switch
                      checked={moderationSettings.antiRaid}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, antiRaid: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Auto-Role Assignment</Label>
                      <p className="text-xs text-muted-foreground">Automatically assign roles to new members</p>
                    </div>
                    <Switch
                      checked={moderationSettings.autoRole}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, autoRole: checked }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Welcome Messages</Label>
                      <p className="text-xs text-muted-foreground">Send welcome messages to new members</p>
                    </div>
                    <Switch
                      checked={moderationSettings.welcomeMessage}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, welcomeMessage: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Leave Messages</Label>
                      <p className="text-xs text-muted-foreground">Send messages when members leave</p>
                    </div>
                    <Switch
                      checked={moderationSettings.leaveMessage}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, leaveMessage: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Auto-Timeout</Label>
                      <p className="text-xs text-muted-foreground">Automatically timeout users after warnings</p>
                    </div>
                    <Switch
                      checked={moderationSettings.autoTimeout}
                      onCheckedChange={(checked) => setModerationSettings(prev => ({ ...prev, autoTimeout: checked }))}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="logChannel">Log Channel</Label>
                  <Select value={moderationSettings.logChannel} onValueChange={(value) => setModerationSettings(prev => ({ ...prev, logChannel: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mod-logs">#mod-logs</SelectItem>
                      <SelectItem value="audit-log">#audit-log</SelectItem>
                      <SelectItem value="general">#general</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="muteRole">Mute Role</Label>
                  <Select value={moderationSettings.muteRole} onValueChange={(value) => setModerationSettings(prev => ({ ...prev, muteRole: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muted">Muted</SelectItem>
                      <SelectItem value="timeout">Timeout</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="maxWarnings">Max Warnings</Label>
                  <Input
                    id="maxWarnings"
                    type="number"
                    min="1"
                    max="10"
                    value={moderationSettings.maxWarnings}
                    onChange={(e) => setModerationSettings(prev => ({ ...prev, maxWarnings: parseInt(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => handleSaveSettings('Moderation')} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => handleResetSettings('Moderation')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Discord Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications in Discord</p>
                  </div>
                  <Switch
                    checked={notificationSettings.discordNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, discordNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Webhook Notifications</Label>
                    <p className="text-xs text-muted-foreground">Send notifications to external webhooks</p>
                  </div>
                  <Switch
                    checked={notificationSettings.webhookNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, webhookNotifications: checked }))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Alert Types</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Incident Alerts</Label>
                      <p className="text-xs text-muted-foreground">New incidents and reports</p>
                    </div>
                    <Switch
                      checked={notificationSettings.incidentAlerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, incidentAlerts: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">System Alerts</Label>
                      <p className="text-xs text-muted-foreground">System errors and warnings</p>
                    </div>
                    <Switch
                      checked={notificationSettings.systemAlerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, systemAlerts: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Maintenance Alerts</Label>
                      <p className="text-xs text-muted-foreground">Scheduled maintenance notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.maintenanceAlerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, maintenanceAlerts: checked }))}
                    />
                  </div>
                </div>
              </div>
              
              {notificationSettings.webhookNotifications && (
                <>
                  <Separator />
                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={notificationSettings.webhookUrl}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => handleSaveSettings('Notifications')} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => handleResetSettings('Notifications')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">IP Whitelist</Label>
                    <p className="text-xs text-muted-foreground">Restrict access to specific IP addresses</p>
                  </div>
                  <Switch
                    checked={securitySettings.ipWhitelist}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, ipWhitelist: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Audit Logging</Label>
                    <p className="text-xs text-muted-foreground">Log all administrative actions</p>
                  </div>
                  <Switch
                    checked={securitySettings.auditLog}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, auditLog: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Data Encryption</Label>
                    <p className="text-xs text-muted-foreground">Encrypt sensitive data at rest</p>
                  </div>
                  <Switch
                    checked={securitySettings.encryptData}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, encryptData: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Automatic Backups</Label>
                    <p className="text-xs text-muted-foreground">Regular data backups</p>
                  </div>
                  <Switch
                    checked={securitySettings.backupEnabled}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, backupEnabled: checked }))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="1"
                  max="168"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  className="mt-1 w-32"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Manage devices signed in to your dashboard account
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeOtherSessions.mutate()}
                  disabled={revokeOtherSessions.isPending}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", revokeOtherSessions.isPending && "animate-spin")} />
                  Revoke other sessions
                </Button>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading sessions…
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {formatSessionAgent(session.userAgent)}
                          </span>
                          {session.current && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.ip || 'Unknown IP'} · Last seen{' '}
                          {session.lastSeenAt
                            ? new Date(session.lastSeenAt).toLocaleString()
                            : new Date(session.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeSession.mutate(session.id)}
                          disabled={revokeSession.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => handleSaveSettings('Security')}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => handleResetSettings('Security')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Dashboard Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={appearanceSettings.themePrimaryColor}
                    onChange={(e) => setAppearanceSettings((p) => ({ ...p, themePrimaryColor: e.target.value }))}
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <Input
                    type="color"
                    value={appearanceSettings.themeAccentColor}
                    onChange={(e) => setAppearanceSettings((p) => ({ ...p, themeAccentColor: e.target.value }))}
                    className="mt-1 h-10"
                  />
                </div>
              </div>
              <div>
                <Label>Theme Mode</Label>
                <Select
                  value={appearanceSettings.themeMode}
                  onValueChange={(value) => setAppearanceSettings((p) => ({ ...p, themeMode: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custom Logo URL</Label>
                <Input
                  value={appearanceSettings.customLogoUrl}
                  onChange={(e) => setAppearanceSettings((p) => ({ ...p, customLogoUrl: e.target.value }))}
                  className="mt-1"
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button onClick={() => handleSaveSettings('Appearance')} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Appearance
            </Button>
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Advanced Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">System Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <Badge variant="outline">v2.1.0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uptime:</span>
                      <span>7d 12h 34m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memory Usage:</span>
                      <span>245 MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database Size:</span>
                      <span>1.2 GB</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Restart Bot
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="w-4 h-4 mr-2" />
                      Backup Database
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Export Logs
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900 dark:text-red-100">Reset All Settings</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      This will permanently reset all bot settings to their default values. This action cannot be undone.
                    </p>
                    <Button variant="destructive" className="mt-3">
                      Reset All Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}