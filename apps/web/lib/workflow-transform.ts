export interface WorkflowBuilderNode {
  id: string
  type: 'trigger' | 'condition' | 'action' | 'delay'
  subtype?: string
  name: string
  config: Record<string, unknown>
}

export interface WorkflowBuilderState {
  name: string
  description: string
  nodes: WorkflowBuilderNode[]
}

const TRIGGER_TYPE_MAP: Record<string, string> = {
  member_join: 'member_join',
  message_create: 'message_sent',
  message_sent: 'message_sent',
  reaction_add: 'role_added',
  scheduled: 'member_join',
  button_click: 'message_sent',
}

const ACTION_TYPE_MAP: Record<string, string> = {
  send_message: 'send_message',
  add_role: 'add_role',
  remove_role: 'remove_role',
  timeout_user: 'timeout',
  timeout: 'timeout',
  delete_message: 'delete_message',
  create_channel: 'create_channel',
  delay: 'wait',
  wait: 'wait',
  warn: 'warn',
  send_dm: 'send_dm',
}

const SUPPORTED_ACTIONS = new Set([
  'send_message',
  'send_dm',
  'add_role',
  'remove_role',
  'timeout',
  'warn',
  'delete_message',
  'create_channel',
  'update_channel',
  'create_role',
  'wait',
  'create_incident',
  'update_trust_score',
])

function normalizeActionConfig(node: WorkflowBuilderNode): Record<string, unknown> {
  const config = { ...node.config }
  const subtype = node.subtype || ''

  if (subtype === 'timeout_user' || subtype === 'timeout') {
    const minutes = Number(config.duration ?? 60)
    return {
      ...config,
      durationSeconds: minutes * 60,
      reason: config.reason || 'Automated timeout',
    }
  }

  if (subtype === 'delay' || subtype === 'wait') {
    const duration = Number(config.duration ?? 1)
    const unit = String(config.unit || 'seconds')
    const multiplier = unit === 'hours' ? 3600 : unit === 'minutes' ? 60 : 1
    return { durationSeconds: duration * multiplier }
  }

  if (subtype === 'send_message') {
    return {
      channelId: config.channel,
      content: config.content,
      type: config.embed ? 'embed' : 'text',
      embed: config.embed,
    }
  }

  return config
}

export function transformWorkflowToApiPayload(workflow: WorkflowBuilderState) {
  const triggerNode = workflow.nodes.find((n) => n.type === 'trigger')
  if (!triggerNode) {
    throw new Error('Workflow must include at least one trigger')
  }

  const triggerSubtype = triggerNode.subtype || 'member_join'
  const triggerType = TRIGGER_TYPE_MAP[triggerSubtype] || triggerSubtype

  const executableNodes = workflow.nodes.filter(
    (n) => n.type === 'action' || n.type === 'delay',
  )

  const unsupported = executableNodes.filter((n) => {
    const mapped = ACTION_TYPE_MAP[n.subtype || ''] || n.subtype || ''
    return !SUPPORTED_ACTIONS.has(mapped)
  })

  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported action types: ${unsupported.map((n) => n.subtype || n.name).join(', ')}`,
    )
  }

  const blocks = executableNodes.map((node, index) => {
    const blockType = ACTION_TYPE_MAP[node.subtype || ''] || node.subtype || 'send_message'
    const next = executableNodes[index + 1]
    return {
      id: node.id,
      type: blockType,
      config: normalizeActionConfig(node),
      onSuccess: next?.id,
    }
  })

  const workflowDef = {
    entryPoint: blocks[0]?.id || 'noop',
    blocks: blocks.length > 0 ? blocks : [{ id: 'noop', type: 'wait', config: { durationSeconds: 0 } }],
  }

  return {
    name: workflow.name,
    description: workflow.description,
    enabled: true,
    type: 'workflow',
    triggerType,
    triggerConfig: triggerNode.config,
    workflow: workflowDef,
  }
}

export function parseAutomationToBuilder(automation: {
  name: string
  description?: string | null
  triggerType: string
  triggerConfig?: string | null
  workflow?: string | null
}): WorkflowBuilderState {
  const triggerConfig = automation.triggerConfig ? JSON.parse(automation.triggerConfig) : {}
  const workflowDef = automation.workflow ? JSON.parse(automation.workflow) : { blocks: [] }

  const triggerNode: WorkflowBuilderNode = {
    id: 'trigger_main',
    type: 'trigger',
    subtype: automation.triggerType === 'message_sent' ? 'message_create' : automation.triggerType,
    name: `Trigger: ${automation.triggerType}`,
    config: triggerConfig,
  }

  const actionNodes: WorkflowBuilderNode[] = (workflowDef.blocks || []).map(
    (block: { id: string; type: string; config?: Record<string, unknown> }) => ({
      id: block.id,
      type: block.type === 'wait' ? 'delay' : 'action',
      subtype: block.type === 'wait' ? 'delay' : block.type,
      name: block.type,
      config: block.config || {},
    }),
  )

  return {
    name: automation.name,
    description: automation.description || '',
    nodes: [triggerNode, ...actionNodes],
  }
}
