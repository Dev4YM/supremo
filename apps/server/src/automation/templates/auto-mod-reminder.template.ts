export const autoModReminderTemplate = {
  key: 'auto_mod_reminder',
  name: 'Auto-Moderation Reminder',
  description: 'Send warning when trust score drops below threshold',
  category: 'moderation',
  icon: '⚠️',
  tags: ['moderation', 'trust_score', 'warning'],
  defaultWorkflow: {
    entryPoint: 'check_trust_score',
    blocks: [
      {
        id: 'check_trust_score',
        type: 'condition',
        config: {
          expression: 'user.trustScore < {minTrustScore}',
        },
        onTrue: 'send_warning',
        onFalse: 'end',
      },
      {
        id: 'send_warning',
        type: 'send_dm',
        config: {
          content: '⚠️ Your trust score has dropped below {minTrustScore}. Please review our rules.',
        },
        onSuccess: 'create_incident',
      },
      {
        id: 'create_incident',
        type: 'create_incident',
        config: {
          ruleTriggered: 'Low Trust Score',
          confidenceScore: 0.8,
          recommendedAction: 'warn',
          reasoning: 'Trust score below threshold',
        },
      },
    ],
  },
  configurableFields: {
    minTrustScore: {
      type: 'number',
      label: 'Minimum Trust Score',
      description: 'Threshold for trust score warning',
      default: 50,
      required: true,
    },
  },
};

