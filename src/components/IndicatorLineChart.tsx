// 연도별 거시 지표 추이를 선택 지표별 선 그래프로 보여준다.
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatIndicator, INDICATOR_META, INDICATOR_KEYS, type CycleYear, type IndicatorKey } from "../lib/phase";

export function IndicatorLineChart({ rows, selectedYear }: { rows: CycleYear[]; selectedYear: number }) {
  const [metric, setMetric] = useState<IndicatorKey>("base_rate_avg");
  const data = useMemo(
    () => rows.map((row) => ({ year: row.year, value: row.indicators[metric], phase: row.phaseLabel })),
    [metric, rows],
  );
  const meta = INDICATOR_META[metric];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="지표 그래프">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">지표 그래프</h2>
          <p className="mt-1 text-sm text-slate-500">2000년부터 현재까지 연간 지표 흐름입니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {INDICATOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                metric === key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {INDICATOR_META[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data} margin={{ top: 12, right: 18, bottom: 6, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} minTickGap={18} />
            <YAxis
              tickFormatter={(value) => formatIndicator(metric, Number(value))}
              tickLine={false}
              axisLine={false}
              width={78}
            />
            <Tooltip
              formatter={(value) => [formatIndicator(metric, Number(value)), meta.label]}
              labelFormatter={(label) => `${label}년`}
            />
            <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />
            <Line
              dataKey="value"
              dot={false}
              activeDot={{ r: 6 }}
              stroke={meta.color}
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
