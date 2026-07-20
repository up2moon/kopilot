# 저장소 가이드라인

## 프로젝트 구조 및 모듈 구성
이 저장소는 두 개의 서비스로 구성됩니다. `frontend/`는 React 19 + Vite 앱이며, 소스는 `frontend/src/`, 정적 파일은 `frontend/public/`, 이미지는 `frontend/src/assets/`에 둡니다. `backend/`는 Express 5 API 서비스이며 진입점은 `backend/server.js`입니다. 루트의 `compose.yml`은 `web`, `was` 프로필을 사용하는 운영형 Docker 서비스를 정의하고, `compose.dev.yml`은 로컬 개발 환경에서 두 서비스를 함께 실행합니다. 배포 자동화는 `.github/workflows/deploy.yml`에 있습니다.

## 작업별 참고 문서
프론트엔드 작업 전에는 `frontend/FRONT.md`를 먼저 읽고, 화면 구현이나 UI 변경이 포함되면 `kopilot-design/DESIGN.md`, `kopilot-design/PRD.md`, 관련 `kopilot-design/docs/features/*.md` 문서를 함께 확인하세요. Figma 와이어프레임 링크는 디자인 문서에 정리되어 있으므로, 화면 구조와 문구는 해당 와이어프레임을 기준으로 맞춥니다. 백엔드 작업 전에는 `backend/BACK.md`를 먼저 읽고, API 응답이나 데이터 모델이 화면 요구사항과 연결되면 동일한 기획/와이어프레임 문서를 참고하세요.

## 빌드, 테스트, 개발 명령
별도 안내가 없으면 각 서비스 디렉터리에서 명령을 실행합니다.

- `cd frontend && npm run dev`: Vite 개발 서버를 시작합니다.
- `cd frontend && npm run build`: 프론트엔드를 `frontend/dist/`로 빌드합니다.
- `cd frontend && npm run lint`: Oxlint 검사를 실행합니다.
- `cd frontend && npm run preview`: 빌드된 프론트엔드를 로컬에서 확인합니다.
- `cd backend && npm run dev`: Node watch 모드로 API를 실행합니다.
- `cd backend && npm start`: API를 일반 실행 모드로 시작합니다.
- `docker compose -f compose.dev.yml up --build`: 로컬에서 프론트엔드와 백엔드를 함께 실행합니다.
- `docker compose --profile web --profile was up -d --build`: 운영형 서비스를 빌드하고 실행합니다.

## 코딩 스타일 및 이름 규칙
두 서비스 모두 JavaScript ES 모듈(`"type": "module"`)을 사용합니다. 프론트엔드는 JSX 함수 컴포넌트를 사용하며, 컴포넌트는 `PascalCase`, 훅과 헬퍼는 `camelCase`로 이름을 짓습니다. 스타일은 프론트엔드 소스와 가까운 CSS 파일에 두고 기존 CSS 변수를 재사용합니다. 현재 프론트엔드는 2칸 들여쓰기와 작은따옴표를, 백엔드는 2칸 들여쓰기와 큰따옴표 및 세미콜론을 사용합니다. 수정하는 파일의 기존 스타일을 따르세요.

## 테스트 가이드라인
현재 자동화된 테스트 프레임워크는 설정되어 있지 않습니다. UI 변경 후에는 `frontend/`에서 `npm run lint`와 `npm run build`를 실행하고, API 변경 후에는 `GET /api/health`, `GET /api/hello`를 직접 확인하세요. 테스트를 추가할 때는 대상 코드 근처에 두고 `App.test.jsx`, `server.test.js`처럼 명확한 이름을 사용합니다.

## 커밋 및 풀 리퀘스트 가이드라인
Git 기록은 `feat:`, `fix:`, `refactor:` 같은 Conventional Commit 접두사를 사용합니다. 제목은 짧고 명령형으로 작성하세요. 예: `fix: backend health response`. 풀 리퀘스트에는 변경 내용, 검증 절차, 관련 이슈를 적고, 화면 변경이 있으면 스크린샷이나 녹화를 포함합니다. Docker, Compose, GitHub Actions, 시크릿 등 배포나 환경 변경 사항도 명시하세요.

## 인프라 참고
인프라, 배포, 로드밸런서, 서버 구성과 관련된 작업이 필요하면 먼저 루트의 `INFRA.md`를 참고하세요. `compose.yml`, `.github/workflows/deploy.yml`, 운영 환경 변수, 배포 절차를 수정할 때는 `INFRA.md`의 설명과 충돌하지 않는지 확인합니다.

## 보안 및 설정 팁
시크릿이나 로컬 `.env` 파일은 커밋하지 않습니다. 백엔드 런타임 설정은 `PORT`, `CORS_ORIGIN` 같은 환경 변수를 사용합니다. 새 환경 변수를 추가하면 관련 README나 PR 설명에 문서화하세요.
