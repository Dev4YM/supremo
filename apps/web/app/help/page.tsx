"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  HelpCircle, 
  Search, 
  Book, 
  MessageSquare, 
  Mail,
  ExternalLink,
  Shield,
  Bot,
  Users,
  Settings,
  Zap,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const faqCategories = [
  {
    title: "Getting Started",
    icon: Book,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    questions: [
      { q: "How do I set up the bot?", a: "Follow our setup guide to invite and configure the bot." },
      { q: "What permissions does the bot need?", a: "The bot requires administrator permissions for full functionality." },
      { q: "How do I select a server?", a: "Use the server dropdown in the sidebar to switch between servers." },
    ]
  },
  {
    title: "Moderation",
    icon: Shield,
    color: "text-red-500", 
    bg: "bg-red-500/10",
    questions: [
      { q: "How do I ban a user?", a: "Use the /ban command or the moderation panel in the dashboard." },
      { q: "Can I set temporary bans?", a: "Yes, you can specify a duration when issuing bans." },
      { q: "How do warnings work?", a: "Warnings are tracked and can trigger automatic actions." },
    ]
  },
  {
    title: "Automation",
    icon: Bot,
    color: "text-purple-500",
    bg: "bg-purple-500/10", 
    questions: [
      { q: "How do I create a workflow?", a: "Go to Automation > Create Workflow and choose a template or build from scratch." },
      { q: "What triggers are available?", a: "Member join/leave, message events, reactions, button clicks, and more." },
      { q: "Can I test workflows?", a: "Yes, use the test feature to simulate workflow execution." },
    ]
  },
  {
    title: "Settings",
    icon: Settings,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    questions: [
      { q: "How do I configure AutoMod?", a: "Visit Settings > AutoMod to configure spam detection and filters." },
      { q: "Can I customize notifications?", a: "Yes, you can enable/disable specific notification types in settings." },
      { q: "How do I set up webhooks?", a: "Add your Discord webhook URLs in the Settings > Webhooks section." },
    ]
  },
]

const quickLinks = [
  { title: "User Guide", description: "Complete documentation", icon: Book, href: "#" },
  { title: "Video Tutorials", description: "Step-by-step guides", icon: ExternalLink, href: "#" },
  { title: "Discord Server", description: "Community support", icon: MessageSquare, href: "#" },
  { title: "Contact Support", description: "Get direct help", icon: Mail, href: "#" },
]

const supportStats = [
  { label: "Response Time", value: "< 2 hours", icon: MessageSquare, color: "text-emerald-500" },
  { label: "Articles", value: "150+", icon: Book, color: "text-blue-500" },
  { label: "Community", value: "10K+", icon: Users, color: "text-purple-500" },
  { label: "Satisfaction", value: "98%", icon: HelpCircle, color: "text-amber-500" },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[1800px] mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground text-lg">
              Get help with Supremo Bot and learn how to make the most of your Discord server
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for help articles, guides, and FAQs..."
                className="h-12 pl-12 text-base border-border/50 bg-secondary/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
          {supportStats.map((stat) => (
            <Card key={stat.label} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/50", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((link) => (
                <Button
                  key={link.title}
                  variant="outline"
                  className="h-auto p-6 border-border/50 bg-transparent hover:bg-secondary/40"
                  asChild
                >
                  <Link href={link.href}>
                    <div className="text-center space-y-3">
                      <div className="flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <link.icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{link.title}</p>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </div>
                    </div>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ Categories */}
        <div className="grid gap-6 lg:grid-cols-2">
          {faqCategories.map((category) => (
            <Card key={category.title} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", category.bg)}>
                    <category.icon className={cn("h-5 w-5", category.color)} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{category.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{category.questions.length} articles</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {category.questions.map((item, index) => (
                    <div key={index} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                      <p className="font-medium text-sm mb-2">{item.q}</p>
                      <p className="text-xs text-muted-foreground">{item.a}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 border-border/50 bg-transparent">
                  View All {category.title} Articles
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="text-center">
              <CardTitle>Still Need Help?</CardTitle>
              <p className="text-muted-foreground">Our support team is here to help you succeed</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Join Discord Server
              </Button>
              <Button variant="outline" className="gap-2 border-border/50 bg-transparent">
                <Mail className="h-4 w-4" />
                Email Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}