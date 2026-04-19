import { Toaster } from 'react-hot-toast';
import { useTheme } from 'styled-components';
import type { Theme } from '../styles/theme';

/**
 * Theme-aware toast host. Must render inside ThemeProvider.
 */
export function AppToaster() {
  const theme = useTheme() as Theme;

  return (
    <Toaster
      position="top-right"
      containerStyle={{ top: 24, right: 24 }}
      toastOptions={{
        duration: 3000,
        style: {
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.textPrimary,
          borderRadius: theme.radius.md,
          boxShadow: theme.shadow.md,
          padding: '12px 16px',
        },
        success: {
          style: {
            background: theme.colors.successMuted,
            border: `1px solid color-mix(in srgb, ${theme.colors.success} 28%, transparent)`,
          },
          iconTheme: {
            primary: theme.colors.success,
            secondary: theme.colors.successMuted,
          },
        },
        error: {
          style: {
            background: `color-mix(in srgb, ${theme.colors.error} 14%, ${theme.colors.surface})`,
            border: `1px solid color-mix(in srgb, ${theme.colors.error} 30%, transparent)`,
          },
          iconTheme: {
            primary: theme.colors.error,
            secondary: theme.colors.surface,
          },
        },
      }}
    />
  );
}
