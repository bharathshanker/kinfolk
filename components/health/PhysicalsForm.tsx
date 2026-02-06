import React, { useState } from 'react';
import { HealthPhysical } from '../../src/types/health';
import { Button, Input, Modal, TextArea } from '../Shared';

export const PhysicalsForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<HealthPhysical, 'id' | 'personId'>) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    measurementDate: new Date().toISOString().slice(0, 10),
    weightKg: '',
    heightCm: '',
    waistCm: '',
    hipCm: '',
    bpSystolic: '',
    bpDiastolic: '',
    restingHr: '',
    notes: '',
  });

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      measurementDate: form.measurementDate,
      weightKg: form.weightKg ? Number(form.weightKg) : null,
      heightCm: form.heightCm ? Number(form.heightCm) : null,
      waistCm: form.waistCm ? Number(form.waistCm) : null,
      hipCm: form.hipCm ? Number(form.hipCm) : null,
      bpSystolic: form.bpSystolic ? Number(form.bpSystolic) : null,
      bpDiastolic: form.bpDiastolic ? Number(form.bpDiastolic) : null,
      restingHr: form.restingHr ? Number(form.restingHr) : null,
      notes: form.notes || null,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Physicals">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Measurement Date"
          type="date"
          value={form.measurementDate}
          onChange={(e) => handleChange('measurementDate', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Weight (kg)" type="number" value={form.weightKg} onChange={(e) => handleChange('weightKg', e.target.value)} />
          <Input label="Height (cm)" type="number" value={form.heightCm} onChange={(e) => handleChange('heightCm', e.target.value)} />
          <Input label="Waist (cm)" type="number" value={form.waistCm} onChange={(e) => handleChange('waistCm', e.target.value)} />
          <Input label="Hip (cm)" type="number" value={form.hipCm} onChange={(e) => handleChange('hipCm', e.target.value)} />
          <Input label="BP Systolic" type="number" value={form.bpSystolic} onChange={(e) => handleChange('bpSystolic', e.target.value)} />
          <Input label="BP Diastolic" type="number" value={form.bpDiastolic} onChange={(e) => handleChange('bpDiastolic', e.target.value)} />
          <Input label="Resting HR" type="number" value={form.restingHr} onChange={(e) => handleChange('restingHr', e.target.value)} />
        </div>
        <TextArea label="Notes" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
};
