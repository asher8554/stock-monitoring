# 장단기금리차 raw 데이터를 경기 위험 신호 JSON으로 변환한다.
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean
from typing import Any

PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "public" / "data"
RAW_PATH = DATA_DIR / "yield_curve_raw.json"
OUTPUT_PATH = DATA_DIR / "yield_curve.json"

YIELD_KEYS = ("us10y3m", "us10y2y", "kr10y3y", "kr3y91d")

STATUS_TO_RISK = {
    "normal": "low",
    "flattening": "watch",
    "near_inversion": "caution",
    "inverted": "high",
    "deep_inversion": "severe",
    "normal_after_inversion": "watch",
    "re_steepening": "watch",
    "unavailable": "watch",
}


def main() -> None:
    raw_payload = load_raw_payload()
    classified = classify_yield_curve_data(raw_payload)
    write_json(OUTPUT_PATH, classified)
    print(f"Wrote yield curve classification to {OUTPUT_PATH}")


def load_raw_payload() -> dict[str, Any]:
    if RAW_PATH.exists():
        return json.loads(RAW_PATH.read_text(encoding="utf-8"))
    from fetch_yield_curve import build_mock_series

    return {
        "updatedAt": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "sourceMode": "mock",
        "sourceNotes": default_source_notes(),
        "series": build_mock_series(),
    }


def classify_yield_curve_data(raw_payload: dict[str, Any]) -> dict[str, Any]:
    series = normalize_series(raw_payload.get("series", []))
    metrics = {key: build_metrics(series, key) for key in YIELD_KEYS}
    main_status = metrics["us10y3m"]["status"] if metrics["us10y3m"] else "unavailable"
    latest_row = series[-1] if series else {}
    risk_level = STATUS_TO_RISK.get(main_status, "watch")
    cycle_bias = cycle_bias_for_status(main_status)
    return {
        "updatedAt": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "sourceNotes": raw_payload.get("sourceNotes") or default_source_notes(),
        "latest": {
            "date": latest_row.get("date"),
            "us10y3m": latest_row.get("us10y3m"),
            "us10y2y": latest_row.get("us10y2y"),
            "kr10y3y": latest_row.get("kr10y3y"),
            "kr3y91d": latest_row.get("kr3y91d"),
            "primaryStatus": main_status,
            "riskLevel": risk_level,
            "cycleBias": cycle_bias,
            "headline": headline_for_status(main_status),
            "explanation": explanation_for_status(main_status, metrics["us10y3m"]),
        },
        "series": series,
        "metrics": metrics,
    }


def normalize_series(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for row in rows:
        date_value = str(row.get("date", "")).strip()
        if not date_value:
            continue
        normalized.append(
            {
                "date": date_value[:7],
                "us10y3m": parse_float(row.get("us10y3m")),
                "us10y2y": parse_float(row.get("us10y2y")),
                "kr10y3y": parse_float(row.get("kr10y3y")),
                "kr3y91d": parse_float(row.get("kr3y91d")),
            }
        )
    return sorted(normalized, key=lambda row: row["date"])


def build_metrics(series: list[dict[str, Any]], key: str) -> dict[str, Any] | None:
    values = [row.get(key) for row in series if row.get(key) is not None]
    if not values:
        return None
    latest = values[-1]
    recent12 = values[-12:]
    inversion_months = trailing_inversion_months(values)
    re_steepening = latest > 0 and any(value <= 0 for value in recent12[:-1])
    status = classify_spread_status(latest, inversion_months, re_steepening)
    return {
        "latest": round(latest, 3),
        "avg3m": round(mean(values[-3:]), 3),
        "avg12m": round(mean(recent12), 3),
        "min12m": round(min(recent12), 3),
        "inversionMonths": inversion_months,
        "reSteepeningAfterInversion": re_steepening,
        "status": status,
    }


def classify_spread_status(latest: float, inversion_months: int, re_steepening: bool) -> str:
    if latest <= -0.5 and inversion_months >= 3:
        return "deep_inversion"
    if latest <= 0:
        return "inverted"
    if re_steepening:
        return "re_steepening" if latest > 1.0 else "normal_after_inversion"
    if latest > 1.0:
        return "normal"
    if latest > 0.5:
        return "flattening"
    return "near_inversion"


def trailing_inversion_months(values: list[float]) -> int:
    months = 0
    for value in reversed(values):
        if value <= 0:
            months += 1
        else:
            break
    return months


def cycle_bias_for_status(status: str) -> list[str]:
    if status == "normal":
        return ["D", "E"]
    if status == "flattening":
        return ["F", "A"]
    if status in {"near_inversion", "inverted"}:
        return ["A", "B"]
    if status == "deep_inversion":
        return ["B", "C"]
    if status in {"normal_after_inversion", "re_steepening"}:
        return ["C", "D"]
    return []


def headline_for_status(status: str) -> str:
    return {
        "normal": "미국 장단기금리차는 정상 범위입니다.",
        "flattening": "미국 장단기금리차가 평탄화 구간에 있습니다.",
        "near_inversion": "미국 장단기금리차가 역전에 근접했습니다.",
        "inverted": "미국 장단기금리차가 역전 상태입니다.",
        "deep_inversion": "미국 장단기금리차가 깊은 역전 상태입니다.",
        "normal_after_inversion": "미국 장단기금리차는 역전 해소 후 정상화 초입입니다.",
        "re_steepening": "미국 장단기금리차는 역전 이후 재가팔라짐 구간입니다.",
    }.get(status, "장단기금리차 데이터 연결이 필요합니다.")


def explanation_for_status(status: str, main_metric: dict[str, Any] | None) -> list[str]:
    if main_metric is None:
        return [
            "미국 10Y-3M spread 데이터가 아직 연결되지 않았습니다.",
            "FRED_API_KEY를 설정하면 GitHub Actions에서 수집할 수 있습니다.",
            "한국 금리차 데이터는 adapter 연결 전까지 보조 판단에서 제외합니다.",
        ]
    latest = main_metric["latest"]
    base = [
        f"미국 10Y-3M spread 최신값은 {latest:.2f}%p입니다.",
        "역전 해소가 항상 경기 안전을 뜻하지는 않습니다. 과거에는 침체 직전 또는 연착륙 전환기에 모두 나타날 수 있었습니다.",
    ]
    if status == "normal":
        return [
            *base,
            "단기적으로 강한 역전 신호는 아니지만 한국 금리, 환율, KOSPI, 부동산 지표와 함께 봐야 합니다.",
        ]
    if status == "flattening":
        return [
            *base,
            "금리차가 좁아지는 구간은 정책 기대 변화와 위험자산 민감도가 커질 수 있는 구간입니다.",
        ]
    if status == "near_inversion":
        return [
            *base,
            "0%p 부근은 역전 전환 가능성을 관찰해야 하는 구간입니다.",
        ]
    if status == "inverted":
        return [
            *base,
            "장단기금리차 역전은 경기 둔화 선행 신호로 해석될 수 있어 보수적 해석이 필요합니다.",
        ]
    if status == "deep_inversion":
        return [
            *base,
            "깊고 지속된 역전은 경기 둔화 위험을 높이는 신호로 별도 점검이 필요합니다.",
        ]
    return [
        *base,
        "역전 이후 재가팔라짐은 경기 둔화 전환기와 연착륙 기대가 모두 나타날 수 있는 구간입니다.",
    ]


def default_source_notes() -> list[dict[str, str]]:
    return [
        {
            "name": "FRED T10Y3M",
            "description": "US 10Y Treasury minus 3M Treasury spread",
        },
        {
            "name": "FRED T10Y2Y",
            "description": "US 10Y Treasury minus 2Y Treasury spread",
        },
        {
            "name": "BOK/ECOS or manual Korean yield adapter",
            "description": "KR 10Y-3Y and KR 3Y-CD91 spread, optional in MVP",
        },
    ]


def parse_float(value: Any) -> float | None:
    try:
        return round(float(value), 3)
    except (TypeError, ValueError):
        return None


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
