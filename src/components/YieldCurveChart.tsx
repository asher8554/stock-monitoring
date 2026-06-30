// 장단기금리차 시계열과 0퍼센트 역전 기준선을 그린다.
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  formatYieldDate,
  formatSpread,
  hasKoreanYieldData,
  YIELD_CURVE_CRISIS_MARKERS,
  YIELD_CURVE_METRIC_META,
  type YieldCurveData,
  type YieldCurveSeriesKey,
} from "../lib/yield-curve";

export function YieldCurveChart({ data }: { data: YieldCurveData }) {
  const [showKorea, setShowKorea] = useState(false);
  const hasKorea = hasKoreanYieldData(data);
  const visibleKeys = useMemo<YieldCurveSeriesKey[]>(
    () => (showKorea && hasKorea ? ["us10y3m", "us10y2y", "kr10y3y", "kr3y91d"] : ["us10y3m", "us10y2y"]),
    [hasKorea, showKorea],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="장단기금리차 그래프">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">금리차 추이</h3>
          <p className="mt-1 text-sm text-slate-500">0%p 아래는 장단기금리차 역전 구간입니다.</p>
        </div>
        {hasKorea ? (
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={showKorea}
              onChange={(event) => setShowKorea(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            한국 금리차 표시
          </label>
        ) : (
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
            한국 금리차 데이터 연결 전
          </span>
        )}
      </div>

      <div className="mt-4 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 720, height: 300 }}>
          <LineChart data={data.series} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} />
            <YAxis tickFormatter={(value) => formatSpread(Number(value))} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              formatter={(value, name) => [
                formatSpread(typeof value === "number" ? value : Number(value)),
                YIELD_CURVE_METRIC_META[name as YieldCurveSeriesKey]?.label ?? name,
              ]}
              labelFormatter={(label) => formatYieldDate(String(label))}
              labelStyle={{ color: "#0f172a", fontWeight: 800, marginBottom: 8 }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "0%p", position: "insideTopRight" }} />
            {YIELD_CURVE_CRISIS_MARKERS.map((marker) => (
              <ReferenceLine
                key={marker.date}
                x={marker.date}
                stroke="#64748b"
                strokeDasharray="2 4"
                label={{ value: marker.label, position: "insideTop", fill: "#64748b", fontSize: 11 }}
              />
            ))}
            {visibleKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                name={key}
                dot={false}
                activeDot={{ r: 5 }}
                stroke={YIELD_CURVE_METRIC_META[key].color}
                strokeWidth={3}
                type="monotone"
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {visibleKeys.map((key) => (
          <span key={key} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: YIELD_CURVE_METRIC_META[key].color }} />
            {YIELD_CURVE_METRIC_META[key].label}
          </span>
        ))}
        {YIELD_CURVE_CRISIS_MARKERS.map((marker) => (
          <span key={marker.date} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="h-3 w-px border-l border-dashed border-slate-500" />
            {formatYieldDate(marker.date)} {marker.label}
          </span>
        ))}
      </div>
    </section>
  );
}
