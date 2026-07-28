import NavigationPageLayout from '../../components/NavigationPageLayout'
import ChallengeStateCard from './components/ChallengeStateCard'
import ChallengeConfetti from './components/ChallengeConfetti'
import WeeklyChallengeSection from './components/WeeklyChallengeSection'
import useChallenges from './hooks/useChallenges'
import './ChallengePage.css'

export default function ChallengePage({ token }) {
  const {
    data,
    loading,
    error,
    verifyMessage,
    verifying,
    verificationResult,
    celebrationKey,
    loadChallenges,
    verify,
  } = useChallenges(token)

  const hasStateCard =
    loading
    || Boolean(error)
    || data?.onboardingRequired
    || !data?.weeklyChallenges?.length

  return (
    <NavigationPageLayout
      className="challenge-page"
      title="챌린지"
      content="지난 소비를 살펴보고, 이번 주에 도전할 미션 5개를 준비했어요."
    >
      {celebrationKey > 0 && (
        <ChallengeConfetti key={celebrationKey} />
      )}
      {hasStateCard ? (
        <ChallengeStateCard
          data={data}
          error={error}
          loading={loading}
          onRetry={loadChallenges}
        />
      ) : (
        <WeeklyChallengeSection
          canVerify={data.canVerify}
          challenges={data.weeklyChallenges}
          progress={data.weeklyProgress}
          verificationOpensAt={data.verificationOpensAt}
          verificationResult={verificationResult}
          verifyMessage={verifyMessage}
          verifying={verifying}
          weekEndDate={data.weekEndDate}
          weekStartDate={data.weekStartDate}
          onVerify={verify}
        />
      )}
    </NavigationPageLayout>
  )
}
