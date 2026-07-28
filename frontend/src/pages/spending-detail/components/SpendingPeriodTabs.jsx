const periodOptions = [
  { value: 'month', label: '이번 달' },
  { value: '3months', label: '최근 3개월' },
  { value: '6months', label: '최근 6개월' },
]

export default function SpendingPeriodTabs({ period, onChange }) {
  return (
    <div className="detail-period-tabs">
      {periodOptions.map((option) => (
        <button
          type="button"
          className={`period-tab${
            period === option.value ? ' is-active' : ''
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
