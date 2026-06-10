// 한국투자증권 API 응답 변환과 요청 구성을 검증한다.
import { describe, expect, test } from "vitest";
import {
  buildKisAccountId,
  fetchKoreaInvestmentPortfolio,
  mapDomesticBalanceResponse,
  mapOverseasBalanceResponse,
} from "../scripts/adapters/korea-investment";
import type { KoreaInvestmentCredentials } from "../scripts/credentials";

const credentials: KoreaInvestmentCredentials = {
  appKey: "kis-app-key",
  appSecret: "kis-app-secret",
  accountNo: "12345678",
  accountProductCode: "01",
  accountAlias: "한국투자 ISA",
  environment: "real",
};

describe("korea investment adapter", () => {
  test("maps domestic balance rows to normalized KRW positions and an account snapshot", () => {
    const result = mapDomesticBalanceResponse(
      {
        output1: [
          {
            pdno: "005930",
            prdt_name: "삼성전자",
            hldg_qty: "10",
            evlu_amt: "750000",
            pchs_amt: "700000",
            evlu_pfls_amt: "50000",
            evlu_pfls_rt: "7.14",
          },
          {
            pdno: "000000",
            prdt_name: "매도완료",
            hldg_qty: "0",
            evlu_amt: "0",
          },
        ],
        output2: [
          {
            dnca_tot_amt: "120000",
            scts_evlu_amt: "750000",
            evlu_pfls_smtl_amt: "50000",
            pchs_amt_smtl_amt: "700000",
          },
        ],
      },
      credentials,
    );

    expect(result.positions).toEqual([
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
    ]);
    expect(result.account).toEqual({
      id: "korea-investment-isa",
      broker: "korea-investment",
      alias: "한국투자 ISA",
      currency: "KRW",
      valuationKrw: 870000,
      cashKrw: 120000,
      unrealizedProfitKrw: 50000,
      unrealizedProfitRate: 0.071429,
    });
  });

  test("maps overseas balance rows and keeps missing KRW valuation out of totals", () => {
    const result = mapOverseasBalanceResponse(
      {
        output1: [
          {
            ovrs_pdno: "NVDA",
            ovrs_item_name: "NVIDIA",
            ovrs_cblc_qty: "2",
            ovrs_stck_evlu_amt: "300.50",
            frcr_pchs_amt1: "250.25",
            frcr_evlu_pfls_amt: "50.25",
            evlu_pfls_rt: "20.08",
            tr_crcy_cd: "USD",
            ovrs_excg_cd: "NASD",
          },
        ],
      },
      credentials,
    );

    expect(result.positions).toEqual([
      {
        id: "NASDAQ:NVDA",
        market: "NASDAQ",
        symbol: "NVDA",
        name: "NVIDIA",
        broker: "korea-investment",
        accountId: "korea-investment-isa",
        quantity: 2,
        currency: "USD",
        valuation: 300.5,
        valuationKrw: null,
        costBasis: 250.25,
        costBasisKrw: null,
        unrealizedProfit: 50.25,
        unrealizedProfitKrw: null,
        unrealizedProfitRate: 0.2008,
        krwValuationAvailable: false,
      },
    ]);
    expect(result.warnings).toEqual([
      {
        code: "MISSING_KRW_VALUATION",
        severity: "warning",
        message: "NASDAQ:NVDA는 원화 환산금액이 없어 총액과 비중 계산에서 제외되었습니다.",
        positionId: "NASDAQ:NVDA",
      },
    ]);
  });

  test("uses official KIS endpoints and TR IDs when collecting balances", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init: init ?? {} });
      if (String(url).endsWith("/oauth2/tokenP")) {
        return jsonResponse({ access_token: "token" });
      }
      return jsonResponse({ rt_cd: "0", output1: [], output2: [{}] });
    };

    await fetchKoreaInvestmentPortfolio(credentials, {
      fetcher,
      overseasMarkets: [
        { exchangeCode: "NASD", currency: "USD" },
        { exchangeCode: "SEHK", currency: "HKD" },
        { exchangeCode: "TKSE", currency: "JPY" },
      ],
    });

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/oauth2/tokenP",
      "/uapi/domestic-stock/v1/trading/inquire-balance",
      "/uapi/overseas-stock/v1/trading/inquire-balance",
      "/uapi/overseas-stock/v1/trading/inquire-balance",
      "/uapi/overseas-stock/v1/trading/inquire-balance",
    ]);
    expect(calls.map((call) => new URL(call.url).origin)).toEqual([
      "https://openapi.koreainvestment.com:9443",
      "https://openapi.koreainvestment.com:9443",
      "https://openapi.koreainvestment.com:9443",
      "https://openapi.koreainvestment.com:9443",
      "https://openapi.koreainvestment.com:9443",
    ]);
    expect(calls[1].init.headers).toMatchObject({ tr_id: "TTTC8434R" });
    expect(calls.slice(2).map((call) => (call.init.headers as Record<string, string>).tr_id)).toEqual([
      "TTTS3012R",
      "TTTS3012R",
      "TTTS3012R",
    ]);
  });

  test("builds stable account ids from aliases without leaking account numbers", () => {
    expect(buildKisAccountId("한국투자 ISA", "12345678", "01")).toBe("korea-investment-isa");
    expect(buildKisAccountId("", "12345678", "01")).toBe("korea-investment-account");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
