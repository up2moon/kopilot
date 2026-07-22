import { useEffect, useState } from 'react'
import TestPage from './TestPage'
import {
  clearAuth,
  getStoredAuth,
  login,
  logout,
  saveAuth,
  signup,
} from './services/auth'
import './App.css'

const routes = {
  login: '/login',
  signup: '/signup',
  dashboard: '/dashboard',
  test: '/test',
}

function getInitialRoute() {
  const pathname = window.location.pathname

  if (pathname === routes.signup) {
    return routes.signup
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
    if (route === routes.dashboard && !auth) {
      navigate(routes.login)
    }
  }, [route, auth])

  const handleAuthSuccess = (nextAuth) => {
    saveAuth(nextAuth)
    setAuth(nextAuth)
    navigate(routes.dashboard)
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

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="Kopilot authentication">
        {route === routes.signup ? (
          <SignupScreen onNavigate={navigate} onAuthSuccess={handleAuthSuccess} />
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

function SignupScreen({ onNavigate, onAuthSuccess }) {
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
      const authResult = await signup({
        name: formData.get('name'),
        email: formData.get('email'),
        password,
        confirmPassword: passwordConfirm,
      })

      onAuthSuccess(authResult)
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
    <div className="dashboard-screen">
      <BrandHeader chip="로그인 완료" />

      <section className="dashboard-hero">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>
          {user.nickname}님,
          <br />
          Kopilot에 오신 걸 환영해요
        </h1>
        <p>마이데이터와 소비 카테고리 연결은 다음 단계에서 이어서 붙일 예정입니다.</p>
      </section>

      <section className="session-card" aria-label="인증 세션">
        <div>
          <span>계정</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>첫 로그인 설정</span>
          <strong>{user.firstLoginCompleted ? '완료' : '대기 중'}</strong>
        </div>
        <div>
          <span>액세스 토큰</span>
          <strong>{auth.accessTokenExpiresInSeconds / 60}분</strong>
        </div>
        <div>
          <span>리프레시 토큰</span>
          <strong>{auth.refreshTokenExpiresInSeconds / 86400}일</strong>
        </div>
      </section>

      <button className="secondary-button" type="button" onClick={onLogout}>
        로그아웃
      </button>
    </div>
  )
}

export default App
