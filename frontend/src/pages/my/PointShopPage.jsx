import { useState } from 'react'
import NavigationPageLayout from '../../components/NavigationPageLayout'
import RewardBalanceCard from './components/RewardBalanceCard'
import RewardPurchaseSheet from './components/RewardPurchaseSheet'
import RewardStoreSection from './components/RewardStoreSection'
import RewardWalletSheet from './components/RewardWalletSheet'
import useRewardStore from './hooks/useRewardStore'
import './MyPage.css'

export default function PointShopPage({ auth, onBack }) {
  const user = auth?.user
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [purchasedGift, setPurchasedGift] = useState(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const {
    points,
    earnedPoints,
    spentPoints,
    pointsLoading,
    pointsError,
    purchasedGifts,
    purchaseProduct,
    reloadPoints,
  } = useRewardStore(
    auth?.accessToken,
    user?.id || user?.email || 'demo',
  )

  const selectProduct = (product) => {
    setPurchasedGift(null)
    setSelectedProduct(product)
  }

  const closePurchaseSheet = () => {
    setSelectedProduct(null)
    setPurchasedGift(null)
  }

  const handlePurchase = (product) => {
    const gift = purchaseProduct(product)

    if (gift) setPurchasedGift(gift)
  }

  const openWallet = () => {
    closePurchaseSheet()
    setWalletOpen(true)
  }

  return (
    <NavigationPageLayout
      className="point-shop-page"
      title="포인트샵"
      content="챌린지로 모은 포인트를 원하는 리워드로 바꿔보세요."
      onBack={onBack}
      backLabel="마이로 돌아가기"
    >
      <RewardBalanceCard
        points={points}
        earnedPoints={earnedPoints}
        spentPoints={spentPoints}
        pointsLoading={pointsLoading}
        pointsError={pointsError}
        giftCount={purchasedGifts.length}
        onOpenWallet={openWallet}
        onRetryPoints={reloadPoints}
      />

      <RewardStoreSection
        points={points}
        pointsLoading={pointsLoading}
        pointsError={pointsError}
        onSelectProduct={selectProduct}
      />

      <RewardPurchaseSheet
        product={selectedProduct}
        currentPoints={points}
        purchasedGift={purchasedGift}
        onPurchase={handlePurchase}
        onClose={closePurchaseSheet}
        onOpenWallet={openWallet}
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
