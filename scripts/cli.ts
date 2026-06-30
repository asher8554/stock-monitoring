// 로컬 수집, 암호화, 배포 데이터 생성 명령을 실행한다.
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { encryptPayload } from "../src/lib/crypto";
import type { PortfolioPayload, TargetWeight } from "../src/types/portfolio";
import { fetchKoreaInvestmentPortfolio } from "./adapters/korea-investment";
import { readMiraeAssetPositions } from "./adapters/miraeasset";
import { fetchTossPortfolio } from "./adapters/toss";
import { mergeCollectedPortfolio } from "./collect";
import { loadBrokerCredentials, loadEnvFile } from "./credentials";
import { createFileKisTokenCache } from "./kis-token-cache";
import { buildScheduleCommand } from "./scheduler";
import { createEmptyPortfolio, mergeTargetsIntoPortfolio, readJsonFile, writeJsonFile } from "./payload";

const projectDir = process.cwd();
const localDir = path.join(projectDir, "local");
const portfolioPath = path.join(localDir, "portfolio.local.json");
const targetsPath = path.join(localDir, "targets.local.json");
const encryptedOutputPath = path.join(projectDir, "public", "portfolio.enc.json");
const schedulerConfigPath = path.join(localDir, "scheduler.local.json");
const kisTokenCachePath = path.join(localDir, "kis-token.local.json");
const envLocalPath = path.join(projectDir, ".env.local");

async function main(): Promise<void> {
  const [command, subcommand, ...args] = process.argv.slice(2);

  if (command === "collect") {
    await collect();
    return;
  }

  if (command === "daily-update") {
    await dailyUpdate();
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
  const credentials = loadBrokerCredentials();

  const manualPath = path.join(localDir, "imports", "manual", "portfolio.json");
  const portfolio = await readOptionalJson<PortfolioPayload>(manualPath);
  const basePortfolio = portfolio ?? createEmptyPortfolio();
  const koreaInvestment = credentials.koreaInvestment
    ? await fetchKoreaInvestmentPortfolio(credentials.koreaInvestment, {
        tokenCache: createFileKisTokenCache(kisTokenCachePath),
      })
    : null;
  let toss: Awaited<ReturnType<typeof fetchTossPortfolio>> = null;
  if (credentials.toss) {
    try {
      toss = await fetchTossPortfolio(credentials.toss);
    } catch (error) {
      // ponytail: optional broker failure must not block KIS/manual portfolio publishing.
      console.warn(`Toss collection skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const miraePositions = await readMiraeAssetPositions(path.join(localDir, "imports", "miraeasset"), {
    accountId: "miraeasset-general",
    accountAlias: "미래에셋 일반",
  });

  const merged = mergeCollectedPortfolio({
    basePortfolio,
    asOf: new Date().toISOString(),
    koreaInvestment,
    toss,
    miraeAssetPositions: miraePositions,
  });

  await writeJsonFile(portfolioPath, merged);
  console.log(`portfolio.local.json written: ${portfolioPath}`);
}

async function publishData(): Promise<void> {
  await loadEnvFile(envLocalPath);
  const portfolio = await readJsonFile<PortfolioPayload>(portfolioPath);
  const targets = await readOptionalJson<TargetWeight[]>(targetsPath) ?? [];
  const payload = mergeTargetsIntoPortfolio(portfolio, targets);
  const password = await readPassword();
  const encrypted = await encryptPayload(payload, password);

  await writeJsonFile(encryptedOutputPath, encrypted);
  console.log(`portfolio.enc.json written: ${encryptedOutputPath}`);
}

async function dailyUpdate(): Promise<void> {
  await collect();
  await publishData();

  if (!hasGitChanges("public/portfolio.enc.json")) {
    console.log("No encrypted portfolio changes to publish.");
    return;
  }

  runGit(["add", "public/portfolio.enc.json"]);
  runGit(["commit", "-m", "데이터 자동 갱신", "--", "public/portfolio.enc.json"]);
  runGit(["push"]);
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
    throw new Error("PORTFOLIO_PASSWORD is required for non-interactive publish. Add it to .env.local before running daily-update or schedule:enable.");
  }

  const reader = createInterface({ input, output });
  const password = await reader.question("암호화 비밀번호 입력. ");
  reader.close();
  return password;
}

function readTimeArg(args: string[]): string | null {
  const index = args.findIndex((arg) => arg === "--time" || arg === "-t");
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

function hasGitChanges(filePath: string): boolean {
  const result = spawnSync("git", ["status", "--porcelain", "--", filePath], {
    cwd: projectDir,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`git status failed with status ${result.status ?? "unknown"}`);
  }
  return result.stdout.trim().length > 0;
}

function runGit(args: string[]): void {
  const result = spawnSync("git", args, { cwd: projectDir, stdio: "inherit", windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed with status ${result.status ?? "unknown"}`);
  }
}

await mkdir(localDir, { recursive: true });
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
