async function requestJson(endpoint, { method = 'GET', token, body } = {}) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '요청 처리 중 오류가 발생했습니다.')
  }

  return data
}

export function getBudgetCategories(token) {
  return requestJson('/api/budget/categories', {
    token,
  })
}

export function getOnboardingStatus(token) {
  return requestJson('/api/users/me/onboarding-status', {
    token,
  })
}

export function connectMyData(token) {
  return requestJson('/api/users/me/mydata/connect', {
    method: 'POST',
    token,
  })
}

export function skipBudgetGoals(token) {
  return requestJson('/api/users/me/onboarding/skip-goals', {
    method: 'POST',
    token,
  })
}

export function getTransactions(token) {
  return requestJson('/api/users/me/transactions', {
    token,
  })
}

export function saveBudgets(token, payload) {
  return requestJson('/api/users/me/budgets', {
    method: 'POST',
    token,
    body: payload,
  })
}
