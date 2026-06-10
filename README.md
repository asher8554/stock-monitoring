# Stock Monitoring

GitHub Pages에서 암호화된 포트폴리오 파일을 복호화해 수익률, 비중, 리밸런싱 상태를 보는 개인 대시보드다.

## 현재 구현

- Vite + React + TypeScript 단일 대시보드.
- `PBKDF2-SHA-256 + AES-GCM` 암호화와 브라우저 복호화.
- `portfolio.enc.json` 기반 비밀번호 잠금 화면.
- 라이트/다크 모드 토글과 로컬 테마 저장.
- 전체 평가금액, YTD 실현손익, 평가손익률, 현금 비중 KPI.
- 계좌별 요약, 종목별 통합, 리밸런싱 테이블.
- 한국투자증권 Open API 국내주식 잔고와 미국주식 잔고 수집.
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

작업 스케줄러는 로컬 PC에서만 의미가 있다.

## 아직 남은 것

- 토스증권 Open API 실제 계좌 조회 어댑터.
- 사용자가 제공할 미래에셋 실제 샘플 파일 기준 파서 매핑 보강.

API 키 전달 방식은 [docs/broker-api-credentials.md](docs/broker-api-credentials.md)에 정리했다.
