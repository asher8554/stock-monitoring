# 한국 시장 지표를 코스톨라니 달걀 A-F 점수로 분류한다.
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

PHASES = ("A", "B", "C", "D", "E", "F")

PHASE_LABELS = {
    "A": "금리 정점",
    "B": "예금 -> 채권",
    "C": "부동산 투자 / 채권 매도",
    "D": "금리 저점",
    "E": "부동산 매도 / 주식 투자",
    "F": "주식 매도 / 예금 시작",
}

INDICATOR_LABELS = {
    "base_rate_avg": "기준금리 평균",
    "ktb10y_avg": "국고채 10년 금리 평균",
    "cpi_yoy": "CPI YoY",
    "m2_yoy": "M2 YoY",
    "kospi_return": "KOSPI 연간 수익률",
    "house_price_yoy": "부동산 가격지수 YoY",
    "gdp_growth": "GDP 성장률",
    "usdkrw_change": "원/달러 환율 변화율",
}


@dataclass(frozen=True)
class Driver:
    feature: str
    label: str
    phase: str
    impact: float
    direction: str


def classify_annual_rows(rows: list[dict]) -> list[dict]:
    sorted_rows = sorted(rows, key=lambda row: row["year"])
    features_by_year = build_features(sorted_rows)
    return [classify_row(row, features_by_year[row["year"]]) for row in sorted_rows]


def build_features(rows: list[dict]) -> dict[int, dict[str, float]]:
    sorted_rows = sorted(rows, key=lambda row: row["year"])
    percentile_keys = ("base_rate_avg", "cpi_yoy", "kospi_return", "house_price_yoy", "gdp_growth", "m2_yoy")
    percentiles = {
        key: percentile_map([(row["year"], row["indicators"][key]) for row in sorted_rows])
        for key in percentile_keys
    }

    features_by_year: dict[int, dict[str, float]] = {}
    previous = None
    for row in sorted_rows:
        year = row["year"]
        indicators = row["indicators"]
        previous_indicators = previous["indicators"] if previous else indicators
        rate_delta = indicators["base_rate_avg"] - previous_indicators["base_rate_avg"]
        cpi_delta = indicators["cpi_yoy"] - previous_indicators["cpi_yoy"]
        m2_delta = indicators["m2_yoy"] - previous_indicators["m2_yoy"]
        gdp_delta = indicators["gdp_growth"] - previous_indicators["gdp_growth"]

        rate_high = percentiles["base_rate_avg"][year]
        inflation_high = percentiles["cpi_yoy"][year]
        features_by_year[year] = {
            "rate_high": rate_high,
            "rate_low": 1 - rate_high,
            "rate_rising": clamp(rate_delta / 1.5),
            "rate_falling": clamp(-rate_delta / 1.5),
            "inflation_high": inflation_high,
            "inflation_rising": clamp(cpi_delta / 1.5),
            "inflation_cooling": clamp(-cpi_delta / 1.5),
            "liquidity_rising": average(percentiles["m2_yoy"][year], clamp(m2_delta / 5)),
            "equity_strong": percentiles["kospi_return"][year],
            "equity_weak": 1 - percentiles["kospi_return"][year],
            "housing_strong": percentiles["house_price_yoy"][year],
            "housing_weak": 1 - percentiles["house_price_yoy"][year],
            "growth_weak": 1 - percentiles["gdp_growth"][year],
            "growth_recovering": clamp(gdp_delta / 2.5),
            "fx_stress": clamp(indicators["usdkrw_change"] / 12),
        }
        previous = row
    return features_by_year


def classify_row(row: dict, features: dict[str, float]) -> dict:
    weighted_inputs = phase_weights()
    raw_scores = {
        phase: sum(features[feature] * weight for feature, weight, _ in inputs)
        for phase, inputs in weighted_inputs.items()
    }
    scores = normalize_scores(raw_scores)
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary, confidence = ranked[0]
    secondary, second_score = ranked[1]
    phase_label = (
        f"{primary}/{secondary} 과도기"
        if confidence - second_score < 0.08
        else f"{primary}: {PHASE_LABELS[primary]}"
    )
    drivers = top_drivers(primary, weighted_inputs[primary], features)
    return {
        "year": row["year"],
        "indicators": row["indicators"],
        "scores": scores,
        "primaryPhase": primary,
        "secondaryPhase": secondary,
        "phaseLabel": phase_label,
        "confidence": confidence,
        "topDrivers": [driver.__dict__ for driver in drivers],
        "explanation": [driver.direction for driver in drivers],
    }


def phase_weights() -> dict[str, list[tuple[str, float, str]]]:
    return {
        "A": [
            ("rate_high", 0.34, "기준금리와 장기금리가 높은 축에 있습니다."),
            ("inflation_high", 0.24, "물가 압력이 남아 있어 완화 전환 확신이 약합니다."),
            ("rate_rising", 0.18, "금리 상승 또는 동결 압력이 위험자산 부담을 키웁니다."),
            ("equity_weak", 0.14, "주식 수익률이 약해 위험자산 심리가 둔화되어 있습니다."),
            ("fx_stress", 0.10, "원화 약세는 금융 여건 부담을 높입니다."),
        ],
        "B": [
            ("rate_high", 0.28, "금리 수준이 아직 높아 채권 기대수익 논리가 커집니다."),
            ("rate_falling", 0.26, "금리 하락이 시작되면 채권 가격 매력이 커집니다."),
            ("inflation_cooling", 0.18, "물가 둔화가 긴축 종료 기대를 강화합니다."),
            ("equity_weak", 0.16, "주식보다 방어적 자산 해석이 강해질 수 있습니다."),
            ("growth_weak", 0.12, "성장 둔화가 안전자산 수요를 높입니다."),
        ],
        "C": [
            ("rate_falling", 0.25, "금리 하락이 진행되는 구간입니다."),
            ("growth_weak", 0.22, "성장 둔화가 깊어져 경기 민감 자산은 조심스럽습니다."),
            ("equity_weak", 0.20, "위험자산 약세가 남아 있습니다."),
            ("housing_weak", 0.18, "부동산 가격이 약해 저점 접근 가능성이 보입니다."),
            ("inflation_cooling", 0.15, "물가 둔화가 다음 완화 국면을 뒷받침합니다."),
        ],
        "D": [
            ("rate_low", 0.30, "금리가 낮은 축에 가까워져 있습니다."),
            ("liquidity_rising", 0.25, "유동성 증가가 다음 회복을 준비합니다."),
            ("inflation_cooling", 0.18, "물가 안정은 완화 환경을 지지합니다."),
            ("growth_weak", 0.15, "경기는 아직 바닥권에 가깝습니다."),
            ("housing_weak", 0.12, "부동산 가격 압력은 낮은 편입니다."),
        ],
        "E": [
            ("equity_strong", 0.28, "주식시장에서 회복 신호가 보입니다."),
            ("liquidity_rising", 0.23, "유동성 증가가 위험자산 회복을 돕습니다."),
            ("rate_low", 0.18, "금리 부담이 낮아진 상태입니다."),
            ("growth_recovering", 0.18, "성장률 개선이 경기 회복 신호입니다."),
            ("housing_strong", 0.13, "부동산 회복도 위험자산 심리와 연결됩니다."),
        ],
        "F": [
            ("equity_strong", 0.24, "주식시장이 강한 구간입니다."),
            ("housing_strong", 0.22, "부동산 가격 강세가 과열권 신호가 될 수 있습니다."),
            ("inflation_rising", 0.18, "물가 상승 압력은 금리 인상 우려를 높입니다."),
            ("rate_rising", 0.18, "금리 상승 압력이 다시 나타납니다."),
            ("liquidity_rising", 0.10, "유동성은 여전히 위험자산에 힘을 보탤 수 있습니다."),
            ("fx_stress", 0.08, "환율 상승은 긴축 전환 가능성을 높입니다."),
        ],
    }


def top_drivers(phase: str, inputs: Iterable[tuple[str, float, str]], features: dict[str, float]) -> list[Driver]:
    ranked = sorted(
        (
            Driver(feature, feature_label(feature), phase, round(features[feature] * weight, 4), direction)
            for feature, weight, direction in inputs
        ),
        key=lambda driver: driver.impact,
        reverse=True,
    )
    return ranked[:3]


def percentile_map(items: list[tuple[int, float]]) -> dict[int, float]:
    ordered_values = sorted(value for _, value in items)
    denominator = max(len(ordered_values) - 1, 1)
    result = {}
    for year, value in items:
        lower_count = sum(1 for ordered_value in ordered_values if ordered_value < value)
        equal_count = sum(1 for ordered_value in ordered_values if ordered_value == value)
        average_rank = lower_count + (equal_count - 1) / 2
        result[year] = round(average_rank / denominator, 4)
    return result


def normalize_scores(raw_scores: dict[str, float]) -> dict[str, float]:
    total = sum(raw_scores.values())
    if total <= 0:
        return {phase: round(1 / len(raw_scores), 4) for phase in raw_scores}
    return {phase: round(score / total, 4) for phase, score in raw_scores.items()}


def average(*values: float) -> float:
    return clamp(sum(values) / len(values))


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def feature_label(feature: str) -> str:
    return {
        "rate_high": "높은 금리",
        "rate_low": "낮은 금리",
        "rate_rising": "금리 상승",
        "rate_falling": "금리 하락",
        "inflation_high": "높은 물가",
        "inflation_rising": "물가 상승",
        "inflation_cooling": "물가 둔화",
        "liquidity_rising": "유동성 증가",
        "equity_strong": "주식 강세",
        "equity_weak": "주식 약세",
        "housing_strong": "부동산 강세",
        "housing_weak": "부동산 약세",
        "growth_weak": "성장 둔화",
        "growth_recovering": "성장 회복",
        "fx_stress": "환율 부담",
    }[feature]


def _self_test() -> None:
    rows = [
        {
            "year": 2000,
            "indicators": {
                "base_rate_avg": 5,
                "ktb10y_avg": 7,
                "cpi_yoy": 2,
                "m2_yoy": 5,
                "kospi_return": 10,
                "house_price_yoy": 2,
                "gdp_growth": 4,
                "usdkrw_change": 0,
            },
        },
        {
            "year": 2002,
            "indicators": {
                "base_rate_avg": 4,
                "ktb10y_avg": 6,
                "cpi_yoy": 1,
                "m2_yoy": 8,
                "kospi_return": 20,
                "house_price_yoy": 4,
                "gdp_growth": 5,
                "usdkrw_change": -2,
            },
        },
    ]
    result = classify_annual_rows(rows)
    assert len(result) == 2
    assert result[1]["year"] == 2002
    assert set(result[0]["scores"]) == set(PHASES)
    assert 0 <= result[0]["confidence"] <= 1


if __name__ == "__main__":
    _self_test()
