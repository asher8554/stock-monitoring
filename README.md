# 한국 투자 사이클 대시보드

코스톨라니의 달걀 모델을 한국 시장 지표에 맞게 단순화해, 연도별 시장 위치를 A-F 사이클로 보여주는 GitHub Pages용 정적 웹앱입니다.

이 프로젝트는 투자 추천이 아니라 시장 상태 해석용 참고 도구입니다.

## 현재 구현 범위

- Vite + React + TypeScript 기반 정적 웹앱.
- Tailwind CSS 화면 구성.
- Recharts 지표 선 그래프.
- SVG 기반 코스톨라니 달걀 차트.
- Python mock data 생성과 rule-based scoring.
- `public/data/annual_cycle.json`과 `public/data/current_cycle.json`만 읽는 프론트엔드.
- `public/data/yield_curve.json` 기반 장단기금리차 경기 위험 보조 신호.
- 월 1회 자동 실행과 수동 실행을 지원하는 GitHub Actions 데이터 갱신 workflow.

## 데이터 출처

현재 단계는 mock data입니다.

실제 API 연동은 `scripts/fetch_data.py`에 인터페이스만 두고 TODO로 남겨두었습니다. 이후 다음 출처를 GitHub Actions에서 수집하도록 붙일 수 있습니다.

- 기준금리 평균: 한국은행 ECOS.
- 국고채 10년 금리 평균: 한국은행 ECOS 또는 공공 금리 데이터.
- CPI YoY: KOSIS 또는 한국은행 ECOS.
- M2 YoY: 한국은행 ECOS.
- KOSPI 연간 수익률: KRX 또는 공공 시세 데이터.
- 부동산 가격지수 YoY: 한국부동산원 또는 KOSIS.
- GDP 성장률: 한국은행 ECOS.
- 원/달러 환율 변화율: 한국은행 ECOS 또는 FRED.
- 미국 10Y-3M 장단기금리차: FRED `T10Y3M`.
- 미국 10Y-2Y 장단기금리차: FRED `T10Y2Y`.
- 한국 장단기금리차: 한국은행 ECOS 또는 수동 adapter. MVP에서는 연결 전 placeholder입니다.

프론트엔드에는 API 키를 넣지 않습니다. API 키가 필요한 수집은 GitHub Actions에서 Python으로 실행합니다.

ICE BofA High Yield OAS 같은 ICE 계열 신용스프레드 데이터는 공개 재배포 제한 가능성이 있어 현재 public JSON에는 저장하지 않습니다. 신용스트레스 지표는 재배포 가능한 대체 지표를 확인한 뒤 추가합니다.

## 지표 의미

- 기준금리 평균: 통화정책 긴축 또는 완화 수준을 나타냅니다.
- 국고채 10년 금리 평균: 장기 금리와 채권 가격 환경을 나타냅니다.
- CPI YoY: 물가 압력과 긴축 가능성을 나타냅니다.
- M2 YoY: 유동성 확장 또는 축소를 나타냅니다.
- KOSPI 연간 수익률: 주식시장 강도와 위험자산 심리를 나타냅니다.
- 부동산 가격지수 YoY: 부동산 경기 강도를 나타냅니다.
- GDP 성장률: 실물 경기의 둔화 또는 회복을 나타냅니다.
- 원/달러 환율 변화율: 대외 금융 여건과 원화 약세 부담을 나타냅니다.

## A-F 판정 로직

판정은 머신러닝이 아니라 설명 가능한 rule-based scoring입니다.

각 feature는 0-1 사이로 정규화합니다. 예를 들어 `rate_high`는 기준금리의 과거 백분위, `rate_low`는 `1 - rate_high`, `rate_rising`은 전년 대비 금리 상승 정도입니다.

각 phase는 feature 가중합으로 계산하고, phase score는 합계가 1이 되도록 정규화합니다. 1위와 2위 score 차이가 0.08 미만이면 `A/B 과도기`처럼 표시합니다.

- A: 금리 높음, 물가 높음, 금리 상승 또는 동결, 위험자산 부담.
- B: 금리 높음, 금리 하락 시작, 물가 둔화, 채권 매력.
- C: 금리 하락, 성장 둔화, 위험자산 약세, 부동산 저점 접근.
- D: 금리 낮음, 유동성 증가, 물가 안정, 경기 바닥.
- E: 주식 회복, 유동성 증가, 금리 안정, 경기 회복.
- F: 주식과 부동산 강세, 물가 상승, 금리 상승 압력.

핵심 구현은 `scripts/classify_cycle.py`에 있습니다.

## 장단기금리차 위험 모듈

장단기금리차 모듈은 기존 A-F 판정을 대체하지 않고 보조 신호로만 표시합니다.

- 미국 10Y-3M spread를 메인 경기침체 선행 신호로 사용합니다.
- 미국 10Y-2Y spread를 시장 심리와 정책 기대 보조 지표로 사용합니다.
- 한국 10Y-3Y, 한국 3Y-91D 또는 CD91 spread는 한국 시장 보정용으로 연결할 예정입니다.
- 최근 12개월 안에 역전됐다가 현재 플러스가 된 경우 재가팔라짐 또는 역전 해소 구간으로 표시합니다.

기본 임계값은 다음과 같습니다.

- `spread > 1.0`: 정상.
- `0.5 < spread <= 1.0`: 평탄화.
- `0 < spread <= 0.5`: 역전 근접.
- `spread <= 0`: 역전.
- `spread <= -0.5`이고 역전이 3개월 이상 지속되면 깊은 역전.

자세한 내용은 [docs/yield-curve.md](docs/yield-curve.md)에 정리했습니다.

## 로컬 실행

```powershell
npm install
npm run cycle:data
npm run yield:data
npm run dev
```

빌드와 테스트는 다음 명령으로 확인합니다.

```powershell
npm test
npm run build
npm run cycle:data
```

## GitHub Pages 배포

`main` 브랜치에 push하면 `.github/workflows/pages.yml`이 사이트를 빌드하고 GitHub Pages에 배포합니다.

데이터 갱신은 `.github/workflows/update-data.yml`이 담당합니다. 매월 1일 00:20 UTC에 실행되며, GitHub Actions 화면에서 `workflow_dispatch`로 수동 실행할 수 있습니다.

데이터 workflow는 다음 순서로 동작합니다.

- Python으로 JSON 생성.
- 장단기금리차 JSON은 FRED 키가 있으면 FRED에서 수집하고, 없으면 mock 데이터로 생성.
- `public/data/annual_cycle.json`, `public/data/current_cycle.json`, `public/data/yield_curve.json` 변경이 있으면 commit.
- 테스트 실행.
- 사이트 build.
- GitHub Pages 배포.

## API 키 설정 방법

현재 mock data 단계에서는 API 키가 필요 없습니다.

실제 API 연동 단계에서는 GitHub repository secrets에 키를 저장합니다. 예시 이름은 다음과 같습니다.

```text
ECOS_API_KEY
KOSIS_API_KEY
KRX_API_KEY
FRED_API_KEY
```

Python 수집 스크립트는 GitHub Actions 환경 변수에서 이 값을 읽고, 생성된 JSON만 `public/data`에 저장해야 합니다. React 앱은 API 키와 원천 API를 직접 호출하지 않습니다.
