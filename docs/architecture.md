# Architecture

## 구성

이 프로젝트는 로컬 수집기와 정적 대시보드로 나눈다.

로컬 수집기는 Node.js CLI다. 증권사 데이터 수집, 파일 가져오기, 정규화, 목표 비중 병합, 암호화를 담당한다.

정적 대시보드는 Vite + React + TypeScript GitHub Pages 앱이다. 암호화된 데이터 로드, 비밀번호 기반 복호화, 시각화만 담당한다.

## 데이터 흐름

1. 사용자가 로컬에서 `Update-StockMonitoring` 또는 `npm run daily-update`를 실행한다.
2. 한국투자증권 데이터는 API 어댑터가 수집한다.
3. 미래에셋 데이터는 `local/imports/miraeasset/`의 CSV/XLSX 파일에서 읽는다.
4. 수집 결과는 `portfolio.local.json`으로 정규화된다.
5. 목표 비중은 `targets.local.json`에서 읽는다.
6. CLI가 `portfolio.local.json`과 `targets.local.json`을 합쳐 `portfolio.enc.json`을 만든다.
7. `daily-update`가 암호화 파일을 commit하고 push한다.
8. GitHub Pages 앱이 `portfolio.enc.json`을 내려받는다.
9. 사용자가 비밀번호를 입력하면 브라우저에서 복호화하고 대시보드를 표시한다.

수동 점검이 필요할 때는 `npm run collect`와 `npm run publish-data`를 따로 실행할 수 있다.

## 책임 경계

로컬 CLI는 민감한 작업을 담당한다.

- API 키 로드.
- 증권사 API 호출.
- CSV/XLSX 원본 읽기.
- 평문 정규화 파일 생성.
- 암호화 파일 생성.
- 암호화 파일 commit과 push.
- Windows 작업 스케줄러 등록과 해제.

GitHub Pages 앱은 민감한 입력을 보관하지 않는다.

- API 키를 알지 못한다.
- 증권사에 직접 접속하지 않는다.
- 평문 데이터를 저장하지 않는다.
- 비밀번호를 저장하지 않는다.

## 기술 선택

- 앱: Vite + React + TypeScript.
- 차트: Recharts.
- 로컬 CLI: Node.js.
- 암호화: `PBKDF2-SHA-256 + AES-GCM`.
- 배포: GitHub Pages.

## 증권사 어댑터

각 증권사는 독립 어댑터로 구현한다.

- 한국투자증권: 공식 Open API 기반.
- 토스증권: 공식 Open API 접근 권한과 응답 샘플 확보 후 구현.
- 미래에셋: CSV/XLSX 파일 기반.

어댑터 출력은 공통 스키마로 맞춘다. 대시보드는 증권사별 원본 차이를 알지 않아야 한다.

참고 출처.

- 한국투자증권 Open API: https://apiportal.koreainvestment.com/.
- 토스증권 Open API: https://corp.tossinvest.com/ko/open-api.
- 미래에셋 AnyLink: https://securities.miraeasset.com/imf/200/imf401.do.
- 미래에셋 AnyLink 페이지는 신규 신청 중단 안내가 있어 MVP에서 자동 API 연동 전제로 삼지 않는다.

## 스케줄러

기본 실행은 수동이다.

Windows 작업 스케줄러 지원은 로컬 CLI 명령으로 제공한다.

- `npm run schedule:enable`.
- `npm run schedule:disable`.
- 등록된 작업은 `npm run daily-update`를 실행한다.
- 설정값은 로컬 파일에 저장한다.
- GitHub Pages에는 스케줄러 설정을 올리지 않는다.
