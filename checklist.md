# Checklist

## 2026-06-30 금리차 차트 tooltip과 위기 기준선

- [x] 금리차 추이 tooltip에 연도와 월이 보이도록 수정했다.
- [x] 리먼브라더스와 코로나19 위기 시점을 세로 점선으로 추가했다.
- [x] 테스트, 빌드, 브라우저 확인을 완료했다.
- [x] commit, push, Pages 배포를 확인했다.

## 2026-06-30 30년 데이터와 하루 2회 갱신

- [x] annual cycle 생성 범위를 최신 연도 포함 30개 연도로 조정했다.
- [x] yield curve 생성 범위를 30년 월간 데이터로 조정했다.
- [x] update-data workflow를 한국시간 오전 10시와 오후 8시 실행으로 바꿨다.
- [x] 30년 데이터 계약 테스트를 추가했다.
- [x] `npm run cycle:data`, `npm run yield:data`, `npm test`, `npm run build`를 실행했다.
- [x] commit, push, Pages 배포를 확인했다.

## 2026-06-30 장단기금리차 경기 위험 모듈

- [x] 작업 계획과 판단 기준을 `plan.md`, `context-notes.md`에 기록했다.
- [x] `scripts/fetch_yield_curve.py`와 `scripts/classify_yield_curve.py`를 추가했다.
- [x] `public/data/yield_curve.json`을 생성했다.
- [x] `src/lib/yield-curve.ts`와 YieldCurve UI 컴포넌트를 추가했다.
- [x] `src/App.tsx`에서 `yield_curve.json`을 별도로 fetch하고 fallback을 분리했다.
- [x] `package.json`, `.github/workflows/update-data.yml`, README를 갱신했다.
- [x] 장단기금리차 판정과 schema 테스트를 추가했다.
- [x] `npm run yield:data`, `npm test`, `npm run build`, `npm run cycle:data`를 실행했다.
- [x] 브라우저 렌더링과 모바일 레이아웃을 확인했다.
- [x] commit, push, Pages 배포 확인을 완료한다.

## 2026-06-30 예전 포트폴리오 진입 버튼

- [x] 우측 상단에 포트폴리오 버튼을 추가했다.
- [x] `?view=portfolio`에서 예전 암호화 포트폴리오를 열 수 있게 했다.
- [x] 테스트, 빌드, 브라우저 unlock 확인을 완료했다.

## 2026-06-30 다크모드

- [x] 기존 `theme.ts`를 재사용해 다크모드 토글을 추가했다.
- [x] 다크모드 색상 override와 저장 동작을 추가했다.
- [x] 테스트, 빌드, 브라우저 확인을 완료했다.

## 2026-06-30 지표 차트 색 블록

- [x] 지표 그래프에 연도별 phase 색상 블록을 추가했다.
- [x] 코스톨라니 달걀 카드에 현재 위치 문구를 추가했다.
- [x] 테스트, 빌드, 브라우저 확인을 완료했다.

## 2026-06-30 한국 투자 사이클 대시보드 완료 상태

- [x] Tailwind 설정을 추가했다.
- [x] Python mock data와 rule-based scoring을 만들었다.
- [x] React 대시보드 화면을 새 구조로 교체했다.
- [x] GitHub Actions data update workflow를 추가했다.
- [x] README를 새 프로젝트 설명으로 정리했다.
- [x] 테스트, 빌드, 브라우저 확인을 완료했다.
- [x] commit, push, Pages 배포를 완료한다.

## 문서 계약

- [x] MVP 범위를 계좌 통합, 수익률, 비중, 목표 비중, 리밸런싱으로 제한한다.
- [x] GitHub Pages에는 암호화된 데이터만 올리는 보안 전제를 문서화한다.
- [x] 로컬 수집기와 정적 대시보드의 책임 경계를 문서화한다.
- [x] 공통 포트폴리오 데이터 스키마를 정의한다.
- [x] 평문 로컬 파일과 비밀 정보가 git에 올라가지 않도록 `.gitignore`를 추가한다.

## 구현 예정

- [x] Vite + React + TypeScript 앱을 생성한다.
- [x] Node.js CLI 구조를 만든다.
- [x] `PBKDF2-SHA-256 + AES-GCM` 암호화와 브라우저 복호화를 구현한다.
- [x] `portfolio.enc.json` 로드와 비밀번호 입력 화면을 구현한다.
- [x] 단일 대시보드 화면을 구현한다.
- [x] 라이트/다크 모드 토글을 구현한다.
- [x] 한국투자증권과 토스증권 API 키 전달 방식을 문서화한다.
- [x] `.env.local` 자격 증명 parser를 구현한다.
- [x] 한국투자증권 API 어댑터를 구현한다.
- [x] 토스증권 API 어댑터를 구현한다.
- [x] 미래에셋 표준 CSV/XLSX 어댑터를 구현한다.
- [x] `targets.local.json` 기반 리밸런싱 계산을 구현한다.
- [x] Windows 작업 스케줄러 enable/disable 명령을 구현한다.
- [x] 샘플 미래에셋 파일 기반 파서 테스트를 추가한다.
- [x] 빌드와 테스트를 통과시킨다.
- [x] GitHub Pages Actions 배포 workflow를 추가한다.
- [ ] 실제 미래에셋 샘플 파일 기준으로 헤더 매핑을 보강한다. 사용자가 내려받은 실제 파일이 필요하다.

## 나중에 검토

- [ ] 투자 지식, 외부 지표, 종목 점수 기능을 별도 단계로 설계한다.
- [x] 자동 git commit/push 명령은 `npm run daily-update`와 `Update-StockMonitoring`으로 마무리했다.
- [ ] 인증 있는 호스팅으로 이전할 필요가 있는지 재검토한다.

## 2026-06-11 한국투자 API 연결

- [x] 한국투자 공식 잔고 API 응답을 공통 포트폴리오 포지션으로 변환하는 테스트를 추가한다.
- [x] 한국투자 OAuth 토큰 발급과 국내/해외 잔고 조회 어댑터를 구현한다.
- [x] `npm run collect`에서 한국투자 계좌가 설정된 경우 실제 잔고를 병합한다.
- [x] 토스 API 미설정 상태는 오류가 아니라 건너뛰도록 유지한다.
- [x] 테스트와 빌드를 통과시킨 뒤 commit/push한다.

## 2026-06-11 리밸런싱 설정 UI

- [x] 목표비중과 허용오차 설정 helper 테스트를 추가한다.
- [x] 대시보드에서 종목별 목표비중과 허용오차를 편집하도록 구현한다.
- [x] 설정값을 브라우저 `localStorage`에 저장하고 초기화할 수 있도록 구현한다.
- [x] 리밸런싱 테이블이 설정 변경 즉시 다시 계산되도록 구현한다.
- [x] 테스트, 빌드, 브라우저 QA 후 commit/push한다.

## 2026-06-11 실현손익 자동 수집

- [x] 한국투자 기간별손익일별합산조회 응답 매핑 테스트를 추가한다.
- [x] 한국투자 기간손익 API로 YTD와 누적 실현손익을 수집한다.
- [x] `npm run collect`가 `realizedProfit`을 자동 갱신하도록 병합한다.
- [x] 누적 시작일을 `.env.local`에서 설정할 수 있도록 문서화한다.
- [x] KIS OAuth 토큰을 `local/kis-token.local.json`에 캐시한다.
- [x] 실제 collect, 테스트, 빌드 후 commit/push한다.

## 2026-06-18 매일 데이터 갱신 진단

- [x] GitHub Actions workflow가 매일 수집을 담당하는지 확인한다.
- [x] Windows 작업 스케줄러 등록 상태와 마지막 실행 결과를 확인한다.
- [x] `public/portfolio.enc.json`과 원격 배포 데이터의 갱신 시각을 비교한다.
- [x] 필요한 경우 스케줄러 또는 publish 흐름을 최소 수정한다.
- [x] 테스트와 필요한 명령 검증을 실행한다.

## 2026-06-18 화면 자동 새로고침

- [x] 현재 refresh 버튼이 잠금 해제 후 payload를 다시 복호화하는지 확인한다.
- [x] 10분 자동 재조회 로직을 추가한다.
- [x] 수동 재조회 버튼과 상태 표시를 추가한다.
- [x] 테스트와 빌드를 실행한다.
- [x] 브라우저에서 잠금 해제와 수동 재조회를 확인한다.

## 2026-06-18 매수금액 표시

- [x] 라이브 payload와 앱 asset 상태를 확인한다.
- [x] 종목별 통합 표에 매수금액을 추가한다.
- [x] 포트폴리오 집계 테스트에서 매수금액 합산을 확인한다.
- [x] 테스트, 빌드, 브라우저 QA를 실행한다.

## 2026-06-18 포트폴리오 비중 legend와 잔고 차이 정리

- [x] 라이브 payload stale 여부와 로컬 종목/현금 합계를 확인한다.
- [x] 포트폴리오 비중 chart에 legend를 추가한다.
- [x] 포트폴리오 비중에 현금을 포함한다.
- [x] 총 잔고와 종목 평가금액을 구분해 표시한다.
- [x] 테스트, 빌드, 브라우저 QA를 실행한다.

## 2026-06-18 홈 폴더 갱신 명령

- [x] 프로젝트 밖에서 실행할 PowerShell wrapper를 추가한다.
- [x] PowerShell 프로필에 `Update-StockMonitoring` 함수를 등록한다.
- [x] README에 홈 폴더 실행 방법을 문서화한다.
- [x] wrapper 문법과 도움말을 검증한다.
- [x] 테스트를 실행한다.
- [x] commit과 push를 완료한다.

## 외부 입력 필요

- [ ] 미래에셋 실제 샘플 파일 기준 헤더 매핑 보강은 사용자가 내려받은 실제 CSV/XLSX 샘플이 필요하다.

## 2026-06-18 계좌 요약 제거와 프로젝트 마무리

- [x] 계좌별 요약 패널을 제거한다.
- [x] 포트폴리오 비중 legend를 계좌별 요약 위치로 옮긴다.
- [x] README와 계획 문서에서 제거된 화면과 현재 자동 push 흐름을 정리한다.
- [x] 남은 항목을 구현 완료와 외부 입력 필요 항목으로 분리한다.
- [x] 테스트, 빌드, 브라우저 스모크를 실행한다.
- [x] commit과 push를 완료한다.

## 2026-06-22 토스증권 수집과 시각화

- [x] 토스증권 공식 OpenAPI에서 필요한 endpoint와 필드를 확인한다.
- [x] 토스 계좌와 보유 주식 adapter를 구현한다.
- [x] collect 병합에서 토스 데이터를 반영한다.
- [x] 대시보드에 증권사별 비중 패널을 추가한다.
- [x] 테스트, 빌드, 브라우저 스모크를 실행한다.
- [x] commit과 push를 완료한다.

## 2026-06-22 비밀번호 저장 동작 정리

- [x] wrapper가 `.env.local`의 `PORTFOLIO_PASSWORD`를 먼저 확인하게 한다.
- [x] `Update-StockMonitoring -SavePassword` 저장 옵션을 추가한다.
- [x] README와 도움말을 갱신한다.
- [x] wrapper 문법과 테스트를 검증한다.
- [x] 실제 `Update-StockMonitoring` 흐름으로 암호화 payload를 갱신한다.
- [x] commit과 push를 완료한다.

## 2026-06-30 데이터 갱신 실패 진단

- [x] live payload 생성 시각과 예약 작업 상태를 확인한다.
- [x] Toss 403이 전체 daily update를 중단시키는 원인을 확인한다.
- [x] Toss 실패 시 KIS/manual 갱신은 계속 진행하게 한다.
- [x] Windows 예약 작업을 다시 등록한다.
- [x] 테스트, 실제 갱신, commit, push, Pages 배포를 확인한다.

## 2026-06-30 시작프로그램 EXE 자동 갱신

- [x] 기존 `Update-StockMonitoring.ps1`를 재사용하는 EXE source를 만든다.
- [x] 인터넷 연결 확인과 재시도 로직을 추가한다.
- [x] 단일 EXE를 `local/startup-updater`에 publish한다.
- [x] 시작프로그램 바로가기를 등록한다.
- [x] self-test, 테스트, commit, push를 완료한다.

## 2026-06-30 투자 사이클 이미지 배치

- [x] 첨부 이미지를 public asset으로 복사한다.
- [x] 잠금 전에도 보이는 상단 이미지 패널을 추가한다.
- [x] 테스트, 빌드, 브라우저 확인을 완료한다.
- [x] commit, push, Pages 배포를 완료한다.

## 2026-06-30 한국 투자 사이클 대시보드

- [ ] Tailwind 설정을 추가한다.
- [ ] Python mock data와 rule-based scoring을 만든다.
- [ ] React 대시보드 화면을 새 구조로 교체한다.
- [ ] GitHub Actions data update workflow를 추가한다.
- [ ] README를 새 프로젝트 설명으로 정리한다.
- [ ] 테스트, 빌드, 브라우저 확인을 완료한다.
- [ ] commit, push, Pages 배포를 완료한다.
