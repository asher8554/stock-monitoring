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
