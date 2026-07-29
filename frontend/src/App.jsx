import { useEffect, useState } from 'react'
import TestPage from './TestPage'
import BottomNav from './components/BottomNav'
import FloatingChatbot from './components/FloatingChatbot'
import DashboardPage from './pages/dashboard/DashboardPage'
import CoachPage from './pages/coach/CoachPage'
import SpendingDetailPage from './pages/spending-detail/SpendingDetailPage'
import AnonymousRankingPage from './pages/anonymous-ranking/AnonymousRankingPage'
import InvestmentEffectPage from './pages/investment-effect/InvestmentEffectPage'
import MyPage from './pages/my/MyPage'
import PointShopPage from './pages/my/PointShopPage'
import ChallengePage from './pages/challenge/ChallengePage'
import FirstLoginPage from './pages/FirstLoginPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import routes from './routes'
import {
  clearAuth,
  getStoredAuth,
  logout,
  saveAuth,
} from './services/auth'
import {
  connectMyData,
  disconnectMyData,
} from './services/onboarding'
import './App.css'

function getInitialRoute() {
  const pathname = window.location.pathname
  const knownRoutes = Object.values(routes)

  if (knownRoutes.includes(pathname)) {
    return pathname
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
  // 마이데이터 연동/해제 진행 상태를 App 레벨에서 관리해 화면 이동에도 유지한다.
  // (연동은 OpenAI 생성으로 수 초가 걸려, 컴포넌트 로컬 상태면 언마운트 시 사라진다.)
  const [mydataBusy, setMydataBusy] = useState(false)
  const [mydataError, setMydataError] = useState('')

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
    const nextUrl = new URL(nextRoute, window.location.origin)

    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}`)
    setRoute(nextUrl.pathname)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const isPublicRoute = route === routes.login || route === routes.signup || route === routes.test

    if (!isPublicRoute && !auth) {
      navigate(routes.login)
      return
    }

    if (auth && !isPublicRoute) {
      const onOnboardingRoute =
        route === routes.firstLogin || route === routes.firstLoginMyDataConnect

      if (!auth.user.firstLoginCompleted) {
        // 온보딩 미완료 사용자만 연동 → 예산 설정 순서로 유도한다.
        // 온보딩을 마친 사용자는 마이데이터를 해제해도 앱에 머문다(마이페이지에서 재연동).
        if (!auth.user.myDataConnected && !onOnboardingRoute) {
          navigate(routes.firstLoginMyDataConnect)
        } else if (auth.user.myDataConnected && !onOnboardingRoute) {
          navigate(routes.firstLogin)
        }
      } else if (onOnboardingRoute) {
        navigate(routes.dashboard)
      }
    }
  }, [route, auth])

  const handleAuthSuccess = (nextAuth) => {
    saveAuth(nextAuth)
    setAuth(nextAuth)
    if (nextAuth.user.firstLoginCompleted) {
      navigate(routes.dashboard)
    } else if (!nextAuth.user.myDataConnected) {
      navigate(routes.firstLoginMyDataConnect)
    } else {
      navigate(routes.firstLogin)
    }
  }

  const handleUserUpdate = (user) => {
    const nextAuth = {
      ...auth,
      user,
    }

    saveAuth(nextAuth)
    setAuth(nextAuth)
  }

  const handleMydataConnect = async () => {
    if (mydataBusy || !auth) return

    setMydataBusy(true)
    setMydataError('')

    try {
      await connectMyData(auth.accessToken)
      handleUserUpdate({ ...auth.user, myDataConnected: true })
    } catch (err) {
      setMydataError(err.message || '연동에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setMydataBusy(false)
    }
  }

  const handleMydataDisconnect = async () => {
    if (mydataBusy || !auth) return

    setMydataBusy(true)
    setMydataError('')

    try {
      await disconnectMyData(auth.accessToken)
      handleUserUpdate({ ...auth.user, myDataConnected: false })
    } catch (err) {
      setMydataError(err.message || '연동 해제에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setMydataBusy(false)
    }
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

  const mainTabRoutes = [routes.dashboard, routes.ranking, routes.challenge, routes.investmentEffect, routes.my]
  const showNavAndChatbot = mainTabRoutes.includes(route)

  let screenContent = null

  if (route === routes.login) {
    screenContent = <LoginPage onNavigate={navigate} onAuthSuccess={handleAuthSuccess} />
  } else if (route === routes.signup) {
    screenContent = <SignupPage onNavigate={navigate} />
  } else if (route === routes.firstLogin || route === routes.firstLoginMyDataConnect) {
    if (!auth) return null
    screenContent = (
      <FirstLoginPage
        auth={auth}
        currentRoute={route}
        onNavigate={navigate}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
      />
    )
  } else if (route === routes.dashboard) {
    if (!auth) return null
    screenContent = <DashboardPage auth={auth} onNavigate={navigate} />
  } else if (route === routes.spending) {
    if (!auth) return null
    screenContent = (
      <SpendingDetailPage
        auth={auth}
        onBack={() => navigate(routes.dashboard)}
      />
    )
  } else if (route === routes.coach) {
    if (!auth) return null
    screenContent = (
      <CoachPage
        auth={auth}
        onBack={() => navigate(routes.dashboard)}
        onNavigate={navigate}
      />
    )
  } else if (route === routes.ranking) {
    if (!auth) return null
    screenContent = <AnonymousRankingPage token={auth.accessToken} />
  } else if (route === routes.challenge) {
    if (!auth) return null
    screenContent = (
      <ChallengePage
        onNavigate={navigate}
        token={auth.accessToken}
      />
    )
  } else if (route === routes.investmentEffect) {
    if (!auth) return null
    screenContent = (
      <InvestmentEffectPage
        onNavigate={navigate}
        token={auth.accessToken}
      />
    )
  } else if (route === routes.my) {
    if (!auth) return null
    screenContent = (
      <MyPage
        auth={auth}
        onNavigate={navigate}
        onLogout={handleLogout}
        mydataBusy={mydataBusy}
        mydataError={mydataError}
        onMydataConnect={handleMydataConnect}
        onMydataDisconnect={handleMydataDisconnect}
      />
    )
  } else if (route === routes.pointShop) {
    if (!auth) return null
    screenContent = (
      <PointShopPage
        auth={auth}
        onBack={() => navigate(routes.my)}
      />
    )
  } else {
    screenContent = <LoginPage onNavigate={navigate} onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <div
          className={`app-scroll-area${showNavAndChatbot ? ' has-bottom-nav' : ''}${
            route === routes.coach ? ' is-coach' : ''
          }`}
        >
          {screenContent}
        </div>
        {showNavAndChatbot && (
          <>
            <FloatingChatbot onNavigate={navigate} />
            <BottomNav currentPath={route} onNavigate={navigate} />
          </>
        )}
      </section>
    </main>
  )
}

export default App
