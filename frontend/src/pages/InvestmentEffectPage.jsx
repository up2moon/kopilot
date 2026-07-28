import { useEffect, useState } from 'react'
import { getInvestmentEffectSimulation, searchInvestmentAssets } from '../services/investment.js'
import NavigationPageLayout from '../components/NavigationPageLayout'
import './InvestmentEffectPage.css'

const isDeveloperMode =
  import.meta.env.DEV || import.meta.env.VITE_INVESTMENT_DEBUG_ERRORS === 'true'

function formatWon(value) {
  const number = Number(value) || 0
  const sign = number < 0 ? '-' : ''

  return `${sign}${Math.abs(number).toLocaleString('ko-KR')}원`
}

function formatGain(value) {
  const number = Number(value) || 0
  const sign = number > 0 ? '+' : number < 0 ? '-' : ''

  return `${sign}${Math.abs(number).toLocaleString('ko-KR')}원`
}

function formatRate(value) {
  const number = Number(value) || 0
  const sign = number > 0 ? '+' : ''

  return `${sign}${(number * 100).toFixed(1)}%`
}

function formatPrice(value) {
  const number = Number(value) || 0

  return number ? `${number.toLocaleString('ko-KR')}원` : '-'
}

function getCurrentMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getAssetKey(asset) {
  return `${asset.assetType}:${asset.assetCode}`
}

const categoryOptions = [
  { value: 'coffee', label: '카페·간식' },
  { value: 'food', label: '식비' },
  { value: 'delivery', label: '배달' },
  { value: 'transport', label: '교통' },
  { value: 'shopping', label: '쇼핑' },
  { value: 'subscription', label: '구독' },
  { value: 'all', label: '전체' },
]

function SimulationRow({ asset, compact = false }) {
  const isLoss = Number(asset.estimatedGain) < 0

  return (
    <article className={`investment-result-row${compact ? ' is-compact' : ''}`}>
      <div className="investment-asset-left">
        <span className="investment-asset-icon" aria-hidden="true">{asset.icon || '📊'}</span>
        <div>
          <strong>{asset.label}</strong>
          <span>{asset.description || asset.market || asset.assetType}</span>
          {asset.currentPrice && (
            <small>
              현재가 {formatPrice(asset.currentPrice)}
              {asset.currentTradeDate ? ` · ${asset.currentTradeDate}` : ''}
            </small>
          )}
        </div>
      </div>
      <div className="investment-asset-right">
        <strong>{formatWon(asset.estimatedValue)}</strong>
        <span className={isLoss ? 'is-loss' : 'is-gain'}>{formatGain(asset.estimatedGain)}</span>
      </div>
    </article>
  )
}

export default function InvestmentEffectPage({ token }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [selectedCategory, setSelectedCategory] = useState('coffee')
  const [selectedAssets, setSelectedAssets] = useState([])
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [errorDebug, setErrorDebug] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

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

  const handleSelectAsset = (asset) => {
    setSelectedAssets([asset])
    setSearchKeyword('')
    setSearchResults([])
  }

  const primaryBenchmark = data?.benchmarks?.[0]
  const selectedComparisons = data?.comparisons || []
  const investmentAmount = data?.investmentAmount ?? data?.spendingAmount ?? data?.savedAmount

  return (
    <NavigationPageLayout
      className="investment-page"
      title="투자효과"
      content="소비한 돈을 투자했다면 현재 얼마인지 계산해요."
    >

      <label className="investment-month-picker">
        <span>조회 월</span>
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          aria-label="조회 월"
        />
      </label>

      <div className="investment-category-tabs" aria-label="소비 카테고리 선택">
        {categoryOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            className={selectedCategory === option.value ? 'is-active' : ''}
            onClick={() => setSelectedCategory(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="investment-state-card">
          <div className="investment-spinner" />
          <p>코스콤 CHECK API로 시세를 조회하고 있어요.</p>
        </div>
      ) : errorMessage ? (
        <div className="investment-state-card">
          <strong>
            {errorCode === 'KOSCOM_CONFIG_MISSING'
              ? '시세 조회 설정이 필요해요'
              : errorCode === 'PRICE_HISTORY_MISSING'
                ? '기준일 종가가 아직 없어요'
                : errorCode === 'CURRENT_PRICE_MISSING'
                  ? '현재 시세가 아직 없어요'
                  : errorCode.startsWith('KOSCOM_')
                    ? '코스콤 시세 응답을 확인해주세요'
                  : '시세를 불러오지 못했어요'}
          </strong>
          <p>{errorMessage}</p>
          {errorCode === 'KOSCOM_CONFIG_MISSING' && (
            <span>CUST_ID와 AUTH_KEY가 백엔드 환경 변수로 설정되어 있어야 합니다.</span>
          )}
          {errorCode === 'PRICE_HISTORY_MISSING' && (
            <span>코스콤 종가 동기화가 완료된 월부터 투자효과를 계산할 수 있습니다.</span>
          )}
          {errorCode === 'CURRENT_PRICE_MISSING' && (
            <span>현재가 동기화 후 다시 계산해주세요. 기준일 가격만으로 결과를 만들지 않습니다.</span>
          )}
          {isDeveloperMode && errorDebug && (
            <details className="investment-error-debug">
              <summary>실패 상세</summary>
              <pre>{JSON.stringify(errorDebug, null, 2)}</pre>
            </details>
          )}
        </div>
      ) : (
        <>
          <section className="investment-hero-card">
            <span>{data?.summaryText || '선택한 월 소비액을 기준으로 계산했어요.'}</span>
            <strong>{formatWon(investmentAmount)}</strong>
            <p>
              {primaryBenchmark
                ? `${primaryBenchmark.label} 기준 현재 약 ${formatWon(primaryBenchmark.estimatedValue)}으로 계산돼요.`
                : data?.assumptionText}
            </p>
            <small>{data?.disclaimer}</small>
          </section>

          <section className="investment-section">
            <div className="investment-section-heading">
              <h2>기본 지수 비교</h2>
              <span>{data?.assumptionText}</span>
            </div>

            <div className="investment-results">
              {(data?.benchmarks || []).map((asset) => (
                <SimulationRow key={asset.assetCode} asset={asset} />
              ))}
            </div>
          </section>

          <section className="investment-search-card">
            <h2>궁금한 주식·ETF 검색</h2>
            <p>선택한 소비액을 이 종목에 투자했다면 현재 얼마인지 계산해요.</p>

            <label className="investment-search-input">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="삼성전자, KOSPI ETF 검색"
              />
            </label>

            {isSearching && <div className="investment-search-note">검색 중...</div>}
            {searchError && <div className="investment-search-note is-error">{searchError}</div>}
            {!isSearching && !searchError && searchKeyword.trim().length >= 2 && searchResults.length === 0 && (
              <div className="investment-search-note">
                검색 결과가 없어요. 종목 마스터 동기화 후 다시 검색해주세요.
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="investment-search-results">
                {searchResults.map((asset) => (
                  <button
                    type="button"
                    key={getAssetKey(asset)}
                    onClick={() => handleSelectAsset(asset)}
                  >
                    <span>{asset.icon || '📊'}</span>
                    <strong>{asset.label}</strong>
                    <small>{asset.assetCode}</small>
                    <em>계산하기</em>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedAssets.length > 0 && selectedComparisons.length === 0 && (
            <section className="investment-selected-list">
              <article className="investment-selected-card">
                <div>
                  <span>계산 대상</span>
                  <strong>
                    {selectedAssets.map((asset) => asset.label).join(', ')}
                  </strong>
                  <small>시세를 불러오면 결과가 표시됩니다.</small>
                </div>
              </article>
            </section>
          )}

          {selectedComparisons.length > 0 && (
            <section className="investment-selected-list">
              {selectedComparisons.map((selectedComparison) => (
                <article className="investment-selected-card" key={selectedComparison.assetCode}>
                  <div>
                    <span>내가 고른 종목</span>
                    <strong>
                      {selectedComparison.label}에 투자했다면
                      <br />
                      현재 약 {formatWon(selectedComparison.estimatedValue)}
                    </strong>
                    <small>{selectedComparison.assumedBuyDate} 기준 매수 가정</small>
                    <dl className="investment-price-meta">
                      <div>
                        <dt>현재가</dt>
                        <dd>{formatPrice(selectedComparison.currentPrice)}</dd>
                      </div>
                      <div>
                        <dt>기준가</dt>
                        <dd>{formatPrice(selectedComparison.basePrice)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="investment-selected-result">
                    <strong className={selectedComparison.estimatedGain < 0 ? 'is-loss' : 'is-gain'}>
                      {formatGain(selectedComparison.estimatedGain)}
                    </strong>
                    <span>{formatRate(selectedComparison.returnRate)}</span>
                  </div>
                </article>
              ))}
            </section>
          )}

          <p className="investment-disclaimer">
            본 화면은 소비액의 기회비용을 이해하기 위한 참고용 시뮬레이션입니다. 투자 권유 또는 금융상품 추천이 아니며, 과거 수익률은 미래 수익을 보장하지 않습니다.
          </p>
        </>
      )}
    </NavigationPageLayout>
  )
}
