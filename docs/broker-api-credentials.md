# 증권사 API 자격 증명 전달 방식

## 원칙

한국투자증권과 토스증권 API 키는 GitHub, GitHub Pages, 브라우저 코드, 암호화 payload에 넣지 않는다.

키는 로컬 PC의 `.env.local`에만 둔다. 로컬 Node.js CLI가 `.env.local`을 읽고 증권사 API를 호출한 뒤, 결과만 `portfolio.local.json`으로 정규화한다.

대시보드에는 API 키가 전달되지 않는다. GitHub Pages에는 암호화된 `public/portfolio.enc.json`만 올라간다.

## 파일 흐름

1. `.env.example`을 참고해 `.env.local`을 만든다.
2. 한국투자증권과 토스증권에서 발급받은 앱키와 시크릿키를 `.env.local`에 입력한다.
3. `npm run collect`가 `.env.local`을 읽고 로컬에서만 API를 호출한다.
4. `npm run publish-data`가 `portfolio.local.json`과 `targets.local.json`을 암호화한다.
5. `npm run daily-update` 또는 `Update-StockMonitoring`은 수집, 암호화, commit, push를 한 번에 실행한다.
6. GitHub에는 `public/portfolio.enc.json`만 커밋한다.

## `.env.local` 형식

```dotenv
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ACCOUNT_NO=
KIS_ACCOUNT_PRODUCT_CODE=
KIS_ACCOUNT_ALIAS=한국투자 ISA
KIS_ENVIRONMENT=real

TOSS_APP_KEY=
TOSS_APP_SECRET=
TOSS_ACCOUNT_ALIAS=토스 일반
```

## 한국투자증권

한국투자증권 Open API는 공식 포털에서 API 신청 후 계좌의 Appkey와 App secret으로 토큰을 발급받아 REST API를 호출하는 구조다.

로컬에는 다음 값이 필요하다.

- `KIS_APP_KEY`.
- `KIS_APP_SECRET`.
- `KIS_ACCOUNT_NO`.
- `KIS_ACCOUNT_PRODUCT_CODE`.
- `KIS_ACCOUNT_ALIAS`.
- `KIS_ENVIRONMENT`. 기본값은 `real`이고 모의투자는 `demo`다.

계좌번호는 API 호출에만 사용한다. 암호화 payload와 GitHub Pages 화면에는 계좌 별칭만 남긴다.

현재 구현된 한국투자증권 수집 범위는 국내주식 잔고와 미국주식 잔고다. 미국주식 잔고는 한국투자증권 실전 API의 `NASD` 거래소 코드로 조회한다.

### 한국투자증권 오류 확인

`KIS domestic balance failed: KIS API APBK1271: 해당계좌 정보가 없습니다.(Not Found)`가 나오면 인증 토큰은 발급됐지만 국내주식 잔고 조회에서 계좌를 찾지 못한 상태다.

먼저 다음을 확인한다.

- `KIS_ACCOUNT_NO`는 계좌번호 앞 8자리만 입력한다.
- `KIS_ACCOUNT_PRODUCT_CODE`는 계좌번호 뒤 2자리만 입력한다.
- 실전 API 키면 `KIS_ENVIRONMENT=real`, 모의 API 키면 `KIS_ENVIRONMENT=demo`로 둔다.
- KIS Developers에서 해당 계좌로 Open API 서비스 신청과 앱키 발급이 완료되어 있어야 한다.
- 앱키와 앱시크릿이 같은 계좌와 같은 환경에서 발급된 값이어야 한다.

## 토스증권

토스증권 Open API도 신청 후 앱키와 시크릿키를 발급받는 구조로 잡는다. 실제 어댑터 구현은 공식 API 접근 권한, 최신 문서, 실제 응답 샘플이 확보된 뒤 진행한다.

로컬에는 다음 값이 필요하다.

- `TOSS_APP_KEY`.
- `TOSS_APP_SECRET`.
- `TOSS_ACCOUNT_ALIAS`.

토스증권에서 계좌 식별값이 별도로 필요하면 `TOSS_ACCOUNT_ID`를 추가한다. 실제 어댑터 구현 시 공식 응답 샘플을 보고 확정한다.

토스증권 API 키가 아직 없으면 `TOSS_*` 값을 비워 둔다. 이 상태에서 `npm run collect`는 토스 수집을 건너뛴다.

## 전달 방법

채팅에 키를 붙여넣지 않는다.

사용자는 로컬에서 직접 `.env.local`을 작성한다. 내가 구현할 때는 `.env.local` 존재 여부와 누락 항목만 검사한다. 값 자체는 출력하지 않는다.

원격 배포나 GitHub Actions에는 키를 넣지 않는다. 수집은 로컬 PC에서만 실행한다.

## 참고 출처

- 한국투자증권 Open API 포털: https://apiportal.koreainvestment.com/.
- 토스증권 Open API 페이지: https://corp.tossinvest.com/ko/open-api.
- 토스증권 Open API 서비스 이용 약관: https://home.tossinvest.com/ko/terms/v2?id=752.

## 한국투자증권 실현손익 자동수집

`npm run collect`는 한국투자증권 국내 기간별손익일별합산조회 API를 두 번 호출한다.

- YTD 실현손익은 실행 연도 1월 1일부터 실행일까지 조회한다.
- 누적 실현손익은 `KIS_LIFETIME_START_DATE`부터 실행일까지 조회한다.
- KIS API는 기간별손익 조회기간을 10년 이내로 제한하므로 더 오래된 시작일은 실행일 기준 10년 전 다음 날로 자동 보정한다.
- 실현손익률은 API 요약의 총실현손익을 총매수거래금액으로 나눈 값이다.

`.env.local`에 선택적으로 설정할 수 있다.

```dotenv
KIS_LIFETIME_START_DATE=20000101
```

KIS OAuth 접근 토큰은 `local/kis-token.local.json`에 로컬 캐시한다. 캐시는 재발급 제한과 `403 Forbidden` 가능성을 줄이기 위한 것이며, `local/`은 `.gitignore`로 제외되어 GitHub에 올라가지 않는다.

공식 샘플 기준 구현이다.

- 국내 기간별손익일별합산조회 샘플: https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_period_profit/inquire_period_profit.py.
- 해외 기간손익 샘플: https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/overseas_stock/inquire_period_profit/inquire_period_profit.py.
