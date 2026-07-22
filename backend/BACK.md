# 백엔드 에이전트 가이드

## 우선 참고 순서
백엔드 API, 데이터 구조, 인증/온보딩 상태, 배포 연동을 수정할 때는 아래 순서로 문서를 확인합니다.

1. 루트 `AGENTS.md`
2. `backend/BACK.md`
3. `kopilot-design/PRD.md`
4. API가 특정 화면을 지원하면 관련 `kopilot-design/docs/features/*.md`
5. 인프라나 배포 변경이 포함되면 루트 `INFRA.md`

## 와이어프레임 연계 규칙
백엔드 작업도 화면 요구사항과 연결되면 `kopilot-design` 문서를 참고합니다. 예를 들어 첫 로그인 초기 설정 API는 `docs/features/first-login.md`의 온보딩 상태, 마이데이터 연동 여부, 카테고리 선택, 예산 설정 흐름을 기준으로 설계합니다. 대시보드 API는 `docs/features/dashboard.md`의 소비 요약, 카테고리별 소비, 최근 결제 내역에 필요한 필드를 기준으로 응답을 구성합니다.

프론트엔드가 와이어프레임에 맞춰 표시해야 하는 문구나 상태가 있다면 API 응답 필드 이름과 값이 그 요구사항을 명확히 지원해야 합니다. 실제 외부 API가 없는 범위는 mock 데이터와 명시적인 상태값으로 처리합니다.

## API 경로 관리
새 API를 만들거나 기존 API 계약을 바꾸면 이 문서에 경로, 메서드, 목적, 주요 요청/응답 필드를 기록하고, 이후 API 작업 전 반드시 참고합니다. 특정 화면을 지원하는 API는 `frontend/FRONT.md`의 페이지 경로와 `kopilot-design`의 화면 요구사항이 서로 맞는지 함께 확인하세요.

현재 API 경로:

- `GET /api/health`: 서버 상태, 호스트, 요청 IP, 전달 헤더 정보를 확인합니다.
- `GET /api/hello`: 기본 백엔드 연결 확인용 메시지를 반환합니다.
- `POST /api/auth/signup`: 이름, 이메일, 비밀번호로 사용자를 생성하고 access token, refresh token, 사용자 정보를 반환합니다.
- `POST /api/auth/login`: 이메일, 비밀번호를 검증하고 access token, refresh token, 사용자 정보를 반환합니다.
- `POST /api/auth/refresh`: Redis에 저장된 refresh token을 검증 및 회전하고 새 토큰 쌍을 반환합니다.
- `POST /api/auth/logout`: 전달된 refresh token을 Redis에서 폐기합니다.
- `GET /api/auth/me`: `Authorization: Bearer <accessToken>`으로 현재 사용자 정보를 반환합니다.

## 인증 및 DB 스키마 관리

액세스 토큰은 `JWT_SECRET` 기반 HS256 서명 토큰이며 기본 만료 시간은 15분입니다. 리프레시 토큰은 Redis에 `refresh:{tokenId}` 키로 SHA-256 해시만 저장하며 기본 TTL은 14일입니다. 여러 WAS 인스턴스는 동일한 `JWT_SECRET`, MySQL, Redis를 공유해야 합니다.

ORM은 Sequelize를 사용합니다. 서버 시작 시 기본값으로 `sequelize.sync({ alter: true })`를 실행해 `docs/Kopilot.png` 기준 테이블을 최신 모델에 맞춥니다. 환경변수 `DB_SYNC_SCHEMA=false`로 동기화를 끌 수 있고, `DB_SYNC_ALTER=false`로 alter 없이 존재하지 않는 테이블 생성만 수행할 수 있습니다.

## 구현 기준
현재 백엔드는 Express 5 기반 JavaScript ES 모듈입니다. 진입점은 `backend/server.js`이며, 런타임 설정은 `PORT`, `CORS_ORIGIN` 같은 환경 변수를 사용합니다. API 변경 후에는 `GET /api/health`와 변경된 엔드포인트를 직접 호출해 응답 상태와 JSON 구조를 확인합니다.
