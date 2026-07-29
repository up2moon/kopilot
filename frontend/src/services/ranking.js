export async function getMyRanking(token) {
  const response = await fetch('/api/users/me/ranking', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '내 랭킹 정보를 불러오지 못했습니다.')
  }

  return data
}

export async function getTopRankings(token, limit = 20) {
  const response = await fetch(`/api/users/ranking/top?limit=${limit}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '상위 랭킹 리스트를 불러오지 못했습니다.')
  }

  return data
}

const ranking = {
  getMyRanking,
  getTopRankings,
}

export default ranking
