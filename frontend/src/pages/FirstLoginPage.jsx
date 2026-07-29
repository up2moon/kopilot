import { useCallback, useEffect, useState } from 'react'
import arrowIcon from '../assets/icons/arrow.svg'
import MyDataConnectionAnimation from '../components/MyDataConnectionAnimation'
import {
  connectMyData,
  getBudgetCategories,
  getTransactions,
  saveBudgets,
  skipBudgetGoals,
} from '../services/onboarding'
import routes from '../routes'

const defaultSelectedCategories = ['식비', '카페·간식', '쇼핑']

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
          <img className="arrow-icon arrow-icon-back" src={arrowIcon} alt="" aria-hidden="true" />
        </button>
      ) : (
        <div className="setup-brand">
          <img
            className="logo-mark"
            src="/favicon-256x256.png"
            alt=""
            aria-hidden="true"
          />
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

function TermsAgreementModal({ isOpen, onClose, onConfirm }) {
  const [agreements, setAgreements] = useState({
    privacyCollection: false,
    privacyThirdParty: false,
    mydataService: false,
  })
  const [expandedSection, setExpandedSection] = useState(null)

  const isAllChecked =
    agreements.privacyCollection &&
    agreements.privacyThirdParty &&
    agreements.mydataService

  const handleToggleAll = () => {
    const nextState = !isAllChecked
    setAgreements({
      privacyCollection: nextState,
      privacyThirdParty: nextState,
      mydataService: nextState,
    })
  }

  const handleToggle = (key) => {
    setAgreements((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleExpand = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section))
  }

  if (!isOpen) return null

  return (
    <div className="terms-modal-overlay" onClick={onClose}>
      <div className="terms-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="terms-modal-header">
          <h2>개인정보 및 서비스 이용 동의</h2>
          <button
            type="button"
            className="terms-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <p className="terms-modal-sub">
          마이데이터 연동 및 결제내역 수집을 위해 필수 약관에 동의해주세요.
        </p>

        <div className="terms-list">
          <label className="terms-item terms-all">
            <input
              type="checkbox"
              checked={isAllChecked}
              onChange={handleToggleAll}
            />
            <span className="checkbox-custom" />
            <strong>전체 동의하기</strong>
          </label>

          <hr className="terms-divider" />

          {/* 1. 개인정보 수집·이용 동의 */}
          <div className="terms-item-wrapper">
            <div className="terms-item">
              <label className="terms-label">
                <input
                  type="checkbox"
                  checked={agreements.privacyCollection}
                  onChange={() => handleToggle('privacyCollection')}
                />
                <span className="checkbox-custom" />
                <span className="terms-badge">필수</span>
                <span className="terms-text">개인정보 수집·이용 동의</span>
              </label>
              <button
                type="button"
                className="terms-detail-btn"
                onClick={() => toggleExpand('privacyCollection')}
              >
                {expandedSection === 'privacyCollection' ? '접기 ▲' : '보기 ▼'}
              </button>
            </div>
            {expandedSection === 'privacyCollection' && (
              <div className="terms-detail-box">
                <p>
                  <strong>수집 및 이용 목적:</strong> Kospay 서비스 내 카드 결제 내역 분석, 카테고리 자동 분류 및 소비 인사이트 제공
                </p>
                <p>
                  <strong>수집 항목:</strong> 카드 승인 일시, 가맹점명, 결제 금액, 승인 상태
                </p>
                <p>
                  <strong>보유 및 이용 기간:</strong> 회원 탈퇴 시 또는 동의 철회 시까지
                </p>
              </div>
            )}
          </div>

          {/* 2. 개인정보 제3자 제공 동의 */}
          <div className="terms-item-wrapper">
            <div className="terms-item">
              <label className="terms-label">
                <input
                  type="checkbox"
                  checked={agreements.privacyThirdParty}
                  onChange={() => handleToggle('privacyThirdParty')}
                />
                <span className="checkbox-custom" />
                <span className="terms-badge">필수</span>
                <span className="terms-text">개인정보 제3자 제공 동의</span>
              </label>
              <button
                type="button"
                className="terms-detail-btn"
                onClick={() => toggleExpand('privacyThirdParty')}
              >
                {expandedSection === 'privacyThirdParty' ? '접기 ▲' : '보기 ▼'}
              </button>
            </div>
            {expandedSection === 'privacyThirdParty' && (
              <div className="terms-detail-box">
                <p>
                  <strong>제공받는 자:</strong> Kospay AI 분석 및 챌린지 모듈
                </p>
                <p>
                  <strong>제공 목적:</strong> AI 절약 코치 추천 메시지 생성, 카테고리별 예산 추천 및 주간 챌린지 미션 검증
                </p>
                <p>
                  <strong>제공 항목:</strong> 거래내역(승인일시, 금액, 가맹점명)
                </p>
              </div>
            )}
          </div>

          {/* 3. 마이데이터 서비스 이용 동의 */}
          <div className="terms-item-wrapper">
            <div className="terms-item">
              <label className="terms-label">
                <input
                  type="checkbox"
                  checked={agreements.mydataService}
                  onChange={() => handleToggle('mydataService')}
                />
                <span className="checkbox-custom" />
                <span className="terms-badge">필수</span>
                <span className="terms-text">마이데이터 서비스 이용 동의</span>
              </label>
              <button
                type="button"
                className="terms-detail-btn"
                onClick={() => toggleExpand('mydataService')}
              >
                {expandedSection === 'mydataService' ? '접기 ▲' : '보기 ▼'}
              </button>
            </div>
            {expandedSection === 'mydataService' && (
              <div className="terms-detail-box">
                <p>
                  <strong>서비스 내용:</strong> 신용정보주체의 전송요구권 행사에 따른 마이데이터 자산 및 결제 정보 통합 조회
                </p>
                <p>
                  <strong>동의 영향:</strong> 동의 시 최근 결제내역 데이터가 연동되어 맞춤형 소비 분석 기능을 이용할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="primary-button terms-confirm-btn"
          disabled={!isAllChecked}
          onClick={onConfirm}
        >
          동의하고 연동하기
        </button>
      </div>
    </div>
  )
}

function FirstLoginPage({ auth, currentRoute, onNavigate, onLogout, onUserUpdate }) {
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
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)

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
      setIsTermsModalOpen(true)
    }
  }, [autoConnectStarted, currentRoute, errorMessage, isProcessing, myDataResult, step])

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
      <TermsAgreementModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onConfirm={() => {
          setIsTermsModalOpen(false)
          handleConnect()
        }}
      />

      {step === 1 ? (
        <>
          <SetupTopBar step={1} />
          <section className="setup-hero">
            <h1>
              절약과 자산 형성을 함께하는
              <br />
              AI 코칭 서비스, Kospay
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
            <p>Kospay는 결제 내역을 기반으로 소비 패턴을 분석하고 절약 목표를 추천해요.</p>
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
            <button
              className="primary-button"
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              disabled={isProcessing}
            >
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
            {isProcessing ? (
              <MyDataConnectionAnimation />
            ) : (
              <div
                className={`mydata-complete-icon${!myDataResult ? ' is-pending' : ''}`}
                aria-hidden="true"
              >
                {myDataResult ? '✓' : '💳'}
              </div>
            )}
            <h1>
              {isProcessing ? (
                <>
                  마이데이터 연동을
                  <br />
                  처리하고 있어요
                </>
              ) : myDataResult ? (
                <>
                  마이데이터 연동이
                  <br />
                  완료되었어요
                </>
              ) : (
                <>
                  마이데이터 연동을
                  <br />
                  진행해주세요
                </>
              )}
            </h1>
            <p>
              {isProcessing
                ? '잠시만 기다려주세요. 금융기관과 연결하고 있어요.'
                : myDataResult
                ? '카드 결제 내역이 성공적으로 연결되었습니다.'
                : '개인정보 및 서비스 이용 동의 후 마이데이터를 연동합니다.'}
            </p>
            {!isProcessing && errorMessage ? <p className="form-message">{errorMessage}</p> : null}
          </div>

          <div className="mydata-connect-actions">
            {myDataResult ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setStep(4)
                  onNavigate(routes.firstLogin)
                }}
              >
                확인
              </button>
            ) : isProcessing ? (
              <button className="primary-button" type="button" disabled>
                처리 중
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
              >
                동의 및 연동하기
              </button>
            )}

            {!myDataResult && !isProcessing ? (
              <button className="secondary-button" type="button" onClick={handleSkipGoals}>
                나중에 하기
              </button>
            ) : null}
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
            <p>이제 Kospay가 소비를 분석하고 절약 챌린지를 추천해드릴게요.</p>
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

export default FirstLoginPage
