import { useEffect, useState } from 'react'
import { categoryOptions } from '../constants'

function formatYearMonthInput(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 6)

  return digits.length > 4
    ? `${digits.slice(0, 4)}-${digits.slice(4)}`
    : digits
}

function isValidYearMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false

  const month = Number(value.slice(5, 7))
  return month >= 1 && month <= 12
}

export default function InvestmentFilters({
  selectedCategory,
  selectedMonth,
  onCategoryChange,
  onMonthChange,
}) {
  const [monthInput, setMonthInput] = useState(selectedMonth)

  useEffect(() => {
    setMonthInput(selectedMonth)
  }, [selectedMonth])

  const handleMonthInput = (event) => {
    const nextValue = formatYearMonthInput(event.target.value)

    setMonthInput(nextValue)
    if (isValidYearMonth(nextValue)) {
      onMonthChange(nextValue)
    }
  }

  return (
    <>
      <label className="investment-month-picker">
        <span>조회 연월</span>
        <input
          type="text"
          inputMode="numeric"
          value={monthInput}
          onChange={handleMonthInput}
          placeholder="YYYY-MM"
          maxLength={7}
          pattern="[0-9]{4}-[0-9]{2}"
          aria-label="조회 연월"
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
