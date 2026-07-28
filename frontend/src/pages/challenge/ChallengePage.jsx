import NavigationPageLayout from '../../components/NavigationPageLayout'
import ChallengeStateCard from './components/ChallengeStateCard'
import TodayChallengeCard from './components/TodayChallengeCard'
import WeeklyChallengeSection from './components/WeeklyChallengeSection'
import useChallenges from './hooks/useChallenges'
import './ChallengePage.css'

export default function ChallengePage({ token }) {
  const {
    data,
    loading,
    error,
    verifyMessage,
    verifyingChallengeId,
    loadChallenges,
    verify,
  } = useChallenges(token)

  const hasStateCard =
    loading || Boolean(error) || data?.onboardingRequired || !data?.todayChallenge

  return (
    <NavigationPageLayout
      className="challenge-page"
      title="챌린지"
      content="AI가 이번 주 수행할 절약 미션을 배정해요."
    >
      {hasStateCard ? (
        <ChallengeStateCard
          data={data}
          error={error}
          loading={loading}
          onRetry={loadChallenges}
        />
      ) : (
        <>
          <TodayChallengeCard challenge={data.todayChallenge} />
          <WeeklyChallengeSection
            challenges={data.weeklyChallenges}
            progress={data.weeklyProgress}
            verifyMessage={verifyMessage}
            verifyingChallengeId={verifyingChallengeId}
            onVerify={verify}
          />
        </>
      )}
    </NavigationPageLayout>
  )
}
