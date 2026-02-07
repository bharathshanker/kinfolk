import React, { useEffect, useMemo, useState } from 'react';
import { HealthReport, SystemSummary } from '../../src/types/health';
import { Modal, Icon, Button } from '../Shared';
import { MarkerRow } from './MarkerRow';
import { MarkerTrendChart } from './charts/MarkerTrendChart';

export const SystemDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  summary: SystemSummary | null;
  reports: HealthReport[];
}> = ({ isOpen, onClose, summary, reports }) => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCode(null);
  }, [isOpen, summary?.system]);

  const trendData = useMemo(() => {
    if (!summary || !selectedCode) return [];
    const points: { date: string; value: number }[] = [];
    reports.forEach(report => {
      report.values.forEach(value => {
        if (
          value.markerCode === selectedCode &&
          value.value !== null &&
          value.value !== undefined &&
          Number.isFinite(Number(value.value)) &&
          value.testDate
        ) {
          points.push({ date: value.testDate, value: Number(value.value) });
        }
      });
    });
    // Deduplicate by date (keep latest value per date)
    const byDate = new Map<string, { date: string; value: number }>();
    points.forEach(p => byDate.set(p.date, p));
    return Array.from(byDate.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports, selectedCode, summary]);

  const selectedMarker = summary?.markers.find(value => value.markerCode === selectedCode)?.marker;
  const selectedMarkerHasRange = selectedMarker?.optimalMin !== null
    && selectedMarker?.optimalMin !== undefined
    && selectedMarker?.optimalMax !== null
    && selectedMarker?.optimalMax !== undefined;

  if (!summary) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${summary.displayName} Overview`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Latest report</p>
            <p className="text-sm font-semibold text-stone-700">
              {reports[0]?.testDate || 'No recent report'}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setSelectedCode(null)}>
            <Icon name="timeline" className="text-lg" /> Reset chart
          </Button>
        </div>

        {selectedCode && trendData.length > 0 ? (
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-stone-700">{selectedMarker?.name || selectedCode}</p>
              <span className="text-xs text-stone-400">{selectedMarker?.unit}</span>
            </div>
            <MarkerTrendChart
              data={trendData}
              optimalRange={selectedMarkerHasRange
                ? { min: selectedMarker!.optimalMin as number, max: selectedMarker!.optimalMax as number }
                : undefined}
            />
          </div>
        ) : (
          <div className="bg-stone-50 rounded-2xl p-4 border border-dashed border-stone-200 text-sm text-stone-400">
            Select a marker to see its trend.
          </div>
        )}

        <div>
          <div className="grid grid-cols-12 gap-4 text-xs uppercase tracking-wider text-stone-400 font-bold pb-2 border-b border-stone-100">
            <div className="col-span-4">Marker</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-4">Range</div>
            <div className="col-span-2">Status</div>
          </div>
          {summary.markers.map(value => (
            <button
              key={value.id}
              onClick={() => setSelectedCode(value.markerCode || null)}
              disabled={!value.markerCode}
              className={`text-left w-full ${value.markerCode ? '' : 'opacity-70 cursor-not-allowed'}`}
            >
              <MarkerRow value={value} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
