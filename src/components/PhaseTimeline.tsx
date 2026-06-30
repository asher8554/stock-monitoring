// 연도별 A-F 판정 결과를 색상 타임라인으로 보여준다.
import { phasePoint, type CycleYear } from "../lib/phase";

export function PhaseTimeline({
  rows,
  selectedYear,
  onSelectYear,
}: {
  rows: CycleYear[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="연도별 타임라인">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">연도별 타임라인</h2>
          <p className="mt-1 text-sm text-slate-500">연도를 선택하면 차트 위치와 상세 지표가 바뀝니다.</p>
        </div>
        <span className="text-sm font-semibold text-slate-500">{rows[0]?.year}년 - {rows.at(-1)?.year}년</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">
        {rows.map((row) => {
          const color = phasePoint(row.primaryPhase).color;
          const isSelected = row.year === selectedYear;
          return (
            <button
              key={row.year}
              type="button"
              onClick={() => onSelectYear(row.year)}
              className={`rounded-lg border p-2 text-left transition ${
                isSelected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 hover:border-slate-400"
              }`}
            >
              <span className="block text-sm font-bold">{row.year}</span>
              <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {row.primaryPhase}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
