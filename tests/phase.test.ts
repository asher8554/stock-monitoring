// 투자 사이클 phase 유틸의 포맷과 위치 계산을 검증한다.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatIndicator, formatPercent, phasePositionText, phaseTransitionPoint, type CycleYear } from "../src/lib/phase";

const baseRow: CycleYear = {
  year: 2026,
  indicators: {
    base_rate_avg: 2.6,
    ktb10y_avg: 3.03,
    cpi_yoy: 2.24,
    m2_yoy: 6.98,
    kospi_return: -3.8,
    house_price_yoy: -2.28,
    gdp_growth: 1.38,
    usdkrw_change: 2,
  },
  scores: { A: 0.1, B: 0.23, C: 0.28, D: 0.21, E: 0.12, F: 0.06 },
  primaryPhase: "C",
  secondaryPhase: "B",
  phaseLabel: "C/B 과도기",
  confidence: 0.28,
  topDrivers: [],
  explanation: [],
};

describe("phase utilities", () => {
  it("formats percentages and indicators for Korean dashboard labels", () => {
    expect(formatPercent(0.314)).toBe("31.4%");
    expect(formatIndicator("kospi_return", -9.64)).toBe("-9.6%");
    expect(formatIndicator("base_rate_avg", 3.25)).toBe("3.25%");
  });

  it("places transition years between primary and secondary phase points", () => {
    expect(phaseTransitionPoint(baseRow)).toEqual({ x: 330, y: 257 });
    expect(phasePositionText(baseRow)).toBe("C와 B 사이");
  });

  it("uses the primary phase point when confidence gap is wide", () => {
    const row = { ...baseRow, confidence: 0.42, scores: { ...baseRow.scores, C: 0.42 } };
    expect(phaseTransitionPoint(row)).toEqual({
      x: 326,
      y: 350,
    });
    expect(phasePositionText(row)).toBe("C 구간");
  });

  it("keeps generated annual cycle data at a 30-year window", () => {
    const rows = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/annual_cycle.json"), "utf-8")) as CycleYear[];
    const latest = rows[rows.length - 1];

    expect(rows).toHaveLength(30);
    expect(rows[0].year).toBe(latest.year - 29);
  });
});
