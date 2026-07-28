import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../../../services/dashboard'
import { getSavingBotCoaching } from '../../../services/savingBot'

export default function useDashboardData(token) {
  const [data, setData] = useState(null)
  const [coaching, setCoaching] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    async function loadData() {
      if (!token) return

      setIsLoading(true)
      setErrorMessage('')
      const [dashboardResult, coachingResult] = await Promise.allSettled([
        getDashboardSummary(token, 'month', controller.signal),
        getSavingBotCoaching(token, controller.signal),
      ])

      if (ignore) return

      if (dashboardResult.status === 'fulfilled') {
        setData(dashboardResult.value)
      } else if (dashboardResult.reason.name !== 'AbortError') {
        setErrorMessage(dashboardResult.reason.message)
      }

      if (coachingResult.status === 'fulfilled') {
        setCoaching(coachingResult.value)
      }

      setIsLoading(false)
    }

    loadData()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [token])

  return {
    data,
    coaching,
    isLoading,
    errorMessage,
  }
}
