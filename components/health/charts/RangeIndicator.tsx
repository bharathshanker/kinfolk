import React from 'react';
import { HealthMarker, HealthValueStatus } from '../../../src/types/health';

const statusColors: Record<HealthValueStatus, string> = {
  OPTIMAL: 'bg-emerald-500',
  NORMAL: 'bg-sky-500',
  LOW: 'bg-amber-500',
  HIGH: 'bg-rose-500',
  UNKNOWN: 'bg-stone-300',
};

export const RangeIndicator: React.FC<{
  marker?: HealthMarker | null;
  value?: number | null;
  status: HealthValueStatus;
}> = ({ marker, value, status }) => {
  if (!marker || value === null || value === undefined) {
    return (
      <div className="h-2 w-full rounded-full bg-stone-100">
        <div className={`h-2 rounded-full ${statusColors[status]} opacity-50`} style={{ width: '15%' }} />
      </div>
    );
  }

  const min = marker.labMin ?? marker.optimalMin ?? value;
  const max = marker.labMax ?? marker.optimalMax ?? value;
  const optimalMin = marker.optimalMin ?? min;
  const optimalMax = marker.optimalMax ?? max;

  const range = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const optStart = Math.min(100, Math.max(0, ((optimalMin - min) / range) * 100));
  const optWidth = Math.min(100, Math.max(0, ((optimalMax - optimalMin) / range) * 100));

  return (
    <div className="relative h-2 w-full rounded-full bg-stone-100 overflow-hidden">
      <div
        className="absolute top-0 h-full bg-emerald-200/70"
        style={{ left: `${optStart}%`, width: `${optWidth}%` }}
      />
      <div
        className={`absolute -top-1 h-4 w-4 rounded-full border-2 border-white shadow ${statusColors[status]}`}
        style={{ left: `calc(${pct}% - 8px)` }}
      />
    </div>
  );
};
