import { useCallback, useEffect, useState } from 'react'
import {
  getWeeklyChallenges,
  verifyWeeklyChallenges,
} from '../../../services/challenges.js'

const CHALLENGE_HIGHLIGHT_STORAGE_KEY = 'kopilot:new-challenge-highlight'

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
  const [highlightedChallengeId, setHighlightedChallengeId] = useState(null)

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

  useEffect(() => {
    if (!data?.weeklyChallenges?.length) return

    let storedHighlight

    try {
      const rawHighlight = window.sessionStorage.getItem(
        CHALLENGE_HIGHLIGHT_STORAGE_KEY,
      )

      if (!rawHighlight) return
      window.sessionStorage.removeItem(CHALLENGE_HIGHLIGHT_STORAGE_KEY)
      storedHighlight = JSON.parse(rawHighlight)
    } catch {
      return
    }

    const challengeId = Number(storedHighlight?.challengeId)
    const isFresh = Number(storedHighlight?.expiresAt) > Date.now()
    const challengeExists = data.weeklyChallenges.some(
      (challenge) => Number(challenge.id) === challengeId,
    )

    if (isFresh && challengeExists) {
      setHighlightedChallengeId(challengeId)
    }
  }, [data])

  useEffect(() => {
    if (!highlightedChallengeId) return undefined

    const timer = window.setTimeout(() => {
      setHighlightedChallengeId(null)
    }, 4_000)

    return () => window.clearTimeout(timer)
  }, [highlightedChallengeId])

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
    highlightedChallengeId,
    loadChallenges,
    verify,
  }
}
