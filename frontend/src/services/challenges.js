export async function getWeeklyChallenges(token) {
  const response = await fetch('/api/users/me/challenges', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '챌린지 정보를 불러오지 못했습니다.')
  }

  return data
}

export async function verifyChallenge(token, challengeId) {
  const response = await fetch(`/api/users/me/challenges/${challengeId}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || '챌린지 인증에 실패했습니다.')
  }
  return data
}
