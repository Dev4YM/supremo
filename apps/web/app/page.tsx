'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Bot, Zap, Users, BarChart3, Settings, ArrowRight, Github, ExternalLink } from 'lucide-react';
import { getAuthState, getDiscordOAuthUrl } from '@/lib/auth';
import Link from 'next/link';

const features = [
  {
    icon: Shield,
    title: 'Advanced Moderation',
    description: 'AI-powered content analysis with human oversight. Never auto-punish, always assist.',
    badge: 'Core Feature'
  },
  {
    icon: Bot,
    title: 'Smart Automation',
    description: 'Visual workflow builder with drag-and-drop automation for repetitive tasks.',
    badge: 'Automation'
  },
  {
    icon: Users,
    title: 'Trust System',
    description: 'Dynamic user reputation and trust scoring based on behavior patterns.',
    badge: 'Intelligence'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Comprehensive analytics with real-time monitoring and trend analysis.',
    badge: 'Analytics'
  },
  {
    icon: Zap,
    title: 'Real-time Processing',
    description: 'Instant event processing with WebSocket updates and live notifications.',
    badge: 'Performance'
  },
  {
    icon: Settings,
    title: 'Highly Configurable',
    description: 'Extensive configuration options to match your community\'s unique needs.',
    badge: 'Customization'
  }
];

const stats = [
  { label: 'Discord Servers', value: '1,000+' },
  { label: 'Active Users', value: '50K+' },
  { label: 'Incidents Handled', value: '100K+' },
  { label: 'Uptime', value: '99.9%' }
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const { isAuthenticated } = getAuthState();
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async () => {
    try {
      const oauthUrl = await getDiscordOAuthUrl();
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Failed to get Discord OAuth URL:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Supremo Bot</h1>
                <p className="text-xs text-muted-foreground">Discord Moderation Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="https://github.com/yourusername/supremo-discord-bot" target="_blank">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Link>
              </Button>
              <Button onClick={handleLogin} className="gap-2">
                <Bot className="w-4 h-4" />
                Login with Discord
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            Open Source • Multi-Tenant • Production Ready
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            The Ultimate Discord
            <br />
            <span className="text-primary">Moderation Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered moderation with human oversight. Never auto-punish, always assist. 
            Built for communities that value transparency and control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} className="gap-2">
              <Bot className="w-5 h-5" />
              Get Started with Discord
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage and moderate your Discord community effectively
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl mb-2">Human-in-the-Loop Philosophy</CardTitle>
            <CardDescription className="text-base">
              Technology should assist, not replace, human moderators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400">Never Auto-Punish</h4>
                    <p className="text-sm text-muted-foreground">All destructive actions require human approval</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400">Full Transparency</h4>
                    <p className="text-sm text-muted-foreground">Every decision is logged and explainable</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-700 dark:text-purple-400">Configurable</h4>
                    <p className="text-sm text-muted-foreground">Adapt to your community's unique needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-700 dark:text-orange-400">Open Source</h4>
                    <p className="text-sm text-muted-foreground">Complete freedom to modify and improve</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto text-center bg-primary text-primary-foreground">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Discord Server?</h2>
            <p className="mb-6 opacity-90">
              Join thousands of communities already using Supremo for safer, more manageable Discord servers.
            </p>
            <Button size="lg" variant="secondary" onClick={handleLogin} className="gap-2">
              <Bot className="w-5 h-5" />
              Start Your Free Trial
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Supremo Bot</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="https://github.com/yourusername/supremo-discord-bot" className="hover:text-foreground transition-colors">
                GitHub
              </Link>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            © 2024 Supremo Bot. Built with ❤️ for the Discord Community. Licensed under MIT.
          </div>
        </div>
      </footer>
    </div>
  );
}