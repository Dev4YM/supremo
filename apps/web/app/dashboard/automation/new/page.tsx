"use client"

import { useState } from "react"
import { WorkflowBuilder } from "@/components/automation/workflow-builder"
import { useCreateAutomation } from "@/lib/hooks/use-api"
import { transformWorkflowToApiPayload } from "@/lib/workflow-transform"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function NewWorkflowPage() {
  const router = useRouter()
  const createAutomationMutation = useCreateAutomation()

  const handleSave = async (workflow: any) => {
    try {
      const payload = transformWorkflowToApiPayload(workflow)
      await createAutomationMutation.mutateAsync(payload)
      toast.success('Automation created successfully!')
      router.push('/dashboard/automation')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create automation')
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/automation')
  }

  return (
    <div className="h-screen">
      <WorkflowBuilder
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
