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
      </section>

      <section className="login-welcome" aria-labelledby="login-title">
        <p>WELCOME BACK</p>
        <h1 id="login-title">다시 만나 반가워요</h1>
        <span>계정에 로그인하고 오늘의 소비 흐름을 확인해 보세요.</span>
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
