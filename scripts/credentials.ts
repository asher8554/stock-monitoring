// 증권사 API 자격 증명을 로컬 환경변수에서 읽는다.
import { readFile } from "node:fs/promises";

export interface BrokerCredentials {
  koreaInvestment: KoreaInvestmentCredentials | null;
  toss: TossCredentials | null;
}

export interface KoreaInvestmentCredentials {
  appKey: string;
  appSecret: string;
  accountNo: string;
  accountProductCode: string;
  accountAlias: string;
  environment: "real" | "demo";
  lifetimeStartDate: string;
}

export interface TossCredentials {
  appKey: string;
  appSecret: string;
  accountAlias: string;
}

type EnvMap = Record<string, string | undefined>;

export function loadBrokerCredentials(env: EnvMap = process.env): BrokerCredentials {
  return {
    koreaInvestment: loadKisCredentials(env),
    toss: loadTossCredentials(env),
  };
}

export async function loadEnvFile(filePath: string, target: EnvMap = process.env): Promise<void> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  const values = parseEnvFile(content);
  Object.entries(values).forEach(([key, value]) => {
    if (!target[key]) {
      target[key] = value;
    }
  });
}

export function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = unquote(rawValue);
  });
  return values;
}

function loadKisCredentials(env: EnvMap): KoreaInvestmentCredentials | null {
  const configuredValues = {
    appKey: readEnv(env, "KIS_APP_KEY"),
    appSecret: readEnv(env, "KIS_APP_SECRET"),
    accountNo: readEnv(env, "KIS_ACCOUNT_NO"),
    accountProductCode: readEnv(env, "KIS_ACCOUNT_PRODUCT_CODE"),
  };
  const requiredValues = {
    ...configuredValues,
    accountAlias: readEnv(env, "KIS_ACCOUNT_ALIAS"),
  };

  if (allEmpty(configuredValues)) {
    return null;
  }
  if (someEmpty(requiredValues)) {
    throw new Error("KIS credentials are incomplete");
  }

  const environment = readEnv(env, "KIS_ENVIRONMENT") || "real";
  if (environment !== "real" && environment !== "demo") {
    throw new Error("KIS_ENVIRONMENT must be real or demo");
  }

  const lifetimeStartDate = readEnv(env, "KIS_LIFETIME_START_DATE") || "20000101";
  if (!/^\d{8}$/.test(lifetimeStartDate)) {
    throw new Error("KIS_LIFETIME_START_DATE must be YYYYMMDD");
  }

  return { ...requiredValues, environment, lifetimeStartDate };
}

function loadTossCredentials(env: EnvMap): TossCredentials | null {
  const configuredValues = {
    appKey: readEnv(env, "TOSS_APP_KEY"),
    appSecret: readEnv(env, "TOSS_APP_SECRET"),
  };
  const values = {
    ...configuredValues,
    accountAlias: readEnv(env, "TOSS_ACCOUNT_ALIAS"),
  };

  if (allEmpty(configuredValues)) {
    return null;
  }
  if (someEmpty(values)) {
    throw new Error("Toss credentials are incomplete");
  }
  return values as TossCredentials;
}

function readEnv(env: EnvMap, key: string): string {
  return env[key]?.trim() ?? "";
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function allEmpty(values: Record<string, string>): boolean {
  return Object.values(values).every((value) => value.length === 0);
}

function someEmpty(values: Record<string, string>): boolean {
  return Object.values(values).some((value) => value.length === 0);
}
