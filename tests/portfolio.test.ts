// 포트폴리오 집계와 리밸런싱 계산을 검증한다.
import { describe, expect, test } from "vitest";
import { buildDashboardModel } from "../src/lib/portfolio";
import type { PortfolioPayload } from "../src/types/portfolio";

const payload: PortfolioPayload = {
  version: 1,
  baseCurrency: "KRW",
  asOf: "2026-06-10T15:30:00+09:00",
  accounts: [
    {
      id: "korea-investment-isa",
      broker: "korea-investment",
      alias: "한국투자 ISA",
      currency: "KRW",
      valuationKrw: 1000000,
      cashKrw: 100000,
      unrealizedProfitKrw: 80000,
      unrealizedProfitRate: 0.08,
    },
    {
      id: "toss-general",
      broker: "toss",
      alias: "토스 일반",
      currency: "KRW",
      valuationKrw: 500000,
      cashKrw: 50000,
      unrealizedProfitKrw: -10000,
      unrealizedProfitRate: -0.02,
    },
  ],
  positions: [
    {
      id: "KRX:005930",
      market: "KRX",
      symbol: "005930",
      name: "삼성전자",
      broker: "korea-investment",
      accountId: "korea-investment-isa",
      quantity: 10,
      currency: "KRW",
      valuation: 750000,
      valuationKrw: 750000,
      costBasis: 700000,
      costBasisKrw: 700000,
      unrealizedProfit: 50000,
      unrealizedProfitKrw: 50000,
      unrealizedProfitRate: 0.0714,
      krwValuationAvailable: true,
    },
    {
      id: "KRX:005930",
      market: "KRX",
      symbol: "005930",
      name: "삼성전자",
      broker: "toss",
      accountId: "toss-general",
      quantity: 5,
      currency: "KRW",
      valuation: 375000,
      valuationKrw: 375000,
      costBasis: 400000,
      costBasisKrw: 400000,
      unrealizedProfit: -25000,
      unrealizedProfitKrw: -25000,
      unrealizedProfitRate: -0.0625,
      krwValuationAvailable: true,
    },
    {
      id: "NASDAQ:ABC",
      market: "NASDAQ",
      symbol: "ABC",
      name: "ABC Corp",
      broker: "toss",
      accountId: "toss-general",
      quantity: 2,
      currency: "USD",
      valuation: 200,
      valuationKrw: null,
      costBasis: 180,
      costBasisKrw: null,
      unrealizedProfit: 20,
      unrealizedProfitKrw: null,
      unrealizedProfitRate: 0.1111,
      krwValuationAvailable: false,
    },
  ],
  realizedProfit: {
    ytd: { profitKrw: 30000, profitRate: 0.02 },
    lifetime: { profitKrw: 120000, profitRate: 0.08 },
  },
  targets: [
    {
      id: "KRX:005930",
      market: "KRX",
      symbol: "005930",
      targetWeight: 0.5,
      rebalanceThreshold: 0.05,
    },
  ],
  warnings: [],
};

describe("portfolio dashboard model", () => {
  test("aggregates holdings by market symbol and excludes missing KRW valuation from totals", () => {
    const model = buildDashboardModel(payload);

    expect(model.summary.totalValuationKrw).toBe(1125000);
    expect(model.summary.totalCashKrw).toBe(150000);
    expect(model.summary.unrealizedProfitKrw).toBe(70000);
    expect(model.holdings).toHaveLength(1);
    expect(model.holdings[0]).toMatchObject({
      id: "KRX:005930",
      quantity: 15,
      valuationKrw: 1125000,
      unrealizedProfitKrw: 25000,
      weight: 1,
    });
    expect(model.warnings[0].code).toBe("MISSING_KRW_VALUATION");
  });

  test("marks a holding for rebalancing when current weight exceeds threshold", () => {
    const model = buildDashboardModel(payload);

    expect(model.rebalance[0]).toMatchObject({
      id: "KRX:005930",
      currentWeight: 1,
      targetWeight: 0.5,
      difference: 0.5,
      action: "trim",
      needsRebalance: true,
    });
  });
});
