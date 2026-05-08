export const welcomePackageTemplate = {
  key: 'welcome_package',
  name: 'Welcome Package',
  description: 'Send welcome message, assign role, and send DM with server rules',
  category: 'welcome',
  icon: '👋',
  tags: ['welcome', 'onboarding', 'member_join'],
  defaultWorkflow: {
    entryPoint: 'send_welcome',
    blocks: [
      {
        id: 'send_welcome',
        type: 'send_message',
        config: {
          channelId: '{channelId}',
          type: 'embed',
          embed: {
            title: 'Welcome to {guild}!',
            description: 'Welcome {mention}! We\'re excited to have you here.',
            color: '#00FF00',
            fields: [
              {
                name: 'Getting Started',
                value: 'Check out our rules channel and introduce yourself!',
                inline: false,
              },
            ],
          },
        },
        onSuccess: 'assign_role',
      },
      {
        id: 'assign_role',
        type: 'add_role',
        config: {
          roleId: '{newMemberRoleId}',
          reason: 'Welcome package automation',
        },
        onSuccess: 'send_dm',
      },
      {
        id: 'send_dm',
        type: 'send_dm',
        config: {
          content: 'Welcome to {guild}! Please read our rules and have fun!',
        },
      },
    ],
  },
  configurableFields: {
    channelId: {
      type: 'string',
      label: 'Welcome Channel ID',
      description: 'Channel to send welcome message',
      required: true,
    },
    newMemberRoleId: {
      type: 'string',
      label: 'New Member Role ID',
      description: 'Role to assign to new members',
      required: true,
    },
  },
};

