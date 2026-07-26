# 백엔드 에이전트 가이드

## 우선 참고 순서
백엔드 API, 데이터 구조, 인증/온보딩 상태, 배포 연동을 수정할 때는 아래 순서로 문서를 확인합니다.

1. 루트 `AGENTS.md`
2. `backend/BACK.md`
3. `kopilot-design/PRD.md`
4. API가 특정 화면을 지원하면 관련 `kopilot-design/docs/features/*.md`
5. 인프라나 배포 변경이 포함되면 루트 `INFRA.md`

## 와이어프레임 연계 규칙
백엔드 작업도 화면 요구사항과 연결되면 `kopilot-design` 문서를 참고합니다. 예를 들어 첫 로그인 초기 설정 API는 `docs/features/first-login.md`의 온보딩 상태, 마이데이터 연동 여부, 카테고리 선택, 예산 설정 흐름을 기준으로 설계합니다. 대시보드 API는 `docs/features/dashboard.md`의 소비 요약, 카테고리별 소비, 최근 결제 내역에 필요한 필드를 기준으로 응답을 구성합니다. 소비 상세 API는 `docs/features/spending-detail.md`의 총소비·결제건수·평균결제액 요약, 카테고리별 비율, 주차/일자별 그래프 집계 및 무한 스크롤 결제 내역 페이징을 기준으로 응답을 구성합니다. AI 절약 챗봇 API는 `docs/features/ai-saving-chatbot.md`의 오늘의 코칭, 연관 인사말, 코칭 기반 추천 질문 3개, RAG+ChatGPT 기반 답변, 소비/절약 범위 외 질문 Guardrail 제어, 점진적·현실적 조언 방침을 기준으로 응답을 구성합니다. 익명 랭킹 API는 `docs/features/anonymous-ranking.md`의 익명 닉네임 조합 생성, 내 랭킹 및 상위 랭킹 리스트, 1시간/5분 주기 캐시 갱신, 절약액 및 퀘스트 포인트 합산 랭킹 구조를 기준으로 응답을 구성합니다. 일일 챌린지 API는 `docs/features/daily-challenge.md`의 AI 맞춤 미션 1개 생성, 미션 타입별 자동/수동 검증 로직, 난이도 및 절약액 기반 차등 포인트 지급, 주간 미션 이력 관리를 기준으로 응답을 구성합니다. 투자효과 API는 `docs/features/investment-effect.md`의 기회비용 시뮬레이션, 코스콤 CHECK API 시세 연동, 사용자 선택 비교 종목 및 안전자산(예금) 믹스를 기준으로 응답을 구성합니다. 마이페이지 API는 `docs/features/mypage.md`의 마이데이터 재연동 및 해제, 알림 설정(UI), 로그아웃 및 Redis 토큰 폐기 처리를 기준으로 응답을 구성합니다. (※ 프론트엔드 프로필 내 절약 레벨/배지는 현재 표시에서 제외합니다.)

프론트엔드가 와이어프레임에 맞춰 표시해야 하는 문구가 있다면 API 응답 필드 이름과 값이 그 요구사항을 명확히 지원해야 합니다. 실제 외부 API가 없는 범위는 mock 데이터와 명시적인 상태값으로 처리합니다.

## API 경로 관리
새 API를 만들거나 기존 API 계약을 바꾸면 이 문서에 경로, 메서드, 목적, 주요 요청/응답 필드를 기록하고, 이후 API 작업 전 반드시 참고합니다. 특정 화면을 지원하는 API는 `frontend/FRONT.md`의 페이지 경로와 `kopilot-design`의 화면 요구사항이 서로 맞는지 함께 확인하세요.

현재 API 경로:

- `GET /api/health`: 서버 상태, 호스트, 요청 IP, 전달 헤더 정보를 확인합니다.
- `GET /api/hello`: 기본 백엔드 연결 확인용 메시지를 반환합니다.
- `POST /api/auth/signup`: 이름, 이메일, 비밀번호, 비밀번호 확인값으로 사용자를 생성하고 access token, refresh token, 사용자 정보를 반환합니다.
- `POST /api/auth/login`: 이메일, 비밀번호를 검증하고 access token, refresh token, 사용자 정보를 반환합니다.
- `POST /api/auth/refresh`: Redis에 저장된 refresh token을 검증 및 회전하고 새 토큰 쌍을 반환합니다.
- `POST /api/auth/logout`: 전달된 refresh token을 Redis에서 폐기합니다.
- `GET /api/auth/me`: `Authorization: Bearer <accessToken>`으로 현재 사용자 정보를 반환합니다.
- `GET /api/users/me/onboarding-status`: 현재 사용자의 첫 로그인 초기 설정, 마이데이터, 예산 설정 상태와 저장된 거래/예산 개수를 반환합니다.
- `POST /api/users/me/mydata/connect`: 실제 마이데이터 연동 대신 `OPEN_AI_KEY` 기반 OpenAI Responses API로 최근 1개월 합성 `transaction_history`를 생성하고 `myDataConnected=true`로 저장합니다. 키 누락이나 OpenAI 생성 실패 시 `502`를 반환하며 로컬 mock 데이터로 대체하지 않습니다.
- `POST /api/users/me/mydata/disconnect`: 현재 사용자의 마이데이터 연동을 해제하여 `myDataConnected=false`로 전환하고, 해당 사용자의 `transaction_history`를 모두 삭제합니다(재연동 시 `connect`로 재생성). 갱신된 사용자 정보와 `transactionCount: 0`을 반환합니다. 마이 페이지의 "마이데이터 연결 관리" 행이 이 API와 `connect`를 상태에 따라 토글 호출합니다.
- `GET /api/budget/categories`: 선택 가능한 소비 예산 카테고리 목록을 반환합니다.
- `POST /api/users/me/budgets`: 사용자의 카테고리별 월 예산 목표를 `user_expense_category.cost`에 저장하고 `firstLoginCompleted=true`, `budgetSetupCompleted=true` 상태로 전환합니다.
- `POST /api/users/me/onboarding/skip-goals`: 소비 목표 설정을 건너뛰고 `firstLoginCompleted=true`, `budgetSetupCompleted=false` 상태로 온보딩을 완료합니다.
- `GET /api/users/me/transactions`: OpenAI 기반 마이데이터 임시 생성으로 저장된 결제내역을 최신순으로 반환합니다.
- `GET /api/users/me/budgets/status?month=YYYY-MM`: 저장된 예산 목표, 현재 사용 금액, 남은 금액, 진행률을 반환합니다.
- `GET /api/users/me/spending/summary?month=YYYY-MM`: 지정된 월(기본 현재 월)의 거래 내역을 백엔드에서 집계하여 소비 요약(총 금액, 전월 대비 증감률, 결제 건수, 평균 결제액), 카테고리별 금액/비율/인사이트 문구, 주차별/일자별 소비 추이 및 최고 지출 금액을 반환합니다.
- `GET /api/users/me/spending/transactions?month=YYYY-MM&page=1&limit=6`: 해당 월의 결제 내역을 최근순으로 무한 스크롤/페이징(`page`, `limit=6` 기본) 형태로 로딩하여 반환합니다 (`items`, `pagination` 메타데이터 포함).
- `GET /api/users/me/saving-bot/coaching`: 사용자의 마이데이터 지출 내역을 기반으로 생성된 상단 '오늘의 코칭' 카드 정보(메시지, 아낄 수 있는 금액), 코칭 연관 AI 인사말("...줄여볼까요?"), 그리고 생성된 코칭과 연관된 추천 질문 3개를 반환합니다.
- `POST /api/users/me/saving-bot/chat`: 사용자 대화 질문을 수신하여 OpenAI ChatGPT 및 RAG Context(마이데이터 거래/카테고리/예산 통계)를 활용한 답변을 생성합니다. 절약/소비 범주 외 질문은 Guardrail로 감지하여 거절 안내를 반환하고, 절약 질문에는 무리한 절약 대신 점진적·현실적인 실천 조언을 반환합니다.
- `GET /api/users/me/ranking`: 현재 로그인한 사용자의 익명 닉네임, 아바타 이모지, 내 순위(rank), 지출 절약액 및 퀘스트 포인트를 반환합니다.
- `GET /api/users/ranking/top?limit=20`: 상위 랭킹 리스트(순위, 익명 닉네임, 프로필 아바타, 절약 금액/퀘스트 포인트)를 반환합니다 (Redis ZSET 또는 1시간 배치 캐시 응답).
- `GET /api/users/me/challenges/today`: AI/마이데이터 기반으로 배정된 오늘의 미션 정보(제목, 설명, 예상 절약액, 난이도 포인트, 검증 방식, 진행 상태)를 반환합니다.
- `GET /api/users/me/challenges/weekly`: 이번 주(월~일)의 일별 미션 목록 및 수행 판정 결과(`COMPLETED`, `IN_PROGRESS`, `FAILED`, `PENDING`)를 반환합니다.
- `POST /api/users/me/challenges/verify`: 미션 수행 인증을 처리합니다. 백엔드에서 미션 타입별 조건(무지출 0건, 교통비 4천원 이하 한도, 수동 체크인)을 판단하여 성공 시 난이도 포인트 및 절약액 비례 포인트를 수령 처리하고 익명 랭킹 점수에 합산 반영합니다.
- `GET /api/users/me/investment-effect/simulation?category=coffee`: 사용자의 아낀 돈(절약액)을 기반으로 코스콤 CHECK API 주요 종목/지수 및 정기예금 시뮬레이션 평가액 결과를 반환합니다.
- `GET /api/investment/quotes`: 코스콤 CHECK API 기반 시뮬레이션 대상 자산(스타벅스, S&P500 ETF, 정기예금 등)의 최신 시세 및 수익률 데이터를 조회/반환합니다.

## AI 절약 챗봇 연동 및 Guardrail/RAG 설계

AI 절약 챗봇은 `docs/features/ai-saving-chatbot.md` 명세에 따라 다음과 같이 백엔드 로직이 동작하도록 구성합니다.

1. **오늘의 코칭 & 인사말 & 추천 질문 3개 제공 (`GET /api/users/me/saving-bot/coaching`)**
   - 사용자의 마이데이터 지출 데이터(최근 2주~1개월 결제 패턴)를 기반으로 감축 가능한 지출 영역(예: 커피, 배달)과 아낄 수 있는 예대 금액을 계산하여 '오늘의 코칭' 메시지를 반환합니다.
   - 코칭 생성 시 이와 연결되는 첫 AI 인사말(예: *"지난 2주 동안 카페 결제가 9번 있었어요. 무리하지 않는 선에서 줄여볼까요?"*)과 **오늘의 코칭 주제와 연결된 추천 질문 3개** (예: `["이번 주 미션 만들기", "구독 지출 줄이기", "배달비 분석하기"]`)를 함께 반환합니다.

2. **RAG + ChatGPT 대화 응답 및 Scope/Guardrail 검증 (`POST /api/users/me/saving-bot/chat`)**
   - **RAG Context 구성**: 사용자의 월별 예산, 최근 카테고리별 지출 통계, 주요 결제 가맹점 목록을 RAG System Prompt Context로 주입합니다.
   - **절약 범주 외 질문 거부 (Guardrail Policy)**: 사용자의 질문이 주식/투자 리딩, 일반 상식, 요리/코드 작성 등 소비/절약과 무관한 경우 OpenAI Prompt 또는 백엔드 분류기를 통해 거절 안내(예: *"저는 지출과 절약을 돕는 AI 코치입니다. 커피값, 배달비, 구독료 등 지출 절약 방법에 대해 문의해 주세요."*)를 즉시 반환합니다.
   - **단계적·현실적 조언 정책**: 무리하게 지출을 전면 금지하지 않고, *"평일 커피를 2번만 줄이면 예상 절약액은 11,000원이에요."*처럼 사용자가 부담 없이 실천할 수 있는 점진적 절약 가이드를 생성하도록 Prompt를 조정합니다.

## 익명 닉네임 & 랭킹 시스템 설계 (실시간/배치/포인트)

익명 랭킹 기능은 `docs/features/anonymous-ranking.md` 명세에 따라 다음과 같은 시스템 아키텍처로 구현합니다.

1. **익명 닉네임 자동 생성 규칙**
   - 가입 또는 최초 랭킹 진입 시 백엔드에서 `[형용사] + [동물/과일/색상] + [2자리 숫자]` 조합으로 자동 생성하여 DB 저장.
   - 조합 예시: `알뜰한 코알라 27`, `절약왕 민트 03`, `현명한 라임 14`, `짠테크 블루 91`, `조용한 포도 02`, `스마트한 사자 88`, `지혜로운 펭귄 05` 등.

2. **실시간 vs 주기적(배치/캐시) 랭킹 업데이트 전략**
   - **문제점**: 매 클라이언트 조회 시마다 전체 사용자 지출/포인트를 `ORDER BY` 집계하면 데이터베이스 과부하 발생.
   - **해결 방안**:
     - 실제 서비스 및 게임 랭킹 구현 방식과 유사하게 **Redis Sorted Set (ZSET)** 이용 또는 **1시간 주기 배치(Batch) 집계 스케줄러 (또는 5분~1시간 TTL Caching)** 적용.
     - 응답 헤더 및 클라이언트 UI에 *"1시간마다 갱신"* 메시지를 표기하여 현실적이고 효율적인 랭킹 서비스 제공.

3. **랭킹 산정 모델 (절약 금액 vs 퀘스트/포인트 합산)**
   - **Gaming 이슈 방지**: 전월 지출이 극단적으로 커서 이번 달 절약 금액이 착시 현상으로 커지는 문제를 방지하기 위함.
   - **포인트 합산 방식 적용**: `랭킹 점수 = (예산 준수율 포인트) + (Daily/Weekly 절약 퀘스트 달성 포인트)`.
   - 꾸준히 절약 미션을 수행하고 예산을 잘 준수한 사용자가 정당하게 상위 랭킹에 도달하도록 백엔드 점수 집계 로직 작성.

## 일일 챌린지 생성 및 미션 검증(Verification) 시스템 설계

일일 챌린지 기능은 `docs/features/daily-challenge.md` 명세에 따라 다음과 같이 검증 및 배정 로직을 구성합니다.

1. **AI/마이데이터 기반 하루 1개 미션 배정**
   - 사용자 마이데이터(자주 가는 가맹점, 커피/배달 비중 등)를 기반으로 매일 자정 사용자 맞춤형 미션을 1개 생성합니다.
   - 난이도별 기본 포인트 (50pt / 100pt / 150pt) + `예상 절약액의 10%` 가산 포인트를 함께 설정합니다.

2. **미션 성공 여부 (Verification) 타입별 검증 로직**
   - **`ZERO_SPEND` (무지출 미션)**: 당일 마이데이터 거래 내역 중 해당 카테고리(`카페`, `배달` 등) 결제 건수가 `0건`일 경우 검증 성공.
   - **`AMOUNT_LIMIT` (금액 한도 미션 - 예: 택시 대신 지하철)**: 교통 카테고리로 통합 분류되는 특성을 고려해, 당일 교통 결제 금액 1회 또는 총합이 `4,000원 이하` (택시 이용 미발생 추정)일 때 검증 성공.
   - **`MANUAL_ACTION` (확인/수동 미션 - 예: 구독 서비스 확인하기)**: 마이데이터로 100% 자동 감지가 어려운 미션은 사용자가 `수행 인증하기` 버튼 클릭 및 수동 인증 시 성공 판정.

3. **미션 검증 및 랭킹 포인트 반영 (`POST /api/users/me/challenges/verify`)**
   - 사용자가 '수행 인증하기'를 클릭하거나 마이데이터 업데이트 시 백엔드가 검증을 실행합니다.
   - **DB 갱신 및 랭킹 연동 규칙**:
     1. 검증 성공 시 `AiChallenge.status`를 `"SUCCESS"`로 업데이트하고 `start_date`를 당월 날짜로 기록합니다.
     2. 미션 난이도 획득 포인트(`point`)를 `User.total_points` 컬럼에 누적 합산(`user.total_points += earnedPoints`)합니다.
     3. 랭킹 시스템(`ranking.js`)은 당월 1일 이후 `AiChallenge` 중 `status = 'SUCCESS'`인 개수를 조회하여 랭킹 카드에 `미션 N회 성공`으로 즉시 자동 반영합니다.

## 투자효과 및 코스콤 CHECK API 연동 설계

투자효과 기능은 `docs/features/investment-effect.md` 명세에 따라 다음과 같이 시뮬레이션 및 CHECK API 연동을 구현합니다.

1. **선별된 코스콤 CHECK API 목록**
   - **`GET https://checkapi.koscom.co.kr/stock/m001code`**: 주식 종목 코드/종목명 마스터 데이터 조회
   - **`GET https://checkapi.koscom.co.kr/stock/m001codeetf`**: ETF 코드/종목명 마스터 데이터 조회
   - **`GET https://checkapi.koscom.co.kr/stock/m001basic`**: 선택된 종목의 현재가(`nowPrc`), 등락률(`diffRate`) 기본 시세 데이터 조회

2. **주가 손실 시 UX 보완 정책 (사용자 선택형 비교 + 안전자산 믹스)**
   - 주가 하락 시 절약 동기부여 저하를 방지하기 위해 **원금 보장/이자 수익을 주는 정기예금/CMA(+항상 플러스)**를 기본 비교군에 포함.
   - 사용자가 원하는 비교 종목(스타벅스, S&P500 ETF, 정기예금 등)을 직접 선택하여 기회비용 시뮬레이션을 확인할 수 있는 사용자 선택형(User Selection) 구조 적용.

3. **기회비용 시뮬레이션 산출 계산식**
   - `평가 금액 = 절약 금액 × (1 + 수익률)`
   - `손익 금액 = 평가 금액 - 절약 금액` (예: `+8,400원`)
   - 백엔드는 코스콤 CHECK API 시세를 5분~1시간 단위 캐싱하여 효율적으로 결과를 제공합니다.

## 마이페이지 및 계정/연동 관리 설계

마이페이지 기능은 `docs/features/mypage.md` 명세에 따라 다음과 같이 동작하도록 구성합니다.

1. **마이데이터 연동 관리 (`POST /api/users/me/mydata/connect` & `/disconnect`)**
   - 온보딩에서 건너뛴 경우: `POST /api/users/me/mydata/connect`를 호출하여 1개월 합성 결제내역 생성 및 `myDataConnected=true` 설정.
   - 마이데이터 연결 해제: `POST /api/users/me/mydata/disconnect`를 호출하여 `myDataConnected=false`로 전환.

2. **알림 설정**
   - 프론트엔드 UI 스위치 토글로 처리하며 백엔드 런타임에는 미치는 영향이 없는 UI 전용 토글로 유지.

3. **로그아웃 처리 (`POST /api/auth/logout`)**
   - 전달받은 Refresh Token을 백엔드 Redis(`refresh:{tokenId}`)에서 폐기.
   - 클라이언트 Access Token 및 Refresh Token 파기 후 로그인 페이지로 리다이렉트.

4. **프로필 표기**
   - `절약 레벨` 및 `배지`는 프론트엔드 프로필 표시 대상에서 제외(추후 회의 후 결정).

## 인증 및 DB 스키마 관리

액세스 토큰은 `JWT_SECRET` 기반 HS256 서명 토큰이며 기본 만료 시간은 15분입니다. 리프레시 토큰은 Redis에 `refresh:{tokenId}` 키로 SHA-256 해시만 저장하며 기본 TTL은 14일입니다. 여러 WAS 인스턴스는 동일한 `JWT_SECRET`, MySQL, Redis를 공유해야 합니다.

신규 가입자의 `is_first_login`은 `true`로 생성합니다. 첫 로그인 초기 설정에서 예산 저장까지 완료되면 `is_first_login=false`, `budget_setup_completed=true`로 변경합니다. `mydata_connected`는 연동하기 경로에서 `true`, 건너뛰기 경로에서는 `false`로 유지합니다.

OpenAI 기반 합성 거래내역 생성은 환경 변수 `OPEN_AI_KEY`를 사용합니다. 모델은 기본 `gpt-4.1-mini`이며 `OPENAI_MODEL`로 변경할 수 있습니다. Docker Compose 실행 시에도 `OPEN_AI_KEY`가 백엔드 컨테이너 환경변수로 전달되어야 합니다.

ORM은 Sequelize를 사용합니다. 서버 시작 시 기본값으로 `sequelize.sync({ alter: true })`를 실행해 `docs/Kopilot.png` 기준 테이블을 최신 모델에 맞춥니다. 환경변수 `DB_SYNC_SCHEMA=false`로 동기화를 끌 수 있고, `DB_SYNC_ALTER=false`로 alter 없이 존재하지 않는 테이블 생성만 수행할 수 있습니다.

## 구현 기준
현재 백엔드는 Express 5 기반 JavaScript ES 모듈입니다. 진입점은 `backend/server.js`이며, 런타임 설정은 `PORT`, `CORS_ORIGIN` 같은 환경 변수를 사용합니다. API 변경 후에는 `GET /api/health`와 변경된 엔드포인트를 직접 호출해 응답 상태와 JSON 구조를 확인합니다.
