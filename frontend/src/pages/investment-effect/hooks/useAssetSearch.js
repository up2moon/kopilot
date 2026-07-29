import { useEffect, useState } from 'react'
import { getInvestmentAssets } from '../../../services/investment.js'
import {
  mockInvestmentAssets,
  useMockInvestment,
} from '../data/mockInvestment.js'

const SEARCH_DEBOUNCE_MS = 300

export default function useAssetSearch(token) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [defaultAssets, setDefaultAssets] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(true)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadDefaultAssets() {
      if (!token) return

      setIsSearching(true)
      setSearchError('')

      try {
        const items = useMockInvestment
          ? mockInvestmentAssets
          : (await getInvestmentAssets(token, { limit: 20 })).items || []

        if (!ignore) {
          setDefaultAssets(items.slice(0, 20))
          setSearchResults(items.slice(0, 20))
        }
      } catch (err) {
        if (!ignore) {
          setSearchError(err.message)
          setDefaultAssets([])
          setSearchResults([])
        }
      } finally {
        if (!ignore) {
          setIsSearching(false)
        }
      }
    }

    loadDefaultAssets()

    return () => {
      ignore = true
    }
  }, [token])

  useEffect(() => {
    let ignore = false
    const keyword = searchKeyword.trim()

    if (!keyword) {
      setSearchResults(defaultAssets)
      setSearchError('')
      setIsSearching(false)
      return undefined
    }

    setIsSearching(true)
    setSearchError('')

    const timerId = window.setTimeout(async () => {
      try {
        const items = useMockInvestment
          ? mockInvestmentAssets.filter(
              (asset) =>
                asset.label.toLowerCase().includes(keyword.toLowerCase()) ||
                asset.assetCode.includes(keyword),
            )
          : (
              await getInvestmentAssets(token, {
                keyword,
                limit: 20,
              })
            ).items || []

        if (!ignore) {
          setSearchResults(items.slice(0, 20))
        }
      } catch (err) {
        if (!ignore) {
          setSearchError(err.message)
          setSearchResults([])
        }
      } finally {
        if (!ignore) {
          setIsSearching(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      ignore = true
      window.clearTimeout(timerId)
    }
  }, [token, searchKeyword, defaultAssets])

  const clearSearch = () => {
    setSearchKeyword('')
  }

  return {
    searchKeyword,
    searchResults,
    totalAssetCount: searchResults.length,
    isSearching,
    searchError,
    setSearchKeyword,
    clearSearch,
  }
}
