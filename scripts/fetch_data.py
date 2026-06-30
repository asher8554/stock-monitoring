# 실제 외부 지표 수집 인터페이스를 정의한다.
from __future__ import annotations


def fetch_source_data() -> list[dict]:
    """Return annual indicator rows.

    TODO: GitHub Actions secrets로 전달된 ECOS/KOSIS/FRED/KRX API 키를 사용해
    실제 지표를 수집한다. 프론트엔드 번들에는 API 키를 넣지 않는다.
    """
    raise NotImplementedError("실제 API 연동은 다음 단계에서 구현합니다.")
