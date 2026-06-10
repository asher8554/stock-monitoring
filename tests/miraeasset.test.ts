// 미래에셋 표준 행 파싱을 검증한다.
import { describe, expect, test } from "vitest";
import { parseMiraeAssetRows } from "../scripts/adapters/miraeasset";

describe("miraeasset import adapter", () => {
  test("maps Korean balance rows into normalized positions", () => {
    const positions = parseMiraeAssetRows(
      [
        ["종목코드", "종목명", "수량", "평가금액", "매입금액", "평가손익", "손익률"],
        ["005930", "삼성전자", "3", "225000", "210000", "15000", "7.14%"],
      ],
      {
        accountId: "miraeasset-general",
        accountAlias: "미래에셋 일반",
      },
    );

    expect(positions).toEqual([
      {
        id: "KRX:005930",
        market: "KRX",
        symbol: "005930",
        name: "삼성전자",
        broker: "miraeasset",
        accountId: "miraeasset-general",
        quantity: 3,
        currency: "KRW",
        valuation: 225000,
        valuationKrw: 225000,
        costBasis: 210000,
        costBasisKrw: 210000,
        unrealizedProfit: 15000,
        unrealizedProfitKrw: 15000,
        unrealizedProfitRate: 0.0714,
        krwValuationAvailable: true,
      },
    ]);
  });
});
