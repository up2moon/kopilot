import SavingCoachCard from './SavingCoachCard'
import SpendingSummaryCard from './SpendingSummaryCard'

const defaultSummary = {
  totalSpendingAmount: 1245000,
  monthlyChangeRate: 8.3,
  paymentCount: 42,
}

export default function DashboardContent({
  coaching,
  data,
  errorMessage,
  isLoading,
  onNavigate,
}) {
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <span className="loading-dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="dashboard-error">
        <p className="form-message">{errorMessage}</p>
      </div>
    )
  }

  const coachMessage =
    coaching?.coaching?.message ||
    data?.savingCoachPreview?.message ||
    '오늘의 코칭을 불러오지 못했어요.'

  return (
    <main className="dash-cards-container">
      <SpendingSummaryCard
        onOpenDetails={() => onNavigate('/spending')}
        summary={data?.summary || defaultSummary}
      />
      <SavingCoachCard
        message={coachMessage}
        onOpenCoach={() => onNavigate('/coach')}
      />
    </main>
  )
}
