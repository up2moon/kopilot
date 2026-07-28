import { useState } from 'react'
import { signup } from '../services/auth'
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

function SignupPage({ onNavigate }) {
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
        <p className="eyebrow">START WITH Kospay</p>
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
          <p>Kospay를 바로 시작할 수 있어요.</p>
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

export default SignupPage
