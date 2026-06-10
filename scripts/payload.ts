// 로컬 포트폴리오 payload 파일을 읽고 병합한다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PortfolioPayload, TargetWeight } from "../src/types/portfolio";

export function mergeTargetsIntoPortfolio(portfolio: PortfolioPayload, targets: TargetWeight[]): PortfolioPayload {
  return {
    ...portfolio,
    targets: targets.map((target) => ({ ...target })),
  };
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createEmptyPortfolio(asOf = new Date().toISOString()): PortfolioPayload {
  return {
    version: 1,
    baseCurrency: "KRW",
    asOf,
    accounts: [],
    positions: [],
    realizedProfit: {
      ytd: { profitKrw: 0, profitRate: 0 },
      lifetime: { profitKrw: 0, profitRate: 0 },
    },
    targets: [],
    warnings: [],
  };
}
