import React, { useState } from 'react';
import { HealthReport } from '../../src/types/health';
import { Card, Icon } from '../Shared';
import { supabase } from '../../src/lib/supabase';

const statusStyle: Record<HealthReport['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
};

export const ReportsList: React.FC<{
  reports: HealthReport[];
}> = ({ reports }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openReport = async (report: HealthReport) => {
    if (!report.pdfUrl) return;
    setLoadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from('health-reports')
        .createSignedUrl(report.pdfUrl, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Failed to open report', err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="bg-white border-stone-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-stone-800">Reports</p>
          <p className="text-xs text-stone-400">Lab PDFs and extracted data</p>
        </div>
        <Icon name="summarize" className="text-stone-300" />
      </div>
      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="text-sm text-stone-400">No reports uploaded yet.</div>
        )}
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => openReport(report)}
            className="w-full text-left flex items-center justify-between p-3 rounded-2xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-stone-700">{report.testDate}</p>
              <p className="text-xs text-stone-400">{report.labName || report.reportType}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${statusStyle[report.status]}`}>
                {report.status}
              </span>
              <Icon name={loadingId === report.id ? 'hourglass_top' : 'open_in_new'} className="text-stone-400" />
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
};
