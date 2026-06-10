// 로컬 포트폴리오와 목표 비중 병합을 검증한다.
import { describe, expect, test } from "vitest";
import { mergeTargetsIntoPortfolio } from "../scripts/payload";
import type { PortfolioPayload, TargetWeight } from "../src/types/portfolio";

const portfolio: PortfolioPayload = {
  version: 1,
  baseCurrency: "KRW",
  asOf: "2026-06-10T15:30:00+09:00",
  accounts: [],
  positions: [],
  realizedProfit: {
    ytd: { profitKrw: 0, profitRate: 0 },
    lifetime: { profitKrw: 0, profitRate: 0 },
  },
  targets: [],
  warnings: [],
};

const targets: TargetWeight[] = [
  {
    id: "KRX:005930",
    market: "KRX",
    symbol: "005930",
    targetWeight: 0.4,
    rebalanceThreshold: 0.05,
  },
];

describe("portfolio payload merge", () => {
  test("returns a new payload with local targets and keeps the source immutable", () => {
    const merged = mergeTargetsIntoPortfolio(portfolio, targets);

    expect(merged).not.toBe(portfolio);
    expect(merged.targets).toEqual(targets);
    expect(portfolio.targets).toEqual([]);
  });
});
