import React from 'react';
import styled from 'styled-components';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint: string;
  loading?: boolean;
}

export function KpiCard({ label, value, hint, loading = false }: KpiCardProps) {
  return (
    <Card>
      <Label>{label}</Label>
      <Value>{loading ? <Shimmer /> : value}</Value>
      <Hint>{hint}</Hint>
    </Card>
  );
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  min-height: 124px;
  transition:
    box-shadow 0.12s ease,
    transform 0.12s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.md};
    transform: translateY(-1px);
  }
`;

const Label = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textSecondary};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Value = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  font-variant-numeric: tabular-nums;
  min-height: 36px;
  display: flex;
  align-items: center;
`;

const Hint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Shimmer = styled.span`
  display: inline-block;
  width: 65%;
  height: 20px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.background} 0%,
    ${({ theme }) => theme.colors.border} 50%,
    ${({ theme }) => theme.colors.background} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
`;
