````md
# first-login.md

# First Login Page

## 1. 페이지 목적

`First Login Page`는 사용자가 KoPilot에 처음 로그인했을 때 등장하는 초기 설정 페이지이다.

사용자는 이 페이지에서 마이데이터를 연동하고, 자신의 소비 관리 목표를 설정한다.

이 페이지의 핵심 목적은 다음과 같다.

1. 마이데이터 연동을 유도한다.
2. 사용자의 소비 카테고리를 설정한다.
3. 카테고리별 월 예산 목표 금액을 설정한다.
4. 이후 대시보드에서 소비 분석, 절약 챌린지, AI 코칭을 제공하기 위한 초기 데이터를 수집한다.

---

## 2. 진입 조건

다음 조건을 만족하는 사용자는 로그인 직후 `First Login Page`로 이동한다.

- 첫 로그인 사용자
- 마이데이터 연동을 아직 완료하지 않은 사용자
- 카테고리별 예산 설정을 아직 완료하지 않은 사용자

초기 설정을 모두 완료한 사용자는 이후 로그인 시 대시보드 페이지로 이동한다.

```text
로그인 성공
→ firstLoginCompleted === false
→ First Login Page 이동

로그인 성공
→ firstLoginCompleted === true
→ Dashboard Page 이동
````

---

## 3. 전체 플로우

```text
Step 1. 환영 화면
→ Step 2. 마이데이터 연동 안내
→ Step 3. 마이데이터 연동 완료 또는 건너뛰기
→ Step 4. 소비 카테고리 선택
→ Step 5. 카테고리별 목표 예산 설정
→ Step 6. 설정 완료
→ Dashboard Page 이동
```

---

# 4. 화면 구성

## 4.1 Step 1. 환영 화면

### 화면 목적

사용자가 KoPilot의 목적을 이해하고 초기 설정을 시작하도록 유도한다.

### 주요 문구

```text
절약과 자산 형성을 함께하는
AI 코파일럿, KoPilot

소비 내역을 분석하고
나에게 맞는 절약 목표를 설정해보세요.
```

### 주요 버튼

| 버튼명  | 동작                  |
| ---- | ------------------- |
| 시작하기 | 마이데이터 연동 안내 화면으로 이동 |

---

## 4.2 Step 2. 마이데이터 연동 안내 화면

### 화면 목적

마이데이터 연동이 왜 필요한지 설명한다.

### 주요 문구

```text
소비 분석을 위해
마이데이터 연동이 필요해요

KoPilot은 결제 내역을 기반으로
소비 패턴을 분석하고 절약 목표를 추천해요.
```

### 안내 내용

* 카드 결제 내역을 기반으로 소비를 분석한다.
* 가맹점명과 결제금액을 기반으로 소비 카테고리를 분류한다.
* 실제 금융 데이터는 사용자 동의 후에만 연결된다.
* 연동된 데이터는 절약 목표와 소비 분석에 사용된다.
* 마이데이터 연동을 건너뛴 경우 mock data를 기반으로 예산 설정을 진행한다.

### 주요 버튼

| 버튼명        | 동작                              |
| ---------- | ------------------------------- |
| 마이데이터 연동하기 | 마이데이터 연동 처리                     |
| 나중에 하기     | 기본 mock data 기반 카테고리 선택 화면으로 이동 |

---

## 4.3 Step 3. 마이데이터 연동 처리

### 화면 목적

사용자가 자신의 결제 내역을 KoPilot과 연결하는 과정이다.

실제 API가 없는 경우, 프론트에서는 연동 버튼 클릭 시 mock 연동 완료 상태로 처리한다.

### 연결 대상

| 항목         | 설명                           |
| ---------- | ---------------------------- |
| 카드 결제내역    | 승인일시, 가맹점명, 결제금액, 결제상태       |
| 선불/간편결제 내역 | 카카오페이, 네이버페이 등으로 추론 가능한 결제내역 |
| 은행 입출금 내역  | 급여, 자동이체, 고정지출 분석용           |

### 연동 완료 후 처리

연동이 완료되면 다음 상태를 저장한다.

```json
{
  "myDataConnected": true
}
```

### 결제내역 mock data 예시

```json
{
  "payments": [
    {
      "paymentId": "A202601030001",
      "approvedAt": "2026-01-03T08:21:00",
      "merchantName": "스타벅스 강남점",
      "amount": 6500,
      "status": "APPROVED"
    },
    {
      "paymentId": "A202601040002",
      "approvedAt": "2026-01-04T12:10:00",
      "merchantName": "배달의민족",
      "amount": 18900,
      "status": "APPROVED"
    },
    {
      "paymentId": "A202601050003",
      "approvedAt": "2026-01-05T18:30:00",
      "merchantName": "무신사",
      "amount": 59000,
      "status": "APPROVED"
    }
  ]
}
```

### 주요 버튼

| 버튼명   | 동작                 |
| ----- | ------------------ |
| 연동 완료 | 카테고리 선택 화면으로 이동    |
| 건너뛰기  | 기본 카테고리 설정 화면으로 이동 |

---

# 5. 카테고리 설정

## 5.1 Step 4. 소비 카테고리 선택 화면

### 화면 목적

사용자가 관리하고 싶은 소비 카테고리를 선택한다.

### 주요 문구

```text
관리하고 싶은 소비 카테고리를 선택해주세요

선택한 카테고리를 기준으로
월 예산과 절약 챌린지를 설정할 수 있어요.
```

### 기본 카테고리

| 카테고리  | 설명                 | 아이콘 |
| ----- | ------------------ | --- |
| 식비    | 식당, 편의점, 점심        | 🍚  |
| 카페·간식 | 카페, 디저트, 간식        | ☕   |
| 쇼핑    | 의류, 온라인 쇼핑, 잡화     | 🛍️ |
| 배달    | 배달의민족, 쿠팡이츠, 요기요   | 🛵  |
| 교통    | 버스, 지하철, 택시        | 🚕  |
| 구독    | 넷플릭스, 유튜브 프리미엄, 멜론 | 📺  |
| 문화    | 영화, 공연, 전시         | 🎬  |
| 통신    | 휴대폰 요금, 인터넷        | 📱  |

### 기본 선택값

첫 화면에서는 다음 3개 카테고리를 기본 선택 상태로 보여준다.

```text
식비
카페·간식
쇼핑
```

### 주요 버튼

| 버튼명 | 동작                     |
| --- | ---------------------- |
| 다음  | 카테고리별 목표 금액 설정 화면으로 이동 |
| 이전  | 마이데이터 연동 안내 화면으로 이동    |

---

## 5.2 Step 5. 카테고리별 목표 금액 설정 화면

### 화면 목적

사용자가 선택한 카테고리별 월 예산 목표 금액을 설정한다.

이 화면은 제공된 와이어프레임 이미지를 기준으로 구현한다.

---

## 5.3 예산 설정 화면 레이아웃

### 상단 타이틀

```text
이번 달 예산
서로를 위해 지키고

원하는 예산을 설정하고
얼마나 썼는지 확인해보세요.
```

### 카드 상단 정보

```text
5월
총 220,000원 남음
```

### 카테고리별 표시 정보

각 카테고리는 다음 정보를 가진다.

| 항목       | 설명                   |
| -------- | -------------------- |
| 카테고리 아이콘 | 카테고리를 직관적으로 보여주는 아이콘 |
| 카테고리명    | 식비, 카페·간식, 쇼핑 등      |
| 목표 금액    | 사용자가 설정한 월 예산        |
| 현재 사용 금액 | 마이데이터 기반 현재 소비 금액    |
| 남은 금액    | 목표 금액 - 현재 사용 금액     |
| 진행률 바    | 목표 금액 대비 사용률         |

### 예시 화면 데이터

```json
{
  "month": "2026-05",
  "totalRemainingAmount": 220000,
  "categories": [
    {
      "category": "식비",
      "icon": "🍚",
      "targetAmount": 300000,
      "usedAmount": 250000,
      "remainingAmount": 50000,
      "progressRate": 83
    },
    {
      "category": "카페·간식",
      "icon": "☕",
      "targetAmount": 200000,
      "usedAmount": 130000,
      "remainingAmount": 70000,
      "progressRate": 65
    },
    {
      "category": "쇼핑",
      "icon": "🛍️",
      "targetAmount": 300000,
      "usedAmount": 200000,
      "remainingAmount": 100000,
      "progressRate": 67
    }
  ]
}
```

---

# 6. 금액 입력 방식

사용자는 각 카테고리의 목표 금액을 직접 입력할 수 있다.

### 입력 방식

1. 직접 입력
2. 금액 증감 버튼
3. 추천 예산 자동 입력

### 추천 예산

마이데이터 연동이 완료된 경우, KoPilot은 최근 소비 내역을 기반으로 추천 예산을 제안한다.

```text
최근 3개월 평균 카페·간식 소비는 260,000원이에요.
이번 달 목표를 20% 줄인 208,000원으로 설정해볼까요?
```

### 주요 버튼

| 버튼명      | 동작                           |
| -------- | ---------------------------- |
| 추천 예산 적용 | KoPilot 추천 금액을 각 카테고리에 자동 입력 |
| 예산 설정 완료 | 설정 완료 화면으로 이동                |
| 이전       | 카테고리 선택 화면으로 이동              |

---

# 7. 설정 완료 화면

## 7.1 Step 6. 설정 완료

### 화면 목적

초기 설정이 완료되었음을 안내하고 대시보드로 이동시킨다.

### 주요 문구

```text
예산 설정이 완료되었어요

이제 KoPilot이 소비를 분석하고
절약 챌린지를 추천해드릴게요.
```

### 주요 버튼

| 버튼명      | 동작                |
| -------- | ----------------- |
| 대시보드로 이동 | Dashboard Page 이동 |

---

# 8. 데이터 저장 구조

## 8.1 사용자 초기 설정 상태

```json
{
  "userId": 1,
  "firstLoginCompleted": true,
  "myDataConnected": true,
  "budgetSetupCompleted": true
}
```

---

## 8.2 사용자 카테고리 예산

```json
{
  "userId": 1,
  "month": "2026-05",
  "budgets": [
    {
      "category": "식비",
      "targetAmount": 300000
    },
    {
      "category": "카페·간식",
      "targetAmount": 200000
    },
    {
      "category": "쇼핑",
      "targetAmount": 300000
    }
  ]
}
```

---

## 8.3 마이데이터 결제내역 기반 예산 현황

```json
{
  "userId": 1,
  "month": "2026-05",
  "budgetStatus": [
    {
      "category": "식비",
      "targetAmount": 300000,
      "usedAmount": 250000,
      "remainingAmount": 50000,
      "progressRate": 83
    },
    {
      "category": "카페·간식",
      "targetAmount": 200000,
      "usedAmount": 130000,
      "remainingAmount": 70000,
      "progressRate": 65
    },
    {
      "category": "쇼핑",
      "targetAmount": 300000,
      "usedAmount": 200000,
      "remainingAmount": 100000,
      "progressRate": 67
    }
  ]
}
```

---

# 9. API 설계

## 9.1 첫 로그인 상태 조회

```http
GET /api/users/me/onboarding-status
```

### Response

```json
{
  "userId": 1,
  "firstLoginCompleted": false,
  "myDataConnected": false,
  "budgetSetupCompleted": false
}
```

---

## 9.2 마이데이터 연동 완료 처리

```http
POST /api/users/me/mydata/connect
```

### Request

```json
{
  "provider": "MYDATA",
  "connected": true
}
```

### Response

```json
{
  "userId": 1,
  "myDataConnected": true
}
```

---

## 9.3 카테고리 목록 조회

```http
GET /api/budget/categories
```

### Response

```json
{
  "categories": [
    {
      "category": "식비",
      "icon": "🍚",
      "description": "식당, 편의점, 점심"
    },
    {
      "category": "카페·간식",
      "icon": "☕",
      "description": "카페, 디저트, 간식"
    },
    {
      "category": "쇼핑",
      "icon": "🛍️",
      "description": "의류, 온라인 쇼핑, 잡화"
    },
    {
      "category": "배달",
      "icon": "🛵",
      "description": "배달의민족, 쿠팡이츠, 요기요"
    },
    {
      "category": "교통",
      "icon": "🚕",
      "description": "버스, 지하철, 택시"
    },
    {
      "category": "구독",
      "icon": "📺",
      "description": "OTT, 음악, 소프트웨어"
    },
    {
      "category": "문화",
      "icon": "🎬",
      "description": "영화, 공연, 전시"
    },
    {
      "category": "통신",
      "icon": "📱",
      "description": "휴대폰 요금, 인터넷"
    }
  ]
}
```

---

## 9.4 사용자 예산 설정

```http
POST /api/users/me/budgets
```

### Request

```json
{
  "month": "2026-05",
  "budgets": [
    {
      "category": "식비",
      "targetAmount": 300000
    },
    {
      "category": "카페·간식",
      "targetAmount": 200000
    },
    {
      "category": "쇼핑",
      "targetAmount": 300000
    }
  ]
}
```

### Response

```json
{
  "userId": 1,
  "month": "2026-05",
  "budgetSetupCompleted": true,
  "totalBudgetAmount": 800000
}
```

---

## 9.5 사용자 예산 현황 조회

```http
GET /api/users/me/budgets/status?month=2026-05
```

### Response

```json
{
  "month": "2026-05",
  "totalRemainingAmount": 220000,
  "categories": [
    {
      "category": "식비",
      "icon": "🍚",
      "targetAmount": 300000,
      "usedAmount": 250000,
      "remainingAmount": 50000,
      "progressRate": 83
    },
    {
      "category": "카페·간식",
      "icon": "☕",
      "targetAmount": 200000,
      "usedAmount": 130000,
      "remainingAmount": 70000,
      "progressRate": 65
    },
    {
      "category": "쇼핑",
      "icon": "🛍️",
      "targetAmount": 300000,
      "usedAmount": 200000,
      "remainingAmount": 100000,
      "progressRate": 67
    }
  ]
}
```

---

# 10. 상태 관리

## 10.1 온보딩 상태

| 상태                 | 설명            |
| ------------------ | ------------- |
| NOT_STARTED        | 첫 로그인 설정 시작 전 |
| MYDATA_GUIDE       | 마이데이터 연동 안내   |
| MYDATA_CONNECTING  | 마이데이터 연동 진행 중 |
| MYDATA_CONNECTED   | 마이데이터 연동 완료   |
| CATEGORY_SELECTING | 카테고리 선택 중     |
| BUDGET_SETTING     | 예산 설정 중       |
| COMPLETED          | 초기 설정 완료      |

---

# 11. 예외 상황

## 11.1 마이데이터 연동 실패

### 상황

마이데이터 연동 중 오류가 발생한 경우

### 처리 문구

```text
마이데이터 연동에 실패했어요.
잠시 후 다시 시도하거나, 기본 설정으로 시작할 수 있어요.
```

### 버튼

| 버튼명        | 동작              |
| ---------- | --------------- |
| 다시 시도      | 마이데이터 연동 재시도    |
| 기본 설정으로 시작 | 카테고리 선택 화면으로 이동 |

---

## 11.2 예산 미입력

### 상황

선택한 카테고리 중 목표 금액이 입력되지 않은 경우

### 처리 문구

```text
선택한 카테고리의 예산을 모두 입력해주세요.
```

---

## 11.3 예산 금액이 0원 이하

### 상황

목표 금액이 0원 이하인 경우

### 처리 문구

```text
예산은 1원 이상으로 설정해주세요.
```

---

# 12. 디자인 요구사항

## 12.1 전체 톤

* 부드럽고 신뢰감 있는 금융 서비스 톤
* 복잡한 금융 앱 느낌보다는 친근한 소비 코치 느낌
* 흰색 배경 기반
* 파란색 계열을 주요 포인트 컬러로 사용
* 둥근 카드와 넉넉한 여백을 사용한다.

---

## 12.2 예산 설정 카드

제공된 와이어프레임 이미지와 같이 둥근 카드 형태로 구성한다.

### 카드 스타일

```css
background: #FFFFFF;
border-radius: 32px;
box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
padding: 32px;
```

### 진행률 바

```css
background: #E5E7EB;
height: 8px;
border-radius: 999px;
```

진행된 부분은 파란색 계열로 표시한다.

```css
background: #3B82F6;
height: 8px;
border-radius: 999px;
```

### 텍스트 스타일

| 요소       | 스타일      |
| -------- | -------- |
| 메인 타이틀   | 크고 굵은 폰트 |
| 서브 타이틀   | 회색 계열    |
| 카테고리명    | 중간 굵기    |
| 남은 금액    | 회색 계열    |
| 전체 남은 금액 | 강조 텍스트   |

---

# 13. Codex 구현 요청사항

Codex는 이 문서를 기준으로 첫 로그인 온보딩 화면을 구현한다.

## 13.1 구현해야 할 페이지

프로젝트 구조에 맞게 다음 중 하나로 구현한다.

```text
src/pages/FirstLoginPage.tsx
src/app/first-login/page.tsx
```

라우팅 경로는 다음을 권장한다.

```text
/first-login
```

---

## 13.2 구현해야 할 주요 컴포넌트

```text
FirstLoginPage
OnboardingStepContainer
WelcomeStep
MyDataConnectStep
CategorySelectStep
BudgetSettingStep
BudgetCategoryCard
OnboardingCompleteStep
```

---

## 13.3 구현해야 할 핵심 기능

1. 첫 로그인 사용자의 온보딩 플로우를 제공한다.
2. 마이데이터 연동 안내 화면을 제공한다.
3. 마이데이터 연동 버튼을 제공한다.
4. 마이데이터 연동 완료 또는 건너뛰기 처리를 제공한다.
5. 소비 카테고리를 선택할 수 있다.
6. 선택한 카테고리별 목표 금액을 입력할 수 있다.
7. 예산 설정 완료 시 대시보드로 이동한다.
8. 예산 설정 화면은 제공된 와이어프레임 이미지의 스타일을 따른다.
9. 실제 API가 없으면 mock data를 사용한다.

---

# 14. Mock Data

## 14.1 예산 카테고리 mock data

```ts
export const mockBudgetCategories = [
  {
    id: 1,
    name: "식비",
    icon: "🍚",
    targetAmount: 300000,
    usedAmount: 250000,
    remainingAmount: 50000,
    progressRate: 83,
  },
  {
    id: 2,
    name: "카페·간식",
    icon: "☕",
    targetAmount: 200000,
    usedAmount: 130000,
    remainingAmount: 70000,
    progressRate: 65,
  },
  {
    id: 3,
    name: "쇼핑",
    icon: "🛍️",
    targetAmount: 300000,
    usedAmount: 200000,
    remainingAmount: 100000,
    progressRate: 67,
  },
];
```

---

## 14.2 선택 가능 카테고리 mock data

```ts
export const mockSelectableCategories = [
  {
    id: 1,
    name: "식비",
    icon: "🍚",
    description: "식당, 편의점, 점심",
    selected: true,
  },
  {
    id: 2,
    name: "카페·간식",
    icon: "☕",
    description: "카페, 디저트, 간식",
    selected: true,
  },
  {
    id: 3,
    name: "쇼핑",
    icon: "🛍️",
    description: "의류, 온라인 쇼핑, 잡화",
    selected: true,
  },
  {
    id: 4,
    name: "배달",
    icon: "🛵",
    description: "배달의민족, 쿠팡이츠, 요기요",
    selected: false,
  },
  {
    id: 5,
    name: "교통",
    icon: "🚕",
    description: "버스, 지하철, 택시",
    selected: false,
  },
  {
    id: 6,
    name: "구독",
    icon: "📺",
    description: "OTT, 음악, 소프트웨어",
    selected: false,
  },
];
```

---

# 15. 완료 기준

다음 조건을 만족하면 구현 완료로 본다.

* 첫 로그인 사용자가 온보딩 페이지로 진입할 수 있다.
* 마이데이터 연동 안내 화면이 존재한다.
* 마이데이터 연동 버튼이 존재한다.
* 마이데이터 연동 건너뛰기 버튼이 존재한다.
* 카테고리 선택 화면이 존재한다.
* 사용자가 관리할 카테고리를 선택할 수 있다.
* 카테고리별 예산 목표 금액을 입력할 수 있다.
* 예산 설정 화면이 와이어프레임과 유사한 카드 UI로 표현된다.
* 설정 완료 후 대시보드로 이동한다.
* mock data만으로도 전체 화면 흐름을 확인할 수 있다.

---

# 16. Codex에게 전달할 구현 프롬프트

```text
docs/features/first-login.md 문서를 기준으로 KoPilot의 첫 로그인 온보딩 페이지를 구현해줘.

첫 로그인 사용자는 다음 순서로 진행해야 해.

1. 환영 화면
2. 마이데이터 연동 안내
3. 마이데이터 연동 완료 또는 건너뛰기
4. 소비 카테고리 선택
5. 카테고리별 예산 목표 금액 설정
6. 설정 완료
7. 대시보드 이동

예산 설정 화면은 첨부한 와이어프레임처럼 큰 타이틀, 둥근 카드, 카테고리별 남은 금액, 진행률 바를 포함해야 해.

실제 API가 없으면 first-login.md에 있는 mock data를 사용해서 구현해줘.
```

```
```
