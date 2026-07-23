# Kopilot 디자인 가이드

## 참고 화면

- 모바일 로그인 화면: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=2-2&m=dev
- 모바일 회원가입 화면: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=2-63&m=dev
- 모바일 대시보드 화면: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=8-30&m=dev
- 모바일 랭킹 페이지: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=81-2&m=dev
- 모바일 챌린지 페이지: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=81-3&m=dev
- 모바일 투자효과 페이지: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=81-4&m=dev
- 모바일 마이 페이지: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=81-5&m=dev
- 모바일 내 소비 상세 페이지: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=66-6&m=dev
- 모바일 AI 절약 챗봇: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=74-6&m=dev
- 모바일 첫 로그인 초기 설정 와이어프레임: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/Kopilot?node-id=149-2&m=dev
- 모바일 첫 로그인 마이데이터 연동 완료 화면: https://www.figma.com/design/097N3w8EmKyENAmjkQO3q4/KoPilot?node-id=268-36&m=dev

## 디자인 톤

- 전체 분위기는 토스처럼 간결하고 신뢰감 있게 유지한다.
- 넓은 여백, 밝은 배경, 명확한 정보 위계, 선명한 파란색 CTA를 우선한다.
- 장식 요소는 최소화하고, 금융 서비스답게 차분하고 실용적인 화면을 만든다.
- 사용자가 해야 할 다음 행동은 한 화면에서 즉시 이해되어야 한다.

## 색상 규칙

- 주요 CTA와 강조 색상은 `#3182F6`을 사용한다.
- 배경은 `#F7F9FC`, 카드와 입력 영역은 흰색 또는 매우 옅은 회색을 사용한다.
- 긍정적인 절약/수익 정보는 `#00A661` 계열로 표시한다.
- 보조 텍스트는 `#6B7684`, 플레이스홀더는 `#8B95A1`을 기준으로 한다.

## 레이아웃 규칙

- 웹 모바일 화면 기준 기본 아트보드는 `390 x 844`로 맞춘다.
- 스크롤이 필요한 화면은 너비 `390px`을 유지하고, 콘텐츠 길이에 맞춰 프레임 높이를 확장한다.
- 모바일에서는 데스크톱의 좌우 분할 구조를 사용하지 않고, 상단에는 제품 가치와 핵심 인사이트를, 하단에는 로그인/회원가입 같은 핵심 액션 폼을 단일 컬럼으로 배치한다.
- 대시보드는 상단 인사말, 기간 필터, 소비 요약, AI 절약 코치, 차트, 카테고리, 인사이트, 최근 결제 내역을 세로 카드 흐름으로 구성한다.
- 입력 폼 패널은 흰색 카드, 20~22px 라운드, 부드러운 그림자를 사용한다.
- 버튼과 입력 필드는 높이 58px, 라운드 14~16px을 기준으로 하고 모바일 좌우 여백은 24px을 우선한다.
- 모바일 화면에서는 한 줄 문구가 길어지면 2줄 이내로 줄바꿈하고, 버튼과 입력 필드의 텍스트가 영역을 넘지 않게 한다.
- 로그인, 회원가입, 내 소비 상세, AI 절약 챗봇 화면을 제외한 주요 앱 화면에는 하단 메뉴바와 우측 하단 플로팅 챗봇 버튼을 둔다.
- 하단 메뉴바는 `홈`, `랭킹`, `챌린지`, `투자효과`, `마이` 5개 탭으로 구성하고, 직관적인 이모티콘 아이콘을 함께 사용한다.
- 플로팅 챗봇 버튼은 원형으로 만들고 하단 메뉴바 위에 떠 있는 형태로 배치한다.

## 문구 규칙

- 문구는 짧고 행동 중심으로 작성한다.
- Kopilot의 핵심 가치인 소비 분석, AI 절약 코치, 절약 챌린지, 미래 자산 가치 시뮬레이션을 자연스럽게 드러낸다.
- 투자 관련 문구는 참고용 시뮬레이션임을 명확히 표현한다.
