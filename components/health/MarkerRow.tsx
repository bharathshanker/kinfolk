import React from 'react';
import { HealthValue } from '../../src/types/health';
import { RangeIndicator } from './charts/RangeIndicator';

const statusLabel: Record<HealthValue['status'], string> = {
  OPTIMAL: 'Optimal',
  NORMAL: 'Normal',
  LOW: 'Low',
  HIGH: 'High',
  UNKNOWN: 'Unknown',
};

const statusBadge: Record<HealthValue['status'], string> = {
  OPTIMAL: 'bg-emerald-100 text-emerald-700',
  NORMAL: 'bg-sky-100 text-sky-700',
  LOW: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-rose-100 text-rose-700',
  UNKNOWN: 'bg-stone-100 text-stone-500',
};

export const MarkerRow: React.FC<{ value: HealthValue }> = ({ value }) => {
  const displayValue = value.value !== null && value.value !== undefined
    ? value.value
    : value.valueText || '--';

  return (
    <div className="grid grid-cols-12 gap-4 items-center py-3 border-b border-stone-100 last:border-b-0">
      <div className="col-span-4">
        <p className="font-semibold text-stone-800">{value.marker?.name || value.markerName || value.markerCode}</p>
        <p className="text-xs text-stone-400">{value.marker?.unit || value.unit || ''}</p>
      </div>
      <div className="col-span-2 text-sm font-semibold text-stone-700">{displayValue}</div>
      <div className="col-span-4">
        <RangeIndicator marker={value.marker} value={value.value} status={value.status} />
      </div>
      <div className="col-span-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadge[value.status]}`}>
          {statusLabel[value.status]}
        </span>
      </div>
    </div>
  );
};
