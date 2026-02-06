import React from 'react';
import { SystemSummary } from '../../src/types/health';
import { Card, Icon } from '../Shared';

const statusStyles: Record<SystemSummary['status'], string> = {
  OPTIMAL: 'bg-emerald-100 text-emerald-700',
  ATTENTION: 'bg-amber-100 text-amber-700',
  CONCERN: 'bg-rose-100 text-rose-700',
};

export const SystemCard: React.FC<{
  summary: SystemSummary;
  onClick?: () => void;
}> = ({ summary, onClick }) => {
  const optimalPct = summary.markerCount > 0
    ? Math.round((summary.optimalCount / summary.markerCount) * 100)
    : 0;

  return (
    <Card
      onClick={onClick}
      className="group relative overflow-hidden border-stone-100 bg-gradient-to-br from-white via-amber-50/40 to-emerald-50/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 text-cream flex items-center justify-center shadow-sm">
            <Icon name={summary.icon} className="text-lg" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">{summary.displayName}</p>
            <p className="text-xs text-stone-500">{summary.markerCount} markers</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${statusStyles[summary.status]}`}>
          {summary.status}
        </span>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
          <span>{summary.optimalCount} optimal</span>
          <span>{optimalPct}% in range</span>
        </div>
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-2 bg-emerald-500" style={{ width: `${optimalPct}%` }} />
        </div>
      </div>
      <div className="absolute -right-6 -bottom-10 w-20 h-20 rounded-full bg-emerald-200/30 blur-2xl group-hover:scale-110 transition-transform" />
    </Card>
  );
};
