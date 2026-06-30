// 장단기금리차 경기 위험 신호 섹션을 기존 대시보드 아래에 배치한다.
import { AlertTriangle } from "lucide-react";
import { formatDateTime } from "../lib/phase";
import {
  formatYieldDate,
  YIELD_CURVE_METRIC_META,
  YIELD_CURVE_METRICS,
  type YieldCurveData,
  type YieldCurveSeriesKey,
} from "../lib/yield-curve";
import { YieldCurveChart } from "./YieldCurveChart";
import { YieldCurveStatusCard } from "./YieldCurveStatusCard";

type LoadState = "loading" | "ready" | "error";

export function YieldCurvePanel({ data, loadState }: { data: YieldCurveData | null; loadState: LoadState }) {
  if (loadState === "loading") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="장단기금리차 경기 위험 신호">
        <h2 className="text-lg font-bold text-slate-950">장단기금리차 경기 위험 신호</h2>
        <p className="mt-2 text-sm text-slate-500">장단기금리차 데이터를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm" aria-label="장단기금리차 경기 위험 신호">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold">장단기금리차 경기 위험 신호</h2>
            <p className="mt-2 text-sm leading-6">
              `public/data/yield_curve.json`을 불러오지 못했습니다. 기존 사이클 대시보드는 그대로 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="장단기금리차 경기 위험 신호">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Yield curve risk module</p>
            <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">장단기금리차 경기 위험 신호</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              미국 10Y-3M을 메인 선행 신호로 보고, 10Y-2Y를 정책 기대와 심리 보조 지표로 함께 확인합니다.
              이 섹션은 투자 추천이 아니라 시장 상태 해석용 참고 도구입니다.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            최근 데이터 {formatYieldDate(data.latest.date)}
            <span className="mx-2 text-slate-300">|</span>
            생성 {formatDateTime(data.updatedAt)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <YieldCurveStatusCard
          title="US 10Y-3M 메인 신호"
          value={data.latest.us10y3m}
          metric={data.metrics.us10y3m}
          latest={data.latest}
          detailed
        />
        <YieldCurveChart data={data} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {YIELD_CURVE_METRICS.map((key) => (
          <YieldCurveStatusCard
            key={key}
            title={YIELD_CURVE_METRIC_META[key].shortLabel}
            value={data.latest[key]}
            metric={data.metrics[key]}
            missingText={missingTextFor(key)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-950">데이터 출처와 한계</h3>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 md:grid-cols-3">
          {data.sourceNotes.map((note) => (
            <li key={note.name} className="rounded-lg bg-slate-50 p-3">
              <strong className="block text-slate-900">{note.name}</strong>
              <span className="mt-1 block">{note.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function missingTextFor(key: YieldCurveSeriesKey): string {
  return key.startsWith("kr") ? "한국 금리차 데이터 연결 전" : "금리차 데이터 연결 전";
}
