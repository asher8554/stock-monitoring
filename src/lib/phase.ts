// 투자 사이클 phase, 지표, 화면 포맷 규칙을 제공한다.
export type Phase = "A" | "B" | "C" | "D" | "E" | "F";

export type IndicatorKey =
  | "base_rate_avg"
  | "ktb10y_avg"
  | "cpi_yoy"
  | "m2_yoy"
  | "kospi_return"
  | "house_price_yoy"
  | "gdp_growth"
  | "usdkrw_change";

export interface CycleIndicators {
  base_rate_avg: number;
  ktb10y_avg: number;
  cpi_yoy: number;
  m2_yoy: number;
  kospi_return: number;
  house_price_yoy: number;
  gdp_growth: number;
  usdkrw_change: number;
}

export interface CycleDriver {
  feature: string;
  label: string;
  phase: Phase;
  impact: number;
  direction: string;
}

export interface CycleYear {
  year: number;
  indicators: CycleIndicators;
  scores: Record<Phase, number>;
  primaryPhase: Phase;
  secondaryPhase: Phase;
  phaseLabel: string;
  confidence: number;
  topDrivers: CycleDriver[];
  explanation: string[];
  updatedAt?: string;
}

export const PHASES: Phase[] = ["A", "B", "C", "D", "E", "F"];

export const INDICATOR_KEYS: IndicatorKey[] = [
  "base_rate_avg",
  "ktb10y_avg",
  "cpi_yoy",
  "m2_yoy",
  "kospi_return",
  "house_price_yoy",
  "gdp_growth",
  "usdkrw_change",
];

export const INDICATOR_META: Record<IndicatorKey, { label: string; suffix: string; color: string; decimals: number }> = {
  base_rate_avg: { label: "기준금리 평균", suffix: "%", color: "#2563eb", decimals: 2 },
  ktb10y_avg: { label: "국고채 10년", suffix: "%", color: "#0f766e", decimals: 2 },
  cpi_yoy: { label: "CPI YoY", suffix: "%", color: "#dc2626", decimals: 2 },
  m2_yoy: { label: "M2 YoY", suffix: "%", color: "#7c3aed", decimals: 2 },
  kospi_return: { label: "KOSPI 수익률", suffix: "%", color: "#ea580c", decimals: 1 },
  house_price_yoy: { label: "부동산 YoY", suffix: "%", color: "#0891b2", decimals: 1 },
  gdp_growth: { label: "GDP 성장률", suffix: "%", color: "#16a34a", decimals: 2 },
  usdkrw_change: { label: "원/달러 변화율", suffix: "%", color: "#475569", decimals: 1 },
};

const PHASE_POINTS: Record<Phase, { x: number; y: number; color: string }> = {
  A: { x: 210, y: 64, color: "#ef4444" },
  B: { x: 334, y: 164, color: "#f97316" },
  C: { x: 326, y: 350, color: "#f59e0b" },
  D: { x: 210, y: 440, color: "#2563eb" },
  E: { x: 86, y: 350, color: "#2563eb" },
  F: { x: 84, y: 164, color: "#16a34a" },
};

const PHASE_TEXT_POINTS: Record<Phase, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
  A: { x: 244, y: 68, anchor: "start" },
  B: { x: 364, y: 166, anchor: "start" },
  C: { x: 362, y: 354, anchor: "start" },
  D: { x: 210, y: 482, anchor: "middle" },
  E: { x: 58, y: 354, anchor: "end" },
  F: { x: 56, y: 166, anchor: "end" },
};

export function phasePoint(phase: Phase): { x: number; y: number; color: string } {
  return PHASE_POINTS[phase];
}

export function phaseTextPoint(phase: Phase): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  return PHASE_TEXT_POINTS[phase];
}

export function phaseTransitionPoint(row: CycleYear): { x: number; y: number } {
  const primary = phasePoint(row.primaryPhase);
  const secondary = phasePoint(row.secondaryPhase);
  const secondScore = row.scores[row.secondaryPhase] ?? 0;
  const isTransition = row.confidence - secondScore < 0.08;
  if (!isTransition) {
    return { x: primary.x, y: primary.y };
  }
  return {
    x: Math.round((primary.x + secondary.x) / 2),
    y: Math.round((primary.y + secondary.y) / 2),
  };
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatIndicator(key: IndicatorKey, value: number): string {
  const meta = INDICATOR_META[key];
  return `${value.toFixed(meta.decimals)}${meta.suffix}`;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "업데이트 없음";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
