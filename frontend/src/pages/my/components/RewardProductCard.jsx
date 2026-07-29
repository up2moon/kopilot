function formatPoints(points) {
  return `${points.toLocaleString('ko-KR')}P`
}

export default function RewardProductCard({
  product,
  currentPoints,
  disabled,
  onSelect,
}) {
  const canPurchase = !disabled && currentPoints >= product.points

  return (
    <button
      type="button"
      className="reward-product-card"
      onClick={() => onSelect(product)}
      disabled={disabled}
      aria-label={`${product.brand} ${product.name}, ${formatPoints(product.points)}`}
    >
      <span
        className="reward-product-visual"
        style={{ backgroundColor: product.color }}
      >
        {product.badge ? (
          <span className="reward-product-badge">{product.badge}</span>
        ) : null}
        <span aria-hidden="true">{product.emoji}</span>
      </span>
      <span className="reward-product-brand">{product.brand}</span>
      <strong>{product.name}</strong>
      <span
        className={`reward-product-price${canPurchase ? ' is-affordable' : ''}`}
      >
        {formatPoints(product.points)}
      </span>
    </button>
  )
}
