# Frontend Customization Guide

This guide covers how to customize the Supremo Discord Bot frontend dashboard.

## Branding & Theme Customization

### Accessing Branding Settings

Navigate to `/settings/branding` in your dashboard to access the branding customization interface.

### Bot Appearance

- **Bot Display Name**: Set a custom name for your bot in this guild
- **Bot Avatar URL**: Upload a custom avatar image
- **Bot Status Message**: Custom status message displayed by the bot
- **Command Prefix**: Set a custom command prefix (if not using slash commands)

### Theme & Colors

- **Theme Mode**: Choose between Light, Dark, or Auto (follows system preference)
- **Primary Color**: Main brand color used throughout the dashboard
- **Secondary Color**: Secondary brand color
- **Accent Color**: Accent color for highlights and CTAs

### Dashboard Customization

- **Custom Logo**: Upload your own logo to replace the Supremo logo
- **Custom Favicon**: Set a custom favicon for the browser tab
- **Hide Branding**: Enable white-label mode to hide Supremo branding

### Embed Customization

- **Default Embed Color**: Color used for Discord embeds
- **Embed Footer Text**: Default footer text for embeds
- **Embed Footer Icon**: Icon displayed in embed footers

### Advanced Options

- **Custom Domain**: Configure a custom domain for white-label deployment

## API Integration

The frontend uses React Query for all API calls. See `web/lib/api/` for API client implementations.

### Using React Query Hooks

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { guildsApi } from '@/lib/api/guilds';

// Query example
const { data, isLoading, error } = useQuery({
  queryKey: ['guilds'],
  queryFn: () => guildsApi.getUserGuilds().then(res => res.data),
});

// Mutation example
const mutation = useMutation({
  mutationFn: (data) => guildsApi.updateBranding(data).then(res => res.data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['guild-branding'] });
  },
});
```

## Internationalization

The frontend supports multiple languages. See `web/i18n/` for translation files.

### Adding Translations

1. Add your locale to `web/i18n/config.ts`
2. Create translation file in `web/i18n/locales/[locale].json`
3. Use the `useTranslation` hook in components:

```typescript
import { useTranslation } from '@/i18n/hooks';

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('common.save')}</div>;
}
```

## Theme Context

The `ThemeContext` provides access to theme and branding settings:

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, colors, branding, updateBranding } = useTheme();
  // Use theme values
}
```

## Custom Components

All reusable components are in `web/components/`. Follow the existing patterns for consistency.

## Development

See `web/README.md` for development setup instructions.

