# mock 원천 지표를 분류해 GitHub Pages용 JSON을 생성한다.
from __future__ import annotations

import json
import math
from datetime import UTC, date, datetime
from pathlib import Path

from classify_cycle import classify_annual_rows

PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "public" / "data"
LOOKBACK_YEARS = 30

PHASE_TEMPLATES = {
    "A": {
        "base_rate_avg": 4.0,
        "ktb10y_avg": 4.4,
        "cpi_yoy": 3.7,
        "m2_yoy": 5.5,
        "kospi_return": -8.0,
        "house_price_yoy": -1.0,
        "gdp_growth": 2.0,
        "usdkrw_change": 7.0,
    },
    "B": {
        "base_rate_avg": 3.5,
        "ktb10y_avg": 3.8,
        "cpi_yoy": 2.8,
        "m2_yoy": 6.0,
        "kospi_return": -2.0,
        "house_price_yoy": 0.5,
        "gdp_growth": 1.8,
        "usdkrw_change": 3.0,
    },
    "C": {
        "base_rate_avg": 2.5,
        "ktb10y_avg": 2.9,
        "cpi_yoy": 2.1,
        "m2_yoy": 6.5,
        "kospi_return": -6.0,
        "house_price_yoy": -3.0,
        "gdp_growth": 1.2,
        "usdkrw_change": 1.0,
    },
    "D": {
        "base_rate_avg": 1.5,
        "ktb10y_avg": 1.9,
        "cpi_yoy": 1.4,
        "m2_yoy": 8.5,
        "kospi_return": 4.0,
        "house_price_yoy": 0.0,
        "gdp_growth": 1.5,
        "usdkrw_change": -2.0,
    },
    "E": {
        "base_rate_avg": 2.0,
        "ktb10y_avg": 2.4,
        "cpi_yoy": 2.0,
        "m2_yoy": 8.0,
        "kospi_return": 18.0,
        "house_price_yoy": 4.0,
        "gdp_growth": 3.0,
        "usdkrw_change": -4.0,
    },
    "F": {
        "base_rate_avg": 2.8,
        "ktb10y_avg": 3.2,
        "cpi_yoy": 3.0,
        "m2_yoy": 7.0,
        "kospi_return": 12.0,
        "house_price_yoy": 7.0,
        "gdp_growth": 2.8,
        "usdkrw_change": 4.0,
    },
}

PHASE_SEQUENCE = {
    2000: "A",
    2001: "B",
    2002: "E",
    2003: "F",
    2004: "A",
    2005: "B",
    2006: "E",
    2007: "F",
    2008: "A",
    2009: "D",
    2010: "E",
    2011: "F",
    2012: "B",
    2013: "C",
    2014: "D",
    2015: "E",
    2016: "E",
    2017: "F",
    2018: "A",
    2019: "C",
    2020: "D",
    2021: "F",
    2022: "A",
    2023: "B",
    2024: "A",
    2025: "B",
    2026: "C",
}


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    rows = mock_rows(date.today().year)
    annual = classify_annual_rows(rows)
    now = datetime.now(UTC).replace(microsecond=0).isoformat()
    latest = {**annual[-1], "updatedAt": now}

    write_json(DATA_DIR / "annual_cycle.json", annual)
    write_json(DATA_DIR / "current_cycle.json", latest)
    print(f"Wrote {len(annual)} annual rows to {DATA_DIR}")


def mock_rows(current_year: int) -> list[dict]:
    rows = []
    start_year = current_year - LOOKBACK_YEARS + 1
    for year in range(start_year, current_year + 1):
        phase = phase_for_year(year)
        template = PHASE_TEMPLATES[phase]
        wave = math.sin((year - start_year) * 0.83)
        indicators = {key: round(value + wave * noise_for(key), 2) for key, value in template.items()}
        rows.append({"year": year, "indicators": indicators})
    return rows


def phase_for_year(year: int) -> str:
    if year in PHASE_SEQUENCE:
        return PHASE_SEQUENCE[year]
    if year < min(PHASE_SEQUENCE):
        return PHASE_SEQUENCE[min(PHASE_SEQUENCE)]
    return PHASE_SEQUENCE[max(PHASE_SEQUENCE)]


def noise_for(key: str) -> float:
    return {
        "base_rate_avg": 0.25,
        "ktb10y_avg": 0.32,
        "cpi_yoy": 0.35,
        "m2_yoy": 1.2,
        "kospi_return": 5.5,
        "house_price_yoy": 1.8,
        "gdp_growth": 0.45,
        "usdkrw_change": 2.5,
    }[key]


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
