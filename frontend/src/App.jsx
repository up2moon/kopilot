import { useCallback, useEffect, useState } from 'react'
import TestPage from './TestPage'
import {
  clearAuth,
  getStoredAuth,
  login,
  logout,
  saveAuth,
  signup,
} from './services/auth'
import {
  connectMyData,
  getBudgetCategories,
  getTransactions,
  saveBudgets,
  skipBudgetGoals,
} from './services/onboarding'
import './App.css'

const routes = {
  login: '/login',
  signup: '/signup',
  firstLogin: '/first-login',
  firstLoginMyDataConnect: '/first-login/mydata-connect',
  dashboard: '/dashboard',
  test: '/test',
}

const defaultSelectedCategories = ['식비', '카페·간식', '쇼핑']

function getInitialRoute() {
  const pathname = window.location.pathname

  if (pathname === routes.signup) {
    return routes.signup
  }

  if (pathname === routes.firstLogin) {
    return routes.firstLogin
  }

  if (pathname === routes.firstLoginMyDataConnect) {
    return routes.firstLoginMyDataConnect
  }

  if (pathname === routes.test) {
    return routes.test
  }

  if (pathname === routes.dashboard) {
    return routes.dashboard
  }

  return routes.login
}

function normalizeDefaultRoute() {
  const knownRoutes = Object.values(routes)

  if (!knownRoutes.includes(window.location.pathname)) {
    window.history.replaceState({}, '', routes.login)
  }
}

function App() {
  const [route, setRoute] = useState(getInitialRoute)
  const [auth, setAuth] = useState(getStoredAuth)

  useEffect(() => {
    const handlePopState = () => {
      normalizeDefaultRoute()
      setRoute(getInitialRoute())
    }

    normalizeDefaultRoute()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (nextRoute) => {
    window.history.pushState({}, '', nextRoute)
    setRoute(nextRoute)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (
      (route === routes.dashboard ||
        route === routes.firstLogin ||
        route === routes.firstLoginMyDataConnect) &&
      !auth
    ) {
      navigate(routes.login)
    }

    if (route === routes.dashboard && auth && !auth.user.firstLoginCompleted) {
      navigate(routes.firstLogin)
    }

    if (
      (route === routes.firstLogin || route === routes.firstLoginMyDataConnect) &&
      auth?.user.firstLoginCompleted
    ) {
      navigate(routes.dashboard)
    }
  }, [route, auth])

  const handleAuthSuccess = (nextAuth) => {
    saveAuth(nextAuth)
    setAuth(nextAuth)
    navigate(nextAuth.user.firstLoginCompleted ? routes.dashboard : routes.firstLogin)
  }

  const handleUserUpdate = (user) => {
    const nextAuth = {
      ...auth,
      user,
    }

    saveAuth(nextAuth)
    setAuth(nextAuth)
  }

  const handleLogout = async () => {
    const refreshToken = auth?.refreshToken

    clearAuth()
    setAuth(null)
    navigate(routes.login)

    if (refreshToken) {
      try {
        await logout(refreshToken)
      } catch {
        // Local logout should not be blocked by a stale refresh token.
      }
    }
  }

  if (route === routes.test) {
    return <TestPage />
  }

  if (route === routes.dashboard) {
    if (!auth) {
      return null
    }

    return (
      <main className="app-shell">
        <section className="phone-frame" aria-label="Kopilot dashboard">
          <DashboardScreen auth={auth} onLogout={handleLogout} />
        </section>
      </main>
    )
  }

  if (route === routes.firstLogin || route === routes.firstLoginMyDataConnect) {
    if (!auth) {
      return null
    }

    return (
      <main className="app-shell">
        <section className="phone-frame" aria-label="Kopilot first login setup">
          <FirstLoginScreen
            auth={auth}
            currentRoute={route}
            onNavigate={navigate}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
        <section className="phone-frame" aria-label="Kopilot authentication">
        {route === routes.signup ? (
          <SignupScreen onNavigate={navigate} />
        ) : (
          <LoginScreen onNavigate={navigate} onAuthSuccess={handleAuthSuccess} />
        )}
      </section>
    </main>
  )
}

function BrandHeader({ chip }) {
  return (
    <header className="brand-header">
      <div className="brand-lockup">
        <div className="logo-mark" aria-hidden="true">
          K
        </div>
        <span>Kopilot</span>
      </div>

      {chip ? <span className="value-chip">{chip}</span> : null}
    </header>
  )
}

function formatWon(value) {
  return `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`
}

function formatSignedWon(value) {
  const amount = Number(value) || 0
  const prefix = amount < 0 ? '-' : ''

  return `${prefix}${Math.abs(amount).toLocaleString('ko-KR')}원`
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return '-'
  }
}

function getMonthLabel(month) {
  const [year, monthNumber] = String(month).split('-')

  return `${year}년 ${Number(monthNumber)}월`
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function TransactionHistoryPanel({ token }) {
  const [transactions, setTransactions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    setIsOpen(true)

    if (transactions.length || isLoading) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getTransactions(token)

      setTransactions(data.transactions)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="transaction-history-section">
      <button className="secondary-button" type="button" onClick={handleToggle}>
        {isOpen ? '결제내역 접기' : '생성된 결제내역 보기'}
      </button>

      {isOpen ? (
        <div className="transaction-history-card">
          <div className="transaction-history-head">
            <strong>결제내역</strong>
            <span>{transactions.length}건</span>
          </div>

          {isLoading ? (
            <div className="transaction-loading">
              <span className="loading-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : null}

          {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

          {!isLoading && !errorMessage && !transactions.length ? (
            <p className="transaction-empty">아직 확인할 결제내역이 없어요.</p>
          ) : null}

          <div className="transaction-list">
            {transactions.map((transaction) => (
              <article className="transaction-item" key={transaction.id}>
                <span className="transaction-icon">{transaction.icon}</span>
                <div>
                  <strong>{transaction.merchantName}</strong>
                  <p>
                    {transaction.category} · {formatDateTime(transaction.approvedAt)}
                  </p>
                </div>
                <em>-{formatWon(transaction.amount)}</em>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SetupTopBar({ step, title = '초기 설정', onBack }) {
  return (
    <header className="setup-topbar">
      {onBack ? (
        <button className="back-button" type="button" onClick={onBack} aria-label="이전">
          &lt;
        </button>
      ) : (
        <div className="setup-brand">
          <div className="logo-mark" aria-hidden="true">
            K
          </div>
          <span>Kopilot</span>
        </div>
      )}

      {onBack ? <h1>{title}</h1> : null}
      <span className="setup-step-chip">{step}/6{step === 1 ? ' 초기 설정' : ''}</span>
    </header>
  )
}

function FeatureList({ title, items }) {
  return (
    <section className="setup-card feature-list">
      <h2>{title}</h2>
      <div className="feature-items">
        {items.map((item) => (
          <div className="feature-item" key={item.title}>
            <span className="feature-icon">{item.icon}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FirstLoginScreen({ auth, currentRoute, onNavigate, onLogout, onUserUpdate }) {
  const token = auth.accessToken
  const [step, setStep] = useState(
    currentRoute === routes.firstLoginMyDataConnect ? 3 : 1,
  )
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState(defaultSelectedCategories)
  const [budgetSeed, setBudgetSeed] = useState(null)
  const [budgetInputs, setBudgetInputs] = useState({})
  const [myDataResult, setMyDataResult] = useState(null)
  const [completedBudgetStatus, setCompletedBudgetStatus] = useState(null)
  const [skippedBudgetSetup, setSkippedBudgetSetup] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [autoConnectStarted, setAutoConnectStarted] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadCategories() {
      try {
        const data = await getBudgetCategories(token)

        if (!ignore) {
          setCategories(data.categories)
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message)
        }
      }
    }

    loadCategories()

    return () => {
      ignore = true
    }
  }, [token])

  const getSeedForCategory = (category) =>
    budgetSeed?.categories?.find((item) => item.category === category)

  const getBudgetValue = (category) => {
    const savedValue = budgetInputs[category]

    if (savedValue) {
      return savedValue
    }

    return String(getSeedForCategory(category)?.recommendedAmount || 100000)
  }

  const setBudgetValue = (category, value) => {
    setBudgetInputs((current) => ({
      ...current,
      [category]: String(Math.max(0, Number(value) || 0)),
    }))
  }

  const moveBudget = (category, delta) => {
    setBudgetValue(category, Number(getBudgetValue(category)) + delta)
  }

  const applyRecommendedBudgets = () => {
    setBudgetInputs(
      Object.fromEntries(
        selectedCategories.map((category) => [
          category,
          String(getSeedForCategory(category)?.recommendedAmount || 100000),
        ]),
      ),
    )
  }

  const handleConnect = useCallback(async () => {
    setErrorMessage('')
    setIsProcessing(true)
    setStep(3)
    onNavigate(routes.firstLoginMyDataConnect)

    try {
      const [result] = await Promise.all([connectMyData(token), wait(900)])

      setMyDataResult(result)
      setBudgetSeed(result.budgetSeed)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsProcessing(false)
    }
  }, [onNavigate, token])

  const handleSkipGoals = async () => {
    setErrorMessage('')
    setIsProcessing(true)

    try {
      const result = await skipBudgetGoals(token)

      setSkippedBudgetSetup(true)
      setCompletedBudgetStatus(null)
      onUserUpdate(result.user)
      setStep(6)
      onNavigate(routes.firstLogin)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (
      currentRoute === routes.firstLoginMyDataConnect &&
      step === 3 &&
      !myDataResult &&
      !isProcessing &&
      !errorMessage &&
      !autoConnectStarted
    ) {
      setAutoConnectStarted(true)
      handleConnect()
    }
  }, [autoConnectStarted, currentRoute, errorMessage, handleConnect, isProcessing, myDataResult, step])

  const toggleCategory = (category) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  const completeBudgets = async () => {
    setErrorMessage('')
    setIsProcessing(true)

    try {
      const result = await saveBudgets(token, {
        month: budgetSeed?.month,
        budgets: selectedCategories.map((category) => ({
          category,
          targetAmount: Number(getBudgetValue(category)),
        })),
      })

      setCompletedBudgetStatus(result.budgetStatus)
      onUserUpdate(result.user)
      setStep(6)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedRows = selectedCategories.map((category) => {
    const seed = getSeedForCategory(category)
    const targetAmount = Number(getBudgetValue(category))
    const usedAmount = seed?.usedAmount || 0
    const remainingAmount = targetAmount - usedAmount
    const progressRate = targetAmount > 0 ? Math.min(100, Math.round((usedAmount / targetAmount) * 100)) : 0

    return {
      category,
      icon: categories.find((item) => item.name === category)?.icon || seed?.icon || '•',
      targetAmount,
      usedAmount,
      remainingAmount,
      progressRate,
    }
  })

  const totalRemainingAmount = selectedRows.reduce(
    (sum, category) => sum + category.remainingAmount,
    0,
  )
  const monthLabel = getMonthLabel(budgetSeed?.month || new Date().toISOString().slice(0, 7))

  return (
    <div className={`first-login-screen first-login-step-${step}`}>
      {step === 1 ? (
        <>
          <SetupTopBar step={1} />
          <section className="setup-hero">
            <h1>
              절약과 자산 형성을 함께하는
              <br />
              AI 코파일럿, KoPilot
            </h1>
            <p>소비 내역을 분석하고 나에게 맞는 절약 목표를 설정해보세요.</p>
          </section>

          <FeatureList
            title="첫 설정 후 바로 받는 것"
            items={[
              {
                icon: '1',
                title: '소비 분석',
                description: '결제 내역을 카테고리별로 정리해요',
              },
              {
                icon: '2',
                title: 'AI 절약 코치',
                description: '최근 패턴에 맞는 목표를 추천해요',
              },
            ]}
          />

          <section className="challenge-mini-card">
            <strong>절약 챌린지</strong>
            <p>처음 설정한 예산을 기준으로 이번 달 실천 미션을 제안해요.</p>
          </section>

          <p className="setup-notice">투자효과는 투자 권유가 아닌 참고용 시뮬레이션입니다.</p>

          <button className="primary-button setup-fixed-button" type="button" onClick={() => setStep(2)}>
            시작하기
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <SetupTopBar step={2} onBack={() => setStep(1)} />
          <section className="setup-hero">
            <h1>
              소비 분석을 위해
              <br />
              마이데이터 연동이 필요해요
            </h1>
            <p>KoPilot은 결제 내역을 기반으로 소비 패턴을 분석하고 절약 목표를 추천해요.</p>
          </section>

          <FeatureList
            title="연동하면 가능한 일"
            items={[
              {
                icon: '카드',
                title: '결제 내역 분석',
                description: '승인일시, 가맹점명, 결제금액을 읽어요',
              },
              {
                icon: '분류',
                title: '소비 카테고리 분류',
                description: '가맹점과 금액으로 식비, 카페 등을 나눠요',
              },
              {
                icon: '동의',
                title: '사용자 동의 기반',
                description: '실제 금융 데이터는 동의 후에만 연결돼요',
              },
            ]}
          />

          {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

          <div className="setup-actions">
            <button className="primary-button" type="button" onClick={handleConnect} disabled={isProcessing}>
              마이데이터 연동하기
            </button>
            <button className="secondary-button" type="button" onClick={handleSkipGoals} disabled={isProcessing}>
              나중에 하기
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <SetupTopBar
            step={3}
            title="마이데이터 연동"
            onBack={() => {
              setStep(2)
              onNavigate(routes.firstLogin)
            }}
          />

          <div className="mydata-complete-hero" aria-live="polite">
            <div className="mydata-complete-icon" aria-hidden="true">
              {isProcessing ? (
                <span className="loading-dots">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                '✓'
              )}
            </div>
            <h1>
              {isProcessing ? (
                <>
                  마이데이터 연동을
                  <br />
                  처리하고 있어요
                </>
              ) : (
                <>
                  마이데이터 연동이
                  <br />
                  완료되었어요
                </>
              )}
            </h1>
            <p>{isProcessing ? '잠시만 기다려주세요.' : '이제 소비 카테고리를 추가해요.'}</p>
            {!isProcessing && errorMessage ? <p className="form-message">{errorMessage}</p> : null}
          </div>

          <div className="mydata-connect-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                if (myDataResult || budgetSeed) {
                  setStep(4)
                  onNavigate(routes.firstLogin)
                  return
                }

                handleConnect()
              }}
              disabled={isProcessing}
            >
              {isProcessing ? '생성 중' : '소비 카테고리 추가하기'}
            </button>
            <button className="secondary-button" type="button" onClick={handleSkipGoals} disabled={isProcessing}>
              나중에 하기
            </button>
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <SetupTopBar step={4} onBack={() => setStep(2)} />
          <section className="setup-hero category-hero">
            <h1>
              관리하고 싶은 소비
              <br />
              카테고리를 선택해주세요
            </h1>
            <p>선택한 카테고리를 기준으로 월 예산과 절약 챌린지를 설정할 수 있어요.</p>
          </section>

          <section className="selected-summary-card">
            <strong>{selectedCategories.length}개 선택됨</strong>
            <p>기본 선택값은 식비, 카페·간식, 쇼핑이에요.</p>
          </section>

          <section className="category-grid" aria-label="소비 카테고리">
            {categories.map((category) => {
              const selected = selectedCategories.includes(category.name)

              return (
                <button
                  className={`category-card${selected ? ' is-selected' : ''}`}
                  type="button"
                  onClick={() => toggleCategory(category.name)}
                  key={category.name}
                >
                  <span className="category-icon">{category.icon}</span>
                  <strong>{category.name}</strong>
                  <small>{category.description.split(',')[0]}</small>
                  {selected ? <em>✓</em> : null}
                </button>
              )
            })}
          </section>

          <div className="split-actions">
            <button className="secondary-button" type="button" onClick={() => setStep(2)}>
              이전
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                applyRecommendedBudgets()
                setStep(5)
              }}
              disabled={!selectedCategories.length}
            >
              다음
            </button>
          </div>
        </>
      ) : null}

      {step === 5 ? (
        <>
          <SetupTopBar step={5} onBack={() => setStep(4)} />
          <section className="setup-hero budget-hero">
            <h1>
              이번 달 예산을
              <br />
              서로를 위해 지키고
            </h1>
            <p>원하는 예산을 설정하고 얼마나 썼는지 확인해보세요.</p>
          </section>

          <section className="budget-summary-card">
            <span>{monthLabel}</span>
            <strong>{formatSignedWon(totalRemainingAmount)} 남음</strong>
            <p>
              최근 소비 흐름을 기준으로 추천 예산을 계산했어요.
            </p>
          </section>

          <section className="recommend-card">
            <strong>추천 예산</strong>
            <p>최근 1개월 소비에서 약 15% 줄인 목표를 카테고리별로 제안해요.</p>
          </section>

          <section className="budget-list" aria-label="카테고리별 예산 목표">
            {selectedRows.map((row) => (
              <article className="budget-row" key={row.category}>
                <div className="budget-row-main">
                  <span className="budget-icon">{row.icon}</span>
                  <div>
                    <strong>{row.category}</strong>
                    <label>
                      <span>목표</span>
                      <input
                        type="number"
                        min="1"
                        step="10000"
                        value={getBudgetValue(row.category)}
                        onChange={(event) => setBudgetValue(row.category, event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="budget-controls">
                    <span>{formatSignedWon(row.remainingAmount)}</span>
                    <button type="button" onClick={() => moveBudget(row.category, -10000)}>
                      -
                    </button>
                    <button type="button" onClick={() => moveBudget(row.category, 10000)}>
                      +
                    </button>
                  </div>
                </div>
                <span className="budget-progress-track" aria-hidden="true">
                  <span style={{ width: `${row.progressRate}%` }} />
                </span>
                <div className="budget-row-meta">
                  <span>사용 {formatWon(row.usedAmount)}</span>
                  <span>{row.progressRate}%</span>
                </div>
              </article>
            ))}
          </section>

          {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

          <div className="split-actions budget-actions">
            <button className="secondary-button" type="button" onClick={applyRecommendedBudgets}>
              추천 예산 적용
            </button>
            <button className="primary-button" type="button" onClick={completeBudgets} disabled={isProcessing}>
              {isProcessing ? '저장 중' : '예산 설정 완료'}
            </button>
          </div>
        </>
      ) : null}

      {step === 6 ? (
        <>
          <SetupTopBar step={6} />
          <section className="complete-hero">
            <div className="complete-icon" aria-hidden="true">
              ✓
            </div>
            <h1>
              예산 설정이
              <br />
              완료되었어요
            </h1>
            <p>이제 KoPilot이 소비를 분석하고 절약 챌린지를 추천해드릴게요.</p>
          </section>

          <section className="setup-card completed-summary-card">
            <h2>초기 설정 요약</h2>
            <div className="feature-item">
              <span className="feature-icon">연동</span>
              <div>
                <strong>마이데이터</strong>
                <p>
                  {myDataResult ? '연동 완료' : '나중에 연동하기로 했어요'}
                </p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">예산</span>
              <div>
                <strong>
                  {skippedBudgetSetup
                    ? '소비 목표 설정 건너뜀'
                    : `월 예산 ${completedBudgetStatus?.categories?.length || 0}개`}
                </strong>
                <p>
                  {skippedBudgetSetup
                    ? '대시보드가 준비되면 설정에서 다시 추가할 수 있어요.'
                    : `총 남은 금액 ${formatSignedWon(completedBudgetStatus?.totalRemainingAmount || 0)}`}
                </p>
              </div>
            </div>
          </section>

          <section className="next-coach-card">
            <strong>임시 완료 화면</strong>
            <p>대시보드가 완성되면 이 다음 화면에서 소비 분석과 AI 절약 코치를 보여줄 예정입니다.</p>
          </section>

          {myDataResult ? <TransactionHistoryPanel token={token} /> : null}

          <button className="secondary-button complete-logout-button" type="button" onClick={onLogout}>
            로그아웃
          </button>
        </>
      ) : null}
    </div>
  )
}

function LoginScreen({ onNavigate, onAuthSuccess }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      const authResult = await login({
        email: formData.get('email'),
        password: formData.get('password'),
      })

      onAuthSuccess(authResult)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-screen auth-screen-login">
      <BrandHeader chip="AI 절약 코치" />

      <section className="hero-copy">
        <h1>
          소비를 줄이는 순간,
          <br />
          자산 형성이 시작돼요
        </h1>
        <p>마이데이터 소비 분석과 절약 챌린지를 한 화면에서 확인하세요.</p>
      </section>

      <section className="insight-card" aria-label="이번 달 소비 인사이트">
        <h2>이번 달 소비 인사이트</h2>
        <div className="insight-row">
          <span>커피 지출</span>
          <strong>300,000원</strong>
        </div>
        <div className="saving-row">
          <strong>+60,000원 절약 가능</strong>
          <span className="progress-track" aria-hidden="true">
            <span className="progress-bar" />
          </span>
        </div>
      </section>

      <form className="auth-panel login-panel" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <h2>Kopilot 시작하기</h2>
          <p>나만의 절약 코치를 만나보세요.</p>
        </div>

        <label className="field-label">
          <span className="sr-only">이메일</span>
          <input
            type="email"
            name="email"
            placeholder="이메일"
            autoComplete="email"
            required
          />
        </label>

        <label className="field-label">
          <span className="sr-only">비밀번호</span>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            required
          />
        </label>

        {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중' : '로그인'}
        </button>
      </form>

      <p className="auth-switch login-switch">
        아직 계정이 없나요?
        <button type="button" onClick={() => onNavigate(routes.signup)}>
          무료로 시작하기
        </button>
      </p>
    </div>
  )
}

function SignupScreen({ onNavigate }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const formData = new FormData(event.currentTarget)
    const password = formData.get('password')
    const passwordConfirm = formData.get('passwordConfirm')

    if (!formData.get('agreement')) {
      setErrorMessage('필수 약관에 동의해주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)

    try {
      await signup({
        name: formData.get('name'),
        email: formData.get('email'),
        password,
        confirmPassword: passwordConfirm,
      })

      onNavigate(routes.login)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-screen auth-screen-signup">
      <BrandHeader />

      <section className="hero-copy signup-hero">
        <p className="eyebrow">START WITH Kopilot</p>
        <h1>
          3분 만에 시작하는
          <br />
          나만의 절약 코치
        </h1>
        <p>소비 패턴을 연결하면 AI가 줄일 수 있는 항목을 찾아요.</p>
      </section>

      <form className="auth-panel signup-panel" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <h2>회원가입</h2>
          <p>Kopilot을 바로 시작할 수 있어요.</p>
        </div>

        <label className="field-label">
          <span className="sr-only">이름</span>
          <input
            type="text"
            name="name"
            placeholder="이름"
            autoComplete="name"
            required
          />
        </label>

        <label className="field-label">
          <span className="sr-only">이메일</span>
          <input
            type="email"
            name="email"
            placeholder="이메일"
            autoComplete="email"
            required
          />
        </label>

        <label className="field-label">
          <span className="sr-only">비밀번호</span>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="field-label">
          <span className="sr-only">비밀번호 확인</span>
          <input
            type="password"
            name="passwordConfirm"
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="agreement-row">
          <input type="checkbox" name="agreement" defaultChecked />
          <span>필수 약관에 동의해요</span>
        </label>

        {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

        <p className="auth-switch signup-switch">
          이미 계정이 있나요?
          <button type="button" onClick={() => onNavigate(routes.login)}>
            로그인
          </button>
        </p>

        <button className="primary-button signup-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? '가입 중' : '가입하고 분석 시작'}
        </button>
      </form>
    </div>
  )
}

function DashboardScreen({ auth, onLogout }) {
  const user = auth.user

  return (
    <div className="first-login-screen first-login-complete-dashboard">
      <SetupTopBar step={6} />
      <section className="complete-hero">
        <div className="complete-icon" aria-hidden="true">
          ✓
        </div>
        <h1>
          첫 로그인 설정이
          <br />
          완료되었어요
        </h1>
        <p>{user.nickname}님, 대시보드가 완성되면 소비 분석과 AI 절약 코치를 보여드릴게요.</p>
      </section>

      <section className="setup-card completed-summary-card">
        <h2>초기 설정 요약</h2>
        <div className="feature-item">
          <span className="feature-icon">연동</span>
          <div>
            <strong>마이데이터</strong>
            <p>{user.myDataConnected ? '연동 완료' : '나중에 연동하기로 했어요'}</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">예산</span>
          <div>
            <strong>{user.budgetSetupCompleted ? '소비 목표 설정 완료' : '소비 목표 설정 건너뜀'}</strong>
            <p>대시보드가 준비되면 설정에서 다시 관리할 수 있어요.</p>
          </div>
        </div>
      </section>

      <section className="next-coach-card">
        <strong>임시 완료 화면</strong>
        <p>아직 대시보드가 개발되지 않아 첫 로그인 설정 완료 페이지를 보여주고 있어요.</p>
      </section>

      {user.myDataConnected ? <TransactionHistoryPanel token={auth.accessToken} /> : null}

      <button className="secondary-button" type="button" onClick={onLogout}>
        로그아웃
      </button>
    </div>
  )
}

export default App
