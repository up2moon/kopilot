import NavigationPageLayout from '../../components/NavigationPageLayout'
import ChallengeStateCard from './components/ChallengeStateCard'
import ChallengeConfetti from './components/ChallengeConfetti'
import WeeklyChallengeSection from './components/WeeklyChallengeSection'
import useChallenges from './hooks/useChallenges'
import './ChallengePage.css'

export default function ChallengePage({ onNavigate, token }) {
  const {
    data,
    loading,
    error,
    verifyMessage,
    verifying,
    verificationResult,
    celebrationKey,
    highlightedChallengeId,
    loadChallenges,
    verify,
  } = useChallenges(token)

  const hasStateCard =
    loading
    || Boolean(error)
    || data?.onboardingRequired
    || !data?.weeklyChallenges?.length

  const openSavingInvestment = () => {
    const currentMonth = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date())

    onNavigate(`/investment-effect?category=savings&month=${currentMonth}`)
  }

  return (
    <NavigationPageLayout
      className="challenge-page"
      title="챌린지"
      content="지난 소비를 살펴보고, 이번 주에 도전할 맞춤 미션을 준비했어요."
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
        <>
          {data.clock?.testMode && (
            <div className="challenge-test-clock" role="status">
              <strong>개발 테스트 시간 사용 중</strong>
              <span>
                {new Intl.DateTimeFormat('ko-KR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Seoul',
                }).format(new Date(data.clock.currentDateTime))}
              </span>
            </div>
          )}
          <WeeklyChallengeSection
            canVerify={data.canVerify}
            challenges={data.weeklyChallenges}
            highlightedChallengeId={highlightedChallengeId}
            progress={data.weeklyProgress}
            verificationResult={verificationResult}
            verifyMessage={verifyMessage}
            verifying={verifying}
            weekEndDate={data.weekEndDate}
            weekStartDate={data.weekStartDate}
            onVerify={verify}
            onViewInvestment={openSavingInvestment}
          />
        </>
      )}
    </NavigationPageLayout>
  )
}
