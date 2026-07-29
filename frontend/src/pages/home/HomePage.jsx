import { useEffect, useRef, useState } from 'react'
import {
  getActiveAssetGoal,
  getAssetGoalRoadmap,
  getTransactionOpportunity,
} from '../../services/assetGoals'
import useDashboardData from '../dashboard/hooks/useDashboardData'
import './HomePage.css'

function formatWon(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function OpportunitySheet({ loading, result, transaction, onClose }) {
  return (
    <div className="opportunity-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="소비 기회비용"
        className="opportunity-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="sheet-handle" />
        <button aria-label="닫기" onClick={onClose} type="button">×</button>
        {loading ? (
          <div className="opportunity-loading">
            <span>✦</span>
            <strong>이 소비의 다른 가능성을 계산하고 있어요</strong>
            <small>CHECK API에서 과거 ETF 가격을 확인하는 중</small>
          </div>
        ) : result ? (
          <>
            <span className="opportunity-eyebrow">WHAT IF?</span>
            <h2>
              {transaction.merchantName}에서 쓴
              <br />
              {formatWon(transaction.amount)}을 투자했다면
            </h2>
            <div className="opportunity-value-card">
              <span>
                {result.simulation.hypotheticalPurchaseDate
                  ? `${formatDate(result.simulation.hypotheticalPurchaseDate)} 기준`
                  : `${result.simulation.comparisonMonths}개월 전 기준`}{' '}
                가상 매수
              </span>
              <strong>{formatWon(result.simulation.currentValue)}</strong>
              <em>
                {result.simulation.gain >= 0 ? '+' : ''}
                {formatWon(result.simulation.gain)}
              </em>
            </div>
            <div className="opportunity-flow">
              <span>
                <small>당시 ETF 가격</small>
                <strong>{formatWon(result.simulation.purchasePrice)}</strong>
              </span>
              <i>→</i>
              <span>
                <small>현재 ETF 가격</small>
                <strong>{formatWon(result.simulation.currentPrice)}</strong>
              </span>
            </div>
            <p className="material-comparison">
              지금 가치라면 <strong>{result.materialComparison.label}</strong>을 약{' '}
              <strong>{result.materialComparison.quantity}개</strong> 선택할 수 있는
              금액이에요.
            </p>
            <small className="opportunity-disclaimer">{result.disclaimer}</small>
          </>
        ) : (
          <div className="opportunity-loading">
            <span>!</span>
            <strong>비교 시세를 불러오지 못했어요</strong>
            <small>CHECK API 시세가 준비된 뒤 다시 확인해 주세요.</small>
          </div>
        )}
      </section>
    </div>
  )
}

export default function HomePage({ auth, onNavigate }) {
  const { data, coaching, isLoading, errorMessage } = useDashboardData(
    auth?.accessToken,
  )
  const [goal, setGoal] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [opportunity, setOpportunity] = useState(null)
  const [opportunityLoading, setOpportunityLoading] = useState(false)
  const opportunityCache = useRef(new Map())

  useEffect(() => {
    let ignore = false

    async function loadGoal() {
      try {
        const active = await getActiveAssetGoal(auth.accessToken)
        if (!active.goal || ignore) return
        const roadmapResult = await getAssetGoalRoadmap(
          auth.accessToken,
          active.goal.goalId,
        )
        if (!ignore) {
          setGoal(active.goal)
          setRoadmap(roadmapResult)
        }
      } catch {
        // 홈 소비 정보는 목표 API 오류와 독립적으로 표시한다.
      }
    }

    loadGoal()
    return () => {
      ignore = true
    }
  }, [auth.accessToken])

  const openOpportunity = async (transaction) => {
    setSelectedTransaction(transaction)
    const cachedOpportunity = opportunityCache.current.get(transaction.id)

    if (cachedOpportunity) {
      setOpportunity(cachedOpportunity)
      setOpportunityLoading(false)
      return
    }

    setOpportunity(null)
    setOpportunityLoading(true)

    try {
      const result = await getTransactionOpportunity(
        auth.accessToken,
        transaction.id,
      )
      opportunityCache.current.set(transaction.id, result)
      setOpportunity(result)
    } catch {
      if (import.meta.env.DEV) {
        setOpportunity({
          simulation: {
            comparisonMonths: transaction.amount >= 300000 ? 36 : 12,
            currentValue: Math.round(transaction.amount * 1.34),
            gain: Math.round(transaction.amount * 0.34),
            purchasePrice: 18800,
            currentPrice: 25180,
          },
          materialComparison: {
            label: transaction.amount > 50000 ? '외식 한 번' : '치킨 한 마리',
            quantity: Math.max(1, Math.round(transaction.amount * 1.34 / 2500) / 10),
          },
          disclaimer:
            '개발용 시세를 이용한 가상 비교이며 실제 수익이나 미래 성과를 보장하지 않습니다.',
        })
      }
    } finally {
      setOpportunityLoading(false)
    }
  }

  const nickname = auth?.user?.nickname || auth?.user?.name || '진원'
  const summary = data?.summary || {}
  const progress = roadmap?.progress
  const achievement = Math.round(Number(progress?.achievementRate || 0) * 100)

  return (
    <main className="seed-home-page">
      <header className="seed-home-header">
        <div>
          <span>KOSPAY</span>
          <strong>Save to Invest</strong>
        </div>
        <button onClick={() => onNavigate('/my')} type="button">
          {nickname.slice(0, 1)}
        </button>
      </header>

      <section className="home-greeting">
        <span>{nickname}님의 시드머니 루틴</span>
        <h1>덜 쓴 돈을<br />매주 자산으로 바꿔요</h1>
      </section>

      {goal && roadmap ? (
        <button
          className="home-goal-card"
          onClick={() => onNavigate('/roadmap')}
          type="button"
        >
          <div>
            <span>{goal.title}</span>
            <strong>{formatWon(progress.mixedCurrentValue)}</strong>
            <small>목표 {formatWon(goal.targetAmount)}</small>
          </div>
          <div className="home-goal-ring" style={{ '--progress': achievement }}>
            <strong>{achievement}%</strong>
          </div>
          <span className="home-goal-track">
            <i style={{ width: `${Math.max(achievement, 2)}%` }} />
          </span>
          <p>
            S&P 500 적립으로 현금 보유보다{' '}
            <strong>
              {Number(progress.differenceFromCashOnly) >= 0 ? '+' : ''}
              {formatWon(progress.differenceFromCashOnly)}
            </strong>
          </p>
        </button>
      ) : (
        <button
          className="home-goal-empty"
          onClick={() => onNavigate('/coach')}
          type="button"
        >
          <span>✦</span>
          <div>
            <strong>첫 시드머니 목표를 만들어 보세요</strong>
            <small>목표 금액과 기간을 말하면 AI가 계획해요</small>
          </div>
          <em>→</em>
        </button>
      )}

      <section className="home-monthly-card">
        <header>
          <div>
            <span>이번 달 소비</span>
            <strong>{formatWon(summary.totalSpendingAmount)}</strong>
          </div>
          <button onClick={() => onNavigate('/spending')} type="button">
            전체 보기
          </button>
        </header>
        <div>
          <span>
            <small>지난달 대비</small>
            <strong>{Number(summary.monthlyChangeRate || 0) > 0 ? '+' : ''}{summary.monthlyChangeRate || 0}%</strong>
          </span>
          <span>
            <small>결제 건수</small>
            <strong>{summary.paymentCount || 0}건</strong>
          </span>
          <span>
            <small>평균 결제</small>
            <strong>{formatWon(summary.averagePaymentAmount)}</strong>
          </span>
        </div>
      </section>

      <button className="home-ai-coach-card" onClick={() => onNavigate('/coach')} type="button">
        <span className="home-ai-icon">✦</span>
        <div>
          <span>오늘의 AI 코칭</span>
          <strong>
            {coaching?.coaching?.message ||
              data?.savingCoachPreview?.message ||
              '소비 패턴을 바탕으로 이번 주 절약 계획을 세워볼까요?'}
          </strong>
        </div>
        <em>→</em>
      </button>

      <section className="home-transactions">
        <header>
          <div>
            <span>최근 소비</span>
            <strong>이 돈의 다른 가능성을 눌러보세요</strong>
          </div>
          <small>CHECK 시세 비교</small>
        </header>
        {isLoading && <p>소비 내역을 불러오고 있어요…</p>}
        {errorMessage && <p>{errorMessage}</p>}
        {(data?.recentTransactions || []).map((transaction) => (
          <button
            key={transaction.id}
            onClick={() => openOpportunity(transaction)}
            type="button"
          >
            <span className="transaction-category-icon">{transaction.icon}</span>
            <div>
              <strong>{transaction.merchantName}</strong>
              <small>{transaction.category} · 가치 비교하기</small>
            </div>
            <em>-{formatWon(transaction.amount)}</em>
            <span className="transaction-what-if">?</span>
          </button>
        ))}
      </section>

      <p className="home-disclaimer">
        투자 비교는 과거 ETF 가격을 사용한 시뮬레이션이며 실제 주문이나 수익을
        보장하지 않습니다.
      </p>

      {selectedTransaction && (
        <OpportunitySheet
          loading={opportunityLoading}
          onClose={() => setSelectedTransaction(null)}
          result={opportunity}
          transaction={selectedTransaction}
        />
      )}
    </main>
  )
}
