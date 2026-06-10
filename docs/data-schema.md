# Data Schema

## 포트폴리오 스냅샷

`portfolio.local.json`은 로컬 평문 정규화 파일이다. GitHub에 올리지 않는다.

`portfolio.enc.json`은 암호화된 배포 파일이다. GitHub Pages가 이 파일만 읽는다.

복호화된 payload는 다음 구조를 따른다.

```json
{
  "version": 1,
  "baseCurrency": "KRW",
  "asOf": "2026-06-10T15:30:00+09:00",
  "accounts": [],
  "positions": [],
  "realizedProfit": {
    "ytd": {},
    "lifetime": {}
  },
  "targets": [],
  "warnings": []
}
```

## Account

```json
{
  "id": "korea-investment-isa",
  "broker": "korea-investment",
  "alias": "한국투자 ISA",
  "currency": "KRW",
  "valuationKrw": 10000000,
  "cashKrw": 500000,
  "unrealizedProfitKrw": 1200000,
  "unrealizedProfitRate": 0.12
}
```

규칙.

- `id`는 로컬에서 만든 안정적인 별칭 기반 ID다.
- 실제 계좌번호는 저장하지 않는다.
- `valuationKrw`는 원화 환산 평가금액이다.

## Position

```json
{
  "id": "KRX:005930",
  "market": "KRX",
  "symbol": "005930",
  "name": "삼성전자",
  "broker": "korea-investment",
  "accountId": "korea-investment-isa",
  "quantity": 10,
  "currency": "KRW",
  "valuation": 750000,
  "valuationKrw": 750000,
  "costBasis": 700000,
  "costBasisKrw": 700000,
  "unrealizedProfit": 50000,
  "unrealizedProfitKrw": 50000,
  "unrealizedProfitRate": 0.0714,
  "krwValuationAvailable": true
}
```

규칙.

- 종목 통합 키는 `market + symbol`이다.
- `name`은 표시용이다.
- 전체 비중 계산은 `valuationKrw` 기준이다.
- `krwValuationAvailable`이 `false`면 총액과 비중 계산에서 제외한다.

## Realized Profit

```json
{
  "ytd": {
    "profitKrw": 300000,
    "profitRate": 0.03
  },
  "lifetime": {
    "profitKrw": 1200000,
    "profitRate": 0.12
  }
}
```

규칙.

- YTD는 대시보드 상단 KPI에서 우선 표시한다.
- 전체 누적은 보조 지표로 표시한다.
- 거래내역 전체는 MVP에 포함하지 않는다.

## Target

```json
{
  "id": "NASDAQ:NVDA",
  "market": "NASDAQ",
  "symbol": "NVDA",
  "targetWeight": 0.2,
  "rebalanceThreshold": 0.05
}
```

규칙.

- 목표 비중은 `targets.local.json`에서 관리한다.
- GitHub에는 평문 목표 비중을 올리지 않는다.
- 현재 비중과 목표 비중의 차이가 `rebalanceThreshold`를 넘으면 리밸런싱 필요로 표시한다.

## Warning

```json
{
  "code": "MISSING_KRW_VALUATION",
  "severity": "warning",
  "message": "NASDAQ:ABC는 원화 환산금액이 없어 총액과 비중 계산에서 제외되었습니다.",
  "positionId": "NASDAQ:ABC"
}
```

규칙.

- 원화 환산금액이 없는 해외 자산은 0원 처리하지 않는다.
- 사용자에게 경고하고 총액과 비중 계산에서 제외한다.
