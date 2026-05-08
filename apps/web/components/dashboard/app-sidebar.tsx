'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  BarChart3,
  Users,
  Settings,
  Bot,
  Zap,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth, useLogout, useGuilds } from '@/lib/hooks/use-api';
import { getAuthState, setSelectedGuild } from '@/lib/auth';

const navigationItems = [
  {
    title: 'Overview',
    icon: BarChart3,
    href: '/dashboard',
    badge: null,
  },
  {
    title: 'Moderation',
    icon: Shield,
    href: '/dashboard/moderation',
    badge: null,
  },
  {
    title: 'Users',
    icon: Users,
    href: '/dashboard/users',
    badge: null,
  },
  {
    title: 'Incidents',
    icon: AlertTriangle,
    href: '/dashboard/incidents',
    badge: 'New',
  },
  {
    title: 'Automation',
    icon: Zap,
    href: '/dashboard/automation',
    badge: null,
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    href: '/dashboard/analytics',
    badge: null,
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
    badge: null,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: user } = useAuth();
  const { data: guilds } = useGuilds();
  const logoutMutation = useLogout();
  const [selectedGuildId, setSelectedGuildId] = useState(() => {
    const { selectedGuildId } = getAuthState();
    return selectedGuildId;
  });

  const selectedGuild = guilds?.find((guild: { id: string }) => guild.id === selectedGuildId) || guilds?.[0];

  const handleGuildChange = (guildId: string) => {
    setSelectedGuildId(guildId);
    setSelectedGuild(guildId);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Supremo Bot</h2>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Guild Selector */}
        <SidebarGroup>
          <SidebarGroupLabel>Server</SidebarGroupLabel>
          <SidebarGroupContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedGuild?.iconUrl} />
                      <AvatarFallback>
                        {selectedGuild?.name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium truncate max-w-32">
                        {selectedGuild?.name || 'Select Server'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {guilds?.length || 0} servers
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {guilds?.map((guild: { id: string; name: string; iconUrl?: string }) => (
                  <DropdownMenuItem
                    key={guild.id}
                    onClick={() => handleGuildChange(guild.id)}
                    className="flex items-center gap-3 p-3"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={guild.iconUrl} />
                      <AvatarFallback>{guild.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{guild.name}</span>
                    {guild.id === selectedGuildId && (
                      <Badge variant="secondary" className="ml-auto">
                        Active
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="w-full"
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/incidents/new" className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Report Incident</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/automation/new" className="flex items-center gap-3">
                    <Bot className="w-4 h-4" />
                    <span>Create Workflow</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left flex-1">
                <p className="text-sm font-medium truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{user?.discriminator || '0000'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/help" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Help & Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}