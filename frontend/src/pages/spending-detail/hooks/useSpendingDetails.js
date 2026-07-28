import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../../../services/dashboard'

export default function useSpendingDetails(token) {
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadData() {
      if (!token) return

      setIsLoading(true)
      setErrorMessage('')

      try {
        const result = await getDashboardSummary(token, period)

        if (!ignore) {
          setData(result)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err.message)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [token, period])

  return {
    data,
    isLoading,
    errorMessage,
    period,
    setPeriod,
  }
}
