import lockIcon from '../../../assets/icons/lock.svg'
import logoutIcon from '../../../assets/icons/logout.svg'
import notificationsIcon from '../../../assets/icons/notifications.svg'
import MySettingRow from './MySettingRow'

function getMyDataStatus(isConnected, mydataBusy) {
  if (mydataBusy) {
    return isConnected ? '해제 중…' : '연동 중…'
  }

  return isConnected ? '연동됨' : '연동 안 됨'
}

export default function MySettingsSection({
  isConnected,
  mydataBusy,
  mydataError,
  notificationsOn,
  onMyDataClick,
  onNotificationsClick,
  onLogout,
}) {
  const settingItems = [
    {
      id: 'mydata',
      icon: lockIcon,
      label: '마이데이터 연결 관리',
      status: getMyDataStatus(isConnected, mydataBusy),
      statusTone: isConnected ? 'on' : 'off',
      onClick: onMyDataClick,
      disabled: mydataBusy,
    },
    {
      id: 'notification',
      type: 'toggle',
      icon: notificationsIcon,
      label: '알림 설정',
      checked: notificationsOn,
      onClick: onNotificationsClick,
    },
    {
      id: 'logout',
      icon: logoutIcon,
      label: '로그아웃',
      onClick: onLogout,
    },
  ]

  return (
    <section className="mypage-settings">
      <h2 className="mypage-section-title">설정</h2>

      <div className="mypage-setting-list">
        {settingItems.map((item) => (
          <MySettingRow key={item.id} {...item} />
        ))}
      </div>

      {mydataError && <p className="mypage-error">{mydataError}</p>}
    </section>
  )
}
