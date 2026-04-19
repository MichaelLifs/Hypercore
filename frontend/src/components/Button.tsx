import styled, { css } from 'styled-components';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  $variant?: Variant;
  $size?: Size;
}

const sizeStyles = {
  sm: css`
    padding: 6px 12px;
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  `,
  md: css`
    padding: 10px 20px;
    font-size: ${({ theme }) => theme.typography.fontSize.base};
  `,
  lg: css`
    padding: 13px 28px;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
  `,
};

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    border: 1.5px solid transparent;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.primaryDark};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    border: 1.5px solid ${({ theme }) => theme.colors.primary};

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.primaryLight};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textSecondary};
    border: 1.5px solid transparent;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.textPrimary};
    }
  `,
};

export const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $variant = 'primary' }) => variantStyles[$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;
