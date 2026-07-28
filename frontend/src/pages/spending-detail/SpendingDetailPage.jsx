import SpendingContent from './components/SpendingContent'
import SpendingDetailHeader from './components/SpendingDetailHeader'
import SpendingPeriodTabs from './components/SpendingPeriodTabs'
import SpendingState from './components/SpendingState'
import useSpendingDetails from './hooks/useSpendingDetails'
import './SpendingDetailPage.css'

export default function SpendingDetailPage({ auth, onBack }) {
  const {
    data,
    errorMessage,
    isLoading,
    period,
    setPeriod,
  } = useSpendingDetails(auth?.accessToken)

  return (
    <div className="spending-detail-page">
      <SpendingDetailHeader onBack={onBack} />
      <SpendingPeriodTabs period={period} onChange={setPeriod} />

      <SpendingState
        errorMessage={errorMessage}
        isLoading={isLoading}
      />

      {!isLoading && !errorMessage ? <SpendingContent data={data} /> : null}
    </div>
  )
}
