import { useState } from 'react'
import NavigationPageLayout from '../../components/NavigationPageLayout'
import DisconnectMyDataDialog from './components/DisconnectMyDataDialog'
import MyProfileCard from './components/MyProfileCard'
import MySettingsSection from './components/MySettingsSection'
import useNotificationPreference from './hooks/useNotificationPreference'
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
  const isConnected = Boolean(user?.myDataConnected)
  const [pendingDisconnect, setPendingDisconnect] = useState(false)
  const [notificationsOn, toggleNotifications] = useNotificationPreference()

  const handleMyDataClick = () => {
    if (mydataBusy) return

    if (isConnected) {
      setPendingDisconnect(true)
      return
    }

    onMydataConnect?.()
  }

  const confirmDisconnect = () => {
    setPendingDisconnect(false)
    onMydataDisconnect?.()
  }

  return (
    <NavigationPageLayout
      className="mypage"
      title="마이"
      content="계정과 서비스 설정을 관리해요."
    >
      <MyProfileCard user={user} />

      <MySettingsSection
        isConnected={isConnected}
        mydataBusy={mydataBusy}
        mydataError={mydataError}
        notificationsOn={notificationsOn}
        onMyDataClick={handleMyDataClick}
        onNotificationsClick={toggleNotifications}
        onLogout={onLogout}
      />

      <DisconnectMyDataDialog
        open={pendingDisconnect}
        onCancel={() => setPendingDisconnect(false)}
        onConfirm={confirmDisconnect}
      />
    </NavigationPageLayout>
  )
}
