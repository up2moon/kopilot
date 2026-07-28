import { useState } from 'react'
import { login } from '../services/auth'
import routes from '../routes'

function BrandHeader({ chip }) {
  return (
    <header className="brand-header">
      <div className="brand-lockup">
        <img
          className="logo-mark"
          src="/favicon-256x256.png"
          alt=""
          aria-hidden="true"
        />
      </div>

      {chip ? <span className="value-chip">{chip}</span> : null}
    </header>
  )
}

function LoginPage({ onNavigate, onAuthSuccess }) {
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
          <h2>Kospay 시작하기</h2>
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

export default LoginPage
