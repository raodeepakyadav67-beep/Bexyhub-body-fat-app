import { useMemo, useState } from 'react';
import {
  Activity,
  Gauge,
  HeartPulse,
  Info,
  Ruler,
  Scale,
  User,
  Calculator,
  RefreshCw,
} from 'lucide-react';

type Gender = 'male' | 'female';

interface Inputs {
  gender: Gender;
  weight: string;
  height: string;
  waist: string;
  neck: string;
  hip: string;
}

interface Result {
  bodyFat: number;
  bmi: number;
  category: string;
  categoryColor: string;
  visceral: 'Low' | 'Moderate' | 'High';
  bmr: number;
  leanMass: number;
  fatMass: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

const bodyFatCategory = (bf: number, gender: Gender): { label: string; color: string } => {
  const thresholds =
    gender === 'male'
      ? [
          [2, 'Essential', '#22c55e'],
          [6, 'Athletic', '#22c55e'],
          [14, 'Fitness', '#84cc16'],
          [18, 'Average', '#eab308'],
          [25, 'Above Average', '#f97316'],
          [100, 'High Risk', '#ef4444'],
        ]
      : [
          [10, 'Essential', '#22c55e'],
          [14, 'Athletic', '#22c55e'],
          [21, 'Fitness', '#84cc16'],
          [25, 'Average', '#eab308'],
          [32, 'Above Average', '#f97316'],
          [100, 'High Risk', '#ef4444'],
        ];
  for (const [max, label, color] of thresholds) {
    if (bf < max) return { label, color };
  }
  return { label: 'High Risk', color: '#ef4444' };
};

const bmiCategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#38bdf8' };
  if (bmi < 25) return { label: 'Healthy', color: '#22c55e' };
  if (bmi < 30) return { label: 'Overweight', color: '#eab308' };
  if (bmi < 35) return { label: 'Obese (Class I)', color: '#f97316' };
  if (bmi < 40) return { label: 'Obese (Class II)', color: '#ef4444' };
  return { label: 'Obese (Class III)', color: '#dc2626' };
};

export default function App() {
  const [inputs, setInputs] = useState<Inputs>({
    gender: 'male',
    weight: '',
    height: '',
    waist: '',
    neck: '',
    hip: '',
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const update = (key: keyof Inputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setResult(null);
    setError(null);
  };

  const calculate = () => {
    const gender = inputs.gender;
    const w = parseFloat(inputs.weight);
    const h = parseFloat(inputs.height);
    const waist = parseFloat(inputs.waist);
    const neck = parseFloat(inputs.neck);
    const hip = parseFloat(inputs.hip);

    if (!w || !h || !waist || !neck) {
      setError('Please fill in all required fields.');
      return;
    }
    if (gender === 'female' && !hip) {
      setError('Hip circumference is required for the female formula.');
      return;
    }
    if (waist <= neck || (gender === 'female' && waist + (hip || 0) <= neck)) {
      setError('Waist (plus hip for females) must be greater than neck circumference.');
      return;
    }

    // US Navy Body Fat formula
    const log = Math.log10;
    let bodyFat: number;
    if (gender === 'male') {
      bodyFat = 495 / (1.0324 - 0.19077 * log(waist - neck) + 0.15456 * log(h)) - 450;
    } else {
      bodyFat = 495 / (1.29579 - 0.35004 * log(waist + hip - neck) + 0.22100 * log(h)) - 450;
    }
    bodyFat = Math.max(0, Math.min(bodyFat, 60));

    const bmi = w / Math.pow(h / 100, 2);
    const fatMass = (w * bodyFat) / 100;
    const leanMass = w - fatMass;

    // BMR via Katch-McArdle (lean-mass based, more accurate for varying bf%)
    const bmr = 370 + 21.6 * leanMass;

    // Visceral adipose risk proxy (waist-to-height ratio)
    const wHtRatio = waist / h;
    const visceral: Result['visceral'] =
      wHtRatio < 0.5 ? 'Low' : wHtRatio < 0.6 ? 'Moderate' : 'High';

    const cat = bodyFatCategory(bodyFat, gender);
    setResult({
      bodyFat: round(bodyFat),
      bmi: round(bmi),
      category: cat.label,
      categoryColor: cat.color,
      visceral,
      bmr: Math.round(bmr),
      leanMass: round(leanMass),
      fatMass: round(fatMass),
    });
  };

  const reset = () => {
    setInputs({ gender: 'male', weight: '', height: '', waist: '', neck: '', hip: '' });
    setResult(null);
    setError(null);
  };

  const bmiCat = useMemo(() => (result ? bmiCategory(result.bmi) : null), [result]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-medium mb-4">
            <Activity className="w-3.5 h-3.5" />
            Bexyhub Health Analytics
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">
            Body Fat &amp; Visceral Adipose Index
          </h1>
          <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-md mx-auto">
            Estimate body composition, metabolic risk, and resting energy expenditure using the
            US Navy circumference method.
          </p>
        </header>

        {/* Main card */}
        <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 shadow-2xl shadow-sky-950/40 overflow-hidden">
          {/* Gender toggle */}
          <div className="p-6 sm:p-8 border-b border-slate-800">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
              <User className="w-4 h-4" /> Biological Sex
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['male', 'female'] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => update('gender', g)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    inputs.gender === g
                      ? 'bg-sky-500/20 border border-sky-400/50 text-sky-200 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {g === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-5">
            <Field
              icon={<Scale className="w-4 h-4" />}
              label="Weight"
              unit="kg"
              value={inputs.weight}
              onChange={(v) => update('weight', v)}
              placeholder="70"
            />
            <Field
              icon={<Ruler className="w-4 h-4" />}
              label="Height"
              unit="cm"
              value={inputs.height}
              onChange={(v) => update('height', v)}
              placeholder="175"
            />
            <Field
              icon={<Ruler className="w-4 h-4" />}
              label="Waist"
              unit="cm"
              value={inputs.waist}
              onChange={(v) => update('waist', v)}
              placeholder="85"
            />
            <Field
              icon={<Ruler className="w-4 h-4" />}
              label="Neck"
              unit="cm"
              value={inputs.neck}
              onChange={(v) => update('neck', v)}
              placeholder="38"
            />
            <div className={`sm:col-span-2 ${inputs.gender === 'female' ? '' : 'opacity-40 pointer-events-none'}`}>
              <Field
                icon={<Ruler className="w-4 h-4" />}
                label="Hip"
                unit="cm"
                value={inputs.hip}
                onChange={(v) => update('hip', v)}
                placeholder="95"
              />
              {inputs.gender !== 'female' && (
                <p className="text-xs text-slate-500 mt-1">Required only for the female formula.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mx-6 sm:mx-8 mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="px-6 sm:px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={calculate}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
            >
              <Calculator className="w-5 h-5" />
              Calculate Metrics
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3.5 px-5 rounded-xl transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        {result && bmiCat && (
          <div className="mt-6 space-y-4 animate-[fadeIn_0.4s_ease]">
            {/* Primary gauge row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Body fat */}
              <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                  <Gauge className="w-4 h-4" /> Body Fat Percentage
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-5xl font-bold"
                    style={{ color: result.categoryColor }}
                  >
                    {result.bodyFat}
                  </span>
                  <span className="text-2xl text-slate-500 font-medium pb-1">%</span>
                </div>
                <div
                  className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    color: result.categoryColor,
                    borderColor: `${result.categoryColor}55`,
                    backgroundColor: `${result.categoryColor}11`,
                  }}
                >
                  {result.category}
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(result.bodyFat * 1.8, 100)}%`,
                      backgroundColor: result.categoryColor,
                    }}
                  />
                </div>
              </div>

              {/* BMI */}
              <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                  <Scale className="w-4 h-4" /> Body Mass Index
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-5xl font-bold"
                    style={{ color: bmiCat.color }}
                  >
                    {result.bmi}
                  </span>
                  <span className="text-2xl text-slate-500 font-medium pb-1">kg/m²</span>
                </div>
                <div
                  className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    color: bmiCat.color,
                    borderColor: `${bmiCat.color}55`,
                    backgroundColor: `${bmiCat.color}11`,
                  }}
                >
                  {bmiCat.label}
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((result.bmi / 40) * 100, 100)}%`,
                      backgroundColor: bmiCat.color,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<HeartPulse className="w-4 h-4" />}
                label="Visceral Risk"
                value={result.visceral}
                color={
                  result.visceral === 'Low'
                    ? '#22c55e'
                    : result.visceral === 'Moderate'
                    ? '#eab308'
                    : '#ef4444'
                }
              />
              <StatCard label="Lean Mass" value={`${result.leanMass} kg`} color="#38bdf8" />
              <StatCard label="Fat Mass" value={`${result.fatMass} kg`} color="#f97316" />
              <StatCard label="Est. BMR" value={`${result.bmr} kcal`} color="#a78bfa" />
            </div>

            {/* Info / disclaimer */}
            <button
              onClick={() => setShowInfo((s) => !s)}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-400 transition-colors py-2"
            >
              <Info className="w-3.5 h-3.5" />
              {showInfo ? 'Hide' : 'Show'} methodology &amp; disclaimer
            </button>
            {showInfo && (
              <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 text-xs text-slate-400 leading-relaxed space-y-2">
                <p>
                  <b className="text-slate-300">Body Fat</b> is estimated using the US Navy
                  circumference equation, which incorporates waist, neck, height (and hip for
                  females). It provides a useful estimate but is less precise than DEXA or
                  hydrostatic weighing.
                </p>
                <p>
                  <b className="text-slate-300">Visceral Risk</b> uses the waist-to-height ratio
                  (&lt;0.5 low, &lt;0.6 moderate, otherwise high) as a proxy for visceral adipose
                  accumulation and cardiometabolic risk.
                </p>
                <p>
                  <b className="text-slate-300">BMR</b> is calculated via the Katch-McArdle
                  equation, which uses lean body mass and is more accurate across body
                  compositions than weight-based formulas.
                </p>
                <p className="text-slate-500 pt-1">
                  These estimates are for informational purposes only and are not a substitute
                  for professional medical advice.
                </p>
              </div>
            )}
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-slate-600">
          Bexyhub · Body Composition Analytics
        </footer>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

function Field({ icon, label, unit, value, onChange, placeholder }: FieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
        <span className="text-slate-500">{icon}</span>
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/20 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
          {unit}
        </span>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-xl border border-slate-800 p-4">
      {icon && (
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
          {icon} {label}
        </div>
      )}
      {!icon && <div className="text-slate-500 text-xs mb-2">{label}</div>}
      <div className="text-lg font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
