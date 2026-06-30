// 장단기금리차 데이터 타입과 경기 위험 판정 helper를 제공한다.
import type { Phase } from "./phase";

export type YieldCurveStatus =
  | "normal"
  | "flattening"
  | "near_inversion"
  | "inverted"
  | "deep_inversion"
  | "normal_after_inversion"
  | "re_steepening";

export type YieldCurveRiskLevel = "low" | "watch" | "caution" | "high" | "severe";
export type YieldCurveSeriesKey = "us10y3m" | "us10y2y" | "kr10y3y" | "kr3y91d";

export interface YieldCurveSeriesPoint {
  date: string;
  us10y3m: number | null;
  us10y2y: number | null;
  kr10y3y: number | null;
  kr3y91d: number | null;
}

export interface YieldCurveMetrics {
  latest: number;
  avg3m: number;
  avg12m: number;
  min12m: number;
  inversionMonths: number;
  reSteepeningAfterInversion: boolean;
  status: YieldCurveStatus;
}

export interface YieldCurveSourceNote {
  name: string;
  description: string;
}

export interface YieldCurveLatest {
  date: string;
  us10y3m: number | null;
  us10y2y: number | null;
  kr10y3y: number | null;
  kr3y91d: number | null;
  primaryStatus: YieldCurveStatus;
  riskLevel: YieldCurveRiskLevel;
  cycleBias: Phase[];
  headline: string;
  explanation: string[];
}

export interface YieldCurveData {
  updatedAt: string;
  sourceNotes: YieldCurveSourceNote[];
  latest: YieldCurveLatest;
  series: YieldCurveSeriesPoint[];
  metrics: Partial<Record<YieldCurveSeriesKey, YieldCurveMetrics | null>>;
}

export interface YieldCurveClassification {
  status: YieldCurveStatus;
  riskLevel: YieldCurveRiskLevel;
  cycleBias: Phase[];
}

export const YIELD_CURVE_METRICS: YieldCurveSeriesKey[] = ["us10y3m", "us10y2y", "kr10y3y", "kr3y91d"];

export const YIELD_CURVE_METRIC_META: Record<YieldCurveSeriesKey, { label: string; shortLabel: string; color: string }> = {
  us10y3m: { label: "US 10Y-3M", shortLabel: "미국 10Y-3M", color: "#2563eb" },
  us10y2y: { label: "US 10Y-2Y", shortLabel: "미국 10Y-2Y", color: "#0f766e" },
  kr10y3y: { label: "KR 10Y-3Y", shortLabel: "한국 10Y-3Y", color: "#f97316" },
  kr3y91d: { label: "KR 3Y-91D", shortLabel: "한국 3Y-91D", color: "#7c3aed" },
};

export const YIELD_CURVE_STATUS_LABELS: Record<YieldCurveStatus, string> = {
  normal: "정상",
  flattening: "평탄화",
  near_inversion: "역전 근접",
  inverted: "역전",
  deep_inversion: "깊은 역전",
  normal_after_inversion: "역전 해소",
  re_steepening: "재가팔라짐",
};

export const YIELD_CURVE_RISK_LABELS: Record<YieldCurveRiskLevel, string> = {
  low: "낮음",
  watch: "관찰",
  caution: "주의",
  high: "높음",
  severe: "심각",
};

export function classifyYieldCurveMetrics({
  latest,
  inversionMonths = 0,
  reSteepeningAfterInversion = false,
}: {
  latest: number;
  inversionMonths?: number;
  reSteepeningAfterInversion?: boolean;
}): YieldCurveClassification {
  let status: YieldCurveStatus;
  if (latest <= -0.5 && inversionMonths >= 3) {
    status = "deep_inversion";
  } else if (latest <= 0) {
    status = "inverted";
  } else if (reSteepeningAfterInversion) {
    status = latest > 1 ? "re_steepening" : "normal_after_inversion";
  } else if (latest > 1) {
    status = "normal";
  } else if (latest > 0.5) {
    status = "flattening";
  } else {
    status = "near_inversion";
  }
  return {
    status,
    riskLevel: riskLevelForStatus(status),
    cycleBias: cycleBiasForStatus(status),
  };
}

export function riskLevelForStatus(status: YieldCurveStatus): YieldCurveRiskLevel {
  if (status === "normal") {
    return "low";
  }
  if (status === "flattening" || status === "normal_after_inversion" || status === "re_steepening") {
    return "watch";
  }
  if (status === "near_inversion") {
    return "caution";
  }
  if (status === "inverted") {
    return "high";
  }
  return "severe";
}

export function cycleBiasForStatus(status: YieldCurveStatus): Phase[] {
  if (status === "normal") {
    return ["D", "E"];
  }
  if (status === "flattening") {
    return ["F", "A"];
  }
  if (status === "near_inversion" || status === "inverted") {
    return ["A", "B"];
  }
  if (status === "deep_inversion") {
    return ["B", "C"];
  }
  return ["C", "D"];
}

export function formatSpread(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "연결 전";
  }
  return `${value.toFixed(2)}%p`;
}

export function formatYieldDate(value: string | null | undefined): string {
  if (!value) {
    return "업데이트 없음";
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value.slice(0, 4)}년 ${value.slice(5, 7)}월`;
  }
  return value;
}

export function hasKoreanYieldData(data: YieldCurveData): boolean {
  return data.series.some((row) => row.kr10y3y !== null || row.kr3y91d !== null);
}

export function cycleBiasText(phases: Phase[]): string {
  if (phases.length === 0) {
    return "보정 신호 없음";
  }
  if (phases.length === 1) {
    return `${phases[0]} 구간 보조 신호`;
  }
  return `${phases.join("/")} 경계 보조 신호`;
}
