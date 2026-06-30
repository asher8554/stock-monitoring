# FRED 장단기금리차 원천 데이터를 수집하거나 mock 데이터로 대체한다.
from __future__ import annotations

import json
import math
import os
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import UTC, date, datetime
from pathlib import Path
from statistics import mean

PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "public" / "data"
RAW_PATH = DATA_DIR / "yield_curve_raw.json"
LOOKBACK_YEARS = 30

FRED_SERIES = {
    "us10y3m": "T10Y3M",
    "us10y2y": "T10Y2Y",
}


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    mock_series = build_mock_series()
    fred_api_key = os.environ.get("FRED_API_KEY", "").strip()
    series_by_key: dict[str, dict[str, float | None]] = {}
    source_mode = "mock"

    for key, fred_id in FRED_SERIES.items():
        if fred_api_key:
            try:
                series_by_key[key] = fetch_fred_monthly(fred_id, fred_api_key)
                source_mode = "fred"
            except (OSError, ValueError, urllib.error.URLError) as exc:
                print(f"FRED {fred_id} fetch failed, using mock data: {exc}")
                series_by_key[key] = {row["date"]: row[key] for row in mock_series}
        else:
            series_by_key[key] = {row["date"]: row[key] for row in mock_series}

    dates = sorted(set().union(*(set(values) for values in series_by_key.values())))
    rows = [
        {
            "date": month,
            "us10y3m": series_by_key["us10y3m"].get(month),
            "us10y2y": series_by_key["us10y2y"].get(month),
            "kr10y3y": None,
            "kr3y91d": None,
        }
        for month in dates
    ]

    payload = {
        "updatedAt": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "sourceMode": source_mode,
        "sourceNotes": [
            {
                "name": "FRED T10Y3M",
                "description": "US 10Y Treasury minus 3M Treasury spread. FRED_API_KEY가 있으면 API에서 수집합니다.",
            },
            {
                "name": "FRED T10Y2Y",
                "description": "US 10Y Treasury minus 2Y Treasury spread. FRED_API_KEY가 있으면 API에서 수집합니다.",
            },
            {
                "name": "BOK/ECOS or manual Korean yield adapter",
                "description": "KR 10Y-3Y and KR 3Y-CD91 spread. MVP에서는 adapter TODO와 null 값을 유지합니다.",
            },
        ],
        "series": rows,
    }
    write_json(RAW_PATH, payload)
    print(f"Wrote {len(rows)} yield curve raw rows to {RAW_PATH}")


def fetch_fred_monthly(series_id: str, api_key: str) -> dict[str, float | None]:
    query = urllib.parse.urlencode(
        {
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "observation_start": lookback_start_date(),
            "observation_end": date.today().isoformat(),
        }
    )
    url = f"https://api.stlouisfed.org/fred/series/observations?{query}"
    with urllib.request.urlopen(url, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if "observations" not in payload:
        raise ValueError(f"unexpected FRED payload for {series_id}")
    buckets: dict[str, list[float]] = defaultdict(list)
    for row in payload["observations"]:
        value = parse_float(row.get("value"))
        if value is None:
            continue
        buckets[str(row["date"])[:7]].append(value)
    return {month: round(mean(values), 3) for month, values in sorted(buckets.items())}


def build_mock_series() -> list[dict[str, float | None]]:
    months = month_range(lookback_start_month(), current_month())
    us10y3m_values = [
        -1.20,
        -1.10,
        -1.05,
        -0.95,
        -0.88,
        -0.80,
        -0.72,
        -0.68,
        -0.62,
        -0.55,
        -0.50,
        -0.46,
        -0.44,
        -0.40,
        -0.35,
        -0.32,
        -0.30,
        -0.26,
        -0.22,
        -0.17,
        -0.12,
        -0.06,
        0.02,
        0.10,
        0.18,
        0.29,
        0.38,
        0.43,
        0.48,
        0.51,
    ]
    us10y2y_values = [
        -0.35,
        -0.32,
        -0.31,
        -0.28,
        -0.24,
        -0.22,
        -0.19,
        -0.17,
        -0.15,
        -0.12,
        -0.10,
        -0.08,
        -0.06,
        -0.04,
        -0.03,
        -0.02,
        0.00,
        0.02,
        0.04,
        0.07,
        0.10,
        0.13,
        0.16,
        0.18,
        0.20,
        0.22,
        0.24,
        0.25,
        0.27,
        0.28,
    ]
    tail_start = max(0, len(months) - len(us10y3m_values))
    rows = []
    for index, month in enumerate(months):
        tail_index = index - tail_start
        rows.append(
            {
                "date": month,
                "us10y3m": us10y3m_values[tail_index] if tail_index >= 0 else historical_mock_value(index, 0.7, 1.05, 0),
                "us10y2y": us10y2y_values[tail_index] if tail_index >= 0 else historical_mock_value(index, 0.35, 0.55, 9),
                "kr10y3y": None,
                "kr3y91d": None,
            }
        )
    return rows


def lookback_start_date() -> str:
    return f"{date.today().year - LOOKBACK_YEARS + 1:04d}-01-01"


def lookback_start_month() -> str:
    return lookback_start_date()[:7]


def current_month() -> str:
    today = date.today()
    return f"{today.year:04d}-{today.month:02d}"


def month_range(start: str, end: str) -> list[str]:
    start_year, start_month = [int(part) for part in start.split("-")]
    end_year, end_month = [int(part) for part in end.split("-")]
    rows = []
    year = start_year
    month = start_month
    while (year, month) <= (end_year, end_month):
        rows.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            month = 1
            year += 1
    return rows


def historical_mock_value(index: int, base: float, amplitude: float, phase: int) -> float:
    cycle = math.sin((index + phase) / 18) * amplitude
    inversion = -0.9 if 32 <= index % 96 <= 52 else 0
    return round(base + cycle + inversion, 2)


def parse_float(value: object) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
