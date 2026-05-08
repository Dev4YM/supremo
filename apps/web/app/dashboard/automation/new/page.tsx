"use client"

import { useState } from "react"
import { WorkflowBuilder } from "@/components/automation/workflow-builder"
import { useCreateAutomation } from "@/lib/hooks/use-api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function NewWorkflowPage() {
  const router = useRouter()
  const createAutomationMutation = useCreateAutomation()

  const handleSave = async (workflow: any) => {
    try {
      await createAutomationMutation.mutateAsync({
        name: workflow.name,
        description: workflow.description,
        enabled: true,
        trigger: workflow.nodes.find((n: any) => n.type === 'trigger'),
        actions: workflow.nodes.filter((n: any) => n.type === 'action'),
        conditions: workflow.nodes.filter((n: any) => n.type === 'condition'),
      })
      
      toast.success('Automation created successfully!')
      router.push('/dashboard/automation')
    } catch (error) {
      toast.error('Failed to create automation')
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