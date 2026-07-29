import { useEffect, useState } from 'react'
import { getTopRankings } from '../../../services/ranking.js'

export default function useAnonymousRanking(token) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [myRanking, setMyRanking] = useState(null)
  const [topRankings, setTopRankings] = useState([])
  const [notice, setNotice] = useState('1시간마다 갱신')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const result = await getTopRankings(token, 20)
        setMyRanking(result.myRanking)
        setTopRankings(result.topRankings || [])

        if (result.updatedAtNotice) {
          setNotice(result.updatedAtNotice)
        }
      } catch (err) {
        console.error('Failed to load ranking data:', err)
        setError(err.message || '랭킹 정보를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadData()
    }
  }, [token])

  return {
    loading,
    error,
    myRanking,
    topRankings,
    notice,
  }
}
