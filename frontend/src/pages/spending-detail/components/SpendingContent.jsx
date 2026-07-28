import CategorySpendingCard from './CategorySpendingCard'
import RecentTransactionsCard from './RecentTransactionsCard'
import SpendingSummaryCard from './SpendingSummaryCard'
import SpendingTrendCard from './SpendingTrendCard'

export default function SpendingContent({ data }) {
  return (
    <main className="detail-content">
      <SpendingSummaryCard summary={data?.summary} />
      <SpendingTrendCard trend={data?.trend || []} />
      <CategorySpendingCard categories={data?.categories || []} />
      <RecentTransactionsCard
        transactions={data?.recentTransactions || []}
      />

      {/*
        소비 인사이트와 자주 이용한 가맹점은 기획 결정 전까지 노출하지 않는다.
        API 응답의 insights, frequentMerchants 데이터는 향후 섹션 추가 시 사용한다.
      */}
    </main>
  )
}
