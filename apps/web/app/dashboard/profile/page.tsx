"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  User,
  Settings,
  Shield,
  Crown,
  Calendar,
  Clock,
  Activity,
  MessageSquare,
  BarChart3,
  Award,
  Star,
  TrendingUp,
  Users,
  Bot,
  Key,
  Bell,
  Eye,
  EyeOff,
  Save,
  Edit,
  Camera,
  Mail,
  Globe,
  MapPin,
  Link as LinkIcon,
  Github,
  Twitter,
  ExternalLink,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-api"
import { toast } from "sonner"

export default function ProfilePage() {
  const { data: user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [editMode, setEditMode] = useState(false)
  const [showToken, setShowToken] = useState(false)
  
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    twitter: user?.twitter || '',
    github: user?.github || '',
  })
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    discordNotifications: true,
    weeklyReports: false,
    maintenanceAlerts: true,
    darkMode: true,
    compactMode: false,
    showOnlineStatus: true,
    allowDirectMessages: true,
  })

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully')
    setEditMode(false)
  }

  const handleSavePreferences = () => {
    toast.success('Preferences saved successfully')
  }

  const stats = {
    guildsManaged: 3,
    incidentsResolved: 127,
    automationsCreated: 15,
    commandsUsed: 2847,
    loginStreak: 45,
    trustScore: 95,
  }

  const achievements = [
    { name: "First Login", description: "Completed first login", icon: User, color: "text-blue-500", earned: true },
    { name: "Guild Master", description: "Manage 5+ guilds", icon: Crown, color: "text-yellow-500", earned: false },
    { name: "Incident Resolver", description: "Resolve 100+ incidents", icon: Shield, color: "text-green-500", earned: true },
    { name: "Automation Expert", description: "Create 10+ automations", icon: Bot, color: "text-purple-500", earned: true },
    { name: "Power User", description: "Use 1000+ commands", icon: Zap, color: "text-orange-500", earned: true },
    { name: "Community Helper", description: "Help 50+ users", icon: Users, color: "text-pink-500", earned: false },
  ]

  const recentActivity = [
    { action: "Resolved incident #1247", time: "2 hours ago", type: "incident" },
    { action: "Created automation 'Welcome Bot'", time: "1 day ago", type: "automation" },
    { action: "Updated user permissions", time: "2 days ago", type: "user" },
    { action: "Exported analytics report", time: "3 days ago", type: "analytics" },
    { action: "Modified server settings", time: "1 week ago", type: "settings" },
  ]

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button size="sm" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
                <Badge variant="outline" className="border-0 bg-primary/10 text-primary">
                  <Crown className="w-3 h-3 mr-1" />
                  Administrator
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">
                @{user.username} • Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </p>
              
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.guildsManaged}</div>
                  <div className="text-sm text-muted-foreground">Guilds Managed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-500">{stats.incidentsResolved}</div>
                  <div className="text-sm text-muted-foreground">Incidents Resolved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-500">{stats.automationsCreated}</div>
                  <div className="text-sm text-muted-foreground">Automations Created</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={() => setEditMode(!editMode)}>
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? 'Cancel' : 'Edit Profile'}
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="City, Country"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Bio</Label>
                      <p className="mt-1">{profileData.bio || 'No bio provided'}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Location</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{profileData.location || 'Not specified'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Discord ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{user.discordId}</code>
                        <Button variant="ghost" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={profileData.website}
                        onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourwebsite.com"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        value={profileData.twitter}
                        onChange={(e) => setProfileData(prev => ({ ...prev, twitter: e.target.value }))}
                        placeholder="@yourusername"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="github">GitHub</Label>
                      <Input
                        id="github"
                        value={profileData.github}
                        onChange={(e) => setProfileData(prev => ({ ...prev, github: e.target.value }))}
                        placeholder="yourusername"
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    {profileData.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                          {profileData.website}
                        </a>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    
                    {profileData.twitter && (
                      <div className="flex items-center gap-2">
                        <Twitter className="w-4 h-4 text-muted-foreground" />
                        <a href={`https://twitter.com/${profileData.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                          {profileData.twitter}
                        </a>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    
                    {profileData.github && (
                      <div className="flex items-center gap-2">
                        <Github className="w-4 h-4 text-muted-foreground" />
                        <a href={`https://github.com/${profileData.github}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                          {profileData.github}
                        </a>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    
                    {!profileData.website && !profileData.twitter && !profileData.github && (
                      <p className="text-sm text-muted-foreground">No social links added</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-secondary/20">
                    <MessageSquare className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.commandsUsed.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Commands Used</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-secondary/20">
                    <Clock className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.loginStreak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-secondary/20">
                    <Shield className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.incidentsResolved}</div>
                    <div className="text-sm text-muted-foreground">Incidents Resolved</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-secondary/20">
                    <Bot className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.automationsCreated}</div>
                    <div className="text-sm text-muted-foreground">Automations Created</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-secondary/20">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        activity.type === 'incident' && "bg-red-500/10 text-red-500",
                        activity.type === 'automation' && "bg-purple-500/10 text-purple-500",
                        activity.type === 'user' && "bg-blue-500/10 text-blue-500",
                        activity.type === 'analytics' && "bg-green-500/10 text-green-500",
                        activity.type === 'settings' && "bg-orange-500/10 text-orange-500"
                      )}>
                        {activity.type === 'incident' && <Shield className="w-4 h-4" />}
                        {activity.type === 'automation' && <Bot className="w-4 h-4" />}
                        {activity.type === 'user' && <Users className="w-4 h-4" />}
                        {activity.type === 'analytics' && <BarChart3 className="w-4 h-4" />}
                        {activity.type === 'settings' && <Settings className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.action}</div>
                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      achievement.earned 
                        ? "bg-secondary/20 border-border/50" 
                        : "bg-muted/20 border-muted opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        achievement.earned ? "bg-primary/10" : "bg-muted"
                      )}>
                        <achievement.icon className={cn(
                          "w-5 h-5",
                          achievement.earned ? achievement.color : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{achievement.name}</div>
                        <div className="text-xs text-muted-foreground">{achievement.description}</div>
                      </div>
                      {achievement.earned && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive important updates via email</p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Discord Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified in Discord DMs</p>
                  </div>
                  <Switch
                    checked={preferences.discordNotifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, discordNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Weekly Reports</Label>
                    <p className="text-xs text-muted-foreground">Receive weekly activity summaries</p>
                  </div>
                  <Switch
                    checked={preferences.weeklyReports}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, weeklyReports: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Maintenance Alerts</Label>
                    <p className="text-xs text-muted-foreground">Get notified about system maintenance</p>
                  </div>
                  <Switch
                    checked={preferences.maintenanceAlerts}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, maintenanceAlerts: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dashboard Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">Use dark theme for the dashboard</p>
                  </div>
                  <Switch
                    checked={preferences.darkMode}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, darkMode: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Compact Mode</Label>
                    <p className="text-xs text-muted-foreground">Use compact layout with smaller spacing</p>
                  </div>
                  <Switch
                    checked={preferences.compactMode}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, compactMode: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Show Online Status</Label>
                    <p className="text-xs text-muted-foreground">Display your online status to other users</p>
                  </div>
                  <Switch
                    checked={preferences.showOnlineStatus}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, showOnlineStatus: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSavePreferences}>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
            <Button variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Enable 2FA
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm font-medium">API Token</Label>
                  <p className="text-xs text-muted-foreground mb-2">Personal API token for external integrations</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showToken ? "text" : "password"}
                      value="sk_live_51234567890abcdefghijklmnopqrstuvwxyz"
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
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Login Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { device: "Chrome on Windows", location: "New York, US", current: true, lastActive: "Now" },
                  { device: "Firefox on Linux", location: "London, UK", current: false, lastActive: "2 hours ago" },
                  { device: "Safari on macOS", location: "San Francisco, US", current: false, lastActive: "1 day ago" },
                ].map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        session.current ? "bg-green-500" : "bg-muted-foreground"
                      )} />
                      <div>
                        <div className="text-sm font-medium">{session.device}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.location} • {session.lastActive}
                        </div>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="outline" size="sm">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-900 dark:text-red-100">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-red-900 dark:text-red-100">Log Out All Sessions</Label>
                    <p className="text-xs text-red-700 dark:text-red-300">Sign out from all devices and browsers</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out All
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-red-900 dark:text-red-100">Delete Account</Label>
                    <p className="text-xs text-red-700 dark:text-red-300">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}