// 토스증권 Open API 응답 변환과 요청 구성을 검증한다.
import { describe, expect, test } from "vitest";
import { fetchTossPortfolio, mapTossHoldingsResponse } from "../scripts/adapters/toss";
import type { TossCredentials } from "../scripts/credentials";

const credentials: TossCredentials = {
  appKey: "toss-app-key",
  appSecret: "toss-app-secret",
  accountAlias: "토스 일반",
};

describe("toss adapter", () => {
  test("maps KRW and USD holdings to normalized positions with KRW valuation", () => {
    const result = mapTossHoldingsResponse(
      {
        result: {
          items: [
            {
              symbol: "005930",
              name: "삼성전자",
              marketCountry: "KR",
              currency: "KRW",
              quantity: "100",
              marketValue: { purchaseAmount: "6500000", amount: "7200000", amountAfterCost: "7050000" },
              profitLoss: { amount: "700000", amountAfterCost: "550000", rate: "0.1077", rateAfterCost: "0.0846" },
              dailyProfitLoss: { amount: "100000", rate: "0.0141" },
              cost: { commission: "14400", tax: "135600" },
            },
            {
              symbol: "AAPL",
              name: "Apple Inc.",
              marketCountry: "US",
              currency: "USD",
              quantity: "10",
              marketValue: { purchaseAmount: "1500", amount: "1700", amountAfterCost: "1650" },
              profitLoss: { amount: "200", amountAfterCost: "150", rate: "0.1333", rateAfterCost: "0.1" },
              dailyProfitLoss: { amount: "20", rate: "0.012" },
              cost: { commission: "2.15", tax: null },
            },
          ],
        },
      },
      credentials,
      1,
      1400,
    );

    expect(result.account).toMatchObject({
      id: "toss-account-1",
      broker: "toss",
      alias: "토스 일반",
      valuationKrw: 9580000,
      cashKrw: 0,
      unrealizedProfitKrw: 980000,
      unrealizedProfitRate: 0.113953,
    });
    expect(result.positions).toMatchObject([
      {
        id: "KRX:005930",
        market: "KRX",
        broker: "toss",
        valuationKrw: 7200000,
        costBasisKrw: 6500000,
        unrealizedProfitKrw: 700000,
        krwValuationAvailable: true,
      },
      {
        id: "US:AAPL",
        market: "US",
        broker: "toss",
        valuationKrw: 2380000,
        costBasisKrw: 2100000,
        unrealizedProfitKrw: 280000,
        krwValuationAvailable: true,
      },
    ]);
  });

  test("uses official Toss auth, accounts, holdings, and exchange-rate endpoints", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init: init ?? {} });
      const path = String(url);
      if (path.endsWith("/oauth2/token")) {
        return jsonResponse({ access_token: "token", token_type: "Bearer", expires_in: 86400 });
      }
      if (path.endsWith("/api/v1/accounts")) {
        return jsonResponse({ result: [{ accountNo: "12345678901", accountSeq: 7, accountType: "BROKERAGE" }] });
      }
      if (path.endsWith("/api/v1/holdings")) {
        return jsonResponse({
          result: {
            items: [
              {
                symbol: "AAPL",
                name: "Apple Inc.",
                marketCountry: "US",
                currency: "USD",
                quantity: "1",
                marketValue: { purchaseAmount: "100", amount: "110", amountAfterCost: "109" },
                profitLoss: { amount: "10", amountAfterCost: "9", rate: "0.1", rateAfterCost: "0.09" },
                dailyProfitLoss: { amount: "1", rate: "0.01" },
                cost: { commission: "0.2", tax: null },
              },
            ],
          },
        });
      }
      if (path.includes("/api/v1/exchange-rate")) {
        return jsonResponse({ result: { rate: "1400" } });
      }
      throw new Error(`Unexpected URL ${path}`);
    };

    const result = await fetchTossPortfolio(credentials, { fetcher });

    expect(result?.positions[0]).toMatchObject({ id: "US:AAPL", valuationKrw: 154000 });
    expect(calls.map((call) => call.url)).toEqual([
      "https://openapi.tossinvest.com/oauth2/token",
      "https://openapi.tossinvest.com/api/v1/accounts",
      "https://openapi.tossinvest.com/api/v1/holdings",
      "https://openapi.tossinvest.com/api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW",
    ]);
    expect(calls[0].init.body?.toString()).toContain("grant_type=client_credentials");
    expect(calls[2].init.headers).toMatchObject({
      Authorization: "Bearer token",
      "X-Tossinvest-Account": "7",
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
