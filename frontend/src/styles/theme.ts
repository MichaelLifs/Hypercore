export type ColorMode = 'light' | 'dark';

const shared = {
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
  breakpoints: {
    sm: '640px',
    md: '900px',
    lg: '1200px',
  },
} as const;

const lightColors = {
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
  successMuted: '#E6F4EA',
  error: '#DE350B',
  warning: '#FF8B00',
  heroScrim:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(247, 249, 252, 0.06) 28%, transparent 52%), linear-gradient(180deg, transparent 42%, transparent 58%, rgba(26, 35, 50, 0.14) 100%)',
};

const darkColors = {
  primary: '#4DA3FF',
  primaryDark: '#2B8AE8',
  primaryLight: 'rgba(77, 163, 255, 0.14)',
  accent: '#5BC0F5',
  background: '#0C1017',
  surface: '#141B26',
  border: '#2A3545',
  textPrimary: '#E8EDF4',
  textSecondary: '#9BA8B8',
  textMuted: '#7A8799',
  success: '#3DDC9A',
  successMuted: 'rgba(61, 220, 154, 0.14)',
  error: '#FF6B4A',
  warning: '#FFB020',
  heroScrim:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(12, 16, 23, 0.2) 32%, transparent 52%), linear-gradient(180deg, transparent 40%, transparent 58%, rgba(0, 0, 0, 0.45) 100%)',
};

const lightShadow = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.10)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
};

const darkShadow = {
  sm: '0 1px 3px rgba(0,0,0,0.45)',
  md: '0 4px 14px rgba(0,0,0,0.55)',
  lg: '0 12px 40px rgba(0,0,0,0.65)',
};

export function createAppTheme(mode: ColorMode) {
  const colors = mode === 'dark' ? darkColors : lightColors;
  const shadow = mode === 'dark' ? darkShadow : lightShadow;
  return {
    mode,
    colors,
    ...shared,
    shadow,
  };
}

export type Theme = ReturnType<typeof createAppTheme>;
