const isDeveloperMode =
  import.meta.env.DEV ||
  import.meta.env.VITE_INVESTMENT_DEBUG_ERRORS === 'true'

function getErrorTitle(errorCode) {
  if (errorCode === 'KOSCOM_CONFIG_MISSING') return '시세 조회 설정이 필요해요'
  if (errorCode === 'PRICE_HISTORY_MISSING') return '기준일 종가가 아직 없어요'
  if (errorCode === 'CURRENT_PRICE_MISSING') return '현재 시세가 아직 없어요'
  if (errorCode.startsWith('KOSCOM_')) return '코스콤 시세 응답을 확인해주세요'

  return '시세를 불러오지 못했어요'
}

export default function InvestmentStateCard({
  errorCode,
  errorDebug,
  errorMessage,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className="investment-state-card">
        <div className="investment-spinner" />
        <p>코스콤 CHECK API로 시세를 조회하고 있어요.</p>
      </div>
    )
  }

  if (!errorMessage) return null

  return (
    <div className="investment-state-card">
      <strong>{getErrorTitle(errorCode)}</strong>
      <p>{errorMessage}</p>
      {errorCode === 'KOSCOM_CONFIG_MISSING' && (
        <span>
          CUST_ID와 AUTH_KEY가 백엔드 환경 변수로 설정되어 있어야 합니다.
        </span>
      )}
      {errorCode === 'PRICE_HISTORY_MISSING' && (
        <span>
          코스콤 종가 동기화가 완료된 월부터 투자효과를 계산할 수 있습니다.
        </span>
      )}
      {errorCode === 'CURRENT_PRICE_MISSING' && (
        <span>
          현재가 동기화 후 다시 계산해주세요. 기준일 가격만으로 결과를 만들지
          않습니다.
        </span>
      )}
      {isDeveloperMode && errorDebug && (
        <details className="investment-error-debug">
          <summary>실패 상세</summary>
          <pre>{JSON.stringify(errorDebug, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
