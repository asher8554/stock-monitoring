# Stock Monitoring

GitHub Pages에서 암호화된 포트폴리오 파일을 복호화해 수익률, 비중, 리밸런싱 상태를 보는 개인 대시보드다.

## 현재 구현

- Vite + React + TypeScript 단일 대시보드.
- `PBKDF2-SHA-256 + AES-GCM` 암호화와 브라우저 복호화.
- `portfolio.enc.json` 기반 비밀번호 잠금 화면.
- 라이트/다크 모드 토글과 로컬 테마 저장.
- 전체 평가금액, YTD 실현손익, 평가손익률, 현금 비중 KPI.
- 포트폴리오 비중 범례, 종목별 통합, 리밸런싱 테이블.
- 대시보드 내 목표비중과 허용오차 설정, 브라우저 로컬 저장.
- 한국투자증권 Open API 국내주식 잔고와 미국주식 잔고 수집.
- 토스증권 Open API 보유 주식 수집.
- 미래에셋 표준 CSV/XLSX 행 파서.
- Windows 작업 스케줄러 enable/disable 명령.
- GitHub Pages Actions 배포 workflow.

## 보안 원칙

GitHub에는 평문 투자 데이터를 올리지 않는다.

올려도 되는 파일은 암호화된 `public/portfolio.enc.json`이다.

로컬 평문 파일은 `local/` 아래에 둔다. 이 폴더는 `.gitignore`로 제외되어 있다.

## 로컬 실행

```powershell
npm install
npm run demo:data
npm run dev
```

데모 데이터 비밀번호는 `demo-password`다.

## 실제 데이터 생성

먼저 `.env.example`을 참고해 `.env.local`을 만든다.

```powershell
npm run collect
$env:PORTFOLIO_PASSWORD="강한 비밀번호"
npm run publish-data
Remove-Item Env:\PORTFOLIO_PASSWORD
```

`npm run publish-data`는 `public/portfolio.enc.json`만 만든다. git commit과 push는 직접 한다.

매일 사이트까지 갱신하려면 `.env.local`에 `PORTFOLIO_PASSWORD`를 추가한 뒤 다음 명령을 사용한다.

```powershell
npm run daily-update
```

`npm run daily-update`는 수집, 암호화, `public/portfolio.enc.json` 커밋, push를 순서대로 실행한다. 변경된 암호화 payload가 없으면 commit과 push를 건너뛴다.

홈 폴더처럼 프로젝트 밖에서 실행하려면 새 PowerShell 창에서 다음 명령만 입력한다.

```powershell
Update-StockMonitoring
```

현재 열려 있는 PowerShell 창에서 바로 쓰려면 한 번만 프로필을 다시 읽는다.

```powershell
. $PROFILE
Update-StockMonitoring
```

`Update-StockMonitoring`은 `E:\Github\stock-monitoring`으로 이동해 `npm run daily-update`를 실행하고, 비밀번호가 현재 세션에 없으면 실행 중에만 입력받는다. GitHub CLI `gh`가 있으면 push 뒤 Pages 배포도 기다린다.

## 화면 새로고침

잠금 해제 후 화면은 10분마다 GitHub Pages의 최신 `portfolio.enc.json`을 다시 확인한다.

`새 데이터 확인` 버튼을 누르면 즉시 같은 확인을 실행한다.

화면의 `데이터 확인` 시각은 브라우저가 암호화 파일을 새로 받아온 시각이다.

이 기능은 이미 배포된 암호화 파일을 다시 받는 것이다. 증권사 수집과 배포는 로컬 `npm run daily-update` 또는 작업 스케줄러가 먼저 실행해야 한다.

## 리밸런싱 설정

대시보드 잠금 해제 후 `리밸런싱 설정`에서 종목별 목표비중과 허용오차를 수정할 수 있다.

이 설정은 현재 브라우저의 `localStorage`에 저장된다. 암호화 payload나 GitHub에는 자동 반영되지 않는다.

초기화 버튼을 누르면 암호화 payload의 `targets.local.json` 값으로 돌아가고, payload 목표값이 없는 종목은 현재 비중을 기본 목표값으로 사용한다.

## 로컬 파일 위치

- `local/portfolio.local.json`.
- `local/targets.local.json`.
- `local/imports/miraeasset/`.
- `public/portfolio.enc.json`.

## 작업 스케줄러

```powershell
npm run schedule:enable -- --time 16:10
npm run schedule:disable
```

작업 스케줄러는 로컬 PC에서만 의미가 있다. 등록된 작업은 `npm run daily-update`를 실행하므로 `.env.local`에 `PORTFOLIO_PASSWORD`가 있어야 한다.

## 외부 입력 필요

- 미래에셋 실제 샘플 파일 기준 파서 매핑 보강은 사용자가 내려받은 실제 CSV/XLSX 샘플이 필요하다.

API 키 전달 방식은 [docs/broker-api-credentials.md](docs/broker-api-credentials.md)에 정리했다.

## KIS 실현손익 자동수집

`npm run collect`는 한국투자증권 국내 기간별손익일별합산조회 API로 YTD와 누적 실현손익을 자동 갱신한다.

YTD는 실행 연도의 1월 1일부터 실행일까지 조회한다. 누적은 `.env.local`의 `KIS_LIFETIME_START_DATE`부터 조회하되, KIS API 조회기간 제한 때문에 실행일 기준 10년 전 다음 날로 자동 보정한다.

KIS OAuth 접근 토큰은 `local/kis-token.local.json`에 저장해 재발급 403을 줄인다. `local/`은 Git에 커밋하지 않는다.
