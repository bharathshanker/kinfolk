import React from 'react';
import { HealthMarker, HealthValueStatus } from '../../../src/types/health';

const statusColors: Record<HealthValueStatus, string> = {
  OPTIMAL: 'bg-emerald-500',
  NORMAL: 'bg-sky-500',
  LOW: 'bg-amber-500',
  HIGH: 'bg-rose-500',
  UNKNOWN: 'bg-stone-300',
};

const formatRangeValue = (value: number) => {
  if (!Number.isFinite(value)) return '--';
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const formatRange = (min: number, max: number) => `${formatRangeValue(min)}-${formatRangeValue(max)}`;

export const RangeIndicator: React.FC<{
  marker?: HealthMarker | null;
  value?: number | null;
  status: HealthValueStatus;
}> = ({ marker, value, status }) => {
  if (!marker || value === null || value === undefined) {
    return (
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-stone-100">
          <div className={`h-2 rounded-full ${statusColors[status]} opacity-50`} style={{ width: '15%' }} />
        </div>
        <p className="text-[10px] text-stone-400">Range unavailable</p>
      </div>
    );
  }

  const min = marker.labMin ?? marker.optimalMin ?? value;
  const max = marker.labMax ?? marker.optimalMax ?? value;
  const optimalMin = marker.optimalMin ?? min;
  const optimalMax = marker.optimalMax ?? max;
  const hasLabRange = marker.labMin !== null && marker.labMin !== undefined && marker.labMax !== null && marker.labMax !== undefined;
  const hasOptimalRange = marker.optimalMin !== null && marker.optimalMin !== undefined && marker.optimalMax !== null && marker.optimalMax !== undefined;

  const range = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const optStart = Math.min(100, Math.max(0, ((optimalMin - min) / range) * 100));
  const optWidth = Math.min(100, Math.max(0, ((optimalMax - optimalMin) / range) * 100));

  return (
    <div className="space-y-1.5">
      {/* Range bar with boundary labels */}
      <div className="relative">
        {/* Min / Max boundary labels above bar */}
        <div className="flex justify-between text-[9px] text-stone-400 mb-0.5 px-0.5">
          <span>{formatRangeValue(min)}</span>
          <span>{formatRangeValue(max)}</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-stone-100 overflow-hidden">
          {/* Optimal range band */}
          <div
            className="absolute top-0 h-full bg-emerald-200/70 rounded-full"
            style={{ left: `${optStart}%`, width: `${optWidth}%` }}
          />
          {/* "Optimal" label centered on the green band (only if wide enough) */}
          {hasOptimalRange && optWidth > 20 && (
            <span
              className="absolute top-0 h-full flex items-center justify-center text-[8px] font-semibold text-emerald-700 pointer-events-none select-none"
              style={{ left: `${optStart}%`, width: `${optWidth}%` }}
            >
              Optimal
            </span>
          )}
          {/* Current value dot */}
          <div
            className={`absolute -top-0.5 h-4 w-4 rounded-full border-2 border-white shadow ${statusColors[status]}`}
            style={{ left: `calc(${pct}% - 8px)` }}
          />
        </div>
      </div>
      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-x-3 text-[10px] leading-none">
        <span className="text-stone-400">
          {hasLabRange ? `Lab ${formatRange(marker.labMin as number, marker.labMax as number)}` : 'Lab n/a'}
        </span>
        <span className="text-emerald-600 font-medium">
          {hasOptimalRange ? `Optimal ${formatRange(marker.optimalMin as number, marker.optimalMax as number)}` : 'Optimal n/a'}
        </span>
        <span className="text-stone-500 font-semibold">
          You: {formatRangeValue(value)}
        </span>
      </div>
    </div>
  );
};
