import { formatDateTime, formatWon } from '../utils/formatters'

export default function RecentTransactionsCard({ transactions }) {
  return (
    <section className="detail-card tx-card">
      <h2>결제 내역</h2>
      <div className="tx-list">
        {transactions.slice(0, 3).map((transaction) => (
          <article className="tx-item" key={transaction.id}>
            <div className="tx-icon">{transaction.icon}</div>
            <div className="tx-details">
              <strong>{transaction.merchantName}</strong>
              <p>
                {transaction.category} ·{' '}
                {formatDateTime(transaction.approvedAt)}
              </p>
            </div>
            <div className="tx-amount">
              -{formatWon(transaction.amount)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
