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
5. GitHub에는 `public/portfolio.enc.json`만 커밋한다.

## `.env.local` 형식

```dotenv
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ACCOUNT_NO=
KIS_ACCOUNT_PRODUCT_CODE=
KIS_ACCOUNT_ALIAS=한국투자 ISA

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

계좌번호는 API 호출에만 사용한다. 암호화 payload와 GitHub Pages 화면에는 계좌 별칭만 남긴다.

## 토스증권

토스증권 Open API도 신청 후 앱키와 시크릿키를 발급받는 구조로 잡는다.

로컬에는 다음 값이 필요하다.

- `TOSS_APP_KEY`.
- `TOSS_APP_SECRET`.
- `TOSS_ACCOUNT_ALIAS`.

토스증권에서 계좌 식별값이 별도로 필요하면 `TOSS_ACCOUNT_ID`를 추가한다. 실제 어댑터 구현 시 공식 응답 샘플을 보고 확정한다.

## 전달 방법

채팅에 키를 붙여넣지 않는다.

사용자는 로컬에서 직접 `.env.local`을 작성한다. 내가 구현할 때는 `.env.local` 존재 여부와 누락 항목만 검사한다. 값 자체는 출력하지 않는다.

원격 배포나 GitHub Actions에는 키를 넣지 않는다. 수집은 로컬 PC에서만 실행한다.

## 참고 출처

- 한국투자증권 Open API 포털: https://apiportal.koreainvestment.com/.
- 토스증권 Open API 페이지: https://corp.tossinvest.com/ko/open-api.
- 토스증권 Open API 서비스 이용 약관: https://home.tossinvest.com/ko/terms/v2?id=752.
