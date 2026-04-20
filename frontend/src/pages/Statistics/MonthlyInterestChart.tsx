import React, { useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import type { Theme } from '../../styles/theme';

interface MonthlyInterestPoint {
  month: string;
  interest: number;
}

interface MonthlyInterestChartProps {
  data: MonthlyInterestPoint[];
}

interface ChartPoint extends MonthlyInterestPoint {
  x: number;
  y: number;
  label: string;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const PADDING = { top: 20, right: 18, bottom: 34, left: 56 };
const GRID_LINES = 4;

const tooltipCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function MonthlyInterestChart({ data }: MonthlyInterestChartProps) {
  const theme = useTheme() as Theme;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = useMemo(() => buildChartData(data), [data]);

  if (chart.points.length === 0) {
    return <EmptyState>No repayment schedule data available yet.</EmptyState>;
  }

  const activePoint = activeIndex !== null ? chart.points[activeIndex] : null;
  const tooltipRightAligned = activePoint !== null && activePoint.x > CHART_WIDTH * 0.72;

  return (
    <ChartWrap role="img" aria-label="Monthly interest over time chart">
      <Svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="interestAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.2" />
            <stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick, index) => (
          <g key={tick.value}>
            <GridLine
              x1={PADDING.left}
              y1={tick.y}
              x2={CHART_WIDTH - PADDING.right}
              y2={tick.y}
            />
            <TickLabel x={PADDING.left - 8} y={tick.y + (index === chart.yTicks.length - 1 ? -2 : 4)}>
              {formatAxisCurrency(tick.value)}
            </TickLabel>
          </g>
        ))}

        <AxisLine
          x1={PADDING.left}
          y1={CHART_HEIGHT - PADDING.bottom}
          x2={CHART_WIDTH - PADDING.right}
          y2={CHART_HEIGHT - PADDING.bottom}
        />

        {chart.xTicks.map((tick) => (
          <TickLabel key={tick.month} x={tick.x} y={CHART_HEIGHT - 10} textAnchor="middle">
            {tick.label}
          </TickLabel>
        ))}

        <AreaPath d={chart.areaPath} />
        <LinePath d={chart.linePath} />

        {activePoint && (
          <FocusGuide
            x1={activePoint.x}
            y1={PADDING.top}
            x2={activePoint.x}
            y2={CHART_HEIGHT - PADDING.bottom}
          />
        )}

        {chart.points.map((point, index) => (
          <Point
            key={point.month}
            cx={point.x}
            cy={point.y}
            r={activeIndex === index ? '5' : '3.5'}
            data-active={activeIndex === index ? 'true' : 'false'}
          />
        ))}

        <HoverZone
          x={PADDING.left}
          y={PADDING.top}
          width={CHART_WIDTH - PADDING.left - PADDING.right}
          height={CHART_HEIGHT - PADDING.top - PADDING.bottom}
          onMouseMove={(event) => setActiveIndex(getNearestPointIndex(event, chart.points))}
          onMouseLeave={() => setActiveIndex(null)}
        />
      </Svg>

      {activePoint && (
        <Tooltip
          style={{
            left: `${(activePoint.x / CHART_WIDTH) * 100}%`,
            top: `${(activePoint.y / CHART_HEIGHT) * 100}%`,
          }}
          data-right={tooltipRightAligned ? 'true' : 'false'}
        >
          <TooltipMonth>{formatMonth(activePoint.month, 'long')}</TooltipMonth>
          <TooltipValue>{tooltipCurrencyFormatter.format(activePoint.interest)}</TooltipValue>
        </Tooltip>
      )}
    </ChartWrap>
  );
}

function buildChartData(data: MonthlyInterestPoint[]) {
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  if (data.length === 0) {
    return {
      points: [] as ChartPoint[],
      linePath: '',
      areaPath: '',
      yTicks: [] as Array<{ value: number; y: number }>,
      xTicks: [] as Array<{ month: string; x: number; label: string }>,
    };
  }

  const maxInterest = Math.max(...data.map((item) => item.interest), 0);
  const stepSize = getNiceStep(maxInterest / GRID_LINES);
  const chartMax = Math.max(stepSize * GRID_LINES, 1);
  const xStep = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth / 2;
  const baseY = CHART_HEIGHT - PADDING.bottom;

  const points: ChartPoint[] = data.map((item, index) => {
    const x = data.length > 1 ? PADDING.left + xStep * index : PADDING.left + innerWidth / 2;
    const y = PADDING.top + innerHeight - (item.interest / chartMax) * innerHeight;
    return { ...item, x, y, label: formatMonth(item.month, 'short') };
  });

  const linePath = createSmoothPath(points);
  const areaPath = createAreaPath(points, linePath, baseY);

  const yTicks = Array.from({ length: GRID_LINES + 1 }, (_, index) => {
    const ratio = index / GRID_LINES;
    const value = chartMax * (1 - ratio);
    return {
      value,
      y: PADDING.top + innerHeight * ratio,
    };
  });

  const xTicks = points
    .filter((_, index) => {
      if (data.length <= 6) return true;
      const step = Math.ceil(data.length / 6);
      return index % step === 0 || index === data.length - 1;
    })
    .map((point) => ({
      month: point.month,
      x: point.x,
      label: point.label,
    }));

  return { points, linePath, areaPath, yTicks, xTicks };
}

function createSmoothPath(points: ChartPoint[]) {
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y}`;
  }

  const path = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const previousPrevious = points[index - 2] ?? previous;
    const next = points[index + 1] ?? current;

    const cp1x = previous.x + (current.x - previousPrevious.x) / 6;
    const cp1y = previous.y + (current.y - previousPrevious.y) / 6;
    const cp2x = current.x - (next.x - previous.x) / 6;
    const cp2y = current.y - (next.y - previous.y) / 6;

    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`);
  }

  return path.join(' ');
}

function createAreaPath(points: ChartPoint[], linePath: string, baseY: number) {
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${baseY} L ${point.x} ${point.y} L ${point.x} ${baseY} Z`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
}

function getNearestPointIndex(event: React.MouseEvent<SVGRectElement>, points: ChartPoint[]) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const relativeX = (event.clientX - bounds.left) / bounds.width;
  const scaledX = relativeX * CHART_WIDTH;

  let nearestIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const distance = Math.abs(point.x - scaledX);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function getNiceStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;

  if (normalized <= 1) return 1 * magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function formatAxisCurrency(value: number): string {
  if (value === 0) return '$0';
  if (value >= 1_000_000) return `$${trimTrailingZeros((value / 1_000_000).toFixed(1))}M`;
  if (value >= 1_000) return `$${trimTrailingZeros((value / 1_000).toFixed(0))}K`;
  return `$${Math.round(value)}`;
}

function trimTrailingZeros(value: string) {
  return value.replace(/\.0$/, '');
}

function formatMonth(monthIso: string, variant: 'short' | 'long'): string {
  const [yearRaw, monthRaw] = monthIso.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthIso;
  }

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: variant === 'short' ? 'short' : 'short',
    year: variant === 'short' ? '2-digit' : 'numeric',
    timeZone: 'UTC',
  });
}

const ChartWrap = styled.div`
  width: 100%;
  height: 280px;
  position: relative;
`;

const Svg = styled.svg`
  width: 100%;
  height: 100%;
`;

const GridLine = styled.line`
  stroke: ${({ theme }) => theme.colors.border};
  stroke-width: 1;
`;

const AxisLine = styled.line`
  stroke: ${({ theme }) => theme.colors.border};
  stroke-width: 1.5;
`;

const TickLabel = styled.text`
  fill: ${({ theme }) => theme.colors.textMuted};
  font-size: 11px;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-variant-numeric: tabular-nums;
`;

const AreaPath = styled.path`
  fill: url(#interestAreaGradient);
`;

const LinePath = styled.path`
  fill: none;
  stroke: ${({ theme }) => theme.colors.primary};
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const FocusGuide = styled.line`
  stroke: ${({ theme }) => theme.colors.primary};
  stroke-width: 1;
  opacity: 0.22;
  stroke-dasharray: 3 3;
`;

const Point = styled.circle`
  fill: ${({ theme }) => theme.colors.surface};
  stroke: ${({ theme }) => theme.colors.primary};
  stroke-width: 2;
  transition: r 0.12s ease;

  &[data-active='true'] {
    fill: ${({ theme }) => theme.colors.primaryLight};
  }
`;

const HoverZone = styled.rect`
  fill: transparent;
  cursor: crosshair;
`;

const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  pointer-events: none;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  padding: 6px 10px;
  min-width: 108px;
  z-index: 1;

  &[data-right='true'] {
    transform: translate(calc(-100% + 20px), calc(-100% - 14px));
  }
`;

const TooltipMonth = styled.p`
  margin: 0 0 2px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const TooltipValue = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-variant-numeric: tabular-nums;
`;

const EmptyState = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;
