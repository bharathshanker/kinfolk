import React from 'react';
import { HealthRatio } from '../../src/types/health';
import { Card, Icon } from '../Shared';

export const RatiosCard: React.FC<{
  ratios: HealthRatio[];
}> = ({ ratios }) => {
  return (
    <Card className="bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 border-stone-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-stone-800">Calculated Ratios</p>
          <p className="text-xs text-stone-400">Auto-computed from latest report</p>
        </div>
        <Icon name="function" className="text-stone-300" />
      </div>
      {ratios.length === 0 ? (
        <p className="text-sm text-stone-400">Upload a report to see ratios.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ratios.map(ratio => (
            <div key={ratio.id} className="p-3 rounded-2xl bg-white border border-stone-100">
              <p className="text-xs uppercase tracking-wider text-stone-400 font-bold">{ratio.name}</p>
              <p className="text-lg font-semibold text-stone-800">{ratio.value}</p>
              <p className="text-[11px] text-stone-400">{ratio.formula}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
