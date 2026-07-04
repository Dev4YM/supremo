'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getRealtimeSocket, disconnectRealtimeSocket } from '@/lib/realtime'
import { queryKeys } from '@/lib/hooks/use-api'
import { useGuildContext } from './guild-provider'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { selectedGuildId } = useGuildContext()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!selectedGuildId) {
      disconnectRealtimeSocket()
      return
    }

    const socket = getRealtimeSocket()

    const invalidateIncidents = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() })
    }

    const invalidateActions = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.list() })
    }

    const invalidateTrust = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.trustReputation.config })
    }

    const onConnect = () => {
      socket.emit('subscribe_guild', selectedGuildId)
    }

    const onIncidentCreated = () => {
      invalidateIncidents()
      toast.info('New incident detected', { duration: 4000 })
    }

    const onIncidentUpdated = () => {
      invalidateIncidents()
    }

    const onActionQueued = () => {
      invalidateActions()
    }

    const onActionCompleted = () => {
      invalidateActions()
      toast.success('Moderation action completed', { duration: 3000 })
    }

    const onTrustUpdated = () => {
      invalidateTrust()
    }

    socket.on('connect', onConnect)
    socket.on('incident_created', onIncidentCreated)
    socket.on('incident_updated', onIncidentUpdated)
    socket.on('action_queued', onActionQueued)
    socket.on('action_completed', onActionCompleted)
    socket.on('trust_score_updated', onTrustUpdated)

    if (!socket.connected) {
      socket.connect()
    } else {
      socket.emit('subscribe_guild', selectedGuildId)
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('incident_created', onIncidentCreated)
      socket.off('incident_updated', onIncidentUpdated)
      socket.off('action_queued', onActionQueued)
      socket.off('action_completed', onActionCompleted)
      socket.off('trust_score_updated', onTrustUpdated)
      socket.emit('unsubscribe_guild', selectedGuildId)
    }
  }, [selectedGuildId, queryClient])

  return <>{children}</>
}
