/**
 * Generates synthetic provider compensation data for testing.
 * Output: CSV with columns matching ProviderRecord schema.
 * Run: node scripts/generate-synthetic-providers.js
 */

// Seeded pseudo-random for reproducibility
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);
function rand() {
  return rng();
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randFloat(min, max) {
  return min + rand() * (max - min);
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// First/last names for realistic names
const firstNames = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
];
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

function randomName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

function escapeCsv(val) {
  if (val === undefined || val === null || val === '') return '';
  const s = String(val);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Phoenix Children's–style divisions (used for Primary_Division)
const DIVISIONS = [
  'Cardiology', 'Urology', 'Cardiothoracic', 'General Pediatrics', 'Hospitalist',
  'Emergency Medicine', 'Surgery', 'Orthopedics', 'Neonatology', 'Behavioral Health', 'Neurology',
];

// Physician specialties and base salary ranges (min, max); specialty maps to division
const PHYSICIAN_SPECIALTIES = [
  { specialty: 'Pediatrics', division: 'General Pediatrics', baseMin: 180000, baseMax: 260000 },
  { specialty: 'Hospital Medicine', division: 'Hospitalist', baseMin: 220000, baseMax: 300000 },
  { specialty: 'Cardiology', division: 'Cardiology', baseMin: 350000, baseMax: 420000 },
  { specialty: 'General Surgery', division: 'Surgery', baseMin: 320000, baseMax: 410000 },
  { specialty: 'Emergency Medicine', division: 'Emergency Medicine', baseMin: 280000, baseMax: 360000 },
  { specialty: 'Neonatology', division: 'Neonatology', baseMin: 260000, baseMax: 340000 },
  { specialty: 'Child Psychiatry', division: 'Behavioral Health', baseMin: 240000, baseMax: 320000 },
  { specialty: 'Urology', division: 'Urology', baseMin: 340000, baseMax: 430000 },
  { specialty: 'Cardiothoracic Surgery', division: 'Cardiothoracic', baseMin: 380000, baseMax: 480000 },
  { specialty: 'Orthopedics', division: 'Orthopedics', baseMin: 360000, baseMax: 450000 },
  { specialty: 'Neurology', division: 'Neurology', baseMin: 280000, baseMax: 360000 },
];

// PCP tier rules (YOE -> base range)
function pcpBaseForYoe(yoe) {
  if (yoe < 4) return [135000, 150000];
  if (yoe < 8) return [190000, 210000];
  return [205000, 230000];
}

// APP benchmark groups and their divisions (Phoenix Children's–style)
const APP_BENCHMARK_GROUPS = ['Combined_General', 'Cardiothoracic', 'Emergency', 'Neonatal', 'Child_Psych'];
const APP_DIVISION_BY_BENCHMARK = {
  Combined_General: 'General Pediatrics',
  Cardiothoracic: 'Cardiothoracic',
  Emergency: 'Emergency Medicine',
  Neonatal: 'Neonatology',
  Child_Psych: 'Behavioral Health',
};

// Shared CSV column order (all ProviderRecord keys we use)
const CSV_HEADERS = [
  'Employee_ID', 'Provider_Name', 'Primary_Division', 'Department', 'Provider_Type', 'Specialty', 'Benchmark_Group',
  'Population', 'Compensation_Plan', 'Years_of_Experience', 'Current_FTE', 'Clinical_FTE',
  'Current_Base_Salary', 'Current_TCC', 'Current_CF', 'Current_Target_WRVUs', 'Prior_Year_WRVUs',
  'Current_TCC_Percentile', 'WRVU_Percentile', 'Evaluation_Score',
  'Percent_of_Year_Employed', 'Prior_Year_WRVU_Incentive', 'Current_Compa_Ratio',
];

function rowToCsv(row) {
  return CSV_HEADERS.map((h) => escapeCsv(row[h])).join(',');
}

// Approximate WRVU percentile from prior year WRVUs (simplified market 25/50/75/90)
function wrvuToPercentile(wrvus) {
  // Rough curve: 2500->~15, 4500->~40, 5500->~50, 7000->~70, 9000->~90
  const p = Math.min(99, Math.max(5, (wrvus - 2500) / 6500 * 85 + 10));
  return Math.round(p + (rand() - 0.5) * 8);
}

// TCC percentile correlated with WRVU percentile but with variance
function tccPercentileFromWrvu(wrvuPct) {
  const correlated = wrvuPct + (rand() - 0.5) * 20;
  return Math.min(99, Math.max(5, Math.round(correlated)));
}

function generatePhysicians(count) {
  const rows = [];
  const usedNames = new Set();
  let id = 1000;
  // ~35 PCP (tier), rest non-PCP with specialties
  const pcpCount = Math.floor(count * 0.29);
  for (let i = 0; i < count; i++) {
    const isPCP = i < pcpCount;
    let name = randomName();
    while (usedNames.has(name)) name = randomName();
    usedNames.add(name);

    const yoe = randFloat(0, 25);
    const clinicalFte = randFloat(0.6, 1.0);
    const currentFte = Math.round(clinicalFte * 10) / 10;
    const cf = randFloat(36, 60);
    const targetWrvus = randInt(4000, 6500);
    let priorWrvus = randInt(2500, 9000);
    const incentive = cf * Math.max(priorWrvus - targetWrvus, 0);
    const supplemental = rand() < 0.25 ? randInt(2000, 15000) : 0;

    let baseSalary;
    let division;
    let specialty;
    let compensationPlan;

    if (isPCP) {
      division = 'General Pediatrics';
      specialty = 'Primary Care';
      compensationPlan = 'tier';
      const [bMin, bMax] = pcpBaseForYoe(yoe);
      baseSalary = randInt(bMin, bMax);
    } else {
      const spec = pick(PHYSICIAN_SPECIALTIES);
      division = spec.division;
      specialty = spec.specialty;
      compensationPlan = pick(['wrvu', 'hybrid']);
      baseSalary = randInt(spec.baseMin, spec.baseMax);
    }

    const currentTcc = Math.round(baseSalary + incentive + supplemental);
    const wrvuPct = wrvuToPercentile(priorWrvus);
    const tccPct = tccPercentileFromWrvu(wrvuPct);
    const evalScore = randInt(1, 5);

    rows.push({
      Employee_ID: `PHY${id++}`,
      Provider_Name: name,
      Primary_Division: division,
      Department: specialty === 'Primary Care' ? 'General Pediatrics' : division,
      Provider_Type: 'physician',
      Specialty: specialty,
      Benchmark_Group: '',
      Population: 'physician',
      Compensation_Plan: compensationPlan,
      Years_of_Experience: Math.round(yoe * 10) / 10,
      Current_FTE: currentFte,
      Clinical_FTE: Math.round(clinicalFte * 10) / 10,
      Current_Base_Salary: baseSalary,
      Current_TCC: currentTcc,
      Current_CF: Math.round(cf * 10) / 10,
      Current_Target_WRVUs: targetWrvus,
      Prior_Year_WRVUs: priorWrvus,
      Current_TCC_Percentile: tccPct,
      WRVU_Percentile: wrvuPct,
      Evaluation_Score: evalScore,
    });
  }
  return rows;
}

function generateAPPs(count) {
  const rows = [];
  const usedNames = new Set();
  let id = 2000;
  for (let i = 0; i < count; i++) {
    let name = randomName();
    while (usedNames.has(name)) name = randomName();
    usedNames.add(name);

    const salary = randInt(100000, 180000);
    const tcc = salary + (rand() < 0.3 ? randInt(1000, 8000) : 0);
    const yoe = randFloat(0, 20);
    const fte = randFloat(0.6, 1.0);

    const appBenchmark = pick(APP_BENCHMARK_GROUPS);
    rows.push({
      Employee_ID: `APP${id++}`,
      Provider_Name: name,
      Primary_Division: APP_DIVISION_BY_BENCHMARK[appBenchmark] || 'General Pediatrics',
      Department: '',
      Provider_Type: 'app',
      Specialty: '',
      Benchmark_Group: appBenchmark,
      Population: 'app',
      Compensation_Plan: 'salary',
      Years_of_Experience: Math.round(yoe * 10) / 10,
      Current_FTE: Math.round(fte * 10) / 10,
      Clinical_FTE: '',
      Current_Base_Salary: salary,
      Current_TCC: tcc,
      Current_CF: '',
      Current_Target_WRVUs: '',
      Prior_Year_WRVUs: '',
      Current_TCC_Percentile: '',
      WRVU_Percentile: '',
      Evaluation_Score: randInt(1, 5),
    });
  }
  return rows;
}

function generateTherapists(count) {
  const rows = [];
  const usedNames = new Set();
  let id = 3000;
  for (let i = 0; i < count; i++) {
    let name = randomName();
    while (usedNames.has(name)) name = randomName();
    usedNames.add(name);

    const salary = randInt(85000, 125000);
    const yoe = randFloat(0, 22);
    const fte = randFloat(0.6, 1.0);

    rows.push({
      Employee_ID: `MHT${id++}`,
      Provider_Name: name,
      Primary_Division: 'Behavioral Health',
      Department: '',
      Provider_Type: 'therapist',
      Specialty: '',
      Benchmark_Group: '',
      Population: 'mental_health',
      Compensation_Plan: 'salary',
      Years_of_Experience: Math.round(yoe * 10) / 10,
      Current_FTE: Math.round(fte * 10) / 10,
      Clinical_FTE: '',
      Current_Base_Salary: salary,
      Current_TCC: salary,
      Current_CF: '',
      Current_Target_WRVUs: '',
      Prior_Year_WRVUs: '',
      Current_TCC_Percentile: '',
      WRVU_Percentile: '',
      Evaluation_Score: randInt(1, 5),
    });
  }
  return rows;
}

/** Edge-case providers for testing: low FTE, high WRVUs, zero incentive, mid-year hire, above/below market, APP benchmark, high compa. */
function generateEdgeCaseProviders() {
  return [
    {
      Employee_ID: 'EDG001',
      Provider_Name: 'Alex Rivera',
      Primary_Division: 'Cardiology',
      Department: 'Cardiology',
      Provider_Type: 'physician',
      Specialty: 'Cardiology',
      Benchmark_Group: 'Cardiology',
      Population: 'physician',
      Compensation_Plan: 'wrvu',
      Years_of_Experience: 10,
      Current_FTE: 0.3,
      Clinical_FTE: 0.3,
      Current_Base_Salary: 120000,
      Current_TCC: 135000,
      Current_CF: 55,
      Current_Target_WRVUs: 1950,
      Prior_Year_WRVUs: 2100,
      Current_TCC_Percentile: 48,
      WRVU_Percentile: 52,
      Evaluation_Score: 4,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: 13500,
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG002',
      Provider_Name: 'Jordan Blake',
      Primary_Division: 'Orthopedics',
      Department: 'Orthopedics',
      Provider_Type: 'physician',
      Specialty: 'Orthopedics',
      Benchmark_Group: 'Orthopedics',
      Population: 'physician',
      Compensation_Plan: 'wrvu',
      Years_of_Experience: 15,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 450000,
      Current_TCC: 787500,
      Current_CF: 56.25,
      Current_Target_WRVUs: 7200,
      Prior_Year_WRVUs: 12000,
      Current_TCC_Percentile: 98,
      WRVU_Percentile: 99,
      Evaluation_Score: 4.5,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: 337500,
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG003',
      Provider_Name: 'Sam Foster',
      Primary_Division: 'Hospitalist',
      Department: 'Internal Medicine',
      Provider_Type: 'physician',
      Specialty: 'Internal Medicine',
      Benchmark_Group: 'Internal Medicine',
      Population: 'physician',
      Compensation_Plan: 'wrvu',
      Years_of_Experience: 6,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 280000,
      Current_TCC: 280000,
      Current_CF: 50,
      Current_Target_WRVUs: 4800,
      Prior_Year_WRVUs: 3600,
      Current_TCC_Percentile: 42,
      WRVU_Percentile: 25,
      Evaluation_Score: 3,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: 0,
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG004',
      Provider_Name: 'Casey Morgan',
      Primary_Division: 'General Pediatrics',
      Department: 'Family Medicine',
      Provider_Type: 'physician',
      Specialty: 'Family Medicine',
      Benchmark_Group: 'Family Medicine',
      Population: 'physician',
      Compensation_Plan: 'wrvu',
      Years_of_Experience: 4,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 112000,
      Current_TCC: 128000,
      Current_CF: 50,
      Current_Target_WRVUs: 1680,
      Prior_Year_WRVUs: 1400,
      Current_TCC_Percentile: 48,
      WRVU_Percentile: 42,
      Evaluation_Score: 4,
      Percent_of_Year_Employed: 0.4,
      Prior_Year_WRVU_Incentive: 12000,
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG005',
      Provider_Name: 'Robin Hayes',
      Primary_Division: 'Cardiology',
      Department: 'Cardiology',
      Provider_Type: 'physician',
      Specialty: 'Cardiology',
      Benchmark_Group: 'Cardiology',
      Population: 'physician',
      Compensation_Plan: 'wrvu',
      Years_of_Experience: 20,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 520000,
      Current_TCC: 620000,
      Current_CF: 55,
      Current_Target_WRVUs: 6500,
      Prior_Year_WRVUs: 8000,
      Current_TCC_Percentile: 97,
      WRVU_Percentile: 88,
      Evaluation_Score: 4.5,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: 100000,
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG006',
      Provider_Name: 'Quinn Ellis',
      Primary_Division: 'Hospitalist',
      Department: 'Internal Medicine',
      Provider_Type: 'physician',
      Specialty: 'Internal Medicine',
      Benchmark_Group: 'Internal Medicine',
      Population: 'physician',
      Compensation_Plan: 'wrvu',
      Years_of_Experience: 2,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 200000,
      Current_TCC: 220000,
      Current_CF: 48,
      Current_Target_WRVUs: 4800,
      Prior_Year_WRVUs: 4500,
      Current_TCC_Percentile: 8,
      WRVU_Percentile: 42,
      Evaluation_Score: 3.5,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: 20000,
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG007',
      Provider_Name: 'Taylor Reed',
      Primary_Division: 'Neonatology',
      Department: 'Neonatology',
      Provider_Type: 'app',
      Specialty: 'Neonatology',
      Benchmark_Group: 'Neonatal',
      Population: 'app',
      Compensation_Plan: 'salary',
      Years_of_Experience: 8,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 145000,
      Current_TCC: 148000,
      Current_CF: '',
      Current_Target_WRVUs: 3200,
      Prior_Year_WRVUs: 3100,
      Current_TCC_Percentile: 55,
      WRVU_Percentile: 52,
      Evaluation_Score: 4,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: '',
      Current_Compa_Ratio: '',
    },
    {
      Employee_ID: 'EDG008',
      Provider_Name: 'Morgan Tate',
      Primary_Division: 'Behavioral Health',
      Department: 'Behavioral Health',
      Provider_Type: 'therapist',
      Specialty: 'Mental Health Therapist',
      Benchmark_Group: 'Mental Health Therapist',
      Population: 'allied',
      Compensation_Plan: 'salary',
      Years_of_Experience: 12,
      Current_FTE: 1,
      Clinical_FTE: 1,
      Current_Base_Salary: 108000,
      Current_TCC: 108000,
      Current_CF: '',
      Current_Target_WRVUs: 1200,
      Prior_Year_WRVUs: 1320,
      Current_TCC_Percentile: 92,
      WRVU_Percentile: 72,
      Evaluation_Score: 4.5,
      Percent_of_Year_Employed: 1,
      Prior_Year_WRVU_Incentive: '',
      Current_Compa_Ratio: 1.24,
    },
  ];
}

// Supplemental compensation CSV: Employee_ID + optional pay components (most physicians get 0).
const SUPPLEMENTAL_HEADERS = ['Employee_ID', 'Division_Chief_Pay', 'Medical_Director_Pay', 'Teaching_Pay', 'PSQ_Pay'];

/** Ranges for supplemental pay (inclusive). Most providers get 0; some get values in these ranges. */
const SUPPLEMENTAL_RANGES = {
  Division_Chief_Pay: [25000, 90000],
  Medical_Director_Pay: [15000, 60000],
  Teaching_Pay: [5000, 30000],
  PSQ_Pay: [2000, 20000],
};

/**
 * Generate synthetic supplemental compensation for physicians only.
 * Most rows have 0 for all pay types; some have one or more in the defined ranges.
 */
function generateSupplementalComp(physicianRows) {
  return physicianRows.map((row) => {
    const out = {
      Employee_ID: row.Employee_ID,
      Division_Chief_Pay: 0,
      Medical_Director_Pay: 0,
      Teaching_Pay: 0,
      PSQ_Pay: 0,
    };
    // Most providers: all zeros (~85%). Some get one or more supplemental pay types.
    if (rand() < 0.85) return out;
    if (rand() < 0.35) out.Division_Chief_Pay = randInt(...SUPPLEMENTAL_RANGES.Division_Chief_Pay);
    if (rand() < 0.35) out.Medical_Director_Pay = randInt(...SUPPLEMENTAL_RANGES.Medical_Director_Pay);
    if (rand() < 0.45) out.Teaching_Pay = randInt(...SUPPLEMENTAL_RANGES.Teaching_Pay);
    if (rand() < 0.4) out.PSQ_Pay = randInt(...SUPPLEMENTAL_RANGES.PSQ_Pay);
    return out;
  });
}

function supplementalRowToCsv(row) {
  return SUPPLEMENTAL_HEADERS.map((h) => escapeCsv(row[h])).join(',');
}

async function main() {
  const physicians = generatePhysicians(120);
  const app = generateAPPs(80);
  const therapists = generateTherapists(30);
  const edgeCases = generateEdgeCaseProviders();
  const all = [...physicians, ...app, ...therapists, ...edgeCases];

  const lines = [CSV_HEADERS.join(','), ...all.map(rowToCsv)];
  const csv = lines.join('\n');
  const { mkdirSync, writeFileSync } = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.join(__dirname, '..', 'public');
  mkdirSync(outDir, { recursive: true });

  const providerPath = path.join(outDir, 'synthetic-providers.csv');
  writeFileSync(providerPath, csv, 'utf8');
  console.log(`Wrote ${all.length} records to ${providerPath}`);

  const physicianRows = [...physicians, ...edgeCases.filter((r) => r.Population === 'physician')];
  const supplementalRows = generateSupplementalComp(physicianRows);
  const supplementalLines = [SUPPLEMENTAL_HEADERS.join(','), ...supplementalRows.map(supplementalRowToCsv)];
  const supplementalPath = path.join(outDir, 'synthetic-supplemental.csv');
  writeFileSync(supplementalPath, supplementalLines.join('\n'), 'utf8');
  console.log(`Wrote ${supplementalRows.length} supplemental records to ${supplementalPath}`);
}

main();
