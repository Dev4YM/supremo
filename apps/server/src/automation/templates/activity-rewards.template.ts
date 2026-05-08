export const activityRewardsTemplate = {
  key: 'activity_rewards',
  name: 'Activity Rewards',
  description: 'Award role and send congratulations when user reaches message milestone',
  category: 'engagement',
  icon: '🎉',
  tags: ['engagement', 'rewards', 'milestone'],
  defaultWorkflow: {
    entryPoint: 'check_milestone',
    blocks: [
      {
        id: 'check_milestone',
        type: 'condition',
        config: {
          expression: 'user.messageCount >= {milestoneCount}',
        },
        onTrue: 'award_role',
        onFalse: 'end',
      },
      {
        id: 'award_role',
        type: 'add_role',
        config: {
          roleId: '{rewardRoleId}',
          reason: 'Message milestone reached',
        },
        onSuccess: 'send_congrats',
      },
      {
        id: 'send_congrats',
        type: 'send_message',
        config: {
          channelId: '{announcementChannelId}',
          content: '🎉 Congratulations {mention}! You\'ve reached {milestoneCount} messages!',
        },
      },
    ],
  },
  configurableFields: {
    milestoneCount: {
      type: 'number',
      label: 'Message Milestone',
      description: 'Number of messages required',
      default: 100,
      required: true,
    },
    rewardRoleId: {
      type: 'string',
      label: 'Reward Role ID',
      description: 'Role to award',
      required: true,
    },
    announcementChannelId: {
      type: 'string',
      label: 'Announcement Channel ID',
      description: 'Channel to post congratulations',
      required: true,
    },
  },
};

