export async function getRewardPoints(token) {
  const response = await fetch('/api/users/me/reward-points', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '포인트를 불러오지 못했습니다.')
  }

  return {
    totalPoints: Number(data?.totalPoints || 0),
  }
}
