import { useCallback, useEffect, useState } from 'react'
import {
  getWeeklyChallenges,
  verifyChallenge,
} from '../../../services/challenges.js'

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function useChallenges(token) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [verifyingChallengeId, setVerifyingChallengeId] = useState(null)

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

  const verify = async (challenge) => {
    if (!challenge || verifyingChallengeId) return

    try {
      setVerifyingChallengeId(challenge.id)
      setVerifyMessage('')
      const [result] = await Promise.all([
        verifyChallenge(token, challenge.id),
        wait(550),
      ])
      setVerifyMessage(result.message)
      await loadChallenges(false)
    } catch (err) {
      setVerifyMessage(err.message || '챌린지 인증에 실패했습니다.')
    } finally {
      setVerifyingChallengeId(null)
    }
  }

  return {
    data,
    loading,
    error,
    verifyMessage,
    verifyingChallengeId,
    loadChallenges,
    verify,
  }
}
