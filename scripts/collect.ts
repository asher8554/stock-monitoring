// 로컬 수집 결과를 공통 포트폴리오 payload로 병합한다.
import type { AccountSnapshot, PortfolioPayload } from "../src/types/portfolio";
import type { KoreaInvestmentPortfolioResult } from "./adapters/korea-investment";

export interface MergeCollectedPortfolioInput {
  basePortfolio: PortfolioPayload;
  asOf: string;
  koreaInvestment?: KoreaInvestmentPortfolioResult | null;
  miraeAssetPositions: PortfolioPayload["positions"];
}

export function mergeCollectedPortfolio(input: MergeCollectedPortfolioInput): PortfolioPayload {
  const brokerAccounts = input.basePortfolio.accounts.filter(
    (account) => account.broker !== "korea-investment" && account.broker !== "miraeasset",
  );
  const brokerPositions = input.basePortfolio.positions.filter(
    (position) => position.broker !== "korea-investment" && position.broker !== "miraeasset",
  );
  const accounts = input.koreaInvestment ? [...brokerAccounts, input.koreaInvestment.account] : brokerAccounts;
  const warnings = input.koreaInvestment
    ? [...input.basePortfolio.warnings, ...input.koreaInvestment.warnings]
    : input.basePortfolio.warnings;

  return {
    ...input.basePortfolio,
    asOf: input.asOf,
    accounts: ensureMiraeAccount(accounts, input.miraeAssetPositions),
    positions: [
      ...brokerPositions,
      ...(input.koreaInvestment?.positions ?? []),
      ...input.miraeAssetPositions,
    ],
    warnings,
  };
}

function ensureMiraeAccount(
  accounts: AccountSnapshot[],
  positions: PortfolioPayload["positions"],
): AccountSnapshot[] {
  if (positions.length === 0 || accounts.some((account) => account.id === "miraeasset-general")) {
    return accounts;
  }

  const valuationKrw = positions.reduce((total, position) => total + (position.valuationKrw ?? 0), 0);
  const unrealizedProfitKrw = positions.reduce((total, position) => total + (position.unrealizedProfitKrw ?? 0), 0);
  const costBasisKrw = valuationKrw - unrealizedProfitKrw;

  return [
    ...accounts,
    {
      id: "miraeasset-general",
      broker: "miraeasset",
      alias: "미래에셋 일반",
      currency: "KRW",
      valuationKrw,
      cashKrw: 0,
      unrealizedProfitKrw,
      unrealizedProfitRate: costBasisKrw > 0 ? unrealizedProfitKrw / costBasisKrw : 0,
    },
  ];
}
