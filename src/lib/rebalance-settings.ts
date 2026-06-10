// 리밸런싱 목표비중 설정을 보유 종목과 병합한다.
import type { HoldingSummary, TargetWeight } from "../types/portfolio";

export interface StoredRebalanceTarget {
  id: string;
  targetWeight: number;
  rebalanceThreshold: number;
}

export interface RebalanceSetting {
  id: string;
  market: string;
  symbol: string;
  name: string;
  targetWeight: number;
  rebalanceThreshold: number;
}

const defaultThreshold = 0.05;

export function buildRebalanceSettings(
  holdings: HoldingSummary[],
  payloadTargets: TargetWeight[],
  storedTargets: StoredRebalanceTarget[],
): RebalanceSetting[] {
  const payloadById = new Map(payloadTargets.map((target) => [target.id, target]));
  const storedById = new Map(storedTargets.map((target) => [target.id, target]));

  return holdings.map((holding) => {
    const payloadTarget = payloadById.get(holding.id);
    const storedTarget = storedById.get(holding.id);

    return {
      id: holding.id,
      market: holding.market,
      symbol: holding.symbol,
      name: holding.name,
      targetWeight: storedTarget?.targetWeight ?? payloadTarget?.targetWeight ?? holding.weight,
      rebalanceThreshold: storedTarget?.rebalanceThreshold ?? payloadTarget?.rebalanceThreshold ?? defaultThreshold,
    };
  });
}

export function toTargetWeights(settings: RebalanceSetting[]): TargetWeight[] {
  return settings.map((setting) => ({
    id: setting.id,
    market: setting.market,
    symbol: setting.symbol,
    targetWeight: setting.targetWeight,
    rebalanceThreshold: setting.rebalanceThreshold,
  }));
}

export function parsePercentInput(value: string, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(Math.max(numeric / 100, 0), 1);
}

export function formatPercentInput(value: number): string {
  return String(Math.round(value * 10_000) / 100);
}
