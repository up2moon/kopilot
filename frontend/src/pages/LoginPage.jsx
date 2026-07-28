import { useState } from 'react'
import kospayLogo from '../assets/kospay-logo.png'
import { login, signup } from '../services/auth'
import routes from '../routes'

const testNamePrefixes = ['알뜰한', '즐거운', '든든한', '똑똑한', '용감한']
const testNameNouns = ['코알라', '펭귄', '라쿤', '수달', '햄스터']

function createTestAccount() {
  const id =
    globalThis.crypto?.randomUUID?.().replaceAll('-', '') ||
    `${Date.now()}${Math.random().toString(36).slice(2)}`
  const prefix =
    testNamePrefixes[Math.floor(Math.random() * testNamePrefixes.length)]
  const noun = testNameNouns[Math.floor(Math.random() * testNameNouns.length)]
  const suffix = id.slice(0, 4).toUpperCase()
  const password = `Kospay!${id.slice(0, 12)}`

  return {
    name: `${prefix} ${noun} ${suffix}`,
    email: `demo.${id}@example.com`,
    password,
    confirmPassword: password,
  }
}

function LoginPage({ onNavigate, onAuthSuccess }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMode, setSubmitMode] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    setSubmitMode('login')

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
      setSubmitMode('')
    }
  }

  const handleTestAccount = async () => {
    if (isSubmitting) return

    setErrorMessage('')
    setIsSubmitting(true)
    setSubmitMode('test')

    try {
      const authResult = await signup(createTestAccount())

      onAuthSuccess(authResult)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
      setSubmitMode('')
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
          {submitMode === 'login' ? (
            <>
              <span className="login-button-spinner" aria-hidden="true" />
              로그인 중
            </>
          ) : (
            '로그인'
          )}
        </button>

        <div className="login-divider" aria-hidden="true">
          <span>또는</span>
        </div>

        <button
          className="login-test-button"
          type="button"
          disabled={isSubmitting}
          onClick={handleTestAccount}
        >
          {submitMode === 'test' ? (
            <>
              <span className="login-button-spinner is-blue" aria-hidden="true" />
              테스트 계정 만드는 중
            </>
          ) : (
            <>
              <span aria-hidden="true">✨</span>
              테스트 계정으로 시작
            </>
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
