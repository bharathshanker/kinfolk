# Health Dashboard Implementation Plan

## Overview
Build a comprehensive health tracking dashboard for the Kinfolk app that allows users to:
- Log basic health metrics (weight, height, BMI, waist, BP)
- Upload blood test PDFs and extract markers via Gemini AI
- View health data organized by body systems
- Track trends over time with D3.js visualizations
- Share health data with family collaborators

---

## 1. Body Systems & Biomarkers Template

Based on the reference blood test report, we'll organize markers into these systems:

### 1.1 Core Body Systems

| System | Markers | Calculated Ratios |
|--------|---------|-------------------|
| **Metabolic/Diabetes** | Fasting Glucose, HbA1c, Fasting Insulin | HOMA-IR = (Glucose × Insulin) / 405 |
| **Lipids/Cardiovascular** | Total Cholesterol, LDL, HDL, Triglycerides, VLDL, Non-HDL | TG/HDL Ratio, TC/HDL Ratio, LDL/HDL Ratio |
| **Liver Function** | SGOT (AST), SGPT (ALT), ALP, GGT, Bilirubin (Total/Direct/Indirect), Albumin, Globulin | AST/ALT Ratio, A/G Ratio |
| **Kidney Function** | Creatinine, BUN, Urea, Uric Acid, eGFR, Microalbumin | BUN/Creatinine Ratio |
| **Blood/Hematology** | Hemoglobin, RBC, WBC, Platelets, HCT, MCV, MCH, MCHC, RDW | Absolute counts (ANC, ALC, etc.) |
| **Inflammation** | CRP (hs-CRP), ESR | - |
| **Thyroid** | TSH, T3, T4, Free T3, Free T4 | - |
| **Vitamins/Nutrients** | Vitamin D, B12, Folate (B9), Iron, Ferritin, Calcium | Transferrin Saturation, TIBC |
| **Electrolytes** | Sodium, Potassium, Chloride, Magnesium | - |
| **Hormones** | Testosterone, Estrogen, Cortisol, DHEA | - |
| **Bone Health** | Calcium, Vitamin D, ALP | - |

### 1.2 Physical Measurements
- Weight (kg/lbs)
- Height (cm/ft-in)
- BMI (calculated)
- Waist circumference
- Hip circumference
- Waist-to-Hip ratio (calculated)
- Blood Pressure (systolic/diastolic)
- Resting Heart Rate

### 1.3 Key Calculated Ratios (Health Optimization Focus)
| Ratio | Formula | Optimal Range | Significance |
|-------|---------|---------------|--------------|
| HOMA-IR | (Fasting Glucose mg/dL × Fasting Insulin μU/mL) / 405 | < 1.0 (optimal), < 2.0 (normal) | Insulin resistance |
| TG/HDL | Triglycerides / HDL | < 1.0 (optimal), < 2.0 (good) | Atherogenic index, insulin sensitivity |
| TC/HDL | Total Cholesterol / HDL | < 3.5 (optimal), < 4.5 (normal) | Cardiovascular risk |
| LDL/HDL | LDL / HDL | < 2.0 (optimal), < 3.0 (normal) | Heart disease risk |
| AST/ALT | SGOT / SGPT | 0.8-1.0 (optimal) | Liver health |
| BUN/Creatinine | BUN / Creatinine | 10:1 to 20:1 | Kidney/hydration |

---

## 2. Database Schema

### 2.1 New Tables

```sql
-- Health metric definitions (reference data)
CREATE TABLE health_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'HBA1C', 'LDL', 'CREATININE'
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(30),
  system VARCHAR(50) NOT NULL,  -- e.g., 'METABOLIC', 'LIPIDS', 'KIDNEY'
  optimal_min DECIMAL(10,3),
  optimal_max DECIMAL(10,3),
  lab_min DECIMAL(10,3),
  lab_max DECIMAL(10,3),
  description TEXT,
  display_order INT DEFAULT 0
);

-- Blood test reports (uploaded PDFs)
CREATE TABLE health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  lab_name VARCHAR(200),
  report_type VARCHAR(50) DEFAULT 'FULL_BODY',  -- FULL_BODY, LIPID, THYROID, etc.
  pdf_url TEXT,
  raw_extraction JSONB,  -- Gemini AI extraction result
  status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, PROCESSED, FAILED
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual marker values
CREATE TABLE health_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES health_reports(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  marker_code VARCHAR(50) REFERENCES health_markers(code),
  value DECIMAL(10,3) NOT NULL,
  value_text VARCHAR(50),  -- For non-numeric values like "Negative", "Reactive"
  test_date DATE NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,  -- Out of optimal range
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Physical measurements (tracked separately, more frequent)
CREATE TABLE health_physicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  bmi DECIMAL(4,2),  -- Calculated
  waist_cm DECIMAL(5,2),
  hip_cm DECIMAL(5,2),
  waist_hip_ratio DECIMAL(4,3),  -- Calculated
  bp_systolic INT,
  bp_diastolic INT,
  resting_hr INT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calculated ratios (computed when report is processed)
CREATE TABLE health_ratios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES health_reports(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  ratio_code VARCHAR(50) NOT NULL,  -- 'HOMA_IR', 'TG_HDL', etc.
  value DECIMAL(10,3) NOT NULL,
  test_date DATE NOT NULL,
  is_optimal BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (extend existing pattern)
ALTER TABLE health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_physicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_ratios ENABLE ROW LEVEL SECURITY;

-- Use existing has_access_to_person() function for access control
```

### 2.2 Seed Data for health_markers
Will include ~60-70 common markers with optimal ranges from longevity/health optimization sources.

---

## 3. PDF Upload & AI Parsing

### 3.1 Upload Flow
1. User uploads PDF via file input
2. PDF stored in Supabase Storage (`health-reports` bucket)
3. PDF URL saved to `health_reports` table with status='PENDING'
4. Trigger Gemini processing

### 3.2 Gemini AI Extraction
```typescript
// services/healthParser.ts
async function parseHealthReport(pdfUrl: string): Promise<ExtractedReport> {
  // 1. Fetch PDF and convert to base64
  // 2. Send to Gemini with structured extraction prompt
  // 3. Parse response into marker values
  // 4. Match extracted markers to health_markers table
  // 5. Return structured data
}

// Gemini prompt template:
const EXTRACTION_PROMPT = `
You are a medical lab report parser. Extract all biomarker values from this blood test report.

Return a JSON object with this structure:
{
  "labName": "string",
  "testDate": "YYYY-MM-DD",
  "markers": [
    {
      "name": "marker name as shown",
      "code": "standardized code (HBA1C, LDL, etc.)",
      "value": number or null,
      "valueText": "string for non-numeric",
      "unit": "unit as shown",
      "referenceRange": "min-max as shown"
    }
  ]
}

Be thorough - extract ALL markers from the report.
`;
```

### 3.3 Marker Matching Logic
- Fuzzy match extracted marker names to `health_markers.code`
- Handle variations (e.g., "Glycosylated Hemoglobin" → "HBA1C")
- Flag unmatched markers for manual review

---

## 4. TypeScript Types

```typescript
// types.ts additions

type HealthSystem =
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

interface HealthMarker {
  id: string;
  code: string;
  name: string;
  unit: string;
  system: HealthSystem;
  optimalMin?: number;
  optimalMax?: number;
  labMin?: number;
  labMax?: number;
  description?: string;
}

interface HealthReport {
  id: string;
  personId: string;
  testDate: string;
  labName?: string;
  reportType: string;
  pdfUrl?: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  values: HealthValue[];
  ratios: HealthRatio[];
  createdAt: Date;
}

interface HealthValue {
  id: string;
  reportId: string;
  markerCode: string;
  marker?: HealthMarker;  // Joined
  value: number;
  valueText?: string;
  testDate: string;
  isFlagged: boolean;
  status: 'OPTIMAL' | 'NORMAL' | 'LOW' | 'HIGH';
}

interface HealthRatio {
  id: string;
  ratioCode: string;
  name: string;
  value: number;
  testDate: string;
  isOptimal: boolean;
  formula: string;
}

interface HealthPhysical {
  id: string;
  personId: string;
  measurementDate: string;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  waistCm?: number;
  hipCm?: number;
  waistHipRatio?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  restingHr?: number;
}

interface HealthDashboardData {
  person: Person;
  latestReport?: HealthReport;
  allReports: HealthReport[];
  physicals: HealthPhysical[];
  systemSummaries: SystemSummary[];
  trends: MarkerTrend[];
}

interface SystemSummary {
  system: HealthSystem;
  displayName: string;
  icon: string;
  markerCount: number;
  optimalCount: number;
  flaggedCount: number;
  status: 'OPTIMAL' | 'ATTENTION' | 'CONCERN';
  markers: HealthValue[];
}

interface MarkerTrend {
  markerCode: string;
  markerName: string;
  unit: string;
  dataPoints: { date: string; value: number }[];
  optimalRange: { min: number; max: number };
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}
```

---

## 5. UI Components

### 5.1 New Components Structure
```
components/
├── health/
│   ├── HealthDashboard.tsx      # Main dashboard container
│   ├── SystemCard.tsx           # Card for each body system
│   ├── SystemDetailModal.tsx    # Expanded view with all markers
│   ├── MarkerRow.tsx            # Individual marker display
│   ├── MarkerChart.tsx          # D3 timeline chart for single marker
│   ├── PhysicalsCard.tsx        # Physical measurements section
│   ├── PhysicalsForm.tsx        # Log weight/BP/etc
│   ├── ReportUpload.tsx         # PDF upload + processing UI
│   ├── ReportsList.tsx          # List of past reports
│   ├── RatiosCard.tsx           # Calculated health ratios
│   ├── TrendChart.tsx           # D3 multi-marker trend comparison
│   └── RangeIndicator.tsx       # Visual optimal/normal/flagged indicator
```

### 5.2 Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Health Dashboard                        [Upload Report] [+] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Weight      │ │ BMI         │ │ Blood       │  Physicals │
│ │ 72 kg       │ │ 23.4        │ │ Pressure    │  Card      │
│ │ ↓ -2kg      │ │ ● Optimal   │ │ 120/80      │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Body Systems                                                │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ 🩸 Metabolic     │ │ 💚 Lipids        │ │ 🫀 Liver     │ │
│ │ 4/5 Optimal      │ │ 3/6 Optimal      │ │ 5/7 Optimal  │ │
│ │ ●●●●○            │ │ ●●●○○○           │ │ ●●●●●○○      │ │
│ │ HOMA-IR: 0.9 ✓   │ │ TG/HDL: 1.2 ✓    │ │ AST/ALT: 1.0 │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ 🫘 Kidney        │ │ 💉 Blood         │ │ 🔥 Inflam.   │ │
│ │ 5/5 Optimal      │ │ 10/14 Optimal    │ │ 2/2 Optimal  │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
│ ... more systems                                            │
├─────────────────────────────────────────────────────────────┤
│ Trends (Last 4 Reports)                    [Select Markers] │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │         D3.js Line Chart                                │ │
│ │    HbA1c ──── LDL ─ ─ ─ Vitamin D ........             │ │
│ │                                                         │ │
│ │  ═══════════════════════════════  Optimal Zone          │ │
│ │     ●           ●          ●           ●                │ │
│ │  Feb '23    Apr '23    Nov '23     Jan '24              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 System Detail Modal (when clicking a system card)
```
┌─────────────────────────────────────────────────────────────┐
│ Lipids / Cardiovascular                              [×]    │
├─────────────────────────────────────────────────────────────┤
│ Latest: Nov 19, 2024 | Lab: Tata 1mg                       │
├─────────────────────────────────────────────────────────────┤
│ Marker          │ Value    │ Optimal    │ Status │ Trend   │
│─────────────────┼──────────┼────────────┼────────┼─────────│
│ Total Chol.     │ 174 mg/dL│ <200       │ ●      │ ↑       │
│ LDL             │ 125 mg/dL│ <100       │ ○      │ ↑       │
│ HDL             │ 41 mg/dL │ >50        │ ○      │ ↑       │
│ Triglycerides   │ 44 mg/dL │ <100       │ ●      │ ↓       │
│ Non-HDL         │ 133 mg/dL│ <130       │ ○      │ ↑       │
├─────────────────────────────────────────────────────────────┤
│ Calculated Ratios                                           │
│ TG/HDL: 1.07 ● │ TC/HDL: 4.24 ○ │ LDL/HDL: 3.05 ○        │
├─────────────────────────────────────────────────────────────┤
│ [D3.js Trend Chart for selected markers]                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Range Indicator Component
Visual pill showing where value falls:
```
[━━━━━━●━━━━━━━━━━━━━━]
 Low   Opt   Normal  High
```

---

## 6. D3.js Visualizations

### 6.1 Dependencies
```bash
npm install d3 @types/d3
```

### 6.2 Chart Components

**MarkerTrendChart** - Single marker over time
- Line chart with optimal zone shaded
- Points at each report date
- Hover tooltips with exact values
- Responsive sizing

**MultiMarkerChart** - Compare multiple markers
- Multiple lines with legend
- Normalized scale option (for comparing different units)
- Date range selector

**SystemHealthGauge** - Overall system status
- Radial gauge showing % optimal
- Color coded (green/yellow/red)

**RangeBar** - Where value falls in range
- Horizontal bar with zones
- Current value marker
- Previous value ghost marker

---

## 7. Implementation Phases (Hybrid Parallel Execution)

### Sequential Foundation (Main Context)
These phases run sequentially to establish patterns and dependencies.

**Phase 1: Foundation (Database + Types)**
1. Create Supabase migrations for new tables
2. Add seed data for health_markers
3. Add TypeScript types (`src/types/health.ts`)
4. Add RLS policies
5. Create base `useHealthDashboard` hook
6. Establish component patterns in Shared.tsx

**Phase 2: Core Services**
1. Gemini health parser service
2. Ratio calculation utilities
3. Range/status evaluation functions
4. Basic dashboard container component

---

### Parallel Component Development (Sub-Agents)
Once foundation is complete, spin up parallel agents:

| Agent | Components | Dependencies |
|-------|------------|--------------|
| **Physical Metrics Agent** | PhysicalsCard, PhysicalsForm, BMI calculator | Types, Shared components |
| **System Cards Agent** | SystemCard, SystemDetailModal, MarkerRow | Types, Shared components |
| **D3 Charts Agent** | MarkerTrendChart, MultiMarkerChart, RangeIndicator | Types, D3.js installed |
| **Report Upload Agent** | ReportUpload, ReportsList, extraction review UI | Types, Gemini service |
| **Ratios Agent** | RatiosCard, ratio display components | Types, calculation utils |

Each agent will:
- Receive the established types and patterns
- Build their components independently
- Return completed, tested components

---

### Integration Phase (Main Context)
After parallel agents complete:

**Phase 3: Integration & Assembly**
1. Wire all components into HealthDashboard
2. Integrate into PersonDetail.tsx (new HEALTH_DASHBOARD tab)
3. Connect to usePeople hook for data flow
4. Sharing integration with existing system

**Phase 4: Polish & Testing**
1. Mobile responsive refinements
2. Loading states & error handling
3. Edge cases (missing data, parsing errors)
4. End-to-end testing with sample PDFs

---

## 8. Files to Create/Modify

### New Files
- `supabase/migrations/XXXXXX_health_dashboard.sql`
- `src/types/health.ts`
- `src/hooks/useHealthDashboard.ts`
- `src/services/healthParser.ts`
- `src/components/health/HealthDashboard.tsx`
- `src/components/health/SystemCard.tsx`
- `src/components/health/SystemDetailModal.tsx`
- `src/components/health/MarkerRow.tsx`
- `src/components/health/PhysicalsCard.tsx`
- `src/components/health/PhysicalsForm.tsx`
- `src/components/health/ReportUpload.tsx`
- `src/components/health/RatiosCard.tsx`
- `src/components/health/charts/MarkerTrendChart.tsx`
- `src/components/health/charts/MultiMarkerChart.tsx`
- `src/components/health/charts/RangeIndicator.tsx`
- `src/data/healthMarkers.ts` (seed data)

### Modified Files
- `src/types.ts` - Add health types
- `src/hooks/usePeople.ts` - Add health dashboard fetching
- `components/PersonDetail.tsx` - Add HEALTH_DASHBOARD tab
- `components/Shared.tsx` - Any new shared components
- `tailwind.config.js` - Health-specific colors if needed
- `package.json` - Add d3 dependency

---

## 9. Optimal Reference Ranges Source

Will use ranges from:
- Dr. Peter Attia's longevity framework
- Levels Health optimal ranges
- Function Health reference ranges
- InsideTracker optimal zones

These are generally tighter than standard lab ranges, focused on optimization rather than just disease detection.

---

## 10. Testing & Verification

1. Upload sample PDF (the provided reference) and verify extraction
2. Manual entry of values and verify calculations
3. Timeline charts with multiple reports
4. Sharing with collaborator and verify access
5. Mobile responsive testing
6. Edge cases: missing markers, non-numeric values

---

## Summary

This plan creates a comprehensive health dashboard that:
- Tracks 60+ biomarkers across 11 body systems
- Calculates 6+ health optimization ratios (HOMA-IR, TG/HDL, etc.)
- Supports PDF upload with Gemini AI extraction
- Shows visual status indicators (optimal/normal/flagged)
- Provides D3.js timeline charts for trend analysis
- Integrates with existing collaboration/sharing system
- Uses optimal health ranges (not just lab normal)
