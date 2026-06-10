// 리밸런싱 설정의 기본값과 저장값 병합을 검증한다.
import { describe, expect, test } from "vitest";
import {
  buildRebalanceSettings,
  parsePercentInput,
  toTargetWeights,
  type StoredRebalanceTarget,
} from "../src/lib/rebalance-settings";
import type { HoldingSummary, TargetWeight } from "../src/types/portfolio";

const holdings: HoldingSummary[] = [
  holding("KRX:005930", "삼성전자", 0.42),
  holding("KRX:000660", "SK하이닉스", 0.18),
];

describe("rebalance settings", () => {
  test("uses stored settings first, payload targets second, and current weights as fallback", () => {
    const payloadTargets: TargetWeight[] = [
      {
        id: "KRX:005930",
        market: "KRX",
        symbol: "005930",
        targetWeight: 0.5,
        rebalanceThreshold: 0.04,
      },
    ];
    const storedTargets: StoredRebalanceTarget[] = [
      {
        id: "KRX:005930",
        targetWeight: 0.35,
        rebalanceThreshold: 0.02,
      },
    ];

    expect(buildRebalanceSettings(holdings, payloadTargets, storedTargets)).toEqual([
      {
        id: "KRX:005930",
        market: "KRX",
        symbol: "005930",
        name: "삼성전자",
        targetWeight: 0.35,
        rebalanceThreshold: 0.02,
      },
      {
        id: "KRX:000660",
        market: "KRX",
        symbol: "000660",
        name: "SK하이닉스",
        targetWeight: 0.18,
        rebalanceThreshold: 0.05,
      },
    ]);
  });

  test("converts editable settings back to portfolio targets", () => {
    expect(toTargetWeights(buildRebalanceSettings(holdings, [], []))).toEqual([
      {
        id: "KRX:005930",
        market: "KRX",
        symbol: "005930",
        targetWeight: 0.42,
        rebalanceThreshold: 0.05,
      },
      {
        id: "KRX:000660",
        market: "KRX",
        symbol: "000660",
        targetWeight: 0.18,
        rebalanceThreshold: 0.05,
      },
    ]);
  });

  test("parses percent input with bounded values", () => {
    expect(parsePercentInput("12.5")).toBe(0.125);
    expect(parsePercentInput("-10")).toBe(0);
    expect(parsePercentInput("150")).toBe(1);
    expect(parsePercentInput("abc", 0.33)).toBe(0.33);
  });
});

function holding(id: string, name: string, weight: number): HoldingSummary {
  const [market, symbol] = id.split(":");
  return {
    id,
    market,
    symbol,
    name,
    quantity: 1,
    valuationKrw: weight * 1_000_000,
    costBasisKrw: weight * 900_000,
    unrealizedProfitKrw: weight * 100_000,
    unrealizedProfitRate: 0.1,
    weight,
    brokers: ["korea-investment"],
    accountIds: ["korea-investment-isa"],
  };
}
