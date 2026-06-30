// 선택한 연도의 점수, 주요 근거, 지표 값을 설명 패널로 보여준다.
import {
  formatIndicator,
  formatPercent,
  INDICATOR_KEYS,
  INDICATOR_META,
  PHASES,
  phasePoint,
  type CycleYear,
  type Phase,
} from "../lib/phase";

export function YearDetailPanel({ row }: { row: CycleYear }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="선택 연도 상세 설명">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{row.year}년 상세 설명</h2>
          <p className="mt-1 text-sm text-slate-500">{row.phaseLabel}</p>
        </div>
        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          confidence {formatPercent(row.confidence)}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {PHASES.map((phase) => (
          <ScoreBar key={phase} phase={phase} value={row.scores[phase]} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-slate-950">영향 지표 Top 3</h3>
          <ul className="mt-3 space-y-2">
            {row.topDrivers.map((driver) => (
              <li key={`${driver.feature}-${driver.impact}`} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800">{driver.label}</span>
                  <span className="text-xs font-semibold text-slate-500">{driver.impact.toFixed(3)}</span>
                </div>
                <p className="mt-1 text-sm leading-5 text-slate-600">{driver.direction}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-950">연도별 지표</h3>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INDICATOR_KEYS.map((key) => (
              <div key={key} className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs font-semibold text-slate-500">{INDICATOR_META[key].label}</dt>
                <dd className="mt-1 text-sm font-bold text-slate-900">{formatIndicator(key, row.indicators[key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function ScoreBar({ phase, value }: { phase: Phase; value: number }) {
  const color = phasePoint(phase).color;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-700">{phase}</span>
        <span className="font-semibold text-slate-500">{formatPercent(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
