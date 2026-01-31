import React, { useState } from 'react';
import { Button, Input, Modal } from '../Shared';

export interface ReportUploadPayload {
  file: File;
  testDate?: string;
  labName?: string;
  reportType?: string;
}

export const ReportUpload: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onUpload: (payload: ReportUploadPayload) => Promise<void>;
}> = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState('');
  const [reportType, setReportType] = useState('FULL_BODY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onUpload({ file, testDate, labName, reportType });
      setFile(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Blood Report">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Test date" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
        <Input label="Lab name" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Lab or provider" />
        <div className="w-full">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Report Type</label>
          <select
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="FULL_BODY">Full Body</option>
            <option value="LIPID">Lipid Panel</option>
            <option value="THYROID">Thyroid</option>
            <option value="METABOLIC">Metabolic</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="w-full">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">PDF file</label>
          <input
            type="file"
            accept="application/pdf"
            className="w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
