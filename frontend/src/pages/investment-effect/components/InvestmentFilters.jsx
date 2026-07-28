import { useEffect, useState } from 'react'
import { categoryOptions } from '../constants'

const monthLabels = Array.from({ length: 12 }, (_, index) => `${index + 1}월`)

export default function InvestmentFilters({
  selectedCategory,
  selectedMonth,
  onCategoryChange,
  onMonthChange,
}) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(
    Number(selectedMonth.slice(0, 4)),
  )

  useEffect(() => {
    setPickerYear(Number(selectedMonth.slice(0, 4)))
  }, [selectedMonth])

  const selectMonth = (monthIndex) => {
    const month = String(monthIndex + 1).padStart(2, '0')

    onMonthChange(`${pickerYear}-${month}`)
    setIsMonthPickerOpen(false)
  }

  return (
    <>
      <div className="investment-month-picker">
        <span>조회 연월</span>
        <button
          className="investment-month-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isMonthPickerOpen}
          onClick={() => setIsMonthPickerOpen((current) => !current)}
        >
          <span aria-hidden="true">📅</span>
          <strong>{selectedMonth}</strong>
        </button>

        {isMonthPickerOpen ? (
          <div
            className="investment-month-popover"
            role="dialog"
            aria-label="조회 연월 선택"
          >
            <div className="investment-month-popover-head">
              <button
                type="button"
                aria-label="이전 연도"
                onClick={() => setPickerYear((year) => year - 1)}
              >
                ‹
              </button>
              <strong>{pickerYear}년</strong>
              <button
                type="button"
                aria-label="다음 연도"
                onClick={() => setPickerYear((year) => year + 1)}
              >
                ›
              </button>
            </div>
            <div className="investment-month-grid">
              {monthLabels.map((label, monthIndex) => {
                const value = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`
                const isSelected = value === selectedMonth

                return (
                  <button
                    type="button"
                    key={value}
                    className={isSelected ? 'is-selected' : ''}
                    aria-pressed={isSelected}
                    onClick={() => selectMonth(monthIndex)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

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
