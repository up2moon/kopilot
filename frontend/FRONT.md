# 프론트엔드 에이전트 가이드

## 우선 참고 순서
프론트엔드 화면이나 사용자 흐름을 수정할 때는 아래 순서로 문서를 확인합니다.

1. 루트 `AGENTS.md`
2. `frontend/FRONT.md`
3. `kopilot-design/DESIGN.md`
4. `kopilot-design/PRD.md`
5. 작업 대상 화면과 관련된 `kopilot-design/docs/features/*.md`

## 와이어프레임 활용 규칙
`kopilot-design/DESIGN.md`와 `kopilot-design/PRD.md`에는 Figma 와이어프레임 링크와 화면별 요구사항이 정리되어 있습니다. 로그인, 회원가입, 첫 로그인 초기 설정, 대시보드, 소비 상세, AI 챗봇, 랭킹, 챌린지, 투자효과, 마이 화면을 구현하거나 수정할 때는 해당 Figma 링크와 기능 문서를 먼저 확인하세요.

화면 구조, 주요 문구, CTA, 하단 탭, 플로팅 챗봇 버튼, 모바일 기준 너비(`390px`)는 와이어프레임을 우선합니다. 구현 중 디자인 문서와 기존 코드가 충돌하면 사용자에게 확인하거나, 변경 이유를 작업 결과에 명시하세요.

## 페이지 경로 관리
새 프론트엔드 페이지나 화면 전환 경로를 만들면 이 문서에 경로와 화면 목적을 기록하고, 이후 관련 작업 전 반드시 참고합니다. 경로는 PRD의 권장 라우팅과 맞추는 것을 우선하며, 임시 경로를 만들면 임시임을 명시하세요.

현재 페이지 경로:

- `/login`: 로그인 화면. `POST /api/auth/login`과 연동하며 성공 시 토큰을 저장하고 `/dashboard`로 이동합니다.
- `/signup`: 회원가입 화면. `POST /api/auth/signup`과 연동하며 성공 시 토큰을 저장하고 `/dashboard`로 이동합니다.
- `/dashboard`: 인증 성공 후 임시 진입 화면입니다. 첫 로그인 여부에 따른 `/first-login` 분기는 이후 마이데이터/소비 카테고리 연동 작업에서 구현합니다.

## 구현 기준
현재 프론트엔드는 React 19 + Vite 기반입니다. `frontend/src/` 안에서 컴포넌트와 스타일을 관리하고, 컴포넌트는 `PascalCase`, 훅과 헬퍼는 `camelCase`를 사용합니다. 화면 변경 후에는 `npm run lint`와 `npm run build`를 실행해 검증합니다.
