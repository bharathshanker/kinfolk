export type HealthSystem =
  | 'METABOLIC'
  | 'LIPIDS'
  | 'LIVER'
  | 'KIDNEY'
  | 'BLOOD'
  | 'INFLAMMATION'
  | 'THYROID'
  | 'VITAMINS'
  | 'ELECTROLYTES'
  | 'HORMONES'
  | 'BONE';

export type HealthValueStatus = 'OPTIMAL' | 'NORMAL' | 'LOW' | 'HIGH' | 'UNKNOWN';

export interface HealthMarker {
  id: string;
  code: string;
  name: string;
  unit?: string | null;
  system: HealthSystem;
  optimalMin?: number | null;
  optimalMax?: number | null;
  labMin?: number | null;
  labMax?: number | null;
  description?: string | null;
  displayOrder?: number | null;
}

export interface HealthReport {
  id: string;
  personId: string;
  testDate: string;
  labName?: string | null;
  reportType: string;
  pdfUrl?: string | null;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  rawExtraction?: Record<string, unknown> | null;
  values: HealthValue[];
  ratios: HealthRatio[];
  createdAt?: string;
}

export interface HealthValue {
  id: string;
  reportId?: string | null;
  personId: string;
  markerCode?: string | null;
  markerName?: string | null;
  marker?: HealthMarker | null;
  value?: number | null;
  valueText?: string | null;
  unit?: string | null;
  testDate: string;
  isFlagged: boolean;
  status: HealthValueStatus;
}

export interface HealthRatio {
  id: string;
  reportId?: string | null;
  personId: string;
  ratioCode: string;
  name: string;
  value: number;
  testDate: string;
  isOptimal?: boolean | null;
  formula: string;
}

export interface HealthPhysical {
  id: string;
  personId: string;
  measurementDate: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  waistHipRatio?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  restingHr?: number | null;
  notes?: string | null;
}

export interface SystemSummary {
  system: HealthSystem;
  displayName: string;
  icon: string;
  markerCount: number;
  optimalCount: number;
  flaggedCount: number;
  status: 'OPTIMAL' | 'ATTENTION' | 'CONCERN';
  markers: HealthValue[];
}

export interface MarkerTrend {
  markerCode: string;
  markerName: string;
  unit?: string | null;
  dataPoints: { date: string; value: number }[];
  optimalRange?: { min: number; max: number };
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface HealthDashboardData {
  latestReport?: HealthReport;
  allReports: HealthReport[];
  physicals: HealthPhysical[];
  systemSummaries: SystemSummary[];
  trends: MarkerTrend[];
}
