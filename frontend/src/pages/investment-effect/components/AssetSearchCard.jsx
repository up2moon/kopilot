import { getAssetKey } from '../utils/formatters'

export default function AssetSearchCard({
  searchKeyword,
  searchResults,
  isSearching,
  searchError,
  setSearchKeyword,
  onSelectAsset,
}) {
  const hasSearchKeyword = searchKeyword.trim().length >= 2

  return (
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

      {isSearching && (
        <div className="investment-search-note">검색 중...</div>
      )}
      {searchError && (
        <div className="investment-search-note is-error">{searchError}</div>
      )}
      {!isSearching &&
        !searchError &&
        hasSearchKeyword &&
        searchResults.length === 0 && (
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
              onClick={() => onSelectAsset(asset)}
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
  )
}
