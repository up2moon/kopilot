# AI 절약 챌린지

## 1. 목적과 범위

사용자가 온보딩에서 선택한 소비 카테고리와 최근 소비 내역을 바탕으로, AI가 사용자별 주간 절약 미션을 생성한다. 화면에는 오늘 수행할 미션과 이번 주 월~금 미션의 상태를 함께 표시한다.

이번 브랜치의 MVP 범위는 다음과 같다.

- 매주 월요일에 AI가 사용자별 평일 5개 챌린지를 생성하고 DB에 저장한다.
- 당일 챌린지를 `오늘의 랜덤 미션` 카드에 표시한다.
- 사용자는 오후 6시 이후 `수행 인증하기`를 눌러 마이데이터 거래내역 기반의 자동 검증을 요청한다.
- 자정 이후 최종 거래내역 재검증으로 성공을 확정하고 포인트를 받는다.
- 지난 날짜의 미완료 미션은 실패 처리한다.
- 랭킹이 성공 챌린지와 획득 포인트를 읽을 수 있게 한다.

실제 영수증 업로드와 사진 OCR은 이번 범위에서 제외한다. 미션 문구와 대상 카테고리·한도는 OpenAI API로 생성하되, 거래내역으로 자동 판정할 수 있는 미션 유형만 허용한다. 생성 결과를 DB에 저장하므로 새로고침이나 재로그인 후에도 같은 사용자에게 같은 주간 미션이 표시된다.

---

## 2. 화면 요구사항

### 2.1 상단

- 제목: `챌린지`
- 설명: `AI가 오늘 수행할 절약 미션을 랜덤으로 배정해요.`

### 2.2 오늘의 랜덤 미션 카드

- 라벨: `오늘의 랜덤 미션`
- 제목 예시: `평일 커피 1회 쉬기`
- 설명 예시: `오늘 카페 결제를 하지 않으면 예상 5,500원을 아낄 수 있어요.`
- 상태가 `IN_PROGRESS`이고 현재 시간이 18:00 KST 전이면 `오후 6시부터 인증할 수 있어요` 안내와 비활성 버튼을 노출한다.
- 상태가 `IN_PROGRESS`이고 18:00~23:59 KST이면 `수행 인증하기` 버튼을 활성화한다.
- 인증 요청이 조건을 통과하면 `PENDING_VERIFICATION` 상태로 바꾸고, `오늘 거래내역을 최종 확인 중이에요`를 표시한다.
- 상태가 `SUCCESS`면 초록색 `완료`와 획득 포인트를 표시하고 버튼은 비활성화한다.
- 상태가 `FAIL`이거나 날짜가 지났으면 회색 `미완료`를 표시한다.

### 2.3 이번 주 미션 목록

- 월요일부터 금요일까지 시간순으로 표시한다.
- 각 행은 요일, 제목, 상태(`완료`/`진행중`/`미완료`)를 가진다.
- 오늘 이후의 미션은 제목은 보여 주되 인증 버튼은 제공하지 않는다.
- 챌린지가 아직 생성되지 않은 경우 `이번 주 미션을 준비하고 있어요.`를 표시한다.

### 2.4 접근 제어 및 이동

- 로그인 사용자만 조회·인증할 수 있다.
- 마이데이터 미연동 또는 선택 소비 카테고리가 없는 사용자는 챌린지 대신 온보딩 안내를 받는다.
- 하단 탭의 `/challenge`를 활성화하고, 플로팅 챗봇 버튼은 기존 `/coach`로 이동한다.

---

## 3. AI 생성 규칙

### 3.1 생성 시점과 멱등성

- 매주 월요일 00:10 KST 스케줄러가 챌린지 대상 사용자를 조회해 해당 주(월요일~금요일)의 미션 5개를 생성한다.
- 대상 사용자는 `mydata_connected = true`이며 `user_expense_category`를 하나 이상 선택한 사용자이다.
- 생성 요청과 저장은 사용자별 DB 트랜잭션으로 처리한다. `(user_id, challenge_date)` 유니크 제약으로 중복 생성을 막는다.
- 스케줄러 장애·배포 시 누락을 보완하기 위해 `GET /me/challenges`에서도 이번 주 미션의 누락 여부를 확인하고, **월요일에만** 같은 생성 서비스를 재호출한다. 화~금에는 미션을 새로 만들지 않는다.
- 토요일·일요일에는 새 미션을 만들지 않는다. 화면에는 다음 월요일에 새 미션이 생성된다는 안내를 반환한다.
- 이미 저장된 주간 미션은 AI를 다시 호출하거나 바꾸지 않는다.

### 3.2 대상 카테고리

1. `user_expense_category`에서 사용자가 선택한 카테고리만 AI 입력 후보로 사용한다.
2. 카테고리별 최근 30일 지출 합계·결제 건수·평균 결제금액을 AI에 함께 제공한다.
3. AI는 월~금 5개 미션을 한 번에 반환한다. 같은 주에는 같은 카테고리 또는 미션 유형을 되도록 반복하지 않는다.
4. 선택 카테고리가 5개보다 적으면 카테고리 중복은 허용하되, 연속된 날짜에는 같은 카테고리를 배정하지 않는다.
5. 선택 카테고리가 없거나 거래가 없으면 챌린지를 생성하지 않고 온보딩 필요 상태를 반환한다.

### 3.3 AI 출력 제약

AI는 사람이 읽을 문구를 만들지만, 성공 조건을 해석하거나 판정하지 않는다. Responses API의 JSON Schema를 사용해 아래 형식만 받는다.

```json
{
  "challenges": [
    {
      "date": "2026-07-27",
      "expenseCategoryName": "카페·간식",
      "challengeType": "NO_SPEND",
      "title": "평일 커피 1회 쉬기",
      "description": "오늘 카페 결제를 하지 않으면 예상 5,500원을 아낄 수 있어요.",
      "targetAmount": null,
      "estimatedSavingAmount": 5500,
      "point": 100
    }
  ]
}
```

- `expenseCategoryName`은 사용자 선택 카테고리 중 하나여야 한다.
- `challengeType`은 `NO_SPEND` 또는 `MAX_SPEND`만 허용한다. 자기 신고가 필요한 유형은 허용하지 않는다.
- `NO_SPEND`는 `targetAmount = null`, `MAX_SPEND`는 `targetAmount > 0`이어야 한다.
- 날짜는 요청한 주의 월~금 각각 한 번이어야 한다.
- `point`는 100으로 고정한다.
- 서버는 AI 응답을 검증하고, 형식 오류·선택하지 않은 카테고리·중복 날짜가 있으면 최대 1회 재요청한다. 재요청도 실패하면 생성 전체를 실패 처리하고 운영 로그에 기록한다.
- AI 생성에 사용하는 모델은 `OPENAI_MODEL`, 키는 `OPEN_AI_KEY` 환경변수에서 읽는다. 키가 없거나 호출에 실패하면 기존 주간 미션을 대체하지 않으며 오류를 반환한다.

### 3.4 자동 검증 가능 미션 예시

| 카테고리 | 미션 유형 | 제목 예시 | 설명/절약 예상액 |
|---|---|---|---|
| 카페·간식 | `NO_SPEND` | 평일 커피 1회 쉬기 | 오늘 카페 결제를 하지 않으면 최근 평균 1회 결제 금액을 아낄 수 있어요. |
| 배달 | `NO_SPEND` | 배달비 줄이기 | 오늘 배달 결제를 쉬면 최근 평균 배달비를 아낄 수 있어요. |
| 교통 | `MAX_SPEND` | 교통비 예산 지키기 | 오늘 교통비를 설정 금액 이하로 유지해요. |
| 구독 | `NO_SPEND` | 오늘 신규 구독하지 않기 | 오늘 구독 관련 결제를 하지 않으면 추가 고정비를 막을 수 있어요. |
| 쇼핑 | `NO_SPEND` | 오늘은 장바구니만 보기 | 오늘 쇼핑 결제를 하지 않으면 충동구매를 줄일 수 있어요. |
| 식비 | `MAX_SPEND` | 점심 예산 지키기 | 오늘 식비를 설정 금액 이하로 유지해요. |
| 문화 | `NO_SPEND` | 무료 여가 보내기 | 오늘 문화 결제 대신 무료 활동을 찾아봐요. |
| 통신 | `NO_SPEND` | 오늘 부가서비스 결제 쉬기 | 통신 관련 추가 결제가 없는지 확인해요. |

`estimated_saving_amount`는 해당 카테고리의 최근 30일 거래 평균 금액을 사용한다. `MAX_SPEND`의 `target_amount`는 최근 평균 일 지출의 85%를 1,000원 단위로 올림한 값으로 한다. 거래내역만으로 판정할 수 없는 `택시 대신 지하철`, `요금제 점검`, `영수증 인증` 같은 미션은 생성하지 않는다.

---

## 4. 데이터 모델 변경

기존 `ai_challenge`는 화면 표시에는 충분하지만, 하루 단위 중복 방지·카테고리별 검증·포인트 지급을 구현하기 위한 컬럼이 부족하다. 아래 컬럼을 추가한다.

| 컬럼 | 타입/제약 | 설명 |
|---|---|---|
| `challenge_date` | `DATE NOT NULL` | 미션 수행 대상 날짜 |
| `expense_category_id` | `BIGINT NULL`, FK | 챌린지 대상 카테고리 |
| `challenge_type` | `ENUM('NO_SPEND','MAX_SPEND') NOT NULL` | 거래내역으로 자동 판정할 성공 방식 |
| `target_amount` | `BIGINT NULL` | `MAX_SPEND`의 최대 소비 금액 |
| `estimated_saving_amount` | `BIGINT NOT NULL DEFAULT 0` | 카드에 표시할 예상 절약액 |
| `completed_at` | `DATETIME NULL` | 성공 확정 시각 |
| `rewarded_at` | `DATETIME NULL` | 포인트 지급 완료 시각 |
| `verification_requested_at` | `DATETIME NULL` | 사용자가 인증을 요청한 시각 |
| `finalized_at` | `DATETIME NULL` | 자정 이후 최종 판정 시각 |

필수 인덱스와 제약은 다음과 같다.

```text
UNIQUE (user_id, challenge_date)
INDEX  (user_id, start_date, status)
FOREIGN KEY (expense_category_id) REFERENCES expense_category(id)
CHECK  (end_date >= start_date)
CHECK  (point >= 0)
```

`challenge_type`에서는 `MANUAL_CONFIRM` 값을 제거하고 `NO_SPEND`, `MAX_SPEND`만 사용한다. `ai_challenge.status`는 `IN_PROGRESS`, `PENDING_VERIFICATION`, `SUCCESS`, `FAIL`로 확장한다. `IN_PROGRESS`만 인증 요청이 가능하며, 종료 후 `SUCCESS`/`FAIL` 상태는 변경하지 않는다.

### 포인트 정합성

최종 성공 처리 시 `users.total_points`에 `ai_challenge.point`를 한 번만 더한다. 이 작업은 챌린지 상태 변경과 하나의 DB 트랜잭션으로 처리하고, `rewarded_at IS NULL` 조건을 사용해 재시도에도 중복 지급되지 않게 한다. 오후 인증 요청 단계에서는 포인트를 지급하지 않는다.

현재 랭킹 서비스는 `users.total_points`와 `성공 챌린지 수 * 100`을 함께 더한다. 포인트 지급을 도입하면 챌린지 점수가 이중 합산되므로, 랭킹 점수는 `total_points + 절약 금액 기반 점수`만 사용하도록 수정한다.

---

## 5. API 계약

모든 API는 `Authorization: Bearer <accessToken>`이 필요하다.

### 5.1 이번 주 챌린지 조회

`GET /api/users/me/challenges?week=YYYY-MM-DD`

- `week`는 선택값이며, 지정하면 해당 날짜가 포함된 주의 월~금을 반환한다.
- 월요일에 해당 주 데이터가 없으면 AI 생성 후 반환한다. 이미 생성된 데이터는 그대로 반환한다.
- 생성 불가 시에도 `200`으로 `onboardingRequired: true`를 반환해 화면이 안내 상태를 표시할 수 있게 한다.

응답 예시:

```json
{
  "weekStartDate": "2026-07-20",
  "today": "2026-07-22",
  "onboardingRequired": false,
  "todayChallenge": {
    "id": 31,
    "date": "2026-07-22",
    "title": "평일 커피 1회 쉬기",
    "description": "오늘 카페 결제를 하지 않으면 예상 5,500원을 아낄 수 있어요.",
    "category": "카페·간식",
    "status": "IN_PROGRESS",
    "point": 100,
    "estimatedSavingAmount": 5500,
    "canVerify": true
  },
  "weeklyChallenges": [
    { "id": 29, "date": "2026-07-20", "weekday": "월", "title": "택시 대신 지하철", "status": "SUCCESS" },
    { "id": 30, "date": "2026-07-21", "weekday": "화", "title": "배달비 줄이기", "status": "SUCCESS" },
    { "id": 31, "date": "2026-07-22", "weekday": "수", "title": "평일 커피 1회 쉬기", "status": "IN_PROGRESS" }
  ]
}
```

### 5.2 수행 인증 요청

`POST /api/users/me/challenges/:challengeId/verify`

검증 규칙:

- 본인 챌린지인지 확인한다. 아니면 `404`를 반환한다.
- KST 기준 오늘 날짜이고 `IN_PROGRESS`, 현재 시간이 18:00 이상일 때만 허용한다. 그 외에는 `409 CHALLENGE_VERIFICATION_NOT_OPEN`을 반환한다.
- 거래내역은 `transaction_history`에서 `user_id`, 대상 카테고리, 오늘 00:00:00~23:59:59 KST 범위로 조회한다.
- `NO_SPEND`: 인증 요청 시점까지 대상 카테고리 거래가 없을 때만 `PENDING_VERIFICATION`으로 전환한다. 거래가 있으면 `409 CHALLENGE_CONDITION_NOT_MET`를 반환한다.
- `MAX_SPEND`: 인증 요청 시점까지 대상 카테고리 지출 합계가 `target_amount` 이하일 때만 `PENDING_VERIFICATION`으로 전환한다.
- 대상 날짜의 미분류 거래가 있으면 자동 성공을 확정하지 않고 `409 TRANSACTION_CLASSIFICATION_REQUIRED`를 반환한다. 사용자가 거래 분류를 완료한 뒤 다시 인증한다.
- 이 API는 임시 검증 결과만 반환한다. 성공 확정과 포인트 지급은 다음 날 최종 판정에서 수행한다.

### 5.3 다음 날 최종 판정 및 만료 처리

`finalizePreviousDayChallenges()` 서비스는 매일 00:05 KST 스케줄러에서 실행한다. 이 시각에는 전날 거래가 더 추가되지 않는다는 마이데이터 Mock 환경을 전제로 한다.

- 전날 `PENDING_VERIFICATION` 챌린지의 전체 거래내역을 다시 조회한다.
- `NO_SPEND`는 대상 카테고리 거래가 0건, `MAX_SPEND`는 합계가 한도 이하일 때 `SUCCESS`로 전환하고 포인트를 지급한다.
- 조건에 맞지 않거나 인증 요청이 없던 `IN_PROGRESS` 챌린지는 `FAIL`로 전환한다.
- 이미 성공·실패한 챌린지는 수정하지 않는다.

오후 6시 제한만으로는 인증 후 결제하는 문제를 완전히 막을 수 없다. 따라서 오후 인증은 **임시 검증**, 다음 날 00:05 KST의 전일 전체 거래 재검증은 **최종 성공 판정**으로 분리한다.

---

## 6. 서비스 구조

```text
routes/challenges.js
  ├─ GET  /me/challenges
  └─ POST /me/challenges/:challengeId/verify

services/challengeService.js
  ├─ getOrCreateWeeklyChallenges(userId, date)
  ├─ createWeeklyChallenges(userId, weekStart)
  ├─ generateWeeklyChallengesWithOpenAI(userId, weekStart)
  ├─ buildChallengeGenerationContext(userId, weekStart)
  ├─ verifyChallengeRequest(userId, challengeId)
  └─ finalizePreviousDayChallenges(now)
```

- 라우트는 인증·입력 검증·HTTP 응답만 담당한다.
- AI 생성/인증 요청/최종 성공 판정/포인트 지급은 서비스에 둔다.
- DB 트랜잭션은 주간 생성과 최종 성공 처리에서 시작한다.
- 날짜 계산은 서버 표준을 `Asia/Seoul`로 통일하고 날짜 문자열은 `YYYY-MM-DD`를 사용한다.

---

## 7. 완료 조건

- [ ] `ai_challenge` 모델에 필요한 컬럼·인덱스가 반영된다.
- [ ] `OPEN_AI_KEY`를 이용해 선택 카테고리와 최근 소비 기반의 평일 5개 미션이 생성된다.
- [ ] 월요일 스케줄러가 사용자별 평일 5개 미션을 한 주에 한 번만 생성하고, 새로고침 후에도 같은 DB 데이터를 반환한다.
- [ ] 선택 카테고리가 없거나 소비 데이터가 없는 사용자는 챌린지가 생성되지 않고 온보딩 안내를 받는다.
- [ ] 오늘 미션과 이번 주 목록을 조회할 수 있다.
- [ ] 오후 6시 전에는 인증 요청이 차단되고, 인증 요청 시 당일 거래내역으로 임시 검증한다.
- [ ] 다음 날 00:05 KST에 전일 거래내역을 재검증해 성공/실패를 확정한다.
- [ ] 같은 챌린지를 반복 인증하거나 최종화 작업이 재시도되어도 포인트가 중복 지급되지 않는다.
- [ ] 인증 요청하지 않은 미션과 최종 검증에 실패한 미션이 `FAIL`로 전환된다.
- [ ] 랭킹에서 챌린지 포인트가 한 번만 합산된다.
- [ ] 단위 테스트: AI 응답 검증, 주간 중복 생성, 주말, 18시 이전 차단, 인증 권한, `NO_SPEND`, `MAX_SPEND`, 자정 이후 재검증, 중복 포인트 지급을 포함한다.
