'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getAuthState } from '@/lib/auth';
import { useGuilds } from '@/lib/hooks/use-api';

const getPageInfo = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  
  const pageMap: Record<string, { title: string; description?: string; action?: string }> = {
    'dashboard': { 
      title: 'Overview', 
      description: 'Monitor your server\'s health and activity',
      action: 'Create Report'
    },
    'moderation': { 
      title: 'Moderation', 
      description: 'Manage moderation rules and actions',
      action: 'New Rule'
    },
    'users': { 
      title: 'Users', 
      description: 'View and manage server members',
      action: 'Add User'
    },
    'incidents': { 
      title: 'Incidents', 
      description: 'Review and resolve reported incidents',
      action: 'Report Incident'
    },
    'automation': { 
      title: 'Automation', 
      description: 'Create and manage automated workflows',
      action: 'New Workflow'
    },
    'analytics': { 
      title: 'Analytics', 
      description: 'Detailed insights and performance metrics',
      action: 'Export Data'
    },
    'settings': { 
      title: 'Settings', 
      description: 'Configure your bot and server preferences',
      action: 'Save Changes'
    },
  };

  const currentPage = segments[segments.length - 1] || 'dashboard';
  return pageMap[currentPage] || { title: 'Dashboard', description: 'Supremo Bot Dashboard' };
};

const getBreadcrumbs = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' }
  ];

  if (segments.length > 1) {
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const href = '/' + segments.slice(0, i + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, href });
    }
  }

  return breadcrumbs;
};

export function DashboardHeader() {
  const pathname = usePathname();
  const { selectedGuildId } = getAuthState();
  const { data: guilds } = useGuilds();
  
  const pageInfo = getPageInfo(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);
  const selectedGuild = guilds?.find((guild: { id: string }) => guild.id === selectedGuildId);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        <SidebarTrigger />
        
        <div className="flex items-center gap-2 text-sm">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <BreadcrumbItem key={breadcrumb.href}>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink href={breadcrumb.href}>
                        {breadcrumb.label}
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users, incidents..."
              className="w-64 pl-9"
            />
          </div>

          {/* Server Status */}
          {selectedGuild && (
            <div className="hidden lg:flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Online
              </Badge>
              <span className="text-sm text-muted-foreground">
                {selectedGuild.name}
              </span>
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          {/* Quick Action */}
          {pageInfo.action && (
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {pageInfo.action}
            </Button>
          )}
        </div>
      </div>

      {/* Page Title */}
      <div className="px-6 py-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pageInfo.title}</h1>
            {pageInfo.description && (
              <p className="text-muted-foreground mt-1">{pageInfo.description}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}