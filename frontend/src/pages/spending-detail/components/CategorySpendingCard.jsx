import { formatWon } from '../utils/formatters'

export default function CategorySpendingCard({ categories }) {
  const topCategories = categories.slice(0, 3)

  if (!topCategories.length) return null

  return (
    <section className="detail-card categories-card">
      <h2>카테고리별 소비</h2>
      <div className="category-list">
        {topCategories.map((category) => (
          <div className="category-item" key={category.category}>
            <div className="cat-icon-col">{category.icon}</div>
            <div className="cat-info-col">
              <div className="cat-info-top">
                <strong>{category.category}</strong>
                <span>{formatWon(category.amount)}</span>
              </div>
              <div className="cat-bar-track">
                <div
                  className="cat-bar-fill"
                  style={{
                    width: `${Math.min(100, category.percentage)}%`,
                  }}
                />
              </div>
              <div className="cat-info-sub">
                <small>전체 소비의 {category.percentage}%</small>
                <small>{category.count}건</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
