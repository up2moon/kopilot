import { categoryOptions } from '../constants'

export default function InvestmentFilters({
  selectedCategory,
  selectedMonth,
  onCategoryChange,
  onMonthChange,
}) {
  return (
    <>
      <label className="investment-month-picker">
        <span>조회 월</span>
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => onMonthChange(event.target.value)}
          aria-label="조회 월"
        />
      </label>

      <div
        className="investment-category-tabs"
        aria-label="소비 카테고리 선택"
      >
        {categoryOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            className={selectedCategory === option.value ? 'is-active' : ''}
            onClick={() => onCategoryChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  )
}
