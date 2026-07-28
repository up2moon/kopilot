# 프로토타입 AI 주간 챌린지 인증·판정·보상

## 목적

프로토타입 시연에서 사용자가 즉시 성공 경험과 보상을 확인할 수 있도록 인증 시간 제한과 거래내역 판정을 사용하지 않는다. 미인증 미션의 결과를 서버에서 한 번만 무작위 확정하고, 성공 미션의 포인트와 예상 절약액을 보상처럼 보여준다.

## 주간 범위

- 미인증 미션이 하나 이상 있으면 요일과 시각에 관계없이 인증할 수 있다.
- `canVerify`는 현재 주에 `IN_PROGRESS` 미션이 있는지 서버에서 계산한다.
- `verificationOpensAt`, `verificationClosesAt`은 하위 호환을 위해 유지할 수 있지만 프로토타입 UI에서는 사용하지 않는다.
- 월별 절약액 집계는 성공 미션의 `completed_at`을 `Asia/Seoul` 기준으로 분류한다.

## 상태 모델

| 상태 | 의미 | 전이 |
|---|---|---|
| `IN_PROGRESS` | 아직 프로토타입 인증 결과가 확정되지 않음 | `SUCCESS`, `FAIL` |
| `SUCCESS` | 무작위 인증에 성공했고 포인트가 지급됨 | 없음 |
| `FAIL` | 무작위 인증에서 미완료로 확정됨 | 없음 |

## 판정 API

`POST /api/users/me/challenges/verify`

`Authorization: Bearer <accessToken>`이 필요하며 요청 본문은 없다.

1. 현재 사용자의 이번 주 미션을 잠금 조회한다.
2. `IN_PROGRESS` 미션만 판정 대상으로 선택한다.
3. 대상이 `N`개면 성공 개수를 `1..N` 범위에서 무작위로 정한다.
4. 미션 순서를 무작위로 섞고 성공 개수만큼 `SUCCESS`, 나머지를 `FAIL`로 확정한다.
5. 성공 미션별 포인트 지급과 모든 상태 변경을 하나의 DB 트랜잭션으로 처리한다.
6. 성공 미션의 `estimated_saving_amount` 합계를 계산한다.
7. 동일 주를 다시 요청하면 기존 결과를 반환하고 결과 재추첨 및 포인트 중복 지급을 하지 않는다.

응답 예시:

```json
{
  "weekStartDate": "2026-07-27",
  "status": "VERIFIED",
  "successfulCount": 3,
  "totalCount": 5,
  "earnedPoints": 300,
  "successfulSavingAmount": 18500,
  "showCelebration": true,
  "challenges": [
    {
      "challengeId": 31,
      "status": "SUCCESS",
      "message": "커피 목표를 지켰어요!"
    }
  ]
}
```

프로토타입에서는 미인증 미션이 하나 이상이면 최소 1개가 성공한다. 모든 미션이 이미 확정된 재요청은 기존 결과와 `showCelebration=false`를 반환한다.

## 화면 동작

- 미인증 미션이 있으면 `인증하기` 버튼을 즉시 활성화한다.
- 인증 중에는 버튼 중복 클릭을 막고 `이번 주 미션 결과를 확인하고 있어요` 로딩 상태를 표시한다.
- 완료 후 `성공 개수/전체 개수`, 획득 포인트, 예상 절약액, 각 미션 결과를 함께 표시한다.
- `showCelebration=true`, 즉 성공 미션이 하나 이상이면 결과가 화면에 반영된 직후 컨페티를 한 번만 재생한다.
- 컨페티는 2~3초 이내로 종료하고 입력이나 스크롤을 막지 않는다. `prefers-reduced-motion: reduce`에서는 애니메이션 없이 성공 메시지만 표시한다.
- 새로고침이나 재조회로 이미 확정된 결과를 불러올 때는 컨페티를 다시 재생하지 않는다.

## 보상 정합성

성공 미션마다 `point_ledger`에 `(source_type='AI_CHALLENGE', source_id=ai_challenge.id)`를 유니크하게 기록한 뒤 `users.total_points`를 증가시킨다. 이 제약으로 재요청이나 동시 요청에도 포인트가 중복 지급되지 않는다.
