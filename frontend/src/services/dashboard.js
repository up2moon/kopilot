export async function getDashboardSummary(token, period = 'month', signal) {
  const query = new URLSearchParams({ period }).toString()
  const response = await fetch(`/api/users/me/spending/summary?${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '대시보드 데이터를 불러오지 못했습니다.')
  }

  return data
}
