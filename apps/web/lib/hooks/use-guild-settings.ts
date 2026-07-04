import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useBranding,
  useUpdateBranding,
  useConfigs,
  useCreateConfig,
} from './use-api'

const CONFIG_CATEGORY = 'dashboard_settings'

function parseConfigValue(value: string | undefined, fallback: unknown) {
  if (value === undefined) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function useGuildSettings() {
  const { data: branding, isLoading: brandingLoading } = useBranding()
  const { data: configs = [], isLoading: configsLoading } = useConfigs()
  const updateBranding = useUpdateBranding()
  const saveConfig = useCreateConfig()

  const configMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const row of configs as Array<{ key: string; value: string }>) {
      map[row.key] = row.value
    }
    return map
  }, [configs])

  const [generalSettings, setGeneralSettings] = useState({
    botName: 'Supremo Bot',
    description: 'Advanced Discord moderation and automation bot',
    prefix: '!',
    language: 'en',
    timezone: 'UTC',
    status: 'online',
    activity: 'Watching over the server',
  })

  const [moderationSettings, setModerationSettings] = useState({
    autoMod: true,
    antiSpam: true,
    antiRaid: true,
    autoRole: false,
    welcomeMessage: true,
    leaveMessage: false,
    logChannel: '',
    muteRole: '',
    maxWarnings: 3,
    autoTimeout: true,
  })

  const [notificationSettings, setNotificationSettings] = useState({
    discordNotifications: true,
    emailNotifications: false,
    webhookNotifications: true,
    incidentAlerts: true,
    systemAlerts: true,
    maintenanceAlerts: false,
    webhookUrl: '',
  })

  const [appearanceSettings, setAppearanceSettings] = useState({
    themePrimaryColor: '#5865F2',
    themeSecondaryColor: '#4752C4',
    themeAccentColor: '#00AFF4',
    themeMode: 'dark',
    customLogoUrl: '',
    embedColor: '#5865F2',
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 24,
    ipWhitelist: false,
    auditLog: true,
    encryptData: true,
    backupEnabled: true,
    allowedIPs: [] as string[],
  })

  useEffect(() => {
    if (!branding) return
    setGeneralSettings((prev) => ({
      ...prev,
      botName: branding.botDisplayName || prev.botName,
      description: branding.embedFooterText || prev.description,
      prefix: branding.commandPrefix || prev.prefix,
      activity: branding.botStatusMessage || prev.activity,
    }))
    setAppearanceSettings({
      themePrimaryColor: branding.themePrimaryColor || '#5865F2',
      themeSecondaryColor: branding.themeSecondaryColor || '#4752C4',
      themeAccentColor: branding.themeAccentColor || '#00AFF4',
      themeMode: branding.themeMode || 'dark',
      customLogoUrl: branding.customLogoUrl || '',
      embedColor: branding.embedColor || '#5865F2',
    })
  }, [branding])

  useEffect(() => {
    if (!configs.length) return
    setGeneralSettings((prev) => ({
      ...prev,
      language: parseConfigValue(configMap['settings.language'], prev.language) as string,
      timezone: parseConfigValue(configMap['settings.timezone'], prev.timezone) as string,
      status: parseConfigValue(configMap['settings.bot_status'], prev.status) as string,
    }))
    setModerationSettings((prev) => ({
      ...prev,
      ...((parseConfigValue(configMap['settings.moderation'], prev) as typeof prev) || prev),
    }))
    setNotificationSettings((prev) => ({
      ...prev,
      ...((parseConfigValue(configMap['settings.notifications'], prev) as typeof prev) || prev),
    }))
    setSecuritySettings((prev) => ({
      ...prev,
      ...((parseConfigValue(configMap['settings.security'], prev) as typeof prev) || prev),
    }))
  }, [configs, configMap])

  const persistConfig = async (key: string, value: unknown) => {
    await saveConfig.mutateAsync({
      key,
      value: JSON.stringify(value),
      category: CONFIG_CATEGORY,
    })
  }

  const saveGeneral = async () => {
    await updateBranding.mutateAsync({
      botDisplayName: generalSettings.botName,
      botStatusMessage: generalSettings.activity,
      commandPrefix: generalSettings.prefix,
      embedFooterText: generalSettings.description,
    })
    await persistConfig('settings.language', generalSettings.language)
    await persistConfig('settings.timezone', generalSettings.timezone)
    await persistConfig('settings.bot_status', generalSettings.status)
    toast.success('General settings saved')
  }

  const saveModeration = async () => {
    await persistConfig('settings.moderation', moderationSettings)
    toast.success('Moderation preferences saved')
  }

  const saveNotifications = async () => {
    await persistConfig('settings.notifications', notificationSettings)
    toast.success('Notification settings saved')
  }

  const saveAppearance = async () => {
    await updateBranding.mutateAsync({
      themePrimaryColor: appearanceSettings.themePrimaryColor,
      themeSecondaryColor: appearanceSettings.themeSecondaryColor,
      themeAccentColor: appearanceSettings.themeAccentColor,
      themeMode: appearanceSettings.themeMode,
      customLogoUrl: appearanceSettings.customLogoUrl || undefined,
      embedColor: appearanceSettings.embedColor,
    })
    toast.success('Appearance settings saved')
  }

  const saveSecurity = async () => {
    await persistConfig('settings.security', securitySettings)
    toast.success('Security preferences saved')
  }

  return {
    isLoading: brandingLoading || configsLoading,
    generalSettings,
    setGeneralSettings,
    moderationSettings,
    setModerationSettings,
    notificationSettings,
    setNotificationSettings,
    appearanceSettings,
    setAppearanceSettings,
    securitySettings,
    setSecuritySettings,
    saveGeneral,
    saveModeration,
    saveNotifications,
    saveAppearance,
    saveSecurity,
    isSaving: updateBranding.isPending || saveConfig.isPending,
  }
}
