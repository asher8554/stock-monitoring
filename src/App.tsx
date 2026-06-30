// 한국 투자 사이클 대시보드의 데이터 로드와 화면 상태를 관리한다.
import { useEffect, useMemo, useState } from "react";
import { EggCycleChart } from "./components/EggCycleChart";
import { IndicatorLineChart } from "./components/IndicatorLineChart";
import { PhaseTimeline } from "./components/PhaseTimeline";
import { YearDetailPanel } from "./components/YearDetailPanel";
import { formatDateTime, formatPercent, type CycleYear } from "./lib/phase";

type LoadState = "loading" | "ready" | "error";

export function App() {
  const [annual, setAnnual] = useState<CycleYear[]>([]);
  const [current, setCurrent] = useState<CycleYear | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let mounted = true;

    async function loadCycleData() {
      setLoadState("loading");
      try {
        const [annualResponse, currentResponse] = await Promise.all([
          fetch("./data/annual_cycle.json", { cache: "no-store" }),
          fetch("./data/current_cycle.json", { cache: "no-store" }),
        ]);
        if (!annualResponse.ok || !currentResponse.ok) {
          throw new Error("cycle data fetch failed");
        }
        const annualRows = (await annualResponse.json()) as CycleYear[];
        const currentRow = (await currentResponse.json()) as CycleYear;
        if (!mounted) {
          return;
        }
        setAnnual(annualRows);
        setCurrent(currentRow);
        setSelectedYear(currentRow.year);
        setLoadState("ready");
      } catch {
        if (mounted) {
          setLoadState("error");
        }
      }
    }

    void loadCycleData();
    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(() => {
    if (annual.length === 0) {
      return null;
    }
    return annual.find((row) => row.year === selectedYear) ?? annual[annual.length - 1];
  }, [annual, selectedYear]);

  if (loadState === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto grid min-h-[60vh] w-full max-w-5xl place-items-center">
          <p className="text-sm font-semibold text-slate-500">시장 사이클 데이터를 불러오는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (loadState === "error" || !current || !selected) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto grid min-h-[60vh] w-full max-w-5xl place-items-center">
          <section className="rounded-lg border border-rose-200 bg-white p-6 text-rose-700 shadow-sm">
            <h1 className="text-xl font-bold">데이터를 불러오지 못했습니다.</h1>
            <p className="mt-2 text-sm">public/data JSON 파일이 배포되어 있는지 확인해야 합니다.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Rule-based market cycle dashboard</p>
            <h1 className="mt-2 break-keep text-2xl font-bold tracking-normal text-slate-950 sm:text-4xl">
              한국 투자 사이클 대시보드
            </h1>
          </div>
          <p className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            투자 추천이 아니라 시장 상태 해석용 참고 도구입니다.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="현재 시장 사이클 요약">
          <SummaryCard label="현재 판정 위치" value={current.phaseLabel} helper={`${current.year}년 기준`} />
          <SummaryCard label="Confidence" value={formatPercent(current.confidence)} helper="가장 높은 phase score" />
          <SummaryCard label="최근 업데이트" value={formatDateTime(current.updatedAt)} helper="GitHub Actions 생성 시각" />
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">핵심 근거 3개</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-700">
              {current.explanation.slice(0, 3).map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <EggCycleChart selected={selected} />
          <YearDetailPanel row={selected} />
        </section>

        <PhaseTimeline rows={annual} selectedYear={selected.year} onSelectYear={setSelectedYear} />

        <IndicatorLineChart rows={annual} selectedYear={selected.year} />
      </div>
    </main>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <strong className="mt-3 block text-2xl font-bold tracking-normal text-slate-950">{value}</strong>
      <span className="mt-2 block text-sm text-slate-500">{helper}</span>
    </article>
  );
}
