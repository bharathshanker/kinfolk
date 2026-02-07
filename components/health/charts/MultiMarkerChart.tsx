import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { useChartSize } from './useChartSize';

interface Series {
  label: string;
  color: string;
  data: { date: string; value: number }[];
}

interface ChartPoint {
  date: Date;
  value: number;
  labelValue: number;
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

export const MultiMarkerChart: React.FC<{
  series: Series[];
  height?: number;
  normalize?: boolean;
}> = ({ series, height = 240, normalize = false }) => {
  const { ref, width } = useChartSize();

  const chart = useMemo(() => {
    if (!width || series.length === 0) return null;

    const margin = { top: 30, right: 22, bottom: 44, left: 42 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const preparedSeries = series
      .map(s => {
        const parsedPoints = s.data
          .map(d => ({
            date: parseHealthDate(d.date),
            value: Number(d.value),
          }))
          .filter((point): point is { date: Date; value: number } => Boolean(point.date) && Number.isFinite(point.value))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (parsedPoints.length === 0) {
          return { ...s, points: [] as ChartPoint[] };
        }

        const min = d3.min(parsedPoints, point => point.value) ?? 0;
        const max = d3.max(parsedPoints, point => point.value) ?? 0;

        const points = normalize
          ? parsedPoints.map(point => ({
              date: point.date,
              value: max === min ? 0.5 : (point.value - min) / (max - min),
              labelValue: point.value,
            }))
          : parsedPoints.map(point => ({
              date: point.date,
              value: point.value,
              labelValue: point.value,
            }));

        return { ...s, points };
      })
      .filter(s => s.points.length > 0);

    const allPoints = preparedSeries.flatMap(s => s.points);
    if (allPoints.length === 0) return null;

    const xDomain = d3.extent(allPoints, d => d.date) as [Date, Date];
    if (!xDomain[0] || !xDomain[1]) return null;
    const x = d3.scaleTime().domain(xDomain).range([0, innerWidth]);

    const yDomain = normalize
      ? [0, 1]
      : [
          d3.min(allPoints, d => d.value) ?? 0,
          d3.max(allPoints, d => d.value) ?? 1,
        ];
    const pad = normalize ? 0.08 : (yDomain[1] - yDomain[0]) * 0.2 || 1;
    const y = d3
      .scaleLinear()
      .domain([yDomain[0] - pad, yDomain[1] + pad])
      .range([innerHeight, 0]);

    // Choose date format based on data time span
    const spanMs = xDomain[1].getTime() - xDomain[0].getTime();
    const spanDays = spanMs / (1000 * 60 * 60 * 24);
    const dateFormat = spanDays > 365
      ? d3.utcFormat('%b %Y')
      : spanDays > 30
        ? d3.utcFormat('%d %b %Y')
        : d3.utcFormat('%d %b');

    const yTicks = y.ticks(4);
    const uniqueDates = Array.from(new Set(allPoints.map(point => point.date.getTime())))
      .sort((a, b) => a - b)
      .map(timestamp => new Date(timestamp));
    const xTicks = uniqueDates.length <= 6 ? uniqueDates : x.ticks(6);

    const line = d3
      .line<ChartPoint>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    return { margin, innerWidth, innerHeight, x, y, line, dateFormat, preparedSeries, xTicks, yTicks };
  }, [height, normalize, series, width]);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {chart && (
        <svg width={width} height={height}>
          <g transform={`translate(${chart.margin.left}, ${chart.margin.top})`}>
            {chart.yTicks.map((tick, idx) => (
              <g key={`y-${idx}`} transform={`translate(0, ${chart.y(tick)})`}>
                <line x2={chart.innerWidth} stroke="#F1F5F9" />
                <text x={-8} y={3} textAnchor="end" fontSize="10" fill="#A8A29E">
                  {formatValueLabel(tick)}
                </text>
              </g>
            ))}
            {chart.preparedSeries.map((s, idx) => (
              <g key={idx}>
                <path
                  d={chart.line(s.points) || ''}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                />
                {s.points.map((point, pointIdx) => (
                  <g key={`${idx}-${pointIdx}`}>
                    <circle
                      cx={chart.x(point.date)}
                      cy={chart.y(point.value)}
                      r={4}
                      fill={s.color}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                    <text
                      x={chart.x(point.date)}
                      y={chart.y(point.value) - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill={s.color}
                      fontWeight={600}
                    >
                      {formatValueLabel(point.labelValue)}
                    </text>
                  </g>
                ))}
              </g>
            ))}
            <g transform={`translate(0, ${chart.innerHeight})`}>
              {chart.xTicks.map((tick, idx) => (
                <g key={idx} transform={`translate(${chart.x(tick)}, 0)`}>
                  <line y2="6" stroke="#D6D3D1" />
                  <text y="20" textAnchor="middle" fontSize="10" fill="#78716C">
                    {chart.dateFormat(tick)}
                  </text>
                </g>
              ))}
            </g>
            {/* Legend */}
            <g transform="translate(0, -14)">
              {chart.preparedSeries.map((s, idx) => {
                const xOffset = chart.preparedSeries
                  .slice(0, idx)
                  .reduce((acc, prev) => acc + prev.label.length * 6.5 + 24, 0);
                return (
                  <g key={`legend-${idx}`} transform={`translate(${xOffset}, 0)`}>
                    <circle cx={5} cy={0} r={4} fill={s.color} />
                    <text x={14} y={4} fontSize="10" fill="#78716C" fontWeight={500}>
                      {s.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      )}
    </div>
  );
};
