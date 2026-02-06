import { HealthMarker, HealthRatio, HealthValue, HealthValueStatus, MarkerTrend } from '../types/health';

export const normalizeMarkerKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();

export const evaluateValueStatus = (marker: HealthMarker | null | undefined, value?: number | null): HealthValueStatus => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'UNKNOWN';
  if (!marker) return 'NORMAL';

  const optimalMin = marker.optimalMin ?? marker.labMin ?? null;
  const optimalMax = marker.optimalMax ?? marker.labMax ?? null;

  if (optimalMin !== null && value < optimalMin) return 'LOW';
  if (optimalMax !== null && value > optimalMax) return 'HIGH';

  if (marker.optimalMin !== null && marker.optimalMin !== undefined && marker.optimalMax !== null && marker.optimalMax !== undefined) {
    return 'OPTIMAL';
  }
  return 'NORMAL';
};

export const isFlaggedValue = (marker: HealthMarker | null | undefined, value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (!marker) return false;
  const min = marker.optimalMin ?? marker.labMin;
  const max = marker.optimalMax ?? marker.labMax;
  if (min !== null && min !== undefined && value < min) return true;
  if (max !== null && max !== undefined && value > max) return true;
  return false;
};

export const calculateBMI = (weightKg?: number | null, heightCm?: number | null) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  if (heightM === 0) return null;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
};

export const calculateWaistHipRatio = (waistCm?: number | null, hipCm?: number | null) => {
  if (!waistCm || !hipCm) return null;
  if (hipCm === 0) return null;
  return Number((waistCm / hipCm).toFixed(3));
};

export interface RatioDefinition {
  ratioCode: string;
  name: string;
  formula: string;
  optimalMin?: number;
  optimalMax?: number;
  compute: (values: Record<string, number>) => number | null;
}

export const ratioDefinitions: RatioDefinition[] = [
  {
    ratioCode: 'HOMA_IR',
    name: 'HOMA-IR',
    formula: '(Glucose × Insulin) / 405',
    optimalMax: 1,
    compute: (values) => {
      const glucose = values.GLUCOSE_FASTING;
      const insulin = values.INSULIN_FASTING;
      if (!glucose || !insulin) return null;
      return Number(((glucose * insulin) / 405).toFixed(2));
    }
  },
  {
    ratioCode: 'TG_HDL',
    name: 'TG/HDL',
    formula: 'Triglycerides / HDL',
    optimalMax: 1,
    compute: (values) => {
      const tg = values.TRIGLYCERIDES;
      const hdl = values.HDL;
      if (!tg || !hdl) return null;
      return Number((tg / hdl).toFixed(2));
    }
  },
  {
    ratioCode: 'TC_HDL',
    name: 'TC/HDL',
    formula: 'Total Cholesterol / HDL',
    optimalMax: 3.5,
    compute: (values) => {
      const tc = values.CHOL_TOTAL;
      const hdl = values.HDL;
      if (!tc || !hdl) return null;
      return Number((tc / hdl).toFixed(2));
    }
  },
  {
    ratioCode: 'LDL_HDL',
    name: 'LDL/HDL',
    formula: 'LDL / HDL',
    optimalMax: 2,
    compute: (values) => {
      const ldl = values.LDL;
      const hdl = values.HDL;
      if (!ldl || !hdl) return null;
      return Number((ldl / hdl).toFixed(2));
    }
  },
  {
    ratioCode: 'AST_ALT',
    name: 'AST/ALT',
    formula: 'AST / ALT',
    optimalMin: 0.8,
    optimalMax: 1.0,
    compute: (values) => {
      const ast = values.AST;
      const alt = values.ALT;
      if (!ast || !alt) return null;
      return Number((ast / alt).toFixed(2));
    }
  },
  {
    ratioCode: 'BUN_CREAT',
    name: 'BUN/Creatinine',
    formula: 'BUN / Creatinine',
    optimalMin: 10,
    optimalMax: 20,
    compute: (values) => {
      const bun = values.BUN;
      const creatinine = values.CREATININE;
      if (!bun || !creatinine) return null;
      return Number((bun / creatinine).toFixed(2));
    }
  },
];

export const buildRatios = (values: HealthValue[], reportId: string, personId: string, testDate: string): HealthRatio[] => {
  const valueMap: Record<string, number> = {};
  values.forEach(value => {
    if (value.markerCode && value.value !== null && value.value !== undefined) {
      valueMap[value.markerCode] = value.value;
    }
  });

  return ratioDefinitions
    .map(def => {
      const computed = def.compute(valueMap);
      if (computed === null) return null;
      const isOptimal =
        (def.optimalMin === undefined || computed >= def.optimalMin) &&
        (def.optimalMax === undefined || computed <= def.optimalMax);

      return {
        id: `${reportId}-${def.ratioCode}`,
        reportId,
        personId,
        ratioCode: def.ratioCode,
        name: def.name,
        value: computed,
        testDate,
        isOptimal,
        formula: def.formula,
      };
    })
    .filter((ratio): ratio is HealthRatio => Boolean(ratio));
};

export const buildTrends = (values: HealthValue[]): MarkerTrend[] => {
  const grouped = new Map<string, HealthValue[]>();
  values.forEach(value => {
    const code = value.markerCode;
    if (!code || value.value === null || value.value === undefined) return;
    if (!grouped.has(code)) grouped.set(code, []);
    grouped.get(code)!.push(value);
  });

  return Array.from(grouped.entries()).map(([code, entries]) => {
    const sorted = [...entries].sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
    const dedupedByDate = new Map<string, HealthValue>();
    sorted.forEach(item => {
      dedupedByDate.set(item.testDate, item);
    });
    const dedupedValues = Array.from(dedupedByDate.values());
    const dataPoints = dedupedValues.map(item => ({
      date: item.testDate,
      value: item.value as number,
    }));
    const latest = dedupedValues[dedupedValues.length - 1] || sorted[sorted.length - 1];
    const previous = dedupedValues.length > 1 ? dedupedValues[dedupedValues.length - 2] : undefined;
    let trend: MarkerTrend['trend'] = 'STABLE';
    if (previous && latest.value !== null && previous.value !== null) {
      if (latest.value > previous.value) trend = 'IMPROVING';
      if (latest.value < previous.value) trend = 'DECLINING';
    }

    return {
      markerCode: code,
      markerName: latest.marker?.name || latest.markerName || code,
      unit: latest.marker?.unit || latest.unit,
      dataPoints,
      optimalRange: latest.marker?.optimalMin !== null && latest.marker?.optimalMin !== undefined && latest.marker?.optimalMax !== null && latest.marker?.optimalMax !== undefined
        ? { min: latest.marker!.optimalMin as number, max: latest.marker!.optimalMax as number }
        : undefined,
      trend,
    };
  });
};
