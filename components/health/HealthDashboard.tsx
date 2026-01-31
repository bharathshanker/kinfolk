import React, { useEffect, useMemo, useState } from 'react';
import { useHealthDashboard } from '../../src/hooks/useHealthDashboard';
import { SystemSummary } from '../../src/types/health';
import { Button, Card, Icon } from '../Shared';
import { PhysicalsCard } from './PhysicalsCard';
import { PhysicalsForm } from './PhysicalsForm';
import { ReportUpload } from './ReportUpload';
import { ReportsList } from './ReportsList';
import { RatiosCard } from './RatiosCard';
import { SystemCard } from './SystemCard';
import { SystemDetailModal } from './SystemDetailModal';
import { MultiMarkerChart } from './charts/MultiMarkerChart';

const palette = ['#0F766E', '#6366F1', '#F97316', '#16A34A', '#F43F5E', '#0EA5E9'];

export const HealthDashboard: React.FC<{
  personId: string;
  personName: string;
}> = ({ personId, personName }) => {
  const { dashboardData, loading, error, fetchDashboard, addPhysical, uploadReport } = useHealthDashboard(personId);
  const [showPhysicals, setShowPhysicals] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<SystemSummary | null>(null);
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!dashboardData.latestReport || selectedMarkers.length > 0) return;
    const codes = dashboardData.latestReport.values
      .filter(value => value.markerCode)
      .slice(0, 3)
      .map(value => value.markerCode as string);
    setSelectedMarkers(codes);
  }, [dashboardData.latestReport, selectedMarkers.length]);

  const trendSeries = useMemo(() => {
    return dashboardData.trends
      .filter(trend => selectedMarkers.includes(trend.markerCode))
      .map((trend, idx) => ({
        label: trend.markerName,
        color: palette[idx % palette.length],
        data: trend.dataPoints,
      }));
  }, [dashboardData.trends, selectedMarkers]);

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] p-6 md:p-8 bg-gradient-to-br from-white via-amber-50/50 to-emerald-50/40 border border-stone-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stone-400 font-semibold">Health Dashboard</p>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-800">Vitals and biomarkers for {personName}</h2>
            <p className="text-sm text-stone-500 mt-1">Track labs, ratios, and physical metrics in one place.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPhysicals(true)}>
              <Icon name="monitor_weight" /> Log Physicals
            </Button>
            <Button variant="primary" onClick={() => setShowUpload(true)}>
              <Icon name="upload" /> Upload Report
            </Button>
          </div>
        </div>

        {loading && (
          <div className="mt-6 text-sm text-stone-400">Loading health data…</div>
        )}
        {error && (
          <div className="mt-6 text-sm text-rose-600">{error}</div>
        )}
      </div>

      <PhysicalsCard latest={dashboardData.physicals[0]} onAdd={() => setShowPhysicals(true)} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-stone-800">Body Systems</p>
            <p className="text-xs text-stone-400">Highlights from latest lab report</p>
          </div>
        </div>
        {dashboardData.systemSummaries.length === 0 ? (
          <Card className="border-dashed border-stone-200 text-sm text-stone-400 text-center py-8">
            Upload a report to unlock system insights.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.systemSummaries.map(summary => (
              <SystemCard
                key={summary.system}
                summary={summary}
                onClick={() => setSelectedSystem(summary)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="border-stone-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-stone-800">Trends</p>
                <p className="text-xs text-stone-400">Compare key markers across reports</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {dashboardData.trends.slice(0, 6).map(trend => {
                  const isActive = selectedMarkers.includes(trend.markerCode);
                  return (
                    <button
                      key={trend.markerCode}
                      onClick={() => {
                        setSelectedMarkers(prev => {
                          if (prev.includes(trend.markerCode)) return prev.filter(code => code !== trend.markerCode);
                          return [...prev, trend.markerCode].slice(-4);
                        });
                      }}
                      className={`text-xs px-3 py-1 rounded-full border ${isActive ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}
                    >
                      {trend.markerName}
                    </button>
                  );
                })}
              </div>
            </div>
            {trendSeries.length === 0 ? (
              <div className="text-sm text-stone-400">Select markers to visualize trends.</div>
            ) : (
              <MultiMarkerChart series={trendSeries} />
            )}
          </Card>
        </div>
        <RatiosCard ratios={dashboardData.latestReport?.ratios || []} />
      </div>

      <ReportsList reports={dashboardData.allReports} />

      <SystemDetailModal
        isOpen={Boolean(selectedSystem)}
        onClose={() => setSelectedSystem(null)}
        summary={selectedSystem}
        reports={dashboardData.allReports}
      />

      <PhysicalsForm
        isOpen={showPhysicals}
        onClose={() => setShowPhysicals(false)}
        onSave={(data) => addPhysical(data)}
      />

      <ReportUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={async payload => uploadReport(payload.file, { testDate: payload.testDate, labName: payload.labName, reportType: payload.reportType })}
      />
    </div>
  );
};
