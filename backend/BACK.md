# 백엔드 에이전트 가이드

## 우선 참고 순서
백엔드 API, 데이터 구조, 인증/온보딩 상태, 배포 연동을 수정할 때는 아래 순서로 문서를 확인합니다.

1. 루트 `AGENTS.md`
2. `backend/BACK.md`
3. `kopilot-design/PRD.md`
4. API가 특정 화면을 지원하면 관련 `kopilot-design/docs/features/*.md`
5. 인프라나 배포 변경이 포함되면 루트 `INFRA.md`

## 와이어프레임 연계 규칙
백엔드 작업도 화면 요구사항과 연결되면 `kopilot-design` 문서를 참고합니다. 예를 들어 첫 로그인 초기 설정 API는 `docs/features/first-login.md`의 온보딩 상태, 마이데이터 연동 여부, 카테고리 선택, 예산 설정 흐름을 기준으로 설계합니다. 대시보드 API는 `docs/features/dashboard.md`의 소비 요약, 카테고리별 소비, 최근 결제 내역에 필요한 필드를 기준으로 응답을 구성합니다. 소비 상세 API는 `docs/features/spending-detail.md`의 총소비·결제건수·평균결제액 요약, 카테고리별 비율, 주차/일자별 그래프 집계 및 무한 스크롤 결제 내역 페이징을 기준으로 응답을 구성합니다. AI 절약 챗봇 API는 `docs/features/ai-saving-chatbot.md`의 오늘의 코칭, 연관 인사말, 코칭 기반 추천 질문 3개, RAG+ChatGPT 기반 답변, 소비/절약 범위 외 질문 Guardrail 제어, 점진적·현실적 조언 방침을 기준으로 응답을 구성합니다. 익명 랭킹 API는 `docs/features/anonymous-ranking.md`의 익명 닉네임 조합 생성, 내 랭킹 및 상위 랭킹 리스트, 1시간/5분 주기 캐시 갱신, 절약액 및 퀘스트 포인트 합산 랭킹 구조를 기준으로 응답을 구성합니다. AI 챌린지 API는 `docs/features/ai-challenge.md`의 월요일 사용자별 평일 5개 AI 미션 생성, DB 영속화, 자동 검증 가능한 미션 유형을 기준으로 응답을 구성합니다. 투자효과 API는 `docs/features/investment-effect.md`의 기회비용 시뮬레이션, 코스콤 CHECK API 시세 연동, 사용자 선택 비교 종목 및 안전자산(예금) 믹스를 기준으로 응답을 구성합니다. 마이페이지 API는 `docs/features/mypage.md`의 마이데이터 재연동 및 해제, 알림 설정(UI), 로그아웃 및 Redis 토큰 폐기 처리를 기준으로 응답을 구성합니다. (※ 프론트엔드 프로필 내 절약 레벨/배지는 현재 표시에서 제외합니다.)

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
- `GET /api/users/me/challenges?week=YYYY-MM-DD`: 월~금 AI 챌린지 목록과 오늘의 챌린지를 반환합니다. 현재 주 미션이 비어 있으면 월요일 또는 그 이후 어느 요일의 첫 요청에서도, 최근 30일 거래내역 통계를 바탕으로 5개 미션을 생성해 `ai_challenge`에 저장한 뒤 반환합니다. 실제 소비가 있는 카테고리만 후보로 쓰고 월 고정 카테고리(`통신`·`구독`)는 제외하며, 카테고리·타입·한도·예상 절약액은 서버가 실제 소비 통계로 확정하고 OpenAI는 문구만 생성합니다(문구 실패 시 템플릿 폴백). 이미 저장된 미션은 재생성하지 않습니다. 오늘보다 이전인 진행중 미션은 응답에서 `FAIL`로 투영해 화면에 `미완료`로 표시합니다.
- `GET /api/users/me/investment-effect/simulation?category=coffee&month=YYYY-MM&assetCodes=005930,360750`: 사용자의 월별 카테고리 소비액을 투자 원금으로 보고, DB에 저장된 코스콤 종가(`investment_price`)를 사용해 주요 지수 ETF, 사용자가 검색 선택한 종목, 정기예금/CMA 시뮬레이션 평가액 결과를 반환합니다. 선택 월 첫 거래일 종가가 DB에 없으면 mock 보정 없이 `PRICE_HISTORY_MISSING`을 반환합니다.
- `GET /api/investment/assets/search`: DB에 적재된 코스콤 CHECK API 종목/ETF 마스터(`investment_asset`)를 기반으로 사용자가 입력한 주식 또는 ETF 검색 결과를 반환합니다. DB가 비어 있으면 최초 요청에서 코스콤 마스터를 적재한 뒤 검색합니다.
- `GET /api/investment/quotes`: 코스콤 CHECK API 기반 시뮬레이션 대상 자산(S&P500 ETF, KOSPI 200 ETF, 사용자가 선택한 종목 등)의 최신 저장 시세를 조회/반환합니다. 저장된 시세가 없으면 코스콤 기본 시세를 호출해 DB에 저장합니다.
- `POST /api/investment/sync?mode=all|prices|base-prices|missing-base-prices&limit=200&months=2026-07&assetCodes=005930&allAssets=true`: 코스콤 CHECK API 종목 마스터, 최신 종가, 선택 월 첫 거래일 기준가를 수동 동기화합니다. `missing-base-prices`는 이미 동기화 대상으로 활성화된 종목 중 최근 월 첫 거래일 기준가가 DB에 없는 항목만 보강합니다. 배포 직후 초기 적재나 로컬 검증에 사용합니다.

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

## AI 주간 챌린지 생성 시스템

챌린지 생성은 `docs/features/ai-challenge.md` 명세에 따라 다음과 같이 동작한다.

1. **월요일 생성 및 DB 영속화**
   - KST 매주 월요일 00:10 이후 스케줄러가 마이데이터 연동 사용자를 대상으로 실행된다.
   - 서버가 최근 30일 카테고리별 소비 통계(건수·활동일수·활동일 평균 지출)를 계산해 **달성 가능한 챌린지의 카테고리·타입·한도·예상 절약액을 직접 확정**한다. 금액을 AI가 임의로 지어내지 않도록, OpenAI Responses API는 확정된 챌린지에 대한 **한글 제목·설명 문구만** 생성한다(JSON Schema). AI 호출 실패나 형식 오류 시 서버 템플릿 문구로 폴백하며 챌린지 자체는 그대로 저장된다.
   - `(user_id, challenge_date)` 유니크 인덱스로 같은 사용자·날짜 미션의 중복 저장을 막는다. 이미 저장된 주간 미션은 새로고침·재로그인 시에도 그대로 반환하며 재생성하지 않는다.
   - 서버가 월요일 생성 시점을 놓치거나 사용자가 월요일 이후 가입한 경우에도, 현재 주 첫 `GET /api/users/me/challenges` 요청이 생성을 보완한다.
   - 조회 시 오늘보다 이전인 진행중 미션은 `FAIL` 상태로 응답해 화면에 `미완료`로 표시한다. 이 단계에서는 DB 상태나 포인트를 변경하지 않는다.

2. **달성 가능성을 위한 카테고리·금액 규칙**
   - **월 고정/정기 결제 카테고리(`통신`, `구독`)는 일일 챌린지에서 제외**한다. 특정 요일 무지출·한도가 사실상 항상 달성되거나 무의미하기 때문이다.
   - 최근 30일 동안 실제 소비가 있는 카테고리만 후보로 쓰고, 반복 소비(3건 이상) 카테고리를 우선한다. 소비가 없는 카테고리에는 챌린지를 배정하지 않는다.
   - 카테고리 성격에 맞춰 타입을 정한다. 매일 쓰게 되는 `식비`·`카페·간식`·`교통`은 완전 무지출이 비현실적이라 **`MAX_SPEND`(평소 활동일 평균의 약 70% 한도)** 로, 간헐적인 `배달`·`쇼핑`·`문화`는 **`NO_SPEND`(하루 건너뛰기)** 로 만든다. 한도형으로 실질 절약이 나오지 않을 만큼 평균이 작으면 무지출형으로 전환한다.
   - `MAX_SPEND` 한도와 `estimated_saving_amount`는 사용자의 실제 활동일 평균 지출에서 산출하며, 요일마다 카테고리가 연속으로 겹치지 않게 배정한다.
   - 영수증·사진·자기 신고가 필요한 미션은 생성하지 않는다.

3. **이번 브랜치 범위**
   - 챌린지 조회·생성 및 화면 표시까지만 포함한다.
   - 오후 인증, 전일 거래내역 최종 재검증, 성공/실패 판정, 포인트 지급·랭킹 반영은 후속 브랜치에서 구현한다.

## 투자효과 및 코스콤 CHECK API 연동 설계

투자효과 기능은 `docs/features/investment-effect.md` 명세에 따라 다음과 같이 시뮬레이션 및 CHECK API 연동을 구현합니다.

1. **선별된 코스콤 CHECK API 목록**
   - **`POST https://checkapi.koscom.co.kr/stock/m001/code_info`**: 주식 종목 코드/종목명 마스터 데이터 조회
   - **`POST https://checkapi.koscom.co.kr/stock/m001/code_etf_info`**: ETF 코드/종목명 마스터 데이터 조회
   - **`POST https://checkapi.koscom.co.kr/stock/m001/basic_info`**: 선택된 종목의 현재가(`F15001`), 등락률(`F15004`) 기본 시세 데이터 조회
   - **`POST https://checkapi.koscom.co.kr/stock/m001/hist_info`**: 선택 종목의 일별 가격(`F12506`, `F15001`) 데이터 조회

2. **기본 지수 ETF 비교 + 사용자 검색형 종목 선택 + 안전자산 믹스**
   - 주가 하락 시 절약 동기부여 저하를 방지하기 위해 **원금 보장/이자 수익을 주는 정기예금/CMA(+항상 플러스)**를 기본 비교군에 포함.
   - 기본 비교군은 특정 개별 주식이 아니라 **S&P500 ETF, KOSPI 200 ETF, 정기예금/CMA** 중심으로 구성합니다.
   - 개별 주식은 추천처럼 보이지 않도록 기본 노출하지 않고, 사용자가 직접 검색해 선택한 경우에만 `해당 주식을 샀다면 현재 얼마가 되었는지`를 사용자 선택형(User Selection) 카드로 계산합니다.

3. **DB 적재 및 종가 스케줄링**
   - `investment_asset`: 코스콤 주식/ETF 마스터를 저장합니다. 종목 검색은 이 테이블 기준으로 수행합니다.
   - `investment_price`: `(asset_code, trade_date)` 복합 키로 거래일별 종가를 저장합니다.
   - 화면의 현재가는 `investment_price.close_price`의 최신 거래일 값을 `currentPrice`로 내려주고, 기준가는 선택 월 첫 거래일 값을 `basePrice`로 내려줍니다. 조회/동기화 시각은 `synced_at`을 `quotedAt`으로 사용합니다.
   - 백엔드는 `KOSCOM_SYNC_TIME` 환경 변수 기준 KST 매일 1회 코스콤 CHECK API를 호출합니다. 기본값은 `17:10`입니다.
   - 서버 시작 5초 후 `investment_price`가 0건이면 즉시 초기 동기화를 실행합니다. `KOSCOM_SYNC_ON_START=true`이면 가격 테이블 보유 여부와 관계없이 서버 시작 시 한 번 동기화합니다. `KOSCOM_SYNC_DISABLED=true`이면 스케줄러와 초기 동기화를 모두 끕니다.
   - 운영 배포에서는 코스콤 CHECK API의 IP 제한을 피하기 위해 WAS 1만 스케줄러를 실행하고 WAS 2는 `KOSCOM_SYNC_DISABLED=true`로 둡니다. 사용자 요청에서는 `KOSCOM_LIVE_REFRESH_ON_READ=false`, `KOSCOM_MASTER_SYNC_ON_READ=false`로 DB에 저장된 시세와 마스터만 읽습니다.
   - 로컬 개발에서는 `KOSCOM_LIVE_REFRESH_ON_READ=true`, `KOSCOM_MASTER_SYNC_ON_READ=true`로 즉시 insert 검증을 허용할 수 있습니다. 운영에서 이 값을 켜면 ALB 라우팅 또는 다중 WAS 공인 IP 차이로 `직전 API 조회 IP와 현재 IP가 다릅니다` 오류가 발생할 수 있습니다.
   - 모든 종목의 최신 종가를 매일 적재하려면 `KOSCOM_PRICE_SYNC_ALL_ASSETS=true`를 사용합니다. 기본값은 호출량 제어를 위해 `false`이며, 운영에서는 WAS 1에서만 실행해야 합니다.
   - 스케줄러는 최신 종가와 함께 `KOSCOM_BASE_PRICE_BACKFILL_MONTHS` 기준 최근 월들의 첫 거래일 기준가도 적재합니다. 기본값은 3개월이며, `KOSCOM_BASE_PRICE_SYNC_LIMIT`로 기준가 백필 대상 자산 수를 제한합니다.
   - 10분마다 `price_sync_enabled=true` 종목 중 `KOSCOM_BASE_PRICE_BACKFILL_MONTHS` 기준 최근 월 첫 거래일 기준가가 누락된 항목을 보강합니다. 주기는 `KOSCOM_MISSING_BASE_PRICE_SYNC_INTERVAL_MS`로 조정하고, 1회 최대 보강 건수는 `KOSCOM_MISSING_BASE_PRICE_SYNC_LIMIT`로 제한합니다. 운영에서는 WAS 1만 `KOSCOM_SYNC_DISABLED=false`로 실행하고 WAS 2는 `true`로 둡니다.
   - 모든 종목의 월초 기준가를 미리 적재하려면 `KOSCOM_BASE_PRICE_SYNC_ALL_ASSETS=true` 또는 수동 동기화의 `allAssets=true`를 사용합니다. 종목 수와 월 수만큼 코스콤 호출이 발생하므로 운영에서는 WAS 1에서만 배치로 실행하고 `limit`를 조절합니다.
   - 코스콤 CHECK API 호출은 `KOSCOM_REQUEST_INTERVAL_MS` 기준으로 직렬화합니다. 기본값은 `1100ms`이며, API 호출 제한을 피하기 위해 최소 `1000ms`로 보정합니다.
   - 코스콤 계약 명세의 URL/경로가 다를 수 있으므로 `KOSCOM_BASE_URL`, `KOSCOM_STOCK_MASTER_PATH`, `KOSCOM_ETF_MASTER_PATH`, `KOSCOM_BASIC_QUOTE_PATH` 환경 변수로 실제 계약 경로를 재정의할 수 있습니다.
   - 가격 동기화 대상은 기본 지수 ETF와 사용자가 검색 후 선택한 종목(`price_sync_enabled=true`)입니다.
   - mock 시세나 mock 기준가는 사용하지 않습니다. 기준일 종가가 없으면 `PRICE_HISTORY_MISSING`으로 응답합니다.

4. **기회비용 시뮬레이션 산출 계산식**
   - 투자효과는 `month=YYYY-MM` 기준으로 월별 카테고리 소비액과 투자 가정 월을 동일하게 묶습니다. 예를 들어 `month=2026-06`은 `6월 소비액을 6월 첫 거래일에 투자했다면`, `month=2026-07`은 `7월 소비액을 7월 첫 거래일에 투자했다면`으로 계산합니다.
   - 기준가는 선택 월의 첫 거래일 가격을 사용합니다. 해당 월 1일이 휴장일이면 그 월의 첫 거래 가능일 가격을 사용합니다.
   - `평가 금액 = 소비 금액 × (1 + 수익률)`
   - `손익 금액 = 평가 금액 - 소비 금액` (예: `+8,400원`)
   - `수익률 = (현재가 - 기준가) / 기준가`
   - 현재가가 없고 기준일 가격만 DB에 있는 경우 기준일 가격을 현재가로 재사용하지 않고 `CURRENT_PRICE_MISSING`을 반환합니다.
   - 백엔드는 코스콤 CHECK API 시세를 매일 DB에 적재하고, 시뮬레이션 요청은 저장된 종가를 기준으로 계산합니다.

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
