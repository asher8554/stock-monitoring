// 포트폴리오 대시보드 모델을 계산한다.
import type {
  BrokerId,
  DashboardModel,
  HoldingSummary,
  PortfolioPayload,
  PortfolioWarning,
  RebalanceAction,
  RebalanceRow,
} from "../types/portfolio";

export function buildDashboardModel(payload: PortfolioPayload): DashboardModel {
  const warnings = [...payload.warnings];
  const eligiblePositions = payload.positions.filter((position) => {
    if (position.krwValuationAvailable && position.valuationKrw !== null) {
      return true;
    }

    warnings.push({
      code: "MISSING_KRW_VALUATION",
      severity: "warning",
      message: `${position.id}는 원화 환산금액이 없어 총액과 비중 계산에서 제외되었습니다.`,
      positionId: position.id,
    });
    return false;
  });

  const holdings = aggregateHoldings(eligiblePositions);
  const totalValuationKrw = sum(holdings.map((holding) => holding.valuationKrw));
  const totalCashKrw = sum(payload.accounts.map((account) => account.cashKrw));
  const unrealizedProfitKrw = sum(payload.accounts.map((account) => account.unrealizedProfitKrw));

  const weightedHoldings = holdings
    .map((holding) => ({
      ...holding,
      weight: totalValuationKrw > 0 ? holding.valuationKrw / totalValuationKrw : 0,
    }))
    .sort((left, right) => right.valuationKrw - left.valuationKrw);

  return {
    summary: {
      totalValuationKrw,
      totalCashKrw,
      unrealizedProfitKrw,
      unrealizedProfitRate: totalValuationKrw > 0 ? unrealizedProfitKrw / (totalValuationKrw - unrealizedProfitKrw) : 0,
      ytdRealizedProfitKrw: payload.realizedProfit.ytd.profitKrw,
      ytdRealizedProfitRate: payload.realizedProfit.ytd.profitRate,
      lifetimeRealizedProfitKrw: payload.realizedProfit.lifetime.profitKrw,
      lifetimeRealizedProfitRate: payload.realizedProfit.lifetime.profitRate,
      cashWeight: totalValuationKrw + totalCashKrw > 0 ? totalCashKrw / (totalValuationKrw + totalCashKrw) : 0,
    },
    accounts: payload.accounts,
    holdings: weightedHoldings,
    rebalance: buildRebalanceRows(weightedHoldings, payload, warnings),
    warnings,
  };
}

type EligiblePosition = PortfolioPayload["positions"][number] & {
  valuationKrw: number;
};

function aggregateHoldings(positions: EligiblePosition[]): HoldingSummary[] {
  const byId = new Map<string, HoldingSummary>();

  positions.forEach((position) => {
    const existing = byId.get(position.id);
    if (!existing) {
      byId.set(position.id, {
        id: position.id,
        market: position.market,
        symbol: position.symbol,
        name: position.name,
        quantity: position.quantity,
        valuationKrw: position.valuationKrw,
        costBasisKrw: position.costBasisKrw ?? 0,
        unrealizedProfitKrw: position.unrealizedProfitKrw ?? 0,
        unrealizedProfitRate: position.unrealizedProfitRate ?? 0,
        weight: 0,
        brokers: [position.broker],
        accountIds: [position.accountId],
      });
      return;
    }

    existing.quantity += position.quantity;
    existing.valuationKrw += position.valuationKrw;
    existing.costBasisKrw += position.costBasisKrw ?? 0;
    existing.unrealizedProfitKrw += position.unrealizedProfitKrw ?? 0;
    existing.unrealizedProfitRate = existing.costBasisKrw > 0 ? existing.unrealizedProfitKrw / existing.costBasisKrw : 0;
    existing.brokers = unique([...existing.brokers, position.broker]);
    existing.accountIds = unique([...existing.accountIds, position.accountId]);
  });

  return [...byId.values()];
}

function buildRebalanceRows(
  holdings: HoldingSummary[],
  payload: PortfolioPayload,
  warnings: PortfolioWarning[],
): RebalanceRow[] {
  const holdingsById = new Map(holdings.map((holding) => [holding.id, holding]));

  return payload.targets.map((target) => {
    const holding = holdingsById.get(target.id);
    if (!holding) {
      warnings.push({
        code: "TARGET_WITHOUT_POSITION",
        severity: "info",
        message: `${target.id} 목표 비중이 있지만 현재 보유 수량이 없습니다.`,
        positionId: target.id,
      });
    }

    const currentWeight = holding?.weight ?? 0;
    const difference = currentWeight - target.targetWeight;
    const needsRebalance = Math.abs(difference) > target.rebalanceThreshold;
    const action = chooseRebalanceAction(difference, needsRebalance);

    return {
      id: target.id,
      market: target.market,
      symbol: target.symbol,
      name: holding?.name ?? target.id,
      currentWeight,
      targetWeight: target.targetWeight,
      difference,
      threshold: target.rebalanceThreshold,
      action,
      needsRebalance,
    };
  });
}

function chooseRebalanceAction(difference: number, needsRebalance: boolean): RebalanceAction {
  if (!needsRebalance) {
    return "hold";
  }

  return difference > 0 ? "trim" : "buy";
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function unique<T extends BrokerId | string>(values: T[]): T[] {
  return [...new Set(values)];
}
