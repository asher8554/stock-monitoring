// 한국투자증권 Open API 응답을 포트폴리오 스냅샷으로 변환한다.
import type { AccountSnapshot, PortfolioWarning, PositionSnapshot } from "../../src/types/portfolio";
import type { KoreaInvestmentCredentials } from "../credentials";

const REAL_BASE_URL = "https://openapi.koreainvestment.com:9443";
const DEMO_BASE_URL = "https://openapivts.koreainvestment.com:29443";
const DOMESTIC_BALANCE_PATH = "/uapi/domestic-stock/v1/trading/inquire-balance";
const OVERSEAS_BALANCE_PATH = "/uapi/overseas-stock/v1/trading/inquire-balance";
const TOKEN_PATH = "/oauth2/tokenP";
const MAX_PAGE_COUNT = 10;

export interface KoreaInvestmentPortfolioResult {
  account: AccountSnapshot;
  positions: PositionSnapshot[];
  warnings: PortfolioWarning[];
}

export interface KoreaInvestmentFetchOptions {
  fetcher?: typeof fetch;
  overseasMarkets?: OverseasMarket[];
}

interface OverseasMarket {
  exchangeCode: string;
  currency: string;
}

interface KisJsonResponse {
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
  output1?: unknown;
  output2?: unknown;
  ctx_area_fk100?: string;
  ctx_area_nk100?: string;
  ctx_area_fk200?: string;
  ctx_area_nk200?: string;
  access_token?: string;
  tr_cont?: string;
}

type UnknownRecord = Record<string, unknown>;

const DEFAULT_OVERSEAS_MARKETS: OverseasMarket[] = [{ exchangeCode: "NASD", currency: "USD" }];

export function mapDomesticBalanceResponse(
  response: unknown,
  credentials: KoreaInvestmentCredentials,
): KoreaInvestmentPortfolioResult {
  const accountId = buildKisAccountId(credentials.accountAlias, credentials.accountNo, credentials.accountProductCode);
  const positions = readArray(readRecord(response).output1)
    .map((row) => mapDomesticPosition(readRecord(row), accountId))
    .filter((position): position is PositionSnapshot => position !== null);
  const summary = readRecord(readArray(readRecord(response).output2)[0] ?? {});
  const cashKrw = readNumber(summary.dnca_tot_amt);
  const securitiesValue = readNumber(summary.scts_evlu_amt) || sumNumbers(positions.map((position) => position.valuationKrw));
  const valuationKrw = readNumber(summary.tot_evlu_amt) || securitiesValue + cashKrw;
  const unrealizedProfitKrw =
    readNumber(summary.evlu_pfls_smtl_amt) || sumNumbers(positions.map((position) => position.unrealizedProfitKrw));
  const costBasisKrw =
    readNumber(summary.pchs_amt_smtl_amt) || sumNumbers(positions.map((position) => position.costBasisKrw));

  return {
    account: {
      id: accountId,
      broker: "korea-investment",
      alias: credentials.accountAlias,
      currency: "KRW",
      valuationKrw,
      cashKrw,
      unrealizedProfitKrw,
      unrealizedProfitRate: roundRate(costBasisKrw > 0 ? unrealizedProfitKrw / costBasisKrw : 0),
    },
    positions,
    warnings: [],
  };
}

export function mapOverseasBalanceResponse(
  response: unknown,
  credentials: KoreaInvestmentCredentials,
): Pick<KoreaInvestmentPortfolioResult, "positions" | "warnings"> {
  const accountId = buildKisAccountId(credentials.accountAlias, credentials.accountNo, credentials.accountProductCode);
  const positions = readArray(readRecord(response).output1)
    .map((row) => mapOverseasPosition(readRecord(row), accountId))
    .filter((position): position is PositionSnapshot => position !== null);

  return {
    positions,
    warnings: positions
      .filter((position) => !position.krwValuationAvailable)
      .map((position) => ({
        code: "MISSING_KRW_VALUATION",
        severity: "warning",
        message: `${position.id}는 원화 환산금액이 없어 총액과 비중 계산에서 제외되었습니다.`,
        positionId: position.id,
      })),
  };
}

export async function fetchKoreaInvestmentPortfolio(
  credentials: KoreaInvestmentCredentials,
  options: KoreaInvestmentFetchOptions = {},
): Promise<KoreaInvestmentPortfolioResult> {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = credentials.environment === "demo" ? DEMO_BASE_URL : REAL_BASE_URL;
  const token = await fetchAccessToken(baseUrl, credentials, fetcher);
  const domesticResponse = await fetchDomesticBalance(baseUrl, credentials, token, fetcher);
  const domestic = mapDomesticBalanceResponse(domesticResponse, credentials);
  const overseasResults = await Promise.all(
    (options.overseasMarkets ?? DEFAULT_OVERSEAS_MARKETS).map((market) =>
      fetchOverseasBalance(baseUrl, credentials, token, fetcher, market).then((response) =>
        mapOverseasBalanceResponse(response, credentials),
      ),
    ),
  );

  return {
    account: domestic.account,
    positions: [...domestic.positions, ...overseasResults.flatMap((result) => result.positions)],
    warnings: overseasResults.flatMap((result) => result.warnings),
  };
}

export function buildKisAccountId(alias: string, _accountNo: string, _accountProductCode: string): string {
  const withoutBrokerName = alias.replace(/한국투자증권?|한국투자/g, " ");
  const slug = withoutBrokerName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `korea-investment-${slug || "account"}`;
}

async function fetchAccessToken(
  baseUrl: string,
  credentials: KoreaInvestmentCredentials,
  fetcher: typeof fetch,
): Promise<string> {
  const response = await fetchJson(`${baseUrl}${TOKEN_PATH}`, fetcher, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain",
      charset: "UTF-8",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: credentials.appKey,
      appsecret: credentials.appSecret,
    }),
  });
  if (!response.access_token) {
    throw new Error("KIS token response did not include access_token");
  }
  return response.access_token;
}

async function fetchDomesticBalance(
  baseUrl: string,
  credentials: KoreaInvestmentCredentials,
  token: string,
  fetcher: typeof fetch,
): Promise<KisJsonResponse> {
  const outputs: KisJsonResponse[] = [];
  let fk100 = "";
  let nk100 = "";
  let trCont = "";

  for (let page = 0; page < MAX_PAGE_COUNT; page += 1) {
    const response = await fetchKisGet(
      "KIS domestic balance",
      `${baseUrl}${DOMESTIC_BALANCE_PATH}`,
      domesticBalanceParams(credentials, fk100, nk100),
      headers(credentials, token, credentials.environment === "demo" ? "VTTC8434R" : "TTTC8434R", trCont),
      fetcher,
    );
    outputs.push(response);
    const next = readContinuation(response, "100");
    if (!next.hasNext) {
      break;
    }
    fk100 = next.fk;
    nk100 = next.nk;
    trCont = "N";
  }

  return mergePagedResponses(outputs);
}

async function fetchOverseasBalance(
  baseUrl: string,
  credentials: KoreaInvestmentCredentials,
  token: string,
  fetcher: typeof fetch,
  market: OverseasMarket,
): Promise<KisJsonResponse> {
  const outputs: KisJsonResponse[] = [];
  let fk200 = "";
  let nk200 = "";
  let trCont = "";

  for (let page = 0; page < MAX_PAGE_COUNT; page += 1) {
    const response = await fetchKisGet(
      `KIS overseas balance ${market.exchangeCode}`,
      `${baseUrl}${OVERSEAS_BALANCE_PATH}`,
      {
        CANO: credentials.accountNo,
        ACNT_PRDT_CD: credentials.accountProductCode,
        OVRS_EXCG_CD: market.exchangeCode,
        TR_CRCY_CD: market.currency,
        CTX_AREA_FK200: fk200,
        CTX_AREA_NK200: nk200,
      },
      headers(credentials, token, credentials.environment === "demo" ? "VTTS3012R" : "TTTS3012R", trCont),
      fetcher,
    );
    outputs.push(response);
    const next = readContinuation(response, "200");
    if (!next.hasNext) {
      break;
    }
    fk200 = next.fk;
    nk200 = next.nk;
    trCont = "N";
  }

  return mergePagedResponses(outputs);
}

async function fetchKisGet(
  label: string,
  url: string,
  params: Record<string, string>,
  requestHeaders: Record<string, string>,
  fetcher: typeof fetch,
): Promise<KisJsonResponse> {
  const searchParams = new URLSearchParams(params);
  try {
    return await fetchJson(`${url}?${searchParams.toString()}`, fetcher, {
      method: "GET",
      headers: requestHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} failed: ${message}`);
  }
}

async function fetchJson(url: string, fetcher: typeof fetch, init: RequestInit): Promise<KisJsonResponse> {
  const response = await fetcher(url, init);
  const body = (await response.json()) as KisJsonResponse;
  if (!response.ok) {
    throw new Error(`KIS API HTTP ${response.status}: ${body.msg1 ?? response.statusText}`);
  }
  if (body.rt_cd && body.rt_cd !== "0") {
    throw new Error(`KIS API ${body.msg_cd ?? "error"}: ${body.msg1 ?? "unknown error"}`);
  }
  return { ...body, tr_cont: response.headers.get("tr_cont") ?? "" };
}

function domesticBalanceParams(
  credentials: KoreaInvestmentCredentials,
  fk100: string,
  nk100: string,
): Record<string, string> {
  return {
    CANO: credentials.accountNo,
    ACNT_PRDT_CD: credentials.accountProductCode,
    AFHR_FLPR_YN: "N",
    OFL_YN: "",
    INQR_DVSN: "01",
    UNPR_DVSN: "01",
    FUND_STTL_ICLD_YN: "N",
    FNCG_AMT_AUTO_RDPT_YN: "N",
    PRCS_DVSN: "00",
    CTX_AREA_FK100: fk100,
    CTX_AREA_NK100: nk100,
  };
}

function headers(
  credentials: KoreaInvestmentCredentials,
  token: string,
  trId: string,
  trCont: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "text/plain",
    charset: "UTF-8",
    authorization: `Bearer ${token}`,
    appkey: credentials.appKey,
    appsecret: credentials.appSecret,
    tr_id: trId,
    custtype: "P",
    tr_cont: trCont,
  };
}

function mergePagedResponses(responses: KisJsonResponse[]): KisJsonResponse {
  return {
    output1: responses.flatMap((response) => readArray(response.output1)),
    output2: responses.flatMap((response) => readArray(response.output2)),
  };
}

function readContinuation(response: KisJsonResponse, suffix: "100" | "200"): { hasNext: boolean; fk: string; nk: string } {
  const fk = suffix === "100" ? String(response.ctx_area_fk100 ?? "") : String(response.ctx_area_fk200 ?? "");
  const nk = suffix === "100" ? String(response.ctx_area_nk100 ?? "") : String(response.ctx_area_nk200 ?? "");
  return {
    hasNext: response.tr_cont === "M" || response.tr_cont === "F",
    fk,
    nk,
  };
}

function mapDomesticPosition(row: UnknownRecord, accountId: string): PositionSnapshot | null {
  const symbol = readText(row.pdno).replace(/^A/i, "");
  const name = readText(row.prdt_name);
  const quantity = readNumber(row.hldg_qty);
  if (!symbol || !name || quantity === 0) {
    return null;
  }

  const valuationKrw = readNumber(row.evlu_amt);
  const costBasisKrw = readNullableNumber(row.pchs_amt);
  const unrealizedProfitKrw = readNullableNumber(row.evlu_pfls_amt);

  return {
    id: `KRX:${symbol}`,
    market: "KRX",
    symbol,
    name,
    broker: "korea-investment",
    accountId,
    quantity,
    currency: "KRW",
    valuation: valuationKrw,
    valuationKrw,
    costBasis: costBasisKrw,
    costBasisKrw,
    unrealizedProfit: unrealizedProfitKrw,
    unrealizedProfitKrw,
    unrealizedProfitRate: readNullableRate(row.evlu_pfls_rt ?? row.evlu_erng_rt),
    krwValuationAvailable: true,
  };
}

function mapOverseasPosition(row: UnknownRecord, accountId: string): PositionSnapshot | null {
  const symbol = readText(row.ovrs_pdno);
  const name = readText(row.ovrs_item_name ?? row.prdt_name);
  const quantity = readNumber(row.ovrs_cblc_qty);
  if (!symbol || quantity === 0) {
    return null;
  }

  const market = mapOverseasMarket(readText(row.ovrs_excg_cd));
  return {
    id: `${market}:${symbol}`,
    market,
    symbol,
    name: name || symbol,
    broker: "korea-investment",
    accountId,
    quantity,
    currency: readText(row.tr_crcy_cd) || "USD",
    valuation: readNumber(row.ovrs_stck_evlu_amt),
    valuationKrw: null,
    costBasis: readNullableNumber(row.frcr_pchs_amt1),
    costBasisKrw: null,
    unrealizedProfit: readNullableNumber(row.frcr_evlu_pfls_amt ?? row.ovrs_tot_pfls),
    unrealizedProfitKrw: null,
    unrealizedProfitRate: readNullableRate(row.evlu_pfls_rt),
    krwValuationAvailable: false,
  };
}

function mapOverseasMarket(exchangeCode: string): string {
  const normalized = exchangeCode.toUpperCase();
  if (normalized === "NASD" || normalized === "NAS") {
    return "NASDAQ";
  }
  if (normalized === "SEHK") {
    return "HKEX";
  }
  if (normalized === "TKSE") {
    return "TSE";
  }
  return normalized || "OVERSEAS";
}

function readRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    return [value];
  }
  return [];
}

function readText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function readNumber(value: unknown): number {
  return readNullableNumber(value) ?? 0;
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).replace(/[,%\s원]/g, "");
  const parenthesized = normalized.match(/^\((.*)\)$/);
  const numeric = Number(parenthesized ? `-${parenthesized[1]}` : normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function readNullableRate(value: unknown): number | null {
  const numeric = readNullableNumber(value);
  if (numeric === null) {
    return null;
  }
  const rate = String(value).includes("%") || Math.abs(numeric) > 1 ? numeric / 100 : numeric;
  return roundRate(rate);
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function sumNumbers(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}
