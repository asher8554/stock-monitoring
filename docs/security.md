# Security

## 기본 원칙

GitHub Pages에 올라간 파일은 공개될 수 있다고 가정한다.

대시보드 화면에 비밀번호 입력 UI를 두는 것만으로는 보호가 되지 않는다. 평문 `csv`, `xlsx`, `json` 파일을 Pages에 올리면 직접 URL 접근이나 개발자 도구로 확인될 수 있다.

따라서 GitHub에는 암호화된 `portfolio.enc.json`만 올린다.

참고 출처.

- GitHub Pages 접근 제어 안내: https://github.blog/changelog/2021-01-21-access-control-for-github-pages/.
- GitHub repository visibility 문서: https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility.

## 비밀 정보

다음 파일과 값은 git에 커밋하지 않는다.

- `.env.local`.
- `local/`.
- `portfolio.local.json`.
- `targets.local.json`.
- 증권사 API 키.
- 증권사 API secret.
- 원본 CSV/XLSX.
- 실제 계좌번호.
- 비밀번호.

계좌는 사용자 별칭만 저장한다. 예시는 `한국투자 ISA`, `토스 일반`, `미래에셋 연금`이다.

## 암호화 설계

암호화 파일은 `PBKDF2-SHA-256 + AES-GCM`으로 만든다.

`portfolio.enc.json`에는 다음 메타데이터를 저장한다.

- `version`.
- `kdf`.
- `iterations`.
- `salt`.
- `algorithm`.
- `iv`.
- `ciphertext`.
- `createdAt`.

비밀번호 자체는 저장하지 않는다.

비밀번호를 잊으면 복구할 수 없다. 로컬 평문 파일이 남아 있을 때만 새 비밀번호로 다시 암호화할 수 있다.

## 위협 모델

방어하는 것.

- GitHub repo나 Pages 파일을 보는 사람이 평문 투자 데이터를 읽는 상황.
- URL을 아는 사람이 대시보드 내용을 바로 보는 상황.
- 실수로 API 키나 로컬 평문 파일을 커밋하는 상황.

방어하지 않는 것.

- 사용자의 PC가 악성코드에 감염된 상황.
- 브라우저 확장 프로그램이 입력 비밀번호나 복호화 데이터를 훔치는 상황.
- 매우 약한 비밀번호에 대한 오프라인 대입 공격.
- 인증 서버 수준의 접근 제어.

## 운영 규칙

- 강한 비밀번호를 사용한다.
- `portfolio.enc.json` 생성 전후로 git diff를 확인한다.
- 평문 데이터는 `local/` 아래에 둔다.
- 원본 샘플을 커밋해야 할 때는 더미 데이터만 `samples/` 아래에 둔다.
- 실제 계좌번호는 저장하지 않는다.
