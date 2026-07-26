import { useState } from 'react'
import './MyPage.css'

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

  // 로그아웃만 기존 로그아웃 흐름에 연결되어 있고, 알림 설정은 아직 UI 단계입니다.
  const settingItems = [
    {
      id: 'mydata',
      icon: '🔒',
      label: '마이데이터 연결 관리',
      status: myDataStatus,
      statusTone: isConnected ? 'on' : 'off',
      onClick: handleMyDataClick,
      disabled: mydataBusy,
    },
    {
      id: 'notification',
      icon: '🔔',
      label: '알림 설정',
      onClick: undefined,
    },
    {
      id: 'logout',
      icon: '🚪',
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
          {settingItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="mypage-setting-row"
              onClick={item.onClick}
              disabled={item.disabled}
            >
              <span className="mypage-setting-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mypage-setting-label">{item.label}</span>
              {item.status && (
                <span className={`mypage-setting-status is-${item.statusTone}`}>
                  {item.status}
                </span>
              )}
              <span className="mypage-setting-chevron" aria-hidden="true">
                &gt;
              </span>
            </button>
          ))}
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
