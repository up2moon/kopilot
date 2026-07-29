import { useEffect, useMemo, useState } from 'react'
import {
  createInvestmentContribution,
  getActiveAssetGoal,
  getAssetGoalRoadmap,
  updateAssetGoalRatio,
} from '../../services/assetGoals'
import { getWeeklyChallenges } from '../../services/challenges'
import './RoadmapPage.css'

const mockGoal = {
  goalId: 'demo',
  title: '3년 안에 만드는 1억 시드머니',
  targetAmount: 100000000,
  startDate: '2024-07-29',
  targetDate: '2027-07-29',
  recommendedInvestmentRatio: 40,
  selectedInvestmentRatio: 40,
}

const mockRoadmap = {
  progress: {
    confirmedSavingAmount: 68000000,
    cashAmount: 40800000,
    investmentPrincipal: 27200000,
    investmentValue: 29400000,
    mixedCurrentValue: 70200000,
    cashOnlyValue: 68000000,
    profit: 2200000,
    differenceFromCashOnly: 2200000,
    achievementRate: 0.702,
  },
  quote: {
    currentPrice: 25180,
    tradeDate: '2026-07-28',
  },
  chart: [
    { date: '2024-08-29', cashOnlyValue: 2800000, mixedCashValue: 1680000, investmentPrincipal: 1120000, investmentValue: 1120000 },
    { date: '2024-11-29', cashOnlyValue: 11200000, mixedCashValue: 6720000, investmentPrincipal: 4480000, investmentValue: 4610000 },
    { date: '2025-03-29', cashOnlyValue: 22600000, mixedCashValue: 13560000, investmentPrincipal: 9040000, investmentValue: 9360000 },
    { date: '2025-07-29', cashOnlyValue: 34000000, mixedCashValue: 20400000, investmentPrincipal: 13600000, investmentValue: 14200000 },
    { date: '2025-11-29', cashOnlyValue: 45300000, mixedCashValue: 27180000, investmentPrincipal: 18120000, investmentValue: 19200000 },
    { date: '2026-03-29', cashOnlyValue: 56600000, mixedCashValue: 33960000, investmentPrincipal: 22640000, investmentValue: 24200000 },
    { date: '2026-07-29', cashOnlyValue: 68000000, mixedCashValue: 40800000, investmentPrincipal: 27200000, investmentValue: 29400000 },
  ],
  contributions: [
    { contributionId: 3, savingAmount: 2833334, investmentAmount: 1133334, purchasePrice: 24720, purchasedQuantity: 45.8468, priceTradeDate: '2026-06-29' },
    { contributionId: 2, savingAmount: 2833333, investmentAmount: 1133333, purchasePrice: 24480, purchasedQuantity: 46.2963, priceTradeDate: '2026-05-29' },
    { contributionId: 1, savingAmount: 2833333, investmentAmount: 1133333, purchasePrice: 23940, purchasedQuantity: 47.3406, priceTradeDate: '2026-04-29' },
  ],
}

function formatWon(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`
}

function formatChartAmount(value) {
  const amount = Number(value || 0)

  if (amount === 0) return '0'
  return Math.round(amount / 10000).toLocaleString('ko-KR')
}

function formatChartDate(value) {
  if (!value) return ''
  const [year, month] = value.split('-')
  return `${year.slice(2)}.${month}`
}

function RoadmapChart({ chart }) {
  const width = 330
  const height = 178
  const plot = {
    left: 42,
    right: 10,
    top: 22,
    bottom: 25,
  }
  const gapMagnification = 1
  const visualMixedValues = chart.map((item) => {
    const cashOnlyValue = Number(item.cashOnlyValue)
    const mixedValue =
      Number(item.mixedCashValue) + Number(item.investmentValue)

    return cashOnlyValue + (mixedValue - cashOnlyValue) * gapMagnification
  })
  const values = chart.flatMap((item, index) => [
    item.cashOnlyValue,
    visualMixedValues[index],
  ])
  const rawMax = Math.max(...values, 1)
  const magnitude = 10 ** Math.floor(Math.log10(rawMax))
  const max = Math.ceil(rawMax / magnitude) * magnitude
  const plotWidth = width - plot.left - plot.right
  const plotHeight = height - plot.top - plot.bottom
  const x = (index) =>
    plot.left + (index / Math.max(chart.length - 1, 1)) * plotWidth
  const y = (value) =>
    plot.top + plotHeight - (value / max) * plotHeight
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    value: max * ratio,
    y: plot.top + plotHeight * (1 - ratio),
  }))
  const xTickIndexes = Array.from(
    new Set([0, Math.floor((chart.length - 1) / 2), chart.length - 1]),
  ).filter((index) => index >= 0 && chart[index])
  const cash = chart.map((item, index) => `${x(index)},${y(item.cashOnlyValue)}`).join(' ')
  const mixed = chart
    .map((item, index) => `${x(index)},${y(visualMixedValues[index])}`)
    .join(' ')
  const gapArea = [
    ...chart.map((item, index) => `${x(index)},${y(visualMixedValues[index])}`),
    ...[...chart]
      .reverse()
      .map((item, reverseIndex) => {
        const index = chart.length - reverseIndex - 1
        return `${x(index)},${y(Number(item.cashOnlyValue))}`
      }),
  ].join(' ')

  return (
    <svg className="roadmap-chart-svg" viewBox={`0 0 ${width} ${height}`}>
      <text className="roadmap-axis-unit" x={plot.left} y="11">
        누적 자산 · 단위: 만원
      </text>
      {yTicks.map((tick) => (
        <g key={tick.ratio}>
          <line
            x1={plot.left}
            x2={width - plot.right}
            y1={tick.y}
            y2={tick.y}
          />
          <text
            className="roadmap-axis-label roadmap-y-axis-label"
            x={plot.left - 6}
            y={tick.y + 3}
          >
            {formatChartAmount(tick.value)}
          </text>
        </g>
      ))}
      <polygon className="roadmap-gap-area" points={gapArea} />
      <polyline className="cash-only-line" points={cash} />
      <polyline className="mixed-line" points={mixed} />
      {chart.map((item, index) => (
        <circle
          cx={x(index)}
          cy={y(visualMixedValues[index])}
          key={item.date}
          r="2.5"
        />
      ))}
      {xTickIndexes.map((index) => (
        <text
          className="roadmap-axis-label roadmap-x-axis-label"
          key={chart[index].date}
          textAnchor={
            index === 0
              ? 'start'
              : index === chart.length - 1
                ? 'end'
                : 'middle'
          }
          x={x(index)}
          y={height - 6}
        >
          {formatChartDate(chart[index].date)}
        </text>
      ))}
    </svg>
  )
}

export default function RoadmapPage({ token, onNavigate }) {
  const [goal, setGoal] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [ratio, setRatio] = useState(40)
  const [loading, setLoading] = useState(true)
  const [roadmapError, setRoadmapError] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const activeResult = await getActiveAssetGoal(token)
        if (!activeResult.goal) {
          if (!ignore) {
            setLoading(false)
          }
          return
        }
        if (!ignore) {
          setGoal(activeResult.goal)
          setRatio(activeResult.goal.selectedInvestmentRatio)
          setLoading(false)
        }

        const roadmapPromise = getAssetGoalRoadmap(
          token,
          activeResult.goal.goalId,
        ).then((roadmapResult) => {
          if (!ignore) setRoadmap(roadmapResult)
        }).catch((error) => {
          if (!ignore) setRoadmapError(error.message)
        })
        const challengePromise = getWeeklyChallenges(token)
          .catch(() => ({ challenges: [] }))
          .then((challengeResult) => {
            if (ignore) return

          setChallenges(
            (challengeResult.weeklyChallenges || []).map((challenge) => ({
              challengeId: challenge.id,
              title: challenge.content,
              estimatedSavingAmount: challenge.estimatedSavingAmount,
              status: challenge.status,
            })),
          )
          })

        await Promise.all([roadmapPromise, challengePromise])
      } catch {
        if (!ignore && import.meta.env.DEV) {
          setGoal(mockGoal)
          setRoadmap(mockRoadmap)
          setRatio(mockGoal.selectedInvestmentRatio)
          setDemoMode(true)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [token])

  const successfulChallenge = useMemo(
    () => challenges.find((challenge) => challenge.status === 'SUCCESS'),
    [challenges],
  )

  const saveRatio = async (nextRatio) => {
    setRatio(nextRatio)
    if (demoMode || !goal || goal.goalId === 'demo') return

    try {
      await updateAssetGoalRatio(token, goal.goalId, nextRatio)
      setMessage('새 비중을 다음 적립부터 적용해요.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const addContribution = async () => {
    if (demoMode) {
      setMessage('데모에서는 최근 절약액 42,000원을 반영했어요.')
      return
    }

    try {
      const payload = successfulChallenge
        ? { challengeId: successfulChallenge.challengeId }
        : { savingAmount: 42000 }
      await createInvestmentContribution(token, goal.goalId, payload)
      const result = await getAssetGoalRoadmap(token, goal.goalId)
      setRoadmap(result)
      setMessage('확정 절약액을 로드맵에 반영했어요.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  if (loading) {
    return <div className="roadmap-loading">로드맵을 불러오고 있어요…</div>
  }

  if (!goal) {
    return (
      <main className="roadmap-empty">
        <span>🧭</span>
        <h1>아직 자산 목표가 없어요</h1>
        <p>AI 코치와 목표 금액과 기간을 정하면 로드맵이 만들어져요.</p>
        <button onClick={() => onNavigate('/coach')} type="button">
          AI와 플랜 만들기
        </button>
      </main>
    )
  }

  if (!roadmap) {
    if (roadmapError) {
      return (
        <main className="roadmap-empty">
          <span>⚠️</span>
          <h1>로드맵 수치를 불러오지 못했어요</h1>
          <p>{roadmapError}</p>
          <button onClick={() => globalThis.location.reload()} type="button">
            다시 불러오기
          </button>
        </main>
      )
    }

    return (
      <main className="roadmap-page roadmap-skeleton-page" aria-busy="true">
        <header className="roadmap-header">
          <div>
            <span>MY ROADMAP</span>
            <h1>{goal.title}</h1>
          </div>
        </header>
        <section className="goal-progress-card roadmap-skeleton-card">
          <span className="roadmap-skeleton-line short" />
          <span className="roadmap-skeleton-line amount" />
          <span className="roadmap-skeleton-line" />
        </section>
        <section className="roadmap-comparison-card roadmap-skeleton-card">
          <span className="roadmap-skeleton-line short" />
          <span className="roadmap-skeleton-chart" />
        </section>
      </main>
    )
  }

  const { progress } = roadmap
  const achievement = Math.round(Number(progress.achievementRate || 0) * 100)

  return (
    <main className="roadmap-page">
      <header className="roadmap-header">
        <div>
          <span>MY ROADMAP</span>
          <h1>{goal.title}</h1>
        </div>
        {demoMode && <em>데모 데이터</em>}
      </header>

      <section className="goal-progress-card">
        <div className="goal-progress-copy">
          <span>현재 달성 금액</span>
          <strong>{formatWon(progress.mixedCurrentValue)}</strong>
          <small>목표 {formatWon(goal.targetAmount)} · {goal.targetDate}까지</small>
        </div>
        <div className="goal-progress-ring" style={{ '--achievement': achievement }}>
          <strong>{achievement}%</strong>
        </div>
        <div className="goal-progress-track">
          <span style={{ width: `${Math.max(achievement, 2)}%` }} />
        </div>
        <p>
          현금만 모았을 때보다 현재{' '}
          <strong>
            {Number(progress.differenceFromCashOnly) >= 0 ? '+' : ''}
            {formatWon(progress.differenceFromCashOnly)}
          </strong>{' '}
          차이가 났어요.
        </p>
      </section>

      <section className="roadmap-comparison-card">
        <header>
          <div>
            <span>자산 성장 비교</span>
            <strong>현금 보유 vs S&P 500 적립식</strong>
          </div>
          <small>{roadmap.quote.tradeDate || '최근'} 기준</small>
        </header>
        <div className="comparison-numbers">
          <div>
            <span>현금만 보유</span>
            <strong>{formatWon(progress.cashOnlyValue)}</strong>
          </div>
          <div>
            <span>현금 + S&P 500</span>
            <strong>{formatWon(progress.mixedCurrentValue)}</strong>
          </div>
        </div>
        <div className="chart-legend">
          <span><i className="cash" />현금만 보유</span>
          <span><i className="mixed" />S&P 500 적립식</span>
        </div>
        <RoadmapChart chart={roadmap.chart} />
        <div className="roadmap-delta-highlight">
          <div>
            <span>S&P 500 적립으로 더 늘어난 금액</span>
            <strong>
              {Number(progress.differenceFromCashOnly) >= 0 ? '+' : ''}
              {formatWon(progress.differenceFromCashOnly)}
            </strong>
          </div>
          <span className="roadmap-delta-arrow">↗</span>
        </div>
        <footer>
          <span><i /> CHECK API 시세</span>
          <small>360750 · {formatWon(roadmap.quote.currentPrice)}</small>
        </footer>
      </section>

      <section className="ratio-card">
        <header>
          <div>
            <span>적립 비중</span>
            <strong>다음 절약액을 어떻게 나눌까요?</strong>
          </div>
          <em>AI 추천 {goal.recommendedInvestmentRatio}%</em>
        </header>
        <div className="ratio-bars">
          <span style={{ flex: 100 - ratio }}>현금 {100 - ratio}%</span>
          <span style={{ flex: ratio }}>S&P {ratio}%</span>
        </div>
        <input
          max="80"
          min="20"
          onChange={(event) => saveRatio(Number(event.target.value))}
          step="10"
          type="range"
          value={ratio}
        />
        <small>투자 비중은 언제든 직접 바꿀 수 있어요.</small>
      </section>

      <section className="roadmap-challenge-card">
        <header>
          <div>
            <span>이번 주 챌린지</span>
            <strong>시드머니를 만드는 작은 행동</strong>
          </div>
          <button onClick={() => onNavigate('/coach')} type="button">AI와 조정</button>
        </header>
        {(challenges.length ? challenges : [
          { challengeId: 'demo-1', title: '출근길 카페 결제를 주 3회로 줄여볼까요?', estimatedSavingAmount: 11000 },
          { challengeId: 'demo-2', title: '일요일 배달 대신 한 번만 집밥을 선택해 볼까요?', estimatedSavingAmount: 18000 },
        ]).slice(0, 2).map((challenge) => (
          <div key={challenge.challengeId}>
            <span>✓</span>
            <strong>{challenge.title}</strong>
            <em>+{formatWon(challenge.estimatedSavingAmount)}</em>
          </div>
        ))}
        <button className="reflect-saving-button" onClick={addContribution} type="button">
          이번 주 확정 절약액 반영
        </button>
        {message && <p>{message}</p>}
      </section>

      <section className="contribution-list-card">
        <header>
          <span>적립 기록</span>
          <strong>절약이 자산으로 바뀐 순간</strong>
        </header>
        {(roadmap.contributions || []).slice(0, 3).map((item) => (
          <div key={item.contributionId}>
            <span>{item.priceTradeDate?.slice(5)}</span>
            <div>
              <strong>{formatWon(item.investmentAmount)} 가상 매수</strong>
              <small>당시 가격 {formatWon(item.purchasePrice)}</small>
            </div>
            <em>+{Number(item.purchasedQuantity).toFixed(4)}주</em>
          </div>
        ))}
      </section>

      <p className="roadmap-disclaimer">
        S&P 500 적립 결과는 국내 상장 ETF 가격을 사용한 시뮬레이션이며 실제
        주문이나 수익을 보장하지 않습니다.
      </p>
    </main>
  )
}
