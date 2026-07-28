import { useEffect, useState } from 'react'
import {
  getConsumptionDna,
  getTopRankings,
} from '../../../services/ranking.js'

export default function useAnonymousRanking(token) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [myRanking, setMyRanking] = useState(null)
  const [topRankings, setTopRankings] = useState([])
  const [notice, setNotice] = useState('1시간마다 갱신')
  const [consumptionDna, setConsumptionDna] = useState(null)
  const [dnaError, setDnaError] = useState('')
  const [dnaLoading, setDnaLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')
        setDnaLoading(true)
        setDnaError('')

        try {
          setConsumptionDna(await getConsumptionDna(token))
        } catch (dnaErr) {
          setDnaError(dnaErr.message)
        } finally {
          setDnaLoading(false)
        }

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

  const refreshDna = async () => {
    try {
      setDnaLoading(true)
      setDnaError('')
      setConsumptionDna(
        await getConsumptionDna(token, { refresh: true }),
      )

      const result = await getTopRankings(token, 20)
      setMyRanking(result.myRanking)
      setTopRankings(result.topRankings || [])
    } catch (err) {
      setDnaError(err.message)
    } finally {
      setDnaLoading(false)
    }
  }

  return {
    loading,
    error,
    myRanking,
    topRankings,
    notice,
    consumptionDna,
    dnaError,
    dnaLoading,
    refreshDna,
  }
}
