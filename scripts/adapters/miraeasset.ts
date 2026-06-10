// 미래에셋 잔고 CSV/XLSX 파일을 공통 포트폴리오 포지션으로 변환한다.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import readXlsxFile from "read-excel-file/node";
import type { PositionSnapshot } from "../../src/types/portfolio";

export interface MiraeAssetParseOptions {
  accountId: string;
  accountAlias: string;
}

type TableRow = unknown[];

export async function readMiraeAssetPositions(importDir: string, options: MiraeAssetParseOptions): Promise<PositionSnapshot[]> {
  let entries: string[];
  try {
    entries = await readdir(importDir);
  } catch {
    return [];
  }

  const positions: PositionSnapshot[] = [];
  for (const entry of entries) {
    const filePath = path.join(importDir, entry);
    const extension = path.extname(entry).toLowerCase();
    if (extension === ".csv") {
      positions.push(...parseMiraeAssetRows(await readCsvRows(filePath), options));
    }
    if (extension === ".xlsx") {
      positions.push(...parseMiraeAssetRows((await readXlsxFile(filePath)) as unknown as TableRow[], options));
    }
  }

  return positions;
}

export function parseMiraeAssetRows(rows: TableRow[], options: MiraeAssetParseOptions): PositionSnapshot[] {
  const [headers, ...bodyRows] = rows;
  if (!headers) {
    return [];
  }

  const headerMap = buildHeaderMap(headers);
  return bodyRows
    .map((row) => parsePositionRow(row, headerMap, options))
    .filter((position): position is PositionSnapshot => position !== null);
}

async function readCsvRows(filePath: string): Promise<TableRow[]> {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(splitCsvLine);
}

function parsePositionRow(row: TableRow, headerMap: Map<string, number>, options: MiraeAssetParseOptions): PositionSnapshot | null {
  const symbol = readText(row, headerMap, ["종목코드", "단축코드", "symbol", "code"]).replace(/^A/i, "");
  const name = readText(row, headerMap, ["종목명", "name"]);
  const quantity = readNumber(row, headerMap, ["수량", "보유수량", "quantity"]);
  const valuationKrw = readNumber(row, headerMap, ["평가금액", "평가금액(원)", "valuationKrw", "valuation"]);

  if (!symbol || !name || quantity === 0) {
    return null;
  }

  const market = inferMarket(symbol);
  const costBasisKrw = readNullableNumber(row, headerMap, ["매입금액", "매입금액(원)", "costBasisKrw", "costBasis"]);
  const unrealizedProfitKrw = readNullableNumber(row, headerMap, ["평가손익", "손익", "unrealizedProfitKrw"]);
  const unrealizedProfitRate = readNullableRate(row, headerMap, ["손익률", "수익률", "unrealizedProfitRate"]);

  return {
    id: `${market}:${symbol}`,
    market,
    symbol,
    name,
    broker: "miraeasset",
    accountId: options.accountId,
    quantity,
    currency: "KRW",
    valuation: valuationKrw,
    valuationKrw,
    costBasis: costBasisKrw,
    costBasisKrw,
    unrealizedProfit: unrealizedProfitKrw,
    unrealizedProfitKrw,
    unrealizedProfitRate,
    krwValuationAvailable: Number.isFinite(valuationKrw),
  };
}

function buildHeaderMap(headers: TableRow): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    map.set(normalizeHeader(header), index);
  });
  return map;
}

function readText(row: TableRow, headerMap: Map<string, number>, names: string[]): string {
  const value = readCell(row, headerMap, names);
  return value === undefined || value === null ? "" : String(value).trim();
}

function readNumber(row: TableRow, headerMap: Map<string, number>, names: string[]): number {
  return parseNumber(readCell(row, headerMap, names)) ?? 0;
}

function readNullableNumber(row: TableRow, headerMap: Map<string, number>, names: string[]): number | null {
  return parseNumber(readCell(row, headerMap, names));
}

function readNullableRate(row: TableRow, headerMap: Map<string, number>, names: string[]): number | null {
  const raw = readCell(row, headerMap, names);
  const value = parseNumber(raw);
  if (value === null) {
    return null;
  }
  const rate = String(raw).includes("%") || Math.abs(value) > 1 ? value / 100 : value;
  return Math.round(rate * 1_000_000) / 1_000_000;
}

function readCell(row: TableRow, headerMap: Map<string, number>, names: string[]): unknown {
  for (const name of names) {
    const index = headerMap.get(normalizeHeader(name));
    if (index !== undefined) {
      return row[index];
    }
  }
  return undefined;
}

function parseNumber(value: unknown): number | null {
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

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function inferMarket(symbol: string): string {
  if (/^\d{6}$/.test(symbol)) {
    return "KRX";
  }
  return "NASDAQ";
}

function normalizeHeader(value: unknown): string {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}
