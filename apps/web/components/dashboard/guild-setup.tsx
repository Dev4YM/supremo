"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Plus, 
  Server, 
  Users, 
  Shield,
  Settings,
  ExternalLink,
} from "lucide-react"
import { useConnectGuild, useDiscordGuild } from "@/lib/hooks/use-api"
import { useGuildContext } from "@/components/providers/guild-provider"

export function GuildSetup() {
  const { guilds, isLoading } = useGuildContext();
  const connectGuildMutation = useConnectGuild();

  // Mock Discord guilds that the bot is in but user hasn't connected to the dashboard
  const availableGuilds = [
    { 
      id: "1234567890", 
      name: "Super Developers", 
      icon: null, 
      memberCount: 3,
      botAdded: true 
    }
  ];

  const handleConnectGuild = (discordGuildId: string) => {
    connectGuildMutation.mutate(discordGuildId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your servers...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Supremo!</CardTitle>
            <p className="text-muted-foreground">
              Connect your Discord server to get started with advanced moderation and automation.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Available Servers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                These are Discord servers where Supremo Bot is installed:
              </p>
            </div>

            <div className="space-y-3">
              {availableGuilds.map((guild) => (
                <div
                  key={guild.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/20"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={guild.icon ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {guild.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{guild.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {guild.memberCount} members
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bot is installed and ready to use
                    </p>
                  </div>

                  <Button 
                    onClick={() => handleConnectGuild(guild.id)}
                    disabled={connectGuildMutation.isPending}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Connect
                  </Button>
                </div>
              ))}
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Don't see your server? Make sure Supremo Bot is added to your Discord server first.
              </p>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Add Bot to Server
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null; // If guilds exist, don't show setup
}