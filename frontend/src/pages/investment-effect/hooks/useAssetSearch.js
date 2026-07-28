import { useEffect, useState } from 'react'
import { getInvestmentAssets } from '../../../services/investment.js'

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
        const result = await getInvestmentAssets(token, { limit: 20 })
        const items = (result.items || []).slice(0, 20)

        if (!ignore) {
          setDefaultAssets(items)
          setSearchResults(items)
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
        const result = await getInvestmentAssets(token, {
          keyword,
          limit: 20,
        })

        if (!ignore) {
          setSearchResults((result.items || []).slice(0, 20))
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
