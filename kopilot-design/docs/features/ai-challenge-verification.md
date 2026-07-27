# AI 챌린지 다음 날 인증·판정·보상

## 목적

당일 중간 시점의 거래내역으로 미션을 판정하면 이후 결제가 결과를 바꿀 수 있다. 따라서 챌린지는 미션 날짜가 끝난 뒤인 다음 날 00:00 KST부터 판정한다. 인증 요청은 전날의 전체 거래내역을 한 번 집계해 즉시 성공 또는 실패로 확정한다.

## 상태 모델

| 상태 | 의미 | 전이 |
|---|---|---|
| `IN_PROGRESS` | 미션 진행 중 또는 다음 날 판정 대기 | `SUCCESS`, `FAIL` |
| `SUCCESS` | 전날 전체 거래내역 검증을 통과했고 포인트가 지급됨 | 없음 |
| `FAIL` | 전날 거래 조건을 충족하지 못했거나, 판정 가능 기간이 지나도록 인증하지 않음 | 없음 |

`PENDING_VERIFICATION`은 새 흐름에서 생성하지 않는다. 이전 버전에서 남은 전날 또는 오늘의 `PENDING_VERIFICATION` 데이터는 조회 시 `IN_PROGRESS`로 보정하여 다음 날 인증 흐름을 적용한다. 그보다 오래된 미션은 `FAIL`로 마감한다.

## 시간 및 인증 규칙

- 모든 기준 시간은 `Asia/Seoul`이다.
- 거래 집계 범위는 `challenge_date 00:00:00` 이상, 그 다음 날 `00:00:00` 미만이다.
- 미션 `D`의 인증 버튼은 `D+1 00:00:00`부터 `D+2 00:00:00` 직전까지 활성화한다.
- 버튼은 오늘 카드가 아니라 주간 목록의 전날 미션 행에 표시한다.
- `D+2 00:00:00`부터 전날이 아닌 더 오래된 `IN_PROGRESS` 미션은 자동으로 `FAIL` 처리한다.

## 판정 API

`POST /api/users/me/challenges/:challengeId/verify`

`Authorization: Bearer <accessToken>`이 필요하며 요청 본문은 없다.

1. 현재 사용자의 `IN_PROGRESS` 미션인지 확인한다.
2. 미션 날짜가 KST 기준 전날인지 확인한다. 아니면 `409 CHALLENGE_VERIFICATION_NOT_OPEN`을 반환한다.
3. 전날 대상 카테고리 거래 및 미분류 거래를 집계한다.
4. 미분류 거래가 있으면 `409 TRANSACTION_CLASSIFICATION_REQUIRED`를 반환한다.
5. `NO_SPEND`는 거래 0건, `MAX_SPEND`는 지출 합계가 한도 이하일 때 `SUCCESS`로 확정한다.
6. 성공 시 포인트 원장 기록과 `users.total_points` 증가를 같은 DB 트랜잭션으로 처리한다. 조건 미달이면 즉시 `FAIL`로 확정한다.

성공 응답 예시:

```json
{
  "challengeId": 31,
  "status": "SUCCESS",
  "message": "미션 성공! 100P를 받았어요."
}
```

실패도 정상 판정 결과이므로 `200`으로 `status: "FAIL"`을 반환한다.

## 진행률 및 화면

- 오늘 카드에는 현재 소비 진행률과 `인증은 다음 날 자정부터 주간 목록에서 가능` 안내만 표시한다.
- 주간 목록에서 전날 `IN_PROGRESS` 미션의 `canVerify=true`일 때 `인증하기` 버튼을 표시한다.
- 버튼 클릭 중에는 해당 행에 거래내역 확인 로딩 오버레이를 표시한다.
- 완료/미완료 상태는 판정 결과를 그대로 표시한다.

`GET /api/users/me/challenges`의 각 `weeklyChallenges` 항목은 아래 필드를 포함한다.

```json
{
  "id": 31,
  "date": "2026-07-26",
  "status": "IN_PROGRESS",
  "canVerify": true,
  "verificationOpensAt": "2026-07-27T00:00:00+09:00"
}
```

## 보상 정합성

성공 판정 시 `point_ledger`에 `(source_type='AI_CHALLENGE', source_id=ai_challenge.id)`를 유니크하게 기록한 뒤 `users.total_points`를 증가시킨다. 이 제약으로 재요청이나 동시 요청에도 포인트가 중복 지급되지 않는다.
