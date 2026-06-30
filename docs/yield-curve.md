# 장단기금리차 경기 위험 모듈

이 모듈은 투자 추천이 아니라 시장 상태 해석용 참고 도구입니다.

## 데이터 흐름

1. `scripts/fetch_yield_curve.py`가 FRED 또는 mock 데이터로 `public/data/yield_curve_raw.json`을 생성합니다.
2. `scripts/classify_yield_curve.py`가 raw 데이터를 월간 시계열로 정리하고 `public/data/yield_curve.json`을 생성합니다.
3. React 앱은 `yield_curve.json`만 fetch합니다.
4. API 키가 필요한 수집은 GitHub Actions 또는 로컬 Python 실행에서만 처리합니다.

## 지표

- FRED `T10Y3M`: 미국 10년 국채 금리와 3개월 국채 금리의 차이입니다. 경기침체 선행 신호의 메인 지표로 사용합니다.
- FRED `T10Y2Y`: 미국 10년 국채 금리와 2년 국채 금리의 차이입니다. 시장 심리와 정책 기대 보조 지표로 사용합니다.
- 한국 10Y-3Y: 한국 장단기 국채 금리차입니다. MVP에서는 adapter TODO와 null placeholder만 둡니다.
- 한국 3Y-91D 또는 3Y-CD91: 한국 단기자금시장과 국채 금리의 보조 금리차입니다. MVP에서는 adapter TODO와 null placeholder만 둡니다.

## 판정 로직

미국 10Y-3M spread를 기준으로 현재 상태를 판정합니다.

- `spread > 1.0`: `normal`.
- `0.5 < spread <= 1.0`: `flattening`.
- `0 < spread <= 0.5`: `near_inversion`.
- `spread <= 0`: `inverted`.
- `spread <= -0.5`이고 trailing inversion이 3개월 이상이면 `deep_inversion`.

최근 12개월 안에 spread가 음수였다가 현재 양수로 전환되면 `normal_after_inversion` 또는 `re_steepening`으로 표시합니다.

## 위험 레벨

- `normal`: 낮음.
- `flattening`: 관찰.
- `near_inversion`: 주의.
- `inverted`: 높음.
- `deep_inversion`: 심각.
- `normal_after_inversion`, `re_steepening`: 관찰.

## 코스톨라니 달걀 보정

장단기금리차 모듈은 기존 A-F 판정을 강제로 바꾸지 않습니다.

- `normal`: D/E 보조 신호.
- `flattening`: F/A 보조 신호.
- `near_inversion`, `inverted`: A/B 보조 신호.
- `deep_inversion`: B/C 보조 신호.
- `normal_after_inversion`, `re_steepening`: C/D 전환 보조 신호.

## 한계와 TODO

- FRED API 키가 없으면 mock 데이터로 UI와 판정 구조만 확인합니다.
- 한국 금리차는 ECOS 또는 수동 adapter 연결 전까지 “한국 금리차 데이터 연결 전”으로 표시합니다.
- ICE BofA High Yield OAS 같은 ICE 계열 데이터는 공개 재배포 제한 가능성이 있어 MVP public JSON에는 포함하지 않습니다.
- 신용스트레스 지표는 재배포 가능한 대체 지표를 확인한 뒤 별도 단계에서 추가합니다.
