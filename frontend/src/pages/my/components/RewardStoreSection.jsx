import { useMemo, useState } from 'react'
import {
  mockRewardProducts,
  rewardCategories,
} from '../data/mockRewards.js'
import RewardProductCard from './RewardProductCard.jsx'

export default function RewardStoreSection({
  points,
  pointsLoading,
  pointsError,
  onSelectProduct,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const visibleProducts = useMemo(
    () =>
      selectedCategory === 'all'
        ? mockRewardProducts
        : mockRewardProducts.filter(
            (product) => product.category === selectedCategory,
          ),
    [selectedCategory],
  )

  return (
    <section className="reward-store" aria-labelledby="reward-store-title">
      <div className="reward-store-heading">
        <div>
          <p>POINT SHOP</p>
          <h2 id="reward-store-title">포인트로 기분 좋은 보상</h2>
        </div>
        <span>1P = 1원</span>
      </div>

      <div className="reward-category-tabs" role="tablist" aria-label="상품 분류">
        {rewardCategories.map((category) => (
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === category.id}
            className={selectedCategory === category.id ? 'is-active' : ''}
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="reward-product-grid">
        {visibleProducts.map((product) => (
          <RewardProductCard
            product={product}
            currentPoints={points || 0}
            disabled={pointsLoading || Boolean(pointsError)}
            onSelect={onSelectProduct}
            key={product.id}
          />
        ))}
      </div>
    </section>
  )
}
