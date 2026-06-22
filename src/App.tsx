// 암호화된 포트폴리오를 복호화해 단일 대시보드로 보여준다.
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LockKeyhole, Moon, RefreshCw, RotateCcw, SlidersHorizontal, Sun, UnlockKeyhole } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { decryptPayload, type EncryptedPayload } from "./lib/crypto";
import { buildDashboardModel } from "./lib/portfolio";
import {
  buildRebalanceSettings,
  formatPercentInput,
  parsePercentInput,
  toTargetWeights,
  type RebalanceSetting,
  type StoredRebalanceTarget,
} from "./lib/rebalance-settings";
import { nextTheme, resolveInitialTheme, type ThemeMode } from "./lib/theme";
import type { DashboardModel, HoldingSummary, PortfolioPayload, RebalanceRow } from "./types/portfolio";

const allocationColors = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#be123c", "#475569"];
const brokerColors = ["#0f766e", "#2563eb", "#be123c", "#d97706"];
const themeStorageKey = "stock-monitoring-theme";
const rebalanceStorageKey = "stock-monitoring-rebalance-targets";
const portfolioRefreshIntervalMs = 10 * 60 * 1000;

interface AllocationItem {
  id: string;
  name: string;
  valuationKrw: number;
  weight: number;
}

interface BrokerItem {
  id: string;
  name: string;
  valuationKrw: number;
  weight: number;
}

export function App() {
  const [encrypted, setEncrypted] = useState<EncryptedPayload | null>(null);
  const [password, setPassword] = useState("");
  const [payload, setPayload] = useState<PortfolioPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [sessionPassword, setSessionPassword] = useState<string | null>(null);
  const [storedRebalanceTargets, setStoredRebalanceTargets] = useState<StoredRebalanceTarget[]>(readStoredRebalanceTargets);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    resolveInitialTheme(localStorage.getItem(themeStorageKey), window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  useEffect(() => {
    void loadEncryptedPortfolio();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(rebalanceStorageKey, JSON.stringify(storedRebalanceTargets));
  }, [storedRebalanceTargets]);

  const baseModel = useMemo(() => (payload ? buildDashboardModel(payload) : null), [payload]);
  const rebalanceSettings = useMemo(
    () => (payload && baseModel ? buildRebalanceSettings(baseModel.holdings, payload.targets, storedRebalanceTargets) : []),
    [baseModel, payload, storedRebalanceTargets],
  );
  const effectivePayload = useMemo(
    () => (payload ? { ...payload, targets: toTargetWeights(rebalanceSettings) } : null),
    [payload, rebalanceSettings],
  );
  const model = useMemo(() => (effectivePayload ? buildDashboardModel(effectivePayload) : null), [effectivePayload]);

  const refreshUnlockedPortfolio = useCallback(
    async ({ showProgress = true }: { showProgress?: boolean } = {}) => {
      if (!sessionPassword) {
        return;
      }

      if (showProgress) {
        setRefreshing(true);
      }
      setRefreshError(null);
      try {
        const nextEncrypted = await fetchEncryptedPortfolio();
        const nextPayload = (await decryptPayload(nextEncrypted, sessionPassword)) as PortfolioPayload;
        setEncrypted(nextEncrypted);
        setPayload(nextPayload);
        setLastCheckedAt(new Date().toISOString());
      } catch {
        setRefreshError("최신 데이터를 확인하지 못했습니다. 기존 데이터를 유지합니다.");
      } finally {
        if (showProgress) {
          setRefreshing(false);
        }
      }
    },
    [sessionPassword],
  );

  useEffect(() => {
    if (!payload || !sessionPassword) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshUnlockedPortfolio({ showProgress: false });
    }, portfolioRefreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [payload, refreshUnlockedPortfolio, sessionPassword]);

  async function loadEncryptedPortfolio() {
    setLoading(true);
    setLoadError(null);
    try {
      setEncrypted(await fetchEncryptedPortfolio());
      setLastCheckedAt(new Date().toISOString());
    } catch {
      setLoadError("암호화된 데이터 파일을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encrypted || !password) {
      return;
    }

    setUnlocking(true);
    setUnlockError(null);
    try {
      setPayload((await decryptPayload(encrypted, password)) as PortfolioPayload);
      setSessionPassword(password);
      setPassword("");
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
    } catch {
      setUnlockError("비밀번호가 맞지 않거나 데이터가 손상되었습니다.");
    } finally {
      setUnlocking(false);
    }
  }

  function lock() {
    setPayload(null);
    setPassword("");
    setSessionPassword(null);
    setUnlockError(null);
    setRefreshError(null);
  }

  function toggleTheme() {
    setTheme((currentTheme) => nextTheme(currentTheme));
  }

  function updateRebalanceSetting(id: string, field: "targetWeight" | "rebalanceThreshold", rawValue: string) {
    const setting = rebalanceSettings.find((item) => item.id === id);
    if (!setting) {
      return;
    }

    const value = parsePercentInput(rawValue, setting[field]);
    setStoredRebalanceTargets((currentTargets) => {
      const targetById = new Map(currentTargets.map((target) => [target.id, target]));
      const currentTarget = targetById.get(id);
      targetById.set(id, {
        id,
        targetWeight: field === "targetWeight" ? value : (currentTarget?.targetWeight ?? setting.targetWeight),
        rebalanceThreshold:
          field === "rebalanceThreshold" ? value : (currentTarget?.rebalanceThreshold ?? setting.rebalanceThreshold),
      });
      return [...targetById.values()];
    });
  }

  function resetRebalanceSettings() {
    localStorage.removeItem(rebalanceStorageKey);
    setStoredRebalanceTargets([]);
  }

  function refreshPortfolio() {
    if (payload) {
      void refreshUnlockedPortfolio();
      return;
    }

    void loadEncryptedPortfolio();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Stock Monitoring</h1>
          <p>암호화된 포트폴리오</p>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "라이트 모드" : "다크 모드"}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={refreshPortfolio}
            disabled={loading || refreshing}
            aria-label="상단 새 데이터 확인"
            title="상단 새 데이터 확인"
          >
            <RefreshCw className={refreshing ? "spin-icon" : undefined} size={18} />
          </button>
          {payload ? (
            <button className="secondary-button" type="button" onClick={lock}>
              <LockKeyhole size={17} />
              잠금
            </button>
          ) : null}
        </div>
      </header>

      {model && payload ? (
        <Dashboard
          model={model}
          theme={theme}
          rebalanceSettings={rebalanceSettings}
          lastCheckedAt={lastCheckedAt}
          refreshError={refreshError}
          refreshing={refreshing}
          onRefresh={refreshPortfolio}
          onRebalanceSettingChange={updateRebalanceSetting}
          onRebalanceSettingsReset={resetRebalanceSettings}
        />
      ) : (
        <UnlockPanel
          encrypted={encrypted}
          loading={loading}
          loadError={loadError}
          password={password}
          unlockError={unlockError}
          unlocking={unlocking}
          onPasswordChange={setPassword}
          onSubmit={unlock}
        />
      )}
    </main>
  );
}

interface UnlockPanelProps {
  encrypted: EncryptedPayload | null;
  loading: boolean;
  loadError: string | null;
  password: string;
  unlockError: string | null;
  unlocking: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function UnlockPanel({
  encrypted,
  loading,
  loadError,
  password,
  unlockError,
  unlocking,
  onPasswordChange,
  onSubmit,
}: UnlockPanelProps) {
  return (
    <section className="unlock-layout">
      <div className="unlock-panel">
        <div className="lock-mark">
          <LockKeyhole size={30} />
        </div>
        <h2>비밀번호</h2>
        <form onSubmit={onSubmit} className="unlock-form">
          <input
            aria-label="비밀번호"
            autoComplete="current-password"
            disabled={loading || !encrypted}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="비밀번호"
            type="password"
            value={password}
          />
          <button disabled={loading || !encrypted || !password || unlocking} type="submit">
            <UnlockKeyhole size={18} />
            열기
          </button>
        </form>
        <div className="status-line" role="status">
          {loading ? "데이터 확인 중" : encrypted ? "암호문 준비됨" : loadError}
        </div>
        {unlockError ? <div className="error-line">{unlockError}</div> : null}
      </div>
    </section>
  );
}

function Dashboard({
  model,
  theme,
  rebalanceSettings,
  lastCheckedAt,
  refreshError,
  refreshing,
  onRefresh,
  onRebalanceSettingChange,
  onRebalanceSettingsReset,
}: {
  model: DashboardModel;
  theme: ThemeMode;
  rebalanceSettings: RebalanceSetting[];
  lastCheckedAt: string | null;
  refreshError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onRebalanceSettingChange: (id: string, field: "targetWeight" | "rebalanceThreshold", value: string) => void;
  onRebalanceSettingsReset: () => void;
}) {
  const chartGridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const allocationItems = buildAllocationItems(model);

  return (
    <section className="dashboard-grid">
      <div className="meta-row">
        <div className="meta-stack">
          <span>데이터 확인 {lastCheckedAt ? formatDateTime(lastCheckedAt) : "없음"}</span>
          <span>10분마다 자동 확인</span>
        </div>
        <div className="meta-actions">
          {refreshError ? <span className="refresh-error" role="alert">{refreshError}</span> : <span>KRW 기준</span>}
          <button className="secondary-button refresh-button" type="button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "spin-icon" : undefined} size={16} />
            {refreshing ? "확인 중" : "새 데이터 확인"}
          </button>
        </div>
      </div>

      <KpiGrid model={model} />

      <BrokerBreakdownPanel items={buildBrokerItems(model)} />

      <section className="panel allocation-panel">
        <div className="section-heading">
          <h2>포트폴리오 비중</h2>
          <p>{allocationItems.length}개 자산</p>
        </div>
        <div className="allocation-content">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={210} initialDimension={{ width: 360, height: 210 }}>
              <PieChart>
                <Pie data={allocationItems} dataKey="valuationKrw" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2}>
                  {allocationItems.map((item, index) => (
                    <Cell key={item.id} fill={allocationColors[index % allocationColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel legend-panel">
        <div className="section-heading">
          <h2>비중 범례</h2>
          <p>금액과 비중</p>
        </div>
        <ul className="allocation-legend" aria-label="포트폴리오 비중 범례">
          {allocationItems.map((item, index) => (
            <li key={item.id}>
              <span className="legend-swatch" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} />
              <span className="legend-name">{item.name}</span>
              <span className="legend-value">{formatPercent(item.weight)}</span>
              <span className="legend-amount">{formatCurrency(item.valuationKrw)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel profit-panel">
        <div className="section-heading">
          <h2>손익률</h2>
          <p>평가손익과 실현손익</p>
        </div>
        <div className="bar-wrap">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={236} initialDimension={{ width: 360, height: 236 }}>
            <BarChart
              data={[
                { name: "평가손익률", value: model.summary.unrealizedProfitRate },
                { name: "YTD 실현", value: model.summary.ytdRealizedProfitRate },
                { name: "누적 실현", value: model.summary.lifetimeRealizedProfitRate },
              ]}
            >
              <CartesianGrid vertical={false} stroke={chartGridColor} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatPercent(Number(value))} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <HoldingsTable holdings={model.holdings} />
      <RebalanceSettingsPanel
        settings={rebalanceSettings}
        onChange={onRebalanceSettingChange}
        onReset={onRebalanceSettingsReset}
      />
      <RebalanceTable rows={model.rebalance} />
      <Warnings warnings={model.warnings} />
    </section>
  );
}

function RebalanceSettingsPanel({
  settings,
  onChange,
  onReset,
}: {
  settings: RebalanceSetting[];
  onChange: (id: string, field: "targetWeight" | "rebalanceThreshold", value: string) => void;
  onReset: () => void;
}) {
  const targetTotal = settings.reduce((total, setting) => total + setting.targetWeight, 0);

  return (
    <section className="panel wide-panel">
      <div className="section-heading rebalance-settings-heading">
        <div>
          <h2>리밸런싱 설정</h2>
          <p>목표 합계 {formatPercent(targetTotal)}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onReset}>
          <RotateCcw size={16} />
          초기화
        </button>
      </div>
      <div className="table-scroll">
        <table className="settings-table">
          <thead>
            <tr>
              <th>종목</th>
              <th>목표비중</th>
              <th>허용오차</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.id}>
                <td>
                  <strong>{setting.name}</strong>
                  <span>{setting.id}</span>
                </td>
                <td>
                  <label className="percent-field">
                    <SlidersHorizontal size={15} />
                    <input
                      aria-label={`${setting.name} 목표비중`}
                      inputMode="decimal"
                      max="100"
                      min="0"
                      onChange={(event) => onChange(setting.id, "targetWeight", event.target.value)}
                      step="0.1"
                      type="number"
                      value={formatPercentInput(setting.targetWeight)}
                    />
                    <span>%</span>
                  </label>
                </td>
                <td>
                  <label className="percent-field">
                    <input
                      aria-label={`${setting.name} 허용오차`}
                      inputMode="decimal"
                      max="100"
                      min="0"
                      onChange={(event) => onChange(setting.id, "rebalanceThreshold", event.target.value)}
                      step="0.1"
                      type="number"
                      value={formatPercentInput(setting.rebalanceThreshold)}
                    />
                    <span>%</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiGrid({ model }: { model: DashboardModel }) {
  const kpis = [
    { label: "총 잔고", value: formatCurrency(model.summary.totalBalanceKrw), tone: "neutral" },
    { label: "종목 평가금액", value: formatCurrency(model.summary.totalValuationKrw), tone: "neutral" },
    { label: "현금", value: formatCurrency(model.summary.totalCashKrw), tone: "neutral" },
    { label: "YTD 실현손익", value: formatCurrency(model.summary.ytdRealizedProfitKrw), tone: toneClass(model.summary.ytdRealizedProfitKrw) },
    { label: "평가손익률", value: formatPercent(model.summary.unrealizedProfitRate), tone: toneClass(model.summary.unrealizedProfitKrw) },
  ];

  return (
    <section className="kpi-grid">
      {kpis.map((kpi) => (
        <div className="kpi-tile" key={kpi.label}>
          <span>{kpi.label}</span>
          <strong className={kpi.tone}>{kpi.value}</strong>
        </div>
      ))}
    </section>
  );
}

function BrokerBreakdownPanel({ items }: { items: BrokerItem[] }) {
  return (
    <section className="panel wide-panel broker-panel">
      <div className="section-heading">
        <h2>증권사 비중</h2>
        <p>계좌 평가 기준</p>
      </div>
      <div className="broker-list" aria-label="증권사별 비중">
        {items.map((item, index) => (
          <div className="broker-row" key={item.id}>
            <div className="broker-row-meta">
              <strong>{item.name}</strong>
              <span>{formatCurrency(item.valuationKrw)}</span>
              <span>{formatPercent(item.weight)}</span>
            </div>
            <div className="broker-track">
              <span
                className="broker-fill"
                style={{
                  width: item.weight > 0 ? `${Math.max(item.weight * 100, 1)}%` : 0,
                  backgroundColor: brokerColors[index % brokerColors.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HoldingsTable({ holdings }: { holdings: HoldingSummary[] }) {
  return (
    <section className="panel wide-panel">
      <div className="section-heading">
        <h2>종목별 통합</h2>
        <p>market + symbol 기준</p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>종목</th>
              <th>평가금액</th>
              <th>매수금액</th>
              <th>비중</th>
              <th>평가손익</th>
              <th>수익률</th>
              <th>계좌</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={holding.id}>
                <td>
                  <strong>{holding.name}</strong>
                  <span>{holding.id}</span>
                </td>
                <td>{formatCurrency(holding.valuationKrw)}</td>
                <td>{formatCurrency(holding.costBasisKrw)}</td>
                <td>{formatPercent(holding.weight)}</td>
                <td className={toneClass(holding.unrealizedProfitKrw)}>{formatCurrency(holding.unrealizedProfitKrw)}</td>
                <td className={toneClass(holding.unrealizedProfitKrw)}>{formatPercent(holding.unrealizedProfitRate)}</td>
                <td>{holding.brokers.map(brokerLabel).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RebalanceTable({ rows }: { rows: RebalanceRow[] }) {
  return (
    <section className="panel wide-panel">
      <div className="section-heading">
        <h2>리밸런싱</h2>
        <p>목표 비중 대비</p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>종목</th>
              <th>현재</th>
              <th>목표</th>
              <th>허용</th>
              <th>차이</th>
              <th>판정</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  <span>{row.id}</span>
                </td>
                <td>{formatPercent(row.currentWeight)}</td>
                <td>{formatPercent(row.targetWeight)}</td>
                <td>{formatPercent(row.threshold)}</td>
                <td className={toneClass(row.difference)}>{formatPercent(row.difference)}</td>
                <td>
                  <span className={`action-pill ${row.needsRebalance ? row.action : "hold"}`}>{actionLabel(row.action)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function readStoredRebalanceTargets(): StoredRebalanceTarget[] {
  try {
    const raw = localStorage.getItem(rebalanceStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoredRebalanceTarget);
  } catch {
    return [];
  }
}

function isStoredRebalanceTarget(value: unknown): value is StoredRebalanceTarget {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.targetWeight === "number" &&
    Number.isFinite(candidate.targetWeight) &&
    typeof candidate.rebalanceThreshold === "number" &&
    Number.isFinite(candidate.rebalanceThreshold)
  );
}

function Warnings({ warnings }: { warnings: DashboardModel["warnings"] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="warning-strip">
      <AlertTriangle size={18} />
      <div>
        {warnings.map((warning) => (
          <p key={`${warning.code}-${warning.positionId ?? warning.message}`}>{warning.message}</p>
        ))}
      </div>
    </section>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function brokerLabel(broker: string): string {
  return {
    "korea-investment": "한국투자증권",
    toss: "토스증권",
    miraeasset: "미래에셋",
    manual: "수동",
  }[broker] ?? broker;
}

function toneClass(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

function actionLabel(action: RebalanceRow["action"]): string {
  return {
    buy: "추가매수",
    trim: "축소검토",
    hold: "유지",
  }[action];
}

function buildAllocationItems(model: DashboardModel): AllocationItem[] {
  const total = model.summary.totalBalanceKrw;
  const items = model.holdings.map((holding) => ({
    id: holding.id,
    name: holding.name,
    valuationKrw: holding.valuationKrw,
    weight: total > 0 ? holding.valuationKrw / total : 0,
  }));

  if (model.summary.totalCashKrw > 0) {
    items.push({
      id: "CASH:KRW",
      name: "현금",
      valuationKrw: model.summary.totalCashKrw,
      weight: total > 0 ? model.summary.totalCashKrw / total : 0,
    });
  }

  return items;
}

function buildBrokerItems(model: DashboardModel): BrokerItem[] {
  const byBroker = new Map<string, number>();
  model.accounts.forEach((account) => {
    byBroker.set(account.broker, (byBroker.get(account.broker) ?? 0) + account.valuationKrw);
  });
  const total = [...byBroker.values()].reduce((sum, value) => sum + value, 0);
  return [...byBroker.entries()]
    .map(([id, valuationKrw]) => ({
      id,
      name: brokerLabel(id),
      valuationKrw,
      weight: total > 0 ? valuationKrw / total : 0,
    }))
    .sort((left, right) => right.valuationKrw - left.valuationKrw);
}

async function fetchEncryptedPortfolio(): Promise<EncryptedPayload> {
  const response = await fetch(`./portfolio.enc.json?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as EncryptedPayload;
}
