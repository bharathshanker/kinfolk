import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { useChartSize } from './useChartSize';

interface Series {
  label: string;
  color: string;
  data: { date: string; value: number }[];
}

export const MultiMarkerChart: React.FC<{
  series: Series[];
  height?: number;
  normalize?: boolean;
}> = ({ series, height = 240, normalize = false }) => {
  const { ref, width } = useChartSize();

  const chart = useMemo(() => {
    if (!width || series.length === 0) return null;

    const margin = { top: 24, right: 20, bottom: 32, left: 36 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const allPoints = series.flatMap(s => s.data.map(d => ({ date: new Date(d.date), value: d.value })));
    if (allPoints.length === 0) return null;

    const xDomain = d3.extent(allPoints, d => d.date) as [Date, Date];
    const x = d3.scaleTime().domain(xDomain).range([0, innerWidth]);

    const yDomain = normalize
      ? [0, 1]
      : [
          d3.min(allPoints, d => d.value) ?? 0,
          d3.max(allPoints, d => d.value) ?? 1,
        ];
    const pad = normalize ? 0 : (yDomain[1] - yDomain[0]) * 0.2 || 1;
    const y = d3
      .scaleLinear()
      .domain([yDomain[0] - pad, yDomain[1] + pad])
      .range([innerHeight, 0]);

    const format = d3.timeFormat('%b %d');

    const line = d3
      .line<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const preparedSeries = series.map(s => {
      const points = s.data.map(d => ({ date: new Date(d.date), value: d.value }));
      const min = d3.min(points, p => p.value) ?? 0;
      const max = d3.max(points, p => p.value) ?? 1;
      const normalized = normalize && max !== min
        ? points.map(p => ({ ...p, value: (p.value - min) / (max - min) }))
        : points;
      return { ...s, points: normalized };
    });

    return { margin, innerWidth, innerHeight, x, y, line, format, preparedSeries };
  }, [height, normalize, series, width]);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {chart && (
        <svg width={width} height={height}>
          <g transform={`translate(${chart.margin.left}, ${chart.margin.top})`}>
            {chart.preparedSeries.map((s, idx) => (
              <path
                key={idx}
                d={chart.line(s.points) || ''}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
              />
            ))}
            <g transform={`translate(0, ${chart.innerHeight})`}>
              {chart.x.ticks(4).map((tick, idx) => (
                <g key={idx} transform={`translate(${chart.x(tick)}, 0)`}>
                  <line y2="6" stroke="#D6D3D1" />
                  <text y="18" textAnchor="middle" fontSize="10" fill="#78716C">
                    {chart.format(tick)}
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
