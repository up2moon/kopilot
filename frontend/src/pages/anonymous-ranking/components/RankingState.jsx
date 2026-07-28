export default function RankingState({ error, loading }) {
  if (loading) {
    return (
      <div className="ranking-loading-state">
        <div className="loading-spinner" />
        <p>절약 랭킹 순위를 집계하고 있어요...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ranking-error-state">
        <p>{error}</p>
        <button
          type="button"
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          다시 시도하기
        </button>
      </div>
    )
  }

  return null
}
