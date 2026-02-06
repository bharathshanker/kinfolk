import React, { useId, useMemo } from 'react';
import * as d3 from 'd3';
import { useChartSize } from './useChartSize';

interface DataPoint {
  date: string;
  value: number;
}

export const MarkerTrendChart: React.FC<{
  data: DataPoint[];
  optimalRange?: { min: number; max: number };
  height?: number;
}> = ({ data, optimalRange, height = 180 }) => {
  const { ref, width } = useChartSize();
  const clipId = useId();

  const chart = useMemo(() => {
    if (!width || data.length === 0) return null;

    const margin = { top: 16, right: 12, bottom: 28, left: 36 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const parsed = data.map(d => ({ date: new Date(d.date), value: d.value }));
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

    const ticks = x.ticks(Math.min(5, parsed.length));

    return { margin, innerWidth, innerHeight, parsed, x, y, line, ticks, yDomain };
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
                  <rect
                    x={0}
                    y={top}
                    width={chart.innerWidth}
                    height={bandHeight}
                    fill="rgba(16, 185, 129, 0.12)"
                  />
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
                    {d3.timeFormat('%b %d')(tick)}
                  </text>
                </g>
              ))}
            </g>
          </g>
        </svg>
      )}
    </div>
  );
};
