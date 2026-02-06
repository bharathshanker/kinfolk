import React from 'react';
import { HealthPhysical } from '../../src/types/health';
import { Card, Icon, Button } from '../Shared';

const metricBlock = (label: string, value: string, accent: string) => (
  <div className="bg-white/80 border border-stone-100 rounded-2xl p-3">
    <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">{label}</p>
    <p className={`text-lg font-semibold ${accent}`}>{value}</p>
  </div>
);

export const PhysicalsCard: React.FC<{
  latest?: HealthPhysical;
  onAdd: () => void;
}> = ({ latest, onAdd }) => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-stone-50 via-white to-emerald-50/40 border-stone-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow">
            <Icon name="monitor_weight" className="text-xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Physical Snapshot</p>
            <p className="text-xs text-stone-500">{latest ? `Updated ${latest.measurementDate}` : 'No entries yet'}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Icon name="add" className="text-base" /> Log
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricBlock('Weight', latest?.weightKg ? `${latest.weightKg} kg` : '--', 'text-stone-800')}
        {metricBlock('BMI', latest?.bmi ? `${latest.bmi}` : '--', 'text-emerald-700')}
        {metricBlock('Blood Pressure', latest?.bpSystolic ? `${latest.bpSystolic}/${latest.bpDiastolic}` : '--', 'text-rose-700')}
        {metricBlock('Resting HR', latest?.restingHr ? `${latest.restingHr} bpm` : '--', 'text-indigo-700')}
      </div>
    </Card>
  );
};
