import { useEffect, useState } from 'react'
import { getInvestmentEffectSimulation } from '../../../services/investment.js'
import {
  createMockInvestmentSimulation,
  useMockInvestment,
} from '../data/mockInvestment.js'
import { getCurrentMonth } from '../utils/formatters'

const supportedCategories = new Set([
  'savings',
  'coffee',
  'food',
  'delivery',
  'transport',
  'shopping',
  'subscription',
  'all',
])

function getInitialMonth() {
  const month = new URLSearchParams(window.location.search).get('month')
  return /^\d{4}-\d{2}$/.test(month || '') ? month : getCurrentMonth()
}

function getInitialCategory() {
  const category = new URLSearchParams(window.location.search).get('category')
  return supportedCategories.has(category) ? category : 'coffee'
}

export default function useInvestmentSimulation(token) {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth)
  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory)
  const [selectedAssets, setSelectedAssets] = useState([])
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [errorDebug, setErrorDebug] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadSimulation() {
      if (!token || !selectedMonth) return

      setIsLoading(true)
      setErrorMessage('')
      setErrorCode('')
      setErrorDebug(null)

      try {
        const result = useMockInvestment
          ? createMockInvestmentSimulation({
              month: selectedMonth,
              category: selectedCategory,
              selectedAssets,
            })
          : await getInvestmentEffectSimulation(token, {
              month: selectedMonth,
              category: selectedCategory,
              assetCodes: selectedAssets.map((asset) => asset.assetCode),
            })

        if (!ignore) {
          setData(result)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err.message)
          setErrorCode(err.code || '')
          setErrorDebug(err.debug || null)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadSimulation()

    return () => {
      ignore = true
    }
  }, [token, selectedMonth, selectedCategory, selectedAssets])

  const selectAsset = (asset) => {
    setData((current) =>
      current
        ? {
            ...current,
            comparisons: [],
          }
        : current,
    )
    setSelectedAssets([asset])
  }

  return {
    selectedMonth,
    selectedCategory,
    selectedAssets,
    data,
    isLoading,
    isRefreshing: isLoading && Boolean(data),
    errorMessage,
    errorCode,
    errorDebug,
    setSelectedMonth,
    setSelectedCategory,
    selectAsset,
  }
}
