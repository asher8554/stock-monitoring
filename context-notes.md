# Context Notes

## 2026-06-30 30년 데이터와 하루 2회 갱신

- 사용자는 분석 데이터가 30년치로 보이고, 매일 오전 10시와 오후 8시에 최신 데이터로 갱신되길 원했다.
- 한국시간 오전 10시는 GitHub Actions cron 기준 01:00 UTC, 오후 8시는 11:00 UTC다.
- 기존 monthly schedule은 하루 2회 schedule로 바꾼다.
- annual cycle mock data는 최신 연도 포함 30개 연도, yield curve mock/FRED 시작 시점은 최신 연도 포함 30년 구간으로 맞춘다.
- 재생성 후 `annual_cycle.json`은 1997년부터 2026년까지 30개 연도다.
- 재생성 후 `yield_curve.json`은 1997-01부터 2026-06까지 354개 월간 행이다.
- `npm test`는 13개 파일 40개 테스트 통과, `npm run build`는 성공했다.
- commit `1da2c2a`를 push했고 Pages run `28443025689`가 성공했다.
- 라이브 JSON도 annual 30개, yield 354개 월간 행으로 확인했다.

## 2026-06-30 장단기금리차 경기 위험 모듈

- 사용자는 기존 한국 투자 사이클 대시보드에 “장단기금리차 기반 경기침체 위험 / 코스톨라니 달걀 보정 모듈”을 추가하길 원했다.
- 기존 `annual_cycle.json`, `current_cycle.json`, A-F 판정 로직은 유지하고, 장단기금리차는 `yield_curve.json` 별도 산출물과 별도 화면 섹션으로 분리한다.
- 미국 FRED `T10Y3M`, `T10Y2Y`는 Python 수집 스크립트에서만 사용한다. 프론트엔드는 API 키 없이 생성된 JSON만 읽는다.
- ICE 계열 신용스프레드 원시 데이터는 공개 재배포 제한 가능성이 있어 이번 MVP에서 제외하고 문서 TODO로 남긴다.
- 한국 금리차는 MVP에서 null-safe placeholder와 adapter TODO만 둔다.
- 보정 신호는 기존 primaryPhase를 덮어쓰지 않고 `cycleBias`와 설명 문구로만 표시한다.
- mock 기준 `yield_curve.json` 최신값은 2026-06, 미국 10Y-3M 0.51%p, 상태 `normal_after_inversion`, 위험 `watch`, 보정 위치 C/D다.
- `npm run yield:data`는 raw 30행과 classified JSON을 생성했다.
- `npm test`는 13개 파일 39개 테스트 통과, `npm run build`는 성공, `npm run cycle:data`는 기존 27개 annual row 생성을 유지했다.
- 인앱 브라우저 QA에서 `http://127.0.0.1:5173/`의 새 섹션, 한국 금리차 연결 전 placeholder, 콘솔 error/warn 0개, 다크모드 토글 후 섹션 유지, 모바일 390px overflow 없음으로 확인했다.

## 2026-06-30 예전 포트폴리오 진입 버튼

- 새 사이클 대시보드는 기본 화면으로 유지한다.
- `?view=portfolio`에서 기존 `public/portfolio.enc.json`을 fetch하고 기존 `decryptPayload`, `buildDashboardModel`을 재사용한다.
- 레거시 화면은 보기 전용 요약과 종목별 통합표만 둔다. 기존 리밸런싱 UI 전체 복원은 하지 않았다.

## 2026-06-30 다크모드

- 기존 `resolveInitialTheme`, `nextTheme` helper를 재사용했다.
- `stock-monitoring-cycle-theme` localStorage 값으로 라이트/다크 선택을 저장한다.
- 컴포넌트별 Tailwind class를 대량 수정하지 않고 `[data-theme="dark"]` CSS override로 배경, 테두리, 글자색을 바꾼다.

## 2026-06-30 지표 차트 색 블록

- `IndicatorLineChart` 아래에 `annual_cycle.json`의 연도별 `primaryPhase`를 그대로 색상 블록으로 표시한다.
- 선택 연도는 같은 블록 strip에서 검은 outline으로 표시한다.
- 달걀 위치 설명은 `phasePositionText`에서 과도기면 `C와 B 사이`, 단독 구간이면 `C 구간`처럼 만든다.

## 2026-06-30 한국 투자 사이클 대시보드 구현 기록

- 프론트엔드는 API를 직접 호출하지 않고 `public/data/annual_cycle.json`과 `public/data/current_cycle.json`만 읽도록 구성했다.
- `scripts/classify_cycle.py`는 기준금리, 물가, 유동성, 주식, 부동산, 성장률, 환율 feature를 0-1로 정규화하고 A-F phase score를 설명 가능한 가중합으로 계산한다.
- 1위와 2위 score 차이가 0.08 미만이면 `A/B 과도기` 형식으로 표시한다.
- `scripts/fetch_data.py`는 실제 API 연동용 인터페이스와 TODO만 둔다. API 키는 GitHub Actions secrets에서 Python 스크립트로만 읽어야 한다.
- `.github/workflows/update-data.yml`은 매월 1일과 수동 실행에서 mock JSON 생성, 변경 commit, 테스트, 빌드, Pages 배포를 수행한다.
- Edge headless QA에서 데스크톱과 모바일 모두 가로 overflow 없음, SVG 차트, Recharts 차트, 27개 연도 버튼, 2024년 선택 동작을 확인했다.

## 2026-06-10

- 로컬 폴더 `E:\Github\stock-monitoring`은 비어 있었고 `.git`이 없었다.
- GitHub 원격 `https://github.com/asher8554/stock-monitoring.git`은 접근 가능하지만 HEAD가 없었다.
- 이 폴더를 `main` 브랜치 git repo로 초기화하고 `origin`을 연결했다.
- GitHub Pages는 표시 전용으로 사용한다.
- 계좌 데이터 수집, 정규화, 암호화는 로컬 Node.js CLI가 담당한다.
- GitHub에는 평문 계좌 데이터, API 키, 원본 CSV/XLSX, `targets.local.json`을 올리지 않는다.
- 대시보드는 `portfolio.enc.json`을 내려받고 사용자가 입력한 비밀번호로 브라우저에서 복호화한다.
- 비밀번호는 저장하지 않는다. 잊으면 복구하지 못하는 설계다.
- 한국투자증권과 토스증권은 공식 API 어댑터를 목표로 한다.
- 미래에셋은 공식 AnyLink 신규 신청이 중단되어 MVP에서는 CSV/XLSX 어댑터로 시작한다.
- 기준 통화는 KRW다. 해외 자산은 증권사 데이터가 제공하는 원화 환산금액을 사용한다.
- 원화 환산금액이 없는 해외 자산은 경고 표시하고 총액/비중 계산에서 제외한다.
- 계좌 식별은 사용자 별칭만 사용한다. 실제 계좌번호는 저장하지 않는다.
- MVP는 현재 잔고, 평가손익, 실현손익 요약, 목표 비중, 리밸런싱 필요 여부만 포함한다.
- 투자 지식, 외부 지표, 뉴스, 공시, 리포트 분석은 MVP에서 제외한다.
- 수익률은 평가손익률과 실현손익 포함 총손익률을 모두 보여준다.
- 실현손익 요약 기간은 YTD와 전체 누적을 지원한다.
- 종목 통합 키는 `market + symbol`이다. 예시는 `KRX:005930`, `NASDAQ:NVDA`다.
- 리밸런싱은 사용자가 로컬에서 입력한 종목별 목표 비중과 현재 비중 차이로 판단한다.
- 로컬 실행은 수동이 기본이다. 나중에 Windows 작업 스케줄러를 enable/disable할 수 있게 CLI 명령을 둔다.
- `publish-data`는 암호화 파일 생성까지만 한다. git commit/push는 수동이다.

## 2026-06-10 구현 진행

- Superpowers의 TDD 흐름으로 암호화, 포트폴리오 집계, 리밸런싱, 스케줄러 명령, payload 병합, 미래에셋 파서 테스트를 먼저 작성했다.
- `xlsx`와 `exceljs`는 audit 문제가 남아 `read-excel-file`로 대체했다.
- 현재 `npm audit --json` 결과 취약점은 0개다.
- `public/portfolio.enc.json`은 더미 데이터용 암호문이다. 데모 비밀번호는 `demo-password`다.
- React 대시보드는 비밀번호 입력 전에는 데이터를 표시하지 않는다.
- 복호화 성공 후 모바일에서 입력 포커스 스크롤이 남는 문제가 있어 성공 시 `window.scrollTo(0, 0)`로 보정했다.
- Recharts 초기 측정 경고는 `ResponsiveContainer`의 `initialDimension`으로 해결했다.
- Browser 플러그인으로 데스크톱과 모바일 잠금 해제, 대시보드 표시, 잠금 복귀를 확인했다.
- GitHub Pages workflow는 공식 GitHub Pages custom workflow 문서 기준으로 `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`를 사용한다.
- 한국투자증권과 토스증권 실 API 어댑터는 아직 구현하지 않았다. 실제 키, 계좌 종류, 응답 샘플 확인 후 별도 작업으로 진행해야 한다.

## 2026-06-11

- 다크모드 토글을 추가했다. 초기값은 `localStorage` 저장값을 우선하고, 저장값이 없으면 시스템 `prefers-color-scheme`을 따른다.
- 테마는 `document.documentElement.dataset.theme`과 `color-scheme`에 반영한다.
- 한국투자증권과 토스증권 API 키는 `.env.local`로만 전달한다.
- `.env.local` parser와 credentials validator를 추가했다.
- 한국투자증권은 `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_ACCOUNT_NO`, `KIS_ACCOUNT_PRODUCT_CODE`, `KIS_ACCOUNT_ALIAS`를 로컬에서 읽는다.
- 토스증권은 `TOSS_APP_KEY`, `TOSS_APP_SECRET`, `TOSS_ACCOUNT_ALIAS`를 로컬에서 읽는다.
- GitHub Pages와 암호화 payload에는 API 키와 실제 계좌번호를 넣지 않는다.

## 2026-06-11 한국투자 API 연결

- 사용자가 토스증권 API를 아직 받지 못했으므로 이번 작업은 한국투자증권 실제 수집만 진행한다.
- KIS 공식 샘플 기준 OAuth endpoint는 `/oauth2/tokenP`, 국내주식 잔고 endpoint는 `/uapi/domestic-stock/v1/trading/inquire-balance`, 해외주식 잔고 endpoint는 `/uapi/overseas-stock/v1/trading/inquire-balance`다.
- 국내주식 잔고 TR ID는 실전 `TTTC8434R`, 모의 `VTTC8434R`다.
- 해외주식 잔고 TR ID는 실전 `TTTS3012R`, 모의 `VTTS3012R`다.
- `.env.local`에는 KIS 키만 실제 값으로 두고, 토스 키가 비어 있으면 collect가 토스 없이 진행해야 한다.
- 실제 `npm run collect` 실행 결과 KIS 토큰 발급 후 국내 잔고 조회에서 `APBK1271: 해당계좌 정보가 없습니다.(Not Found)`가 반환됐다.
- 계좌번호 길이는 앞 8자리와 상품코드 2자리 형식으로 보였으므로, KIS Developers 계좌 연결, 실전/모의 환경, 계좌상품코드가 다음 확인 대상이다.

## 2026-06-11 리밸런싱 설정 UI

- 기존 리밸런싱은 `targets.local.json`을 암호화 payload에 병합한 정적 목표비중만 사용한다.
- 이번 변경은 GitHub Pages 대시보드에서 목표비중과 허용오차를 직접 조정하는 UI를 추가한다.
- 설정값은 브라우저 `localStorage`에만 저장한다. GitHub Pages와 암호화 payload에는 사용자가 UI에서 바꾼 평문 설정을 자동 업로드하지 않는다.
- payload에 들어 있는 목표비중은 초기 기본값으로 쓰고, localStorage 값이 있으면 localStorage 값을 우선한다.
- payload 목표비중이 없는 보유 종목은 현재 비중을 초기 목표비중으로 사용하고 허용오차는 5%로 둔다.
- Browser QA에서 데모 암호문으로 잠금 해제 후 삼성전자 목표비중을 10%로 수정했고, 리밸런싱 표가 `목표 10%`, `차이 34.48%`, `축소검토`로 즉시 갱신되는 것을 확인했다.
- 새로고침 후 다시 잠금 해제해도 삼성전자 목표비중 10%가 유지되는 것을 확인했다.

## 2026-06-11 실현손익 자동 수집

- KIS 공식 샘플에서 국내 기간별손익일별합산조회 endpoint는 `/uapi/domestic-stock/v1/trading/inquire-period-profit`, TR ID는 `TTTC8708R`다.
- KIS 공식 샘플에서 해외주식 기간손익 endpoint는 `/uapi/overseas-stock/v1/trading/inquire-period-profit`, TR ID는 `TTTS3039R`다.
- YTD 실현손익은 올해 1월 1일부터 collect 실행일 기준으로 조회한다.
- 누적 실현손익은 `.env.local`의 `KIS_LIFETIME_START_DATE`부터 collect 실행일 기준으로 조회한다. 값이 없으면 `20000101`을 기본 시작일로 사용한다.
- 실현손익률은 API 요약의 총실현손익을 총매수거래금액으로 나눈 값으로 계산한다. 매수거래금액이 없으면 0으로 둔다.
- 실제 KIS 기간별손익 조회는 `APBK1633: 조회기간은 10년 이내이어야 합니다.`를 반환하므로 `KIS_LIFETIME_START_DATE`가 더 오래되어도 실행일 기준 10년 전 다음 날로 보정한다.
- 실제 수집 중 토큰 재발급 단계에서 `403 Forbidden`이 발생할 수 있어 KIS OAuth 접근 토큰을 `local/kis-token.local.json`에 캐시한다.
- 토큰 캐시는 GitHub에 올리지 않는 로컬 파일이며, 만료 1분 전부터는 새 토큰을 요청한다.

## 2026-06-18 매일 데이터 갱신 진단

- 사용자 증상은 사이트 자체는 정상 구동되지만 매일 데이터가 갱신되지 않는 것이다.
- 기존 설계상 GitHub Actions는 Pages 빌드/배포 담당이고, 실제 증권사 수집은 로컬 CLI와 Windows 작업 스케줄러가 담당한다.
- 진단은 로컬 스케줄 작업, `npm run collect`, `npm run publish-data`, git push, Pages 배포 순서로 끊긴 지점을 확인한다.
- `.github/workflows/pages.yml`에는 `schedule` 이벤트가 없고 push 또는 수동 실행만 있다.
- Windows `StockMonitoring` 작업은 등록되어 있지 않았고 `local/scheduler.local.json`도 없었다.
- 라이브 `https://asher8554.github.io/stock-monitoring/portfolio.enc.json`의 `createdAt`은 `2026-06-11T07:07:13.936Z`였다.
- 기존 scheduler 명령은 `npm run publish-data`만 실행해서 실제 API 수집과 git push를 하지 않았다.
- `.env.local`, 사용자 환경변수, 머신 환경변수에 `PORTFOLIO_PASSWORD`가 없어 비대화형 publish가 실패했다.
- `npm run collect`는 성공했고 `local/portfolio.local.json`의 `asOf`가 `2026-06-18T01:37:13.497Z`로 갱신됐다.
- `npm run daily-update`를 추가해 수집, 암호화, encrypted payload commit, push를 한 번에 수행하게 했다.
- `schedule:enable`은 이제 `npm run daily-update`를 등록한다.
- `npm test`와 `npm run build`는 통과했다.

## 2026-06-18 화면 자동 새로고침

- 현재 topbar refresh 버튼은 `loadEncryptedPortfolio`만 실행한다.
- 잠금 해제 뒤에는 비밀번호를 지우므로 새 암호문을 받아도 기존 payload를 다시 복호화하지 못한다.
- 화면에서 할 수 있는 갱신은 GitHub Pages의 `portfolio.enc.json`을 재조회하는 것이다.
- 실제 증권사 수집과 push는 로컬 `npm run daily-update` 또는 Windows 작업 스케줄러가 담당한다.
- UI 변경은 이 경계를 유지하면서 10분 자동 확인과 수동 확인 버튼을 추가한다.
- 잠금 해제 성공 후 비밀번호는 브라우저 메모리에만 유지하고, 잠금 시 삭제한다.
- 메모리의 비밀번호로 10분마다 새 encrypted payload를 다시 복호화한다.
- `fetch` URL에는 `?ts=` 값을 붙여 GitHub Pages 캐시를 우회한다.
- 대시보드 meta row는 데이터 확인 시각, 자동 확인 10분, 수동 `새 데이터 확인` 버튼을 보여준다.
- QA는 실제 비밀번호를 모르므로 임시 정적 서버와 demo payload로 대시보드 unlock, 수동 확인 버튼, desktop/mobile 레이아웃을 검증했다.
- `npm test`와 `npm run build`는 통과했다.

## 2026-06-18 데이터 확인 시각 표시 정리

- 사용자는 payload의 `asOf` 기준 시각보다 브라우저가 언제 새 데이터를 받아왔는지만 알면 된다고 했다.
- 화면에서 `기준 시각` 표시를 제거하고 `데이터 확인` 시각만 표시한다.

## 2026-06-18 매수금액 표시

- 사용자는 모바일에서 보는 금액과 Pages 금액이 다르다고 했다.
- 라이브 `portfolio.enc.json`의 `createdAt`은 `2026-06-11T07:07:13.936Z`라서 사이트는 아직 오래된 암호화 payload를 보고 있다.
- 금액 차이의 우선 원인은 새 broker 수집 결과가 `daily-update`로 암호화, commit, push되지 않은 상태일 가능성이 높다.
- 매수금액은 기존 데이터 모델의 `costBasisKrw`를 종목별로 합산한 값이다.
- 이번 UI 변경은 종목별 통합 표에 `매수금액` 열을 추가한다.
- `npm test`와 `npm run build`는 통과했다.
- 브라우저 QA에서 demo payload 기준 `매수금액`, `₩5,200,000`, `₩2,910,000` 표시를 확인했다.
- 모바일 viewport에서 종목별 통합 표가 860px 가로 스크롤 영역으로 표시되고 `매수금액` 열이 존재함을 확인했다.

## 2026-06-18 포트폴리오 비중 legend와 잔고 차이 정리

- 사용자는 포트폴리오 비중 chart가 무엇인지 한눈에 안 들어온다고 했다.
- 라이브 payload 생성시각은 `2026-06-11T07:07:13.936Z`로 오래된 암호문이다.
- 로컬 최신 `portfolio.local.json` 기준 계좌 잔고 합계는 종목 평가금액 합계와 현금 합계를 더한 값이다.
- 사용자가 핸드폰 앱의 잔고와 비교하는 값은 현금 포함 잔고일 가능성이 높으므로 UI에서 총 잔고와 종목 평가금액을 구분한다.
- 포트폴리오 비중 chart에는 현금을 포함하고, legend에 종목/현금 이름, 비중, 금액을 함께 표시한다.
- `npm test`와 `npm run build`는 통과했다.
- 데스크톱 QA에서 legend에 삼성전자, SK하이닉스, NVIDIA, 현금 비중과 금액이 표시됨을 확인했다.
- 모바일 QA에서 총 잔고, 종목 평가금액, 현금 KPI가 세로로 깨지지 않고 표시됨을 확인했다.

## 2026-06-18 홈 폴더 갱신 명령

- 사용자는 `C:\Users\asher`에서 `npm run daily-update`를 실행해 `package.json`을 찾지 못하는 오류를 겪었다.
- 기존 daily update 흐름은 유지하고, repo 밖에서 호출 가능한 `Update-StockMonitoring.ps1` wrapper를 추가하기로 했다.
- wrapper는 비밀번호를 저장하지 않고 `PORTFOLIO_PASSWORD`가 없을 때만 실행 중 입력받는다.
- PowerShell 프로필에는 `Update-StockMonitoring` 함수만 등록해 어느 위치에서나 wrapper를 호출하게 한다.
- `Update-StockMonitoring.ps1 -Help`와 프로필 함수 경유 `Update-StockMonitoring -Help`가 모두 통과했다.
- `npm test`는 10개 파일 27개 테스트 통과, `npm run build`도 통과했다.

## 2026-06-18 계좌 요약 제거와 프로젝트 마무리

- 사용자는 계좌별 요약을 제거하고 포트폴리오 비중 legend를 그 위치로 옮기길 원했다.
- 계좌 데이터는 총 잔고와 현금 계산에 필요하므로 payload, schema, model에서는 유지하고 화면 패널만 제거한다.
- 포트폴리오 비중 chart와 같은 `allocationItems` 순서를 사용해 legend 색상과 금액이 chart와 맞게 유지되도록 한다.
- 상단 checklist의 한국투자 API 어댑터 미체크는 오래된 상태다. 이후 2026-06-11 섹션에서 실제 구현과 검증이 완료되어 완료로 정리한다.
- 토스증권 API 어댑터와 미래에셋 실제 샘플 헤더 보강은 외부 API 접근 권한, 최신 문서, 실제 샘플 파일이 있어야 하므로 남은 외부 입력 항목으로 분리한다.
- 정적 grep에서 계좌별 요약 UI 문자열과 account panel/list/row class가 제거됐고, `비중 범례`와 `allocation-legend`가 남아 있음을 확인했다.
- `npm test`는 10개 파일 27개 테스트 통과, `npm run build`는 성공했다.
- Edge headless QA에서 desktop 1280x900과 mobile 390x900 모두 잠금 해제 후 `계좌별 요약` 0개, legend 항목 4개, heading 순서 `포트폴리오 비중`, `비중 범례`, `손익률`을 확인했다.

## 2026-06-22 토스증권 수집과 시각화

- 사용자는 토스 API 값을 입력했고 토스 관련 데이터도 화면에서 시각적으로 보이길 원했다.
- 공식 `https://developers.tossinvest.com/llms.txt`는 OpenAPI JSON을 source of truth로 지정한다.
- 필요한 최소 endpoint는 `POST /oauth2/token`, `GET /api/v1/accounts`, `GET /api/v1/holdings`, USD 보유분 환산용 `GET /api/v1/exchange-rate`다.
- 계좌와 보유 주식 조회에는 `Authorization: Bearer`와 `X-Tossinvest-Account` 헤더가 필요하다.
- 주문, 체결, 거래내역은 이번 요구보다 크므로 제외한다.
- 토스 USD 보유 주식은 공식 환율 조회를 한 번 호출해 KRW로 환산한다.
- 대시보드는 새 chart dependency 없이 CSS bar 기반 증권사 비중 패널만 추가한다.
- 실제 `npm run collect`는 토스 계좌 1개를 수집했다. 현재 응답의 토스 보유 종목은 0건이다.
- 데모 payload 기준 Edge headless QA에서 desktop 1280x900과 mobile 390x900 모두 `증권사 비중`, `토스증권`, `NVIDIA` 토스 보유 표시를 확인했다.
- `npm test`는 11개 파일 29개 테스트 통과, `npm run build`는 성공했다.
- 토스증권 API 어댑터는 구현 완료다. 남은 외부 입력 항목은 미래에셋 실제 샘플 파일 기반 헤더 매핑 보강이다.

## 2026-06-22 비밀번호 저장 동작 정리

- 사용자는 `PORTFOLIO_PASSWORD`를 앞으로 묻지 않기로 했던 것 같다고 지적했다.
- 기존 `Update-StockMonitoring.ps1`은 npm 실행 전에 현재 PowerShell 세션의 `$env:PORTFOLIO_PASSWORD`만 확인했다.
- 이 구조에서는 `.env.local`에 `PORTFOLIO_PASSWORD`가 있어도 wrapper가 먼저 물을 수 있다.
- `.env.local`에 저장된 비밀번호가 있으면 wrapper가 묻지 않게 하고, 필요하면 `Update-StockMonitoring -SavePassword`로 한 번 저장하는 흐름을 추가한다.
- 2026-06-22 안전 확인에서 Toss Open API는 계좌 1개, 보유 종목 0건을 반환했다. 그래서 종목별 통합에 토스 종목이 안 나오는 것은 현재 응답 기준 정상이다.
- 사용자가 `.env.local`에 `PORTFOLIO_PASSWORD`를 저장한 뒤 `Update-StockMonitoring.ps1 -NoWaitPages`를 실행했다.
- 실제 payload 갱신은 `92c5fa5 데이터 자동 갱신` commit으로 push됐다.
- 갱신 직후 로컬 포트폴리오는 토스 계좌 1개와 한국투자 보유 종목 4건을 포함했고, 토스 보유 종목은 계속 0건이다.

## 2026-06-30 데이터 갱신 실패 진단

- 사용자는 실제 보유 포트폴리오와 사이트 데이터가 다르며 데이터 갱신이 잘못된 것 같다고 했다.
- `public/portfolio.enc.json` 생성 시각은 `2026-06-22T14:17:07.901Z`로 2026-06-30 기준 stale 상태였다.
- `schtasks /Query /TN StockMonitoring`은 예약 작업이 없다고 반환했다.
- 수동 `Update-StockMonitoring` 실행은 Toss Open API `HTTP 403 IP address not allowed`에서 중단됐다.
- Toss는 선택 broker이고 현재 자녀계좌도 API에서 노출되지 않으므로, Toss 실패가 KIS/manual 데이터 배포를 막지 않게 처리한다.
- 수정 후 `Update-StockMonitoring.ps1 -NoWaitPages`는 Toss 403을 warning으로 넘기고 `public/portfolio.enc.json`을 `2026-06-30T08:10:36.566Z`로 갱신해 `29edb24 데이터 자동 갱신` commit을 push했다.
- 갱신된 로컬 포트폴리오는 한국투자 ISA 계좌 1개와 한국투자 국내 종목 2개만 포함한다.
- `StockMonitoring` Windows 예약 작업을 매일 16:10 실행으로 다시 등록했다. 다음 실행 시각은 2026-07-01 16:10이다.

## 2026-06-30 시작프로그램 EXE 자동 갱신

- 사용자는 GitHub 자체 갱신 대신 컴퓨터 시작 시 자동 갱신되는 EXE를 만들고 시작프로그램 등록을 원했다.
- EXE는 새 갱신 로직을 만들지 않고 기존 `Update-StockMonitoring.ps1 -NoWaitPages`를 호출한다.
- 인터넷 확인은 `https://github.com/` HEAD 요청으로 판단한다. GitHub push가 필요하므로 GitHub 접속 가능성을 기준으로 삼는다.
- 인터넷이 없거나 update process가 실패하면 30초 후 재시도하고, 최대 30회 재시도한다.
- 로그는 `local/startup-updater.log`에 남긴다.
- EXE는 `local/startup-updater/StockMonitoringStartupUpdater.exe`에 publish했다. 단일 파일 크기는 약 35MB다.
- 시작프로그램 바로가기는 `C:\Users\asher\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\StockMonitoringStartupUpdater.lnk`에 등록했다.
- self-test는 `local/startup-updater.log`에 `Self-test ok.`를 남기고 exit 0으로 통과했다.

## 2026-06-30 투자 사이클 이미지 배치

- 사용자는 첨부한 투자 사이클 이미지를 GitHub Pages에서 쉽게 확인할 수 있게 배치하길 원했다.
- 이미지는 `public/investment-cycle.png`로 복사했다.
- 이미지 패널은 잠금 화면과 잠금 해제 후 대시보드 모두에서 topbar 바로 아래에 보인다.
- `npm test`와 `npm run build`는 통과했다.
- Edge headless QA에서 `investment-cycle.png`가 1491x1055 자연 크기로 로드되고 화면에 표시됨을 확인했다.

## 2026-06-30 한국 투자 사이클 대시보드

- 사용자는 기존 포트폴리오 화면이 아니라 코스톨라니 달걀 기반 한국 시장 사이클 대시보드 웹앱을 요청했다.
- 이번 단계는 mock data 기반 UI와 scoring 구조를 완성하고, 실제 API는 Python interface와 TODO로 남긴다.
- 프론트엔드는 API 키 없이 `public/data/annual_cycle.json`과 `public/data/current_cycle.json`만 fetch한다.
- 기존 민감한 포트폴리오 수집 코드는 남기되, 화면의 기본 앱은 새 투자 사이클 대시보드로 교체한다.
