# AI 주간 챌린지 인증·판정·보상

## 목적

주중 거래가 끝나기 전에 미션을 판정하면 이후 결제로 결과가 바뀔 수 있다. 따라서 월요일부터 금요일까지 주간 미션 5개를 함께 수행하고, 토요일 00:00 KST부터 해당 기간의 전체 거래내역으로 한 번에 인증한다.

## 주간 범위

- 모든 기준 시간은 `Asia/Seoul`이다.
- 수행 기간은 해당 주 월요일 `00:00:00` 이상 토요일 `00:00:00` 미만이다.
- `인증하기` 버튼은 토요일 `00:00:00`부터 활성화한다.
- 다음 주 월요일 `00:00:00` 전까지 인증하지 않은 주간 미션은 모두 `FAIL`로 마감한다.
- 조회 응답의 `verificationOpensAt`, `verificationClosesAt`, `canVerify`를 화면 활성화 기준으로 사용하고 클라이언트 시계만으로 판정하지 않는다.

## 상태 모델

| 상태 | 의미 | 전이 |
|---|---|---|
| `IN_PROGRESS` | 주간 수행 중 또는 토·일 인증 대기 | `SUCCESS`, `FAIL` |
| `SUCCESS` | 주간 거래내역 검증을 통과했고 포인트가 지급됨 | 없음 |
| `FAIL` | 거래 조건을 충족하지 못했거나 인증 기간이 만료됨 | 없음 |

## 판정 API

`POST /api/users/me/challenges/verify`

`Authorization: Bearer <accessToken>`이 필요하며 요청 본문은 없다. 현재 주의 `IN_PROGRESS` 미션 5개를 동일한 거래내역 스냅샷으로 일괄 판정한다.

1. 현재 사용자의 해당 주 미션인지 확인한다.
2. 서버 시각이 토요일 00:00 이상 다음 주 월요일 00:00 미만인지 확인한다. 아니면 `409 CHALLENGE_VERIFICATION_NOT_OPEN`을 반환한다.
3. 월요일 00:00 이상 토요일 00:00 미만의 대상 카테고리 거래와 미분류 거래를 한 번 조회한다.
4. 판정에 영향을 주는 미분류 거래가 있으면 전체 요청을 변경 없이 유지하고 `409 TRANSACTION_CLASSIFICATION_REQUIRED`를 반환한다.
5. 각 미션의 `challengeType`과 목표값에 따라 `SUCCESS` 또는 `FAIL`로 확정한다.
6. 성공 미션별 포인트 지급과 모든 상태 변경을 하나의 DB 트랜잭션으로 처리한다.
7. 동일 주를 다시 요청하면 기존 결과를 반환하고 포인트를 중복 지급하지 않는다.

응답 예시:

```json
{
  "weekStartDate": "2026-07-27",
  "status": "VERIFIED",
  "successfulCount": 3,
  "totalCount": 5,
  "earnedPoints": 300,
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

모든 미션이 실패한 경우에도 정상 판정이므로 `200`을 반환하며 `showCelebration`은 `false`이다.

## 화면 동작

- 금요일까지 버튼은 비활성화하고 `토요일 00:00부터 인증할 수 있어요`와 남은 기간을 안내한다.
- 토요일 00:00부터 `인증하기` 버튼을 활성화한다.
- 인증 중에는 버튼 중복 클릭을 막고 `이번 주 거래내역을 확인하고 있어요` 로딩 상태를 표시한다.
- 완료 후 `N/5 성공`, 획득 포인트, 각 미션 결과를 함께 표시한다.
- `showCelebration=true`, 즉 성공 미션이 하나 이상이면 결과가 화면에 반영된 직후 컨페티를 한 번만 재생한다.
- 컨페티는 2~3초 이내로 종료하고 입력이나 스크롤을 막지 않는다. `prefers-reduced-motion: reduce`에서는 애니메이션 없이 성공 메시지만 표시한다.
- 새로고침이나 재조회로 이미 확정된 결과를 불러올 때는 컨페티를 다시 재생하지 않는다.

## 보상 정합성

성공 미션마다 `point_ledger`에 `(source_type='AI_CHALLENGE', source_id=ai_challenge.id)`를 유니크하게 기록한 뒤 `users.total_points`를 증가시킨다. 이 제약으로 재요청이나 동시 요청에도 포인트가 중복 지급되지 않는다.
