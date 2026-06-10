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
