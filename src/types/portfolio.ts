// 포트폴리오 정규화 데이터 구조를 정의한다.
export type BrokerId = "korea-investment" | "toss" | "miraeasset" | "manual";

export interface AccountSnapshot {
  id: string;
  broker: BrokerId;
  alias: string;
  currency: string;
  valuationKrw: number;
  cashKrw: number;
  unrealizedProfitKrw: number;
  unrealizedProfitRate: number;
}

export interface PositionSnapshot {
  id: string;
  market: string;
  symbol: string;
  name: string;
  broker: BrokerId;
  accountId: string;
  quantity: number;
  currency: string;
  valuation: number;
  valuationKrw: number | null;
  costBasis: number | null;
  costBasisKrw: number | null;
  unrealizedProfit: number | null;
  unrealizedProfitKrw: number | null;
  unrealizedProfitRate: number | null;
  krwValuationAvailable: boolean;
}

export interface RealizedProfitSummary {
  profitKrw: number;
  profitRate: number;
}

export interface TargetWeight {
  id: string;
  market: string;
  symbol: string;
  targetWeight: number;
  rebalanceThreshold: number;
}

export interface PortfolioWarning {
  code: "MISSING_KRW_VALUATION" | "TARGET_WITHOUT_POSITION" | "INVALID_TARGET_WEIGHT";
  severity: "info" | "warning" | "error";
  message: string;
  positionId?: string;
}

export interface PortfolioPayload {
  version: 1;
  baseCurrency: "KRW";
  asOf: string;
  accounts: AccountSnapshot[];
  positions: PositionSnapshot[];
  realizedProfit: {
    ytd: RealizedProfitSummary;
    lifetime: RealizedProfitSummary;
  };
  targets: TargetWeight[];
  warnings: PortfolioWarning[];
}

export interface HoldingSummary {
  id: string;
  market: string;
  symbol: string;
  name: string;
  quantity: number;
  valuationKrw: number;
  costBasisKrw: number;
  unrealizedProfitKrw: number;
  unrealizedProfitRate: number;
  weight: number;
  brokers: BrokerId[];
  accountIds: string[];
}

export type RebalanceAction = "buy" | "trim" | "hold";

export interface RebalanceRow {
  id: string;
  market: string;
  symbol: string;
  name: string;
  currentWeight: number;
  targetWeight: number;
  difference: number;
  threshold: number;
  action: RebalanceAction;
  needsRebalance: boolean;
}

export interface DashboardModel {
  summary: {
    totalValuationKrw: number;
    totalCashKrw: number;
    unrealizedProfitKrw: number;
    unrealizedProfitRate: number;
    ytdRealizedProfitKrw: number;
    ytdRealizedProfitRate: number;
    lifetimeRealizedProfitKrw: number;
    lifetimeRealizedProfitRate: number;
    cashWeight: number;
  };
  accounts: AccountSnapshot[];
  holdings: HoldingSummary[];
  rebalance: RebalanceRow[];
  warnings: PortfolioWarning[];
}
