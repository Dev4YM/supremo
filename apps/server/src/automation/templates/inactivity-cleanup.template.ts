export const inactivityCleanupTemplate = {
  key: 'inactivity_cleanup',
  name: 'Inactivity Cleanup',
  description: 'Remove roles from inactive users and send re-engagement DM',
  category: 'moderation',
  icon: '🧹',
  tags: ['cleanup', 'inactivity', 'maintenance'],
  defaultWorkflow: {
    entryPoint: 'check_inactivity',
    blocks: [
      {
        id: 'check_inactivity',
        type: 'condition',
        config: {
          expression: 'user.lastActivity < new Date(Date.now() - {inactiveDays} * 24 * 60 * 60 * 1000)',
        },
        onTrue: 'remove_roles',
        onFalse: 'end',
      },
      {
        id: 'remove_roles',
        type: 'remove_role',
        config: {
          roleId: '{roleToRemove}',
          reason: 'Inactivity cleanup',
        },
        onSuccess: 'send_dm',
      },
      {
        id: 'send_dm',
        type: 'send_dm',
        config: {
          content: '👋 We noticed you haven\'t been active recently. We\'ve removed some roles, but you\'re always welcome back!',
        },
      },
    ],
  },
  configurableFields: {
    inactiveDays: {
      type: 'number',
      label: 'Inactive Days',
      description: 'Number of days of inactivity before cleanup',
      default: 30,
      required: true,
    },
    roleToRemove: {
      type: 'string',
      label: 'Role to Remove',
      description: 'Role ID to remove from inactive users',
      required: true,
    },
  },
};

