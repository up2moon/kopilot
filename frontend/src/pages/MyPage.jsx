import { useState } from 'react'
import lockIcon from '../assets/icons/lock.svg'
import logoutIcon from '../assets/icons/logout.svg'
import notificationsIcon from '../assets/icons/notifications.svg'
import arrowIcon from '../assets/icons/arrow.svg'
import './MyPage.css'

// 알림 설정은 백엔드 영향이 없는 UI 전용 토글이라(BACK.md 방침) 값을 localStorage에만 저장한다.
const notificationsStorageKey = 'kopilot.notificationsEnabled'

function getStoredNotifications() {
  try {
    return window.localStorage.getItem(notificationsStorageKey) !== 'false'
  } catch {
    return true
  }
}

export default function MyPage({
  auth,
  onLogout,
  mydataBusy = false,
  mydataError = '',
  onMydataConnect,
  onMydataDisconnect,
}) {
  const user = auth?.user
  const nickname = user?.nickname || user?.name || '진원'
  const secondaryText = user?.email || (user?.myDataConnected ? '마이데이터 연동됨' : '마이데이터 미연동')
  const isConnected = Boolean(user?.myDataConnected)

  const [pendingDisconnect, setPendingDisconnect] = useState(false)
  const [notificationsOn, setNotificationsOn] = useState(getStoredNotifications)

  const toggleNotifications = () => {
    setNotificationsOn((prev) => {
      const next = !prev

      try {
        window.localStorage.setItem(notificationsStorageKey, String(next))
      } catch {
        // 저장 실패해도 화면 토글은 유지한다.
      }

      return next
    })
  }

  const handleMyDataClick = () => {
    if (mydataBusy) return

    // 연동 해제는 소비 내역을 삭제하는 동작이라 인앱 확인 모달을 거친다.
    // (window.confirm은 일부 브라우저/웹뷰에서 차단되므로 사용하지 않는다.)
    if (isConnected) {
      setPendingDisconnect(true)
    } else {
      onMydataConnect?.()
    }
  }

  const confirmDisconnect = () => {
    setPendingDisconnect(false)
    onMydataDisconnect?.()
  }

  const myDataStatus = mydataBusy
    ? isConnected
      ? '해제 중…'
      : '연동 중…'
    : isConnected
      ? '연동됨'
      : '연동 안 됨'

  // 로그아웃/마이데이터는 동작 행(action), 알림 설정은 UI 전용 토글 행(toggle)이다.
  const settingItems = [
    {
      id: 'mydata',
      type: 'action',
      icon: lockIcon,
      label: '마이데이터 연결 관리',
      status: myDataStatus,
      statusTone: isConnected ? 'on' : 'off',
      onClick: handleMyDataClick,
      disabled: mydataBusy,
    },
    {
      id: 'notification',
      type: 'toggle',
      icon: notificationsIcon,
      label: '알림 설정',
      checked: notificationsOn,
      onClick: toggleNotifications,
    },
    {
      id: 'logout',
      type: 'action',
      icon: logoutIcon,
      label: '로그아웃',
      onClick: onLogout,
    },
  ]

  return (
    <div className="mypage">
      <header className="mypage-header">
        <h1>마이</h1>
        <p className="mypage-subtitle">계정과 서비스 설정을 관리해요.</p>
      </header>

      <section className="mypage-profile-card">
        <div className="mypage-avatar" aria-hidden="true">
          🙂
        </div>
        <div className="mypage-profile-info">
          <span className="mypage-profile-name">{nickname}님</span>
          <span className="mypage-profile-sub">{secondaryText}</span>
        </div>
      </section>

      <section className="mypage-settings">
        <h2 className="mypage-section-title">설정</h2>

        <div className="mypage-setting-list">
          {settingItems.map((item) => {
            const isToggle = item.type === 'toggle'

            return (
              <button
                key={item.id}
                type="button"
                className="mypage-setting-row"
                onClick={item.onClick}
                disabled={item.disabled}
                role={isToggle ? 'switch' : undefined}
                aria-checked={isToggle ? item.checked : undefined}
              >
                <img
                  className="mypage-setting-icon"
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                />
                <span className="mypage-setting-label">{item.label}</span>

                {isToggle ? (
                  <span
                    className={`mypage-switch${item.checked ? ' is-on' : ''}`}
                    aria-hidden="true"
                  >
                    <span className="mypage-switch-knob" />
                  </span>
                ) : (
                  <>
                    {item.status && (
                      <span className={`mypage-setting-status is-${item.statusTone}`}>
                        {item.status}
                      </span>
                    )}
                    <img
                      className="mypage-setting-chevron"
                      src={arrowIcon}
                      alt=""
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            )
          })}
        </div>

        {mydataError && <p className="mypage-error">{mydataError}</p>}
      </section>

      {pendingDisconnect && (
        <div
          className="mypage-modal-backdrop"
          onClick={() => setPendingDisconnect(false)}
        >
          <div
            className="mypage-modal"
            role="alertdialog"
            aria-label="마이데이터 연동 해제 확인"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mypage-modal-title">마이데이터 연동 해제</h3>
            <p className="mypage-modal-text">
              연동을 해제하면 불러온 소비 내역이 삭제돼요. 해제할까요?
            </p>
            <div className="mypage-modal-actions">
              <button
                type="button"
                className="mypage-modal-cancel"
                onClick={() => setPendingDisconnect(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="mypage-modal-danger"
                onClick={confirmDisconnect}
              >
                연동 해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
