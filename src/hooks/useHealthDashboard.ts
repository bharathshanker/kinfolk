import { useCallback, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { healthMarkersSeed, markerAliases, systemLabel } from '../data/healthMarkers';
import {
  HealthDashboardData,
  HealthMarker,
  HealthPhysical,
  HealthRatio,
  HealthReport,
  HealthValue,
  HealthValueStatus,
  HealthSystem,
  SystemSummary,
} from '../types/health';
import {
  buildRatios,
  buildTrends,
  calculateBMI,
  calculateWaistHipRatio,
  evaluateValueStatus,
  isFlaggedValue,
  normalizeMarkerKey,
  ratioDefinitions,
} from '../utils/healthCalculations';
import { parseHealthReport } from '../services/healthParser';

// Module-level cache for health_markers reference data (static, never changes between sessions)
let cachedHealthMarkers: any[] | null = null;

const systemIcons: Record<HealthSystem, string> = {
  METABOLIC: 'local_fire_department',
  LIPIDS: 'favorite',
  LIVER: 'bloodtype',
  KIDNEY: 'water_drop',
  BLOOD: 'opacity',
  INFLAMMATION: 'flare',
  THYROID: 'settings_heart',
  VITAMINS: 'emoji_food_beverage',
  ELECTROLYTES: 'bolt',
  HORMONES: 'science',
  BONE: 'fitness_center',
};

const toHealthMarker = (row: any): HealthMarker => ({
  id: row.id,
  code: row.code,
  name: row.name,
  unit: row.unit,
  system: row.system,
  optimalMin: row.optimal_min,
  optimalMax: row.optimal_max,
  labMin: row.lab_min,
  labMax: row.lab_max,
  description: row.description,
  displayOrder: row.display_order,
});

const toHealthPhysical = (row: any): HealthPhysical => ({
  id: row.id,
  personId: row.person_id,
  measurementDate: row.measurement_date,
  weightKg: row.weight_kg,
  heightCm: row.height_cm,
  bmi: row.bmi,
  waistCm: row.waist_cm,
  hipCm: row.hip_cm,
  waistHipRatio: row.waist_hip_ratio,
  bpSystolic: row.bp_systolic,
  bpDiastolic: row.bp_diastolic,
  restingHr: row.resting_hr,
  notes: row.notes,
});

const toHealthReport = (row: any): HealthReport => ({
  id: row.id,
  personId: row.person_id,
  testDate: row.test_date,
  labName: row.lab_name,
  reportType: row.report_type || 'FULL_BODY',
  pdfUrl: row.pdf_url,
  status: (row.status || 'PENDING') as HealthReport['status'],
  // raw_extraction is intentionally not fetched in the list query to reduce egress
  rawExtraction: undefined,
  values: [],
  ratios: [],
  createdAt: row.created_at,
});

const toHealthRatio = (row: any, lookup: Record<string, { name: string; formula: string }>): HealthRatio => {
  const meta = lookup[row.ratio_code] || { name: row.ratio_code, formula: '' };
  return {
    id: row.id,
    reportId: row.report_id,
    personId: row.person_id,
    ratioCode: row.ratio_code,
    name: meta.name,
    value: row.value,
    testDate: row.test_date,
    isOptimal: row.is_optimal,
    formula: meta.formula,
  };
};

const buildSystemSummaries = (values: HealthValue[], markersByCode: Map<string, HealthMarker>): SystemSummary[] => {
  const grouped = new Map<HealthSystem, HealthValue[]>();
  values.forEach(value => {
    const marker = value.markerCode ? markersByCode.get(value.markerCode) : undefined;
    if (!marker) return;
    const list = grouped.get(marker.system) || [];
    list.push(value);
    grouped.set(marker.system, list);
  });

  return Array.from(grouped.entries()).map(([system, items]) => {
    const optimalCount = items.filter(i => i.status === 'OPTIMAL').length;
    const flaggedCount = items.filter(i => i.status === 'LOW' || i.status === 'HIGH').length;
    let status: SystemSummary['status'] = 'OPTIMAL';
    if (flaggedCount > 2) status = 'CONCERN';
    if (flaggedCount > 0 && flaggedCount <= 2) status = 'ATTENTION';

    return {
      system,
      displayName: systemLabel(system),
      icon: systemIcons[system],
      markerCount: items.length,
      optimalCount,
      flaggedCount,
      status,
      markers: items,
    };
  });
};

const mapMarkerCode = (marker: { name?: string | null; code?: string | null }, markersByCode: Map<string, HealthMarker>, markersByName: Map<string, HealthMarker>) => {
  const providedCode = marker.code ? marker.code.toUpperCase().trim() : null;
  if (providedCode && markersByCode.has(providedCode)) return providedCode;

  const normalizedName = marker.name ? normalizeMarkerKey(marker.name) : '';
  if (!normalizedName) return null;

  if (markerAliases[normalizedName]) return markerAliases[normalizedName];
  const byName = markersByName.get(normalizedName);
  return byName ? byName.code : null;
};

const REPORTS_PAGE_SIZE = 20;

export const useHealthDashboard = (personId: string | null) => {
  const [markers, setMarkers] = useState<HealthMarker[]>([]);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [physicals, setPhysicals] = useState<HealthPhysical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreReports, setHasMoreReports] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const markersByCode = useMemo(() => new Map(markers.map(marker => [marker.code, marker])), [markers]);
  const markersByName = useMemo(() => new Map(markers.map(marker => [normalizeMarkerKey(marker.name), marker])), [markers]);

  const fetchDashboard = useCallback(async () => {
    if (!personId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch person-specific data; health_markers are cached at module level (static reference data)
      const [reportsRes, valuesRes, ratiosRes, physicalsRes] = await Promise.all([
        // raw_extraction is a large JSON blob (~100KB+ per report) only needed for reprocessing, not for display
        supabase.from('health_reports').select('id, person_id, test_date, lab_name, report_type, pdf_url, status, created_at').eq('person_id', personId).order('test_date', { ascending: false }).limit(20),
        supabase.from('health_values').select('id, person_id, report_id, marker_code, marker_name, value, value_text, unit, test_date, is_flagged').eq('person_id', personId).order('test_date', { ascending: false }),
        supabase.from('health_ratios').select('id, person_id, report_id, ratio_code, value, test_date, is_optimal').eq('person_id', personId).order('test_date', { ascending: false }),
        supabase.from('health_physicals').select('id, person_id, measurement_date, weight_kg, height_cm, bmi, waist_cm, hip_cm, waist_hip_ratio, bp_systolic, bp_diastolic, resting_hr, notes').eq('person_id', personId).order('measurement_date', { ascending: false }).limit(20),
      ]);

      // Fetch health_markers only if not already cached (static reference data, ~265 rows)
      if (!cachedHealthMarkers) {
        const { data: markersData } = await supabase
          .from('health_markers')
          .select('id, code, name, unit, system, optimal_min, optimal_max, lab_min, lab_max, description, display_order')
          .order('display_order', { ascending: true });
        cachedHealthMarkers = markersData;
      }
      const markersRes = { data: cachedHealthMarkers, error: null };

      if (markersRes.error) throw markersRes.error;
      if (reportsRes.error) throw reportsRes.error;
      if (valuesRes.error) throw valuesRes.error;
      if (ratiosRes.error) throw ratiosRes.error;
      if (physicalsRes.error) throw physicalsRes.error;

      const markerRows = markersRes.data?.length ? markersRes.data.map(toHealthMarker) : healthMarkersSeed.map((seed, index) => ({
        id: `seed-${seed.code}-${index}`,
        ...seed,
      }));
      setMarkers(markerRows);

      const reportsList = (reportsRes.data || []).map(toHealthReport);
      const effectiveByCode = new Map(markerRows.map(marker => [marker.code, marker]));
      const effectiveByName = new Map(markerRows.map(marker => [normalizeMarkerKey(marker.name), marker]));

      const valuesList = (valuesRes.data || []).map((row: any) => {
        const mappedCode = row.marker_code || mapMarkerCode({ name: row.marker_name, code: row.marker_code }, effectiveByCode, effectiveByName);
        const marker = mappedCode ? effectiveByCode.get(mappedCode) : undefined;
        const status: HealthValueStatus = evaluateValueStatus(marker, row.value);
        return {
          id: row.id,
          reportId: row.report_id,
          personId: row.person_id,
          markerCode: mappedCode,
          markerName: row.marker_name,
          marker,
          value: row.value,
          valueText: row.value_text,
          unit: row.unit || marker?.unit,
          testDate: row.test_date,
          isFlagged: row.is_flagged ?? isFlaggedValue(marker, row.value),
          status,
        } as HealthValue;
      });

      const ratioLookup = Object.fromEntries(
        ratioDefinitions.map(def => [def.ratioCode, { name: def.name, formula: def.formula }])
      );

      const ratiosList = (ratiosRes.data || []).map((row: any) => toHealthRatio(row, ratioLookup));

      const reportMap = new Map<string, HealthReport>(reportsList.map(r => [r.id, r]));
      valuesList.forEach(value => {
        if (!value.reportId) return;
        const report = reportMap.get(value.reportId);
        if (report) report.values.push(value);
      });
      ratiosList.forEach(ratio => {
        if (!ratio.reportId) return;
        const report = reportMap.get(ratio.reportId);
        if (report) report.ratios.push(ratio);
      });

      const fetchedReports = Array.from(reportMap.values());
      setReports(fetchedReports);
      setHasMoreReports(fetchedReports.length === REPORTS_PAGE_SIZE);
      setPhysicals((physicalsRes.data || []).map(toHealthPhysical));
    } catch (err: any) {
      console.error('Health dashboard fetch error', err);
      setError(err.message || 'Failed to load health dashboard.');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  const loadMoreReports = useCallback(async () => {
    if (!personId || loadingMore) return;
    try {
      setLoadingMore(true);
      const { data, error: fetchError } = await supabase
        .from('health_reports')
        .select('id, person_id, test_date, lab_name, report_type, pdf_url, status, created_at')
        .eq('person_id', personId)
        .order('test_date', { ascending: false })
        .range(reports.length, reports.length + REPORTS_PAGE_SIZE - 1);
      if (fetchError) throw fetchError;
      const newReports = (data || []).map(toHealthReport);
      setReports(prev => [...prev, ...newReports]);
      setHasMoreReports(newReports.length === REPORTS_PAGE_SIZE);
    } catch (err: any) {
      console.error('Error loading more reports', err);
    } finally {
      setLoadingMore(false);
    }
  }, [personId, reports.length, loadingMore]);

  const addPhysical = useCallback(async (input: Omit<HealthPhysical, 'id' | 'personId'>) => {
    if (!personId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const bmi = calculateBMI(input.weightKg ?? undefined, input.heightCm ?? undefined);
    const waistHipRatio = calculateWaistHipRatio(input.waistCm ?? undefined, input.hipCm ?? undefined);

    const { error } = await supabase.from('health_physicals').insert({
      person_id: personId,
      measurement_date: input.measurementDate,
      weight_kg: input.weightKg ?? null,
      height_cm: input.heightCm ?? null,
      bmi,
      waist_cm: input.waistCm ?? null,
      hip_cm: input.hipCm ?? null,
      waist_hip_ratio: waistHipRatio,
      bp_systolic: input.bpSystolic ?? null,
      bp_diastolic: input.bpDiastolic ?? null,
      resting_hr: input.restingHr ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    });

    if (error) throw error;
    await fetchDashboard();
  }, [fetchDashboard, personId]);

  const uploadReport = useCallback(async (file: File, overrides?: { testDate?: string; labName?: string; reportType?: string }) => {
    if (!personId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `${personId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const uploadRes = await supabase.storage
      .from('health-reports')
      .upload(filePath, file);

    if (uploadRes.error) throw uploadRes.error;

    const fallbackDate = overrides?.testDate || new Date().toISOString().slice(0, 10);

    const reportRes = await supabase
      .from('health_reports')
      .insert({
        person_id: personId,
        test_date: fallbackDate,
        lab_name: overrides?.labName || null,
        report_type: overrides?.reportType || 'FULL_BODY',
        pdf_url: uploadRes.data?.path || filePath,
        status: 'PENDING',
        created_by: user.id,
      })
      .select()
      .single();

    if (reportRes.error) throw reportRes.error;
    const reportId = reportRes.data.id as string;

    const effectiveMarkers: HealthMarker[] = markers.length > 0 ? markers : healthMarkersSeed.map((seed, index) => ({
      id: `seed-${seed.code}-${index}`,
      ...seed,
    }));
    const effectiveByCode = new Map<string, HealthMarker>(effectiveMarkers.map(m => [m.code, m]));
    const effectiveByName = new Map<string, HealthMarker>(effectiveMarkers.map(m => [normalizeMarkerKey(m.name), m]));

    try {
      // Convert file to base64 for Gemini API (Client-side)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // specific to FileReader result: "data:application/pdf;base64,..."
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const extraction = await parseHealthReport(base64Data, file.type || 'application/pdf');
      const testDate = extraction.testDate || fallbackDate;
      const labName = extraction.labName || overrides?.labName || null;

      const valueRows: HealthValue[] = extraction.markers.map(marker => {
        const code = mapMarkerCode(marker, effectiveByCode, effectiveByName);
        const match = code ? effectiveByCode.get(code) : undefined;
        const numericValue = marker.value !== undefined && marker.value !== null ? Number(marker.value) : null;
        const status = evaluateValueStatus(match, numericValue);
        return {
          id: `${reportId}-${marker.name}-${Math.random()}`,
          reportId,
          personId,
          markerCode: code,
          markerName: marker.name,
          marker: match,
          value: Number.isFinite(numericValue as number) ? numericValue : null,
          valueText: marker.valueText ?? null,
          unit: marker.unit || match?.unit || null,
          testDate,
          isFlagged: isFlaggedValue(match, numericValue),
          status,
        };
      });

      const ratios = buildRatios(valueRows, reportId, personId, testDate);

      if (valueRows.length > 0) {
        const { error } = await supabase.from('health_values').insert(
          valueRows.map(row => ({
            report_id: reportId,
            person_id: personId,
            marker_code: row.markerCode,
            marker_name: row.markerName,
            value: row.value,
            value_text: row.valueText,
            unit: row.unit,
            test_date: testDate,
            is_flagged: row.isFlagged,
          }))
        );
        if (error) throw error;
      }

      if (ratios.length > 0) {
        const { error } = await supabase.from('health_ratios').insert(
          ratios.map(ratio => ({
            report_id: reportId,
            person_id: personId,
            ratio_code: ratio.ratioCode,
            value: ratio.value,
            test_date: ratio.testDate,
            is_optimal: ratio.isOptimal,
          }))
        );
        if (error) throw error;
      }

      await supabase.from('health_reports').update({
        status: 'PROCESSED',
        lab_name: labName,
        test_date: testDate,
        raw_extraction: extraction,
      }).eq('id', reportId);
    } catch (err) {
      console.error('Health report processing failed', err);
      await supabase.from('health_reports').update({
        status: 'FAILED',
      }).eq('id', reportId);
      throw err;
    } finally {
      await fetchDashboard();
    }
  }, [fetchDashboard, markers, personId]);

  const dashboardData: HealthDashboardData = useMemo(() => {
    const allValues = reports.flatMap(r => r.values);
    const latestValues = reports[0]?.values ?? [];
    const systemSummaries = buildSystemSummaries(latestValues, markersByCode);
    const trends = buildTrends(allValues);
    return {
      latestReport: reports[0],
      allReports: reports,
      physicals,
      systemSummaries,
      trends,
    };
  }, [markersByCode, physicals, reports]);

  return {
    loading,
    error,
    markers,
    reports,
    physicals,
    dashboardData,
    fetchDashboard,
    addPhysical,
    uploadReport,
    loadMoreReports,
    hasMoreReports,
    loadingMore,
  };
};
