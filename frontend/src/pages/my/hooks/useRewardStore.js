import { useCallback, useEffect, useMemo, useState } from 'react'
import { getRewardPoints } from '../../../services/rewards.js'
import { mockRewardProducts } from '../data/mockRewards.js'

const rewardStoragePrefix = 'kopilot.rewardStore.v2'

function getStorageKey(userKey) {
  return `${rewardStoragePrefix}.${userKey || 'demo'}`
}

function getInitialPurchases(userKey) {
  try {
    const storedState = JSON.parse(
      window.localStorage.getItem(getStorageKey(userKey)),
    )

    if (Array.isArray(storedState?.purchases)) {
      return storedState.purchases
    }
  } catch {
    // 저장된 mock 데이터가 손상된 경우 초기 상태로 복구한다.
  }

  return []
}

function savePurchases(userKey, purchases) {
  try {
    window.localStorage.setItem(
      getStorageKey(userKey),
      JSON.stringify({ purchases }),
    )
  } catch {
    // 저장할 수 없어도 현재 세션의 구매 흐름은 유지한다.
  }
}

function createGiftCode(productId, purchasedAt) {
  const seed = `${productId}-${purchasedAt}`
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return String(hash).padStart(12, '0').slice(-12)
}

export default function useRewardStore(token, userKey) {
  const [totalPoints, setTotalPoints] = useState(null)
  const [pointsLoading, setPointsLoading] = useState(true)
  const [pointsError, setPointsError] = useState('')
  const [purchases, setPurchases] = useState(() =>
    getInitialPurchases(userKey),
  )

  const loadPoints = useCallback(async () => {
    if (!token) return

    try {
      setPointsLoading(true)
      setPointsError('')
      const result = await getRewardPoints(token)
      setTotalPoints(result.totalPoints)
    } catch (error) {
      setPointsError(error.message || '포인트를 불러오지 못했습니다.')
    } finally {
      setPointsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadPoints()
  }, [loadPoints])

  const purchasedGifts = useMemo(
    () =>
      purchases
        .map((purchase) => {
          const product = mockRewardProducts.find(
            (item) => item.id === purchase.productId,
          )

          return product ? { ...purchase, product } : null
        })
        .filter(Boolean),
    [purchases],
  )

  const spentPoints = useMemo(
    () =>
      purchasedGifts.reduce(
        (sum, gift) =>
          sum + Number(gift.pointsSpent ?? gift.product.points),
        0,
      ),
    [purchasedGifts],
  )
  const availablePoints =
    totalPoints === null ? null : Math.max(totalPoints - spentPoints, 0)

  const purchaseProduct = (product) => {
    if (
      !product ||
      availablePoints === null ||
      availablePoints < product.points
    ) {
      return null
    }

    const purchasedAt = new Date().toISOString()
    const purchase = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      pointsSpent: product.points,
      purchasedAt,
      giftCode: createGiftCode(product.id, purchasedAt),
    }
    const nextPurchases = [purchase, ...purchases]

    setPurchases(nextPurchases)
    savePurchases(userKey, nextPurchases)

    return { ...purchase, product }
  }

  return {
    points: availablePoints,
    earnedPoints: totalPoints,
    spentPoints,
    pointsLoading,
    pointsError,
    purchasedGifts,
    purchaseProduct,
    reloadPoints: loadPoints,
  }
}
