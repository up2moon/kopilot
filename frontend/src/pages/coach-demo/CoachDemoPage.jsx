import { useEffect, useMemo, useRef, useState } from 'react'
import './CoachDemoPage.css'

const analysisSteps = [
  '최근 90일 거래 284건 확인',
  '고정비와 생활비 분리',
  '반복 절약 가능 영역 탐색',
  '목표 기간에 맞춘 루틴 설계',
]

const savingOptions = [
  { id: 'delivery', icon: '🛵', label: '배달·외식', evidence: '월 8회 · 186,000원', saving: 52000 },
  { id: 'cafe', icon: '☕', label: '카페·간식', evidence: '주 5회 · 121,000원', saving: 36000 },
  { id: 'subscription', icon: '▶', label: '정기 구독', evidence: '활성 구독 6개', saving: 19900 },
  { id: 'shopping', icon: '🛍', label: '온라인 쇼핑', evidence: '월 평균 312,000원', saving: 48000 },
]

const baseJourney = [
  { week: '1주', contribution: 46000, price: 22640 },
  { week: '2주', contribution: 52000, price: 22980 },
  { week: '3주', contribution: 38000, price: 22510 },
  { week: '4주', contribution: 61000, price: 23120 },
  { week: '5주', contribution: 57000, price: 23480 },
  { week: '6주', contribution: 44000, price: 23220 },
  { week: '7주', contribution: 68000, price: 23860 },
  { week: '8주', contribution: 49000, price: 24110 },
  { week: '9주', contribution: 53000, price: 23940 },
  { week: '10주', contribution: 71000, price: 24480 },
  { week: '11주', contribution: 62000, price: 24720 },
  { week: '12주', contribution: 59000, price: 25180 },
]

function formatWon(value) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}원`
}

function buildJourney(rows, investmentRatio, latestPrice) {
  let shares = 0
  let cashSaving = 0
  let investmentPrincipal = 0

  return rows.map((row) => {
    cashSaving += row.contribution
    const investmentAmount = row.contribution * (investmentRatio / 100)
    investmentPrincipal += investmentAmount
    shares += investmentAmount / row.price

    return {
      ...row,
      cashSaving,
      investmentPrincipal,
      investmentValue: shares * (row === rows.at(-1) ? latestPrice : row.price),
      shares,
    }
  })
}

function ComparisonChart({ journey }) {
  const width = 330
  const height = 150
  const padding = 18
  const maxValue = Math.max(
    ...journey.flatMap((item) => [item.investmentPrincipal, item.investmentValue]),
  ) * 1.12
  const x = (index) =>
    padding + (index / Math.max(journey.length - 1, 1)) * (width - padding * 2)
  const y = (value) =>
    height - padding - (value / Math.max(maxValue, 1)) * (height - padding * 2)
  const cashPoints = journey
    .map((item, index) => `${x(index)},${y(item.investmentPrincipal)}`)
    .join(' ')
  const investmentPoints = journey
    .map((item, index) => `${x(index)},${y(item.investmentValue)}`)
    .join(' ')
  const areaPoints = `${investmentPoints} ${x(journey.length - 1)},${height - padding} ${padding},${height - padding}`

  return (
    <svg
      aria-label="현금 보유와 S&P 500 적립식 평가액 비교 그래프"
      className="asset-chart"
      viewBox={`0 0 ${width} ${height}`}
    >
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          x2={width - padding}
          y1={height * ratio}
          y2={height * ratio}
        />
      ))}
      <polygon className="investment-area" points={areaPoints} />
      <polyline className="cash-line" points={cashPoints} />
      <polyline className="investment-line" points={investmentPoints} />
      {journey.map((item, index) => (
        <circle
          className="investment-dot"
          cx={x(index)}
          cy={y(item.investmentValue)}
          key={item.week}
          r="2.4"
        />
      ))}
    </svg>
  )
}

export default function CoachDemoPage() {
  const [stage, setStage] = useState('goal')
  const [goalAmount, setGoalAmount] = useState(10000000)
  const [duration, setDuration] = useState(36)
  const [analysisIndex, setAnalysisIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState(['delivery', 'cafe', 'subscription'])
  const [investmentRatio, setInvestmentRatio] = useState(50)
  const [latestPrice, setLatestPrice] = useState(25180)
  const [priceRefreshing, setPriceRefreshing] = useState(false)
  const [coachAdjusted, setCoachAdjusted] = useState(false)
  const scrollRef = useRef(null)

  const monthlyTarget = Math.ceil(goalAmount / duration / 1000) * 1000
  const monthlySaving = savingOptions
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + item.saving, 0)
  const journey = useMemo(
    () => buildJourney(baseJourney, investmentRatio, latestPrice),
    [investmentRatio, latestPrice],
  )
  const last = journey.at(-1)
  const investmentGain = last.investmentValue - last.investmentPrincipal

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [stage, analysisIndex, coachAdjusted])

  useEffect(() => {
    if (stage !== 'analysis') return undefined

    setAnalysisIndex(0)
    const timers = analysisSteps.map((_, index) =>
      window.setTimeout(() => {
        setAnalysisIndex(index + 1)
        if (index === analysisSteps.length - 1) {
          window.setTimeout(() => setStage('plan'), 450)
        }
      }, 620 * (index + 1)),
    )

    return () => timers.forEach(window.clearTimeout)
  }, [stage])

  const refreshPrice = () => {
    if (priceRefreshing) return
    setPriceRefreshing(true)
    window.setTimeout(() => {
      setLatestPrice((price) => price + 170)
      setPriceRefreshing(false)
    }, 850)
  }

  const reset = () => {
    setStage('goal')
    setAnalysisIndex(0)
    setSelectedIds(['delivery', 'cafe', 'subscription'])
    setInvestmentRatio(50)
    setLatestPrice(25180)
    setCoachAdjusted(false)
  }

  return (
    <main className="invest-coach-shell">
      <section className="invest-coach-phone">
        <header className="invest-coach-header">
          <button aria-label="처음으로" onClick={reset} type="button">‹</button>
          <div>
            <span className="invest-coach-avatar">K</span>
            <div>
              <strong>AI 자산 코치</strong>
              <span><i /> 마이데이터 · CHECK 연결됨</span>
            </div>
          </div>
          <button onClick={reset} type="button">···</button>
        </header>

        <div className="invest-coach-steps">
          {['목표', '분석', '루틴', '성장'].map((label, index) => {
            const currentIndex = ['goal', 'analysis', 'plan', 'journey'].indexOf(stage)
            return (
              <span className={currentIndex >= index ? 'is-active' : ''} key={label}>
                {label}
              </span>
            )
          })}
        </div>

        <div className="invest-coach-content" ref={scrollRef}>
          {stage === 'goal' && (
            <section className="goal-stage">
              <span className="ai-spark">✦</span>
              <p className="stage-eyebrow">SAVE TO INVEST</p>
              <h1>
                소비를 줄여
                <br />
                매주 자산을 사요
              </h1>
              <p className="goal-description">
                목표를 정하면 AI가 소비를 코칭하고, 아낀 돈 일부를 S&P 500에
                적립했을 때의 자산 성장을 추적해요.
              </p>

              <div className="goal-setting-card">
                <label>
                  <span>목표 금액</span>
                  <div>
                    <input
                      min="100000"
                      onChange={(event) => setGoalAmount(Number(event.target.value))}
                      step="100000"
                      type="number"
                      value={goalAmount}
                    />
                    <em>원</em>
                  </div>
                </label>
                <label>
                  <span>목표 기간</span>
                  <select
                    onChange={(event) => setDuration(Number(event.target.value))}
                    value={duration}
                  >
                    <option value="12">1년</option>
                    <option value="24">2년</option>
                    <option value="36">3년</option>
                    <option value="60">5년</option>
                  </select>
                </label>
                <div className="goal-required">
                  <span>매월 필요한 금액</span>
                  <strong>{formatWon(monthlyTarget)}</strong>
                </div>
                <button onClick={() => setStage('analysis')} type="button">
                  AI에게 달성 방법 물어보기 →
                </button>
              </div>
              <small className="simulation-notice">
                실제 주문이 아닌 자산 형성 시뮬레이션이에요.
              </small>
            </section>
          )}

          {stage !== 'goal' && (
            <div className="chat-user-message">
              {duration / 12}년 안에 {formatWon(goalAmount)}을 모으고 싶어.
            </div>
          )}

          {stage === 'analysis' && (
            <div className="ai-message-row">
              <span className="mini-ai-avatar">✦</span>
              <section className="analysis-panel">
                <div>
                  <strong>목표 달성 경로를 찾고 있어요</strong>
                  <span>최근 3개월 소비 분석</span>
                </div>
                <div className="analysis-progress">
                  <span style={{ width: `${analysisIndex * 25}%` }} />
                </div>
                <ul>
                  {analysisSteps.map((step, index) => (
                    <li className={analysisIndex > index ? 'is-done' : ''} key={step}>
                      <span>{analysisIndex > index ? '✓' : ''}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {(stage === 'plan' || stage === 'journey') && (
            <>
              <div className="ai-message-row">
                <span className="mini-ai-avatar">K</span>
                <div className="ai-chat-bubble">
                  <strong>매월 {formatWon(monthlyTarget)}이 필요해요</strong>
                  <p>
                    현재 소비에서는 생활을 크게 바꾸지 않고 월{' '}
                    {formatWon(monthlySaving)}까지 확보할 수 있어요. 먼저 줄일
                    영역을 확인해 볼까요?
                  </p>
                </div>
              </div>

              <section className="saving-plan-card">
                <header>
                  <div>
                    <span>AI가 찾은 절약 여력</span>
                    <strong>월 {formatWon(monthlySaving)}</strong>
                  </div>
                  <em>{selectedIds.length}개 선택</em>
                </header>
                {savingOptions.map((item) => {
                  const selected = selectedIds.includes(item.id)
                  return (
                    <button
                      className={selected ? 'is-selected' : ''}
                      key={item.id}
                      onClick={() =>
                        setSelectedIds((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id],
                        )
                      }
                      type="button"
                    >
                      <span>{item.icon}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.evidence}</small>
                      </div>
                      <em>+{formatWon(item.saving)}</em>
                      <i>{selected ? '✓' : '+'}</i>
                    </button>
                  )
                })}
              </section>

              {stage === 'plan' && (
                <section className="allocation-card">
                  <header>
                    <span>절약액 운용 방식</span>
                    <strong>현금과 S&P 500으로 나눠요</strong>
                  </header>
                  <div className="allocation-visual">
                    <div style={{ flex: 100 - investmentRatio }}>
                      <span>현금</span>
                      <strong>{100 - investmentRatio}%</strong>
                    </div>
                    <div style={{ flex: investmentRatio }}>
                      <span>S&P 500</span>
                      <strong>{investmentRatio}%</strong>
                    </div>
                  </div>
                  <input
                    aria-label="S&P 500 투자 비율"
                    max="80"
                    min="20"
                    onChange={(event) => setInvestmentRatio(Number(event.target.value))}
                    step="10"
                    type="range"
                    value={investmentRatio}
                  />
                  <div className="allocation-amounts">
                    <span>현금 {formatWon(monthlySaving * ((100 - investmentRatio) / 100))}</span>
                    <span>투자 {formatWon(monthlySaving * (investmentRatio / 100))}</span>
                  </div>
                  <small>
                    국내 상장 S&P 500 ETF를 매주 소수점 매수했다고 가정해요.
                  </small>
                  <button onClick={() => setStage('journey')} type="button">
                    지난 12주 적립 시뮬레이션 보기
                  </button>
                </section>
              )}
            </>
          )}

          {stage === 'journey' && (
            <>
              <section className="asset-summary-card">
                <header>
                  <div>
                    <span>나의 절약 투자 루틴</span>
                    <strong>12주 동안 {formatWon(last.cashSaving)} 절약</strong>
                  </div>
                  <em>진행 중</em>
                </header>
                <div className="summary-metrics">
                  <div>
                    <span>현금 보유</span>
                    <strong>{formatWon(last.investmentPrincipal)}</strong>
                  </div>
                  <div>
                    <span>S&P 500 평가액</span>
                    <strong>{formatWon(last.investmentValue)}</strong>
                  </div>
                  <div className={investmentGain >= 0 ? 'is-positive' : 'is-negative'}>
                    <span>현재 차이</span>
                    <strong>
                      {investmentGain >= 0 ? '+' : ''}
                      {formatWon(investmentGain)}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="chart-card">
                <header>
                  <div>
                    <span>현금 vs S&P 500 적립식</span>
                    <strong>같은 절약액의 성장 차이</strong>
                  </div>
                  <button
                    className={priceRefreshing ? 'is-loading' : ''}
                    onClick={refreshPrice}
                    type="button"
                  >
                    {priceRefreshing ? '조회 중' : '시세 갱신'}
                  </button>
                </header>
                <div className="chart-legend">
                  <span><i className="cash" />현금으로 보유</span>
                  <span><i className="snp" />S&P 500 적립식</span>
                </div>
                <ComparisonChart journey={journey} />
                <div className="chart-axis">
                  <span>1주</span>
                  <span>4주</span>
                  <span>8주</span>
                  <span>12주</span>
                </div>
                <footer>
                  <span>
                    <i /> CHECK API 연동 시연
                  </span>
                  <small>ETF 360750 · 현재가 {formatWon(latestPrice)}</small>
                </footer>
              </section>

              <section className="purchase-history">
                <header>
                  <span>매주 반복된 자산 형성</span>
                  <strong>최근 가상 매수 내역</strong>
                </header>
                {journey.slice(-3).reverse().map((item) => (
                  <div key={item.week}>
                    <span className="purchase-week">{item.week}</span>
                    <div>
                      <strong>절약액의 {investmentRatio}% 적립</strong>
                      <small>ETF 가격 {formatWon(item.price)}</small>
                    </div>
                    <em>+{(item.contribution * investmentRatio / 100 / item.price).toFixed(4)}주</em>
                  </div>
                ))}
              </section>

              <div className="ai-message-row">
                <span className="mini-ai-avatar">K</span>
                <div className="ai-chat-bubble">
                  <strong>
                    코칭으로 만든 투자 원금이 현재{' '}
                    {formatWon(last.investmentValue)}이 됐어요
                  </strong>
                  <p>
                    수익은 보장되지 않지만, 소비를 줄인 돈을 매주 반복해서
                    자산으로 바꾼 결과를 계속 추적해 드릴게요.
                  </p>
                </div>
              </div>

              {!coachAdjusted ? (
                <section className="weekly-coach-card">
                  <span>이번 주 AI 코칭</span>
                  <strong>배달비가 계획보다 18,000원 높아요</strong>
                  <p>
                    야근이 많았던 이번 주에는 배달 대신 쇼핑 예산을 줄여 월
                    목표를 유지할 수 있어요.
                  </p>
                  <button onClick={() => setCoachAdjusted(true)} type="button">
                    AI가 다음 주 플랜 조정하기
                  </button>
                </section>
              ) : (
                <section className="adjusted-plan-card">
                  <header>
                    <span>다음 주 플랜 조정 완료</span>
                    <em>목표 유지</em>
                  </header>
                  <div><span>🛵 배달</span><del>주 1회</del><strong>주 2회</strong></div>
                  <div><span>🛍 쇼핑</span><del>주 48,000원</del><strong>주 30,000원</strong></div>
                  <div><span>다음 주 예상 투자금</span><strong>29,500원</strong></div>
                  <button onClick={reset} type="button">전체 시연 다시 보기</button>
                </section>
              )}
            </>
          )}
        </div>

        {stage === 'journey' && (
          <footer className="invest-coach-footer">
            <div>
              <span>목표까지</span>
              <strong>{formatWon(goalAmount - last.cashSaving)}</strong>
            </div>
            <button onClick={refreshPrice} type="button">이번 주 절약액 반영</button>
          </footer>
        )}
      </section>
    </main>
  )
}
