import React, { useId, useMemo } from 'react';
import * as d3 from 'd3';
import { useChartSize } from './useChartSize';

interface DataPoint {
  date: string;
  value: number;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseHealthDate = (raw: string): Date | null => {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const dateOnly = trimmed.match(DATE_ONLY_RE);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatValueLabel = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1000) return d3.format(',.0f')(value);
  if (abs >= 100) return d3.format('.0f')(value);
  if (abs >= 10) return d3.format('.1f')(value);
  return d3.format('.2f')(value);
};

export const MarkerTrendChart: React.FC<{
  data: DataPoint[];
  optimalRange?: { min: number; max: number };
  height?: number;
}> = ({ data, optimalRange, height = 180 }) => {
  const { ref, width } = useChartSize();
  const clipId = useId();

  const chart = useMemo(() => {
    if (!width || data.length === 0) return null;

    const margin = { top: 24, right: 14, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const parsed = data
      .map(d => ({
        date: parseHealthDate(d.date),
        value: Number(d.value),
      }))
      .filter((point): point is { date: Date; value: number } => Boolean(point.date) && Number.isFinite(point.value))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (parsed.length === 0) return null;

    const xDomain = d3.extent(parsed, d => d.date) as [Date, Date];
    const yMin = d3.min(parsed, d => d.value) ?? 0;
    const yMax = d3.max(parsed, d => d.value) ?? 0;
    const pad = (yMax - yMin) * 0.2 || 1;

    const x = d3.scaleTime().domain(xDomain).range([0, innerWidth]);
    const yDomain: [number, number] = [yMin - pad, yMax + pad];
    const y = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    const line = d3.line<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const uniqueDates = Array.from(new Set(parsed.map(point => point.date.getTime())))
      .sort((a, b) => a - b)
      .map(timestamp => new Date(timestamp));
    const ticks = uniqueDates.length <= 5 ? uniqueDates : x.ticks(5);

    // Choose date format based on data time span
    const spanMs = xDomain[1].getTime() - xDomain[0].getTime();
    const spanDays = spanMs / (1000 * 60 * 60 * 24);
    const dateFormat = spanDays > 365
      ? d3.utcFormat('%b %Y')
      : spanDays > 30
        ? d3.utcFormat('%d %b %Y')
        : d3.utcFormat('%d %b');

    return { margin, innerWidth, innerHeight, parsed, x, y, line, ticks, yDomain, dateFormat };
  }, [data, height, width]);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {chart && (
        <svg width={width} height={height} className="overflow-hidden">
          <defs>
            <clipPath id={clipId}>
              <rect width={chart.innerWidth} height={chart.innerHeight} />
            </clipPath>
          </defs>
          <g transform={`translate(${chart.margin.left}, ${chart.margin.top})`}>
            <g clipPath={`url(#${clipId})`}>
              {optimalRange && (() => {
                const clampedMin = Math.min(Math.max(optimalRange.min, chart.yDomain[0]), chart.yDomain[1]);
                const clampedMax = Math.min(Math.max(optimalRange.max, chart.yDomain[0]), chart.yDomain[1]);
                const top = chart.y(clampedMax);
                const bottom = chart.y(clampedMin);
                const bandHeight = bottom - top;
                if (bandHeight <= 0) return null;
                return (
                  <g>
                    <rect
                      x={0}
                      y={top}
                      width={chart.innerWidth}
                      height={bandHeight}
                      fill="rgba(16, 185, 129, 0.12)"
                    />
                    {/* Optimal range label */}
                    <text
                      x={chart.innerWidth - 4}
                      y={top + 12}
                      textAnchor="end"
                      fontSize="9"
                      fill="#059669"
                      opacity={0.7}
                      fontWeight={600}
                    >
                      Optimal {formatValueLabel(optimalRange.min)}–{formatValueLabel(optimalRange.max)}
                    </text>
                  </g>
                );
              })()}
              <path d={chart.line(chart.parsed) || ''} fill="none" stroke="#0F766E" strokeWidth={2.5} />
              {chart.parsed.map((point, idx) => (
                <circle
                  key={idx}
                  cx={chart.x(point.date)}
                  cy={chart.y(point.value)}
                  r={4}
                  fill="#0F766E"
                  stroke="#ECFDF5"
                  strokeWidth={2}
                />
              ))}
            </g>
            <g transform={`translate(0, ${chart.innerHeight})`}>
              {chart.ticks.map((tick, idx) => (
                <g key={idx} transform={`translate(${chart.x(tick)}, 0)`}>
                  <line y2="6" stroke="#D6D3D1" />
                  <text y="18" textAnchor="middle" fontSize="10" fill="#78716C">
                    {chart.dateFormat(tick)}
                  </text>
                </g>
              ))}
            </g>
            {chart.parsed.map((point, idx) => (
              <text
                key={`value-${idx}`}
                x={chart.x(point.date)}
                y={chart.y(point.value) - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#0F766E"
                fontWeight={600}
              >
                {formatValueLabel(point.value)}
              </text>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
};
