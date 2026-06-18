# Context Notes

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
