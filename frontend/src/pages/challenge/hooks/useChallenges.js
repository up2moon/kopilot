import { useCallback, useEffect, useState } from 'react'
import {
  getWeeklyChallenges,
  verifyWeeklyChallenges,
} from '../../../services/challenges.js'

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function useChallenges(token) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [celebrationKey, setCelebrationKey] = useState(0)

  const loadChallenges = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true)
        setError('')
        setData(await getWeeklyChallenges(token))
      } catch (err) {
        setError(err.message || '챌린지 정보를 불러오지 못했습니다.')
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (token) loadChallenges()
  }, [loadChallenges, token])

  const verify = async () => {
    if (verifying || !data?.canVerify) return

    try {
      setVerifying(true)
      setVerifyMessage('')
      const [result] = await Promise.all([
        verifyWeeklyChallenges(token),
        wait(550),
      ])
      setVerifyMessage(result.message)
      setVerificationResult(result)
      if (result.showCelebration) {
        setCelebrationKey((current) => current + 1)
      }
      await loadChallenges(false)
    } catch (err) {
      setVerifyMessage(err.message || '챌린지 인증에 실패했습니다.')
    } finally {
      setVerifying(false)
    }
  }

  return {
    data,
    loading,
    error,
    verifyMessage,
    verifying,
    verificationResult,
    celebrationKey,
    loadChallenges,
    verify,
  }
}
