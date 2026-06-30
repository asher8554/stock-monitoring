// 예전 암호화 포트폴리오 payload를 간단한 읽기 화면으로 보여준다.
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { decryptPayload, type EncryptedPayload } from "../lib/crypto";
import { buildDashboardModel } from "../lib/portfolio";
import type { ThemeMode } from "../lib/theme";
import type { DashboardModel, PortfolioPayload } from "../types/portfolio";

const allocationColors = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#be123c", "#475569"];

interface AllocationItem {
  id: string;
  name: string;
  valuationKrw: number;
  weight: number;
}

export function LegacyPortfolioView({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
  const [encrypted, setEncrypted] = useState<EncryptedPayload | null>(null);
  const [password, setPassword] = useState("");
  const [payload, setPayload] = useState<PortfolioPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`./portfolio.enc.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<EncryptedPayload>;
      })
      .then((data) => {
        if (mounted) {
          setEncrypted(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("포트폴리오 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const model = useMemo(() => (payload ? buildDashboardModel(payload) : null), [payload]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!encrypted || !password) {
      return;
    }
    try {
      setError(null);
      setPayload((await decryptPayload(encrypted, password)) as PortfolioPayload);
      setPassword("");
    } catch {
      setError("비밀번호가 맞지 않거나 데이터가 손상되었습니다.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Legacy encrypted portfolio</p>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-4xl">예전 포트폴리오</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="./"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-400"
            >
              사이클 대시보드
            </a>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-400"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {model && payload ? <PortfolioDashboard model={model} asOf={payload.asOf} /> : <UnlockForm loading={loading} error={error} encrypted={encrypted} password={password} onPasswordChange={setPassword} onSubmit={unlock} />}
      </div>
    </main>
  );
}

function UnlockForm({
  loading,
  error,
  encrypted,
  password,
  onPasswordChange,
  onSubmit,
}: {
  loading: boolean;
  error: string | null;
  encrypted: EncryptedPayload | null;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">비밀번호</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          disabled={loading || !encrypted}
          placeholder="포트폴리오 비밀번호"
          className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-slate-900"
        />
        <button
          type="submit"
          disabled={loading || !encrypted || !password}
          className="min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          열기
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-500">{loading ? "암호화 데이터를 불러오는 중입니다." : encrypted ? "암호화 데이터 준비됨." : error}</p>
      {error && encrypted ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}

function PortfolioDashboard({ model, asOf }: { model: DashboardModel; asOf: string }) {
  const allocationItems = buildAllocationItems(model);

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="총 잔고" value={formatCurrency(model.summary.totalBalanceKrw)} helper={`기준 시각 ${formatDate(asOf)}`} />
        <SummaryCard label="종목 평가금액" value={formatCurrency(model.summary.totalValuationKrw)} helper="현금 제외." />
        <SummaryCard label="현금" value={formatCurrency(model.summary.totalCashKrw)} helper={`비중 ${formatPercent(model.summary.cashWeight)}`} />
        <SummaryCard label="평가손익률" value={formatPercent(model.summary.unrealizedProfitRate)} helper={formatCurrency(model.summary.unrealizedProfitKrw)} />
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">자산비중</h2>
              <p className="mt-1 text-sm text-slate-500">종목과 현금 기준.</p>
            </div>
            <span className="text-sm font-semibold text-slate-500">{allocationItems.length}개</span>
          </div>
          <ul className="mt-4 space-y-3">
            {allocationItems.map((item, index) => (
              <li key={item.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: allocationColors[index % allocationColors.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-right font-bold text-slate-950">{formatPercent(item.weight)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(item.weight * 100, item.weight > 0 ? 1 : 0)}%`,
                      backgroundColor: allocationColors[index % allocationColors.length],
                    }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-slate-500">{formatCurrency(item.valuationKrw)}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">실현손익</h2>
          <p className="mt-1 text-sm text-slate-500">수집된 거래 이력 기준.</p>
          <div className="mt-4 grid gap-3">
            <MiniStat
              label="올해 실현손익"
              value={formatCurrency(model.summary.ytdRealizedProfitKrw)}
              helper={formatPercent(model.summary.ytdRealizedProfitRate)}
              tone={toneClass(model.summary.ytdRealizedProfitKrw)}
            />
            <MiniStat
              label="누적 실현손익"
              value={formatCurrency(model.summary.lifetimeRealizedProfitKrw)}
              helper={formatPercent(model.summary.lifetimeRealizedProfitRate)}
              tone={toneClass(model.summary.lifetimeRealizedProfitKrw)}
            />
          </div>
        </section>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">종목별 통합</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="border-b border-slate-200 py-3 text-left">종목</th>
                <th className="border-b border-slate-200 py-3 text-right">평가금액</th>
                <th className="border-b border-slate-200 py-3 text-right">매수금액</th>
                <th className="border-b border-slate-200 py-3 text-right">비중</th>
                <th className="border-b border-slate-200 py-3 text-right">수익률</th>
              </tr>
            </thead>
            <tbody>
              {model.holdings.map((holding) => (
                <tr key={holding.id}>
                  <td className="border-b border-slate-200 py-3">
                    <strong className="block text-slate-950">{holding.name}</strong>
                    <span className="text-xs text-slate-500">{holding.id}</span>
                  </td>
                  <td className="border-b border-slate-200 py-3 text-right">{formatCurrency(holding.valuationKrw)}</td>
                  <td className="border-b border-slate-200 py-3 text-right">{formatCurrency(holding.costBasisKrw)}</td>
                  <td className="border-b border-slate-200 py-3 text-right">{formatPercent(holding.weight)}</td>
                  <td className="border-b border-slate-200 py-3 text-right">{formatPercent(holding.unrealizedProfitRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function MiniStat({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return (
    <article className="rounded-lg bg-slate-100 p-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <strong className={`mt-2 block text-xl font-bold tracking-normal ${tone}`}>{value}</strong>
      <span className="mt-1 block text-sm text-slate-500">{helper}</span>
    </article>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <strong className="mt-3 block text-2xl font-bold tracking-normal text-slate-950">{value}</strong>
      <span className="mt-2 block text-sm text-slate-500">{helper}</span>
    </article>
  );
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

function toneClass(value: number): string {
  if (value > 0) {
    return "text-emerald-700";
  }
  if (value < 0) {
    return "text-rose-700";
  }
  return "text-slate-950";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
