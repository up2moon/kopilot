import { useState } from 'react'
import MyDataConnectionAnimation from '../../components/MyDataConnectionAnimation'
import NavigationPageLayout from '../../components/NavigationPageLayout'
import routes from '../../routes'
import DisconnectMyDataDialog from './components/DisconnectMyDataDialog'
import MyProfileCard from './components/MyProfileCard'
import MySettingsSection from './components/MySettingsSection'
import RewardBalanceCard from './components/RewardBalanceCard'
import RewardWalletSheet from './components/RewardWalletSheet'
import useNotificationPreference from './hooks/useNotificationPreference'
import useRewardStore from './hooks/useRewardStore'
import './MyPage.css'

export default function MyPage({
  auth,
  onNavigate,
  onLogout,
  mydataBusy = false,
  mydataError = '',
  onMydataConnect,
  onMydataDisconnect,
}) {
  const user = auth?.user
  const isConnected = Boolean(user?.myDataConnected)
  const [pendingDisconnect, setPendingDisconnect] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [notificationsOn, toggleNotifications] = useNotificationPreference()
  const {
    points,
    earnedPoints,
    spentPoints,
    pointsLoading,
    pointsError,
    purchasedGifts,
    reloadPoints,
  } = useRewardStore(
    auth?.accessToken,
    user?.id || user?.email || 'demo',
  )

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
      content="모은 포인트와 내 정보를 한곳에서 관리해요."
    >
      <MyProfileCard user={user} />

      <RewardBalanceCard
        points={points}
        earnedPoints={earnedPoints}
        spentPoints={spentPoints}
        pointsLoading={pointsLoading}
        pointsError={pointsError}
        giftCount={purchasedGifts.length}
        onOpenShop={() => onNavigate?.(routes.pointShop)}
        onOpenWallet={() => setWalletOpen(true)}
        onRetryPoints={reloadPoints}
      />

      <MySettingsSection
        isConnected={isConnected}
        mydataBusy={mydataBusy}
        mydataError={mydataError}
        notificationsOn={notificationsOn}
        onMyDataClick={handleMyDataClick}
        onNotificationsClick={toggleNotifications}
        onLogout={onLogout}
      />

      {mydataBusy && !isConnected ? (
        <div className="mypage-connect-backdrop" role="status" aria-live="polite">
          <div className="mypage-connect-card">
            <MyDataConnectionAnimation compact />
            <h2>소비 내역을 가져오고 있어요</h2>
            <p>
              카드와 계좌 정보를 안전하게 연결한 뒤
              <br />
              이번 달 소비 패턴을 정리할게요.
            </p>
            <div className="mypage-connect-steps" aria-hidden="true">
              <span className="is-active">연결</span>
              <i />
              <span>분류</span>
              <i />
              <span>분석</span>
            </div>
          </div>
        </div>
      ) : null}

      <DisconnectMyDataDialog
        open={pendingDisconnect}
        onCancel={() => setPendingDisconnect(false)}
        onConfirm={confirmDisconnect}
      />

      {walletOpen ? (
        <RewardWalletSheet
          gifts={purchasedGifts}
          onClose={() => setWalletOpen(false)}
        />
      ) : null}
    </NavigationPageLayout>
  )
}
