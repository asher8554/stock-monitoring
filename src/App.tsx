// 암호화된 포트폴리오를 복호화해 단일 대시보드로 보여준다.
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LockKeyhole, RefreshCw, UnlockKeyhole } from "lucide-react";
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
import type { DashboardModel, HoldingSummary, PortfolioPayload, RebalanceRow } from "./types/portfolio";

const allocationColors = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#be123c", "#475569"];

export function App() {
  const [encrypted, setEncrypted] = useState<EncryptedPayload | null>(null);
  const [password, setPassword] = useState("");
  const [payload, setPayload] = useState<PortfolioPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    void loadEncryptedPortfolio();
  }, []);

  const model = useMemo(() => (payload ? buildDashboardModel(payload) : null), [payload]);

  async function loadEncryptedPortfolio() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("./portfolio.enc.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setEncrypted((await response.json()) as EncryptedPayload);
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
    setUnlockError(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Stock Monitoring</h1>
          <p>암호화된 포트폴리오</p>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={loadEncryptedPortfolio} aria-label="새로고침">
            <RefreshCw size={18} />
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
        <Dashboard model={model} asOf={payload.asOf} />
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

function Dashboard({ model, asOf }: { model: DashboardModel; asOf: string }) {
  return (
    <section className="dashboard-grid">
      <div className="meta-row">
        <span>기준 시각 {formatDateTime(asOf)}</span>
        <span>KRW 기준</span>
      </div>

      <KpiGrid model={model} />

      <section className="panel allocation-panel">
        <div className="section-heading">
          <h2>포트폴리오 비중</h2>
          <p>{model.holdings.length}개 종목</p>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={236} initialDimension={{ width: 360, height: 236 }}>
            <PieChart>
              <Pie data={model.holdings} dataKey="valuationKrw" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2}>
                {model.holdings.map((holding, index) => (
                  <Cell key={holding.id} fill={allocationColors[index % allocationColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel account-panel">
        <div className="section-heading">
          <h2>계좌별 요약</h2>
          <p>{model.accounts.length}개 계좌</p>
        </div>
        <div className="account-list">
          {model.accounts.map((account) => (
            <div className="account-row" key={account.id}>
              <div>
                <strong>{account.alias}</strong>
                <span>{brokerLabel(account.broker)}</span>
              </div>
              <div>
                <strong>{formatCurrency(account.valuationKrw)}</strong>
                <span className={toneClass(account.unrealizedProfitKrw)}>{formatPercent(account.unrealizedProfitRate)}</span>
              </div>
            </div>
          ))}
        </div>
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
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatPercent(Number(value))} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <HoldingsTable holdings={model.holdings} />
      <RebalanceTable rows={model.rebalance} />
      <Warnings warnings={model.warnings} />
    </section>
  );
}

function KpiGrid({ model }: { model: DashboardModel }) {
  const kpis = [
    { label: "전체 평가금액", value: formatCurrency(model.summary.totalValuationKrw), tone: "neutral" },
    { label: "YTD 실현손익", value: formatCurrency(model.summary.ytdRealizedProfitKrw), tone: toneClass(model.summary.ytdRealizedProfitKrw) },
    { label: "평가손익률", value: formatPercent(model.summary.unrealizedProfitRate), tone: toneClass(model.summary.unrealizedProfitKrw) },
    { label: "현금 비중", value: formatPercent(model.summary.cashWeight), tone: "neutral" },
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
