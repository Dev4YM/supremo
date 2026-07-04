"use client"

import { useParams, useRouter } from "next/navigation"
import { WorkflowBuilder } from "@/components/automation/workflow-builder"
import { useAutomation, useUpdateAutomation } from "@/lib/hooks/use-api"
import { parseAutomationToBuilder, transformWorkflowToApiPayload } from "@/lib/workflow-transform"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function EditWorkflowPage() {
  const params = useParams()
  const router = useRouter()
  const automationId = String(params.id)
  const { data: automation, isLoading, isError } = useAutomation(automationId)
  const updateAutomation = useUpdateAutomation()

  const handleSave = async (workflow: any) => {
    try {
      const payload = transformWorkflowToApiPayload(workflow)
      await updateAutomation.mutateAsync({
        id: automationId,
        data: payload,
      })
      toast.success('Automation updated')
      router.push('/dashboard/automation')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update automation')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading workflow…
      </div>
    )
  }

  if (isError || !automation) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Could not load automation.
      </div>
    )
  }

  const initialWorkflow = parseAutomationToBuilder(automation as {
    name: string
    description?: string | null
    triggerType: string
    triggerConfig?: string | null
    workflow?: string | null
  })

  return (
    <div className="h-screen">
      <WorkflowBuilder
        initialWorkflow={initialWorkflow}
        onSave={handleSave}
        onCancel={() => router.push('/dashboard/automation')}
      />
    </div>
  )
}
