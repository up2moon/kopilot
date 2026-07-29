import searchIcon from '../../../assets/icons/search-icon.svg'
import { formatPrice, getAssetKey } from '../utils/formatters'

export default function AssetSearchCard({
  searchKeyword,
  searchResults,
  totalAssetCount,
  isSearching,
  searchError,
  setSearchKeyword,
  onSelectAsset,
  selectedAssetCode,
}) {
  return (
    <section className="investment-search-card">
      <div className="investment-asset-list-heading">
        <div>
          <h2>궁금한 주식·ETF</h2>
          <p>기본 목록에서 고르거나 전체 종목을 검색할 수 있어요.</p>
        </div>
        <span>{isSearching ? '불러오는 중' : `${totalAssetCount}개`}</span>
      </div>

      <label className="investment-search-input">
        <img src={searchIcon} alt="" aria-hidden="true" />
        <input
          type="search"
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="종목명 또는 종목 코드 검색"
        />
      </label>

      {isSearching && (
        <div className="investment-search-note">종목 목록을 불러오는 중...</div>
      )}
      {searchError && (
        <div className="investment-search-note is-error">{searchError}</div>
      )}
      {!isSearching &&
        !searchError &&
        searchResults.length === 0 && (
          <div className="investment-search-note">
            전체 종목에서 일치하는 검색 결과가 없어요.
          </div>
        )}
      {searchResults.length > 0 && (
        <div className="investment-search-results">
          {searchResults.map((asset) => (
            <button
              type="button"
              key={getAssetKey(asset)}
              className={
                selectedAssetCode === asset.assetCode ? 'is-selected' : ''
              }
              onClick={() => onSelectAsset(asset)}
              aria-pressed={selectedAssetCode === asset.assetCode}
            >
              <strong>{asset.label}</strong>
              <span className="investment-search-price">
                {formatPrice(asset.currentPrice)}
              </span>
              <em aria-hidden="true">›</em>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
