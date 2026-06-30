// 장단기금리차별 현재 위험 상태와 보정 신호를 카드로 보여준다.
import {
  cycleBiasText,
  formatSpread,
  riskLevelForStatus,
  YIELD_CURVE_RISK_LABELS,
  YIELD_CURVE_STATUS_LABELS,
  type YieldCurveLatest,
  type YieldCurveMetrics,
  type YieldCurveRiskLevel,
} from "../lib/yield-curve";

const RISK_TONE: Record<YieldCurveRiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  watch: "border-sky-200 bg-sky-50 text-sky-700",
  caution: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  severe: "border-rose-200 bg-rose-50 text-rose-700",
};

export function YieldCurveStatusCard({
  title,
  value,
  metric,
  latest,
  detailed = false,
  missingText = "한국 금리차 데이터 연결 전",
}: {
  title: string;
  value: number | null | undefined;
  metric?: YieldCurveMetrics | null;
  latest?: YieldCurveLatest;
  detailed?: boolean;
  missingText?: string;
}) {
  if (!metric || value === null || value === undefined) {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{missingText}</p>
          </div>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
            TODO
          </span>
        </div>
        <strong className="mt-4 block text-2xl font-black tracking-normal text-slate-400">{formatSpread(value)}</strong>
      </article>
    );
  }

  const riskLevel = latest?.riskLevel ?? riskLevelForStatus(metric.status);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{YIELD_CURVE_STATUS_LABELS[metric.status]}</p>
        </div>
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${RISK_TONE[riskLevel]}`}>
          {YIELD_CURVE_RISK_LABELS[riskLevel]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="현재" value={formatSpread(value)} />
        <Metric label="3개월 평균" value={formatSpread(metric.avg3m)} />
        <Metric label="12개월 최저" value={formatSpread(metric.min12m)} />
      </div>

      {detailed && latest ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm font-bold text-slate-950">현재 해석</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{latest.headline}</p>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            코스톨라니 달걀 보정 위치: {cycleBiasText(latest.cycleBias)}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {latest.explanation.slice(0, 3).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-slate-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <strong className="mt-1 block break-keep text-sm font-black text-slate-900">{value}</strong>
    </div>
  );
}
