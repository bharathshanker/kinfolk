-- Health dashboard schema and seed data

-- Reference markers
create table public.health_markers (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  name text not null,
  unit text,
  system text not null,
  optimal_min numeric,
  optimal_max numeric,
  lab_min numeric,
  lab_max numeric,
  description text,
  display_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Uploaded reports
create table public.health_reports (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  test_date date not null,
  lab_name text,
  report_type text default 'FULL_BODY',
  pdf_url text,
  raw_extraction jsonb,
  status text default 'PENDING',
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Individual marker values
create table public.health_values (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.health_reports(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade not null,
  marker_code text references public.health_markers(code),
  marker_name text,
  value numeric,
  value_text text,
  unit text,
  test_date date not null,
  is_flagged boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Physical measurements
create table public.health_physicals (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  measurement_date date not null,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric,
  waist_cm numeric,
  hip_cm numeric,
  waist_hip_ratio numeric,
  bp_systolic int,
  bp_diastolic int,
  resting_hr int,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Calculated ratios
create table public.health_ratios (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.health_reports(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade not null,
  ratio_code text not null,
  value numeric not null,
  test_date date not null,
  is_optimal boolean,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index health_reports_person_idx on public.health_reports(person_id, test_date desc);
create index health_values_person_idx on public.health_values(person_id, test_date desc);
create index health_values_report_idx on public.health_values(report_id);
create index health_ratios_person_idx on public.health_ratios(person_id, test_date desc);
create index health_physicals_person_idx on public.health_physicals(person_id, measurement_date desc);

alter table public.health_markers enable row level security;
alter table public.health_reports enable row level security;
alter table public.health_values enable row level security;
alter table public.health_physicals enable row level security;
alter table public.health_ratios enable row level security;

create policy "Health markers are viewable by everyone."
  on public.health_markers for select
  using ( true );

create policy "View health reports if access to person."
  on public.health_reports for select
  using ( has_access_to_person(person_id) );

create policy "Add health reports if access to person."
  on public.health_reports for insert
  with check ( has_access_to_person(person_id) );

create policy "Update health reports if access to person."
  on public.health_reports for update
  using ( has_access_to_person(person_id) );

create policy "Delete health reports if access to person."
  on public.health_reports for delete
  using ( has_access_to_person(person_id) );

create policy "View health values if access to person."
  on public.health_values for select
  using ( has_access_to_person(person_id) );

create policy "Add health values if access to person."
  on public.health_values for insert
  with check ( has_access_to_person(person_id) );

create policy "Update health values if access to person."
  on public.health_values for update
  using ( has_access_to_person(person_id) );

create policy "Delete health values if access to person."
  on public.health_values for delete
  using ( has_access_to_person(person_id) );

create policy "View physicals if access to person."
  on public.health_physicals for select
  using ( has_access_to_person(person_id) );

create policy "Add physicals if access to person."
  on public.health_physicals for insert
  with check ( has_access_to_person(person_id) );

create policy "Update physicals if access to person."
  on public.health_physicals for update
  using ( has_access_to_person(person_id) );

create policy "Delete physicals if access to person."
  on public.health_physicals for delete
  using ( has_access_to_person(person_id) );

create policy "View ratios if access to person."
  on public.health_ratios for select
  using ( has_access_to_person(person_id) );

create policy "Add ratios if access to person."
  on public.health_ratios for insert
  with check ( has_access_to_person(person_id) );

create policy "Update ratios if access to person."
  on public.health_ratios for update
  using ( has_access_to_person(person_id) );

create policy "Delete ratios if access to person."
  on public.health_ratios for delete
  using ( has_access_to_person(person_id) );

-- Storage bucket for health report PDFs
insert into storage.buckets (id, name, public)
values ('health-reports', 'health-reports', false)
on conflict (id) do nothing;

create policy "Authenticated users can view health reports"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'health-reports' );

create policy "Authenticated users can upload health reports"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'health-reports' );

create policy "Authenticated users can update health reports"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'health-reports' );

-- Seed health markers (core set)
insert into public.health_markers
  (code, name, unit, system, optimal_min, optimal_max, lab_min, lab_max, description, display_order)
values
  ('GLUCOSE_FASTING', 'Fasting Glucose', 'mg/dL', 'METABOLIC', 70, 90, 70, 99, 'Fasting blood glucose', 10),
  ('HBA1C', 'HbA1c', '%', 'METABOLIC', 4.8, 5.3, 4, 5.6, 'Average blood glucose (3 months)', 20),
  ('INSULIN_FASTING', 'Fasting Insulin', 'uIU/mL', 'METABOLIC', 2, 6, 2, 25, 'Fasting insulin level', 30),

  ('CHOL_TOTAL', 'Total Cholesterol', 'mg/dL', 'LIPIDS', 150, 200, 125, 200, 'Total cholesterol', 10),
  ('LDL', 'LDL Cholesterol', 'mg/dL', 'LIPIDS', 50, 100, 0, 129, 'Low-density lipoprotein', 20),
  ('HDL', 'HDL Cholesterol', 'mg/dL', 'LIPIDS', 50, 80, 40, 60, 'High-density lipoprotein', 30),
  ('TRIGLYCERIDES', 'Triglycerides', 'mg/dL', 'LIPIDS', 50, 100, 0, 150, 'Triglycerides', 40),
  ('VLDL', 'VLDL Cholesterol', 'mg/dL', 'LIPIDS', 5, 20, 0, 30, 'Very low-density lipoprotein', 50),
  ('NON_HDL', 'Non-HDL Cholesterol', 'mg/dL', 'LIPIDS', 80, 130, 0, 160, 'Total minus HDL', 60),
  ('APOB', 'Apolipoprotein B', 'mg/dL', 'LIPIDS', 60, 90, 50, 120, 'ApoB particles', 70),

  ('AST', 'AST (SGOT)', 'U/L', 'LIVER', 10, 30, 10, 40, 'Aspartate aminotransferase', 10),
  ('ALT', 'ALT (SGPT)', 'U/L', 'LIVER', 10, 30, 7, 40, 'Alanine aminotransferase', 20),
  ('ALP', 'Alkaline Phosphatase', 'U/L', 'LIVER', 50, 100, 44, 120, 'Alkaline phosphatase', 30),
  ('GGT', 'GGT', 'U/L', 'LIVER', 8, 30, 0, 60, 'Gamma-glutamyl transferase', 40),
  ('BILIRUBIN_TOTAL', 'Bilirubin Total', 'mg/dL', 'LIVER', 0.3, 1.0, 0.1, 1.2, 'Total bilirubin', 50),
  ('BILIRUBIN_DIRECT', 'Bilirubin Direct', 'mg/dL', 'LIVER', 0.0, 0.3, 0.0, 0.3, 'Direct bilirubin', 60),
  ('BILIRUBIN_INDIRECT', 'Bilirubin Indirect', 'mg/dL', 'LIVER', 0.2, 0.7, 0.2, 0.9, 'Indirect bilirubin', 70),
  ('ALBUMIN', 'Albumin', 'g/dL', 'LIVER', 4.0, 5.0, 3.5, 5.2, 'Serum albumin', 80),
  ('GLOBULIN', 'Globulin', 'g/dL', 'LIVER', 2.0, 3.0, 2.0, 3.5, 'Serum globulin', 90),
  ('TOTAL_PROTEIN', 'Total Protein', 'g/dL', 'LIVER', 6.5, 8.0, 6.0, 8.3, 'Total serum protein', 100),

  ('CREATININE', 'Creatinine', 'mg/dL', 'KIDNEY', 0.7, 1.1, 0.6, 1.3, 'Serum creatinine', 10),
  ('BUN', 'BUN', 'mg/dL', 'KIDNEY', 10, 20, 7, 20, 'Blood urea nitrogen', 20),
  ('UREA', 'Urea', 'mg/dL', 'KIDNEY', 15, 40, 15, 40, 'Serum urea', 30),
  ('URIC_ACID', 'Uric Acid', 'mg/dL', 'KIDNEY', 3.5, 6.5, 2.5, 7.0, 'Uric acid', 40),
  ('EGFR', 'eGFR', 'mL/min/1.73m2', 'KIDNEY', 90, 120, 60, 120, 'Estimated glomerular filtration rate', 50),
  ('MICROALBUMIN', 'Microalbumin', 'mg/L', 'KIDNEY', 0, 20, 0, 30, 'Urine microalbumin', 60),

  ('HEMOGLOBIN', 'Hemoglobin', 'g/dL', 'BLOOD', 13.0, 16.0, 12.0, 17.5, 'Hemoglobin', 10),
  ('RBC', 'RBC', '10^6/uL', 'BLOOD', 4.2, 5.4, 3.8, 5.9, 'Red blood cell count', 20),
  ('WBC', 'WBC', '10^3/uL', 'BLOOD', 4.0, 7.5, 3.5, 10.5, 'White blood cell count', 30),
  ('PLATELETS', 'Platelets', '10^3/uL', 'BLOOD', 150, 350, 150, 450, 'Platelet count', 40),
  ('HEMATOCRIT', 'Hematocrit', '%', 'BLOOD', 40, 48, 36, 50, 'Hematocrit', 50),
  ('MCV', 'MCV', 'fL', 'BLOOD', 82, 92, 80, 100, 'Mean corpuscular volume', 60),
  ('MCH', 'MCH', 'pg', 'BLOOD', 27, 32, 26, 34, 'Mean corpuscular hemoglobin', 70),
  ('MCHC', 'MCHC', 'g/dL', 'BLOOD', 32, 36, 31, 37, 'Mean corpuscular hemoglobin concentration', 80),
  ('RDW', 'RDW', '%', 'BLOOD', 11.5, 13.5, 11.0, 15.0, 'Red cell distribution width', 90),
  ('NEUTROPHILS_PCT', 'Neutrophils %', '%', 'BLOOD', 40, 60, 40, 70, 'Neutrophils percent', 100),
  ('LYMPHOCYTES_PCT', 'Lymphocytes %', '%', 'BLOOD', 20, 40, 20, 45, 'Lymphocytes percent', 110),
  ('MONOCYTES_PCT', 'Monocytes %', '%', 'BLOOD', 2, 8, 2, 10, 'Monocytes percent', 120),
  ('EOSINOPHILS_PCT', 'Eosinophils %', '%', 'BLOOD', 1, 4, 0, 6, 'Eosinophils percent', 130),
  ('BASOPHILS_PCT', 'Basophils %', '%', 'BLOOD', 0, 1, 0, 2, 'Basophils percent', 140),
  ('NEUTROPHILS_ABS', 'Neutrophils (Absolute)', '10^3/uL', 'BLOOD', 1.5, 5.0, 1.5, 7.5, 'Absolute neutrophil count', 150),
  ('LYMPHOCYTES_ABS', 'Lymphocytes (Absolute)', '10^3/uL', 'BLOOD', 1.0, 3.0, 1.0, 4.0, 'Absolute lymphocyte count', 160),
  ('MONOCYTES_ABS', 'Monocytes (Absolute)', '10^3/uL', 'BLOOD', 0.2, 0.8, 0.2, 1.0, 'Absolute monocyte count', 170),
  ('EOSINOPHILS_ABS', 'Eosinophils (Absolute)', '10^3/uL', 'BLOOD', 0.0, 0.4, 0.0, 0.6, 'Absolute eosinophil count', 180),
  ('BASOPHILS_ABS', 'Basophils (Absolute)', '10^3/uL', 'BLOOD', 0.0, 0.1, 0.0, 0.2, 'Absolute basophil count', 190),

  ('CRP', 'CRP', 'mg/L', 'INFLAMMATION', 0, 1, 0, 3, 'C-reactive protein', 10),
  ('HS_CRP', 'hs-CRP', 'mg/L', 'INFLAMMATION', 0, 1, 0, 3, 'High sensitivity CRP', 20),
  ('ESR', 'ESR', 'mm/hr', 'INFLAMMATION', 0, 15, 0, 20, 'Erythrocyte sedimentation rate', 30),

  ('TSH', 'TSH', 'uIU/mL', 'THYROID', 0.5, 2.0, 0.4, 4.5, 'Thyroid stimulating hormone', 10),
  ('T3_TOTAL', 'T3 Total', 'ng/dL', 'THYROID', 80, 180, 80, 200, 'Total triiodothyronine', 20),
  ('T4_TOTAL', 'T4 Total', 'ug/dL', 'THYROID', 5, 12, 5, 12.5, 'Total thyroxine', 30),
  ('FREE_T3', 'Free T3', 'pg/mL', 'THYROID', 2.3, 4.2, 2.0, 4.4, 'Free triiodothyronine', 40),
  ('FREE_T4', 'Free T4', 'ng/dL', 'THYROID', 0.9, 1.7, 0.8, 1.8, 'Free thyroxine', 50),

  ('VITAMIN_D', 'Vitamin D (25-OH)', 'ng/mL', 'VITAMINS', 30, 50, 20, 60, 'Vitamin D 25-OH', 10),
  ('VITAMIN_B12', 'Vitamin B12', 'pg/mL', 'VITAMINS', 400, 900, 200, 900, 'Vitamin B12', 20),
  ('FOLATE', 'Folate (B9)', 'ng/mL', 'VITAMINS', 8, 20, 3, 20, 'Folate', 30),
  ('IRON', 'Iron', 'ug/dL', 'VITAMINS', 60, 150, 50, 170, 'Serum iron', 40),
  ('FERRITIN', 'Ferritin', 'ng/mL', 'VITAMINS', 30, 150, 15, 200, 'Ferritin', 50),
  ('TIBC', 'TIBC', 'ug/dL', 'VITAMINS', 250, 350, 250, 450, 'Total iron binding capacity', 60),
  ('TRANSFERRIN_SAT', 'Transferrin Saturation', '%', 'VITAMINS', 20, 45, 15, 50, 'Transferrin saturation', 70),
  ('CALCIUM', 'Calcium', 'mg/dL', 'VITAMINS', 9.2, 10.2, 8.6, 10.3, 'Serum calcium', 80),

  ('SODIUM', 'Sodium', 'mmol/L', 'ELECTROLYTES', 136, 142, 135, 145, 'Serum sodium', 10),
  ('POTASSIUM', 'Potassium', 'mmol/L', 'ELECTROLYTES', 3.8, 4.8, 3.5, 5.1, 'Serum potassium', 20),
  ('CHLORIDE', 'Chloride', 'mmol/L', 'ELECTROLYTES', 98, 106, 98, 107, 'Serum chloride', 30),
  ('MAGNESIUM', 'Magnesium', 'mg/dL', 'ELECTROLYTES', 1.9, 2.2, 1.6, 2.4, 'Serum magnesium', 40),
  ('CO2', 'CO2 (Bicarbonate)', 'mEq/L', 'ELECTROLYTES', 22, 28, 22, 29, 'Serum bicarbonate', 50),
  ('PHOSPHORUS', 'Phosphorus', 'mg/dL', 'ELECTROLYTES', 2.5, 4.5, 2.5, 4.5, 'Serum phosphorus', 60),

  ('TESTOSTERONE_TOTAL', 'Testosterone (Total)', 'ng/dL', 'HORMONES', 400, 800, 300, 1000, 'Total testosterone', 10),
  ('ESTRADIOL', 'Estradiol', 'pg/mL', 'HORMONES', 20, 50, 10, 80, 'Estradiol (E2)', 20),
  ('CORTISOL_AM', 'Cortisol (AM)', 'ug/dL', 'HORMONES', 10, 18, 6, 20, 'Morning cortisol', 30),
  ('DHEA_S', 'DHEA-S', 'ug/dL', 'HORMONES', 100, 300, 50, 350, 'DHEA sulfate', 40),

  ('PTH', 'Parathyroid Hormone (PTH)', 'pg/mL', 'BONE', 20, 50, 10, 65, 'Parathyroid hormone', 10)
ON CONFLICT (code) DO NOTHING;
