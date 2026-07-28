import { useEffect, useState } from 'react'
import { getInvestmentEffectSimulation } from '../../../services/investment.js'
import { getCurrentMonth } from '../utils/formatters'

export default function useInvestmentSimulation(token) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [selectedCategory, setSelectedCategory] = useState('coffee')
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
        const result = await getInvestmentEffectSimulation(token, {
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
          setData(null)
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
    setSelectedAssets([asset])
  }

  return {
    selectedMonth,
    selectedCategory,
    selectedAssets,
    data,
    isLoading,
    errorMessage,
    errorCode,
    errorDebug,
    setSelectedMonth,
    setSelectedCategory,
    selectAsset,
  }
}
