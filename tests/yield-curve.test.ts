// 장단기금리차 판정 helper와 생성 JSON 스키마를 검증한다.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyYieldCurveMetrics,
  formatSpread,
  hasKoreanYieldData,
  YIELD_CURVE_METRICS,
  type YieldCurveData,
} from "../src/lib/yield-curve";

describe("yield curve classification", () => {
  it("classifies a normal spread", () => {
    expect(classifyYieldCurveMetrics({ latest: 1.25 })).toEqual({
      status: "normal",
      riskLevel: "low",
      cycleBias: ["D", "E"],
    });
  });

  it("classifies a near inversion spread", () => {
    expect(classifyYieldCurveMetrics({ latest: 0.25 })).toMatchObject({
      status: "near_inversion",
      riskLevel: "caution",
      cycleBias: ["A", "B"],
    });
  });

  it("classifies an inverted spread", () => {
    expect(classifyYieldCurveMetrics({ latest: -0.1, inversionMonths: 1 })).toMatchObject({
      status: "inverted",
      riskLevel: "high",
      cycleBias: ["A", "B"],
    });
  });

  it("classifies a deep inversion spread", () => {
    expect(classifyYieldCurveMetrics({ latest: -0.65, inversionMonths: 4 })).toMatchObject({
      status: "deep_inversion",
      riskLevel: "severe",
      cycleBias: ["B", "C"],
    });
  });

  it("classifies re-steepening after inversion", () => {
    expect(classifyYieldCurveMetrics({ latest: 0.52, reSteepeningAfterInversion: true })).toMatchObject({
      status: "normal_after_inversion",
      riskLevel: "watch",
      cycleBias: ["C", "D"],
    });
  });
});

describe("yield curve data contract", () => {
  it("formats missing Korean spread data as a connection placeholder", () => {
    expect(formatSpread(null)).toBe("연결 전");
  });

  it("validates the generated yield_curve.json schema", () => {
    const path = resolve(process.cwd(), "public/data/yield_curve.json");
    expect(existsSync(path)).toBe(true);
    const data = JSON.parse(readFileSync(path, "utf-8")) as YieldCurveData;

    expect(typeof data.updatedAt).toBe("string");
    expect(Array.isArray(data.sourceNotes)).toBe(true);
    expect(data.latest.primaryStatus).toBeTruthy();
    expect(data.latest.riskLevel).toBeTruthy();
    expect(Array.isArray(data.latest.cycleBias)).toBe(true);
    expect(Array.isArray(data.series)).toBe(true);
    expect(data.series.length).toBeGreaterThanOrEqual(300);
    expect(YIELD_CURVE_METRICS.every((key) => Object.prototype.hasOwnProperty.call(data.latest, key))).toBe(true);
    expect(hasKoreanYieldData(data)).toBe(false);
  });
});
