export const dailyAnnouncementTemplate = {
  key: 'daily_announcement',
  name: 'Daily Announcement',
  description: 'Post daily stats and announcements',
  category: 'utility',
  icon: '📢',
  tags: ['scheduled', 'announcement', 'stats'],
  defaultWorkflow: {
    entryPoint: 'send_announcement',
    blocks: [
      {
        id: 'send_announcement',
        type: 'send_message',
        config: {
          channelId: '{announcementChannelId}',
          type: 'embed',
          embed: {
            title: '📊 Daily Server Stats',
            description: 'Here are today\'s server statistics!',
            color: '#0099FF',
            fields: [
              {
                name: 'Total Members',
                value: '{guild.memberCount}',
                inline: true,
              },
            ],
            timestamp: true,
          },
        },
      },
    ],
  },
  configurableFields: {
    announcementChannelId: {
      type: 'string',
      label: 'Announcement Channel ID',
      description: 'Channel to post daily announcements',
      required: true,
    },
  },
};

