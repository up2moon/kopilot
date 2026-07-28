import { useEffect, useState } from 'react'
import { searchInvestmentAssets } from '../../../services/investment.js'

export default function useAssetSearch(token) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    let ignore = false
    const keyword = searchKeyword.trim()

    if (keyword.length < 2) {
      setSearchResults([])
      setSearchError('')
      setIsSearching(false)
      return undefined
    }

    setIsSearching(true)
    setSearchError('')

    const timerId = window.setTimeout(async () => {
      try {
        const result = await searchInvestmentAssets(token, keyword)

        if (!ignore) {
          setSearchResults(result.items || [])
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
    }, 350)

    return () => {
      ignore = true
      window.clearTimeout(timerId)
    }
  }, [token, searchKeyword])

  const clearSearch = () => {
    setSearchKeyword('')
    setSearchResults([])
  }

  return {
    searchKeyword,
    searchResults,
    isSearching,
    searchError,
    setSearchKeyword,
    clearSearch,
  }
}
