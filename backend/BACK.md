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

## 구현 기준
현재 백엔드는 Express 5 기반 JavaScript ES 모듈입니다. 진입점은 `backend/server.js`이며, 런타임 설정은 `PORT`, `CORS_ORIGIN` 같은 환경 변수를 사용합니다. API 변경 후에는 `GET /api/health`와 변경된 엔드포인트를 직접 호출해 응답 상태와 JSON 구조를 확인합니다.
