// 로컬 수집 결과 병합 로직을 검증한다.
import { describe, expect, test } from "vitest";
import { mergeCollectedPortfolio } from "../scripts/collect";
import { createEmptyPortfolio } from "../scripts/payload";
import type { AccountSnapshot, PositionSnapshot, PortfolioWarning } from "../src/types/portfolio";

describe("collect merge", () => {
  test("replaces broker-owned Korea Investment, Toss, and MiraeAsset rows while keeping manual rows", () => {
    const manualAccount: AccountSnapshot = {
      id: "manual-cash",
      broker: "manual",
      alias: "수동 현금",
      currency: "KRW",
      valuationKrw: 100000,
      cashKrw: 100000,
      unrealizedProfitKrw: 0,
      unrealizedProfitRate: 0,
    };
    const staleKisPosition = position("KRX:000660", "korea-investment", "korea-investment-isa");
    const staleTossPosition = position("US:AAPL", "toss", "toss-general");
    const manualPosition = position("KRX:035420", "manual", "manual-cash");
    const kisAccount: AccountSnapshot = {
      id: "korea-investment-isa",
      broker: "korea-investment",
      alias: "한국투자 ISA",
      currency: "KRW",
      valuationKrw: 750000,
      cashKrw: 0,
      unrealizedProfitKrw: 50000,
      unrealizedProfitRate: 0.071429,
    };
    const kisPosition = position("KRX:005930", "korea-investment", "korea-investment-isa");
    const tossAccount: AccountSnapshot = {
      id: "toss-general",
      broker: "toss",
      alias: "토스 일반",
      currency: "KRW",
      valuationKrw: 300000,
      cashKrw: 0,
      unrealizedProfitKrw: 30000,
      unrealizedProfitRate: 0.111111,
    };
    const tossPosition = position("US:MSFT", "toss", "toss-general");
    const miraePosition = position("KRX:068270", "miraeasset", "miraeasset-general");
    const kisWarning: PortfolioWarning = {
      code: "MISSING_KRW_VALUATION",
      severity: "warning",
      message: "NASDAQ:NVDA는 원화 환산금액이 없어 총액과 비중 계산에서 제외되었습니다.",
      positionId: "NASDAQ:NVDA",
    };

    const merged = mergeCollectedPortfolio({
      basePortfolio: {
        ...createEmptyPortfolio("2026-06-10T00:00:00.000Z"),
        accounts: [manualAccount, { ...kisAccount, valuationKrw: 1 }, { ...tossAccount, valuationKrw: 1 }],
        positions: [manualPosition, staleKisPosition, staleTossPosition],
      },
      asOf: "2026-06-11T00:00:00.000Z",
      koreaInvestment: {
        account: kisAccount,
        positions: [kisPosition],
        realizedProfit: {
          ytd: { profitKrw: 15000, profitRate: 0.15 },
          lifetime: { profitKrw: 55000, profitRate: 0.11 },
        },
        warnings: [kisWarning],
      },
      toss: {
        account: tossAccount,
        positions: [tossPosition],
      },
      miraeAssetPositions: [miraePosition],
    });

    expect(merged.asOf).toBe("2026-06-11T00:00:00.000Z");
    expect(merged.accounts.map((account) => account.id)).toEqual([
      "manual-cash",
      "korea-investment-isa",
      "toss-general",
      "miraeasset-general",
    ]);
    expect(merged.realizedProfit).toEqual({
      ytd: { profitKrw: 15000, profitRate: 0.15 },
      lifetime: { profitKrw: 55000, profitRate: 0.11 },
    });
    expect(merged.positions.map((row) => row.id)).toEqual(["KRX:035420", "KRX:005930", "US:MSFT", "KRX:068270"]);
    expect(merged.warnings).toEqual([kisWarning]);
  });
});

function position(id: string, broker: PositionSnapshot["broker"], accountId: string): PositionSnapshot {
  const [market, symbol] = id.split(":");
  return {
    id,
    market,
    symbol,
    name: symbol,
    broker,
    accountId,
    quantity: 1,
    currency: "KRW",
    valuation: 1000,
    valuationKrw: 1000,
    costBasis: 900,
    costBasisKrw: 900,
    unrealizedProfit: 100,
    unrealizedProfitKrw: 100,
    unrealizedProfitRate: 0.111111,
    krwValuationAvailable: true,
  };
}
