function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function requestJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...options.headers,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data?.message || '자산 목표 정보를 불러오지 못했습니다.')
    error.code = data?.code
    throw error
  }

  return data
}

export function getAssetGoalAnalysis(token) {
  return requestJson('/api/users/me/asset-goals/analysis', token)
}

export function getActiveAssetGoal(token) {
  return requestJson('/api/users/me/asset-goals/active', token)
}

export function createAssetGoal(token, payload) {
  return requestJson('/api/users/me/asset-goals', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAssetGoalRatio(token, goalId, selectedInvestmentRatio) {
  return requestJson(`/api/users/me/asset-goals/${goalId}/ratio`, token, {
    method: 'PATCH',
    body: JSON.stringify({ selectedInvestmentRatio }),
  })
}

export function getAssetGoalRoadmap(token, goalId) {
  return requestJson(`/api/users/me/asset-goals/${goalId}/roadmap`, token)
}

export function createInvestmentContribution(token, goalId, payload) {
  return requestJson(`/api/users/me/asset-goals/${goalId}/contributions`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getTransactionOpportunity(token, transactionId) {
  return requestJson(
    `/api/users/me/transactions/${transactionId}/opportunity`,
    token,
  )
}
