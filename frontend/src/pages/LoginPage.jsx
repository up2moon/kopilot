import { useState } from 'react'
import kospayLogo from '../assets/kospay-logo.png'
import { login } from '../services/auth'
import routes from '../routes'

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
      <section className="login-intro">
        <header className="login-brand-header">
          <div className="login-brand">
            <img
              className="login-logo"
              src={kospayLogo}
              alt=""
              aria-hidden="true"
            />
            <strong>Kospay</strong>
          </div>
        </header>

        <div className="login-hero">
          <p className="login-eyebrow">SPEND BETTER, GROW FURTHER</p>
          <h1>
            소비는 가볍게,
            <br />
            내일은 더 든든하게
          </h1>
          <p>
            소비 분석부터 절약 챌린지, 투자효과까지
            <br />
            Kospay가 한 흐름으로 연결해요.
          </p>
        </div>

        <div className="login-value-list" aria-label="Kospay 주요 기능">
          <div className="login-value-item">
            <span>01</span>
            <strong>소비 분석</strong>
          </div>
          <div className="login-value-divider" aria-hidden="true" />
          <div className="login-value-item">
            <span>02</span>
            <strong>절약 코칭</strong>
          </div>
          <div className="login-value-divider" aria-hidden="true" />
          <div className="login-value-item">
            <span>03</span>
            <strong>자산 시뮬레이션</strong>
          </div>
        </div>
      </section>

      <form className="auth-panel login-panel" onSubmit={handleSubmit}>
        <label className="field-label login-field">
          <span>이메일</span>
          <input
            type="email"
            name="email"
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field-label login-field">
          <span>비밀번호</span>
          <input
            type="password"
            name="password"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
          />
        </label>

        {errorMessage ? (
          <p className="form-message login-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="login-button-spinner" aria-hidden="true" />
              로그인 중
            </>
          ) : (
            '로그인'
          )}
        </button>

        <p className="auth-switch login-switch">
          아직 계정이 없나요?
          <button type="button" onClick={() => onNavigate(routes.signup)}>
            무료로 시작하기
          </button>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
