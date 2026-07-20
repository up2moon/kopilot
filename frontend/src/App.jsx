import { useEffect, useState } from 'react'
import './App.css'

const routes = {
  login: '/login',
  signup: '/signup',
}

function getInitialRoute() {
  return window.location.pathname === routes.signup ? routes.signup : routes.login
}

function App() {
  const [route, setRoute] = useState(getInitialRoute)

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getInitialRoute())
    }

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

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="Kopilot authentication">
        {route === routes.signup ? (
          <SignupScreen onNavigate={navigate} />
        ) : (
          <LoginScreen onNavigate={navigate} />
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

function LoginScreen({ onNavigate }) {
  const handleSubmit = (event) => {
    event.preventDefault()
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
          <input type="email" name="email" placeholder="이메일" autoComplete="email" />
        </label>

        <label className="field-label">
          <span className="sr-only">비밀번호</span>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoComplete="current-password"
          />
        </label>

        <button className="primary-button" type="submit">
          로그인
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
  const handleSubmit = (event) => {
    event.preventDefault()
    onNavigate(routes.login)
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
          <input type="text" name="name" placeholder="이름" autoComplete="name" />
        </label>

        <label className="field-label">
          <span className="sr-only">이메일</span>
          <input type="email" name="email" placeholder="이메일" autoComplete="email" />
        </label>

        <label className="field-label">
          <span className="sr-only">비밀번호</span>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoComplete="new-password"
          />
        </label>

        <label className="agreement-row">
          <input type="checkbox" defaultChecked />
          <span>필수 약관에 동의해요</span>
        </label>

        <p className="auth-switch signup-switch">
          이미 계정이 있나요?
          <button type="button" onClick={() => onNavigate(routes.login)}>
            로그인
          </button>
        </p>

        <button className="primary-button signup-button" type="submit">
          가입하고 분석 시작
        </button>
      </form>
    </div>
  )
}

export default App
