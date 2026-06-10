// 로컬 수집, 암호화, 배포 데이터 생성 명령을 실행한다.
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { encryptPayload } from "../src/lib/crypto";
import type { AccountSnapshot, PortfolioPayload, TargetWeight } from "../src/types/portfolio";
import { readMiraeAssetPositions } from "./adapters/miraeasset";
import { loadBrokerCredentials, loadEnvFile } from "./credentials";
import { buildScheduleCommand } from "./scheduler";
import { createEmptyPortfolio, mergeTargetsIntoPortfolio, readJsonFile, writeJsonFile } from "./payload";

const projectDir = process.cwd();
const localDir = path.join(projectDir, "local");
const portfolioPath = path.join(localDir, "portfolio.local.json");
const targetsPath = path.join(localDir, "targets.local.json");
const encryptedOutputPath = path.join(projectDir, "public", "portfolio.enc.json");
const schedulerConfigPath = path.join(localDir, "scheduler.local.json");
const envLocalPath = path.join(projectDir, ".env.local");

async function main(): Promise<void> {
  const [command, subcommand, ...args] = process.argv.slice(2);

  if (command === "collect") {
    await collect();
    return;
  }

  if (command === "encrypt" || command === "publish-data") {
    await publishData();
    return;
  }

  if (command === "schedule" && (subcommand === "enable" || subcommand === "disable")) {
    await updateSchedule(subcommand, args);
    return;
  }

  throw new Error(`Unknown command: ${[command, subcommand].filter(Boolean).join(" ")}`);
}

async function collect(): Promise<void> {
  await loadEnvFile(envLocalPath);
  loadBrokerCredentials();

  const manualPath = path.join(localDir, "imports", "manual", "portfolio.json");
  const portfolio = await readOptionalJson<PortfolioPayload>(manualPath);
  const basePortfolio = portfolio ?? createEmptyPortfolio();
  const miraePositions = await readMiraeAssetPositions(path.join(localDir, "imports", "miraeasset"), {
    accountId: "miraeasset-general",
    accountAlias: "미래에셋 일반",
  });

  const merged: PortfolioPayload = {
    ...basePortfolio,
    asOf: new Date().toISOString(),
    accounts: ensureMiraeAccount(basePortfolio.accounts, miraePositions),
    positions: [...basePortfolio.positions.filter((position) => position.broker !== "miraeasset"), ...miraePositions],
  };

  await writeJsonFile(portfolioPath, merged);
  console.log(`portfolio.local.json written: ${portfolioPath}`);
}

async function publishData(): Promise<void> {
  const portfolio = await readJsonFile<PortfolioPayload>(portfolioPath);
  const targets = await readOptionalJson<TargetWeight[]>(targetsPath) ?? [];
  const payload = mergeTargetsIntoPortfolio(portfolio, targets);
  const password = await readPassword();
  const encrypted = await encryptPayload(payload, password);

  await writeJsonFile(encryptedOutputPath, encrypted);
  console.log(`portfolio.enc.json written: ${encryptedOutputPath}`);
}

async function updateSchedule(mode: "enable" | "disable", args: string[]): Promise<void> {
  const runAt = readTimeArg(args) ?? "16:10";
  const taskName = "StockMonitoring";
  const command = buildScheduleCommand({ mode, taskName, runAt, projectDir });
  const result = spawnSync(command.file, command.args, { stdio: "inherit", windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`schtasks failed with status ${result.status ?? "unknown"}`);
  }

  await writeJsonFile(schedulerConfigPath, {
    enabled: mode === "enable",
    runAt,
    taskName,
    updatedAt: new Date().toISOString(),
  });
}

async function readOptionalJson<T>(filePath: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readPassword(): Promise<string> {
  if (process.env.PORTFOLIO_PASSWORD) {
    return process.env.PORTFOLIO_PASSWORD;
  }

  if (!input.isTTY) {
    throw new Error("PORTFOLIO_PASSWORD environment variable is required in non-interactive mode");
  }

  const reader = createInterface({ input, output });
  const password = await reader.question("암호화 비밀번호 입력. ");
  reader.close();
  return password;
}

function ensureMiraeAccount(accounts: AccountSnapshot[], positions: PortfolioPayload["positions"]): AccountSnapshot[] {
  if (positions.length === 0 || accounts.some((account) => account.id === "miraeasset-general")) {
    return accounts;
  }

  const valuationKrw = positions.reduce((total, position) => total + (position.valuationKrw ?? 0), 0);
  const unrealizedProfitKrw = positions.reduce((total, position) => total + (position.unrealizedProfitKrw ?? 0), 0);

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
      unrealizedProfitRate: valuationKrw > 0 ? unrealizedProfitKrw / (valuationKrw - unrealizedProfitKrw) : 0,
    },
  ];
}

function readTimeArg(args: string[]): string | null {
  const index = args.findIndex((arg) => arg === "--time" || arg === "-t");
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

await mkdir(localDir, { recursive: true });
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
