import { useEffect, useState } from 'react'
import {
  createAssetGoal,
  getActiveAssetGoal,
  getAssetGoalAnalysis,
} from '../../../services/assetGoals'
import './AssetGoalPlanner.css'

function formatWon(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`
}

export default function AssetGoalPlanner({ token, onNavigate }) {
  const [goal, setGoal] = useState(null)
  const [targetAmount, setTargetAmount] = useState(10000000)
  const [durationMonths, setDurationMonths] = useState(36)
  const [analysis, setAnalysis] = useState(null)
  const [ratio, setRatio] = useState(40)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    getActiveAssetGoal(token)
      .then((result) => setGoal(result.goal))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const analyze = async () => {
    setAnalyzing(true)
    setErrorMessage('')

    try {
      const result = await getAssetGoalAnalysis(token)
      setAnalysis(result)
      setRatio(result.investmentRecommendation.ratio)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const saveGoal = async () => {
    setAnalyzing(true)
    setErrorMessage('')

    try {
      const result = await createAssetGoal(token, {
        title: '나의 첫 시드머니',
        targetAmount,
        durationMonths,
        selectedInvestmentRatio: ratio,
      })
      setGoal(result.goal)
      setAnalysis(null)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return null
  }

  if (goal) {
    return (
      <section className="coach-goal-active">
        <div>
          <span>진행 중인 자산 목표</span>
          <strong>{goal.title}</strong>
          <small>
            {formatWon(goal.targetAmount)} · {goal.targetDate}까지
          </small>
        </div>
        <div className="coach-goal-ratio">
          <span>절약액 투자 비중</span>
          <strong>{goal.selectedInvestmentRatio}%</strong>
        </div>
        <button onClick={() => onNavigate('/roadmap')} type="button">
          로드맵 보기 →
        </button>
      </section>
    )
  }

  return (
    <section className="coach-goal-planner">
      <header>
        <span>AI 목표 플래너</span>
        <strong>얼마를 언제까지 모으고 싶나요?</strong>
        <p>목표를 월별·주별 챌린지로 나눠 실행 가능한 계획을 만들어요.</p>
      </header>
      <div className="goal-planner-inputs">
        <label>
          <span>목표 금액</span>
          <div>
            <input
              min="10000"
              onChange={(event) => setTargetAmount(Number(event.target.value))}
              step="100000"
              type="number"
              value={targetAmount}
            />
            <em>원</em>
          </div>
        </label>
        <label>
          <span>목표 기간</span>
          <select
            onChange={(event) => setDurationMonths(Number(event.target.value))}
            value={durationMonths}
          >
            <option value="12">1년</option>
            <option value="24">2년</option>
            <option value="36">3년</option>
            <option value="60">5년</option>
          </select>
        </label>
      </div>
      <div className="monthly-goal-preview">
        <span>매월 필요한 시드머니</span>
        <strong>{formatWon(targetAmount / durationMonths)}</strong>
      </div>

      {!analysis ? (
        <button disabled={analyzing} onClick={analyze} type="button">
          {analyzing ? '마이데이터 분석 중…' : '소비 분석하고 플랜 만들기'}
        </button>
      ) : (
        <div className="goal-analysis-result">
          <div className="analysis-summary">
            <span>AI 분석 결과</span>
            <strong>
              월 {formatWon(analysis.savingAnalysis.monthlySavingCapacity)} 확보 가능
            </strong>
            <small>
              최근 거래 {analysis.savingAnalysis.transactionCount}건에서 줄이기 쉬운
              영역을 찾았어요.
            </small>
          </div>
          <div className="analysis-opportunities">
            {analysis.savingAnalysis.opportunities.slice(0, 3).map((item) => (
              <span key={item.category}>
                <strong>{item.category}</strong>
                <em>+{formatWon(item.estimatedSavingAmount)}</em>
              </span>
            ))}
          </div>
          <label className="goal-ratio-control">
            <span>
              <strong>S&P 500 적립 비중</strong>
              <em>{ratio}%</em>
            </span>
            <input
              max="80"
              min="20"
              onChange={(event) => setRatio(Number(event.target.value))}
              step="10"
              type="range"
              value={ratio}
            />
            <small>{analysis.investmentRecommendation.reason}</small>
          </label>
          <button disabled={analyzing} onClick={saveGoal} type="button">
            이 플랜으로 시작하기
          </button>
        </div>
      )}
      {errorMessage && <p className="goal-planner-error">{errorMessage}</p>}
    </section>
  )
}
