function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function requestJson(url, token) {
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(token),
  })
  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data?.message || '투자효과 데이터를 불러오지 못했습니다.')
    error.code = data?.code
    error.meta = data?.meta
    error.debug = data?.debug
    throw error
  }

  return data
}

export async function getInvestmentEffectSimulation(token, { month, category = 'coffee', assetCodes = [] } = {}) {
  const query = new URLSearchParams()

  if (month) query.set('month', month)
  if (category) query.set('category', category)
  if (assetCodes.length) query.set('assetCodes', assetCodes.join(','))

  return requestJson(`/api/users/me/investment-effect/simulation?${query.toString()}`, token)
}

export async function getInvestmentAssets(token, { keyword = '', limit = 20 } = {}) {
  const query = new URLSearchParams({ limit: String(limit) })

  if (keyword.trim()) query.set('keyword', keyword.trim())

  return requestJson(`/api/investment/assets/search?${query.toString()}`, token)
}
