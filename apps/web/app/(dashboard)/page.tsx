import { StatsCards, ServerHealthCard } from "@/components/dashboard/stats-cards"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { RecentActions } from "@/components/dashboard/recent-actions"
import { ModeratorsPanel } from "@/components/dashboard/moderators-panel"
import { ChannelActivity } from "@/components/dashboard/channel-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsCards />
      
      {/* Server Health */}
      <ServerHealthCard />

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <div>
          <ModeratorsPanel />
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActions />
        <ChannelActivity />
      </div>
    </div>
  )
}
