import './MyPage.css'

export default function MyPage({ auth, onLogout }) {
  const user = auth?.user
  const nickname = user?.nickname || user?.name || '진원'
  const secondaryText = user?.email || (user?.myDataConnected ? '마이데이터 연동됨' : '마이데이터 미연동')

  // 각 설정 행은 아직 백엔드와 연동하지 않은 UI 단계입니다.
  // 로그아웃만 기존 `POST /api/auth/logout` 흐름(onLogout)에 연결되어 있습니다.
  const settingItems = [
    {
      id: 'mydata',
      icon: '🔒',
      label: '마이데이터 연결 관리',
      onClick: undefined,
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
            >
              <span className="mypage-setting-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mypage-setting-label">{item.label}</span>
              <span className="mypage-setting-chevron" aria-hidden="true">
                &gt;
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
