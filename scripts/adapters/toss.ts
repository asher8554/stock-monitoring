// 토스증권 Open API 응답을 포트폴리오 스냅샷으로 변환한다.
import type { AccountSnapshot, PositionSnapshot } from "../../src/types/portfolio";
import type { TossCredentials } from "../credentials";

const BASE_URL = "https://openapi.tossinvest.com";

export interface TossPortfolioResult {
  account: AccountSnapshot;
  positions: PositionSnapshot[];
}

export interface TossFetchOptions {
  fetcher?: typeof fetch;
}

type UnknownRecord = Record<string, unknown>;

export function mapTossHoldingsResponse(
  response: unknown,
  credentials: TossCredentials,
  accountSeq: number,
  usdToKrwRate: number | null,
): TossPortfolioResult {
  const accountId = buildTossAccountId(credentials.accountAlias, accountSeq);
  const positions = readArray(readRecord(readRecord(response).result).items)
    .map((row) => mapTossPosition(readRecord(row), accountId, usdToKrwRate))
    .filter((position): position is PositionSnapshot => position !== null);
  const valuationKrw = sumNumbers(positions.map((position) => position.valuationKrw));
  const unrealizedProfitKrw = sumNumbers(positions.map((position) => position.unrealizedProfitKrw));
  const costBasisKrw = sumNumbers(positions.map((position) => position.costBasisKrw));

  return {
    account: {
      id: accountId,
      broker: "toss",
      alias: credentials.accountAlias,
      currency: "KRW",
      valuationKrw,
      // ponytail: holdings API has no idle cash; add buying-power support only if cash must be counted.
      cashKrw: 0,
      unrealizedProfitKrw,
      unrealizedProfitRate: roundRate(costBasisKrw > 0 ? unrealizedProfitKrw / costBasisKrw : 0),
    },
    positions,
  };
}

export async function fetchTossPortfolio(
  credentials: TossCredentials,
  options: TossFetchOptions = {},
): Promise<TossPortfolioResult | null> {
  const fetcher = options.fetcher ?? fetch;
  const token = await fetchAccessToken(credentials, fetcher);
  const accounts = await fetchAccounts(token, fetcher);
  const accountSeq = readNumber(readRecord(accounts[0] ?? {}).accountSeq);
  if (!accountSeq) {
    return null;
  }

  const holdings = await fetchHoldings(token, accountSeq, fetcher);
  const needsUsdRate = readArray(readRecord(readRecord(holdings).result).items).some(
    (item) => readText(readRecord(item).currency) === "USD",
  );
  const usdToKrwRate = needsUsdRate ? await fetchUsdToKrwRate(token, fetcher) : null;
  return mapTossHoldingsResponse(holdings, credentials, accountSeq, usdToKrwRate);
}

export function buildTossAccountId(alias: string, accountSeq: number): string {
  const withoutBrokerName = alias.replace(/토스증권?|토스/g, " ");
  const slug = withoutBrokerName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `toss-${slug || `account-${accountSeq}`}`;
}

async function fetchAccessToken(credentials: TossCredentials, fetcher: typeof fetch): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.appKey,
    client_secret: credentials.appSecret,
  });
  const response = await fetchTossJson("Toss access token", `${BASE_URL}/oauth2/token`, fetcher, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const token = readText(response.access_token);
  if (!token) {
    throw new Error("Toss token response did not include access_token");
  }
  return token;
}

async function fetchAccounts(token: string, fetcher: typeof fetch): Promise<unknown[]> {
  const response = await fetchTossJson("Toss accounts", `${BASE_URL}/api/v1/accounts`, fetcher, {
    headers: authHeaders(token),
  });
  return readArray(response.result);
}

async function fetchHoldings(token: string, accountSeq: number, fetcher: typeof fetch): Promise<unknown> {
  return fetchTossJson("Toss holdings", `${BASE_URL}/api/v1/holdings`, fetcher, {
    headers: {
      ...authHeaders(token),
      "X-Tossinvest-Account": String(accountSeq),
    },
  });
}

async function fetchUsdToKrwRate(token: string, fetcher: typeof fetch): Promise<number> {
  const url = new URL(`${BASE_URL}/api/v1/exchange-rate`);
  url.searchParams.set("baseCurrency", "USD");
  url.searchParams.set("quoteCurrency", "KRW");
  const response = await fetchTossJson("Toss exchange rate", url, fetcher, {
    headers: authHeaders(token),
  });
  const rate = readNumber(readRecord(response.result).rate);
  if (!rate) {
    throw new Error("Toss exchange-rate response did not include USD/KRW rate");
  }
  return rate;
}

async function fetchTossJson(label: string, url: string | URL, fetcher: typeof fetch, init: RequestInit): Promise<UnknownRecord> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = readText(readRecord(readRecord(payload).error).message) || readText(readRecord(payload).error_description);
    throw new Error(`${label} failed: HTTP ${response.status}${message ? ` ${message}` : ""}`);
  }
  return readRecord(payload);
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function mapTossPosition(row: UnknownRecord, accountId: string, usdToKrwRate: number | null): PositionSnapshot | null {
  const quantity = readNumber(row.quantity);
  if (quantity <= 0) {
    return null;
  }

  const currency = readText(row.currency) || "KRW";
  const market = mapMarket(readText(row.marketCountry));
  const symbol = readText(row.symbol);
  const valuation = readNumber(readRecord(row.marketValue).amount);
  const costBasis = readNumber(readRecord(row.marketValue).purchaseAmount);
  const unrealizedProfit = readNumber(readRecord(row.profitLoss).amount);
  const krwMultiplier = currency === "USD" ? usdToKrwRate : 1;
  const valuationKrw = krwMultiplier ? Math.round(valuation * krwMultiplier) : null;
  const costBasisKrw = krwMultiplier ? Math.round(costBasis * krwMultiplier) : null;
  const unrealizedProfitKrw = krwMultiplier ? Math.round(unrealizedProfit * krwMultiplier) : null;

  return {
    id: `${market}:${symbol}`,
    market,
    symbol,
    name: readText(row.name) || symbol,
    broker: "toss",
    accountId,
    quantity,
    currency,
    valuation,
    valuationKrw,
    costBasis,
    costBasisKrw,
    unrealizedProfit,
    unrealizedProfitKrw,
    unrealizedProfitRate: readNumber(readRecord(row.profitLoss).rate),
    krwValuationAvailable: valuationKrw !== null,
  };
}

function mapMarket(marketCountry: string): string {
  if (marketCountry === "KR") {
    return "KRX";
  }
  if (marketCountry === "US") {
    return "US";
  }
  return marketCountry || "UNKNOWN";
}

function readRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumNumbers(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
