export const theme = {
  colors: {
    primary: '#0066CC',
    primaryDark: '#004A9F',
    primaryLight: '#E8F0FE',
    accent: '#0099E5',
    background: '#F7F9FC',
    surface: '#FFFFFF',
    border: '#DDE3ED',
    textPrimary: '#1A2332',
    textSecondary: '#5A6A80',
    textMuted: '#8E9BB0',
    success: '#00875A',
    error: '#DE350B',
    warning: '#FF8B00',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '22px',
      xxl: '28px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.10)',
    lg: '0 8px 24px rgba(0,0,0,0.12)',
  },
} as const;

export type Theme = typeof theme;
