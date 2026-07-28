export default function SpendingState({ errorMessage, isLoading }) {
  if (isLoading) {
    return (
      <div className="detail-loading">
        <span className="loading-dots">
          <span />
          <span />
          <span />
        </span>
        <p>소비 상세 데이터를 불러오는 중...</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="detail-error">
        <p className="form-message">{errorMessage}</p>
      </div>
    )
  }

  return null
}
