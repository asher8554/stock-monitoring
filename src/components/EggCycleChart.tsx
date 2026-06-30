// 코스톨라니 달걀 SVG와 선택 연도 위치 점을 렌더링한다.
import { PHASES, phasePoint, phaseTextPoint, phaseTransitionPoint, type CycleYear, type Phase } from "../lib/phase";

const phaseLabelLines: Record<Phase, string[]> = {
  A: ["A: 금리 정점"],
  B: ["B: 예금 -> 채권"],
  C: ["C: 부동산 투자", "채권 매도"],
  D: ["D: 금리 저점"],
  E: ["E: 부동산 매도", "주식 투자"],
  F: ["F: 주식 매도", "예금 시작"],
};

export function EggCycleChart({ selected }: { selected: CycleYear }) {
  const point = phaseTransitionPoint(selected);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="코스톨라니 달걀 차트">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">코스톨라니 달걀 위치</h2>
          <p className="mt-1 text-sm text-slate-500">{selected.year}년 선택 위치입니다.</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">{selected.phaseLabel}</span>
      </div>

      <svg className="mt-4 h-auto w-full" viewBox="-80 0 580 520" role="img" aria-label={`${selected.year}년 ${selected.phaseLabel}`}>
        <defs>
          <marker id="cycle-arrow" markerHeight="10" markerWidth="10" orient="auto" refX="6" refY="3">
            <path d="M0,0 L0,6 L7,3 z" fill="#64748b" />
          </marker>
          <radialGradient id="egg-fill" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eef2ff" />
          </radialGradient>
        </defs>

        <ellipse cx="210" cy="250" rx="138" ry="198" fill="url(#egg-fill)" stroke="#cbd5e1" strokeWidth="2" />
        <path
          d="M 206 54 C 338 88 386 232 337 357 C 302 444 216 468 138 418"
          fill="none"
          markerEnd="url(#cycle-arrow)"
          stroke="#64748b"
          strokeDasharray="8 8"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M 126 407 C 43 342 43 160 134 88"
          fill="none"
          markerEnd="url(#cycle-arrow)"
          stroke="#64748b"
          strokeDasharray="8 8"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <line x1="68" x2="352" y1="250" y2="250" stroke="#cbd5e1" strokeDasharray="4 5" />
        <line x1="210" x2="210" y1="70" y2="430" stroke="#cbd5e1" strokeDasharray="4 5" />
        <text x="222" y="132" fill="#dc2626" fontSize="18" fontWeight="700">
          금리 높음
        </text>
        <text x="222" y="382" fill="#2563eb" fontSize="18" fontWeight="700">
          금리 낮음
        </text>

        {PHASES.map((phase) => {
          const marker = phasePoint(phase);
          const label = phaseTextPoint(phase);
          return (
            <g key={phase}>
              <circle cx={marker.x} cy={marker.y} fill={marker.color} r="22" stroke="white" strokeWidth="4" />
              <text x={marker.x} y={marker.y + 7} fill="white" fontSize="22" fontWeight="800" textAnchor="middle">
                {phase}
              </text>
              <text x={label.x} y={label.y} fill={marker.color} fontSize="15" fontWeight="800" textAnchor={label.anchor}>
                {phaseLabelLines[phase].map((line, index) => (
                  <tspan key={line} x={label.x} dy={index === 0 ? 0 : 18}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}

        <g>
          <circle cx={point.x} cy={point.y} fill="#0f172a" opacity="0.14" r="28" />
          <circle cx={point.x} cy={point.y} fill="#0f172a" r="12" stroke="white" strokeWidth="4" />
          <text x={point.x} y={point.y - 34} fill="#0f172a" fontSize="15" fontWeight="800" textAnchor="middle">
            {selected.year}
          </text>
        </g>
      </svg>
    </section>
  );
}
